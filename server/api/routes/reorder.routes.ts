import { Router } from 'express';
import { requireAuth } from '../middleware/middleware';
import { reorderService } from '../../modules/reorder/reorder.service';
import logger from '../../infra/logging/logger';

const router = Router();

/**
 * GET /api/reorder/status
 * Get the current user's Smart Re-Order status for dashboard display.
 */
router.get('/status', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const status = await reorderService.getUserReorderStatus(userId);

    if (!status.schedule) {
      return res.json({ active: false });
    }

    const analysis = status.recommendation?.analysisJson as any;

    res.json({
      active: true,
      daysUntilReorder: status.daysUntilReorder,
      canDelay: status.canDelay,
      schedule: {
        id: status.schedule.id,
        status: status.schedule.status,
        formulaVersion: status.schedule.formulaVersion,
        supplyStartDate: status.schedule.supplyStartDate,
        supplyEndDate: status.schedule.supplyEndDate,
        delayCount: status.schedule.delayCount,
      },
      recommendation: status.recommendation ? {
        id: status.recommendation.id,
        status: status.recommendation.status,
        recommendsChanges: status.recommendation.recommendsChanges,
        trendSummary: analysis?.trendSummary,
        findings: analysis?.findings || [],
        suggestedChanges: analysis?.suggestedChanges || [],
        smsSentAt: status.recommendation.smsSentAt,
        autoApproveAt: status.recommendation.autoApproveAt,
      } : null,
    });
  } catch (error) {
    logger.error('Error fetching reorder status:', error);
    res.status(500).json({ error: 'Failed to fetch reorder status' });
  }
});

/**
 * POST /api/reorder/approve
 * Manually approve a reorder from the dashboard.
 */
router.post('/approve', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { scheduleId } = req.body;

    const status = await reorderService.getUserReorderStatus(userId);
    if (!status.recommendation || status.recommendation.scheduleId !== scheduleId) {
      return res.status(404).json({ error: 'No pending recommendation found' });
    }

    await reorderService.handleApprove(status.recommendation);
    res.json({ success: true, message: 'Reorder approved. Your card will be charged shortly.' });
  } catch (error) {
    logger.error('Error approving reorder:', error);
    res.status(500).json({ error: 'Failed to approve reorder' });
  }
});

/**
 * POST /api/reorder/delay
 * Delay a reorder by 2 weeks from the dashboard.
 */
router.post('/delay', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { scheduleId } = req.body;

    const status = await reorderService.getUserReorderStatus(userId);
    if (!status.recommendation || status.recommendation.scheduleId !== scheduleId) {
      return res.status(404).json({ error: 'No pending recommendation found' });
    }

    const result = await reorderService.handleDelay(status.recommendation);
    res.json(result);
  } catch (error) {
    logger.error('Error delaying reorder:', error);
    res.status(500).json({ error: 'Failed to delay reorder' });
  }
});

export default router;
