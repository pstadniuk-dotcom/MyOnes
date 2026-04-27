-- Orders Management — admin tooling expansion (cancel/void/notes/test-flag/tracking).
-- Purely additive: new columns + new table + new enum values. No drops or data rewrites.

-- 1. New admin_action enum values (Postgres requires one ALTER TYPE per value).
ALTER TYPE "admin_action" ADD VALUE IF NOT EXISTS 'order_cancel_no_refund';
ALTER TYPE "admin_action" ADD VALUE IF NOT EXISTS 'order_void';
ALTER TYPE "admin_action" ADD VALUE IF NOT EXISTS 'order_email_resent';
ALTER TYPE "admin_action" ADD VALUE IF NOT EXISTS 'order_test_flag';
ALTER TYPE "admin_action" ADD VALUE IF NOT EXISTS 'order_note_add';
ALTER TYPE "admin_action" ADD VALUE IF NOT EXISTS 'order_internal_view';

-- 2. New columns on orders.
ALTER TABLE "orders"
ADD COLUMN IF NOT EXISTS "tracking_number" text;

ALTER TABLE "orders"
ADD COLUMN IF NOT EXISTS "carrier" text;

ALTER TABLE "orders"
ADD COLUMN IF NOT EXISTS "is_test_order" boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "orders_is_test_order_idx" ON "orders" ("is_test_order");

-- 3. New table: order_notes (mutable, attributable internal notes).
CREATE TABLE IF NOT EXISTS "order_notes" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id" varchar NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "admin_id" varchar NOT NULL REFERENCES "users"("id"),
  "body" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "order_notes_order_idx" ON "order_notes" ("order_id");
