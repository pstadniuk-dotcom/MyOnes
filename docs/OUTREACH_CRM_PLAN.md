# ONES Outreach Agent → Full CRM — Master Plan

> Deep audit completed March 24, 2026. This is the blueprint for evolving the Outreach Agent into a complete SMB CRM.

---

## PART 1: CURRENT STATE AUDIT

### What Exists Today

#### A. Outreach Agent System (`server/modules/agent/`)
| Component | File | Status | Notes |
|-----------|------|--------|-------|
| **Web Search Discovery** | `tools/web-search.ts` | ✅ Working | OpenAI Responses API + `web_search_preview` |
| **PR Scan** (podcast + press) | `engines/pr-scan.ts` | ✅ Working | Daily 6am UTC. Finds podcasts & press outlets |
| **Investor Scan** | `engines/investor-scan.ts` | ✅ Working | Daily 6:30am UTC. VC/angel discovery |
| **Contact Enrichment** | `tools/hunter.ts` | ✅ Working | Hunter.io domain search + email verification |
| **Journalist Discovery** | `tools/journalist-discovery.ts` | ✅ Working | Finds specific writers at publications |
| **Prospect Enrichment** | `tools/prospect-enrichment.ts` | ✅ Working | RSS, social, domain authority, activity signals |
| **Podcast Index** | `tools/podcast-index.ts` | ✅ Working | Structured podcast data (episode count, dates) |
| **Smart Prioritization** | `engines/smart-prioritization.ts` | ✅ Working | Composite scoring (relevance + audience + accessibility + freshness + enrichment) |
| **AI Pitch Drafting** | `engines/draft-pitch.ts` | ✅ Working | GPT-4o pitch generation with quality scoring |
| **Pitch Quality Scoring** | `tools/pitch-quality.ts` | ✅ Working | Automated quality checks, banned phrases, scoring |
| **Gmail Sending** | `engines/gmail-sender.ts` | ✅ Working | Gmail OAuth primary, SendGrid fallback |
| **Form Filling** | `tools/form-filler.ts` | ✅ Working | Playwright-based auto form submission |
| **Response Detection** | `engines/response-detector.ts` | ✅ Working | Gmail inbox scanning + AI classification |
| **Follow-up Scheduler** | `engines/follow-up-scheduler.ts` | ✅ Working | Auto-draft follow-ups for non-responders |
| **Multi-Channel Messages** | `engines/multi-channel.ts` | ✅ Working | LinkedIn/Twitter/Instagram message drafts |
| **Competitor Monitor** | `engines/competitor-monitor.ts` | ✅ Working | Weekly competitor media appearance scan |
| **Press Release Drafter** | `engines/press-release-drafter.ts` | ✅ Working | AI-generated press releases for milestones |
| **Conversation Insights** | `engines/conversation-insights.ts` | ✅ Working | Trending user topics → PR angles |
| **Formula Insights** | `engines/formula-insights.ts` | ✅ Working | Popular ingredients → product stories |
| **Platform Stats** | `tools/platform-stats.ts` | ✅ Working | Live user/formula metrics for pitch context |
| **Weekly Summary Email** | `engines/weekly-summary.ts` | ✅ Working | Friday 5pm UTC digest to admin |
| **Cost Tracker** | `tools/cost-tracker.ts` | ✅ Working | Token usage, budget monitoring |
| **Agent Runner** | `agent-runner.ts` | ✅ Working | Generic tool-calling loop with safety rails |
| **Founder Context** | `founder-context.ts` | ✅ Working | Pete's profile, bios, talking points |
| **Config System** | `agent-config.ts` | ✅ Working | Zod-validated, admin-editable settings |
| **Custom Templates** | via `agent.controller.ts` | ✅ Working | CRUD for email templates |
| **Scheduler** | `utils/prAgentScheduler.ts` | ✅ Working | 7 cron jobs (scan/pitch/follow-up/response/competitor/summary) |

#### B. B2B Medical Prospecting System (Separate, Disconnected)
| Component | Location | Status | Notes |
|-----------|----------|--------|-------|
| **B2B Prospects Table** | `shared/schema.ts` L1129 | ✅ Exists | Practice-focused: name, type, specialty, address, lead score |
| **B2B Outreach Table** | `shared/schema.ts` L1174 | ✅ Exists | Activity log: email/call/meeting/sample tracking |
| **B2B API Routes** | `admin.routes.ts` L129-137 | ✅ Exists | CRUD prospects + outreach entries |
| **B2B Admin Page** | `B2bProspectingPage.tsx` | ✅ Exists | Standalone page at `/admin/b2b` |

