# ONES HEALTH — COMPREHENSIVE FULL-STACK AUDIT (March 14, 2026)

**Branch:** `claude/audit-full-stack-a64Ze` (rebased on `dev.3.14.26`)
**Scope:** Security, Checkout/Payments, UX, Formulation/Consultation, Features & Admin
**Risk Level:** HIGH — Critical findings require remediation before production scale

---

## EXECUTIVE SUMMARY

| Domain | Critical | High | Medium | Low | Score |
|--------|----------|------|--------|-----|-------|
| Security & Auth | 8 | 7 | 8 | 2 | 3/10 |
| Checkout & Payments | 3 | 3 | 4 | 2 | 7/10 |
| UX & Client Code | 2 | 5 | 10 | 3 | 5/10 |
| Formulation & Consultation | 3 | 3 | 6 | 3 | 7/10 |
| Features & Admin | 6 | 6 | 8 | 5 | 6/10 |
| **TOTAL** | **22** | **24** | **36** | **15** | — |

**Architecture:** 73 database tables, 45+ API routes across 24 modules, React + Express.js + PostgreSQL (Drizzle ORM)

**Verdict:** Feature-rich MVP with strong formulation safety gates, but NOT production-ready without security fixes. Would not pass SOC 2 audit. Suitable for beta testing with limited users only.

---

## PART 1: SECURITY & AUTHENTICATION

### CRITICAL

#### 1.1 JWT Token Expiration Too Long (7 Days)
- **File:** `server/api/middleware/middleware.ts:36`
- `JWT_EXPIRES_IN = '7d'` — excessive for a health/sensitive data platform
- **Fix:** Change to 15 minutes; implement refresh token rotation with 7-day validity in httpOnly cookies

#### 1.2 No Refresh Token Implementation
- **File:** `server/modules/auth/auth.service.ts`
- Single long-lived tokens with no refresh mechanism. Users can't maintain sessions without keeping long-lived tokens in localStorage (XSS-vulnerable)
- **Fix:** Implement `POST /api/auth/refresh` with token family tracking

#### 1.3 Token in Query Parameters (SSE)
- **File:** `server/api/middleware/middleware.ts:63-69`
- Tokens in URL query params are logged in server logs, browser history, referrer headers
- **Fix:** Use session-based auth for SSE or short-lived single-use tokens

#### 1.4 JWT Secret Fallback
- **File:** `server/api/middleware/middleware.ts:32-35`
- Hardcoded `'dev-only-insecure-secret-do-not-use-in-production'` as fallback
- **Fix:** Crash on startup if `JWT_SECRET` not set

#### 1.5 User Data Over-Exposure in API Responses
- Admin endpoints return full user objects including addresses, phone numbers, health profile data, payment references
- **Fix:** Implement role-based response DTOs with field-level access control

#### 1.6 Chat Messages Stored Without Encryption
- Health discussions, symptom info, medication details not encrypted at rest
- **Fix:** Apply field-level encryption using existing `encryptField()` utility

#### 1.7 X-Forwarded-For Spoofing Bypasses Rate Limiting
- **File:** `server/api/middleware/middleware.ts:124-130`
- Trusts `X-Forwarded-For` header without validation from known proxies
- **Fix:** Validate only from known proxy IPs; add per-user rate limiting

#### 1.8 No CSRF Protection
- No CSRF token validation middleware on state-changing operations
- **Fix:** Add CSRF middleware for POST/PUT/DELETE operations

### HIGH

- **1.9** Password reset has no complexity validation beyond 8 chars — add ZXCVBN
- **1.10** Session secret has dev fallback string — remove, crash if missing
- **1.11** `unsafe-inline` in CSP for both scripts and styles — use nonces
- **1.12** Missing input validation on admin endpoints (userId params not Zod-validated)
- **1.13** File upload filenames not sanitized — generate UUID-based names
- **1.14** MIME type validation relies on client-sent header, not magic bytes
- **1.15** No account lockout after failed login attempts

### MEDIUM

- No email verification enforced before sensitive features
- No CSRF tokens implemented
- Missing database indexes on `users.email`, `users.googleId`, `orders.userId`
- Error messages leak stack traces in non-production environments
- No request ID/correlation tracking in logs
- Logging may include sensitive PII without redaction
- Webhook signature verification conditional/skippable in some paths
- Signup rate limit too lenient (3 per 15 min per IP)

