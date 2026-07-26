-- =====================================================================
-- LEO — Job Marketplace Platform
-- PostgreSQL Database Schema — Phase 1 Deliverable
-- Target: PostgreSQL 15+
-- =====================================================================
-- This file is the reference DDL. In the actual repo, split it into
-- versioned migrations (TypeORM/Prisma/node-pg-migrate) rather than
-- running it as one script against production.
--
-- Conventions used throughout:
--   • Every table has a UUID primary key (gen_random_uuid())
--   • Every table has created_at / updated_at (TIMESTAMPTZ)
--   • User-facing tables use deleted_at for soft delete (NULL = active)
--   • Foreign keys default to ON DELETE RESTRICT on money/audit tables,
--     to prevent a cascading delete from silently destroying financial
--     history — cascades are only used where that's genuinely safe
--     (e.g. deleting a user's own devices).
--   • Encrypted PII (phone, WhatsApp, NID) is stored as BYTEA, encrypted
--     application-side with AES-256-GCM using a key from a managed KMS
--     (not pgcrypto) so keys can rotate without touching the database.
--     A parallel deterministic HMAC-SHA256 "*_hash" column supports
--     equality lookups (login by phone, dedupe) without ever decrypting
--     at query time.
--   • Row-Level Security (RLS) is a reasonable defense-in-depth addition
--     on top of this schema — evaluated in the Phase 4 security design,
--     not implemented here, so it doesn't get lost as an afterthought.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;   -- geo radius search: 5/10/25/50 km

-- =====================================================================
-- SECTION 1 — ENUM TYPES
-- =====================================================================

CREATE TYPE user_role            AS ENUM ('employer', 'worker');
CREATE TYPE user_status          AS ENUM ('active', 'suspended', 'deleted');
CREATE TYPE verification_status  AS ENUM ('unverified', 'pending', 'verified', 'rejected');
CREATE TYPE trust_badge          AS ENUM ('none', 'blue_tick');
CREATE TYPE availability_mode    AS ENUM ('offline', 'online', 'both');
CREATE TYPE job_type             AS ENUM ('offline_short_contract', 'permanent', 'online_freelance');
CREATE TYPE work_mode            AS ENUM ('offline', 'online', 'both');
CREATE TYPE job_status           AS ENUM ('active', 'archived', 'closed', 'expired');
CREATE TYPE application_status   AS ENUM ('applied', 'shortlisted', 'rejected', 'hired', 'withdrawn');
CREATE TYPE interest_status      AS ENUM ('sent', 'seen', 'accepted', 'declined');
CREATE TYPE saveable_type        AS ENUM ('job', 'worker');
CREATE TYPE chat_status          AS ENUM ('locked', 'active', 'archived');
CREATE TYPE message_type         AS ENUM ('text', 'voice', 'image', 'pdf', 'location', 'quick_reply');
CREATE TYPE contract_type        AS ENUM ('offline_short_contract', 'permanent', 'online_freelance');
CREATE TYPE contract_status      AS ENUM ('draft', 'pending_payment', 'active', 'completed', 'cancelled', 'disputed');
CREATE TYPE milestone_status     AS ENUM ('pending', 'submitted', 'revision_requested', 'approved', 'released');
CREATE TYPE escrow_status        AS ENUM ('draft', 'pending', 'funded', 'active', 'submitted', 'revision', 'approved', 'released', 'refunded', 'cancelled', 'disputed', 'closed');
CREATE TYPE wallet_txn_type      AS ENUM ('credit', 'debit');
CREATE TYPE wallet_txn_category  AS ENUM ('escrow_release', 'withdrawal', 'refund', 'bonus', 'commission', 'deposit', 'job_boost_fee', 'permanent_job_fee');
CREATE TYPE withdrawal_method    AS ENUM ('bkash', 'nagad', 'rocket', 'bank_transfer');
CREATE TYPE withdrawal_status    AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE payment_gateway      AS ENUM ('bkash', 'nagad', 'rocket', 'sslcommerz', 'stripe', 'manual_bank');
CREATE TYPE payment_status       AS ENUM ('initiated', 'pending', 'success', 'failed', 'refunded');
CREATE TYPE notification_type    AS ENUM ('chat', 'job', 'contract', 'escrow', 'payment', 'withdrawal', 'review', 'subscription', 'system');
CREATE TYPE notification_channel AS ENUM ('push', 'whatsapp', 'sms', 'email', 'in_app');
CREATE TYPE report_status        AS ENUM ('open', 'reviewing', 'resolved', 'dismissed');
CREATE TYPE dispute_status       AS ENUM ('open', 'under_review', 'resolved_employer', 'resolved_worker', 'resolved_split', 'closed');
CREATE TYPE subscription_plan    AS ENUM ('worker_premium', 'employer_premium');
CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'cancelled');
CREATE TYPE otp_purpose          AS ENUM ('login', 'whatsapp_verify');
CREATE TYPE device_type          AS ENUM ('android', 'ios', 'web');
CREATE TYPE kyc_document_type    AS ENUM ('nid', 'passport', 'trade_license');
CREATE TYPE kyc_status           AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE actor_type           AS ENUM ('user', 'admin', 'system');

