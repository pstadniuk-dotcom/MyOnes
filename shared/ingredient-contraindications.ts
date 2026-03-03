/**
 * Ingredient contraindication catalog.
 * Centralized safety data for deterministic server-side enforcement.
 *
 * Sources: Natural Medicines Database, NIH ODS, Mayo Clinic drug interaction references.
 * This catalog should be reviewed by a licensed pharmacist or clinical team quarterly.
 */

import type { IngredientContraindication } from './safety-types';

export const INGREDIENT_CONTRAINDICATIONS: IngredientContraindication[] = [
  // ── Pregnancy / Nursing Contraindicated ─────────────────────────────
  {
    ingredientName: 'Ashwagandha',
    pregnancySafe: false,
    nursingSafe: false,
    contraindicated_conditions: ['pregnancy', 'autoimmune', 'hyperthyroidism'],
    organCautions: [
      { organ: 'liver', severity: 'monitor', note: 'Rare hepatotoxicity reported at high doses' },
    ],
  },
  {
    ingredientName: 'Maca Root',
    pregnancySafe: false,
    nursingSafe: false,
    contraindicated_conditions: ['hormone-sensitive conditions'],
  },
  {
    ingredientName: 'DIM',
    pregnancySafe: false,
    nursingSafe: false,
    contraindicated_conditions: ['hormone-sensitive cancers'],
  },
  {
    ingredientName: 'DHEA',
    pregnancySafe: false,
    nursingSafe: false,
    contraindicated_conditions: ['hormone-sensitive cancers', 'liver disease'],
    organCautions: [
      { organ: 'liver', severity: 'avoid', note: 'DHEA is metabolized by the liver and may worsen existing liver disease' },
    ],
  },
  {
    ingredientName: 'Saw Palmetto',
    pregnancySafe: false,
    nursingSafe: false,
    contraindicated_conditions: ['hormone-sensitive conditions'],
  },
  {
    ingredientName: 'Black Cohosh',
    pregnancySafe: false,
    nursingSafe: false,
    organCautions: [
      { organ: 'liver', severity: 'monitor', note: 'Rare but serious hepatotoxicity reported' },
    ],
  },
  {
    ingredientName: 'Rhodiola Rosea',
    pregnancySafe: false,
    nursingSafe: false,
    contraindicated_conditions: ['bipolar disorder'],
  },
  {
    ingredientName: 'Tongkat Ali',
    pregnancySafe: false,
    nursingSafe: false,
    contraindicated_conditions: ['hormone-sensitive cancers'],
  },

  // ── Liver-Cautious Ingredients ──────────────────────────────────────
  {
    ingredientName: 'Kava',
    pregnancySafe: false,
    nursingSafe: false,
    organCautions: [
      { organ: 'liver', severity: 'avoid', note: 'Kava is hepatotoxic and contraindicated in liver disease' },
    ],
    contraindicated_conditions: ['liver disease', 'hepatitis', 'cirrhosis'],
  },
  {
    ingredientName: 'Red Yeast Rice',
    pregnancySafe: false,
    nursingSafe: false,
    organCautions: [
      { organ: 'liver', severity: 'avoid', note: 'Contains monacolin K (lovastatin) — hepatotoxic risk in liver disease' },
      { organ: 'kidney', severity: 'monitor', note: 'Statin-like compounds may affect renal function' },
    ],
    contraindicated_conditions: ['liver disease', 'kidney disease'],
  },
  {
    ingredientName: 'Niacin',
    pregnancySafe: false,
    nursingSafe: false,
    organCautions: [
      { organ: 'liver', severity: 'reduce_dose', note: 'High-dose niacin (>500mg) can cause hepatotoxicity' },
    ],
    absoluteMaxDailyMg: 500,
  },
  {
    ingredientName: 'Green Tea Extract',
    pregnancySafe: false,
    nursingSafe: false,
    organCautions: [
      { organ: 'liver', severity: 'monitor', note: 'High-dose green tea extract (EGCG) linked to liver injury' },
    ],
  },

  // ── Kidney-Cautious Ingredients ─────────────────────────────────────
  {
    ingredientName: 'Creatine',
    pregnancySafe: false,
    nursingSafe: false,
    organCautions: [
      { organ: 'kidney', severity: 'avoid', note: 'Creatine may worsen renal impairment' },
    ],
    contraindicated_conditions: ['kidney disease', 'chronic kidney disease'],
  },
  {
    ingredientName: 'Potassium',
    pregnancySafe: true,
    nursingSafe: true,
    organCautions: [
      { organ: 'kidney', severity: 'avoid', note: 'Hyperkalemia risk with impaired renal function' },
    ],
    contraindicated_conditions: ['kidney disease', 'hyperkalemia'],
  },
  {
    ingredientName: 'Magnesium',
    pregnancySafe: true,
    nursingSafe: true,
    organCautions: [
      { organ: 'kidney', severity: 'reduce_dose', note: 'Reduced renal clearance may cause magnesium accumulation' },
    ],
  },
  {
    ingredientName: 'Vitamin C',
    pregnancySafe: true,
    nursingSafe: true,
    organCautions: [
      { organ: 'kidney', severity: 'reduce_dose', note: 'High-dose vitamin C (>1000mg) may increase oxalate kidney stone risk' },
    ],
    absoluteMaxDailyMg: 2000,
  },
  {
    ingredientName: 'C Boost',
    pregnancySafe: true,
    nursingSafe: true,
    organCautions: [
      { organ: 'kidney', severity: 'reduce_dose', note: 'Contains Vitamin C — high doses may increase oxalate kidney stone risk' },
    ],
  },

  // ── Allergen Cross-References ───────────────────────────────────────
  {
    ingredientName: 'Glucosamine',
    pregnancySafe: false,
    nursingSafe: false,
    allergenCrossReferences: ['shellfish', 'crustacean', 'shrimp', 'crab', 'lobster'],
  },
  {
    ingredientName: 'Bee Pollen',
    pregnancySafe: false,
    nursingSafe: false,
    allergenCrossReferences: ['bee', 'pollen', 'honey', 'propolis', 'bee sting'],
  },
  {
    ingredientName: 'Royal Jelly',
    pregnancySafe: false,
    nursingSafe: false,
    allergenCrossReferences: ['bee', 'pollen', 'honey', 'propolis', 'bee sting'],
  },
  {
    ingredientName: 'Whey Protein',
    pregnancySafe: true,
    nursingSafe: true,
    allergenCrossReferences: ['dairy', 'milk', 'lactose', 'casein', 'whey'],
  },
  {
    ingredientName: 'Kelp',
    pregnancySafe: false,
    nursingSafe: false,
    allergenCrossReferences: ['iodine', 'seafood'],
    organCautions: [
      { organ: 'kidney', severity: 'monitor', note: 'High iodine content may affect thyroid and renal function' },
    ],
  },
  {
    ingredientName: 'Spirulina',
    pregnancySafe: false,
    nursingSafe: false,
    allergenCrossReferences: ['seafood', 'algae'],
  },
  {
    ingredientName: 'Soy Isoflavones',
    pregnancySafe: false,
    nursingSafe: false,
    allergenCrossReferences: ['soy', 'soybean'],
    contraindicated_conditions: ['hormone-sensitive cancers'],
  },

  // ── General Safety Defaults ─────────────────────────────────────────
  // Ingredients not listed here are assumed: pregnancySafe=true, nursingSafe=true, no organ cautions
  // This catalog should be expanded as the ingredient catalog grows

  // St. John's Wort — critical interaction profile
  {
    ingredientName: "St. John's Wort",
    pregnancySafe: false,
    nursingSafe: false,
    contraindicated_conditions: ['depression', 'bipolar disorder'],
    organCautions: [
      { organ: 'liver', severity: 'monitor', note: "St. John's Wort induces CYP3A4/CYP2C9 enzymes, altering drug metabolism" },
    ],
  },

  // Valerian Root
  {
    ingredientName: 'Valerian Root',
    pregnancySafe: false,
    nursingSafe: false,
    organCautions: [
      { organ: 'liver', severity: 'monitor', note: 'Limited data on hepatotoxicity; avoid with existing liver conditions' },
    ],
  },

  // Iron
  {
    ingredientName: 'Iron',
    pregnancySafe: true,
    nursingSafe: true,
    organCautions: [
      { organ: 'liver', severity: 'monitor', note: 'Excess iron accumulates in the liver (hemochromatosis risk)' },
    ],
    contraindicated_conditions: ['hemochromatosis', 'iron overload'],
  },

  // Berberine
  {
    ingredientName: 'Berberine',
    pregnancySafe: false,
    nursingSafe: false,
    contraindicated_conditions: ['pregnancy', 'jaundice (neonatal)'],
    organCautions: [
      { organ: 'liver', severity: 'monitor', note: 'Berberine affects hepatic enzyme activity' },
    ],
  },

  // Turmeric / Curcumin
  {
    ingredientName: 'Turmeric Extract',
    pregnancySafe: false,
    nursingSafe: false,
    organCautions: [
      { organ: 'kidney', severity: 'monitor', note: 'High-dose curcumin may increase oxalate levels' },
    ],
    allergenCrossReferences: ['turmeric'],
  },
];

/**
 * Lookup contraindication data for an ingredient by name (case-insensitive partial match).
 */
export function getContraindication(ingredientName: string): IngredientContraindication | undefined {
  const lower = ingredientName.toLowerCase();
  return INGREDIENT_CONTRAINDICATIONS.find(c => 
    c.ingredientName.toLowerCase() === lower ||
    lower.includes(c.ingredientName.toLowerCase()) ||
    c.ingredientName.toLowerCase().includes(lower)
  );
}

/**
 * Get all pregnancy-unsafe ingredients.
 */
export function getPregnancyUnsafeIngredients(): string[] {
  return INGREDIENT_CONTRAINDICATIONS
    .filter(c => !c.pregnancySafe)
    .map(c => c.ingredientName);
}

/**
 * Get all nursing-unsafe ingredients.
 */
export function getNursingUnsafeIngredients(): string[] {
  return INGREDIENT_CONTRAINDICATIONS
    .filter(c => !c.nursingSafe)
    .map(c => c.ingredientName);
}
