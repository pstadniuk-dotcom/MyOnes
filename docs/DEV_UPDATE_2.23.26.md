# DEV UPDATE — 2.23.26

Date: 2026-02-23
Branch: `dev-update-2.23.26`

## What was pushed today

### Earlier pushes
1. `d03eb23` — feat: remove draft message on logout
2. `071cc94` — feat: fix steps on dashboard, temporarily disabled subscription button, fix chat layout

### This push (lab + wearables reliability)

#### 1) Health Pulse + Labs summary v1.1 sections
- Added three structured outputs to health pulse payload:
  - `labChanges` (what changed since last report)
  - `labNextActions` (what to do now)
  - `labConfidenceSource` (source + confidence + report date)
- Implemented in backend and rendered in both dashboard and labs highlights cards.

#### 2) Marker status/color accuracy improvements
- Upgraded marker status inference to support numeric range-based detection when explicit status is missing.
- Added reference range parsing support for common formats:
  - between ranges (e.g., `13.2-16.6`)
  - threshold ranges (`<`, `<=`, `>`, `>=`, and text equivalents)
- Preserved semantic keyword handling (e.g., biological age “older/younger”).

#### 3) Re-analyze reliability + UX fix
- Converted lab re-analysis from synchronous request blocking to background job behavior.
- Endpoint now responds immediately (`202 Accepted`) and analysis continues server-side.
- Added duplicate in-flight protection for re-analysis requests.
- Updated Labs page UX:
  - clear background-processing messaging
  - polling while processing (`refetchInterval`) so results appear automatically
  - delayed invalidations to refresh new analysis without manual retry

#### 4) Wearables connection + redirect hardening (included in branch state)
- Retained recent fixes on this branch for:
  - provider connected status normalization
  - cache-busting/no-cache on connect links
  - fresh Junction user handling in conflict cases
  - redirect support back to dashboard after provider connect

## Files changed in this push
- `server/modules/wearables/wearables.service.ts`
- `server/modules/files/files.service.ts`
- `server/api/controller/files.controller.ts`
- `server/api/controller/wearables.controller.ts`
- `server/junction.ts`
- `client/src/features/dashboard/components/HealthPulseCard.tsx`
- `client/src/pages/LabReportsPage.tsx`
- `client/src/pages/WearablesPage.tsx`

## Validation
- `npm run check` passed after changes.
- Local app verified reachable at `http://localhost:5000`.
