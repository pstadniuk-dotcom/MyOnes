# SEO Article Generation Agent — Full Implementation Guide

> **Purpose:** This document provides a complete, step-by-step guide to building an automated SEO article generation system. It covers keyword research via DataForSEO, AI-powered article creation, structured data (Schema.org), image generation, automated scheduling, and all SEO optimizations used in production.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites & API Keys](#2-prerequisites--api-keys)
3. [Step 1: Database Schema](#3-step-1-database-schema)
4. [Step 2: Topic Cluster Planning](#4-step-2-topic-cluster-planning)
5. [Step 3: Keyword Research via DataForSEO](#5-step-3-keyword-research-via-dataforseo)
6. [Step 4: AI Article Generation Service](#6-step-4-ai-article-generation-service)
7. [Step 5: SEO Optimizations Breakdown](#7-step-5-seo-optimizations-breakdown)
8. [Step 6: AI Image Generation](#8-step-6-ai-image-generation)
9. [Step 7: Automated Scheduling](#9-step-7-automated-scheduling)
10. [Step 8: API Routes & Admin Dashboard](#10-step-8-api-routes--admin-dashboard)
11. [Step 9: Sitemap & Search Engine Pinging](#11-step-9-sitemap--search-engine-pinging)
12. [Step 10: Public Blog Frontend](#12-step-10-public-blog-frontend)
13. [Full Code Reference](#13-full-code-reference)
14. [Cost Breakdown](#14-cost-breakdown)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    SEO Article Generation System                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │  Topic Clusters   │───▶│ Keyword Research  │                  │
│  │  (500+ planned    │    │ (DataForSEO API)  │                  │
│  │   articles)       │    └────────┬─────────┘                   │
│  └──────────────────┘             │                              │
│                                    ▼                              │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │  Priority Scorer  │◀──│  keyword_data DB  │                  │
│  │  volume / KD      │    │  (volume, KD,     │                  │
│  └────────┬─────────┘    │   CPC per keyword)│                  │
│           │               └──────────────────┘                   │
│           ▼                                                      │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │  AI Article Gen   │───▶│  PostgreSQL       │                  │
│  │  (Claude/GPT-4o)  │    │  blog_posts table │                  │
│  └────────┬─────────┘    └──────────────────┘                   │
│           │                                                      │
│           ▼                                                      │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │  Image Gen        │───▶│  Supabase Storage │                  │
│  │  (fal.ai)         │    │  blog-images/     │                  │
│  └──────────────────┘    └──────────────────┘                   │
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │  Cron Scheduler   │    │  Sitemap Ping     │                  │
│  │  (02:00 UTC daily)│───▶│  Google + Bing    │                  │
│  └──────────────────┘    └──────────────────┘                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Tech Stack:**
- **Backend:** Node.js / Express / TypeScript
- **Database:** PostgreSQL with Drizzle ORM
- **AI Models:** Anthropic Claude Sonnet 4.5 (preferred) or OpenAI GPT-4o
- **Image Gen:** fal.ai Nano Banana 2 (~$0.01/image)
- **Keyword Data:** DataForSEO Google Ads Search Volume API
- **Image Storage:** Supabase Storage (or any S3-compatible bucket)
- **Scheduling:** node-cron

---

## 2. Prerequisites & API Keys

You'll need accounts and API keys for:

| Service | Purpose | Env Variable | Cost |
|---------|---------|-------------|------|
| **Anthropic** | AI article generation (preferred) | `ANTHROPIC_API_KEY` | ~$0.30-0.50/article |
| **OpenAI** | Alternative AI provider + keyword extraction for images | `OPENAI_API_KEY` | ~$0.20-0.40/article |
| **DataForSEO** | Keyword volume, difficulty, CPC data | `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD` | ~$0.0015/keyword |
| **fal.ai** | Photorealistic blog images | `FAL_KEY` | ~$0.01/image |
| **Supabase** | Image hosting + PostgreSQL database | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Free tier works |

### NPM Dependencies

```bash
npm install openai @anthropic-ai/sdk @fal-ai/client jsonrepair node-cron drizzle-orm dotenv
npm install -D drizzle-kit @types/node
```

---

## 3. Step 1: Database Schema

Create two tables: `blog_posts` for articles and `keyword_data` for search volume data.

### blog_posts Table

```typescript
// schema.ts — using Drizzle ORM
import { pgTable, varchar, text, integer, boolean, timestamp, decimal, json } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

export const blogPosts = pgTable("blog_posts", {
  id:                varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug:              varchar("slug", { length: 255 }).notNull().unique(),
  title:             varchar("title", { length: 500 }).notNull(),
  metaTitle:         varchar("meta_title", { length: 70 }),        // SERP title (52-62 chars ideal)
  metaDescription:   varchar("meta_description", { length: 160 }), // SERP description (150-160 chars)
  excerpt:           text("excerpt"),                               // 2-3 sentence hook
  content:           text("content").notNull(),                     // Full markdown article body
  category:          varchar("category", { length: 100 }),
  tags:              text("tags").array(),                          // e.g. ["ashwagandha", "cortisol", "adaptogens"]
  tier:              varchar("tier", { length: 50 }),               // pillar|system|ingredient|comparison|symptom|lab|lifestyle
  primaryKeyword:    varchar("primary_keyword", { length: 255 }),
  secondaryKeywords: text("secondary_keywords").array(),
  wordCount:         integer("word_count"),
  readTimeMinutes:   integer("read_time_minutes"),
  schemaJson:        text("schema_json"),                           // JSON-LD structured data (Article + FAQ + HowTo)
  internalLinks:     text("internal_links").array(),                // ["/blog/slug-1", "/blog/slug-2"]
  featuredImage:     varchar("featured_image", { length: 500 }),    // Hosted image URL
  isPublished:       boolean("is_published").default(true).notNull(),
  publishedAt:       timestamp("published_at").defaultNow().notNull(),
  updatedAt:         timestamp("updated_at").defaultNow().notNull(),
  authorName:        varchar("author_name", { length: 255 }).default('Editorial Team'),
  viewCount:         integer("view_count").default(0),
});

export const insertBlogPostSchema = createInsertSchema(blogPosts).omit({
  id: true, updatedAt: true, viewCount: true
});
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;
```

### keyword_data Table

```typescript
export const keywordData = pgTable("keyword_data", {
  keyword:     varchar("keyword", { length: 500 }).primaryKey(),
  volume:      integer("volume").notNull().default(0),           // Monthly US search volume
  kd:          integer("kd").notNull().default(0),               // Keyword difficulty 0-100
  cpc:         decimal("cpc", { precision: 8, scale: 2 }).notNull().default('0'), // Cost-per-click USD
  competition: varchar("competition", { length: 20 }),           // LOW / MEDIUM / HIGH
  source:      varchar("source", { length: 50 }).default('dataforseo'),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
```

Run `npx drizzle-kit push` to create these tables in your database.

---

## 4. Step 2: Topic Cluster Planning

Before generating articles, you need a master list of planned topics organized by tier. This is the editorial calendar that drives everything.

### Topic Cluster Structure

```typescript
// topic-clusters.ts

export interface TopicCluster {
  title: string;
  category: string;
  tier: 'pillar' | 'system' | 'ingredient' | 'comparison' | 'symptom' | 'lab' | 'lifestyle';
  primaryKeyword: string;
  secondaryKeywords: string[];
  volume?: number;   // Populated by keyword research script
  kd?: number;       // Populated by keyword research script
  cpc?: number;      // Populated by keyword research script
}
```

### Tier Definitions

| Tier | Purpose | Word Count | Examples |
|------|---------|-----------|----------|
| **pillar** | Broad authority pages, top-of-funnel | 2000-2500 | "Complete Guide to Personalized Supplements" |
| **system** | Your proprietary products/features | 1800-2200 | "Adrenal Support: Clinical Evidence" |
| **ingredient** | Individual ingredient deep-dives | 1800-2200 | "Ashwagandha KSM-66: Dosage & Evidence" |
| **comparison** | Brand/product/form comparisons | 1800-2200 | "Magnesium Glycinate vs Citrate" |
| **symptom** | Symptom-first discovery intent | 1800-2200 | "Why Am I Always Tired?" |
| **lab** | Lab marker / biomarker education | 1800-2200 | "What High CRP Means" |
| **lifestyle** | Biohacking, sleep, stress, longevity | 1800-2200 | "Sleep Optimization Protocol" |

### Example Topic Clusters

```typescript
export const TOPIC_CLUSTERS: TopicCluster[] = [
  // PILLAR — broad authority pages
  {
    tier: 'pillar',
    title: 'The Complete Guide to Personalized Supplements: How to Build a Formula for Your Biology',
    category: 'Personalized Health',
    primaryKeyword: 'personalized supplements',
    secondaryKeywords: ['custom supplement formula', 'blood test supplements', 'personalized nutrition']
  },

  // INGREDIENT — deep-dive on a single ingredient
  {
    tier: 'ingredient',
    title: 'Ashwagandha (KSM-66): Stress, Cortisol, and the Clinical Data on 600 mg',
    category: 'Supplements',
    primaryKeyword: 'ashwagandha KSM-66',
    secondaryKeywords: ['ashwagandha cortisol', 'ashwagandha dosage', 'adaptogen for stress']
  },

  // COMPARISON — product form comparisons
  {
    tier: 'comparison',
    title: 'Magnesium Glycinate vs Citrate vs Threonate: Choosing the Right Form',
    category: 'Supplements',
    primaryKeyword: 'magnesium glycinate vs citrate',
    secondaryKeywords: ['best form of magnesium', 'magnesium for sleep', 'magnesium absorption']
  },

  // SYMPTOM — symptom-first discovery intent
  {
    tier: 'symptom',
    title: 'Always Tired? The 8 Nutrient Deficiencies Behind Chronic Fatigue',
    category: 'Energy',
    primaryKeyword: 'why am I always tired supplements',
    secondaryKeywords: ['chronic fatigue nutrient deficiency', 'iron deficiency fatigue', 'B12 energy']
  },

  // ... plan 100-500+ articles across all tiers
];

/**
 * Returns clusters not yet written (filters by existing article titles).
 */
export function getUnusedTopics(existingTitles: string[]): TopicCluster[] {
  const existingSet = new Set(existingTitles.map(t => t.toLowerCase().trim()));
  return TOPIC_CLUSTERS.filter(tc => !existingSet.has(tc.title.toLowerCase().trim()));
}
```

**Key principle:** Plan ALL your articles upfront with primary + secondary keywords before generating anything. The scheduler will prioritize based on keyword data.

---

## 5. Step 3: Keyword Research via DataForSEO

### What DataForSEO Does

DataForSEO provides real Google Ads search volume, keyword difficulty (competition index 0-100), and CPC for every keyword. This data drives the **priority scoring** — the scheduler generates high-volume, low-competition articles first.

### How It Works

1. Parse all primary + secondary keywords from your topic clusters
2. Call DataForSEO's Google Ads Search Volume API in batches of 700
3. Store results in the `keyword_data` database table + a JSON fallback file
4. Calculate `priorityScore = volume / max(kd, 1)` for scheduling

### The Keyword Research Script

```javascript
#!/usr/bin/env node
/**
 * DataForSEO keyword enrichment script.
 * 
 * Usage:  node scripts/keyword-research.cjs
 * 
 * Requires in .env:
 *   DATAFORSEO_LOGIN=your@email.com
 *   DATAFORSEO_PASSWORD=your_api_password
 * 
 * Cost: ~$0.0015/keyword ≈ $1.13 for 750 keywords
 */

'use strict';
const fs    = require('fs');
const path  = require('path');
const https = require('https');

require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const LOGIN    = process.env.DATAFORSEO_LOGIN;
const PASSWORD = process.env.DATAFORSEO_PASSWORD;

if (!LOGIN || !PASSWORD) {
  console.error('Missing DATAFORSEO_LOGIN or DATAFORSEO_PASSWORD in .env');
  process.exit(1);
}

// ── Parse topic-clusters.ts to extract all keywords ────────────────────
const clustersPath = path.join(__dirname, '../shared/topic-clusters.ts');
const source = fs.readFileSync(clustersPath, 'utf8');

const clusterRegex = /\{\s*tier:[^}]+?primaryKeyword:\s*'((?:[^'\\]|\\.)+)'[^}]+?secondaryKeywords:\s*\[([^\]]*)\]/gs;
const secondaryKwRegex = /'((?:[^'\\]|\\.)+)'/g;
const clusters = [];
const unescape = s => s.replace(/\\'/g, "'").replace(/\\"/g, '"').trim();

for (const match of source.matchAll(clusterRegex)) {
  const primary = unescape(match[1]);
  const secondary = [...match[2].matchAll(secondaryKwRegex)].map(m => unescape(m[1]));
  clusters.push({ primaryKeyword: primary, secondaryKeywords: secondary });
}

console.log(`Parsed ${clusters.length} topic clusters`);

// Collect all unique keywords
const primarySet = new Set(clusters.map(c => c.primaryKeyword));
const secondarySet = new Set(clusters.flatMap(c => c.secondaryKeywords));
for (const k of primarySet) secondarySet.delete(k);
const allKeywords = [...primarySet, ...secondarySet];

console.log(`${allKeywords.length} unique keywords (${primarySet.size} primary + ${secondarySet.size} secondary)`);

// ── DataForSEO API call ────────────────────────────────────────────────
const BATCH_SIZE = 700; // DataForSEO hard limit per task
const authHeader = 'Basic ' + Buffer.from(`${LOGIN}:${PASSWORD}`).toString('base64');

async function fetchSearchVolume(keywords) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify([{
      keywords,
      location_code: 2840,  // United States
      language_code: 'en',
    }]);

    const options = {
      hostname: 'api.dataforseo.com',
      path: '/v3/keywords_data/google_ads/search_volume/live',
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse error: ${e.message}`)); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  const batches = [];
  for (let i = 0; i < allKeywords.length; i += BATCH_SIZE) {
    batches.push(allKeywords.slice(i, i + BATCH_SIZE));
  }

  console.log(`Calling DataForSEO: ${batches.length} batch(es) of up to ${BATCH_SIZE} keywords...`);
  let rawResults = [];

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`  Batch ${i + 1}/${batches.length}: ${batch.length} keywords`);
    const result = await fetchSearchVolume(batch);

    if (result.status_code !== 20000) {
      console.error(`API error (batch ${i + 1}):`, JSON.stringify(result));
      process.exit(1);
    }

    const task = result.tasks?.[0];
    if (task?.status_code !== 20000) {
      console.error(`Task error (batch ${i + 1}): ${task?.status_message}`);
      process.exit(1);
    }

    rawResults.push(...(task?.result ?? []));
    if (i < batches.length - 1) await new Promise(r => setTimeout(r, 1000)); // rate limit
  }

  console.log(`Received data for ${rawResults.length} keywords`);

  // Save raw response
  fs.writeFileSync(
    path.join(__dirname, 'keyword-research-raw.json'),
    JSON.stringify(rawResults, null, 2)
  );

  // ── Build enrichment map ──────────────────────────────────────────────
  const enrichmentMap = {};
  for (const item of rawResults) {
    if (!item?.keyword) continue;
    enrichmentMap[item.keyword.toLowerCase()] = {
      volume: item.search_volume ?? 0,
      kd:     item.competition_index ?? 0,     // 0-100 scale
      cpc:    item.cpc ?? item.high_top_of_page_bid ?? 0,
    };
  }

  // Build priority-sorted cluster table
  const enrichedClusters = clusters.map(c => {
    const data = enrichmentMap[c.primaryKeyword.toLowerCase()] ?? { volume: 0, kd: 0, cpc: 0 };
    return {
      primaryKeyword: c.primaryKeyword,
      volume: data.volume,
      kd:     data.kd,
      cpc:    data.cpc,
      // Priority: high volume + low competition = best opportunities
      priorityScore: Math.round(data.volume / Math.max(data.kd, 1)),
    };
  }).sort((a, b) => b.priorityScore - a.priorityScore);

  // Save enrichment JSON for the scheduler
  const dataDir = path.join(__dirname, '../server/data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const outputMap = {};
  for (const c of enrichedClusters) {
    outputMap[c.primaryKeyword] = { volume: c.volume, kd: c.kd, cpc: c.cpc };
  }
  fs.writeFileSync(
    path.join(dataDir, 'keyword-enrichment.json'),
    JSON.stringify(outputMap, null, 2)
  );

  // Print top priorities
  console.log('\nTOP 30 PRIORITY KEYWORDS (highest volume / lowest competition):');
  for (const c of enrichedClusters.slice(0, 30)) {
    console.log(`  Score: ${c.priorityScore}  Vol: ${c.volume}  KD: ${c.kd}  CPC: $${c.cpc.toFixed(2)}  — ${c.primaryKeyword}`);
  }
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
```

### DataForSEO API Details

- **Endpoint:** `POST https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live`
- **Auth:** Basic auth (base64 of `login:password`)
- **Body:** `[{ keywords: [...], location_code: 2840, language_code: "en" }]`
- **Location 2840** = United States (change for other countries)
- **Batch limit:** 700 keywords per request
- **Response fields per keyword:**
  - `search_volume` — monthly searches
  - `competition_index` — 0-100 (lower = easier to rank)
  - `cpc` / `high_top_of_page_bid` — cost-per-click in USD (indicates commercial value)

### Priority Scoring Formula

```
priorityScore = volume / max(kd, 1)
```

Articles with high search volume and low difficulty get generated first. This ensures you capture the easiest wins before targeting competitive terms.

---

## 6. Step 4: AI Article Generation Service

This is the core engine. It sends a detailed system prompt + user message to an AI model, receives structured JSON back, validates it, and returns a clean article object.

### AI Model Recommendation

| Model | Best For | Cost | Notes |
|-------|----------|------|-------|
| **Claude Sonnet 4.5** (preferred) | Long-form articles, medical accuracy | ~$0.30-0.50/article | Better at following complex formatting instructions, more accurate citations |
| **GPT-4o** | Alternative, supports `response_format: json_object` | ~$0.20-0.40/article | Native JSON mode reduces parse errors |
| **GPT-4o-mini** | Image keyword extraction only | ~$0.001/call | Used for extracting visual keywords from titles |

### The System Prompt (Critical — This Is Where SEO Quality Comes From)

This prompt encodes ALL of your SEO optimizations. Customize it for your brand/niche:

```typescript
const SYSTEM_PROMPT = `You are a senior health & supplement content strategist for [YOUR BRAND] — a [describe your product/service].

[YOUR BRAND] product overview (weave this into articles naturally, not as ads):
- [Key product feature 1]
- [Key product feature 2]
- [Specific products/ingredients with doses]
- [Pricing tiers or plans]

Brand name rule: Always call the brand "[YOUR BRAND]" (not alternate spellings).

Language: American English spelling throughout — use "personalized" not "personalised", 
"optimized" not "optimised", etc.

Writing standards:
- Minimum 1800 words, target 2000–2500 words
- Use secondary keywords as H2 subheadings where natural
- Every factual claim must reference a real study (journal + year) or credible body (NIH, WHO, etc.)
- Include a "How [YOUR BRAND] Addresses This" section (H2) near the end — mention 2–3 specific 
  products/features relevant to the article topic
- End with a "Key Takeaways" H2 with 4–6 bullet points
- Never make prohibited claims; recommend consulting a professional for decisions
- Tables and data are encouraged — use markdown tables
- Use ordered lists for protocols; unordered for features/options
- EEAT signals: cite author expertise through specificity, cite real study details (sample size, 
  duration, effect size where known)
- Naturally embed 3–5 internal links using keyword-rich anchor text: 
  [descriptive anchor](/blog/relevant-slug). Must appear inline in sentences, not in lists.
  Never "click here" or bare URLs.
- When comparing to competitors, only reference active companies with accurate descriptions.`;
```

### The User Message (Article Generation Request)

```typescript
const userMessage = `Write a ${tone} SEO-optimized blog article for [YOUR BRAND].

Title: ${title}
Category: ${category}
Primary keyword: ${primaryKeyword}
Secondary keywords to use as H2 subheadings (use at least 3): ${secondaryKeywords.join(', ')}

Return a JSON object with these EXACT fields:
{
  "title": "...",
  "slug": "url-friendly-slug-max-60-chars",
  "metaTitle": "STRICT: [Pain/Number] + [Primary Keyword] + [Differentiator] | [Brand]. 
    Must be 52-62 chars total.",
  "metaDescription": "STRICT: 150-160 characters. Open with primary keyword or a sharp pain/stat. 
    End with benefit or soft CTA. Count before submitting.",
  "excerpt": "2-3 sentence hook paragraph",
  "content": "Full markdown article 1800-2500 words...",
  "category": "${category}",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "primaryKeyword": "exact primary keyword",
  "secondaryKeywords": ["secondary kw 1", "secondary kw 2", "secondary kw 3"],
  "readTimeMinutes": 8,
  "authorName": "[Your Author Name]",
  "internalLinks": ["/blog/related-slug-1", "/blog/related-slug-2"],
  "faqSchema": [
    {"question": "Long-tail question a real person would search?", "answer": "3-5 sentence answer with study reference..."},
    ...5-6 questions total
  ]
}

For faqSchema: include 5-6 questions. Requirements:
- Use long-tail phrasing a real person would type into Google
- Each answer must be 3-5 sentences and reference a specific study, dose, or mechanism
- At least 2 answers should naturally name [YOUR BRAND] and a specific product detail
- Answers must be factually accurate

IMPORTANT: Return only the JSON object, no preamble, no markdown fences.`;
```

### Full Article Generation Function

```typescript
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { jsonrepair } from 'jsonrepair';

export interface GenerateArticleInput {
  title: string;
  category?: string;
  tone?: string;
  primaryKeyword?: string;
  secondaryKeywords?: string[];
}

export interface GeneratedArticle {
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  primaryKeyword: string;
  secondaryKeywords: string[];
  readTimeMinutes: number;
  wordCount: number;
  authorName: string;
  internalLinks: string[];
  schemaJson: string | null;
  featuredImage: string | null;
}

export async function generateArticle(input: GenerateArticleInput): Promise<GeneratedArticle> {
  const {
    title,
    category = 'Health & Wellness',
    tone = 'informative',
    primaryKeyword,
    secondaryKeywords = []
  } = input;

  const skwList = secondaryKeywords.join(', ') || title;
  const isHowTo = /^how\s+(to|i\s)|\d+\s+ways?\s+to|step[- ]by[- ]step/i.test(title);

  // Build the user message with all your SEO requirements (see above)
  const userMessage = `...`; // Use the template from above

  let raw: string;

  // ── Call the AI model ───────────────────────────────────────────────────
  if (process.env.ANTHROPIC_API_KEY) {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 12000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });
    raw = response.content.find(c => c.type === 'text')?.text ?? '';
  } else if (process.env.OPENAI_API_KEY) {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 12000,
      response_format: { type: 'json_object' },  // OpenAI-specific: forces valid JSON
    });
    raw = response.choices[0]?.message?.content ?? '{}';
  } else {
    throw new Error('No AI provider configured');
  }

  // ── Extract and parse JSON ──────────────────────────────────────────────
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI returned unexpected format');

  let g: any;
  try {
    g = JSON.parse(jsonMatch[0]);
  } catch {
    // AI sometimes produces unescaped quotes or trailing commas.
    // Use jsonrepair library for robust recovery.
    const repaired = jsonrepair(jsonMatch[0]);
    g = JSON.parse(repaired);
  }

  // ── Post-processing & validation ────────────────────────────────────────
  g.wordCount = g.content ? g.content.split(/\s+/).filter(Boolean).length : 0;

  // Meta title validation (SERP display: 50-65 chars)
  if (g.metaTitle) {
    if (g.metaTitle.startsWith('STRICT:')) {
      g.metaTitle = `${primaryKeyword ?? title} | YourBrand`;
    }
    if (!g.metaTitle.endsWith(' | YourBrand')) {
      g.metaTitle = g.metaTitle.replace(/\s*\|\s*YourBrand\s*$/i, '').trimEnd() + ' | YourBrand';
    }
    if (g.metaTitle.length > 65) {
      const base = g.metaTitle.replace(/ \| YourBrand$/, '').slice(0, 54).trimEnd();
      g.metaTitle = `${base}... | YourBrand`;
    }
  }

  // Meta description validation (max 160 chars)
  if (g.metaDescription && g.metaDescription.length > 160) {
    g.metaDescription = g.metaDescription.slice(0, 157).trimEnd() + '...';
  }

  // ── Build Schema.org structured data ────────────────────────────────────
  const schemas: object[] = [];

  // Article schema
  schemas.push({
    '@context': 'https://schema.org',
    '@type': 'Article',
    author: { '@type': 'Person', name: 'Editorial Team' },
    publisher: { '@type': 'Organization', name: 'YourBrand' },
    inLanguage: 'en-US',
    isAccessibleForFree: true,
  });

  // FAQ schema (if questions exist)
  const faqItems = Array.isArray(g.faqSchema) ? g.faqSchema : [];
  if (faqItems.length > 0) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqItems.map(f => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    });
  }

  // HowTo schema (for how-to articles)
  if (g.howToSchema && typeof g.howToSchema === 'object') {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      ...g.howToSchema,
    });
  }

  return {
    title:            g.title ?? title,
    slug:             g.slug ?? slugify(g.title ?? title),
    metaTitle:        g.metaTitle ?? null,
    metaDescription:  g.metaDescription ?? null,
    excerpt:          g.excerpt ?? null,
    content:          g.content ?? '',
    category:         g.category ?? category,
    tags:             Array.isArray(g.tags) ? g.tags : [],
    primaryKeyword:   g.primaryKeyword ?? primaryKeyword ?? null,
    secondaryKeywords: Array.isArray(g.secondaryKeywords) ? g.secondaryKeywords : secondaryKeywords,
    readTimeMinutes:  g.readTimeMinutes ?? 8,
    wordCount:        g.wordCount,
    authorName:       'Editorial Team',
    internalLinks:    Array.isArray(g.internalLinks) ? g.internalLinks : [],
    schemaJson:       JSON.stringify(schemas),
    featuredImage:    null, // Generated separately
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}
```

---

## 7. Step 5: SEO Optimizations Breakdown

Here is every SEO optimization baked into the system:

### On-Page SEO

| Optimization | How It's Implemented |
|-------------|---------------------|
| **Meta Title** | 52-62 chars, format: `[Pain/Number] + [Primary Keyword] + [Differentiator] \| Brand` |
| **Meta Description** | 150-160 chars, opens with primary keyword, ends with CTA |
| **H2 Subheadings** | Secondary keywords used as H2 headings |
| **Word Count** | 1800-2500 words per article (Google's preferred long-form range) |
| **Primary Keyword** | Stored per article, used in title, meta, and naturally in content |
| **Secondary Keywords** | 3-4 per article, used as subheadings |
| **Internal Linking** | 3-5 keyword-rich anchor text links to other blog posts, inline in sentences |
| **URL Slug** | Max 60 chars, lowercase, hyphenated, keyword-rich |

### Structured Data (Schema.org JSON-LD)

Each article can have up to 3 schema types injected into the page:

1. **Article Schema** — tells Google this is an article, who wrote it, who published it
2. **FAQPage Schema** — 5-6 long-tail questions with detailed answers → eligible for FAQ rich results in SERP
3. **HowTo Schema** — (for how-to articles only) step-by-step instructions → eligible for HowTo rich results

```json
[
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "author": { "@type": "Person", "name": "Editorial Team" },
    "publisher": { "@type": "Organization", "name": "YourBrand" },
    "inLanguage": "en-US",
    "isAccessibleForFree": true
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is the clinical dose of KSM-66 ashwagandha for cortisol reduction?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The clinically studied dose is 600mg daily of KSM-66 extract..."
        }
      }
    ]
  }
]
```

### Content Quality Signals (E-E-A-T)

| Signal | Implementation |
|--------|---------------|
| **Evidence-based claims** | Every factual claim cites a real study (journal + year) or credible body (NIH, WHO) |
| **Author expertise** | Implied through specificity — clinical doses, study details (sample size, duration) |
| **Structured data** | FAQ answers include specific study references |
| **No prohibited claims** | Prompt explicitly prevents FDA-prohibited disease claims |
| **Professional disclaimer** | Recommends consulting healthcare providers |
| **Internal linking** | Creates topical authority web between articles |
| **Competitor mentions** | Only active, well-known companies — builds context for Google |

### Technical SEO

| Feature | Implementation |
|---------|---------------|
| **XML Sitemap** | Auto-generated at `/sitemap.xml` with all published posts + static pages |
| **Blog Sitemap** | Separate `/sitemap-blog.xml` with `image:image` entries for image search |
| **Search Engine Ping** | After publishing, pings Google and Bing to notify of new content |
| **Canonical URLs** | Clean `/blog/:slug` paths |
| **View Count** | Tracked per article (background increment, no blocking) |
| **Featured Image** | AI-generated, hosted on CDN, referenced in sitemap |
| **12-hour cache** | Sitemap served with `Cache-Control: public, max-age=43200` |

---

## 8. Step 6: AI Image Generation

Each article gets a unique photorealistic featured image.

### How It Works

1. **Extract visual keywords** from the article title using GPT-4o-mini
2. **Build a photography prompt** for the image model
3. **Generate image** using fal.ai Nano Banana 2
4. **Upload to storage** (Supabase Storage / S3)
5. **Store the URL** in the blog post record

### Image Service Code

```typescript
import OpenAI from 'openai';
import { fal } from '@fal-ai/client';

