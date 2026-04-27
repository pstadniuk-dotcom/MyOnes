import { Request, Response } from 'express';
import { z } from 'zod';
import logger from '../../infra/logging/logger';
import { billingService } from '../../modules/billing/billing.service';
import posthog from '../../infra/posthog';
import { syncUserProperties } from '../../infra/posthog';

const addressSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(50),
  zip: z.string().min(3).max(20),
  country: z.string().max(5).optional(),
});

const checkoutPayloadSchema = z.object({
  paymentToken: z.string().min(1).max(500),
  formulaId: z.string().uuid().optional(),
  includeMembership: z.boolean().optional(),
  plan: z.enum(['monthly', 'quarterly', 'annual']).optional(),
  enableAutoShip: z.boolean().optional(),
  shippingAddress: addressSchema.optional(),
  billingAddress: addressSchema.optional(),
  discountCode: z.string().trim().min(1).max(64).optional(),
});

export class BillingController {
  async getEquivalentStack(req: Request, res: Response) {
    try {
      const userId = req.userId!;
      const formulaId = typeof req.query.formulaId === 'string' ? req.query.formulaId : '';
      const result = await billingService.getEquivalentStack(userId, formulaId);
      return res.json(result);
    } catch (error: any) {
      if (error?.message === 'FORMULA_ID_REQUIRED') {
        return res.status(400).json({ error: 'formulaId query param is required' });
      }
      if (error?.message === 'FORMULA_NOT_FOUND_OR_ACCESS_DENIED') {
        return res.status(404).json({ error: 'Formula not found or access denied' });
      }
      logger.error('Error computing equivalent stack', { error });
      return res.status(500).json({ error: 'Failed to calculate equivalent stack estimate' });
    }
  }

  async getHistory(req: Request, res: Response) {
    try {
      const userId = req.userId!;
      const history = await billingService.listBillingHistory(userId);
      res.json({
        items: history,
        currency: 'USD',
      });
    } catch (error) {
      logger.error('Error fetching billing history', { error });
      res.status(500).json({ error: 'Failed to fetch billing history' });
    }
  }

  async getInvoice(req: Request, res: Response) {
    try {
      const userId = req.userId!;
      const { invoiceId } = req.params;
      const invoice = await billingService.getInvoice(userId, invoiceId);

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      res.json(invoice);
    } catch (error) {
      logger.error('Error fetching invoice', { error });
      res.status(500).json({ error: 'Failed to fetch invoice' });
    }
  }

