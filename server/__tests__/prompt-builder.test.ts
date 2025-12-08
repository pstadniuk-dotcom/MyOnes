/**
 * Prompt Builder Tests
 * Tests the AI prompt construction for supplement consultations
 */

import { describe, it, expect } from 'vitest';
import { 
  buildGPT4Prompt, 
  buildO1MiniPrompt, 
  type PromptContext,
  type HealthProfile,
  type Formula 
} from '../prompt-builder';

// Create a minimal valid context for testing (matching actual interface)
const createTestContext = (overrides: Partial<PromptContext> = {}): PromptContext => ({
  ...overrides,
});

// Create a test health profile
const createTestHealthProfile = (overrides: Partial<HealthProfile> = {}): HealthProfile => ({
  id: 'test-profile-id',
  userId: 'test-user-id',
  updatedAt: new Date(),
  ...overrides,
});

// Create a test formula
const createTestFormula = (overrides: Partial<Formula> = {}): Formula => ({
  id: 'test-formula-id',
  userId: 'test-user-id',
  bases: [],
  totalMg: 0,
  createdAt: new Date(),
  ...overrides,
});

describe('buildGPT4Prompt', () => {
  it('should return a static system prompt', () => {
    const context = createTestContext();
    const prompt = buildGPT4Prompt(context);
    
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(100);
  });

  it('should mention ONES AI role', () => {
    const context = createTestContext();
    const prompt = buildGPT4Prompt(context);
    
    expect(prompt).toContain('ONES AI');
  });

  it('should include guidance to be concise', () => {
    const context = createTestContext();
    const prompt = buildGPT4Prompt(context);
    
    // GPT4 prompt should encourage brief responses
    expect(prompt.toLowerCase()).toMatch(/brief|concise|short|paragraphs/);
  });

  it('should mention not creating formulas in simple mode', () => {
    const context = createTestContext();
    const prompt = buildGPT4Prompt(context);
    
    expect(prompt.toLowerCase()).toContain('never create');
  });

  it('should be consistent across calls', () => {
    const context1 = createTestContext();
    const context2 = createTestContext({ healthProfile: createTestHealthProfile() });
    
    // GPT4 prompt is static, should be same regardless of context
    const prompt1 = buildGPT4Prompt(context1);
    const prompt2 = buildGPT4Prompt(context2);
    
    expect(prompt1).toBe(prompt2);
  });
});

describe('buildO1MiniPrompt', () => {
  it('should include formula creation instructions', () => {
    const context = createTestContext();
    const prompt = buildO1MiniPrompt(context);
    
    // O1 prompt should mention formula structure
    expect(prompt.toLowerCase()).toContain('formula');
  });

  it('should include JSON format instructions', () => {
    const context = createTestContext();
    const prompt = buildO1MiniPrompt(context);
    
    // Should mention JSON block format
    expect(prompt).toContain('json');
  });

  it('should include dosage limits', () => {
    const context = createTestContext();
    const prompt = buildO1MiniPrompt(context);
    
    // Should mention the 5500mg limit
    expect(prompt).toContain('5500');
  });

  it('should include ingredient catalog reference', () => {
    const context = createTestContext();
    const prompt = buildO1MiniPrompt(context);
    
    // Should reference approved ingredients
    expect(prompt.toLowerCase()).toContain('ingredient');
  });

  it('should include medical professional language', () => {
    const context = createTestContext();
    const prompt = buildO1MiniPrompt(context);
    
    // Should include medical context
    expect(prompt.toLowerCase()).toMatch(/medical|doctor|physician|medicine/);
  });

  it('should include system supports list', () => {
    const context = createTestContext();
    const prompt = buildO1MiniPrompt(context);
    
    // Should have some system support ingredients
    expect(prompt).toContain('Adrenal Support');
    expect(prompt).toContain('Heart Support');
  });

  it('should include individual ingredients list', () => {
    const context = createTestContext();
    const prompt = buildO1MiniPrompt(context);
    
    // Should have individual ingredients
    expect(prompt).toContain('Ashwagandha');
    expect(prompt).toContain('CoQ10');
  });
});

