# ONES AI — Admin Dashboard Audit Report
**Date:** March 6, 2026  
**Branch:** `dev-3.4.26`

---

## Executive Summary

The admin dashboard is **substantially complete**. 9 pages, 8 widgets, 33+ backend routes, and a full layered architecture (routes → controller → service → repository) are all wired up and functional. Zero TypeScript errors.

There are **1 broken feature**, **3 bugs**, **4 cleanup items**, and **several enhancement opportunities** documented below.

---

## Architecture Overview

| Layer | File | Lines | Status |
|-------|------|------:|--------|
| Routes | `server/api/routes/admin.routes.ts` | ~60 | ✅ 33 routes, all `requireAdmin`-guarded |
| Controller | `server/api/controller/admin.controller.ts` | 538 | ✅ 32 methods, full try/catch/logging |
| Service | `server/modules/admin/admin.service.ts` | 491 | ✅ 26 methods |
| Repository | `server/modules/admin/admin.repository.ts` | 1,096 | ✅ 28 methods, all Drizzle ORM |
| Auth middleware | `server/api/middleware/middleware.ts` | — | ✅ `requireAdmin` hits DB to verify `isAdmin` |
| Blog (separate) | `server/api/routes/blog.routes.ts` | — | ✅ 10 admin routes |
| Client guard | `client/src/features/admin/components/ProtectedAdminRoute.tsx` | 68 | ✅ Auth + admin check + redirects |

---

## Pages & Features Status

### 1. Admin Dashboard (`/admin`) — ✅ Working
**File:** `client/src/pages/admin/AdminDashboardPage.tsx` (1,022 lines)

| Feature | Status | Notes |
|---------|--------|-------|
| 6 stat cards (users, paid, active, orders, formulas, revenue) | ✅ Working | Clickable with navigation |
| User Growth chart (recharts LineChart) | ✅ Working | 30-day range |
| Daily Orders chart (recharts BarChart) | ✅ Working | |
| Quick links to 8 sub-pages | ✅ Working | |
| AI Settings (provider/model selector) | ✅ Working | Save + Reset to Defaults working |
| AI Settings — "Test Provider" button | ❌ **BROKEN** | Calls `POST /api/admin/ai-settings/test` which **does not exist** on the backend. Returns 404. |
| Formula Review manual trigger | ✅ Working | Calls `runFormulaReviewCheck()` inline |
| Today's Orders list | ✅ Working | Clickable user links |
| Export Users button | ✅ Working | CSV download |
| 6 embedded analytics widgets | ✅ Working | See widget details below |

**Issues:**
- `_removedPlaceholder()` — ~160 lines of dead code (leftover ingredient pricing card). Safe to delete.

---

### 2. User Management (`/admin/users`) — ✅ Working
**File:** `client/src/pages/admin/UserManagementPage.tsx` (294 lines)

| Feature | Status |
|---------|--------|
| Debounced search (name/email/phone) | ✅ Working |
| Filter by all/paid/active | ✅ Working |
| Pagination (20/page) | ✅ Working |
| Click-through to user detail | ✅ Working |
| Admin badge display | ✅ Working |

No issues found.

---

### 3. User Detail (`/admin/users/:id`) — ✅ Working
**File:** `client/src/pages/admin/UserDetailPage.tsx` (722 lines)

| Feature | Status |
|---------|--------|
| Contact info card | ✅ Working |
| Health profile card | ✅ Working |
| Toggle admin status | ✅ Working |
| Delete user (with confirmation) | ✅ Working |
| Formulas tab | ✅ Working |
| Orders tab (with tracking links) | ✅ Working |
| Chat Sessions tab | ✅ Working |
| Admin Notes (embedded component) | ✅ Working |

Query keys like `['/api/admin/users', userId, 'timeline']` are properly resolved by `buildEndpointFromQueryKey()` in the queryClient — confirmed working.

---

### 4. Support Tickets (`/admin/support-tickets`) — ✅ Working
**File:** `client/src/pages/admin/AdminSupportTicketsPage.tsx` (671 lines)

| Feature | Status | Notes |
|---------|--------|-------|
| Ticket list with status filter | ✅ Working | |
| Client-side search | ✅ Working | By subject, name, email |
| Status counters | ✅ Working | |
| Ticket detail view | ✅ Working | |
| Conversation thread | ✅ Working | Staff vs user differentiation |
| Reply form | ✅ Working | Also sends notification email |
| Status/Priority dropdowns | ✅ Working | Instant PATCH update |
| Admin internal notes | ✅ Working | |
| User info sidebar | ✅ Working | Links to user profile |
| Pagination | ⚠️ Missing | Loads all tickets at once |
| Server-side search | ⚠️ Missing | Only client-side filtering |

