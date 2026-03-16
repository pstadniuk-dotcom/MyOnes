# PR Agent — Improvement Roadmap

**Date:** 2026-03-14
**Current State:** Feature exists on `dev.3.12.26` branch (commit `2a0f9b5`)
**Goal:** Transform from a basic pitch-and-send tool into a robust, full-cycle public relations engine

---

## Current Capabilities (What Already Works)

| Capability | Status | Files |
|-----------|--------|-------|
| Prospect discovery via OpenAI web search | Built | `pr-scan.ts`, `web-search.ts` |
| Deep scrape (Playwright) for contact info | Built | `deep-scrape.ts` |
| AI relevance scoring (5-axis, 0-100) | Built | `score-prospect.ts` |
| AI pitch drafting (7 templates) | Built | `draft-pitch.ts`, `pitch-templates.ts` |
| AI rewrite with admin instructions | Built | `draft-pitch.ts:rewritePitch` |
| Human review + approve/reject flow | Built | `agent.controller.ts`, `PRAgentPage.tsx` |
| Gmail OAuth sending | Built | `gmail-sender.ts` |
| Form detection + AI field mapping + fill | Built | `form-filler.ts` |
| Cron scheduling (Mon+Thu) | Built | `prAgentScheduler.ts` |
| Founder profile (bios, talking points, angles) | Built | `founder-context.ts` |
| Admin UI (5 tabs: Dashboard, Prospects, Pitches, Runs, Settings) | Built | `PRAgentPage.tsx` |
| Run history + audit logging | Built | `agent.repository.ts` |

---

## PART 1: Critical Fixes (Must-Do Before Launch)

### 1.1 Missing Dependencies
- **`googleapis` not in package.json** — `gmail-sender.ts` imports it but it won't resolve at runtime
- **`playwright` in devDependencies only** — `deep-scrape.ts` and `form-filler.ts` use it at runtime. Either move to dependencies or make it optional with graceful fallback
- **Fix:** Add both to `dependencies` in `package.json`

### 1.2 Gmail OAuth Credentials Stored in Plaintext
- **File:** `agent.controller.ts:updateGmailConfig` stores `clientId`, `clientSecret`, `refreshToken` as plain JSON in `app_settings`
- **Fix:** Encrypt credentials using the existing `fieldEncryption.ts` module before saving; decrypt on read

### 1.3 No Input Validation on Config Updates
- **File:** `agent.controller.ts:updateConfig` accepts arbitrary `req.body` and merges it into config
- **Risk:** Admin could accidentally set `temperature: 99` or `maxProspectsPerRun: 10000`
- **Fix:** Add Zod schema validation for `PrAgentConfig` with clamped ranges

### 1.4 No Rate Limiting on Scan/Pitch Triggers
- **File:** `agent.routes.ts` — `POST /scan` and `POST /pitch-batch` trigger unbounded OpenAI API calls
- **Fix:** Add mutex/lock so only one scan and one pitch batch can run at a time; return 409 if already running

### 1.5 Fire-and-Forget Scan Has No Real-Time Feedback
- **File:** `agent.controller.ts:triggerScan` returns `{ message: 'Scan started' }` immediately with no way to track progress
- **Fix:** Return the `runId` so the frontend can poll `/api/agent/runs/:id` for status. Better: add SSE stream for live progress

### 1.6 Browser Instance Leak Risk
- **File:** `deep-scrape.ts` and `form-filler.ts` each maintain their own `browserInstance` singleton
- **Risk:** If an error occurs between `getBrowser()` and `closeBrowser()`, the instance leaks
- **Fix:** Consolidate into a shared browser pool with automatic cleanup on idle timeout

---

## PART 2: Outreach Intelligence Improvements

### 2.1 Podcast Directory API Integration
**Problem:** Discovery relies entirely on OpenAI web search, which hallucinates URLs and misses structured data.

**Solution:** Add Podcast Index API (free, open, 4M+ podcasts) as a primary discovery source:
- Search by category (Health & Fitness, Science, Technology)
- Get real RSS feed URLs, episode counts, last publish dates
- Use real data for audience size estimation instead of AI guessing
- Cross-reference web search results with Podcast Index for validation

