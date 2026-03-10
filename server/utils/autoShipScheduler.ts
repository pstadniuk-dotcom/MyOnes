/**
 * Auto-Ship Pre-Renewal Scheduler
 *
 * Runs daily at 8am UTC (before the review scheduler at 9am).
 * For auto-ship subscriptions renewing in the next 10 days:
 *  - Refreshes the manufacturer quote (gets fresh price from Alive)
 *  - If the price changed, updates Stripe subscription and notifies user
 *
 * This ensures users are always charged the correct, up-to-date price
 * and have time to review any price changes before their card is charged.
 */

import cron from 'node-cron';
import { autoShipRepository } from '../modules/billing/autoship.repository';
import { autoShipService } from '../modules/billing/autoship.service';
import logger from '../infra/logging/logger';

const PRE_RENEWAL_DAYS = 10; // Refresh quotes 10 days before renewal

async function refreshUpcomingAutoShipQuotes() {
  logger.info('Auto-ship pre-renewal scheduler: starting daily check');

  let refreshed = 0;
  let skipped = 0;
  let errors = 0;

  try {
    const upcoming = await autoShipRepository.getUpcomingShipments(PRE_RENEWAL_DAYS);

    for (const autoShip of upcoming) {
      try {
        await autoShipService.refreshPreRenewalQuote(autoShip.id);
        refreshed++;
      } catch (err) {
        errors++;
        logger.error('Auto-ship pre-renewal: failed to refresh quote', {
          autoShipId: autoShip.id,
          userId: autoShip.userId,
          error: err instanceof Error ? err.message : err,
        });
      }
    }
  } catch (err) {
    logger.error('Auto-ship pre-renewal scheduler: failed to fetch upcoming shipments', {
      error: err instanceof Error ? err.message : err,
    });
  }

  const summary = { refreshed, skipped, errors, preRenewalDays: PRE_RENEWAL_DAYS };
  logger.info('Auto-ship pre-renewal scheduler: daily check complete', summary);
  return summary;
}

export function startAutoShipScheduler() {
  logger.info('Auto-ship pre-renewal scheduler: starting...');

  // Daily at 8am UTC — runs before the formula review scheduler (9am)
  cron.schedule('0 8 * * *', async () => {
    await refreshUpcomingAutoShipQuotes();
  });

  logger.info('Auto-ship pre-renewal scheduler: started — runs daily at 08:00 UTC');
}

// Export for manual testing / admin triggers
export { refreshUpcomingAutoShipQuotes };
