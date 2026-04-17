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
            const isProduction = process.env.NODE_ENV === 'production';
            const signature = req.headers['x-vital-webhook-signature'] as string;
            const rawBody = JSON.stringify(req.body);
            const webhookSecret = process.env.JUNCTION_WEBHOOK_SECRET;

            if (isProduction && !webhookSecret) {
                logger.error('JUNCTION_WEBHOOK_SECRET is missing in production; rejecting Junction webhook');
                return res.status(503).json({ error: 'Webhook configuration unavailable' });
            }

            if (isProduction && !signature) {
                logger.warn('Missing Junction webhook signature in production request');
                return res.status(401).json({ error: 'Missing signature' });
            }

            if (webhookSecret && !webhooksService.verifyJunctionSignature(rawBody, signature, webhookSecret)) {
                logger.warn('Invalid webhook signature');
                return res.status(401).json({ error: 'Invalid signature' });
            } else if (!webhookSecret && !isProduction) {
                logger.warn('Junction webhook signature verification bypassed in non-production environment');
            }

            await webhooksService.handleJunctionEvent(req.body);

            // Always return 200 to acknowledge receipt
            res.status(200).json({ received: true });
        } catch (error) {
            logger.error('Error processing Junction webhook:', error);
            // Still return 200 to prevent retries for processing errors
            res.status(200).json({ received: true, error: 'Processing error' });
        }
    }

    /**
     * POST /api/webhooks/alive/order-status
     * Handle Alive manufacturer order status updates
     */
    async handleAliveOrderStatusWebhook(req: Request, res: Response) {
        try {
            const isProduction = process.env.NODE_ENV === 'production';
            const configuredSecret = process.env.ALIVE_WEBHOOK_SECRET;
            const providedSecret =
                (req.headers['x-alive-webhook-secret'] as string | undefined) ||
                (req.headers['x-webhook-secret'] as string | undefined);

            if (isProduction && !configuredSecret) {
                logger.error('ALIVE_WEBHOOK_SECRET is missing in production; rejecting Alive webhook');
                return res.status(503).json({ error: 'Webhook configuration unavailable' });
            }

            if (configuredSecret && providedSecret !== configuredSecret) {
                logger.warn('Invalid Alive webhook secret header');
                return res.status(401).json({ error: 'Invalid webhook secret' });
            }

            if (!configuredSecret && !isProduction) {
                logger.warn('Alive webhook secret verification bypassed in non-production environment');
            }

            await webhooksService.handleAliveOrderStatusWebhook(req.body);
            return res.status(200).json({ received: true });
        } catch (error) {
            logger.error('Error processing Alive order status webhook:', error);
            return res.status(200).json({ received: true, error: 'Processing error' });
        }
    }

    /**
     * POST /webhook
     * Unified catch-all webhook listener for events
     */
    async handleUnifiedWebhook(req: Request, res: Response) {
        try {
            console.log("req.body-->>>>>webhook",req.body)
            logger.info('Unified webhook received', {
                method: req.method,
                headers: req.headers,
                body: req.body,
                query: req.query
            });

            // Respond immediately with 200 OK
            return res.status(200).json({
                status: 'success',
                message: 'Webhook received',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Error in unified webhook listener:', error);
            // Still return 200 to prevent retries for common errors during logging
            res.status(200).json({ status: 'system_logged', received: true });
        }
    }
}

export const webhooksController = new WebhooksController();
