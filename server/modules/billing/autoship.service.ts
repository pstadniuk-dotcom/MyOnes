/**
 * AutoShip Service
 * ────────────────────────────────────────────────────────────────
 * Manages recurring formula shipments (every 8 weeks).
 *
 * Flow:
 *  1. After first formula purchase → createAutoShip()
 *     Creates a Stripe subscription with an 8-week trial (no immediate charge)
 *     so the first auto-shipment charge happens 8 weeks after initial purchase.
 *  2. invoice.paid webhook → processAutoShipRenewal()
 *     Gets fresh manufacturer quote, creates order, triggers fulfillment.
 *  3. Formula change → syncFormulaPrice()
 *     Fetches new quote, updates Stripe subscription price.
 *  4. Scheduler (10 days pre-renewal) → refreshPreRenewalQuote()
 *     Ensures quote is fresh before Stripe charges.
 *  5. User controls → pause / resume / cancel / skipNext
 * ────────────────────────────────────────────────────────────────
 */

import Stripe from 'stripe';
import { autoShipRepository } from './autoship.repository';
import { usersRepository } from '../users/users.repository';
import { formulasRepository } from '../formulas/formulas.repository';
import { consentsRepository } from '../consents/consents.repository';
import { manufacturerPricingService } from '../formulas/manufacturer-pricing.service';
import { notificationsService } from '../notifications/notifications.service';
import { sendNotificationEmail } from '../../utils/emailService';
import logger from '../../infra/logging/logger';
import type { AutoShipSubscription } from '@shared/schema';

const SUPPLY_WEEKS = 8;
const MEMBER_DISCOUNT = 0.85; // 15% discount for members

export class AutoShipService {
  private getStripeClient(): Stripe {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
    return new Stripe(key);
  }

  // ──────────────────────────────────────────────────────────────
  // 1. CREATE AUTO-SHIP (after first formula checkout)
  // ──────────────────────────────────────────────────────────────
  async createAutoShip(opts: {
    userId: string;
    formulaId: string;
    formulaVersion: number;
    priceCents: number;
    manufacturerCostCents: number;
    memberDiscountApplied: boolean;
    quoteId?: string;
    quoteExpiresAt?: string;
  }): Promise<AutoShipSubscription> {
    const stripe = this.getStripeClient();
    const user = await usersRepository.getUser(opts.userId);
    if (!user) throw new Error('USER_NOT_FOUND');

    // Check if user already has an auto-ship
    const existing = await autoShipRepository.getByUserId(opts.userId);
    if (existing && existing.status === 'active') {
      logger.info('Auto-ship already exists, updating formula', { userId: opts.userId, autoShipId: existing.id });
      return this.syncFormulaPrice({
        userId: opts.userId,
        formulaId: opts.formulaId,
        formulaVersion: opts.formulaVersion,
      });
    }

    // Ensure we have a Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await usersRepository.updateUser(user.id, { stripeCustomerId: customerId });
    }

    // Create a Stripe Product for auto-ship formulae
    const product = await stripe.products.create({
      name: `Ones Formula Auto-Ship`,
      metadata: { userId: opts.userId, type: 'auto_ship' },
    });

    // Create recurring price (8-week cycle)
    const price = await stripe.prices.create({
      product: product.id,
      currency: 'usd',
      unit_amount: opts.priceCents,
      recurring: {
        interval: 'week',
        interval_count: SUPPLY_WEEKS,
      },
    });

