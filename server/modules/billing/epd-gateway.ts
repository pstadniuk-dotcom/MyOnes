/**
 * EasyPayDirect Payment Gateway Client
 * ─────────────────────────────────────────────────────
 * Wraps the EPD Payment API (POST form-encoded).
 *
 * API Docs: https://secure.easypaydirectgateway.com/merchants/resources/integration/integration_portal.php
 *
 * Usage:
 *   // Charge with a Collect.js token (initial purchase, vaults card)
 *   const result = await epdGateway.sale({
 *     payment_token: 'tok_from_collectjs',
 *     amount: '99.00',
 *     customer_vault: 'add_customer',
 *     stored_credential_indicator: 'stored',
 *     initiated_by: 'customer',
 *   });
 *
 *   // Charge a vaulted customer (recurring / off-session)
 *   const result = await epdGateway.chargeVault({
 *     customer_vault_id: result.customer_vault_id,
 *     amount: '99.00',
 *     stored_credential_indicator: 'used',
 *     initiated_by: 'merchant',
 *     initial_transaction_id: result.transactionid,
 *     billing_method: 'recurring',
 *   });
 */

import logger from '../../infra/logging/logger';
import crypto from 'crypto';

const EPD_API_URL = 'https://secure.easypaydirectgateway.com/api/transact.php';
const EPD_QUERY_URL = 'https://secure.easypaydirectgateway.com/api/query.php';

// ── Response Types ─────────────────────────────────────────────────────

export interface EpdTransactionResponse {
  /** 1 = Approved, 2 = Declined, 3 = Error */
  response: '1' | '2' | '3';
  responsetext: string;
  authcode: string;
  transactionid: string;
  avsresponse: string;
  cvvresponse: string;
  orderid: string;
  response_code: string;
  /** Returned when customer_vault=add_customer */
  customer_vault_id?: string;
}

export function isApproved(res: EpdTransactionResponse): boolean {
  return res.response === '1';
}

// ── Request Parameter Types ────────────────────────────────────────────

export interface EpdSaleParams {
  amount: string;
  /** From Collect.js (one-time use) */
  payment_token?: string;
  /** For charging a vaulted customer */
  customer_vault_id?: string;
  /** Vault the card during this transaction */
  customer_vault?: 'add_customer' | 'update_customer';
  orderid?: string;
  orderdescription?: string;
  // Customer info
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  // Billing address
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  // Shipping address
  shipping_firstname?: string;
  shipping_lastname?: string;
  shipping_address1?: string;
  shipping_address2?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_zip?: string;
  shipping_country?: string;
  // Credential on file (PCI compliance)
  stored_credential_indicator?: 'stored' | 'used';
  initiated_by?: 'customer' | 'merchant';
  initial_transaction_id?: string;
  billing_method?: 'recurring';
  /** EPD auto-sends a receipt email to the customer */
  customer_receipt?: 'true' | 'false';
}

export interface EpdVaultChargeParams {
  customer_vault_id: string;
  amount: string;
  orderid?: string;
  orderdescription?: string;
  stored_credential_indicator?: 'used';
  initiated_by?: 'merchant';
  initial_transaction_id?: string;
  billing_method?: 'recurring';
  customer_receipt?: 'true' | 'false';
}

export interface EpdAddToVaultParams {
  payment_token: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address1?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

// ── Gateway Client ─────────────────────────────────────────────────────

class EpdGateway {
  private get securityKey(): string {
    const key = process.env.EPD_SECURITY_KEY;
    if (!key) throw new Error('EPD_SECURITY_KEY_NOT_CONFIGURED');
    return key;
  }

  /**
   * Low-level POST to EPD transact endpoint.
   * Handles form-encoding and response parsing.
   */
  private async post(params: Record<string, string>): Promise<EpdTransactionResponse> {
    const body = new URLSearchParams({
      security_key: this.securityKey,
      ...params,
    });

    const res = await fetch(EPD_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const text = await res.text();
    const parsed = Object.fromEntries(
      new URLSearchParams(text),
    ) as unknown as EpdTransactionResponse;

    if (parsed.response !== '1') {
      logger.warn('EPD transaction not approved', {
        response: parsed.response,
        responsetext: parsed.responsetext,
        response_code: parsed.response_code,
        transactionid: parsed.transactionid,
        orderid: params.orderid,
      });
    } else {
      logger.info('EPD transaction approved', {
        transactionid: parsed.transactionid,
        authcode: parsed.authcode,
        orderid: params.orderid,
        customer_vault_id: parsed.customer_vault_id,
      });
    }

    return parsed;
  }

  /** Strip undefined values from params object */
  private clean(params: Record<string, string | undefined>): Record<string, string> {
    return Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined),
    ) as Record<string, string>;
  }