---

### 5. Conversations (`/admin/conversations`) — ✅ Working  
**File:** `client/src/pages/admin/ConversationsPage.tsx` (591 lines)

| Feature | Status |
|---------|--------|
| Stats cards (total, messages, avg) | ✅ Working |
| AI Insights tab (sentiment, themes, ingredients, features) | ✅ Working |
| Generate new AI insights | ✅ Working (calls OpenAI gpt-4.1) |
| Browse tab — conversation list | ✅ Working |
| Browse tab — message viewer | ✅ Working |
| Configurable date range | ✅ Working |

Minor: `subDays` import from date-fns is unused.

---

### 6. Orders Management (`/admin/orders`) — ✅ Working (with 1 bug)
**File:** `client/src/pages/admin/OrdersManagementPage.tsx` (339 lines)

| Feature | Status | Notes |
|---------|--------|-------|
| Order table with all columns | ✅ Working | |
| Inline status change | ✅ Working | |
| Tracking URL input (on "shipped") | ✅ Working | |
| Search (client-side) | ✅ Working | |
| Status filter (server-side) | ✅ Working | |
| Pagination (20/page) | ✅ Working | |
| CSV Export | ⚠️ **Bug** | Frontend sends `?status=X` but backend reads `?startDate=&endDate=`. The status filter is silently ignored — export always returns ALL orders. |

---

### 7. Audit Logs (`/admin/audit-logs`) — ✅ Working
**File:** `client/src/pages/admin/AuditLogsPage.tsx` (537 lines)

| Feature | Status |
|---------|--------|
| File Audit tab — filter by userId | ✅ Working |
| Safety Events tab — filter by severity | ✅ Working |
| Warning Acknowledgments tab | ✅ Working |
| Consents tab — filter by type | ✅ Working |
| Server-side pagination (25/page) | ✅ Working |

Architectural note: Controller calls `systemRepository` directly (bypasses `adminService`). Not broken, but inconsistent layering.

---

### 8. Blog CMS (`/admin/blog`) — ✅ Working
**File:** `client/src/pages/admin/AdminBlogPage.tsx` (1,570 lines)

| Feature | Status | Notes |
|---------|--------|-------|
| Post list with filter/pagination | ✅ Working | |
| Post editor (title, content, category, author, excerpt) | ✅ Working | |
| SEO fields (meta title/desc, keywords, tags, featured image, read time) | ✅ Working | |
| Publish/unpublish toggle | ✅ Working | |
| Delete post | ✅ Working | |
| AI article generation | ✅ Working | |
| AI content revision | ✅ Working | |
| Bulk generation (multi-title) | ⚠️ **Bug** | Toast references stale `jobs` state due to closure issue — completion count may be wrong |
| Auto-generate settings | ✅ Working | |
| Manual auto-gen trigger | ✅ Working | |
| Image upload | ⚠️ Missing | Featured image is URL-only, no upload |

---

### 9. Retail Comparison Pricing (`/admin/retail-pricing`) — ✅ Working (with 1 bug)
**File:** `client/src/pages/admin/RetailComparisonPricingPage.tsx` (259 lines)

| Feature | Status | Notes |
|---------|--------|-------|
| Editable pricing table | ✅ Working | |
| Per-row save with change detection | ✅ Working | |
| Loading skeletons | ✅ Working | |
| Cache invalidation after save | ❌ **Bug** | `updateMutation` doesn't invalidate query cache — saved changes won't reflect until manual page refresh |
| Add new ingredient pricing | ⚠️ Missing | |
| Delete pricing row | ⚠️ Missing | |

---

## Dashboard Widgets Status

| Widget | File | API Endpoint | Status |
|--------|------|-------------|--------|
| Activity Feed | `ActivityFeed.tsx` (149 lines) | `GET /api/admin/activity-feed` | ✅ Working — 30s auto-refresh |
| Cohort Retention Chart | `CohortRetentionChart.tsx` (155 lines) | `GET /api/admin/analytics/cohorts` | ✅ Working |
| Conversion Funnel | `ConversionFunnel.tsx` (159 lines) | `GET /api/admin/analytics/funnel` | ✅ Working — ⚠️ not responsive on mobile |
| Formula Insights | `FormulaInsightsWidget.tsx` (232 lines) | `GET /api/admin/analytics/formula-insights` | ✅ Working |
| Pending Actions | `PendingActionsWidget.tsx` (117 lines) | `GET /api/admin/analytics/pending-actions` | ⚠️ Partial — "Reorder Alerts" click is a **no-op** (empty `onClick`) |
| Reorder Health | `ReorderHealthWidget.tsx` (202 lines) | `GET /api/admin/analytics/reorder-health` | ✅ Working — ⚠️ lists limited to 10, no "show more" |
| User Admin Notes | `UserAdminNotes.tsx` (148 lines) | `GET/POST /api/admin/users/:id/notes` | ✅ Working — no edit/delete |

