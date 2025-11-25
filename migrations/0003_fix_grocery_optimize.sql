ALTER TABLE "grocery_lists" DROP CONSTRAINT IF EXISTS "grocery_lists_meal_plan_id_meal_plans_id_fk";
--> statement-breakpoint
ALTER TABLE "grocery_lists" RENAME COLUMN "meal_plan_id" TO "optimize_plan_id";
--> statement-breakpoint
ALTER TABLE "grocery_lists" ADD CONSTRAINT "grocery_lists_optimize_plan_id_optimize_plans_id_fk" FOREIGN KEY ("optimize_plan_id") REFERENCES "public"."optimize_plans"("id") ON DELETE SET NULL;
