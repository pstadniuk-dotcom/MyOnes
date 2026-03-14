/**
 * Follow-Up Scheduler — Automatically draft follow-up emails for unresponsive prospects
 *
 * Runs daily at 9am, checks for sent pitches past their followUpDueAt date,
 * and auto-drafts follow-up emails. Follow-ups are routed to the review queue
 * (never auto-sent).
 */
import logger from '../../../infra/logging/logger';
import { agentRepository } from '../agent.repository';
import { getPrAgentConfig } from '../agent-config';
import { draftFollowUp } from './draft-pitch';

export interface FollowUpResult {
  checked: number;
  draftsCreated: number;
  skippedMaxFollowUps: number;
  skippedResponded: number;
  errors: string[];
}

/**
 * Check for pitches needing follow-up and auto-draft follow-up emails
 */
export async function processFollowUps(): Promise<FollowUpResult> {
  const config = await getPrAgentConfig();
  const result: FollowUpResult = {
    checked: 0,
    draftsCreated: 0,
    skippedMaxFollowUps: 0,
    skippedResponded: 0,
    errors: [],
  };

  try {
    // Get all sent pitches past their follow-up due date
    const pending = await agentRepository.getPendingFollowUps();
    result.checked = pending.length;

    if (pending.length === 0) {
      logger.info('[follow-up] No follow-ups due');
      return result;
    }

    logger.info(`[follow-up] Processing ${pending.length} pending follow-ups`);

    for (const { pitch, prospect } of pending) {
      try {
        // Skip if prospect has responded
        if (pitch.responseReceived) {
          result.skippedResponded++;
          continue;
        }

        // Determine follow-up number from pitch type
        const followUpNum = pitch.pitchType === 'initial' ? 1
          : pitch.pitchType === 'follow_up_1' ? 2
          : pitch.pitchType === 'follow_up_2' ? 3
          : 99;

        // Skip if max follow-ups reached
        if (followUpNum > config.maxFollowUps) {
          result.skippedMaxFollowUps++;
          // Mark prospect as cold if max follow-ups reached with no response
          if (prospect.status === 'pitched') {
            await agentRepository.updateProspectStatus(prospect.id, 'cold');
          }
          continue;
        }

        // Draft the follow-up
        await draftFollowUp(pitch, prospect);
        result.draftsCreated++;

        logger.info(`[follow-up] Drafted follow-up #${followUpNum} for "${prospect.name}"`);

        // Brief pause between API calls
        await new Promise(r => setTimeout(r, 1000));
      } catch (err: any) {
        const msg = `Follow-up failed for "${prospect.name}": ${err.message}`;
        result.errors.push(msg);
        logger.warn(`[follow-up] ${msg}`);
      }
    }

    logger.info(`[follow-up] Complete: ${result.draftsCreated} drafted, ${result.skippedMaxFollowUps} max reached, ${result.errors.length} errors`);
  } catch (err: any) {
    logger.error(`[follow-up] Fatal error: ${err.message}`);
    result.errors.push(err.message);
  }

  return result;
}
