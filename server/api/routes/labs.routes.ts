import { Router } from 'express';
import { labsController } from '../controller/labs.controller';
import { requireAuth } from '../middleware/middleware';

const router = Router();

/**
 * Get aggregated biomarker dashboard across all lab reports
 * Returns: markers with trends, deltas, history, summary counts, report list
 * Each marker includes pre-generated AI insight when available
 */
router.get('/biomarkers', requireAuth, labsController.getBiomarkersDashboard);

/**
 * Generate marker insights on-demand for specific biomarker keys
 * Body: { markerKeys: string[] }
 * Returns cached insights if available, generates missing ones lazily
 */
router.post('/marker-insights', requireAuth, labsController.getMarkerInsights);

/**
 * Hidden-marker management — markers the user has chosen to exclude from
 * the AI practitioner. The marker is still visible on the dashboard.
 */
router.get('/hidden-markers', requireAuth, labsController.getHiddenMarkers);
router.post('/hidden-markers/hide', requireAuth, labsController.hideMarker);
router.post('/hidden-markers/unhide', requireAuth, labsController.unhideMarker);

export default router;
