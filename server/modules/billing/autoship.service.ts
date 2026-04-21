/**
 * AutoShip Service — EasyPayDirect Integration
 * ────────────────────────────────────────────────────────────────
 * Manages recurring formula shipments (every 8 weeks).
 *
 * All recurring billing is managed internally (no external subscription IDs).
 * The auto-ship scheduler checks for due shipments daily and charges via
 * EPD Customer Vault.
 *
 * Flow:
 *  1. After first formula purchase → createAutoShip()
 *     Creates DB record with nextShipmentDate = now + 8 weeks.
 *  2. Scheduler → processAutoShipRenewal(autoShipId)
 *     Gets fresh manufacturer quote, charges vault, creates order.
 *  3. Formula change → syncFormulaPrice()
 *     Fetches new quote, updates DB record price.
 *  4. Scheduler (10 days pre-renewal) → refreshPreRenewalQuote()
 *     Ensures quote is fresh before charge.
 *  5. User controls → pause / resume / cancel / skipNext (all DB-only)
 * ────────────────────────────────────────────────────────────────
 */

import { autoShipRepository } from './autoship.repository';
import { usersRepository } from '../users/users.repository';
import { formulasRepository } from '../formulas/formulas.repository';
import { consentsRepository } from '../consents/consents.repository';
import { manufacturerPricingService, type ManufacturerOrderCustomerInfo } from '../formulas/manufacturer-pricing.service';
import { notificationsService } from '../notifications/notifications.service';
import { sendNotificationEmail, sendAdminOrderNotification } from '../../utils/emailService';
import { epdGateway, isApproved } from './epd-gateway';
import logger from '../../infra/logging/logger';
import type { AutoShipSubscription } from '@shared/schema';

const SUPPLY_WEEKS = 8;
const MEMBER_DISCOUNT = 0.85; // 15% discount for members

export class AutoShipService {

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

    // Next shipment date = 8 weeks from now
    const nextShipmentDate = new Date();
    nextShipmentDate.setDate(nextShipmentDate.getDate() + SUPPLY_WEEKS * 7);