-- =====================================================================
-- SECTION 2 — IDENTITY & ACCESS
-- =====================================================================

CREATE TABLE users (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role                 user_role NOT NULL,
    phone_encrypted      BYTEA NOT NULL,
    phone_hash           TEXT NOT NULL,
    whatsapp_encrypted   BYTEA,
    whatsapp_hash        TEXT,
    is_phone_verified    BOOLEAN NOT NULL DEFAULT false,
    is_whatsapp_verified BOOLEAN NOT NULL DEFAULT false,
    status               user_status NOT NULL DEFAULT 'active',
    is_premium           BOOLEAN NOT NULL DEFAULT false,
    premium_expires_at   TIMESTAMPTZ,
    preferred_language   TEXT NOT NULL DEFAULT 'bn',   -- 'bn' | 'en'
    last_login_at        TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at           TIMESTAMPTZ
);
CREATE UNIQUE INDEX ux_users_phone_hash ON users(phone_hash) WHERE deleted_at IS NULL;
CREATE INDEX ix_users_role_status ON users(role, status);

CREATE TABLE admin_users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name     TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,          -- admins keep email/password; platform users do not
    is_active     BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at    TIMESTAMPTZ
);

CREATE TABLE roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL UNIQUE,      -- e.g. 'support_agent', 'finance', 'moderator', 'super_admin'
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE permissions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource    TEXT NOT NULL,             -- e.g. 'jobs', 'escrow', 'kyc'
    action      TEXT NOT NULL,             -- e.g. 'read', 'write', 'moderate', 'refund'
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (resource, action)
);

