/**
 * Billing Controller Tests
 * Tests HTTP status codes and response shapes for all billing endpoints.
 * Uses mock req/res — no server startup needed.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import './test-utils';

// ── Hoist mocks before vi.mock factories (vitest hoisting requirement) ────────
const {
  mockListBillingHistory, mockGetInvoice, mockCreateCheckoutSession,
  mockCancelSubscription, mockHandleStripeWebhook,
} = vi.hoisted(() => ({
  mockListBillingHistory: vi.fn(),
  mockGetInvoice: vi.fn(),
  mockCreateCheckoutSession: vi.fn(),
  mockCancelSubscription: vi.fn(),
  mockHandleStripeWebhook: vi.fn(),
}));

vi.mock('../modules/billing/billing.service', () => ({
  billingService: {
    listBillingHistory:  mockListBillingHistory,
    getInvoice:          mockGetInvoice,
    createCheckoutSession: mockCreateCheckoutSession,
    cancelSubscription:  mockCancelSubscription,
    handleStripeWebhook: mockHandleStripeWebhook,
  },
}));

import { BillingController } from '../api/controller/billing.controller';

// ── Mock Express req/res helpers ──────────────────────────────────────────────
function makeReq(overrides: Record<string, any> = {}): any {
  return {
    userId: 'user-123',
    params: {},
    headers: {},
    body: {},
    ...overrides,
  };
}

function makeRes() {
  const json = vi.fn().mockReturnThis();
  const status = vi.fn().mockReturnThis();
  const send = vi.fn().mockReturnThis();
  const setHeader = vi.fn().mockReturnThis();
  return { json, status, send, setHeader, _json: json, _status: status };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BillingController.getHistory', () => {
  let ctrl: BillingController;
  beforeEach(() => {
    vi.clearAllMocks();
    ctrl = new BillingController();
  });

  it('returns 200 with items and currency', async () => {
    const items = [{ id: 'ord-1', status: 'paid', amountCents: 900, currency: 'USD' }];
    mockListBillingHistory.mockResolvedValue(items);

    const req = makeReq();
    const res = makeRes();
    await ctrl.getHistory(req, res as any);

    expect(res.json).toHaveBeenCalledWith({ items, currency: 'USD' });
    expect(res.status).not.toHaveBeenCalled(); // default 200
  });

  it('returns 500 on error', async () => {
    mockListBillingHistory.mockRejectedValue(new Error('db error'));
    const req = makeReq();
    const res = makeRes();
    await ctrl.getHistory(req, res as any);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
  });
});

describe('BillingController.getInvoice', () => {
  let ctrl: BillingController;
  beforeEach(() => {
    vi.clearAllMocks();
    ctrl = new BillingController();
  });

  it('returns 200 with invoice data', async () => {
    const invoice = { id: 'inv-1', amountCents: 900, status: 'paid' };
    mockGetInvoice.mockResolvedValue(invoice);
    const req = makeReq({ params: { invoiceId: 'inv-1' } });
    const res = makeRes();
    await ctrl.getInvoice(req, res as any);
    expect(res.json).toHaveBeenCalledWith(invoice);
  });

  it('returns 404 when invoice not found', async () => {
    mockGetInvoice.mockResolvedValue(null);
    const req = makeReq({ params: { invoiceId: 'inv-missing' } });
    const res = makeRes();
    await ctrl.getInvoice(req, res as any);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
  });

  it('returns 500 on error', async () => {
    mockGetInvoice.mockRejectedValue(new Error('db'));
    const req = makeReq({ params: { invoiceId: 'inv-1' } });
    const res = makeRes();
    await ctrl.getInvoice(req, res as any);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('BillingController.createCheckoutSession', () => {
  let ctrl: BillingController;
  beforeEach(() => {
    vi.clearAllMocks();
    ctrl = new BillingController();
  });

  it('returns 200 with session data on success', async () => {
    const session = { checkoutUrl: 'https://stripe.com', sessionId: 'cs_1', expiresAt: '2026-01-01T00:00:00Z' };
    mockCreateCheckoutSession.mockResolvedValue(session);
    const req = makeReq({ body: { plan: 'monthly' } });
    const res = makeRes();
    await ctrl.createCheckoutSession(req, res as any);
    expect(res.json).toHaveBeenCalledWith(session);
  });

  it('returns 500 for STRIPE_SECRET_KEY_NOT_CONFIGURED', async () => {
    mockCreateCheckoutSession.mockRejectedValue(new Error('STRIPE_SECRET_KEY_NOT_CONFIGURED'));
    const req = makeReq();
    const res = makeRes();
    await ctrl.createCheckoutSession(req, res as any);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Billing is not configured' }));
  });

  it('returns 409 for ALREADY_ACTIVE_MEMBER', async () => {
    mockCreateCheckoutSession.mockRejectedValue(new Error('ALREADY_ACTIVE_MEMBER'));
    const req = makeReq();
    const res = makeRes();
    await ctrl.createCheckoutSession(req, res as any);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('active membership') }));
  });

  it('returns 409 for NO_MEMBERSHIP_TIER_AVAILABLE', async () => {
    mockCreateCheckoutSession.mockRejectedValue(new Error('NO_MEMBERSHIP_TIER_AVAILABLE'));
    const req = makeReq();
    const res = makeRes();
    await ctrl.createCheckoutSession(req, res as any);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('tier') }));
  });

  it('returns 404 for USER_NOT_FOUND', async () => {
    mockCreateCheckoutSession.mockRejectedValue(new Error('USER_NOT_FOUND'));
    const req = makeReq();
    const res = makeRes();
    await ctrl.createCheckoutSession(req, res as any);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 500 for unknown errors', async () => {
    mockCreateCheckoutSession.mockRejectedValue(new Error('Unexpected Stripe error'));
    const req = makeReq();
    const res = makeRes();
    await ctrl.createCheckoutSession(req, res as any);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('BillingController.cancelSubscription', () => {
  let ctrl: BillingController;
  beforeEach(() => {
    vi.clearAllMocks();
    ctrl = new BillingController();
  });

  it('returns 200 with cancellation result', async () => {
    const result = { cancelledAt: '2026-01-01T00:00:00Z', status: 'cancelled' as const };
    mockCancelSubscription.mockResolvedValue(result);
    const req = makeReq({ params: { subscriptionId: 'sub_1' } });
    const res = makeRes();
    await ctrl.cancelSubscription(req, res as any);
    expect(res.json).toHaveBeenCalledWith(result);
  });

  it('returns 500 for STRIPE_SECRET_KEY_NOT_CONFIGURED', async () => {
    mockCancelSubscription.mockRejectedValue(new Error('STRIPE_SECRET_KEY_NOT_CONFIGURED'));
    const req = makeReq({ params: { subscriptionId: 'sub_1' } });
    const res = makeRes();
    await ctrl.cancelSubscription(req, res as any);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('returns 404 for USER_NOT_FOUND', async () => {
    mockCancelSubscription.mockRejectedValue(new Error('USER_NOT_FOUND'));
    const req = makeReq({ params: { subscriptionId: 'sub_1' } });
    const res = makeRes();
    await ctrl.cancelSubscription(req, res as any);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 404 for SUBSCRIPTION_NOT_FOUND', async () => {
    mockCancelSubscription.mockRejectedValue(new Error('SUBSCRIPTION_NOT_FOUND'));
    const req = makeReq({ params: { subscriptionId: 'sub_1' } });
    const res = makeRes();
    await ctrl.cancelSubscription(req, res as any);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 500 for unknown errors', async () => {
    mockCancelSubscription.mockRejectedValue(new Error('Network error'));
    const req = makeReq({ params: { subscriptionId: 'sub_1' } });
    const res = makeRes();
    await ctrl.cancelSubscription(req, res as any);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('BillingController.stripeWebhook', () => {
  let ctrl: BillingController;
  beforeEach(() => {
    vi.clearAllMocks();
    ctrl = new BillingController();
  });

  it('returns 200 received:true on success', async () => {
    mockHandleStripeWebhook.mockResolvedValue(undefined);
    const req = makeReq({
      headers: { 'stripe-signature': 'sig_valid' },
      body: Buffer.from('{}'),
    });
    const res = makeRes();
    await ctrl.stripeWebhook(req, res as any);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it('returns 400 for MISSING_STRIPE_SIGNATURE', async () => {
    mockHandleStripeWebhook.mockRejectedValue(new Error('MISSING_STRIPE_SIGNATURE'));
    const req = makeReq({ headers: {}, body: Buffer.from('{}') });
    const res = makeRes();
    await ctrl.stripeWebhook(req, res as any);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('signature') }));
  });

  it('returns 500 for STRIPE_WEBHOOK_SECRET_NOT_CONFIGURED', async () => {
    mockHandleStripeWebhook.mockRejectedValue(new Error('STRIPE_WEBHOOK_SECRET_NOT_CONFIGURED'));
    const req = makeReq({ headers: { 'stripe-signature': 'sig' }, body: Buffer.from('{}') });
    const res = makeRes();
    await ctrl.stripeWebhook(req, res as any);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('returns 500 for STRIPE_SECRET_KEY_NOT_CONFIGURED', async () => {
    mockHandleStripeWebhook.mockRejectedValue(new Error('STRIPE_SECRET_KEY_NOT_CONFIGURED'));
    const req = makeReq({ headers: { 'stripe-signature': 'sig' }, body: Buffer.from('{}') });
    const res = makeRes();
    await ctrl.stripeWebhook(req, res as any);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('returns 400 for invalid signature (Stripe SDK throws)', async () => {
    mockHandleStripeWebhook.mockRejectedValue(new Error('No signatures found matching'));
    const req = makeReq({ headers: { 'stripe-signature': 'bad_sig' }, body: Buffer.from('{}') });
    const res = makeRes();
    await ctrl.stripeWebhook(req, res as any);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Invalid webhook payload' }));
  });

  it('uses raw Buffer body for webhook verification', async () => {
    mockHandleStripeWebhook.mockResolvedValue(undefined);
    const rawBody = Buffer.from('{"type":"checkout.session.completed"}');
    const req = makeReq({
      headers: { 'stripe-signature': 'sig_valid' },
      body: rawBody,
    });
    const res = makeRes();
    await ctrl.stripeWebhook(req, res as any);
    // Verify the service was called with a Buffer
    expect(mockHandleStripeWebhook).toHaveBeenCalledWith(
      'sig_valid',
      expect.any(Buffer)
    );
  });

  it('returns 500 when body is not Buffer (fail-fast)', async () => {
    const req = makeReq({
      headers: { 'stripe-signature': 'sig_valid' },
      body: { type: 'checkout.session.completed' }, // plain object, not Buffer
    });
    const res = makeRes();
    await ctrl.stripeWebhook(req, res as any);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
    expect(mockHandleStripeWebhook).not.toHaveBeenCalled();
  });
});
