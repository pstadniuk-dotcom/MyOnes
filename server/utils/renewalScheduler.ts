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
import { eq, and, lte, gte, isNotNull } from 'drizzle-orm';
import { db } from '../infra/db/db';
import { subscriptions, autoShipSubscriptions, users } from '@shared/schema';
import { billingService } from '../modules/billing/billing.service';
import { autoShipService } from '../modules/billing/autoship.service';
import logger from '../infra/logging/logger';

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
// Membership Renewal Reminders (3 Days Before)
// ──────────────────────────────────────────────────────────────

// async function processMembershipReminders() {
//   logger.info('[Renewal] Membership reminder job: starting');

//   let sent = 0;
//   try {
//     const now = new Date();
//     const threeDaysFromNowStart = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
//     const threeDaysFromNowEnd = new Date(threeDaysFromNowStart.getTime() + 24 * 60 * 60 * 1000);

//     // Find active subscriptions renewing in exactly 3 days
//     const upcoming = await db
//       .select()
//       .from(subscriptions)
//       .where(
//         and(
//           eq(subscriptions.status, 'active'),
//           isNotNull(subscriptions.renewsAt),
//           lte(subscriptions.renewsAt, threeDaysFromNowEnd),
//           gte(subscriptions.renewsAt, threeDaysFromNowStart),
//         ),
//       );

//     logger.info(`[Renewal] Found ${upcoming.length} memberships renewing in 3 days`);

//     for (const sub of upcoming) {
//       try {
//         const user = await db.query.users.findFirst({
//           where: (users, { eq }) => eq(users.id, sub.userId)
//         });

//         if (user && user.email) {
//           const { sendNotificationEmail } = await import('./emailService');
//           const frontendUrl = process.env.VITE_FRONTEND_URL || 'https://ones.ai';

//           await sendNotificationEmail(user.email, {
//             subject: 'Your ONES Membership is renewing soon',
//             title: 'Membership Renewal Reminder',
//             content: `
//               <p>Hi ${user.name?.split(' ')[0] || 'Member'},</p>
//               <p>Just a friendly reminder that your active ONES membership is scheduled to renew in 3 days.</p>
//               <p>No action is required from you. We will automatically charge your card on file so you can continue enjoying 15% off all supplement orders and access to your AI practitioner data.</p>
//               <p>If you'd like to update your plan or manage your subscription, you can do so in your dashboard.</p>
//             `,
//             actionUrl: `${frontendUrl}/dashboard/settings`,
//             actionText: 'Manage Subscription'
//           });
//           sent++;
//         }
//       } catch (err) {
//         logger.error('[Renewal] Failed to send reminder email', { userId: sub.userId, error: err });
//       }
//     }
//   } catch (err) {
//     logger.error('[Renewal] Membership reminder job failed', { error: err });
//   }

//   logger.info('[Renewal] Membership reminder job complete', { sent });
// }

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
    await processMembershipRenewals();
  });

  // // Membership renewal reminders — daily at 10am UTC (warns 3 days before renewal)
  // cron.schedule('0 10 * * *', async () => {
  //   await processMembershipReminders();
  // });

  // Auto-ship renewals — daily at 11am UTC (after pre-renewal quote refresh at 8am)
  cron.schedule('0 11 * * *', async () => {
    await processAutoShipRenewals();
  });

  logger.info('[Renewal] Scheduler started — membership 9am UTC, auto-ship 11am UTC');
}

// Export for manual testing / admin triggers
export { processMembershipRenewals, processAutoShipRenewals };
