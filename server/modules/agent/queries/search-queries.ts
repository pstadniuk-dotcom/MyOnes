/**
 * Search Queries — Curated search query sets for podcast and press discovery
 *
 * These are the default queries used by the PR agent to scan the internet.
 * The admin can override them via the PR Agent Settings UI.
 */

/** Generate the current and next year for date-aware queries */
function yearFilter(): string {
  const now = new Date();
  const y = now.getFullYear();
  return `${y} ${y + 1}`;
}

export const PODCAST_QUERIES: string[] = [
  // Guest application pages
  `health supplement podcast "be a guest" OR "guest application" OR "guest form" ${yearFilter()}`,
  `wellness biohacking podcast "apply to be a guest" OR "pitch a guest" personalized nutrition`,
  `nutrition supplement podcast "looking for guests" OR "guest pitch" OR "accepting guests"`,

  // Health tech & AI health
  `health technology podcast "guest appearance" OR "interview request" AI personalized`,
  `biohacking longevity podcast guest spots functional medicine supplements`,

  // Entrepreneur / founder angle
  `health startup founder podcast interview "submit your pitch" OR "guest inquiry"`,
  `wellness entrepreneur podcast "be on the show" OR "guest request" supplement brand`,

  // Niche health topics
  `personalized medicine podcast guest application blood work optimization`,
  `functional nutrition podcast "accepting guests" supplement formulation`,
  `health optimization podcast interview request wearable data biometrics`,
];

export const PRESS_QUERIES: string[] = [
  // Guest articles / "write for us"
  `"write for us" personalized nutrition OR supplements OR health tech blog ${yearFilter()}`,
  `"contributor guidelines" OR "submission guidelines" wellness health supplement magazine`,
  `"guest post" OR "guest article" biohacking personalized health nutrition blog`,

  // Product reviews
  `supplement review blog OR magazine "submit product" OR "product review request" personalized ${yearFilter()}`,
  `health wellness product review "send us" OR "review request" supplement brand`,

  // Founder features
  `health startup founder feature OR profile supplement company wellness brand ${yearFilter()}`,
  `"founder spotlight" OR "startup feature" health tech personalized nutrition`,

  // Expert sources
  `journalist "looking for sources" OR "expert sources" supplements nutrition health HARO`,
  `health journalist "seeking experts" OR "expert commentary" personalized nutrition supplements`,

  // Magazine editorial
  `health wellness magazine editorial calendar ${new Date().getFullYear() + 1} supplements nutrition feature`,
];

/**
 * Get a shuffled subset of queries to avoid hitting the same results
 */
export function getSearchQueries(
  category: 'podcast' | 'press',
  count: number = 5,
  customQueries?: string[],
): string[] {
  const source = customQueries && customQueries.length > 0
    ? customQueries
    : category === 'podcast'
    ? PODCAST_QUERIES
    : PRESS_QUERIES;

  // Shuffle and take `count`
  const shuffled = [...source].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