// Configure fal.ai
fal.config({ credentials: process.env.FAL_KEY });

/**
 * Use GPT-4o-mini to extract 1-3 visual keywords from an article title.
 */
async function extractVisualKeywords(title: string): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const resp = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.3,
    max_tokens: 30,
    messages: [
      {
        role: 'system',
        content:
          'Extract 1-3 visual keywords from the given article title that would make a good photograph. ' +
          'Focus on the main subject that can be visually depicted. Return ONLY the keywords, nothing else. ' +
          'Examples:\n' +
          '"Top 5 Benefits of Ashwagandha for Stress" → ashwagandha root powder\n' +
          '"Understanding Your Blood Test Results" → blood test laboratory\n' +
          '"How Sleep Quality Affects Recovery" → peaceful sleep rest',
      },
      { role: 'user', content: title },
    ],
  });
  return resp.choices[0]?.message?.content?.trim() || title;
}

/**
 * Generate a photorealistic image with fal.ai Nano Banana 2.
 */
async function generateImage(keywords: string): Promise<string> {
  const prompt =
    `Professional editorial photograph for a health and wellness magazine. ` +
    `Subject: ${keywords}. ` +
    `Shot on Canon EOS R5, 85mm f/1.4 lens, natural window lighting, shallow depth of field. ` +
    `Real photograph with authentic textures, genuine materials, realistic shadows. ` +
    `Warm natural color tones, clean composition, landscape orientation, magazine quality.`;

  const result = await fal.subscribe('fal-ai/nano-banana-2', {
    input: {
      prompt,
      negative_prompt: 'illustration, cartoon, drawing, 3d render, digital art, painting, sketch, anime, text, watermark, logo, blurry, low quality',
      image_size: 'landscape_16_9',
      num_images: 1,
      num_inference_steps: 28,
      guidance_scale: 7,
    },
  });

  return (result.data as any)?.images?.[0]?.url;
}

