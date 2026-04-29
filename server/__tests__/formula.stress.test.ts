import { describe, expect, it } from 'vitest';
import {
  autoExpandFormula,
  autoFitFormulaToBudget,
  FORMULA_LIMITS,
  validateAndCalculateFormula,
  validateAndCorrectIngredientNames,
  validateFormulaLimits,
} from '../modules/formulas/formula-service';
import { INDIVIDUAL_INGREDIENTS, SYSTEM_SUPPORTS } from '../../shared/ingredients';

type FormulaItem = { ingredient: string; amount: number; unit: 'mg'; purpose?: string };

type TestFormula = {
  targetCapsules: 6 | 9 | 12;
  bases: FormulaItem[];
  additions: FormulaItem[];
  totalMg?: number;
};

type Sex = 'male' | 'female';

type Scenario = {
  sex: Sex;
  theme: string;
  preferredBaseRegex: RegExp[];
  preferredAdditionRegex: RegExp[];
};

const CAPSULE_OPTIONS: Array<6 | 9 | 12> = [6, 9, 12];
const CASES_PER_SEX = 600;
const TOTAL_CASES = CASES_PER_SEX * 2;

const ALIAS_VARIANTS: Record<string, string[]> = {
  'Ashwagandha': ['ashwaganda', 'aswagandha'],
  'Omega-3': ['omega 3', 'fish oil'],
  'CoEnzyme Q10': ['coq10', 'coenzyme q10'],
  'Ginkgo Biloba Extract 24%': ['ginkgo', 'ginko'],
  'Hawthorn Berry': ['hawthorn'],
  'Curcumin': ['turmeric'],
  'Phosphatidylcholine': ['pc'],
  'Cinnamon 20:1': ['cinnamon'],
};

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function pickUnique<T>(arr: T[], count: number, rand: () => number): T[] {
  const copy = [...arr];
  const picked: T[] = [];
  while (copy.length > 0 && picked.length < count) {
    const index = Math.floor(rand() * copy.length);
    picked.push(copy.splice(index, 1)[0]);
  }
  return picked;
}

function toDose(min: number, max: number, rand: () => number): number {
  if (min >= max) return min;
  return Math.round(min + (max - min) * rand());
}

function maybeAlias(name: string, rand: () => number): string {
  const variants = ALIAS_VARIANTS[name];
  if (!variants?.length) return name;
  if (rand() < 0.3) {
    return variants[Math.floor(rand() * variants.length)];
  }
  return name;
}

function pickPreferredOrRandom<T>(
  preferred: T[],
  all: T[],
  count: number,
  rand: () => number
): T[] {
  const selected = pickUnique(preferred, Math.min(count, preferred.length), rand);
  if (selected.length >= count) return selected;

  const remainingPool = all.filter((item) => !selected.includes(item));
  const fill = pickUnique(remainingPool, count - selected.length, rand);
  return [...selected, ...fill];
}

function byRegexName<T extends { name: string }>(arr: T[], regexes: RegExp[]): T[] {
  return arr.filter((item) => regexes.some((regex) => regex.test(item.name)));
}

function scenarios(): Scenario[] {
  return [
    {
      sex: 'male',
      theme: 'male-cardio-performance',
      preferredBaseRegex: [/Heart Support/i, /Prostate Support/i, /Endocrine Support/i],
      preferredAdditionRegex: [/Omega-3/i, /CoEnzyme Q10/i, /Hawthorn/i, /Garlic/i, /Resveratrol/i, /Ginkgo/i],
    },
    {
      sex: 'male',
      theme: 'male-stress-recovery',
      preferredBaseRegex: [/Adrenal Support/i, /Liver Support/i, /Thyroid Support/i],
      preferredAdditionRegex: [/Ashwagandha/i, /Magnesium/i, /GABA/i, /L-Theanine/i, /Rhodiola/i, /Ginseng/i],
    },
    {
      sex: 'male',
      theme: 'male-metabolic-detox',
      preferredBaseRegex: [/Endocrine Support/i, /Liver Support/i, /Kidney & Bladder Support/i],
      preferredAdditionRegex: [/Cinnamon/i, /InnoSlim/i, /Berberine/i, /Curcumin/i, /Ginger/i, /NAC/i],
    },
    {
      sex: 'female',
      theme: 'female-hormonal-balance',
      preferredBaseRegex: [/Ovary Uterus Support/i, /Thyroid Support/i, /Adrenal Support/i],
      preferredAdditionRegex: [/Magnesium/i, /Ashwagandha/i, /L-Theanine/i, /GABA/i, /Omega-3/i, /Curcumin/i],
    },
    {
      sex: 'female',
      theme: 'female-cardio-brain-energy',
      preferredBaseRegex: [/Heart Support/i, /Endocrine Support/i, /Liver Support/i],
      preferredAdditionRegex: [/Phosphatidylcholine/i, /Ginkgo/i, /CoEnzyme Q10/i, /Resveratrol/i, /Omega-3/i, /Hawthorn/i],
    },
    {
      sex: 'female',
      theme: 'female-gut-immune-inflammatory',
      preferredBaseRegex: [/Immune-C/i, /Histamine Support/i, /Liver Support/i],
      preferredAdditionRegex: [/Aloe/i, /Ginger/i, /Curcumin/i, /Astragalus/i, /Camu/i, /Garlic/i],
    },
  ];
}

