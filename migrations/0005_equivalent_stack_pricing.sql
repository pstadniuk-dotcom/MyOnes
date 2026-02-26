CREATE TABLE "ingredient_pricing" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ingredient_key" text NOT NULL,
	"ingredient_name" text NOT NULL,
	"typical_capsule_mg" integer NOT NULL,
	"typical_bottle_capsules" integer NOT NULL,
	"typical_retail_price_cents" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ingredient_pricing_ingredient_key_unique" UNIQUE("ingredient_key")
);
