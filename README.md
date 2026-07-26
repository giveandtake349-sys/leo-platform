# Leo Platform — Full Source Code

**Find Jobs. Hire Talent. Build Future.**

---

## 📁 Project Structure

```
leo-complete/
├── docs/                          # Design documents (SRS, Architecture, API Docs, DB Schema)
├── leo-backend/                   # NestJS REST API + WebSocket server
└── leo-flutter/                   # Flutter mobile app (Android + iOS)
```

---

## ⚡ Quick Start — Backend (Replit / Local)

### Prerequisites
- Node.js 20+
- PostgreSQL 15+ with PostGIS extension
- Redis 7+
- Elasticsearch 8+ (optional for dev — app falls back gracefully)

### 1. Setup environment
```bash
cd leo-backend
cp .env.example .env
# Edit .env — fill in DB credentials, JWT secrets, AES_KEY, payment keys
```

### 2. Generate AES_KEY (required)
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Paste output into AES_KEY in .env
```

### 3. Generate JWT secrets
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Use for JWT_SECRET and JWT_REFRESH_SECRET (different values)
```

### 4. Install & run
```bash
npm install
npm run start:dev
# API available at http://localhost:3000/v1
```

### 5. Run with Docker (recommended)
```bash
docker compose up -d
# Starts API + PostgreSQL + Redis + Elasticsearch automatically
```

---

## 📱 Flutter App Setup

### Prerequisites
- Flutter SDK 3.16+
- Android Studio / Xcode

### Run
```bash
cd leo-flutter
flutter pub get
flutter run
```

### Configure API URL
Edit `lib/core/utils/api_client.dart`:
```dart
static const _baseUrl = 'http://YOUR_BACKEND_URL/v1';
```

---

## 🔑 Critical .env Variables

| Variable | Description |
|---|---|
| `AES_KEY` | 64-char hex — encrypts phone/NID/account numbers |
| `JWT_SECRET` | 64-char random string |
| `JWT_REFRESH_SECRET` | Different 64-char random string |
| `DB_PASS` | PostgreSQL password |
| `BKASH_APP_KEY` | From bKash merchant dashboard |
| `FIREBASE_PRIVATE_KEY` | From Firebase console → Service accounts |

---

## 🏗️ Backend Modules

| Module | Path | Key Feature |
|---|---|---|
| Auth | `src/modules/auth/` | Phone OTP, JWT, refresh tokens, AES-256 encryption |
| Jobs | `src/modules/jobs/` | Feed ordering (Premium→Newest), 4h boost expiry |
| Chat | `src/modules/chat/` | Socket.IO, contact-info blocking pre-contract |
| Escrow | `src/modules/escrow/` | 12-state machine, append-only audit trail |
| Wallet | `src/modules/wallet/` | Append-only ledger, never hand-edit balances |
| Payments | `src/modules/payments/` | bKash/Nagad/Rocket webhooks, idempotency |
| Notifications | `src/modules/notifications/` | FCM push + in-app |
| Admin | `src/modules/admin/` | KYC review, disputes, feature flags, audit logs |

---

## 📋 Background Jobs (auto-run with the server)

| Job | Schedule | Purpose |
|---|---|---|
| `PremiumBoostJob` | Every minute | Expires 4-hour boost window |
| `WithdrawalSlaJob` | Every 30 min | Alerts if withdrawal pending >20h |
| `SearchSyncJob` | Every 10 sec | Syncs Postgres → Elasticsearch |

---

## 📚 Docs Folder Contents

| File | Contents |
|---|---|
| `Leo-01-SRS.md` | Full Software Requirements Specification |
| `Leo-02-Architecture.md` | System architecture + tech stack + migration strategy |
| `Leo-03-Database-Schema.sql` | Complete PostgreSQL DDL (40+ tables) |
| `Leo-04-ERD.mermaid` | Entity Relationship Diagram |
| `Leo-05-API-Documentation.md` | All ~90 endpoints with request/response specs |

---

## 🚀 Deployment

### Docker Compose (dev/staging)
```bash
cd leo-backend
docker compose up -d
```

### Kubernetes (production)
```bash
kubectl apply -f k8s/deployment.yaml
```

### CI/CD
GitHub Actions pipeline in `.github/workflows/ci-cd.yml`:
- Push to `main` → test → build Docker image → push to ECR → deploy to EKS

---

## ⚠️ Before Going Live Checklist

- [ ] Change all secrets in `.env` (never use example values)
- [ ] Set `NODE_ENV=production`
- [ ] Enable PostgreSQL SSL (`DB_SSL=true`)
- [ ] Configure real Firebase project for FCM
- [ ] Add real bKash/Nagad/Rocket merchant credentials
- [ ] Set up Cloudflare in front of the API
- [ ] Run `npm run migration:run` instead of `synchronize: true`
- [ ] Set up automated PostgreSQL backups
