/**
 * Agent Controller — API handlers for PR Agent operations
 *
 * Improvements over original:
 * - OAuth credentials encrypted at rest via fieldEncryption
 * - Scan/pitch mutex to prevent concurrent runs
 * - Returns runId from async triggers for progress tracking
 * - Input validation on config updates via Zod
 * - New endpoints: analytics funnel, cost tracking, enrichment,
 *   competitor scan, response detection, follow-up processing,
 *   pitch quality scoring, weekly summary
 */
import type { Request, Response } from 'express';
import { existsSync } from 'fs';
import { resolve, basename } from 'path';
import { z } from 'zod';
import { agentRepository } from '../../modules/agent/agent.repository';
import { getPrAgentConfig, savePrAgentConfig, getDefaultConfig, prAgentConfigSchema } from '../../modules/agent/agent-config';
import { getFounderProfile, saveFounderProfile, getDefaultProfile } from '../../modules/agent/founder-context';
import { runPrScan } from '../../modules/agent/engines/pr-scan';
import { draftPitch, batchDraftPitches, draftFollowUp, rewritePitch } from '../../modules/agent/engines/draft-pitch';
import { sendPitchEmail, sendApprovedPitches } from '../../modules/agent/engines/gmail-sender';
import { detectAndFillForm } from '../../modules/agent/tools/form-filler';
import { ALL_TEMPLATES } from '../../modules/agent/templates/pitch-templates';
import { scorePitchQuality } from '../../modules/agent/tools/pitch-quality';
import { getMonthlySpend, checkBudgetAlert } from '../../modules/agent/tools/cost-tracker';
import { enrichProspect, batchEnrichProspects } from '../../modules/agent/tools/prospect-enrichment';
import { getPlatformStats } from '../../modules/agent/tools/platform-stats';
import { detectResponses } from '../../modules/agent/engines/response-detector';
import { processFollowUps } from '../../modules/agent/engines/follow-up-scheduler';
import { runCompetitorScan } from '../../modules/agent/engines/competitor-monitor';
import { generateWeeklySummary, sendWeeklySummaryEmail } from '../../modules/agent/engines/weekly-summary';
import { prioritizeProspects } from '../../modules/agent/engines/smart-prioritization';
import { generateChannelMessages } from '../../modules/agent/engines/multi-channel';
import { draftPressRelease } from '../../modules/agent/engines/press-release-drafter';
import { encryptField, decryptField } from '../../infra/security/fieldEncryption';
import logger from '../../infra/logging/logger';

// ── Mutex locks for scan/pitch operations ────────────────────────────────────
let scanRunning = false;
let pitchBatchRunning = false;

// ── Dashboard / Stats ────────────────────────────────────────────────────────

