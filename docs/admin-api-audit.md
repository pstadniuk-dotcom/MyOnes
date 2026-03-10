# ONES AI — Admin API Comprehensive Audit

**Generated:** 2026-03-07  
**Scope:** All admin-protected API endpoints, storage/repository methods, schema tables, and middleware.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Authentication & Authorization Middleware](#2-authentication--authorization-middleware)
3. [Admin Core Routes (`/api/admin/*`)](#3-admin-core-routes-apiadmin)
4. [Blog Admin Routes (`/api/blog/admin/*`)](#4-blog-admin-routes-apiblogadmin)
5. [Membership Admin Routes (`/api/membership/admin/*`)](#5-membership-admin-routes-apimembershipadmin)
6. [System Admin Routes (`/api/*`)](#6-system-admin-routes-api)
7. [Schema — Admin-Related Tables & Fields](#7-schema--admin-related-tables--fields)
8. [Orphaned Storage Methods (No API Route)](#8-orphaned-storage-methods-no-api-route)
9. [Security Concerns & Gaps](#9-security-concerns--gaps)
10. [Summary Matrix](#10-summary-matrix)

---

## 1. Architecture Overview

Admin functionality is spread across **4 route files** mounted in `server/routes.ts`:

| Mount Point | Route File | Controller | Repository/Service |
|---|---|---|---|
| `/api/admin` | `server/api/routes/admin.routes.ts` | `admin.controller.ts` | `admin.service.ts` → `admin.repository.ts` + `system.repository.ts` |
| `/api/blog/admin/*` | `server/api/routes/blog.routes.ts` | `blog.controller.ts` | `blog.repository.ts` |
| `/api/membership/admin/*` | `server/api/routes/membership.routes.ts` | `membership.controller.ts` | `membership.service.ts` |
| `/api/debug/*`, `/api/settings/*` | `server/api/routes/system.routes.ts` | `system.controller.ts` | `system.service.ts` → `system.repository.ts` |

**Layer stack:** Route → Middleware (`requireAdmin`) → Controller → Service → Repository → Drizzle/DB

---

## 2. Authentication & Authorization Middleware

**File:** `server/api/middleware/middleware.ts`

### `requireAdmin(req, res, next)`

1. Extracts Bearer token from `Authorization` header
2. Verifies JWT via `verifyToken()` (checks signature + expiry)
3. Fetches user from DB via `usersRepository.getUser(decoded.userId)`
4. Checks `user.isAdmin === true`
5. Sets `req.userId` and calls `next()`

**Security notes:**
- ✅ Always verifies against DB (not just JWT claim) — prevents stale admin status in token
- ✅ Returns 401 for missing/invalid token, 403 for non-admin users
- ⚠️ JWT includes `isAdmin` claim (from `generateToken`) but `requireAdmin` ignores it and re-checks DB — the JWT claim is redundant/misleading
- ⚠️ No rate limiting specific to admin routes (auth rate limiter only covers `/api/auth`)
- ⚠️ No audit logging of admin access/actions at middleware level

---

## 3. Admin Core Routes (`/api/admin/*`)

All routes protected by `requireAdmin`. **35 endpoints total.**

---

### 3.1 Dashboard & Analytics

#### `GET /api/admin/stats`
- **Purpose:** Main dashboard statistics
- **Service:** `adminService.getStats()` → `adminRepository.getAdminStats()`
- **Validation:** None (no params)
- **Returns:** `{ totalUsers, totalPaidUsers, totalRevenue, activeUsers, totalOrders, totalFormulas }`
- **DB queries:** counts from `users`, `formulas`, `orders`; distinct paid users from `orders`; SUM of `amount_cents`
- **Notes:** ✅ Clean. Revenue calculated as `amount_cents / 100`.

#### `GET /api/admin/analytics/growth?days=30`
- **Purpose:** User growth over time
- **Service:** `adminService.getUserGrowth(days)` → `adminRepository.getUserGrowthData(days)`
- **Validation:** `days` parsed from query, defaults to 30
- **Returns:** `Array<{ date, users (cumulative), paidUsers (cumulative) }>`
- **Notes:** ⚠️ Cumulative counts are calculated in-memory, not from DB — could be inaccurate if data is sparse.

#### `GET /api/admin/analytics/revenue?days=30`
- **Purpose:** Revenue by day
- **Service:** `adminService.getRevenueData(days)` → `adminRepository.getRevenueData(days)`
- **Validation:** `days` parsed from query, defaults to 30
- **Returns:** `Array<{ date, revenue, orders }>`

#### `GET /api/admin/analytics/funnel`
- **Purpose:** Conversion funnel (signup → profile → formula → order → reorder)
- **Service:** `adminService.getFunnel()` → `adminRepository.getConversionFunnel()`
- **Validation:** None
- **Returns:** `{ totalSignups, profilesComplete, formulasCreated, firstOrders, reorders, conversionRates: { ... } }`
- **DB queries:** Multiple count/distinct queries across `users`, `healthProfiles`, `formulas`, `orders`
- **Notes:** ✅ Good business intelligence endpoint.

#### `GET /api/admin/analytics/cohorts?months=6`
- **Purpose:** Monthly cohort retention analysis
- **Service:** `adminService.getCohorts(months)` → `adminRepository.getCohortRetention(months)`
- **Validation:** `months` parsed, defaults to 6 
- **Returns:** Array of `{ cohort, month, totalUsers, ordered, reordered, retention }`
- **Notes:** ⚠️ N+1 query problem — runs separate queries for each month's cohort users. Could be slow with many months.

#### `GET /api/admin/analytics/reorder-health`
- **Purpose:** Identify users who need reorders (due soon, overdue, at risk)
- **Service:** `adminService.getReorderHealth()` → `adminRepository.getReorderHealth()`
- **Returns:** `{ dueSoon[], overdue[], atRisk[], summary: { dueSoonCount, overdueCount, atRiskCount, healthyCount } }`
- **Thresholds:** 75+ days = due soon, 90+ = overdue, 100+ = at risk
- **Notes:** ⚠️ N+1 queries — fetches user details one-by-one for each order row.

#### `GET /api/admin/analytics/formula-insights`
- **Purpose:** Analyze ingredient usage patterns across all formulas
- **Service:** `adminService.getFormulaInsights()` → `adminRepository.getFormulaInsights()`
- **Returns:** `{ totalFormulas, averageIngredients, averageTotalMg, popularBases[], popularAdditions[], customizationRate, unusedSystemSupports[], unusedIndividuals[], totalAvailableSystemSupports, totalAvailableIndividuals }`
- **Notes:** ✅ Good product intelligence. Loads ALL formulas into memory — could be slow at scale.

#### `GET /api/admin/analytics/pending-actions`
- **Purpose:** Summary of things needing admin attention
- **Service:** `adminService.getPendingActions()` → `adminRepository.getPendingActions()`
- **Returns:** `{ openTickets, pendingOrders, processingOrders, reordersdue, overdueReorders }`
- **Notes:** ✅ Good dashboard widget. Calls `getReorderHealth()` internally which has N+1 issues.

#### `GET /api/admin/activity-feed?limit=20`
- **Purpose:** Recent activity stream (signups, orders, formulas, tickets)
- **Service:** `adminService.getActivityFeed(limit)` → `adminRepository.getActivityFeed(limit)`
- **Returns:** Sorted array of `{ type, id, userId, userName, description, timestamp, metadata? }`
- **Notes:** ⚠️ Fetches `limit` rows from 4 tables, then does N+1 user lookups for each. Sorted in-memory. Could be expensive.

---

### 3.2 User Management

#### `GET /api/admin/users?q=&limit=20&offset=0&filter=all`
- **Purpose:** Search/list users with pagination and filters
- **Service:** `adminService.searchUsers(...)` → `adminRepository.searchUsers(...)`
- **Validation:** Query params parsed with defaults. Filter: `all`, `paid`, `active`
- **Returns:** `{ users[] (password stripped), total }`
- **DB:** Uses `ilike` on email/name/phone; for `paid`/`active` filters, does subquery to get user IDs first
- **Notes:** ✅ Password stripped in service layer. ⚠️ `paid` and `active` filters load all matching user IDs into memory before filtering.

#### `GET /api/admin/users/:id`
- **Purpose:** Get single user detail
- **Service:** `adminService.getUserById(id)` → `adminRepository.getUserById(id)`
- **Validation:** None beyond route param
- **Returns:** User object (password stripped) or 404
- **Notes:** ✅ Clean.

#### `GET /api/admin/users/:id/timeline`
- **Purpose:** Complete user timeline (profile, formulas, orders, chats, uploads)
- **Service:** `adminService.getUserTimeline(id)` → `adminRepository.getUserTimeline(id)`
- **Returns:** `{ user (pw stripped), healthProfile?, formulas[], orders[] (with formula), chatSessions[], fileUploads[] }`
- **Notes:** ✅ Comprehensive view. Returns full formula/order/chat data.

#### `DELETE /api/admin/users/:id`
- **Purpose:** Delete a user
- **Service:** `adminService.deleteUser(id, adminId)` → `adminRepository.deleteUser(id)`
- **Validation:** 
  - Cannot delete yourself (adminId === userId)
  - Cannot delete other admins
- **Returns:** `{ success: true, message }` or error
- **Notes:** ⚠️ CASCADE deletes are defined in schema (foreign keys), so this wipes user data across all tables. ⚠️ No audit log entry for deletion. ⚠️ No confirmation/soft-delete — permanently destroys data.

#### `PATCH /api/admin/users/:id/admin-status`
- **Purpose:** Promote/demote user admin status
- **Service:** `adminService.updateUserAdminStatus(id, adminId, isAdmin)` → `adminRepository.updateUser(id, { isAdmin })`
- **Validation:**
  - `isAdmin` must be boolean (controller-level check)
  - Cannot remove your own admin status
- **Returns:** Updated user (pw stripped) or error
- **Notes:** ⚠️ No audit log. ⚠️ Any admin can promote any user — no super-admin concept.

#### `GET /api/admin/users/:id/notes`
- **Purpose:** List admin notes on a user
- **Service:** `adminService.getUserNotes(id)` → `adminRepository.getUserAdminNotes(id)`
- **Returns:** Array of notes with `adminName` joined
- **Notes:** ✅ Clean.

#### `POST /api/admin/users/:id/notes`
- **Purpose:** Add an admin note to a user
- **Service:** `adminService.addUserNote(userId, adminId, content)` → `adminRepository.addUserAdminNote(...)`
- **Validation:** ⚠️ No validation on `content` (could be empty string)
- **Returns:** Created note with `adminName`

---

### 3.3 Support System

#### `GET /api/admin/support-tickets?status=all&limit=50&offset=0`
- **Purpose:** List all support tickets with filtering
- **Service:** `adminService.listSupportTickets(...)` → `adminRepository.listAllSupportTickets(...)`
- **Returns:** `{ tickets[] (with userName, userEmail), total }`
- **Notes:** ✅ Uses JOIN for user names (no N+1).

#### `GET /api/admin/support-tickets/:id`
- **Purpose:** Get ticket details with responses and user info
- **Service:** `adminService.getSupportTicketDetails(id)` 
- **Returns:** `{ ticket, responses[], user: { id, name, email } }` or 404
- **Notes:** ✅ Clean composition in service layer.

#### `PATCH /api/admin/support-tickets/:id`
- **Purpose:** Update ticket status/priority/notes
- **Service:** `adminService.updateSupportTicket(id, updates)` → `adminRepository.updateSupportTicket(id, updates)`
- **Validation:** Only `status`, `priority`, `adminNotes` fields allowed (controller whitelist)
- **Returns:** Updated ticket or 404
- **Notes:** ✅ Good field whitelist pattern.

#### `POST /api/admin/support-tickets/:id/reply`
- **Purpose:** Admin replies to a support ticket
- **Service:** `adminService.replyToSupportTicket(ticketId, adminId, message)`
- **Validation:** `message` must be non-empty string
- **Returns:** Created response object
- **Side effects:** Sends email notification to user via `sendNotificationEmail`
- **Notes:** ✅ Email errors caught and logged (don't break the reply). ✅ Sets `isStaff: true` on response.

---

### 3.4 Conversation Intelligence

#### `GET /api/admin/conversations/stats?days=30`
- **Purpose:** Message/conversation count stats for a time window
- **Service:** `adminService.getConversationStats(days)` → `adminRepository.getAllUserMessages(1, ...)` + `getAllConversations(1, 0, ...)`
- **Returns:** `{ dateRange, totalConversations, totalUserMessages, averageMessagesPerConversation }`
- **Notes:** ✅ Efficient — only fetches counts (limit=1 for messages).

#### `GET /api/admin/conversations/insights/latest`
- **Purpose:** Get most recently generated AI conversation insights
- **Service:** `adminService.getLatestInsights()` → `adminRepository.getLatestConversationInsights()`
- **Returns:** `{ hasInsights: true/false, insights? }`
- **Storage:** Reads from `app_settings` table, key `conversation_insights_latest`

#### `POST /api/admin/conversations/insights/generate`
- **Purpose:** Trigger AI analysis of user conversations
- **Service:** `adminService.generateInsights(days)` — uses OpenAI GPT-4.1
- **Validation:** `days` from body, defaults to 30
- **Returns:** Generated insights object
- **Side effects:** Fetches up to 2000 user messages, sends to OpenAI for analysis, saves results to `app_settings`
- **Notes:** ⚠️ Hardcoded to GPT-4.1 (doesn't use admin AI settings). ⚠️ Sends up to 50,000 chars of user messages to OpenAI — **HIPAA concern** if messages contain PHI. ⚠️ No cost control on analysis calls.

#### `GET /api/admin/conversations?limit=50&offset=0&startDate=&endDate=`
- **Purpose:** List all chat sessions with user info and message preview
- **Service:** `adminService.listConversations(...)` → `adminRepository.getAllConversations(...)`
- **Returns:** `{ conversations[] (summary), total, limit, offset }`
- **Notes:** ⚠️ N+1 — for each session, queries all its messages to count and preview.

#### `GET /api/admin/conversations/:sessionId`
- **Purpose:** Full conversation transcript
- **Service:** `adminService.getConversationDetails(sessionId)` → `adminRepository.getConversationDetails(sessionId)`
- **Returns:** `{ session, user: { id, name, email }, messages[] }` or 404
- **Notes:** ✅ Single JOIN + message query. Returns full message content.

---

### 3.5 Order Management

#### `GET /api/admin/orders/today`
- **Purpose:** List orders placed today
- **Service:** `adminService.getTodaysOrders()` → `adminRepository.getTodaysOrders()`
- **Returns:** Array of orders with user info and formula
- **Notes:** ⚠️ N+1 queries — fetches user and formula for each order individually.

#### `GET /api/admin/orders?status=&limit=50&offset=0&startDate=&endDate=`
- **Purpose:** List all orders with filtering and pagination
- **Service:** `adminService.listOrders(options)` → `adminRepository.getAllOrders(options)`
- **Returns:** `{ orders[] (enriched with user + formula), total }`
- **Notes:** ⚠️ Same N+1 pattern as today's orders.

#### `PATCH /api/admin/orders/:id/status`
- **Purpose:** Update order status (e.g., mark as shipped)
- **Service:** `adminService.updateOrderStatus(id, status, trackingUrl)` → `adminRepository.updateOrderStatus(...)`
- **Validation:** ⚠️ No validation on `status` value — accepts any string, cast to `any`
- **Returns:** Updated order or 404
- **Side effects:** Automatically sets `shippedAt` timestamp when status is `'shipped'`
- **Notes:** ⚠️ No Zod/enum validation on status. Could corrupt data.

#### `POST /api/admin/orders/:id/retry-manufacturer`
- **Purpose:** Retry a failed manufacturer order
- **Service:** `adminService.retryManufacturerOrder(id)` — complex workflow:
  1. Checks if manufacturer order already submitted
  2. Re-quotes if quote expired/missing (via `manufacturerPricingService`)
  3. Places manufacturer order  
  4. Updates order record with result
- **Validation:** Business logic validates formula exists, quote validity
- **Returns:** `{ success, manufacturerOrderId }` or `{ error }`
- **Notes:** ✅ Good error handling and status tracking. Uses `usersRepository` + `formulasRepository` + `manufacturerPricingService`.

---

### 3.6 Export

#### `GET /api/admin/export/users?filter=all`
- **Purpose:** Export users as CSV download
- **Service:** `adminService.exportUsers(filter)` → `adminRepository.exportUsers(filter)`
- **Returns:** CSV file (`Content-Type: text/csv`)
- **Headers:** ID, Name, Email, Phone, Created At, Has Formula, Has Orders, Total Spent
- **Notes:** ⚠️ N+1 per user (checks formula existence + sums orders). ⚠️ Exports PII (email, phone) — ensure admin access is tightly controlled. ⚠️ No limit on number of users exported — could be slow/memory-heavy.

#### `GET /api/admin/export/orders?startDate=&endDate=&status=`
- **Purpose:** Export orders as CSV download
- **Service:** `adminService.exportOrders(startDate, endDate, status)` → `adminRepository.exportOrders(...)`
- **Returns:** CSV file
- **Headers:** Order ID, User Name, User Email, Status, Amount, Supply (Days), Placed At, Shipped At
- **Notes:** ⚠️ Same N+1 pattern. ⚠️ Exports PII.

---

### 3.7 AI Settings

#### `GET /api/admin/ai-settings`
- **Purpose:** Get current AI provider/model configuration
- **Service:** `adminService.getAiSettings()` — reads from `aiRuntimeSettings` in-memory + env fallback
- **Returns:** `{ provider, model, source ('override'|'env'), updatedAt }`

#### `POST /api/admin/ai-settings`
- **Purpose:** Update AI provider/model
- **Service:** `adminService.updateAiSettings(userId, provider, model, reset)` — modifies `aiRuntimeSettings` in-memory + persists to `app_settings` via `systemRepository.upsertAppSetting`
- **Validation:**
  - Provider must be `openai` or `anthropic`
  - Model validated against `ALLOWED_MODELS[provider]` with normalization
  - `reset: true` reverts to env defaults and deletes DB setting
- **Returns:** `{ success, settings }` or `{ error, suggestion }`
- **Notes:** ✅ Good validation + persistence pattern.

#### `POST /api/admin/ai-settings/test`
- **Purpose:** Test AI connection with a simple "OK" prompt
- **Service:** `adminService.testAiConnection()`
- **Returns:** `{ ok, provider, model, sample?, error? }`
- **Notes:** ✅ Non-destructive test. Handles both OpenAI and Anthropic.

---

### 3.8 Ingredient Pricing

#### `GET /api/admin/ingredient-pricing`
- **Purpose:** List all ingredient pricing records
- **Service:** `adminService.listIngredientPricing()` → `adminRepository.listIngredientPricing()`
- **Returns:** Array of `IngredientPricing` records
- **Notes:** ✅ Clean.

#### `PATCH /api/admin/ingredient-pricing/:id`
- **Purpose:** Update pricing for a specific ingredient
- **Service:** `adminService.updateIngredientPricing(id, updates)` → `adminRepository.updateIngredientPricing(id, updates)`
- **Validation (controller-level):**
  - `ingredientName` must be non-empty string
  - `typicalCapsuleMg` must be positive finite number
  - `typicalBottleCapsules` must be positive finite number
  - `typicalRetailPriceCents` must be positive finite number
  - `isActive` must be boolean
  - Numbers are `Math.round()`ed
- **Returns:** Updated record or 404
- **Notes:** ✅ Thorough validation in controller.

---

### 3.9 Audit & Compliance

#### `GET /api/admin/audit-logs?page=1&limit=50&userId=&action=`
- **Purpose:** List audit logs (file operations, etc.)
- **Service:** Calls `systemRepository.listAuditLogs(...)` directly (bypasses adminService)
- **Returns:** `{ data[], total, page, limit }`
- **Notes:** ✅ Paginated. ⚠️ Bypasses service layer — goes repo direct from controller.

#### `GET /api/admin/safety-logs?page=1&limit=50&userId=&severity=`
- **Purpose:** List safety audit logs (formula safety checks)
- **Service:** Calls `systemRepository.listSafetyAuditLogs(...)` directly
- **Returns:** `{ data[], total, page, limit }`

#### `GET /api/admin/warning-acknowledgments?page=1&limit=50&userId=`
- **Purpose:** List formula warning acknowledgments from users
- **Service:** Calls `systemRepository.listWarningAcknowledgments(...)` directly
- **Returns:** `{ data[], total, page, limit }`

#### `GET /api/admin/consents?page=1&limit=50&userId=&consentType=`
- **Purpose:** List user consent records
- **Service:** Calls `systemRepository.listUserConsents(...)` directly
- **Returns:** `{ data[], total, page, limit }`

---

### 3.10 Formula Review

#### `POST /api/admin/formula-review/trigger`
- **Purpose:** Manually trigger formula review check (inline handler, not via controller)
- **Service:** Calls `runFormulaReviewCheck()` from `autoOptimizeScheduler.ts`
- **Returns:** `{ success: true, results }` or `{ success: false, error }`
- **Notes:** ✅ Useful for testing scheduler. Handler is defined inline in routes file (not in controller).

---

## 4. Blog Admin Routes (`/api/blog/admin/*`)

All protected by `requireAdmin`. **13 endpoints total** (10 in `/admin/` namespace + 3 legacy).

### 4.1 Content Management

| Method | Path | Purpose | Validation | Notes |
|---|---|---|---|---|
| `GET` | `/api/blog/admin/all` | List all posts (published + drafts) with pagination | `page`, `limit` params | Returns full post objects |
| `GET` | `/api/blog/admin/:id` | Get single post by ID | ID param | Returns 404 if not found |
| `PATCH` | `/api/blog/admin/:id` | Update post fields | ⚠️ No field whitelist — accepts `req.body` directly | Could overwrite any column |
| `PATCH` | `/api/blog/admin/:id/publish` | Toggle published status | `isPublished` must be boolean | ✅ Good |
| `DELETE` | `/api/blog/admin/:id` | Delete post by ID | ID param | Returns 404 if not found |
| `POST` | `/api/blog/admin/:id/ai-revise` | AI-assisted content revision | `prompt` min 5 chars | Uses Anthropic (preferred) or OpenAI |
| `POST` | `/api/blog/admin/generate` | AI-generate entire article | `title` or `topic` required | Heavy AI usage (Claude 4.5 / GPT-4o), up to 12K tokens |

### 4.2 Auto-Generation Scheduler

| Method | Path | Purpose | Notes |
|---|---|---|---|
| `GET` | `/api/blog/admin/auto-gen/settings` | Get auto-gen scheduler settings | From `blogGenerationScheduler` |
| `PATCH` | `/api/blog/admin/auto-gen/settings` | Update auto-gen settings | ⚠️ No validation on body — passes `req.body` directly |
| `POST` | `/api/blog/admin/auto-gen/run` | Manually trigger blog generation run | Returns 202 immediately, runs async |

### 4.3 Legacy Routes

| Method | Path | Purpose | Notes |
|---|---|---|---|
| `POST` | `/api/blog` | Create post | `requireAdmin` protected |
| `PUT` | `/api/blog/:slug` | Update post by slug | `requireAdmin` protected |
| `POST` | `/api/blog/bulk/insert` | Bulk create posts | `requireAdmin` protected |

---

## 5. Membership Admin Routes (`/api/membership/admin/*`)

All protected by `requireAdmin`. **4 endpoints.**

| Method | Path | Purpose | Validation | Notes |
|---|---|---|---|---|
| `GET` | `/api/membership/admin/stats` | Get membership statistics | None | Dashboard stats |
| `POST` | `/api/membership/admin/tiers` | Create or update a membership tier | ⚠️ Body passed directly to service | No schema validation |
| `POST` | `/api/membership/admin/seed` | Seed default membership tiers | None | Idempotent setup |
| `GET` | `/api/membership/admin/users/:tierKey` | Get users by membership tier | `tierKey` route param | |

---

## 6. System Admin Routes (`/api/*`)

Protected by `requireAdmin`. **3 endpoints.**

| Method | Path | Purpose | Validation | Notes |
|---|---|---|---|---|
| `GET` | `/api/debug/info` | System debug info (env, DB status, etc.) | None | ⚠️ Could expose sensitive env vars |
| `GET` | `/api/debug/user/:userId` | Debug info for specific user | `userId` param | Shows user + related data |
| `GET` | `/api/settings/:key` | Read an app setting by key | `key` param | ⚠️ Can read ANY setting — no key whitelist |

**Note:** `GET /api/audit-logs` is `requireAuth` (not `requireAdmin`) — any authenticated user can view their own audit logs via `systemService.getAuditLogsForUser(req.userId)`. This is correctly scoped to the requesting user.

---

## 7. Schema — Admin-Related Tables & Fields

### Tables

| Table | Purpose | Admin relevance |
|---|---|---|
| `users.isAdmin` | Boolean flag for admin privileges | Core auth check |
| `userAdminNotes` | Internal notes about users | Created by admins (`adminId` FK) |
| `appSettings` | Key-value config store | Stores AI settings, conversation insights |
| `ingredientPricing` | Ingredient cost data | Admin-managed pricing |
| `supportTickets` | User support tickets | `adminNotes` field for internal notes |
| `supportTicketResponses` | Ticket replies | `isStaff` flag for admin responses |
| `reorderRecommendations` | AI formula adjustments | `adminReviewRequired`, `adminReviewedBy`, `adminReviewedAt` fields |
| `auditLogs` | File operation audit trail | Admin-viewable compliance logs |
| `safetyAuditLogs` | Formula safety check logs | Admin-viewable |
| `formulaWarningAcknowledgments` | User warning acceptances | Admin-viewable |
| `userConsents` | User consent records | Admin-viewable |

### Notable Schema Fields

- `users.isAdmin` — `boolean("is_admin").default(false).notNull()`
- `userAdminNotes.adminId` — FK to `users.id`, `onDelete: "set null"`
- `reorderRecommendations.adminReviewRequired` — `boolean.default(false).notNull()`
- `reorderRecommendations.adminReviewedBy` — FK to `users.id`
- `reorderRecommendations.adminReviewedAt` — timestamp
- `supportTickets.adminNotes` — `text("admin_notes")`

---

## 8. Orphaned Storage Methods (No API Route)

### Admin Repository (`admin.repository.ts`)

| Method | API Route Exists? | Notes |
|---|---|---|
| `getAdminStats()` | ✅ | |
| `getUserGrowthData(days)` | ✅ | |
| `getRevenueData(days)` | ✅ | |
| `searchUsers(query, limit, offset, filter)` | ✅ | |
| `getTodaysOrders()` | ✅ | |
| `getUserTimeline(userId)` | ✅ | |
| `listAllSupportTickets(status, limit, offset)` | ✅ | |
| `getSupportTicket(id)` | ✅ (via service composition) | |
| `listSupportTicketResponses(ticketId)` | ✅ (via service composition) | |
| `createSupportTicketResponse(response)` | ✅ | |
| `updateSupportTicket(id, updates)` | ✅ | |
| `getAllUserMessages(limit, startDate, endDate)` | ✅ (indirect, via stats/insights) | |
| `getAllConversations(limit, offset, startDate, endDate)` | ✅ | |
| `getLatestConversationInsights()` | ✅ | |
| `saveConversationInsights(insights)` | ✅ (called by generateInsights) | |
| `getConversationDetails(sessionId)` | ✅ | |
| `getConversionFunnel()` | ✅ | |
| `getCohortRetention(months)` | ✅ | |
| `getReorderHealth()` | ✅ | |
| `getFormulaInsights()` | ✅ | |
| `getPendingActions()` | ✅ | |
| `getActivityFeed(limit)` | ✅ | |
| `getAllOrders(options)` | ✅ | |
| `updateOrderStatus(id, status, trackingUrl)` | ✅ | |
| `listIngredientPricing()` | ✅ | |
| `updateIngredientPricing(id, updates)` | ✅ | |
| `getUserAdminNotes(userId)` | ✅ | |
| `addUserAdminNote(userId, adminId, content)` | ✅ | |
| `exportUsers(filter)` | ✅ | |
| `exportOrders(startDate, endDate, status)` | ✅ | |
| `getUserById(id)` | ✅ | |
| `updateUser(id, updates)` | ✅ (via updateAdminStatus) | |
| `deleteUser(id)` | ✅ | |

**Result: No orphaned admin repository methods.** All methods in `admin.repository.ts` are reachable from API routes.

### System Repository — Admin-Facing Methods

| Method | Admin API Route? | Notes |
|---|---|---|
| `listAuditLogs(options)` | ✅ `/api/admin/audit-logs` | |
| `listSafetyAuditLogs(options)` | ✅ `/api/admin/safety-logs` | |
| `listWarningAcknowledgments(options)` | ✅ `/api/admin/warning-acknowledgments` | |
| `listUserConsents(options)` | ✅ `/api/admin/consents` | |
| `upsertAppSetting(key, value, updatedBy)` | ✅ (via AI settings) | |
| `deleteAppSetting(key)` | ✅ (via AI settings reset) | |
| `getAppSetting(key)` | ✅ `/api/settings/:key` | |

**Result: No orphaned system repository admin methods.**

### Schema Tables Without Admin API Coverage

| Table/Field | Has Admin Endpoint? | Gap? |
|---|---|---|
| `reorderRecommendations.adminReviewRequired` | ❌ **No admin review/approve endpoint** | **YES — GAP** |
| `reorderRecommendations.adminReviewedBy` | ❌ | **YES — GAP** |
| `reorderRecommendations.adminReviewedAt` | ❌ | **YES — GAP** |
| `supportTickets.assignedTo` | ❌ **No ticket assignment endpoint** | **YES — GAP** |
| `faqItems` table | ❌ **No FAQ CRUD endpoints** | **YES — GAP** |
| `helpArticles` table | ❌ **No help article CRUD endpoints** | **YES — GAP** |

---

## 9. Security Concerns & Gaps

### Critical

1. **HIPAA Risk — Conversation Insights:** `POST /api/admin/conversations/insights/generate` sends up to 50,000 chars of raw user messages to OpenAI (GPT-4.1). If messages contain health information (very likely for a supplement platform), this is a HIPAA compliance concern. Need BAA with OpenAI and data minimization.

2. **No Admin Action Audit Trail:** Admin operations (user deletion, status changes, order updates, settings changes) are NOT logged to `audit_logs`. If a rogue admin deletes users or changes settings, there's no record.

3. **Hard Delete Without Soft Delete:** `DELETE /api/admin/users/:id` permanently destroys user data (CASCADE). No soft-delete, no data recovery, no 30-day retention window.

### High

4. **No Rate Limiting on Admin Routes:** Unlike `/api/auth` and `/api/chat`, admin routes have no rate limiters. A compromised admin token could make unlimited requests.

5. **Debug Info Exposure:** `GET /api/debug/info` could expose environment variables, database connection details, or internal service state to any admin user.

6. **Unrestricted App Setting Read:** `GET /api/settings/:key` can read ANY key from `app_settings` (no whitelist). Could expose internal configuration.

7. **No Input Validation on Several Endpoints:**
   - `PATCH /api/admin/orders/:id/status` — no enum validation on `status`
   - `PATCH /api/blog/admin/:id` — no field whitelist (could overwrite any column)
   - `POST /api/membership/admin/tiers` — body passed directly to service
   - `PATCH /api/blog/admin/auto-gen/settings` — body passed directly

### Medium

8. **N+1 Query Performance:** Multiple endpoints (`getReorderHealth`, `getActivityFeed`, `getTodaysOrders`, `getAllOrders`, `exportUsers`, `exportOrders`, `getCohortRetention`) have N+1 query patterns that will degrade at scale.

9. **No Pagination on Exports:** User and order export endpoints load all records into memory with no pagination. At scale, this could cause OOM errors.

10. **Insight Generation Hardcodes Model:** `generateInsights()` uses `gpt-4.1` regardless of admin AI settings.

11. **Missing Content Validation on User Notes:** `POST /api/admin/users/:id/notes` doesn't validate that `content` is non-empty.

12. **Blog Admin Update Has No Field Whitelist:** `PATCH /api/blog/admin/:id` passes `req.body` directly to `blogRepository.updateById()`. Could update unintended fields like `id`, `createdAt`, etc.

---

## 10. Summary Matrix

### Endpoint Count by Category

| Category | Count |
|---|---|
| Admin Core (Dashboard/Analytics) | 9 |
| Admin Core (User Management) | 7 |
| Admin Core (Support) | 4 |
| Admin Core (Conversations) | 5 |
| Admin Core (Orders) | 4 |
| Admin Core (Export) | 2 |
| Admin Core (AI Settings) | 3 |
| Admin Core (Ingredient Pricing) | 2 |
| Admin Core (Audit/Compliance) | 4 |
| Admin Core (Formula Review) | 1 |
| Blog Admin | 13 |
| Membership Admin | 4 |
| System Admin | 3 |
| **Total Admin Endpoints** | **61** |

### Missing Admin Features (Schema exists, no API)

| Feature | Table/Field | Recommendation |
|---|---|---|
| Admin review of reorder recommendations | `reorderRecommendations.adminReview*` | Add `GET /api/admin/reorder-reviews` + `PATCH /api/admin/reorder-reviews/:id` |
| Support ticket assignment | `supportTickets.assignedTo` | Add `PATCH /api/admin/support-tickets/:id/assign` |
| FAQ management | `faqItems` table | Add CRUD endpoints under `/api/admin/faq` |
| Help articles management | `helpArticles` table | Add CRUD endpoints under `/api/admin/help-articles` |
| Admin action audit logging | N/A | Add middleware-level audit logging for all admin mutations |
| User soft-delete | N/A | Add `deletedAt` field instead of hard cascade DELETE |
