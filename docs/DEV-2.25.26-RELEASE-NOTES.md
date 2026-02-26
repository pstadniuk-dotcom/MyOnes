# ONES AI — Release Notes: dev-2.25.26

**Branch:** `dev-2.25.26`  
**Base:** `dev-update-2.23.26` (commit `57c1618`)  
**Date:** 2026-02-25  
**Author:** Pete (via Copilot session)

---

## Summary

This release delivers three major bodies of work:

1. **Alive Innovations API — Full Order Pipeline** (quote → Stripe checkout → webhook → order record → `/mix-product` production order)
2. **Ingredient Catalog Alignment** — Audited every ONES ingredient against Alive's 54-entry catalog; removed 3 unmatchable ingredients, renamed 3, added 4 new
3. **Production Hardening** — Webhook idempotency, quote expiration + re-quote, admin retry endpoint, HSTS, Stripe webhook fail-fast, env var safety warnings

Plus: Billing module extraction, membership pricing & checkout, medication disclosure flow, protocol capsule recommendation, formula stress tests, UI polish, and more.

---

## Table of Contents

- [Database Changes (ACTION REQUIRED)](#database-changes-action-required)
- [Environment Variables (ACTION REQUIRED)](#environment-variables-action-required)
- [Feature: Full Order → Manufacturer Pipeline](#feature-full-order--manufacturer-pipeline)
- [Feature: Ingredient Catalog Alignment](#feature-ingredient-catalog-alignment)
- [Feature: Production Hardening](#feature-production-hardening)
- [Feature: Billing Module Extraction](#feature-billing-module-extraction)
- [Feature: Membership Pricing & Checkout](#feature-membership-pricing--checkout)
- [Feature: Medication Disclosure](#feature-medication-disclosure)
- [Feature: Protocol Capsule Recommendation](#feature-protocol-capsule-recommendation)
- [Feature: Equivalent Stack Pricing](#feature-equivalent-stack-pricing)
- [UI Changes](#ui-changes)
- [Tests Added](#tests-added)
- [Diagnostic Scripts](#diagnostic-scripts)
- [All Changed Files](#all-changed-files)
- [Remaining Items for Team / Ajay](#remaining-items-for-team--ajay)

---

## Database Changes (ACTION REQUIRED)

### Migration 0006: Manufacturer Order Columns (ALREADY APPLIED to Supabase prod)

**File:** `migrations/0006_add_manufacturer_order_columns.sql`

8 new columns added to the `orders` table:

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `formula_id` | `varchar` FK→formulas(id) | NULL | Links order to the formula version |
| `manufacturer_cost_cents` | `integer` | NULL | Raw Alive cost before our margin |
| `supply_weeks` | `integer` | 8 | Duration of supply (always 8 weeks) |
| `manufacturer_quote_id` | `text` | NULL | Alive `quote_id` from `/get-quote` |
| `manufacturer_quote_expires_at` | `timestamp` | NULL | When the Alive quote expires |
| `manufacturer_order_id` | `text` | NULL | Alive order ID from `/mix-product` |
| `manufacturer_order_status` | `text` | NULL | `submitted`, `failed`, etc. |
| `stripe_session_id` | `text` | NULL | Stripe checkout session ID (idempotency key) |

**Status:** This migration has **already been executed** against the live Supabase database. All 17 columns are confirmed present. No action needed unless deploying to a new database.

To run manually on a fresh DB:
```bash
node scripts/run-migration-0006.mjs
```

### Migration 0005: Equivalent Stack Pricing Table

**File:** `migrations/0005_equivalent_stack_pricing.sql`

Creates `ingredient_pricing` table for the "save vs buying separately" comparison feature.

```sql
CREATE TABLE "ingredient_pricing" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ingredient_key" text NOT NULL UNIQUE,
  "ingredient_name" text NOT NULL,
  "typical_capsule_mg" integer NOT NULL,
  "typical_bottle_capsules" integer NOT NULL,
  "typical_retail_price_cents" integer NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
```

After creating the table, seed it:
```bash
npx tsx scripts/seed-ingredient-pricing.ts
```

### Migration 0004: SMS Accountability Consent Enum

**File:** `migrations/0004_add_sms_accountability_consent_enum.sql`

Adds `'sms_accountability'` to the `consent_type` enum.

### Migration: Medication Disclosure

**File:** `migrations/add_medication_disclosure.sql`

- Adds `'medication_disclosure'` to `consent_type` enum
- Adds `medication_disclosed_at TIMESTAMP` column to `health_profiles` table

Run manually:
```bash
node scripts/migrate-medication-disclosure.mjs
```

### Schema Changes (shared/schema.ts)

The `orders` table in `shared/schema.ts` now includes all 8 new columns listed above, plus the `ingredient_pricing` table definition and `medication_disclosed_at` on `health_profiles`.

---

## Environment Variables (ACTION REQUIRED)

### Required for Alive API (Manufacturer Integration)

| Variable | Value / Notes |
|----------|---------------|
| `ALIVE_API_KEY` | `nK8xV4pQ9sT2wZ7mL3rY6bH1cD5fJ0uAqX8eR2tW6yU9iO3p` |
| `ALIVE_API_HEADER_NAME` | `X-API-Key` (default, usually no need to set) |
| `ALIVE_API_BASE_URL` | **DEV:** `https://dev.aliveinnovations.com/api` — **PRODUCTION: ASK ALIVE FOR PROD URL** |

> ⚠️ **CRITICAL:** The system currently points at Alive's **dev** API. Before going to production, Ajay needs to confirm the production API URL with Alive Innovations. The server will log a `[CRITICAL]` error on startup if the dev URL is used in `NODE_ENV=production`.

### Required for Production

| Variable | Status |
|----------|--------|
| `SESSION_SECRET` | Server warns on startup if missing |
| `FRONTEND_URL` | Server warns on startup if missing or set to `localhost` |
| `STRIPE_SECRET_KEY` | Required for checkout |
| `STRIPE_WEBHOOK_SECRET` | Required for webhook verification |

---

## Feature: Full Order → Manufacturer Pipeline

### How It Works (End-to-End Flow)

```
User clicks "Order" → createCheckoutSession()
  ├── Fetches formula from DB
  ├── Calls Alive /get-quote → gets price + quote_id + expires_at
  ├── Applies 2x margin (MARGIN_MULTIPLIER = 2.0)
  ├── Stores quote data in Stripe session metadata
  └── Returns Stripe checkout URL

User pays on Stripe → Stripe fires checkout.session.completed webhook
  ├── Idempotency check: skip if order with this stripeSessionId exists
  ├── Quote expiration check: if quote expired, re-quote automatically
  ├── Creates order record in DB (status: 'processing')
  ├── Calls Alive /mix-product with { quote_id } → production order
  ├── Updates order with manufacturer_order_id + status 'submitted'
  └── Updates user.lastOrderDate

If /mix-product fails:
  ├── Order status set to 'failed'
  └── Admin can retry via POST /api/admin/orders/:id/retry-manufacturer
```

### Files Involved

| File | What Changed |
|------|-------------|
| `server/modules/formulas/manufacturer-pricing.service.ts` | Added `placeManufacturerOrder(quoteId)`, captures `quote_id`/`expires_at` from Alive response, production safety warnings |
| `server/modules/billing/billing.service.ts` | `handleCheckoutCompleted()` rewritten: idempotency guard, quote expiration check + re-quote, order creation, manufacturer placement |
| `server/modules/users/users.repository.ts` | Added `getOrderByStripeSessionId()`, `createOrder()`, `updateOrder()` |
| `server/modules/admin/admin.service.ts` | Added `retryManufacturerOrder()` with re-quote logic |
| `server/api/controller/admin.controller.ts` | Added `retryManufacturerOrder` handler |
| `server/api/routes/admin.routes.ts` | Added `POST /orders/:id/retry-manufacturer` |
| `shared/schema.ts` | 8 new columns on `orders` table |

### Pricing Model

- **Margin:** 2.0× (100% markup on Alive's cost)
- **Shipping:** Baked into price, shown as "free" to customer
- **Supply:** 8 weeks (56 days) per order
- **Capsule counts:** 6, 9, or 12 per day
- **Total capsules:** `capsuleCount × 56`

### Admin Retry Endpoint

```
POST /api/admin/orders/:id/retry-manufacturer
Authorization: Bearer <admin-token>
```

Behavior:
1. Checks if order already has a `manufacturer_order_id` → returns 409
2. If quote expired or missing → automatically re-quotes
3. Calls `/mix-product` with fresh quote
4. Updates order record

---

## Feature: Ingredient Catalog Alignment

### What Changed

Audited all 51 ONES ingredients against Alive's 54-entry catalog:

**Removed (not in Alive catalog):**
- L-Theanine
- Red Ginseng
- Quercetin

**Renamed (spelling alignment):**
| ONES Name | Alive Name |
|-----------|-----------|
| Aloe Vera Powder | Aloe Vera |
| Omega-3 | Omega 3 |
| Vitamin E | Vitamin E (Mixed Tocopherols) |

**Added (available in Alive but missing from ONES):**
- Milk Thistle
- Calcium
- Vitamin C
- Cape Aloe

**Name Aliases (handled in manufacturer-pricing.service.ts, not renamed in our catalog):**
| ONES Name | Alive Name |
|-----------|-----------|
| Ashwagandha | Ashwaganda |
| Blackcurrant Extract | Black Currant Extract |
| Curcumin | Turmeric Root Extract 4:1 |
| Ginkgo Biloba Extract 24% | Ginko Biloba Extract 24% |
| Phosphatidylcholine | Phosphatidycholine |

### Files Changed

- `shared/ingredients.ts` — Removed 3, renamed 3, added 4
- `server/utils/prompt-builder.ts` — Updated all drug interaction lists, combo suggestions, anti-hallucination examples
- `server/modules/formulas/formula-service.ts` — Removed from medication safety validation arrays
- `server/utils/healthTips.ts` — Updated L-Theanine reference
- `client/src/features/marketing/components/HeroSectionV2.tsx` — Updated demo chat text

### Duplicate ID Bug Fix

Alive's catalog contains entry #54 named "IN" (2 characters, likely a test entry). Our substring matching was resolving random ingredients to this entry. Fixed with a **4-character minimum substring guard** in `resolveManufacturerIngredientId()`.

---

## Feature: Production Hardening

| Fix | File | Description |
|-----|------|-------------|
| Webhook idempotency | `billing.service.ts` | Dedup on `stripeSessionId` — prevents duplicate orders from Stripe webhook retries |
| Quote expiration check | `billing.service.ts` | Before calling `/mix-product`, checks if quote has expired; if so, re-quotes automatically |
| Admin retry endpoint | `admin.service.ts`, `admin.controller.ts`, `admin.routes.ts` | `POST /api/admin/orders/:id/retry-manufacturer` |
| Alive dev URL warning | `manufacturer-pricing.service.ts` | `[CRITICAL]` log on startup if dev URL used in production |
| Missing API key warning | `manufacturer-pricing.service.ts` | `[CRITICAL]` log if `ALIVE_API_KEY` not set in production |
| HSTS header | `server/index.ts` | `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` in production |
| Stripe webhook fail-fast | `billing.controller.ts` | Returns 500 immediately if `req.body` isn't a Buffer (instead of silently re-serializing) |
| SESSION_SECRET warning | `server/index.ts` | Startup warning if not set |
| FRONTEND_URL warning | `server/index.ts` | Startup warning if missing or localhost |

---

## Feature: Billing Module Extraction

The billing logic was extracted from the monolithic `server/routes.ts` into a clean module structure:

| File | Purpose |
|------|---------|
| `server/modules/billing/billing.service.ts` | `BillingService` with `BillingProvider` interface + `DatabaseBillingProvider` implementation |
| `server/api/controller/billing.controller.ts` | HTTP handlers for all billing endpoints |
| `server/api/routes/billing.routes.ts` | Route definitions |

### Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/billing/history` | User | List order history |
| GET | `/api/billing/invoices/:invoiceId` | User | Get invoice details |
| GET | `/api/billing/equivalent-stack` | User | "Save vs buying separately" |
| POST | `/api/billing/checkout/session` | User | Create Stripe checkout |
| POST | `/api/billing/subscriptions/:id/cancel` | User | Cancel subscription |
| POST | `/api/billing/webhooks/stripe` | None | Stripe webhook |

---

## Feature: Membership Pricing & Checkout

- Tiered membership system: Founding ($9/mo) → Early → Beta → Standard ($29/mo)
- Plans: monthly, quarterly (10% discount), annual (15% discount)
- Stripe checkout with subscription + one-time formula charge
- 15% member discount on formula orders
- Capacity-limited tiers with auto-progression
- Reactivation at locked price honor

---

## Feature: Medication Disclosure

- Modal component: `client/src/features/chat/components/MedicationDisclosureModal.tsx`
- Consent tracking via `medication_disclosure` consent type
- `medication_disclosed_at` timestamp on health profiles
- Migration: `migrations/add_medication_disclosure.sql`

---

## Feature: Protocol Capsule Recommendation

**File:** `server/modules/chat/protocol-recommendation.ts`

Algorithm that analyzes lab results and health profile to recommend 6, 9, or 12 daily capsules:

- Detects cardiometabolic risk patterns (ApoB, LDL-P, triglycerides, etc.)
- Scores severity (critical markers), breadth (organ systems involved), complexity (conditions + meds)
- Medication interaction awareness (blood thinners, SSRIs, thyroid meds)
- Returns confidence level, summary text, and signal explanations

---

## Feature: Equivalent Stack Pricing

Shows users how much they'd pay buying equivalent supplements separately vs. ONES formula.

- `ingredient_pricing` table with retail pricing data
- `GET /api/billing/equivalent-stack?formulaId=xxx`
- Seed script: `scripts/seed-ingredient-pricing.ts`

---

## UI Changes

| File | Change |
|------|--------|
| `client/src/pages/MyFormulaPage.tsx` | Hidden "Build Custom Formula" and "Customize Formula" features (preserved in code, see `docs/FUTURE_FEATURES.md`) |
| `client/src/features/formulas/components/CustomFormulaBuilderDialog.tsx` | Component preserved but hidden |
| `client/src/shared/components/ui/select.tsx` | Removed scroll-arrow buttons for native mouse-wheel scrolling |
| `client/src/shared/components/ui/dialog.tsx` | UI refinements |
| `client/src/features/marketing/components/HeroSectionV2.tsx` | Updated demo chat text |
| `client/src/features/marketing/components/MembershipPricingSection.tsx` | Membership tier pricing display |
| `client/src/features/marketing/components/PricingSectionV2.tsx` | Updated pricing section |
| `client/src/features/formulas/components/SupplementPricingSection.tsx` | "Save vs buying separately" display |
| `client/src/features/formulas/components/InlineCapsuleSelector.tsx` | Capsule count selector refinements |
| `client/src/pages/CheckoutSuccessPage.tsx` | New post-checkout success page |
| `client/src/pages/MembershipPage.tsx` | New membership management page |
| `client/src/pages/ConsultationPage.tsx` | Consultation flow updates |
| `client/src/features/dashboard/components/HealthPulseCard.tsx` | Dashboard health pulse card |
| `client/src/features/dashboard/components/ReviewScheduleCard.tsx` | Review schedule card |

---

## Tests Added

| File | Coverage |
|------|----------|
| `server/__tests__/billing.controller.test.ts` | 309 lines — HTTP status codes, response shapes for all billing endpoints |
| `server/__tests__/billing.service.test.ts` | 805 lines — Checkout, cancel, webhooks, history, invoices, plan resolution, status mapping, Stripe key guards |
| `server/__tests__/formula.stress.test.ts` | 259 lines — 1,200 diverse formula combinations (600 male, 600 female) through full validation pipeline |
| `server/__tests__/membership.test.ts` | 324 lines — Tier capacity, plan pricing math, tier selection logic |
| `server/__tests__/protocol-recommendation.test.ts` | 61 lines — Capsule recommendation algorithm |

Run all tests:
```bash
npx vitest run
```

---

## Diagnostic Scripts

These are developer-only scripts for debugging. Not needed in production.

| Script | Purpose |
|--------|---------|
| `scripts/alive-api-diagnostic.mjs` | Full Alive API test: fetch catalog, resolve names, get quote, show pricing |
| `scripts/alive-catalog-audit.mjs` | Compares all ONES ingredients against Alive catalog |
| `scripts/alive-catalog-debug.mjs` | Dumps Alive catalog with duplicate ID debug |
| `scripts/check-orders-cols.mjs` | Lists current orders table columns |
| `scripts/check-labs.mjs` | Lists lab reports in DB |
| `scripts/run-migration-0006.mjs` | Runs migration 0006 |
| `scripts/migrate-medication-disclosure.mjs` | Runs medication disclosure migration |
| `scripts/dev/apply-enum-migration.ts` | Applies consent_type enum migration |
| `scripts/dev/audit-ingredient-mapping.ts` | Audits ingredient name → Alive ID mapping |
| `scripts/seed-ingredient-pricing.ts` | Seeds ingredient_pricing table with retail pricing data |

---

## All Changed Files

### Modified (60 files)

<details>
<summary>Click to expand full list</summary>

**Config / Root:**
- `.github/copilot-instructions.md`
- `package.json`
- `vite.config.ts`

**Client:**
- `client/src/App.tsx`
- `client/src/features/dashboard/components/HealthPulseCard.tsx`
- `client/src/features/dashboard/components/ReviewScheduleCard.tsx`
- `client/src/features/formulas/components/CustomFormulaBuilderDialog.tsx`
- `client/src/features/formulas/components/InlineCapsuleSelector.tsx`
- `client/src/features/formulas/components/SupplementPricingSection.tsx`
- `client/src/features/marketing/components/HeroSectionV2.tsx`
- `client/src/features/marketing/components/MembershipPricingSection.tsx`
- `client/src/features/marketing/components/PricingSectionV2.tsx`
- `client/src/pages/ConsultationPage.tsx`
- `client/src/pages/LabReportsPage.tsx`
- `client/src/pages/MyFormulaPage.tsx`
- `client/src/pages/ProfilePage.tsx`
- `client/src/pages/SettingsPage.tsx`
- `client/src/pages/WearablesPage.tsx`
- `client/src/pages/admin/AdminDashboardPage.tsx`
- `client/src/shared/components/ui/dialog.tsx`
- `client/src/shared/components/ui/select.tsx`

**Server — API Layer:**
- `server/api/controller/admin.controller.ts`
- `server/api/controller/auth.controller.ts`
- `server/api/controller/chat.controller.ts`
- `server/api/controller/formulas.controller.ts`
- `server/api/controller/users.controller.ts`
- `server/api/controller/webhooks.controller.ts`
- `server/api/middleware/middleware.ts`
- `server/api/routes/admin.routes.ts`
- `server/api/routes/formulas.routes.ts`
- `server/api/routes/index.ts`
- `server/api/routes/users.routes.ts`

**Server — Modules:**
- `server/modules/admin/admin.repository.ts`
- `server/modules/admin/admin.service.ts`
- `server/modules/auth/auth.service.ts`
- `server/modules/chat/chat.service.ts`
- `server/modules/consents/consents.repository.ts`
- `server/modules/consents/consents.service.ts`
- `server/modules/files/files.repository.ts`
- `server/modules/formulas/formula-service.ts`
- `server/modules/formulas/formulas.service.ts`
- `server/modules/membership/membership.repository.ts`
- `server/modules/membership/membership.service.ts`
- `server/modules/system/system.service.ts`
- `server/modules/users/users.repository.ts`
- `server/modules/users/users.service.ts`
- `server/modules/wearables/wearables.service.ts`

**Server — Utils / Core:**
- `server/index.ts`
- `server/routes.ts`
- `server/utils/emailService.ts`
- `server/utils/healthTips.ts`
- `server/utils/prompt-builder.ts`
- `server/utils/seed-support-api.ts`
- `server/utils/smsReminderScheduler.ts`

**Server — Tests:**
- `server/__tests__/formula.test.ts`
- `server/__tests__/ingredients.test.ts`
- `server/__tests__/prompt-builder.test.ts`

**Shared:**
- `shared/ingredient-research.ts`
- `shared/ingredients.ts`
- `shared/schema.ts`

**Other:**
- `migrations/meta/_journal.json`
- `scripts/maintenance/update-pricing.mjs`

</details>

### New Files (22 files)

<details>
<summary>Click to expand full list</summary>

**Client:**
- `client/src/features/chat/components/MedicationDisclosureModal.tsx`
- `client/src/pages/CheckoutSuccessPage.tsx`
- `client/src/pages/MembershipPage.tsx`

**Server — New Modules:**
- `server/modules/billing/billing.service.ts`
- `server/modules/chat/protocol-recommendation.ts`
- `server/modules/formulas/manufacturer-pricing.service.ts`
- `server/api/controller/billing.controller.ts`
- `server/api/routes/billing.routes.ts`

**Server — New Tests:**
- `server/__tests__/billing.controller.test.ts`
- `server/__tests__/billing.service.test.ts`
- `server/__tests__/formula.stress.test.ts`
- `server/__tests__/membership.test.ts`
- `server/__tests__/protocol-recommendation.test.ts`

**Migrations:**
- `migrations/0004_add_sms_accountability_consent_enum.sql`
- `migrations/0005_equivalent_stack_pricing.sql`
- `migrations/0006_add_manufacturer_order_columns.sql`
- `migrations/add_medication_disclosure.sql`

**Scripts:**
- `scripts/alive-api-diagnostic.mjs`
- `scripts/alive-catalog-audit.mjs`
- `scripts/alive-catalog-debug.mjs`
- `scripts/check-labs.mjs`
- `scripts/check-orders-cols.mjs`
- `scripts/run-migration-0006.mjs`
- `scripts/migrate-medication-disclosure.mjs`
- `scripts/dev/apply-enum-migration.ts`
- `scripts/dev/audit-ingredient-mapping.ts`
- `scripts/seed-ingredient-pricing.ts`

**Docs:**
- `docs/FUTURE_FEATURES.md`

</details>

---

## Remaining Items for Team / Ajay

### 🔴 Critical (Before Production Launch)

1. **Confirm Alive Production API URL with Alive Innovations**
   - Currently using `https://dev.aliveinnovations.com/api` (dev environment)
   - Need the production URL and confirm the API key works there
   - Set `ALIVE_API_BASE_URL` in Railway env vars

2. **Confirm `/mix-product` API Contract with Alive**
   - We currently send: `POST /mix-product` with body `{ "quote_id": "<id>" }`
   - Need Alive to confirm:
     - Is the request format correct?
     - What response fields are returned? (we expect `order_id` or `id`)
     - What happens if we submit the same `quote_id` twice?
     - Is there a webhook for order status updates (shipped, delivered)?

3. **Set Production Environment Variables on Railway**
   - `ALIVE_API_BASE_URL` → production URL from Alive
   - `ALIVE_API_KEY` → confirm same key works in prod
   - `SESSION_SECRET` → generate a strong random secret
   - `FRONTEND_URL` → set to Vercel deployment URL

### 🟡 Important (Post-Launch)

4. **Alive Order Status Webhooks**
   - Currently we set `manufacturer_order_status` to `submitted` and never update it
   - Ask Alive: do they send webhooks for status changes (shipped/delivered)?
   - If yes, build a webhook endpoint to receive updates
   - If no, consider polling their API periodically

5. **Stripe Webhook Endpoint Configuration**
   - Ensure Stripe dashboard has the webhook pointing to: `https://<railway-url>/api/billing/webhooks/stripe`
   - Events to subscribe to: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`

6. **Run Outstanding Migrations on Any New Databases**
   - Migration 0004: SMS accountability consent enum
   - Migration 0005: Equivalent stack pricing table + seed
   - Migration 0006: Manufacturer order columns (already on prod Supabase)
   - Migration: Medication disclosure

### 🟢 Nice to Have

7. **Ingredient Pricing Data Review**
   - `scripts/seed-ingredient-pricing.ts` has estimated retail pricing for the "save vs buying separately" feature
   - Team should review the pricing data for accuracy

8. **Hidden Features Documentation**
   - See `docs/FUTURE_FEATURES.md` for hidden features (Custom Formula Builder, Formula Customization)
   - Backend endpoints are still active; only UI is hidden

---

## Quick Reference: API Endpoints Added/Changed

| Method | Path | Auth | New? |
|--------|------|------|------|
| GET | `/api/billing/history` | User | ✅ |
| GET | `/api/billing/invoices/:id` | User | ✅ |
| GET | `/api/billing/equivalent-stack` | User | ✅ |
| POST | `/api/billing/checkout/session` | User | ✅ |
| POST | `/api/billing/subscriptions/:id/cancel` | User | ✅ |
| POST | `/api/billing/webhooks/stripe` | None | ✅ |
| POST | `/api/admin/orders/:id/retry-manufacturer` | Admin | ✅ |
