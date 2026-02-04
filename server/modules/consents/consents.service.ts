import { consentsRepository } from './consents.repository';
import { type UserConsent, type InsertUserConsent } from '@shared/schema';
import logger from '../../infra/logging/logger';

export class ConsentsService {
    async grantConsent(consentData: InsertUserConsent): Promise<UserConsent> {
        const consent = await consentsRepository.createUserConsent(consentData);

        logger.info("HIPAA AUDIT LOG - Consent Granted:", {
            timestamp: new Date().toISOString(),
            userId: consentData.userId,
            consentType: consentData.consentType,
            ipAddress: consentData.ipAddress,
            userAgent: consentData.userAgent
        });

        return consent;
    }

    async getConsents(userId: string): Promise<UserConsent[]> {
        return await consentsRepository.getUserConsents(userId);
    }

    async revokeConsent(userId: string, consentType: 'lab_data_processing' | 'ai_analysis' | 'data_retention' | 'third_party_sharing'): Promise<boolean> {
        const success = await consentsRepository.revokeUserConsent(userId, consentType);

        if (success) {
            logger.info("HIPAA AUDIT LOG - Consent Revoked:", {
                timestamp: new Date().toISOString(),
                userId,
                consentType
            });
        }

        return success;
    }
}

export const consentsService = new ConsentsService();