CREATE TABLE role_permissions (
    role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE admin_user_roles (
    admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (admin_user_id, role_id)
);

CREATE TABLE otp_requests (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_hash    TEXT NOT NULL,
    otp_hash      TEXT NOT NULL,            -- never store the plaintext OTP
    purpose       otp_purpose NOT NULL,
    attempt_count SMALLINT NOT NULL DEFAULT 0,
    max_attempts  SMALLINT NOT NULL DEFAULT 5,
    is_verified   BOOLEAN NOT NULL DEFAULT false,
    verified_at   TIMESTAMPTZ,
    expires_at    TIMESTAMPTZ NOT NULL,
    ip_address    INET,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_otp_phone_purpose ON otp_requests(phone_hash, purpose, created_at DESC);

CREATE TABLE devices (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_token       TEXT NOT NULL,       -- FCM token
    device_type        device_type NOT NULL,
    device_fingerprint TEXT NOT NULL,
    last_seen_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, device_token)
);

CREATE TABLE sessions (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id          UUID REFERENCES devices(id) ON DELETE SET NULL,
    refresh_token_hash TEXT NOT NULL,
    jwt_id             TEXT NOT NULL,
    ip_address         INET,
    user_agent         TEXT,
    expires_at         TIMESTAMPTZ NOT NULL,
    revoked_at         TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_sessions_user_id ON sessions(user_id);
CREATE UNIQUE INDEX ux_sessions_jwt_id ON sessions(jwt_id);

-- =====================================================================
-- SECTION 3 — CATEGORIES & TAXONOMY
-- =====================================================================

CREATE TABLE categories (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL UNIQUE,        -- one of the fixed 41 categories (SRS Appendix A)
    slug       TEXT NOT NULL UNIQUE,
    icon_url   TEXT,
    sort_order SMALLINT NOT NULL DEFAULT 0,
    is_active  BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);
-- Seed with the 41 fixed categories via migration seed data, not hardcoded here.

CREATE TABLE skills (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (category_id, name)
);

-- =====================================================================
-- SECTION 4 — PROFILES
-- =====================================================================

CREATE TABLE companies (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    company_name         TEXT NOT NULL,
    owner_name           TEXT NOT NULL,      -- "Malik" — the account owner's name
    logo_url             TEXT,
    verification_status  verification_status NOT NULL DEFAULT 'unverified',
    industry             TEXT,
    description          TEXT,
    division TEXT, district TEXT, thana TEXT, village TEXT,
    location             GEOGRAPHY(Point, 4326),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at            TIMESTAMPTZ
);
CREATE INDEX ix_companies_location ON companies USING GIST(location);
CREATE INDEX ix_companies_district ON companies(division, district);

CREATE TABLE worker_profiles (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    full_name         TEXT NOT NULL,
    photo_url         TEXT,
    bio               TEXT,
    experience_years  NUMERIC(4,1),
    education         TEXT,
    languages         TEXT[],                -- e.g. {'bn','en'}
    availability_mode availability_mode NOT NULL DEFAULT 'both',
    open_to_work      BOOLEAN NOT NULL DEFAULT true,
    trust_badge       trust_badge NOT NULL DEFAULT 'none',
    profile_strength  SMALLINT NOT NULL DEFAULT 0,   -- 0-100, computed app-side
    division TEXT, district TEXT, thana TEXT, village TEXT,
    location          GEOGRAPHY(Point, 4326),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at         TIMESTAMPTZ
);
CREATE INDEX ix_worker_profiles_location ON worker_profiles USING GIST(location);
CREATE INDEX ix_worker_profiles_open_to_work ON worker_profiles(open_to_work) WHERE deleted_at IS NULL;

CREATE TABLE worker_skills (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id        UUID NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
    skill_id         UUID NOT NULL REFERENCES skills(id) ON DELETE RESTRICT,
    years_experience NUMERIC(4,1),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (worker_id, skill_id)
);

CREATE TABLE worker_portfolios (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id   UUID NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    description TEXT,
    file_url    TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ
);

CREATE TABLE worker_certificates (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id  UUID NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    issuer     TEXT,
    file_url   TEXT NOT NULL,
    issued_at  DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- =====================================================================
-- SECTION 5 — JOBS & APPLICATIONS
-- =====================================================================

CREATE TABLE jobs (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id         UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    category_id        UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    title              TEXT NOT NULL,
    description        TEXT NOT NULL,
    job_type           job_type NOT NULL,
    work_mode          work_mode NOT NULL,
    salary_min         NUMERIC(12,2),
    salary_max         NUMERIC(12,2),
    salary_currency    TEXT NOT NULL DEFAULT 'BDT',
    salary_period      TEXT,                  -- 'hourly' | 'daily' | 'monthly' | 'fixed'
    division TEXT, district TEXT, thana TEXT, village TEXT,
    location           GEOGRAPHY(Point, 4326),
    is_premium         BOOLEAN NOT NULL DEFAULT false,
    premium_boosted_at TIMESTAMPTZ,           -- boost window = this + 4h
    status             job_status NOT NULL DEFAULT 'active',
    view_count         INTEGER NOT NULL DEFAULT 0,
    applicant_count    INTEGER NOT NULL DEFAULT 0,
    search_vector      TSVECTOR,              -- Postgres FTS fallback; Elasticsearch is primary search
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ
);
CREATE INDEX ix_jobs_feed_order ON jobs(is_premium DESC, premium_boosted_at DESC, created_at DESC) WHERE deleted_at IS NULL AND status = 'active';
CREATE INDEX ix_jobs_location ON jobs USING GIST(location);
CREATE INDEX ix_jobs_category ON jobs(category_id);
CREATE INDEX ix_jobs_search_vector ON jobs USING GIN(search_vector);

CREATE TABLE job_skills (
    job_id   UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE RESTRICT,
    PRIMARY KEY (job_id, skill_id)
);

CREATE TABLE applications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id     UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    worker_id  UUID NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
    status     application_status NOT NULL DEFAULT 'applied',
    cover_note TEXT,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    UNIQUE (job_id, worker_id)
);
CREATE INDEX ix_applications_worker ON applications(worker_id);

CREATE TABLE interests (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    worker_id  UUID NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
    job_id     UUID REFERENCES jobs(id) ON DELETE SET NULL,
    status     interest_status NOT NULL DEFAULT 'sent',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE saved_items (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    saveable_type saveable_type NOT NULL,
    saveable_id   UUID NOT NULL,             -- polymorphic: jobs.id or worker_profiles.id (no FK — spans tables)
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, saveable_type, saveable_id)
);

CREATE TABLE blocked_users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason          TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (blocker_user_id, blocked_user_id)
);

-- =====================================================================
-- SECTION 6 — CHAT & MESSAGING
-- =====================================================================

CREATE TABLE chats (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id              UUID REFERENCES jobs(id) ON DELETE SET NULL,
    employer_user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    worker_user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status              chat_status NOT NULL DEFAULT 'locked',
    contact_unlocked    BOOLEAN NOT NULL DEFAULT false,
    contact_unlocked_at TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (employer_user_id, worker_user_id, job_id)
);
CREATE INDEX ix_chats_employer ON chats(employer_user_id);
CREATE INDEX ix_chats_worker ON chats(worker_user_id);

CREATE TABLE messages (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id        UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    sender_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_type   message_type NOT NULL DEFAULT 'text',
    content        TEXT,           -- redacted app-side if it matches a contact-info pattern pre-contract
    is_read        BOOLEAN NOT NULL DEFAULT false,
    is_flagged     BOOLEAN NOT NULL DEFAULT false,
    flagged_reason TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at     TIMESTAMPTZ
);
CREATE INDEX ix_messages_chat_created ON messages(chat_id, created_at DESC);

CREATE TABLE message_attachments (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id       UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    file_url         TEXT NOT NULL,
    file_type        TEXT NOT NULL,     -- mime type
    file_size_kb     INTEGER,
    duration_seconds SMALLINT,          -- voice messages
    latitude         DOUBLE PRECISION,  -- location shares
    longitude        DOUBLE PRECISION,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- SECTION 7 — CONTRACTS, MILESTONES, ESCROW
-- =====================================================================

CREATE TABLE contracts (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id            UUID NOT NULL REFERENCES jobs(id) ON DELETE RESTRICT,
    employer_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    worker_user_id    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    contract_type     contract_type NOT NULL,
    status            contract_status NOT NULL DEFAULT 'draft',
    rate_amount       NUMERIC(12,2),   -- hourly/daily rate, or fixed price
    rate_period       TEXT,            -- 'hourly' | 'daily' | 'fixed'
    duration_days     SMALLINT,        -- offline short contract: 1-7
    employer_fee_bdt  NUMERIC(10,2),   -- e.g. 250 flat for permanent job
    worker_fee_bdt    NUMERIC(10,2),   -- e.g. 250 flat permanent, or 2% of rate for short contract
    start_date        DATE,
    end_date          DATE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at         TIMESTAMPTZ
);
CREATE INDEX ix_contracts_employer ON contracts(employer_user_id);
CREATE INDEX ix_contracts_worker ON contracts(worker_user_id);

CREATE TABLE milestones (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id  UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,  -- online_freelance only
    title        TEXT NOT NULL,
    description  TEXT,
    amount       NUMERIC(12,2) NOT NULL,
    status       milestone_status NOT NULL DEFAULT 'pending',
    due_date     DATE,
    submitted_at TIMESTAMPTZ,
    approved_at  TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_milestones_contract ON milestones(contract_id);

CREATE TABLE escrows (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id  UUID NOT NULL REFERENCES contracts(id) ON DELETE RESTRICT,
    milestone_id UUID REFERENCES milestones(id) ON DELETE RESTRICT UNIQUE,  -- null = whole-contract escrow; one escrow per milestone
    amount       NUMERIC(12,2) NOT NULL,
    currency     TEXT NOT NULL DEFAULT 'BDT',
    status       escrow_status NOT NULL DEFAULT 'draft',
    funded_at    TIMESTAMPTZ,
    released_at  TIMESTAMPTZ,
    refunded_at  TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_escrows_contract ON escrows(contract_id);
CREATE INDEX ix_escrows_status ON escrows(status);

-- Append-only audit trail of every escrow state transition — the source
-- of truth for "what happened and when" in any dispute.
CREATE TABLE escrow_transitions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escrow_id     UUID NOT NULL REFERENCES escrows(id) ON DELETE CASCADE,
    from_status   escrow_status,      -- null on the first (Draft) transition
    to_status     escrow_status NOT NULL,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reason        TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_escrow_transitions_escrow ON escrow_transitions(escrow_id, created_at);

-- =====================================================================
-- SECTION 8 — WALLET & PAYMENTS
-- =====================================================================

CREATE TABLE wallets (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    available_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
    pending_balance   NUMERIC(14,2) NOT NULL DEFAULT 0,
    escrow_balance    NUMERIC(14,2) NOT NULL DEFAULT 0,
    currency          TEXT NOT NULL DEFAULT 'BDT',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (available_balance >= 0 AND pending_balance >= 0 AND escrow_balance >= 0)
);

-- Append-only ledger — never UPDATE or DELETE a row here. Balances on
-- `wallets` are a derived cache kept in sync by the application layer
-- inside the same DB transaction as each insert.
CREATE TABLE wallet_transactions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id      UUID NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
    type           wallet_txn_type NOT NULL,
    category       wallet_txn_category NOT NULL,
    amount         NUMERIC(14,2) NOT NULL,
    balance_after  NUMERIC(14,2) NOT NULL,
    reference_type TEXT,             -- 'escrow' | 'contract' | 'withdrawal' | 'subscription' ...
    reference_id   UUID,
    description    TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_wallet_txn_wallet ON wallet_transactions(wallet_id, created_at DESC);

CREATE TABLE withdrawals (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id                 UUID NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
    amount                    NUMERIC(14,2) NOT NULL,
    method                    withdrawal_method NOT NULL,
    account_number_encrypted  BYTEA NOT NULL,
    status                    withdrawal_status NOT NULL DEFAULT 'pending',
    requested_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at              TIMESTAMPTZ,     -- SLA: within 24h of requested_at
    failure_reason            TEXT,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_withdrawals_status ON withdrawals(status, requested_at);

CREATE TABLE payment_transactions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    payable_type      TEXT NOT NULL,   -- 'job_boost' | 'permanent_job_fee' | 'short_contract_commission' | 'escrow_funding' | 'subscription'
    payable_id        UUID,
    gateway           payment_gateway NOT NULL,
    gateway_reference TEXT,
    amount            NUMERIC(14,2) NOT NULL,
    currency          TEXT NOT NULL DEFAULT 'BDT',
    status            payment_status NOT NULL DEFAULT 'initiated',
    idempotency_key   TEXT NOT NULL UNIQUE,
    webhook_payload   JSONB,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_payment_txn_user ON payment_transactions(user_id);
CREATE INDEX ix_payment_txn_status ON payment_transactions(status);

-- =====================================================================
-- SECTION 9 — NOTIFICATIONS
-- =====================================================================

CREATE TABLE notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       notification_type NOT NULL,
    channel    notification_channel NOT NULL,
    title      TEXT NOT NULL,
    body       TEXT,
    data       JSONB,
    is_read    BOOLEAN NOT NULL DEFAULT false,
    sent_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);

-- =====================================================================
-- SECTION 10 — REVIEWS, REPORTS, DISPUTES
-- =====================================================================

CREATE TABLE reviews (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id      UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    reviewer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewee_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating           SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment          TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at       TIMESTAMPTZ,
    UNIQUE (contract_id, reviewer_user_id)
);
CREATE INDEX ix_reviews_reviewee ON reviews(reviewee_user_id);

CREATE TABLE reports (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    reported_job_id      UUID REFERENCES jobs(id) ON DELETE SET NULL,
    reported_message_id  UUID REFERENCES messages(id) ON DELETE SET NULL,
    reason               TEXT NOT NULL,
    description           TEXT,
    status                report_status NOT NULL DEFAULT 'open',
    resolved_by_admin_id  UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    resolved_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_reports_status ON reports(status);

CREATE TABLE disputes (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id           UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    escrow_id             UUID REFERENCES escrows(id) ON DELETE SET NULL,
    raised_by_user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    against_user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason                TEXT NOT NULL,
    description           TEXT,
    status                dispute_status NOT NULL DEFAULT 'open',
    resolution_notes      TEXT,
    resolved_by_admin_id  UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    resolved_at           TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_disputes_status ON disputes(status);

-- =====================================================================
-- SECTION 11 — SUBSCRIPTIONS & PREMIUM
-- =====================================================================

CREATE TABLE subscriptions (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan       subscription_plan NOT NULL,
    amount_bdt NUMERIC(10,2) NOT NULL DEFAULT 100,   -- 100 BDT/month per spec
    status     subscription_status NOT NULL DEFAULT 'active',
    starts_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    auto_renew BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_subscriptions_user ON subscriptions(user_id, status);

CREATE TABLE premium_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action          TEXT NOT NULL,    -- 'subscribed' | 'renewed' | 'expired' | 'cancelled'
    amount_bdt      NUMERIC(10,2),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- SECTION 12 — KYC & COMPLIANCE
-- =====================================================================

CREATE TABLE kyc_verifications (
    id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type              kyc_document_type NOT NULL,
    document_number_encrypted  BYTEA NOT NULL,
    document_number_hash       TEXT NOT NULL,   -- dedupe check across accounts
    document_front_url         TEXT NOT NULL,
    document_back_url          TEXT,
    selfie_url                 TEXT,
    status                     kyc_status NOT NULL DEFAULT 'pending',
    reviewed_by_admin_id       UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    reviewed_at                 TIMESTAMPTZ,
    rejection_reason            TEXT,
    created_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_kyc_user ON kyc_verifications(user_id);
CREATE INDEX ix_kyc_status ON kyc_verifications(status);

-- =====================================================================
-- SECTION 13 — AUDIT & ADMIN CONFIGURATION
-- =====================================================================

-- Immutable, append-only. No updated_at / deleted_at on purpose.
CREATE TABLE audit_logs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id     UUID,             -- users.id or admin_users.id depending on actor_type; NULL = system
    actor_type   actor_type NOT NULL,
    action       TEXT NOT NULL,    -- e.g. 'escrow.release', 'kyc.approve'
    entity_type  TEXT NOT NULL,
    entity_id    UUID,
    before_state JSONB,
    after_state  JSONB,
    ip_address   INET,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX ix_audit_logs_actor ON audit_logs(actor_id, created_at DESC);

CREATE TABLE feature_flags (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key         TEXT NOT NULL UNIQUE,
    is_enabled  BOOLEAN NOT NULL DEFAULT false,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- SECTION 14 — SEARCH SYNC (Postgres → Elasticsearch outbox)
-- =====================================================================
-- Elasticsearch is the primary search engine (see Architecture doc §2).
-- This table is a transactional outbox: application code inserts a row
-- here in the SAME transaction as any job/worker_profile change, and a
-- background consumer reindexes into Elasticsearch and marks it
-- processed — guaranteeing the search index never silently drifts from
-- Postgres, without a distributed transaction.

CREATE TABLE search_sync_queue (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type  TEXT NOT NULL,     -- 'job' | 'worker_profile'
    entity_id    UUID NOT NULL,
    operation    TEXT NOT NULL,     -- 'index' | 'delete'
    processed_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_search_sync_unprocessed ON search_sync_queue(created_at) WHERE processed_at IS NULL;

-- =====================================================================
-- SECTION 15 — updated_at AUTO-TOUCH TRIGGER
-- =====================================================================

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to every table with an updated_at column, e.g.:
--   CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
--     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- Full trigger list is generated by migration tooling in Phase 2 —
-- omitted here table-by-table for brevity, the function above is the
-- reusable building block.
