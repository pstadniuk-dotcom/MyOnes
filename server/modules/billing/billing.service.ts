import Stripe from 'stripe';
import { usersRepository } from '../users/users.repository';
import { membershipRepository } from '../membership/membership.repository';
import { formulasRepository } from '../formulas/formulas.repository';
import { manufacturerPricingService } from '../formulas/manufacturer-pricing.service';
import { db } from '../../infra/db/db';
import { ingredientPricing } from '@shared/schema';
import { eq } from 'drizzle-orm';
import logger from '../../infra/logging/logger';

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
  createCheckoutSession(_userId: string, _payload: Record<string, any>): Promise<{
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
  private readonly frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5000').replace(/\/$/, '');

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
        await this.upsertInternalSubscription(userId, {
          plan,
          status: this.mapStripeStatus(stripeSub.status),
          stripeCustomerId,
          stripeSubscriptionId,
          renewsAt: null,
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
      });

      logger.info('Order created from Stripe checkout', {
        orderId: order.id,
        userId,
        formulaId,
        formulaVersion,
        chargedCents,
        mfrCostCents,
        quoteId,
      });

      // Update user's last order date
      await usersRepository.updateUser(userId, {
        lastOrderDate: new Date(),
      });

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
    }
  }

  private async handleSubscriptionUpdated(event: Stripe.Event) {
    const sub = event.data.object as Stripe.Subscription;
    const stripeSubscriptionId = sub.id;
    const stripeCustomerId = typeof sub.customer === 'string' ? sub.customer : null;

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
    await this.upsertInternalSubscription(user.id, {
      plan,
      status: this.mapStripeStatus(sub.status),
      stripeCustomerId,
      stripeSubscriptionId,
      renewsAt: null,
      pausedUntil: sub.pause_collection?.resumes_at ? new Date(sub.pause_collection.resumes_at * 1000) : null,
    });
  }

  private async handleSubscriptionDeleted(event: Stripe.Event) {
    const sub = event.data.object as Stripe.Subscription;
    const stripeSubscriptionId = sub.id;
    const stripeCustomerId = typeof sub.customer === 'string' ? sub.customer : null;

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
  }

  private async handleInvoicePaid(event: Stripe.Event) {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionRef = invoice.parent?.subscription_details?.subscription;
    const stripeSubscriptionId = typeof subscriptionRef === 'string'
      ? subscriptionRef
      : subscriptionRef?.id || null;
    if (!stripeSubscriptionId) {
      return;
    }

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

    const existing = await usersRepository.getSubscriptionByStripeSubscriptionId(stripeSubscriptionId);
    if (existing) {
      await usersRepository.updateSubscriptionByStripeSubscriptionId(stripeSubscriptionId, {
        status: 'past_due',
      });
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
      const ingredientName = String(name || '').trim();
      const doseMg = Number(amount || 0);
      if (!ingredientName || !Number.isFinite(doseMg) || doseMg <= 0) return;

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

  async createCheckoutSession(userId: string, payload: Record<string, any>): Promise<{ checkoutUrl: string; sessionId: string; expiresAt: string }> {
    const stripe = this.getStripeClient();
    const user = await usersRepository.getUser(userId);
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    const includeMembership = payload?.includeMembership !== false;
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
      : `${this.frontendUrl}/membership/success?session_id={CHECKOUT_SESSION_ID}&membership=${includeMembership ? '1' : '0'}`;
    const cancelUrl = typeof payload?.cancelUrl === 'string' && payload.cancelUrl.length > 0
      ? payload.cancelUrl
      : `${this.frontendUrl}/dashboard/formula`;

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
    }

    if (availableTier) {
      metadata.membershipTier = availableTier.tierKey;
      metadata.membershipPriceCents = String(availableTier.priceCents);
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    if (formula) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          unit_amount: formulaLineAmountCents,
          product_data: {
            name: applyMemberDiscount
              ? `Personalized Formula v${formula.version} (Member Price)`
              : `Personalized Formula v${formula.version}`,
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

  async createCheckoutSession(userId: string, payload: Record<string, any>) {
    return this.provider.createCheckoutSession(userId, payload);
  }

  async cancelSubscription(userId: string, subscriptionId: string) {
    return this.provider.cancelSubscription(userId, subscriptionId);
  }

  async handleStripeWebhook(signature: string | undefined, rawBody: Buffer) {
    return this.provider.handleStripeWebhook(signature, rawBody);
  }
}

export const billingService = new BillingService();
