# ONES AI Admin Dashboard — Full Audit Report
### March 7, 2026

---

## Executive Summary

The admin dashboard currently covers **10 pages**, **32 API endpoints**, **8 analytics widgets**, and manages **~15 of 53 database tables**. It's a solid MVP-level admin but has significant gaps that need to be closed to reach Shopify-caliber. The good news: much of the backend infrastructure already exists — repository methods and schema fields are waiting to be wired up.

**Overall Grade: B-** — Strong bones, missing muscle.

---

## I. Current Admin Feature Inventory

### 10 Admin Pages

| # | Page | Route | Status |
|---|------|-------|--------|
| 1 | **Dashboard** (KPIs, charts, AI settings) | `/admin` | ✅ Working |
| 2 | **User Management** (search, filter, paginate) | `/admin/users` | ✅ Working |
| 3 | **User Detail** (profile, formulas, orders, notes) | `/admin/users/:id` | ✅ Working |
| 4 | **Support Tickets** (list + detail + reply) | `/admin/support-tickets` | ✅ Working |
| 5 | **Conversations** (AI insights + browse chats) | `/admin/conversations` | ✅ Working |
| 6 | **Orders Management** (filter, status, tracking) | `/admin/orders` | ✅ Working |
| 7 | **Audit Logs** (HIPAA, safety, consents, warnings) | `/admin/audit-logs` | ✅ Working |
| 8 | **Blog CMS** (CRUD, AI gen, bulk gen, auto-gen) | `/admin/blog` | ✅ Working |
| 9 | **Retail Pricing** (ingredient cost comparison) | `/admin/retail-pricing` | ✅ Working |
| 10 | **Auth Guard** (ProtectedAdminRoute) | — | ✅ Working |

### 8 Dashboard Analytics Widgets

| Widget | Data Source | Auto-refresh |
|--------|-----------|:------------:|
| Conversion Funnel (5-stage) | `/api/admin/analytics/funnel` | No |
| Cohort Retention Chart | `/api/admin/analytics/cohorts` | No |
| Reorder Health Monitor | `/api/admin/analytics/reorder-health` | No |
| Pending Actions Counter | `/api/admin/analytics/pending-actions` | 60s |
| Activity Feed (live) | `/api/admin/activity-feed` | 30s |
| Formula Insights | `/api/admin/analytics/formula-insights` | No |
| User Growth (30-day line chart) | `/api/admin/analytics/growth` | No |
| Daily Orders (30-day bar chart) | `/api/admin/analytics/revenue` | No |

### 61 Backend Admin Endpoints

- **35** in `/api/admin/*` (core admin)
- **13** in `/api/blog/admin/*` (blog CMS)
- **4** in `/api/membership/admin/*` (membership — **no UI**)
- **3** in `/api/debug/*` and `/api/settings/*` (system)
- **6** export / analytics / scheduled

---

## II. Per-Feature Deep Dive & Issues

### A. Dashboard Home (`/admin`)

**What works:**
- 6 stat cards (Total Users, Paid Users, Active Users, Orders, Formulas, Revenue)
- 8 quick-link navigation cards
- User growth + daily orders charts (Recharts)
- Today's orders widget
- AI provider/model settings (OpenAI + Anthropic, extensive model list)
- Manual formula-review trigger
- CSV user export

**Issues Found:**
| # | Issue | Severity | Details |
|---|-------|----------|---------|
| E1 | Analytics "quick link" navigates to `/admin` (self) | Low | Should go to a dedicated analytics page or anchor |
| E2 | Dashboard charts hardcoded to 30 days | Medium | No date picker for custom ranges |
| E3 | AI settings card inline on dashboard | Low | Should be its own Settings page as feature set grows |
| E4 | No admin notification preferences | Medium | Admins can't configure which system alerts they receive |
| E5 | Export only for users CSV | Medium | No order export, formula export, or revenue reports from dashboard |

