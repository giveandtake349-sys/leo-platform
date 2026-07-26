# Leo — REST API Documentation

**Version:** 1.0 — Phase 2 of 5
**Scope:** Deliverable 7 from the master spec — every module gets full endpoint coverage in the quick-reference table (§3); the ~16 endpoints where getting the contract exactly right matters most (auth, money movement, webhooks) get full request/response/validation/error detail (§4).

---

## 1. Conventions

- **Base URL:** `https://api.leo.app/v1`
- **Auth header:** `Authorization: Bearer <JWT>` — omitted only on endpoints explicitly marked `Auth: None`.
- **Content-Type:** `application/json`, except file uploads which use `multipart/form-data`.
- **Casing:** JSON bodies use `camelCase`. The database (Phase 1) uses `snake_case` — the ORM layer maps between them.
- **Pagination:** `?page=1&limit=20` (max `limit`: 100) → `{ "data": [...], "meta": { "page": 1, "limit": 20, "total": 123 } }`
- **Idempotency:** every mutating endpoint that moves money requires an `Idempotency-Key` header (UUID). Replaying the same key returns the original response instead of double-processing.
- **Rate limiting:** `429` responses include a `Retry-After` header (seconds).
- **Versioning:** URL-path versioned (`/v1/`); breaking changes ship as `/v2/`.
- **Standard error envelope:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "phone must be a valid Bangladeshi number",
    "details": { "field": "phone" }
  }
}
```

## 2. Global Error Codes

| HTTP | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Request body failed schema validation |
| 401 | `UNAUTHORIZED` | Missing/expired/invalid JWT |
| 403 | `FORBIDDEN` | Authenticated, but not allowed to perform this action |
| 403 | `CONTACT_LOCKED` | Attempted to read contact info before contract + payment are finalized |
| 404 | `NOT_FOUND` | Resource doesn't exist or isn't visible to this user |
| 409 | `CONFLICT` | State conflict (e.g. applying twice, invalid escrow transition) |
| 422 | `UNPROCESSABLE_ENTITY` | Well-formed but semantically invalid (e.g. milestone amount exceeds contract total) |
| 429 | `RATE_LIMITED` | Too many requests — see `Retry-After` |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

Domain-specific codes are listed with each detailed endpoint in §4.

---

## 3. Endpoint Reference (All Modules)

### Authentication — `/auth`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/otp/send` | None | Request an OTP for login or WhatsApp verification |
| POST | `/auth/otp/verify` | None | Verify OTP, receive JWT + refresh token |
| POST | `/auth/whatsapp/verify` | Bearer | Verify a separately-OTP'd WhatsApp number |
| POST | `/auth/refresh` | Refresh token | Exchange refresh token for a new access token |
| POST | `/auth/logout` | Bearer | Revoke current session |
| POST | `/auth/devices` | Bearer | Register/update an FCM device token |

### Users — `/users`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/users/me` | Bearer | Current user's base identity record |
| PATCH | `/users/me` | Bearer | Update `preferredLanguage`, etc. |
| DELETE | `/users/me` | Bearer | Soft-delete / deactivate account |

### Companies — `/companies`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/companies` | Bearer (employer) | Create employer/company profile |
| GET | `/companies/:id` | Bearer | Public company profile (contact fields redacted per FR-2) |
| PATCH | `/companies/me` | Bearer (employer) | Update own company profile |
| POST | `/companies/me/logo` | Bearer (employer) | Upload logo (multipart) |

### Workers — `/workers`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/workers` | Bearer (worker) | Create worker profile |
| GET | `/workers/:id` | Bearer | Public worker profile (contact fields redacted per FR-2) |
| PATCH | `/workers/me` | Bearer (worker) | Update own profile |
| PATCH | `/workers/me/open-to-work` | Bearer (worker) | Toggle availability |
| POST | `/workers/me/photo` | Bearer (worker) | Upload profile photo (multipart) |
| GET/POST/DELETE | `/workers/me/skills[/:skillId]` | Bearer (worker) | Manage skill list |
| GET/POST/DELETE | `/workers/me/portfolio[/:id]` | Bearer (worker) | Manage portfolio items |
| GET/POST/DELETE | `/workers/me/certificates[/:id]` | Bearer (worker) | Manage certificates |

### Categories — `/categories`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/categories` | None | All 41 categories |
| GET | `/categories/:id/skills` | None | Skills under a category |

