/**
 * Preference detector — extracts user intent from free-text chat messages.
 *
 * Two responsibilities:
 *   1. Detect ingredients the user wants REMOVED / REJECTED so they don't
 *      get reintroduced on the next formula iteration.
 *   2. Detect "focused stack" requests (e.g., "make it simpler", "like AG1")
 *      so the AI can switch into a leaner formulation mode.
 *
 * Both detectors are intentionally conservative: only match against the
 * known ingredient catalog so we never accidentally blacklist arbitrary
 * tokens, and only flip formulation mode on explicit phrasing.
 */

import { SYSTEM_SUPPORTS, INDIVIDUAL_INGREDIENTS } from '@shared/ingredients';

export type FormulationMode = 'comprehensive' | 'focused';

const REMOVE_VERBS = [
  'remove',
  'drop',
  'delete',
  'omit',
  'exclude',
  'skip',
  'cut',
  'cut out',
  'take out',
  'leave out',
  'get rid of',
  'stop adding',
  'stop including',
  'stop using',
  'stop putting',
  "don't add",
  "don't include",
  "don't use",
  "don't put",
  "don't want",
  "don't need",
  "don't like",
  'dont add',        // common typo: missing apostrophe
  'dont include',
  'dont use',
  'dont want',       // user said "i dont want hawthorn berry"
  'dont need',
  'dont like',
  'do not add',
  'do not include',
  'do not use',
  'do not want',
  'do not need',
  'do not like',
  'no thanks to',
  'not interested in',
  'no more',
  'no ',
  'without ',
];

/**
 * All ingredient names from the catalog, lowercased, sorted longest-first
 * so multi-word names match before their substrings (e.g., "Vitamin D3"
 * before "Vitamin").
 */
const ALL_INGREDIENT_NAMES: string[] = [
  ...SYSTEM_SUPPORTS.map(s => s.name),
  ...INDIVIDUAL_INGREDIENTS.map(i => i.name),
]
  .filter((name, idx, arr) => arr.indexOf(name) === idx)
  .sort((a, b) => b.length - a.length);

/**
 * Build a map of common short forms / typos → canonical catalog name.
 *
 * Why: catalog names often carry suffixes the user doesn't type (e.g.
 * "Cinnamon 20:1", "Ginkgo Biloba Extract 24%", "Hawthorn Berry").
 * Without aliasing, a user saying "remove cinnamon" matches nothing
 * and the rejection is silently dropped — and the AI / autoExpand
 * keeps re-adding the ingredient on every regeneration.
 *
 * Strategy: for each catalog name, strip well-known trailing tokens
 * (extract %, ratios, descriptors, plant parts) and register the
 * shortened form as an alias. We only register the alias when it
 * uniquely identifies a single catalog entry — otherwise we'd risk
 * a false-positive blacklist.
 */
const SUFFIX_STRIP_PATTERNS: RegExp[] = [
  /\s+extract\s+\d+%?$/i,        // "Ginkgo Biloba Extract 24%"
  /\s+\d+:\d+$/,                  // "Cinnamon 20:1"
  /\s+\d+%$/,                     // "X 95%"
  /\s+(berry|root|leaf|bark|seed|fruit|powder|standardized|complex|extract)$/i,
];

// Curated typos / phonetic misspellings that automatic stripping won't
// produce. Keep small and obvious — anything ambiguous belongs in a
// proper fuzzy-match layer, not here.
const MANUAL_ALIASES: Record<string, string> = {
  ginko: 'Ginkgo Biloba Extract 24%',
  ginkgo: 'Ginkgo Biloba Extract 24%',
  'ginkgo biloba': 'Ginkgo Biloba Extract 24%',
  'co q10': 'CoEnzyme Q10',
  'coq10': 'CoEnzyme Q10',
  'co-q10': 'CoEnzyme Q10',
  'omega-3': 'Omega 3',
  'omega 3': 'Omega 3',
  'fish oil': 'Omega 3',
};

const INGREDIENT_ALIASES: Map<string, string> = (() => {
  const map = new Map<string, string>();
  // Track aliases that map to multiple canonical names → drop them.
  const conflicts = new Set<string>();

  const register = (alias: string, canonical: string) => {
    const key = alias.toLowerCase().trim();
    if (!key) return;
    // Don't shadow an exact catalog name with itself.
    if (key === canonical.toLowerCase()) return;
    if (conflicts.has(key)) return;
    const existing = map.get(key);
    if (existing && existing !== canonical) {
      conflicts.add(key);
      map.delete(key);
      return;
    }
    map.set(key, canonical);
  };

  for (const name of ALL_INGREDIENT_NAMES) {
    let stripped = name;
    for (const re of SUFFIX_STRIP_PATTERNS) {
      const next = stripped.replace(re, '').trim();
      if (next && next !== stripped) {
        register(next, name);
        stripped = next;
      }
    }
  }

  for (const [alias, canonical] of Object.entries(MANUAL_ALIASES)) {
    // Manual aliases override automatic ones — they're explicit.
    if (ALL_INGREDIENT_NAMES.includes(canonical)) {
      map.set(alias.toLowerCase().trim(), canonical);
    }
  }

  return map;
})();