### B. User Management (`/admin/users`)

**What works:**
- Debounced search (300ms) across name, email, phone
- Filter by all/paid/active
- Paginated table (20/page)
- Click-through to user detail

**Issues Found:**
| # | Issue | Severity | Details |
|---|-------|----------|---------|
| E6 | No bulk actions | Medium | No multi-select delete, export subset, or status-change |
| E7 | No sort options | Low | Can't sort by signup date, last login, spending, etc. |
| E8 | No user role management UI | Medium | Can only toggle admin flag, no role/permission system |

### C. User Detail (`/admin/users/:id`)

**What works:**
- Contact info, health profile, conditions/medications/allergies
- Admin notes (add/view)
- Toggle admin status (with confirmation)
- Delete user (with confirmation, cascade warning)
- Tabs: Formulas, Orders, Chat Sessions

**Issues Found:**
| # | Issue | Severity | Details |
|---|-------|----------|---------|
| E9 | Hard DELETE on users | Critical | CASCADE wipe — no soft-delete or archive. Data irrecoverable |
| E10 | No admin action audit trail | Critical | User deletions, admin status changes are unlogged |
| E11 | No user suspension/ban | Medium | Only full delete or admin toggle — no disable/suspend |
| E12 | No formula edit by admin | Low | Admin can view formulas but can't adjust ingredients/doses |
| E13 | No impersonation/login-as-user | Low | Helpful for debugging user issues |

### D. Support Tickets (`/admin/support-tickets`)

**What works:**
- Filter by status with counts
- Client-side search
- Priority levels (low/medium/high/urgent with pulse animation)
- Staff reply with threaded conversation
- Status + priority update
- Internal admin notes
- Link to user profile

**Issues Found:**
| # | Issue | Severity | Details |
|---|-------|----------|---------|
| E14 | No ticket assignment | Medium | `assignedTo` field exists in schema but no UI dropdown |
| E15 | No SLA tracking | Low | No first-response-time or resolution-time metrics |
| E16 | No canned responses / templates | Low | Staff must type every reply from scratch |
| E17 | No email notifications to user on reply | Medium | User must check in-app to see staff responses |

### E. Conversations Intelligence (`/admin/conversations`)

**What works:**
- Total conversations, message counts, avg messages per conversation
- AI-generated insights with themes, sentiment, ingredient requests, feature requests
- Browse individual conversations with full message history
- Model used per message, formula-generated badges

**Issues Found:**
| # | Issue | Severity | Details |
|---|-------|----------|---------|
| E18 | HIPAA risk in `generateInsights` | Critical | Sends raw user health messages to OpenAI for analysis with no data minimization |
| E19 | Insights generation is synchronous blocking | Medium | Large datasets may time out |
| E20 | No conversation export | Low | Can't export conversation data for external analysis |

### F. Orders Management (`/admin/orders`)

**What works:**
- Filter by status (pending/processing/shipped/delivered/cancelled)
- Client-side search by name, email, order ID
- Inline status change with confirmation dialog
- Tracking URL entry when shipping
- CSV order export with filters
- Pagination (20/page)

**Issues Found:**
| # | Issue | Severity | Details |
|---|-------|----------|---------|
| E21 | Order status accepts any string (no enum check) | Medium | Backend validation gap — should enforce status enum |
| E22 | No order detail modal/page | Low | Must click through to user to see order context |
| E23 | No refund/cancellation workflow | Medium | No Stripe refund triggering from admin |
| E24 | No fulfillment integration status | Medium | `manufacturerOrderId` exists but isn't surfaced |
| E25 | No shipping label generation | Low | Must handle externally |

### G. Audit Logs (`/admin/audit-logs`)

**What works:**
- 4 sub-tabs: File Audit, Safety Events, Warning Acknowledgments, Consents
- Server-side pagination (25/page)
- Filters: user ID, severity, consent type
- IP address tracking

