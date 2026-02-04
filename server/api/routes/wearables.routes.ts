import { Router } from 'express';
import { wearablesController } from '../controller/wearables.controller';
import { requireAuth } from '../middleware/middleware';

const router = Router();

/**
 * Get user's connected wearable devices via Junction
 */
router.get('/connections', requireAuth, wearablesController.getConnections);

/**
 * Get Junction Link URL to connect a new wearable device
 */
router.get('/connect', requireAuth, wearablesController.getConnectLink);

/**
 * Legacy connect endpoint for backwards compatibility
 */
router.get('/connect/:provider', requireAuth, wearablesController.legacyConnect);

/**
 * Disconnect a wearable device
 */
router.post('/disconnect/:connectionId', requireAuth, wearablesController.disconnectDevice);

/**
 * Get normalized biometric data for a date range
 */
router.get('/biometric-data', requireAuth, wearablesController.getBiometricData);

/**
 * Get merged biometric data
 */
router.get('/biometric-data/merged', requireAuth, wearablesController.getMergedBiometricData);

/**
 * Manual sync endpoint
 */
router.post('/sync', requireAuth, wearablesController.syncData);

/**
 * Get biometric trends and insights
 */
router.get('/insights', requireAuth, wearablesController.getInsights);

/**
 * Get available providers
 */
router.get('/available-providers', requireAuth, wearablesController.getAvailableProviders);

/**
 * Get comprehensive historical data for AI analysis
 */
router.get('/historical-data', requireAuth, wearablesController.getHistoricalData);

export default router;
