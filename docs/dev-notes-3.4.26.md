# ONES AI — Dev Notes: Branch `dev-3.4.26`
**Date:** March 4, 2026  
**Branch:** `dev-3.4.26`  
**Based on:** `dev-3.2.26`

---

## Overview

This branch contains a significant batch of updates across the full stack — UI/UX refinements, server module restructuring, schema additions, and new features. Read through each section before picking up a task.

---

## What Changed

### Frontend — Client

#### Marketing Pages
- Refreshed hero, FAQ, CTA, testimonials, pricing, science, and lifestyle sections (`HeroSectionV2`, `FAQSectionV2`, `CTASectionV2`, etc.)
- New `HowItWorksSectionV2New.tsx` variant for A/B testing
- `CompetitiveComparisonSection`, `InterventionSection`, `PersonalizationShowcase`, `MembershipValueSection`, `MembershipPricingSection` — content and layout updates
- `HeaderV2` and `FooterV2` — nav and link updates

#### Dashboard Cards
- `HealthPulseCard`, `TodayAtGlanceCard`, `TodaySummaryCard`, `TrackingPillBar`, `TrackingSettingsCard`, `WeeklyProgressRings`, `SupplementTrackerCard`, `PersonalRecordsCard`, `FormulaReviewBanner` — polish pass and data wiring

#### Formula Flow
- `CapsuleSelectionModal` and `InlineCapsuleSelector` — UX updates
- `SupplementPricingSection` — pricing copy/layout refinements

#### Chat
- `MedicationDisclosureModa.tsx` — disclosure modal updates
- `ThinkingSteps.tsx` — streaming thinking indicator improvements

#### Navigation & Shared Components
- `AppSidebar`, `DashboardLayout`, `MobileBottomNav`, `MobileHeader`, `MobilePageWrapper` — layout and responsive updates
- `OnesLogo`, `ErrorBoundary`, `CategoryChip`, `card.tsx`, `sidebar.tsx` — minor refinements

#### Pages Updated
`AboutPage`, `BlogPage`, `CareersPage`, `CheckoutSuccessPage`, `ConsultationPage`, `ContactPage`, `DashboardHome`, `DisclaimerPage`, `LabReportsPage`, `LandingPageV2`, `MembershipPage`, `MyFormulaPage`, `OptimizePage`, `OrdersPage`, `PartnershipsPage`, `PrivacyPage`, `ProfilePage`, `RefundsPage`, `ReturnsPage`, `SciencePage`, `SettingsPage`, `ShippingPage`, `SupportPage`, `TermsPage`, `WearablesPage`, `AdminDashboardPage`

#### New Files
- `client/src/pages/admin/AuditLogsPage.tsx` — admin view for audit log entries
- `docs/notification-previews.html` — HTML preview for notification email templates
- Media assets added to `client/public/`: hero images, capsule formation video, homepage video, pill SVG, Ones logo (transparent)

---

### Backend — Server

#### Module Restructuring
The server has been refactored into a cleaner module-based structure under `server/modules/`:

| Module | Notes |
|---|---|
| `auth/auth.service.ts` | Login/signup/token logic |
| `billing/billing.service.ts` | Stripe billing handling |
| `chat/chat.repository.ts` + `chat.service.ts` | Chat session + message CRUD, AI orchestration |
| `consents/consents.repository.ts` | Consent snapshot storage |
| `files/files.service.ts` | GCS file uploads, lab PDF handling |
| `formulas/formulas.service.ts` | Formula creation, versioning |
| `formulas/formula-review.service.ts` | AI formula review workflow |
| `formulas/safety-validator.ts` | Ingredient safety + dose validation |
| `notifications/notifications.service.ts` | Email + SMS dispatch |
| `system/system.repository.ts` | App settings, system info |
| `users/users.repository.ts` + `users.service.ts` | User CRUD |
| `wearables/wearables.repository.ts` | Wearable token + biometric data |
| `webhooks/webhooks.service.ts` | Stripe webhook handling |
| `ai/` *(new module)* | AI provider abstraction (OpenAI/Anthropic) |

#### API Controllers & Routes (Refactored)
- `server/api/controller/admin.controller.ts`
- `server/api/controller/auth.controller.ts`
- `server/api/controller/chat.controller.ts`
- `server/api/controller/users.controller.ts`
- `server/api/routes/admin.routes.ts`
- `server/api/routes/chat.routes.ts`
- `server/api/routes/users.routes.ts`

#### Utilities
- `prompt-builder.ts` — prompt context injection updates
- `autoOptimizeScheduler.ts` — formula auto-optimization scheduler
- `smsReminderScheduler.ts` — reminder timing adjustments
- `emailService.ts` — template and delivery updates

#### Database / Schema
- `shared/schema.ts` — schema additions (check Drizzle migration before deploying)
- `shared/ingredient-contraindications.ts` — expanded contraindication rules

#### Migration Scripts (run once per environment)
Located in `scripts/`:
- `migrate-wearable-schema.cjs` — adds wearable-related columns (already run on dev DB)
- `migrate-consent-snapshot.cjs` — consent snapshot table setup
- `migrate-tos.cjs` — terms of service versioning table

---

## Deployment Checklist

Before deploying this branch to staging or production:

- [ ] Run `npm run db:push` to sync schema changes
- [ ] Run migration scripts in `scripts/` if not already applied to the target DB
- [ ] Verify `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, and all env vars in `server/.env`
- [ ] Test the formula creation flow end-to-end (chat → formula → capsule selection → checkout)
- [ ] Smoke-test wearable OAuth connect/disconnect for Fitbit, Oura, Whoop
- [ ] Confirm admin audit log page loads at `/admin/audit-logs`
- [ ] Check notification emails render correctly (see `docs/notification-previews.html`)
- [ ] Run `npm run check` — resolve any TypeScript errors before merging to `main`

---

## Key Files for Developers

| File | Purpose |
|---|---|
| `shared/schema.ts` | DB schema — source of truth |
| `shared/ingredients.ts` | Ingredient catalog + dosing rules |
| `shared/ingredient-contraindications.ts` | Safety contraindication rules |
| `server/utils/prompt-builder.ts` | AI system prompt construction |
| `server/modules/ai/` | AI provider abstraction |
| `server/modules/formulas/safety-validator.ts` | Formula dose validation |
| `client/src/features/chat/components/` | Chat UI components |
| `client/src/features/dashboard/components/` | Dashboard card components |
| `docs/dev-notes-3.4.26.md` | This file |

---

## Notes for the Team

- **Do not bypass** `safety-validator.ts` — all formula submissions must pass validation before saving.
- **Ingredient catalog** (`shared/ingredients.ts`) is the single source of truth for dosing ranges. If you need to add or adjust an ingredient, update that file and re-test formula generation.
- **AI module** (`server/modules/ai/`) is new — it wraps both OpenAI and Anthropic. Admin can switch providers at runtime via the Admin Dashboard → AI Settings.
- **Migration scripts** are one-time — mark them done in your environment once applied.
- **Media assets** in `client/public/` are large — confirm they are excluded from Railway's build if not needed server-side (see `railway.json`).

---

*Last updated by: Pete — March 4, 2026*
