/**
 * Centralized detector for high-risk health profile states (pregnancy, nursing).
 *
 * Health-profile conditions arrive as free-text strings entered by users
 * (e.g. "Currently pregnant", "TTC", "post-partum 6 weeks"). String matching
 * with a single keyword is fragile and miss states that should trigger
 * pregnancy-specific safety blocks.
 *
 * This module is the single source of truth for the keyword sets so that
 * every formula creation path (chat, revert, custom) gates on the same rules.
 */

const PREGNANCY_KEYWORDS = [
  'pregnant',
  'pregnancy',
  'expecting',
  'gestation',
  'trimester',
  'first trimester',
  'second trimester',
  'third trimester',
  'ttc',
  'trying to conceive',
  'try to conceive',
  'preconception',
  'pre-conception',
  'pre conception',
  'fertility treatment',
  'ivf',
  'in vitro',
];

const NURSING_KEYWORDS = [
  'nursing',
  'breastfeeding',
  'breast feeding',
  'breast-feeding',
  'lactating',
  'lactation',
  'postpartum',
  'post-partum',
  'post partum',
  'pumping milk',
  'pumping breast milk',
];

function matchesAny(conditions: string[] | undefined | null, keywords: string[]): boolean {
  if (!Array.isArray(conditions) || conditions.length === 0) return false;
  return conditions.some((raw) => {
    if (typeof raw !== 'string' || raw.length === 0) return false;
    const c = raw.toLowerCase();
    return keywords.some((k) => c.includes(k));
  });
}

export function detectPregnancyStatus(conditions: string[] | undefined | null): boolean {
  return matchesAny(conditions, PREGNANCY_KEYWORDS);
}

export function detectNursingStatus(conditions: string[] | undefined | null): boolean {
  return matchesAny(conditions, NURSING_KEYWORDS);
}

// Exported for tests
export const _PREGNANCY_KEYWORDS = PREGNANCY_KEYWORDS;
export const _NURSING_KEYWORDS = NURSING_KEYWORDS;
