/**
 * Test suite built around David Sica's actual feedback (April 27, 2026).
 *
 * David's text message:
 *   "...even though I keep telling it to remove items like Garlic and
 *    Resveratrol, when it says it will, it keeps adding them back."
 *
 *   "...recommendations and options are more complementary to adding new
 *    items than to significantly replacing items in my stack."
 *
 *   "One area I thought it might shine more is in putting together a more
 *    focused daily supplement like my AG1."
 *
 * His DB history showed 7 formula versions across <50 minutes. v7 STILL
 * contained Garlic 150mg + Resveratrol 150mg despite him asking the AI
 * to remove them.
 *
 * These tests verify the preference detector + prompt builder correctly:
 *   1. Catch every phrasing David might use to reject an ingredient.
 *   2. Persist the rejection list across turns.
 *   3. Detect "focused like AG1" requests.
 *   4. Inject the rejection list as a HARD BLOCK into the system prompt.
 *   5. Inject the replacement-vs-addition directive into every prompt.
 *   6. Inject the focused-stack directive when triggered.
 */

import { describe, expect, it } from 'vitest';
import {
  detectRejectedIngredients,
  detectFormulationModeChange,
} from '../modules/chat/preference-detector';
import { buildO1MiniPrompt, type PromptContext } from '../utils/prompt-builder';

describe("David Sica's feedback — rejected ingredient detection", () => {
  it('catches the exact phrasing from his iMessage: "remove items like Garlic and Resveratrol"', () => {
    const result = detectRejectedIngredients(
      'I keep telling it to remove items like Garlic and Resveratrol, when it says it will, it keeps adding them back.'
    );
    expect(result).toContain('Garlic');
    expect(result).toContain('Resveratrol');
  });

  it('catches "drop the garlic"', () => {
    const result = detectRejectedIngredients('Please drop the garlic from my formula.');
    expect(result).toContain('Garlic');
  });

  it('catches "no more ginkgo"', () => {
    const result = detectRejectedIngredients('No more Ginkgo Biloba Extract 24% please.');
    expect(result).toContain('Ginkgo Biloba Extract 24%');
  });

  it('catches "stop adding garlic and resveratrol"', () => {
    const result = detectRejectedIngredients('Stop adding garlic and resveratrol every time.');
    expect(result).toEqual(expect.arrayContaining(['Garlic', 'Resveratrol']));
  });

  it('catches "without garlic"', () => {
    const result = detectRejectedIngredients('Rebuild this without garlic.');
    expect(result).toContain('Garlic');
  });

  it('catches "take out the resveratrol"', () => {
    const result = detectRejectedIngredients('Take out the Resveratrol.');
    expect(result).toContain('Resveratrol');
  });

  it("catches \"don't include ashwagandha\"", () => {
    const result = detectRejectedIngredients("Please don't include Ashwagandha — I already take it.");
    expect(result).toContain('Ashwagandha');
  });

  it('catches "leave out InnoSlim"', () => {
    const result = detectRejectedIngredients('Leave out InnoSlim, I want a different metabolic option.');
    expect(result).toContain('InnoSlim');
  });

  it('catches "get rid of phosphatidylcholine"', () => {
    const result = detectRejectedIngredients('Get rid of Phosphatidylcholine for now.');
    expect(result).toContain('Phosphatidylcholine');
  });

  it('does NOT capture ingredients the user is ASKING for (no removal verb)', () => {
    const result = detectRejectedIngredients('I want more Garlic and Resveratrol in my stack.');
    expect(result).not.toContain('Garlic');
    expect(result).not.toContain('Resveratrol');
  });

  it('does NOT cross sentence boundaries — "Drop garlic. Add ashwagandha."', () => {
    const result = detectRejectedIngredients('Drop garlic. Add ashwagandha to the formula.');
    expect(result).toContain('Garlic');
    expect(result).not.toContain('Ashwagandha');
  });

  it('returns empty array for unrelated chat', () => {
    expect(detectRejectedIngredients('How does this affect my HRV?')).toEqual([]);
    expect(detectRejectedIngredients('Thanks!')).toEqual([]);
    expect(detectRejectedIngredients('')).toEqual([]);
  });

  it('handles multiple rejections in one message', () => {
    const result = detectRejectedIngredients(
      'Remove Garlic, drop Resveratrol, and please omit Ginkgo Biloba Extract 24%.'
    );
    expect(result).toEqual(expect.arrayContaining(['Garlic', 'Resveratrol', 'Ginkgo Biloba Extract 24%']));
  });

  it('does not match arbitrary words that happen to contain ingredient substrings', () => {
    // "iron" should NOT match "environment" or "ironic"
    const result = detectRejectedIngredients('I find this ironic — please remove the environment factor.');
    expect(result).not.toContain('Iron');
  });
});

