/**
 * PR Agent Scheduler — Cron-based scheduling for all PR Agent automated tasks
 *
 * Schedules:
 * 1. Scan — search the web for new prospects (default: Mon + Thu at 6am UTC)
 * 2. Pitch — draft pitches for uncontacted prospects (default: Mon + Thu at 7am UTC)
 * 3. Follow-up — check and draft follow-ups for unresponsive prospects (daily at 9am UTC)
 * 4. Response detection — check Gmail for replies (every 4 hours)
 * 5. Competitor scan — weekly competitor media monitoring (Sunday at 8am UTC)
 * 6. Weekly summary — send PR activity digest (Friday at 5pm UTC)
 *
 * All schedules read config from app_settings on each run, so changes
 * in the admin UI take effect on the next scheduled tick.
 */
import cron from 'node-cron';
import logger from '../infra/logging/logger';
import { getPrAgentConfig } from '../modules/agent/agent-config';
import { runPrScan } from '../modules/agent/engines/pr-scan';
import { batchDraftPitches } from '../modules/agent/engines/draft-pitch';
import { processFollowUps } from '../modules/agent/engines/follow-up-scheduler';
import { detectResponses } from '../modules/agent/engines/response-detector';
import { runCompetitorScan } from '../modules/agent/engines/competitor-monitor';
import { sendWeeklySummaryEmail } from '../modules/agent/engines/weekly-summary';
import { checkBudgetAlert } from '../modules/agent/tools/cost-tracker';

let scanTask: ReturnType<typeof cron.schedule> | null = null;
let pitchTask: ReturnType<typeof cron.schedule> | null = null;
let followUpTask: ReturnType<typeof cron.schedule> | null = null;
let responseTask: ReturnType<typeof cron.schedule> | null = null;
let competitorTask: ReturnType<typeof cron.schedule> | null = null;
let summaryTask: ReturnType<typeof cron.schedule> | null = null;

/**
 * Start the PR Agent scheduler (OFF by default — enabled via Admin → PR Agent Settings)
 */
export function startPrAgentScheduler() {
  logger.info('[pr-scheduler] Registering PR Agent cron jobs');

  // ── Scan Job (Mon+Thu 6am UTC) ──────────────────────────────────────────
  scanTask = cron.schedule('0 6 * * 1,4', async () => {
    try {
      const config = await getPrAgentConfig();
      if (!config.enabled) {
        logger.info('[pr-scheduler] Scan skipped — PR Agent is disabled');
        return;
      }

      // Check budget before running
      const budget = await checkBudgetAlert();
      if (budget.alert) {
        logger.warn(`[pr-scheduler] Budget alert: ${budget.message}`);
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

  // ── Pitch Job (Mon+Thu 7am UTC) ──────────────────────────────────────────
  pitchTask = cron.schedule('0 7 * * 1,4', async () => {
    try {
      const config = await getPrAgentConfig();
      if (!config.enabled) {
        logger.info('[pr-scheduler] Pitch batch skipped — PR Agent is disabled');
        return;
      }

      logger.info('[pr-scheduler] Starting scheduled pitch batch');

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

  // ── Follow-Up Job (Daily 9am UTC) ────────────────────────────────────────
  followUpTask = cron.schedule('0 9 * * *', async () => {
    try {
      const config = await getPrAgentConfig();
      if (!config.enabled) return;

      logger.info('[pr-scheduler] Starting follow-up processing');
      const result = await processFollowUps();
      logger.info('[pr-scheduler] Follow-ups complete', {
        drafted: result.draftsCreated,
        maxReached: result.skippedMaxFollowUps,
        errors: result.errors.length,
      });
    } catch (err: any) {
      logger.error('[pr-scheduler] Follow-up processing failed', { error: err.message });
    }
  });

  // ── Response Detection (Every 4 hours) ────────────────────────────────────
  responseTask = cron.schedule('0 */4 * * *', async () => {
    try {
      const config = await getPrAgentConfig();
      if (!config.enabled || !config.gmailEnabled) return;

      logger.info('[pr-scheduler] Checking for responses');
      const result = await detectResponses();
      if (result.responsesFound > 0) {
        logger.info('[pr-scheduler] Responses detected', {
          checked: result.checked,
          found: result.responsesFound,
          responses: result.responses.map(r => `${r.prospectName}: ${r.classification}`),
        });
      }
    } catch (err: any) {
      logger.error('[pr-scheduler] Response detection failed', { error: err.message });
    }
  });

  // ── Competitor Scan (Sunday 8am UTC) ──────────────────────────────────────
  competitorTask = cron.schedule('0 8 * * 0', async () => {
    try {
      const config = await getPrAgentConfig();
      if (!config.enabled) return;

      logger.info('[pr-scheduler] Starting weekly competitor scan');
      const result = await runCompetitorScan();
      logger.info('[pr-scheduler] Competitor scan complete', {
        appearances: result.appearances.length,
        newProspects: result.prospectsCreated,
      });
    } catch (err: any) {
      logger.error('[pr-scheduler] Competitor scan failed', { error: err.message });
    }
  });

  // ── Weekly Summary Email (Friday 5pm UTC) ─────────────────────────────────
  summaryTask = cron.schedule('0 17 * * 5', async () => {
    try {
      const config = await getPrAgentConfig();
      if (!config.enabled) return;

      logger.info('[pr-scheduler] Sending weekly PR summary');
      await sendWeeklySummaryEmail(config.gmailFrom || 'pete@ones.health');
    } catch (err: any) {
      logger.error('[pr-scheduler] Weekly summary failed', { error: err.message });
    }
  });

  logger.info('[pr-scheduler] Cron jobs registered: scan(Mon+Thu 6am), pitch(Mon+Thu 7am), follow-up(daily 9am), responses(every 4h), competitors(Sun 8am), summary(Fri 5pm)');
  return { scanTask, pitchTask, followUpTask, responseTask, competitorTask, summaryTask };
}

export function stopPrAgentScheduler() {
  const tasks = [scanTask, pitchTask, followUpTask, responseTask, competitorTask, summaryTask];
  for (const task of tasks) {
    if (task) task.stop();
  }
  scanTask = pitchTask = followUpTask = responseTask = competitorTask = summaryTask = null;
  logger.info('[pr-scheduler] Stopped');
}
