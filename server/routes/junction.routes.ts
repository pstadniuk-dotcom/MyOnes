/**
 * Junction Wearables Routes Module
 * 
 * Handles all /api/wearables/* endpoints using Junction (Vital) API:
 * - Device connections via Junction Link
 * - Biometric data retrieval
 * - Provider management
 */

import { Router, Request, Response } from 'express';
import { wearableService } from '../domains/wearables';
import { requireAuth } from './middleware';
import { logger } from '../infrastructure/logging/logger';

const router = Router();

/**
 * Get user's connected wearable devices via Junction
 */
router.get('/connections', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const connections = await wearableService.listConnections(userId);
    res.json(connections);
  } catch (error) {
    logger.error('Error fetching wearable connections:', error);
    res.status(500).json({ error: 'Failed to fetch wearable connections' });
  }
});

/**
 * Get Junction Link URL to connect a new wearable device
 */
router.get('/connect', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { linkToken, linkWebUrl } = await wearableService.getLinkToken(userId);

    res.json({
      linkUrl: linkWebUrl,
      linkToken,
    });
  } catch (error) {
    logger.error('Error generating Junction link:', error);
    res.status(500).json({ error: 'Failed to generate connection link' });
  }
});

/**
 * Legacy connect endpoint for backwards compatibility
 */
router.get('/connect/:provider', requireAuth, async (_req: Request, res: Response) => {
  return res.redirect('/api/wearables/connect');
});

/**
 * Disconnect a wearable device
 */
router.post('/disconnect/:connectionId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { connectionId } = req.params;

    await wearableService.disconnectDevice(userId, connectionId);
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Error disconnecting wearable:', error);
    const status = error.message.includes('authorized') ? 403 : 400;
    res.status(status).json({ error: error.message || 'Failed to disconnect device' });
  }
});

/**
 * Get normalized biometric data for a date range
 */
router.get('/biometric-data', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { startDate, endDate, provider } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const data = await wearableService.getBiometricData(
      userId,
      startDate as string,
      endDate as string,
      provider as string
    );

    res.json({ data });
  } catch (error) {
    logger.error('Error fetching biometric data:', error);
    res.status(500).json({ error: 'Failed to fetch biometric data' });
  }
});

/**
 * Get merged biometric data
 */
router.get('/biometric-data/merged', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const data = await wearableService.getMergedBiometricData(userId, startDate as string, endDate as string);
    res.json({ data });
  } catch (error) {
    logger.error('Error fetching merged biometric data:', error);
    res.status(500).json({ error: 'Failed to fetch merged biometric data' });
  }
});

/**
 * Manual sync endpoint
 */
router.post('/sync', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    await wearableService.syncData(userId);

    res.json({
      success: true,
      message: 'Data sync initiated via Junction',
    });
  } catch (error: any) {
    logger.error('Error in manual sync:', error);
    const status = error.message.includes('connected') ? 404 : 500;
    res.status(status).json({ error: error.message || 'Failed to sync data' });
  }
});

/**
 * Get biometric trends and insights
 */
router.get('/insights', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const days = parseInt(req.query.days as string) || 30;

    const result = await wearableService.getInsights(userId, days);
    res.json(result);
  } catch (error) {
    logger.error('Error calculating insights:', error);
    res.status(500).json({ error: 'Failed to calculate insights' });
  }
});

/**
 * Get available providers
 */
router.get('/available-providers', requireAuth, async (_req: Request, res: Response) => {
  const providers = [
    { slug: 'garmin', name: 'Garmin', priority: 1, category: 'fitness', description: 'Fitness watches & GPS', logo: 'https://storage.googleapis.com/vital-assets/garmin.png', historicalDays: 90 },
    { slug: 'google_fit', name: 'Google Fit', priority: 2, category: 'fitness', description: 'Android health platform', logo: 'https://storage.googleapis.com/vital-assets/googlefit.png', historicalDays: 90 },
    { slug: 'fitbit', name: 'Fitbit', priority: 3, category: 'fitness', description: 'Activity trackers', logo: 'https://storage.googleapis.com/vital-assets/fitbit.png', historicalDays: 90 },
    { slug: 'oura', name: 'Oura Ring', priority: 4, category: 'sleep', description: 'Sleep & recovery tracking', logo: 'https://storage.googleapis.com/vital-assets/oura.png', historicalDays: 180 },
    { slug: 'whoop_v2', name: 'WHOOP', priority: 5, category: 'fitness', description: 'Strain & recovery coach', logo: 'https://storage.googleapis.com/vital-assets/whoop.png', historicalDays: 180 },
    { slug: 'peloton', name: 'Peloton', priority: 6, category: 'fitness', description: 'Connected fitness', logo: 'https://storage.googleapis.com/vital-assets/peloton.png', historicalDays: 180 },
    { slug: 'freestyle_libre', name: 'Freestyle Libre', priority: 7, category: 'cgm', description: 'Continuous glucose monitoring', logo: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgNDAiPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iNDAiIGZpbGw9IiMwMDQ4OGEiIHJ4PSI0Ii8+PHRleHQgeD0iNTAiIHk9IjI2IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+QWJib3R0PC90ZXh0Pjwvc3ZnPg==', historicalDays: 90 },
  ];

  res.json({ providers });
});

/**
 * Get historical data for AI analysis
 */
router.get('/historical-data', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const days = parseInt(req.query.days as string) || 90;

    const result = await wearableService.getHistoricalData(userId, days);
    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    logger.error('Error fetching historical data:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch historical data',
      data: null,
    });
  }
});

export default router;
