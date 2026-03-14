import { Router } from 'express';
import { aiSupportAgentController } from '../controller/ai-support-agent.controller';
import { requireAdmin } from '../middleware/middleware';

const router = Router();

// All routes are admin-only
router.get('/stats', requireAdmin, aiSupportAgentController.getStats);
router.get('/drafts', requireAdmin, aiSupportAgentController.listDrafts);
router.get('/drafts/:id', requireAdmin, aiSupportAgentController.getDraft);
router.post('/drafts/:id/approve', requireAdmin, aiSupportAgentController.approveDraft);
router.post('/drafts/:id/edit', requireAdmin, aiSupportAgentController.editAndSendDraft);
router.post('/drafts/:id/dismiss', requireAdmin, aiSupportAgentController.dismissDraft);
router.post('/run', requireAdmin, aiSupportAgentController.triggerScan);

export default router;
