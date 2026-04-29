/**
 * Integration tests for the formula creation audit fixes.
 *
 * Covers:
 *   - clampIngredientDosesToRange: NaN/Infinity guards + range clamping
 *   - autoFitFormulaToBudget: count-preservation guard (won't gut formula)
 *   - validateFormulaSafety: drug brand-name aliases + name normalization
 *   - detectPregnancyStatus / detectNursingStatus: keyword expansion
 */

import { describe, it, expect } from 'vitest';
import {
  clampIngredientDosesToRange,
  autoFitFormulaToBudget,
  parseDoseToMg,
} from '../modules/formulas/formula-service';
import { validateFormulaSafety } from '../modules/formulas/safety-validator';
import {
  detectPregnancyStatus,
  detectNursingStatus,
} from '../modules/formulas/profile-status-detector';

describe('Audit fixes — clampIngredientDosesToRange', () => {
  it('coerces non-finite amounts to ingredient minimum', () => {
    const formula = {
      bases: [],
      additions: [
        { ingredient: 'Ashwagandha', amount: NaN, unit: 'mg' },
      ],
      targetCapsules: 9,
    };
    const notes = clampIngredientDosesToRange(formula);
    expect(notes.length).toBeGreaterThan(0);
    expect(notes[0]).toMatch(/could not parse amount/i);
    expect(Number.isFinite(formula.additions[0].amount)).toBe(true);
    expect(formula.additions[0].amount).toBeGreaterThan(0);
  });

  it('handles Infinity safely', () => {
    const formula = {
      bases: [],
      additions: [{ ingredient: 'Ashwagandha', amount: Infinity, unit: 'mg' }],
      targetCapsules: 9,
    };
    clampIngredientDosesToRange(formula);
    expect(Number.isFinite(formula.additions[0].amount)).toBe(true);
  });

  it('clamps below-minimum dose up into clinical range', () => {
    const formula = {
      bases: [],
      additions: [{ ingredient: 'Phosphatidylcholine', amount: 50, unit: 'mg' }],
      targetCapsules: 9,
    };
    const notes = clampIngredientDosesToRange(formula);
    expect(notes.length).toBe(1);
    expect(formula.additions[0].amount).toBeGreaterThanOrEqual(100);
  });

  it('coerces string-number amounts to actual numbers', () => {
    const formula = {
      bases: [],
      additions: [{ ingredient: 'Ashwagandha', amount: '600' as any, unit: 'mg' }],
      targetCapsules: 9,
    };
    clampIngredientDosesToRange(formula);
    expect(typeof formula.additions[0].amount).toBe('number');
  });
});

describe('Audit fixes — parseDoseToMg', () => {
  it('returns 0 for unparseable input', () => {
    expect(parseDoseToMg('', 'X')).toBe(0);
    expect(parseDoseToMg('not a dose', 'X')).toBe(0);
  });
  it('parses g, mg, mcg correctly', () => {
    expect(parseDoseToMg('1g', 'X')).toBe(1000);
    expect(parseDoseToMg('500mg', 'X')).toBe(500);
    expect(parseDoseToMg('1000mcg', 'X')).toBe(1);
  });
  it('returns finite numbers only', () => {
    const result = parseDoseToMg('1e500g', 'X');
    expect(Number.isFinite(result)).toBe(true);
  });
});

describe('Audit fixes — autoFitFormulaToBudget count guard', () => {
  it('does not remove additions below the minimum ingredient count', () => {
    // 6-cap formula requires at least 5 ingredients per
    // getMinIngredientCountForCapsules. Pre-fix, autoFit would strip
    // additions one-by-one to fit budget even if it dropped below the min.
    const formula = {
      bases: [],
      additions: Array.from({ length: 6 }, (_, i) => ({
        ingredient: `Ashwagandha`,
        amount: 600,
        unit: 'mg',
        // Use real catalog ingredients; same name x6 is fine for the budget math
        // (validation runs separately).
      })),
      targetCapsules: 6,
      totalMg: 3600, // over 6-cap budget of 3300mg + tolerance
    };
    autoFitFormulaToBudget(formula);
    expect(formula.additions.length).toBeGreaterThanOrEqual(5);
  });
});

