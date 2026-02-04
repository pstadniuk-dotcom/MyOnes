import { db } from '../../infra/db/db';
import { userConsents, type UserConsent, type InsertUserConsent } from '@shared/schema';
import { eq, and, desc, isNull } from 'drizzle-orm';

export class ConsentsRepository {
    async createUserConsent(insertConsent: InsertUserConsent): Promise<UserConsent> {
        // Handle metadata field properly
        const safeConsent = {
            ...insertConsent,
            metadata: insertConsent.metadata ? {
                source: ['upload_form', 'dashboard', 'api'].includes(insertConsent.metadata.source as string) ? insertConsent.metadata.source as 'upload_form' | 'dashboard' | 'api' : undefined,
                fileId: typeof insertConsent.metadata.fileId === 'string' ? insertConsent.metadata.fileId : undefined,
                additionalInfo: insertConsent.metadata.additionalInfo && typeof insertConsent.metadata.additionalInfo === 'object' ? insertConsent.metadata.additionalInfo as Record<string, any> : undefined
            } : null
        };
        const [consent] = await db.insert(userConsents).values(safeConsent).returning();
        return consent;
    }

    async getUserConsent(userId: string, consentType: 'lab_data_processing' | 'ai_analysis' | 'data_retention' | 'third_party_sharing'): Promise<UserConsent | undefined> {
        const [consent] = await db
            .select()
            .from(userConsents)
            .where(and(
                eq(userConsents.userId, userId),
                eq(userConsents.consentType, consentType),
                isNull(userConsents.revokedAt)
            ))
            .orderBy(desc(userConsents.grantedAt))
            .limit(1);
        return consent || undefined;
    }

    async getUserConsents(userId: string): Promise<UserConsent[]> {
        return await db.select().from(userConsents).where(eq(userConsents.userId, userId)).orderBy(desc(userConsents.grantedAt));
    }

    async revokeUserConsent(userId: string, consentType: 'lab_data_processing' | 'ai_analysis' | 'data_retention' | 'third_party_sharing'): Promise<boolean> {
        const result = await db
            .update(userConsents)
            .set({ revokedAt: new Date() })
            .where(and(
                eq(userConsents.userId, userId),
                eq(userConsents.consentType, consentType),
                isNull(userConsents.revokedAt)
            ));
        return !!result;
    }
}

export const consentsRepository = new ConsentsRepository();
