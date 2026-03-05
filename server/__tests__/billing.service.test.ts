/**
 * Billing Service Tests
 * Covers: createCheckoutSession, cancelSubscription, handleStripeWebhook,
 *         listBillingHistory, getInvoice, plan resolution, status mapping
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import './test-utils';

// ── Hoist mocks before vi.mock factories (vitest hoisting requirement) ────────
const {
  mockGetUser, mockUpdateUser, mockListOrdersByUser, mockGetOrder,
  mockGetUserByStripeCustomerId, mockGetUserByStripeSubscriptionId,
  mockGetSubscriptionByStripeSubscriptionId, mockUpdateSubscriptionByStripeSubscriptionId,
  mockUpsertSubscriptionForUser,
  mockGetAvailableMembershipTier, mockGetMembershipTier,
  mockAssignUserMembership, mockCancelUserMembership,
  mockCustomersCreate, mockCheckoutSessionsCreate,
  mockSubscriptionsCancel, mockSubscriptionsRetrieve, mockWebhooksConstructEvent,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockUpdateUser: vi.fn(),
  mockListOrdersByUser: vi.fn(),
  mockGetOrder: vi.fn(),
  mockGetUserByStripeCustomerId: vi.fn(),
  mockGetUserByStripeSubscriptionId: vi.fn(),
  mockGetSubscriptionByStripeSubscriptionId: vi.fn(),
  mockUpdateSubscriptionByStripeSubscriptionId: vi.fn(),
  mockUpsertSubscriptionForUser: vi.fn(),
  mockGetAvailableMembershipTier: vi.fn(),
  mockGetMembershipTier: vi.fn(),
  mockAssignUserMembership: vi.fn(),
  mockCancelUserMembership: vi.fn(),
  mockCustomersCreate: vi.fn(),
  mockCheckoutSessionsCreate: vi.fn(),
  mockSubscriptionsCancel: vi.fn(),
  mockSubscriptionsRetrieve: vi.fn(),
  mockWebhooksConstructEvent: vi.fn(),
}));

vi.mock('../modules/users/users.repository', () => ({
  usersRepository: {
    getUser: mockGetUser,
    updateUser: mockUpdateUser,
    listOrdersByUser: mockListOrdersByUser,
    getOrder: mockGetOrder,
    getUserByStripeCustomerId: mockGetUserByStripeCustomerId,
    getUserByStripeSubscriptionId: mockGetUserByStripeSubscriptionId,
    getSubscriptionByStripeSubscriptionId: mockGetSubscriptionByStripeSubscriptionId,
    updateSubscriptionByStripeSubscriptionId: mockUpdateSubscriptionByStripeSubscriptionId,
    upsertSubscriptionForUser: mockUpsertSubscriptionForUser,
  },
}));

vi.mock('../modules/membership/membership.repository', () => ({
  membershipRepository: {
    getAvailableMembershipTier: mockGetAvailableMembershipTier,
    getMembershipTier: mockGetMembershipTier,
    assignUserMembership: mockAssignUserMembership,
    cancelUserMembership: mockCancelUserMembership,
  },
}));

vi.mock('stripe', () => ({
  default: class {
    public customers          = { create: mockCustomersCreate };
    public checkout           = { sessions: { create: mockCheckoutSessionsCreate } };
    public subscriptions      = { cancel: mockSubscriptionsCancel, retrieve: mockSubscriptionsRetrieve };
    public webhooks           = { constructEvent: mockWebhooksConstructEvent };
  },
}));

// ── Set required env vars before importing service ───────────────────────────
process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key_for_tests';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fake_secret';
process.env.FRONTEND_URL = 'https://test.ones.ai';

// Import AFTER mocks are registered
import { BillingService } from '../modules/billing/billing.service';

// ── Helpers ──────────────────────────────────────────────────────────────────
function makeUser(overrides: Record<string, any> = {}) {
  return {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    membershipTier: null,
    membershipCancelledAt: null,
    membershipLockedPriceCents: null,
    ...overrides,
  };
}

function makeTier(overrides: Record<string, any> = {}) {
  return {
    id: 'tier-1',
    tierKey: 'founding',
    name: 'Founding Member',
    priceCents: 900,
    maxCapacity: 100,
    currentCount: 5,
    sortOrder: 1,
    isActive: true,
    benefits: [],
    ...overrides,
  };
}

function makeOrder(overrides: Record<string, any> = {}) {
  return {
    id: 'order-abc',
    userId: 'user-123',
    formulaVersion: 2,
    status: 'delivered',
    placedAt: new Date('2026-01-15'),
    amountCents: 4900,
    supplyMonths: 1,
    ...overrides,
  };
}

function makeStripeSession(overrides: Record<string, any> = {}) {
  return {
    id: 'cs_test_session',
    url: 'https://checkout.stripe.com/pay/cs_test_session',
    expires_at: Math.floor(Date.now() / 1000) + 1800,
    ...overrides,
  };
}

// ── Test suite ───────────────────────────────────────────────────────────────

describe('BillingService — delegation', () => {
  it('delegates listBillingHistory to provider', async () => {
    const mockProvider = {
      listBillingHistory: vi.fn().mockResolvedValue([]),
      getInvoice: vi.fn(),
      createCheckoutSession: vi.fn(),
      cancelSubscription: vi.fn(),
      handleStripeWebhook: vi.fn(),
    };
    const svc = new BillingService(mockProvider as any);
    await svc.listBillingHistory('user-1');
    expect(mockProvider.listBillingHistory).toHaveBeenCalledWith('user-1');
  });

  it('delegates getInvoice to provider', async () => {
    const mockProvider = {
      listBillingHistory: vi.fn(),
      getInvoice: vi.fn().mockResolvedValue(null),
      createCheckoutSession: vi.fn(),
      cancelSubscription: vi.fn(),
      handleStripeWebhook: vi.fn(),
    };
    const svc = new BillingService(mockProvider as any);
    await svc.getInvoice('user-1', 'inv-1');
    expect(mockProvider.getInvoice).toHaveBeenCalledWith('user-1', 'inv-1');
  });

  it('delegates createCheckoutSession to provider', async () => {
    const result = { checkoutUrl: 'https://stripe.com', sessionId: 'cs_1', expiresAt: '2026-01-01T00:00:00Z' };
    const mockProvider = {
      listBillingHistory: vi.fn(),
      getInvoice: vi.fn(),
      createCheckoutSession: vi.fn().mockResolvedValue(result),
      cancelSubscription: vi.fn(),
      handleStripeWebhook: vi.fn(),
    };
    const svc = new BillingService(mockProvider as any);
    const res = await svc.createCheckoutSession('user-1', { plan: 'annual' });
    expect(mockProvider.createCheckoutSession).toHaveBeenCalledWith('user-1', { plan: 'annual' }, undefined);
    expect(res).toEqual(result);
  });

  it('delegates cancelSubscription to provider', async () => {
    const result = { cancelledAt: '2026-01-01T00:00:00Z', status: 'cancelled' as const };
    const mockProvider = {
      listBillingHistory: vi.fn(),
      getInvoice: vi.fn(),
      createCheckoutSession: vi.fn(),
      cancelSubscription: vi.fn().mockResolvedValue(result),
      handleStripeWebhook: vi.fn(),
    };
    const svc = new BillingService(mockProvider as any);
    const res = await svc.cancelSubscription('user-1', 'sub_1');
    expect(mockProvider.cancelSubscription).toHaveBeenCalledWith('user-1', 'sub_1');
    expect(res.status).toBe('cancelled');
  });
});

// ── listBillingHistory ────────────────────────────────────────────────────────

describe('listBillingHistory', () => {
  let svc: BillingService;
  beforeEach(() => {
    vi.clearAllMocks();
    svc = new BillingService();
  });

  it('returns empty array when user has no orders', async () => {
    mockListOrdersByUser.mockResolvedValue([]);
    const result = await svc.listBillingHistory('user-123');
    expect(result).toEqual([]);
  });

  it('maps delivered order to status: paid', async () => {
    mockListOrdersByUser.mockResolvedValue([makeOrder({ status: 'delivered' })]);
    const [item] = await svc.listBillingHistory('user-123');
    expect(item.status).toBe('paid');
  });

  it('maps cancelled order to status: failed', async () => {
    mockListOrdersByUser.mockResolvedValue([makeOrder({ status: 'cancelled' })]);
    const [item] = await svc.listBillingHistory('user-123');
    expect(item.status).toBe('failed');
  });

  it('maps processing order to status: pending', async () => {
    mockListOrdersByUser.mockResolvedValue([makeOrder({ status: 'processing' })]);
    const [item] = await svc.listBillingHistory('user-123');
    expect(item.status).toBe('pending');
  });

  it('maps shipped order to status: pending', async () => {
    mockListOrdersByUser.mockResolvedValue([makeOrder({ status: 'shipped' })]);
    const [item] = await svc.listBillingHistory('user-123');
    expect(item.status).toBe('pending');
  });

  it('includes correct description with formula version', async () => {
    mockListOrdersByUser.mockResolvedValue([makeOrder({ formulaVersion: 7 })]);
    const [item] = await svc.listBillingHistory('user-123');
    expect(item.description).toContain('7');
  });

  it('sets currency to USD', async () => {
    mockListOrdersByUser.mockResolvedValue([makeOrder()]);
    const [item] = await svc.listBillingHistory('user-123');
    expect(item.currency).toBe('USD');
  });

  it('preserves null amountCents', async () => {
    mockListOrdersByUser.mockResolvedValue([makeOrder({ amountCents: null })]);
    const [item] = await svc.listBillingHistory('user-123');
    expect(item.amountCents).toBeNull();
  });

  it('includes invoiceUrl path', async () => {
    mockListOrdersByUser.mockResolvedValue([makeOrder({ id: 'order-xyz' })]);
    const [item] = await svc.listBillingHistory('user-123');
    expect(item.invoiceUrl).toContain('order-xyz');
  });
});

// ── getInvoice ────────────────────────────────────────────────────────────────

describe('getInvoice', () => {
  let svc: BillingService;
  beforeEach(() => {
    vi.clearAllMocks();
    svc = new BillingService();
  });

  it('returns null when order not found', async () => {
    mockGetOrder.mockResolvedValue(null);
    const result = await svc.getInvoice('user-123', 'inv-999');
    expect(result).toBeNull();
  });

  it('returns null when order belongs to different user', async () => {
    mockGetOrder.mockResolvedValue(makeOrder({ userId: 'other-user' }));
    const result = await svc.getInvoice('user-123', 'order-abc');
    expect(result).toBeNull();
  });

  it('returns BillingInvoice with correct shape', async () => {
    mockGetOrder.mockResolvedValue(makeOrder());
    const result = await svc.getInvoice('user-123', 'order-abc');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('order-abc');
    expect(result!.userId).toBe('user-123');
    expect(result!.currency).toBe('USD');
    expect(result!.amountCents).toBe(4900);
    expect(result!.status).toBe('paid');
    expect(Array.isArray(result!.lineItems)).toBe(true);
    expect(result!.lineItems.length).toBe(1);
  });

  it('maps delivered→paid, cancelled→failed in invoice', async () => {
    mockGetOrder.mockResolvedValue(makeOrder({ status: 'cancelled' }));
    const result = await svc.getInvoice('user-123', 'order-abc');
    expect(result!.status).toBe('failed');
  });

  it('includes formula version in line item label', async () => {
    mockGetOrder.mockResolvedValue(makeOrder({ formulaVersion: 5 }));
    const result = await svc.getInvoice('user-123', 'order-abc');
    expect(result!.lineItems[0].label).toContain('5');
    expect(result!.lineItems[0].formulaVersion).toBe(5);
  });

  it('handles null amountCents in line items', async () => {
    mockGetOrder.mockResolvedValue(makeOrder({ amountCents: null }));
    const result = await svc.getInvoice('user-123', 'order-abc');
    expect(result!.amountCents).toBeNull();
    expect(result!.lineItems[0].amountCents).toBeNull();
  });
});

// ── createCheckoutSession ─────────────────────────────────────────────────────

describe('createCheckoutSession', () => {
  let svc: BillingService;
  beforeEach(() => {
    vi.clearAllMocks();
    svc = new BillingService();
    mockGetUser.mockResolvedValue(makeUser());
    mockGetAvailableMembershipTier.mockResolvedValue(makeTier());
    mockCustomersCreate.mockResolvedValue({ id: 'cus_new' });
    mockUpdateUser.mockResolvedValue({});
    mockCheckoutSessionsCreate.mockResolvedValue(makeStripeSession());
  });

  it('throws USER_NOT_FOUND when user not found', async () => {
    mockGetUser.mockResolvedValue(null);
    await expect(svc.createCheckoutSession('user-123', {})).rejects.toThrow('USER_NOT_FOUND');
  });

  it('throws ALREADY_ACTIVE_MEMBER when user has active membership', async () => {
    mockGetUser.mockResolvedValue(makeUser({ membershipTier: 'founding', membershipCancelledAt: null }));
    await expect(svc.createCheckoutSession('user-123', {})).rejects.toThrow('ALREADY_ACTIVE_MEMBER');
  });

  it('allows rejoining after cancellation', async () => {
    mockGetUser.mockResolvedValue(makeUser({
      membershipTier: 'founding',
      membershipCancelledAt: new Date('2025-12-01'),
    }));
    const result = await svc.createCheckoutSession('user-123', {});
    expect(result.checkoutUrl).toBeTruthy();
  });

  it('throws NO_MEMBERSHIP_TIER_AVAILABLE when no tier exists', async () => {
    mockGetAvailableMembershipTier.mockResolvedValue(null);
    await expect(svc.createCheckoutSession('user-123', {})).rejects.toThrow('NO_MEMBERSHIP_TIER_AVAILABLE');
  });

  it('creates a new Stripe customer when user has none', async () => {
    await svc.createCheckoutSession('user-123', {});
    expect(mockCustomersCreate).toHaveBeenCalledWith(expect.objectContaining({
      email: 'test@example.com',
      name: 'Test User',
      metadata: { userId: 'user-123' },
    }));
    expect(mockUpdateUser).toHaveBeenCalledWith('user-123', { stripeCustomerId: 'cus_new' });
  });

  it('reuses existing Stripe customer ID', async () => {
    mockGetUser.mockResolvedValue(makeUser({ stripeCustomerId: 'cus_existing' }));
    await svc.createCheckoutSession('user-123', {});
    expect(mockCustomersCreate).not.toHaveBeenCalled();
    expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(expect.objectContaining({
      customer: 'cus_existing',
    }));
  });

  it('monthly plan: intervalCount=1, amount=priceCents', async () => {
    await svc.createCheckoutSession('user-123', { plan: 'monthly' });
    const call = mockCheckoutSessionsCreate.mock.calls[0][0];
    const lineItem = call.line_items[0];
    expect(lineItem.price_data.recurring.interval_count).toBe(1);
    expect(lineItem.price_data.unit_amount).toBe(900); // 900 * 1
  });

  it('quarterly plan: intervalCount=3, amount=priceCents*3', async () => {
    await svc.createCheckoutSession('user-123', { plan: 'quarterly' });
    const call = mockCheckoutSessionsCreate.mock.calls[0][0];
    const lineItem = call.line_items[0];
    expect(lineItem.price_data.recurring.interval_count).toBe(3);
    expect(lineItem.price_data.unit_amount).toBe(2700); // 900 * 3
  });

  it('annual plan: intervalCount=12, amount=priceCents*12', async () => {
    await svc.createCheckoutSession('user-123', { plan: 'annual' });
    const call = mockCheckoutSessionsCreate.mock.calls[0][0];
    const lineItem = call.line_items[0];
    expect(lineItem.price_data.recurring.interval_count).toBe(12);
    expect(lineItem.price_data.unit_amount).toBe(10800); // 900 * 12
  });

  it('defaults to monthly plan for invalid plan string', async () => {
    await svc.createCheckoutSession('user-123', { plan: 'bogus' });
    const call = mockCheckoutSessionsCreate.mock.calls[0][0];
    expect(call.line_items[0].price_data.recurring.interval_count).toBe(1);
  });

  it('uses custom successUrl when provided', async () => {
    await svc.createCheckoutSession('user-123', { successUrl: 'https://myapp.com/done' });
    const call = mockCheckoutSessionsCreate.mock.calls[0][0];
    expect(call.success_url).toBe('https://myapp.com/done');
  });

  it('uses custom cancelUrl when provided', async () => {
    await svc.createCheckoutSession('user-123', { cancelUrl: 'https://myapp.com/cancel' });
    const call = mockCheckoutSessionsCreate.mock.calls[0][0];
    expect(call.cancel_url).toBe('https://myapp.com/cancel');
  });

  it('uses default successUrl containing /membership/success', async () => {
    await svc.createCheckoutSession('user-123', {});
    const call = mockCheckoutSessionsCreate.mock.calls[0][0];
    expect(call.success_url).toContain('/membership/success');
  });

  it('uses default cancelUrl containing /dashboard/formula', async () => {
    await svc.createCheckoutSession('user-123', {});
    const call = mockCheckoutSessionsCreate.mock.calls[0][0];
    expect(call.cancel_url).toContain('/dashboard/formula');
  });

  it('embeds userId and tier metadata', async () => {
    await svc.createCheckoutSession('user-123', {});
    const call = mockCheckoutSessionsCreate.mock.calls[0][0];
    expect(call.metadata.userId).toBe('user-123');
    expect(call.metadata.membershipTier).toBe('founding');
    expect(call.metadata.membershipPriceCents).toBe('900');
  });

  it('sets mode to subscription', async () => {
    await svc.createCheckoutSession('user-123', {});
    const call = mockCheckoutSessionsCreate.mock.calls[0][0];
    expect(call.mode).toBe('subscription');
  });

  it('returns checkoutUrl, sessionId, expiresAt', async () => {
    const result = await svc.createCheckoutSession('user-123', {});
    expect(result.checkoutUrl).toBe('https://checkout.stripe.com/pay/cs_test_session');
    expect(result.sessionId).toBe('cs_test_session');
    expect(typeof result.expiresAt).toBe('string');
  });

  it('enables promotion codes', async () => {
    await svc.createCheckoutSession('user-123', {});
    const call = mockCheckoutSessionsCreate.mock.calls[0][0];
    expect(call.allow_promotion_codes).toBe(true);
  });
});

// ── cancelSubscription ────────────────────────────────────────────────────────

describe('cancelSubscription', () => {
  let svc: BillingService;
  beforeEach(() => {
    vi.clearAllMocks();
    svc = new BillingService();
    mockUpsertSubscriptionForUser.mockResolvedValue({});
    mockCancelUserMembership.mockResolvedValue({});
  });

  it('throws USER_NOT_FOUND when user not found', async () => {
    mockGetUser.mockResolvedValue(null);
    await expect(svc.cancelSubscription('user-123', 'sub_1')).rejects.toThrow('USER_NOT_FOUND');
  });

  it('throws SUBSCRIPTION_NOT_FOUND when user has no stripeSubscriptionId', async () => {
    mockGetUser.mockResolvedValue(makeUser({ stripeSubscriptionId: null }));
    // Also pass empty string as subscriptionId param
    await expect(svc.cancelSubscription('user-123', '')).rejects.toThrow('SUBSCRIPTION_NOT_FOUND');
  });

  it('calls stripe.subscriptions.cancel with user stripeSubscriptionId', async () => {
    mockGetUser.mockResolvedValue(makeUser({ stripeSubscriptionId: 'sub_abc', membershipTier: null }));
    mockSubscriptionsCancel.mockResolvedValue({});
    const result = await svc.cancelSubscription('user-123', 'sub_abc');
    expect(mockSubscriptionsCancel).toHaveBeenCalledWith('sub_abc');
    expect(result.status).toBe('cancelled');
    expect(typeof result.cancelledAt).toBe('string');
  });

  it('uses param subscriptionId when user has none on record', async () => {
    mockGetUser.mockResolvedValue(makeUser({ stripeSubscriptionId: null, membershipTier: null }));
    mockSubscriptionsCancel.mockResolvedValue({});
    // when stripeSubscriptionId is null on user, param is used as fallback
    const result = await svc.cancelSubscription('user-123', 'sub_from_param');
    expect(mockSubscriptionsCancel).toHaveBeenCalledWith('sub_from_param');
    expect(result.status).toBe('cancelled');
  });

  it('cancels membership if user has active membership', async () => {
    mockGetUser.mockResolvedValue(makeUser({
      stripeSubscriptionId: 'sub_abc',
      membershipTier: 'founding',
      membershipCancelledAt: null,
    }));
    mockSubscriptionsCancel.mockResolvedValue({});
    await svc.cancelSubscription('user-123', 'sub_abc');
    expect(mockCancelUserMembership).toHaveBeenCalledWith('user-123');
  });

  it('does not call cancelUserMembership if membership already cancelled', async () => {
    mockGetUser.mockResolvedValue(makeUser({
      stripeSubscriptionId: 'sub_abc',
      membershipTier: 'founding',
      membershipCancelledAt: new Date('2025-12-01'),
    }));
    mockSubscriptionsCancel.mockResolvedValue({});
    await svc.cancelSubscription('user-123', 'sub_abc');
    expect(mockCancelUserMembership).not.toHaveBeenCalled();
  });

  it('does not cancel membership if user has no tier', async () => {
    mockGetUser.mockResolvedValue(makeUser({
      stripeSubscriptionId: 'sub_abc',
      membershipTier: null,
    }));
    mockSubscriptionsCancel.mockResolvedValue({});
    await svc.cancelSubscription('user-123', 'sub_abc');
    expect(mockCancelUserMembership).not.toHaveBeenCalled();
  });

  it('upserts subscription with cancelled status', async () => {
    mockGetUser.mockResolvedValue(makeUser({ stripeSubscriptionId: 'sub_abc', membershipTier: null }));
    mockSubscriptionsCancel.mockResolvedValue({});
    await svc.cancelSubscription('user-123', 'sub_abc');
    expect(mockUpsertSubscriptionForUser).toHaveBeenCalledWith('user-123', expect.objectContaining({
      status: 'cancelled',
    }));
  });
});

// ── handleStripeWebhook ───────────────────────────────────────────────────────

describe('handleStripeWebhook', () => {
  let svc: BillingService;

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new BillingService();
    mockUpsertSubscriptionForUser.mockResolvedValue({});
    mockUpdateUser.mockResolvedValue({});
    mockAssignUserMembership.mockResolvedValue({});
    mockCancelUserMembership.mockResolvedValue({});
  });

  it('throws MISSING_STRIPE_SIGNATURE when no signature', async () => {
    await expect(svc.handleStripeWebhook(undefined, Buffer.from('{}'))).rejects.toThrow('MISSING_STRIPE_SIGNATURE');
  });

  it('throws when stripe.webhooks.constructEvent throws', async () => {
    mockWebhooksConstructEvent.mockImplementation(() => { throw new Error('Signature mismatch'); });
    await expect(svc.handleStripeWebhook('bad_sig', Buffer.from('{}'))).rejects.toThrow('Signature mismatch');
  });

  it('handles checkout.session.completed — assigns membership and upserts subscription', async () => {
    const event = {
      id: 'evt_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          mode: 'subscription',
          customer: 'cus_abc',
          subscription: 'sub_abc',
          client_reference_id: 'user-123',
          metadata: {
            userId: 'user-123',
            membershipTier: 'founding',
            membershipPriceCents: '900',
            plan: 'monthly',
          },
        },
      },
    };
    mockWebhooksConstructEvent.mockReturnValue(event);
    mockGetUser.mockResolvedValue(makeUser({ id: 'user-123', membershipTier: null }));
    mockSubscriptionsRetrieve.mockResolvedValue({ status: 'active', pause_collection: null });
    mockGetMembershipTier.mockResolvedValue(makeTier());
    mockGetAvailableMembershipTier.mockResolvedValue(makeTier());

    await svc.handleStripeWebhook('sig_valid', Buffer.from('{}'));

    // Service calls updateUser twice: once for customerId, once for subscriptionId
    expect(mockUpdateUser).toHaveBeenCalledWith('user-123', expect.objectContaining({
      stripeCustomerId: 'cus_abc',
    }));
    expect(mockUpdateUser).toHaveBeenCalledWith('user-123', expect.objectContaining({
      stripeSubscriptionId: 'sub_abc',
    }));
    expect(mockUpsertSubscriptionForUser).toHaveBeenCalledWith('user-123', expect.objectContaining({
      status: 'active',
    }));
    expect(mockAssignUserMembership).toHaveBeenCalledWith('user-123', 'founding', 900);
  });

  it('handles checkout.session.completed — skips membership assign if already a member', async () => {
    const event = {
      id: 'evt_2',
      type: 'checkout.session.completed',
      data: {
        object: {
          mode: 'subscription',
          customer: 'cus_abc',
          subscription: 'sub_abc',
          metadata: { userId: 'user-123', plan: 'monthly' },
        },
      },
    };
    mockWebhooksConstructEvent.mockReturnValue(event);
    mockGetUser.mockResolvedValue(makeUser({ id: 'user-123', membershipTier: 'founding', membershipCancelledAt: null }));
    mockSubscriptionsRetrieve.mockResolvedValue({ status: 'active', pause_collection: null });

    await svc.handleStripeWebhook('sig_valid', Buffer.from('{}'));

    expect(mockAssignUserMembership).not.toHaveBeenCalled();
  });

  it('handles customer.subscription.updated — updates subscription', async () => {
    const event = {
      id: 'evt_3',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_abc',
          customer: 'cus_abc',
          status: 'active',
          metadata: { plan: 'monthly' },
          pause_collection: null,
        },
      },
    };
    mockWebhooksConstructEvent.mockReturnValue(event);
    mockGetUserByStripeSubscriptionId.mockResolvedValue(makeUser({ stripeSubscriptionId: 'sub_abc' }));

    await svc.handleStripeWebhook('sig_valid', Buffer.from('{}'));

    expect(mockUpsertSubscriptionForUser).toHaveBeenCalledWith('user-123', expect.objectContaining({
      status: 'active',
      stripeSubscriptionId: 'sub_abc',
    }));
  });

  it('handles customer.subscription.deleted — cancels membership', async () => {
    const event = {
      id: 'evt_4',
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_abc',
          customer: 'cus_abc',
          status: 'canceled',
          metadata: {},
          pause_collection: null,
        },
      },
    };
    mockWebhooksConstructEvent.mockReturnValue(event);
    mockGetUserByStripeSubscriptionId.mockResolvedValue(
      makeUser({ stripeSubscriptionId: 'sub_abc', membershipTier: 'founding', membershipCancelledAt: null })
    );

    await svc.handleStripeWebhook('sig_valid', Buffer.from('{}'));

    expect(mockUpsertSubscriptionForUser).toHaveBeenCalledWith('user-123', expect.objectContaining({
      status: 'cancelled',
    }));
    expect(mockCancelUserMembership).toHaveBeenCalledWith('user-123');
  });

  it('handles invoice.paid — sets status to active', async () => {
    const event = {
      id: 'evt_5',
      type: 'invoice.paid',
      data: {
        object: {
          parent: { subscription_details: { subscription: 'sub_abc' } },
        },
      },
    };
    mockWebhooksConstructEvent.mockReturnValue(event);
    mockGetSubscriptionByStripeSubscriptionId.mockResolvedValue({ id: 'int_sub_1' });

    await svc.handleStripeWebhook('sig_valid', Buffer.from('{}'));

    expect(mockUpdateSubscriptionByStripeSubscriptionId).toHaveBeenCalledWith('sub_abc', { status: 'active' });
  });

  it('handles invoice.payment_failed — sets status to past_due', async () => {
    const event = {
      id: 'evt_6',
      type: 'invoice.payment_failed',
      data: {
        object: {
          parent: { subscription_details: { subscription: 'sub_abc' } },
        },
      },
    };
    mockWebhooksConstructEvent.mockReturnValue(event);
    mockGetSubscriptionByStripeSubscriptionId.mockResolvedValue({ id: 'int_sub_1' });

    await svc.handleStripeWebhook('sig_valid', Buffer.from('{}'));

    expect(mockUpdateSubscriptionByStripeSubscriptionId).toHaveBeenCalledWith('sub_abc', { status: 'past_due' });
  });

  it('ignores unknown event types without throwing', async () => {
    const event = {
      id: 'evt_7',
      type: 'payment_method.attached',
      data: { object: {} },
    };
    mockWebhooksConstructEvent.mockReturnValue(event);
    await expect(svc.handleStripeWebhook('sig_valid', Buffer.from('{}'))).resolves.not.toThrow();
  });

  it('skips invoice.paid when subscription reference is missing', async () => {
    const event = {
      id: 'evt_8',
      type: 'invoice.paid',
      data: { object: { parent: null } },
    };
    mockWebhooksConstructEvent.mockReturnValue(event);
    await svc.handleStripeWebhook('sig_valid', Buffer.from('{}'));
    expect(mockUpdateSubscriptionByStripeSubscriptionId).not.toHaveBeenCalled();
  });
});

// ── Stripe status mapping (tested indirectly via subscription.updated) ────────

describe('Stripe subscription status mapping', () => {
  let svc: BillingService;
  beforeEach(() => {
    vi.clearAllMocks();
    svc = new BillingService();
    mockUpsertSubscriptionForUser.mockResolvedValue({});
    mockUpdateUser.mockResolvedValue({});
  });

  async function getUpsertedStatus(stripeStatus: string) {
    const event = {
      id: 'evt_map',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_abc',
          customer: 'cus_abc',
          status: stripeStatus,
          metadata: {},
          pause_collection: null,
        },
      },
    };
    mockWebhooksConstructEvent.mockReturnValue(event);
    mockGetUserByStripeSubscriptionId.mockResolvedValue(makeUser());
    await svc.handleStripeWebhook('sig', Buffer.from('{}'));
    return (mockUpsertSubscriptionForUser.mock.calls[0][1] as any).status;
  }

  it.each([
    ['active',             'active'],
    ['trialing',           'active'],
    ['past_due',           'past_due'],
    ['unpaid',             'past_due'],
    ['incomplete',         'past_due'],
    ['incomplete_expired', 'past_due'],
    ['paused',             'paused'],
    ['canceled',           'cancelled'],
  ])('stripe %s → internal %s', async (stripeStatus, expected) => {
    vi.clearAllMocks();
    mockUpsertSubscriptionForUser.mockResolvedValue({});
    expect(await getUpsertedStatus(stripeStatus)).toBe(expected);
  });
});

// ── Missing key guards ────────────────────────────────────────────────────────

describe('Stripe key guards', () => {
  it('throws STRIPE_SECRET_KEY_NOT_CONFIGURED when STRIPE_SECRET_KEY is absent', async () => {
    const saved = process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY;

    const svcNoKey = new BillingService(); // reads env at instantiation time
    mockGetUser.mockResolvedValue({
      id: 'u1', email: 'a@b.com', name: 'A', membershipTier: null, membershipCancelledAt: null, stripeCustomerId: null,
    });
    mockGetAvailableMembershipTier.mockResolvedValue({ tierKey: 'founding', priceCents: 900, name: 'Founding' });

    await expect(svcNoKey.createCheckoutSession('u1', {})).rejects.toThrow('STRIPE_SECRET_KEY_NOT_CONFIGURED');
    process.env.STRIPE_SECRET_KEY = saved;
  });

  it('throws STRIPE_WEBHOOK_SECRET_NOT_CONFIGURED when secret absent', async () => {
    const saved = process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const svcNoSecret = new BillingService();
    await expect(svcNoSecret.handleStripeWebhook('sig', Buffer.from('{}'))).rejects.toThrow(
      'STRIPE_WEBHOOK_SECRET_NOT_CONFIGURED'
    );
    process.env.STRIPE_WEBHOOK_SECRET = saved;
  });

  it('throws MISSING_STRIPE_SIGNATURE when signature is undefined', async () => {
    // webhook secret IS set, but no signature
    const svc = new BillingService();
    await expect(svc.handleStripeWebhook(undefined, Buffer.from('{}'))).rejects.toThrow('MISSING_STRIPE_SIGNATURE');
  });
});
