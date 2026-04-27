/**
 * Formula Review Scheduler
 *
 * Runs once per day at 9am UTC.
 * Checks users whose subscription renews in the next 7 days.
 * For each:
 *  - Computes formula drift via formulaReviewService.getReviewStatus()
 *  - If needsReview = true → sends a single "review recommended" notification
 *    that includes the number of days until their next renewal
 *
 * Uses the subscriptions.renewsAt column (populated when subscription is created/renewed)
 * so notifications are naturally tied to the billing cycle.
 *
 * Dedup: uses the centralized notification gate (notification_log table)
 * which enforces per-channel cooldowns and daily caps across all schedulers.
 */

import cron from 'node-cron';
import { usersRepository } from '../modules/users/users.repository';
import { formulaReviewService } from '../modules/formulas/formula-review.service';
import { notificationGate } from '../modules/notifications/notification-gate.service';
import logger from '../infra/logging/logger';
import { runScheduledJob } from './schedulerRunner';

/**
 * Notify users whose renewal is exactly `daysAhead` days away
 * if they have formula drift.
 */
async function checkRenewalCohort(daysAhead: number) {
    const subs = await usersRepository.getUpcomingRenewals(daysAhead);
    let notified = 0;
    let skipped = 0;
    let errors = 0;

    for (const sub of subs) {
        try {
            // Check notification gate BEFORE doing expensive drift computation
            const emailAllowed = await notificationGate.canSend(sub.userId, 'formula_drift', 'email');
            const smsAllowed = await notificationGate.canSend(sub.userId, 'formula_drift', 'sms');

            if (!emailAllowed && !smsAllowed) {
                skipped++;
                continue;
            }

            const status = await formulaReviewService.getReviewStatus(sub.userId);

            if (!status.needsReview) {
                skipped++;
                continue;
            }

            await formulaReviewService.sendReviewNotification(
                sub.userId,
                status.reasons,
                daysAhead,
                { emailAllowed, smsAllowed },
            );

            notified++;

            logger.info('Formula review scheduler: notified user', {
                userId: sub.userId,
                daysUntilRenewal: daysAhead,
                driftScore: status.driftScore,
                reasons: status.reasons,
            });
        } catch (err) {
            errors++;
            logger.error('Formula review scheduler: error processing user', {
                userId: sub.userId,
                daysAhead,
                err,
            });
        }
    }

    return { checked: subs.length, notified, skipped, errors };
}

async function runFormulaReviewCheck() {
    logger.info('Formula review scheduler: starting daily check');

    // Check renewals at 7 days and 3 days out — two touchpoints
    const [day7, day3] = await Promise.all([
        checkRenewalCohort(7),
        checkRenewalCohort(3),
    ]);

    const summary = {
        day7,
        day3,
        totalNotified: day7.notified + day3.notified,
    };

    logger.info('Formula review scheduler: daily check complete', summary);
    return summary;
}

export function startAutoOptimizeScheduler() {
    logger.info('Formula review scheduler: starting...');

    // Daily at 9am UTC
    cron.schedule('0 9 * * *', async () => {
        await runScheduledJob('auto_optimize', async () => {
            const summary = await runFormulaReviewCheck();
            return summary as Record<string, any>;
        });
    });

    logger.info('Formula review scheduler: started — runs daily at 09:00 UTC (dedup via notification gate)');
}

// Export for manual testing / admin triggers
export { runFormulaReviewCheck };