/**
 * Full pipeline: generate image → download → upload to storage → return URL.
 */
export async function generateBlogImage(title: string, slug: string): Promise<string> {
  // 1) Extract visual keywords
  const keywords = await extractVisualKeywords(title);

  // 2) Generate image
  const falImageUrl = await generateImage(keywords);

  // 3) Download from fal.ai CDN
  const resp = await fetch(falImageUrl);
  const imageBuffer = Buffer.from(await resp.arrayBuffer());

  // 4) Upload to your storage (Supabase example)
  const filename = `${slug}.jpg`;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  await fetch(`${SUPABASE_URL}/storage/v1/object/blog-images/${filename}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'apikey': SUPABASE_KEY,
      'Content-Type': 'image/jpeg',
      'x-upsert': 'true',
    },
    body: new Uint8Array(imageBuffer),
  });

  // 5) Return permanent public URL
  return `${SUPABASE_URL}/storage/v1/object/public/blog-images/${filename}`;
}
```

---

## 9. Step 7: Automated Scheduling

The scheduler runs daily at 02:00 UTC and generates N articles automatically.

### Scheduler Configuration

Stored in your database's `app_settings` table (key: `blog_auto_generate`):

```typescript
interface BlogAutoGenSettings {
  enabled: boolean;          // OFF by default — admin must enable
  articlesPerDay: number;    // how many to generate per run (default: 20)
  autoPublish: boolean;      // publish immediately or save as draft
  tiers: string[];           // which tiers to pull from
  cronSchedule: string;      // cron expression (default: '0 2 * * *')
}
```

### Scheduler Logic

```typescript
import cron from 'node-cron';

export async function runDailyBlogGeneration(settings: BlogAutoGenSettings) {
  const runLog: string[] = [];

  // 1. Get all existing article titles
  const allPublished = await blogRepository.getPublished(10000, 0);
  const existingTitles = allPublished.map(p => p.title);

  // 2. Filter unused topics by tier
  const candidatePool = getUnusedTopics(existingTitles)
    .filter(tc => settings.tiers.includes(tc.tier));

  // 3. Enrich with keyword data and calculate priority scores
  const kwMap = await getKeywordData(); // from DB or JSON file
  const enriched = candidatePool
    .map(tc => ({
      ...tc,
      priorityScore: Math.round((kwMap[tc.primaryKeyword]?.volume ?? 0) / Math.max(kwMap[tc.primaryKeyword]?.kd ?? 50, 1))
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore);

  // 4. Take top 3x needed, shuffle for variety, pick N
  const window = enriched.slice(0, settings.articlesPerDay * 3);
  const batch = shuffleArray(window).slice(0, settings.articlesPerDay);

  let generated = 0, failed = 0, consecutiveFailures = 0;

  // 5. Generate each article
  for (const topic of batch) {
    if (consecutiveFailures >= 3) break; // Safety: stop if API is down

    // Check slug doesn't already exist
    const slug = slugify(topic.title);
    if (await blogRepository.slugExists(slug)) continue;

    try {
      // Generate article via AI
      const article = await generateArticle({
        title: topic.title,
        category: topic.category,
        primaryKeyword: topic.primaryKeyword,
        secondaryKeywords: topic.secondaryKeywords,
      });

      // Save to database
      await blogRepository.create({
        ...article,
        tier: topic.tier,
        isPublished: settings.autoPublish,
        publishedAt: new Date(),
      });

      // Generate featured image (async, non-blocking on failure)
      try {
        const imgUrl = await generateBlogImage(article.title, article.slug);
        await blogRepository.update(article.slug, { featuredImage: imgUrl });
      } catch {}

      generated++;
      consecutiveFailures = 0;

      // 6. Throttle: 3-second gap between API calls
      await new Promise(r => setTimeout(r, 3000));
    } catch (err) {
      failed++;
      consecutiveFailures++;
    }
  }

  // 7. Ping search engines after publishing
  if (generated > 0) {
    pingSitemapIndexers().catch(() => {});
  }

  return { generated, failed };
}

// Start the cron job
export function startBlogGenerationScheduler() {
  cron.schedule('0 2 * * *', async () => {
    const settings = await getBlogAutoGenSettings();
    if (!settings.enabled) return;
    await runDailyBlogGeneration(settings);
  });
}
```

### Safety Rails

- **Slug collision check** — skips if article already exists
- **3 consecutive failure abort** — stops run if API is likely down
- **3-second throttle** — prevents API rate limiting
- **Off by default** — admin must explicitly enable the scheduler
- **Logging** — every generation result logged with word count and status

---

## 10. Step 8: API Routes & Admin Dashboard

### Express API Routes

```typescript
import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';

const router = Router();

// ── Public routes ──
router.get('/',           listPosts);            // Paginated published posts
router.get('/categories', getCategories);        // Distinct categories
router.get('/search',     searchPosts);          // Full-text search by title
router.get('/sitemap.xml', getSitemap);          // XML sitemap

// ── Admin routes (require authentication) ──
router.get ('/admin/all',              requireAdmin, adminListPosts);           // All posts (incl. drafts)
router.post('/admin/generate',         requireAdmin, adminAiGenerate);         // Generate 1 article
router.get ('/admin/auto-gen/settings', requireAdmin, adminGetAutoGenSettings); // Scheduler settings
router.patch('/admin/auto-gen/settings', requireAdmin, adminSaveAutoGenSettings);
router.post('/admin/auto-gen/run',     requireAdmin, adminTriggerAutoGenRun);   // Manual trigger
router.get ('/admin/:id',             requireAdmin, adminGetPost);
router.patch('/admin/:id',            requireAdmin, adminUpdatePost);
router.patch('/admin/:id/publish',    requireAdmin, adminTogglePublish);
router.delete('/admin/:id',           requireAdmin, adminDeletePost);
router.post('/admin/:id/ai-revise',   requireAdmin, adminAiRevise);           // AI content revision

// ── Public post (last — catches /:slug) ──
router.get('/:slug', getPost);                   // Single post + related + valid slugs

export default router;
```

### Key Admin Endpoints

**POST /api/blog/admin/generate** — Generate a single article:
```json
// Request
{
  "title": "Ashwagandha KSM-66: Stress, Cortisol, and the Clinical Data",
  "keywords": "ashwagandha KSM-66",
  "category": "Supplements",
  "tone": "informative",
  "secondaryKeywords": "ashwagandha cortisol, ashwagandha dosage"
}

// Response
{
  "generated": {
    "title": "...",
    "slug": "ashwagandha-ksm-66-stress-cortisol-clinical-data",
    "metaTitle": "Ashwagandha KSM-66: Cortisol & Clinical Evidence | Brand",
    "metaDescription": "...",
    "content": "... 2000+ word markdown article ...",
    "wordCount": 2147,
    "faqSchema": [...],
    "featuredImage": "https://...",
    ...
  }
}
```

**POST /api/blog/admin/auto-gen/run** — Trigger a batch generation:
```json
// Request (optional overrides)
{ "articlesPerDay": 10, "tiers": ["ingredient", "symptom"] }

// Response (immediate — runs in background)
{ "message": "Generation run started", "jobId": "1711584000000", "status": "running" }
```

**POST /api/blog/admin/:id/ai-revise** — Revise existing article:
```json
// Request
{ "prompt": "Add a section about drug interactions with statins and update the dosing table" }

// Response
{ "revisedContent": "... updated markdown article ..." }
```

---

## 11. Step 9: Sitemap & Search Engine Pinging

### Auto-Generated Sitemap

The sitemap is generated dynamically from all published blog posts:

```typescript
export async function getSitemap(req, res) {
  const posts = await blogRepository.getPublished(1000, 0);
  const base = 'https://yourdomain.com';

  const staticUrls = [
    { loc: base, priority: '1.0', changefreq: 'weekly' },
    { loc: `${base}/blog`, priority: '0.9', changefreq: 'daily' },
  ];

  const urlEntries = [
    ...staticUrls.map(u => `<url><loc>${u.loc}</loc><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`),
    ...posts.map(p => `<url><loc>${base}/blog/${p.slug}</loc><lastmod>${p.updatedAt.toISOString().split('T')[0]}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>`),
  ].join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>`;

  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 'public, max-age=43200'); // 12-hour cache
  res.send(xml);
}
```

### Search Engine Pinging

After publishing new articles, ping Google and Bing:

```typescript
const SITEMAP_URL = encodeURIComponent('https://yourdomain.com/sitemap.xml');

