/**
 * Blog Generation Service
 * Core AI article generation logic, shared by:
 *  - adminAiGenerate() HTTP handler
 *  - blogGenerationScheduler (automated daily cron job)
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

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
}

const SYSTEM_PROMPT = `You are a senior health & supplement content strategist for Ones — a personalized supplement platform that builds custom capsule formulas from a user's lab results, wearable data, and health goals.

Ones product overview (weave this into articles naturally, not as ads):
- AI health practitioner that analyzes blood work, wearable data, and health history
- Custom capsule formulas using 200+ clinically validated ingredients
- System Blends (proprietary): Adrenal Support, Liver Support, Heart Support, Thyroid Support, Endocrine Support, Histamine Support, Lung Support, Kidney & Bladder Support, Beta Max, Immune-C, C Boost, Ligament Support, Magnesium Complex
- Individual ingredients dosed to clinical ranges: Ashwagandha (KSM-66 600mg), Omega-3 (EPA/DHA), Vitamin D3 + K2 (MK-7), Magnesium Glycinate, CoQ10/Ubiquinol (200mg), Selenium (selenomethionine 200mcg), Zinc, NAC, NMN, Rhodiola Rosea, and 180+ more
- Formulas come in 6, 9, or 12-capsule plans calibrated to capsule budgets

Brand name rule: Always call the brand "Ones" (not "ONES AI", not "ONES"). When writing comparison tables, use "Ones" as the column header.

Language: American English spelling throughout — use "personalized" not "personalised", "optimized" not "optimised", "recognized" not "recognised", "fiber" not "fibre", "defense" not "defence". No British or Australian spellings.

Writing standards:
- Minimum 1800 words, target 2000–2500 words
- Use secondary keywords as H2 subheadings where natural
- Every factual claim must reference a real study (journal + year) or a credible body like NIH, AHA, WHO
- Include a "How Ones Addresses This" or "What This Means for Your Formula" section (H2) near the end — mention 2–3 specific Ones ingredients relevant to the article topic with real clinical doses
- End with a "Key Takeaways" H2 with 4–6 bullet points
- Never make FDA-prohibited disease claims; recommend consulting a healthcare provider for medical decisions
- Tables and dosing data are encouraged — use markdown tables (| col | col |)
- Use ordered (numbered) lists for protocols; unordered for features/options
- EEAT signals: cite author expertise implicitly through specificity, cite real study details (sample size, duration, effect size where known)
- Within the article body, naturally embed 3–5 internal links using keyword-rich anchor text in standard markdown format: [descriptive keyword anchor text](/blog/relevant-slug). These must appear inline within sentences, not in a list. Use realistic slug paths based on supplement or health topic names (e.g. [clinical evidence for ashwagandha](/blog/ashwagandha-benefits-dosage-evidence), [optimal magnesium glycinate dosage](/blog/magnesium-glycinate-benefits-sleep), [vitamin D3 and K2 synergy](/blog/vitamin-d3-k2-optimal-levels-dosage), [omega-3 EPA DHA ratio guide](/blog/omega-3-fish-oil-benefits-epa-dha-ratio)). Never link to the article you are writing. Use anchor text that reads naturally in the sentence — never "click here" or bare URLs.
- When comparing ONES AI to competitors, only reference active companies: Viome (gut microbiome testing + AI recs), Thorne (practitioner-grade), Ritual (subscription multis), Function Health (lab testing). Do NOT mention Care/Of — they shut down in 2023.`;

export async function generateArticle(input: GenerateArticleInput): Promise<GeneratedArticle> {
  const { title, category = 'Health & Wellness', tone = 'informative', primaryKeyword, secondaryKeywords = [] } = input;
  const skwList = secondaryKeywords.join(', ') || title;
  const isHowTo = /^how\s+(to|i\s)|\d+\s+ways?\s+to|step[- ]by[- ]step/i.test(title);

  const userMessage = `Write a ${tone} SEO-optimized blog article for Ones.

Title: ${title}
Category: ${category}
Primary keyword: ${primaryKeyword || title}
Secondary keywords to use as H2 subheadings (use at least 3): ${skwList}

Return a JSON object with these EXACT fields:
{
  "title": "...",
  "slug": "url-friendly-slug-max-60-chars",
  "metaTitle": "STRICT: [Pain/Number] + [Primary Keyword] + [Differentiator] | Ones. Must be 52-62 chars total. Example: 'Low Ferritin Symptoms: Why Iron Deficiency Drains Energy | Ones' (62 chars). Count before submitting.",
  "metaDescription": "STRICT: 150-160 characters. Open with primary keyword or a sharp pain/stat. End with benefit or soft CTA. Count before submitting. Example: 'Low ferritin causes fatigue, brain fog, and hair loss even without anemia. Learn the optimal iron protocol and how Ones builds it into your formula.' (157 chars)",
  "excerpt": "2-3 sentence hook paragraph — lead with the problem or a surprising stat",
  "content": "Full markdown article 1800-2500 words...",
  "category": "${category}",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "primaryKeyword": "exact primary keyword",
  "secondaryKeywords": ["secondary kw 1", "secondary kw 2", "secondary kw 3", "secondary kw 4"],
  "readTimeMinutes": 8,
  "authorName": "Ones Editorial Team",
  "internalLinks": ["/blog/related-slug-1", "/blog/related-slug-2"],
  "faqSchema": [{"question": "...", "answer": "..."}, {"question": "...", "answer": "..."}]${isHowTo ? ',\n  "howToSchema": {"name": "...", "description": "...", "totalTime": "PT15M", "step": [{"@type": "HowToStep", "name": "...", "text": "..."}, ...]}' : ''}
}

For faqSchema: include 5-6 questions. Requirements:
- Use long-tail phrasing a real person would type into Google or ask Perplexity (e.g. "What is the clinical dose of KSM-66 ashwagandha for cortisol reduction?", not "What is ashwagandha?")
- Each answer must be 3-5 sentences and reference a specific study, clinical dose, or mechanism
- At least 2 answers should naturally name Ones and a specific product detail (e.g. "Ones formulas include selenomethionine at 200mcg, matching the dose used in the Gärtner 2002 Hashimoto's trial...")
- Answers must be factually accurate — never promotional without evidence${isHowTo ? '\n\nFor howToSchema: list 4-8 concrete, actionable steps. Each step name should be an imperative verb phrase (e.g. "Test your baseline ferritin levels"). Text should be 2-3 sentences expanding on the step.' : ''}

IMPORTANT: Return only the JSON object, no preamble, no markdown fences.`;

  let raw: string;

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
      response_format: { type: 'json_object' },
    });
    raw = response.choices[0]?.message?.content ?? '{}';
  } else {
    throw new Error('No AI provider configured (set ANTHROPIC_API_KEY or OPENAI_API_KEY)');
  }

  // Extract JSON — handles stray markdown fences
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI returned unexpected format');

  const g = JSON.parse(jsonMatch[0]);

  g.wordCount = g.content
    ? g.content.split(/\s+/).filter(Boolean).length
    : 0;

  // ── Meta title validation (SERP display window: 50-65 chars) ────────────────
  if (g.metaTitle) {
    // Strip if AI returned the instruction text verbatim
    if (g.metaTitle.startsWith('STRICT:')) g.metaTitle = `${primaryKeyword ?? title} | Ones`;
    // Normalize brand suffix
    if (!g.metaTitle.endsWith(' | Ones')) {
      g.metaTitle = g.metaTitle.replace(/\s*\|\s*Ones\s*AI\s*$|\s*\|\s*ones\.health\s*$/i, '').trimEnd() + ' | Ones';
    }
    // Trim overshoots (>65 chars) — preserve " | Ones" suffix
    if (g.metaTitle.length > 65) {
      const base = g.metaTitle.replace(/ \| Ones$/, '').slice(0, 54).trimEnd();
      g.metaTitle = `${base}... | Ones`;
    }
  } else {
    g.metaTitle = `${primaryKeyword ?? title} | Ones`;
  }

  // ── Meta description validation (SERP display window: 145-165 chars) ────────
  if (g.metaDescription) {
    if (g.metaDescription.startsWith('STRICT:')) g.metaDescription = '';
    if (g.metaDescription.length > 165) {
      g.metaDescription = g.metaDescription.slice(0, 162).trimEnd() + '...';
    }
    if (g.metaDescription.length < 100) {
      console.warn(`[blog-gen] metaDescription too short (${g.metaDescription.length} chars) for: "${g.metaTitle}"`);
    }
  }

  // Build combined schema array: Article + FAQPage + (optional) HowTo
  // All schemas use @id references to entities defined in index.html Organization graph
  const faqItems: Array<{question: string; answer: string}> = Array.isArray(g.faqSchema) ? g.faqSchema : [];
  let combinedSchema: string | null = g.schemaJson ?? null;

  // Parse base Article schema and ensure it references the global entity graph
  let articleSchema: Record<string, unknown>;
  try {
    articleSchema = combinedSchema ? JSON.parse(combinedSchema) : {};
  } catch {
    articleSchema = {};
  }
  // Normalize to always reference the canonical @id entities
  articleSchema['@context'] = 'https://schema.org';
  articleSchema['@type'] = 'Article';
  articleSchema['author'] = { '@type': 'Person', '@id': 'https://ones.health/#author-editorial', name: 'Ones Editorial Team' };
  articleSchema['publisher'] = { '@type': 'Organization', '@id': 'https://ones.health/#organization', name: 'Ones' };
  articleSchema['inLanguage'] = 'en-US';
  articleSchema['isAccessibleForFree'] = true;

  const schemas: object[] = [articleSchema];

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

  // HowTo schema — only generated for step-by-step how-to articles
  if (g.howToSchema && typeof g.howToSchema === 'object') {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      ...g.howToSchema,
    });
  }

  combinedSchema = JSON.stringify(schemas);

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
    authorName:       'Ones Editorial Team',
    internalLinks:    Array.isArray(g.internalLinks) ? g.internalLinks : [],
    schemaJson:       combinedSchema,
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
