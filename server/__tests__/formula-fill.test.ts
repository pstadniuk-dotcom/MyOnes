import { describe, it, expect } from 'vitest';
import { autoFitFormulaToBudget, autoExpandFormula, validateFormulaLimits, FORMULA_LIMITS } from '../modules/formulas/formula-service';

describe('Pete formula 4899mg underfill fix', () => {
  it('should fill 9-capsule formula from 4899mg to at least 4950mg', () => {
    const formula: any = {
      targetCapsules: 9,
      bases: [
        { ingredient: 'Adrenal Support', amount: 420, unit: 'mg' },
        { ingredient: 'Heart Support', amount: 689, unit: 'mg' },
      ],
      additions: [
        { ingredient: 'Omega 3', amount: 1000, unit: 'mg' },
        { ingredient: 'Phosphatidylcholine', amount: 700, unit: 'mg' },
        { ingredient: 'Maca', amount: 500, unit: 'mg' },
        { ingredient: 'CoEnzyme Q10', amount: 200, unit: 'mg' },
        { ingredient: 'Curcumin', amount: 400, unit: 'mg' },
        { ingredient: 'Ginkgo Biloba Extract 24%', amount: 240, unit: 'mg' },
        { ingredient: 'Ashwagandha', amount: 300, unit: 'mg' },
        { ingredient: 'Ginger Root', amount: 250, unit: 'mg' },
        { ingredient: 'Garlic', amount: 200, unit: 'mg' },
      ],
      totalMg: 4899,
    };

    const startTotal = [...formula.bases, ...formula.additions].reduce((s: number, i: any) => s + i.amount, 0);
    expect(startTotal).toBe(4899);

    // Run pipeline (same order as chat.controller.ts)
    autoFitFormulaToBudget(formula);
    autoExpandFormula(formula);
    const checks = validateFormulaLimits(formula);

    const finalTotal = [...formula.bases, ...formula.additions].reduce((s: number, i: any) => s + i.amount, 0);

    console.log('Final total:', finalTotal, 'mg');
    console.log('formula.totalMg:', formula.totalMg);
    console.log('Validation valid:', checks.valid, 'errors:', checks.errors);

    // Must meet or exceed 4950mg (9 * 550)
    expect(finalTotal).toBeGreaterThanOrEqual(4950);
    // Must not exceed 5073mg (4950 * 1.025)
    expect(finalTotal).toBeLessThanOrEqual(5073);
    expect(checks.valid).toBe(true);
    expect(checks.errors).toHaveLength(0);
  });

  it('should fill 6-capsule formula to at least 3300mg', () => {
    const formula: any = {
      targetCapsules: 6,
      bases: [
        { ingredient: 'Adrenal Support', amount: 420, unit: 'mg' },
      ],
      additions: [
        { ingredient: 'Omega 3', amount: 500, unit: 'mg' },
        { ingredient: 'Ashwagandha', amount: 300, unit: 'mg' },
        { ingredient: 'Curcumin', amount: 400, unit: 'mg' },
        { ingredient: 'Maca', amount: 400, unit: 'mg' },
        { ingredient: 'Ginger Root', amount: 250, unit: 'mg' },
        { ingredient: 'CoEnzyme Q10', amount: 200, unit: 'mg' },
        { ingredient: 'Garlic', amount: 150, unit: 'mg' },
        { ingredient: 'Ginkgo Biloba Extract 24%', amount: 120, unit: 'mg' },
      ],
      totalMg: 2740,
    };

    autoFitFormulaToBudget(formula);
    autoExpandFormula(formula);
    const checks = validateFormulaLimits(formula);

    const finalTotal = [...formula.bases, ...formula.additions].reduce((s: number, i: any) => s + i.amount, 0);
    console.log('6-cap final total:', finalTotal, 'mg');

    expect(finalTotal).toBeGreaterThanOrEqual(3300);
    expect(finalTotal).toBeLessThanOrEqual(3382);
    expect(checks.valid).toBe(true);
  });

  it('should fill 12-capsule formula to at least 6600mg', () => {
    const formula: any = {
      targetCapsules: 12,
      bases: [
        { ingredient: 'Heart Support', amount: 689, unit: 'mg' },
        { ingredient: 'Adrenal Support', amount: 420, unit: 'mg' },
      ],
      additions: [
        { ingredient: 'Omega 3', amount: 1000, unit: 'mg' },
        { ingredient: 'Phosphatidylcholine', amount: 900, unit: 'mg' },
        { ingredient: 'Maca', amount: 500, unit: 'mg' },
        { ingredient: 'CoEnzyme Q10', amount: 200, unit: 'mg' },
        { ingredient: 'Curcumin', amount: 500, unit: 'mg' },
        { ingredient: 'Ashwagandha', amount: 500, unit: 'mg' },
        { ingredient: 'Ginger Root', amount: 400, unit: 'mg' },
        { ingredient: 'Garlic', amount: 200, unit: 'mg' },
        { ingredient: 'Ginkgo Biloba Extract 24%', amount: 240, unit: 'mg' },
        { ingredient: 'Aloe Vera', amount: 200, unit: 'mg' },
      ],
      totalMg: 5749,
    };

    autoFitFormulaToBudget(formula);
    autoExpandFormula(formula);
    const checks = validateFormulaLimits(formula);

    const finalTotal = [...formula.bases, ...formula.additions].reduce((s: number, i: any) => s + i.amount, 0);
    console.log('12-cap final total:', finalTotal, 'mg');

    expect(finalTotal).toBeGreaterThanOrEqual(6600);
    expect(finalTotal).toBeLessThanOrEqual(6765);
    expect(checks.valid).toBe(true);
  });
});
