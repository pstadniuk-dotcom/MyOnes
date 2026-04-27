-- Discount Codes feature: admin-managed promo/coupon codes redeemable at checkout.
-- This migration is purely additive (new enum + 2 new tables + 2 new columns on orders).

-- 1. New enum
DO $$ BEGIN
  CREATE TYPE "discount_code_type" AS ENUM ('percent', 'fixed_cents', 'free_shipping');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. discount_codes table
CREATE TABLE IF NOT EXISTS "discount_codes" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" text NOT NULL UNIQUE,
  "description" text,
  "type" "discount_code_type" NOT NULL,
  "value" integer NOT NULL,
  "max_uses" integer,
  "used_count" integer NOT NULL DEFAULT 0,
  "max_uses_per_user" integer NOT NULL DEFAULT 1,
  "min_order_cents" integer NOT NULL DEFAULT 0,
  "first_order_only" boolean NOT NULL DEFAULT false,
  "stackable_with_member" boolean NOT NULL DEFAULT false,
  "expires_at" timestamp,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_by" varchar NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "discount_codes_code_idx" ON "discount_codes" ("code");
CREATE INDEX IF NOT EXISTS "discount_codes_active_idx" ON "discount_codes" ("is_active");

-- 3. discount_code_redemptions table — tracks per-user redemptions; orderId nulls out if charge fails / order is deleted.
CREATE TABLE IF NOT EXISTS "discount_code_redemptions" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "discount_code_id" varchar NOT NULL REFERENCES "discount_codes"("id") ON DELETE CASCADE,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "order_id" varchar REFERENCES "orders"("id") ON DELETE SET NULL,
  "amount_applied_cents" integer NOT NULL,
  "redeemed_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "redemptions_user_code_idx" ON "discount_code_redemptions" ("user_id", "discount_code_id");
CREATE INDEX IF NOT EXISTS "redemptions_order_idx" ON "discount_code_redemptions" ("order_id");

-- 4. Add discount columns to orders. Both safe to add to existing rows.
ALTER TABLE "orders"
ADD COLUMN IF NOT EXISTS "discount_code_id" varchar REFERENCES "discount_codes"("id") ON DELETE SET NULL;

ALTER TABLE "orders"
ADD COLUMN IF NOT EXISTS "discount_applied_cents" integer NOT NULL DEFAULT 0;
