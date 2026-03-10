/**
 * PR Agent Scheduler — Cron-based scheduling for prospect scanning and pitch drafting
 *
 * Two independent schedules:
 * 1. Scan — search the web for new prospects (default: Mon + Thu at 6am UTC)
 * 2. Pitch — draft pitches for uncontacted prospects (default: Mon + Thu at 7am UTC)
 *
 * Both schedules read config from app_settings on each run, so changes
 * in the admin UI take effect on the next scheduled tick.
 */
import cron from 'node-cron';
import logger from '../infra/logging/logger';
import { getPrAgentConfig } from '../modules/agent/agent-config';
import { runPrScan } from '../modules/agent/engines/pr-scan';
import { batchDraftPitches } from '../modules/agent/engines/draft-pitch';

let scanTask: ReturnType<typeof cron.schedule> | null = null;
let pitchTask: ReturnType<typeof cron.schedule> | null = null;

/**
 * Start the PR Agent scheduler (OFF by default — enabled via Admin → PR Agent Settings)
 */
export function startPrAgentScheduler() {
  logger.info('[pr-scheduler] Registering PR Agent cron jobs');

  // ── Scan Job ──────────────────────────────────────────────────────────
  // Outer cron fires on a conservative schedule; inner logic checks if enabled
  scanTask = cron.schedule('0 6 * * 1,4', async () => {
    try {
      const config = await getPrAgentConfig();
      if (!config.enabled) {
        logger.info('[pr-scheduler] Scan skipped — PR Agent is disabled');
        return;
      }

      logger.info('[pr-scheduler] Starting scheduled prospect scan');
      const result = await runPrScan({
        categories: ['podcast', 'press'],
        queriesPerCategory: 3,
      });

      logger.info('[pr-scheduler] Scan complete', {
        prospectsFound: result.prospectsNew,
        podcasts: result.categories.podcast,
        press: result.categories.press,
        errors: result.errors.length,
      });
    } catch (err: any) {
      logger.error('[pr-scheduler] Scan failed', { error: err.message });
    }
  });

  // ── Pitch Job ─────────────────────────────────────────────────────────
  pitchTask = cron.schedule('0 7 * * 1,4', async () => {
    try {
      const config = await getPrAgentConfig();
      if (!config.enabled) {
        logger.info('[pr-scheduler] Pitch batch skipped — PR Agent is disabled');
        return;
      }

      logger.info('[pr-scheduler] Starting scheduled pitch batch');

      // Draft for both categories
      const podcastResult = await batchDraftPitches({ category: 'podcast' });
      const pressResult = await batchDraftPitches({ category: 'press' });

      logger.info('[pr-scheduler] Pitch batch complete', {
        podcastPitches: podcastResult.pitched.length,
        pressPitches: pressResult.pitched.length,
        errors: [...podcastResult.errors, ...pressResult.errors].length,
      });
    } catch (err: any) {
      logger.error('[pr-scheduler] Pitch batch failed', { error: err.message });
    }
  });

  logger.info('[pr-scheduler] Cron jobs registered (scan: Mon+Thu 6am, pitch: Mon+Thu 7am)');
  return { scanTask, pitchTask };
}

export function stopPrAgentScheduler() {
  if (scanTask) {
    scanTask.stop();
    scanTask = null;
  }
  if (pitchTask) {
    pitchTask.stop();
    pitchTask = null;
  }
  logger.info('[pr-scheduler] Stopped');
}
