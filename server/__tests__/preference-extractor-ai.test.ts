/**
 * Tests for the AI-based preference extractor.
 *
 * The extractor is the semantic fallback to the regex detector. These
 * tests cover:
 *   1. Heuristic gate (shouldRunAIExtractor) — when should we burn an AI call?
 *   2. Response parsing — strict catalog validation, JSON extraction.
 *   3. End-to-end behavior with a mocked AI caller.
 */

import { describe, expect, it, vi } from 'vitest';
import {
  extractRejectionsWithAI,
  shouldRunAIExtractor,
  type ExtractorAICaller,
} from '../modules/chat/preference-extractor-ai';

describe('shouldRunAIExtractor — heuristic gate', () => {
  it('returns false when regex already found rejections (trust the regex)', () => {
    expect(shouldRunAIExtractor('remove cinnamon', 1)).toBe(false);
    expect(shouldRunAIExtractor('remove cinnamon and ginkgo', 2)).toBe(false);
  });

  it('returns false on empty / tiny / whitespace input', () => {
    expect(shouldRunAIExtractor('', 0)).toBe(false);
    expect(shouldRunAIExtractor('   ', 0)).toBe(false);
    expect(shouldRunAIExtractor('hi', 0)).toBe(false);
  });

  it('returns false on neutral chat with no removal signal', () => {
    expect(shouldRunAIExtractor('what does ashwagandha do?', 0)).toBe(false);
    expect(shouldRunAIExtractor('thanks!', 0)).toBe(false);
    expect(shouldRunAIExtractor('how does this affect my HRV?', 0)).toBe(false);
  });

  it('returns true on Pete\u2019s exact phrasing the regex missed', () => {
    expect(shouldRunAIExtractor(
      'i dont want hawthorn berry or ginko, can you substitute something else same with cinnamon',
      0,
    )).toBe(true);
  });

  it('returns true on natural-language removal phrasings', () => {
    expect(shouldRunAIExtractor("the cinnamon doesn't really fit my goals", 0)).toBe(true);
    expect(shouldRunAIExtractor('lose the ginger please', 0)).toBe(true);
    expect(shouldRunAIExtractor('swap out resveratrol for something else', 0)).toBe(true);
    expect(shouldRunAIExtractor('without garlic this time', 0)).toBe(true);
    expect(shouldRunAIExtractor("i don't need the magnesium anymore", 0)).toBe(true);
  });

  it('returns false when message contains positive add-signal (ambiguous \u2014 skip)', () => {
    // "no" plus "add" \u2014 ambiguous, don't risk false positive
    expect(shouldRunAIExtractor('add more magnesium, no garlic', 0)).toBe(false);
    expect(shouldRunAIExtractor('include ashwagandha and increase the dose', 0)).toBe(false);
  });
});

describe('extractRejectionsWithAI', () => {
  const makeCaller = (response: string): ExtractorAICaller =>
    vi.fn(async () => response);

  it('returns empty + ranAI:false when gate skipped (no AI call)', async () => {
    const caller = makeCaller('{"rejected":["Garlic"]}');
    const result = await extractRejectionsWithAI(
      { message: 'thanks!', regexFoundCount: 0 },
      caller,
    );
    expect(result.ranAI).toBe(false);
    expect(result.rejected).toEqual([]);
    expect(caller).not.toHaveBeenCalled();
  });

  it("does NOT run when regex already caught rejections", async () => {
    const caller = makeCaller('{"rejected":["Garlic","Ginkgo Biloba Extract 24%"]}');
    const result = await extractRejectionsWithAI(
      { message: 'remove garlic', regexFoundCount: 1 },
      caller,
    );
    expect(result.ranAI).toBe(false);
    expect(caller).not.toHaveBeenCalled();
  });

  it('parses a clean JSON response and returns canonical names', async () => {
    const caller = makeCaller(
      '{"rejected":["Hawthorn Berry","Ginkgo Biloba Extract 24%","Cinnamon 20:1"]}',
    );
    const result = await extractRejectionsWithAI(
      {
        message: 'i dont want hawthorn berry or ginko, same with cinnamon',
        regexFoundCount: 0,
      },
      caller,
    );
    expect(result.ranAI).toBe(true);
    expect(result.rejected).toEqual(
      expect.arrayContaining(['Hawthorn Berry', 'Ginkgo Biloba Extract 24%', 'Cinnamon 20:1']),
    );
  });

  it('strips ```json fences from response', async () => {
    const caller = makeCaller('```json\n{"rejected":["Garlic"]}\n```');
    const result = await extractRejectionsWithAI(
      { message: "the garlic doesn't fit", regexFoundCount: 0 },
      caller,
    );
    expect(result.rejected).toEqual(['Garlic']);
  });

  it('extracts JSON from response with surrounding prose', async () => {
    const caller = makeCaller(
      'Sure, here is the result: {"rejected":["Resveratrol"]} \u2014 hope that helps.',
    );
    const result = await extractRejectionsWithAI(
      { message: 'lose the resveratrol', regexFoundCount: 0 },
      caller,
    );
    expect(result.rejected).toEqual(['Resveratrol']);
  });

  it('drops names that are NOT in the catalog (no fabricated blacklist)', async () => {
    const caller = makeCaller(
      '{"rejected":["Garlic","Made Up Compound","Phantom Extract"]}',
    );
    const result = await extractRejectionsWithAI(
      { message: 'remove the bad stuff', regexFoundCount: 0 },
      caller,
    );
    expect(result.rejected).toEqual(['Garlic']);
  });

  it('returns empty on malformed JSON \u2014 never throws', async () => {
    const caller = makeCaller('I cannot help with that');
    const result = await extractRejectionsWithAI(
      { message: 'lose the garlic', regexFoundCount: 0 },
      caller,
    );
    expect(result.ranAI).toBe(true);
    expect(result.rejected).toEqual([]);
  });

  it('returns empty on missing "rejected" field', async () => {
    const caller = makeCaller('{"other":["Garlic"]}');
    const result = await extractRejectionsWithAI(
      { message: 'lose the garlic', regexFoundCount: 0 },
      caller,
    );
    expect(result.rejected).toEqual([]);
  });

  it('returns empty + reason when AI call throws \u2014 never propagates', async () => {
    const caller: ExtractorAICaller = vi.fn(async () => {
      throw new Error('rate limit');
    });
    const result = await extractRejectionsWithAI(
      { message: 'lose the garlic', regexFoundCount: 0 },
      caller,
    );
    expect(result.ranAI).toBe(true);
    expect(result.rejected).toEqual([]);
    expect(result.reason).toContain('rate limit');
  });

  it('deduplicates repeated names from AI response', async () => {
    const caller = makeCaller(
      '{"rejected":["Garlic","Garlic","garlic"]}',
    );
    const result = await extractRejectionsWithAI(
      { message: 'lose garlic', regexFoundCount: 0 },
      caller,
    );
    expect(result.rejected).toEqual(['Garlic']);
  });

  it('matches AI output case-insensitively against catalog', async () => {
    const caller = makeCaller(
      '{"rejected":["GARLIC","ginkgo biloba extract 24%"]}',
    );
    const result = await extractRejectionsWithAI(
      { message: 'lose garlic and ginkgo', regexFoundCount: 0 },
      caller,
    );
    expect(result.rejected).toEqual(
      expect.arrayContaining(['Garlic', 'Ginkgo Biloba Extract 24%']),
    );
  });
});