describe('Audit fixes — drug brand name aliases', () => {
  it('detects warfarin via Jantoven brand name', () => {
    const result = validateFormulaSafety({
      formula: { bases: [], additions: [{ ingredient: 'Fish Oil', amount: 1000, unit: 'mg' }] },
      userMedications: ['Jantoven 5mg daily'],
      userConditions: [],
      userAllergies: [],
    });
    // Should produce a critical warfarin warning
    const hasWarfarinWarning = result.warnings.some(w => w.severity === 'critical');
    expect(hasWarfarinWarning).toBe(true);
  });

  it('detects Pristiq (desvenlafaxine) as SSRI/SNRI', () => {
    const result = validateFormulaSafety({
      formula: { bases: [], additions: [{ ingredient: "St. John's Wort", amount: 300, unit: 'mg' }] },
      userMedications: ['Pristiq 50mg'],
      userConditions: [],
      userAllergies: [],
    });
    expect(result.safe).toBe(false);
  });

  it('detects Mounjaro (tirzepatide) as diabetes med', () => {
    const result = validateFormulaSafety({
      formula: { bases: [], additions: [{ ingredient: 'Berberine HCl', amount: 500, unit: 'mg' }] },
      userMedications: ['Mounjaro 5mg weekly'],
      userConditions: [],
      userAllergies: [],
    });
    const hasDiabetesWarning = result.warnings.some(w => w.category === 'diabetes_interaction');
    expect(hasDiabetesWarning).toBe(true);
  });
});

describe('Audit fixes — name normalization in safety check', () => {
  it('matches "St. John\'s Wort" against keyword "st johns wort" (punctuation-tolerant)', () => {
    const result = validateFormulaSafety({
      formula: { bases: [], additions: [{ ingredient: "St. John's Wort", amount: 300, unit: 'mg' }] },
      userMedications: ['sertraline'],
      userConditions: [],
      userAllergies: [],
    });
    expect(result.safe).toBe(false);
  });

  it('matches "CoQ10" against blood-pressure supplement keyword "coq10"', () => {
    const result = validateFormulaSafety({
      formula: { bases: [], additions: [{ ingredient: 'CoQ10', amount: 100, unit: 'mg' }] },
      userMedications: ['Lisinopril'],
      userConditions: [],
      userAllergies: [],
    });
    const hasBpWarning = result.warnings.some(w => w.category === 'bp_interaction');
    expect(hasBpWarning).toBe(true);
  });
});

describe('Audit fixes — pregnancy/nursing detection', () => {
  it('detects "trying to conceive"', () => {
    expect(detectPregnancyStatus(['trying to conceive'])).toBe(true);
  });
  it('detects "TTC"', () => {
    expect(detectPregnancyStatus(['TTC for 6 months'])).toBe(true);
  });
  it('detects "first trimester"', () => {
    expect(detectPregnancyStatus(['first trimester'])).toBe(true);
  });
  it('detects "IVF"', () => {
    expect(detectPregnancyStatus(['IVF cycle 3'])).toBe(true);
  });
  it('detects "postpartum"', () => {
    expect(detectNursingStatus(['postpartum 6 weeks'])).toBe(true);
  });
  it('detects "post-partum" (hyphenated)', () => {
    expect(detectNursingStatus(['post-partum recovery'])).toBe(true);
  });
  it('detects "lactating"', () => {
    expect(detectNursingStatus(['lactating'])).toBe(true);
  });
  it('does not false-positive on unrelated text', () => {
    expect(detectPregnancyStatus(['back pain', 'insomnia'])).toBe(false);
    expect(detectNursingStatus(['back pain', 'insomnia'])).toBe(false);
  });
});
