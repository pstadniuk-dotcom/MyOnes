/**
 * Tests for the AI health-data array merge logic.
 *
 * BACKGROUND
 * Pete identified that the AI chat was overwriting safety arrays
 * (currentSupplements, medications, allergies, conditions) with whatever
 * smaller list the model emitted in its `health-data` block. Real bug:
 * user says "I also started Creatine", model emits {currentSupplements:
 * ["Creatine"]}, profile loses Vitamin D / Fish Oil / Magnesium silently.
 *
 * Fix: treat AI output as additive delta, never let it shrink the list.
 * To remove an entry the user must use the UI.
 */

import { describe, it, expect } from 'vitest';
import { mergeHealthArray, normalizeHealthEntry } from '../modules/users/health-data-merge';

describe('normalizeHealthEntry', () => {
    it('lowercases', () => {
        expect(normalizeHealthEntry('Vitamin D')).toBe('vitamin d');
    });

    it('trims surrounding whitespace', () => {
        expect(normalizeHealthEntry('   Fish Oil   ')).toBe('fish oil');
    });

    it('collapses internal whitespace runs', () => {
        expect(normalizeHealthEntry('Vitamin   D    5000IU')).toBe('vitamin d 5000iu');
    });

    it('strips surrounding quotes', () => {
        expect(normalizeHealthEntry('"Magnesium"')).toBe('magnesium');
        expect(normalizeHealthEntry("'Magnesium'")).toBe('magnesium');
    });
});

describe('mergeHealthArray — silent-loss prevention (the David / Pete bug)', () => {
    it('preserves existing entries when AI sends a smaller list', () => {
        const existing = ['Vitamin D 5000IU', 'Fish Oil 1000mg', 'Magnesium 400mg'];
        const incoming = ['Creatine 5g'];
        expect(mergeHealthArray(existing, incoming)).toEqual([
            'Vitamin D 5000IU',
            'Fish Oil 1000mg',
            'Magnesium 400mg',
            'Creatine 5g',
        ]);
    });

    it('preserves all existing when AI echoes back only the same list', () => {
        const existing = ['Vitamin D', 'Fish Oil'];
        const incoming = ['Vitamin D', 'Fish Oil'];
        expect(mergeHealthArray(existing, incoming)).toEqual(['Vitamin D', 'Fish Oil']);
    });

    it('preserves existing when AI sends an empty list', () => {
        // Note: chat.controller already deletes empty-array updates BEFORE
        // calling mergeHealthArray for safety fields. This test covers the
        // non-safety field (healthGoals) path and defense-in-depth.
        const existing = ['Vitamin D'];
        expect(mergeHealthArray(existing, [])).toEqual(['Vitamin D']);
    });
});

describe('mergeHealthArray — case / whitespace deduplication', () => {
    it('dedupes case-insensitively, keeping the existing casing', () => {
        const existing = ['Vitamin D 5000IU'];
        const incoming = ['vitamin d 5000iu', 'Fish Oil'];
        expect(mergeHealthArray(existing, incoming)).toEqual([
            'Vitamin D 5000IU', // existing casing preserved
            'Fish Oil',
        ]);
    });

    it('dedupes when AI re-sends the same item with extra whitespace', () => {
        const existing = ['Magnesium 400mg'];
        const incoming = ['  magnesium    400mg  '];
        expect(mergeHealthArray(existing, incoming)).toEqual(['Magnesium 400mg']);
    });

    it('dedupes within the incoming list itself', () => {
        const existing: string[] = [];
        const incoming = ['Ashwagandha', 'ASHWAGANDHA', 'ashwagandha'];
        expect(mergeHealthArray(existing, incoming)).toEqual(['Ashwagandha']);
    });
});

