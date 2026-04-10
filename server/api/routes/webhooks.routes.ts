import { Router } from 'express';
import { webhooksController } from '../controller/webhooks.controller';

const router = Router();

/**
 * @route   POST /api/webhooks/twilio/sms
 * @desc    Twilio Webhook for SMS Replies
 * @access  Public (Verification by Twilio suggested for production)
 */
router.post('/twilio/sms', webhooksController.handleTwilioSms);

/**
 * @route   POST /api/webhooks/junction
 * @desc    Main Junction webhook endpoint
 * @access  Public (Signature verification included)
 */
router.post('/junction', webhooksController.handleJunctionWebhook);

/**
 * @route   POST /api/webhooks/alive/order-status
 * @desc    Alive manufacturer order status webhook
 * @access  Public (header secret verification supported)
 */
router.post('/alive/order-status', webhooksController.handleAliveOrderStatusWebhook);

export default router;
