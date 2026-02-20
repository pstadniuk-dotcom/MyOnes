# Dev Update — 2.19.26
**Branch:** `dev-updated-2.19.26`
**Commit:** `e1046ae`
**Tests:** 126 passing ✅

---

## Overview

This update adds three interconnected features to the ONES dashboard:

1. **Health Pulse Card** — wearable + lab data snapshot visible to all users
2. **Formula Drift Detection** — server-side service that scores how stale a user's formula is based on new lab data and wearable trends
3. **Auto-Optimize Toggle** — user preference: "review manually" (default) vs. "auto-update formula when drift is detected"

All code follows the existing DDD module structure (`server/modules/`, `server/api/controller/`, `server/api/routes/`).

---

## 1. Database Change

**File:** `shared/schema.ts`

Added one column to the `users` table:

```sql
auto_optimize_formula boolean NOT NULL DEFAULT false
```

Applied directly to the database alongside the schema update. Run `npm run db:push` when deploying to any environment that hasn't received it yet. If `db:push` stalls on interactive prompts (Drizzle constraint questions), apply manually:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS auto_optimize_formula boolean NOT NULL DEFAULT false;
```

---

## 2. Health Pulse Card

### Backend
| File | Change |
|------|--------|
| `server/modules/wearables/wearables.service.ts` | Added `getHealthPulseSummary(userId)` |
| `server/api/controller/wearables.controller.ts` | Added `getHealthPulseSummary` handler |
| `server/api/routes/wearables.routes.ts` | `GET /api/wearables/health-pulse` (auth required) |

**What `getHealthPulseSummary` returns:**
```typescript
{
  connected: boolean,
  providers: string[],
  today: { sleepMinutes, deepSleepMinutes, sleepScore, hrvMs, steps, activeMinutes },
  trends: { dates[], sleepMinutes[], hrv[], steps[] },   // last 7 days
  labMarkers: [{ name, value, unit, status: 'normal'|'high'|'low'|'critical' }],
  labReportDate: string | null,
  lastUpdated: string
}
```

### Frontend
**File:** `client/src/features/dashboard/components/HealthPulseCard.tsx` (new)

- 4 metric tiles: Sleep, HRV, Steps, Active Minutes
- 7-day bar sparklines for each metric
- Trend badge (↑ improving / ↓ declining / → stable)
- Lab markers rendered as colored pills (emerald = normal, amber = high, sky = low, red = critical)
- Empty state if no wearable connected — links to `/dashboard/wearables`
- Prompt to upload blood test if no lab data
- **Always visible** — not gated behind formula or new-user state

Rendered in `client/src/pages/DashboardHome.tsx` below the quick stats grid.

---

## 3. Auto-Optimize Toggle

### Backend
| File | Change |
|------|--------|
| `server/modules/users/users.service.ts` | Added `getAutoOptimize(userId)`, `updateAutoOptimize(userId, enabled)` |
| `server/api/controller/users.controller.ts` | Added `getAutoOptimize`, `updateAutoOptimize` handlers |
| `server/api/routes/users.routes.ts` | `GET /api/users/me/auto-optimize`, `PATCH /api/users/me/auto-optimize` |

**PATCH body:**
```json
{ "enabled": true }
```

**Response:**
```json
{ "autoOptimizeFormula": true }
```

**Default:** `false` — user must opt in. When `false`, the system sends a review notification but does not change the formula automatically.

---

## 4. Formula Drift Detection

**File:** `server/modules/formulas/formula-review.service.ts` (new)

### `getReviewStatus(userId)` — returns `FormulaReviewStatus`

Checks three signals and accumulates a `driftScore` (0–100):

| Signal | Points | Trigger |
|--------|--------|---------|
| Formula age | +15–30 | ≥ 30 days since formula was created |
| New lab report | +35 | Lab uploaded after formula creation date |
| HRV declining | +20 | Avg HRV last 14 days < first 14 days by >5% |
| Sleep declining | +15 | Same comparison for sleep minutes |
| Steps declining | +10 | Same comparison for step count |

`needsReview = driftScore >= 40`

**Full return shape:**
```typescript
{
  needsReview: boolean,
  autoOptimizeEnabled: boolean,
  reasons: string[],          // human-readable list of triggers
  driftScore: number,         // 0–100
  formulaAgeDays: number | null,
  newLabSinceFormula: boolean,
  wearableDrift: {
    hrv: 'declining' | 'stable' | 'improving' | null,
    sleep: 'declining' | 'stable' | 'improving' | null,
    steps: 'declining' | 'stable' | 'improving' | null
  },
  lastChecked: string         // ISO timestamp
}
```

### `sendReviewNotification(userId, mode, reasons, formulaName?)`

Sends email (SendGrid) + SMS (Twilio, if `user.phone` is set) using the existing `formula_update` notification templates.

| `mode` | Email subject | Content |
|--------|--------------|---------|
| `'manual_review_needed'` | "Your ONES formula may need a review" | Lists drift reasons, CTA to dashboard |
| `'auto_updated'` | "Your ONES formula has been updated" | Confirms auto-update, lists reasons, review/rollback CTA |

### API Endpoint
| File | Change |
|------|--------|
| `server/api/controller/formulas.controller.ts` | Added `getReviewStatus` handler |
| `server/api/routes/formulas.routes.ts` | `GET /api/formulas/review-status` (auth required) |

---

## 5. Formula Review Banner

**File:** `client/src/features/dashboard/components/FormulaReviewBanner.tsx` (new)

- Queries `GET /api/formulas/review-status` (5-minute cache)
- **Renders nothing** if `needsReview: false` or no formula exists
- Amber banner (red if `driftScore >= 70`) with drift reasons list
- "Review now" button → `/dashboard/chat?context=formula-review`
- Inline auto-optimize toggle — PATCH `/api/users/me/auto-optimize` on change
- Shows loading spinner during toggle mutation

Rendered in `client/src/pages/DashboardHome.tsx` above `<HealthPulseCard />`, gated on `currentFormula` existing.

---

## 6. What's Remaining (Next Session)

| Task | Notes |
|------|-------|
| **Auto-optimize scheduler** | When `autoOptimizeFormula=true` and `needsReview=true`, trigger AI re-optimization + call `sendReviewNotification(..., 'auto_updated', ...)`. Probably a nightly cron alongside the existing SMS reminder scheduler. |
| **Settings page toggle** | Expose the auto-optimize toggle in Profile → Formula Preferences as a standalone setting, not just in the banner |
| **Pre-reorder review gate** | Before order confirms, check `getReviewStatus` — if `needsReview` and `autoOptimizeEnabled=false`, show a blocking review step |

---

## File Map

```
shared/
  schema.ts                          ← autoOptimizeFormula column added

server/
  modules/
    formulas/
      formula-review.service.ts      ← NEW: drift detection + notifications
    users/
      users.service.ts               ← getAutoOptimize, updateAutoOptimize
    wearables/
      wearables.service.ts           ← getHealthPulseSummary
  api/
    controller/
      formulas.controller.ts         ← getReviewStatus handler
      users.controller.ts            ← getAutoOptimize, updateAutoOptimize handlers
      wearables.controller.ts        ← getHealthPulseSummary handler
    routes/
      formulas.routes.ts             ← GET /review-status
      users.routes.ts                ← GET/PATCH /me/auto-optimize
      wearables.routes.ts            ← GET /health-pulse

client/src/
  features/dashboard/components/
    HealthPulseCard.tsx              ← NEW: wearable + lab snapshot card
    FormulaReviewBanner.tsx          ← NEW: drift alert banner + auto-optimize toggle
  pages/
    DashboardHome.tsx                ← imports both new components
```
