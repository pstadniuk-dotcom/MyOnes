# ONES AI — Dev Release Notes: `dev-3.9.26`

**Branch:** `dev-3.9.26`  
**Date:** March 9, 2026  
**Base:** `dev-3.4.26` → `dev-3.9.26`  
**Commits since last push:** 22 (from `dev-3.2.26`)  
**Files changed:** 16 in latest commit; 100+ across all commits since `dev-3.2.26`  
**Tests:** 261/261 passing (12 test suites) — 0 TypeScript errors

---

## Summary

This release contains a major set of improvements spanning security, admin tooling, AI cost analytics, chat encryption, SEO infrastructure, blog management, deployment architecture, and data privacy.

---

## 1. Security & Compliance

### 1.1 Authentication Audit Logging (NEW)
- **New table:** `auth_audit_logs` in `shared/schema.ts` — tracks every login attempt (success & failure) across all auth providers
- **New module:** `server/modules/auth/auth-audit.ts` — `logAuthEvent()` function captures:
  - User ID, email, action type (`login_success`, `login_failed`, `signup`, `google_login`, `facebook_login`, `password_reset`, `logout`)
  - Auth provider (`email`, `google`, `facebook`)
  - Success/failure status with failure reason
  - IP address (supports `x-forwarded-for` for proxied environments)
  - User agent string
  - Timestamp
- **Wired into all auth flows** in `auth.controller.ts`:
  - Email login (success + failure)
  - Google SSO (success + failure)
  - Facebook SSO (success + failure)
- **Non-blocking:** Audit logging failures never break the auth flow (fire-and-forget with error logging)

### 1.2 Chat Message Encryption (PHI Protection)
- **`chat.repository.ts`** now encrypts message content before database storage using `encryptField()`
- All messages decrypted on read via `decryptField()`
- Backward-compatible: gracefully handles legacy plaintext messages (try/catch fallback)
- Chat messages may contain health conditions, medications, supplements — this protects PHI at rest

### 1.3 Biometric Raw Data Encryption
- **`wearables.repository.ts`** now encrypts `rawData` field (JSON payloads from Fitbit/Oura/Whoop) before storage
- Decryption on read with legacy plaintext fallback
- Applied to all insert/upsert paths (3 locations patched)

### 1.4 Database SSL Hardening
- **`server/infra/db/db.ts`** now supports `DB_CA_CERT` environment variable for certificate-pinned TLS connections
- When `DB_CA_CERT` is set: `rejectUnauthorized: true` with CA certificate validation
- Fallback: `rejectUnauthorized: false` (required for Supabase pooler)

### 1.5 FAQ Security Disclosure Update
- **`seed-support-api.ts`** updated the "Is my health data safe?" FAQ answer to accurately describe our security posture:
  - AES-256-bit encryption for sensitive health fields
  - TLS for data in transit
  - Role-based access controls with audit logging
  - Clarification: "Ones is not HIPAA-certified; we are a wellness platform that follows strong security best practices"

### 1.6 Script Credential Cleanup
- **`check-user-login.mjs`** — removed hardcoded production database URL and password; now reads from `DATABASE_URL` env var and accepts password via CLI arg
- **`reset-password.mjs`** — removed hardcoded email/password; now accepts both as CLI arguments with usage instructions

---

## 2. Admin Dashboard — AI Cost Analytics

### 2.1 Per-User AI Cost Column (User Management Page)
- **`UserManagementPage.tsx`** — new "AI Cost" column in the user table showing:
  - Total AI spend (color-coded: green <50¢, yellow <$2, orange <$5, red ≥$5)
  - Number of API calls beneath the cost
- **Sort by AI cost:** new toggle button and clickable column header to sort users by highest AI spend
- Backend support: `admin.repository.ts` now LEFT JOINs `ai_usage_logs` to enrich every user query with cost data

### 2.2 User Detail Page — AI Costs Tab (NEW)
- **`UserDetailPage.tsx`** — added 4th tab "AI Costs" to the User Activity section
- **Summary cards:** Total cost, API calls, tokens used (with K/M formatting)
- **Cost by Feature breakdown:** Shows which features (consultation, formula, optimize, etc.) cost the most per user
- **Cost per Conversation:** Sessions sorted by highest cost, with:
  - Session title, status badge, creation date
  - Click to expand → inline conversation viewer showing actual messages with role coloring (user=blue, assistant=gray, system=yellow)
  - Message timestamps and content preview (capped at 500 chars)
- **Daily Usage chart:** Mini bar chart showing 30-day AI spend trend

### 2.3 Backend AI Usage Service Enhancements
- **`ai-usage.service.ts`** — `getUserUsageDetails()` now returns:
  - `bySession`: cost grouped by chat session (with session title, status, date range)
  - `byFeature`: cost grouped by feature type
  - `dailyCosts`: daily cost trend for the last 30 days
- **New function:** `getAllUserCosts()` — lightweight aggregation for the user list page (returns cost/calls per user)

### 2.4 Admin Controller & Service
- **`admin.controller.ts`** — accepts `sortBy` query parameter
- **`admin.service.ts`** — passes `sortBy` through to repository

