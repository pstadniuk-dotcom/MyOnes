import { Router } from 'express';
import { webhooksController } from '../controller/webhooks.controller';
import { epdWebhooksController } from '../controller/epd-webhooks.controller';

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
 * @route   POST /api/webhooks/epd
 * @desc    EasyPayDirect payment gateway webhooks
 * @access  Public (HMAC-SHA256 signature verification)
 */
router.post('/epd', epdWebhooksController.handleEpdWebhook);

// /**
//  * @route   ALL /api/webhooks
//  * @desc    Unified catch-all for emitted events
//  * @access  Public
//  */
// router.post('/', webhooksController.handleUnifiedWebhook);

export default router;
