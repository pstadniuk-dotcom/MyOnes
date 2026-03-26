/**
 * Topic Cluster List — Your Editorial Calendar
 *
 * Plan ALL your articles upfront. Each cluster defines:
 *   - title:             Full article title
 *   - category:          Content category for filtering
 *   - tier:              Content type (pillar, product, ingredient, comparison, symptom, etc.)
 *   - primaryKeyword:    The main keyword you want to rank for
 *   - secondaryKeywords: 3-5 related keywords (used as H2 subheadings in the article)
 *   - volume/kd/cpc:     Populated by the keyword research script (leave empty initially)
 *
 * The scheduler picks from this list, prioritizes by keyword data, and generates articles
 * in order of opportunity (high volume + low competition first).
 *
 * ────────────────────────────────────────────────────────────────────
 *  CUSTOMIZE THIS FILE FOR YOUR NICHE — replace all examples below
 *  with your own topics, keywords, and categories.
 * ────────────────────────────────────────────────────────────────────
 */

export interface TopicCluster {
  title: string;
  category: string;
  tier: string;  // e.g. 'pillar' | 'product' | 'ingredient' | 'comparison' | 'symptom' | 'how-to' | 'lifestyle'
  primaryKeyword: string;
  secondaryKeywords: string[];
  /** Monthly US search volume — populated by scripts/keyword-research.cjs */
  volume?: number;
  /** Keyword difficulty 0-100 (DataForSEO competition_index) */
  kd?: number;
  /** Cost-per-click USD (signal of commercial intent) */
  cpc?: number;
}

// ════════════════════════════════════════════════════════════════════════════
//  REPLACE EVERYTHING BELOW WITH YOUR OWN TOPICS
// ════════════════════════════════════════════════════════════════════════════

