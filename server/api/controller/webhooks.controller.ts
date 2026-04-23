import { Request, Response } from 'express';
import twilio from 'twilio';
import { webhooksService } from '../../modules/webhooks/webhooks.service';
import logger from '../../infra/logging/logger';

export class WebhooksController {
    /**
     * POST /api/webhooks/twilio/sms
     * Handle Twilio SMS reply webhooks
     */
    async handleTwilioSms(req: Request, res: Response) {
        try {
            const isProduction = process.env.NODE_ENV === 'production';
            const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
            const twilioSignature = req.headers['x-twilio-signature'] as string | undefined;

            if (isProduction && !twilioAuthToken) {
                logger.error('TWILIO_AUTH_TOKEN is missing in production; rejecting Twilio webhook');
                return res.status(503).send('Webhook configuration unavailable');
            }

            if (isProduction && !twilioSignature) {
                logger.warn('Missing Twilio signature in production webhook request');
                return res.status(401).send('Missing signature');
            }

            if (twilioAuthToken && twilioSignature) {
                const configuredWebhookUrl = process.env.TWILIO_WEBHOOK_URL;
                const requestUrl = configuredWebhookUrl || `${req.protocol}://${req.get('host')}${req.originalUrl}`;
                const isValidTwilioRequest = twilio.validateRequest(
                    twilioAuthToken,
                    twilioSignature,
                    requestUrl,
                    req.body
                );

                if (!isValidTwilioRequest) {
                    logger.warn('Invalid Twilio webhook signature');
                    return res.status(403).send('Invalid signature');
                }
            } else if (!isProduction) {
                logger.warn('Twilio webhook signature verification bypassed in non-production environment');
            }

            const { From: phoneNumber, Body: body } = req.body;

            if (!phoneNumber || !body) {
                return res.status(400).send('Missing required Twilio fields');
            }

            await webhooksService.handleTwilioSms(phoneNumber, body);
            res.sendStatus(200);
        } catch (error: any) {
            logger.error('Error handling SMS webhook:', error);
            if (error.message === 'User not found') {
                return res.status(404).send('User not found');
            }
            res.sendStatus(500);
        }
    }

    /**
     * POST /api/webhooks/junction
     * Handle Junction data webhooks
     */
    async handleJunctionWebhook(req: Request, res: Response) {
        try {
            const webhookSecret = process.env.JUNCTION_WEBHOOK_SECRET;
            const signature = req.headers['x-vital-webhook-signature'] as string | undefined;

            // Fail-closed: require the secret in ALL environments.
            // Allowing unsigned requests on staging/dev would make it an open
            // PHI injection endpoint (wearable biometric data written to DB).
            if (!webhookSecret) {
                logger.error('JUNCTION_WEBHOOK_SECRET is not configured; rejecting Junction webhook');
                return res.status(503).json({ error: 'Webhook configuration unavailable' });
            }

            if (!signature) {
                logger.warn('Missing Junction webhook signature');
                return res.status(401).json({ error: 'Missing signature' });
            }

            // Use req.rawBody (the original wire bytes) — NOT JSON.stringify(req.body).
            // Re-serializing a parsed object can produce a different byte sequence
            // (key order, whitespace, Unicode escapes) and will break HMAC verification.
            const rawBody = (req as any).rawBody as string | undefined;
            if (!rawBody) {
                logger.error('Junction webhook: rawBody not available — ensure express is configured to capture raw body');
                return res.status(500).json({ error: 'Server configuration error' });
            }

            if (!webhooksService.verifyJunctionSignature(rawBody, signature, webhookSecret)) {
                logger.warn('Invalid Junction webhook signature');
                return res.status(401).json({ error: 'Invalid signature' });
            }

            // Process synchronously before responding so Junction retries on failure
            await webhooksService.handleJunctionEvent(req.body);

            return res.status(200).json({ received: true });
        } catch (error) {
            logger.error('Error processing Junction webhook:', error);
            // Return 500 so Junction knows the event was not processed and retries
            if (!res.headersSent) {
                return res.status(500).json({ error: 'Processing error' });
            }
        }
    }
}

export const webhooksController = new WebhooksController();
