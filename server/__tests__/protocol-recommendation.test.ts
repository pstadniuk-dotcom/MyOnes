import { describe, expect, it } from 'vitest';
import { recommendDailyProtocolCapsules } from '../modules/chat/protocol-recommendation';

describe('recommendDailyProtocolCapsules', () => {
  it('recommends 9 for cardiometabolic moderate/high burden pattern', () => {
    const labContext = `
      ApoB: 147 status: high
      LDL-P: 1776 status: high
      Triglycerides: 180 status: high
      HDL: 38 status: low
      Pattern B status: high
      OmegaCheck: 2.6 status: low
      Homocysteine: 16 status: high
    `;

    const decision = recommendDailyProtocolCapsules(labContext, {
      conditions: ['hyperlipidemia'],
      medications: ['sertraline'],
    });

    expect(decision.recommendedCapsules).toBe(9);
    expect(decision.metrics.cardiometabolicHighRisk).toBe(true);
  });

  it('recommends 6 for low-complexity baseline context', () => {
    const labContext = `
      Vitamin D: 42 status: normal
      Ferritin: 88 status: normal
      Glucose: 92 status: normal
    `;

    const decision = recommendDailyProtocolCapsules(labContext, {
      conditions: [],
      medications: [],
    });

    expect(decision.recommendedCapsules).toBe(6);
  });

  it('recommends 12 only when severe multi-system gate is met', () => {
    const labContext = `
      hs-CRP status: critical
      Troponin status: critical
      BNP status: critical
      eGFR status: low
      ALT status: high
      Creatinine status: high
      ApoB status: high
      LDL-P status: high
      HbA1c status: high
    `;

    const decision = recommendDailyProtocolCapsules(labContext, {
      conditions: ['hypertension', 'diabetes'],
      medications: ['warfarin', 'metformin'],
    });

    expect(decision.recommendedCapsules).toBe(12);
    expect(decision.metrics.criticalCount).toBeGreaterThanOrEqual(3);
  });
});