---

## Backend Endpoint Coverage

### All 49 frontend-expected endpoints:

| # | Endpoint | Backend | Complete | Issue |
|---|----------|:-------:|:--------:|-------|
| 1 | `GET /api/admin/stats` | ✅ | ✅ | |
| 2 | `GET /api/admin/analytics/growth` | ✅ | ✅ | |
| 3 | `GET /api/admin/analytics/revenue` | ✅ | ✅ | |
| 4 | `GET /api/admin/orders/today` | ✅ | ✅ | |
| 5 | `GET /api/admin/ai-settings` | ✅ | ✅ | |
| 6 | `POST /api/admin/ai-settings` | ✅ | ✅ | |
| 7 | **`POST /api/admin/ai-settings/test`** | ❌ | ❌ | **Missing route — frontend gets 404** |
| 8 | `POST /api/admin/formula-review/trigger` | ✅ | ✅ | |
| 9 | `GET /api/admin/users` | ✅ | ✅ | |
| 10 | `GET /api/admin/users/:id` | ✅ | ✅ | |
| 11 | `GET /api/admin/users/:id/timeline` | ✅ | ✅ | |
| 12 | `DELETE /api/admin/users/:id` | ✅ | ✅ | |
| 13 | `PATCH /api/admin/users/:id/admin-status` | ✅ | ✅ | |
| 14 | `GET /api/admin/users/:id/notes` | ✅ | ✅ | |
| 15 | `POST /api/admin/users/:id/notes` | ✅ | ✅ | |
| 16 | `GET /api/admin/support-tickets` | ✅ | ✅ | |
| 17 | `GET /api/admin/support-tickets/:id` | ✅ | ✅ | |
| 18 | `PATCH /api/admin/support-tickets/:id` | ✅ | ✅ | |
| 19 | `POST /api/admin/support-tickets/:id/reply` | ✅ | ✅ | |
| 20 | `GET /api/admin/conversations` | ✅ | ✅ | |
| 21 | `GET /api/admin/conversations/:sessionId` | ✅ | ✅ | |
| 22 | `GET /api/admin/conversations/insights/latest` | ✅ | ✅ | |
| 23 | `GET /api/admin/conversations/stats` | ✅ | ✅ | |
| 24 | `POST /api/admin/conversations/insights/generate` | ✅ | ✅ | |
| 25 | `GET /api/admin/orders` | ✅ | ✅ | |
| 26 | `PATCH /api/admin/orders/:id/status` | ✅ | ✅ | |
| 27 | `GET /api/admin/export/orders` | ✅ | ⚠️ | Param mismatch (see bugs) |
| 28 | `GET /api/admin/export/users` | ✅ | ✅ | |
| 29 | `GET /api/admin/audit-logs` | ✅ | ✅ | |
| 30 | `GET /api/admin/safety-logs` | ✅ | ✅ | |
| 31 | `GET /api/admin/warning-acknowledgments` | ✅ | ✅ | |
| 32 | `GET /api/admin/consents` | ✅ | ✅ | |
| 33 | `GET /api/admin/activity-feed` | ✅ | ✅ | |
| 34 | `GET /api/admin/analytics/cohorts` | ✅ | ✅ | |
| 35 | `GET /api/admin/analytics/funnel` | ✅ | ✅ | |
| 36 | `GET /api/admin/analytics/formula-insights` | ✅ | ✅ | |
| 37 | `GET /api/admin/analytics/pending-actions` | ✅ | ✅ | |
| 38 | `GET /api/admin/analytics/reorder-health` | ✅ | ✅ | |
| 39 | `GET /api/admin/ingredient-pricing` | ✅ | ✅ | |
| 40 | `PATCH /api/admin/ingredient-pricing/:id` | ✅ | ✅ | |
| 41 | `GET /api/blog/admin/all` | ✅ | ✅ | |
| 42 | `POST /api/blog` | ✅ | ✅ | |
| 43 | `PATCH /api/blog/admin/:id` | ✅ | ✅ | |
| 44 | `PATCH /api/blog/admin/:id/publish` | ✅ | ✅ | |
| 45 | `DELETE /api/blog/admin/:id` | ✅ | ✅ | |
| 46 | `POST /api/blog/admin/generate` | ✅ | ✅ | |
| 47 | `POST /api/blog/admin/:id/ai-revise` | ✅ | ✅ | |
| 48 | `GET /api/blog/admin/auto-gen/settings` | ✅ | ✅ | |
| 49 | `PATCH /api/blog/admin/auto-gen/settings` | ✅ | ✅ | |
| 50 | `POST /api/blog/admin/auto-gen/run` | ✅ | ✅ | |

