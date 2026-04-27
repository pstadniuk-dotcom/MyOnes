import cron from 'node-cron';
import { logger } from '../infra/logging/logger';
import { billingService } from '../modules/billing/billing.service';
import { runScheduledJob } from './schedulerRunner';

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
    // alertOnFailure=false: high-frequency retry loop, individual failures are
    // expected and logged; we don't want an email every 15 minutes.
    cron.schedule('*/15 * * * *', async () => {
        await runScheduledJob('order_settlement', async () => {
            await billingService.retryFailedPayouts();
            return { subtask: 'payout_retry' };
        }, 'cron', { alertOnFailure: false });
    });

    // Refund Retry Scheduler: Run every 30 minutes to retry failed refunds
    cron.schedule('*/30 * * * *', async () => {
        await runScheduledJob('order_settlement', async () => {
            await billingService.retryPendingRefunds();
            return { subtask: 'refund_retry' };
        }, 'cron', { alertOnFailure: false });
    });

    logger.info('[BillingRetry] Payout retry (*/15 min) and refund retry (*/30 min) schedulers started.');
};
