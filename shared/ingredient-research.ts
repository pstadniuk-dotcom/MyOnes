// Pre-built research data for common supplement ingredients
// This provides research citations without requiring database queries

interface ResearchStudy {
  title: string;
  journal: string;
  year: number;
  authors: string;
  findings: string;
  sampleSize?: number;
  pubmedUrl?: string;
  evidenceLevel: 'strong' | 'moderate' | 'preliminary' | 'limited';
  studyType: 'rct' | 'meta_analysis' | 'systematic_review' | 'cohort' | 'observational' | 'review';
}

interface IngredientResearch {
  summary: string;
  keyBenefits: string[];
  safetyProfile: string;
  recommendedFor: string[];
  studies: ResearchStudy[];
}

// Pre-built research database
const ingredientResearchData: Record<string, IngredientResearch> = {
  'ashwagandha': {
    summary: 'Ashwagandha (Withania somnifera) is an adaptogenic herb traditionally used in Ayurvedic medicine. Modern research supports its use for stress reduction, anxiety management, and physical performance enhancement.',
    keyBenefits: [
      'Reduces cortisol and stress markers',
      'Improves anxiety symptoms',
      'May enhance muscle strength and recovery',
      'Supports cognitive function'
    ],
    safetyProfile: 'Generally well-tolerated. May interact with thyroid medications and sedatives. Not recommended during pregnancy.',
    recommendedFor: ['Stress management', 'Athletic performance', 'Anxiety support', 'Sleep quality'],
    studies: [
      {
        title: 'A prospective, randomized double-blind, placebo-controlled study of safety and efficacy of a high-concentration full-spectrum extract of ashwagandha root in reducing stress and anxiety in adults',
        journal: 'Indian Journal of Psychological Medicine',
        year: 2012,
        authors: 'Chandrasekhar K, Kapoor J, Anishetty S',
        findings: 'Significant reduction in stress scores (44% reduction) and serum cortisol levels compared to placebo.',
        sampleSize: 64,
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/23439798/',
        evidenceLevel: 'strong',
        studyType: 'rct'
      },
      {
        title: 'Effects of Ashwagandha (Withania somnifera) on Physical Performance: Systematic Review and Bayesian Meta-Analysis',
        journal: 'Journal of Functional Morphology and Kinesiology',
        year: 2021,
        authors: 'Bonilla DA, et al.',
        findings: 'Ashwagandha supplementation significantly improved VO2 max, strength, and recovery in both trained and untrained individuals.',
        sampleSize: 615,
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/34544533/',
        evidenceLevel: 'strong',
        studyType: 'meta_analysis'
      }
    ]
  },
  'magnesium': {
    summary: 'Magnesium is an essential mineral involved in over 300 enzymatic reactions. It plays crucial roles in energy production, muscle function, nervous system regulation, and sleep quality.',
    keyBenefits: [
      'Supports muscle and nerve function',
      'Improves sleep quality',
      'Reduces muscle cramps',
      'Supports cardiovascular health'
    ],
    safetyProfile: 'Well-tolerated at recommended doses. High doses may cause GI upset. Caution with kidney disease.',
    recommendedFor: ['Sleep support', 'Muscle recovery', 'Stress management', 'Heart health'],
    studies: [
      {
        title: 'The effect of magnesium supplementation on primary insomnia in elderly: A double-blind placebo-controlled clinical trial',
        journal: 'Journal of Research in Medical Sciences',
        year: 2012,
        authors: 'Abbasi B, et al.',
        findings: 'Magnesium supplementation improved sleep efficiency, sleep time, and melatonin concentration.',
        sampleSize: 46,
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/23853635/',
        evidenceLevel: 'moderate',
        studyType: 'rct'
      }
    ]
  },
  'vitamin d': {
    summary: 'Vitamin D is a fat-soluble vitamin that functions as a hormone. It is essential for calcium absorption, bone health, immune function, and mood regulation.',
    keyBenefits: [
      'Supports bone health and calcium absorption',
      'Enhances immune function',
      'May improve mood and reduce depression risk',
      'Supports muscle function'
    ],
    safetyProfile: 'Safe at recommended doses. Toxicity possible with very high doses (>10,000 IU daily for extended periods).',
    recommendedFor: ['Bone health', 'Immune support', 'Mood support', 'General wellness'],
    studies: [
      {
        title: 'Vitamin D and the Immune System',
        journal: 'Journal of Investigative Medicine',
        year: 2011,
        authors: 'Aranow C',
        findings: 'Vitamin D is crucial for both innate and adaptive immune responses. Deficiency linked to increased autoimmunity and infection susceptibility.',
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/21527855/',
        evidenceLevel: 'strong',
        studyType: 'review'
      }
    ]
  }
};

// Normalize ingredient name for lookup
function normalizeForLookup(name: string): string {
  return name.toLowerCase()
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Get pre-built research data for an ingredient
 */
export function getIngredientResearch(ingredientName: string): IngredientResearch | null {
  const normalized = normalizeForLookup(ingredientName);
  
  // Direct match
  if (ingredientResearchData[normalized]) {
    return ingredientResearchData[normalized];
  }
  
  // Partial match
  for (const key of Object.keys(ingredientResearchData)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return ingredientResearchData[key];
    }
  }
  
  return null;
}

/**
 * Get list of all ingredients with research data
 */
export function getResearchedIngredients(): string[] {
  return Object.keys(ingredientResearchData);
}

/**
 * Check if we have research data for an ingredient
 */
export function hasResearchData(ingredientName: string): boolean {
  return getIngredientResearch(ingredientName) !== null;
}