---

## 3. Anthropic Streaming Fix

### 3.1 Token Usage Extraction from Stream Events
- **`chat.service.ts`** — fixed Anthropic streaming token tracking:
  - **Before:** Called `stream.finalMessage()` after stream completion — this often failed because the stream was already consumed
  - **After:** Captures tokens incrementally during streaming via `message_start` (input tokens) and `message_delta` (output tokens) events
  - Falls back to `finalMessage()` only if stream events don't provide usage data
  - This fixes AI cost tracking accuracy for Anthropic-powered chats

---

## 4. SEO & Content Infrastructure (from prior commits in this branch)

### 4.1 Keyword Research Pipeline
- Automated keyword research and topic cluster expansion
- 1,868 new keywords generated from winner patterns
- Three expansion iterations (v1, v2, v3)

### 4.2 Blog Table of Contents
- Auto-generated Table of Contents for blog posts
- Internal link validation

### 4.3 Admin Blog Management UI
- Full blog CRUD in admin dashboard
- AI-powered blog post generation and revision
- Formula review trigger from blog context
- Phone prompt banner for mobile users

### 4.4 Landing Page Marketing Overhaul
- Updated landing page copy, layout, and components
- Blog content fixes
- Wearables/chat/prompt-builder polish

---

## 5. Deployment & Infrastructure (from prior commits)

### 5.1 Split Frontend/Backend Deployment
- **Frontend:** Vercel (React/Vite static site)
- **Backend:** Railway (Express API — server-only build, no Vite bundling)
- Node 20 enforced for Railway builds
- Static serving skipped when `dist/public` absent (Vercel handles frontend)

### 5.2 Dynamic Base URL
- API base URL now configurable (no more hardcoded localhost)

### 5.3 Formula Capsule Fill Enforcement
- 100% capsule fill enforced (6/9/12 caps × 550mg)
- Auto-fit AI formulas to capsule budget before validation

---

## 6. Billing & Orders (from prior commits)

- Resume subscription support
- Order history and invoice list
- Stripe webhook fix for `renewsAt` date
- Billing service test suite (23 tests)
- Password eye icon for reset password screen
- Prevent negative values for weight and age fields

---

## Files Changed (Latest Commit)

| File | Change |
|------|--------|
| `shared/schema.ts` | Added `authAuditLogs` table |
| `server/modules/auth/auth-audit.ts` | NEW — auth event logging module |
| `server/api/controller/auth.controller.ts` | Wired audit logging into all auth flows |
| `server/modules/chat/chat.repository.ts` | Message content encryption/decryption |
| `server/modules/chat/chat.service.ts` | Fixed Anthropic streaming token extraction |
| `server/modules/wearables/wearables.repository.ts` | Biometric rawData encryption |
| `server/modules/ai-usage/ai-usage.service.ts` | Session/feature/daily cost breakdowns |
| `server/modules/admin/admin.repository.ts` | User queries enriched with AI cost data |
| `server/modules/admin/admin.service.ts` | Passthrough for `sortBy` parameter |
| `server/api/controller/admin.controller.ts` | Accept `sortBy` query param |
| `client/src/pages/admin/UserDetailPage.tsx` | AI Costs tab with conversation viewer |
| `client/src/pages/admin/UserManagementPage.tsx` | AI Cost column + sort toggle |
| `server/infra/db/db.ts` | SSL cert pinning support (`DB_CA_CERT`) |
| `server/utils/seed-support-api.ts` | Updated security FAQ copy |
| `scripts/maintenance/check-user-login.mjs` | Removed hardcoded credentials |
| `scripts/reset-password.mjs` | Parameterized email/password via CLI |

---

## Test Results

```
 ✓ server/__tests__/workoutAnalysis.test.ts       (21 tests)
 ✓ server/__tests__/api-config.test.ts            (25 tests)
 ✓ server/__tests__/protocol-recommendation.test.ts (3 tests)
 ✓ server/__tests__/membership.test.ts            (36 tests)
 ✓ server/__tests__/ingredients.test.ts           (30 tests)
 ✓ server/__tests__/formula-fill.test.ts          (3 tests)
 ✓ server/__tests__/formula.test.ts               (12 tests)
 ✓ server/__tests__/auth.test.ts                  (6 tests)
 ✓ server/__tests__/billing.controller.test.ts    (23 tests)
 ✓ server/__tests__/prompt-builder.test.ts        (34 tests)
 ✓ server/__tests__/billing.service.test.ts       (66 tests)
 ✓ server/__tests__/formula.stress.test.ts        (2 tests)

 Test Files  12 passed (12)
      Tests  261 passed (261)
```

---

## Migration Notes

After pulling this branch, run:
```bash
npm run db:push   # Pushes authAuditLogs table to database
```

No other migrations required — the chat encryption and biometric encryption are backward-compatible with existing plaintext data.

---

## Known TODOs (Non-blocking)

- `server/modules/reorder/reorder.service.ts` — "Send update payment method email" and "Send payment failed email" (future Stripe integration)
- `server/modules/agent/founder-context.ts` — Empty `headshotUrl` and `pressKitUrl` (add when assets available)
