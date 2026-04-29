/**
 * AI-based preference extractor ΓÇö semantic fallback for the regex
 * detector in `preference-detector.ts`.
 *
 * WHY THIS EXISTS:
 *   The regex detector is fast and free, but brittle by design ΓÇö it
 *   relies on a finite list of removal verbs and exact ingredient-name
 *   matching against the catalog. Real users say things like:
 *     - "i dont want hawthorn berry or ginko"
 *     - "the cinnamon doesn't make sense for me"
 *     - "lose the ginger"
 *     - "swap out garlic for something else"
 *   Many of these slip past the regex, leaving rejected ingredients
 *   un-persisted and free to reappear on the next regeneration.
 *
 * STRATEGY:
 *   - The regex stays as a zero-cost fast path. It catches the common
 *     cases without a network call.
 *   - This module is invoked as a *fallback* (or complement) when the
 *     message looks like it expresses a removal preference but the
 *     regex returned nothing new.
 *   - We use a tiny, strict, low-temperature LLM call: input is the user
 *     message + the catalog name list, output is JSON
 *     `{ "rejected": ["Garlic", "Hawthorn Berry"] }`.
 *   - Output is **validated** against the catalog so the AI cannot make
 *     up an ingredient name and silently blacklist gibberish.
 *
 * NEVER throws ΓÇö on any failure (timeout, parse error, validation
 * failure) returns an empty array so the caller falls back to the
 * regex-only result.
 */

import { SYSTEM_SUPPORTS, INDIVIDUAL_INGREDIENTS } from '@shared/ingredients';
import { logger } from '../../infra/logging/logger';

export type ExtractorAICaller = (input: {
  systemPrompt: string;
  userPrompt: string;
  timeoutMs: number;
}) => Promise<string>;

const DEFAULT_TIMEOUT_MS = 4_000;

/**
 * Heuristic gate ΓÇö when should we burn an AI call on intent extraction?
 *
 * Matches when a message contains a removal *signal* even if the regex
 * detector didn't match. Deliberately broad ΓÇö false positives just cost
 * one cheap AI call, false negatives cost a re-added ingredient in the
 * user's formula.
 */
const PREFERENCE_SIGNAL_PATTERNS: RegExp[] = [
  /\b(no|not|never|none)\b/i,
  /\bdon'?t\b/i,
  /\bdoesn'?t\b/i,
  /\b(remove|drop|delete|omit|exclude|skip|cut|swap|replace|substitute|lose|ditch|nix|kill|kick)\b/i,
  /\b(without|instead of|other than)\b/i,
  /\b(don'?t|do\s*not|doesnt|wouldn'?t)\s+(want|like|need|use)\b/i,
  /\b(get\s*rid|take\s*out|leave\s*out)\b/i,
  /\bsame\s+with\b/i,           // "same with cinnamon"
  /\b(also|and)\s+(no|not|drop|remove)\b/i,
];

/**
 * Inverse signal ΓÇö the message is clearly NOT a removal intent.
 * If matched, skip the AI call regardless of preference signals.
 */
const POSITIVE_SIGNAL_PATTERNS: RegExp[] = [
  /\b(add|include|put in|put back|throw in|stack|increase|more)\b/i,
];

export function shouldRunAIExtractor(message: string, regexFoundCount: number): boolean {
  if (!message || typeof message !== 'string') return false;
  // Tiny messages (<6 chars) almost never carry actionable intent.
  if (message.trim().length < 6) return false;

  // If the regex already found something, we trust it. The AI fallback
  // is to catch what regex missed ΓÇö not to second-guess.
  if (regexFoundCount > 0) return false;

  const hasRemovalSignal = PREFERENCE_SIGNAL_PATTERNS.some(re => re.test(message));
  if (!hasRemovalSignal) return false;

  // If the message also contains a clear "add" signal, treat as ambiguous
  // and skip ΓÇö we don't want to accidentally blacklist something the user
  // is asking to add.
  const hasPositiveSignal = POSITIVE_SIGNAL_PATTERNS.some(re => re.test(message));
  if (hasPositiveSignal) return false;

  return true;
}

const ALL_CATALOG_NAMES: string[] = (() => {
  const set = new Set<string>();
  for (const s of SYSTEM_SUPPORTS) set.add(s.name);
  for (const i of INDIVIDUAL_INGREDIENTS) set.add(i.name);
  return [...set].sort();
})();

const CATALOG_NAMES_LC: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const name of ALL_CATALOG_NAMES) m.set(name.toLowerCase(), name);
  return m;
})();

