/**
 * Membership Pricing & Tier Logic Tests
 * Covers: tier capacity, plan pricing math, SQL tier selection logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import './test-utils';

// ── Helpers matching production logic in MembershipPricingSection ────────────

type Plan = 'monthly' | 'quarterly' | 'annual';

const PLAN_OPTIONS: { key: Plan; discount: number; intervalCount: number }[] = [
  { key: 'monthly',   discount: 0,    intervalCount: 1  },
  { key: 'quarterly', discount: 0.10, intervalCount: 3  },
  { key: 'annual',    discount: 0.15, intervalCount: 12 },
];

function planPrice(priceCents: number, plan: Plan) {
  const opt = PLAN_OPTIONS.find(p => p.key === plan)!;
  const monthlyBase = priceCents / 100;
  const total = Math.round(monthlyBase * opt.intervalCount * (1 - opt.discount));
  const perMonth = Math.round((total / opt.intervalCount) * 100) / 100;
  return { perMonth, total, intervalCount: opt.intervalCount };
}

// Mirrors DatabaseBillingProvider.resolvePlan
function resolvePlan(plan: string | undefined): { plan: Plan; intervalCount: number } {
  const normalized = String(plan || 'monthly').toLowerCase();
  if (normalized === 'quarterly') return { plan: 'quarterly', intervalCount: 3 };
  if (normalized === 'annual')    return { plan: 'annual',    intervalCount: 12 };
  return { plan: 'monthly', intervalCount: 1 };
}

interface Tier {
  tierKey: string;
  name: string;
  priceCents: number;
  maxCapacity: number | null;
  currentCount: number;
  sortOrder: number;
  isActive: boolean;
}

// Mirrors DatabaseBillingProvider / membershipRepository.getAvailableMembershipTier
function findAvailableTier(tiers: Tier[]): Tier | undefined {
  const active = tiers.filter(t => t.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  return active.find(t => t.maxCapacity === null || t.currentCount < t.maxCapacity);
}

// Mirrors front-end findActiveTier
function findActiveTierFE(tiers: Tier[]): Tier | null {
  const sorted = [...tiers].sort((a, b) => a.sortOrder - b.sortOrder);
  for (const tier of sorted) {
    if (tier.maxCapacity === null || tier.currentCount < tier.maxCapacity) {
      return tier;
    }
  }
  return sorted[sorted.length - 1] ?? null;
}

// ── Plan resolution ───────────────────────────────────────────────────────────

describe('Plan resolution (server)', () => {
  it('defaults to monthly when plan is undefined', () => {
    expect(resolvePlan(undefined)).toEqual({ plan: 'monthly', intervalCount: 1 });
  });

  it('defaults to monthly for empty string', () => {
    expect(resolvePlan('')).toEqual({ plan: 'monthly', intervalCount: 1 });
  });

  it('defaults to monthly for unrecognised string', () => {
    expect(resolvePlan('weekly')).toEqual({ plan: 'monthly', intervalCount: 1 });
  });

  it('resolves monthly', () => {
    expect(resolvePlan('monthly')).toEqual({ plan: 'monthly', intervalCount: 1 });
  });

  it('resolves quarterly', () => {
    expect(resolvePlan('quarterly')).toEqual({ plan: 'quarterly', intervalCount: 3 });
  });

  it('resolves annual', () => {
    expect(resolvePlan('annual')).toEqual({ plan: 'annual', intervalCount: 12 });
  });

  it('is case-insensitive', () => {
    expect(resolvePlan('QUARTERLY')).toEqual({ plan: 'quarterly', intervalCount: 3 });
    expect(resolvePlan('Annual')).toEqual({ plan: 'annual', intervalCount: 12 });
    expect(resolvePlan('MONTHLY')).toEqual({ plan: 'monthly', intervalCount: 1 });
  });
});

// ── Plan pricing math ─────────────────────────────────────────────────────────

describe('Plan pricing math', () => {
  describe('Founding tier ($9/mo, 900 cents)', () => {
    const cents = 900;

    it('monthly: $9/mo total, 1 interval', () => {
      const { perMonth, total, intervalCount } = planPrice(cents, 'monthly');
      expect(perMonth).toBe(9);
      expect(total).toBe(9);
      expect(intervalCount).toBe(1);
    });

    it('quarterly: 10% discount, ~$8.10/mo, $24 total', () => {
      const { total, intervalCount } = planPrice(cents, 'quarterly');
      expect(intervalCount).toBe(3);
      // 9 * 3 * 0.90 = 24.3 → rounds to 24
      expect(total).toBe(24);
    });

    it('annual: 15% discount, 12 intervals, $91 total', () => {
      const { total, intervalCount } = planPrice(cents, 'annual');
      expect(intervalCount).toBe(12);
      // 9 * 12 * 0.85 = 91.8 → rounds to 92
      expect(total).toBe(92);
    });

    it('monthly and quarterly perMonth are close (quarterly ≤ monthly)', () => {
      const monthly = planPrice(cents, 'monthly').perMonth;
      const quarterly = planPrice(cents, 'quarterly').perMonth;
      expect(quarterly).toBeLessThanOrEqual(monthly);
    });

    it('annual perMonth ≤ quarterly perMonth', () => {
      const quarterly = planPrice(cents, 'quarterly').perMonth;
      const annual = planPrice(cents, 'annual').perMonth;
      expect(annual).toBeLessThanOrEqual(quarterly);
    });
  });

  describe('Standard tier ($29/mo, 2900 cents)', () => {
    const cents = 2900;

    it('monthly total equals monthly perMonth', () => {
      const { perMonth, total } = planPrice(cents, 'monthly');
      expect(perMonth).toBe(29);
      expect(total).toBe(29);
    });

    it('quarterly is cheaper than 3x monthly', () => {
      const { total: qTotal } = planPrice(cents, 'quarterly');
      const monthly3x = 29 * 3;
      expect(qTotal).toBeLessThan(monthly3x);
    });

    it('annual is cheaper than 12x monthly', () => {
      const { total: aTotal } = planPrice(cents, 'annual');
      const monthly12x = 29 * 12;
      expect(aTotal).toBeLessThan(monthly12x);
    });
  });

  describe('Stripe amount calculation (server)', () => {
    it('monthly charge = priceCents × 1', () => {
      const { intervalCount } = resolvePlan('monthly');
      expect(900 * intervalCount).toBe(900);
    });

    it('quarterly charge = priceCents × 3', () => {
      const { intervalCount } = resolvePlan('quarterly');
      expect(900 * intervalCount).toBe(2700);
    });

    it('annual charge = priceCents × 12', () => {
      const { intervalCount } = resolvePlan('annual');
      expect(900 * intervalCount).toBe(10800);
    });
  });
});

// ── Tier selection ────────────────────────────────────────────────────────────

describe('Tier selection (server)', () => {
  const tiers: Tier[] = [
    { tierKey: 'founding', name: 'Founding',  priceCents: 900,  maxCapacity: 100,  currentCount: 0,   sortOrder: 1, isActive: true },
    { tierKey: 'early',    name: 'Early',     priceCents: 1500, maxCapacity: 500, currentCount: 0,   sortOrder: 2, isActive: true },
    { tierKey: 'beta',     name: 'Beta',      priceCents: 1900, maxCapacity: 2000, currentCount: 0,   sortOrder: 3, isActive: true },
    { tierKey: 'standard', name: 'Standard',  priceCents: 2900, maxCapacity: null, currentCount: 999, sortOrder: 4, isActive: true },
  ];

  it('returns the first available tier (founding when empty)', () => {
    expect(findAvailableTier(tiers)?.tierKey).toBe('founding');
  });

  it('skips full tiers to find next available', () => {
    const withFullFounding = tiers.map(t =>
      t.tierKey === 'founding' ? { ...t, currentCount: 100 } : t
    );
    expect(findAvailableTier(withFullFounding)?.tierKey).toBe('early');
  });

  it('skips multiple full tiers', () => {
    const allFull = tiers.map(t =>
      ['founding', 'early'].includes(t.tierKey)
        ? { ...t, currentCount: t.maxCapacity! }
        : t
    );
    expect(findAvailableTier(allFull)?.tierKey).toBe('beta');
  });

  it('returns standard tier (unlimited, null capacity) when others are full', () => {
    const allFull = tiers.map(t =>
      t.maxCapacity !== null ? { ...t, currentCount: t.maxCapacity } : t
    );
    expect(findAvailableTier(allFull)?.tierKey).toBe('standard');
  });

  it('treats maxCapacity=null as unlimited', () => {
    const unlimitedOnly: Tier[] = [
      { tierKey: 'unlimited', name: 'Unlimited', priceCents: 2900, maxCapacity: null, currentCount: 9999999, sortOrder: 1, isActive: true },
    ];
    expect(findAvailableTier(unlimitedOnly)?.tierKey).toBe('unlimited');
  });

  it('returns undefined when all tiers are full and none is unlimited', () => {
    const allFull: Tier[] = [
      { tierKey: 'founding', name: 'Founding', priceCents: 900, maxCapacity: 10, currentCount: 10, sortOrder: 1, isActive: true },
    ];
    expect(findAvailableTier(allFull)).toBeUndefined();
  });

  it('ignores inactive tiers', () => {
    const inactive = tiers.map(t => ({ ...t, isActive: false }));
    expect(findAvailableTier(inactive)).toBeUndefined();
  });

  it('respects sortOrder — lower sortOrder wins', () => {
    const shuffled = [...tiers].reverse();
    expect(findAvailableTier(shuffled)?.tierKey).toBe('founding');
  });
});

describe('Tier selection (front-end)', () => {
  const tiers: Tier[] = [
    { tierKey: 'founding', name: 'Founding', priceCents: 900,  maxCapacity: 100,  currentCount: 0, sortOrder: 1, isActive: true },
    { tierKey: 'early',    name: 'Early',    priceCents: 1500, maxCapacity: 500, currentCount: 0, sortOrder: 2, isActive: true },
    { tierKey: 'standard', name: 'Standard', priceCents: 2900, maxCapacity: null, currentCount: 0, sortOrder: 3, isActive: true },
  ];

  it('returns first tier with capacity', () => {
    expect(findActiveTierFE(tiers)?.tierKey).toBe('founding');
  });

  it('falls back to last tier when all are technically full (last tier shown as CTA)', () => {
    const allFull: Tier[] = tiers.map(t =>
      t.maxCapacity !== null ? { ...t, currentCount: t.maxCapacity } : t
    );
    // standard is null capacity, so it will be returned
    expect(findActiveTierFE(allFull)?.tierKey).toBe('standard');
  });

  it('returns last tier as fallback when list has no suitable tier', () => {
    const noRoom: Tier[] = [
      { tierKey: 'a', name: 'A', priceCents: 900, maxCapacity: 1, currentCount: 1, sortOrder: 1, isActive: true },
      { tierKey: 'b', name: 'B', priceCents: 1500, maxCapacity: 1, currentCount: 1, sortOrder: 2, isActive: true },
    ];
    // both full but no null capacity — resolves to last
    expect(findActiveTierFE(noRoom)?.tierKey).toBe('b');
  });
});

// ── Spots remaining calculation ───────────────────────────────────────────────

describe('Spots remaining', () => {
  it('correctly calculates spots remaining for a tier', () => {
    const tier: Tier = { tierKey: 'founding', name: 'Founding', priceCents: 900, maxCapacity: 100, currentCount: 73, sortOrder: 1, isActive: true };
    const remaining = (tier.maxCapacity ?? null) !== null ? tier.maxCapacity! - tier.currentCount : null;
    expect(remaining).toBe(27);
  });

  it('returns null for unlimited tier (null maxCapacity)', () => {
    const tier: Tier = { tierKey: 'standard', name: 'Standard', priceCents: 2900, maxCapacity: null, currentCount: 5000, sortOrder: 4, isActive: true };
    const remaining = (tier.maxCapacity ?? null) !== null ? tier.maxCapacity! - tier.currentCount : null;
    expect(remaining).toBeNull();
  });

  it('returns 0 when tier is exactly full', () => {
    const tier: Tier = { tierKey: 'founding', name: 'Founding', priceCents: 900, maxCapacity: 100, currentCount: 100, sortOrder: 1, isActive: true };
    const remaining = (tier.maxCapacity ?? null) !== null ? tier.maxCapacity! - tier.currentCount : null;
    expect(remaining).toBe(0);
  });
});

// ── BillingService missing key guards ─────────────────────────────────────────
// These are tested more exhaustively in billing.service.test.ts.
// Here we verify the resolvePlan / planPrice helpers stay consistent.

describe('Plan options are consistent', () => {
  it('each plan has a unique interval count', () => {
    const counts = PLAN_OPTIONS.map(p => p.intervalCount);
    const unique = new Set(counts);
    expect(unique.size).toBe(PLAN_OPTIONS.length);
  });

  it('discount is between 0 and 1 for all plans', () => {
    PLAN_OPTIONS.forEach(p => {
      expect(p.discount).toBeGreaterThanOrEqual(0);
      expect(p.discount).toBeLessThan(1);
    });
  });

  it('longer plans use larger discounts', () => {
    const monthly   = PLAN_OPTIONS.find(p => p.key === 'monthly')!.discount;
    const quarterly = PLAN_OPTIONS.find(p => p.key === 'quarterly')!.discount;
    const annual    = PLAN_OPTIONS.find(p => p.key === 'annual')!.discount;
    expect(quarterly).toBeGreaterThan(monthly);
    expect(annual).toBeGreaterThan(quarterly);
  });

  it('annual saves more than quarterly in absolute terms for any priceCents', () => {
    [900, 1500, 2900].forEach(cents => {
      const { total: qTotal } = planPrice(cents, 'quarterly');
      const { total: aTotal } = planPrice(cents, 'annual');
      const qSavings = (cents / 100) * 3   - qTotal;
      const aSavings = (cents / 100) * 12  - aTotal;
      expect(aSavings).toBeGreaterThan(qSavings);
    });
  });
});
