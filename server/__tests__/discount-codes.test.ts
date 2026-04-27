/**
 * Discount Code Math Tests
 * Covers the pure computeDiscount logic used by previewForCheckout / reserveForCheckout.
 */

import { describe, it, expect } from 'vitest';
import './test-utils';
import { computeDiscount } from '../modules/discount-codes/discount-codes.service';
import type { DiscountCode } from '@shared/schema';

const baseCode = (overrides: Partial<DiscountCode> = {}): DiscountCode => ({
  id: 'test-id',
  code: 'TEST',
  description: null,
  type: 'percent',
  value: 20,
  maxUses: null,
  usedCount: 0,
  maxUsesPerUser: 1,
  minOrderCents: 0,
  firstOrderOnly: false,
  stackableWithMember: false,
  expiresAt: null,
  isActive: true,
  createdBy: 'admin',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('computeDiscount — discount math', () => {
  describe('percent codes', () => {
    it('applies percent discount when not a member', () => {
      const result = computeDiscount(baseCode({ type: 'percent', value: 20 }), 10000, false);
      expect(result.discountCents).toBe(2000);
      expect(result.dropMemberDiscount).toBe(false);
      expect(result.freeShipping).toBe(false);
    });

    it('exclusive: drops member discount when code beats 15%', () => {
      // 25% off > 15% member discount, so code should win
      const result = computeDiscount(
        baseCode({ type: 'percent', value: 25, stackableWithMember: false }),
        10000,
        true,
      );
      expect(result.discountCents).toBe(2500); // 25% of full $100
      expect(result.dropMemberDiscount).toBe(true);
    });

    it('exclusive: keeps member discount when code is smaller', () => {
      // 10% off < 15% member discount, so member should win
      const result = computeDiscount(
        baseCode({ type: 'percent', value: 10, stackableWithMember: false }),
        10000,
        true,
      );
      expect(result.discountCents).toBe(0);
      expect(result.dropMemberDiscount).toBe(false);
    });

    it('stackable: applies on top of member discount', () => {
      // Member discount first: 10000 - 1500 = 8500. Then 20% of 8500 = 1700.
      const result = computeDiscount(
        baseCode({ type: 'percent', value: 20, stackableWithMember: true }),
        10000,
        true,
      );
      expect(result.discountCents).toBe(1700);
      expect(result.dropMemberDiscount).toBe(false);
    });
  });

  describe('fixed-cents codes', () => {
    it('applies flat dollar amount when not a member', () => {
      const result = computeDiscount(baseCode({ type: 'fixed_cents', value: 500 }), 10000, false);
      expect(result.discountCents).toBe(500);
    });

    it('caps the discount at the formula amount so total never goes negative', () => {
      const result = computeDiscount(baseCode({ type: 'fixed_cents', value: 50000 }), 8000, false);
      expect(result.discountCents).toBe(8000);
    });

    it('exclusive: $20 off > $15 member savings on a $100 formula', () => {
      const result = computeDiscount(
        baseCode({ type: 'fixed_cents', value: 2000, stackableWithMember: false }),
        10000,
        true,
      );
      expect(result.discountCents).toBe(2000);
      expect(result.dropMemberDiscount).toBe(true);
    });

    it('exclusive: $10 off < $15 member savings — member wins, code contributes nothing', () => {
      const result = computeDiscount(
        baseCode({ type: 'fixed_cents', value: 1000, stackableWithMember: false }),
        10000,
        true,
      );
      expect(result.discountCents).toBe(0);
      expect(result.dropMemberDiscount).toBe(false);
    });

    it('stackable fixed-cents: subtracted from post-member price', () => {
      // After 15% member discount: 10000 -> 8500. Fixed $5 off → 8500 - 500 = 8000 (discount is 500).
      const result = computeDiscount(
        baseCode({ type: 'fixed_cents', value: 500, stackableWithMember: true }),
        10000,
        true,
      );
      expect(result.discountCents).toBe(500);
    });
  });

  describe('free_shipping codes', () => {
    it('returns freeShipping=true and zero formula discount', () => {
      const result = computeDiscount(baseCode({ type: 'free_shipping', value: 0 }), 10000, false);
      expect(result.discountCents).toBe(0);
      expect(result.freeShipping).toBe(true);
      expect(result.dropMemberDiscount).toBe(false);
    });

    it('always works alongside member discount regardless of stackable flag', () => {
      const result = computeDiscount(
        baseCode({ type: 'free_shipping', value: 0, stackableWithMember: false }),
        10000,
        true,
      );
      expect(result.freeShipping).toBe(true);
      expect(result.dropMemberDiscount).toBe(false);
    });
  });
});
