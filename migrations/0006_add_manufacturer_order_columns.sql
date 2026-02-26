-- Migration: Add manufacturer order columns to orders table
-- These columns support the Alive Innovations API order pipeline

ALTER TABLE orders ADD COLUMN IF NOT EXISTS formula_id varchar REFERENCES formulas(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS manufacturer_cost_cents integer;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS supply_weeks integer DEFAULT 8;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS manufacturer_quote_id text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS manufacturer_quote_expires_at timestamp;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS manufacturer_order_id text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS manufacturer_order_status text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_session_id text;
