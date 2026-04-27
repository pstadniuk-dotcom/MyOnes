/**
 * Admin Orders Management — pure-logic tests
 * Covers the EPD transaction-state XML parser. The cancel/void state-machine,
 * note ownership checks, and bulk update guard-rails live in the admin
 * service which calls the DB; those are exercised via integration tests
 * (manual smoke + future supertest harness), not here.
 */

import { describe, it, expect } from 'vitest';
import './test-utils';
import { parseTransactionStateXml } from '../modules/billing/epd-gateway';

describe('parseTransactionStateXml', () => {
  it('extracts headline fields from a single-action sale', () => {
    const xml = `<?xml version="1.0"?>
      <nm_response>
        <transaction>
          <transaction_id>1234567890</transaction_id>
          <condition>complete</condition>
          <action>
            <action_type>sale</action_type>
            <amount>49.99</amount>
            <date>20260420112233</date>
            <success>1</success>
            <response_text>SUCCESS</response_text>
          </action>
        </transaction>
      </nm_response>`;
    const parsed = parseTransactionStateXml(xml);
    expect(parsed.transactionId).toBe('1234567890');
    expect(parsed.condition).toBe('complete');
    expect(parsed.lastActionType).toBe('sale');
    expect(parsed.lastAmount).toBe('49.99');
    expect(parsed.lastDate).toBe('20260420112233');
    expect(parsed.lastSuccess).toBe(true);
    expect(parsed.lastResponseText).toBe('SUCCESS');
  });

  it('returns the LAST action when multiple are present (e.g. sale + refund)', () => {
    const xml = `<nm_response>
        <transaction>
          <transaction_id>9999</transaction_id>
          <condition>complete</condition>
          <action>
            <action_type>sale</action_type>
            <amount>100.00</amount>
            <success>1</success>
            <response_text>SUCCESS</response_text>
          </action>
          <action>
            <action_type>refund</action_type>
            <amount>25.00</amount>
            <success>1</success>
            <response_text>REFUND APPROVED</response_text>
          </action>
        </transaction>
      </nm_response>`;
    const parsed = parseTransactionStateXml(xml);
    expect(parsed.lastActionType).toBe('refund');
    expect(parsed.lastAmount).toBe('25.00');
    expect(parsed.lastResponseText).toBe('REFUND APPROVED');
  });

  it('handles failed actions (success=0)', () => {
    const xml = `<nm_response>
        <transaction>
          <transaction_id>5555</transaction_id>
          <condition>failed</condition>
          <action>
            <action_type>sale</action_type>
            <amount>10.00</amount>
            <success>0</success>
            <response_text>DECLINED</response_text>
          </action>
        </transaction>
      </nm_response>`;
    const parsed = parseTransactionStateXml(xml);
    expect(parsed.condition).toBe('failed');
    expect(parsed.lastSuccess).toBe(false);
  });

  it('returns nulls when fields are missing', () => {
    const xml = `<nm_response><transaction></transaction></nm_response>`;
    const parsed = parseTransactionStateXml(xml);
    expect(parsed.transactionId).toBeNull();
    expect(parsed.condition).toBeNull();
    expect(parsed.lastActionType).toBeNull();
    expect(parsed.lastAmount).toBeNull();
    expect(parsed.lastSuccess).toBeNull();
  });

  it('handles a totally empty response without crashing', () => {
    const parsed = parseTransactionStateXml('');
    expect(parsed.transactionId).toBeNull();
    expect(parsed.lastActionType).toBeNull();
  });

  it('preserves the raw XML on the result', () => {
    const xml = '<nm_response><transaction><transaction_id>x</transaction_id></transaction></nm_response>';
    expect(parseTransactionStateXml(xml).raw).toBe(xml);
  });
});
