import { Request, Response } from 'express';
import logger from '../../infra/logging/logger';
import { verifyEpdWebhookSignature } from '../../modules/billing/epd-gateway';
import { epdWebhooksService, type EpdWebhookEvent } from '../../modules/billing/epd-webhooks.service';

export class EpdWebhooksController {
  async handleEpdWebhook(req: Request, res: Response) {
    try {
      const isProduction = process.env.NODE_ENV === 'production';
      const signingKey = process.env.EPD_WEBHOOK_SIGNING_KEY;
      const signatureHeader = req.headers['webhook-signature'] as string | undefined;

      // In production, require signing key and signature
      if (isProduction && !signingKey) {
        logger.error('EPD_WEBHOOK_SIGNING_KEY is missing in production');
        return res.status(503).json({ error: 'Webhook configuration unavailable' });
      }

      if (signingKey && signatureHeader) {
        const rawBody = (req as any).rawBody || JSON.stringify(req.body);
        if (!verifyEpdWebhookSignature(rawBody, signatureHeader, signingKey)) {
          logger.warn('Invalid EPD webhook signature', {
            signature: signatureHeader.substring(0, 20) + '...',
          });
          return res.status(401).json({ error: 'Invalid signature' });
        }
      } else if (isProduction && !signatureHeader) {
        logger.warn('Missing EPD webhook signature in production');
        return res.status(401).json({ error: 'Missing signature' });
      }

      const event = req.body as EpdWebhookEvent;
      if (!event?.event_type || !event?.event_id) {
        return res.status(400).json({ error: 'Invalid webhook payload' });
      }

      // Process synchronously BEFORE responding so errors propagate
      // as non-200 and EPD will retry the event automatically.
      await epdWebhooksService.handleEvent(event);

      return res.status(200).json({ received: true });
    } catch (error) {
      logger.error('Error processing EPD webhook', { error });
      if (!res.headersSent) {
        // 500 tells EPD the event was not processed — it will retry
        return res.status(500).json({ error: 'Processing error' });
      }
    }
  }
}

export const epdWebhooksController = new EpdWebhooksController();