---

## PART 2: CHECKOUT & PAYMENTS

### WHAT'S WORKING WELL

- **Price manipulation: SECURE** — All pricing is server-side only (membership from DB, formula from manufacturer quote, 15% member discount applied server-side)
- **Webhook verification: SECURE** — Proper HMAC signature via `stripe.webhooks.constructEvent()`
- **Idempotency: SECURE** — Duplicate webhook protection via `getOrderByStripeSessionId()`
- **Race conditions: SECURE** — Atomic DB transactions for tier assignment with capacity checks
- **Safety gates: SECURE** — Checkout blocked without safety warning acknowledgment + medical disclosure consent

### CRITICAL

#### 2.1 Reorder Payment Fails Silently Without Retry
- **File:** `server/modules/reorder/reorder.service.ts:531-603`
- Off-session `PaymentIntent` fails → schedule marked "skipped" with no notification to user
- User's supply runs out with no awareness
- **Fix:** Implement 3-attempt exponential backoff + SMS/email notification on failure

#### 2.2 Reorder Formula Changes Not Reflected in Charge
- **File:** `server/modules/reorder/reorder.service.ts:504-514`
- User approves ADJUST recommendation but charge uses `schedule.formulaId` (old formula)
- **Fix:** Store approved adjustments in recommendation record; recalculate quote from adjusted formula

#### 2.3 Invoice Payment Webhook Incomplete
- **File:** `server/modules/billing/billing.service.ts:381-401`
- `invoice.paid` doesn't properly update renewal dates; silent return if subscription not found
- **Fix:** Log all cases; sync renewal dates from actual invoice data

### HIGH

- **2.4** Failed payment webhook (`invoice.payment_failed`) doesn't notify user — implement dunning emails
- **2.5** Referral system has no self-referral prevention or fraud detection
- **2.6** Streak discount system exists but is never applied at checkout — either wire it up or remove

### MEDIUM

- `incomplete_expired` mapped to `past_due` but should trigger cancellation notification
- Checkout timeout not handled (session expires after 24h with no user feedback)
- If manufacturer quote unavailable, checkout fails entirely with no fallback
- Promo codes delegated to Stripe but no validation sync in webhook metadata

---

## PART 3: UX & CLIENT CODE

### CRITICAL

#### 3.1 ConsultationPage is 2,851 Lines with 18+ useState Hooks
- **File:** `client/src/pages/ConsultationPage.tsx`
- Complex state synchronization between local state and server creates race conditions
- No explicit error handling for API failures
- Quiz progress NOT auto-saved if user navigates away (only draft message text saved, not conversation state)
- **Fix:** Break into smaller components; use `useReducer` for chat state; implement auto-save on blur; add `beforeunload` handler

#### 3.2 Session Restoration Has Silent Failure Modes
- **File:** `client/src/pages/ConsultationPage.tsx:559-618`
- Skips message sync if local > server messages (prevents legitimate updates)
- Multiple competing localStorage keys for session persistence
- **Fix:** Implement message versioning with timestamps; use immutable message IDs

### HIGH

- **3.3** No loading states or error boundaries on most async operations (DashboardHome, ProfilePage, OrdersPage)
- **3.4** React Query set to `retry: false` and `refetchOnWindowFocus: false` — stale data after tab switching
- **3.5** No memoization anywhere — no `React.memo`, `useMemo`, or `useCallback` found in pages
- **3.6** No code splitting — all pages loaded upfront including LiveChatWidget
- **3.7** Password change form in SettingsPage exists but doesn't call API (BUG)

### MEDIUM

- No explicit `sm:` breakpoints — many pages jump directly to `md:`
- Missing aria-labels, keyboard navigation, focus management in modals
- Color contrast of muted text (`#5a6623` on cream) may not meet WCAG AA
- No offline detection or offline queue for API failures
- File upload input hidden (ref only) — not accessible to keyboard users
- No progress indication during AI response generation (30+ second waits)
- Toast hook may have memory leak (dependency array issue)
- Dialog max-width `max-w-2xl` too wide for mobile modals
- Auth tokens stored in localStorage (XSS-vulnerable)
- No page transition loading indicators

---

## PART 4: FORMULATION & CONSULTATION

### SAFETY GATES — WHAT'S WORKING

