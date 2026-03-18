/**
 * Agent Routes — Admin-only API endpoints for PR Agent operations
 *
 * Expanded with: analytics, enrichment, competitor monitoring,
 * response detection, follow-up processing, pitch quality scoring,
 * weekly summary, and platform stats endpoints.
 */
import { Router } from 'express';
import { requireAdmin } from '../middleware/middleware';
import {
  getAgentDashboard,
  listProspects,
  getProspect,
  updateProspect,
  deleteProspect,
  listPitches,
  getPitch,
  updatePitch,
  deletePitch,
  approvePitch,
  rejectPitch,
  aiRewritePitch,
  scorePitch,
  triggerScan,
  triggerPitchBatch,
  triggerDraftPitch,
  triggerSendPitch,
  triggerSendAllApproved,
  triggerFormFill,
  markPitchResponded,
  triggerFollowUp,
  getPendingFollowUps,
  triggerEnrichProspect,
  triggerBatchEnrich,
  triggerCompetitorScan,
  triggerResponseCheck,
  triggerFollowUpProcessing,
  getAnalytics,
  getWeeklySummary,
  triggerWeeklySummaryEmail,
  getPlatformStatsHandler,
  listRuns,
  getRun,
  getConfig,
  updateConfig,
  resetConfig,
  getGmailConfig,
  updateGmailConfig,
  deleteGmailConfig,
  getProfile,
  updateProfile,
  resetProfile,
  listTemplates,
  getPrioritizedProspects,
  generateChannelMessagesHandler,
  draftPressReleaseHandler,
  getFormScreenshot,
  listProspectContacts,
  createProspectContact,
  updateProspectContact,
  deleteProspectContact,
} from '../controller/agent.controller';

const router = Router();

// All routes require admin access
router.use(requireAdmin);

// Dashboard
router.get('/dashboard', getAgentDashboard);

// Analytics & Reporting
router.get('/analytics', getAnalytics);
router.get('/weekly-summary', getWeeklySummary);
router.post('/weekly-summary/send', triggerWeeklySummaryEmail);
router.get('/platform-stats', getPlatformStatsHandler);

// Prospects
router.get('/prospects', listProspects);
router.get('/prospects/prioritized', getPrioritizedProspects);
router.get('/prospects/:id', getProspect);
router.patch('/prospects/:id', updateProspect);
router.delete('/prospects/:id', deleteProspect);
router.post('/prospects/:id/enrich', triggerEnrichProspect);
router.post('/prospects/batch-enrich', triggerBatchEnrich);

// Prospect Contacts (Journalists/Editors)
router.get('/prospects/:id/contacts', listProspectContacts);
router.post('/prospects/:id/contacts', createProspectContact);
router.patch('/prospects/:id/contacts/:contactId', updateProspectContact);
router.delete('/prospects/:id/contacts/:contactId', deleteProspectContact);

// Pitches
router.get('/pitches', listPitches);
router.get('/pitches/:id', getPitch);
router.patch('/pitches/:id', updatePitch);
router.delete('/pitches/:id', deletePitch);
router.post('/pitches/:id/approve', approvePitch);
router.post('/pitches/:id/reject', rejectPitch);
router.post('/pitches/:id/rewrite', aiRewritePitch);
router.post('/pitches/:id/responded', markPitchResponded);
router.post('/pitches/:id/follow-up', triggerFollowUp);
router.get('/pitches/:id/quality-score', scorePitch);
router.get('/pitches/:id/screenshot/:type', getFormScreenshot);

// Actions
router.post('/scan', triggerScan);
router.post('/pitch-batch', triggerPitchBatch);
router.post('/prospects/:prospectId/draft', triggerDraftPitch);
router.post('/pitches/:id/send', triggerSendPitch);
router.post('/send-approved', triggerSendAllApproved);
router.post('/pitches/:pitchId/fill-form', triggerFormFill);

// Follow-ups
router.get('/follow-ups', getPendingFollowUps);

// Competitor Monitoring
router.post('/competitor-scan', triggerCompetitorScan);

// Response Detection
router.post('/check-responses', triggerResponseCheck);

// Follow-Up Processing
router.post('/process-follow-ups', triggerFollowUpProcessing);

// Multi-Channel & Press Releases
router.post('/pitches/:pitchId/channel-messages', generateChannelMessagesHandler);
router.post('/press-release', draftPressReleaseHandler);

// Runs
router.get('/runs', listRuns);
router.get('/runs/:id', getRun);

// Config
router.get('/config', getConfig);
router.put('/config', updateConfig);
router.post('/config/reset', resetConfig);

// Gmail OAuth
router.get('/gmail-config', getGmailConfig);
router.put('/gmail-config', updateGmailConfig);
router.delete('/gmail-config', deleteGmailConfig);

// Founder Profile
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/profile/reset', resetProfile);

// Templates
router.get('/templates', listTemplates);

export default router;
