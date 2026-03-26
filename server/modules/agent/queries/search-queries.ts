/**
 * Search Queries — Curated and AI-rotated search query sets for discovery
 *
 * Improvements over original:
 * - Date modifiers automatically appended (current year/month)
 * - Query rotation tracking to avoid repeating searches
 * - Broader query categories for deeper discovery
 * - Configurable query generation
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

  // Expanded discovery queries
  'supplement brand founder podcast episode interview health wellness',
  'AI health startup podcast feature guest entrepreneur',
  'nutrigenomics personalized nutrition podcast looking for experts',
  'holistic health podcast guest application form naturopath supplement',
  'wellness tech podcast guest pitch startup innovation',
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

  // Expanded discovery queries
  'supplement industry news publication editorial personalized vitamins',
  'health tech startup press coverage media feature request',
  'wellness brand media kit press contact editorial supplement',
  'custom supplement formula AI technology health innovation press',
  'biohacking newsletter feature guest contributor health optimization',
];

export const INVESTOR_QUERIES: string[] = [
  // Angel investors in health/wellness
  `angel investor health wellness supplement startup ${yearFilter()}`,
  `angel investor personalized nutrition DTC health brand seed funding`,
  `health tech angel investor portfolio supplement wellness companies`,
  `angel syndicate health wellness CPG investing seed round`,

  // Seed / Series A VCs
  `venture capital firm health wellness supplement portfolio ${yearFilter()}`,
  `VC fund personalized nutrition health tech investment thesis`,
  `seed stage VC health supplement DTC brand portfolio companies`,
  `series A venture capital consumer health wellness startup`,
  `health tech VC fund investing personalized medicine supplements`,

  // DTC / CPG-focused funds
  `DTC consumer brand venture capital fund health wellness portfolio`,
  `CPG venture capital health food supplements investment`,
  `consumer health brand investor fund recent investments ${yearFilter()}`,

  // Health tech & biotech
  `health tech venture fund personalized supplement nutrition investment`,
  `biotech wellness startup investor seed series A ${yearFilter()}`,
  `digital health investor VC fund wearable nutrition personalized`,

  // Family offices & growth funds
  `family office investing health wellness supplement brand`,
  `growth equity health DTC consumer wellness brand portfolio`,
];

// Track which queries have been used recently (persisted per-run via runLog)
const queryUsageHistory = new Map<string, number>(); // query hash → last used timestamp

/**
 * Get a set of queries with smart rotation and date modifiers.
 * Avoids repeating recently used queries and appends current date context.
 */
export function getSearchQueries(
  category: 'podcast' | 'press' | 'investor',
  count: number = 5,
  customQueries?: string[],
): string[] {
  const source = customQueries && customQueries.length > 0
    ? customQueries
    : category === 'podcast'
    ? PODCAST_QUERIES
    : category === 'investor'
    ? INVESTOR_QUERIES
    : PRESS_QUERIES;

  const now = Date.now();
  const year = new Date().getFullYear();
  const month = new Date().toLocaleString('en-US', { month: 'long' });

  // Score queries: lower score = more recently used, higher score = should use next
  const scored = source.map(query => {
    const hash = `${category}:${query}`;
    const lastUsed = queryUsageHistory.get(hash) || 0;
    const hoursSinceUse = (now - lastUsed) / (1000 * 60 * 60);
    // Add randomness to prevent deterministic ordering
    const score = hoursSinceUse + Math.random() * 24;
    return { query, score, hash };
  });

  // Sort by score (highest first = least recently used)
  scored.sort((a, b) => b.score - a.score);

  // Take top N and mark as used
  const selected = scored.slice(0, count);
  for (const s of selected) {
    queryUsageHistory.set(s.hash, now);
  }

  // Append date modifiers to queries
  return selected.map(s => {
    const query = s.query;
    // Add year if not already present
    if (!query.includes(String(year)) && !query.includes(String(year - 1))) {
      return `${query} ${year}`;
    }
    // Update old year references to current
    return query.replace(/20\d{2}/g, String(year));
  });
}

/**
 * Generate new queries based on what's worked (produces high-scoring prospects).
 * Uses patterns from successful discovery to create new search angles.
 */
export function generateQueryVariations(
  baseQuery: string,
  category: 'podcast' | 'press',
): string[] {
  const year = new Date().getFullYear();
  const variations: string[] = [];

  if (category === 'podcast') {
    // Platform variations
    variations.push(`${baseQuery} Spotify Apple Podcasts`);
    variations.push(`${baseQuery} YouTube podcast channel`);
    // Angle variations
    variations.push(`${baseQuery} health entrepreneur interview ${year}`);
    variations.push(`${baseQuery} science-backed supplements expert`);
  } else {
    // Publication type variations
    variations.push(`${baseQuery} online magazine ${year}`);
    variations.push(`${baseQuery} newsletter Substack health`);
    // Angle variations
    variations.push(`${baseQuery} startup innovation health technology`);
    variations.push(`${baseQuery} science nutrition research`);
  }

  return variations;
}

/**
 * Get the number of unique queries available for a category
 */
export function getAvailableQueryCount(category: 'podcast' | 'press'): number {
  return category === 'podcast' ? PODCAST_QUERIES.length : PRESS_QUERIES.length;
}