  // ── Transaction Methods ──────────────────────────────────────────────

  /**
   * Sale: Charge immediately. Optionally vault the card for future charges.
   *
   * For initial purchases, pass `customer_vault: 'add_customer'` to store
   * the card and get back a `customer_vault_id` for recurring charges.
   */
  async sale(params: EpdSaleParams): Promise<EpdTransactionResponse> {
    return this.post(this.clean({ type: 'sale', ...params }));
  }

  /**
   * Auth: Authorize without settling. Must be captured later.
   */
  async authorize(params: EpdSaleParams): Promise<EpdTransactionResponse> {
    return this.post(this.clean({ type: 'auth', ...params }));
  }

  /**
   * Capture: Settle a previously authorized transaction.
   */
  async capture(transactionId: string, amount?: string): Promise<EpdTransactionResponse> {
    return this.post(this.clean({ type: 'capture', transactionid: transactionId, amount }));
  }

  /**
   * Payout: Transfer funds from the merchant account to a 3rd party or admin account.
   * This is a placeholder for the EPD Payout/Transfer API.
   * Verify the exact implementation with your EPD account manager.
   */
  async payout(params: {
    amount: string;
    destination_account: string;
    orderid?: string;
    description?: string;
  }): Promise<EpdTransactionResponse> {
    return this.post(this.clean({
      type: 'distribution',
      amount: params.amount,
      payee_id: params.destination_account,
      orderid: params.orderid,
      orderdescription: params.description,
    }));
  }

  /**
   * Void: Cancel a transaction before settlement.
   */
  async voidTransaction(transactionId: string): Promise<EpdTransactionResponse> {
    return this.post({ type: 'void', transactionid: transactionId });
  }

  /**
   * Refund: Reverse a previously settled transaction.
   * If amount is omitted, full refund is issued.
   */
  async refund(transactionId: string, amount?: string): Promise<EpdTransactionResponse> {
    return this.post(this.clean({ type: 'refund', transactionid: transactionId, amount }));
  }

  // ── Customer Vault Methods ───────────────────────────────────────────

  /**
   * Charge a vaulted customer (recurring / off-session).
   * No card details needed — uses stored payment method.
   */
  async chargeVault(params: EpdVaultChargeParams): Promise<EpdTransactionResponse> {
    return this.post(this.clean({ type: 'sale', ...params }));
  }

  /**
   * Add a customer to the vault without charging.
   * Uses validate transaction type (no auth amount).
   */
  async addToVault(params: EpdAddToVaultParams): Promise<EpdTransactionResponse> {
    return this.post(this.clean({ type: 'validate', customer_vault: 'add_customer', ...params }));
  }

  /**
   * Update a vault customer's payment info.
   */
  async updateVault(
    vaultId: string,
    params: Partial<EpdAddToVaultParams>,
  ): Promise<EpdTransactionResponse> {
    return this.post(
      this.clean({ customer_vault: 'update_customer', customer_vault_id: vaultId, ...params }),
    );
  }

  /**
   * Delete a customer from the vault.
   */
  async deleteFromVault(vaultId: string): Promise<EpdTransactionResponse> {
    return this.post({ customer_vault: 'delete_customer', customer_vault_id: vaultId });
  }

  // ── Transaction Update ───────────────────────────────────────────────

  /**
   * Update a settled transaction with tracking/shipping info.
   * Useful for chargeback defense — proves fulfillment.
   */
  async updateTransaction(transactionId: string, params: {
    tracking_number?: string;
    shipping_carrier?: 'ups' | 'fedex' | 'dhl' | 'usps';
    shipping_date?: string;
    order_description?: string;
  }): Promise<EpdTransactionResponse> {
    return this.post(this.clean({
      type: 'update',
      transactionid: transactionId,
      ...params,
    }));
  }

