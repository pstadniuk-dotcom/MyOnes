import { Request, Response } from 'express';
import logger from '../../infra/logging/logger';
import { billingService } from '../../modules/billing/billing.service';

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

  async createCheckoutSession(req: Request, res: Response) {
    try {
      const userId = req.userId!;
      const session = await billingService.createCheckoutSession(userId, req.body || {}, req);
      return res.json(session);
    } catch (error: any) {
      if (error?.message === 'STRIPE_SECRET_KEY_NOT_CONFIGURED') {
        return res.status(500).json({ error: 'Billing is not configured' });
      }
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
      if (error?.message === 'FORMULA_ID_REQUIRED') {
        return res.status(400).json({ error: 'Formula ID is required for non-membership checkout' });
      }
      if (error?.message === 'FORMULA_PRICING_UNAVAILABLE') {
        return res.status(409).json({ error: 'Formula pricing is currently unavailable' });
      }
      if (error?.message === 'USER_NOT_FOUND') {
        return res.status(404).json({ error: 'User not found' });
      }
      logger.error('Error creating checkout session', { error });
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  }

  async cancelSubscription(req: Request, res: Response) {
    try {
      const userId = req.userId!;
      const { subscriptionId } = req.params;
      const result = await billingService.cancelSubscription(userId, subscriptionId);
      return res.json(result);
    } catch (error: any) {
      if (error?.message === 'STRIPE_SECRET_KEY_NOT_CONFIGURED') {
        return res.status(500).json({ error: 'Billing is not configured' });
      }
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

  async stripeWebhook(req: Request, res: Response) {
    try {
      const signature = req.headers['stripe-signature'];
      if (!Buffer.isBuffer(req.body)) {
        logger.error('Stripe webhook received non-Buffer body — express.raw() middleware may not be applied to this route');
        return res.status(500).json({ error: 'Webhook body parsing misconfigured' });
      }
      const rawBody = req.body;
      await billingService.handleStripeWebhook(
        typeof signature === 'string' ? signature : undefined,
        rawBody
      );
      return res.status(200).json({ received: true });
    } catch (error: any) {
      if (['STRIPE_WEBHOOK_SECRET_NOT_CONFIGURED', 'STRIPE_SECRET_KEY_NOT_CONFIGURED'].includes(error?.message)) {
        return res.status(500).json({ error: 'Billing webhook is not configured' });
      }
      if (error?.message === 'MISSING_STRIPE_SIGNATURE') {
        return res.status(400).json({ error: 'Missing stripe-signature header' });
      }
      logger.error('Stripe webhook processing failed', { error: error?.message || error });
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }
  }
}

export const billingController = new BillingController();
