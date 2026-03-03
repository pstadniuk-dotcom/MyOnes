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
 * Get comprehensive historical data for AI analysis
 */
router.get('/historical-data', requireAuth, wearablesController.getHistoricalData);

/**
 * Get health pulse summary: today's snapshot + 7-day trends + latest lab markers
 */
router.get('/health-pulse', requireAuth, wearablesController.getHealthPulseSummary);

/**
 * Get active data pillars + unlockable pillars based on connected devices
 */
router.get('/pillars', requireAuth, wearablesController.getPillars);

/**
 * AI-powered analysis of wearable health data with actionable insights
 */
router.get('/ai-analysis', requireAuth, wearablesController.getAiAnalysis);

/**
 * Weekly Brief: tiered health analysis with deterministic signals + AI narrative
 */
router.get('/weekly-brief', requireAuth, wearablesController.getWeeklyBrief);

/**
 * Health Pulse Intelligence: deterministic signal detection + AI narrative
 */
router.get('/health-pulse-intelligence', requireAuth, wearablesController.getHealthPulseIntelligence);

export default router;