function buildExtractorPrompt(message: string, recentContext?: string): {
  system: string;
  user: string;
} {
  const system = `You extract ingredient REMOVAL intent from a single user chat message in a supplement-formulation app.

You will be given:
  ΓÇó The user's latest message
  ΓÇó Optionally, a brief snippet of recent conversation context
  ΓÇó A list of approved supplement ingredient names

Your job: return ONLY the ingredients from the approved list that the user is explicitly asking to REMOVE, EXCLUDE, AVOID, or NOT INCLUDE in their formula.

CRITICAL RULES:
  1. Output strict JSON: {"rejected": ["Name1", "Name2"]}
  2. Use EXACT names from the approved list ΓÇö case-sensitive, including suffixes like "Cinnamon 20:1" or "Ginkgo Biloba Extract 24%". Never invent names.
  3. If the user is ASKING for an ingredient ("add X", "include X", "more X") ΓÇö DO NOT include it.
  4. If the user is asking a question about an ingredient ("what does X do") ΓÇö DO NOT include it.
  5. If the user is referencing an ingredient neutrally ("my doctor mentioned X") ΓÇö DO NOT include it.
  6. If the message contains no clear removal intent, return {"rejected": []}.
  7. Common short forms / typos map to canonical names (e.g. "ginko" ΓåÆ "Ginkgo Biloba Extract 24%", "cinnamon" ΓåÆ "Cinnamon 20:1", "hawthorn" ΓåÆ "Hawthorn Berry", "coq10" ΓåÆ "CoEnzyme Q10"). Resolve them to the catalog name.
  8. Never include duplicates. Never include explanations. Never include text outside the JSON object.

Examples:
  Message: "i dont want hawthorn berry or ginko, can you substitute something else same with cinnamon"
  ΓåÆ {"rejected": ["Hawthorn Berry", "Ginkgo Biloba Extract 24%", "Cinnamon 20:1"]}

  Message: "the garlic doesn't really fit my goals"
  ΓåÆ {"rejected": ["Garlic"]}

  Message: "lose the ginger and swap out resveratrol for something else"
  ΓåÆ {"rejected": ["Ginger Root", "Resveratrol"]}

  Message: "actually add more magnesium"
  ΓåÆ {"rejected": []}

  Message: "what does ashwagandha do?"
  ΓåÆ {"rejected": []}`;

  const user = [
    recentContext ? `Recent conversation context:\n${recentContext}\n` : '',
    `User's latest message:\n"""${message}"""\n`,
    `Approved ingredient list (use EXACT names):\n${ALL_CATALOG_NAMES.join(', ')}\n`,
    `Return only the JSON object.`,
  ].filter(Boolean).join('\n');

  return { system, user };
}

function parseExtractorResponse(raw: string): string[] {
  if (!raw || typeof raw !== 'string') return [];

  // Strip code-fence wrappers if the model added them.
  let cleaned = raw.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) cleaned = fenceMatch[1].trim();

  // Extract first JSON object if there's surrounding text.
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!objMatch) return [];

  let parsed: any;
  try {
    parsed = JSON.parse(objMatch[0]);
  } catch {
    return [];
  }

  if (!parsed || !Array.isArray(parsed.rejected)) return [];

  const out = new Set<string>();
  for (const raw of parsed.rejected) {
    if (typeof raw !== 'string') continue;
    const lc = raw.toLowerCase().trim();
    const canonical = CATALOG_NAMES_LC.get(lc);
    if (canonical) out.add(canonical);
  }
  return [...out];
}

export interface AIExtractionResult {
  rejected: string[];
  ranAI: boolean;
  reason?: string;
}

/**
 * Run the AI extractor against a single user message. NEVER throws.
 *
 * Returns `ranAI: false` when the heuristic gate decided the call wasn't
 * worth burning. Returns `ranAI: true, rejected: []` when the AI ran but
 * found no removal intent.
 */
export async function extractRejectionsWithAI(
  args: {
    message: string;
    recentContext?: string;
    regexFoundCount: number;
  },
  callAI: ExtractorAICaller,
  opts: { timeoutMs?: number } = {},
): Promise<AIExtractionResult> {
  const { message, recentContext, regexFoundCount } = args;

  if (!shouldRunAIExtractor(message, regexFoundCount)) {
    return { rejected: [], ranAI: false, reason: 'gate skipped' };
  }

  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const { system, user } = buildExtractorPrompt(message, recentContext);

  let raw: string;
  try {
    raw = await callAI({ systemPrompt: system, userPrompt: user, timeoutMs });
  } catch (err: any) {
    logger.warn('AI preference extractor call failed ΓÇö falling back to regex result', {
      error: err?.message,
    });
    return { rejected: [], ranAI: true, reason: `call failed: ${err?.message || 'unknown'}` };
  }

  const rejected = parseExtractorResponse(raw);
  return { rejected, ranAI: true };
}