export async function getAgentDashboard(req: Request, res: Response) {
  try {
    const stats = await agentRepository.getStatsWithFollowUps();
    const config = await getPrAgentConfig();
    const recentRuns = await agentRepository.getLatestRuns(undefined, 5);

    // Include funnel data and cost info
    let costInfo = null;
    try { costInfo = await getMonthlySpend(); } catch { /* optional */ }

    let budgetAlert = null;
    try { budgetAlert = await checkBudgetAlert(); } catch { /* optional */ }

    res.json({
      stats,
      enabled: config.enabled,
      recentRuns,
      funnel: {
        discovered: stats.totalProspects,
        pitched: stats.pendingPitches + stats.sentPitches,
        sent: stats.sentPitches,
        responded: stats.responses,
        booked: stats.booked,
      },
      cost: costInfo,
      budgetAlert: budgetAlert?.alert ? budgetAlert.message : null,
    });
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
      minScore: minScore ? Math.min(100, Math.max(0, Number(minScore))) : undefined,
      limit: limit ? Math.min(100, Math.max(1, Number(limit))) : 50,
      offset: offset ? Math.max(0, Number(offset)) : 0,
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
      limit: limit ? Math.min(100, Math.max(1, Number(limit))) : 50,
      offset: offset ? Math.max(0, Number(offset)) : 0,
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

// ── Pitch Quality Scoring ────────────────────────────────────────────────────

export async function scorePitch(req: Request, res: Response) {
  try {
    const pitch = await agentRepository.getPitchById(req.params.id);
    if (!pitch) return res.status(404).json({ error: 'Pitch not found' });
    const prospect = await agentRepository.getProspectById(pitch.prospectId);
    if (!prospect) return res.status(404).json({ error: 'Prospect not found' });

    const result = scorePitchQuality(pitch, prospect);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to score pitch' });
  }
}

// ── Actions (with mutex locks) ───────────────────────────────────────────────

export async function triggerScan(req: Request, res: Response) {
  if (scanRunning) {
    return res.status(409).json({ error: 'A scan is already running. Please wait for it to complete.' });
  }

  try {
    const { categories, queriesPerCategory, maxProspects } = req.body;
    scanRunning = true;

    // Start scan and capture runId
    const promise = runPrScan({
      categories: categories || ['podcast', 'press'],
      queriesPerCategory: queriesPerCategory || 3,
      maxProspects: maxProspects || 20,
    });

    promise.then(result => {
      scanRunning = false;
      logger.info('[agent-api] Manual scan complete', { prospectsNew: result.prospectsNew, runId: result.runId });
    }).catch(err => {
      scanRunning = false;
      logger.error('[agent-api] Manual scan failed', { error: err.message });
    });

    // Return immediately — frontend can poll /runs for progress
    // We return a best-effort runId by querying the latest running scan
    const latestRuns = await agentRepository.getLatestRuns('pr_scan', 1);
    const runId = latestRuns[0]?.id || null;

    res.json({
      message: 'Scan started. Check the Runs tab for progress.',
      status: 'running',
      runId,
    });
  } catch (err: any) {
    scanRunning = false;
    res.status(500).json({ error: 'Failed to start scan' });
  }
}

export async function triggerPitchBatch(req: Request, res: Response) {
  if (pitchBatchRunning) {
    return res.status(409).json({ error: 'A pitch batch is already running. Please wait for it to complete.' });
  }

  try {
    const { category, maxPitches } = req.body;
    pitchBatchRunning = true;

    const promise = batchDraftPitches({ category, maxPitches });

    promise.then(result => {
      pitchBatchRunning = false;
      logger.info('[agent-api] Pitch batch complete', { pitched: result.pitched.length, runId: result.runId });
    }).catch(err => {
      pitchBatchRunning = false;
      logger.error('[agent-api] Pitch batch failed', { error: err.message });
    });

    const latestRuns = await agentRepository.getLatestRuns('pr_pitch_batch', 1);
    const runId = latestRuns[0]?.id || null;

    res.json({
      message: 'Pitch batch started. Drafts will appear in the review queue.',
      status: 'running',
      runId,
    });
  } catch (err: any) {
    pitchBatchRunning = false;
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

// ── Enrichment ───────────────────────────────────────────────────────────────

export async function triggerEnrichProspect(req: Request, res: Response) {
  try {
    const prospect = await agentRepository.getProspectById(req.params.id);
    if (!prospect) return res.status(404).json({ error: 'Prospect not found' });

    const result = await enrichProspect(prospect);

    // Return contacts alongside enrichment data
    const contacts = await agentRepository.getContactsByProspectId(prospect.id);
    res.json({ ...result, contacts });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to enrich prospect: ${err.message}` });
  }
}

export async function triggerBatchEnrich(req: Request, res: Response) {
  try {
    const { prospectIds } = req.body;
    if (!Array.isArray(prospectIds) || prospectIds.length === 0) {
      return res.status(400).json({ error: 'prospectIds array is required' });
    }
    const result = await batchEnrichProspects(prospectIds);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to batch enrich' });
  }
}

// ── Prospect Contacts (Journalists/Editors) ──────────────────────────────────

export async function listProspectContacts(req: Request, res: Response) {
  try {
    const contacts = await agentRepository.getContactsByProspectId(req.params.id);
    res.json(contacts);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to list contacts: ${err.message}` });
  }
}

export async function createProspectContact(req: Request, res: Response) {
  try {
    const prospect = await agentRepository.getProspectById(req.params.id);
    if (!prospect) return res.status(404).json({ error: 'Prospect not found' });

    const { name, role, email, linkedinUrl, twitterHandle, beat, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Contact name is required' });

    const contact = await agentRepository.createContact({
      prospectId: req.params.id,
      name,
      role: role || null,
      email: email || null,
      linkedinUrl: linkedinUrl || null,
      twitterHandle: twitterHandle || null,
      beat: beat || null,
      notes: notes || null,
      confidenceScore: 100, // manually added = high confidence
      isPrimary: false,
    });
    res.status(201).json(contact);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to create contact: ${err.message}` });
  }
}

export async function updateProspectContact(req: Request, res: Response) {
  try {
    const contact = await agentRepository.getContactById(req.params.contactId);
    if (!contact) return res.status(404).json({ error: 'Contact not found' });

    const { name, role, email, linkedinUrl, twitterHandle, beat, notes, isPrimary } = req.body;
    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (role !== undefined) updates.role = role;
    if (email !== undefined) updates.email = email;
    if (linkedinUrl !== undefined) updates.linkedinUrl = linkedinUrl;
    if (twitterHandle !== undefined) updates.twitterHandle = twitterHandle;
    if (beat !== undefined) updates.beat = beat;
    if (notes !== undefined) updates.notes = notes;

    // Handle isPrimary toggle
    if (isPrimary === true) {
      await agentRepository.setPrimaryContact(req.params.contactId, contact.prospectId);
    } else if (isPrimary === false) {
      updates.isPrimary = false;
    }

    if (Object.keys(updates).length > 0) {
      await agentRepository.updateContact(req.params.contactId, updates);
    }

    const updated = await agentRepository.getContactById(req.params.contactId);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to update contact: ${err.message}` });
  }
}

export async function deleteProspectContact(req: Request, res: Response) {
  try {
    await agentRepository.deleteContact(req.params.contactId);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to delete contact: ${err.message}` });
  }
}

// ── Competitor Monitoring ────────────────────────────────────────────────────

export async function triggerCompetitorScan(req: Request, res: Response) {
  try {
    const { competitors, maxPerCompetitor } = req.body;
    const promise = runCompetitorScan({ competitors, maxPerCompetitor });

    promise.then(result => {
      logger.info('[agent-api] Competitor scan complete', { prospectsCreated: result.prospectsCreated });
    }).catch(err => {
      logger.error('[agent-api] Competitor scan failed', { error: err.message });
    });

    res.json({ message: 'Competitor scan started.', status: 'running' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to start competitor scan' });
  }
}

// ── Response Detection ───────────────────────────────────────────────────────

export async function triggerResponseCheck(req: Request, res: Response) {
  try {
    const result = await detectResponses();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to check responses: ${err.message}` });
  }
}