export async function pingSitemapIndexers(): Promise<void> {
  const targets = [
    `https://www.google.com/ping?sitemap=${SITEMAP_URL}`,
    `https://www.bing.com/ping?sitemap=${SITEMAP_URL}`,
  ];

  await Promise.allSettled(
    targets.map(url => fetch(url, { method: 'GET', signal: AbortSignal.timeout(5000) }))
  );
}
```

---

## 12. Step 10: Public Blog Frontend

On the frontend, render the blog with proper SEO head tags:

### Required Head Tags Per Article

```html
<!-- In your article page component -->
<head>
  <title>{post.metaTitle}</title>
  <meta name="description" content="{post.metaDescription}" />
  <link rel="canonical" href="https://yourdomain.com/blog/{post.slug}" />

  <!-- Open Graph -->
  <meta property="og:title" content="{post.metaTitle}" />
  <meta property="og:description" content="{post.metaDescription}" />
  <meta property="og:image" content="{post.featuredImage}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="https://yourdomain.com/blog/{post.slug}" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{post.metaTitle}" />
  <meta name="twitter:description" content="{post.metaDescription}" />
  <meta name="twitter:image" content="{post.featuredImage}" />

  <!-- JSON-LD Structured Data -->
  <script type="application/ld+json">{post.schemaJson}</script>