  // ── Recurring Plan Management ────────────────────────────────────────

  /**
   * Create a recurring plan on the EPD gateway.
   * Subscriptions can then be attached to this plan.
   */
  async addPlan(params: {
    plan_id: string;
    plan_name: string;
    plan_amount: string;
    plan_payments: string;
    month_frequency?: string;
    day_of_month?: string;
    day_frequency?: string;
  }): Promise<EpdTransactionResponse> {
    return this.post(this.clean({
      recurring: 'add_plan',
      ...params,
    }));
  }

  /**
   * Edit an existing recurring plan.
   * WARNING: All subscribers on this plan will be affected.
   */
  async editPlan(currentPlanId: string, updates: {
    plan_id?: string;
    plan_name?: string;
    plan_amount?: string;
    plan_payments?: string;
    month_frequency?: string;
    day_of_month?: string;
    day_frequency?: string;
  }): Promise<EpdTransactionResponse> {
    return this.post(this.clean({
      recurring: 'edit_plan',
      current_plan_id: currentPlanId,
      ...updates,
    }));
  }

  /**
   * Add a subscription to an existing plan using a vault customer.
   */
  async addSubscription(params: {
    plan_id: string;
    customer_vault_id?: string;
    payment_token?: string;
    start_date?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    orderid?: string;
    customer_receipt?: 'true' | 'false';
  }): Promise<EpdTransactionResponse> {
    return this.post(this.clean({
      recurring: 'add_subscription',
      ...params,
    }));
  }

  /**
   * Add a custom subscription (not tied to a plan).
   */
  async addCustomSubscription(params: {
    plan_amount: string;
    plan_payments: string;
    month_frequency?: string;
    day_of_month?: string;
    day_frequency?: string;
    start_date?: string;
    customer_vault_id?: string;
    payment_token?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    orderid?: string;
    customer_receipt?: 'true' | 'false';
    paused_subscription?: 'true' | 'false';
  }): Promise<EpdTransactionResponse> {
    return this.post(this.clean({
      recurring: 'add_subscription',
      ...params,
    }));
  }

  /**
   * Update a subscription (billing info, plan details, or pause/resume).
   */
  async updateSubscription(subscriptionId: string, updates: {
    plan_amount?: string;
    plan_payments?: string;
    month_frequency?: string;
    day_of_month?: string;
    day_frequency?: string;
    start_date?: string;
    payment_token?: string;
    customer_receipt?: 'true' | 'false';
    paused_subscription?: 'true' | 'false';
    first_name?: string;
    last_name?: string;
    email?: string;
  }): Promise<EpdTransactionResponse> {
    return this.post(this.clean({
      recurring: 'update_subscription',
      subscription_id: subscriptionId,
      ...updates,
    }));
  }

  /**
   * Delete a subscription — customer will no longer be charged.
   */
  async deleteSubscription(subscriptionId: string): Promise<EpdTransactionResponse> {
    return this.post({
      recurring: 'delete_subscription',
      subscription_id: subscriptionId,
    });
  }

  // ── Query API ────────────────────────────────────────────────────────

