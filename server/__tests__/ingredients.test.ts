/**
 * Ingredient System Tests
 * Tests the supplement ingredient catalog, validation, and dosing rules
 */

import { describe, it, expect } from 'vitest';
import {
  SYSTEM_SUPPORTS,
  INDIVIDUAL_INGREDIENTS,
  ALL_INGREDIENTS,
  normalizeIngredientName,
  findIngredientByName,
  isValidIngredient,
  getIngredientDose,
  getSystemSupportDetails,
} from '@shared/ingredients';

// Max formula mg per capsule count: 6=3300, 9=4950, 12=6600
const CAPSULE_CAPACITY_MG = 550;
const MAX_CAPSULE_COUNT = 12;
const ABSOLUTE_MAX_FORMULA_MG = MAX_CAPSULE_COUNT * CAPSULE_CAPACITY_MG; // 6,600mg

describe('Ingredient Normalization', () => {
  it('should return canonical name for valid ingredients', () => {
    // normalizeIngredientName returns canonical name (preserves casing)
    expect(normalizeIngredientName('ashwagandha')).toBe('Ashwagandha');
    expect(normalizeIngredientName('ASHWAGANDHA')).toBe('Ashwagandha');
  });

  it('should trim whitespace', () => {
    expect(normalizeIngredientName('  Ashwagandha  ')).toBe('Ashwagandha');
    expect(normalizeIngredientName('\tGinger Root\n')).toBe('Ginger Root');
  });

  it('should handle empty strings', () => {
    expect(normalizeIngredientName('')).toBe('');
    expect(normalizeIngredientName('   ')).toBe('');
  });

  it('should strip PE qualifiers from AI-generated names', () => {
    // AI sometimes adds PE qualifiers that need stripping
    const result = normalizeIngredientName('Ginkgo Biloba PE 1/8% Flavones');
    expect(result).toBe('Ginkgo Biloba Extract 24%');
  });

  it('should strip parenthetical descriptors', () => {
    const result = normalizeIngredientName('Vitamin D3 (soy)');
    expect(result).toBe('Vitamin D3');
  });
});

describe('Find Ingredient By Name', () => {
  it('should find system supports by exact name', () => {
    const adrenal = findIngredientByName('Adrenal Support');
    expect(adrenal).toBeDefined();
    expect(adrenal?.name).toBe('Adrenal Support');
    expect(adrenal?.doseMg).toBeGreaterThan(0);
  });

  it('should find individual ingredients by exact name', () => {
    const ashwagandha = findIngredientByName('Ashwagandha');
    expect(ashwagandha).toBeDefined();
    expect(ashwagandha?.name).toBe('Ashwagandha');
  });

  it('should be case-insensitive', () => {
    const lower = findIngredientByName('ashwagandha');
    const upper = findIngredientByName('ASHWAGANDHA');
    const mixed = findIngredientByName('AsHwAgAnDhA');

    expect(lower).toBeDefined();
    expect(upper).toBeDefined();
    expect(mixed).toBeDefined();
    expect(lower?.name).toBe(upper?.name);
    expect(upper?.name).toBe(mixed?.name);
  });

  it('should return undefined for unknown ingredients', () => {
    expect(findIngredientByName('Fake Ingredient XYZ')).toBeUndefined();
    expect(findIngredientByName('Not Real')).toBeUndefined();
  });
});

describe('Ingredient Validation', () => {
  it('should validate known ingredients', () => {
    expect(isValidIngredient('Ashwagandha')).toBe(true);
    expect(isValidIngredient('CoEnzyme Q10')).toBe(true);
    expect(isValidIngredient('Adrenal Support')).toBe(true);
  });

  it('should reject unknown ingredients', () => {
    expect(isValidIngredient('Fake Ingredient')).toBe(false);
    expect(isValidIngredient('')).toBe(false);
    expect(isValidIngredient('NotReal123')).toBe(false);
  });

  it('should be case-insensitive for validation', () => {
    expect(isValidIngredient('ashwagandha')).toBe(true);
    expect(isValidIngredient('ASHWAGANDHA')).toBe(true);
    expect(isValidIngredient('coenzyme q10')).toBe(true);
  });
});

describe('Ingredient Dosing', () => {
  it('should return correct dose for system supports', () => {
    const adrenalDose = getIngredientDose('Adrenal Support');
    expect(adrenalDose).toBe(420);

    const heartDose = getIngredientDose('Heart Support');
    expect(heartDose).toBeDefined();
    expect(heartDose).toBeGreaterThan(0);
  });

  it('should return correct dose for individual ingredients', () => {
    // Ashwagandha default dose is 50mg (range 50-600)
    const ashwagandhaDose = getIngredientDose('Ashwagandha');
    expect(ashwagandhaDose).toBe(50);

    // CoQ10 is actually named "CoEnzyme Q10" in the catalog
    const coq10Dose = getIngredientDose('CoEnzyme Q10');
    expect(coq10Dose).toBeDefined();
    expect(coq10Dose).toBeGreaterThan(0);
  });

  it('should return undefined for unknown ingredients', () => {
    expect(getIngredientDose('Unknown Ingredient')).toBeUndefined();
    expect(getIngredientDose('')).toBeUndefined();
  });
});