// ── Follow-Up Processing ────────────────────────────────────────────────────

export async function triggerFollowUpProcessing(req: Request, res: Response) {
  try {
    const result = await processFollowUps();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to process follow-ups: ${err.message}` });
  }
}

// ── Analytics ────────────────────────────────────────────────────────────────

export async function getAnalytics(req: Request, res: Response) {
  try {
    const stats = await agentRepository.getStats();
    const costInfo = await getMonthlySpend();
    const budgetAlert = await checkBudgetAlert();
    const platformStats = await getPlatformStats();

    res.json({
      funnel: {
        discovered: stats.totalProspects,
        pitched: stats.pendingPitches + stats.sentPitches,
        sent: stats.sentPitches,
        responded: stats.responses,
        booked: stats.booked,
        conversionRates: {
          pitchRate: stats.totalProspects > 0 ? ((stats.pendingPitches + stats.sentPitches) / stats.totalProspects * 100).toFixed(1) + '%' : '0%',
          sendRate: (stats.pendingPitches + stats.sentPitches) > 0 ? (stats.sentPitches / (stats.pendingPitches + stats.sentPitches) * 100).toFixed(1) + '%' : '0%',
          responseRate: stats.sentPitches > 0 ? (stats.responses / stats.sentPitches * 100).toFixed(1) + '%' : '0%',
          bookingRate: stats.responses > 0 ? (stats.booked / stats.responses * 100).toFixed(1) + '%' : '0%',
        },
      },
      cost: costInfo,
      budgetAlert: budgetAlert.alert ? budgetAlert.message : null,
      platform: platformStats,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load analytics' });
  }
}

// ── Weekly Summary ───────────────────────────────────────────────────────────

export async function getWeeklySummary(req: Request, res: Response) {
  try {
    const summary = await generateWeeklySummary();
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate summary' });
  }
}

export async function triggerWeeklySummaryEmail(req: Request, res: Response) {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'email field is required' });
    }
    const sent = await sendWeeklySummaryEmail(email);
    res.json({ sent });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to send summary email' });
  }
}

// ── Platform Stats ───────────────────────────────────────────────────────────

export async function getPlatformStatsHandler(req: Request, res: Response) {
  try {
    const stats = await getPlatformStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get platform stats' });
  }
}

// ── Runs ─────────────────────────────────────────────────────────────────────

export async function listRuns(req: Request, res: Response) {
  try {
    const { agentName, limit } = req.query;
    const runs = await agentRepository.getLatestRuns(
      agentName as string | undefined,
      limit ? Math.min(100, Math.max(1, Number(limit))) : 20,
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
    // Zod validation happens inside savePrAgentConfig
    const updated = await savePrAgentConfig(req.body, (req as any).userId);
    res.json(updated);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid config values',
        details: err.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }
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

// ── Gmail OAuth Config (with encryption) ─────────────────────────────────────

const GMAIL_CONFIG_KEY = 'gmail_oauth_config';

export async function getGmailConfig(req: Request, res: Response) {
  try {
    const config = await agentRepository.getAgentConfig(GMAIL_CONFIG_KEY);
    if (!config || !config.clientId) {
      return res.json({ clientId: '', clientSecret: '', refreshToken: '', configured: false });
    }

    // Decrypt stored credentials
    let clientId = config.clientId;
    let clientSecret = config.clientSecret;
    let refreshToken = config.refreshToken;

    try {
      if (config.encrypted) {
        clientId = decryptField(clientId);
        clientSecret = decryptField(clientSecret);
        refreshToken = decryptField(refreshToken);
      }
    } catch {
      // Fallback: data might not be encrypted yet (migration case)
    }

    // Mask secrets for display — return last 6 chars only
    const mask = (s: string) => s ? '•'.repeat(Math.max(0, s.length - 6)) + s.slice(-6) : '';
    res.json({
      clientId: mask(clientId),
      clientSecret: mask(clientSecret),
      refreshToken: mask(refreshToken),
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

    const resolveValue = (newVal: string, field: string) => {
      if (!newVal.includes('•')) return newVal;
      if (!existing?.[field]) return newVal;
      // Decrypt existing value if encrypted
      try {
        return existing.encrypted ? decryptField(existing[field]) : existing[field];
      } catch {
        return existing[field];
      }
    };

    const resolvedClientId = resolveValue(clientId, 'clientId');
    const resolvedClientSecret = resolveValue(clientSecret, 'clientSecret');
    const resolvedRefreshToken = resolveValue(refreshToken, 'refreshToken');

    // Encrypt credentials before storing
    let encryptedConfig: Record<string, any>;
    try {
      encryptedConfig = {
        clientId: encryptField(resolvedClientId),
        clientSecret: encryptField(resolvedClientSecret),
        refreshToken: encryptField(resolvedRefreshToken),
        encrypted: true,
      };
    } catch {
      // If encryption not available (no key set), store as-is with warning
      logger.warn('[agent-api] FIELD_ENCRYPTION_KEY not set — storing Gmail credentials without encryption');
      encryptedConfig = {
        clientId: resolvedClientId,
        clientSecret: resolvedClientSecret,
        refreshToken: resolvedRefreshToken,
        encrypted: false,
      };
    }

    await agentRepository.saveAgentConfig(GMAIL_CONFIG_KEY, encryptedConfig, (req as any).userId);
    logger.info('[agent-api] Gmail OAuth credentials updated (encrypted)');
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

// ── Smart Prioritization ──────────────────────────────────────────────────────

export async function getPrioritizedProspects(req: Request, res: Response) {
  try {
    const { category, limit } = req.query;
    const { prospects } = await agentRepository.listProspects({
      status: 'new',
      category: category as any,
      limit: limit ? Math.min(100, Number(limit)) : 50,
    });
    const prioritized = prioritizeProspects(prospects, {
      preferCategory: category as any,
      boostEnriched: true,
    });
    res.json(prioritized);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to prioritize prospects' });
  }
}

// ── Multi-Channel Messages ────────────────────────────────────────────────────

export async function generateChannelMessagesHandler(req: Request, res: Response) {
  try {
    const pitch = await agentRepository.getPitchById(req.params.pitchId);
    if (!pitch) return res.status(404).json({ error: 'Pitch not found' });
    const prospect = await agentRepository.getProspectById(pitch.prospectId);
    if (!prospect) return res.status(404).json({ error: 'Prospect not found' });

    const { channels } = req.body;
    const messages = await generateChannelMessages(prospect, pitch, channels);
    res.json(messages);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to generate channel messages: ${err.message}` });
  }
}

// ── Press Release ─────────────────────────────────────────────────────────────

export async function draftPressReleaseHandler(req: Request, res: Response) {
  try {
    const { milestone, title, description, metrics, quotes } = req.body;
    if (!milestone || !title || !description) {
      return res.status(400).json({ error: 'milestone, title, and description are required' });
    }
    const result = await draftPressRelease(milestone, { title, description, metrics, quotes });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to draft press release: ${err.message}` });
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
