# Leo — Software Requirements Specification (SRS)

**Version:** 1.0 — Phase 1 of 5 (Foundation)
**Platform:** Leo — Dual-Mode Job Marketplace (Offline + Online Freelancing), Bangladesh
**Status:** Draft for engineering kickoff

---

## 1. Introduction

### 1.1 Purpose
This document specifies the functional and non-functional requirements for Leo, a job marketplace connecting Employers ("Malik") and Workers/Freelancers, so that engineering, QA, security, and DevOps can build against a single source of truth.

### 1.2 Scope
Covers both **Offline Jobs** (physical, blue-collar and white-collar) and **Online Digital Freelancing**, on one platform, for one worker/employer identity.

### 1.3 Definitions & Abbreviations

| Term | Meaning |
|---|---|
| BDT | Bangladeshi Taka |
| OTP | One-Time Password |
| JWT | JSON Web Token |
| KYC | Know Your Customer |
| NID | National ID (Bangladesh) |
| RBAC | Role-Based Access Control |
| FCM | Firebase Cloud Messaging |
| Malik | "Owner" — the in-app label for the employer/company-owner role |
| Thana | Sub-district administrative unit (Bangladesh) |
| MVP | Minimum Viable Product |

### 1.4 Intended Audience
Engineering, QA, DevOps, Security, and Product stakeholders building and operating Leo.

---

## 2. Product Overview

Leo is a dual-interface job marketplace combining the strengths of Upwork/Fiverr (escrow-backed freelancing), LinkedIn Jobs/Indeed (permanent hiring), and local blue-collar hiring marketplaces (offline, phone-first) — while staying extremely simple for first-time, low-literacy users.

Core design constraint carried through every requirement below: **phone-OTP-only auth, icon-first navigation, minimal typing.** The reference UI confirms this — a two-button entry ("I'm looking for a job" / "I want to hire"), a single phone field, and a 5-tab bottom nav (Home / Jobs / Chat / Contracts / Profile).

---

## 3. User Roles & Personas

### 3.1 Employer / Company Owner ("Malik")
**Profile fields:** company name, owner name, phone, WhatsApp, logo, verification status, premium status.
**Capabilities:** dashboard, post job, manage jobs/applicants, express interest, chat, contracts, escrow, wallet, subscription, notifications, analytics, hiring history, saved workers, blocked workers, reports.

### 3.2 Worker / Freelancer
**Profile fields:** full name, phone, WhatsApp, photo, skills, experience, education, languages, availability (Offline / Online / Both), open-to-work toggle, portfolio, certificates, ratings/reviews.
**Capabilities:** wallet, withdrawal history, trust verification (Blue Tick), saved jobs, applied jobs, completed jobs, earnings dashboard.

### 3.3 Platform Admin
Internal staff operating the Admin Panel (§4.15) under RBAC — roles such as `super_admin`, `moderator`, `finance`, `support_agent`, `kyc_reviewer`.

### 3.4 Background System Actors
Boost-expiry scheduler, chat-moderation engine, fraud-detection engine, notification dispatcher, search-sync consumer — non-human actors referenced throughout §4.

---

## 4. Functional Requirements

### FR-1 Authentication & Session Management
- FR-1.1 Register/login by phone number OTP only — no email/password for platform users.
- FR-1.2 WhatsApp number verification required in addition to phone.
- FR-1.3 Issue JWT access token + refresh token + device token on successful auth.
- FR-1.4 Rate-limit OTP requests per phone number and per IP.
- FR-1.5 OTP expires after a configurable TTL (default 5 min); capped retry count (default 5) before lockout.
- FR-1.6 Fraud detection on auth: velocity checks, device-fingerprint mismatch, SIM-swap heuristics.
- FR-1.7 Refresh tokens encrypted at rest.

### FR-2 Privacy & Contact Protection
- FR-2.1 Phone numbers, WhatsApp numbers, and any personal contact detail are AES-256 encrypted at rest; a separate deterministic hash is stored for lookups only.
- FR-2.2 No user can view another user's contact info until a contract is finalized **and** the applicable commission/fee is paid.
- FR-2.3 Contact info unlocks automatically and immediately on confirmed payment — no manual step, no admin action required.

