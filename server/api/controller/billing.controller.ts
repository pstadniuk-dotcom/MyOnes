import { Request, Response } from 'express';
import { z } from 'zod';
import logger from '../../infra/logging/logger';
import { billingService } from '../../modules/billing/billing.service';

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
      logger.error('Error processing checkout', { error });
      res.status(500).json({ error: 'Failed to process checkout' });
    }
  }

  async cancelSubscription(req: Request, res: Response) {
    try {
      const userId = req.userId!;
      const { subscriptionId } = req.params;
      const result = await billingService.cancelSubscription(userId, subscriptionId);
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
}

export const billingController = new BillingController();
