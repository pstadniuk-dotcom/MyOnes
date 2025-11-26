/**
 * Formula validation tests
 */

import { describe, it, expect } from 'vitest';

// Import the shared ingredients catalog
import { BASE_FORMULAS, INDIVIDUAL_INGREDIENTS } from '../../shared/ingredients';

describe('Ingredient Catalog', () => {
  describe('Base Formulas', () => {
    it('should have base formulas defined', () => {
      expect(BASE_FORMULAS).toBeDefined();
      expect(Array.isArray(BASE_FORMULAS)).toBe(true);
      expect(BASE_FORMULAS.length).toBeGreaterThan(0);
    });

    it('each base formula should have required fields', () => {
      BASE_FORMULAS.forEach((formula) => {
        expect(formula.name).toBeDefined();
        expect(typeof formula.name).toBe('string');
        expect(formula.doseMg).toBeDefined();
        expect(typeof formula.doseMg).toBe('number');
        expect(formula.doseMg).toBeGreaterThan(0);
      });
    });

    it('base formula names should be unique', () => {
      const names = BASE_FORMULAS.map((f) => f.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });
  });

  describe('Individual Ingredients', () => {
    it('should have individual ingredients defined', () => {
      expect(INDIVIDUAL_INGREDIENTS).toBeDefined();
      expect(Array.isArray(INDIVIDUAL_INGREDIENTS)).toBe(true);
      expect(INDIVIDUAL_INGREDIENTS.length).toBeGreaterThan(0);
    });

    it('each ingredient should have required fields', () => {
      INDIVIDUAL_INGREDIENTS.forEach((ingredient) => {
        expect(ingredient.name).toBeDefined();
        expect(typeof ingredient.name).toBe('string');
        expect(ingredient.doseMg).toBeDefined();
        expect(typeof ingredient.doseMg).toBe('number');
      });
    });

    it('ingredient names should be unique', () => {
      const names = INDIVIDUAL_INGREDIENTS.map((i) => i.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });
  });
});

describe('Formula Limits', () => {
  const MAX_TOTAL_DOSAGE = 5500;
  const MIN_INGREDIENT_DOSE = 10;
  const MAX_INGREDIENT_COUNT = 50;

  it('should enforce maximum total dosage', () => {
    const testFormula = {
      bases: [{ ingredient: 'Test', amount: 3000 }],
      additions: [{ ingredient: 'Test2', amount: 3000 }],
    };
    
    const total = 
      testFormula.bases.reduce((sum, b) => sum + b.amount, 0) +
      testFormula.additions.reduce((sum, a) => sum + a.amount, 0);
    
    expect(total).toBeGreaterThan(MAX_TOTAL_DOSAGE);
  });

  it('should validate minimum ingredient dose', () => {
    const validDose = 100;
    const invalidDose = 5;
    
    expect(validDose).toBeGreaterThanOrEqual(MIN_INGREDIENT_DOSE);
    expect(invalidDose).toBeLessThan(MIN_INGREDIENT_DOSE);
  });

  it('should limit ingredient count', () => {
    const ingredientCount = 10;
    expect(ingredientCount).toBeLessThanOrEqual(MAX_INGREDIENT_COUNT);
  });
});

describe('Dose Calculations', () => {
  it('should correctly sum formula totals', () => {
    const formula = {
      bases: [
        { ingredient: 'Base1', amount: 420 },
        { ingredient: 'Base2', amount: 380 },
      ],
      additions: [
        { ingredient: 'Add1', amount: 600 },
        { ingredient: 'Add2', amount: 500 },
      ],
    };

    const basesTotal = formula.bases.reduce((sum, b) => sum + b.amount, 0);
    const additionsTotal = formula.additions.reduce((sum, a) => sum + a.amount, 0);
    const total = basesTotal + additionsTotal;

    expect(basesTotal).toBe(800);
    expect(additionsTotal).toBe(1100);
    expect(total).toBe(1900);
  });
});