#### C. Frontend (PRAgentPage.tsx)
| Tab | Content | Usability |
|-----|---------|-----------|
| Overview | Stats cards + activity feed | ✅ Good |
| Podcasts | Prospect table with filters | ✅ Good |
| Press | Prospect table with filters | ✅ Good |
| Investors | Prospect table with filters | ✅ Good |
| Pitches | Pitch list + review/approve/send | ✅ Good |
| Runs | Agent execution history + logs | ✅ Good |
| Analytics | Charts and metrics | ⚠️ Basic |
| Templates | Custom email template CRUD | ✅ Good |
| Settings | Config + Gmail + Founder Profile | ✅ Good |

#### D. Database Schema — Outreach Tables
- `outreach_prospects` — 30+ columns (name, URL, email, score, enrichment, contacts, status, etc.)
- `outreach_pitches` — 20+ columns (subject, body, status, sent date, response tracking, quality)
- `agent_runs` — Run history with JSON logs, token/cost tracking
- `prospect_contacts` — Journalist/editor contacts per prospect
- `b2b_prospects` — Practice-focused leads (completely separate table)
- `b2b_outreach` — B2B activity log (completely separate table)

### Gaps & Missing CRM Features

| Gap | Impact | Priority |
|-----|--------|----------|
| **No unified pipeline view** | Can't see all deals/prospects in one Kanban board | 🔴 Critical |
| **B2B is disconnected** | Two separate systems for the same company's outreach | 🔴 Critical |
| **No deal/opportunity tracking** | No revenue amounts, close dates, probability | 🔴 Critical |
| **No activity timeline** | Can't see full history of interactions per prospect | 🟡 High |
| **No notes/tasks system** | No way to add reminders, to-dos, or internal notes | 🟡 High |
| **No tags/custom fields** | Can't organize or segment prospects flexibly | 🟡 High |
| **No import/export** | Can't bulk import from CSV/Google Sheets | 🟡 High |
| **No search across everything** | Can't quickly find a prospect across all categories | 🟡 High |
| **No email open/click tracking** | No visibility into engagement after send | 🟡 High |
| **No calendar integration** | No booked meeting links, scheduling | 🟢 Medium |
| **No reporting/dashboard** | Analytics tab is basic, no sales funnel metrics | 🟢 Medium |
| **No duplicate detection** | Beyond URL dedup, no fuzzy name/email matching | 🟢 Medium |
| **No team/collaboration** | Single-user, no assignment or shared inbox | ⚪ Future |
| **No mobile view** | Admin pages not optimized for mobile | ⚪ Future |
| **No webhook integrations** | No Zapier/webhook triggers on key events | ⚪ Future |

---

## PART 2: CRM ARCHITECTURE PLAN

### Naming
**Rename "PR Agent" → "Outreach CRM"** across the entire codebase. The agent engines remain as the automation backbone, but the UI becomes a proper CRM.

### Data Model Evolution

#### Phase 1: Unified Contact & Deal Model

```
NEW TABLES:
──────────────────────────────────────────────────────────────
crm_contacts
  id, name, email, phone, company, title, type (person|company),
  linkedin_url, twitter_handle, website,
  tags (json string[]), custom_fields (json),
  source, lead_score, avatar_url,
  created_at, updated_at

crm_deals
  id, contact_id → crm_contacts,
  prospect_id → outreach_prospects (nullable, links to existing agent data),
  title, stage (lead|qualified|proposal|negotiation|closed_won|closed_lost),
  value_cents, currency, probability,
  expected_close_date, actual_close_date,
  category (podcast|press|investor|b2b|partnership|other),
  owner, tags (json), custom_fields (json),
  created_at, updated_at, closed_at

crm_activities
  id, contact_id → crm_contacts, deal_id → crm_deals (nullable),
  type (email_sent|email_received|call|meeting|note|task|status_change|
        pitch_drafted|pitch_approved|pitch_sent|form_submitted|
        follow_up_sent|response_detected),
  subject, body, metadata (json),
  scheduled_at (for tasks/reminders),
  completed_at, due_at,
  is_pinned, created_by,
  created_at

crm_tags
  id, name, color, category (contact|deal|general)

crm_contact_tags (join table)
  contact_id, tag_id

crm_deal_tags (join table)
  deal_id, tag_id

crm_saved_views
  id, name, entity (contacts|deals|prospects|pitches),
  filters (json), sort (json), columns (json),
  is_default, created_by, created_at
──────────────────────────────────────────────────────────────

KEEP EXISTING (unchanged):
  outreach_prospects  — Agent discovery still writes here
  outreach_pitches    — Agent pitch drafting still writes here
  agent_runs          — Agent execution logs
  prospect_contacts   — Journalist contacts per prospect
  b2b_prospects       — Migrate data into crm_contacts, then deprecate
  b2b_outreach        — Migrate data into crm_activities, then deprecate
```