  async processCheckout(req: Request, res: Response) {
    try {
      const userId = req.userId!;
      const parsed = checkoutPayloadSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid checkout data', details: parsed.error.flatten().fieldErrors });
      }
      const result = await billingService.processCheckout(userId, parsed.data, req);
      posthog.capture({
        distinctId: userId,
        event: 'checkout_completed',
        properties: {
          plan: parsed.data.plan,
          include_membership: parsed.data.includeMembership,
          enable_auto_ship: parsed.data.enableAutoShip,
          has_formula: !!parsed.data.formulaId,
          has_discount_code: !!parsed.data.discountCode,
          order_id: (result as any)?.orderId,
          total_cents: (result as any)?.totalCents,
        },
      });
      // Fire derived lifecycle events so funnels in PostHog stay clean
      if (parsed.data.includeMembership) {
        posthog.capture({
          distinctId: userId,
          event: 'subscription_started',
          properties: { plan: parsed.data.plan, source: 'checkout' },
        });
      }
      if (parsed.data.enableAutoShip) {
        posthog.capture({
          distinctId: userId,
          event: 'auto_ship_enabled',
          properties: { source: 'checkout' },
        });
      }
      void syncUserProperties(userId);
      return res.json(result);
    } catch (error: any) {
      if (error?.message === 'ALREADY_ACTIVE_MEMBER') {
        return res.status(409).json({ error: 'User already has an active membership' });
      }
      if (error?.message === 'NO_MEMBERSHIP_TIER_AVAILABLE') {
        return res.status(409).json({ error: 'No membership tier currently available' });
      }
      if (error?.message === 'FORMULA_NOT_FOUND_OR_ACCESS_DENIED') {
        return res.status(404).json({ error: 'Formula not found or access denied' });
      }
      if (error?.message === 'SAFETY_WARNINGS_NOT_ACKNOWLEDGED') {
        return res.status(403).json({
          error: 'You must acknowledge the safety warnings for this formula before proceeding to checkout.',
          code: 'SAFETY_WARNINGS_NOT_ACKNOWLEDGED',
        });
      }
      if (error?.message === 'MEDICAL_DISCLOSURE_NOT_ACKNOWLEDGED') {
        return res.status(403).json({
          error: 'You must confirm your medical disclosure before proceeding to checkout.',
          code: 'MEDICAL_DISCLOSURE_NOT_ACKNOWLEDGED',
        });
      }
      if (error?.message === 'PAYMENT_TOKEN_REQUIRED') {
        return res.status(400).json({ error: 'Payment token is required' });
      }
      if (error?.message === 'FORMULA_ID_REQUIRED') {
        return res.status(400).json({ error: 'Formula ID is required for non-membership checkout' });
      }
      if (error?.message === 'FORMULA_PRICING_UNAVAILABLE') {
        return res.status(409).json({ error: 'Formula pricing is currently unavailable' });
      }
      if (error?.message === 'FORMULA_NEEDS_REFORMULATION') {
        return res.status(409).json({
          error: 'Your formula contains ingredients that are no longer available. Please chat with your AI practitioner to update your formula.',
          code: 'FORMULA_NEEDS_REFORMULATION',
        });
      }
      if (error?.message === 'PAYMENT_PROCESSING_ERROR') {
        return res.status(502).json({ error: 'Payment processing error. Please try again.' });
      }
      if (typeof error?.message === 'string' && error.message.startsWith('PAYMENT_DECLINED:')) {
        return res.status(402).json({ error: error.message.replace('PAYMENT_DECLINED: ', ''), code: 'PAYMENT_DECLINED' });
      }
      if (error?.message === 'USER_NOT_FOUND') {
        return res.status(404).json({ error: 'User not found' });
      }
      if (error?.message === 'CHECKOUT_TOTAL_INVALID') {
        return res.status(400).json({ error: 'Invalid checkout total. Please refresh and try again.' });
      }
      if (error?.message === 'ORDER_PERSIST_FAILED') {
        return res.status(500).json({ error: 'Payment processed but order creation failed. Support has been notified.' });
      }
      if (typeof error?.message === 'string' && error.message.startsWith('DISCOUNT_CODE_')) {
        const code = error.message.replace('DISCOUNT_CODE_', '');
        const messages: Record<string, string> = {
          NOT_FOUND: 'That discount code does not exist.',
          INACTIVE: 'That discount code is no longer active.',
          EXPIRED: 'That discount code has expired.',
          EXHAUSTED: 'That discount code has reached its usage limit.',
          USER_LIMIT: 'You have already used this discount code.',
          MIN_ORDER: 'Your order does not meet the minimum amount for this discount code.',
          FIRST_ORDER_ONLY: 'This discount code is only valid on your first order.',
        };
        return res.status(400).json({ error: messages[code] ?? 'Invalid discount code.', code: `DISCOUNT_CODE_${code}` });
      }

      const errMessage = typeof error?.message === 'string' ? error.message : undefined;
      const errName = typeof error?.name === 'string' ? error.name : undefined;
      logger.error('Error processing checkout', {
        name: errName,
        message: errMessage,
        stack: typeof error?.stack === 'string' ? error.stack : undefined,
        userId: req.userId,
      });

      const isProd = process.env.NODE_ENV === 'production';
      return res.status(500).json({
        error: 'Failed to process checkout',
        code: 'CHECKOUT_FAILED',
        ...(isProd ? {} : { details: errMessage || String(error) }),
      });
    }
  }

  async cancelSubscription(req: Request, res: Response) {
    try {
      const userId = req.userId!;
      const { subscriptionId } = req.params;
      const result = await billingService.cancelSubscription(userId, subscriptionId);
      posthog.capture({ distinctId: userId, event: 'subscription_cancelled', properties: { subscription_id: subscriptionId } });
      void syncUserProperties(userId);
      return res.json(result);
    } catch (error: any) {
      if (error?.message === 'USER_NOT_FOUND') {
        return res.status(404).json({ error: 'User not found' });
      }
      if (error?.message === 'SUBSCRIPTION_NOT_FOUND') {
        return res.status(404).json({ error: 'Subscription not found' });
      }
      logger.error('Error cancelling subscription', { error });
      res.status(500).json({ error: 'Failed to cancel subscription' });
    }
  }

  async resumeSubscription(req: Request, res: Response) {
    try {
      const userId = req.userId!;
      const { subscriptionId } = req.params;
      const result = await billingService.resumeSubscription(userId, subscriptionId);
      posthog.capture({ distinctId: userId, event: 'subscription_resumed', properties: { subscription_id: subscriptionId } });
      void syncUserProperties(userId);
      return res.json(result);
    } catch (error: any) {
      if (error?.message === 'USER_NOT_FOUND') {
        return res.status(404).json({ error: 'User not found' });
      }
      if (error?.message === 'SUBSCRIPTION_NOT_FOUND') {
        return res.status(404).json({ error: 'Subscription not found' });
      }
      logger.error('Error resuming subscription', { error });
      res.status(500).json({ error: 'Failed to resume subscription' });
    }
  }

  async cancelOrder(req: Request, res: Response) {
    try {
      const userId = req.userId!;
      const { orderId } = req.params;
      const result = await billingService.cancelOrder(userId, orderId);

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.json(result);
    } catch (error: any) {
      if (error?.message === 'ORDER_NOT_FOUND') {
        return res.status(404).json({ error: 'Order not found' });
      }
      if (error?.message === 'ACCESS_DENIED') {
        return res.status(403).json({ error: 'Access denied' });
      }
      logger.error('Error cancelling order', { error });
      res.status(500).json({ error: 'Failed to cancel order' });
    }
  }
}

export const billingController = new BillingController();
