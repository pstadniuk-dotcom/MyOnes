/**
 * Tests for the AI-driven formula expander.
 * All tests use a stubbed AI caller — no real API hits.
 *
 * Context for these tests: David's session showed sparse formulas being
 * filled with hardcoded fillers (Ginger Root, Hawthorn Berry) that had no
 * clinical relevance to him. The expander should let the AI choose its own
 * fills based on his profile, with strict validation against the catalog
 * and his rejected list.
 */

import { describe, it, expect, vi } from 'vitest';
import {
    expandFormulaWithAI,
    parseAndValidateExpansion,
    buildExpansionPrompt,
    buildClinicalContextSummary,
    type ExpansionContext,
    type ExpanderAICaller,
} from '../modules/chat/formula-expander';

const baseFormula = {
    bases: [
        { ingredient: 'Beta Max', amount: 650, unit: 'mg', purpose: 'base' },
        { ingredient: 'Liver Support', amount: 530, unit: 'mg', purpose: 'base' },
    ],
    additions: [
        { ingredient: 'Ashwagandha', amount: 600, unit: 'mg', purpose: 'stress' },
    ],
    targetCapsules: 6,
    totalMg: 1780,
};

function makeCtx(overrides: Partial<ExpansionContext> = {}): ExpansionContext {
    return {
        formula: { ...baseFormula },
        targetMg: 3300, // 6 caps * 550mg
        minAcceptableMg: 3135, // 95%
        maxAcceptableMg: 3465, // 105%
        rejectedIngredients: [],
        clinicalContextSummary: 'Goals: cardiovascular, cognitive. Lab flags: high LDL-P, low HDL-P.',
        ...overrides,
    };
}

