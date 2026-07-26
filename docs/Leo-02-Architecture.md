# Leo — System Architecture (High-Level + Low-Level)

**Version:** 1.0 — Phase 1 of 5

---

## 1. Architecture Principles
1. Ship a **modular monolith** first; design module boundaries so each can be extracted into its own service later without a rewrite.
2. Every money-moving operation (escrow, wallet, payment) is idempotent and auditable **by construction**, not by convention.
3. Chat and Search are the two subsystems most likely to need independent scaling early — they're designed as near-services from day one, even inside the monolith.

---

## 2. Recommended Technology Stack

| Layer | Technology | Why |
|---|---|---|
| Mobile app | Flutter | Single codebase for Android/iOS; matches the dark-themed reference UI |
| Backend API | NestJS (Node/TypeScript) | Opinionated module system maps directly onto the module breakdown in §3 |
| Primary database | PostgreSQL 15+ (with PostGIS) | Relational integrity for contracts/escrow/wallet; PostGIS powers radius search |
| Cache / queues / pub-sub | Redis | Session cache, feed cache, Socket.IO adapter, BullMQ job queues |
| Real-time | Socket.IO | Chat, typing indicators, read receipts, online status |
| Push notifications | Firebase Cloud Messaging | Cross-platform push |
| Search | Elasticsearch | Skill/distance/salary/relevance search beyond Postgres's reach |
| Async messaging | RabbitMQ | Cross-module events (`escrow.released` → `wallet.credit` → `notification.send`) |
| Object storage | AWS S3 | Photos, portfolios, certificates, voice messages, KYC documents |
| CDN / WAF | Cloudflare | DDoS protection, static asset caching |
| Ingress | Nginx | TLS termination, reverse proxy, sticky sessions for Socket.IO |
| Orchestration | Kubernetes (AWS) | Horizontal scaling, rolling / blue-green deploys |
| Containers | Docker | Build once, run everywhere |
| CI/CD | GitHub Actions | Build, test, scan, deploy |
| Observability | Prometheus + Grafana | Metrics, dashboards, alerting |

---

## 3. Modular Monolith (MVP) — Module Breakdown

One NestJS deployable, internally divided into modules that each **own their own tables** and expose a clean service interface — no module reaches into another's tables directly.

| Module | Owns | Key responsibility |
|---|---|---|
| **Auth** | otp_requests, devices, sessions | OTP, WhatsApp verify, JWT/refresh, fraud checks |
| **Identity** | users, companies, worker_profiles, kyc_verifications | Profiles, verification |
| **Catalog** | categories, skills, feature_flags | Taxonomy, admin-toggleable flags |
| **Jobs** | jobs, job_skills, applications, interests, saved_items | Posting, applying, discovery inputs |
| **Search** | (consumes `search_sync_queue`) | Elasticsearch indexing + query API |
| **Chat** | chats, messages, message_attachments | Socket.IO gateway, moderation |
| **Contracts** | contracts, milestones | Hiring-model logic |
| **Escrow** | escrows, escrow_transitions | State-machine engine |
| **Wallet** | wallets, wallet_transactions, withdrawals | Balances, ledger, payouts |
| **Payments** | payment_transactions | Gateway adapters, webhooks, reconciliation |
| **Notifications** | notifications | FCM / WhatsApp / SMS dispatch |
| **Admin** | admin_users, roles, permissions, reports, disputes, audit_logs | Back-office + RBAC |
| **AI** | — (wraps external model calls) | Recommendation, spam scoring, translation, resume parsing |

**Low-level pattern per module:** `Controller → Service → Repository`, one NestJS module per row above, DTOs validated at the controller boundary, domain events published to an in-process event bus (swapped for RabbitMQ at extraction time — see §5). Full sequence diagrams per flow ship in Phase 3.

---

## 4. Microservices (Scaling Phase) — Target Decomposition

| Service | Owns | Communication |
|---|---|---|
| Auth Service | users, sessions, devices, otp | REST (sync, latency-sensitive) |
| Profile Service | companies, worker_profiles, skills, KYC | REST + events |
| Job Service | jobs, applications, interests | REST + events |
| Search Service | Elasticsearch index | Consumes events from Job/Profile services |
| Chat Service | chats, messages | WebSocket, dedicated Redis pub/sub cluster |
| Contract & Escrow Service | contracts, milestones, escrows | REST + events (`escrow.*`) |
| Wallet & Payment Service | wallets, transactions, withdrawals, gateways | REST + events — strongest consistency requirement in the system |
| Notification Service | notifications | Consumes events from every other service |
| Admin & Analytics Service | admin_users, reports, disputes, audit_logs | REST |

All non-transactional cross-service communication runs through RabbitMQ (event-driven), fronted by an API Gateway (Kong or Nginx) for client-facing sync calls. Cross-service financial consistency (e.g. "an escrow release credits exactly one wallet exactly once") uses the **transactional outbox pattern + idempotent consumers** — not distributed transactions.

---

## 5. Migration Strategy (Monolith → Microservices)

Strangler-fig approach; extraction order is chosen by **scaling pressure**, not ease:

1. **Chat** — extracted first. WebSocket connection-count scaling is unlike anything else in the system.
2. **Search** — second. Elasticsearch query/index throughput scales independently of the rest of the app.
3. **Wallet & Payment** — third, and extracted *last of the high-priority three* on purpose: this is the highest-consequence subsystem to get wrong, so it moves behind a feature flag with a dual-write verification window before cutover.
4. **Jobs / Profile / Notifications / Admin** — extracted opportunistically as load dictates. Admin/CMS has the lowest scaling pressure and can reasonably stay in the monolith longest.

Each extraction: stand up the new service against a copy of its owned tables → dual-write from the monolith during a transition window → backfill → cut over reads → cut over writes → drop the tables from the monolith. The clean module/table ownership in §3 is what makes this mechanical rather than a rewrite.

---

## 6. Deployment Topology

```
Flutter app
   │
Cloudflare (CDN / WAF)
   │
Nginx Ingress (TLS termination, sticky sessions)
   │
Kubernetes cluster
   ├─ API pods                (stateless, autoscaled on CPU/RPS)
   ├─ Socket.IO pods           (autoscaled, Redis adapter for cross-pod broadcast)
   ├─ Worker/consumer pods     (RabbitMQ consumers: notifications, search sync, reconciliation)
   └─ CronJob pods             (premium-boost sweep, OTP cleanup, subscription expiry)
   │
PostgreSQL (managed, primary + read replica) · Redis (managed) · Elasticsearch cluster · S3 · RabbitMQ (managed)
   │
Prometheus (scrapes all pods) → Grafana (dashboards) → Alertmanager (error-rate, queue depth, stuck escrow, webhook failures)
```

---

## 7. Critical Background Jobs
- **Premium-boost expiry sweep** — runs every minute; flips `jobs.is_premium` false once `premium_boosted_at + 4h` has passed (belt-and-suspenders on top of the feed query already excluding expired boosts).
- **OTP cleanup** — enforces expiry, purges stale rows.
- **Withdrawal SLA monitor** — alerts if a withdrawal is unprocessed past 20 hours, ahead of the 24h SLA breach.
- **Payment reconciliation** — nightly diff between gateway settlement reports and `payment_transactions`.

## 8. What's Next
Sequence diagrams for Auth, Escrow, Premium Feed, Wallet, Notification, Chat, and Admin flows ship in Phase 3 of this documentation set (roadmap in chat).