### FR-3 Employer Dashboard
Per the reference UI, the employer dashboard surfaces: Total Jobs, Total Applicants, Active Contracts, Total Spent (BDT), a Job Performance trend chart, a Recent Applicants list (name + role applied for), and a Recent Jobs table (title, applicant count, view count, status, actions). Left nav: Dashboard, Post a Job, My Jobs, Applicants, Contracts, Escrow, Chat, Wallet, Transactions, Analytics, Saved Workers, Blocked Users, Settings.

### FR-4 Worker Dashboard
Per the reference UI: profile card with photo, name, location, and an Open-to-Work toggle; a Profile Strength meter (%, "Complete Profile" prompt); Available Balance with a Withdraw action; Applied Jobs / Active Contracts / Completed Jobs counters; Total Earnings; and a Recommended Jobs feed (title, company, location/remote, salary range, employment type, premium badge, Apply Now). Left nav mirrors the employer's: Dashboard, Find Jobs, Applied Jobs, Saved Jobs, Contracts, Escrow, Chat, Wallet, Earnings, Reviews, Skills, Certificates, Settings.

### FR-5 Job Categories
Exactly 41 fixed categories (Appendix A), each with an icon; category is a required field on every job post and a first-class filter.

### FR-6 Job Posting, Feed & Premium Boost
- FR-6.1 Any verified user can post a job for free.
- FR-6.2 Premium listing costs **100 BDT/month** and pins the post for **exactly 4 hours** from boost time.
- FR-6.3 A background scheduler automatically un-boosts a post the instant its 4-hour window elapses — no manual step.
- FR-6.4 Feed ordering: **Active Premium → Newest → Older → Archived.**

### FR-7 Location & Search
- FR-7.1 GPS "near me" search plus administrative filters: Country → Division → District → Thana → Village.
- FR-7.2 Radius search at **5 / 10 / 25 / 50 km**.
- FR-7.3 Map view for nearby jobs and nearby workers.
- FR-7.4 Filters: category, skill, distance, salary, availability, premium, rating, experience, language, verified badge; sort by nearby / newest / most relevant.

### FR-8 Real-Time Chat
- FR-8.1 WebSocket messaging; a "Message Now" entry point on job listings, applicant lists, and profiles.
- FR-8.2 Message types: text, voice message, image, PDF, location share, quick replies.
- FR-8.3 Typing indicator, read receipts, online status, push notification on new message.

### FR-9 Chat Security & Moderation
- FR-9.1 Before contract finalization, the system detects and blocks phone numbers, WhatsApp numbers, Telegram/Facebook/Messenger handles, email addresses, and external URLs shared in chat.
- FR-9.2 AI spam/fraud detection on message content, with an automatic warning to the sender and audit logging of every flagged message.
- FR-9.3 On confirmed contract payment, contact-sharing restrictions lift automatically for that chat thread only.

### FR-10 Hiring Models
- FR-10.1 **Offline Short Contract** — hourly / daily / 1–7 days; worker pays **2% commission** on contract value; contact unlocks and the contract activates only after that commission clears.
- FR-10.2 **Permanent Job** — employer pays a flat **250 BDT**, worker pays a flat **250 BDT**; contacts unlock only once both payments confirm.
- FR-10.3 **Online Freelancing** — digital, milestone-based; escrow mandatory; employer funds 100% of a milestone up front; worker submits deliverables; employer approves; escrow releases to the worker's wallet.

### FR-11 Escrow
Full state machine: `Draft → Pending → Funded → Active → Submitted → Revision → Approved → Released`, with `Refunded / Cancelled / Disputed → Closed` as terminal branches. Every transition is written to an immutable audit trail (`escrow_transitions` — see schema). *Note:* the reference UI shows a simplified 6-step tracker (Draft → Funded → Active → Submitted → Approved → Released) for end users; that's a deliberate UX simplification of the full 12-state backend machine, not a spec conflict. Full transition-trigger diagram ships in Phase 3.

### FR-12 Wallet
Tracks available balance, pending balance, escrow balance, platform-commission accrual, withdrawals, refunds, and bonuses, each backed by an append-only transaction ledger (balances are a derived, cached total — never hand-edited).

### FR-13 Payments
- FR-13.1 Gateways: bKash, Nagad, Rocket, SSLCommerz, and (future) Stripe, plus manual bank transfer for edge cases.
- FR-13.2 Every payment request carries a client-generated idempotency key so retries are safe.
- FR-13.3 Webhook handlers verify gateway signatures, are idempotent, and feed a reconciliation job that flags any gateway-vs-ledger mismatch.
- FR-13.4 Worker withdrawals (bKash/Nagad/Rocket) are processed within **24 hours** of request.