describe('Prompt Context with Health Profile', () => {
  it('should include health profile data when provided', () => {
    const context = createTestContext({
      healthProfile: createTestHealthProfile({
        age: 45,
        sex: 'female',
        weightLbs: 150,
        heightCm: 165,
        medications: ['Synthroid', 'Metformin'],
        conditions: ['Hypothyroidism', 'Type 2 Diabetes'],
        allergies: ['Shellfish'],
      }),
    });
    
    const prompt = buildO1MiniPrompt(context);
    
    // Should include health profile data
    expect(prompt).toContain('45');
    expect(prompt).toContain('female');
    expect(prompt).toContain('Synthroid');
    expect(prompt).toContain('Metformin');
    expect(prompt).toContain('Shellfish');
  });

  it('should handle null health profile', () => {
    const context = createTestContext({ healthProfile: undefined });
    
    expect(() => buildO1MiniPrompt(context)).not.toThrow();
    
    const prompt = buildO1MiniPrompt(context);
    expect(prompt).toContain('NO HEALTH PROFILE');
  });

  it('should include gender-specific guidance for females', () => {
    const context = createTestContext({
      healthProfile: createTestHealthProfile({
        sex: 'female',
        age: 50,
      }),
    });
    
    const prompt = buildO1MiniPrompt(context);
    
    // Should mention female-specific considerations
    expect(prompt).toContain('Ovary Uterus Support');
    expect(prompt).toContain('DO NOT recommend Prostate Support');
  });

  it('should include gender-specific guidance for males', () => {
    const context = createTestContext({
      healthProfile: createTestHealthProfile({
        sex: 'male',
        age: 50,
      }),
    });
    
    const prompt = buildO1MiniPrompt(context);
    
    // Should mention male-specific considerations
    expect(prompt).toContain('Prostate Support');
    expect(prompt).toContain('DO NOT recommend Ovary Uterus Support');
  });

  it('should include high stress guidance', () => {
    const context = createTestContext({
      healthProfile: createTestHealthProfile({
        stressLevel: 9,
      }),
    });
    
    const prompt = buildO1MiniPrompt(context);
    
    // Should flag high stress
    expect(prompt).toContain('HIGH STRESS');
    expect(prompt).toContain('Ashwagandha');
  });

  it('should include sleep deficiency guidance', () => {
    const context = createTestContext({
      healthProfile: createTestHealthProfile({
        sleepHoursPerNight: 4,
      }),
    });
    
    const prompt = buildO1MiniPrompt(context);
    
    // Should flag sleep deficiency
    expect(prompt).toContain('SLEEP DEFICIENCY');
  });
});

describe('Prompt Context with Active Formula', () => {
  it('should include current formula when provided', () => {
    const context = createTestContext({
      activeFormula: createTestFormula({
        version: 2,
        totalMg: 2500,
        bases: [{ ingredient: 'Adrenal Support', amount: 420, unit: 'mg' }],
        additions: [{ ingredient: 'Ashwagandha', amount: 600, unit: 'mg' }],
      }),
    });
    
    const prompt = buildO1MiniPrompt(context);
    
    expect(prompt).toContain('Adrenal Support');
    expect(prompt).toContain('420');
    expect(prompt).toContain('Ashwagandha');
    expect(prompt).toContain('600');
    expect(prompt).toContain('2500');
  });

  it('should explain formula replacement behavior', () => {
    const context = createTestContext({
      activeFormula: createTestFormula({
        totalMg: 3000,
      }),
    });
    
    const prompt = buildO1MiniPrompt(context);
    
    // Should explain that new formulas replace old ones
    expect(prompt).toContain('REPLACE');
    expect(prompt).toContain('starting from 0mg');
  });

  it('should handle empty formula bases and additions', () => {
    const context = createTestContext({
      activeFormula: createTestFormula({
        bases: [],
        additions: [],
      }),
    });
    
    expect(() => buildO1MiniPrompt(context)).not.toThrow();
  });
});