**Issues Found:**
| # | Issue | Severity | Details |
|---|-------|----------|---------|
| E26 | No admin action logging | Critical | Admin actions (user delete, status change, order update) aren't audited |
| E27 | No date range filter | Low | Can't filter logs by date range |
| E28 | No log export | Low | Can't export audit logs for compliance reporting |

### H. Blog CMS (`/admin/blog`)

**What works:**
- Full CRUD with publish/draft toggle
- Markdown content editor with live word count
- SEO fields (meta title, description, keywords, images)
- AI content generation (single + bulk)
- AI revision with preview/apply/discard
- Auto-generation scheduler (daily, configurable content tiers)
- Category and tone selection

**Issues Found:**
| # | Issue | Severity | Details |
|---|-------|----------|---------|
| E29 | Blog PATCH has no field whitelist | Medium | Admin could potentially modify fields not intended for editing |
| E30 | No media library | Low | Featured image is URL-only, no image upload workflow |
| E31 | No content preview before publish | Low | Must publish to see rendered output on frontend |
| E32 | No SEO analytics integration | Low | No visibility into search rankings or traffic per article |

### I. Retail Pricing (`/admin/retail-pricing`)

**What works:**
- Editable table of ingredient reference pricing
- Per-row: name, capsule mg, bottle capsules, retail price, active toggle
- Dirty-checking with save-per-row

**Issues Found:**
| # | Issue | Severity | Details |
|---|-------|----------|---------|
| E33 | No bulk update/import | Low | Must edit one row at a time |
| E34 | No pricing history | Low | Can't see previous price values |

---

## III. Database Coverage Scorecard

### Tables with Full Admin CRUD (7/53)
`users`, `orders`, `blogPosts`, `ingredientPricing`, `userAdminNotes`, `supportTickets`, `appSettings`

### Tables with Read-Only Admin Access (8/53)
`healthProfiles`, `chatSessions`, `messages`, `formulas`, `fileUploads`, `auditLogs`, `safetyAuditLogs`, `userConsents`

### Tables with API Routes but NO Admin UI (1/53)
`membershipTiers` — 4 admin API routes, zero frontend pages

### Tables with Repository Methods but NO API Routes (2/53)
`faqItems`, `helpArticles` — full CRUD methods in `SupportRepository`, no routes or UI

### Dead Schema Fields (Admin Fields Never Wired)
| Table.Field | Intended Purpose |
|-------------|-----------------|
| `reorderRecommendations.adminReviewRequired` | Flag recs needing admin review |
| `reorderRecommendations.adminReviewedBy` | Track reviewing admin |
| `reorderRecommendations.adminReviewedAt` | Review timestamp |
| `supportTickets.assignedTo` | Ticket assignment routing |

### Tables Completely Invisible to Admin (35/53)
Including: `newsletterSubscribers`, `subscriptions`, `labAnalyses`, `reviewSchedules`, `researchCitations`, `biometricData`, `biometricTrends`, `recipes`, `userStreaks`, `formulaVersionChanges`, `notifications`, `optimizePlans`, and 23 more user-managed tables.

---

## IV. Subsystem Analysis

### Membership System
| Aspect | Status |
|--------|--------|
| Backend (schema + repository) | ✅ Complete |
| API routes (4 admin endpoints) | ✅ Complete |
| Admin UI | ❌ **Missing entirely** |
| User-facing | ✅ Full with pricing page |

**4 tiers:** Founding ($19), Early Adopter ($29), Beta ($39), Standard ($49) — with capacity caps, plan discounts (quarterly 10%, annual 15%), and atomic assignment with transactional guards.

### Notification System
| Aspect | Status |
|--------|--------|
| Email (SendGrid) | ✅ Working, hardcoded template |
| SMS (Twilio) | ✅ Working, hardcoded messages |
| User preference management | ✅ Full (per-category toggles, time slots) |
| Admin template management | ❌ **Non-existent** |
| Admin broadcast/campaigns | ❌ **Non-existent** |

