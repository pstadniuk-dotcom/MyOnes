/**
 * Smart Re-Order Scheduler
 *
 * Runs three jobs:
 * 1. REVIEW JOB (daily at 7am UTC): Find schedules where supply runs out in ≤5 days,
 *    run AI wearable analysis, and send SMS/email nudge.
 * 2. AUTO-APPROVE JOB (every 4h): Process recommendations where 48h have passed
 *    with no reply → auto-default to KEEP.
 * 3. CHARGE JOB (daily at 10am UTC): Charge approved schedules and create new orders.
 */

import cron from 'node-cron';
import { reorderRepository } from '../modules/reorder/reorder.repository';
import { reorderService } from '../modules/reorder/reorder.service';
import logger from '../infra/logging/logger';

const REVIEW_DAYS_BEFORE = 5;

/**
 * Find schedules due for review and run AI analysis + send notifications.
 */
async function processScheduleReviews() {
  logger.info('[SmartReorder] Review job: starting');

  let reviewed = 0;
  let errors = 0;

  try {
    // Schedules where supply ends within the review window
    const reviewWindowDate = new Date(Date.now() + REVIEW_DAYS_BEFORE * 24 * 60 * 60 * 1000);
    const dueSchedules = await reorderRepository.getSchedulesDueForReview(reviewWindowDate);

    logger.info(`[SmartReorder] Found ${dueSchedules.length} schedules due for review`);

    for (const schedule of dueSchedules) {
      try {
        // Check if we already have a recommendation for this schedule
        const existing = await reorderRepository.getRecommendationByScheduleId(schedule.id);
        if (existing) {
          logger.info(`[SmartReorder] Schedule ${schedule.id} already has recommendation, skipping`);
          continue;
        }

        // Run AI review
        const recommendation = await reorderService.runAIReview(schedule);

        // Send SMS + email
        await reorderService.sendReorderNotification(recommendation, schedule);

        reviewed++;
        logger.info(`[SmartReorder] Completed review for schedule ${schedule.id}, user ${schedule.userId}`);
      } catch (err) {
        errors++;
        logger.error(`[SmartReorder] Review failed for schedule ${schedule.id}:`, err);
      }
    }
  } catch (err) {
    logger.error('[SmartReorder] Review job failed:', err);
  }

  const summary = { reviewed, errors };
  logger.info('[SmartReorder] Review job complete', summary);
  return summary;
}

/**
 * Auto-approve recommendations past their 48h deadline.
 */
async function processAutoApprovals() {
  logger.info('[SmartReorder] Auto-approve job: starting');

  try {
    const count = await reorderService.processAutoApprovals();
    logger.info(`[SmartReorder] Auto-approved ${count} recommendations (no reply within 48h)`);
    return count;
  } catch (err) {
    logger.error('[SmartReorder] Auto-approve job failed:', err);
    return 0;
  }
}

/**
 * Charge approved orders and create new cycles.
 */
async function processCharges() {
  logger.info('[SmartReorder] Charge job: starting');

  try {
    const count = await reorderService.chargeApprovedOrders();
    logger.info(`[SmartReorder] Charged ${count} approved reorders`);
    return count;
  } catch (err) {
    logger.error('[SmartReorder] Charge job failed:', err);
    return 0;
  }
}

export function startSmartReorderScheduler() {
  logger.info('[SmartReorder] Scheduler starting...');

  // 1. Review job — daily at 7am UTC (before auto-ship scheduler at 8am)
  cron.schedule('0 7 * * *', async () => {
    await processScheduleReviews();
  });

  // 2. Auto-approve job — every 4 hours
  cron.schedule('0 */4 * * *', async () => {
    await processAutoApprovals();
  });

  // 3. Charge job — daily at 10am UTC
  cron.schedule('0 10 * * *', async () => {
    await processCharges();
  });

  logger.info('[SmartReorder] Scheduler started — review 7am UTC, auto-approve every 4h, charge 10am UTC');
}

// Export individual functions for manual testing / admin triggers
export { processScheduleReviews, processAutoApprovals, processCharges };
