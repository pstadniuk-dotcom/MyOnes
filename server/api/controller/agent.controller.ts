/**
 * Agent Controller — API handlers for PR Agent operations
 */
import type { Request, Response } from 'express';
import { existsSync } from 'fs';
import { resolve, basename } from 'path';
import { agentRepository } from '../../modules/agent/agent.repository';
import { getPrAgentConfig, savePrAgentConfig, getDefaultConfig } from '../../modules/agent/agent-config';
import { getFounderProfile, saveFounderProfile, getDefaultProfile } from '../../modules/agent/founder-context';
import { runPrScan } from '../../modules/agent/engines/pr-scan';
import { draftPitch, batchDraftPitches, draftFollowUp, rewritePitch } from '../../modules/agent/engines/draft-pitch';
import { sendPitchEmail, sendApprovedPitches } from '../../modules/agent/engines/gmail-sender';
import { detectAndFillForm } from '../../modules/agent/tools/form-filler';
import { ALL_TEMPLATES } from '../../modules/agent/templates/pitch-templates';
import logger from '../../infra/logging/logger';

// ── Dashboard / Stats ────────────────────────────────────────────────────────

export async function getAgentDashboard(req: Request, res: Response) {
  try {
    const stats = await agentRepository.getStatsWithFollowUps();
    const config = await getPrAgentConfig();
    const recentRuns = await agentRepository.getLatestRuns(undefined, 5);
    res.json({ stats, enabled: config.enabled, recentRuns });
  } catch (err: any) {
    logger.error('[agent-api] Dashboard error', { error: err.message });
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
}

// ── Prospects ────────────────────────────────────────────────────────────────

export async function listProspects(req: Request, res: Response) {
  try {
    const { category, status, minScore, limit, offset } = req.query;
    const result = await agentRepository.listProspects({
      category: category as any,
      status: status as any,
      minScore: minScore ? Number(minScore) : undefined,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
    res.json(result);
  } catch (err: any) {
    logger.error('[agent-api] List prospects error', { error: err.message });
    res.status(500).json({ error: 'Failed to list prospects' });
  }
}

export async function getProspect(req: Request, res: Response) {
  try {
    const prospect = await agentRepository.getProspectById(req.params.id);
    if (!prospect) return res.status(404).json({ error: 'Prospect not found' });
    res.json(prospect);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get prospect' });
  }
}

export async function updateProspect(req: Request, res: Response) {
  try {
    await agentRepository.updateProspect(req.params.id, req.body);
    const updated = await agentRepository.getProspectById(req.params.id);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update prospect' });
  }
}

// ── Pitches ──────────────────────────────────────────────────────────────────

export async function listPitches(req: Request, res: Response) {
  try {
    const { category, status, limit, offset, prospectId } = req.query;
    if (prospectId) {
      // Return pitches for a specific prospect
      const result = await agentRepository.getPitchesWithProspects({
        category: category as any,
        status: status as any,
        limit: limit ? Number(limit) : 50,
        offset: offset ? Number(offset) : 0,
      });
      // Filter client-side for prospectId (repo already joins)
      const filtered = result.filter(r => r.pitch.prospectId === prospectId);
      return res.json(filtered);
    }
    const result = await agentRepository.getPitchesWithProspects({
      category: category as any,
      status: status as any,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to list pitches' });
  }
}

export async function getPitch(req: Request, res: Response) {
  try {
    const pitch = await agentRepository.getPitchById(req.params.id);
    if (!pitch) return res.status(404).json({ error: 'Pitch not found' });
    const prospect = await agentRepository.getProspectById(pitch.prospectId);
    res.json({ pitch, prospect });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get pitch' });
  }
}

export async function updatePitch(req: Request, res: Response) {
  try {
    await agentRepository.updatePitch(req.params.id, req.body);
    const updated = await agentRepository.getPitchById(req.params.id);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update pitch' });
  }
}

export async function approvePitch(req: Request, res: Response) {
  try {
    await agentRepository.updatePitch(req.params.id, {
      status: 'approved',
      reviewedBy: (req as any).userId,
      reviewedAt: new Date(),
    });
    const updated = await agentRepository.getPitchById(req.params.id);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to approve pitch' });
  }
}

export async function rejectPitch(req: Request, res: Response) {
  try {
    await agentRepository.updatePitch(req.params.id, {
      status: 'rejected',
      reviewedBy: (req as any).userId,
      reviewedAt: new Date(),
    });
    const updated = await agentRepository.getPitchById(req.params.id);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to reject pitch' });
  }
}

export async function aiRewritePitch(req: Request, res: Response) {
  try {
    const { instructions } = req.body;
    if (!instructions || typeof instructions !== 'string') {
      return res.status(400).json({ error: 'instructions field is required' });
    }
    const result = await rewritePitch(req.params.id, instructions);
    res.json(result);
  } catch (err: any) {
    logger.error('[agent-api] AI rewrite failed', { error: err.message });
    res.status(500).json({ error: `Failed to rewrite pitch: ${err.message}` });
  }
}

// ── Actions ──────────────────────────────────────────────────────────────────

export async function triggerScan(req: Request, res: Response) {
  try {
    const { categories, queriesPerCategory, maxProspects } = req.body;
    // Run asynchronously so the API returns immediately
    const promise = runPrScan({
      categories: categories || ['podcast', 'press'],
      queriesPerCategory: queriesPerCategory || 3,
      maxProspects: maxProspects || 20,
    });

    // Return the run ID immediately
    promise.then(result => {
      logger.info('[agent-api] Manual scan complete', { prospectsNew: result.prospectsNew });
    }).catch(err => {
      logger.error('[agent-api] Manual scan failed', { error: err.message });
    });

    res.json({ message: 'Scan started. Check the Runs tab for progress.', status: 'running' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to start scan' });
  }
}

export async function triggerPitchBatch(req: Request, res: Response) {
  try {
    const { category, maxPitches } = req.body;
    const promise = batchDraftPitches({ category, maxPitches });

    promise.then(result => {
      logger.info('[agent-api] Pitch batch complete', { pitched: result.pitched.length });
    }).catch(err => {
      logger.error('[agent-api] Pitch batch failed', { error: err.message });
    });

    res.json({ message: 'Pitch batch started. Drafts will appear in the review queue.', status: 'running' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to start pitch batch' });
  }
}

export async function triggerDraftPitch(req: Request, res: Response) {
  try {
    const prospect = await agentRepository.getProspectById(req.params.prospectId);
    if (!prospect) return res.status(404).json({ error: 'Prospect not found' });

    const result = await draftPitch(prospect);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to draft pitch: ${err.message}` });
  }
}

export async function triggerSendPitch(req: Request, res: Response) {
  try {
    const pitch = await agentRepository.getPitchById(req.params.id);
    if (!pitch) return res.status(404).json({ error: 'Pitch not found' });
    const prospect = await agentRepository.getProspectById(pitch.prospectId);
    if (!prospect) return res.status(404).json({ error: 'Prospect not found' });

    // Route form-based prospects to the form filler instead of email
    if (prospect.contactMethod === 'form') {
      const formResult = await detectAndFillForm(prospect, pitch, { autoSubmit: true });
      if (formResult.errors.length > 0 && formResult.fieldsFilled === 0) {
        return res.status(502).json({
          success: false,
          error: `Form fill failed: ${formResult.errors.join('; ')}`,
          formResult,
        });
      }
      // Update pitch status based on whether form was actually submitted
      const config = await getPrAgentConfig();
      if (formResult.submitted) {
        const updateData: Record<string, any> = {
          status: 'sent',
          sentAt: new Date(),
          sentVia: 'form_auto',
        };
        // Only schedule follow-up if the prospect also has an email address
        // (form-only contacts have no mechanism to receive follow-up emails)
        if (prospect.contactEmail) {
          updateData.followUpDueAt = new Date(Date.now() + config.followUpDays * 24 * 60 * 60 * 1000);
        }
        await agentRepository.updatePitch(pitch.id, updateData);
        await agentRepository.updateProspect(prospect.id, { status: 'pitched' });
      } else if (formResult.fieldsFilled > 0) {
        // Form was filled but not submitted (CAPTCHA or submit failed)
        await agentRepository.updatePitch(pitch.id, { sentVia: 'form_manual' });
      }
      return res.json({
        success: true,
        method: 'form',
        formResult,
        message: formResult.submitted
          ? `Form submitted! ${formResult.fieldsFilled}/${formResult.fieldsDetected} fields filled and form submitted.`
          : `Filled ${formResult.fieldsFilled}/${formResult.fieldsDetected} fields${formResult.hasCaptcha ? ' — CAPTCHA detected, submit manually at: ' + formResult.url : ' but auto-submit failed. Submit manually.'}`,
      });
    }

    const result = await sendPitchEmail(pitch, prospect);
    if (!result.success) {
      return res.status(502).json({ error: result.error || 'Send failed' });
    }
    res.json({ ...result, method: 'email' });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to send pitch: ${err.message}` });
  }
}

export async function triggerSendAllApproved(req: Request, res: Response) {
  try {
    const promise = sendApprovedPitches();
    promise.then(result => {
      logger.info('[agent-api] Send all approved complete', result);
    }).catch(err => {
      logger.error('[agent-api] Send all approved failed', { error: err.message });
    });
    res.json({ message: 'Sending approved pitches. Check Sent tab for status.', status: 'running' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to send pitches' });
  }
}

export async function triggerFormFill(req: Request, res: Response) {
  try {
    const pitch = await agentRepository.getPitchById(req.params.pitchId);
    if (!pitch) return res.status(404).json({ error: 'Pitch not found' });
    const prospect = await agentRepository.getProspectById(pitch.prospectId);
    if (!prospect) return res.status(404).json({ error: 'Prospect not found' });
    if (prospect.contactMethod !== 'form') {
      return res.status(400).json({ error: 'Prospect contact method is not form-based' });
    }

    // triggerFormFill is a preview/test — does NOT auto-submit
    const result = await detectAndFillForm(prospect, pitch, { autoSubmit: false });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to fill form: ${err.message}` });
  }
}

// ── Runs ─────────────────────────────────────────────────────────────────────

export async function listRuns(req: Request, res: Response) {
  try {
    const { agentName, limit } = req.query;
    const runs = await agentRepository.getLatestRuns(
      agentName as string | undefined,
      limit ? Number(limit) : 20,
    );
    res.json(runs);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to list runs' });
  }
}

export async function getRun(req: Request, res: Response) {
  try {
    const run = await agentRepository.getRunById(req.params.id);
    if (!run) return res.status(404).json({ error: 'Run not found' });
    res.json(run);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get run' });
  }
}

// ── Config ───────────────────────────────────────────────────────────────────

export async function getConfig(req: Request, res: Response) {
  try {
    const config = await getPrAgentConfig();
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get config' });
  }
}

export async function updateConfig(req: Request, res: Response) {
  try {
    const updated = await savePrAgentConfig(req.body, (req as any).userId);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update config' });
  }
}

export async function resetConfig(req: Request, res: Response) {
  try {
    const defaults = getDefaultConfig();
    const updated = await savePrAgentConfig(defaults, (req as any).userId);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to reset config' });
  }
}

// ── Founder Profile ──────────────────────────────────────────────────────────

export async function getProfile(req: Request, res: Response) {
  try {
    const profile = await getFounderProfile();
    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get profile' });
  }
}

export async function updateProfile(req: Request, res: Response) {
  try {
    const updated = await saveFounderProfile(req.body, (req as any).userId);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
}

export async function resetProfile(req: Request, res: Response) {
  try {
    const defaults = getDefaultProfile();
    const updated = await saveFounderProfile(defaults, (req as any).userId);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to reset profile' });
  }
}

// ── Gmail OAuth Config ───────────────────────────────────────────────────────

const GMAIL_CONFIG_KEY = 'gmail_oauth_config';

export async function getGmailConfig(req: Request, res: Response) {
  try {
    const config = await agentRepository.getAgentConfig(GMAIL_CONFIG_KEY);
    if (!config || !config.clientId) {
      return res.json({ clientId: '', clientSecret: '', refreshToken: '', configured: false });
    }
    // Mask secrets — return last 6 chars only
    const mask = (s: string) => s ? '•'.repeat(Math.max(0, s.length - 6)) + s.slice(-6) : '';
    res.json({
      clientId: mask(config.clientId),
      clientSecret: mask(config.clientSecret),
      refreshToken: mask(config.refreshToken),
      configured: true,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get Gmail config' });
  }
}

export async function updateGmailConfig(req: Request, res: Response) {
  try {
    const { clientId, clientSecret, refreshToken } = req.body;
    if (!clientId || !clientSecret || !refreshToken) {
      return res.status(400).json({ error: 'clientId, clientSecret, and refreshToken are required' });
    }

    // If values contain mask chars (•), merge with existing — user didn't change that field
    const existing = await agentRepository.getAgentConfig(GMAIL_CONFIG_KEY) as Record<string, string> | null;
    const resolve = (newVal: string, field: string) =>
      newVal.includes('•') && existing?.[field] ? existing[field] : newVal;

    const merged = {
      clientId: resolve(clientId, 'clientId'),
      clientSecret: resolve(clientSecret, 'clientSecret'),
      refreshToken: resolve(refreshToken, 'refreshToken'),
    };

    await agentRepository.saveAgentConfig(GMAIL_CONFIG_KEY, merged, (req as any).userId);
    logger.info('[agent-api] Gmail OAuth credentials updated');
    res.json({ configured: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save Gmail config' });
  }
}

export async function deleteGmailConfig(req: Request, res: Response) {
  try {
    await agentRepository.saveAgentConfig(GMAIL_CONFIG_KEY, {}, (req as any).userId);
    logger.info('[agent-api] Gmail OAuth credentials removed');
    res.json({ configured: false });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to remove Gmail config' });
  }
}

// ── Templates ────────────────────────────────────────────────────────────────

export async function listTemplates(req: Request, res: Response) {
  try {
    res.json(ALL_TEMPLATES);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to list templates' });
  }
}

// ── Delete Operations ────────────────────────────────────────────────────────

export async function deleteProspect(req: Request, res: Response) {
  try {
    const prospect = await agentRepository.getProspectById(req.params.id);
    if (!prospect) return res.status(404).json({ error: 'Prospect not found' });
    await agentRepository.deleteProspect(req.params.id);
    logger.info(`[agent-api] Prospect deleted: ${prospect.name}`);
    res.json({ success: true });
  } catch (err: any) {
    logger.error('[agent-api] Delete prospect error', { error: err.message });
    res.status(500).json({ error: 'Failed to delete prospect' });
  }
}

export async function deletePitch(req: Request, res: Response) {
  try {
    const pitch = await agentRepository.getPitchById(req.params.id);
    if (!pitch) return res.status(404).json({ error: 'Pitch not found' });
    await agentRepository.deletePitch(req.params.id);
    logger.info(`[agent-api] Pitch deleted: ${pitch.id}`);
    res.json({ success: true });
  } catch (err: any) {
    logger.error('[agent-api] Delete pitch error', { error: err.message });
    res.status(500).json({ error: 'Failed to delete pitch' });
  }
}

// ── Follow-Up & Response Tracking ────────────────────────────────────────────

export async function markPitchResponded(req: Request, res: Response) {
  try {
    const pitch = await agentRepository.getPitchById(req.params.id);
    if (!pitch) return res.status(404).json({ error: 'Pitch not found' });

    await agentRepository.markPitchResponded(pitch.id);

    // Also update the prospect status
    await agentRepository.updateProspectStatus(pitch.prospectId, 'responded');

    logger.info(`[agent-api] Pitch marked as responded: ${pitch.id}`);
    res.json({ success: true });
  } catch (err: any) {
    logger.error('[agent-api] Mark responded error', { error: err.message });
    res.status(500).json({ error: 'Failed to mark as responded' });
  }
}

export async function triggerFollowUp(req: Request, res: Response) {
  try {
    const pitch = await agentRepository.getPitchById(req.params.id);
    if (!pitch) return res.status(404).json({ error: 'Pitch not found' });
    const prospect = await agentRepository.getProspectById(pitch.prospectId);
    if (!prospect) return res.status(404).json({ error: 'Prospect not found' });

    // Block follow-ups for form-only contacts (no email to send to)
    if (prospect.contactMethod === 'form' && !prospect.contactEmail) {
      return res.status(400).json({ error: 'Cannot draft follow-up for form-only contacts — no email address available.' });
    }

    const result = await draftFollowUp(pitch, prospect);
    res.json(result);
  } catch (err: any) {
    logger.error('[agent-api] Follow-up draft failed', { error: err.message });
    res.status(500).json({ error: `Failed to draft follow-up: ${err.message}` });
  }
}

export async function getPendingFollowUps(req: Request, res: Response) {
  try {
    const pending = await agentRepository.getPendingFollowUps();
    res.json(pending);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get pending follow-ups' });
  }
}

// ── Form Screenshots ─────────────────────────────────────────────────────────

export async function getFormScreenshot(req: Request, res: Response) {
  try {
    const pitch = await agentRepository.getPitchById(req.params.id);
    if (!pitch) return res.status(404).json({ error: 'Pitch not found' });

    const type = req.params.type; // 'filled' or 'submitted'
    const screenshotPath = type === 'submitted'
      ? (pitch as any).formScreenshotSubmitted
      : (pitch as any).formScreenshotFilled;

    if (!screenshotPath) {
      return res.status(404).json({ error: `No ${type} screenshot available` });
    }

    // Security: ensure the path is within the expected screenshots directory
    const resolved = resolve(screenshotPath);
    const screenshotsDir = resolve(process.cwd(), 'data', 'form-screenshots');
    if (!resolved.startsWith(screenshotsDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!existsSync(resolved)) {
      return res.status(404).json({ error: 'Screenshot file not found' });
    }

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="${basename(resolved)}"`);
    res.sendFile(resolved);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to serve screenshot' });
  }
}
