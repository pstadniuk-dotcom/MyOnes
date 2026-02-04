import { Request, Response } from 'express';
import { webhooksService } from '../../modules/webhooks/webhooks.service';
import logger from '../../infra/logging/logger';

export class WebhooksController {
    /**
     * POST /api/webhooks/twilio/sms
     * Handle Twilio SMS reply webhooks
     */
    async handleTwilioSms(req: Request, res: Response) {
        try {
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
            const signature = req.headers['x-vital-webhook-signature'] as string;
            const rawBody = JSON.stringify(req.body);
            const webhookSecret = process.env.JUNCTION_WEBHOOK_SECRET;

            if (webhookSecret && !webhooksService.verifyJunctionSignature(rawBody, signature, webhookSecret)) {
                logger.warn('Invalid webhook signature');
                return res.status(401).json({ error: 'Invalid signature' });
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
}

export const webhooksController = new WebhooksController();