### Jobs — `/jobs`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/jobs` | Bearer (employer) | Create a job post |
| GET | `/jobs` | None | Feed — filters + Active Premium→Newest→Older→Archived ordering |
| GET | `/jobs/nearby` | None | GPS/radius search (5/10/25/50 km) |
| GET | `/jobs/:id` | None | Job detail |
| PATCH | `/jobs/:id` | Bearer (owner) | Update job |
| DELETE | `/jobs/:id` | Bearer (owner) | Archive job |
| POST | `/jobs/:id/boost` | Bearer (owner) | Purchase 4-hour premium boost (100 BDT) |
| GET | `/jobs/:id/applicants` | Bearer (owner) | List applicants |

### Search — `/search`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/search/jobs` | None | Elasticsearch-backed advanced job search |
| GET | `/search/workers` | Bearer (employer) | Elasticsearch-backed worker search |

### Applications & Interests
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/jobs/:id/apply` | Bearer (worker) | Apply to a job |
| GET | `/applications/me` | Bearer (worker) | My applications |
| PATCH | `/applications/:id` | Bearer (employer) | Shortlist / reject / hire |
| DELETE | `/applications/:id` | Bearer (worker) | Withdraw application |
| POST | `/interests` | Bearer (employer) | Express interest in a worker |
| GET | `/interests/me` | Bearer | My sent/received interests |
| PATCH | `/interests/:id` | Bearer (worker) | Accept / decline |

### Saved & Blocked
| Method | Path | Auth | Description |
|---|---|---|---|
| POST/DELETE | `/saved[/:id]` | Bearer | Save/unsave a job or worker |
| GET | `/saved/me` | Bearer | My saved items |
| POST/DELETE | `/blocked[/:id]` | Bearer | Block/unblock a user |

### Chat — `/chats`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/chats` | Bearer | My chat threads |
| POST | `/chats` | Bearer | Get-or-create a thread for a job/counterparty |
| GET | `/chats/:id/messages` | Bearer (participant) | Message history (paginated) |
| POST | `/chats/:id/messages` | Bearer (participant) | Send text/location/quick-reply |
| POST | `/chats/:id/messages/voice` | Bearer (participant) | Upload + send voice message (multipart) |
| POST | `/chats/:id/messages/attachment` | Bearer (participant) | Upload + send image/PDF (multipart) |
| PATCH | `/chats/:id/messages/:msgId/read` | Bearer (participant) | Mark read |
| WS | `/ws/chat` | Bearer (query token) | Socket.IO namespace — see §5 |

### Contracts & Milestones
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/contracts` | Bearer (employer) | Create contract from a hired application |
| GET | `/contracts/:id` | Bearer (party) | Contract detail |
| GET | `/contracts/me` | Bearer | My contracts |
| POST | `/contracts/:id/commission/pay` | Bearer (party) | Pay the 2% / 250+250 BDT fee that activates the contract |
| POST | `/contracts/:id/milestones` | Bearer (employer) | Add a milestone (online freelance only) |
| PATCH | `/milestones/:id/submit` | Bearer (worker) | Submit deliverable |
| PATCH | `/milestones/:id/approve` | Bearer (employer) | Approve → triggers escrow release |
| PATCH | `/milestones/:id/request-revision` | Bearer (employer) | Send back for revision |

### Escrow — `/escrow`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/escrow` | Bearer (employer) | Create + fund escrow for a contract/milestone |
| GET | `/escrow/:id` | Bearer (party) | Escrow detail incl. transition history |
| PATCH | `/escrow/:id/release` | Bearer (employer) | Release funds to worker |
| PATCH | `/escrow/:id/refund` | Bearer (employer) or admin | Refund to employer |
| POST | `/escrow/:id/dispute` | Bearer (party) | Open a dispute, freezes the escrow |

### Wallet & Withdrawals
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/wallet/me` | Bearer | Balances (available/pending/escrow) |
| GET | `/wallet/me/transactions` | Bearer | Ledger, paginated |
| POST | `/withdrawals` | Bearer | Request withdrawal to bKash/Nagad/Rocket/bank |
| GET | `/withdrawals/me` | Bearer | My withdrawal history |
| GET | `/withdrawals/:id` | Bearer | Withdrawal status |

### Notifications
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/notifications/me` | Bearer | Paginated, filterable by type |
| PATCH | `/notifications/:id/read` | Bearer | Mark one read |
| PATCH | `/notifications/read-all` | Bearer | Mark all read |