// Regression tests for Pete's bug (April 29, 2026): user said
// "i dont want hawthorn berry or ginko, can you substitute something else
//  same with cinnamon" and the AI re-included Hawthorn 50mg + Cinnamon 30mg
// on the next regeneration because:
//   1. "dont want" wasn't in REMOVE_VERBS
//   2. "cinnamon" / "ginko" don't match catalog names
//      "Cinnamon 20:1" / "Ginkgo Biloba Extract 24%"
describe("Pete's bug — short-form names and apostrophe-less typing", () => {
  it('catches "i dont want" (no apostrophe) plus shortened ingredient names', () => {
    const result = detectRejectedIngredients(
      'i dont want hawthorn berry or ginko, can you substitute something else same with cinnamon'
    );
    expect(result).toContain('Hawthorn Berry');
    expect(result).toContain('Ginkgo Biloba Extract 24%');
    expect(result).toContain('Cinnamon 20:1');
  });

  it('catches "I don\'t want X" with proper apostrophe', () => {
    const result = detectRejectedIngredients("I don't want Cinnamon in my formula.");
    expect(result).toContain('Cinnamon 20:1');
  });

  it('catches "do not want X"', () => {
    const result = detectRejectedIngredients('I do not want Ginkgo or Hawthorn.');
    expect(result).toContain('Ginkgo Biloba Extract 24%');
    expect(result).toContain('Hawthorn Berry');
  });

  it('resolves "ginkgo" alias to canonical "Ginkgo Biloba Extract 24%"', () => {
    const result = detectRejectedIngredients('Please remove ginkgo from my stack.');
    expect(result).toContain('Ginkgo Biloba Extract 24%');
  });

  it('resolves "cinnamon" alias to canonical "Cinnamon 20:1"', () => {
    const result = detectRejectedIngredients('Drop the cinnamon.');
    expect(result).toContain('Cinnamon 20:1');
  });

  it('resolves "hawthorn" alias to canonical "Hawthorn Berry"', () => {
    const result = detectRejectedIngredients('Remove hawthorn please.');
    expect(result).toContain('Hawthorn Berry');
  });

  it('resolves common typo "ginko" to "Ginkgo Biloba Extract 24%"', () => {
    const result = detectRejectedIngredients('skip the ginko');
    expect(result).toContain('Ginkgo Biloba Extract 24%');
  });

  it('does NOT capture aliases when there is no removal verb', () => {
    const result = detectRejectedIngredients('Tell me about cinnamon and ginkgo benefits.');
    expect(result).not.toContain('Cinnamon 20:1');
    expect(result).not.toContain('Ginkgo Biloba Extract 24%');
  });
});

describe("David's feedback — focused stack mode detection", () => {
  it('detects "like AG1" from his actual message', () => {
    const result = detectFormulationModeChange(
      'One area I thought it might shine more is in putting together a more focused daily supplement like my AG1.'
    );
    expect(result).toBe('focused');
  });

  it('detects "simpler stack"', () => {
    expect(detectFormulationModeChange('Can you give me a simpler stack?')).toBe('focused');
  });

  it('detects "fewer ingredients"', () => {
    expect(detectFormulationModeChange('I want fewer ingredients overall.')).toBe('focused');
  });

  it('detects "essentials only"', () => {
    expect(detectFormulationModeChange('Just the essentials only please.')).toBe('focused');
  });

  it('detects "minimalist"', () => {
    expect(detectFormulationModeChange('Make it minimalist.')).toBe('focused');
  });

  it('detects switching back: "more comprehensive"', () => {
    expect(detectFormulationModeChange('Actually, give me a more comprehensive formula.')).toBe('comprehensive');
  });

  it('returns null for neutral chat', () => {
    expect(detectFormulationModeChange('What does ApoB measure?')).toBeNull();
    expect(detectFormulationModeChange('')).toBeNull();
  });
});

