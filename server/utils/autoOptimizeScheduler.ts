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
 * Uses the subscriptions.renewsAt column (populated from Stripe's current_period_end)
 * so notifications are naturally tied to the billing cycle.
 *
 * Dedup: each user is notified at most once per renewal cycle via in-memory Set
 * that resets weekly (or on server restart).
 */

import cron from 'node-cron';
import { usersRepository } from '../modules/users/users.repository';
import { formulaReviewService } from '../modules/formulas/formula-review.service';
import logger from '../infra/logging/logger';

// Track users notified this cycle to avoid duplicate emails
const notifiedThisCycle = new Set<string>();

function resetCycleTracking() {
    notifiedThisCycle.clear();
    logger.info('Formula review scheduler: cycle tracking reset');
}

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
        if (notifiedThisCycle.has(sub.userId)) {
            skipped++;
            continue;
        }

        try {
            const status = await formulaReviewService.getReviewStatus(sub.userId);

            if (!status.needsReview) {
                skipped++;
                continue;
            }

            await formulaReviewService.sendReviewNotification(
                sub.userId,
                status.reasons,
                daysAhead,
            );

            notifiedThisCycle.add(sub.userId);
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

    logger.info('Formula review scheduler: daily check complete', {
        day7,
        day3,
        totalNotified: day7.notified + day3.notified,
    });
}

export function startAutoOptimizeScheduler() {
    logger.info('Formula review scheduler: starting...');

    // Daily at 9am UTC
    cron.schedule('0 9 * * *', async () => {
        await runFormulaReviewCheck();
    });

    // Reset cycle tracking every Sunday midnight UTC
    cron.schedule('0 0 * * 0', () => {
        resetCycleTracking();
    });

    logger.info('Formula review scheduler: started — runs daily at 09:00 UTC');
}

// Export for manual testing / admin triggers
export { runFormulaReviewCheck };
