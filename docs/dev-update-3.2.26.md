# Dev Update — March 2, 2026 (`dev-3.2.26`)

> **Branch:** `dev-3.2.26` (based off `dev-2.25.26`)  
> **Changes since:** commit `3186666` (dev-2.25.26)  
> **Scope:** 64 files changed, +9,161 / −1,547 lines

---

## Summary

This update delivers **15 features** across backend, frontend, and shared packages:

| # | Feature | Type |
|---|---------|------|
| 1 | Supplement Safety Validation Engine | New system |
| 2 | Safety Warning Acknowledgment & Checkout Gate | New system |
| 3 | Lab Report Analysis Pipeline Rebuild | Major rewrite |
| 4 | Biomarker Dashboard & Aggregation Engine | New module + major rewrite |
| 5 | Wearable Metric Catalog & Dashboard Customization | New system |
| 6 | Wearable Weekly Brief & AI Analysis | New feature |
| 7 | Health Pulse Intelligence Card | Major rewrite |
| 8 | AI Chat Thinking Steps UX | New feature |
| 9 | Lab-to-Chat "Discuss with Practitioner" Link | New feature |
| 10 | Terms of Service Consent at Signup | Compliance |
| 11 | Lab Trend Rules Expansion (~20 → 100+ rules) | Enhancement |
| 12 | Claude 4.6 Model Support | Enhancement |
| 13 | AI Prompt: Stricter Ingredient Name Enforcement | Enhancement |
| 14 | Formula Minimum Ingredient Rules | Enhancement |
| 15 | My Formula Page: Collapsible Details & SMS UX | Enhancement |

Plus: compliance documentation, server stability improvements, admin UI updates, 8 developer scripts, marketing fixes.

---

## 1. Supplement Safety Validation Engine (NEW)

A complete deterministic safety system that screens every formula for drug interactions, contraindications, allergens, and organ risks before it can be saved or purchased.

### What It Does
- **3-tier severity model:**
  - `critical` — hard block, formula cannot be saved
  - `serious` — requires explicit user acknowledgment before checkout
  - `informational` — displayed, no enforcement
- **7 safety check categories:** Drug–supplement interactions (19 drug classes), pregnancy/nursing contraindications, allergen cross-references (shellfish→glucosamine, bee→bee pollen, dairy→whey, etc.), liver/kidney organ flags, antiplatelet stacking detection, condition-based contraindications, absolute max daily dose limits
- **19 drug classes covered:** Blood thinners, SSRIs/SNRIs, thyroid meds, diabetes meds, blood pressure meds, immunosuppressants, chemotherapy, statins, hormone meds, seizure meds, sedatives, opioids, ADHD stimulants, PPIs, antibiotics, corticosteroids, cardiac glycosides, CYP450 drugs, kidney impairment
- **Integrated into formula creation flow:** Chat controller runs validation after AI builds formula — emits `safety_block` or `safety_warnings` SSE events to the client in real-time

### Key Files
| File | Purpose |
|------|---------|
| `server/modules/formulas/safety-validator.ts` | **New** — 553-line validation engine: `validateFormulaSafety()` |
| `shared/safety-types.ts` | **New** — Shared types: `SafetyWarning`, `SafetyValidationResult`, `SafetyAuditEntry` |
| `shared/ingredient-contraindications.ts` | **New** — 288-line ingredient contraindication catalog with 30+ ingredients |
| `server/api/controller/chat.controller.ts` | Integrated: blocks formula save on critical, stores `safetyValidation` on formula, sends SSE warning events |

---

## 2. Safety Warning Acknowledgment & Checkout Gate (NEW)

Legal compliance layer — users must acknowledge serious safety warnings before they can purchase a formula.

### What It Does
- Checkout button is disabled when serious warnings exist but haven't been acknowledged
- User sees severity-aware warning UI: critical (red, always expanded), serious (amber, expandable with "review required"), informational (blue, collapsible)
- Acknowledgment records: warnings JSON, disclaimer version, IP address, user agent, timestamp
- Checkout gate in billing service: throws `SAFETY_WARNINGS_NOT_ACKNOWLEDGED` if unacknowledged

