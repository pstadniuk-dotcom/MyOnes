/**
 * Dynamic Topic Discovery
 * ------------------------
 * Mines `keyword_data` (DataForSEO + manual seeds) for SEO opportunities that
 * are NOT already covered by published `blog_posts`, then converts each
 * remaining keyword into a `TopicCluster`-shaped record the blog scheduler
 * can consume.
 *
 * Why this exists:
 *   The static list in `shared/topic-clusters.ts` (~198 entries) was exhausted
 *   in the first wave of automated generation (269 articles published →
 *   `getUnusedTopics()` returns 0). Without a refilling source the scheduler
 *   silently no-ops every night. This module is that refilling source.
 *
 * Strategy:
 *   1. Load every keyword with measurable volume (default >= 100 / month).
 *   2. Skip keywords that already correspond to a published article — match
 *      on primary_keyword, secondary_keywords array, and a normalized title
 *      substring check (catches "magnesium glycinate sleep" when we already
 *      published "Magnesium Glycinate for Sleep").
 *   3. Classify each remaining keyword into a tier
 *      (ingredient | comparison | symptom | lab | lifestyle | system) using
 *      simple lexical rules — good enough for templated titles.
 *   4. Generate a tier-appropriate article title + category + secondary
 *      keywords (we mine close lexical neighbors from the same keyword pool).
 *   5. Score by `volume / max(kd, 1)` — same formula as `enrichCluster`.
 *
 * The returned objects are structurally identical to `TopicCluster` so the
 * existing pipeline (priority sort, SEO strategy filters, generateArticle)
 * keeps working unchanged.
 */

import { db } from '../infra/db/db';
import { keywordData, blogPosts } from '../../shared/schema';
import { sql } from 'drizzle-orm';
import logger from '../infra/logging/logger';
import type { TopicCluster } from '../../shared/topic-clusters';

// ── Tunables ─────────────────────────────────────────────────────────────────

export interface DiscoveryOptions {
  /** Minimum monthly search volume to consider a keyword. Default 100. */
  minVolume?: number;
  /** Maximum keyword difficulty (0–100). Default 70 — skip the brutally hard. */
  maxKd?: number;
  /** Cap on how many candidates to return (sorted by priority). Default 200. */
  limit?: number;
  /** Restrict to these tiers (after classification). Defaults to all six. */
  tiers?: TopicCluster['tier'][];
}

const DEFAULT_OPTS: Required<DiscoveryOptions> = {
  minVolume: 100,
  maxKd: 70,
  limit: 200,
  tiers: ['ingredient', 'comparison', 'symptom', 'lab', 'lifestyle', 'system'],
};

// ── Public API ───────────────────────────────────────────────────────────────

export type DynamicTopic = TopicCluster & { volume: number; kd: number; cpc: number; priorityScore: number };

/**
 * Returns dynamically generated topic clusters derived from `keyword_data`,
 * filtered against existing `blog_posts`. Sorted by priority desc.
 */
export async function discoverDynamicTopics(opts: DiscoveryOptions = {}): Promise<DynamicTopic[]> {
  const { minVolume, maxKd, limit, tiers } = { ...DEFAULT_OPTS, ...opts };

  // Pull opportunity keywords — order by raw volume desc so the first scan
  // always sees the highest-value gaps even if `limit` is small.
  const candidates = await db
    .select({
      keyword: keywordData.keyword,
      volume: keywordData.volume,
      kd: keywordData.kd,
      cpc: keywordData.cpc,
    })
    .from(keywordData)
    .where(sql`${keywordData.volume} >= ${minVolume} AND COALESCE(${keywordData.kd}, 0) <= ${maxKd}`)
    .orderBy(sql`${keywordData.volume} DESC`)
    .limit(2000); // pre-filter pool — we'll narrow further after coverage check

  if (!candidates.length) {
    logger.info('[dynamic-topics] No keyword_data rows match volume/KD thresholds');
    return [];
  }

  // Build coverage set from existing posts: primary_keyword, secondary_keywords,
  // and normalized titles. We compare in lowercase.
  const posts = await db
    .select({
      title: blogPosts.title,
      primaryKeyword: blogPosts.primaryKeyword,
      secondaryKeywords: blogPosts.secondaryKeywords,
    })
    .from(blogPosts);

  const coveredKeywords = new Set<string>();
  const coveredTitleNormalized: string[] = [];

  for (const p of posts) {
    if (p.primaryKeyword) coveredKeywords.add(normalizeKw(p.primaryKeyword));
    if (Array.isArray(p.secondaryKeywords)) {
      for (const s of p.secondaryKeywords) {
        if (typeof s === 'string') coveredKeywords.add(normalizeKw(s));
      }
    }
    coveredTitleNormalized.push(normalizeKw(p.title));
  }

  // Build a lookup of all candidate keywords (normalized → row) so we can mine
  // lexical neighbors for secondary keyword suggestions.
  const candidateByNorm = new Map<string, typeof candidates[number]>();
  for (const c of candidates) candidateByNorm.set(normalizeKw(c.keyword), c);

  const seenRoot = new Set<string>(); // dedupe near-identical kw variants
  const out: DynamicTopic[] = [];

  for (const c of candidates) {
    const norm = normalizeKw(c.keyword);

    // Skip if a published article already targets this exact keyword,
    // mentions it as a secondary, or has a normalized title containing it.
    if (coveredKeywords.has(norm)) continue;
    if (coveredTitleNormalized.some(t => t.includes(norm))) continue;

    // Dedupe near-duplicates ("magnesium glycinate sleep" vs
    // "magnesium glycinate for sleep") — collapse stopwords.
    const root = collapseRoot(norm);
    if (seenRoot.has(root)) continue;
    seenRoot.add(root);

    const tier = classifyTier(c.keyword);
    if (!tiers.includes(tier)) continue;

    const title = composeTitle(c.keyword, tier);
    const category = deriveCategory(c.keyword, tier);
    const secondaryKeywords = mineSecondaryKeywords(c.keyword, candidateByNorm, coveredKeywords, 4);

    const volume = c.volume ?? 0;
    const kd = c.kd ?? 50;
    const cpc = Number(c.cpc ?? 0);

    out.push({
      title,
      category,
      tier,
      primaryKeyword: c.keyword,
      secondaryKeywords,
      volume,
      kd,
      cpc,
      priorityScore: Math.round(volume / Math.max(kd, 1)),
    });

    if (out.length >= limit) break;
  }

  out.sort((a, b) => b.priorityScore - a.priorityScore);
  logger.info(`[dynamic-topics] Discovered ${out.length} new topics from ${candidates.length} keyword candidates`);
  return out;
}

