/**
 * EPD Webhook Event Handler
 * ─────────────────────────────────────────────────────
 * Processes real-time webhook events pushed by EasyPayDirect.
 *
 * Events handled:
 *  - transaction.sale.success / .failure   — Order status updates
 *  - transaction.refund.success            — Refund confirmations
 *  - settlement.batch.complete / .failure  — Daily batch settlement
 *  - chargeback.batch.complete             — Chargeback alerts (critical)
 *  - recurring.subscription.*              — Subscription lifecycle
 *  - acu.summary.*                         — Automatic Card Updater results
 *
 * Setup: Configure webhook URL in EPD Dashboard → Settings → Webhooks
 * Endpoint: POST /api/webhooks/epd
 */

import logger from '../../infra/logging/logger';
import { sendNotificationEmail } from '../../utils/emailService';
import { db } from '../../infra/db/db';
import { orders, refunds } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

// ── Event Type Constants ───────────────────────────────────────────────

type EpdEventType =
  | 'transaction.sale.success'
  | 'transaction.sale.failure'
  | 'transaction.sale.unknown'
  | 'transaction.auth.success'
  | 'transaction.auth.failure'
  | 'transaction.refund.success'
  | 'transaction.refund.failure'
  | 'transaction.void.success'
  | 'transaction.void.failure'
  | 'transaction.capture.success'
  | 'transaction.capture.failure'
  | 'transaction.check.status.settle'
  | 'transaction.check.status.return'
  | 'transaction.check.status.latereturn'
  | 'recurring.subscription.add'
  | 'recurring.subscription.update'
  | 'recurring.subscription.delete'
  | 'recurring.plan.add'
  | 'recurring.plan.update'
  | 'recurring.plan.delete'
  | 'settlement.batch.complete'
  | 'settlement.batch.failure'
  | 'chargeback.batch.complete'
  | 'acu.summary.automaticallyupdated'
  | 'acu.summary.contactcustomer'
  | 'acu.summary.closedaccount';

// ── Webhook Event Shape ────────────────────────────────────────────────

export interface EpdWebhookEvent {
  event_id: string;
  event_type: EpdEventType;
  event_body: {
    merchant?: { id: string; name: string };
    features?: { is_test_mode: boolean };
    transaction_id?: string;
    transaction_type?: string;
    condition?: string;
    processor_id?: string;
    order_id?: string;
    order_description?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    amount?: string;
    currency?: string;
    action?: {
      action_type?: string;
      amount?: string;
      date?: string;
      success?: string;
      response_text?: string;
      batch_id?: string;
    };
    subscription?: {
      subscription_id?: string;
      plan_id?: string;
      plan_name?: string;
      plan_amount?: string;
      plan_payments?: string;
      day_frequency?: string;
      month_frequency?: string;
      day_of_month?: string;
    };
    settlement?: {
      batch_id?: string;
      credit_count?: string;
      credit_amount?: string;
      debit_count?: string;
      debit_amount?: string;
      net_amount?: string;
    };
    chargeback?: {
      reason_code?: string;
      chargeback_amount?: string;
      chargeback_date?: string;
      reply_date?: string;
    };
    customer_vault_id?: string;
    [key: string]: unknown;
  };
}

// ── Event Handler ──────────────────────────────────────────────────────

class EpdWebhooksService {
  /**
   * Route an incoming webhook event to the appropriate handler.
   */
  async handleEvent(event: EpdWebhookEvent): Promise<void> {
    const { event_type, event_id, event_body } = event;
    const isTest = event_body.features?.is_test_mode ?? false;

    logger.info('EPD webhook received', {
      event_id,
      event_type,
      transaction_id: event_body.transaction_id,
      order_id: event_body.order_id,
      is_test: isTest,
    });

    try {
      if (event_type.startsWith('transaction.sale')) {
        await this.handleTransactionSale(event);
      } else if (event_type.startsWith('transaction.refund')) {
        await this.handleTransactionRefund(event);
      } else if (event_type.startsWith('transaction.void')) {
        await this.handleTransactionVoid(event);
      } else if (event_type.startsWith('settlement.batch')) {
        await this.handleSettlementBatch(event);
      } else if (event_type.startsWith('chargeback')) {
        await this.handleChargeback(event);
      } else if (event_type.startsWith('recurring.subscription')) {
        await this.handleRecurringSubscription(event);
      } else if (event_type.startsWith('recurring.plan')) {
        await this.handleRecurringPlan(event);
      } else if (event_type.startsWith('acu.summary')) {
        await this.handleCardUpdate(event);
      } else if (event_type.startsWith('transaction.check.status')) {
        await this.handleCheckStatus(event);
      } else {
        logger.info('EPD webhook: unhandled event type', { event_type, event_id });
      }
    } catch (err) {
      logger.error('EPD webhook handler error', {
        event_type,
        event_id,
        error: err instanceof Error ? err.message : err,
      });
      throw err;
    }
  }

