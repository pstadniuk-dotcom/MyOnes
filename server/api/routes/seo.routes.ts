import { Router } from 'express';
import {
  adminListKeywords,
  adminGetKeywordStats,
  adminGetPipeline,
  adminGetGenerationQueue,
  adminGetStrategy,
  adminSaveStrategy,
  adminPinKeyword,
  adminSkipKeyword,
} from '../controller/seo.controller';
import { requireAdmin } from '../middleware/middleware';

const router = Router();

// All SEO admin routes require admin auth
router.get('/admin/keywords',              requireAdmin, adminListKeywords);
router.get('/admin/keywords/stats',        requireAdmin, adminGetKeywordStats);
router.get('/admin/pipeline',              requireAdmin, adminGetPipeline);
router.get('/admin/pipeline/queue',        requireAdmin, adminGetGenerationQueue);
router.get('/admin/strategy',              requireAdmin, adminGetStrategy);
router.patch('/admin/strategy',            requireAdmin, adminSaveStrategy);
router.post('/admin/keywords/:keyword/pin',  requireAdmin, adminPinKeyword);
router.post('/admin/keywords/:keyword/skip', requireAdmin, adminSkipKeyword);

export default router;
