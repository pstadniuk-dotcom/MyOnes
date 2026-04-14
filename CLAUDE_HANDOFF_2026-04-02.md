# Claude Handoff

Last updated: 2026-04-02

## What this is

This is a detailed operator handoff for Claude Code, assembled from:

- repo instructions and docs
- repository memory files
- current git/worktree state
- recovered local Copilot chat session logs stored outside the repo

This is still not a byte-for-byte transcript of every prior conversation, but it is materially better than a generic summary. It includes reconstructed prior workstreams, known bugs, migration discussions, and current in-progress areas.

If Claude needs the raw historical chat logs, the important local paths discovered during this session are:

- `C:\Users\Pete\AppData\Roaming\Code\User\workspaceStorage\a792a92aa4c9cbe5acc0d3f1cc1c792a\chatSessions\*.jsonl`
- `C:\Users\Pete\AppData\Roaming\Code\User\workspaceStorage\a792a92aa4c9cbe5acc0d3f1cc1c792a\GitHub.copilot-chat\debug-logs\6b39f54c-debc-454c-a805-02fe501ffe2f`

Those files are outside the repo, but they do contain real prior session data.

## Immediate repo state

Current git status when this handoff was expanded:

- Branch: `dev-3.25.26`
- Tracking: `origin/dev-3.25.26`
- The worktree is dirty. Do not assume a clean branch.

Tracked modified files at the time of capture:

- `client/src/App.tsx`
- `client/src/index.css`
- `client/src/shared/components/AdminLayout.tsx`
- `package-lock.json`
- `package.json`
- `server/api/routes/index.ts`
- `server/index.ts`
- `server/routes.ts`
- `shared/schema.ts`

Untracked files at the time of capture included:

- this handoff file itself
- `.firecrawl/`
- new UGC admin files:
	- `client/src/pages/admin/UgcStudioPage.tsx`
	- `server/api/controller/ugc.controller.ts`
	- `server/api/routes/ugc.routes.ts`
	- `server/utils/ugcService.ts`
	- `server/utils/ugcAudioService.ts`
	- `scripts/restyle-ugc.mjs`
	- `scripts/restyle.cjs`
	- `scripts/restyle.js`
- attached UGC frame images
- several new ingredient images under `client/public/Ones LIfestyle Images/Ingredients/`

Important implication: UGC Ad Studio work appears to be active, substantial, and not fully committed yet. Do not overwrite or normalize those files casually.

## Product overview

ONES AI is a personalized supplement platform. The core promise is not "generic vitamins with AI branding"; it is a custom-manufactured supplement formula assembled for an individual user based on chat intake, health profile, optional blood work, and optional wearable data.

High-level end-user flow:

1. User signs up and authenticates with JWT-based auth.
2. User fills out health profile data.
3. User chats with the AI practitioner.
4. User can upload lab reports and connect wearable devices.
5. AI proposes a formula from the approved ingredient catalog.
6. Backend validates ingredients, dose ranges, and capsule budgets.
7. Formula is saved and versioned.
8. User checks out for a 2-month supply.
9. Dashboard, wearables, and future refills continue to update the user experience.

Core product positioning:

- Personalized formula, not mass-market blend
- One custom capsule system replacing many separate bottles
- AI consultation and data-driven formulation
- Optional blood work and wearable data integration
- Formula can evolve over time with changing health inputs

## Stack and repo architecture

Core stack:

- React frontend in `client/`
- Express backend in `server/`
- PostgreSQL via Drizzle ORM
- Shared schema/types in `shared/`
- Vite + Tailwind + shadcn/ui
- TanStack Query on the client
- OpenAI and Anthropic support on the backend

Monorepo structure:

- `client/` - frontend app
- `server/` - API routes, controllers, services, schedulers, integrations
- `shared/` - database schema, zod validators, ingredients catalog, shared types
- `migrations/` - Drizzle migrations
- `docs/` - audits, deployment docs, changelogs, operational references
- `seo-agent-starter/` - separate SEO automation starter code that was later discussed as extractable into a different workspace

Important aliases:

- `@/` -> `client/src/`
- `@shared` -> `shared/`
- `@assets` -> `attached_assets/`