  // ── Transaction Events ─────────────────────────────────────────────

  private async handleTransactionSale(event: EpdWebhookEvent): Promise<void> {
    const { event_type, event_body } = event;
    const success = event_type === 'transaction.sale.success';
    const transactionId = event_body.transaction_id;

    if (success && transactionId) {
      logger.info('EPD: Sale confirmed via webhook', {
        transaction_id: transactionId,
        amount: event_body.action?.amount || event_body.amount,
        order_id: event_body.order_id,
        condition: event_body.condition,
      });

      // Update order status to confirm payment is authorized
      // We keep it in pending_confirmation as that's what the 4-minute scheduler looks for
      await db.update(orders)
        .set({ 
          status: 'pending_confirmation' as any,
          // If transaction_id changed (unlikely for sale.success), update it
          gatewayTransactionId: transactionId 
        })
        .where(eq(orders.gatewayTransactionId, transactionId));

    } else if (transactionId) {
      logger.warn('EPD: Sale failed via webhook', {
        transaction_id: transactionId,
        response_text: event_body.action?.response_text,
        order_id: event_body.order_id,
      });

      // Mark order as failed if payment didn't go through
      await db.update(orders)
        .set({ status: 'settlement_failed' as any })
        .where(eq(orders.gatewayTransactionId, transactionId));

      // Alert admin of failed transaction
      await this.alertAdmin(
        'Payment Failed Alert',
        `<p>A payment has failed on EPD (reported via webhook).</p>
         <p><strong>Transaction:</strong> ${transactionId}</p>
         <p><strong>Order ID (EPD):</strong> ${event_body.order_id || 'N/A'}</p>
         <p><strong>Customer:</strong> ${event_body.first_name || ''} ${event_body.last_name || ''} (${event_body.email || 'N/A'})</p>
         <p><strong>Amount:</strong> $${event_body.action?.amount || event_body.amount || 'N/A'}</p>
         <p><strong>Reason:</strong> ${event_body.action?.response_text || 'Unknown'}</p>`,
      );
    }
  }

  private async handleTransactionRefund(event: EpdWebhookEvent): Promise<void> {
    const success = event.event_type === 'transaction.refund.success';
    const body = event.event_body;
    const refundTransactionId = body.transaction_id as string | undefined;
    const originalTransactionId = body.ponumber as string | undefined; // Reference to original transaction (parent_transaction_id)

    logger.info('EPD: Refund event received', {
      success,
      refund_id: refundTransactionId,
      original_id: originalTransactionId,
      amount: body.action?.amount || body.requested_amount,
    });

    if (success && originalTransactionId) {
      // Update the refund record in our DB to approved
      // Matching by parentTransactionId (original sale) and status 'pending'
      await db.update(refunds)
        .set({ 
          status: 'approved',
          transactionId: refundTransactionId,
          gatewayResponse: body
        })
        .where(and(
          eq(refunds.parentTransactionId, originalTransactionId),
          eq(refunds.status, 'pending')
        ));

      logger.info('Refund status updated to approved in DB', { originalTransactionId });

    } else if (originalTransactionId) {
      // Mark as failed if we have a match
      await db.update(refunds)
        .set({ 
          status: 'failed' as any,
          gatewayResponse: body
        })
        .where(and(
          eq(refunds.parentTransactionId, originalTransactionId),
          eq(refunds.status, 'pending')
        ));

      await this.alertAdmin(
        'Refund Failed Alert',
        `<p>A refund attempt failed on EPD (reported via webhook).</p>
         <p><strong>Refund Transaction:</strong> ${refundTransactionId || 'N/A'}</p>
         <p><strong>Original Transaction:</strong> ${originalTransactionId}</p>
         <p><strong>Amount:</strong> $${body.action?.amount || body.requested_amount || 'N/A'}</p>
         <p><strong>Reason:</strong> ${body.action?.response_text || 'Unknown'}</p>`,
      );
    }
  }