describe('parseAndValidateExpansion', () => {
    it('parses valid AI JSON response and returns additions tagged ai-fill', () => {
        const raw = JSON.stringify({
            additions: [
                { ingredient: 'CoEnzyme Q10', amount: 200, unit: 'mg', purpose: 'mitochondrial support' },
                { ingredient: 'Magnesium', amount: 200, unit: 'mg', purpose: 'cardio' },
            ],
        });
        const result = parseAndValidateExpansion(raw, [], new Set());
        expect(result.additions).toHaveLength(2);
        expect(result.additions[0].source).toBe('ai-fill');
        expect(result.additions[0].ingredient).toBe('CoEnzyme Q10');
    });

    it('strips markdown fences', () => {
        const raw = '```json\n{"additions":[{"ingredient":"Magnesium","amount":200,"unit":"mg"}]}\n```';
        const result = parseAndValidateExpansion(raw, [], new Set());
        expect(result.additions).toHaveLength(1);
    });

    it('rejects ingredients on the user-rejected list (hard block)', () => {
        const raw = JSON.stringify({
            additions: [
                { ingredient: 'Garlic', amount: 150, unit: 'mg' },
                { ingredient: 'Resveratrol', amount: 150, unit: 'mg' },
                { ingredient: 'CoEnzyme Q10', amount: 200, unit: 'mg' },
            ],
        });
        const result = parseAndValidateExpansion(raw, ['Garlic', 'Resveratrol'], new Set());
        const names = result.additions.map(a => a.ingredient);
        expect(names).not.toContain('Garlic');
        expect(names).not.toContain('Resveratrol');
        expect(names).toContain('CoEnzyme Q10');
        expect(result.warnings.some(w => w.includes('Garlic'))).toBe(true);
    });

    it('rejects ingredients already in the current formula (no duplicates)', () => {
        const raw = JSON.stringify({
            additions: [
                { ingredient: 'Ashwagandha', amount: 300, unit: 'mg' },
                { ingredient: 'CoEnzyme Q10', amount: 200, unit: 'mg' },
            ],
        });
        const current = new Set(['ashwagandha']);
        const result = parseAndValidateExpansion(raw, [], current);
        const names = result.additions.map(a => a.ingredient);
        expect(names).not.toContain('Ashwagandha');
        expect(names).toContain('CoEnzyme Q10');
    });

    it('rejects ingredients not in the approved catalog', () => {
        const raw = JSON.stringify({
            additions: [
                { ingredient: 'Made Up Herb XYZ', amount: 500, unit: 'mg' },
                { ingredient: 'CoEnzyme Q10', amount: 200, unit: 'mg' },
            ],
        });
        const result = parseAndValidateExpansion(raw, [], new Set());
        const names = result.additions.map(a => a.ingredient);
        expect(names).not.toContain('Made Up Herb XYZ');
        expect(names).toContain('CoEnzyme Q10');
        expect(result.warnings.some(w => w.includes('Made Up Herb'))).toBe(true);
    });

    it('handles malformed entries gracefully (negative amount, missing name)', () => {
        const raw = JSON.stringify({
            additions: [
                { ingredient: 'CoEnzyme Q10', amount: -50, unit: 'mg' },
                { ingredient: '', amount: 200, unit: 'mg' },
                { ingredient: 'Magnesium', amount: 200, unit: 'mg' },
            ],
        });
        const result = parseAndValidateExpansion(raw, [], new Set());
        const names = result.additions.map(a => a.ingredient);
        expect(names).toEqual(['Magnesium']);
    });

    it('returns empty additions on completely invalid JSON', () => {
        const result = parseAndValidateExpansion('not json at all', [], new Set());
        expect(result.additions).toEqual([]);
        expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('returns empty additions when JSON has no `additions` key', () => {
        const result = parseAndValidateExpansion('{"foo": "bar"}', [], new Set());
        expect(result.additions).toEqual([]);
    });

    it('case-insensitive matching for catalog and rejected list', () => {
        const raw = JSON.stringify({
            additions: [
                { ingredient: 'magnesium', amount: 200, unit: 'mg' }, // lowercase
                { ingredient: 'GARLIC', amount: 150, unit: 'mg' },     // uppercase rejected
            ],
        });
        const result = parseAndValidateExpansion(raw, ['garlic'], new Set());
        expect(result.additions).toHaveLength(1);
        expect(result.additions[0].ingredient).toBe('Magnesium'); // canonical case from catalog
    });
});

describe('buildExpansionPrompt', () => {
    it('includes rejected ingredients in the prompt', () => {
        const ctx = makeCtx({ rejectedIngredients: ['Garlic', 'Resveratrol'] });
        const { user } = buildExpansionPrompt(ctx);
        expect(user).toContain('Garlic');
        expect(user).toContain('Resveratrol');
        expect(user).toContain('do NOT use');
    });

    it('excludes already-in-formula and rejected ingredients from candidate list', () => {
        const ctx = makeCtx({ rejectedIngredients: ['Garlic'] });
        const { user } = buildExpansionPrompt(ctx);
        // "Beta Max" is in current formula — should not appear in candidate list
        const candidatesSection = user.split('CANDIDATE')[1] || '';
        expect(candidatesSection).not.toMatch(/•\s*Beta Max/);
        // Garlic is rejected — should not appear in candidate list either
        expect(candidatesSection).not.toMatch(/•\s*Garlic/);
    });

    it('communicates the deficit and acceptable range clearly', () => {
        const ctx = makeCtx();
        const { user } = buildExpansionPrompt(ctx);
        expect(user).toContain('1780mg'); // current
        expect(user).toContain('3300mg'); // target
    });

    it('handles missing clinical context with a sensible fallback', () => {
        const ctx = makeCtx({ clinicalContextSummary: undefined });
        const { user } = buildExpansionPrompt(ctx);
        expect(user).toContain('CLINICAL CONTEXT');
    });
});

describe('expandFormulaWithAI', () => {
    it("happy path: AI returns valid additions, function reports success", async () => {
        const callAI: ExpanderAICaller = vi.fn(async () =>
            JSON.stringify({
                additions: [
                    { ingredient: 'CoEnzyme Q10', amount: 200, unit: 'mg', purpose: 'mitochondrial' },
                    { ingredient: 'Magnesium', amount: 200, unit: 'mg', purpose: 'cardio' },
                    { ingredient: 'Olive Leaf Extract', amount: 500, unit: 'mg', purpose: 'BP support' },
                    { ingredient: 'Beta-Glucan', amount: 250, unit: 'mg', purpose: 'immune' },
                ],
            })
        );

        const result = await expandFormulaWithAI(makeCtx(), callAI);
        expect(result.success).toBe(true);
        expect(result.additions.length).toBeGreaterThan(0);
        expect(result.additions.every(a => a.source === 'ai-fill')).toBe(true);
        expect(callAI).toHaveBeenCalledOnce();
    });

    it("David's case: rejected Garlic + Resveratrol — AI suggestions filtered", async () => {
        // Even if the AI ignores the directive and returns Garlic, we strip it
        const callAI: ExpanderAICaller = async () =>
            JSON.stringify({
                additions: [
                    { ingredient: 'Garlic', amount: 150, unit: 'mg' },
                    { ingredient: 'Resveratrol', amount: 150, unit: 'mg' },
                    { ingredient: 'CoEnzyme Q10', amount: 200, unit: 'mg' },
                    { ingredient: 'Magnesium', amount: 200, unit: 'mg' },
                ],
            });

        const ctx = makeCtx({ rejectedIngredients: ['Garlic', 'Resveratrol'] });
        const result = await expandFormulaWithAI(ctx, callAI);
        const names = result.additions.map(a => a.ingredient);
        expect(names).not.toContain('Garlic');
        expect(names).not.toContain('Resveratrol');
        expect(names).toContain('CoEnzyme Q10');
        expect(names).toContain('Magnesium');
    });

    it('returns success without an AI call when formula already meets minimum', async () => {
        const callAI = vi.fn(async () => '');
        const ctx = makeCtx({
            formula: { ...baseFormula, totalMg: 3200 },
        });
        const result = await expandFormulaWithAI(ctx, callAI);
        expect(result.success).toBe(true);
        expect(result.additions).toEqual([]);
        expect(callAI).not.toHaveBeenCalled();
    });

    it('returns failure when AI call throws — caller falls back to system autoExpand', async () => {
        const callAI: ExpanderAICaller = async () => {
            throw new Error('rate limit');
        };
        const result = await expandFormulaWithAI(makeCtx(), callAI);
        expect(result.success).toBe(false);
        expect(result.reason).toContain('rate limit');
        expect(result.additions).toEqual([]);
    });

    it('returns failure when AI returns no valid additions', async () => {
        const callAI: ExpanderAICaller = async () =>
            JSON.stringify({
                additions: [
                    { ingredient: 'Made Up Herb', amount: 100, unit: 'mg' },
                    { ingredient: '', amount: 200, unit: 'mg' },
                ],
            });
        const result = await expandFormulaWithAI(makeCtx(), callAI);
        expect(result.success).toBe(false);
        expect(result.reason).toContain('no valid additions');
    });

    it('returns failure when AI returns malformed JSON', async () => {
        const callAI: ExpanderAICaller = async () => 'I cannot help with that, here is some prose';
        const result = await expandFormulaWithAI(makeCtx(), callAI);
        expect(result.success).toBe(false);
    });
});

describe('buildClinicalContextSummary', () => {
    it('formats all sections', () => {
        const summary = buildClinicalContextSummary({
            goals: ['cardiovascular', 'cognitive'],
            conditions: ['hypertension'],
            medications: ['Lisinopril'],
            keyLabFlags: ['LDL-P high', 'HDL-P low'],
        });
        expect(summary).toContain('Goals: cardiovascular, cognitive');
        expect(summary).toContain('Conditions: hypertension');
        expect(summary).toContain('Medications: Lisinopril');
        expect(summary).toContain('Key lab flags: LDL-P high, HDL-P low');
    });

    it('returns a fallback string when nothing provided', () => {
        const summary = buildClinicalContextSummary({});
        expect(summary).toContain('no specific clinical flags');
    });

    it('skips empty arrays gracefully', () => {
        const summary = buildClinicalContextSummary({
            goals: ['fitness'],
            conditions: [],
            medications: [],
            keyLabFlags: [],
        });
        expect(summary).toBe('Goals: fitness');
    });
});
