/**
 * AI-driven medication normalization.
 *
 * Users type prescription medications free-form ("Jantoven", "the purple
 * inhaler", "tirzepatide 7.5mg", "lisinopril/HCTZ"). The deterministic
 * safety validator in safety-validator.ts can only catch interactions when
 * the medication string contains a keyword it knows about — so brand-name
 * variants, compounds, and international names silently slip past.
 *
 * This module asks an LLM to map each raw string to a structured tuple:
 *   { raw, generic, brandFamily, drugClass, confidence }
 *
 * The result is stored alongside the raw list (`healthProfiles.medicationsNormalized`)
 * and fed back into the safety validator via `userMedicationsNormalized`. Each
 * normalized field becomes an additional search term, so a user typing
 * "Jantoven" trips the warfarin guard via generic='warfarin'.
 *
 * Design constraints:
 *   - NEVER block on AI failure. On any error, return entries with null
 *     normalized fields so the safety gate degrades to raw-only matching
 *     (the pre-normalizer behavior).
 *   - Hard timeout — these calls happen during health-profile save and
 *     occasionally inline before formula generation; we cannot let them hang.
 *   - drugClass values are constrained to a fixed vocabulary that mirrors
 *     the safety-validator categories so they're directly matchable as
 *     keywords.
 */

import { chatService } from '../chat/chat.service';
import { aiRuntimeSettings } from '../../infra/ai/ai-config';

// ── Types ───────────────────────────────────────────────────────────────────
export interface NormalizedMedication {
  raw: string;
  generic: string | null;
  brandFamily: string | null;
  drugClass: string | null;
  confidence: number; // 0..1
}

// Constrained vocabulary — these strings must match the keyword arrays in
// safety-validator.ts so that drugClass alone can trigger an interaction
// rule. If you add a new safety category, add its label here too.
const DRUG_CLASS_VOCABULARY = [
  'anticoagulant',        // warfarin, DOACs, heparin
  'antiplatelet',         // clopidogrel, aspirin
  'ssri',                 // sertraline, fluoxetine, etc
  'snri',                 // venlafaxine, duloxetine
  'maoi',                 // phenelzine, selegiline
  'tricyclic_antidepressant',
  'thyroid',              // levothyroxine, liothyronine
  'diabetes',             // metformin, GLP-1, SGLT-2, sulfonylureas, insulin
  'antihypertensive',     // ACE/ARB/CCB/diuretic/beta blocker
  'statin',               // atorvastatin, etc
  'immunosuppressant',    // tacrolimus, cyclosporine, methotrexate, biologics
  'chemotherapy',         // any oncology agent
  'hormone',              // estrogen, testosterone, oral contraceptives
  'antiseizure',          // levetiracetam, lamotrigine, etc
  'sedative',             // benzodiazepines, z-drugs
  'opioid',               // oxycodone, hydrocodone, etc
  'stimulant',            // adderall, vyvanse, ritalin
  'ppi',                  // omeprazole, pantoprazole, etc
  'antibiotic',           // any
  'corticosteroid',       // prednisone, dexamethasone
  'cardiac_glycoside',    // digoxin
  'narrow_therapeutic_index', // digoxin, lithium, theophylline, tacrolimus, warfarin
  'other',                // recognized drug, none of the above categories apply
] as const;

export type DrugClass = typeof DRUG_CLASS_VOCABULARY[number];

// ── Cache ──────────────────────────────────────────────────────────────────
// Per-process cache keyed by the normalized raw string. Drug normalization
// is referentially transparent — "Jantoven" always maps to warfarin — so
// caching avoids an OpenAI call every time a user re-saves their profile
// without changing the medication list. Cache is bounded; oldest entries
// evicted on overflow.
const CACHE_MAX = 1000;
const cache = new Map<string, NormalizedMedication>();

const cacheKey = (raw: string): string => (raw || '').trim().toLowerCase();

const cacheGet = (raw: string): NormalizedMedication | undefined => {
  return cache.get(cacheKey(raw));
};

const cacheSet = (norm: NormalizedMedication): void => {
  if (cache.size >= CACHE_MAX) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(cacheKey(norm.raw), norm);
};

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Normalize a list of raw medication strings to structured form. Returns one
 * NormalizedMedication per non-empty input. Cached entries are reused; only
 * uncached strings hit the AI. On AI failure, uncached strings come back
 * with all normalized fields null and confidence 0 — the caller (safety
 * validator) will then fall back to matching against the raw string only.
 */