  private async handleTransactionVoid(event: EpdWebhookEvent): Promise<void> {
    const success = event.event_type === 'transaction.void.success';
    const body = event.event_body;
    const voidTransactionId = body.transaction_id as string | undefined;
    const originalTransactionId = body.ponumber as string | undefined;

    logger.info('EPD: Void event received', {
      success,
      void_id: voidTransactionId,
      original_id: originalTransactionId
    });

    if (success && originalTransactionId) {
      // Voiding usually means we mark the refund as 'voided' or the order as 'cancelled'
      // Find the pending refund and mark as voided
      await db.update(refunds)
        .set({ status: 'voided', gatewayResponse: body })
        .where(and(
          eq(refunds.parentTransactionId, originalTransactionId),
          eq(refunds.status, 'pending')
        ));
      
      // Also ensure order is marked as cancelled
      await db.update(orders)
        .set({ status: 'cancelled' as any })
        .where(eq(orders.gatewayTransactionId, originalTransactionId));
    }
  }

  // ── Settlement Events ──────────────────────────────────────────────

  private async handleSettlementBatch(event: EpdWebhookEvent): Promise<void> {
    const success = event.event_type === 'settlement.batch.complete';
    const s = event.event_body.settlement;

    if (success && s) {
      logger.info('EPD: Settlement batch complete', {
        batch_id: s.batch_id,
        credit_count: s.credit_count,
        credit_amount: s.credit_amount,
        debit_count: s.debit_count,
        debit_amount: s.debit_amount,
        net_amount: s.net_amount,
      });

      await this.alertAdmin(
        'Daily Settlement Summary',
        `<p>EPD batch settlement complete.</p>
         <table style="border-collapse:collapse;width:100%;max-width:400px;">
           <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Batch ID</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${s.batch_id}</td></tr>
           <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Debits</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${s.debit_count} txns · $${s.debit_amount}</td></tr>
           <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Credits</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${s.credit_count} txns · $${s.credit_amount}</td></tr>
           <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Net</strong></td><td style="padding:4px 8px;border:1px solid #ddd;font-weight:bold;">$${s.net_amount}</td></tr>
         </table>`,
      );
    } else {
      logger.error('EPD: Settlement batch FAILED', { event_body: event.event_body });
      await this.alertAdmin(
        '🚨 Settlement Batch FAILED',
        `<p style="color:red;font-weight:bold;">Your EPD settlement batch has failed.</p>
         <p>Check the EPD dashboard immediately for details.</p>
         <p><strong>Batch ID:</strong> ${s?.batch_id || 'Unknown'}</p>`,
      );
    }
  }

  // ── Chargeback Events (CRITICAL) ───────────────────────────────────

  private async handleChargeback(event: EpdWebhookEvent): Promise<void> {
    const body = event.event_body;
    const cb = body.chargeback;

    logger.error('EPD: CHARGEBACK received', {
      transaction_id: body.transaction_id,
      order_id: body.order_id,
      chargeback_amount: cb?.chargeback_amount,
      reason_code: cb?.reason_code,
      reply_date: cb?.reply_date,
    });

    // Chargebacks are always critical — immediate admin alert
    await this.alertAdmin(
      '🚨 CHARGEBACK ALERT — Action Required',
      `<p style="color:red;font-weight:bold;">A chargeback has been filed against a transaction.</p>
       <p><strong>Transaction:</strong> ${body.transaction_id}</p>
       <p><strong>Order:</strong> ${body.order_id || 'N/A'}</p>
       <p><strong>Customer:</strong> ${body.first_name} ${body.last_name} (${body.email})</p>
       <p><strong>Chargeback Amount:</strong> $${cb?.chargeback_amount || 'N/A'}</p>
       <p><strong>Reason Code:</strong> ${cb?.reason_code || 'N/A'}</p>
       <p><strong>Chargeback Date:</strong> ${cb?.chargeback_date || 'N/A'}</p>
       <p><strong>Reply By:</strong> ${cb?.reply_date || 'N/A'}</p>
       <p>Log into the EPD dashboard to respond with evidence (tracking number, delivery confirmation, etc.).</p>`,
    );
  }

