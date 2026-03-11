# dev-3.10.26 — Branch Changes for Review

**Branch:** `dev-3.10.26`  
**Base:** `dev` (commit `0512ff2`)  
**Date:** March 10, 2026  
**PR link:** https://github.com/pstadniuk-dotcom/MyOnes/pull/new/dev-3.10.26

---

## Commits

| Commit | Description |
|--------|-------------|
| `2a0f9b5` | security: XSS sanitization, live-chat hardening, PR agent admin page |
| `5255fa5` | feat: auto-advance problem cards with hover activation and progress indicators |

---

## 1. Security Hardening

### XSS Sanitization — `server/utils/sanitize.ts` (NEW)
- New utility module for input sanitization
- Strips HTML tags, script injections, and encoded attack vectors from user inputs

### Live Chat Hardening — `server/api/controller/live-chat.controller.ts`
- Guest name and email inputs now sanitized before processing
- Rejects pure-HTML names (e.g., `<img src=x onerror=alert(1)>`)
- Tested: XSS payloads blocked, clean names pass through

### Route Updates — `server/api/routes/live-chat.routes.ts`
- Tightened route definitions for live-chat endpoints

### Server Index — `server/index.ts`
- Imported and registered new agent routes

---

## 2. PR Agent Admin Page — `client/src/pages/admin/PRAgentPage.tsx` (NEW)
- Admin dashboard page for managing PR/outreach agent
- View agent prospects, pitch history, and campaign status
- Connected to agent controller endpoints

### Agent Controller — `server/api/controller/agent.controller.ts` (NEW)
- New API endpoints for PR agent management
- CRUD operations for prospects and pitch tracking

### Agent Routes — `server/api/routes/agent.routes.ts`
- New route definitions for agent endpoints (admin-protected)

### Admin Repository — `server/modules/admin/admin.repository.ts`
- Updated to support PR agent data queries

---

## 3. ProblemFlowSection UX Redesign — `client/src/features/marketing/components/ProblemFlowSection.tsx`

### Problem
- Users didn't realize each card had unique copy/text below
- Required clicking — not intuitive; no visual affordance

### Changes
- **Auto-advance:** Cards cycle every 4.5s with animated progress bar on active card
- **Hover to activate:** Mousing over a card instantly swaps the description text (pauses auto-advance)
- **Smooth crossfade:** 200ms fade-out/fade-in transition between card descriptions
- **Dot navigation:** Clickable pill-shaped dot indicators below the cards
- **Progress bar:** Thin animated bar fills along bottom of active card showing time until next advance
- **Hint text:** Small "Hover or tap each card to explore" note for discoverability
- **Mobile:** Tap still works; auto-advance provides passive discovery on mobile

### No changes to
- Card content, images, labels, or copy
- Section layout or responsive grid
- Color scheme or typography

---

## Files Changed

| File | Status | Lines |
|------|--------|-------|
| `client/src/features/marketing/components/ProblemFlowSection.tsx` | Modified | +117 / -8 |
| `client/src/pages/admin/PRAgentPage.tsx` | Modified | +199 |
| `server/api/controller/agent.controller.ts` | Modified | +59 |
| `server/api/controller/live-chat.controller.ts` | Modified | +11 / -6 |
| `server/api/routes/agent.routes.ts` | Modified | +8 |
| `server/api/routes/live-chat.routes.ts` | Modified | +4 / -4 |
| `server/index.ts` | Modified | +2 |
| `server/modules/admin/admin.repository.ts` | Modified | +19 / -6 |
| `server/utils/sanitize.ts` | **New** | +30 |
| `package-lock.json` | Modified | lockfile update |

---

## Testing Notes
- XSS sanitization: 7 test cases passed (HTML injection, script tags, encoded payloads, clean inputs)
- ProblemFlowSection: Visual QA needed — auto-advance timing, hover transitions, mobile tap behavior
- PR Agent: Functional testing needed for CRUD endpoints