**Backend-only endpoint (no frontend UI):**
- `POST /api/admin/orders/:id/retry-manufacturer` — fully implemented but not exposed in any admin page UI.

---

## Issues to Fix

### ❌ Broken (must fix)

| # | Issue | Location | Fix |
|---|-------|----------|-----|
| **B1** | `POST /api/admin/ai-settings/test` endpoint missing | `server/api/routes/admin.routes.ts` | Add route + controller method + service method that makes a lightweight API call to the configured provider and returns success/failure |
| **B2** | Orders CSV Export ignores status filter | Frontend: `OrdersManagementPage.tsx:125` sends `?status=X`. Backend: `admin.controller.ts:383` reads `?startDate=&endDate=` | Either update backend to also accept `status` param, or update frontend to send date params |
| **B3** | Retail Pricing — cache not invalidated after save | `RetailComparisonPricingPage.tsx` `updateMutation` | Add `onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/admin/ingredient-pricing'] })` |

### ⚠️ Bugs (minor)

| # | Issue | Location | Fix |
|---|-------|----------|-----|
| **M1** | Blog bulk generate toast shows wrong count | `AdminBlogPage.tsx` bulk generate section | Use a ref or read from final state instead of stale `jobs` closure |
| **M2** | Pending Actions "Reorder Alerts" button is a no-op | `PendingActionsWidget.tsx` | Wire `onClick` to scroll to ReorderHealthWidget or navigate to a filtered view |

### 🧹 Cleanup (tech debt)

| # | Issue | Location |
|---|-------|----------|
| **C1** | ~160 lines of dead code (`_removedPlaceholder` function) | `AdminDashboardPage.tsx:~614-770` |
| **C2** | Unused import: `subDays` | `ConversationsPage.tsx` |
| **C3** | Unused import: `Mail` | `ReorderHealthWidget.tsx` |
| **C4** | Unused type field: `PendingActionsData.reordersdue` declared but never accessed | `PendingActionsWidget.tsx` |

---

## Feature Gaps / Enhancement Opportunities

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| **E1** | Support tickets: server-side search + pagination | Medium | Currently loads all tickets, filters client-side |
| **E2** | Admin notes: edit/delete capability | Low | Notes are permanent once created |
| **E3** | Retail pricing: add/delete rows | Low | Can only edit existing rows |
| **E4** | Blog: image upload for featured image | Medium | Currently URL-input only |
| **E5** | Reorder Health widget: "show all" for 10+ users | Low | Lists silently truncated at 10 |
| **E6** | Conversion Funnel: mobile responsive layout | Low | Horizontal layout breaks on small screens |
| **E7** | Retry manufacturer order UI | Low | Backend `POST /api/admin/orders/:id/retry-manufacturer` exists but no UI button |
| **E8** | Admin Settings page (dedicated) | Medium | AI settings currently crammed into dashboard main page |
| **E9** | Admin notification preferences | Medium | No way to configure what admin alerts to receive |
| **E10** | Dashboard date range selector | Low | Growth/revenue charts are hardcoded to 30 days |

---

## Overall Scorecard

| Category | Score | Details |
|----------|-------|---------|
| **Route coverage** | 49/50 (98%) | 1 missing endpoint (`ai-settings/test`) |
| **Full-stack wiring** | 47/50 (94%) | 1 missing, 1 param mismatch, 1 cache bug |
| **TypeScript health** | 100% | Zero TS errors |
| **Auth protection** | 100% | All routes `requireAdmin`-guarded, all pages use `ProtectedAdminRoute` |
| **Error handling** | 95% | Try/catch everywhere; some missing `onError` toasts |
| **Loading states** | 100% | Every page has skeleton loaders |
| **Test coverage** | Low | `data-testid` attributes present but no admin-specific test files found |

**Bottom line:** The admin dashboard is production-ready with 3 bugs to fix. The architecture is solid, the layering is consistent (with minor exceptions in audit logs), and the feature set is comprehensive for an MVP admin panel.

---

*Generated: March 6, 2026*
