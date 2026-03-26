# SEO Article Agent — Starter Kit

A standalone, runnable SEO article generation system powered by AI (Claude / GPT-4o), with automated scheduling, keyword research integration, AI image generation, and full REST API.

> **This is a white-label starter.** Search for `CUSTOMIZE` comments throughout the codebase to adapt the system prompts, brand name, competitors, and tone for your brand.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Admin Dashboard                       │
│  (Your frontend — call these REST endpoints)            │
└────────────┬────────────────────────────────────────────┘
             │  REST API
┌────────────▼────────────────────────────────────────────┐
│  Express Server (src/server.ts)                          │
│  ├── /api/blog/*  — public + admin routes                │
│  ├── blogScheduler — daily cron (02:00 UTC)              │
│  └── sitemapService — Google + Bing ping                 │
├──────────────────────────────────────────────────────────┤
│  AI Layer                                                │
│  ├── Anthropic Claude Sonnet 4.5 (preferred)             │
│  ├── OpenAI GPT-4o (fallback)                            │
│  ├── fal.ai Nano Banana 2 (image generation)             │
│  └── GPT-4o-mini (image keyword extraction)              │
├──────────────────────────────────────────────────────────┤
│  Data Layer                                              │
│  ├── PostgreSQL (Supabase or any PG)                     │
│  ├── Drizzle ORM                                         │
│  └── Supabase Storage (image hosting)                    │
└──────────────────────────────────────────────────────────┘
```

---

## Quick Start

### 1. Install dependencies

```bash
cd seo-agent-starter
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your actual keys
```

**Required keys:**
| Variable | Source |
|---|---|
| `DATABASE_URL` | Supabase → Settings → Database → Connection string |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `OPENAI_API_KEY` | platform.openai.com → API Keys |
| `FAL_KEY` | fal.ai → Dashboard → Keys |
| `SUPABASE_URL` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → Service Role |

**Optional:**
| Variable | Purpose |
|---|---|
| `DATAFORSEO_LOGIN` | Keyword research (scripts/keyword-research.cjs) |
| `DATAFORSEO_PASSWORD` | Keyword research |
| `BRAND_NAME` | Used in AI prompts (default: your brand) |
| `SITE_URL` | Base URL for sitemaps (default: https://yourbrand.com) |
| `ADMIN_API_KEY` | Protects admin routes via `x-admin-key` header |

### 3. Push database schema

```bash
npx drizzle-kit push
```

This creates three tables: `blog_posts`, `keyword_data`, `app_settings`.

### 4. Add your topic clusters

Edit `shared/topic-clusters.ts` — add your brand's article topics:

```typescript
{
  tier: 'ingredient',
  title: 'Magnesium Glycinate Benefits for Sleep and Anxiety',
  category: 'Supplements',
  primaryKeyword: 'magnesium glycinate benefits',
  secondaryKeywords: [
    'magnesium for sleep',
    'best magnesium for anxiety',
    'magnesium glycinate vs citrate',
  ],
}
```

### 5. (Optional) Run keyword research

```bash
node scripts/keyword-research.cjs
```

This calls DataForSEO to get search volume and competition data for all your keywords, then saves `data/keyword-enrichment.json`. The scheduler uses this to prioritize high-value, low-competition topics first.

### 6. Start the server

```bash
npx tsx src/server.ts
```

Server runs on `http://localhost:3000`.

---

## API Reference

### Public Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/blog` | List published posts (paginated) |
| GET | `/api/blog/categories` | List all categories |
| GET | `/api/blog/search?q=term` | Full-text search |
| GET | `/api/blog/:slug` | Single post + related posts |
| GET | `/api/blog/sitemap.xml` | Combined XML sitemap |
| GET | `/api/blog/sitemap-blog.xml` | Blog sitemap with image entries |

### Admin Endpoints

All admin routes require `x-admin-key` header matching `ADMIN_API_KEY` env var.

| Method | Path | Description |
|---|---|---|
| POST | `/api/blog/admin/generate` | Generate article with AI |
| GET | `/api/blog/admin/all` | List all posts (incl. unpublished) |
| GET | `/api/blog/admin/:id` | Get post by ID |
| PATCH | `/api/blog/admin/:id` | Update post fields |
| PATCH | `/api/blog/admin/:id/publish` | Toggle published status |
| DELETE | `/api/blog/admin/:id` | Delete post |
| POST | `/api/blog/admin/:id/ai-revise` | AI-revise existing article |
| GET | `/api/blog/admin/auto-gen/settings` | Get scheduler settings |
| PATCH | `/api/blog/admin/auto-gen/settings` | Update scheduler settings |
| POST | `/api/blog/admin/auto-gen/run` | Trigger manual generation run |

### Example: Generate an article

```bash
curl -X POST http://localhost:3000/api/blog/admin/generate \
  -H "Content-Type: application/json" \
  -H "x-admin-key: YOUR_ADMIN_KEY" \
  -d '{
    "title": "Ashwagandha Benefits for Stress and Cortisol",
    "category": "Supplements",
    "keywords": "ashwagandha benefits",
    "secondaryKeywords": "ashwagandha for cortisol, KSM-66 dosage, adaptogen supplements",
    "tone": "informative"
  }'
```

### Example: Enable auto-generation

```bash
curl -X PATCH http://localhost:3000/api/blog/admin/auto-gen/settings \
  -H "Content-Type: application/json" \
  -H "x-admin-key: YOUR_ADMIN_KEY" \
  -d '{
    "enabled": true,
    "articlesPerDay": 10,
    "autoPublish": true
  }'
```

---

## File Structure

```
seo-agent-starter/
├── .env.example                    # Environment variables template
├── package.json                    # Dependencies
├── tsconfig.json                   # TypeScript config
├── drizzle.config.ts               # Drizzle ORM database config
├── README.md                       # This file
│
├── shared/
│   ├── schema.ts                   # Database schema (blog_posts, keyword_data, app_settings)
│   └── topic-clusters.ts           # Article topics + keywords (YOUR CONTENT HERE)
│
├── src/
│   ├── server.ts                   # Express entry point
│   ├── db.ts                       # PostgreSQL + Drizzle connection
│   │
│   ├── blog/
│   │   └── blog.repository.ts      # Database CRUD (20+ methods)
│   │
│   ├── routes/
│   │   ├── blog.routes.ts          # Express router (public + admin)
│   │   └── blog.controller.ts      # Request handlers
│   │
│   └── services/
│       ├── blogGenerationService.ts # AI article generation engine
│       ├── blogImageService.ts      # fal.ai image generation pipeline
│       ├── blogScheduler.ts         # Automated daily scheduler
│       └── sitemapService.ts        # XML sitemap builder + search engine ping
│
├── scripts/
│   └── keyword-research.cjs        # DataForSEO keyword enrichment script
│
└── data/                           # Generated data (gitignored)
    └── keyword-enrichment.json     # Keyword volume/KD/CPC data
```

---

## Customization Checklist

1. **Brand name**: Set `BRAND_NAME` in `.env` — used in meta titles and AI prompts
2. **Site URL**: Set `SITE_URL` in `.env` — used in sitemaps and Schema.org data
3. **System prompts**: Edit `src/services/blogGenerationService.ts` → `SYSTEM_PROMPT` constant
4. **Topic clusters**: Replace examples in `shared/topic-clusters.ts` with your topics
5. **Auth middleware**: Replace the placeholder `requireAdmin` in `src/routes/blog.routes.ts`
6. **Image style**: Edit the prompt template in `src/services/blogImageService.ts`
7. **Static sitemap URLs**: Update `src/services/sitemapService.ts` with your routes
8. **Competitor list**: Update competitor references in the system prompt if doing comparison articles

---

## Cost Estimates

| Service | Cost per article | Notes |
|---|---|---|
| Claude Sonnet 4.5 | ~$0.30-0.50 | ~4K input + ~4K output tokens |
| GPT-4o (alternative) | ~$0.15-0.25 | Slightly cheaper, less consistent on long-form |
| fal.ai image | ~$0.01 | Nano Banana 2 model |
| GPT-4o-mini (keywords) | ~$0.001 | Image keyword extraction |
| DataForSEO | ~$0.0015/keyword | One-time research run |
| **Total per article** | **~$0.32-0.52** | |

At 20 articles/day: ~$6-10/day, ~$200-300/month for 600+ SEO-optimized articles.

---

## How the Scheduler Works

1. Cron fires daily at 02:00 UTC (configurable)
2. Checks `app_settings` table — if `blog_auto_generate.enabled` is false, skips
3. Loads unused topics from `topic-clusters.ts` (excludes already-written titles)
4. Enriches with keyword data (volume, KD) from DB or fallback JSON
5. Calculates priority: `score = volume / max(kd, 1)` — high volume + low competition first
6. Shuffles top candidates for variety, picks N articles
7. For each: generates article → saves to DB → generates image → updates post
8. Safety: 3 consecutive failures = abort, 3s throttle between calls, slug collision check
9. Pings Google + Bing sitemap indexers after successful generation

---

## License

This starter kit is provided for integration purposes. Adapt and extend as needed for your project.
