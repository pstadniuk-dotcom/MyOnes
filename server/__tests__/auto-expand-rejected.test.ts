/**
 * Tests covering David's bug: rejected ingredients getting re-added by
 * autoExpandFormula's hardcoded filler list, even when the AI honored the
 * prompt directive.
 */

import { describe, it, expect } from 'vitest';
import { autoExpandFormula } from '../modules/formulas/formula-service';

describe('autoExpandFormula — respects rejected ingredients', () => {
  it('does NOT re-add Garlic when it is in the rejected list', () => {
    // Sparse formula that would normally trigger filler additions
    const formula = {
      bases: [
        { ingredient: 'Beta Max', amount: 650, unit: 'mg', purpose: 'base' },
      ],
      additions: [],
      targetCapsules: 9,
      totalMg: 650,
    };
    const result = autoExpandFormula(formula, ['Garlic']);
    const allNames = [
      ...(formula.bases || []),
      ...(formula.additions || []),
    ].map((i: any) => (i.ingredient || '').toLowerCase());

    expect(result.expanded).toBe(true);
    expect(allNames).not.toContain('garlic');
  });

  it('does NOT re-add Resveratrol when it is in the rejected list', () => {
    const formula = {
      bases: [
        { ingredient: 'Beta Max', amount: 650, unit: 'mg', purpose: 'base' },
      ],
      additions: [],
      targetCapsules: 9,
      totalMg: 650,
    };
    autoExpandFormula(formula, ['Resveratrol']);
    const allNames = [
      ...(formula.bases || []),
      ...(formula.additions || []),
    ].map((i: any) => (i.ingredient || '').toLowerCase());

    expect(allNames).not.toContain('resveratrol');
  });

  it("David's exact case: rejected Garlic + Resveratrol — neither appears", () => {
    const formula = {
      bases: [
        { ingredient: 'Beta Max', amount: 650, unit: 'mg', purpose: 'base' },
        { ingredient: 'Liver Support', amount: 530, unit: 'mg', purpose: 'base' },
        { ingredient: 'Phosphatidylcholine', amount: 900, unit: 'mg', purpose: 'base' },
      ],
      additions: [
        { ingredient: 'Ashwagandha', amount: 300, unit: 'mg', purpose: 'addition' },
      ],
      targetCapsules: 6,
      totalMg: 2380,
    };
    autoExpandFormula(formula, ['Resveratrol', 'Garlic']);
    const allNames = [
      ...(formula.bases || []),
      ...(formula.additions || []),
    ].map((i: any) => (i.ingredient || '').toLowerCase());

    expect(allNames).not.toContain('garlic');
    expect(allNames).not.toContain('resveratrol');
  });

  it('case-insensitive matching: lower-case rejected list still blocks', () => {
    const formula = {
      bases: [{ ingredient: 'Beta Max', amount: 650, unit: 'mg' }],
      additions: [],
      targetCapsules: 9,
      totalMg: 650,
    };
    autoExpandFormula(formula, ['garlic', 'RESVERATROL']);
    const allNames = [
      ...(formula.bases || []),
      ...(formula.additions || []),
    ].map((i: any) => (i.ingredient || '').toLowerCase());

    expect(allNames).not.toContain('garlic');
    expect(allNames).not.toContain('resveratrol');
  });

  it('still expands using OTHER fillers when some are rejected', () => {
    const formula = {
      bases: [{ ingredient: 'Beta Max', amount: 650, unit: 'mg' }],
      additions: [],
      targetCapsules: 9,
      totalMg: 650,
    };
    const result = autoExpandFormula(formula, ['Garlic', 'Resveratrol']);
    // Should still add SOMETHING from the remaining fillers (Ginkgo, Ginger, etc.)
    expect(result.expanded).toBe(true);
    expect(result.addedIngredients.length).toBeGreaterThan(0);
  });

  it('empty rejected list — original behavior preserved (Garlic CAN be added)', () => {
    const formula = {
      bases: [{ ingredient: 'Beta Max', amount: 650, unit: 'mg' }],
      additions: [],
      targetCapsules: 9,
      totalMg: 650,
    };
    autoExpandFormula(formula, []);
    const allNames = [
      ...(formula.bases || []),
      ...(formula.additions || []),
    ].map((i: any) => (i.ingredient || '').toLowerCase());

    // Garlic IS the first filler — should appear when nothing is blocked
    expect(allNames).toContain('garlic');
  });

  it('default arg (no second param) — original behavior preserved', () => {
    const formula = {
      bases: [{ ingredient: 'Beta Max', amount: 650, unit: 'mg' }],
      additions: [],
      targetCapsules: 9,
      totalMg: 650,
    };
    autoExpandFormula(formula);
    const allNames = [
      ...(formula.bases || []),
      ...(formula.additions || []),
    ].map((i: any) => (i.ingredient || '').toLowerCase());

    expect(allNames).toContain('garlic');
  });
});