Core files that matter repeatedly:

- `shared/schema.ts`
- `shared/ingredients.ts`
- `server/routes.ts`
- `server/storage.ts`
- `server/prompt-builder.ts`
- `client/src/App.tsx`
- `client/src/contexts/AuthContext.tsx`

## Development commands

- `npm run dev` - local dev server on port 5000
- `npm run check` - TypeScript checking
- `npm run test` - Vitest
- `npm run test:e2e` - Playwright
- `npm run db:push` - push Drizzle schema changes
- `npm run test:db` - test database connection

Critical schema rule:

- Any schema change requires updating `shared/schema.ts` and then running `npm run db:push`.

## Critical business rules

These are not optional implementation details.

- Ingredient truth source is `shared/ingredients.ts`.
- Formula generation must validate against approved ingredients and dosing rules.
- Capsule budgets are enforced server-side.
- The formula capsule tiers are 6 / 9 / 12 capsules per day with 550mg per capsule budget logic.
- Protected routes require auth middleware; admin routes require admin middleware.
- Do not scatter dosage logic across the codebase.
- Runtime AI provider/model selection is configurable via admin settings persisted in `app_settings`.

## How the platform works by subsystem

### AI consultation and formula generation

This is the heart of the app.

- Chat endpoint: `POST /api/chat`
- Streaming: OpenAI native streaming, Anthropic simulated via chunking
- Prompt assembly: `server/prompt-builder.ts`
- Context sources: health profile, active formula, lab data, conversation history, discontinued ingredient context when relevant

Critical flow:

1. AI returns structured formula JSON with bases/additions.
2. Backend normalizes names and validates ingredients against the approved catalog.
3. Backend enforces range rules and capsule budgets.
4. Formula is saved in the database with version tracking.

Important repo memory detail:

- The discontinued-ingredients system is real and multi-layered.
- If catalog sync detects discontinued ingredients, formulas can be flagged for reformulation.
- Checkout and autoship are gated when a formula needs reformulation.
- The AI prompt context is also aware of discontinued ingredients and annotates them.

### Ingredient system

The ingredient catalog is not just content; it is business logic.

- System supports and individual ingredients live in `shared/ingredients.ts`.
- Capsule budget enforcement is server-side.
- Do not hardcode supplement composition outside the approved systems.
- Formula quality and safety depend on respecting this catalog.

### Authentication and authorization

- JWT-based auth
- Tokens generated in server route logic and stored client-side in AuthContext/localStorage
- `requireAuth` and `requireAdmin` are mandatory for protected behavior
- Password hashing uses bcrypt with 10 salt rounds

### Dashboard and profile completion

There was a prior conversation specifically about profile-completeness navigation.

Recovered prior work indicates that checklist and next-action links were changed to deep-link into the health profile sections rather than dumping users onto generic personal info pages.

Historical target routes included query params like:

- `?tab=health&section=basic-info`
- `?tab=health&section=vital-signs`
- `?tab=health&section=lifestyle-factors`
- `?tab=health&section=risk-factors`

The prior session was also moving toward auto-expanding the corresponding accordion section on `ProfilePage.tsx`.

### Billing, checkout, and subscriptions

Current production billing implementation is Stripe-based.

Important repo memory summary:

- Checkout entry point is in `MyFormulaPage.tsx`
- Server flow runs through billing routes/controller/service
- Stripe checkout session creation happens server-side
- Stripe webhooks create orders and trigger manufacturer order placement

Known checkout bug that was explicitly captured in repo memory:

- `enableAutoShip` is sent by the client but ignored by the server.
- This means users cannot truly control auto-ship during initial checkout.
- The intended fix path is wiring it into autoship creation after order completion.

Other known billing gaps:

- payment-failure/dunning email behavior still has TODOs
- manufacturer-order retry behavior is limited
- webhook timing/idempotency remains important

Pricing memory:

- `MARGIN_MULTIPLIER = 1.65` in manufacturer pricing logic
- members get a 15% discount
- pricing is refreshed frequently enough that quote-expiration UI is not the primary concern on the client

### Stripe to EasyPayDirect migration context

