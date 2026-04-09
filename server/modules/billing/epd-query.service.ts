/**
 * EPD Query Service
 * ─────────────────────────────────────────────────────
 * Wraps the EPD Query API to provide structured data for admin dashboards.
 * Parses XML responses from query.php into usable JSON.
 */

import { epdGateway } from './epd-gateway';
import logger from '../../infra/logging/logger';

// ── XML Parsing (lightweight, no dependency) ───────────────────────────

/**
 * Simple XML-to-object parser for EPD query responses.
 * EPD returns flat XML with <transaction>, <customer_vault>, etc. nodes.
 * This does NOT handle deeply nested/attributed XML — only EPD's format.
 */
function parseXmlToJson(xml: string): Record<string, any> {
  const result: Record<string, any> = {};

  // Extract all top-level transaction nodes
  const transactions = extractNodes(xml, 'transaction');
  if (transactions.length > 0) {
    result.transactions = transactions;
  }

  // Extract customer vault records
  const vaultRecords = extractNodes(xml, 'customer_vault');
  if (vaultRecords.length > 0) {
    result.customer_vault = vaultRecords;
  }

  // Extract subscription records
  const subscriptions = extractNodes(xml, 'subscription');
  if (subscriptions.length > 0) {
    result.subscriptions = subscriptions;
  }

  // Extract plan records
  const plans = extractNodes(xml, 'plan');
  if (plans.length > 0) {
    result.plans = plans;
  }

  // Extract invoice records
  const invoices = extractNodes(xml, 'invoice');
  if (invoices.length > 0) {
    result.invoices = invoices;
  }

  return result;
}

function extractNodes(xml: string, tagName: string): Record<string, string>[] {
  const regex = new RegExp(`<${tagName}>(.*?)</${tagName}>`, 'gs');
  const nodes: Record<string, string>[] = [];

  let match;
  while ((match = regex.exec(xml)) !== null) {
    const innerXml = match[1];
    const node: Record<string, string> = {};

    // Extract all child elements (flat values only)
    const fieldRegex = /<(\w+)>(.*?)<\/\1>/gs;
    let fieldMatch;
    while ((fieldMatch = fieldRegex.exec(innerXml)) !== null) {
      node[fieldMatch[1]] = fieldMatch[2];
    }

    // Also get empty self-closing or empty tags
    const emptyRegex = /<(\w+)\s*\/>/g;
    let emptyMatch;
    while ((emptyMatch = emptyRegex.exec(innerXml)) !== null) {
      node[emptyMatch[1]] = '';
    }

    if (Object.keys(node).length > 0) {
      nodes.push(node);
    }
  }

  return nodes;
}

// ── EPD Query Service ──────────────────────────────────────────────────

class EpdQueryService {
  /**
   * Search transactions with flexible filters.
   */
  async searchTransactions(filters: {
    startDate?: string;       // YYYYMMDD or YYYYMMDDhhmmss
    endDate?: string;
    condition?: string;       // 'pendingsettlement,complete'
    actionType?: string;      // 'sale,refund'
    email?: string;
    orderId?: string;
    transactionId?: string;
    firstName?: string;
    lastName?: string;
    limit?: number;
    page?: number;
    order?: 'standard' | 'reverse';
  }): Promise<{ transactions: Record<string, string>[] }> {
    try {
      const xml = await epdGateway.queryTransactions({
        start_date: filters.startDate,
        end_date: filters.endDate,
        condition: filters.condition,
        action_type: filters.actionType,
        email: filters.email,
        order_id: filters.orderId,
        transaction_id: filters.transactionId,
        first_name: filters.firstName,
        last_name: filters.lastName,
        result_limit: filters.limit?.toString(),
        page_number: filters.page?.toString(),
        result_order: filters.order,
      });

      const parsed = parseXmlToJson(xml);
      return { transactions: parsed.transactions || [] };
    } catch (err) {
      logger.error('EPD query: searchTransactions failed', { filters, error: err });
      throw new Error('EPD_QUERY_FAILED');
    }
  }

  /**
   * Get a single transaction's details.
   */
  async getTransaction(transactionId: string): Promise<Record<string, string> | null> {
    try {
      const xml = await epdGateway.queryTransaction(transactionId);
      const parsed = parseXmlToJson(xml);
      return parsed.transactions?.[0] || null;
    } catch (err) {
      logger.error('EPD query: getTransaction failed', { transactionId, error: err });
      throw new Error('EPD_QUERY_FAILED');
    }
  }

  /**
   * List all vault customers, or get a specific one.
   */
  async queryVault(customerVaultId?: string) {
    try {
      const xml = await epdGateway.queryVault(customerVaultId);
      const parsed = parseXmlToJson(xml);
      return parsed.customer_vault || [];
    } catch (err) {
      logger.error('EPD query: queryVault failed', { customerVaultId, error: err });
      throw new Error('EPD_QUERY_FAILED');
    }
  }

  /**
   * List all gateway-managed subscriptions.
   */
  async querySubscriptions(subscriptionId?: string) {
    try {
      const xml = await epdGateway.querySubscriptions(subscriptionId);
      const parsed = parseXmlToJson(xml);
      return parsed.subscriptions || [];
    } catch (err) {
      logger.error('EPD query: querySubscriptions failed', { subscriptionId, error: err });
      throw new Error('EPD_QUERY_FAILED');
    }
  }

  /**
   * List all recurring plans.
   */
  async queryPlans() {
    try {
      const xml = await epdGateway.queryPlans();
      const parsed = parseXmlToJson(xml);
      return parsed.plans || [];
    } catch (err) {
      logger.error('EPD query: queryPlans failed', { error: err });
      throw new Error('EPD_QUERY_FAILED');
    }
  }

  /**
   * Get recent transactions for the admin payments dashboard.
   * Returns the last N transactions in reverse chronological order.
   */
  async getRecentTransactions(limit: number = 50): Promise<Record<string, string>[]> {
    const result = await this.searchTransactions({
      limit,
      order: 'reverse',
    });
    return result.transactions;
  }

  /**
   * Get settlement-pending transactions.
   */
  async getPendingSettlement(): Promise<Record<string, string>[]> {
    const result = await this.searchTransactions({
      condition: 'pendingsettlement',
      order: 'reverse',
      limit: 100,
    });
    return result.transactions;
  }

  /**
   * Get completed (settled) transactions for a date range.
   */
  async getSettledTransactions(startDate: string, endDate: string): Promise<Record<string, string>[]> {
    const result = await this.searchTransactions({
      condition: 'complete',
      startDate,
      endDate,
      order: 'reverse',
      limit: 200,
    });
    return result.transactions;
  }
}

export const epdQueryService = new EpdQueryService();
