import { logger } from '../../infra/logging/logger';
import { discountCodesRepository } from './discount-codes.repository';
import type { DiscountCode, InsertDiscountCode } from '@shared/schema';

export type DiscountValidationError =
  | 'NOT_FOUND'
  | 'INACTIVE'
  | 'EXPIRED'
  | 'EXHAUSTED'
  | 'USER_LIMIT'
  | 'MIN_ORDER'
  | 'FIRST_ORDER_ONLY';

export interface DiscountPreview {
  code: string;          // canonical (uppercased)
  description: string | null;
  type: DiscountCode['type'];
  discountCents: number; // amount that will be subtracted from the formula line (0 for free_shipping)
  freeShipping: boolean;
  dropMemberDiscount: boolean;
}

export interface AppliedDiscount extends DiscountPreview {
  redemptionId: string;  // returned only by reserveForCheckout — billing must attach an orderId or release on decline
  discountCodeId: string;
}

const MEMBER_DISCOUNT_RATE = 0.15;

/**
 * Compute the dollar value of a code without reserving anything.
 * Caller passes formulaCents BEFORE the member discount has been applied.
 */
function computeDiscount(
  code: DiscountCode,
  formulaCents: number,
  isMember: boolean,
): { discountCents: number; freeShipping: boolean; dropMemberDiscount: boolean } {
  const memberSavings = isMember ? Math.round(formulaCents * MEMBER_DISCOUNT_RATE) : 0;

  if (code.type === 'free_shipping') {
    // Free-shipping codes touch the shipping line, so they're orthogonal to the member discount.
    return { discountCents: 0, freeShipping: true, dropMemberDiscount: false };
  }

  // formula-line discounts
  const baseForCalc = isMember && code.stackableWithMember
    ? formulaCents - memberSavings
    : formulaCents;

  let raw = 0;
  if (code.type === 'percent') {
    raw = Math.round(baseForCalc * (code.value / 100));
  } else if (code.type === 'fixed_cents') {
    raw = code.value;
  }

  // Never let the discount exceed the line it's discounting.
  const cappedAgainstBase = Math.min(raw, baseForCalc);

  if (isMember && !code.stackableWithMember) {
    // Code is exclusive with the member discount: pick whichever saves the user more.
    if (cappedAgainstBase > memberSavings) {
      return { discountCents: cappedAgainstBase, freeShipping: false, dropMemberDiscount: true };
    }
    // Member discount wins — code contributes nothing this order.
    return { discountCents: 0, freeShipping: false, dropMemberDiscount: false };
  }

  return { discountCents: cappedAgainstBase, freeShipping: false, dropMemberDiscount: false };
}

export class DiscountCodesService {
  /**
   * Lookup + run all eligibility checks. Does NOT reserve.
   * Used by the /validate preview endpoint.
   */
  async previewForCheckout(input: {
    code: string;
    userId: string;
    formulaCents: number;
    isMember: boolean;
  }): Promise<{ ok: true; preview: DiscountPreview } | { ok: false; error: DiscountValidationError }> {
    const code = await discountCodesRepository.findActiveByCode(input.code.trim());
    if (!code) return { ok: false, error: 'NOT_FOUND' };
    if (!code.isActive) return { ok: false, error: 'INACTIVE' };

    if (code.expiresAt && code.expiresAt < new Date()) return { ok: false, error: 'EXPIRED' };
    if (code.maxUses !== null && code.usedCount >= code.maxUses) return { ok: false, error: 'EXHAUSTED' };

    if (input.formulaCents < code.minOrderCents) return { ok: false, error: 'MIN_ORDER' };

    if (code.firstOrderOnly) {
      const priorOrders = await discountCodesRepository.countCompletedOrdersByUser(input.userId);
      if (priorOrders > 0) return { ok: false, error: 'FIRST_ORDER_ONLY' };
    }

    const userRedemptions = await discountCodesRepository.countRedemptionsByUser(code.id, input.userId);
    if (userRedemptions >= code.maxUsesPerUser) return { ok: false, error: 'USER_LIMIT' };

    const computed = computeDiscount(code, input.formulaCents, input.isMember);
    return {
      ok: true,
      preview: {
        code: code.code,
        description: code.description,
        type: code.type,
        discountCents: computed.discountCents,
        freeShipping: computed.freeShipping,
        dropMemberDiscount: computed.dropMemberDiscount,
      },
    };
  }

  /**
   * Same as preview, but also atomically reserves a redemption row.
   * Caller MUST either attachOrderToRedemption() on success or releaseRedemption() on failure.
   */
  async reserveForCheckout(input: {
    code: string;
    userId: string;
    formulaCents: number;
    isMember: boolean;
  }): Promise<{ ok: true; applied: AppliedDiscount } | { ok: false; error: DiscountValidationError }> {
    const preview = await this.previewForCheckout(input);
    if (!preview.ok) return preview;

    const code = await discountCodesRepository.findActiveByCode(input.code.trim());
    if (!code) return { ok: false, error: 'NOT_FOUND' };

    const reservation = await discountCodesRepository.reserveRedemption({
      discountCodeId: code.id,
      userId: input.userId,
      amountAppliedCents: preview.preview.discountCents,
    });
    if (!reservation) return { ok: false, error: 'EXHAUSTED' };

    return { ok: true, applied: { ...preview.preview, redemptionId: reservation.id, discountCodeId: code.id } };
  }

  async attachOrder(redemptionId: string, orderId: string): Promise<void> {
    await discountCodesRepository.attachOrderToRedemption(redemptionId, orderId);
  }

  async release(redemptionId: string): Promise<void> {
    await discountCodesRepository.releaseRedemption(redemptionId);
  }

  // ── Admin CRUD ──────────────────────────────────────────────────────────

  async adminList() {
    return discountCodesRepository.listAll();
  }

  async adminCreate(payload: InsertDiscountCode) {
    if (!payload.code || payload.code.trim().length === 0) throw new Error('CODE_REQUIRED');
    if (payload.type !== 'free_shipping' && (payload.value === undefined || payload.value === null)) {
      throw new Error('VALUE_REQUIRED');
    }
    if (payload.type === 'percent' && (payload.value < 1 || payload.value > 100)) {
      throw new Error('PERCENT_OUT_OF_RANGE');
    }
    return discountCodesRepository.create(payload);
  }

  async adminUpdate(id: string, updates: Partial<InsertDiscountCode>) {
    if (updates.type === 'percent' && updates.value !== undefined && (updates.value < 1 || updates.value > 100)) {
      throw new Error('PERCENT_OUT_OF_RANGE');
    }
    const updated = await discountCodesRepository.update(id, updates);
    if (!updated) throw new Error('NOT_FOUND');
    return updated;
  }

  async adminDeactivate(id: string) {
    const updated = await discountCodesRepository.deactivate(id);
    if (!updated) throw new Error('NOT_FOUND');
    return updated;
  }

  async adminStats() {
    return discountCodesRepository.getStats();
  }
}

export const discountCodesService = new DiscountCodesService();
// exported for testing
export { computeDiscount };
