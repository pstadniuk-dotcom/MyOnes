/**
 * Renewal Scheduler
 *
 * Runs two daily jobs:
 * 1. MEMBERSHIP RENEWAL (9am UTC): Find active subscriptions where renewsAt <= now,
 *    charge via EPD vault, and extend the renewal date.
 * 2. AUTO-SHIP RENEWAL (11am UTC): Find active auto-ships where nextShipmentDate <= now,
 *    charge via EPD vault, create order, and set next shipment date.
 *
 * These jobs replace the previous Stripe subscription billing which was handled
 * by Stripe's recurring billing + webhook notifications.
 */

import cron from 'node-cron';
import { eq, and, lte, isNotNull } from 'drizzle-orm';
import { db } from '../infra/db/db';
import { subscriptions, autoShipSubscriptions } from '@shared/schema';
import { billingService } from '../modules/billing/billing.service';
import { autoShipService } from '../modules/billing/autoship.service';
import logger from '../infra/logging/logger';
import { runScheduledJob } from './schedulerRunner';
import posthog from '../infra/posthog';

// ──────────────────────────────────────────────────────────────
// Membership Renewals
// ──────────────────────────────────────────────────────────────

async function processMembershipRenewals() {
  logger.info('[Renewal] Membership renewal job: starting');

  let renewed = 0;
  let failed = 0;
  let skipped = 0;

  try {
    const now = new Date();

    // Find active subscriptions past their renewal date
    const dueSubscriptions = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.status, 'active'),
          isNotNull(subscriptions.renewsAt),
          lte(subscriptions.renewsAt, now),
        ),
      );

    logger.info(`[Renewal] Found ${dueSubscriptions.length} memberships due for renewal`);

    for (const sub of dueSubscriptions) {
      try {
        const result = await billingService.processMembershipRenewal(sub.userId);
        if (result.success) {
          renewed++;
          posthog.capture({
            distinctId: sub.userId,
            event: 'subscription_renewed',
            properties: { subscription_id: sub.id, source: 'cron' },
          });
        } else {
          failed++;
          logger.warn('[Renewal] Membership renewal failed', {
            subscriptionId: sub.id,
            userId: sub.userId,
            error: result.error,
          });
        }
      } catch (err) {
        failed++;
        logger.error('[Renewal] Membership renewal error', {
          subscriptionId: sub.id,
          userId: sub.userId,
          error: err instanceof Error ? err.message : err,
        });
      }
    }
  } catch (err) {
    logger.error('[Renewal] Membership renewal job failed', {
      error: err instanceof Error ? err.message : err,
    });
  }

  const summary = { renewed, failed, skipped };
  logger.info('[Renewal] Membership renewal job complete', summary);
  return summary;
}

// ──────────────────────────────────────────────────────────────
// Auto-Ship Renewals
// ──────────────────────────────────────────────────────────────

async function processAutoShipRenewals() {
  logger.info('[Renewal] Auto-ship renewal job: starting');

  let renewed = 0;
  let failed = 0;

  try {
    const now = new Date();

    // Find active auto-ships whose next shipment date has arrived
    const dueAutoShips = await db
      .select()
      .from(autoShipSubscriptions)
      .where(
        and(
          eq(autoShipSubscriptions.status, 'active'),
          isNotNull(autoShipSubscriptions.nextShipmentDate),
          lte(autoShipSubscriptions.nextShipmentDate, now),
        ),
      );

    logger.info(`[Renewal] Found ${dueAutoShips.length} auto-ships due for renewal`);

    for (const autoShip of dueAutoShips) {
      try {
        await autoShipService.processAutoShipRenewal(autoShip.id);
        renewed++;
        posthog.capture({
          distinctId: autoShip.userId,
          event: 'auto_ship_renewed',
          properties: { auto_ship_id: autoShip.id, source: 'cron' },
        });
      } catch (err) {
        failed++;
        logger.error('[Renewal] Auto-ship renewal error', {
          autoShipId: autoShip.id,
          userId: autoShip.userId,
          error: err instanceof Error ? err.message : err,
        });
      }
    }
  } catch (err) {
    logger.error('[Renewal] Auto-ship renewal job failed', {
      error: err instanceof Error ? err.message : err,
    });
  }

  const summary = { renewed, failed };
  logger.info('[Renewal] Auto-ship renewal job complete', summary);
  return summary;
}

// ──────────────────────────────────────────────────────────────
// Scheduler Start
// ──────────────────────────────────────────────────────────────

export function startRenewalScheduler() {
  logger.info('[Renewal] Scheduler starting...');

  // Membership renewals — daily at 9am UTC
  cron.schedule('0 9 * * *', async () => {
    await runScheduledJob('renewal', async () => {
      const summary = await processMembershipRenewals();
      return { subtask: 'membership', ...summary };
    });
  });

  // Auto-ship renewals — daily at 11am UTC (after pre-renewal quote refresh at 8am)
  cron.schedule('0 11 * * *', async () => {
    await runScheduledJob('renewal', async () => {
      const summary = await processAutoShipRenewals();
      return { subtask: 'autoship', ...summary };
    });
  });

  logger.info('[Renewal] Scheduler started — membership 9am UTC, auto-ship 11am UTC');
}

// Export for manual testing / admin triggers
export { processMembershipRenewals, processAutoShipRenewals };