### Settings System
| Aspect | Status |
|--------|--------|
| Generic KV store (`app_settings`) | ✅ Working |
| AI settings admin UI | ✅ Inline on dashboard |
| Blog settings admin UI | ✅ Inline in blog page |
| Centralized settings page | ❌ **Missing** |
| System configuration (rate limits, maintenance mode) | ❌ **Env-var only** |

### Discount/Coupon System
| Aspect | Status |
|--------|--------|
| Streak-based loyalty discounts | ✅ Working (5-20% based on streak) |
| Stripe promotion codes | ✅ Enabled at checkout |
| Admin coupon management | ❌ **No table, no API, no UI** |
| Discount visibility | ❌ **No admin dashboard for discount usage** |

### Inventory/Product System
| Aspect | Status |
|--------|--------|
| Product catalog | Code-defined ingredients (not DB-managed) |
| Inventory tracking | ❌ **Non-existent** |
| SKU management | ❌ **N/A** (formulas are unique per-user) |
| Manufacturer integration | Partial (`manufacturerOrderId` field exists) |

---

## V. Security & Compliance Findings

| # | Finding | Severity | Recommendation |
|---|---------|----------|----------------|
| S1 | **HIPAA risk in conversation insights** | 🔴 Critical | Raw user health messages sent to OpenAI. Add data minimization/anonymization before AI analysis |
| S2 | **No admin action audit trail** | 🔴 Critical | User deletions, status changes, settings updates are completely unlogged. Add middleware to log all admin write operations |
| S3 | **Hard DELETE on users** | 🔴 Critical | CASCADE destroys all data permanently. Implement soft-delete with `deletedAt` timestamp |
| S4 | **`GET /api/settings/:key` is overly permissive** | 🟡 Medium | Any key from `app_settings` can be read. Add a whitelist of public keys |
| S5 | **Order status has no enum validation** | 🟡 Medium | Backend accepts any string as order status. Validate against defined enum |
| S6 | **Blog PATCH has no field whitelist** | 🟡 Medium | Could allow modification of unintended fields. Validate update payload with Zod schema |
| S7 | **Membership tier creation has no Zod validation** | 🟡 Medium | Body passed directly to service without schema validation |

---

## VI. Performance Concerns

| Area | Issue | Impact |
|------|-------|--------|
| Activity Feed | N+1 query pattern — loads users individually for each activity | Degrades at scale |
| Orders list | Joins done manually per-order | Slow with 1000+ orders |
| User export | Loads ALL users into memory for CSV generation | OOM risk at 10K+ users |
| Cohort Retention | Multiple sequential queries per cohort month | Slow with many months of data |
| Reorder Health | Individual user queries for reorder status | Won't scale past ~500 users |
| Conversation Insights | Fetches all messages then sends to OpenAI | Memory + API cost explosion |

---

## VII. Feature Gap Analysis: What's Needed for Shopify-Class Admin

### 🔴 Priority 1: Critical Missing (should exist today)

| Feature | What To Build | Backend Ready? |
|---------|--------------|:--------------:|
| **Admin Action Audit Logging** | Middleware to log all admin write operations to `audit_logs` | Schema ready |
| **Soft Delete for Users** | Add `deletedAt` to users, change DELETE to archive | Schema change needed |
| **Membership Admin Page** | UI for tiers, capacity, user roster per tier, stats | ✅ API exists |
| **FAQ/Help Article CMS** | Admin routes + UI for managing FAQ items and help articles | ✅ Repository exists |
| **Support Ticket Assignment** | Dropdown in ticket detail to assign to admin team members | ✅ Schema field exists |
| **Admin Notification Preferences** | Let admins choose what alerts they get | Infrastructure exists |
| **Newsletter Subscriber Management** | List, export, toggle active for subscribers | Schema exists |
| **HIPAA Data Minimization** | Anonymize/aggregate user messages before AI insight generation | Code change in insights endpoint |

