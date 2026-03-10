import Stripe from 'stripe';
import { Request } from 'express';
import { usersRepository } from '../users/users.repository';
import { membershipRepository } from '../membership/membership.repository';
import { formulasRepository } from '../formulas/formulas.repository';
import { consentsRepository } from '../consents/consents.repository';
import { manufacturerPricingService } from '../formulas/manufacturer-pricing.service';
import { notificationsService } from '../notifications/notifications.service';
import { sendNotificationEmail } from '../../utils/emailService';
import { db } from '../../infra/db/db';
import { ingredientPricing } from '@shared/schema';
import { normalizeIngredientName } from '@shared/ingredients';
import { eq } from 'drizzle-orm';
import { autoShipService } from './autoship.service';
import { autoShipRepository } from './autoship.repository';
import logger from '../../infra/logging/logger';
import { getBaseUrl } from '../../utils/urlHelper';

type InternalSubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'past_due';

type BillingHistoryItem = {
  id: string;
  date: Date;
  description: string;
  amountCents: number | null;
  currency: 'USD';
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  invoiceId: string;
  invoiceUrl: string;
};

type BillingInvoice = {
  id: string;
  userId: string;
  orderId: string;
  amountCents: number | null;
  currency: 'USD';
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  issuedAt: Date;
  lineItems: Array<{
    label: string;
    formulaVersion: number;
    supplyMonths: number | null;
    amountCents: number | null;
  }>;
};

export interface BillingProvider {
  listBillingHistory(userId: string): Promise<BillingHistoryItem[]>;
  getInvoice(userId: string, invoiceId: string): Promise<BillingInvoice | null>;
  getEquivalentStack(userId: string, formulaId: string): Promise<{
    supplementsCount: number;
    capsulesPerDay: number;
    estimatedMonthlyCost: number | null;
    coveragePct: number;
    missingIngredients: string[];
  }>;
  createCheckoutSession(_userId: string, _payload: Record<string, any>, _req?: Request): Promise<{
    checkoutUrl: string;
    sessionId: string;
    expiresAt: string;
  }>;
  cancelSubscription(_userId: string, _subscriptionId: string): Promise<{
    cancelledAt: string;
    status: 'cancelled';
  }>;
  handleStripeWebhook(_signature: string | undefined, _rawBody: Buffer): Promise<void>;
}

class DatabaseBillingProvider implements BillingProvider {
  private readonly stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  private readonly stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  private getStripeClient(): Stripe {
    if (!this.stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY_NOT_CONFIGURED');
    }
    return new Stripe(this.stripeSecretKey);
  }

  private resolvePlan(plan: string | undefined): { plan: 'monthly' | 'quarterly' | 'annual'; intervalCount: number } {
    const normalized = String(plan || 'monthly').toLowerCase();
    if (normalized === 'quarterly') {
      return { plan: 'quarterly', intervalCount: 3 };
    }
    if (normalized === 'annual') {
      return { plan: 'annual', intervalCount: 12 };
    }
    return { plan: 'monthly', intervalCount: 1 };
  }

  private mapStripeStatus(status: Stripe.Subscription.Status): InternalSubscriptionStatus {
    if (status === 'active' || status === 'trialing') return 'active';
    if (status === 'past_due' || status === 'unpaid' || status === 'incomplete' || status === 'incomplete_expired') return 'past_due';
    if (status === 'paused') return 'paused';
    return 'cancelled';
  }