describe('Prompt Context with Lab Data', () => {
  it('should include lab data when provided', () => {
    // Lab data must be > 100 characters to be included
    const context = createTestContext({
      labDataContext: `Complete Blood Panel Results - Patient lab work from 2025-01-15:
Vitamin D, 25-Hydroxy: 25 ng/mL (Ref: 30-100 ng/mL) - LOW
TSH: 2.5 mIU/L (Ref: 0.4-4.0 mIU/L) - Normal
Free T4: 1.1 ng/dL (Ref: 0.8-1.8 ng/dL) - Normal
Ferritin: 15 ng/mL (Ref: 30-400 ng/mL) - LOW
Hemoglobin A1c: 5.4% (Ref: <5.7%) - Normal
Total Cholesterol: 185 mg/dL (Ref: <200 mg/dL) - Normal`,
    });
    
    const prompt = buildO1MiniPrompt(context);
    
    expect(prompt).toContain('LABORATORY TEST RESULTS');
    expect(prompt).toContain('Vitamin D');
    expect(prompt).toContain('TSH');
    expect(prompt).toContain('Ferritin');
  });

  it('should not include lab section if data too short', () => {
    const context = createTestContext({
      labDataContext: 'No labs',
    });
    
    const prompt = buildO1MiniPrompt(context);
    
    // Short lab data should be ignored
    expect(prompt).not.toContain('LABORATORY TEST RESULTS');
  });
});

describe('Prompt Context with Conversation History', () => {
  it('should detect new user (few messages)', () => {
    const context = createTestContext({
      recentMessages: [
        { role: 'user', content: 'Hello' },
      ],
    });
    
    const prompt = buildO1MiniPrompt(context);
    
    // Should indicate new user workflow
    expect(prompt).toContain('new user');
  });

  it('should detect advanced user (formula history)', () => {
    const context = createTestContext({
      activeFormula: createTestFormula({ version: 5 }),
      recentMessages: [
        { role: 'user', content: 'Can we optimize my formula?' },
      ],
    });
    
    const prompt = buildO1MiniPrompt(context);
    
    // Should indicate experienced user
    expect(prompt.toLowerCase()).toContain('experienced');
  });
});

describe('Safety Instructions', () => {
  it('should include organ-specific questions', () => {
    const context = createTestContext();
    const prompt = buildO1MiniPrompt(context);
    
    // Should have organ-specific guidance
    expect(prompt).toContain('Prostate Support');
    expect(prompt).toContain('Kidney & Bladder Support');
    expect(prompt).toContain('Liver Support');
    expect(prompt).toContain('Thyroid Support');
  });

  it('should include critical safety questions', () => {
    const context = createTestContext();
    const prompt = buildO1MiniPrompt(context);
    
    // Should mention critical safety topics
    expect(prompt.toLowerCase()).toContain('medication');
    expect(prompt.toLowerCase()).toContain('pregnant');
    expect(prompt.toLowerCase()).toContain('condition');
  });

  it('should include dosing strategy guidance', () => {
    const context = createTestContext();
    const prompt = buildO1MiniPrompt(context);
    
    // Should explain 1x, 2x, 3x dosing
    expect(prompt).toContain('1x');
    expect(prompt).toContain('2x');
    expect(prompt).toContain('3x');
  });
});

describe('Formula JSON Structure', () => {
  it('should expect correct formula format', () => {
    const context = createTestContext();
    const prompt = buildO1MiniPrompt(context);
    
    // Prompt should reference the expected JSON structure
    expect(prompt).toContain('"bases"');
    expect(prompt).toContain('"additions"');
    expect(prompt).toContain('"rationale"');
    expect(prompt).toContain('"warnings"');
    expect(prompt).toContain('"disclaimers"');
  });

  it('should mention NOT to include totalMg', () => {
    const context = createTestContext();
    const prompt = buildO1MiniPrompt(context);
    
    // AI should not calculate totalMg
    expect(prompt).toContain('Do NOT include "totalMg"');
  });
});

describe('Health Data Capture', () => {
  it('should include health-data block instructions', () => {
    const context = createTestContext();
    const prompt = buildO1MiniPrompt(context);
    
    // Should explain how to capture health data
    expect(prompt).toContain('health-data');
    expect(prompt).toContain('age');
    expect(prompt).toContain('sex');
    expect(prompt).toContain('medications');
  });

  it('should explain height conversion', () => {
    const context = createTestContext();
    const prompt = buildO1MiniPrompt(context);
    
    // Should mention height conversion
    expect(prompt).toContain('heightCm');
    expect(prompt).toMatch(/6'6"|6'10"|5'10"/);
  });
});
