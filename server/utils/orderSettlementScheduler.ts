import cron from 'node-cron';
import { logger } from '../infra/logging/logger';
import { billingService } from '../modules/billing/billing.service';

/**
 * Billing Retry Schedulers
 * ─────────────────────────────────────────────────────────────
 * NOTE: Order settlement (calling billingService.settleOrder) has been
 * removed from this scheduler. Settlement now happens synchronously
 * inside billingService.processCheckout at the time of order creation.
 *
 * These crons handle only retry logic for operations that may have
 * transiently failed after the initial checkout/settlement attempt.
 */
export const startOrderSettlementScheduler = () => {
    logger.info('[BillingRetry] Initializing payout & refund retry schedulers...');

    // Payout Retry Scheduler: Run every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
        try {
            await billingService.retryFailedPayouts();
        } catch (err) {
            logger.error('[PayoutRetry] Scheduler runtime error', {
                error: err instanceof Error ? err.message : String(err)
            });
        }
    });

    // Refund Retry Scheduler: Run every 30 minutes to retry failed refunds
    cron.schedule('*/30 * * * *', async () => {
        try {
            await billingService.retryPendingRefunds();
        } catch (err) {
            logger.error('[RefundRetry] Scheduler runtime error', {
                error: err instanceof Error ? err.message : String(err)
            });
        }
    });

    logger.info('[BillingRetry] Payout retry (*/15 min) and refund retry (*/30 min) schedulers started.');
};