**Implementation:**
- New file: `server/modules/agent/tools/podcast-index.ts`
- API: `https://api.podcastindex.org/api/1.0/search/byterm`
- Free API key at podcastindex.org
- Use as first-pass discovery, then deep-scrape the top results for contact info

### 2.2 Smarter Search Query Rotation
**Problem:** `search-queries.ts` has static queries that will find the same results repeatedly.

**Solution:**
- Track which queries have been used in each run via `agentRuns.runLog`
- Rotate queries so different ones are used each cycle
- Add date-based modifiers automatically (e.g., append "2026" or "March 2026")
- Generate new queries with AI based on what's worked (queries that produced high-scoring prospects)
- Let admin add/remove/reorder queries from Settings UI (partially exists but queries are still static defaults)

### 2.3 Prospect Enrichment Pipeline
**Problem:** Prospects have basic info from web search but lack real engagement metrics.

**Solution:** Add a post-discovery enrichment step:
- **Social media follower counts** — Check Twitter/X, LinkedIn, Instagram for host/publication
- **Podcast download estimates** — Use Podcast Index `podcastsById` for episode-level stats
- **Domain authority** — Use free MOZ API or similar for press prospects
- **Recent episode/article recency** — Scrape RSS feed `lastBuildDate` to verify activity
- Store enrichment data in a new `enrichmentData` JSON column on `outreachProspects`

### 2.4 Competitor Media Monitoring
**Problem:** No awareness of where competitors (AG1, Ritual, Huel, etc.) are getting coverage.

