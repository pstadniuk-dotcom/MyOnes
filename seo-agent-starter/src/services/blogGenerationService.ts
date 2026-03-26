/**
 * Blog Generation Service — Core AI Article Engine
 *
 * This is the heart of the SEO agent. It:
 *   1. Sends a detailed system prompt + user message to an AI model
 *   2. Receives structured JSON with title, meta tags, content, FAQ schema, etc.
 *   3. Validates and normalizes all fields (meta title length, description, schema)
 *   4. Returns a clean GeneratedArticle ready to save to the database
 *
 * ────────────────────────────────────────────────────────────────────────────
 *  CUSTOMIZE: Edit SYSTEM_PROMPT below with YOUR brand info, product details,
 *  competitor list, and content guidelines.
 * ────────────────────────────────────────────────────────────────────────────
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { jsonrepair } from 'jsonrepair';

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Brand Configuration ──────────────────────────────────────────────────────
// Pull from environment so you only customize in one place

const BRAND = process.env.BRAND_NAME || 'YourBrand';
const SITE  = process.env.SITE_URL   || 'https://yourdomain.com';

// ════════════════════════════════════════════════════════════════════════════
//  SYSTEM PROMPT — This is where ALL your SEO quality comes from.
//  Customize everything between the backtick delimiters for your brand.
// ════════════════════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `You are a senior content strategist for ${BRAND}.

${BRAND} overview (weave into articles naturally, not as ads):
- DESCRIBE YOUR PRODUCT/SERVICE HERE
- DESCRIBE KEY FEATURES
- LIST SPECIFIC PRODUCTS OR INGREDIENTS WITH DETAILS
- DESCRIBE PRICING TIERS OR PLANS

Brand name rule: Always call the brand "${BRAND}" — use the exact casing.

Language: American English spelling throughout — use "personalized" not "personalised", "optimized" not "optimised", "recognized" not "recognised", "fiber" not "fibre", "defense" not "defence".

Writing standards:
- Minimum 1800 words, target 2000–2500 words
- Use secondary keywords as H2 subheadings where natural
- Every factual claim must reference a real study (journal + year) or a credible body like NIH, AHA, WHO
- Include a "How ${BRAND} Addresses This" or "What This Means for Your [Product]" section (H2) near the end — mention 2–3 specific ${BRAND} products/features relevant to the article topic
- End with a "Key Takeaways" H2 with 4–6 bullet points
- Never make prohibited claims; recommend consulting a professional for decisions
- Tables and data are encouraged — use markdown tables (| col | col |)
- Use ordered (numbered) lists for protocols; unordered for features/options
- EEAT signals: cite author expertise implicitly through specificity, cite real study details (sample size, duration, effect size where known)
- Within the article body, naturally embed 3–5 internal links using keyword-rich anchor text in standard markdown format: [descriptive keyword anchor text](/blog/relevant-slug). These must appear inline within sentences, not in a list. Use realistic slug paths based on your topic names. Never link to the article you are writing. Use anchor text that reads naturally — never "click here" or bare URLs.
- When comparing to competitors, only reference active, well-known companies with accurate descriptions.`;

// ════════════════════════════════════════════════════════════════════════════

export async function generateArticle(input: GenerateArticleInput): Promise<GeneratedArticle> {
  const {
    title,
    category = 'General',
    tone = 'informative',
    primaryKeyword,
    secondaryKeywords = [],
  } = input;

  const skwList = secondaryKeywords.join(', ') || title;
  const isHowTo = /^how\s+(to|i\s)|\d+\s+ways?\s+to|step[- ]by[- ]step/i.test(title);

  // ── Build the user message ──────────────────────────────────────────────

  const userMessage = `Write a ${tone} SEO-optimized blog article for ${BRAND}.

Title: ${title}
Category: ${category}
Primary keyword: ${primaryKeyword || title}
Secondary keywords to use as H2 subheadings (use at least 3): ${skwList}

Return a JSON object with these EXACT fields:
{
  "title": "...",
  "slug": "url-friendly-slug-max-60-chars",
  "metaTitle": "STRICT: [Pain/Number] + [Primary Keyword] + [Differentiator] | ${BRAND}. Must be 52-62 chars total. Count before submitting.",
  "metaDescription": "STRICT: 150-160 characters. Open with primary keyword or a sharp pain/stat. End with benefit or soft CTA. Count before submitting.",
  "excerpt": "2-3 sentence hook paragraph — lead with the problem or a surprising stat",
  "content": "Full markdown article 1800-2500 words...",
  "category": "${category}",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "primaryKeyword": "exact primary keyword",
  "secondaryKeywords": ["secondary kw 1", "secondary kw 2", "secondary kw 3", "secondary kw 4"],
  "readTimeMinutes": 8,
  "authorName": "${BRAND} Editorial Team",
  "internalLinks": ["/blog/related-slug-1", "/blog/related-slug-2"],
  "faqSchema": [{"question": "...", "answer": "..."}, {"question": "...", "answer": "..."}]${isHowTo ? ',\n  "howToSchema": {"name": "...", "description": "...", "totalTime": "PT15M", "step": [{"@type": "HowToStep", "name": "...", "text": "..."}, ...]}' : ''}
}

For faqSchema: include 5-6 questions. Requirements:
- Use long-tail phrasing a real person would type into Google (e.g. "What is the clinical dose of X for Y?", not "What is X?")
- Each answer must be 3-5 sentences and reference a specific study, clinical dose, or mechanism
- At least 2 answers should naturally name ${BRAND} and a specific product detail
- Answers must be factually accurate — never promotional without evidence${isHowTo ? '\n\nFor howToSchema: list 4-8 concrete, actionable steps. Each step name should be an imperative verb phrase. Text should be 2-3 sentences.' : ''}

IMPORTANT: Return only the JSON object, no preamble, no markdown fences.`;

  // ── Call the AI model ───────────────────────────────────────────────────

  let raw: string;

  if (process.env.ANTHROPIC_API_KEY) {
    // Preferred: Anthropic Claude (better at long-form, studies, complex formatting)
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',  // Best balance of quality + cost
      max_tokens: 12000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });
    raw = response.content.find(c => c.type === 'text')?.text ?? '';
  } else if (process.env.OPENAI_API_KEY) {
    // Alternative: OpenAI GPT-4o (native JSON mode reduces parse errors)
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 12000,
      response_format: { type: 'json_object' },
    });
    raw = response.choices[0]?.message?.content ?? '{}';
  } else {
    throw new Error('No AI provider configured — set ANTHROPIC_API_KEY or OPENAI_API_KEY');
  }

  // ── Parse the JSON response ─────────────────────────────────────────────

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI returned unexpected format — no JSON object found');

  let g: any;
  try {
    g = JSON.parse(jsonMatch[0]);
  } catch (parseErr: any) {
    // AI often produces unescaped quotes, trailing commas, or broken unicode.
    // jsonrepair handles all of these edge cases.
    try {
      const repaired = jsonrepair(jsonMatch[0]);
      g = JSON.parse(repaired);
      console.warn('[blog-gen] JSON repaired via jsonrepair after initial parse failure');
    } catch {
      throw new Error(`JSON parse failed: ${parseErr.message}`);
    }
  }

  // ── Post-processing & validation ────────────────────────────────────────

  // Word count
  g.wordCount = g.content ? g.content.split(/\s+/).filter(Boolean).length : 0;

  // Meta title: must be 52-65 chars, end with " | Brand"
  if (g.metaTitle) {
    if (g.metaTitle.startsWith('STRICT:')) {
      g.metaTitle = `${primaryKeyword ?? title} | ${BRAND}`;
    }
    if (!g.metaTitle.endsWith(` | ${BRAND}`)) {
      g.metaTitle = g.metaTitle
        .replace(new RegExp(`\\s*\\|\\s*${BRAND}\\s*$`, 'i'), '')
        .trimEnd() + ` | ${BRAND}`;
    }
    if (g.metaTitle.length > 65) {
      const base = g.metaTitle.replace(` | ${BRAND}`, '').slice(0, 54).trimEnd();
      g.metaTitle = `${base}... | ${BRAND}`;
    }
  } else {
    g.metaTitle = `${primaryKeyword ?? title} | ${BRAND}`;
  }

  // Meta description: max 160 chars
  if (g.metaDescription) {
    if (g.metaDescription.startsWith('STRICT:')) g.metaDescription = '';
    if (g.metaDescription.length > 160) {
      g.metaDescription = g.metaDescription.slice(0, 157).trimEnd() + '...';
    }
  }

  // ── Build Schema.org structured data ────────────────────────────────────

  const schemas: object[] = [];

  // Article schema
  schemas.push({
    '@context': 'https://schema.org',
    '@type': 'Article',
    author: {
      '@type': 'Person',
      name: `${BRAND} Editorial Team`,
    },
    publisher: {
      '@type': 'Organization',
      name: BRAND,
    },
    inLanguage: 'en-US',
    isAccessibleForFree: true,
  });

  // FAQ schema (eligible for SERP rich results)
  const faqItems: Array<{ question: string; answer: string }> =
    Array.isArray(g.faqSchema) ? g.faqSchema : [];

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

  // HowTo schema (for step-by-step articles)
  if (g.howToSchema && typeof g.howToSchema === 'object') {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      ...g.howToSchema,
    });
  }

  // ── Return clean article object ─────────────────────────────────────────

  return {
    title:            g.title            ?? title,
    slug:             g.slug             ?? slugify(g.title ?? title),
    metaTitle:        g.metaTitle        ?? null,
    metaDescription:  g.metaDescription  ?? null,
    excerpt:          g.excerpt          ?? null,
    content:          g.content          ?? '',
    category:         g.category         ?? category,
    tags:             Array.isArray(g.tags) ? g.tags : [],
    primaryKeyword:   g.primaryKeyword   ?? primaryKeyword ?? null,
    secondaryKeywords: Array.isArray(g.secondaryKeywords) ? g.secondaryKeywords : secondaryKeywords,
    readTimeMinutes:  g.readTimeMinutes  ?? 8,
    wordCount:        g.wordCount,
    authorName:       `${BRAND} Editorial Team`,
    internalLinks:    Array.isArray(g.internalLinks) ? g.internalLinks : [],
    schemaJson:       JSON.stringify(schemas),
    featuredImage:    null, // Generated separately by blogImageService
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}