  // ── Recurring Subscription Events ──────────────────────────────────

  private async handleRecurringSubscription(event: EpdWebhookEvent): Promise<void> {
    const { event_type, event_body } = event;
    const sub = event_body.subscription;

    logger.info('EPD: Recurring subscription event', {
      event_type,
      subscription_id: sub?.subscription_id,
      plan_id: sub?.plan_id,
      plan_amount: sub?.plan_amount,
    });
  }

  private async handleRecurringPlan(event: EpdWebhookEvent): Promise<void> {
    logger.info('EPD: Recurring plan event', {
      event_type: event.event_type,
      plan_id: event.event_body.subscription?.plan_id,
    });
  }

  // ── Automatic Card Updater Events ──────────────────────────────────

  private async handleCardUpdate(event: EpdWebhookEvent): Promise<void> {
    const { event_type, event_body } = event;

    if (event_type === 'acu.summary.automaticallyupdated') {
      logger.info('EPD: Card automatically updated in vault', {
        customer_vault_id: event_body.customer_vault_id,
      });
    } else if (event_type === 'acu.summary.contactcustomer') {
      logger.warn('EPD: ACU — contact customer (card update failed)', {
        customer_vault_id: event_body.customer_vault_id,
      });
      await this.alertAdmin(
        'Card Update — Customer Contact Needed',
        `<p>The Automatic Card Updater could not update a customer's card.</p>
         <p><strong>Vault ID:</strong> ${event_body.customer_vault_id || 'N/A'}</p>
         <p>The customer may need to provide a new payment method manually.</p>`,
      );
    } else if (event_type === 'acu.summary.closedaccount') {
      logger.warn('EPD: ACU — closed account detected', {
        customer_vault_id: event_body.customer_vault_id,
      });
      await this.alertAdmin(
        'Card Update — Account Closed',
        `<p>A customer's card account has been closed by their bank.</p>
         <p><strong>Vault ID:</strong> ${event_body.customer_vault_id || 'N/A'}</p>
         <p>This customer will need to provide a new payment method. Any active auto-ship will fail on next charge.</p>`,
      );
    }
  }

  // ── ACH Check Status Events ────────────────────────────────────────

  private async handleCheckStatus(event: EpdWebhookEvent): Promise<void> {
    const { event_type, event_body } = event;

    if (event_type === 'transaction.check.status.return' || event_type === 'transaction.check.status.latereturn') {
      logger.warn('EPD: ACH transaction returned', {
        transaction_id: event_body.transaction_id,
        event_type,
      });
      await this.alertAdmin(
        'ACH Payment Returned',
        `<p>An ACH/check transaction has been returned.</p>
         <p><strong>Transaction:</strong> ${event_body.transaction_id}</p>
         <p><strong>Order:</strong> ${event_body.order_id || 'N/A'}</p>`,
      );
    }
  }

  // ── Utility ────────────────────────────────────────────────────────

  private async alertAdmin(subject: string, htmlContent: string): Promise<void> {
    const adminEmail = process.env.ADMIN_ALERT_EMAIL || process.env.SENDGRID_FROM_EMAIL;
    if (!adminEmail) {
      logger.warn('EPD webhook: No admin email configured for alerts');
      return;
    }

    try {
      await sendNotificationEmail({
        to: adminEmail,
        subject: `[ONES] ${subject}`,
        title: subject.replace(/🚨\s*/g, ''),
        content: htmlContent,
        type: 'system',
      });
    } catch (err) {
      logger.error('Failed to send EPD webhook admin alert', {
        subject,
        error: err instanceof Error ? err.message : err,
      });
    }
  }
}

export const epdWebhooksService = new EpdWebhooksService();