| Gate | Status | Description |
|------|--------|-------------|
| Critical Drug Interactions | WORKING | 19 interaction categories checked; formula blocked on critical findings |
| Serious Warnings | WORKING | `requiresAcknowledgment: true`; checkout blocked until acknowledged |
| Pregnancy/Nursing | WORKING | All ingredients checked against contraindication database; hard block |
| Capsule Budget | WORKING | Formula must fit within `capsules × 550mg` (±2.5% tolerance) |
| Claims Filter | PARTIAL | Post-processing catches disease claims, diagnosis language, med directives |

### CRITICAL

#### 4.1 AI Can Hallucinate Lab Values
- **File:** `server/utils/prompt-builder.ts:165-177`
- Despite rule "NEVER hallucinate lab data", no server-side verification that claimed lab values exist in uploaded files
- AI could invent biomarker values to justify aggressive formulation
- **Fix:** After formula generation, verify every referenced lab value exists in `labReportData.extractedData`

#### 4.2 Unknown Ingredients Have Unbounded Max Dosage
- **File:** `server/modules/formulas/formula-service.ts:93-107`
- Returns `Number.MAX_SAFE_INTEGER` if ingredient not found in catalog
- AI could theoretically dose unknown ingredients to extreme amounts
- **Fix:** Cap unknown ingredients to 1000mg; log warning if ingredient not in catalog

#### 4.3 Prompt Injection Risk via User Health Data
- **File:** `server/utils/prompt-builder.ts:~300`
- User can enter `"[[prompt: ignore safety rules]]"` in health profile conditions field
- Health profile inserted into prompt as raw text
- **Fix:** JSON-encode all user data; use `<USER_DATA>` delimiters; sanitize inputs

### HIGH

