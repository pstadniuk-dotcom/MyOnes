import { db } from '../../infra/db/db';
import { auditLogs, appSettings, type AuditLog, type InsertAuditLog, type AppSetting } from '@shared/schema';
import { eq, and, desc, gte, lte } from 'drizzle-orm';

export class SystemRepository {
    // Audit Log operations
    async createAuditLog(insertAuditLog: InsertAuditLog): Promise<AuditLog> {
        const [auditLog] = await db.insert(auditLogs).values(insertAuditLog).returning();
        return auditLog;
    }

    async getAuditLogsByFile(fileId: string): Promise<AuditLog[]> {
        return await db.select().from(auditLogs).where(eq(auditLogs.fileId, fileId)).orderBy(desc(auditLogs.timestamp));
    }

    async getAuditLogsByUser(userId: string, limit?: number): Promise<AuditLog[]> {
        const query = db.select().from(auditLogs).where(eq(auditLogs.userId, userId)).orderBy(desc(auditLogs.timestamp));
        if (limit) {
            return await query.limit(limit);
        }
        return await query;
    }

    async getAuditLogsByDateRange(startDate: Date, endDate: Date): Promise<AuditLog[]> {
        return await db
            .select()
            .from(auditLogs)
            .where(and(
                gte(auditLogs.timestamp, startDate),
                lte(auditLogs.timestamp, endDate)
            ))
            .orderBy(desc(auditLogs.timestamp));
    }

    // App settings operations
    async getAppSetting(key: string): Promise<AppSetting | undefined> {
        const [setting] = await db.select().from(appSettings).where(eq(appSettings.key, key));
        return setting || undefined;
    }

    async upsertAppSetting(key: string, value: Record<string, any>, updatedBy?: string | null): Promise<AppSetting> {
        // Try update first
        const [updated] = await db
            .update(appSettings)
            .set({ value, updatedAt: new Date(), updatedBy: updatedBy ?? null })
            .where(eq(appSettings.key, key))
            .returning();

        if (updated) return updated;

        // Insert if not exists
        const [inserted] = await db
            .insert(appSettings)
            .values({ key, value, updatedBy: updatedBy ?? null })
            .returning();

        return inserted;
    }

    async deleteAppSetting(key: string): Promise<boolean> {
        const result = await db.delete(appSettings).where(eq(appSettings.key, key));
        return (result.rowCount ?? 0) > 0;
    }
}

export const systemRepository = new SystemRepository();