</head>
```

### Internal Link Validation

When rendering article markdown, validate internal links against your actual published slugs:

```typescript
// Fetch valid slugs from the API along with the post
const { post, related, validSlugs } = await fetch(`/api/blog/${slug}`).then(r => r.json());

// In your markdown renderer, validate internal links
// Links to non-existent slugs can be styled differently or removed
```

---

## 13. Full Code Reference

### File Structure

```
your-project/
├── shared/
│   ├── schema.ts              # Database schema (blogPosts + keywordData tables)
│   └── topic-clusters.ts      # 500+ pre-planned article topics
├── server/
│   ├── api/
│   │   ├── routes/
│   │   │   └── blog.routes.ts          # Express route definitions
│   │   ├── controller/
│   │   │   └── blog.controller.ts      # Route handlers (CRUD + AI generation)
│   │   └── middleware/
│   │       └── middleware.ts           # requireAdmin auth middleware
│   ├── modules/
│   │   └── blog/
│   │       └── blog.repository.ts     # Database access layer (15+ methods)
│   ├── utils/
│   │   ├── blogGenerationService.ts   # Core AI article generation (system prompt + parsing)
│   │   ├── blogGenerationScheduler.ts # Cron job + priority scoring + daily pipeline
│   │   ├── blogImageService.ts        # fal.ai image generation + upload
│   │   └── sitemapPing.ts             # Google/Bing sitemap notification
│   └── data/
│       └── keyword-enrichment.json    # DataForSEO results (JSON fallback)
├── scripts/
│   └── keyword-research.cjs           # One-time DataForSEO keyword enrichment
└── client/
    └── src/
        └── pages/
            ├── BlogPage.tsx           # Public blog listing
            ├── BlogArticlePage.tsx    # Public single article
            └── admin/
                └── AdminBlogPage.tsx  # Admin dashboard (generate, edit, schedule)