**Solution:**
- Add search queries targeting competitor press/podcast appearances
- When a competitor appears on a show/publication, flag it as a high-priority prospect (if they cover competitors, they'll cover you)
- New agent: `competitor_scan` running weekly
- Store competitor appearances as a new `source: 'competitor_coverage'` type

### 2.5 Prospect Relationship Timeline
**Problem:** No way to see the full history of interactions with a prospect.

**Solution:** Add a timeline view per prospect showing:
- Discovery date + source
- Pitch drafted → reviewed → sent
- Follow-ups sent
- Response received
- Booking/publication date
- All admin notes

---

## PART 3: Pitch Quality Improvements

### 3.1 Dynamic Platform Stats in Pitches
**Problem:** Pitches use static founder profile data. Real metrics would be more compelling.

**Solution:** Pull live data from the existing platform into pitch context:
- Total users from `getAdminStats()`
- Total custom formulas created
- Number of ingredients in catalog (200+)
- User satisfaction from conversation intelligence sentiment data
- Most popular health goals from health profiles

**Implementation:** Add a `getPlatformStats()` function to `founder-context.ts` that queries the DB and injects stats into the pitch prompt:
```
"Ones has helped [X] users create [Y] personalized supplement formulas from a catalog of 200+ ingredients..."
```

### 3.2 Per-Prospect Research Before Pitching
**Problem:** Pitches reference "a recent episode" or "your audience" but the AI is guessing.

**Solution:** Before drafting a pitch, do a mini-research step:
- Fetch the prospect's RSS feed (if podcast) and read last 3 episode titles/descriptions
- Scrape their "About" page for mission statement
- Check their Twitter/X for recent posts
- Feed this real context into the pitch prompt so references are specific and accurate

### 3.3 Pitch Quality Scoring
**Problem:** No way to evaluate pitch quality before human review.

**Solution:** After drafting, run a self-evaluation pass:
- Check word count vs template max
- Verify subject line uniqueness (not matching template examples)
- Verify prospect name/show name appears in the pitch
- Check for banned phrases ("I hope this finds you well", "I would love to")
- Score on personalization depth (does it reference specific content?)
- Flag low-quality pitches for redraft before they hit the review queue

### 3.4 Multi-Language Support
**Problem:** All pitches are English-only.

**Solution:** Detect prospect language from their website and draft pitches accordingly. Relevant for international health/wellness publications.

### 3.5 Pitch A/B Testing
**Problem:** No data on which pitch styles get responses.

**Solution:**
- For each prospect category, randomly select between 2-3 template variants
- Track response rates per template
- After enough data (30+ sends per variant), show analytics in dashboard
- Auto-recommend the highest-performing template

---

## PART 4: Follow-Up & Response Management

### 4.1 Automated Follow-Up Scheduling
**Problem:** `followUpDueAt` is tracked but nothing automatically drafts follow-ups.

**Solution:**
- Add a `follow_up_check` cron job (daily at 9am)
- Query `getPendingFollowUps()` (already exists in repository)
- Auto-draft follow-up pitches for prospects past their due date
- Route to review queue (never auto-send)
- Respect `maxFollowUps` config

### 4.2 Response Detection & Classification
**Problem:** `responseReceived` is a boolean that must be manually toggled. No way to detect or classify responses.

**Solution:**
- If Gmail OAuth is configured, periodically check inbox for replies to sent pitches (match by thread/subject)
- Auto-classify responses: "interested", "declined", "ask_later", "forwarded"
- Update prospect status automatically
- Notify admin of positive responses via toast/email

### 4.3 Booking & Scheduling Flow
**Problem:** After a prospect says "yes", there's no workflow to manage scheduling.

**Solution:** Add booking management:
- New status: `interested` → `scheduling` → `booked` → `completed` → `published`
- Store booking details: date, time, format (video/audio/written), prep notes
- Calendar integration (Google Calendar API) to create events
- Pre-appearance prep card: talking points, do-not-mention list, audience context
- Post-appearance: track publication URL, social shares, referral traffic

---

## PART 5: Analytics & Reporting

### 5.1 Outreach Funnel Dashboard
**Problem:** Dashboard shows raw counts but no conversion funnel.

**Solution:** Add a visual funnel:
```
Discovered (150) → Pitched (80) → Sent (60) → Responded (12) → Booked (5) → Published (3)
```
- Show conversion rates at each stage
- Break down by category (podcast vs press)
- Trend over time (weekly/monthly)

### 5.2 ROI & Cost Tracking
**Problem:** `agentRuns` has `tokensUsed` and `costUsd` columns but they're never populated.

**Solution:**
- Track OpenAI token usage from every API call (web search, scoring, pitch drafting, rewriting)
- Calculate cost per prospect discovered, cost per pitch drafted, cost per response received
- Show in dashboard: "This month: $X spent → Y prospects → Z responses → W bookings"
- Set budget alerts: notify admin when monthly AI spend exceeds threshold

### 5.3 Best Time to Pitch Analysis
**Problem:** No data on when pitches get the best response rates.

**Solution:**
- Track send time (day of week, time of day) and response time
- After enough data, recommend optimal send windows
- Optionally delay sending to hit optimal windows

### 5.4 Weekly PR Summary Email
**Problem:** Admin must log into dashboard to see PR activity.

**Solution:**
- Send a weekly email digest to admin:
  - New prospects discovered this week
  - Pitches pending review
  - Responses received
  - Upcoming follow-ups due
  - Bookings confirmed
- Use existing `emailService.ts` infrastructure

---

## PART 6: Inbound PR Pipeline

### 6.1 Wire the Contact Form
**Problem:** `ContactPage.tsx` "Press & Media" and "Creator/Influencer" options show a success toast but never submit.

**Solution:**
- On submit, call `POST /api/support/tickets` with category `press` or `creator`
- Route these tickets to a dedicated "PR Inbound" section (not mixed with billing/support)
- Auto-create an `outreachProspects` record with `source: 'inbound'` so they appear in the PR pipeline

### 6.2 Press Kit / Media Page
**Problem:** No public-facing press resources for journalists who find you.

**Solution:** Add a `/press` page with:
- Founder bios (short, medium, long) — pulled from `founder-context.ts` defaults
- High-res headshots and logos (downloadable)
- Key stats (users, formulas, ingredients)
- Recent media appearances (from `mediaAppearances` in founder profile)
- Talking points / story angles
- Contact form for press inquiries

### 6.3 Influencer/Creator Application Flow
**Problem:** Creator partnership inquiries go to generic support.

**Solution:**
- Dedicated `/creators` application page
- Fields: name, platform, follower count, content niche, collaboration idea
- Store as `outreachProspects` with `source: 'creator_application'`
- Admin reviews in PR Agent dashboard alongside outbound prospects

---

## PART 7: Platform Intelligence Integration

### 7.1 Conversation Intelligence → PR Angles
**Problem:** Conversation Intelligence (`ConversationsPage.tsx`) surfaces user insights but doesn't feed into PR.

**Solution:**
- After generating conversation insights, extract compelling user stories (anonymized)
- Surface "pitchable angles" from real user data:
  - "42% of users ask about stress/sleep — angle for wellness podcasts"
  - "Most requested ingredient: Ashwagandha — angle for adaptogen-focused shows"
  - "Users report X% improvement in energy — data point for pitches"
- Add these as suggested talking points in the pitch drafting context

### 7.2 Formula Insights → Product Story
**Problem:** `FormulaInsightsWidget` shows popular ingredients and patterns but this data doesn't inform PR.

**Solution:**
- Pull top ingredients, most common health goals, and formula complexity stats
- Auto-generate "Product Fact Sheet" that updates weekly
- Include in pitch context: "Our most popular systems are Adrenal Support and Immune Defense, with average formulas containing 12 ingredients at therapeutic doses"

### 7.3 User Growth Metrics → Social Proof
**Problem:** Growth data exists in admin analytics but isn't available to the PR engine.

**Solution:**
- Pull user growth rate, retention cohort data, and order volume
- Make available as dynamic variables in pitch templates
- Auto-update founder profile `credentials` with current platform stats

---

## PART 8: Advanced Automation

### 8.1 Smart Prospect Prioritization Queue
**Problem:** Prospects are ranked by relevance score only, which is a static assessment.

**Solution:** Add a composite priority score that factors in:
- Relevance score (existing)
- Timing signals (are they currently looking for guests? Recent "looking for guests" post?)
- Competitor coverage (did a competitor just appear? Hot lead)
- Audience overlap with Ones target demo
- Response probability based on historical data from similar prospects

### 8.2 Automated Press Release Drafting
**Problem:** No mechanism for proactive press releases.

**Solution:**
- Trigger-based press release drafting:
  - New milestone (1000 users, 5000 formulas, new ingredient category)
  - Product launch (new feature, new integration)
  - Funding/partnership announcement
- AI drafts press release from template + platform data
- Admin reviews and approves
- Distribute to prospects tagged as `expert_source` or `product_review`

### 8.3 Multi-Channel Outreach
**Problem:** Only email and form-based outreach supported.

**Solution:** Add:
- **LinkedIn outreach** — Generate connection request message + follow-up
- **Twitter/X DMs** — For podcast hosts who prefer DMs (common in indie podcasts)
- **Instagram DMs** — For wellness influencers
- Track channel per prospect and personalize approach

### 8.4 CAPTCHA Solving Integration
**Problem:** Form filler detects CAPTCHAs but can't solve them.

**Solution:**
- Integrate 2Captcha or Anti-Captcha API as optional service
- When CAPTCHA detected, queue for solving service
- If solving fails, flag for manual completion with screenshot
- Track CAPTCHA encounter rate per form type

---

## Implementation Priority

### Phase 1: Ship It (Week 1)
1. Fix missing dependencies (`googleapis`, `playwright`)
2. Encrypt Gmail OAuth credentials
3. Add input validation on config updates
4. Add scan/pitch mutex (prevent concurrent runs)
5. Return `runId` from scan trigger
6. Wire the contact form to backend
7. Merge feature from `dev.3.12.26` to main

### Phase 2: Intelligence (Weeks 2-3)
8. Podcast Index API integration
9. Dynamic platform stats in pitches
10. Per-prospect research before pitching
11. Pitch quality self-scoring
12. Automated follow-up scheduling
13. Outreach funnel dashboard
14. Populate `tokensUsed` and `costUsd` in agent runs

### Phase 3: Full Cycle (Weeks 4-5)
15. Response detection from Gmail inbox
16. Booking/scheduling workflow
17. Weekly PR summary email
18. Press kit / media page
19. Prospect relationship timeline
20. Conversation Intelligence → PR angles pipeline

### Phase 4: Scale (Weeks 6-8)
21. Competitor media monitoring
22. Prospect enrichment pipeline
23. Pitch A/B testing
24. Smart prioritization queue
25. Creator application flow
26. Search query rotation + AI-generated queries
27. Best time to pitch analysis

---

*This roadmap covers improvements identified from analysis of the complete PR Agent codebase on `dev.3.12.26`. All recommendations are additive — no existing functionality needs to be removed.*
