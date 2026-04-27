-- Generic per-tick run history for all background schedulers.
-- Powers the admin Agents dashboard. Purely additive: new table, no column changes.
-- Reuses existing `agent_run_status` enum.

CREATE TABLE IF NOT EXISTS "scheduler_runs" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "scheduler_name" varchar(64) NOT NULL,
  "status" "agent_run_status" NOT NULL,
  "started_at" timestamp NOT NULL DEFAULT now(),
  "completed_at" timestamp,
  "duration_ms" integer,
  "summary" json,
  "error_message" text,
  "triggered_by" varchar(32) NOT NULL DEFAULT 'cron'
);

-- Lookup pattern: most-recent runs per scheduler.
CREATE INDEX IF NOT EXISTS "scheduler_runs_name_started_idx"
  ON "scheduler_runs" ("scheduler_name", "started_at" DESC);