This has been discussed, audited, and planned, but should not be assumed complete.

Recovered and memory-backed conclusions:

- Stripe is deeply embedded across customers, checkout sessions, subscriptions, autoship, payment methods, webhooks, and off-session charging.
- There is a repository memory file dedicated to the Stripe integration audit and EasyPayDirect migration surface area.
- The recommended migration approach is an abstraction/provider strategy, not a direct search-and-replace.

Important implication:

- If Claude is asked to help with EasyPayDirect, first read `/memories/repo/stripe-integration-audit.md` and map all Stripe coupling points before changing code.

### Wearables

Wearables are a real subsystem, not just futureware.

- OAuth flows exist for providers like Fitbit, Oura, and Whoop
- tokens are encrypted
- schedulers refresh tokens and fetch biometric data
- dashboard features consume biometric information, including health-pulse style intelligence

Recovered prior conversation themes show at least two wearable-specific problem threads:

1. The customization modal for health metrics was defaulting to a fixed count instead of reflecting currently displayed metrics.
2. Health Pulse sometimes reported "link a wearable device" even when a wearable was already linked.

The second issue triggered a deeper investigation across:

- wearables routes
- controller
- service
- repository
- Junction integration
- biometric-data schema
- pulse-intelligence cache and query invalidation behavior

The visible recovered excerpt did not include the final diagnosis, so if Claude returns to that area it should reopen the recovered JSONL session or trace the full wearables path again.

### File uploads and lab analysis

- Object storage abstraction exists for file uploads
- lab reports are important to the product story and feed AI analysis paths
- audit logging exists for file operations
- HIPAA-adjacent concerns show up in architecture, even if the app is not formally described here as a full HIPAA product

### Admin and operational docs

There are multiple repo docs and audits that matter more than most chat recollections because they were written after deeper inspection. Notable files used during this handoff include:

- `FULL_STACK_AUDIT_V2.md`
- `docs/admin-api-audit.md`
- `docs/admin-dashboard-audit-3.7.26.md`
- `docs/DEPLOYMENT_GUIDE.md`
- `docs/QUICKSTART.md`
- `docs/CHANGELOG-dev-3.9.26.md`
- `docs/CHANGELOG-dev-3.10.26.md`
- `PR_AGENT_IMPROVEMENTS.md`

### UGC Ad Studio

This is the most obvious active area in the current worktree.

Current implementation status from repo memory plus current worktree:

- Route: `/admin/ugc-studio`
- API prefix: `/api/admin/ugc/*`
- Main page: `client/src/pages/admin/UgcStudioPage.tsx`
- Backing files:
	- `server/api/routes/ugc.routes.ts`
	- `server/api/controller/ugc.controller.ts`
	- `server/utils/ugcService.ts`
	- `server/utils/ugcAudioService.ts`
	- `shared/schema.ts`

Database model coverage:

- `ugc_campaigns`
- `ugc_research`
- `ugc_hooks`
- `ugc_scripts`
- `ugc_characters`
- `ugc_generated_images`
- `ugc_video_scenes`
- `ugc_brand_assets`

Implemented pipeline:

1. Create ONES-specific campaign with baked-in product context.
2. Generate product research and market research.
3. Generate or manually curate hooks.
4. Generate scene-by-scene scripts.
5. Create characters.
6. Generate/review character images.
7. Generate Kling-style video prompts.
8. Generate videos.
9. Manage brand assets.

Recent advanced UGC additions confirmed in repo memory:

- TTS voiceover plus fal.ai lip-sync pipeline
- `POST /api/admin/ugc/video/:id/voiceover`
- `audioUrl`, `mergedVideoUrl`, `voiceId` on video scenes
- frontend prefers `mergedVideoUrl` when available

Recent character-consistency addition confirmed in repo memory:

- PuLID-based face consistency
- character-level `referenceImageUrl` / `referenceImageId`
- approved image can be locked as the face anchor
- future images preserve identity across angles/scenes
- video start frames prefer the reference image when available

Known UGC gaps still called out in earlier exploration and repo memory:

