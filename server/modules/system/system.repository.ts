import { db } from '../../infra/db/db';
import {
    auditLogs, appSettings,
    safetyAuditLogs, formulaWarningAcknowledgments,
    type AuditLog, type InsertAuditLog, type AppSetting,
    type SafetyAuditLog, type InsertSafetyAuditLog,
    type FormulaWarningAcknowledgment, type InsertFormulaWarningAcknowledgment,
} from '@shared/schema';
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

    // ── Safety Audit Log operations ─────────────────────────────────────
    async createSafetyAuditLog(entry: InsertSafetyAuditLog): Promise<SafetyAuditLog> {
        const [log] = await db.insert(safetyAuditLogs).values(entry as any).returning();
        return log;
    }

    async getSafetyAuditLogsByUser(userId: string, limit: number = 50): Promise<SafetyAuditLog[]> {
        return await db
            .select()
            .from(safetyAuditLogs)
            .where(eq(safetyAuditLogs.userId, userId))
            .orderBy(desc(safetyAuditLogs.createdAt))
            .limit(limit);
    }

    async getSafetyAuditLogsByFormula(formulaId: string): Promise<SafetyAuditLog[]> {
        return await db
            .select()
            .from(safetyAuditLogs)
            .where(eq(safetyAuditLogs.formulaId, formulaId))
            .orderBy(desc(safetyAuditLogs.createdAt));
    }

    // ── Formula Warning Acknowledgment operations ───────────────────────
    async createWarningAcknowledgment(ack: InsertFormulaWarningAcknowledgment): Promise<FormulaWarningAcknowledgment> {
        const [created] = await db.insert(formulaWarningAcknowledgments).values(ack as any).returning();
        return created;
    }

    async getWarningAcknowledgment(formulaId: string, userId: string): Promise<FormulaWarningAcknowledgment | undefined> {
        const [ack] = await db
            .select()
            .from(formulaWarningAcknowledgments)
            .where(and(
                eq(formulaWarningAcknowledgments.formulaId, formulaId),
                eq(formulaWarningAcknowledgments.userId, userId),
            ))
            .orderBy(desc(formulaWarningAcknowledgments.acknowledgedAt))
            .limit(1);
        return ack || undefined;
    }
}

export const systemRepository = new SystemRepository();
