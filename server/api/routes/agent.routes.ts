/**
 * Agent Routes — Admin-only API endpoints for PR Agent operations
 */
import { Router } from 'express';
import { requireAdmin } from '../middleware/middleware';
import {
  getAgentDashboard,
  listProspects,
  getProspect,
  updateProspect,
  listPitches,
  getPitch,
  updatePitch,
  approvePitch,
  rejectPitch,
  aiRewritePitch,
  triggerScan,
  triggerPitchBatch,
  triggerDraftPitch,
  triggerSendPitch,
  triggerSendAllApproved,
  triggerFormFill,
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
} from '../controller/agent.controller';

const router = Router();

// All routes require admin access
router.use(requireAdmin);

// Dashboard
router.get('/dashboard', getAgentDashboard);

// Prospects
router.get('/prospects', listProspects);
router.get('/prospects/:id', getProspect);
router.patch('/prospects/:id', updateProspect);

// Pitches
router.get('/pitches', listPitches);
router.get('/pitches/:id', getPitch);
router.patch('/pitches/:id', updatePitch);
router.post('/pitches/:id/approve', approvePitch);
router.post('/pitches/:id/reject', rejectPitch);
router.post('/pitches/:id/rewrite', aiRewritePitch);

// Actions
router.post('/scan', triggerScan);
router.post('/pitch-batch', triggerPitchBatch);
router.post('/prospects/:prospectId/draft', triggerDraftPitch);
router.post('/pitches/:id/send', triggerSendPitch);
router.post('/send-approved', triggerSendAllApproved);
router.post('/pitches/:pitchId/fill-form', triggerFormFill);

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
