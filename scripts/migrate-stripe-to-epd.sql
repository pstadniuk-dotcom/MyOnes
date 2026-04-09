-- Migration: Stripe columns → EPD columns
-- Safe to run: 0 orders, 0 subscriptions, 0 autoships in DB
-- Date: 2026-04-09

BEGIN;

-- ═══════════════════════════════════════════
-- 1. USERS TABLE
-- ═══════════════════════════════════════════
-- Add new EPD columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_vault_id text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS initial_transaction_id text;

-- Copy any existing Stripe data (just in case)
UPDATE users SET payment_vault_id = stripe_customer_id WHERE stripe_customer_id IS NOT NULL AND payment_vault_id IS NULL;

-- Drop old Stripe columns
ALTER TABLE users DROP COLUMN IF EXISTS stripe_customer_id;
ALTER TABLE users DROP COLUMN IF EXISTS stripe_subscription_id;

-- Add index on payment_vault_id
CREATE INDEX IF NOT EXISTS users_payment_vault_idx ON users (payment_vault_id);

-- ═══════════════════════════════════════════
-- 2. ORDERS TABLE
-- ═══════════════════════════════════════════
-- Rename stripe_session_id → gateway_transaction_id
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gateway_transaction_id text;
UPDATE orders SET gateway_transaction_id = stripe_session_id WHERE stripe_session_id IS NOT NULL AND gateway_transaction_id IS NULL;
ALTER TABLE orders DROP COLUMN IF EXISTS stripe_session_id;

-- ═══════════════════════════════════════════
-- 3. SUBSCRIPTIONS TABLE
-- ═══════════════════════════════════════════
-- Add payment_vault_id, drop stripe columns
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payment_vault_id varchar;
UPDATE subscriptions SET payment_vault_id = stripe_customer_id WHERE stripe_customer_id IS NOT NULL AND payment_vault_id IS NULL;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS stripe_customer_id;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS stripe_subscription_id;

-- ═══════════════════════════════════════════
-- 4. AUTO_SHIP_SUBSCRIPTIONS TABLE
-- ═══════════════════════════════════════════
-- Drop all Stripe columns (no EPD replacement needed — autoship is scheduler-driven)
ALTER TABLE auto_ship_subscriptions DROP COLUMN IF EXISTS stripe_subscription_id;
ALTER TABLE auto_ship_subscriptions DROP COLUMN IF EXISTS stripe_product_id;
ALTER TABLE auto_ship_subscriptions DROP COLUMN IF EXISTS stripe_price_id;

-- ═══════════════════════════════════════════
-- 5. PAYMENT_METHOD_REFS TABLE
-- ═══════════════════════════════════════════
-- Rename stripe_payment_method_id → payment_vault_id
ALTER TABLE payment_method_refs ADD COLUMN IF NOT EXISTS payment_vault_id varchar;
UPDATE payment_method_refs SET payment_vault_id = stripe_payment_method_id WHERE stripe_payment_method_id IS NOT NULL AND payment_vault_id IS NULL;
ALTER TABLE payment_method_refs DROP COLUMN IF EXISTS stripe_payment_method_id;

COMMIT;