- no live TikTok scraping/viral-video analysis loop
- no fully implemented B-roll generation workflow
- no strong performance analytics feedback loop
- generation remains dependent on external provider cost/queue behavior
- prompt sophistication is good but still below a full ad-ops research system

Important historical conclusion from a prior session:

- ONES UGC Studio already aligns heavily with the Taysthetic-style AI UGC framework in spirit and structure.
- Main missing pieces were real-world viral video scraping, richer B-roll flow, and a more complete feedback/performance layer.

### SEO agent starter and separate website-builder environment

One earlier conversation was not about ONES product code directly; it was about extracting useful internal tooling into a separate SMB site-building environment on another drive.

Recovered conclusions:

- `seo-agent-starter/` contains meaningful SEO automation code
- `.github/agents/frontend-design.agent.md` was an important discovered file in that earlier exploration
- the user was planning a separate workspace on `D:\web-clients\` for scraping client sites, redesigning them, and previewing/share-linking builds

This matters because:

- not every repo/tooling question in previous chats was meant to modify ONES itself
- some earlier requests were about reusing ONES agent workflows elsewhere

## Recovered prior conversation threads

These summaries came from actual local `chatSessions/*.jsonl` files.

### 1. UGC framework inquiry

Recovered session ID:

- `b287a512-c168-46c8-9581-1e48a22c3c37.jsonl`

User intent in that prior session:

- determine whether ONES UGC Studio was effectively using the Taysthetic AI UGC Ad Prompt Pack style framework

Recovered conclusion:

- yes, largely
- ONES already had research, hooks, scripts, characters, generated images, and Kling prompt flow
- main missing pieces were live TikTok scraping, B-roll generation, and richer performance feedback

### 2. Project status, loose ends, and production readiness review

Recovered session ID:

- `df7e80d2-3a04-4d3d-b8a4-38bc950e8eb6.jsonl`

Recovered themes:

- user asked where the project stood and what loose ends remained
- Stripe to EasyPayDirect migration was part of the discussion context
- there was also an admin/production-readiness review angle

Recovered concrete findings from that prior session:

- branch had been ahead of origin at the time of that older conversation
- compile/lint state looked okay then
- untracked ingredient images were noted then too
- `enableAutoShip` was identified as not wired end-to-end
- dunning/payment-failure work was still pending

Treat those findings as historically useful, not necessarily current without revalidation.

### 3. Separate VS Code environment for web design

Recovered session ID:

- `35df7f3d-e80d-4836-9f51-29d4519d348b.jsonl`

Recovered themes:

- user wanted to reuse the repo's SEO agent functionality and the frontend-design agent in a separate environment for SMB website work
- exploration pulled apart `seo-agent-starter` and identified the frontend-design agent definition
- the plan was a different workspace, not changes to ONES production app code

### 4. Profile completeness button linking issue

Recovered session ID:

- `ad725336-6d73-4fe0-af3f-305ec05176a3.jsonl`

Recovered work:

- dashboard/profile-completion actions were being redirected more precisely into health profile sections
- routing/query param work was done at both server checklist and dashboard action levels
- follow-up work was moving toward expanding the correct profile accordion when navigated in

### 5. Wearables health metrics customization issue

Recovered session ID:

- `f4e85f8c-f26f-4e1f-9036-f1c7f868daf7.jsonl`

Recovered theme:

- the health metrics customization modal defaulted to a fixed "7 selected" state instead of mirroring the metrics actually shown

Recovered limitation:

- only the prompt/problem statement was visible in the excerpt reviewed during this handoff session; the repair details were not captured in the truncated read

### 6. Health Pulse wearable connection issue

Recovered session ID:

- `7270a4cf-440b-4a8c-add9-bd009e5c4939.jsonl`

Recovered theme:

- Health Pulse was telling the user to link a wearable even though one was already linked

Recovered investigation scope:

- dashboard card logic
- wearables page
- wearables routes/controller/service/repository
- Junction provider state
- biometric data model
- health pulse intelligence endpoint and caching/query invalidation behavior

Recovered limitation:

- the excerpt visible during this handoff build showed a deep investigation but not the final plain-English diagnosis

## Known open items and risk areas

These are the major high-signal risks or unfinished areas repeatedly surfaced by docs, memory, or recovered chat logs.

1. The worktree is currently dirty, and UGC-related files appear actively in progress and uncommitted.
2. `enableAutoShip` is known to be ignored in the current checkout flow unless already fixed after the repo memory snapshot.
3. Stripe is still deeply integrated; EasyPayDirect migration should be treated as a major refactor with payment-provider abstraction, not a small patch.
4. Payment-failure handling/dunning is incomplete.
5. Wearables have had at least two user-facing logic issues in prior sessions and may still need targeted verification.
6. UGC still lacks some "full studio" features like live trend scraping, richer B-roll, and performance feedback loops.
7. Discontinued ingredient protection exists and is important; do not accidentally bypass checkout/autoship reformulation gates.
8. Admin and full-stack audits exist and should be treated as live references for production hardening.

## Recommended first reads by task

If Claude is continuing UGC work:

1. `client/src/pages/admin/UgcStudioPage.tsx`
2. `server/api/controller/ugc.controller.ts`
3. `server/utils/ugcService.ts`
4. `server/utils/ugcAudioService.ts`
5. `server/api/routes/ugc.routes.ts`
6. `/memories/repo/ugc-studio.md`
7. `/memories/repo/ugc-character-consistency.md`

If Claude is continuing billing or payment migration work:

1. `/memories/repo/checkout-flow.md`
2. `/memories/repo/stripe-integration-audit.md`
3. `/memories/repo/pricing.md`
4. `server/modules/billing/billing.service.ts`
5. `server/modules/billing/autoship.service.ts`
6. `client/src/pages/MyFormulaPage.tsx`

If Claude is continuing wearables/dashboard work:

1. relevant wearables routes/controller/service/repository files
2. dashboard health pulse components
3. recovered `chatSessions` JSONL files for the two wearable-related sessions

If Claude needs broad platform orientation first:

1. `.github/copilot-instructions.md`
2. `FULL_STACK_AUDIT_V2.md`
3. `docs/QUICKSTART.md`
4. `docs/DEPLOYMENT_GUIDE.md`
5. `shared/schema.ts`
6. `shared/ingredients.ts`

## Source material used for this handoff

Repo files and docs consulted or previously mined in this session:

- `.github/copilot-instructions.md`
- `package.json`
- `client/src/pages/admin/UgcStudioPage.tsx`
- `DEMO_SCRIPT.md`
- `FULL_STACK_AUDIT_V2.md`
- `docs/admin-api-audit.md`
- `docs/admin-dashboard-audit-3.7.26.md`
- `docs/QUICKSTART.md`
- `docs/CHANGELOG-dev-3.9.26.md`
- `docs/CHANGELOG-dev-3.10.26.md`
- `docs/DEPLOYMENT_GUIDE.md`
- `PR_AGENT_IMPROVEMENTS.md`
- product brief material in `attached_assets/`

Repository memory files consulted or summarized:

- `/memories/repo/ugc-studio.md`
- `/memories/repo/ugc-character-consistency.md`
- `/memories/repo/checkout-flow.md`
- `/memories/repo/pricing.md`
- `/memories/repo/stripe-integration-audit.md`
- `/memories/repo/discontinued-ingredients-system.md`

Recovered local chat session files summarized here:

- `b287a512-c168-46c8-9581-1e48a22c3c37.jsonl`
- `df7e80d2-3a04-4d3d-b8a4-38bc950e8eb6.jsonl`
- `35df7f3d-e80d-4836-9f51-29d4519d348b.jsonl`
- `ad725336-6d73-4fe0-af3f-305ec05176a3.jsonl`
- `f4e85f8c-f26f-4e1f-9036-f1c7f868daf7.jsonl`
- `7270a4cf-440b-4a8c-add9-bd009e5c4939.jsonl`

## Final note for Claude

This repo has enough durable documentation to rebuild context, but the recovered local JSONL sessions add important nuance:

- what the user had already asked for
- which bugs had already been investigated
- which directions were historical planning versus active code changes

If you need more than this file provides, the next best move is not to guess. Open the relevant `chatSessions/*.jsonl` file directly and extract the exact thread for the subsystem you are touching.