### Key Files
| File | Purpose |
|------|---------|
| `server/api/controller/formulas.controller.ts` | **New** — `acknowledgeWarnings()`, `getAcknowledgmentStatus()` |
| `server/api/routes/formulas.routes.ts` | New routes: `POST /api/formulas/:id/acknowledge-warnings`, `GET /api/formulas/:id/acknowledgment-status` |
| `server/modules/formulas/formulas.repository.ts` | `updateFormulaAcknowledgment()` |
| `server/modules/system/system.repository.ts` | `createSafetyAuditLog()`, `createWarningAcknowledgment()`, `getWarningAcknowledgment()` |
| `server/modules/billing/billing.service.ts` | Safety gate in `createCheckoutSession()` |
| `server/api/controller/billing.controller.ts` | 403 response for `SAFETY_WARNINGS_NOT_ACKNOWLEDGED` |
| `client/src/pages/MyFormulaPage.tsx` | Safety warning display + acknowledgment checkbox + checkout gating |

### New DB Tables & Columns
- **Table:** `formula_warning_acknowledgments` — paper trail (warnings JSON, disclaimer version, IP, user agent, timestamp)
- **Table:** `safety_audit_logs` — compliance audit trail (userId, formulaId, action, severity, warnings)
- **Columns on `formulas`:** `safetyValidation` (JSON), `warningsAcknowledgedAt`, `warningsAcknowledgedIp`, `disclaimerVersion`

---

## 3. Lab Report Analysis Pipeline Rebuild (MAJOR)

### Problem
29-page PDF lab reports were stuck on "Processing" indefinitely — cascading failures from synchronous blocking, JSON truncation, OOM crashes, and lost normalizer fields.

### What Changed
| File | Change |
|------|--------|
| `server/utils/fileAnalysis.ts` | Async background analysis, `max_tokens` → 16384, JSON salvage/repair for truncated AI responses, parallel OCR (3 pages at a time, scale 1.5), image cleanup, 5-minute timeout wrapper, progress callbacks, `overallAssessment` + `riskPatterns` extraction, per-marker `category` assignment |
| `server/modules/files/files.service.ts` | Progress callback integration, stale-processing recovery, marker insight generation at upload time |
| `server/modules/files/files.repository.ts` | `getFilesByUser()`, `updateFile()`, `recoverStaleProcessing()` |
| `server/index.ts` | `--max-old-space-size=4096`, `uncaughtException`/`unhandledRejection` crash handlers, stale processing recovery at startup |
| `shared/schema.ts` | `labReportData` JSONB with `progressStep`, `progressDetail`, `overallAssessment`, `riskPatterns`, `markerInsights` |

### For Devs
- `POST /api/files/:id/reanalyze` returns immediately — analysis runs in background
- `labReportData.analysisStatus` transitions: `pending` → `processing` → `completed` / `error`
- Frontend polls via TanStack Query refetch interval while `processing`
- AI generates `overallAssessment` (2-3 sentence clinical summary) and `riskPatterns` (multi-marker patterns like "Metabolic Syndrome Risk")

---

## 4. Biomarker Dashboard & Aggregation Engine (NEW MODULE + MAJOR REWRITE)

Transformed the Lab Reports page from a simple file list into a full clinical biomarker analytics dashboard.

### What's New

**Backend — `server/modules/labs/`:**
| File | Purpose |
|------|---------|
| `server/modules/labs/labs.service.ts` | **New** — 1,397 lines: `getBiomarkersDashboard()`, `generateAllMarkerInsights()` (batched in groups of 25), `computeHealthScore()` (composite 0-100 from panel grades), `generateAnalysisSummary()`, category inference (20+ regex rules for 18 panels), trend computation (improving/worsening/stable/new) |
| `server/modules/labs/biomarker-aliases.ts` | **New** — 424 lines, 400+ aliases mapping lab names to canonical names (e.g., "WBC" / "white blood cells" / "leukocytes" → "White Blood Cell Count") |
| `server/api/controller/labs.controller.ts` | **New** — Controller for biomarker endpoints |
| `server/api/routes/labs.routes.ts` | **New** — `GET /api/labs/biomarkers`, `POST /api/labs/generate-insights/:fileId` |