describe('System Supports Structure', () => {
  it('should have multiple system supports available', () => {
    expect(SYSTEM_SUPPORTS.length).toBeGreaterThan(5);
  });

  it('should have valid dose ranges for system supports', () => {
    SYSTEM_SUPPORTS.forEach(support => {
      expect(support.name).toBeDefined();
      expect(typeof support.name).toBe('string');
      expect(support.doseMg).toBeGreaterThan(0);
      expect(support.doseMg).toBeLessThan(ABSOLUTE_MAX_FORMULA_MG);
    });
  });

  it('should have required properties on system supports', () => {
    SYSTEM_SUPPORTS.forEach(support => {
      expect(support).toHaveProperty('name');
      expect(support).toHaveProperty('doseMg');
      expect(support).toHaveProperty('description');
    });
  });

  it('should include common system supports', () => {
    const names = SYSTEM_SUPPORTS.map(s => s.name);
    expect(names).toContain('Adrenal Support');
    expect(names).toContain('Heart Support');
    expect(names).toContain('Liver Support');
  });
});

describe('Individual Ingredients Structure', () => {
  it('should have multiple individual ingredients', () => {
    expect(INDIVIDUAL_INGREDIENTS.length).toBeGreaterThan(20);
  });

  it('should have valid dose ranges', () => {
    INDIVIDUAL_INGREDIENTS.forEach(ingredient => {
      expect(ingredient.name).toBeDefined();
      expect(typeof ingredient.name).toBe('string');

      // Should have either fixed dose or range
      if (ingredient.doseRangeMin && ingredient.doseRangeMax) {
        expect(ingredient.doseRangeMax).toBeGreaterThanOrEqual(ingredient.doseRangeMin);
      } else {
        expect(ingredient.doseMg).toBeGreaterThan(0);
      }
    });
  });

  it('should include common supplements', () => {
    const names = INDIVIDUAL_INGREDIENTS.map(i => i.name.toLowerCase());

    // Check for presence of common supplements (case insensitive)
    expect(names).toContain('ashwagandha');
    expect(names).toContain('coenzyme q10');
  });
});

describe('Formula Total Limits', () => {
  it('should respect capsule-based maximum total dosage limit', () => {
    // 12 capsules × 550mg = 6,600mg absolute ceiling
    expect(ABSOLUTE_MAX_FORMULA_MG).toBe(6600);
    expect(CAPSULE_CAPACITY_MG).toBe(550);
  });

  it('should allow valid formula combinations within 9-capsule budget', () => {
    // A typical formula: 1 system support + a few individuals (should fit in 9 caps = 4950mg)
    const adrenalDose = getIngredientDose('Adrenal Support') || 0;
    const ashwagandhaDose = getIngredientDose('Ashwagandha') || 0;
    const coq10Dose = getIngredientDose('CoEnzyme Q10') || 0;

    const total = adrenalDose + ashwagandhaDose + coq10Dose;
    const nineCapsBudget = 9 * CAPSULE_CAPACITY_MG; // 4,950mg
    expect(total).toBeLessThan(nineCapsBudget);
  });
});

describe('ALL_INGREDIENTS Combined List', () => {
  it('should contain both system supports and individual ingredients', () => {
    // ALL_INGREDIENTS should be the combined list
    expect(ALL_INGREDIENTS.length).toBe(SYSTEM_SUPPORTS.length + INDIVIDUAL_INGREDIENTS.length);
  });

  it('should include system supports', () => {
    const allNames = ALL_INGREDIENTS.map(i => i.name);
    SYSTEM_SUPPORTS.forEach(support => {
      expect(allNames).toContain(support.name);
    });
  });

  it('should include individual ingredients', () => {
    const allNames = ALL_INGREDIENTS.map(i => i.name);
    INDIVIDUAL_INGREDIENTS.forEach(ingredient => {
      expect(allNames).toContain(ingredient.name);
    });
  });
});

describe('System Support Details', () => {
  it('should provide details for system supports', () => {
    const details = getSystemSupportDetails('Adrenal Support');
    expect(details).toBeDefined();
    expect(details?.name).toBe('Adrenal Support');
  });

  it('should return undefined for non-system-support ingredients', () => {
    const details = getSystemSupportDetails('Ashwagandha');
    expect(details).toBeUndefined();
  });

  it('should return undefined for unknown ingredients', () => {
    const details = getSystemSupportDetails('Unknown Support');
    expect(details).toBeUndefined();
  });
});