/**
 * Find ingredient names mentioned anywhere in a chunk of text.
 * Returns canonical (catalog-cased) names.
 */
function findMentionedIngredients(text: string): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const name of ALL_INGREDIENT_NAMES) {
    const lcName = name.toLowerCase();
    const escaped = lcName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Use \b only when the boundary character is a word character.
    // Names like "Ginkgo Biloba Extract 24%" end in a non-word char where
    // \b doesn't match — use a permissive lookbehind/lookahead instead so
    // the trailing '%' or similar punctuation still matches cleanly.
    const startBoundary = /^\w/.test(lcName) ? '\\b' : '(?:^|\\W)';
    const endBoundary = /\w$/.test(lcName) ? '\\b' : '(?:$|\\W)';
    const pattern = new RegExp(`${startBoundary}${escaped}${endBoundary}`, 'i');
    if (pattern.test(lower)) {
      found.add(name);
    }
  }
  // Also resolve aliases (short forms / typos) that didn't match above.
  for (const [alias, canonical] of INGREDIENT_ALIASES) {
    if (found.has(canonical)) continue;
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`\\b${escaped}\\b`, 'i');
    if (pattern.test(lower)) {
      found.add(canonical);
    }
  }
  return [...found];
}

/**
 * Detect ingredients the user wants removed from this and future formulas.
 *
 * Strategy: split the message into clauses around removal verbs, then look
 * for catalog ingredient names in each removal clause.
 *
 * Examples that match:
 *   - "remove Garlic and Resveratrol"
 *   - "drop the garlic"
 *   - "no more ginkgo please"
 *   - "stop adding garlic and resveratrol"
 *   - "without garlic"
 */
export function detectRejectedIngredients(message: string): string[] {
  if (!message || typeof message !== 'string') return [];
  const lower = message.toLowerCase();

  const rejected = new Set<string>();

  for (const verb of REMOVE_VERBS) {
    let searchFrom = 0;
    while (true) {
      const idx = lower.indexOf(verb, searchFrom);
      if (idx === -1) break;
      // Look at the next ~120 chars after the removal verb for ingredient names
      const window = message.substring(idx, idx + 120);
      // But cut off at sentence-terminating punctuation so we don't grab
      // ingredients from the next sentence ("Drop garlic. Add ashwagandha.")
      const stopMatch = window.search(/[.!?\n]/);
      const clause = stopMatch > 0 ? window.substring(0, stopMatch) : window;
      for (const name of findMentionedIngredients(clause)) {
        rejected.add(name);
      }
      searchFrom = idx + verb.length;
    }
  }

  return [...rejected];
}

/**
 * Detect when the user is asking for a leaner / more focused stack
 * (vs. a comprehensive multi-ingredient formula). When true, the AI
 * should target 3-4 hero ingredients rather than 6-9.
 */
const FOCUSED_PHRASES = [
  'focused stack',
  'focused daily',         // "more focused daily supplement" (David's phrasing)
  'focused supplement',
  'focused formula',
  'simpler stack',
  'simple stack',
  'minimalist',
  'minimal stack',
  'fewer ingredients',
  'less ingredients',
  'fewer items',
  'less items',
  'just the essentials',
  'essentials only',
  'essential only',
  'streamlined',
  'pared down',
  'pare it down',
  'pare down',
  'trim it down',
  'cut it down',
  'one daily',
  'daily multi',
  'foundational stack',
  'foundation stack',
  'less complicated',
  'simplify',
  'simpler',
];

// Word-boundary AG1 mention (matches "like AG1", "like my AG1",
// "similar to AG1", "AG1-style", etc. without matching random substrings).
const AG1_PATTERN = /\bag1\b/i;

const COMPREHENSIVE_PHRASES = [
  'more comprehensive',
  'comprehensive stack',
  'add more',
  'expand the formula',
  'expand the stack',
  'more ingredients',
  'bigger formula',
  'bigger stack',
  'full stack',
  'kitchen sink',
  'go all in',
  'maximize',
];

export function detectFormulationModeChange(message: string): FormulationMode | null {
  if (!message || typeof message !== 'string') return null;
  const lower = message.toLowerCase();
  if (AG1_PATTERN.test(message)) return 'focused';
  for (const phrase of FOCUSED_PHRASES) {
    if (lower.includes(phrase)) return 'focused';
  }
  for (const phrase of COMPREHENSIVE_PHRASES) {
    if (lower.includes(phrase)) return 'comprehensive';
  }
  return null;
}
