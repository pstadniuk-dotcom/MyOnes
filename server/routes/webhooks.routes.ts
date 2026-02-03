/**
 * Junction Webhooks Handler
 * 
 * Receives webhooks from Junction (Vital) for real-time data updates.
 * Junction sends webhooks when:
 * - New data is available from a provider
 * - A provider connection status changes
 * - Historical data backfill completes
 * 
 * Webhook events: https://docs.junction.com/webhooks/introduction
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { logger } from '../infrastructure/logging/logger';
import { userService } from '../domains/users/user.service';

const router = Router();

/**
 * Verify webhook signature from Junction
 * Junction signs webhooks with HMAC-SHA256
 */
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  if (!secret) {
    logger.warn('JUNCTION_WEBHOOK_SECRET not configured, skipping signature verification');
    return true; // Allow in development without secret
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature || ''),
    Buffer.from(expectedSignature)
  );
}

/**
 * Main webhook endpoint
 * POST /api/webhooks/junction
 */
router.post('/junction', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-vital-webhook-signature'] as string;
    const rawBody = JSON.stringify(req.body);

    // Verify signature if secret is configured
    const webhookSecret = process.env.JUNCTION_WEBHOOK_SECRET;
    if (webhookSecret && !verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      logger.warn('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body;
    logger.info('Received Junction webhook', {
      eventType: event.event_type,
      userId: event.user_id,
    });

    // Handle different event types
    switch (event.event_type) {
      case 'daily.data.sleep.created':
      case 'daily.data.sleep.updated':
        await handleSleepData(event);
        break;

      case 'daily.data.activity.created':
      case 'daily.data.activity.updated':
        await handleActivityData(event);
        break;

      case 'daily.data.body.created':
      case 'daily.data.body.updated':
        await handleBodyData(event);
        break;

      case 'daily.data.workout.created':
      case 'daily.data.workout.updated':
        await handleWorkoutData(event);
        break;

      case 'provider.connection.created':
        await handleProviderConnected(event);
        break;

      case 'provider.connection.error':
      case 'provider.connection.deleted':
        await handleProviderDisconnected(event);
        break;

      case 'historical.data.sleep.created':
      case 'historical.data.activity.created':
      case 'historical.data.body.created':
        logger.info('Historical data backfill received', { eventType: event.event_type });
        // Historical data is already fetched via API, no action needed
        break;

      default:
        logger.info('Unhandled webhook event type', { eventType: event.event_type });
    }

    // Always return 200 to acknowledge receipt
    res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Error processing Junction webhook:', error);
    // Still return 200 to prevent retries for processing errors
    res.status(200).json({ received: true, error: 'Processing error' });
  }
});

/**
 * Handle sleep data webhook
 */
async function handleSleepData(event: any): Promise<void> {
  const { user_id: junctionUserId, data } = event;

  // Find ONES user by Junction user ID
  const user = await findUserByJunctionId(junctionUserId);
  if (!user) {
    logger.warn('No ONES user found for Junction user', { junctionUserId });
    return;
  }

  logger.info('Processing sleep data webhook', {
    userId: user.id,
    date: data?.calendar_date,
    score: data?.sleep_score,
  });

  // Data is already available via API - this is just a notification
  // Could optionally cache it here for faster access
}

/**
 * Handle activity data webhook
 */
async function handleActivityData(event: any): Promise<void> {
  const { user_id: junctionUserId, data } = event;

  const user = await findUserByJunctionId(junctionUserId);
  if (!user) {
    logger.warn('No ONES user found for Junction user', { junctionUserId });
    return;
  }

  logger.info('Processing activity data webhook', {
    userId: user.id,
    date: data?.calendar_date,
    steps: data?.steps,
  });
}

/**
 * Handle body data webhook (HRV, resting HR, etc.)
 */
async function handleBodyData(event: any): Promise<void> {
  const { user_id: junctionUserId, data } = event;

  const user = await findUserByJunctionId(junctionUserId);
  if (!user) {
    logger.warn('No ONES user found for Junction user', { junctionUserId });
    return;
  }

  logger.info('Processing body data webhook', {
    userId: user.id,
    date: data?.calendar_date,
    hrv: data?.hrv?.avg_hrv,
  });
}

/**
 * Handle workout data webhook
 */
async function handleWorkoutData(event: any): Promise<void> {
  const { user_id: junctionUserId, data } = event;

  const user = await findUserByJunctionId(junctionUserId);
  if (!user) {
    logger.warn('No ONES user found for Junction user', { junctionUserId });
    return;
  }

  logger.info('Processing workout data webhook', {
    userId: user.id,
    date: data?.calendar_date,
    sport: data?.sport?.name,
  });
}

/**
 * Handle provider connected webhook
 */
async function handleProviderConnected(event: any): Promise<void> {
  const { user_id: junctionUserId, data } = event;

  const user = await findUserByJunctionId(junctionUserId);
  if (!user) {
    logger.warn('No ONES user found for Junction user', { junctionUserId });
    return;
  }

  logger.info('Provider connected', {
    userId: user.id,
    provider: data?.provider,
  });

  // Could send notification to user here
}

/**
 * Handle provider disconnected/error webhook
 */
async function handleProviderDisconnected(event: any): Promise<void> {
  const { user_id: junctionUserId, data } = event;

  const user = await findUserByJunctionId(junctionUserId);
  if (!user) {
    logger.warn('No ONES user found for Junction user', { junctionUserId });
    return;
  }

  logger.info('Provider disconnected or error', {
    userId: user.id,
    provider: data?.provider,
    error: data?.error,
  });

  // Could send notification to user here about reconnection
}

/**
 * Find ONES user by Junction user ID
 */
async function findUserByJunctionId(junctionUserId: string): Promise<any | null> {
  try {
    return await userService.getUserByJunctionId(junctionUserId) || null;
  } catch (error) {
    logger.error('Error finding user by Junction ID:', error);
    return null;
  }
}

export default router;