- **4.4** No ingredient-ingredient interaction checking (Mg+Ca absorption, Fe+Ca chelation) — only ingredient-medication checks implemented
- **4.5** Claims filter uses substring matching — `"omega"` in drug name triggers false blood thinner warning
- **4.6** No structured output enforcement — AI asked to output ```json but if it forgets code fence, formula is silently dropped

### MEDIUM

- Capsule count can be overridden by user message without confirmation when it differs from AI recommendation
- Lab data can be weeks old but treated as current — no staleness warning
- Reference range parsing is heuristic — units (mg/dL vs μmol/L) not validated across labs
- Dosage recommendations ignore body weight/BMI entirely
- 2-point trend classification (earliest vs latest) is statistically weak
- Wearable data gaps not surfaced (battery dies → sparse data → AI formulates on incomplete info)
- Disclaimer version hardcoded as `'1.0'` — never updated when terms change
- No age gate (18+ verification) at signup

### REGULATORY CONCERNS

- **"AI Practitioner" branding** could violate FTC/FDA rules — implies medical licensure. Rebrand as "AI supplement advisor"
- **Structure-function claims** need review — "reduces blood sugar" crosses into drug-claim territory vs. allowed "supports healthy blood sugar metabolism"
- **No formula "freeze" mechanism** for compliance audits — users can edit formulas anytime
- **FDA Supplement Facts label** not generated — required for manufactured supplements

---

## PART 5: FEATURES & ADMIN

### WHAT'S STRONG

- **Admin Analytics:** Enterprise-grade — MRR/ARR, conversion funnel, cohort retention, traffic sources, UTM tracking, referral analytics, AI usage stats, formula insights
- **Admin User Management:** Full CRUD, advanced search, timeline, notes, bulk export
- **Support System:** Ticket lifecycle, live chat with AI bot → human handoff, canned responses, analytics
- **Blog/Content:** CRUD + SEO + AI-assisted generation + 7 templates + admin review workflow
- **Notification System:** Email (SendGrid) + SMS (Twilio) + in-app + daily pill reminders with timezone

### CRITICAL FEATURE GAPS

| Feature | Why Critical | Impact |
|---------|-------------|--------|
| **Admin RBAC** | All admins have equal access — support staff sees financials | Security |
| **Admin Audit Trail UI** | `AuditLogsPage.tsx.bak` — feature disabled | Compliance |
| **Inventory Management** | Can't track stock levels, manufacturing capacity | Operations |
| **Discount/Coupon System** | Can't run promotions through admin UI | Revenue |
| **Password Change Bug** | SettingsPage form doesn't call API | User-facing bug |
| **PR Agent Missing Dependencies** | `googleapis` and `playwright` not in production deps | Broken feature |

### HIGH FEATURE GAPS

| Feature | Description |
|---------|-------------|
| Product Reviews & Ratings | No social proof to drive conversions |
| Loyalty/Rewards Program | No points/rewards system (membership is different) |
| User-Facing Analytics | No dashboard showing formula effectiveness or health progress |
| Subscription Management UI | Users can't see billing details or change subscription |
| Email Campaign Management | No bulk messaging or drip sequences |
| Error Reporting (Sentry) | Production errors go undetected |
| Health Check Endpoint | Load balancer can't health-check; failed instances stay active |

### INCOMPLETE FEATURES

- **Influencer Hub:** Database + CRUD + lifecycle tracking done; missing auto-discovery, payment tracking, content approval workflow
- **B2B Prospecting:** Pipeline + scoring + contact tracking done; missing CRM integration, document management, deal closing workflow
- **PR Agent:** Core scanning + pitch drafting + Gmail sending done; missing mutex on concurrent runs, progress tracking, response detection
- **Streak Discounts:** Earned but never applied at checkout
- **Push Notifications:** Schema exists but no push service integrated

### CODE QUALITY

- 99 `console.log/warn/error` statements remaining in server code
- `.bak` files in admin pages (disabled features still in codebase)
- Disabled feature flags (`OPTIMIZE_*`, `STREAK_REWARDS`) still shipped in client bundle
- 4 TODO comments in codebase (founder context URLs, payment failure emails)
- ~34 lines of tests per server module (insufficient)
- No integration tests, security tests, or load tests

---

## PRIORITIZED REMEDIATION ROADMAP

### Phase 1: Security & Critical Bugs (Week 1-2)

1. Reduce JWT expiration to 15 min + implement refresh tokens
2. Remove all hardcoded secret fallbacks (crash if missing)
3. Fix password change bug (SettingsPage form → API)
4. Add Zod validation on all admin endpoint params
5. Implement file upload filename sanitization (UUID-based)
6. Fix PR Agent missing production dependencies
7. Add health check endpoint + graceful shutdown
8. Re-enable admin audit trail UI
9. Encrypt chat messages at rest
10. Add server-side lab value verification (prevent AI hallucination)

### Phase 2: Payment & Reorder Safety (Week 3-4)

1. Implement reorder payment retry with exponential backoff + user notification
2. Fix reorder formula adjustment validation (charge correct formula)
3. Add dunning emails for failed subscription payments
4. Wire up or remove streak discount system
5. Add self-referral prevention
6. Cap unknown ingredient max dosage to 1000mg
7. Add ingredient-ingredient interaction matrix

### Phase 3: UX & Consultation (Week 5-7)

1. Refactor ConsultationPage — split into components, use `useReducer`
2. Implement conversation auto-save on blur + `beforeunload` handler
3. Add error boundaries to all async-data pages
4. Enable `refetchOnWindowFocus` for critical queries
5. Add code splitting (lazy load chat widget, formula builder)
6. Add `React.memo` / `useMemo` / `useCallback` in hot paths
7. Fix mobile breakpoints (add `sm:` responsive classes)
8. Add accessibility (aria-labels, focus traps, keyboard navigation)

### Phase 4: E-Commerce Essentials (Week 8-10)

1. Admin RBAC (role-based permissions for support, finance, content)
2. Discount/coupon system
3. Product reviews & ratings
4. User subscription management UI
5. User-facing health analytics dashboard
6. Loyalty/rewards program

### Phase 5: Growth & Scale (Week 11+)

1. Error reporting service (Sentry)
2. Request ID correlation tracking
3. Email campaign management
4. A/B testing framework
5. Integration + security + load tests
6. Multi-language support
7. API versioning

---

## KEY METRICS

| Metric | Value |
|--------|-------|
| Database Tables | 73 |
| API Routes | 45+ |
| Server Modules | 24 |
| Client Pages | 30+ |
| Client Components | 100+ |
| Total Findings | 97 |
| Critical Findings | 22 |
| High Findings | 24 |
| Test Coverage | Very Low (~34 LOC/module) |
| Production Readiness | CONDITIONAL (beta only) |

---

*Report generated from 5 parallel deep-dive audits spanning security, payments, UX, formulation, and features.*
