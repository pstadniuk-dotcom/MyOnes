CREATE TYPE "public"."review_frequency" AS ENUM('monthly', 'bimonthly', 'quarterly');--> statement-breakpoint
CREATE TABLE "review_schedules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"formula_id" varchar NOT NULL,
	"frequency" "review_frequency" NOT NULL,
	"days_before" integer DEFAULT 5 NOT NULL,
	"next_review_date" timestamp NOT NULL,
	"last_review_date" timestamp,
	"email_reminders" boolean DEFAULT true NOT NULL,
	"sms_reminders" boolean DEFAULT false NOT NULL,
	"calendar_integration" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "review_schedules" ADD CONSTRAINT "review_schedules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_schedules" ADD CONSTRAINT "review_schedules_formula_id_formulas_id_fk" FOREIGN KEY ("formula_id") REFERENCES "public"."formulas"("id") ON DELETE cascade ON UPDATE no action;