import { Router } from 'express';
import { labsController } from '../controller/labs.controller';
import { requireAuth } from '../middleware/middleware';

const router = Router();

/**
 * Get aggregated biomarker dashboard across all lab reports
 * Returns: markers with trends, deltas, history, summary counts, report list
 * Each marker includes pre-generated AI insight (generated at upload time)
 */
router.get('/biomarkers', requireAuth, labsController.getBiomarkersDashboard);

export default router;