### 🟡 Priority 2: Important for Growth

| Feature | What To Build | Backend Ready? |
|---------|--------------|:--------------:|
| **Dedicated Settings Page** | Centralized admin settings: AI config, notification templates, system config, feature flags | Partial |
| **Coupon/Promo Code Manager** | New table + CRUD + UI for admin-created discount codes | ❌ New |
| **Order Detail Page** | Full order view with formula breakdown, payment info, shipping, manufacturer status | Partial |
| **Refund Workflow** | Stripe refund triggering + status tracking from admin | ❌ New |
| **Subscription Management** | Admin view of user subscriptions, ability to pause/cancel/extend | Schema exists |
| **Notification Template Editor** | WYSIWYG email template editor, SMS template editor, test sending | ❌ New |
| **Broadcast/Campaign System** | Send targeted notifications to user segments | ❌ New |
| **Financial Dashboard** | MRR, ARPU, LTV, churn rate, cohort revenue, payment failure rate | Partial data exists |
| **Date Range Picker on Charts** | All analytics should support custom date ranges | Backend supports it, frontend hardcoded |
| **User Suspension/Ban** | Disable user without deleting (e.g., `isActive` flag) | Schema change needed |
| **Reorder Review Queue** | Admin workflow to review AI-generated reorder recommendations before sending | ✅ Schema designed for it |
| **Lab Analysis Review** | Admin screen to review AI-generated lab interpretations | Schema exists |

### 🟢 Priority 3: Competitive Differentiators

| Feature | What To Build | Backend Ready? |
|---------|--------------|:--------------:|
| **Admin Activity Dashboard** | Which admin did what, when (like Shopify "Timeline") | ❌ New |
| **Customer Segmentation** | Filter users by health profile, order history, engagement score | Partial |
| **Engagement Leaderboard** | User streaks, daily completions, gamification metrics | Schema exists (`userStreaks`) |
| **Wearable Health Monitor** | Cross-user wearable connection status + sync failures | Repository method exists |
| **Formula Version History** | Visual diff of formula changes over time | Schema exists (`formulaVersionChanges`) |
| **Research Citation Manager** | Admin CRUD for scientific evidence backing ingredients | Partial |
| **Recipe Library Manager** | Admin management of the global recipe database | Schema exists |
| **Scheduler Control Panel** | Start/stop/configure all 3 schedulers from admin UI | Partial |
| **System Health Dashboard** | API response times, error rates, queue depths, DB stats | ❌ New |
| **API Usage/Rate Limiting Dashboard** | Monitor AI API spend, rate limit status | ❌ New |
| **Bulk User Operations** | Multi-select users for export, notification, tier assignment | ❌ New |
| **Inventory/Ingredient Management** | DB-driven ingredient catalog editable by admin | Major refactor |
| **Advanced Blog Analytics** | Per-article traffic, SEO rankings, content performance | ❌ New |
| **Customer Impersonation** | "Login as user" for debugging (Shopify "View as customer") | ❌ New |
| **Canned Support Responses** | Template library for support ticket replies | ❌ New |
| **Webhook/Integration Manager** | Admin-configurable webhooks for order events, form submissions | ❌ New |
| **Multi-Admin RBAC** | Role-based permissions (viewer, editor, super-admin) | ❌ New |

---

## VIII. Shopify Feature Comparison