**Frontend — `client/src/pages/LabReportsPage.tsx` (+1,808 lines):**
- Aggregated biomarker grid with sparklines per marker
- Category grouping (Lipid Panel, CBC, Metabolic, Liver, Thyroid, Vitamins, Hormones, etc.)
- Trend badges (improving/worsening/stable/new)
- Health score display with panel-level A+ through F grading
- Status colors (normal/high/low/critical)
- Search & filter
- Per-marker AI insight panel
- "Discuss with AI" button (see #9)

### For Devs
- Markers are aggregated across ALL uploaded reports per user — not just the latest
- Biomarker aliases ensure "WBC", "White Blood Cell Count", and "Leukocytes" all merge to one canonical marker
- Insights stored in `biomarker_insights` table AND in `labReportData.markerInsights`
- `GET /api/labs/biomarkers` returns complete dashboard payload: markers, insights, health score, panel grades, summary

---

## 5. Wearable Metric Catalog & Dashboard Customization (NEW)

### What's New
- **Universal Metric Catalog** (`shared/metricCatalog.ts`) — 701-line single source of truth for every health metric across all wearable providers: 30+ metrics across 8 pillars (sleep, activity, recovery, body, workouts, heart, glucose, nutrition) with display metadata (labels, units, icons, colors, sparkline paths, stat resolution, provider lists, formatting rules)
- **Customizable dashboard:** Users show/hide individual metrics via a settings modal; preferences saved to `users.metricPreferences` (JSON array)
- **Dynamic tile rendering:** Dashboard tiles driven by catalog data instead of hardcoded — `resolvePath()` reads values, `formatMetric()` handles sleep/number/percent/weight/distance formatting

### Key Files
| File | Purpose |
|------|---------|
| `shared/metricCatalog.ts` | **New** — Metric definitions, defaults, pillar grouping, lookup helpers |
| `client/src/pages/WearablesPage.tsx` | `CustomizeMetricsModal`, dynamic tile rendering, icon lookup (+564 lines) |
| `server/api/controller/users.controller.ts` | `getMetricPreferences()`, `updateMetricPreferences()` |
| `server/api/routes/users.routes.ts` | `GET/PUT /api/users/me/metric-preferences` |
| `server/modules/users/users.service.ts` | Service methods for metric preferences |

---

## 6. Wearable Weekly Brief & AI Analysis (NEW)

### What's New
- **Tiered weekly brief** (`getWeeklyBrief()`) — 5 tiers based on data duration: `insufficient` (<3 days), `snapshot` (3-6), `early_trends` (7-13), `weekly` (14-29), `full` (30+)
- **Deterministic signal computation:** Recent vs baseline comparison for sleep, activity, body metrics — no AI needed for the numbers
- **AI narrative layer:** GPT-4o-mini generates a concise health narrative from computed signals, contextualized with user's active supplement formula
- **Formula-aware insights:** Fetches user's current formula ingredients to provide supplement-specific observations
- **1-hour server-side caching** per user

### Key Files & Endpoints
| Endpoint | Purpose |
|----------|---------|
| `GET /api/wearables/weekly-brief` | Tiered wearable weekly summary |
| `GET /api/wearables/ai-analysis` | AI-generated health narrative |
| `GET /api/wearables/health-pulse-intelligence` | Dashboard intelligence card data |

All implemented in `server/modules/wearables/wearables.service.ts` (+1,152 lines total for wearable features).

---

## 7. Health Pulse Intelligence Card (MAJOR REWRITE)

Replaced the old metric-tile dashboard card (steps/sleep/HRV grid + lab pills) with an AI-powered intelligence narrative.

### Architecture
```
Wearable data (Junction SDK) ──┐
                                ├──→ Signal Computation ──→ Deterministic ──→ AI Narrative ──→ Response
Lab reports (biomarker DB) ────┘     (deltas, stdev)        State Engine      (GPT-4o-mini)
```

### State Classification Rules
| State | Trigger |
|-------|---------|
| `under_recovery` | HRV ↓12%+ AND RHR ↑5+ bpm |
| `circadian_stress` | Sleep inconsistency >45min std dev AND HRV ↓8%+ |
| `attention` | Any critical lab marker OR 3+ abnormal markers |
| `adapting` | HRV ↓8%+ OR sleep inconsistency >30min |
| `optimal` | HRV ↑5%+ AND sleep consistency <20min AND no abnormal labs |
| `baseline` | Default / insufficient data |

### Frontend Card
Complete rewrite of `HealthPulseCard.tsx` (451→270 lines):
- State-driven theming (gradient backgrounds, animated pulse dot, themed icons per state)
- Headline + natural-language summary from AI
- "Key Drivers" panel (3-4 signals with category icons + severity indicators)
- "Next Steps" with numbered action items
- Footer links to Labs / Devices
- Premium no-data state with connect/upload CTAs
- No scores, no metric tiles, no sparklines — pure intelligence narrative

### For Devs
- Old endpoint `GET /api/wearables/health-pulse` is **still registered** — no breaking change
- New endpoint returns: `{ state, stateLabel, stateColor, headline, summary, drivers[], actions[], hasWearable, hasLabs, providers[], lastUpdated }`
- 1-hour cache per userId, deterministic fallback if AI fails

---

## 8. AI Chat Thinking Steps UX (NEW)

Replaced generic "Analyzing your health data..." spinner with a multi-step animated progress indicator.

### What It Does
- **4-stage stepper:** "Reviewing your data" → "Understanding your question" → "Referencing materials" → "Crafting your response"
- Each step transitions: waiting → active (spinner) → done (checkmark)
- Server emits `thinking_step` SSE events with step ID, status, and contextual detail (e.g., "health profile, 12 biomarkers, active formula")
- Steps clear on first content chunk

### Key Files
| File | Purpose |
|------|---------|
| `client/src/features/chat/components/ThinkingSteps.tsx` | **New** — Animated stepper component |
| `client/src/pages/ConsultationPage.tsx` | Step state management + SSE event handling |
| `server/api/controller/chat.controller.ts` | Emits `thinking_step` events at each processing stage |

---

## 9. Lab-to-Chat "Discuss with Practitioner" Link (NEW)

### What It Does
- On the biomarker dashboard, each marker's insight panel has a "Discuss with your AI practitioner" link
- Click stores a contextual message in `localStorage('labMarkerDiscuss')` with the marker name, value, status, and insight
- Navigates to `/dashboard/chat?new=true`
- `ConsultationPage` reads `labMarkerDiscuss` on mount, starts a new conversation, and auto-sends the pre-filled message
- Uses `pendingLabMessage` state pattern to avoid temporal dead zone issues

### Key Files
- `client/src/pages/LabReportsPage.tsx` — "Discuss" button + localStorage storage
- `client/src/pages/ConsultationPage.tsx` — `pendingLabMessage` state, localStorage consumption, auto-send

---

## 10. Terms of Service Consent at Signup (COMPLIANCE)

### What's New
- **Mandatory TOS checkbox** on signup form — `z.literal(true)` in Zod schema (form won't submit without it)
- Links to Terms of Service and Privacy Policy
- On successful registration, records a `data_retention` consent entry in `user_consents` table with timestamp

### Key Files
- `client/src/pages/SignupPage.tsx` — Checkbox UI
- `shared/schema.ts` — `signupSchema.acceptedTerms: z.literal(true)`
- `server/modules/auth/auth.service.ts` — Records consent via `consentsRepository`

---

## 11. Lab Trend Rules Expansion

Expanded biomarker clinical direction rules from ~20 keywords to 100+.

| Direction | Added |
|-----------|-------|
| **Lower-is-better** | Non-HDL, VLDL, Lp(a), ESR, fibrinogen, interleukin, creatinine, BUN, cystatin C, WBC, RDW, troponin, BNP, CK, LDH, lead/mercury/arsenic/cadmium, PSA |
| **Higher-is-better** | Vitamin D, B12, folate, iron, zinc, magnesium, selenium, copper, transferrin sat, IGF-1, EPA, DHA, hemoglobin, hematocrit, RBC, platelets, eGFR, albumin, complement C3/C4 |
| **Balanced-range** | LH, FSH, SHBG, prolactin, all CBC differentials, MCV, MCH, MCHC, MPV, electrolytes, bilirubin, globulin, PT, INR, APTT |

Key file: `server/modules/chat/lab-trend-rules.ts`

---

## 12. Claude 4.6 Model Support

- Added Claude 4.6 family: `claude-opus-4-6`, `claude-sonnet-4-6`, `claude-haiku-4-6` (with date-stamped variants)
- Default Anthropic model updated to `claude-sonnet-4-6`
- Alias normalization for "opus 4.6", "sonnet 4.6", "haiku 4.6"
- Admin dashboard updated with Claude 4.6 options (primary, 4.5 demoted)
- Max completion tokens increased: 3000 → 4096 for both OpenAI and Anthropic

Key files: `server/infra/ai/ai-config.ts`, `client/src/pages/admin/AdminDashboardPage.tsx`

---

## 13. AI Prompt: Stricter Ingredient Name Enforcement

- Added explicit rule: "USE EXACT INGREDIENT NAMES FROM THIS CATALOG — COPY THEM CHARACTER-FOR-CHARACTER"
- Examples of wrong vs right (e.g., "CoQ10" → "CoEnzyme Q10")
- Revised formula composition to emphasize 8-ingredient hard minimum with clinical judgment for going higher
- Removed per-tier ingredient count suggestions

Key file: `server/utils/prompt-builder.ts`

---

## 14. Formula Minimum Ingredient Rules

- Removed per-capsule-tier minimums (8/9/9) — **flat minimum of 8 for ALL capsule tiers**
- Added minimum ingredient validation to `formulasService.revertFormula()` — old formulas with <8 ingredients can't be reverted
- Added minimum ingredient validation to `formulasService.saveCustomizedFormula()`

Key files: `server/modules/formulas/formula-service.ts`, `server/modules/formulas/formulas.service.ts`

---

## 15. My Formula Page: Collapsible Details & SMS UX

- Ingredient list, dosage instructions, system supports, and customizations moved into a collapsible section ("View formula details") — declutters checkout flow
- SMS opt-in: if user already has SMS accountability consent, shows "ONES Accountability AI enabled" instead of opt-in prompt
- Founding tier capacity reads from `currentMembershipTier?.maxCapacity` (default 250) instead of hardcoded 100

Key file: `client/src/pages/MyFormulaPage.tsx`

---

## Server Stability & Compliance

| Change | File |
|--------|------|
| `uncaughtException` + `unhandledRejection` crash handlers | `server/index.ts` |
| Stale processing recovery at startup (lab reports stuck from crashes) | `server/index.ts`, `files.repository.ts` |
| `--max-old-space-size=4096` in dev script | `package.json` |
| Compliance Risk Summary documentation | `docs/COMPLIANCE_RISK_SUMMARY.md` |

---

## Developer Scripts (can be removed before prod)

| Script | Purpose |
|--------|---------|
| `scripts/check-formulas.ts` | Inspect formula data in DB |
| `scripts/check-json-size.ts` | Check JSON column sizes |
| `scripts/check-lab-data.ts` / `check-lab-detail.ts` | Inspect lab report data |
| `scripts/generate-insights.ts` | Generate AI insights for existing markers |
| `scripts/reanalyze-lab.ts` / `reset-and-reanalyze.ts` | Re-run lab analysis on existing uploads |
| `scripts/test-biomarkers.ts` | Test biomarker alias resolution |
| `scripts/dev/*.mjs` | ESM dev utility scripts |

---

## All New API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/labs/biomarkers` | User | Full biomarker dashboard (markers, insights, health score, panels) |
| POST | `/api/labs/generate-insights/:fileId` | User | Trigger insight generation for a lab file |
| GET | `/api/wearables/health-pulse-intelligence` | User | AI-powered health pulse narrative |
| GET | `/api/wearables/weekly-brief` | User | Tiered wearable weekly summary |
| GET | `/api/wearables/ai-analysis` | User | AI health narrative from wearable data |
| GET | `/api/users/me/metric-preferences` | User | Get dashboard metric preferences |
| PUT | `/api/users/me/metric-preferences` | User | Update dashboard metric preferences |
| POST | `/api/formulas/:id/acknowledge-warnings` | User | Acknowledge safety warnings on a formula |
| GET | `/api/formulas/:id/acknowledgment-status` | User | Check acknowledgment status |

---

## All New Database Tables & Columns

Run `npm run db:push` after merging.

| Change | Type | Purpose |
|--------|------|---------|
| `biomarker_insights` | New table | Per-marker AI-generated clinical insights |
| `formula_warning_acknowledgments` | New table | Legal paper trail for safety warning acknowledgments |
| `safety_audit_logs` | New table | Compliance audit trail for safety checks |
| `files.labReportData` | New JSONB column | Extracted lab data, analysis status, overallAssessment, riskPatterns, markerInsights |
| `users.metricPreferences` | New JSONB column | Dashboard metric display preferences |
| `formulas.safetyValidation` | New JSONB column | Structured safety validation result |
| `formulas.warningsAcknowledgedAt` | New timestamp | When user acknowledged warnings |
| `formulas.warningsAcknowledgedIp` | New varchar | IP at time of acknowledgment |
| `formulas.disclaimerVersion` | New varchar | Version of disclaimer shown |
| `signupSchema.acceptedTerms` | New field | TOS consent gate |

---

## Crossover with Dev Team Changes

The dev team pushed 5 commits to `origin/dev` since `dev-2.25.26`:

### Files Both Sides Modified

| File | Our Change | Their Change | Conflict Risk |
|------|-----------|-------------|---------------|
| `OrdersPage.tsx` | Minor (removed old upcoming delivery section) | Major rewrite (order history, invoices, resume subscription) | **Medium** — recommend using their version |
| `billing.controller.ts` | Added `SAFETY_WARNINGS_NOT_ACKNOWLEDGED` handler | Added resume subscription endpoint | **Low** — different sections |
| `billing.service.ts` | 8-line safety gate in `createCheckoutSession` | 125+ lines (resume, renewsAt fix) | **Low** — different methods |
| `users.service.ts` | Added metric preference methods | Added subscription helpers | **Low** — different methods |

### Files Only They Changed (no conflict)
- `ResetPasswordPage.tsx` — Eye icon + bug fix
- `ProfilePage.tsx` — Prevent negative values for weight/age
- `billing.routes.ts` — Resume subscription route
- `billing.service.test.ts` — New tests

### Recommendation
1. Merge `dev-3.2.26` into `dev` (or vice versa)
2. For `OrdersPage.tsx`: accept their version, re-check if our delivery section removal is still relevant
3. Other 3 files: should auto-resolve (different code sections)

---

## Testing Notes

- Lab pipeline: tested with 29-page PDF → 97+ biomarkers extracted successfully
- Insights: 96 insights for file d7003671, 101 for file 340746a5
- Safety validator: blocks checkout for formulas with unacknowledged contraindication warnings
- Health Pulse Intelligence: requires wearable connection OR uploaded labs — shows premium empty state otherwise
- All 258 unit tests passing