describe('mergeHealthArray — input validation', () => {
    it('handles non-array existing values (undefined / null / object)', () => {
        expect(mergeHealthArray(undefined, ['Fish Oil'])).toEqual(['Fish Oil']);
        expect(mergeHealthArray(null, ['Fish Oil'])).toEqual(['Fish Oil']);
        expect(mergeHealthArray({} as any, ['Fish Oil'])).toEqual(['Fish Oil']);
    });

    it('handles non-array incoming values', () => {
        expect(mergeHealthArray(['Vitamin D'], undefined)).toEqual(['Vitamin D']);
        expect(mergeHealthArray(['Vitamin D'], 'not an array' as any)).toEqual(['Vitamin D']);
    });

    it('filters out non-string entries silently', () => {
        const existing = ['Vitamin D', 123, null, undefined, { name: 'foo' }] as any[];
        const incoming = ['Fish Oil', false, 0] as any[];
        expect(mergeHealthArray(existing, incoming)).toEqual(['Vitamin D', 'Fish Oil']);
    });

    it('filters out empty / whitespace-only strings', () => {
        const existing = ['Vitamin D', '', '   '];
        const incoming = ['', 'Fish Oil', '\t\n'];
        expect(mergeHealthArray(existing, incoming)).toEqual(['Vitamin D', 'Fish Oil']);
    });

    it('returns an empty array when both inputs are empty / invalid', () => {
        expect(mergeHealthArray(null, null)).toEqual([]);
        expect(mergeHealthArray([], [])).toEqual([]);
    });
});

describe('mergeHealthArray — capping', () => {
    it('caps the result at the default maxItems (50)', () => {
        const existing = Array.from({ length: 30 }, (_, i) => `Existing ${i}`);
        const incoming = Array.from({ length: 30 }, (_, i) => `New ${i}`);
        const out = mergeHealthArray(existing, incoming);
        expect(out).toHaveLength(50);
        // Existing entries take priority — all 30 should be present
        expect(out.slice(0, 30)).toEqual(existing);
        // 20 of the new ones survive
        expect(out.slice(30)).toEqual(incoming.slice(0, 20));
    });

    it('respects a custom maxItems', () => {
        const existing = ['a', 'b', 'c'];
        const incoming = ['d', 'e'];
        expect(mergeHealthArray(existing, incoming, 4)).toEqual(['a', 'b', 'c', 'd']);
    });

    it('does not exceed cap even if existing alone is larger', () => {
        const existing = ['a', 'b', 'c', 'd', 'e'];
        expect(mergeHealthArray(existing, [], 3)).toEqual(['a', 'b', 'c']);
    });
});

describe('mergeHealthArray — real-world scenarios', () => {
    it("user adds 'and creatine' mid-conversation", () => {
        // User profile had 3 supplements; user says "oh, also started creatine 5g daily"
        // AI emits the typical `currentSupplements: ["Creatine 5g"]`. Without merge, the
        // other 3 disappear silently.
        const existing = ['Vitamin D 5000IU', 'Fish Oil 1000mg', 'Magnesium 400mg'];
        const incoming = ['Creatine 5g'];
        expect(mergeHealthArray(existing, incoming)).toContain('Vitamin D 5000IU');
        expect(mergeHealthArray(existing, incoming)).toContain('Creatine 5g');
        expect(mergeHealthArray(existing, incoming)).toHaveLength(4);
    });

    it('user mentions a medication AI already knows about (no duplicate)', () => {
        const existing = ['Sertraline 25mg'];
        // AI hears them re-mention it, emits with slightly different formatting
        const incoming = ['sertraline 25mg'];
        expect(mergeHealthArray(existing, incoming)).toEqual(['Sertraline 25mg']);
    });

    it('multiple goals across a conversation accumulate', () => {
        // Turn 1 saved ['gut health', 'better sleep']
        // Turn 3 the user says "and also energy" -> AI emits ['energy']
        const existing = ['gut health', 'better sleep'];
        const incoming = ['energy'];
        expect(mergeHealthArray(existing, incoming)).toEqual([
            'gut health',
            'better sleep',
            'energy',
        ]);
    });
});
