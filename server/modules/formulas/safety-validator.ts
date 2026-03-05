/**
 * Comprehensive formula safety validation engine.
 * 
 * This module is the SINGLE deterministic safety gate for all formulas.
 * It produces structured SafetyWarning objects with severity levels that
 * determine enforcement behavior:
 * 
 *   - critical:      HARD BLOCK — formula cannot be saved or ordered
 *   - serious:       Formula is saved but checkout requires explicit acknowledgment
 *   - informational: Displayed to user, no enforcement
 * 
 * Coverage:
 *   1. Drug–supplement interactions (19 categories, severity-tiered)
 *   2. Pregnancy / nursing contraindication gate
 *   3. Allergen cross-reference check
 *   4. Liver disease ingredient flags
 *   5. Kidney impairment ingredient flags
 *   6. Antiplatelet stacking detection
 *   7. Condition-based contraindications
 */

import type { SafetyWarning, SafetyValidationResult } from '@shared/safety-types';
import { getContraindication } from '@shared/ingredient-contraindications';

// ── Types ───────────────────────────────────────────────────────────────────
export interface SafetyValidationInput {
  formula: {
    bases?: Array<{ ingredient: string; amount: number; unit?: string; purpose?: string }>;
    additions?: Array<{ ingredient: string; amount: number; unit?: string; purpose?: string }>;
  };
  userMedications: string[];
  userConditions: string[];
  userAllergies: string[];
  isPregnant: boolean;
  isNursing: boolean;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const has = (list: string[], keywords: string[]) =>
  list.some(m => keywords.some(k => m.includes(k)));

const hasIngr = (allIngredients: string[], keywords: string[]) =>
  allIngredients.some(i => keywords.some(k => i.includes(k)));

const matchingIngr = (allIngredients: string[], keywords: string[]) => {
  const matches = new Set<string>();
  for (const i of allIngredients) {
    for (const k of keywords) {
      if (i.includes(k)) matches.add(i);
    }
  }
  return [...matches];
};

// ── Main Validation Function ────────────────────────────────────────────────
export function validateFormulaSafety(input: SafetyValidationInput): SafetyValidationResult {
  const warnings: SafetyWarning[] = [];
  const allIngredients = [
    ...(input.formula.bases || []),
    ...(input.formula.additions || []),
  ].map(i => (i.ingredient || '').toLowerCase());

  const allIngredientNames = [
    ...(input.formula.bases || []),
    ...(input.formula.additions || []),
  ].map(i => i.ingredient || '');

  const medsLower = (input.userMedications || []).map(m => m.toLowerCase());
  const conditionsLower = (input.userConditions || []).map(c => c.toLowerCase());
  const allergiesLower = (input.userAllergies || []).map(a => a.toLowerCase());

  // ══════════════════════════════════════════════════════════════════════════
  // 1. PREGNANCY / NURSING GATE (CRITICAL)
  // ══════════════════════════════════════════════════════════════════════════
  if (input.isPregnant || input.isNursing) {
    const status = input.isPregnant ? 'pregnant' : 'nursing';
    for (const name of allIngredientNames) {
      const contra = getContraindication(name);
      if (contra) {
        const unsafe = input.isPregnant ? !contra.pregnancySafe : !contra.nursingSafe;
        if (unsafe) {
          warnings.push({
            category: 'pregnancy_nursing',
            severity: 'critical',
            message: `BLOCKED: "${name}" is contraindicated during ${status}. This ingredient must be removed before the formula can be created.`,
            ingredients: [name],
          });
        }
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 2. ALLERGEN CROSS-REFERENCE (CRITICAL)
  // ══════════════════════════════════════════════════════════════════════════
  if (allergiesLower.length > 0) {
    for (const name of allIngredientNames) {
      const contra = getContraindication(name);
      if (contra?.allergenCrossReferences) {
        const triggeredAllergies = allergiesLower.filter(allergy =>
          contra.allergenCrossReferences!.some(ref => allergy.includes(ref.toLowerCase()) || ref.toLowerCase().includes(allergy))
        );
        if (triggeredAllergies.length > 0) {
          warnings.push({
            category: 'allergen',
            severity: 'critical',
            message: `BLOCKED: "${name}" may trigger your reported allergy to ${triggeredAllergies.join(', ')}. This ingredient must be removed.`,
            ingredients: [name],
          });
        }
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 3. DRUG–SUPPLEMENT INTERACTIONS (SEVERITY-TIERED)
  // ══════════════════════════════════════════════════════════════════════════

  // ── 3a. Antiplatelet stacking (no medication needed) ──────────────────
  const antiplateletKeywords = ['omega', 'fish oil', 'garlic', 'ginger', 'vitamin e', 'resveratrol', 'curcumin', 'nattokinase', 'bromelain'];
  const antiplateletMatches = matchingIngr(allIngredients, antiplateletKeywords);
  if (antiplateletMatches.length >= 3) {
    warnings.push({
      category: 'antiplatelet_stacking',
      severity: 'serious',
      message: `Your formula stacks ${antiplateletMatches.length} ingredients with antiplatelet/anticoagulant activity (${antiplateletMatches.join(', ')}). This may increase bleeding risk even without a blood thinner — discuss with your physician.`,
      ingredients: antiplateletMatches,
    });
  }

  if (medsLower.length > 0) {

    // ── 3b. Anticoagulants / Blood Thinners ─────────────────────────────
    // Warfarin/Coumadin specifically is CRITICAL (narrow therapeutic index)
    const warfarinFamily = ['warfarin', 'coumadin'];
    const otherBloodThinners = ['clopidogrel', 'plavix', 'rivaroxaban', 'xarelto', 'apixaban', 'eliquis', 'dabigatran', 'pradaxa', 'heparin', 'enoxaparin'];
    const allBloodThinners = [...warfarinFamily, ...otherBloodThinners, 'aspirin'];
    const btSupplements = ['omega', 'fish oil', 'garlic', 'ginger', 'ginkgo', 'vitamin e', 'resveratrol', 'curcumin', 'nattokinase', 'bromelain'];
    if (has(medsLower, allBloodThinners) && hasIngr(allIngredients, btSupplements)) {
      const found = matchingIngr(allIngredients, btSupplements);
      const onWarfarin = has(medsLower, warfarinFamily);
      warnings.push({
        category: 'blood_thinner_interaction',
        severity: onWarfarin ? 'critical' : 'serious',
        message: onWarfarin
          ? `BLOCKED: Contains ${found.join(', ')} which may dangerously increase bleeding risk with warfarin/Coumadin. Warfarin has a narrow therapeutic index — even small changes in INR can be life-threatening. Physician approval is REQUIRED before proceeding.`
          : `Contains ${found.join(', ')} which may increase bleeding risk with your blood thinner. Consult your physician before starting.`,
        ingredients: found,
        drugs: medsLower.filter(m => allBloodThinners.some(d => m.includes(d))),
      });
    }

    // ── 3c. Antidepressants — St. John's Wort (CRITICAL) ────────────────
    const ssriSnri = ['sertraline', 'zoloft', 'fluoxetine', 'prozac', 'escitalopram', 'lexapro', 'citalopram', 'paroxetine', 'paxil', 'venlafaxine', 'effexor', 'duloxetine', 'cymbalta', 'bupropion', 'wellbutrin', 'maoi', 'phenelzine', 'tranylcypromine', 'lithium', 'quetiapine', 'seroquel'];
    if (has(medsLower, ssriSnri)) {
      if (hasIngr(allIngredients, ["st. john", "st john"])) {
        warnings.push({
          category: 'sjw_ssri',
          severity: 'critical',
          message: "BLOCKED: St. John's Wort must NEVER be combined with antidepressants — risk of serotonin syndrome, a potentially fatal condition. Remove this ingredient.",
          ingredients: matchingIngr(allIngredients, ["st. john", "st john"]),
          drugs: medsLower.filter(m => ssriSnri.some(d => m.includes(d))),
        });
      }
      const otherPsych = ['5-htp', 'same', 'tryptophan', 'gaba', 'rhodiola', 'ashwagandha'];
      if (hasIngr(allIngredients, otherPsych)) {
        const found = matchingIngr(allIngredients, otherPsych);
        warnings.push({
          category: 'psych_interaction',
          severity: 'serious',
          message: `Contains ${found.join(', ')} which may interact with your psychiatric medication. Discuss with your prescribing clinician before starting.`,
          ingredients: found,
          drugs: medsLower.filter(m => ssriSnri.some(d => m.includes(d))),
        });
      }
    }

    // ── 3d. Thyroid Medications ──────────────────────────────────────────
    const thyroidMeds = ['levothyroxine', 'synthroid', 'tirosint', 'liothyronine', 'cytomel', 'armour thyroid'];
    const thyroidSupplements = ['thyroid support', 'ashwagandha', 'iodine', 'kelp', 'seaweed', 'selenium', 'zinc'];
    if (has(medsLower, thyroidMeds) && hasIngr(allIngredients, thyroidSupplements)) {
      const found = matchingIngr(allIngredients, thyroidSupplements);
      warnings.push({
        category: 'thyroid_interaction',
        severity: 'serious',
        message: `Contains ${found.join(', ')} which may affect thyroid function while on thyroid medication. Take supplements 4+ hours apart from thyroid meds. Coordinate with your clinician.`,
        ingredients: found,
        drugs: medsLower.filter(m => thyroidMeds.some(d => m.includes(d))),
      });
    }

    // ── 3e. Diabetes / Blood Sugar Medications ──────────────────────────
    const diabetesMeds = ['metformin', 'insulin', 'glipizide', 'glyburide', 'semaglutide', 'ozempic', 'wegovy', 'tirzepatide', 'mounjaro', 'sitagliptin', 'januvia', 'empagliflozin', 'jardiance', 'dapagliflozin', 'canagliflozin'];
    const diabetesSupplements = ['berberine', 'cinnamon', 'chromium', 'alpha lipoic', 'innoslim', 'bitter melon', 'gymnema'];
    if (has(medsLower, diabetesMeds) && hasIngr(allIngredients, diabetesSupplements)) {
      const found = matchingIngr(allIngredients, diabetesSupplements);
      warnings.push({
        category: 'diabetes_interaction',
        severity: 'serious',
        message: `Contains ${found.join(', ')} which may lower blood glucose alongside your diabetes medication. Monitor for hypoglycemia and consult your physician.`,
        ingredients: found,
        drugs: medsLower.filter(m => diabetesMeds.some(d => m.includes(d))),
      });
    }

    // ── 3f. Blood Pressure Medications ──────────────────────────────────
    const bpMeds = ['lisinopril', 'amlodipine', 'metoprolol', 'losartan', 'valsartan', 'hydrochlorothiazide', 'carvedilol', 'verapamil', 'diltiazem', 'enalapril', 'ramipril'];
    const bpSupplements = ['magnesium', 'coq10', 'hawthorn', 'garlic', 'omega', 'potassium'];
    if (has(medsLower, bpMeds) && hasIngr(allIngredients, bpSupplements)) {
      const found = matchingIngr(allIngredients, bpSupplements);
      warnings.push({
        category: 'bp_interaction',
        severity: 'informational',
        message: `Contains ${found.join(', ')} which may further lower blood pressure with your antihypertensive medication. Monitor blood pressure closely.`,
        ingredients: found,
        drugs: medsLower.filter(m => bpMeds.some(d => m.includes(d))),
      });
    }

    // ── 3g. Immunosuppressants — St. John's Wort (CRITICAL) ─────────────
    const immunoMeds = ['cyclosporine', 'tacrolimus', 'mycophenolate', 'prednisone', 'methotrexate', 'azathioprine', 'sirolimus'];
    if (has(medsLower, immunoMeds)) {
      if (hasIngr(allIngredients, ["st. john", "st john"])) {
        warnings.push({
          category: 'sjw_immunosuppressant',
          severity: 'critical',
          message: "BLOCKED: St. John's Wort dramatically reduces immunosuppressant drug levels — this is life-threatening for transplant patients. Remove this ingredient immediately.",
          ingredients: matchingIngr(allIngredients, ["st. john", "st john"]),
          drugs: medsLower.filter(m => immunoMeds.some(d => m.includes(d))),
        });
      }
      if (hasIngr(allIngredients, ['echinacea', 'astragalus', 'elderberry', 'mushroom'])) {
        const found = matchingIngr(allIngredients, ['echinacea', 'astragalus', 'elderberry', 'mushroom']);
        warnings.push({
          category: 'immuno_stimulant',
          severity: 'serious',
          message: `Contains immune-stimulating ingredients (${found.join(', ')}) which are contraindicated with immunosuppressant therapy. Physician approval required.`,
          ingredients: found,
          drugs: medsLower.filter(m => immunoMeds.some(d => m.includes(d))),
        });
      }
      if (hasIngr(allIngredients, ['milk thistle'])) {
        warnings.push({
          category: 'cyp3a4_immuno',
          severity: 'serious',
          message: 'Milk Thistle may alter CYP3A4 enzyme activity, affecting immunosuppressant drug levels. Physician review required.',
          ingredients: ['milk thistle'],
          drugs: medsLower.filter(m => immunoMeds.some(d => m.includes(d))),
        });
      }
    }

    // ── 3h. Chemotherapy / Oncology ─────────────────────────────────────
    const chemoKeywords = ['chemotherapy', 'chemo', 'tamoxifen', 'anastrozole', 'letrozole', 'cisplatin', 'carboplatin', 'doxorubicin', 'paclitaxel', 'cyclophosphamide'];
    const chemoSupplements = ["st. john", "st john", 'high-dose', 'nac', 'melatonin'];
    if (has(medsLower, chemoKeywords) && hasIngr(allIngredients, chemoSupplements)) {
      warnings.push({
        category: 'chemo_interaction',
        severity: 'critical',
        message: 'BLOCKED: You are on oncology medications. High-dose antioxidants and certain supplements may interfere with cancer treatment. Physician oncologist review is REQUIRED. Formula cannot proceed without oncologist clearance.',
        ingredients: matchingIngr(allIngredients, chemoSupplements),
        drugs: medsLower.filter(m => chemoKeywords.some(d => m.includes(d))),
      });
    }

    // ── 3i. Statins — Red Yeast Rice (CRITICAL) ─────────────────────────
    const statins = ['atorvastatin', 'lipitor', 'rosuvastatin', 'crestor', 'simvastatin', 'zocor', 'pravastatin', 'fluvastatin', 'lovastatin'];
    if (has(medsLower, statins)) {
      if (hasIngr(allIngredients, ['red yeast rice'])) {
        warnings.push({
          category: 'ryr_statin',
          severity: 'critical',
          message: 'BLOCKED: Red Yeast Rice contains natural lovastatin and must NOT be combined with statin medications — risk of rhabdomyolysis (muscle breakdown). Remove this ingredient.',
          ingredients: matchingIngr(allIngredients, ['red yeast rice']),
          drugs: medsLower.filter(m => statins.some(d => m.includes(d))),
        });
      }
      const statinRisky = ['niacin', 'berberine'];
      if (hasIngr(allIngredients, statinRisky)) {
        const found = matchingIngr(allIngredients, statinRisky);
        warnings.push({
          category: 'statin_additive',
          severity: 'serious',
          message: `Contains ${found.join(', ')} which has additive lipid-lowering effects with your statin. Monitor for muscle pain/weakness (myopathy). Consult your physician.`,
          ingredients: found,
          drugs: medsLower.filter(m => statins.some(d => m.includes(d))),
        });
      }
    }

    // ── 3j. Hormone Medications ─────────────────────────────────────────
    const hormoneMeds = ['estradiol', 'progesterone', 'testosterone', 'birth control', 'contraceptive', 'clomid', 'clomiphene', 'finasteride', 'propecia', 'spironolactone'];
    const hormoneSupplements = ['ashwagandha', 'maca', 'dhea', 'dim', 'saw palmetto', 'black cohosh', 'vitex', 'tribulus'];
    if (has(medsLower, hormoneMeds) && hasIngr(allIngredients, hormoneSupplements)) {
      const found = matchingIngr(allIngredients, hormoneSupplements);
      warnings.push({
        category: 'hormone_interaction',
        severity: 'serious',
        message: `Contains hormone-modulating ingredients (${found.join(', ')}) which may interact with your hormone therapy. Coordinate with your prescribing physician.`,
        ingredients: found,
        drugs: medsLower.filter(m => hormoneMeds.some(d => m.includes(d))),
      });
    }

    // ── 3k. Seizure / Epilepsy Medications ──────────────────────────────
    const seizureMeds = ['carbamazepine', 'tegretol', 'phenytoin', 'dilantin', 'valproic', 'depakote', 'lamotrigine', 'lamictal', 'gabapentin', 'neurontin', 'levetiracetam', 'keppra', 'topiramate', 'topamax'];
    const seizureSupplements = ['ginkgo', 'evening primrose', 'vitamin b6', "st. john", "st john"];
    if (has(medsLower, seizureMeds) && hasIngr(allIngredients, seizureSupplements)) {
      const found = matchingIngr(allIngredients, seizureSupplements);
      warnings.push({
        category: 'seizure_interaction',
        severity: 'serious',
        message: `Contains ${found.join(', ')} which may lower seizure threshold or alter anti-epileptic drug levels. Consult your neurologist before starting.`,
        ingredients: found,
        drugs: medsLower.filter(m => seizureMeds.some(d => m.includes(d))),
      });
    }

    // ── 3l. Sedatives / Benzodiazepines ─────────────────────────────────
    const sedativeMeds = ['diazepam', 'valium', 'alprazolam', 'xanax', 'lorazepam', 'ativan', 'clonazepam', 'klonopin', 'zolpidem', 'ambien', 'eszopiclone', 'lunesta', 'temazepam'];
    const sedativeSupplements = ['valerian', 'gaba', 'melatonin', 'kava', 'passionflower', 'magnolia'];
    if (has(medsLower, sedativeMeds) && hasIngr(allIngredients, sedativeSupplements)) {
      const found = matchingIngr(allIngredients, sedativeSupplements);
      warnings.push({
        category: 'sedative_interaction',
        severity: 'serious',
        message: `Contains ${found.join(', ')} which may cause additive sedation with your sedative/sleep medication. Risk of excessive drowsiness — consult your physician.`,
        ingredients: found,
        drugs: medsLower.filter(m => sedativeMeds.some(d => m.includes(d))),
      });
    }

    // ── 3m. Opioid Pain Medications ─────────────────────────────────────
    const opioidMeds = ['oxycodone', 'oxycontin', 'hydrocodone', 'vicodin', 'tramadol', 'ultram', 'morphine', 'codeine', 'fentanyl', 'methadone', 'buprenorphine', 'suboxone'];
    const opioidSupplements = ['valerian', 'gaba', 'kava', 'passionflower', 'magnolia', 'melatonin'];
    if (has(medsLower, opioidMeds) && hasIngr(allIngredients, opioidSupplements)) {
      const found = matchingIngr(allIngredients, opioidSupplements);
      warnings.push({
        category: 'opioid_interaction',
        severity: 'critical',
        message: `BLOCKED: Contains sedating supplements (${found.join(', ')}) which may cause dangerous additive CNS depression with opioid medications. This combination is potentially fatal. Remove these ingredients or obtain explicit physician approval.`,
        ingredients: found,
        drugs: medsLower.filter(m => opioidMeds.some(d => m.includes(d))),
      });
    }

    // ── 3n. ADHD Stimulant Medications ──────────────────────────────────
    const adhdMeds = ['methylphenidate', 'ritalin', 'concerta', 'amphetamine', 'adderall', 'lisdexamfetamine', 'vyvanse', 'dextroamphetamine', 'dexedrine', 'atomoxetine', 'strattera'];
    const adhdSupplements = ['caffeine', 'rhodiola', 'ginseng', 'tyrosine', 'yohimbine', 'synephrine'];
    if (has(medsLower, adhdMeds) && hasIngr(allIngredients, adhdSupplements)) {
      const found = matchingIngr(allIngredients, adhdSupplements);
      warnings.push({
        category: 'adhd_interaction',
        severity: 'serious',
        message: `Contains stimulating ingredients (${found.join(', ')}) which may cause additive cardiovascular stress and overstimulation with your ADHD medication. Discuss with your physician.`,
        ingredients: found,
        drugs: medsLower.filter(m => adhdMeds.some(d => m.includes(d))),
      });
    }

    // ── 3o. PPIs / Acid Reducers ────────────────────────────────────────
    const ppiMeds = ['omeprazole', 'prilosec', 'pantoprazole', 'protonix', 'esomeprazole', 'nexium', 'lansoprazole', 'prevacid', 'famotidine', 'pepcid', 'ranitidine'];
    const ppiSupplements = ['iron', 'calcium', 'magnesium', 'vitamin b12', 'zinc'];
    if (has(medsLower, ppiMeds) && hasIngr(allIngredients, ppiSupplements)) {
      const found = matchingIngr(allIngredients, ppiSupplements);
      warnings.push({
        category: 'ppi_absorption',
        severity: 'informational',
        message: `PPIs reduce absorption of ${found.join(', ')}. Take these supplements at least 2 hours apart from your acid reducer for best absorption.`,
        ingredients: found,
        drugs: medsLower.filter(m => ppiMeds.some(d => m.includes(d))),
      });
    }

    // ── 3p. Antibiotics ─────────────────────────────────────────────────
    const antibiotics = ['tetracycline', 'doxycycline', 'minocycline', 'ciprofloxacin', 'cipro', 'levofloxacin', 'levaquin', 'moxifloxacin', 'amoxicillin', 'azithromycin'];
    const antibioticSupplements = ['calcium', 'iron', 'magnesium', 'zinc'];
    if (has(medsLower, antibiotics) && hasIngr(allIngredients, antibioticSupplements)) {
      const found = matchingIngr(allIngredients, antibioticSupplements);
      warnings.push({
        category: 'antibiotic_chelation',
        severity: 'informational',
        message: `Minerals (${found.join(', ')}) can chelate and reduce absorption of your antibiotic. Take supplements at least 2-4 hours apart from your antibiotic dose.`,
        ingredients: found,
        drugs: medsLower.filter(m => antibiotics.some(d => m.includes(d))),
      });
    }

    // ── 3q. Corticosteroids ─────────────────────────────────────────────
    const corticosteroids = ['prednisone', 'prednisolone', 'dexamethasone', 'methylprednisolone', 'hydrocortisone', 'budesonide'];
    if (has(medsLower, corticosteroids)) {
      if (hasIngr(allIngredients, ['licorice', 'glycyrrhizin'])) {
        warnings.push({
          category: 'corticosteroid_licorice',
          severity: 'serious',
          message: 'Licorice Root may worsen potassium depletion and fluid retention caused by corticosteroids. Avoid or use deglycyrrhizinated (DGL) form only.',
          ingredients: matchingIngr(allIngredients, ['licorice', 'glycyrrhizin']),
          drugs: medsLower.filter(m => corticosteroids.some(d => m.includes(d))),
        });
      }
      if (hasIngr(allIngredients, ['echinacea', 'astragalus', 'elderberry', 'mushroom'])) {
        const found = matchingIngr(allIngredients, ['echinacea', 'astragalus', 'elderberry', 'mushroom']);
        warnings.push({
          category: 'corticosteroid_immuno',
          severity: 'informational',
          message: `Immune-stimulating ingredients (${found.join(', ')}) may counteract the immunosuppressive effect of your corticosteroid. Consult your physician.`,
          ingredients: found,
          drugs: medsLower.filter(m => corticosteroids.some(d => m.includes(d))),
        });
      }
    }

    // ── 3r. Heart Rhythm / Cardiac Glycosides ───────────────────────────
    const cardiacMeds = ['digoxin', 'lanoxin', 'amiodarone', 'flecainide', 'sotalol', 'dofetilide', 'dronedarone'];
    const cardiacSupplements = ['magnesium', 'potassium', 'hawthorn', 'licorice', 'glycyrrhizin'];
    if (has(medsLower, cardiacMeds) && hasIngr(allIngredients, cardiacSupplements)) {
      const found = matchingIngr(allIngredients, cardiacSupplements);
      warnings.push({
        category: 'cardiac_interaction',
        severity: 'serious',
        message: `Contains ${found.join(', ')} which can shift electrolyte balance and affect heart rhythm while on cardiac medications. Physician monitoring required.`,
        ingredients: found,
        drugs: medsLower.filter(m => cardiacMeds.some(d => m.includes(d))),
      });
    }

    // ── 3s. CYP450 Narrow Therapeutic Index ─────────────────────────────
    const narrowTIDrugs = ['warfarin', 'cyclosporine', 'tacrolimus', 'theophylline', 'phenytoin', 'digoxin', 'lithium', 'carbamazepine'];
    const cyp450Supplements = ["st. john", "st john", 'goldenseal', 'grapefruit'];
    if (has(medsLower, narrowTIDrugs) && hasIngr(allIngredients, cyp450Supplements)) {
      const found = matchingIngr(allIngredients, cyp450Supplements);
      warnings.push({
        category: 'cyp450_nti',
        severity: 'critical',
        message: `BLOCKED: Contains CYP450 enzyme modulators (${found.join(', ')}) which can dramatically alter blood levels of your narrow-therapeutic-index medication. This is potentially fatal. Remove these ingredients.`,
        ingredients: found,
        drugs: medsLower.filter(m => narrowTIDrugs.some(d => m.includes(d))),
      });
    }

    // ── 3t. Kidney Impairment ───────────────────────────────────────────
    const kidneyKeywords = ['kidney', 'renal', 'dialysis', 'ckd', 'chronic kidney'];
    if (has(medsLower, kidneyKeywords) || has(conditionsLower, kidneyKeywords)) {
      const kidneySupplements = ['potassium', 'magnesium', 'phosphorus', 'creatine', 'vitamin c'];
      if (hasIngr(allIngredients, kidneySupplements)) {
        const found = matchingIngr(allIngredients, kidneySupplements);
        warnings.push({
          category: 'kidney_impairment',
          severity: 'serious',
          message: `Contains ${found.join(', ')} which require dose adjustment or avoidance with kidney impairment. Consult your nephrologist before starting.`,
          ingredients: found,
        });
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 3u. HIGH-RISK POPULATION HARD BLOCKS
  // ══════════════════════════════════════════════════════════════════════════

  // ── Minors (under 18) — block ALL formulas ────────────────────────────
  if (has(conditionsLower, ['minor', 'under 18', 'child', 'pediatric', 'teenager', 'adolescent'])) {
    warnings.push({
      category: 'minor_block',
      severity: 'critical',
      message: 'BLOCKED: Personalized supplement formulas are not available for individuals under 18. This product is formulated for adults only.',
    });
  }

  // ── Severe kidney disease — block if kidney + high-risk supplements ───
  const severeKidneyKeywords = ['dialysis', 'kidney failure', 'end stage renal', 'esrd', 'ckd stage 4', 'ckd stage 5', 'stage 4 kidney', 'stage 5 kidney'];
  if (has(conditionsLower, severeKidneyKeywords)) {
    warnings.push({
      category: 'severe_kidney_block',
      severity: 'critical',
      message: 'BLOCKED: With severe kidney disease or dialysis, supplement use requires direct nephrologist supervision. We cannot create a formula without documented nephrology clearance.',
    });
  }

  // ── Immunosuppressants — escalate immune-stimulating supplements to critical ──
  if (medsLower.length > 0) {
    const immunoMedsHigh = ['cyclosporine', 'tacrolimus', 'mycophenolate', 'azathioprine', 'sirolimus'];
    if (has(medsLower, immunoMedsHigh)) {
      const immuneStims = ['echinacea', 'astragalus', 'elderberry', 'mushroom', 'beta glucan', 'colostrum'];
      if (hasIngr(allIngredients, immuneStims)) {
        const found = matchingIngr(allIngredients, immuneStims);
        // Check if we already pushed a 'serious' immuno_stimulant warning — upgrade it
        const existingIdx = warnings.findIndex(w => w.category === 'immuno_stimulant');
        if (existingIdx >= 0) {
          warnings[existingIdx].severity = 'critical';
          warnings[existingIdx].message = `BLOCKED: Contains immune-stimulating ingredients (${found.join(', ')}) which are contraindicated with transplant immunosuppressants. Risk of organ rejection. Remove these ingredients.`;
        }
      }
    }
  }

  // ── Active chemotherapy — block ALL formulas if chemo noted in conditions ──
  if (has(conditionsLower, ['chemotherapy', 'chemo', 'cancer treatment', 'radiation therapy', 'oncology treatment'])) {
    // Only add if not already caught by 3h medication check
    if (!warnings.some(w => w.category === 'chemo_interaction')) {
      warnings.push({
        category: 'chemo_condition_block',
        severity: 'critical',
        message: 'BLOCKED: You indicated active cancer treatment. Supplements may interfere with chemotherapy or radiation. An oncologist must review and approve any supplement use during active treatment.',
      });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 4. ORGAN-SPECIFIC CAUTIONS (liver + kidney from contraindication catalog)
  // ══════════════════════════════════════════════════════════════════════════
  const hasLiverCondition = has(conditionsLower, ['liver', 'hepat', 'cirrhosis', 'fatty liver', 'nafld', 'nash', 'hepatitis']);
  const hasKidneyCondition = has(conditionsLower, ['kidney', 'renal', 'ckd', 'dialysis', 'chronic kidney']);

  if (hasLiverCondition || hasKidneyCondition) {
    for (const name of allIngredientNames) {
      const contra = getContraindication(name);
      if (contra?.organCautions) {
        for (const caution of contra.organCautions) {
          if (caution.organ === 'liver' && hasLiverCondition) {
            const severity = caution.severity === 'avoid' ? 'critical' as const : 'serious' as const;
            warnings.push({
              category: `liver_${caution.severity}`,
              severity,
              message: caution.severity === 'avoid'
                ? `BLOCKED: "${name}" is contraindicated with your liver condition. ${caution.note}`
                : `"${name}" requires caution with your liver condition. ${caution.note}`,
              ingredients: [name],
            });
          }
          if (caution.organ === 'kidney' && hasKidneyCondition) {
            const severity = caution.severity === 'avoid' ? 'critical' as const : 'serious' as const;
            warnings.push({
              category: `kidney_${caution.severity}`,
              severity,
              message: caution.severity === 'avoid'
                ? `BLOCKED: "${name}" is contraindicated with your kidney condition. ${caution.note}`
                : `"${name}" requires caution with your kidney condition. ${caution.note}`,
              ingredients: [name],
            });
          }
        }
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 5. CONDITION-BASED CONTRAINDICATIONS
  // ══════════════════════════════════════════════════════════════════════════
  if (conditionsLower.length > 0) {
    for (const name of allIngredientNames) {
      const contra = getContraindication(name);
      if (contra?.contraindicated_conditions) {
        for (const condition of contra.contraindicated_conditions) {
          if (has(conditionsLower, [condition.toLowerCase()])) {
            warnings.push({
              category: 'condition_contraindication',
              severity: 'serious',
              message: `"${name}" may be contraindicated with your reported condition "${condition}". Consult your physician before proceeding.`,
              ingredients: [name],
            });
          }
        }
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 6. GENERAL MEDICATION DISCLOSURE REMINDER
  // ══════════════════════════════════════════════════════════════════════════
  if (medsLower.length === 0 && allIngredients.length > 0) {
    warnings.push({
      category: 'no_medications_disclosed',
      severity: 'informational',
      message: 'If you take any prescription medications, consult your physician or pharmacist before starting this formula.',
    });
  }

  // ── Build result ──────────────────────────────────────────────────────
  const criticalWarnings = warnings.filter(w => w.severity === 'critical');
  const seriousWarnings = warnings.filter(w => w.severity === 'serious');

  return {
    safe: criticalWarnings.length === 0,
    requiresAcknowledgment: seriousWarnings.length > 0,
    warnings,
    blockedReasons: criticalWarnings.map(w => w.message),
  };
}

/**
 * Convert structured SafetyWarning[] to flat string[] for backward compatibility
 * with existing formula.warnings JSON field.
 */
export function safetyWarningsToStrings(warnings: SafetyWarning[]): string[] {
  return warnings.map(w => {
    const prefix = w.severity === 'critical' ? '🚫 ' : w.severity === 'serious' ? '⚠️ ' : 'ℹ️ ';
    return `${prefix}${w.message}`;
  });
}

/**
 * Extract the severity of the most serious warning in a flat warning string array.
 * Used by the frontend to determine UI behavior from legacy string warnings.
 */
export function getHighestSeverityFromStrings(warnings: string[]): 'critical' | 'serious' | 'informational' | 'none' {
  if (warnings.some(w => w.startsWith('🚫 ') || w.includes('BLOCKED'))) return 'critical';
  if (warnings.some(w => w.startsWith('⚠️ ') || w.includes('CRITICAL'))) return 'serious';
  if (warnings.length > 0) return 'informational';
  return 'none';
}