    // Create subscription with trial_end = 8 weeks (first auto-charge happens then)
    const trialEnd = Math.floor(Date.now() / 1000) + (SUPPLY_WEEKS * 7 * 24 * 60 * 60);
    const nextShipmentDate = new Date(trialEnd * 1000);

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: price.id }],
      trial_end: trialEnd,
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      metadata: {
        type: 'auto_ship',
        userId: opts.userId,
        formulaId: opts.formulaId,
        formulaVersion: String(opts.formulaVersion),
      },
    });

    // Save to database
    const autoShip = await autoShipRepository.create({
      userId: opts.userId,
      formulaId: opts.formulaId,
      formulaVersion: opts.formulaVersion,
      stripeSubscriptionId: subscription.id,
      stripeProductId: product.id,
      stripePriceId: price.id,
      status: 'active',
      priceCents: opts.priceCents,
      manufacturerCostCents: opts.manufacturerCostCents,
      supplyWeeks: SUPPLY_WEEKS,
      nextShipmentDate,
      lastQuoteId: opts.quoteId || null,
      lastQuoteExpiresAt: opts.quoteExpiresAt ? new Date(opts.quoteExpiresAt) : null,
      memberDiscountApplied: opts.memberDiscountApplied,
    });

    logger.info('Auto-ship subscription created', {
      autoShipId: autoShip.id,
      userId: opts.userId,
      formulaId: opts.formulaId,
      stripeSubscriptionId: subscription.id,
      priceCents: opts.priceCents,
      nextShipmentDate: nextShipmentDate.toISOString(),
    });

    // Notify user
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'https://ones.health';

      if (await notificationsService.shouldSendEmail(opts.userId, 'billing')) {
        await sendNotificationEmail({
          to: user.email,
          subject: 'Your Ones auto-ship is set up!',
          title: 'Auto-Ship Active',
          type: 'order_update',
          content: `
            <p>Hi ${user.name?.split(' ')[0] || 'there'},</p>
            <p>Great news — your formula will now auto-ship every ${SUPPLY_WEEKS} weeks so you never run out.</p>
            <p>Your next shipment is scheduled for <strong>${nextShipmentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong>.</p>
            <p>You can pause, skip, or cancel at any time from your dashboard.</p>
          `,
          actionUrl: `${frontendUrl}/dashboard/formula`,
          actionText: 'Manage Auto-Ship',
        });
      }

      await notificationsService.create({
        userId: opts.userId,
        type: 'order_update',
        title: 'Auto-Ship Active',
        content: `Your formula will auto-ship every ${SUPPLY_WEEKS} weeks. Next shipment: ${nextShipmentDate.toLocaleDateString()}.`,
        metadata: { actionUrl: '/dashboard/formula', icon: 'repeat', priority: 'low' },
      });
    } catch (err) {
      logger.warn('Failed to send auto-ship creation notification', { userId: opts.userId, error: err });
    }

    return autoShip;
  }

  // ──────────────────────────────────────────────────────────────
  // 2. PROCESS RENEWAL (called from invoice.paid webhook)
  // ──────────────────────────────────────────────────────────────
  async processAutoShipRenewal(stripeSubscriptionId: string, invoiceAmountCents: number): Promise<void> {
    const autoShip = await autoShipRepository.getByStripeSubscriptionId(stripeSubscriptionId);
    if (!autoShip) {
      logger.warn('Auto-ship renewal for unknown subscription', { stripeSubscriptionId });
      return;
    }

    const user = await usersRepository.getUser(autoShip.userId);
    if (!user) {
      logger.error('Auto-ship renewal for missing user', { autoShipId: autoShip.id, userId: autoShip.userId });
      return;
    }

    // 1. Resolve current active formula
    const formula = await formulasRepository.getCurrentFormulaByUser(autoShip.userId);
    if (!formula) {
      logger.error('Auto-ship renewal: no active formula found', { userId: autoShip.userId, autoShipId: autoShip.id });
      // Still mark the auto-ship as needing attention
      await autoShipRepository.update(autoShip.id, { status: 'paused' as any });
      await this.notifyAutoShipIssue(user, 'No active formula found for your auto-ship. We\'ve paused it until you set up a formula.');
      return;
    }

    // 2. Get fresh manufacturer quote
    const quote = await manufacturerPricingService.quoteFormula({
      bases: (formula.bases as any[]) || [],
      additions: (formula.additions as any[]) || [],
      targetCapsules: (formula.targetCapsules as number) || 9,
    }, (formula.targetCapsules as number) || 9);

    if (!quote.available || !quote.total || !quote.quoteId) {
      logger.error('Auto-ship renewal: manufacturer quote failed', {
        autoShipId: autoShip.id,
        userId: autoShip.userId,
        quoteAvailable: quote.available,
        reason: (quote as any).reason,
      });
      await this.notifyAutoShipIssue(user, 'We couldn\'t get a pricing quote for your formula. Our team has been notified and will follow up.');
      return;
    }

    // 3. Build consent snapshot
    let consentSnapshot: any = null;
    try {
      const allConsents = await consentsRepository.getUserConsents(autoShip.userId);
      const activeConsents = allConsents.filter((c: any) => c.granted && !c.revokedAt);
      const safetyValidation = (formula as any).safetyValidation;
      consentSnapshot = {
        activeConsents: activeConsents.map((c: any) => ({
          consentType: c.consentType,
          grantedAt: c.grantedAt.toISOString(),
          consentVersion: c.consentVersion,
        })),
        formulaWarnings: safetyValidation?.warnings || [],
        warningsAcknowledgedAt: formula.warningsAcknowledgedAt?.toISOString() || null,
        disclaimerVersion: '1.0',
        disclaimerText: 'Auto-ship renewal — formula previously consented.',
        ipAddress: null,
        userAgent: 'auto-ship-system',
        capturedAt: new Date().toISOString(),
      };
    } catch (err) {
      logger.warn('Auto-ship: failed to build consent snapshot', { userId: autoShip.userId, error: err });
    }

    // 4. Create order
    const order = await usersRepository.createOrder({
      userId: autoShip.userId,
      formulaId: formula.id,
      formulaVersion: formula.version,
      status: 'processing',
      amountCents: invoiceAmountCents,
      manufacturerCostCents: Math.round((quote.manufacturerCost ?? 0) * 100),
      supplyWeeks: SUPPLY_WEEKS,
      manufacturerQuoteId: quote.quoteId,
      manufacturerQuoteExpiresAt: quote.quoteExpiresAt ? new Date(quote.quoteExpiresAt) : null,
      autoShipSubscriptionId: autoShip.id,
      consentSnapshot,
    });

    logger.info('Auto-ship order created', {
      orderId: order.id,
      autoShipId: autoShip.id,
      userId: autoShip.userId,
      formulaId: formula.id,
      formulaVersion: formula.version,
      amountCents: invoiceAmountCents,
      quoteId: quote.quoteId,
    });

    // 5. Place manufacturer production order
    if (quote.quoteId) {
      const mfrResult = await manufacturerPricingService.placeManufacturerOrder(quote.quoteId);
      if (mfrResult.success) {
        await usersRepository.updateOrder(order.id, {
          manufacturerOrderId: mfrResult.orderId || null,
          manufacturerOrderStatus: 'submitted',
        });
        logger.info('Auto-ship manufacturer order placed', { orderId: order.id, manufacturerOrderId: mfrResult.orderId });
      } else {
        logger.error('Auto-ship manufacturer order failed — admin can retry', {
          orderId: order.id,
          quoteId: quote.quoteId,
          error: mfrResult.error,
        });
        await usersRepository.updateOrder(order.id, { manufacturerOrderStatus: 'failed' });
      }
    }

    // 6. Update auto-ship record
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + SUPPLY_WEEKS * 7);
    await autoShipRepository.update(autoShip.id, {
      formulaId: formula.id,
      formulaVersion: formula.version,
      lastQuoteId: quote.quoteId,
      lastQuoteExpiresAt: quote.quoteExpiresAt ? new Date(quote.quoteExpiresAt) : null,
      nextShipmentDate: nextDate,
      manufacturerCostCents: Math.round((quote.manufacturerCost ?? 0) * 100),
    });

    // 7. Send renewal notification
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'https://ones.health';

      if (await notificationsService.shouldSendEmail(autoShip.userId, 'billing')) {
        await sendNotificationEmail({
          to: user.email,
          subject: 'Your Ones formula is on its way!',
          title: 'Auto-Ship Order Placed',
          type: 'order_update',
          content: `
            <p>Hi ${user.name?.split(' ')[0] || 'there'},</p>
            <p>Your formula (v${formula.version}) has been re-ordered and is being prepared for shipment.</p>
            <p>Order total: <strong>$${(invoiceAmountCents / 100).toFixed(2)}</strong></p>
            <p>Next auto-ship: <strong>${nextDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong></p>
          `,
          actionUrl: `${frontendUrl}/dashboard/orders`,
          actionText: 'View Order',
        });
      }

      await notificationsService.create({
        userId: autoShip.userId,
        type: 'order_update',
        title: 'Auto-Ship Order Placed',
        content: `Formula v${formula.version} re-ordered — $${(invoiceAmountCents / 100).toFixed(2)}. Next shipment in ${SUPPLY_WEEKS} weeks.`,
        metadata: { actionUrl: '/dashboard/orders', icon: 'package', priority: 'medium' },
      });
    } catch (err) {
      logger.warn('Failed to send auto-ship renewal notification', { userId: autoShip.userId, error: err });
    }

    // 8. Send membership upgrade nudge for non-members
    const isActiveMember = !!(user.membershipTier && !user.membershipCancelledAt);
    if (!isActiveMember) {
      try {
        const frontendUrl = process.env.FRONTEND_URL || 'https://ones.health';
        const savingsCents = Math.round(invoiceAmountCents * (1 - MEMBER_DISCOUNT));
        const memberPriceDollars = ((invoiceAmountCents * MEMBER_DISCOUNT) / 100).toFixed(2);
        const savingsDollars = (savingsCents / 100).toFixed(2);
        const annualSavings = ((savingsCents / 100) * (52 / SUPPLY_WEEKS)).toFixed(2);

        if (await notificationsService.shouldSendEmail(autoShip.userId, 'billing')) {
          await sendNotificationEmail({
            to: user.email,
            subject: `You could have saved $${savingsDollars} on this order`,
            title: 'Unlock Smart Re-Order & Save 15%',
            type: 'order_update',
            content: `
              <p>Hi ${user.name?.split(' ')[0] || 'there'},</p>
              <p>You just paid <strong>$${(invoiceAmountCents / 100).toFixed(2)}</strong> for your formula auto-ship.
                 As a Ones member, that would have been <strong>$${memberPriceDollars}</strong> — 
                 saving you <strong>$${savingsDollars}</strong> this cycle alone.</p>
              <p>That's up to <strong>$${annualSavings}/year</strong> in savings.</p>
              <p>Plus, members get <strong>Smart Re-Order with AI Review</strong> — our AI analyzes your
                 wearable data before each shipment and recommends formula adjustments if your body's needs have changed.</p>
            `,
            actionUrl: `${frontendUrl}/dashboard/membership`,
            actionText: 'Explore Membership',
          });
        }
      } catch (err) {
        logger.warn('Failed to send membership upgrade nudge', { userId: autoShip.userId, error: err });
      }
    }
  }

  // ──────────────────────────────────────────────────────────────
  // 3. SYNC FORMULA PRICE (when formula changes)
  // ──────────────────────────────────────────────────────────────
  async syncFormulaPrice(opts: {
    userId: string;
    formulaId: string;
    formulaVersion: number;
  }): Promise<AutoShipSubscription> {
    const autoShip = await autoShipRepository.getByUserId(opts.userId);
    if (!autoShip || autoShip.status !== 'active') {
      throw new Error('NO_ACTIVE_AUTO_SHIP');
    }

    const user = await usersRepository.getUser(opts.userId);
    if (!user) throw new Error('USER_NOT_FOUND');

    const formula = await formulasRepository.getFormula(opts.formulaId);
    if (!formula) throw new Error('FORMULA_NOT_FOUND');

    // Get fresh quote
    const quote = await manufacturerPricingService.quoteFormula({
      bases: (formula.bases as any[]) || [],
      additions: (formula.additions as any[]) || [],
      targetCapsules: (formula.targetCapsules as number) || 9,
    }, (formula.targetCapsules as number) || 9);

    if (!quote.available || !quote.total) {
      throw new Error('FORMULA_PRICING_UNAVAILABLE');
    }

    const rawCents = Math.round(quote.total * 100);
    const isActiveMember = !!(user.membershipTier && !user.membershipCancelledAt);
    const applyDiscount = isActiveMember;
    const newPriceCents = applyDiscount ? Math.round(rawCents * MEMBER_DISCOUNT) : rawCents;
    const oldPriceCents = autoShip.priceCents;

    // Update Stripe subscription price if it changed
    if (newPriceCents !== oldPriceCents && autoShip.stripeSubscriptionId && autoShip.stripeProductId) {
      const stripe = this.getStripeClient();

      // Create new price
      const newPrice = await stripe.prices.create({
        product: autoShip.stripeProductId,
        currency: 'usd',
        unit_amount: newPriceCents,
        recurring: {
          interval: 'week',
          interval_count: SUPPLY_WEEKS,
        },
      });

      // Get current subscription items
      const sub = await stripe.subscriptions.retrieve(autoShip.stripeSubscriptionId);
      const currentItem = sub.items.data[0];
      if (currentItem) {
        await stripe.subscriptions.update(autoShip.stripeSubscriptionId, {
          items: [{
            id: currentItem.id,
            price: newPrice.id,
          }],
          proration_behavior: 'none', // Don't prorate — next charge uses new price
          metadata: {
            ...sub.metadata,
            formulaId: opts.formulaId,
            formulaVersion: String(opts.formulaVersion),
          },
        });
      }

      // Archive old price
      if (autoShip.stripePriceId) {
        try {
          await stripe.prices.update(autoShip.stripePriceId, { active: false });
        } catch (err) {
          logger.warn('Failed to deactivate old Stripe price', { priceId: autoShip.stripePriceId, error: err });
        }
      }

      logger.info('Auto-ship price updated on Stripe', {
        autoShipId: autoShip.id,
        userId: opts.userId,
        oldPriceCents,
        newPriceCents,
        newStripePriceId: newPrice.id,
      });

      // Notify user of price change
      if (oldPriceCents !== newPriceCents) {
        try {
          const frontendUrl = process.env.FRONTEND_URL || 'https://ones.health';
          const priceDiff = ((newPriceCents - oldPriceCents) / 100).toFixed(2);
          const direction = newPriceCents > oldPriceCents ? 'increased' : 'decreased';

          if (await notificationsService.shouldSendEmail(opts.userId, 'billing')) {
            await sendNotificationEmail({
              to: user.email,
              subject: `Your Ones auto-ship price has ${direction}`,
              title: 'Auto-Ship Price Update',
              type: 'order_update',
              content: `
                <p>Hi ${user.name?.split(' ')[0] || 'there'},</p>
                <p>Your formula has been updated (v${opts.formulaVersion}), and your auto-ship price has ${direction} by $${Math.abs(Number(priceDiff))}.</p>
                <p>New price: <strong>$${(newPriceCents / 100).toFixed(2)}</strong>/shipment${applyDiscount ? ' (member price)' : ''}</p>
                <p>This will take effect on your next auto-ship.</p>
              `,
              actionUrl: `${frontendUrl}/dashboard/formula`,
              actionText: 'View Details',
            });
          }

          await notificationsService.create({
            userId: opts.userId,
            type: 'formula_update',
            title: 'Auto-Ship Price Updated',
            content: `Your formula changed — new auto-ship price: $${(newPriceCents / 100).toFixed(2)}/shipment.`,
            metadata: { actionUrl: '/dashboard/formula', icon: 'dollar-sign', priority: 'medium' },
          });
        } catch (err) {
          logger.warn('Failed to send price change notification', { userId: opts.userId, error: err });
        }
      }

      // Update DB record
      const updated = await autoShipRepository.update(autoShip.id, {
        formulaId: opts.formulaId,
        formulaVersion: opts.formulaVersion,
        priceCents: newPriceCents,
        manufacturerCostCents: Math.round((quote.manufacturerCost ?? 0) * 100),
        stripePriceId: newPrice.id,
        lastQuoteId: quote.quoteId || null,
        lastQuoteExpiresAt: quote.quoteExpiresAt ? new Date(quote.quoteExpiresAt) : null,
        memberDiscountApplied: applyDiscount,
      });

      return updated!;
    }

    // Price unchanged — just update formula reference + quote
    const updated = await autoShipRepository.update(autoShip.id, {
      formulaId: opts.formulaId,
      formulaVersion: opts.formulaVersion,
      lastQuoteId: quote.quoteId || null,
      lastQuoteExpiresAt: quote.quoteExpiresAt ? new Date(quote.quoteExpiresAt) : null,
      manufacturerCostCents: Math.round((quote.manufacturerCost ?? 0) * 100),
      memberDiscountApplied: isActiveMember,
    });

    return updated!;
  }

  // ──────────────────────────────────────────────────────────────
  // 4. PRE-RENEWAL QUOTE REFRESH (called by scheduler)
  // ──────────────────────────────────────────────────────────────
  async refreshPreRenewalQuote(autoShipId: string): Promise<void> {
    const autoShip = await autoShipRepository.getById(autoShipId);
    if (!autoShip || autoShip.status !== 'active') return;

    const formula = await formulasRepository.getCurrentFormulaByUser(autoShip.userId);
    if (!formula) {
      logger.warn('Pre-renewal refresh: no active formula', { autoShipId, userId: autoShip.userId });
      return;
    }

    try {
      await this.syncFormulaPrice({
        userId: autoShip.userId,
        formulaId: formula.id,
        formulaVersion: formula.version,
      });
      logger.info('Pre-renewal quote refreshed', { autoShipId, userId: autoShip.userId });
    } catch (err) {
      logger.error('Pre-renewal quote refresh failed', { autoShipId, userId: autoShip.userId, error: err });
    }
  }

  // ──────────────────────────────────────────────────────────────
  // 5. USER CONTROLS
  // ──────────────────────────────────────────────────────────────

  async getAutoShip(userId: string): Promise<AutoShipSubscription | undefined> {
    return autoShipRepository.getByUserId(userId);
  }

  async pauseAutoShip(userId: string): Promise<AutoShipSubscription> {
    const autoShip = await autoShipRepository.getByUserId(userId);
    if (!autoShip || autoShip.status !== 'active') {
      throw new Error('NO_ACTIVE_AUTO_SHIP');
    }

    if (autoShip.stripeSubscriptionId) {
      const stripe = this.getStripeClient();
      await stripe.subscriptions.update(autoShip.stripeSubscriptionId, {
        pause_collection: { behavior: 'void' },
      });
    }

    const updated = await autoShipRepository.update(autoShip.id, { status: 'paused' as any });

    logger.info('Auto-ship paused', { autoShipId: autoShip.id, userId });

    try {
      await notificationsService.create({
        userId,
        type: 'order_update',
        title: 'Auto-Ship Paused',
        content: 'Your auto-ship has been paused. You can resume it anytime from your dashboard.',
        metadata: { actionUrl: '/dashboard/formula', icon: 'pause-circle', priority: 'low' },
      });
    } catch (err) {
      logger.warn('Failed to send auto-ship pause notification', { userId, error: err });
    }

    return updated!;
  }

  async resumeAutoShip(userId: string): Promise<AutoShipSubscription> {
    const autoShip = await autoShipRepository.getByUserId(userId);
    if (!autoShip) {
      throw new Error('NO_AUTO_SHIP_FOUND');
    }
    if (autoShip.status !== 'paused') {
      throw new Error('AUTO_SHIP_NOT_PAUSED');
    }

    if (autoShip.stripeSubscriptionId) {
      const stripe = this.getStripeClient();
      await stripe.subscriptions.update(autoShip.stripeSubscriptionId, {
        pause_collection: '' as any, // Stripe clears pause when set to empty
      });
    }

    // Calculate next shipment date from now
    const nextShipmentDate = new Date();
    nextShipmentDate.setDate(nextShipmentDate.getDate() + SUPPLY_WEEKS * 7);

    const updated = await autoShipRepository.update(autoShip.id, {
      status: 'active' as any,
      nextShipmentDate,
    });

    logger.info('Auto-ship resumed', { autoShipId: autoShip.id, userId, nextShipmentDate: nextShipmentDate.toISOString() });

    try {
      await notificationsService.create({
        userId,
        type: 'order_update',
        title: 'Auto-Ship Resumed',
        content: `Auto-ship resumed. Next shipment: ${nextShipmentDate.toLocaleDateString()}.`,
        metadata: { actionUrl: '/dashboard/formula', icon: 'play-circle', priority: 'low' },
      });
    } catch (err) {
      logger.warn('Failed to send auto-ship resume notification', { userId, error: err });
    }

    return updated!;
  }

  async cancelAutoShip(userId: string): Promise<AutoShipSubscription> {
    const autoShip = await autoShipRepository.getByUserId(userId);
    if (!autoShip || autoShip.status === 'cancelled') {
      throw new Error('NO_AUTO_SHIP_TO_CANCEL');
    }

    if (autoShip.stripeSubscriptionId) {
      const stripe = this.getStripeClient();
      try {
        await stripe.subscriptions.cancel(autoShip.stripeSubscriptionId);
      } catch (err) {
        logger.warn('Failed to cancel Stripe auto-ship subscription', { stripeSubscriptionId: autoShip.stripeSubscriptionId, error: err });
      }
    }

    const updated = await autoShipRepository.update(autoShip.id, {
      status: 'cancelled' as any,
      nextShipmentDate: null,
    });

    logger.info('Auto-ship cancelled', { autoShipId: autoShip.id, userId });

    try {
      const user = await usersRepository.getUser(userId);
      if (user) {
        const frontendUrl = process.env.FRONTEND_URL || 'https://ones.health';

        if (await notificationsService.shouldSendEmail(userId, 'billing')) {
          await sendNotificationEmail({
            to: user.email,
            subject: 'Your Ones auto-ship has been cancelled',
            title: 'Auto-Ship Cancelled',
            type: 'order_update',
            content: `
              <p>Hi ${user.name?.split(' ')[0] || 'there'},</p>
              <p>Your auto-ship subscription has been cancelled. You won't be charged for future shipments.</p>
              <p>You can always set up auto-ship again from your dashboard, or place manual orders.</p>
            `,
            actionUrl: `${frontendUrl}/dashboard/formula`,
            actionText: 'Visit Dashboard',
          });
        }

        await notificationsService.create({
          userId,
          type: 'order_update',
          title: 'Auto-Ship Cancelled',
          content: 'Your auto-ship has been cancelled. You can re-enable it or place manual orders anytime.',
          metadata: { actionUrl: '/dashboard/formula', icon: 'x-circle', priority: 'medium' },
        });
      }
    } catch (err) {
      logger.warn('Failed to send auto-ship cancel notification', { userId, error: err });
    }

    return updated!;
  }

  async skipNextShipment(userId: string): Promise<AutoShipSubscription> {
    const autoShip = await autoShipRepository.getByUserId(userId);
    if (!autoShip || autoShip.status !== 'active') {
      throw new Error('NO_ACTIVE_AUTO_SHIP');
    }

    if (autoShip.stripeSubscriptionId) {
      const stripe = this.getStripeClient();
      // Pause for one cycle: resume at next-shipment-date + 8 weeks
      const currentNext = autoShip.nextShipmentDate || new Date();
      const resumeAt = new Date(currentNext);
      resumeAt.setDate(resumeAt.getDate() + SUPPLY_WEEKS * 7);

      await stripe.subscriptions.update(autoShip.stripeSubscriptionId, {
        pause_collection: {
          behavior: 'void',
          resumes_at: Math.floor(resumeAt.getTime() / 1000),
        },
      });

      // Update next shipment date to the resumed date
      const updated = await autoShipRepository.update(autoShip.id, {
        nextShipmentDate: resumeAt,
      });

      logger.info('Auto-ship next shipment skipped', {
        autoShipId: autoShip.id,
        userId,
        skippedDate: currentNext.toISOString(),
        resumesAt: resumeAt.toISOString(),
      });

      try {
        await notificationsService.create({
          userId,
          type: 'order_update',
          title: 'Next Shipment Skipped',
          content: `Your next auto-ship has been skipped. Resuming ${resumeAt.toLocaleDateString()}.`,
          metadata: { actionUrl: '/dashboard/formula', icon: 'skip-forward', priority: 'low' },
        });
      } catch (err) {
        logger.warn('Failed to send skip notification', { userId, error: err });
      }

      return updated!;
    }

    throw new Error('AUTO_SHIP_NOT_LINKED_TO_STRIPE');
  }

  // ──────────────────────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────────────────────
  private async notifyAutoShipIssue(user: { id: string; email: string; name: string | null }, message: string): Promise<void> {
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'https://ones.health';

      if (await notificationsService.shouldSendEmail(user.id, 'billing')) {
        await sendNotificationEmail({
          to: user.email,
          subject: 'Issue with your Ones auto-ship',
          title: 'Auto-Ship Issue',
          type: 'order_update',
          content: `
            <p>Hi ${user.name?.split(' ')[0] || 'there'},</p>
            <p>${message}</p>
            <p>Please check your dashboard or contact support for help.</p>
          `,
          actionUrl: `${frontendUrl}/dashboard/formula`,
          actionText: 'View Dashboard',
        });
      }

      await notificationsService.create({
        userId: user.id,
        type: 'order_update',
        title: 'Auto-Ship Issue',
        content: message,
        metadata: { actionUrl: '/dashboard/formula', icon: 'alert-triangle', priority: 'high' },
      });
    } catch (err) {
      logger.warn('Failed to send auto-ship issue notification', { userId: user.id, error: err });
    }
  }
}

export const autoShipService = new AutoShipService();