export async function normalizeMedications(
  rawMedications: string[]
): Promise<NormalizedMedication[]> {
  const cleaned = (rawMedications || [])
    .map(m => (m || '').trim())
    .filter(m => m.length > 0);

  if (cleaned.length === 0) return [];

  const results: NormalizedMedication[] = [];
  const needsLookup: string[] = [];

  for (const raw of cleaned) {
    const cached = cacheGet(raw);
    if (cached) {
      results.push({ ...cached, raw }); // preserve user's original casing
    } else {
      needsLookup.push(raw);
    }
  }

  if (needsLookup.length === 0) return results;

  let aiResults: NormalizedMedication[] = [];
  try {
    aiResults = await callAINormalizer(needsLookup);
  } catch (err) {
    console.error('[medication-normalizer] AI call failed, returning unnormalized entries:', err);
    aiResults = needsLookup.map(raw => emptyNormalized(raw));
  }

  // Defensive: if AI returned fewer entries than requested, fill the gaps.
  // We pair by raw string match (case-insensitive) so misordered responses
  // still align correctly.
  for (const raw of needsLookup) {
    const aiHit = aiResults.find(
      r => (r.raw || '').toLowerCase() === raw.toLowerCase()
    );
    const norm = aiHit ?? emptyNormalized(raw);
    cacheSet(norm);
    results.push(norm);
  }

  return results;
}

// ── Internal helpers ───────────────────────────────────────────────────────

function emptyNormalized(raw: string): NormalizedMedication {
  return {
    raw,
    generic: null,
    brandFamily: null,
    drugClass: null,
    confidence: 0,
  };
}

async function callAINormalizer(
  rawMedications: string[]
): Promise<NormalizedMedication[]> {
  const provider = (aiRuntimeSettings.provider || process.env.AI_PROVIDER || 'openai').toLowerCase() as 'openai' | 'anthropic';
  // Use a small/fast model — this is structured extraction, not reasoning.
  const model = provider === 'anthropic' ? 'claude-haiku-4-5' : 'gpt-4o-mini';

  const systemPrompt = `You are a clinical pharmacology normalizer. Given a list of free-form medication strings written by patients (which may include brand names, generic names, dose, route, misspellings, or international names), output a JSON array where each entry has:

{
  "raw": <the exact input string, unchanged>,
  "generic": <generic / INN drug name in lowercase, or null if you cannot identify it>,
  "brandFamily": <primary brand/family name in lowercase if the input was a brand, else null>,
  "drugClass": <one of: ${DRUG_CLASS_VOCABULARY.join(', ')}, or null if not identifiable>,
  "confidence": <number 0..1 — your confidence in the mapping>
}

Rules:
- Output ONLY the JSON array. No prose, no markdown fences.
- Preserve input order; one output per input.
- For combination drugs (e.g. "lisinopril/HCTZ"), use the primary active ingredient as generic and pick the most clinically significant drugClass.
- For unrecognized strings ("the green pill", "vitamin XYZ"), return all fields null with confidence 0.
- drugClass MUST be from the allowed vocabulary or null. Do not invent classes.
- Lowercase all generic/brandFamily/drugClass strings.`;

  const userPrompt = `Normalize these medications:\n${JSON.stringify(rawMedications)}`;

  const response = await chatService.complete({
    provider,
    model,
    systemPrompt,
    userPrompt,
    temperature: 0,
    maxTokens: 1500,
    timeoutMs: 10_000,
  });

  return parseAIResponse(response, rawMedications);
}

/**
 * Parse the AI JSON response defensively. Strips any accidental markdown
 * fences, validates each entry's shape, and normalizes drugClass to the
 * allowed vocabulary (anything else becomes null).
 */
function parseAIResponse(
  rawResponse: string,
  expectedRawInputs: string[]
): NormalizedMedication[] {
  const cleaned = rawResponse
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error('[medication-normalizer] JSON parse failed:', err, 'raw response:', rawResponse.slice(0, 500));
    return expectedRawInputs.map(emptyNormalized);
  }

  if (!Array.isArray(parsed)) {
    console.error('[medication-normalizer] Expected array, got:', typeof parsed);
    return expectedRawInputs.map(emptyNormalized);
  }

  const allowedClasses = new Set<string>(DRUG_CLASS_VOCABULARY);

  return parsed
    .filter((entry): entry is Record<string, unknown> =>
      entry !== null && typeof entry === 'object'
    )
    .map(entry => {
      const raw = typeof entry.raw === 'string' ? entry.raw : '';
      const generic = typeof entry.generic === 'string' && entry.generic.length > 0
        ? entry.generic.toLowerCase()
        : null;
      const brandFamily = typeof entry.brandFamily === 'string' && entry.brandFamily.length > 0
        ? entry.brandFamily.toLowerCase()
        : null;
      const drugClassRaw = typeof entry.drugClass === 'string' ? entry.drugClass.toLowerCase() : null;
      const drugClass = drugClassRaw && allowedClasses.has(drugClassRaw) ? drugClassRaw : null;
      const confidenceRaw = typeof entry.confidence === 'number' ? entry.confidence : 0;
      const confidence = Math.max(0, Math.min(1, confidenceRaw));
      return { raw, generic, brandFamily, drugClass, confidence };
    });
}

// ── Test/admin helpers ─────────────────────────────────────────────────────

/** Clear the in-process cache. Used by tests. */
export function _clearNormalizerCache(): void {
  cache.clear();
}

/** Snapshot of current cache size. Used by admin diagnostics / metrics. */
export function getNormalizerCacheStats(): { size: number; max: number } {
  return { size: cache.size, max: CACHE_MAX };
}
