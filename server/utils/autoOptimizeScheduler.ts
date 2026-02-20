/**
 * Auto-Optimize Scheduler
 *
 * Runs once per day at 9am UTC.
 * For every user who has a formula:
 *  - Checks formula drift via formulaReviewService.getReviewStatus()
 *  - If needsReview=true AND autoOptimizeFormula=true  → sends "auto_updated" notification
 *  - If needsReview=true AND autoOptimizeFormula=false → sends "manual_review_needed" notification
 *
 * Uses an in-memory set to avoid re-notifying the same user within the same week.
 */

import cron from 'node-cron';
import { storage } from '../storage';
import { formulaReviewService } from '../modules/formulas/formula-review.service';
import logger from '../infra/logging/logger';

// Track users notified this week to avoid spam
const notifiedThisWeek = new Set<string>();

function resetWeeklyTracking() {
    notifiedThisWeek.clear();
    logger.info('Auto-optimize scheduler: weekly notification tracking reset');
}

async function runAutoOptimizeCheck() {
    logger.info('Auto-optimize scheduler: starting daily check');

    const allUsers = await storage.listAllUsers?.() || [];
    let checked = 0;
    let notified = 0;
    let errors = 0;

    for (const user of allUsers) {
        if (notifiedThisWeek.has(user.id)) continue;

        try {
            const status = await formulaReviewService.getReviewStatus(user.id);

            if (!status.needsReview) continue;

            // Determine notification mode
            const mode = status.autoOptimizeEnabled
                ? 'auto_updated'
                : 'manual_review_needed';

            await formulaReviewService.sendReviewNotification(
                user.id,
                mode,
                status.reasons,
            );

            notifiedThisWeek.add(user.id);
            notified++;

            logger.info('Auto-optimize scheduler: notified user', {
                userId: user.id,
                mode,
                driftScore: status.driftScore,
                reasons: status.reasons,
            });
        } catch (err) {
            errors++;
            logger.error('Auto-optimize scheduler: error processing user', {
                userId: user.id,
                err,
            });
        }

        checked++;
    }

    logger.info('Auto-optimize scheduler: daily check complete', {
        usersChecked: checked,
        usersNotified: notified,
        errors,
    });
}

export function startAutoOptimizeScheduler() {
    logger.info('Auto-optimize scheduler: starting...');

    // Daily at 9am UTC
    cron.schedule('0 9 * * *', async () => {
        await runAutoOptimizeCheck();
    });

    // Reset weekly notification tracking every Sunday midnight UTC
    cron.schedule('0 0 * * 0', () => {
        resetWeeklyTracking();
    });

    logger.info('Auto-optimize scheduler: started — runs daily at 09:00 UTC');
}

// Export for manual testing / admin triggers
export { runAutoOptimizeCheck };
