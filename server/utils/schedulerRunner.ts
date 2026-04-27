/**
 * runScheduledJob — wrap any scheduler tick (cron callback or manual trigger)
 * in a single helper that records the run to `scheduler_runs` and emails admins
 * on failure. Powers the admin Agents dashboard.
 *
 * Each scheduler stays responsible for its own internal logic; this wrapper
 * only adds: row in scheduler_runs (status=running → completed/failed),
 * timing, error capture, optional admin alert.
 */
import { db } from '../infra/db/db';
import { schedulerRuns } from '../../shared/schema';
import { eq, sql } from 'drizzle-orm';
import logger from '../infra/logging/logger';
import { sendAdminAlert } from './emailService';

export type RunTrigger = 'cron' | 'manual';

export interface ScheduledJobOptions {
  /** When true (default), email admins on failure. Set false for noisy/expected failures. */
  alertOnFailure?: boolean;
}

/**
 * Run a scheduler task with full lifecycle tracking.
 *
 * The job function should return a JSON-serializable summary (e.g.
 * { generated: 5, failed: 0 }) which is persisted on the row and shown in
 * the admin dashboard. Throwing marks the run as failed.
 */
export async function runScheduledJob<T extends Record<string, any> | void>(
  schedulerName: string,
  fn: () => Promise<T>,
  trigger: RunTrigger = 'cron',
  options: ScheduledJobOptions = {},
): Promise<{ runId: string | null; status: 'completed' | 'failed'; result: T | null; error?: string }> {
  const { alertOnFailure = true } = options;
  const startedAt = new Date();
  let runId: string | null = null;

  // Insert the running row. If this fails, log and continue — we never let the
  // tracking layer block the actual job from running.
  try {
    const [row] = await db
      .insert(schedulerRuns)
      .values({
        schedulerName,
        status: 'running',
        startedAt,
        triggeredBy: trigger,
      })
      .returning({ id: schedulerRuns.id });
    runId = row.id;
  } catch (err: any) {
    logger.warn(`[scheduler-runner] Failed to record run start for ${schedulerName}`, { error: err?.message });
  }

  try {
    const result = await fn();
    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();
    const summary = (result && typeof result === 'object') ? result as Record<string, any> : null;

    if (runId) {
      await db
        .update(schedulerRuns)
        .set({ status: 'completed', completedAt, durationMs, summary })
        .where(eq(schedulerRuns.id, runId))
        .catch((err) => logger.warn(`[scheduler-runner] Failed to update run ${runId}`, { error: err?.message }));
    }

    return { runId, status: 'completed', result: result as T | null };
  } catch (err: any) {
    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();
    const errorMessage = err?.message || String(err);

    if (runId) {
      await db
        .update(schedulerRuns)
        .set({ status: 'failed', completedAt, durationMs, errorMessage })
        .where(eq(schedulerRuns.id, runId))
        .catch((dbErr) => logger.warn(`[scheduler-runner] Failed to update failed run ${runId}`, { error: dbErr?.message }));
    }

    logger.error(`[scheduler-runner] ${schedulerName} failed`, { error: errorMessage, trigger });

    if (alertOnFailure) {
      sendAdminAlert(
        `Scheduler failed: ${schedulerName}`,
        `Trigger: ${trigger}\nStarted: ${startedAt.toISOString()}\nDuration: ${durationMs}ms\n\nError:\n${errorMessage}`,
      ).catch(() => {});
    }

    return { runId, status: 'failed', result: null, error: errorMessage };
  }
}

/**
 * Fetch the most recent run for a scheduler. Used by the admin dashboard to
 * show last-run status. Returns null if the scheduler has never run.
 */
export async function getLatestRun(schedulerName: string) {
  const rows = await db
    .select()
    .from(schedulerRuns)
    .where(eq(schedulerRuns.schedulerName, schedulerName))
    .orderBy(sql`${schedulerRuns.startedAt} DESC`)
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Fetch recent runs for a scheduler (newest first). Used on the agent detail
 * panel.
 */
export async function getRecentRuns(schedulerName: string, limit = 50) {
  return db
    .select()
    .from(schedulerRuns)
    .where(eq(schedulerRuns.schedulerName, schedulerName))
    .orderBy(sql`${schedulerRuns.startedAt} DESC`)
    .limit(limit);
}
