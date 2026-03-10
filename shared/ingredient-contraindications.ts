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

  // ═══════════════════════════════════════════════════════════════════════
  // HIGH PRIORITY — System Supports & herbs with critical interaction profiles
  // ═══════════════════════════════════════════════════════════════════════

  // Thyroid Support — contains 900mcg iodine + glandular concentrates
  {
    ingredientName: 'Thyroid Support',
    pregnancySafe: false,
    nursingSafe: false,
    contraindicated_conditions: ['hyperthyroidism', 'graves disease', 'hashimoto', 'thyroid nodules'],
    organCautions: [
      { organ: 'kidney', severity: 'monitor', note: 'High iodine content (900mcg) may stress renal function in compromised kidneys' },
    ],
    allergenCrossReferences: ['iodine'],
  },

  // Endocrine Support — contains ovary, adrenal, pituitary, hypothalamus glandulars + goldenseal + kelp
  {
    ingredientName: 'Endocrine Support',
    pregnancySafe: false,
    nursingSafe: false,
    contraindicated_conditions: ['hormone-sensitive cancers', 'hyperthyroidism', 'estrogen-sensitive conditions'],
  },

  // Ovary Uterus Support — contains bovine ovary/uterus + Blue Cohosh Root (uterotonic)
  {
    ingredientName: 'Ovary Uterus Support',
    pregnancySafe: false,
    nursingSafe: false,
    contraindicated_conditions: ['pregnancy', 'hormone-sensitive cancers', 'estrogen-sensitive conditions', 'endometriosis', 'uterine fibroids'],
    organCautions: [
      { organ: 'liver', severity: 'monitor', note: 'Blue Cohosh component has rare hepatotoxicity reports' },
    ],
  },

  // Prostate Support — contains bovine prostate glandular + saw palmetto + zinc
  {
    ingredientName: 'Prostate Support',
    pregnancySafe: false,
    nursingSafe: false,
    contraindicated_conditions: ['hormone-sensitive cancers', 'prostate cancer'],
  },

  // Ginkgo Biloba Extract 24% — major anticoagulant interactions
  {
    ingredientName: 'Ginkgo Biloba Extract 24%',
    pregnancySafe: false,
    nursingSafe: false,
    contraindicated_conditions: ['bleeding disorders', 'seizure disorders'],
    organCautions: [
      { organ: 'liver', severity: 'monitor', note: 'Ginkgo inhibits CYP enzymes; monitor with hepatic-metabolized drugs' },
    ],
  },

  // Curcumin — blood thinner interactions, gallbladder contraindication
  {
    ingredientName: 'Curcumin',
    pregnancySafe: false,
    nursingSafe: false,
    contraindicated_conditions: ['gallbladder disease', 'gallstones', 'bile duct obstruction', 'bleeding disorders'],
    organCautions: [
      { organ: 'kidney', severity: 'monitor', note: 'High-dose curcumin may increase oxalate levels and kidney stone risk' },
    ],
    allergenCrossReferences: ['turmeric'],
  },

  // Garlic — anticoagulant interactions (warfarin), HIV drug interactions
  {
    ingredientName: 'Garlic',
    pregnancySafe: true,
    nursingSafe: true,
    contraindicated_conditions: ['bleeding disorders'],
  },

  // Ginger Root — blood thinner interactions, gallstone caution
  {
    ingredientName: 'Ginger Root',
    pregnancySafe: true, // Generally safe in food amounts; high-dose supplementation debated
    nursingSafe: true,
    contraindicated_conditions: ['gallstones', 'bleeding disorders'],
  },

  // Milk Thistle — CYP3A4/CYP2C9 interactions (statins, anti-anxiety, chemo)
  {
    ingredientName: 'Milk Thistle',
    pregnancySafe: false,
    nursingSafe: false,
    contraindicated_conditions: ['hormone-sensitive cancers', 'estrogen-sensitive conditions'],
    organCautions: [
      { organ: 'liver', severity: 'monitor', note: 'Silymarin modulates CYP3A4/CYP2C9 enzymes — may alter drug metabolism' },
    ],
  },

  // Stinging Nettle — hormonal effects, diuretic, blood sugar/pressure med interactions
  {
    ingredientName: 'Stinging Nettle',
    pregnancySafe: false,
    nursingSafe: false,
    contraindicated_conditions: ['hormone-sensitive conditions'],
    organCautions: [
      { organ: 'kidney', severity: 'monitor', note: 'Diuretic properties may affect fluid/electrolyte balance in kidney disease' },
    ],
  },

  // Suma Root — testosterone/hormonal adaptogen
  {
    ingredientName: 'Suma Root',
    pregnancySafe: false,
    nursingSafe: false,
    contraindicated_conditions: ['hormone-sensitive cancers', 'estrogen-sensitive conditions'],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // MEDIUM PRIORITY — Dosage concerns, moderate interaction potential
  // ═══════════════════════════════════════════════════════════════════════

  // Adrenal Support — contains licorice (raises BP, depletes potassium)
  {
    ingredientName: 'Adrenal Support',
    pregnancySafe: false,
    nursingSafe: false,
    contraindicated_conditions: ['hypertension', 'hypokalemia', 'heart failure', 'edema'],
  },

  // Heart Support — cardiovascular-active (magnesium, L-carnitine, CoQ10)
  {
    ingredientName: 'Heart Support',
    pregnancySafe: true,
    nursingSafe: true,
    contraindicated_conditions: [],
    // Note: Generally supportive but may interact with cardiac medications
  },

  // MG/K — magnesium + potassium — renal monitoring needed
  {
    ingredientName: 'MG/K',
    pregnancySafe: true,
    nursingSafe: true,
    organCautions: [
      { organ: 'kidney', severity: 'reduce_dose', note: 'Magnesium + potassium combo requires renal function monitoring; accumulation risk in CKD' },
    ],
    contraindicated_conditions: ['hyperkalemia', 'severe kidney disease'],
  },

  // Beta Max — contains niacin (10mg), choline, methionine, soy lecithin
  {
    ingredientName: 'Beta Max',
    pregnancySafe: true,
    nursingSafe: true,
    allergenCrossReferences: ['soy'],
    organCautions: [
      { organ: 'liver', severity: 'monitor', note: 'Contains niacin and liver-active compounds; monitor in existing liver conditions' },
    ],
  },

  // Histamine Support — contains iron (hemochromatosis risk), chromium
  {
    ingredientName: 'Histamine Support',
    pregnancySafe: true,
    nursingSafe: true,
    contraindicated_conditions: ['hemochromatosis', 'iron overload'],
  },

  // Liver Support — contains barberry (berberine), Oregon grape
  {
    ingredientName: 'Liver Support',
    pregnancySafe: false,
    nursingSafe: false,
    organCautions: [
      { organ: 'liver', severity: 'monitor', note: 'Contains berberine-rich herbs (barberry, Oregon grape) that affect hepatic enzymes' },
    ],
    contraindicated_conditions: ['pregnancy', 'jaundice'],
  },

  // Mold RX — contains oregano oil (blood thinner interaction), wormwood-adjacent herbs
  {
    ingredientName: 'Mold RX',
    pregnancySafe: false,
    nursingSafe: false,
    contraindicated_conditions: ['bleeding disorders'],
  },

  // Para X — contains wormwood (neurotoxic thujone), black walnut, neem
  {
    ingredientName: 'Para X',
    pregnancySafe: false,
    nursingSafe: false,
    contraindicated_conditions: ['seizure disorders', 'pregnancy'],
    organCautions: [
      { organ: 'liver', severity: 'monitor', note: 'Wormwood and neem are hepatically-active; avoid in liver disease' },
      { organ: 'kidney', severity: 'monitor', note: 'Neem may affect renal function at high doses' },
    ],
  },

  // CoEnzyme Q10 — blood thinner and BP med interactions
  {
    ingredientName: 'CoEnzyme Q10',
    pregnancySafe: true,
    nursingSafe: true,
    contraindicated_conditions: [],
    // Generally safe; noted here for drug interaction tracking in safety-validator
  },

  // Omega 3 — blood thinner interactions at high doses
  {
    ingredientName: 'Omega 3',
    pregnancySafe: true,
    nursingSafe: true,
    contraindicated_conditions: ['bleeding disorders'],
  },

  // Vitamin E (Mixed Tocopherols) — anticoagulant interactions at high doses
  {
    ingredientName: 'Vitamin E (Mixed Tocopherols)',
    pregnancySafe: true,
    nursingSafe: true,
    contraindicated_conditions: ['bleeding disorders'],
    absoluteMaxDailyMg: 1000, // >400 IU warrants monitoring
  },

  // Calcium — hypercalcemia, kidney stones, thyroid/antibiotic absorption interference
  {
    ingredientName: 'Calcium',
    pregnancySafe: true,
    nursingSafe: true,
    organCautions: [
      { organ: 'kidney', severity: 'reduce_dose', note: 'High calcium intake increases kidney stone risk; reduce in renal impairment' },
    ],
    contraindicated_conditions: ['hypercalcemia', 'hyperparathyroidism'],
    absoluteMaxDailyMg: 2500,
  },

  // Resveratrol — blood thinner interactions, weak estrogenic activity
  {
    ingredientName: 'Resveratrol',
    pregnancySafe: false,
    nursingSafe: false,
    contraindicated_conditions: ['hormone-sensitive cancers', 'estrogen-sensitive conditions', 'bleeding disorders'],
  },

  // GABA — sedative drug interactions, blood pressure med interaction
  {
    ingredientName: 'GABA',
    pregnancySafe: false,
    nursingSafe: false,
    contraindicated_conditions: [],
    // Safety-validator already handles sedative + BP med checks
  },

  // Cinnamon 20:1 — blood sugar med interactions, liver toxicity (coumarin) at high doses
  {
    ingredientName: 'Cinnamon 20:1',
    pregnancySafe: false,
    nursingSafe: false,
    organCautions: [
      { organ: 'liver', severity: 'monitor', note: 'Cassia cinnamon contains coumarin; hepatotoxic at high doses (>6g/day)' },
    ],
    absoluteMaxDailyMg: 6000,
  },

  // Hawthorn Berry — heart med interactions (digoxin, beta-blockers, nitrates)
  {
    ingredientName: 'Hawthorn Berry',
    pregnancySafe: false,
    nursingSafe: false,
    contraindicated_conditions: [],
    // Safety-validator handles cardiac glycoside + BP med checks
  },

  // Colostrum Powder — dairy allergen, immune-modulating
  {
    ingredientName: 'Colostrum Powder',
    pregnancySafe: true,
    nursingSafe: true,
    allergenCrossReferences: ['dairy', 'milk', 'lactose'],
  },

  // Chaga — blood thinner interactions, blood sugar med interactions, oxalate concern
  {
    ingredientName: 'Chaga',
    pregnancySafe: false,
    nursingSafe: false,
    organCautions: [
      { organ: 'kidney', severity: 'monitor', note: 'Chaga is high in oxalates which may increase kidney stone risk' },
    ],
    contraindicated_conditions: ['bleeding disorders', 'kidney stones'],
  },

  // Phosphatidylcholine — often soy-derived (allergen), cholinergic drug interactions
  {
    ingredientName: 'Phosphatidylcholine',
    pregnancySafe: true,
    nursingSafe: true,
    allergenCrossReferences: ['soy', 'soybean'],
  },

  // Cats Claw — autoimmune caution, blood thinner interactions
  {
    ingredientName: 'Cats Claw',
    pregnancySafe: false,
    nursingSafe: false,
    contraindicated_conditions: ['autoimmune', 'bleeding disorders', 'leukemia'],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // LOW PRIORITY — Standard-dose vitamins/minerals, minimal interaction risk
  // ═══════════════════════════════════════════════════════════════════════

  // Immune-C — mostly vitamin C + immune herbs at low doses
  {
    ingredientName: 'Immune-C',
    pregnancySafe: true,
    nursingSafe: true,
  },

  // Kidney & Bladder Support — supportive herbs at standard doses
  {
    ingredientName: 'Kidney & Bladder Support',
    pregnancySafe: false,
    nursingSafe: false,
    organCautions: [
      { organ: 'kidney', severity: 'monitor', note: 'Contains diuretic herbs (juniper, uva-ursi, goldenrod) — monitor in existing kidney conditions' },
    ],
  },

  // Ligament Support — minerals + connective tissue support
  {
    ingredientName: 'Ligament Support',
    pregnancySafe: true,
    nursingSafe: true,
  },

  // Lung Support — vitamins A, C, B + glandular
  {
    ingredientName: 'Lung Support',
    pregnancySafe: false,
    nursingSafe: false,
    // High vitamin A (8000 IU as palmitate) — teratogenic concern
  },

  // Spleen Support — vitamin E + dandelion + nettle
  {
    ingredientName: 'Spleen Support',
    pregnancySafe: true,
    nursingSafe: true,
  },

  // Aloe Vera — mild laxative at higher doses
  {
    ingredientName: 'Aloe Vera',
    pregnancySafe: false,
    nursingSafe: false,
    // Aloe latex is a uterine stimulant
  },

  // Astragalus — common immune herb, fixed 50mg
  {
    ingredientName: 'Astragalus',
    pregnancySafe: true,
    nursingSafe: true,
    contraindicated_conditions: ['autoimmune'],
  },

  // Blackcurrant Extract — berry antioxidant, food-derived
  {
    ingredientName: 'Blackcurrant Extract',
    pregnancySafe: true,
    nursingSafe: true,
  },

  // Broccoli Concentrate — sulforaphane source, very low risk
  {
    ingredientName: 'Broccoli Concentrate',
    pregnancySafe: true,
    nursingSafe: true,
  },

  // Camu Camu — vitamin C source, low risk
  {
    ingredientName: 'Camu Camu',
    pregnancySafe: true,
    nursingSafe: true,
  },

  // Graviola — standard anti-inflammatory herb
  {
    ingredientName: 'Graviola',
    pregnancySafe: false,
    nursingSafe: false,
    // May stimulate uterine contractions; avoid in pregnancy
  },

  // InnoSlim — proprietary Panax/Astragalus blend, fixed 250mg
  {
    ingredientName: 'InnoSlim',
    pregnancySafe: false,
    nursingSafe: false,
    // Insufficient safety data for pregnancy/nursing
  },

  // Lutein — eye carotenoid, essentially zero interaction risk
  {
    ingredientName: 'Lutein',
    pregnancySafe: true,
    nursingSafe: true,
  },

  // Cape Aloe — mild digestive herb
  {
    ingredientName: 'Cape Aloe',
    pregnancySafe: false,
    nursingSafe: false,
    // Contains anthraquinones — uterine stimulant concern
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