### Subscriptions & Premium
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/subscriptions` | Bearer | Subscribe to premium (100 BDT/month) |
| GET | `/subscriptions/me` | Bearer | Current subscription status |
| POST | `/subscriptions/:id/cancel` | Bearer | Cancel auto-renew |

### Reviews & Reports
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/reviews` | Bearer (contract party) | Rate + review counterparty post-contract |
| GET | `/reviews/user/:userId` | None | Public reviews for a user |
| POST | `/reports` | Bearer | Report a user, job, or message |
| GET | `/reports/me` | Bearer | Reports I've filed |

### KYC — `/kyc`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/kyc` | Bearer | Submit NID/passport/trade license for verification |
| GET | `/kyc/me` | Bearer | My verification status |

### Payments & Webhooks
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/payments/initiate` | Bearer | Start a gateway payment (boost, permanent-job fee, commission, escrow funding, subscription) |
| GET | `/payments/:id` | Bearer | Payment status |
| POST | `/webhooks/bkash` | Gateway signature | bKash payment callback |
| POST | `/webhooks/nagad` | Gateway signature | Nagad payment callback |
| POST | `/webhooks/rocket` | Gateway signature | Rocket payment callback |
| POST | `/webhooks/sslcommerz` | Gateway signature | SSLCommerz payment callback |

### Admin — `/admin/*` (separate namespace; admin JWT + RBAC permission check on every route)
| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/admin/users` | `users.read` | Search/list all users |
| PATCH | `/admin/users/:id/suspend` | `users.write` | Suspend/reinstate a user |
| GET | `/admin/kyc/pending` | `kyc.read` | KYC review queue |
| PATCH | `/admin/kyc/:id/approve` | `kyc.write` | Approve KYC |
| PATCH | `/admin/kyc/:id/reject` | `kyc.write` | Reject KYC with reason |
| GET | `/admin/disputes` | `disputes.read` | Dispute queue |
| PATCH | `/admin/disputes/:id/resolve` | `disputes.write` | Resolve a dispute |
| GET | `/admin/reports` | `reports.read` | Moderation queue |
| PATCH | `/admin/reports/:id/resolve` | `reports.write` | Resolve a report |
| GET | `/admin/analytics/revenue` | `analytics.read` | Commission/subscription revenue dashboard |
| GET | `/admin/analytics/platform` | `analytics.read` | Users/jobs/contracts growth dashboard |
| GET/POST/PATCH | `/admin/categories[/:id]` | `categories.write` | Manage the 41 categories |
| GET/PATCH | `/admin/feature-flags[/:key]` | `flags.write` | Toggle feature flags |
| GET | `/admin/audit-logs` | `audit.read` | Query audit trail by entity |

---

## 4. Detailed Endpoint Specifications

### 4.1 Authentication

**`POST /auth/otp/send`** — Auth: None
```json
// Request
{ "phone": "+8801712345678", "purpose": "login" }
```
```json
// 200 Response
{ "requestId": "5c1f...-uuid", "expiresInSeconds": 300 }
```
**Validation:** `phone` must match `+880` + 10 digits; `purpose` ∈ `login` \| `whatsapp_verify`.
**Errors:** `400 VALIDATION_ERROR` · `429 RATE_LIMITED` (max 5 OTP requests/hour per phone+IP) · `403 AUTH_USER_SUSPENDED`

**`POST /auth/otp/verify`** — Auth: None
```json
// Request
{ "requestId": "5c1f...-uuid", "otp": "123456", "deviceFingerprint": "fp_abc123" }
```
```json
// 200 Response
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "expiresIn": 900,
  "user": { "id": "uuid", "role": "worker", "isPhoneVerified": true, "isWhatsappVerified": false }
}
```
**Validation:** `otp` exactly 6 digits; `requestId` must be unverified and unexpired.
**Errors:** `400 AUTH_OTP_INVALID` · `410 AUTH_OTP_EXPIRED` · `429 AUTH_OTP_MAX_ATTEMPTS` (locks the requestId after 5 wrong tries)

**`POST /auth/refresh`** — Auth: Refresh token (body)
```json
// Request
{ "refreshToken": "eyJ..." }
```
```json
// 200 Response
{ "accessToken": "eyJ...", "expiresIn": 900 }
```
**Errors:** `401 AUTH_REFRESH_INVALID` · `401 AUTH_REFRESH_REVOKED`

---

### 4.2 Jobs

**`POST /jobs`** — Auth: Bearer (employer, verified company)
```json
// Request
{
  "categoryId": "uuid",
  "title": "AC Technician needed",
  "description": "2 years experience, Dhaka based...",
  "jobType": "permanent",
  "workMode": "offline",
  "salaryMin": 20000, "salaryMax": 25000, "salaryPeriod": "monthly",
  "location": { "division": "Dhaka", "district": "Dhaka", "thana": "Gulshan", "lat": 23.78, "lng": 90.41 },
  "skillIds": ["uuid", "uuid"]
}
```
```json
// 201 Response
{ "id": "uuid", "status": "active", "isPremium": false, "createdAt": "2026-07-20T10:00:00Z" }
```
**Validation:** `title` ≤120 chars; `salaryMin` ≤ `salaryMax`; `categoryId` must be one of the 41 active categories; employer must have `verificationStatus != rejected`.
**Errors:** `400 VALIDATION_ERROR` · `403 FORBIDDEN` (unverified company posting a job type that requires verification) · `422 JOB_INVALID_SALARY_RANGE`

**`GET /jobs`** — Auth: None
Query params: `categoryId, skillId, division, district, minSalary, maxSalary, workMode, jobType, lat, lng, radiusKm, sort(nearby|newest|relevant), page, limit`
```json
// 200 Response
{
  "data": [ { "id": "uuid", "title": "...", "isPremium": true, "salaryMin": 20000, "salaryMax": 25000, "distanceKm": 3.2 } ],
  "meta": { "page": 1, "limit": 20, "total": 214 }
}
```
**Ordering:** Active Premium → Newest → Older → Archived is the default when `sort` is omitted, per FR-6.4.
**Errors:** `400 VALIDATION_ERROR` (e.g. `radiusKm` not in {5,10,25,50})

**`POST /jobs/:id/boost`** — Auth: Bearer (owner)
```json
// Request
{ "idempotencyKey": "uuid" }
```
```json
// 200 Response
{ "paymentId": "uuid", "status": "pending", "gatewayRedirectUrl": "https://..." }
```
**Validation:** job must not already be boosted; owner must have a payment method available.
**Errors:** `409 JOB_ALREADY_BOOSTED` · `402 PAYMENT_REQUIRED`

---

### 4.3 Chat

**`POST /chats/:id/messages`** — Auth: Bearer (participant)
```json
// Request
{ "type": "text", "content": "Hi, I'm interested in your job post." }
```
```json
// 201 Response
{ "id": "uuid", "chatId": "uuid", "senderId": "uuid", "type": "text", "content": "Hi, I'm interested in your job post.", "createdAt": "..." }
```
**Validation:** if `contract.status != active` (i.e. pre-payment), `content` is scanned server-side; matches for phone numbers, WhatsApp numbers, social handles, emails, or URLs are rejected before persistence, per FR-9.1.
**Errors:** `422 CHAT_CONTACT_INFO_BLOCKED` · `403 CHAT_LOCKED` (chat archived/blocked) · `429 RATE_LIMITED`

---

### 4.4 Contracts & Escrow

**`POST /contracts`** — Auth: Bearer (employer)
```json
// Request
{ "applicationId": "uuid", "contractType": "online_freelance", "rateAmount": 60000, "ratePeriod": "fixed" }
```
```json
// 201 Response
{ "id": "uuid", "status": "draft", "contractType": "online_freelance" }
```
**Validation:** `applicationId` must be in status `applied`/`shortlisted` and belong to the requesting employer's job.
**Errors:** `409 CONFLICT` (application already converted) · `403 FORBIDDEN`

**`POST /escrow`** — Auth: Bearer (employer) — **Idempotency-Key required**
```json
// Request
{ "contractId": "uuid", "milestoneId": "uuid", "amount": 20000, "paymentMethod": "bkash" }
```
```json
// 201 Response
{ "id": "uuid", "status": "pending", "paymentId": "uuid", "gatewayRedirectUrl": "https://..." }
```
Status flips `pending → funded` on the payment webhook (§4.5) confirming success, writing one `escrow_transitions` row.
**Validation:** `amount` must equal the milestone's `amount` exactly (no partial funding); contract must be `active`.
**Errors:** `422 ESCROW_AMOUNT_MISMATCH` · `409 ESCROW_INVALID_TRANSITION` · `404 NOT_FOUND`

**`PATCH /escrow/:id/release`** — Auth: Bearer (employer)
```json
// Request
{}
```
```json
// 200 Response
{ "id": "uuid", "status": "released", "releasedAt": "..." }
```
Server-side: only legal from `approved`. On success, in one DB transaction: escrow → `released`, a `wallet_transactions` credit row is inserted for the worker, `wallets.available_balance` updates, and a `notification` fires — this is the canonical example of the outbox pattern described in the Architecture doc §4.
**Errors:** `409 ESCROW_INVALID_TRANSITION` (e.g. releasing from `funded` without an `approved` milestone) · `403 FORBIDDEN`

**`POST /escrow/:id/dispute`** — Auth: Bearer (party)
```json
// Request
{ "reason": "worker_no_delivery", "description": "No submission after the due date." }
```
```json
// 201 Response
{ "disputeId": "uuid", "escrowStatus": "disputed" }
```
Freezes the escrow (no further transitions until an admin resolves it via `/admin/disputes/:id/resolve`).
**Errors:** `409 CONFLICT` (escrow already terminal — `released`/`refunded`/`closed`)

---

### 4.5 Wallet, Withdrawals, Payments & Webhooks

**`POST /withdrawals`** — Auth: Bearer — **Idempotency-Key required**
```json
// Request
{ "amount": 5000, "method": "bkash", "accountNumber": "017XXXXXXXX" }
```
```json
// 201 Response
{ "id": "uuid", "status": "pending", "requestedAt": "..." }
```
**Validation:** `amount` ≤ `wallet.available_balance`; minimum withdrawal 100 BDT; `accountNumber` encrypted before storage.
**Errors:** `422 WITHDRAWAL_INSUFFICIENT_BALANCE` · `422 WITHDRAWAL_BELOW_MINIMUM`
**SLA:** processed within 24h per FR-13.4; the background monitor (Architecture §7) pages on-call past 20h.

**`POST /payments/initiate`** — Auth: Bearer — **Idempotency-Key required**
```json
// Request
{ "payableType": "escrow_funding", "payableId": "uuid", "gateway": "bkash", "amount": 20000 }
```
```json
// 200 Response
{ "paymentId": "uuid", "status": "pending", "gatewayRedirectUrl": "https://checkout.bkash.com/..." }
```
**Errors:** `422 PAYMENT_AMOUNT_MISMATCH` · `409 PAYMENT_ALREADY_PROCESSED` (idempotency replay)

**`POST /webhooks/bkash`** — Auth: gateway signature header (`X-Bkash-Signature`), verified against the raw body before parsing
```json
// Gateway → Leo payload (representative — actual shape is bKash's)
{ "paymentID": "TR0011...", "trxID": "8XY...", "status": "Completed", "amount": "20000" }
```
```json
// 200 Response (always 200 to the gateway once processed, even on business-logic failure)
{ "received": true }
```
**Processing rules (identical pattern for Nagad/Rocket/SSLCommerz):**
1. Verify signature — reject with `401` (no retry) if invalid.
2. Look up `payment_transactions` by `gateway_reference`; if `status` is already `success`, return `200` immediately (idempotent replay, no double-credit).
3. On success: update `payment_transactions.status`, then apply the domain effect (fund escrow / unlock contract contacts / activate subscription) in the same DB transaction.
4. Any failure after step 3 begins is retried by the queue consumer, never re-triggered by the gateway retrying the webhook.
**Errors:** `401 WEBHOOK_SIGNATURE_INVALID` · `422 WEBHOOK_PAYLOAD_MALFORMED`

---

### 4.6 Admin

**`PATCH /admin/kyc/:id/approve`** — Auth: Bearer (admin), Permission: `kyc.write`
```json
// Request
{}
```
```json
// 200 Response
{ "id": "uuid", "status": "approved", "reviewedAt": "..." }
```
Writes an `audit_logs` row with `before_state`/`after_state` snapshots automatically — every admin mutation does, not just this one.
**Errors:** `409 CONFLICT` (already reviewed) · `403 FORBIDDEN` (missing permission)

---

## 5. WebSocket Events — `/ws/chat`

Connect with `?token=<accessToken>`. Namespace scoped to chats the connected user participates in.

| Event (client→server) | Payload | Event (server→client) | Payload |
|---|---|---|---|
| `message:send` | `{ chatId, type, content }` | `message:new` | Full message object |
| `typing:start` | `{ chatId }` | `typing:update` | `{ chatId, userId, isTyping }` |
| `typing:stop` | `{ chatId }` | | |
| `message:read` | `{ chatId, messageId }` | `message:read:ack` | `{ chatId, messageId, readBy, readAt }` |
| — | — | `presence:update` | `{ userId, isOnline, lastSeenAt }` |

Multi-pod delivery goes through the Redis Socket.IO adapter (Architecture §6) so events reach the right user regardless of which pod holds their socket.

---

## 6. What's Next
Phase 3 covers the full sequence diagrams for Auth, Escrow, Premium Feed, Wallet, Notification, Chat, and Admin flows — showing how these endpoints, the background jobs, and the state machine in Phase 1 fit together end-to-end.