describe('Prompt builder — David scenario integration', () => {
  const baseContext: PromptContext = {
    healthProfile: {
      id: 'hp-1',
      userId: '2a3f5785-92a3-4665-b31a-2cca8681130c',
      age: 45,
      sex: 'male',
      conditions: [],
      medications: ['Mounjaro', 'Tadalafil'],
      allergies: [],
      healthGoals: ['cardiovascular health', 'HDL optimization'],
      currentSupplements: ['Vitamin D 5000IU', 'Fish Oil 1000mg', 'AG1'],
      updatedAt: new Date(),
    },
    recentMessages: [],
  };

  it('injects the HARD BLOCK section when ingredients are rejected', () => {
    const prompt = buildO1MiniPrompt({
      ...baseContext,
      rejectedIngredientNames: ['Garlic', 'Resveratrol'],
    });

    expect(prompt).toContain('USER-REJECTED INGREDIENTS');
    expect(prompt).toContain('HARD BLOCK');
    expect(prompt).toContain('Garlic');
    expect(prompt).toContain('Resveratrol');
    expect(prompt).toContain('Do NOT include any of the above ingredients');
    expect(prompt).toContain('even if clinically indicated');
  });

  it('omits the rejection block when no ingredients are rejected', () => {
    const prompt = buildO1MiniPrompt(baseContext);
    expect(prompt).not.toContain('USER-REJECTED INGREDIENTS');
  });

  it('always injects the replacement-vs-addition directive', () => {
    const prompt = buildO1MiniPrompt(baseContext);
    expect(prompt).toContain("REPLACE, DON'T ACCUMULATE");
    expect(prompt).toContain('consolidate and replace');
    expect(prompt).toContain('Could this REPLACE one of their existing items');
  });

  it('injects focused-stack directive when formulationMode is focused', () => {
    const prompt = buildO1MiniPrompt({
      ...baseContext,
      formulationMode: 'focused',
    });
    expect(prompt).toContain('FOCUSED STACK MODE');
    expect(prompt).toContain('3-4 hero ingredients');
    expect(prompt).toContain('Default to **6 capsules**');
  });

  it('omits focused-stack directive in default comprehensive mode', () => {
    const prompt = buildO1MiniPrompt({
      ...baseContext,
      formulationMode: 'comprehensive',
    });
    expect(prompt).not.toContain('FOCUSED STACK MODE');
  });

  it("end-to-end: David's full session state produces a prompt with all three directives", () => {
    // Simulates David's session after he's said:
    //   - "remove Garlic and Resveratrol"
    //   - "make it more focused like AG1"
    const prompt = buildO1MiniPrompt({
      ...baseContext,
      rejectedIngredientNames: ['Garlic', 'Resveratrol'],
      formulationMode: 'focused',
    });

    // 1. Rejection HARD BLOCK present
    expect(prompt).toContain('USER-REJECTED INGREDIENTS');
    expect(prompt).toMatch(/•\s+Garlic/);
    expect(prompt).toMatch(/•\s+Resveratrol/);

    // 2. Replacement bias present
    expect(prompt).toContain("REPLACE, DON'T ACCUMULATE");

    // 3. Focused mode present
    expect(prompt).toContain('FOCUSED STACK MODE');

    // 4. Existing supplement context preserved (Vitamin D, Fish Oil, AG1)
    expect(prompt).toContain('Vitamin D 5000IU');
    expect(prompt).toContain('AG1');

    // 5. Original safety/integrity rails still in place
    expect(prompt).toContain('SYSTEM INTEGRITY');
    expect(prompt).toContain('NEVER HALLUCINATE');
  });
});

describe('Cumulative rejection across turns (regression test for David)', () => {
  /**
   * Simulates the merge logic that lives in chat.controller.ts:
   *   mergedRejected = unique([...existingRejected, ...newlyRejected])
   *
   * Verifies that rejections accumulate across turns instead of being
   * overwritten — which was the underlying bug that let Garlic/Resveratrol
   * sneak back into v7.
   */
  it("accumulates rejections from each user turn — David's actual sequence", () => {
    let rejected = new Set<string>();

    // Turn 1: David asks to remove Garlic
    const t1 = detectRejectedIngredients('Remove the garlic, please.');
    t1.forEach(n => rejected.add(n));
    expect([...rejected]).toEqual(['Garlic']);

    // Turn 2: AI re-adds garlic AND resveratrol; David rejects both
    const t2 = detectRejectedIngredients('You added Garlic back. Drop garlic and resveratrol for good.');
    t2.forEach(n => rejected.add(n));
    expect([...rejected].sort()).toEqual(['Garlic', 'Resveratrol']);

    // Turn 3: David adds another rejection
    const t3 = detectRejectedIngredients('Also take out the Ginkgo Biloba Extract 24%.');
    t3.forEach(n => rejected.add(n));
    expect([...rejected].sort()).toEqual(['Garlic', 'Ginkgo Biloba Extract 24%', 'Resveratrol']);

    // Turn 4: David asks an unrelated question — no new rejections,
    // but the existing list MUST persist
    const t4 = detectRejectedIngredients('What does ApoB measure exactly?');
    t4.forEach(n => rejected.add(n));
    expect([...rejected].sort()).toEqual(['Garlic', 'Ginkgo Biloba Extract 24%', 'Resveratrol']);
  });
});
