import { Router } from 'express';
import { systemController } from '../controller/system.controller';
import { requireAuth, requireAdmin } from '../middleware/middleware';

const router = Router();

// Public / Auth required
router.get('/health', systemController.healthCheck);
router.get('/integrations/youtube/search', requireAuth, systemController.searchYouTube);

// Admin / Debug
router.get('/debug/info', requireAdmin, systemController.getDebugInfo);
router.get('/debug/user/:userId', requireAdmin, systemController.getDebugUserInfo);
router.get('/audit-logs', requireAuth, systemController.getAuditLogs);
router.get('/settings/:key', requireAdmin, systemController.getAppSetting);

export default router;
