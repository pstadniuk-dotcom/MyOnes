/**
 * PR Agent Scheduler — Cron-based scheduling for prospect scanning, pitch drafting, and follow-ups
 *
 * Three independent schedules:
 * 1. Scan — search the web for new prospects (reads cron from config, default: Mon + Thu at 6am UTC)
 * 2. Pitch — draft pitches for uncontacted prospects (reads cron from config, default: Mon + Thu at 7am UTC)
 * 3. Follow-up — draft follow-ups for sent pitches that haven't received a response (daily at 8am UTC)
 *
 * All schedules read config from app_settings on each run, so changes
 * in the admin UI take effect on the next scheduled tick.
 */
import cron from 'node-cron';
import logger from '../infra/logging/logger';
import { getPrAgentConfig } from '../modules/agent/agent-config';
import { runPrScan } from '../modules/agent/engines/pr-scan';
import { batchDraftPitches, draftFollowUp } from '../modules/agent/engines/draft-pitch';
import { agentRepository } from '../modules/agent/agent.repository';

let scanTask: ReturnType<typeof cron.schedule> | null = null;
let pitchTask: ReturnType<typeof cron.schedule> | null = null;
let followUpTask: ReturnType<typeof cron.schedule> | null = null;

/**
 * Start the PR Agent scheduler (OFF by default — enabled via Admin → PR Agent Settings)
 */
export function startPrAgentScheduler() {
  logger.info('[pr-scheduler] Registering PR Agent cron jobs');

  // ── Scan Job ──────────────────────────────────────────────────────────
  // Uses config scanCron, falls back to Mon+Thu 6am
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

  // ── Follow-Up Job ─────────────────────────────────────────────────────
  // Runs daily at 8am UTC — drafts follow-ups for sent pitches that are due
  followUpTask = cron.schedule('0 8 * * *', async () => {
    try {
      const config = await getPrAgentConfig();
      if (!config.enabled) {
        logger.info('[pr-scheduler] Follow-up check skipped — PR Agent is disabled');
        return;
      }

      const pending = await agentRepository.getPendingFollowUps();
      if (pending.length === 0) {
        logger.info('[pr-scheduler] No follow-ups due');
        return;
      }

      logger.info(`[pr-scheduler] Processing ${pending.length} pending follow-ups`);
      let drafted = 0;
      let errors = 0;

      for (const { pitch, prospect } of pending) {
        try {
          await draftFollowUp(pitch, prospect);
          drafted++;
        } catch (err: any) {
          logger.error(`[pr-scheduler] Follow-up failed for "${prospect.name}": ${err.message}`);
          errors++;
        }
        // Brief pause between API calls
        await new Promise(r => setTimeout(r, 1000));
      }

      logger.info(`[pr-scheduler] Follow-up batch complete: ${drafted} drafted, ${errors} errors`);
    } catch (err: any) {
      logger.error('[pr-scheduler] Follow-up job failed', { error: err.message });
    }
  });

  logger.info('[pr-scheduler] Cron jobs registered (scan: Mon+Thu 6am, pitch: Mon+Thu 7am, follow-ups: daily 8am)');
  return { scanTask, pitchTask, followUpTask };
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
  if (followUpTask) {
    followUpTask.stop();
    followUpTask = null;
  }
  logger.info('[pr-scheduler] Stopped');
}