```

---

## 14. Cost Breakdown

| Component | Cost Per Unit | Monthly Cost (20 articles/day) |
|-----------|-------------|-------------------------------|
| **AI Article Generation** (Claude Sonnet 4.5) | ~$0.40/article | ~$240/mo |
| **AI Article Generation** (GPT-4o alternative) | ~$0.25/article | ~$150/mo |
| **Image Generation** (fal.ai Nano Banana 2) | ~$0.01/image | ~$6/mo |
| **Image Keyword Extraction** (GPT-4o-mini) | ~$0.001/call | ~$0.60/mo |
| **Keyword Research** (DataForSEO) | ~$1.13/run | One-time |
| **Image Storage** (Supabase) | Free tier | $0/mo |
| **Database** (Supabase PostgreSQL) | Free tier | $0/mo |
| **Total (Claude)** | | **~$247/mo for 600 articles** |
| **Total (GPT-4o)** | | **~$157/mo for 600 articles** |

### ROI Note

At 600 articles/month × 2000+ words each = **1.2M+ words of SEO content per month**. At freelance writer rates of $0.10-0.30/word, this would cost $120,000-$360,000/month. The AI system delivers equivalent output for under $250/month.

---

## Quick Start Checklist

1. [ ] Set up PostgreSQL database and run schema migrations
2. [ ] Create `topic-clusters.ts` with 100+ planned articles (primary + secondary keywords per topic)
3. [ ] Get DataForSEO account → run `keyword-research.cjs` to populate keyword data
4. [ ] Get Anthropic API key (Claude Sonnet 4.5) or OpenAI API key (GPT-4o)
5. [ ] Get fal.ai API key for image generation
6. [ ] Set up image storage bucket (Supabase Storage or S3)
7. [ ] Implement the `generateArticle()` function with your brand's system prompt
8. [ ] Implement the `generateBlogImage()` function
9. [ ] Set up Express routes for blog CRUD + admin generation endpoints
10. [ ] Build admin UI to trigger generation, manage articles, toggle scheduler
11. [ ] Implement XML sitemap generation + search engine pinging
12. [ ] Enable the scheduler in production (start with 5-10 articles/day, scale up)
13. [ ] Monitor article quality — review first 20-30 articles manually before full automation
14. [ ] Submit sitemap.xml to Google Search Console and Bing Webmaster Tools

---

*Built by the Ones engineering team. Questions? Reach out for implementation support.*