export const TOPIC_CLUSTERS: TopicCluster[] = [

  // ── PILLAR ARTICLES (broad authority pages, 2000-2500 words) ──────────
  {
    tier: 'pillar',
    title: 'The Complete Guide to Personalized Supplements: How to Build a Formula for Your Biology',
    category: 'Personalized Health',
    primaryKeyword: 'personalized supplements',
    secondaryKeywords: ['custom supplement formula', 'blood test supplements', 'personalized nutrition'],
  },
  {
    tier: 'pillar',
    title: 'How to Read Your Blood Test Results: A Plain-English Guide to Every Marker',
    category: 'Lab Results',
    primaryKeyword: 'how to read blood test results',
    secondaryKeywords: ['blood test markers explained', 'CBC interpretation', 'metabolic panel guide'],
  },
  {
    tier: 'pillar',
    title: 'The Ultimate Guide to Sleep Optimization: Supplements, Habits, and Lab Markers',
    category: 'Sleep',
    primaryKeyword: 'sleep optimization guide',
    secondaryKeywords: ['best supplements for sleep', 'how to improve sleep quality', 'sleep lab markers'],
  },

  // ── PRODUCT ARTICLES (your proprietary features/products) ─────────────
  {
    tier: 'product',
    title: 'Adrenal Support: What It Is, Who Needs It, and the Clinical Evidence Behind the Formula',
    category: 'Products',
    primaryKeyword: 'adrenal support supplement',
    secondaryKeywords: ['adrenal fatigue recovery', 'cortisol regulation', 'HPA axis support'],
  },
  {
    tier: 'product',
    title: 'Heart Support Formula: The Cardioprotective Nutrients Cardiologists Discuss Most',
    category: 'Products',
    primaryKeyword: 'heart health supplements',
    secondaryKeywords: ['CoQ10 heart health', 'omega-3 cardiovascular support', 'magnesium heart rhythm'],
  },

  // ── INGREDIENT DEEP-DIVES ─────────────────────────────────────────────
  {
    tier: 'ingredient',
    title: 'Ashwagandha (KSM-66): Stress, Cortisol, and the Clinical Data on 600 mg',
    category: 'Supplements',
    primaryKeyword: 'ashwagandha KSM-66',
    secondaryKeywords: ['ashwagandha cortisol', 'ashwagandha dosage', 'adaptogen for stress'],
  },
  {
    tier: 'ingredient',
    title: 'Vitamin D3 and K2: Why You Should Never Take One Without the Other',
    category: 'Supplements',
    primaryKeyword: 'vitamin D3 K2 supplement',
    secondaryKeywords: ['vitamin D deficiency', 'MK-7 vs MK-4', 'calcium and vitamin D3 K2'],
  },
  {
    tier: 'ingredient',
    title: 'Magnesium Glycinate: The Superior Form for Sleep, Anxiety, and Muscle Recovery',
    category: 'Supplements',
    primaryKeyword: 'magnesium glycinate supplement',
    secondaryKeywords: ['magnesium for sleep', 'magnesium deficiency symptoms', 'best magnesium for anxiety'],
  },
  {
    tier: 'ingredient',
    title: 'Omega-3 EPA and DHA: The Dose, Form, and Frequency That Actually Makes a Difference',
    category: 'Supplements',
    primaryKeyword: 'omega-3 EPA DHA supplement',
    secondaryKeywords: ['fish oil vs algae oil', 'EPA DHA ratio inflammation', 'omega-3 bioavailability'],
  },
  {
    tier: 'ingredient',
    title: 'NMN: The NAD+ Precursor Turning Heads in Longevity Research',
    category: 'Supplements',
    primaryKeyword: 'NMN supplement',
    secondaryKeywords: ['NMN vs NR', 'NAD+ and aging', 'NMN dosage evidence'],
  },

  // ── COMPARISON ARTICLES ───────────────────────────────────────────────
  {
    tier: 'comparison',
    title: 'Magnesium Glycinate vs Citrate vs Threonate: Choosing the Right Form',
    category: 'Comparisons',
    primaryKeyword: 'magnesium glycinate vs citrate',
    secondaryKeywords: ['best form of magnesium', 'magnesium forms compared', 'magnesium for sleep vs focus'],
  },
  {
    tier: 'comparison',
    title: 'CoQ10 vs Ubiquinol: Which Form Should You Take?',
    category: 'Comparisons',
    primaryKeyword: 'CoQ10 vs ubiquinol',
    secondaryKeywords: ['ubiquinol vs ubiquinone', 'CoQ10 statin depletion', 'CoQ10 heart health dosage'],
  },

  // ── SYMPTOM-FIRST ARTICLES (discovery intent) ─────────────────────────
  {
    tier: 'symptom',
    title: 'Always Tired? The 8 Nutrient Deficiencies Behind Chronic Fatigue',
    category: 'Symptoms',
    primaryKeyword: 'why am I always tired supplements',
    secondaryKeywords: ['chronic fatigue nutrient deficiency', 'iron deficiency fatigue', 'B12 energy'],
  },
  {
    tier: 'symptom',
    title: 'Brain Fog: Causes, Lab Markers to Check, and Supplements That Help',
    category: 'Symptoms',
    primaryKeyword: 'brain fog supplements',
    secondaryKeywords: ['brain fog causes', 'brain fog blood test', 'nootropic for brain fog'],
  },

  // ── LAB MARKER ARTICLES ───────────────────────────────────────────────
  {
    tier: 'lab',
    title: 'Low Ferritin: Why Your Iron Levels Matter Even Without Anemia',
    category: 'Lab Results',
    primaryKeyword: 'low ferritin symptoms',
    secondaryKeywords: ['ferritin levels optimal', 'iron deficiency without anemia', 'ferritin vs hemoglobin'],
  },

  // ── LIFESTYLE / HOW-TO ARTICLES ───────────────────────────────────────
  {
    tier: 'lifestyle',
    title: 'The Biohacker\'s Morning Stack: A Research-Backed Protocol',
    category: 'Lifestyle',
    primaryKeyword: 'biohacker morning supplement stack',
    secondaryKeywords: ['morning supplement routine', 'biohacking protocol', 'supplement timing guide'],
  },

  // ──────────────────────────────────────────────────────────────────────
  //  ADD MORE TOPICS HERE — aim for 100-500+ total across all tiers
  //  The more topics you plan, the longer the scheduler can run autonomously.
  // ──────────────────────────────────────────────────────────────────────
];

/**
 * Returns clusters not yet represented by titles already in the database.
 * Pass existingTitles to filter out articles that have already been written.
 */
export function getUnusedTopics(existingTitles: string[]): TopicCluster[] {
  const existingSet = new Set(existingTitles.map(t => t.toLowerCase().trim()));
  return TOPIC_CLUSTERS.filter(tc => !existingSet.has(tc.title.toLowerCase().trim()));
}