function buildScenarioFormula(caseIndex: number): { formula: TestFormula; scenario: Scenario } {
  const rand = seededRandom(9000 + caseIndex);
  const allScenarios = scenarios();
  const scenario = allScenarios[caseIndex % allScenarios.length];
  const targetCapsules = CAPSULE_OPTIONS[Math.floor(rand() * CAPSULE_OPTIONS.length)];

  const baseCount = 1 + Math.floor(rand() * 2);
  const additionCount = 8 + Math.floor(rand() * 12);

  const sexFilteredBases = SYSTEM_SUPPORTS.filter((support) => {
    if (scenario.sex === 'male' && /Ovary Uterus Support/i.test(support.name)) return false;
    if (scenario.sex === 'female' && /Prostate Support/i.test(support.name)) return false;
    return true;
  });

  const preferredBases = byRegexName(sexFilteredBases, scenario.preferredBaseRegex);
  const preferredAdditions = byRegexName(INDIVIDUAL_INGREDIENTS, scenario.preferredAdditionRegex);

  const bases = pickPreferredOrRandom(preferredBases, sexFilteredBases, baseCount, rand).map((base) => {
    const multiplier = 1 + Math.floor(rand() * 3);
    return {
      ingredient: base.name,
      amount: base.doseMg * multiplier,
      unit: 'mg' as const,
      purpose: `Stress-case base ${scenario.theme} ${base.name}`,
    };
  });

  const additions = pickPreferredOrRandom(preferredAdditions, INDIVIDUAL_INGREDIENTS, additionCount, rand).map((ingredient) => {
    const min = ingredient.doseRangeMin ?? ingredient.doseMg;
    const max = ingredient.doseRangeMax ?? ingredient.doseMg;
    return {
      ingredient: maybeAlias(ingredient.name, rand),
      amount: toDose(min, max, rand),
      unit: 'mg' as const,
      purpose: `Stress-case addition ${scenario.theme} ${ingredient.name}`,
    };
  });

  return {
    scenario,
    formula: {
      targetCapsules,
      bases,
      additions,
    },
  };
}

function runPipeline(input: TestFormula) {
  const corrected = validateAndCorrectIngredientNames(input);
  expect(corrected.success).toBe(true);

  const formula = corrected.correctedFormula as TestFormula;
  const initialValidation = validateAndCalculateFormula(formula);
  expect(initialValidation.isValid).toBe(true);

  formula.totalMg = initialValidation.calculatedTotalMg;
  autoFitFormulaToBudget(formula);
  autoExpandFormula(formula);

  const finalValidation = validateAndCalculateFormula(formula);
  formula.totalMg = finalValidation.calculatedTotalMg;
  if (!finalValidation.isValid) {
    throw new Error(`Final validation errors: ${finalValidation.errors.join(' | ')}`);
  }

  const limits = validateFormulaLimits(formula);
  return { formula, limits, warnings: corrected.warnings };
}

describe('Formula stress pipeline', () => {
  it(`handles ${TOTAL_CASES} diverse male/female formulation possibilities`, () => {
    const failures: string[] = [];
    const uniqueCanonicalIngredients = new Set<string>();
    const scenarioCount = new Map<string, number>();
    let maleCases = 0;
    let femaleCases = 0;

    for (let index = 0; index < TOTAL_CASES; index++) {
      const { formula: candidate, scenario } = buildScenarioFormula(index);
      const { formula, limits } = runPipeline(candidate);

      scenarioCount.set(scenario.theme, (scenarioCount.get(scenario.theme) || 0) + 1);
      if (scenario.sex === 'male') maleCases++;
      if (scenario.sex === 'female') femaleCases++;

      for (const item of [...formula.bases, ...formula.additions]) {
        uniqueCanonicalIngredients.add(item.ingredient);
      }

      if (!limits.valid) {
        failures.push(
          `Case ${index + 1} failed (${formula.targetCapsules} caps, ${formula.totalMg}mg): ${limits.errors.join(' | ')}`
        );
      }
    }

    if (failures.length > 0) {
      throw new Error(`Stress failures: ${failures.slice(0, 5).join(' || ')}${failures.length > 5 ? ` (+${failures.length - 5} more)` : ''}`);
    }

    expect(failures.length).toBe(0);
    expect(maleCases).toBe(CASES_PER_SEX);
    expect(femaleCases).toBe(CASES_PER_SEX);
    expect(uniqueCanonicalIngredients.size).toBeGreaterThanOrEqual(40);

    for (const scenario of scenarios()) {
      expect(scenarioCount.get(scenario.theme)).toBeGreaterThan(0);
    }
  });

  it('respects supported capsule counts across stress generation', () => {
    const observed = new Set<number>();

    for (let index = 0; index < TOTAL_CASES; index++) {
      observed.add(buildScenarioFormula(index).formula.targetCapsules);
    }

    for (const value of observed) {
      expect(FORMULA_LIMITS.VALID_CAPSULE_COUNTS).toContain(value as any);
    }
  });
});