// ── Internals ────────────────────────────────────────────────────────────────

function normalizeKw(s: string): string {
  return s
    .toLowerCase()
    .replace(/['’"`]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOPWORDS = new Set(['the', 'a', 'an', 'for', 'of', 'to', 'and', 'or', 'in', 'on', 'with', 'is', 'are', 'best', 'top']);

/** Collapse a normalized keyword to a "root" by removing stopwords + sorting tokens. */
function collapseRoot(normalized: string): string {
  const toks = normalized.split(' ').filter(t => t && !STOPWORDS.has(t));
  toks.sort();
  return toks.join(' ');
}

const COMPARISON_RE = /\bvs\.?\b|\bversus\b/i;
const SYMPTOM_HINTS = /\b(deficiency|low|symptoms?|causes?|signs?|side effects?|fatigue|insomnia|anxiety|depression|brain fog|hair loss|bloating|cramps?|inflammation)\b/i;
const LAB_HINTS = /\b(test|levels?|range|blood (work|test)|panel|biomarker|hba1c|crp|tsh|ferritin|homa-?ir|lipid|cortisol levels?)\b/i;
const LIFESTYLE_HINTS = /\b(sleep|stress|longevity|biohack|fasting|keto|workout|exercise|recovery|meditation|nootropic)\b/i;
const SYSTEM_HINTS = /\b(immune|adrenal|liver|thyroid|kidney|gut|heart|cardio|joint|bone) (support|health|formula)\b/i;

function classifyTier(kw: string): TopicCluster['tier'] {
  if (COMPARISON_RE.test(kw)) return 'comparison';
  if (SYSTEM_HINTS.test(kw)) return 'system';
  if (LAB_HINTS.test(kw)) return 'lab';
  if (SYMPTOM_HINTS.test(kw)) return 'symptom';
  if (LIFESTYLE_HINTS.test(kw)) return 'lifestyle';
  return 'ingredient'; // default — most kw_data rows are supplement/ingredient queries
}

function titleCase(s: string): string {
  // Health/supplement acronyms we always want uppercased.
  const ACRONYMS = new Set([
    'ibs', 'ibd', 'uti', 'utis', 'pcos', 'adhd', 'gerd', 'gi', 'cbd', 'thc', 'dna', 'rna', 'hiv',
    'tsh', 't3', 't4', 'crp', 'hba1c', 'ldl', 'hdl', 'shbg', 'fsh', 'lh', 'igf', 'tnf', 'il6',
    'nac', 'nad', 'nmn', 'nr', 'coq10', 'dhea', 'gaba', 'mct', 'omega', 'epa', 'dha', 'als',
    'spf', 'uv', 'led', 'rda', 'fda', 'usp', 'gmp', 'usda', 'b12', 'b6', 'b3', 'b1', 'd3', 'k2',
  ]);
  // Words to keep lowercase unless first word.
  const SMALL = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'vs', 'with']);

  const tokens = s.split(/\s+/);
  return tokens
    .map((w, i) => {
      const bare = w.toLowerCase();
      if (ACRONYMS.has(bare)) return bare.toUpperCase();
      if (i > 0 && SMALL.has(bare)) return bare;

      // Hyphenated words like "l-theanine", "5-htp" — capitalize each part separately.
      if (w.includes('-')) {
        return w.split('-').map(part => {
          const pBare = part.toLowerCase();
          if (ACRONYMS.has(pBare)) return pBare.toUpperCase();
          // Single letter prefix (l-, n-, d-) → uppercase
          if (part.length === 1) return part.toUpperCase();
          // Numeric prefix like "5htp" → leave numbers as-is, capitalize letters
          return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        }).join('-');
      }

      // Already-uppercase pure-acronym tokens (>=2 chars, no lowercase) — preserve.
      if (/^[A-Z0-9]{2,}$/.test(w)) return w;

      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ');
}

function composeTitle(kw: string, tier: TopicCluster['tier']): string {
  const t = titleCase(kw.trim());
  switch (tier) {
    case 'comparison':
      return `${t}: Which Is Better and When to Choose Each`;
    case 'symptom':
      return `${t}: Causes, Lab Markers, and Evidence-Based Supplement Support`;
    case 'lab':
      return `${t}: What It Means and How to Optimize It`;
    case 'lifestyle':
      return `${t}: An Evidence-Based Guide`;
    case 'system':
      return `${t}: The Complete Protocol Backed by Research`;
    case 'ingredient':
    default:
      return `${t}: Benefits, Dosage, and What the Research Actually Shows`;
  }
}

const CATEGORY_MAP: Array<[RegExp, string]> = [
  [/\b(magnesium|calcium|zinc|iron|potassium|sodium)\b/i, 'Minerals'],
  [/\b(vitamin|b12|b6|folate|biotin|niacin|riboflavin|thiamine)\b/i, 'Vitamins'],
  [/\b(probiotic|prebiotic|gut|digestion|microbiome|bloating)\b/i, 'Gut Health'],
  [/\b(sleep|melatonin|insomnia|circadian)\b/i, 'Sleep'],
  [/\b(stress|anxiety|cortisol|adrenal|adaptogen)\b/i, 'Stress & Adrenal'],
  [/\b(thyroid|tsh|t3|t4|hashimoto)\b/i, 'Thyroid'],
  [/\b(testosterone|libido|men)\b/i, "Men's Health"],
  [/\b(menopause|perimenopause|estrogen|pcos|women|cycle|menstrual)\b/i, "Women's Health"],
  [/\b(longevity|nad|nmn|nr|resveratrol|aging|sirtuin)\b/i, 'Longevity'],
  [/\b(cognitive|nootropic|focus|memory|brain)\b/i, 'Cognitive Health'],
  [/\b(heart|cardio|cholesterol|bp|blood pressure|coq10)\b/i, 'Cardiovascular'],
  [/\b(immune|elderberry|echinacea|vitamin c|zinc)\b/i, 'Immune Support'],
  [/\b(workout|protein|creatine|bcaa|muscle|recovery)\b/i, 'Performance'],
  [/\b(weight|metabolism|fat loss|berberine|glp)\b/i, 'Metabolic Health'],
  [/\b(skin|collagen|hair|nail|biotin)\b/i, 'Skin & Beauty'],
];

function deriveCategory(kw: string, tier: TopicCluster['tier']): string {
  for (const [re, cat] of CATEGORY_MAP) {
    if (re.test(kw)) return cat;
  }
  // Tier fallbacks
  switch (tier) {
    case 'lab': return 'Lab Results';
    case 'lifestyle': return 'Lifestyle';
    case 'comparison': return 'Comparisons';
    case 'system': return 'Supplements';
    default: return 'Supplements';
  }
}

/**
 * Find up to `n` other candidate keywords that share at least one significant
 * token with the primary keyword and are not already covered. Cheap on-CPU
 * lookup — no embedding model needed.
 */
function mineSecondaryKeywords(
  primary: string,
  pool: Map<string, { keyword: string; volume: number | null }>,
  covered: Set<string>,
  n: number,
): string[] {
  const primaryNorm = normalizeKw(primary);
  const primaryRoot = collapseRoot(primaryNorm);
  const primaryTokens = new Set(primaryNorm.split(' ').filter(t => t && !STOPWORDS.has(t) && t.length > 2));
  if (primaryTokens.size === 0) return [];

  const scored: Array<{ kw: string; score: number; vol: number }> = [];
  for (const [norm, row] of pool.entries()) {
    if (norm === primaryNorm) continue;
    if (collapseRoot(norm) === primaryRoot) continue; // skip near-dups
    if (covered.has(norm)) continue;

    const toks = norm.split(' ').filter(t => t && !STOPWORDS.has(t));
    let overlap = 0;
    for (const tok of toks) if (primaryTokens.has(tok)) overlap++;
    if (overlap === 0) continue;

    scored.push({ kw: row.keyword, score: overlap, vol: row.volume ?? 0 });
  }

  scored.sort((a, b) => (b.score - a.score) || (b.vol - a.vol));
  return scored.slice(0, n).map(s => s.kw);
}