| Shopify Feature | ONES Status | Gap Level |
|-----------------|:-----------:|:---------:|
| Customer management | ✅ | — |
| Customer segments | ❌ | Large |
| Order management | ✅ | Small (needs detail page, refunds) |
| Order fulfillment | ⚠️ Partial | Medium (manufacturer ID exists, no UI) |
| Product management | N/A | Architecture differs (personalized formulas) |
| Inventory tracking | ❌ | Large |
| Discount codes | ❌ | Large |
| Gift cards | ❌ | Large |
| Blog/Content | ✅ | Small (needs media library) |
| Analytics dashboard | ✅ | Medium (needs date ranges, more metrics) |
| Financial reports | ❌ | Large |
| Marketing/campaigns | ❌ | Large |
| Email templates | ❌ | Large |
| Staff accounts & RBAC | ❌ | Large |
| Activity log | ✅ | Small (needs admin actions logged) |
| Settings panel | ⚠️ Inline | Medium |
| Shipping management | ⚠️ Tracking only | Medium |
| Tax configuration | ❌ | Medium (Stripe handles tax) |
| Apps/integrations panel | ❌ | Large |
| Notifications center | ⚠️ User only | Medium |
| Metafields/custom data | ❌ | Medium |
| Files/media management | ❌ | Medium |
| SEO tools | ⚠️ Basic | Small |
| Translations/i18n | ❌ | Low priority |

---

## IX. Quick Wins (Can Ship This Week)

These features require minimal new code because the backend infrastructure already exists:

1. **Membership Admin Page** — 4 API routes already work, just need a new page component
2. **FAQ Manager Page** — Repository CRUD methods exist, need 3 admin routes + 1 page  
3. **Help Article Manager Page** — Same as FAQ, repository ready
4. **Ticket Assignment UI** — Schema field exists, need 1 dropdown in ticket detail view
5. **Newsletter Subscriber List** — Simple query + table, schema exists
6. **Reorder Review Queue** — Schema has `adminReviewRequired` / `adminReviewedBy` / `adminReviewedAt` — wire up
7. **Date Range Picker** — Backend analytics endpoints already accept `days` param, add date picker to frontend
8. **Admin Action Logging** — Add `createAuditLog()` calls to admin write endpoints

---

## X. Recommended Implementation Roadmap

### Sprint 1 (Week 1): Security & Compliance
- [ ] Implement admin action audit logging middleware
- [ ] Add soft-delete for users (`deletedAt` + archive instead of CASCADE)
- [ ] HIPAA data minimization for conversation insights
- [ ] Add Zod validation to membership tier creation
- [ ] Add order status enum validation
- [ ] Add blog PATCH field whitelist
- [ ] Whitelist `GET /api/settings/:key`

### Sprint 2 (Week 2): Wire Up Existing Backend
- [ ] Membership Admin Page (tiers, capacity, stats, user roster)
- [ ] FAQ & Help Article CMS Pages
- [ ] Support ticket assignment dropdown
- [ ] Newsletter subscriber management page
- [ ] Reorder recommendation review queue
- [ ] Date range picker on all analytics charts

### Sprint 3 (Week 3): Order & Financial
- [ ] Order detail page (formula, payment, shipping, manufacturer status)
- [ ] Refund workflow (Stripe integration)
- [ ] Financial dashboard (MRR, ARPU, LTV, churn)
- [ ] Subscription management view

### Sprint 4 (Week 4): Communication & Settings
- [ ] Dedicated admin settings page
- [ ] Notification template editor
- [ ] Broadcast/campaign system
- [ ] Coupon/promo code manager
- [ ] Canned support responses

### Sprint 5 (Week 5): Advanced Features
- [ ] Multi-admin RBAC (roles & permissions)
- [ ] Customer segmentation engine
- [ ] User suspension/ban
- [ ] Formula version history viewer
- [ ] Wearable connection health monitor
- [ ] Scheduler control panel

### Sprint 6 (Week 6): Polish & Scale
- [ ] Fix N+1 query patterns (activity feed, orders, exports, cohorts)
- [ ] Streaming user/order exports for large datasets
- [ ] Admin activity dashboard
- [ ] System health monitoring
- [ ] API usage & cost tracking
- [ ] Advanced blog analytics

---

*Report generated by full codebase audit: 9 admin pages, 8 feature components, 61 API endpoints, 53 database tables, 4 repository files, 3 scheduler files.*