#### Why This Architecture
- **crm_contacts** is the single registry of every person/company you interact with. Agent-discovered prospects get a linked contact record automatically.
- **crm_deals** tracks the pipeline. A podcast booking, an investor meeting, a B2B partnership — all are "deals" with different categories and stages.
- **crm_activities** is the universal timeline. Every email sent, follow-up drafted, response detected, note added, call logged — all in one chronological stream per contact/deal.
- Existing `outreach_prospects` and `outreach_pitches` tables remain untouched — the AI agent keeps writing to them. A bridge maps them to CRM contacts/deals.

---

## PART 3: IMPLEMENTATION PHASES

### Phase 1 — Data Foundation & Unified Pipeline (Core CRM)
**Goal:** Unified contacts, deals, activity timeline, and pipeline view.

**Schema changes:**
1. Add `crm_contacts`, `crm_deals`, `crm_activities`, `crm_tags`, join tables, `crm_saved_views` to `shared/schema.ts`
2. Add migration bridge: when an `outreach_prospect` is created, auto-create a `crm_contact` record
3. Migrate existing `b2b_prospects` data into `crm_contacts` (one-time script)
4. Migrate existing `b2b_outreach` data into `crm_activities`

**Backend:**
1. New `server/modules/crm/` module with:
   - `crm.repository.ts` — CRUD for contacts, deals, activities
   - `crm.service.ts` — Business logic (stage transitions, activity logging, deal calculations)
   - `crm.routes.ts` — REST API endpoints
2. Bridge service: Hook into agent events (prospect created, pitch sent, response detected) → auto-create CRM activities
3. Contact dedup service: Fuzzy matching on name + email + company to prevent duplicates

**Frontend:**
1. **Pipeline Board** — Kanban-style drag-and-drop board showing deals by stage
   - Columns: Lead → Contacted → Responded → Meeting → Negotiation → Won / Lost
   - Cards show: contact name, deal value, category badge, days in stage, next action
   - Drag to change stage → auto-logs activity
2. **Contact Detail Page** — Full profile view for any contact
   - Header: name, company, title, email, phone, social links, tags
   - Activity timeline (chronological feed of all interactions)
   - Related deals, pitches, prospects
   - Quick actions: log call, add note, schedule task, send email
3. **Unified Search** — Global search bar across contacts, deals, prospects, pitches

**Expected deliverables:**
- 6 new DB tables
- CRM module (repo + service + routes)
- Pipeline Kanban board component
- Contact detail page with activity timeline
- Agent bridge (auto-creates CRM records from agent activity)
- B2B data migration script

---

### Phase 2 — Smart Activities & Task Management
**Goal:** Tasks, reminders, notes, and automated activity logging.

**Features:**
1. **Task System**
   - Create tasks linked to contacts or deals (e.g., "Follow up with Mike at Ritual podcast")
   - Due dates with overdue highlighting
   - Task board: Today, This Week, Overdue, Completed
   - Email reminder (daily digest of upcoming tasks via weekly summary engine)

2. **Note System**
   - Rich-text notes on contacts and deals
   - Pinnable notes (important info stays visible)
   - @mentions for future team use

3. **Automated Activity Logging** — expand the bridge to capture:
   - `pitch_drafted` → when agent drafts a pitch for this contact's prospect
   - `pitch_approved` → when admin approves
   - `pitch_sent` → when Gmail/SendGrid sends
   - `response_detected` → when response detector finds a reply
   - `follow_up_sent` → when follow-up goes out
   - `form_submitted` → when form filler completes a submission
   - `stage_changed` → when deal moves between pipeline stages
   - `score_changed` → when relevance score is updated

4. **Quick Log** — One-click buttons in contact/deal view:
   - Log Call (duration, outcome, notes)
   - Log Meeting (date, attendees, notes)
   - Log Email (manual — for emails not sent through the system)
   - Add Note