  private normalizeIngredientKey(name: string): string {
    return String(name || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  private async upsertInternalSubscription(
    userId: string,
    values: {
      plan: 'monthly' | 'quarterly' | 'annual';
      status: InternalSubscriptionStatus;
      stripeCustomerId?: string | null;
      stripeSubscriptionId?: string | null;
      renewsAt?: Date | null;
      pausedUntil?: Date | null;
    }
  ) {
    await usersRepository.upsertSubscriptionForUser(userId, {
      userId,
      plan: values.plan,
      status: values.status,
      stripeCustomerId: values.stripeCustomerId ?? null,
      stripeSubscriptionId: values.stripeSubscriptionId ?? null,
      renewsAt: values.renewsAt ?? null,
      pausedUntil: values.pausedUntil ?? null,
    });
  }

  private async handleCheckoutCompleted(event: Stripe.Event) {
    const session = event.data.object as Stripe.Checkout.Session;

    const metadata = session.metadata || {};
    const userId = metadata.userId;
    if (!userId) {
      logger.warn('Stripe checkout.session.completed missing userId metadata', { eventId: event.id });
      return;
    }

    const user = await usersRepository.getUser(userId);
    if (!user) {
      logger.warn('Stripe checkout.session.completed user not found', { userId, eventId: event.id });
      return;
    }

    const stripeCustomerId = typeof session.customer === 'string' ? session.customer : null;

    await usersRepository.updateUser(userId, {
      stripeCustomerId: stripeCustomerId || user.stripeCustomerId,
    });

    // ── Handle subscription (membership) ──────────────────────────────
    if (session.mode === 'subscription') {
      const stripeSubscriptionId = typeof session.subscription === 'string' ? session.subscription : null;
      const plan = this.resolvePlan(metadata.plan).plan;

      await usersRepository.updateUser(userId, {
        stripeSubscriptionId: stripeSubscriptionId || user.stripeSubscriptionId,
      });

      if (stripeSubscriptionId) {
        const stripe = this.getStripeClient();
        const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        const periodEnd = stripeSub.items?.data?.[0]?.current_period_end ?? null;
        await this.upsertInternalSubscription(userId, {
          plan,
          status: this.mapStripeStatus(stripeSub.status),
          stripeCustomerId,
          stripeSubscriptionId,
          renewsAt: periodEnd ? new Date(periodEnd * 1000) : null,
          pausedUntil: stripeSub.pause_collection?.resumes_at ? new Date(stripeSub.pause_collection.resumes_at * 1000) : null,
        });
      }

      if (!user.membershipTier || user.membershipCancelledAt) {
        const tierFromMetadata = metadata.membershipTier || '';
        const lockedPrice = Number(metadata.membershipPriceCents || 0);
        const tier = await membershipRepository.getMembershipTier(tierFromMetadata);
        const fallbackTier = await membershipRepository.getAvailableMembershipTier();
        const selectedTier = tier || fallbackTier;
        if (!selectedTier) {
          logger.warn('No membership tier available during Stripe checkout completion', { userId, eventId: event.id });
        } else {
          const effectivePrice = Number.isFinite(lockedPrice) && lockedPrice > 0 ? lockedPrice : selectedTier.priceCents;
          await membershipRepository.assignUserMembership(userId, selectedTier.tierKey, effectivePrice);
        }
      }
    }

    // ── Create order + place manufacturer production order ─────────────
    const formulaId = metadata.formulaId;
    const formulaVersion = Number(metadata.formulaVersion || 0);
    if (formulaId && formulaVersion > 0) {
      // ── Idempotency guard: prevent duplicate orders from Stripe webhook retries ──
      const existingOrder = await usersRepository.getOrderByStripeSessionId(session.id);
      if (existingOrder) {
        logger.warn('Duplicate checkout.session.completed webhook — order already exists', {
          orderId: existingOrder.id,
          stripeSessionId: session.id,
          eventId: event.id,
        });
        return;
      }

      const chargedCents = Number(metadata.formulaChargedCents || metadata.formulaPriceCents || 0);
      const mfrCostCents = Number(metadata.manufacturerCostCents || 0);
      let quoteId = metadata.manufacturerQuoteId || null;
      let quoteExpiresAt = metadata.manufacturerQuoteExpiresAt
        ? new Date(metadata.manufacturerQuoteExpiresAt)
        : null;

      // ── Quote expiration check: re-quote if the original quote has expired ──
      if (quoteId && quoteExpiresAt && quoteExpiresAt.getTime() < Date.now()) {
        logger.warn('Manufacturer quote expired — re-quoting before placing order', {
          quoteId,
          quoteExpiresAt: quoteExpiresAt.toISOString(),
          formulaId,
        });

        const formula = await formulasRepository.getFormula(formulaId);
        if (formula) {
          const freshQuote = await manufacturerPricingService.quoteFormula({
            bases: (formula.bases as any[]) || [],
            additions: (formula.additions as any[]) || [],
            targetCapsules: (formula.targetCapsules as number) || 9,
          }, (formula.targetCapsules as number) || 9);

          if (freshQuote.available && freshQuote.quoteId) {
            quoteId = freshQuote.quoteId;
            quoteExpiresAt = freshQuote.quoteExpiresAt ? new Date(freshQuote.quoteExpiresAt) : null;
            logger.info('Re-quote successful', { newQuoteId: quoteId, formulaId });
          } else {
            logger.error('Re-quote failed — order will proceed without manufacturer placement', {
              formulaId,
              reason: freshQuote.reason,
            });
            quoteId = null;
            quoteExpiresAt = null;
          }
        } else {
          logger.error('Formula not found for re-quote', { formulaId });
          quoteId = null;
          quoteExpiresAt = null;
        }
      }

      // ── Build order-level consent & safety snapshot ──────────────────
      let consentSnapshot: any = null;
      try {
        const formula = await formulasRepository.getFormula(formulaId);
        const userConsents = await consentsRepository.getUserConsents(userId);
        const activeConsents: Array<{ consentType: string; grantedAt: string; consentVersion: string }> = userConsents
          .filter(c => c.granted && !c.revokedAt)
          .map(c => ({
            consentType: c.consentType,
            grantedAt: c.grantedAt.toISOString(),
            consentVersion: c.consentVersion,
          }));

        const safetyValidation = (formula as any)?.safetyValidation;
        const formulaWarnings = safetyValidation?.warnings || [];

        consentSnapshot = {
          activeConsents,
          formulaWarnings,
          warningsAcknowledgedAt: formula?.warningsAcknowledgedAt
            ? formula.warningsAcknowledgedAt.toISOString()
            : null,
          disclaimerVersion: (formula as any)?.disclaimerVersion || '1.0',
          disclaimerText: 'These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease. Consult your healthcare provider before starting any supplement regimen. By placing this order, you confirm you have reviewed all safety warnings and accept full responsibility for your supplementation choices.',
          ipAddress: null, // Stripe webhook context — no direct user IP available
          userAgent: null,
          capturedAt: new Date().toISOString(),
        };
      } catch (snapErr) {
        logger.warn('Failed to build order consent snapshot', { userId, formulaId, error: snapErr });
      }

      // Create order record
      const order = await usersRepository.createOrder({
        userId,
        formulaId,
        formulaVersion,
        status: 'processing',
        amountCents: chargedCents,
        manufacturerCostCents: mfrCostCents,
        supplyWeeks: 8,
        manufacturerQuoteId: quoteId,
        manufacturerQuoteExpiresAt: quoteExpiresAt,
        stripeSessionId: session.id,
        ...(consentSnapshot ? { consentSnapshot } : {}),
      });

      logger.info('Order created from Stripe checkout', {
        orderId: order.id,
        userId,
        formulaId,
        formulaVersion,
        chargedCents,
        mfrCostCents,
        quoteId,
        hasConsentSnapshot: !!consentSnapshot,
      });

      // Update user's last order date
      await usersRepository.updateUser(userId, {
        lastOrderDate: new Date(),
      });

      // ── Send order confirmation email + in-app notification ──────────
      try {
        const frontendUrl = process.env.FRONTEND_URL || 'https://ones.health';
        const amountDisplay = chargedCents > 0 ? `$${(chargedCents / 100).toFixed(2)}` : '';

        if (await notificationsService.shouldSendEmail(userId, 'billing')) {
          await sendNotificationEmail({
            to: user.email,
            subject: 'Your Ones order is confirmed!',
            title: 'Order Confirmed',
            type: 'order_update',
            content: `
              <p>Hi ${user.name?.split(' ')[0] || 'there'},</p>
              <p>Great news — your personalized supplement order has been placed! 🎉</p>
              ${amountDisplay ? `<p><strong>Total:</strong> ${amountDisplay}</p>` : ''}
              <p><strong>Formula:</strong> V${formulaVersion}</p>
              <p><strong>Supply:</strong> 8 weeks</p>
              <p>We'll notify you when your formula ships. In the meantime, you can track your order status in your dashboard.</p>
            `,
            actionUrl: `${frontendUrl}/dashboard/orders`,
            actionText: 'View My Order',
          });
        }

        await notificationsService.create({
          userId,
          type: 'order_update',
          title: 'Order Confirmed',
          content: `Your supplement order (Formula V${formulaVersion}) has been placed and is being prepared.`,
          orderId: order.id,
          formulaId,
          metadata: {
            actionUrl: '/dashboard/orders',
            icon: 'package',
            priority: 'medium',
          },
        });
      } catch (notifErr) {
        logger.warn('Failed to send order confirmation notification', { userId, orderId: order.id, error: notifErr });
      }

      // Place production order with Alive if we have a quote
      if (quoteId) {
        const mfrResult = await manufacturerPricingService.placeManufacturerOrder(quoteId);
        if (mfrResult.success) {
          await usersRepository.updateOrder(order.id, {
            manufacturerOrderId: mfrResult.orderId || null,
            manufacturerOrderStatus: 'submitted',
          });
          logger.info('Manufacturer order placed successfully', {
            orderId: order.id,
            manufacturerOrderId: mfrResult.orderId,
          });
        } else {
          logger.error('Failed to place manufacturer order — admin can retry via POST /api/admin/orders/:id/retry-manufacturer', {
            orderId: order.id,
            quoteId,
            error: mfrResult.error,
          });
          await usersRepository.updateOrder(order.id, {
            manufacturerOrderStatus: 'failed',
          });
        }
      } else {
        logger.warn('No manufacturer quote_id available — cannot place production order', {
          orderId: order.id,
          formulaId,
        });
      }

      // ── Create auto-ship subscription for recurring formula deliveries ──
      // Only create auto-ship if the user opted in at checkout
      if (metadata.enableAutoShip !== '1') {
        logger.info('Auto-ship not enabled for this order — skipping', { userId, formulaId });
      } else try {
        const memberDiscountApplied = metadata.memberDiscountApplied === '1';
        await autoShipService.createAutoShip({
          userId,
          formulaId,
          formulaVersion,
          priceCents: chargedCents,
          manufacturerCostCents: mfrCostCents,
          memberDiscountApplied,
          quoteId: quoteId || undefined,
          quoteExpiresAt: quoteExpiresAt ? quoteExpiresAt.toISOString() : undefined,
        });
        logger.info('Auto-ship created after first formula order', { userId, formulaId });
      } catch (autoShipErr) {
        // Non-blocking: auto-ship failure shouldn't break the order
        logger.error('Failed to create auto-ship after checkout', {
          userId,
          formulaId,
          error: autoShipErr instanceof Error ? autoShipErr.message : autoShipErr,
        });
      }
    }
  }

  private async handleSubscriptionUpdated(event: Stripe.Event) {
    const sub = event.data.object as Stripe.Subscription;
    const stripeSubscriptionId = sub.id;
    const stripeCustomerId = typeof sub.customer === 'string' ? sub.customer : null;

    // ── Check if this is an auto-ship subscription ──────────────────────
    const autoShip = await autoShipRepository.getByStripeSubscriptionId(stripeSubscriptionId);
    if (autoShip) {
      const periodEnd = sub.items?.data?.[0]?.current_period_end ?? null;
      const updates: any = {};
      if (periodEnd) updates.nextShipmentDate = new Date(periodEnd * 1000);
      if (sub.status === 'canceled' || sub.status === 'unpaid') updates.status = 'cancelled';
      else if (sub.pause_collection) updates.status = 'paused';
      else if (sub.status === 'active' || sub.status === 'trialing') updates.status = 'active';
      if (Object.keys(updates).length > 0) {
        await autoShipRepository.update(autoShip.id, updates);
        logger.info('Auto-ship subscription updated via Stripe webhook', { autoShipId: autoShip.id, updates });
      }
      return;
    }

    // ── Membership subscription ──────────────────────────────────────────
    let user = await usersRepository.getUserByStripeSubscriptionId(stripeSubscriptionId);
    if (!user && stripeCustomerId) {
      user = await usersRepository.getUserByStripeCustomerId(stripeCustomerId);
    }
    if (!user) {
      logger.warn('Stripe subscription update with unmapped user', { eventId: event.id, stripeSubscriptionId, stripeCustomerId });
      return;
    }

    await usersRepository.updateUser(user.id, {
      stripeCustomerId: stripeCustomerId || user.stripeCustomerId,
      stripeSubscriptionId,
    });

    const plan = this.resolvePlan(sub.metadata?.plan).plan;
    const periodEnd = sub.items?.data?.[0]?.current_period_end ?? null;
    await this.upsertInternalSubscription(user.id, {
      plan,
      status: this.mapStripeStatus(sub.status),
      stripeCustomerId,
      stripeSubscriptionId,
      renewsAt: periodEnd ? new Date(periodEnd * 1000) : null,
      pausedUntil: sub.pause_collection?.resumes_at ? new Date(sub.pause_collection.resumes_at * 1000) : null,
    });
  }

  private async handleSubscriptionDeleted(event: Stripe.Event) {
    const sub = event.data.object as Stripe.Subscription;
    const stripeSubscriptionId = sub.id;
    const stripeCustomerId = typeof sub.customer === 'string' ? sub.customer : null;

    // ── Check if this is an auto-ship subscription ──────────────────────
    const autoShip = await autoShipRepository.getByStripeSubscriptionId(stripeSubscriptionId);
    if (autoShip) {
      await autoShipRepository.update(autoShip.id, {
        status: 'cancelled' as any,
        nextShipmentDate: null,
      });
      logger.info('Auto-ship subscription deleted via Stripe webhook', { autoShipId: autoShip.id });
      return;
    }

    // ── Membership subscription ──────────────────────────────────────────
    let user = await usersRepository.getUserByStripeSubscriptionId(stripeSubscriptionId);
    if (!user && stripeCustomerId) {
      user = await usersRepository.getUserByStripeCustomerId(stripeCustomerId);
    }

    if (!user) {
      logger.warn('Stripe subscription deleted with unmapped user', { eventId: event.id, stripeSubscriptionId, stripeCustomerId });
      return;
    }

    await this.upsertInternalSubscription(user.id, {
      plan: 'monthly',
      status: 'cancelled',
      stripeCustomerId,
      stripeSubscriptionId,
      renewsAt: null,
      pausedUntil: null,
    });

    if (user.membershipTier && !user.membershipCancelledAt) {
      await membershipRepository.cancelUserMembership(user.id);
    }

    // ── Send subscription cancelled notification ──────────────────────
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'https://ones.health';

      if (await notificationsService.shouldSendEmail(user.id, 'billing')) {
        await sendNotificationEmail({
          to: user.email,
          subject: 'Your Ones subscription has been cancelled',
          title: 'Subscription Cancelled',
          type: 'order_update',
          content: `
            <p>Hi ${user.name?.split(' ')[0] || 'there'},</p>
            <p>Your Ones subscription has been cancelled. You won't be charged going forward.</p>
            <p>If you still have supply remaining, keep taking your formula as directed. Your health data and formula history are saved and ready whenever you'd like to come back.</p>
            <p>We'd love to know what we could do better — feel free to reach out to our support team anytime.</p>
          `,
          actionUrl: `${frontendUrl}/dashboard`,
          actionText: 'Visit Dashboard',
        });
      }

      await notificationsService.create({
        userId: user.id,
        type: 'order_update',
        title: 'Subscription Cancelled',
        content: 'Your subscription has been cancelled. Your formula and health data are saved if you decide to return.',
        metadata: {
          actionUrl: '/dashboard/orders',
          icon: 'x-circle',
          priority: 'medium',
        },
      });
    } catch (notifErr) {
      logger.warn('Failed to send subscription cancelled notification', { userId: user.id, error: notifErr });
    }
  }

  /**
   * Handle a paid invoice — currently only marks subscription active.
   *
   * ────────────────────────────────────────────────────────────────
   * AUTO-SHIP TODO (Phase 2)
   * ────────────────────────────────────────────────────────────────
   * When auto-ship is implemented, this handler should:
   *
   * 1. Resolve the user's current active formula via
   *    formulasRepository.getCurrentFormulaByUser(userId).
   *
   * 2. Fetch the latest manufacturer quote for that formula.
   *    If the formula changed since the subscription was created,
   *    a NEW quote must be obtained (Alive /get-quote) and the
   *    Stripe subscription-item price updated BEFORE the invoice
   *    finalises. The new manufacturerQuoteId must be stored on
   *    the resulting order so fulfilment uses the correct quote.
   *
   * 3. Create the order:
   *    await usersRepository.createOrder({
   *      userId,
   *      formulaId: activeFormula.id,
   *      formulaVersion: activeFormula.version,
   *      manufacturerQuoteId: latestQuote.id,   // ← critical
   *      manufacturerCostCents: latestQuote.costCents,
   *      amountCents: chargedAmount,
   *      supplyWeeks: 8,
   *      status: 'processing',
   *    });
   *
   * 4. Advance the user's review schedule nextReviewDate forward
   *    by one supply cycle.
   *
   * 5. Trigger fulfilment (Alive /mix-product) with the new quote.
   *
   * Key concern:  If the formula changed, the quote changes, and
   * therefore the price changes. The user must be notified of the
   * new price *before* the invoice finalises. Use Stripe's
   * `invoice.upcoming` webhook or a pre-renewal check (10 days
   * out) to recalculate and update the subscription item price.
   * ────────────────────────────────────────────────────────────────
   */
  private async handleInvoicePaid(event: Stripe.Event) {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionRef = invoice.parent?.subscription_details?.subscription;
    const stripeSubscriptionId = typeof subscriptionRef === 'string'
      ? subscriptionRef
      : subscriptionRef?.id || null;
    if (!stripeSubscriptionId) {
      return;
    }

    // ── Check if this is an auto-ship invoice ──────────────────────────
    const autoShip = await autoShipRepository.getByStripeSubscriptionId(stripeSubscriptionId);
    if (autoShip) {
      // billing_reason distinguishes invoice types:
      //   'subscription_create' → first invoice at subscription creation (no-op: order already placed via checkout)
      //   'subscription_cycle'  → recurring renewal (trial end + every 8 weeks after)
      const billingReason = (invoice as any).billing_reason;
      if (billingReason === 'subscription_create') {
        logger.info('Auto-ship subscription_create invoice — skipping (order placed via checkout)', {
          autoShipId: autoShip.id,
          stripeSubscriptionId,
          billingReason,
        });
      }

      // Real renewal (includes trial-to-active transition and recurring charges)
      if (billingReason === 'subscription_cycle') {
        const invoiceAmountCents = invoice.amount_paid ?? 0;
        logger.info('Auto-ship renewal invoice paid', {
          autoShipId: autoShip.id,
          stripeSubscriptionId,
          amountCents: invoiceAmountCents,
          billingReason,
        });
        await autoShipService.processAutoShipRenewal(stripeSubscriptionId, invoiceAmountCents);
      }

      return; // Don't fall through to membership logic
    }

    // ── Membership subscription: mark active ──────────────────────────
    const existing = await usersRepository.getSubscriptionByStripeSubscriptionId(stripeSubscriptionId);
    if (existing) {
      await usersRepository.updateSubscriptionByStripeSubscriptionId(stripeSubscriptionId, {
        status: 'active',
      });
    }
  }

  private async handleInvoicePaymentFailed(event: Stripe.Event) {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionRef = invoice.parent?.subscription_details?.subscription;
    const stripeSubscriptionId = typeof subscriptionRef === 'string'
      ? subscriptionRef
      : subscriptionRef?.id || null;
    if (!stripeSubscriptionId) {
      return;
    }

    // ── Check if this is an auto-ship invoice ──────────────────────────
    const autoShip = await autoShipRepository.getByStripeSubscriptionId(stripeSubscriptionId);
    if (autoShip) {
      logger.warn('Auto-ship payment failed', { autoShipId: autoShip.id, stripeSubscriptionId });
      // Pause auto-ship on payment failure
      await autoShipRepository.update(autoShip.id, { status: 'paused' as any });

      try {
        const user = await usersRepository.getUser(autoShip.userId);
        if (user) {
          const frontendUrl = process.env.FRONTEND_URL || 'https://ones.health';

          if (await notificationsService.shouldSendEmail(user.id, 'billing')) {
            await sendNotificationEmail({
              to: user.email,
              subject: 'Action needed: Auto-ship payment failed',
              title: 'Auto-Ship Payment Failed',
              type: 'order_update',
              content: `
                <p>Hi ${user.name?.split(' ')[0] || 'there'},</p>
                <p>We couldn't process your auto-ship payment. Your auto-ship has been paused.</p>
                <p>Please update your payment method and resume auto-ship from your dashboard.</p>
              `,
              actionUrl: `${frontendUrl}/dashboard/formula`,
              actionText: 'Update Payment Method',
            });
          }

          await notificationsService.create({
            userId: user.id,
            type: 'order_update',
            title: 'Auto-Ship Payment Failed',
            content: 'Your auto-ship payment failed and has been paused. Please update your payment method.',
            metadata: { actionUrl: '/dashboard/formula', icon: 'alert-circle', priority: 'high' },
          });
        }
      } catch (notifErr) {
        logger.warn('Failed to send auto-ship payment failed notification', { autoShipId: autoShip.id, error: notifErr });
      }

      return; // Don't fall through to membership logic
    }

    // ── Membership subscription: mark past_due ──────────────────────────
    const existing = await usersRepository.getSubscriptionByStripeSubscriptionId(stripeSubscriptionId);
    if (existing) {
      await usersRepository.updateSubscriptionByStripeSubscriptionId(stripeSubscriptionId, {
        status: 'past_due',
      });

      // ── Send payment failed notification ──────────────────────────────
      try {
        const user = await usersRepository.getUser(existing.userId);
        if (user) {
          const frontendUrl = process.env.FRONTEND_URL || 'https://ones.health';

          if (await notificationsService.shouldSendEmail(user.id, 'billing')) {
            await sendNotificationEmail({
              to: user.email,
              subject: 'Action needed: Payment failed for your Ones subscription',
              title: 'Payment Failed',
              type: 'order_update',
              content: `
                <p>Hi ${user.name?.split(' ')[0] || 'there'},</p>
                <p>We weren't able to process your latest subscription payment. Your subscription is now <strong>past due</strong>.</p>
                <p>Please update your payment method to avoid any interruption to your supplement deliveries.</p>
              `,
              actionUrl: `${frontendUrl}/dashboard/orders`,
              actionText: 'Update Payment Method',
            });
          }

          await notificationsService.create({
            userId: user.id,
            type: 'order_update',
            title: 'Payment Failed',
            content: 'Your subscription payment could not be processed. Please update your payment method.',
            metadata: {
              actionUrl: '/dashboard/orders',
              icon: 'alert-circle',
              priority: 'high',
            },
          });
        }
      } catch (notifErr) {
        logger.warn('Failed to send payment failed notification', { stripeSubscriptionId, error: notifErr });
      }
    }
  }

  async listBillingHistory(userId: string): Promise<BillingHistoryItem[]> {
    const orders = await usersRepository.listOrdersByUser(userId);

    return orders.map((order) => ({
      id: order.id,
      date: order.placedAt,
      description: `Supplement Order - Formula v${order.formulaVersion}`,
      amountCents: typeof order.amountCents === 'number' ? order.amountCents : null,
      currency: 'USD',
      status: order.status === 'delivered'
        ? 'paid'
        : order.status === 'cancelled'
          ? 'failed'
          : 'pending',
      invoiceId: order.id,
      invoiceUrl: `/api/billing/invoices/${order.id}`,
    }));
  }

  async getInvoice(userId: string, invoiceId: string): Promise<BillingInvoice | null> {
    const order = await usersRepository.getOrder(invoiceId);
    if (!order || order.userId !== userId) {
      return null;
    }

    return {
      id: order.id,
      userId,
      orderId: order.id,
      amountCents: typeof order.amountCents === 'number' ? order.amountCents : null,
      currency: 'USD',
      status: order.status === 'delivered'
        ? 'paid'
        : order.status === 'cancelled'
          ? 'failed'
          : 'pending',
      issuedAt: order.placedAt,
      lineItems: [
        {
          label: `Custom Formula v${order.formulaVersion}`,
          formulaVersion: order.formulaVersion,
          supplyMonths: order.supplyMonths ?? null,
          amountCents: typeof order.amountCents === 'number' ? order.amountCents : null,
        },
      ],
    };
  }

  async getEquivalentStack(userId: string, formulaId: string): Promise<{
    supplementsCount: number;
    capsulesPerDay: number;
    estimatedMonthlyCost: number | null;
    coveragePct: number;
    missingIngredients: string[];
  }> {
    if (!formulaId) {
      throw new Error('FORMULA_ID_REQUIRED');
    }

    const formula = await formulasRepository.getFormula(formulaId);
    if (!formula || formula.userId !== userId) {
      throw new Error('FORMULA_NOT_FOUND_OR_ACCESS_DENIED');
    }

    const doseByIngredient = new Map<string, { name: string; doseMg: number }>();
    const addIngredient = (name: unknown, amount: unknown) => {
      const rawName = String(name || '').trim();
      const doseMg = Number(amount || 0);
      if (!rawName || !Number.isFinite(doseMg) || doseMg <= 0) return;

      // Resolve aliases (e.g. "Cat's Claw" → "Cats Claw") before key normalization
      const ingredientName = normalizeIngredientName(rawName);
      const key = this.normalizeIngredientKey(ingredientName);
      const existing = doseByIngredient.get(key);
      if (existing) {
        existing.doseMg += doseMg;
      } else {
        doseByIngredient.set(key, { name: ingredientName, doseMg });
      }
    };

    const bases = Array.isArray(formula.bases) ? (formula.bases as Array<any>) : [];
    const additions = Array.isArray(formula.additions) ? (formula.additions as Array<any>) : [];
    const addedBases = Array.isArray((formula.userCustomizations as any)?.addedBases)
      ? ((formula.userCustomizations as any).addedBases as Array<any>)
      : [];
    const addedIndividuals = Array.isArray((formula.userCustomizations as any)?.addedIndividuals)
      ? ((formula.userCustomizations as any).addedIndividuals as Array<any>)
      : [];

    [...bases, ...additions, ...addedBases, ...addedIndividuals].forEach((item) => {
      addIngredient(item?.ingredient, item?.amount);
    });

    const supplementsCount = doseByIngredient.size;
    if (supplementsCount === 0) {
      return {
        supplementsCount: 0,
        capsulesPerDay: 0,
        estimatedMonthlyCost: null,
        coveragePct: 0,
        missingIngredients: [],
      };
    }

    const pricingRows = await db
      .select()
      .from(ingredientPricing)
      .where(eq(ingredientPricing.isActive, true));

    const pricingByKey = new Map(pricingRows.map((row) => [row.ingredientKey, row]));
    const missingIngredients: string[] = [];

    let capsulesPerDay = 0;
    let estimatedMonthlyCostRaw = 0;

    doseByIngredient.forEach(({ name, doseMg }, key) => {
      const pricing = pricingByKey.get(key);
      if (!pricing) {
        missingIngredients.push(name);
        return;
      }

      const capsuleMg = Math.max(1, pricing.typicalCapsuleMg || 1);
      const bottleCapsules = Math.max(1, pricing.typicalBottleCapsules || 1);
      const retailPrice = Math.max(0, pricing.typicalRetailPriceCents || 0) / 100;

      const ingredientCapsulesPerDay = Math.ceil(doseMg / capsuleMg);
      const ingredientMonthlyCost = (ingredientCapsulesPerDay * 30 / bottleCapsules) * retailPrice;

      capsulesPerDay += ingredientCapsulesPerDay;
      estimatedMonthlyCostRaw += ingredientMonthlyCost;
    });

    const coveragePct = Math.round(((supplementsCount - missingIngredients.length) / supplementsCount) * 100);
    const estimatedMonthlyCost = coveragePct < 80 ? null : Math.round(estimatedMonthlyCostRaw);

    return {
      supplementsCount,
      capsulesPerDay,
      estimatedMonthlyCost,
      coveragePct,
      missingIngredients,
    };
  }

  async createCheckoutSession(userId: string, payload: Record<string, any>, req?: Request): Promise<{ checkoutUrl: string; sessionId: string; expiresAt: string }> {
    const stripe = this.getStripeClient();
    const user = await usersRepository.getUser(userId);
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    // Get frontend URL dynamically from request or environment
    const frontendUrl = req ? getBaseUrl(req) : (process.env.FRONTEND_URL || 'http://localhost:5000').replace(/\/$/, '');

    const includeMembership = payload?.includeMembership !== false;
    const enableAutoShip = payload?.enableAutoShip === true;
    const formulaId = typeof payload?.formulaId === 'string' ? payload.formulaId : undefined;
    const { plan, intervalCount } = this.resolvePlan(payload?.plan);

    const formula = formulaId ? await formulasRepository.getFormula(formulaId) : null;
    if (formulaId && (!formula || formula.userId !== userId)) {
      throw new Error('FORMULA_NOT_FOUND_OR_ACCESS_DENIED');
    }

    // SAFETY GATE: If formula has serious warnings, require acknowledgment before checkout
    if (formula) {
      const safetyValidation = (formula as any).safetyValidation;
      if (safetyValidation?.requiresAcknowledgment && !formula.warningsAcknowledgedAt) {
        throw new Error('SAFETY_WARNINGS_NOT_ACKNOWLEDGED');
      }
    }

    let formulaAmountCents = 0;
    let manufacturerCostCents = 0;
    let manufacturerQuoteId: string | undefined;
    let manufacturerQuoteExpiresAt: string | undefined;
    if (formula) {
      const quote = await manufacturerPricingService.quoteFormula({
        bases: (formula.bases as any[]) || [],
        additions: (formula.additions as any[]) || [],
        targetCapsules: (formula.targetCapsules as number) || 9,
      }, (formula.targetCapsules as number) || 9);

      if (!quote.available || typeof quote.total !== 'number' || quote.total <= 0) {
        throw new Error('FORMULA_PRICING_UNAVAILABLE');
      }

      formulaAmountCents = Math.round(quote.total * 100);
      manufacturerCostCents = Math.round((quote.manufacturerCost ?? 0) * 100);
      manufacturerQuoteId = quote.quoteId;
      manufacturerQuoteExpiresAt = quote.quoteExpiresAt;
    }

    if (!includeMembership && !formula) {
      throw new Error('FORMULA_ID_REQUIRED');
    }

    let availableTier: Awaited<ReturnType<typeof membershipRepository.getAvailableMembershipTier>> | undefined;
    if (includeMembership) {
      if (user.membershipTier && !user.membershipCancelledAt) {
        throw new Error('ALREADY_ACTIVE_MEMBER');
      }

      // Reactivation: if user had a previous tier + locked price, honor it
      if (user.membershipTier && user.membershipCancelledAt && user.membershipPriceCents) {
        const previousTier = await membershipRepository.getMembershipTier(user.membershipTier);
        if (previousTier && previousTier.isActive) {
          // Give them back their original tier at their locked price
          availableTier = { ...previousTier, priceCents: user.membershipPriceCents };
        }
      }

      // First-time signup or previous tier no longer available: pick next available
      if (!availableTier) {
        availableTier = await membershipRepository.getAvailableMembershipTier();
      }
      if (!availableTier) {
        throw new Error('NO_MEMBERSHIP_TIER_AVAILABLE');
      }
    }

    let customerId = user.stripeCustomerId || null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await usersRepository.updateUser(user.id, { stripeCustomerId: customerId });
    }

    const successUrl = typeof payload?.successUrl === 'string' && payload.successUrl.length > 0
      ? payload.successUrl
      : `${frontendUrl}/membership/success?session_id={CHECKOUT_SESSION_ID}&membership=${includeMembership ? '1' : '0'}`;
    const cancelUrl = typeof payload?.cancelUrl === 'string' && payload.cancelUrl.length > 0
      ? payload.cancelUrl
      : `${frontendUrl}/dashboard/formula`;

    // Apply 15% member discount to formula when user is signing up for membership
    // OR already has an active membership
    const isActiveMember = !!(user.membershipTier && !user.membershipCancelledAt);
    const applyMemberDiscount = !!(formula && (includeMembership || isActiveMember));
    const formulaLineAmountCents = applyMemberDiscount
      ? Math.round(formulaAmountCents * 0.85)
      : formulaAmountCents;

    const metadata: Record<string, string> = {
      userId: user.id,
      includeMembership: includeMembership ? '1' : '0',
      plan,
    };

    if (formula) {
      metadata.formulaId = formula.id;
      metadata.formulaVersion = String(formula.version);
      metadata.formulaPriceCents = String(formulaAmountCents);
      metadata.formulaChargedCents = String(formulaLineAmountCents);
      metadata.manufacturerCostCents = String(manufacturerCostCents);
      if (manufacturerQuoteId) {
        metadata.manufacturerQuoteId = manufacturerQuoteId;
      }
      if (manufacturerQuoteExpiresAt) {
        metadata.manufacturerQuoteExpiresAt = manufacturerQuoteExpiresAt;
      }
      if (applyMemberDiscount) {
        metadata.memberDiscountApplied = '1';
      }
      metadata.enableAutoShip = enableAutoShip ? '1' : '0';
    }

    if (availableTier) {
      metadata.membershipTier = availableTier.tierKey;
      metadata.membershipPriceCents = String(availableTier.priceCents);
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    if (formula) {
      // Build formula description for Stripe checkout page
      let formulaDescription: string | undefined;
      if (includeMembership || applyMemberDiscount) {
        formulaDescription = 'Smart Re-Order: AI-reviewed & auto-charged every ~8 weeks';
      } else if (enableAutoShip) {
        formulaDescription = 'Auto-ships every 8 weeks';
      }

      lineItems.push({
        price_data: {
          currency: 'usd',
          unit_amount: formulaLineAmountCents,
          product_data: {
            name: applyMemberDiscount
              ? `Personalized Formula v${formula.version} (Member Price)`
              : `Personalized Formula v${formula.version}`,
            ...(formulaDescription ? { description: formulaDescription } : {}),
          },
        },
        quantity: 1,
      });
    }

    if (availableTier) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          recurring: {
            interval: 'month',
            interval_count: intervalCount,
          },
          unit_amount: availableTier.priceCents * intervalCount,
          product_data: {
            name: `${availableTier.name} Membership`,
          },
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: includeMembership ? 'subscription' : 'payment',
      customer: customerId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
      subscription_data: includeMembership
        ? {
            metadata,
          }
        : undefined,
      line_items: lineItems,
      client_reference_id: user.id,
      allow_promotion_codes: true,
    });