### FR-14 Notifications
Realtime push (FCM), WhatsApp Business API, SMS backup, and (future) email — triggered by chat, job, contract, escrow, payment, withdrawal, review, subscription, and system-alert events.

### FR-15 Admin Panel
User/Company/Worker management, Premium & Subscription management, Payment & Escrow monitoring, Dispute resolution, Fraud detection, Blocked-user management, KYC/NID/Passport verification, Job & Chat moderation, Reports, Analytics & Revenue dashboards, Platform-commission dashboard, System & Audit logs, Notification center, CMS, Category management, Feature flags.

### FR-16 AI Features
Job recommendation, worker recommendation, spam/fake-job/duplicate-job detection, smart search ranking, auto-translation (Bangla ↔ English), resume parsing & skill extraction, AI chat assistant.

### FR-17 Reviews, Ratings & Reports
Post-contract 1–5 star rating with comment, one per contract per direction; user-initiated reports against a user, job, or message, routed to the admin moderation queue.

---

## 5. Non-Functional Requirements

| # | Requirement | Target |
|---|---|---|
| 5.1 Performance | API response time | p95 < 300ms reads, < 800ms writes, under nominal load |
| 5.2 Scalability | API layer | Stateless, horizontally scalable behind a load balancer; Socket.IO nodes share state via Redis so chat scales across pods |
| 5.3 Security | Data protection | AES-256 at rest for PII, TLS 1.2+ in transit, JWT + refresh rotation, RBAC for admin, rate limiting, OWASP-standard hardening (full detail in Phase 4) |
| 5.4 Availability | Uptime | 99.9% API target; automated daily backups with point-in-time recovery; DR runbook in Phase 4 |
| 5.5 Localization | Languages | Bangla + English minimum, including AI translation and notifications |
| 5.6 Usability | Onboarding | First-time, low-literacy users can register and post/find a job with minimal typing — phone OTP, icon-first nav, voice messages as first-class chat input |
| 5.7 Compliance | KYC data | NID/passport images and numbers are encrypted at rest and access-logged. This SRS is not legal advice — confirm retention/consent requirements with Bangladesh Bank / BFIU-applicable counsel before launch, given bKash/Nagad/Rocket integration |
| 5.8 Auditability | Money & KYC actions | Every escrow, wallet, withdrawal, and KYC/admin decision writes to `audit_logs`, immutable, queryable by entity |

---

## 6. Assumptions & Constraints
- Primary market is Bangladesh: BDT currency, bKash/Nagad/Rocket, NID/passport KYC, Bangla/English UI, `+880` phone format.
- MVP ships as a **modular monolith** (see Architecture doc); microservices extraction is a post-PMF phase, not day one.
- Stripe integration is explicitly future-scoped, not MVP.
- Email login/notifications are explicitly future-scoped.

## 7. Out of Scope for This Document
Full API contracts, detailed sequence diagrams per flow, and the security/DevOps deep-dives ship in later phases (see roadmap in chat).

---

## Appendix A — Category List (41, fixed)

1. Tourist and Restaurants
2. Drivers
3. Labors
4. Sales and Marketing
5. Engineering
6. Accounting
7. Craftsmen
8. Administration
9. Construction
10. Technicians
11. Customer Service
12. Medicine and Nursing
13. Employees
14. Delivery
15. Beauty care
16. Guard & Security
17. Data Entry
18. Designer
19. Cleaning Workers
20. Misc Jobs
21. AC Technicians
22. Education and Teaching
23. Partnership
24. Information Technology
25. Tailors
26. Housemaids
27. Garden and Landscaping
28. Human Resources
29. Secretarial
30. Programming
31. Law
32. Fitness
33. Audio Visual
34. Fine Arts
35. Public Relations
36. Web Designers
37. Ticketing & Tourism
38. Child Care
39. Fashion
40. Translators
41. Editors

*Reproduced exactly as specified — recommend a Title-Case pass ("Beauty Care") for UI display consistency before seeding, but keep source values intact in the database.*

## Appendix B — Glossary
**Escrow** — third-party-held funds released only when contract conditions are met.
**Blue Tick** — Leo's worker trust-verification badge.
**Boost** — the 4-hour premium feed-pin purchased for 100 BDT/month.