---

### Phase 3 — Analytics, Reporting & Email Tracking
**Goal:** Real CRM analytics, funnel metrics, email engagement.

**Features:**
1. **Funnel Dashboard**
   - Pipeline value by stage (bar chart)
   - Conversion rates between stages (funnel visualization)
   - Average time in each stage
   - Win rate by category (podcast vs press vs investor vs B2B)
   - Monthly outreach volume (emails sent, responses, meetings booked)

2. **Activity Analytics**
   - Outreach activity over time (line chart)
   - Response rate by category and template
   - Best-performing pitch templates (by response rate)
   - Follow-up effectiveness (response rate after follow-up #1/2/3)

3. **Email Open & Click Tracking**
   - SendGrid webhook integration for open/click events
   - Gmail read receipt detection (limited but useful)
   - Per-pitch engagement metrics displayed on pitch cards
   - "Hot lead" badge when prospect opens email 3+ times

4. **Saved Views & Filters**
   - Save custom filter combinations (e.g., "Investors responded this month")
   - Quick-switch between views
   - Column customization per view

5. **Export**
   - CSV export for contacts, deals, activity logs
   - Filter-aware export (export only current view)

---

### Phase 4 — Tags, Custom Fields & Segmentation
**Goal:** Flexible organization beyond fixed categories.

**Features:**
1. **Tag System**
   - Color-coded tags for contacts and deals
   - Preset tags: `hot-lead`, `follow-up-needed`, `vip`, `do-not-contact`, `referred-by-X`
   - Auto-tags from agent: `ai-discovered`, `hunter-verified`, `high-relevance`, `response-positive`
   - Filter by tags in pipeline and contact list

2. **Custom Fields**
   - Admin can define custom fields per entity type
   - Field types: text, number, date, dropdown, URL, email, checkbox
   - Use cases: "Fund Size" for investors, "Episode Format" for podcasts, "Contract Value" for B2B

3. **Smart Segments**
   - Saved dynamic filters that auto-update:
     - "All investors with score > 80 who haven't been contacted"
     - "All press prospects who responded positively in the last 30 days"
     - "B2B leads in California with lead score > 70"
   - Segment counts on dashboard

---

### Phase 5 — Integrations & Automation Rules
**Goal:** Connect to external tools, custom automation.

**Features:**
1. **Calendar Integration**
   - Google Calendar OAuth for booked meetings
   - Auto-create calendar event when deal moves to "Meeting" stage
   - Meeting links (Calendly/Google Meet) stored on contact record

2. **Webhook Outbound**
   - Fire webhooks on key events (new deal, stage change, response detected)
   - Enables Zapier/Make/n8n integration
   - Webhook config in settings

3. **Automation Rules** (lightweight workflow builder)
   - IF [trigger] THEN [action] rules
   - Triggers: deal stage changed, response detected, score above X, tag added, time elapsed
   - Actions: send email, create task, add tag, move stage, notify admin, log activity
   - Example: "If investor responds positively → move deal to 'Meeting' + create task 'Schedule call within 48h'"

4. **Import/Bulk Operations**
   - CSV import for contacts (map columns to fields)
   - Bulk tag, bulk stage change, bulk delete
   - LinkedIn Sales Navigator import (CSV format)

---

### Phase 6 — Team & Collaboration (Future)
**Goal:** Multi-user CRM capabilities.

**Features:**
1. Deal ownership & assignment
2. Shared inbox for team email
3. Activity feed showing team member actions
4. Role-based permissions (viewer, contributor, admin)
5. Mention/comment system on deals and contacts

---

## PART 4: FILE STRUCTURE

```
server/modules/crm/
  crm.repository.ts        — Database CRUD for contacts, deals, activities, tags
  crm.service.ts           — Business logic, stage transitions, dedup, activity auto-logging
  crm.routes.ts            — Express routes mounted at /api/admin/crm
  crm-bridge.ts            — Hooks into agent events → creates CRM records
  crm-migration.ts         — One-time migration of B2B data into CRM tables
  crm-analytics.ts         — Funnel metrics, conversion rates, reporting queries

client/src/features/crm/
  CrmPage.tsx              — Main CRM page (replaces PRAgentPage as the hub)
  components/
    PipelineBoard.tsx       — Kanban drag-and-drop pipeline
    PipelineCard.tsx        — Individual deal card in the pipeline
    ContactDetailPage.tsx   — Full contact profile + activity timeline
    ActivityTimeline.tsx    — Chronological activity feed component
    ActivityLogForm.tsx     — Quick-log call/meeting/note form
    DealDetailPanel.tsx     — Slide-over panel for deal details
    ContactsTable.tsx       — Searchable, filterable contact list
    DealsTable.tsx          — Alternate list view for deals
    TagManager.tsx          — Tag creation and assignment
    GlobalSearch.tsx        — Search across contacts/deals/prospects
    CrmStats.tsx            — Dashboard stat cards
    FunnelChart.tsx         — Visual funnel analytics
    SavedViewsDropdown.tsx  — Quick-switch between saved views
  hooks/
    useCrmContacts.ts       — React Query hooks for contacts
    useCrmDeals.ts          — React Query hooks for deals
    useCrmActivities.ts     — React Query hooks for activity timeline
    useDealPipeline.ts      — Pipeline stage management
```

---

## PART 5: MIGRATION STRATEGY

### How Existing Data Maps to CRM

| Source | → CRM Table | Mapping |
|--------|------------|---------|
| `outreach_prospects` (podcast) | `crm_contacts` + `crm_deals` | Contact = host/publication. Deal = podcast booking opportunity |
| `outreach_prospects` (press) | `crm_contacts` + `crm_deals` | Contact = journalist/publication. Deal = press coverage opportunity |
| `outreach_prospects` (investor) | `crm_contacts` + `crm_deals` | Contact = investor/firm. Deal = investment opportunity |
| `outreach_pitches` | `crm_activities` | Each pitch = email_sent activity. Follow-ups = follow_up_sent |
| `prospect_contacts` | `crm_contacts` | Each journalist contact = additional CRM contact linked to same deal |
| `b2b_prospects` | `crm_contacts` + `crm_deals` | Contact = practice. Deal = B2B partnership opportunity |
| `b2b_outreach` | `crm_activities` | Each outreach entry = corresponding activity type |

### Backward Compatibility
- Agent engines continue writing to `outreach_prospects` and `outreach_pitches` — **zero changes** to AI pipelines
- Bridge service (`crm-bridge.ts`) subscribes to agent events and mirrors data into CRM tables
- Old B2B routes remain functional until frontend is fully migrated
- PRAgentPage.tsx tabs still work — new CRM page is additive, not a replacement (at first)

---

## PART 6: PRIORITY ORDER & DEPENDENCIES

```
Phase 1  ███████████████████████████████████  FOUNDATION
  ↓ Schema + Repo + Bridge + Pipeline Board + Contact Detail
  
Phase 2  ██████████████████████████           PRODUCTIVITY  
  ↓ Tasks + Notes + Auto-logging + Quick Log
  
Phase 3  ████████████████████                 INTELLIGENCE
  ↓ Funnel analytics + Email tracking + Saved views + Export
  
Phase 4  █████████████████                    FLEXIBILITY
  ↓ Tags + Custom fields + Smart segments
  
Phase 5  ██████████████                       INTEGRATION
  ↓ Calendar + Webhooks + Automation rules + Import
  
Phase 6  █████████                            TEAM (future)
    Team features, shared inbox, permissions
```

---

## PART 7: WHAT MAKES THIS CRM UNIQUE

Unlike generic CRMs (HubSpot, Pipedrive, etc.), this system is specifically designed for ONES:

1. **AI-First Discovery** — Prospects are found by AI agents scanning the web, not manually entered
2. **Auto-Enrichment** — Hunter.io email verification, journalist discovery, podcast metrics, RSS analysis happen automatically
3. **AI Pitch Generation** — Pitches are drafted by GPT-4o with quality scoring, founder context, and platform stats
4. **Response Intelligence** — Gmail inbox is scanned and responses are AI-classified (interested, declined, ask_later, etc.)
5. **Competitor Awareness** — Weekly competitor media monitoring feeds into prospect discovery
6. **Multi-Channel by Default** — Email, form filling (Playwright), LinkedIn/Twitter message drafts all integrated
7. **Platform-Powered Social Proof** — Real user metrics and trending health topics injected into pitches
8. **Category-Native** — Pipeline stages make sense for podcast bookings, press coverage, investor meetings, AND B2B partnerships
9. **Budget-Aware** — Token cost tracking built into every AI operation with budget alerts

The CRM layer adds what the AI agent can't: human relationship management, deal tracking, task prioritization, and the organizational structure to turn AI-generated opportunities into real outcomes.