    if (!session.url || !session.expires_at) {
      throw new Error('FAILED_TO_CREATE_CHECKOUT_SESSION');
    }

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
      expiresAt: new Date(session.expires_at * 1000).toISOString(),
    };
  }

  async cancelSubscription(userId: string, subscriptionId: string): Promise<{ cancelledAt: string; status: 'cancelled' }> {
    const stripe = this.getStripeClient();
    const user = await usersRepository.getUser(userId);
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    const stripeSubscriptionId = user.stripeSubscriptionId || subscriptionId;
    if (!stripeSubscriptionId) {
      throw new Error('SUBSCRIPTION_NOT_FOUND');
    }

    await stripe.subscriptions.cancel(stripeSubscriptionId);

    await this.upsertInternalSubscription(userId, {
      plan: 'monthly',
      status: 'cancelled',
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId,
      renewsAt: null,
      pausedUntil: null,
    });

    if (user.membershipTier && !user.membershipCancelledAt) {
      await membershipRepository.cancelUserMembership(userId);
    }

    return {
      cancelledAt: new Date().toISOString(),
      status: 'cancelled',
    };
  }

  async handleStripeWebhook(signature: string | undefined, rawBody: Buffer): Promise<void> {
    if (!this.stripeWebhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET_NOT_CONFIGURED');
    }
    const stripe = this.getStripeClient();

    if (!signature) {
      throw new Error('MISSING_STRIPE_SIGNATURE');
    }

    const event = stripe.webhooks.constructEvent(rawBody, signature, this.stripeWebhookSecret);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event);
        break;
      case 'invoice.paid':
        await this.handleInvoicePaid(event);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event);
        break;
      default:
        logger.debug('Ignoring unsupported Stripe event', { eventType: event.type, eventId: event.id });
    }
  }
}

export class BillingService {
  constructor(private readonly provider: BillingProvider = new DatabaseBillingProvider()) {}

  async listBillingHistory(userId: string) {
    return this.provider.listBillingHistory(userId);
  }

  async getInvoice(userId: string, invoiceId: string) {
    return this.provider.getInvoice(userId, invoiceId);
  }

  async getEquivalentStack(userId: string, formulaId: string) {
    return this.provider.getEquivalentStack(userId, formulaId);
  }

  async createCheckoutSession(userId: string, payload: Record<string, any>, req?: Request) {
    return this.provider.createCheckoutSession(userId, payload, req);
  }

  async cancelSubscription(userId: string, subscriptionId: string) {
    return this.provider.cancelSubscription(userId, subscriptionId);
  }

  async handleStripeWebhook(signature: string | undefined, rawBody: Buffer) {
    return this.provider.handleStripeWebhook(signature, rawBody);
  }
}

export const billingService = new BillingService();