  /**
   * Query EPD for transaction data. Returns XML parsed to JSON.
   * This uses the separate query.php endpoint, not transact.php.
   */
  async query(params: EpdQueryParams): Promise<string> {
    const body = new URLSearchParams({
      security_key: this.securityKey,
      ...this.clean(params as Record<string, string | undefined>),
    });

    const res = await fetch(EPD_QUERY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    return res.text(); // Returns XML
  }

  /**
   * Query transactions with common search criteria.
   */
  async queryTransactions(params: {
    transaction_id?: string;
    start_date?: string;
    end_date?: string;
    condition?: string;
    action_type?: string;
    source?: string;
    email?: string;
    order_id?: string;
    first_name?: string;
    last_name?: string;
    result_limit?: string;
    page_number?: string;
    result_order?: 'standard' | 'reverse';
  }): Promise<string> {
    return this.query(params);
  }

  /**
   * Get a single transaction by ID.
   */
  async queryTransaction(transactionId: string): Promise<string> {
    return this.query({ transaction_id: transactionId });
  }

  /**
   * Query customer vault records.
   */
  async queryVault(customerVaultId?: string): Promise<string> {
    return this.query({
      report_type: 'customer_vault',
      customer_vault_id: customerVaultId,
    } as EpdQueryParams);
  }

  /**
   * Query recurring subscription data.
   */
  async querySubscriptions(subscriptionId?: string): Promise<string> {
    return this.query({
      report_type: 'recurring',
      subscription_id: subscriptionId,
    } as EpdQueryParams);
  }

  /**
   * Query recurring plan data.
   */
  async queryPlans(): Promise<string> {
    return this.query({ report_type: 'recurring_plans' } as EpdQueryParams);
  }

  /**
   * Query invoice data.
   */
  async queryInvoices(invoiceId?: string, status?: string): Promise<string> {
    return this.query({
      report_type: 'invoicing',
      invoice_id: invoiceId,
      invoice_status: status,
    } as EpdQueryParams);
  }
}

// ── Query API Types ────────────────────────────────────────────────────

export interface EpdQueryParams {
  transaction_id?: string;
  subscription_id?: string;
  invoice_id?: string;
  condition?: string;
  transaction_type?: string;
  action_type?: string;
  source?: string;
  start_date?: string;
  end_date?: string;
  report_type?: 'customer_vault' | 'recurring' | 'recurring_plans' | 'invoicing' | 'receipt';
  customer_vault_id?: string;
  email?: string;
  order_id?: string;
  first_name?: string;
  last_name?: string;
  result_limit?: string;
  page_number?: string;
  result_order?: 'standard' | 'reverse';
  invoice_status?: string;
}

// ── Webhook Signature Verification ─────────────────────────────────────

/**
 * Verify EPD webhook signature using HMAC-SHA256.
 * EPD sends: Webhook-Signature header with format "t={nonce},s={signature}"
 */
export function verifyEpdWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  signingKey: string,
): boolean {
  const match = signatureHeader.match(/t=(.*),s=(.*)/);
  if (!match) return false;

  const [, nonce, signature] = match;
  const expectedSig = crypto
    .createHmac('sha256', signingKey)
    .update(`${nonce}.${rawBody}`)
    .digest('hex');

  // Timing-safe comparison to prevent timing attacks
  if (expectedSig.length !== signature.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(expectedSig, 'utf-8'),
    Buffer.from(signature, 'utf-8'),
  );
}

export const epdGateway = new EpdGateway();

// ── Transaction-state XML parser ────────────────────────────────────────
// EPD's /query.php returns XML like:
//   <nm_response>
//     <transaction>
//       <transaction_id>...</transaction_id>
//       <condition>complete|pending|failed|...</condition>
//       <action>
//         <action_type>sale|refund|void|auth|capture</action_type>
//         <amount>10.00</amount>
//         <date>YYYYMMDDHHmmss</date>
//         <success>1|0</success>
//         <response_text>...</response_text>
//       </action>
//       (potentially multiple <action> blocks — refunds appear as later actions)
//     </transaction>
//   </nm_response>
// We extract the headline state plus the last action.

export interface ParsedTransactionState {
  transactionId: string | null;
  condition: string | null;
  lastActionType: string | null;
  lastAmount: string | null;
  lastDate: string | null;
  lastSuccess: boolean | null;
  lastResponseText: string | null;
  raw: string;
}

function pickInner(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return m ? m[1].trim() : null;
}

export function parseTransactionStateXml(xml: string): ParsedTransactionState {
  const txnBlock = pickInner(xml, 'transaction') ?? xml;
  const transactionId = pickInner(txnBlock, 'transaction_id');
  const condition = pickInner(txnBlock, 'condition');

  // Grab the LAST <action>...</action> block (most recent state change).
  const actionMatches = [...txnBlock.matchAll(/<action>([\s\S]*?)<\/action>/g)];
  const lastAction = actionMatches.length > 0 ? actionMatches[actionMatches.length - 1][1] : '';

  return {
    transactionId,
    condition,
    lastActionType: lastAction ? pickInner(lastAction, 'action_type') : null,
    lastAmount: lastAction ? pickInner(lastAction, 'amount') : null,
    lastDate: lastAction ? pickInner(lastAction, 'date') : null,
    lastSuccess: lastAction ? pickInner(lastAction, 'success') === '1' : null,
    lastResponseText: lastAction ? pickInner(lastAction, 'response_text') : null,
    raw: xml,
  };
}
