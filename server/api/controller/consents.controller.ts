import { Request, Response } from 'express';
import { consentsService } from '../../modules/consents/consents.service';
import logger from '../../infra/logging/logger';

export class ConsentsController {
    async grantConsent(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const { consentType, consentVersion, consentText } = req.body;

            // Validate consent type
            const validConsentTypes = ['lab_data_processing', 'ai_analysis', 'data_retention', 'third_party_sharing'];
            if (!validConsentTypes.includes(consentType)) {
                return res.status(400).json({ error: 'Invalid consent type' });
            }

            // Get audit information
            const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || req.socket.remoteAddress;
            const userAgent = req.headers['user-agent'];

            const consent = await consentsService.grantConsent({
                userId,
                consentType,
                granted: true,
                consentVersion: consentVersion || '1.0',
                ipAddress,
                userAgent,
                consentText: consentText || `User consents to ${consentType}`,
                metadata: {
                    source: 'upload_form'
                }
            });

            res.json({ success: true, consent });
        } catch (error) {
            logger.error('Consent grant controller error:', error);
            res.status(500).json({ error: 'Failed to grant consent' });
        }
    }

    async getConsents(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const consents = await consentsService.getConsents(userId);
            res.json(consents);
        } catch (error) {
            logger.error('Error fetching consents controller:', error);
            res.status(500).json({ error: 'Failed to fetch consents' });
        }
    }

    async revokeConsent(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const { consentType } = req.params;

            const validConsentTypes = ['lab_data_processing', 'ai_analysis', 'data_retention', 'third_party_sharing'];
            if (!validConsentTypes.includes(consentType)) {
                return res.status(400).json({ error: 'Invalid consent type' });
            }

            const success = await consentsService.revokeConsent(userId, consentType as any);
            res.json({ success });
        } catch (error) {
            logger.error('Error revoking consent controller:', error);
            res.status(500).json({ error: 'Failed to revoke consent' });
        }
    }
}

export const consentsController = new ConsentsController();