    // Save to database (no external subscription — managed internally)
    const autoShip = await autoShipRepository.create({
      userId: opts.userId,
      formulaId: opts.formulaId,
      formulaVersion: opts.formulaVersion,
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
  // 2. PROCESS RENEWAL (called by scheduler when nextShipmentDate is due)
  // ──────────────────────────────────────────────────────────────
  async processAutoShipRenewal(autoShipId: string): Promise<void> {
    const autoShip = await autoShipRepository.getById(autoShipId);
    if (!autoShip || autoShip.status !== 'active') {
      logger.warn('Auto-ship renewal skipped — not active', { autoShipId });
      return;
    }

    const user = await usersRepository.getUser(autoShip.userId);
    if (!user) {
      logger.error('Auto-ship renewal for missing user', { autoShipId, userId: autoShip.userId });
      return;
    }

    // ── Check payment method ──
    const vaultId = user.paymentVaultId;
    if (!vaultId) {
      logger.error('Auto-ship renewal: no payment vault ID', { autoShipId, userId: autoShip.userId });
      await autoShipRepository.update(autoShip.id, { status: 'paused' as any });
      await this.notifyAutoShipIssue(user, 'We couldn\'t process your auto-ship because no payment method is on file. Please update your payment method from your dashboard.');
      return;
    }

    // ── Resolve current active formula ──
    const formula = await formulasRepository.getCurrentFormulaByUser(autoShip.userId);
    if (!formula) {
      logger.error('Auto-ship renewal: no active formula found', { userId: autoShip.userId, autoShipId });
      await autoShipRepository.update(autoShip.id, { status: 'paused' as any });
      await this.notifyAutoShipIssue(user, 'No active formula found for your auto-ship. We\'ve paused it until you set up a formula.');
      return;
    }

    // ── Block renewal if formula has discontinued ingredients ──
    if (formula.needsReformulation) {
      logger.warn('Auto-ship renewal blocked: formula needs reformulation', {
        autoShipId, userId: autoShip.userId, discontinuedIngredients: formula.discontinuedIngredients,
      });
      await autoShipRepository.update(autoShip.id, { status: 'paused' as any });
      await this.notifyAutoShipIssue(user, 'One or more ingredients in your formula are no longer available. Your auto-ship is paused until you update your formula. Visit your dashboard to chat with your AI practitioner for a quick update.');
      return;
    }

    // ── Get fresh manufacturer quote ──
    const quote = await manufacturerPricingService.quoteFormula({
      bases: (formula.bases as any[]) || [],
      additions: (formula.additions as any[]) || [],
      targetCapsules: (formula.targetCapsules as number) || 9,
    }, (formula.targetCapsules as number) || 9);

    if (!quote.available || !quote.total || !quote.quoteId) {
      logger.error('Auto-ship renewal: manufacturer quote failed', {
        autoShipId, userId: autoShip.userId, quoteAvailable: quote.available, reason: (quote as any).reason,
      });
      await this.notifyAutoShipIssue(user, 'We couldn\'t get a pricing quote for your formula. Our team has been notified and will follow up.');
      return;
    }

    // ── Calculate charge amount ──
    const isActiveMember = !!(user.membershipTier && !user.membershipCancelledAt);
    const rawCents = Math.round(quote.total * 100);
    const shippingCents = Math.round((quote.shipping ?? 0) * 100);
    const formulaCents = isActiveMember ? Math.round(rawCents * MEMBER_DISCOUNT) : rawCents;
    const chargeCents = formulaCents + shippingCents;
    const chargeAmount = (chargeCents / 100).toFixed(2);

    // ── Charge via EPD Customer Vault ──
    let transactionId: string | undefined;
    try {
      const result = await epdGateway.chargeVault({
        customer_vault_id: vaultId,
        amount: chargeAmount,
        orderid: `ones-autoship-${autoShip.id.slice(0, 8)}-${Date.now()}`,
        orderdescription: `ONES Auto-Ship - Formula v${formula.version}`,
        stored_credential_indicator: 'used',
        initiated_by: 'merchant',
        initial_transaction_id: user.initialTransactionId || undefined,
        billing_method: 'recurring',
        customer_receipt: 'true',
      });

      if (!isApproved(result)) {
        logger.warn('Auto-ship renewal payment declined', {
          autoShipId, userId: autoShip.userId,
          responsetext: result.responsetext, response_code: result.response_code,
        });
        // Mark as past_due but don't cancel — scheduler will retry
        await autoShipRepository.update(autoShip.id, { status: 'past_due' as any });
        await this.notifyAutoShipIssue(user, `Your auto-ship payment was declined: ${result.responsetext}. Please update your payment method.`);
        return;
      }

      transactionId = result.transactionid;
    } catch (err) {
      logger.error('Auto-ship EPD charge error', { autoShipId, userId: autoShip.userId, error: err });
      await autoShipRepository.update(autoShip.id, { status: 'past_due' as any });
      return;
    }

    // ── Build consent snapshot ──
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

    // ── Create order ──
    const order = await usersRepository.createOrder({
      userId: autoShip.userId,
      formulaId: formula.id,
      formulaVersion: formula.version,
      status: 'processing',
      amountCents: chargeCents,
      manufacturerCostCents: Math.round((quote.manufacturerCost ?? 0) * 100),
      supplyWeeks: SUPPLY_WEEKS,
      manufacturerQuoteId: quote.quoteId,
      manufacturerQuoteExpiresAt: quote.quoteExpiresAt ? new Date(quote.quoteExpiresAt) : null,
      autoShipSubscriptionId: autoShip.id,
      gatewayTransactionId: transactionId,
      consentSnapshot,
    });

    logger.info('Auto-ship order created', {
      orderId: order.id, autoShipId, userId: autoShip.userId,
      formulaId: formula.id, formulaVersion: formula.version,
      amountCents: chargeCents, quoteId: quote.quoteId, transactionId,
    });

    // ── Place manufacturer production order ──
    if (quote.quoteId) {
      let customerInfo: ManufacturerOrderCustomerInfo | undefined;
      const shippingAddresses = await usersRepository.listAddressesByUser(autoShip.userId, 'shipping');
      const billingAddresses = await usersRepository.listAddressesByUser(autoShip.userId, 'billing');
      const shippingAddr = shippingAddresses[0];
      const billingAddr = billingAddresses[0] || shippingAddr;

      const addrLine1 = shippingAddr?.line1 || user.addressLine1;
      const addrCity = shippingAddr?.city || user.city;
      const addrZip = shippingAddr?.postalCode || user.postalCode;

      if (addrLine1 && addrCity && addrZip) {
        customerInfo = {
          customerName: user.name || 'Customer',
          email: user.email,
          phone: user.phone || undefined,
          billingAddress: {
            line1: billingAddr?.line1 || addrLine1,
            line2: billingAddr?.line2 || undefined,
            city: billingAddr?.city || addrCity,
            state: billingAddr?.state || user.state || undefined,
            zip: billingAddr?.postalCode || addrZip,
            country: billingAddr?.country || user.country || 'US',
          },
          shippingAddress: {
            line1: addrLine1,
            line2: shippingAddr?.line2 || user.addressLine2 || undefined,
            city: addrCity,
            state: shippingAddr?.state || user.state || undefined,
            zip: addrZip,
            country: shippingAddr?.country || user.country || 'US',
          },
        };
      } else {
        logger.warn('Auto-ship: no shipping address available for manufacturer order', { userId: autoShip.userId });
      }

      const mfrResult = await manufacturerPricingService.placeManufacturerOrder(quote.quoteId, customerInfo);
      if (mfrResult.success) {
        await usersRepository.updateOrder(order.id, {
          manufacturerOrderId: mfrResult.orderId || null,
          manufacturerOrderStatus: 'submitted',
        });
        logger.info('Auto-ship manufacturer order placed', { orderId: order.id, manufacturerOrderId: mfrResult.orderId });
      } else {
        logger.error('Auto-ship manufacturer order failed — admin can retry', {
          orderId: order.id, quoteId: quote.quoteId, error: mfrResult.error,
        });
        await usersRepository.updateOrder(order.id, { manufacturerOrderStatus: 'failed' });
      }
    }

    // ── Update auto-ship record ──
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + SUPPLY_WEEKS * 7);
    await autoShipRepository.update(autoShip.id, {
      formulaId: formula.id,
      formulaVersion: formula.version,
      lastQuoteId: quote.quoteId,
      lastQuoteExpiresAt: quote.quoteExpiresAt ? new Date(quote.quoteExpiresAt) : null,
      nextShipmentDate: nextDate,
      manufacturerCostCents: Math.round((quote.manufacturerCost ?? 0) * 100),
      priceCents: chargeCents,
    });

    // ── Send renewal notification ──
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
            <p>Order total: <strong>$${chargeAmount}</strong></p>
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
        content: `Formula v${formula.version} re-ordered — $${chargeAmount}. Next shipment in ${SUPPLY_WEEKS} weeks.`,
        metadata: { actionUrl: '/dashboard/orders', icon: 'package', priority: 'medium' },
      });
    } catch (err) {
      logger.warn('Failed to send auto-ship renewal notification', { userId: autoShip.userId, error: err });
    }

    // ── Internal admin notification ──
    try {
      const shippingAddresses = await usersRepository.listAddressesByUser(autoShip.userId, 'shipping');
      const primaryShipping = shippingAddresses[0];
      await sendAdminOrderNotification({
        orderId: order.id,
        orderSource: 'autoship',
        amountCents: chargeCents,
        currency: 'USD',
        manufacturerCostCents: Math.round((quote.manufacturerCost ?? 0) * 100),
        transactionId: transactionId || null,
        customer: {
          id: autoShip.userId,
          name: user.name,
          email: user.email,
          phone: user.phone,
        },
        formula: { id: formula.id, name: formula.name, version: formula.version },
        shippingAddress: primaryShipping
          ? {
              line1: primaryShipping.line1,
              line2: primaryShipping.line2,
              city: primaryShipping.city,
              state: primaryShipping.state,
              postalCode: primaryShipping.postalCode,
              country: primaryShipping.country,
            }
          : {
              line1: user.addressLine1,
              line2: user.addressLine2,
              city: user.city,
              state: user.state,
              postalCode: user.postalCode,
              country: user.country,
            },
        membershipTier: user.membershipTier || null,
      });
    } catch (adminEmailErr) {
      logger.warn('Failed to send admin order notification (autoship)', { userId: autoShip.userId, orderId: order.id, error: adminEmailErr });
    }

    // ── Membership upgrade nudge for non-members ──
    if (!isActiveMember) {
      try {
        const frontendUrl = process.env.FRONTEND_URL || 'https://ones.health';
        const savingsCents = Math.round(chargeCents * (1 - MEMBER_DISCOUNT));
        const memberPriceDollars = ((chargeCents * MEMBER_DISCOUNT) / 100).toFixed(2);
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
              <p>You just paid <strong>$${chargeAmount}</strong> for your formula auto-ship.
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
    const shippingCents = Math.round((quote.shipping ?? 0) * 100);
    const isActiveMember = !!(user.membershipTier && !user.membershipCancelledAt);
    const applyDiscount = isActiveMember;
    const newPriceCents = (applyDiscount ? Math.round(rawCents * MEMBER_DISCOUNT) : rawCents) + shippingCents;
    const oldPriceCents = autoShip.priceCents;

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
      lastQuoteId: quote.quoteId || null,
      lastQuoteExpiresAt: quote.quoteExpiresAt ? new Date(quote.quoteExpiresAt) : null,
      memberDiscountApplied: applyDiscount,
    });

    logger.info('Auto-ship price synced', {
      autoShipId: autoShip.id, userId: opts.userId,
      oldPriceCents, newPriceCents,
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
  // 5. USER CONTROLS (all DB-only — no external API calls)
  // ──────────────────────────────────────────────────────────────

  async getAutoShip(userId: string): Promise<AutoShipSubscription | undefined> {
    return autoShipRepository.getByUserId(userId);
  }

  async pauseAutoShip(userId: string): Promise<AutoShipSubscription> {
    const autoShip = await autoShipRepository.getByUserId(userId);
    if (!autoShip || autoShip.status !== 'active') {
      throw new Error('NO_ACTIVE_AUTO_SHIP');
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
    if (!autoShip) throw new Error('NO_AUTO_SHIP_FOUND');
    if (autoShip.status !== 'paused') throw new Error('AUTO_SHIP_NOT_PAUSED');

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

    // Push the next shipment date forward by one cycle
    const currentNext = autoShip.nextShipmentDate || new Date();
    const resumeAt = new Date(currentNext);
    resumeAt.setDate(resumeAt.getDate() + SUPPLY_WEEKS * 7);

    const updated = await autoShipRepository.update(autoShip.id, {
      nextShipmentDate: resumeAt,
    });

    logger.info('Auto-ship next shipment skipped', {
      autoShipId: autoShip.id, userId,
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
