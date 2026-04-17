import cron from 'node-cron';
import { logger } from '../infra/logging/logger';
import { db } from '../infra/db/db';
import { orders } from '@shared/schema';
import { eq, and, lt } from 'drizzle-orm';
import { billingService } from '../modules/billing/billing.service';

/**
 * Order Settlement Scheduler
 * ─────────────────────────────────────────────────────────────
 * Polls for orders in 'pending_confirmation' status that have 
 * exceed the 4-minute cancellation window (Modified for testing).
 * 
 * Frequency: Every minute.
 */
export const startOrderSettlementScheduler = () => {
    logger.info('[OrderSettlement] Initializing scheduler...');
    
    // Run every minute (Modified for testing)
    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date();
            const fourMinutesAgo = new Date(now.getTime() - 4 * 60 * 1000);

            logger.info('[OrderSettlement] Checking for orders placed before:', { fourMinutesAgo: fourMinutesAgo.toISOString() });

            // Find orders stuck in pending_confirmation past the 4m window
            const pendingOrders = await db.select().from(orders).where(
                and(
                    eq(orders.status, 'pending_confirmation' as any),
                    lt(orders.placedAt, fourMinutesAgo)
                )
            );

            if (pendingOrders.length === 0) {
                logger.debug('[OrderSettlement] No orders ready for settlement.');
                return;
            }

            logger.info(`[OrderSettlement] Settling ${pendingOrders.length} orders...`);

            for (const order of pendingOrders) {
                try {
                    await billingService.settleOrder(order.id);
                } catch (err) {
                    logger.error('[OrderSettlement] Failed to settle order', { 
                        orderId: order.id, 
                        userId: order.userId,
                        error: err instanceof Error ? err.message : String(err)
                    });
                }
            }
            
            logger.info('[OrderSettlement] Run complete.');
        } catch (err) {
            logger.error('[OrderSettlement] Scheduler runtime error', { 
                error: err instanceof Error ? err.message : String(err)
            });
        }
    });

    // Payout Retry Scheduler: Run every minute (Modified for testing)
    cron.schedule('* * * * *', async () => {
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
};
