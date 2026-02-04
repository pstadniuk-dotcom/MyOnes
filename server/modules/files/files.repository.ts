import { db } from '../../infra/db/db';
import { fileUploads, type FileUpload, type InsertFileUpload } from '@shared/schema';
import { eq, and, isNull, desc } from 'drizzle-orm';

type DbInsertFileUpload = typeof fileUploads.$inferInsert;

type LabReportDataShape = {
    testDate?: string;
    testType?: string;
    labName?: string;
    physicianName?: string;
    analysisStatus?: 'pending' | 'processing' | 'completed' | 'error';
    extractedData?: Record<string, any>;
};

function normalizeLabReportData(data?: unknown): DbInsertFileUpload['labReportData'] {
    if (!data || typeof data !== 'object') {
        return null;
    }

    const payload = data as Record<string, any>;
    const normalized: LabReportDataShape = {};

    if (typeof payload.testDate === 'string') normalized.testDate = payload.testDate;
    if (typeof payload.testType === 'string') normalized.testType = payload.testType;
    if (typeof payload.labName === 'string') normalized.labName = payload.labName;
    if (typeof payload.physicianName === 'string') normalized.physicianName = payload.physicianName;
    if (typeof payload.analysisStatus === 'string' && ['pending', 'processing', 'completed', 'error'].includes(payload.analysisStatus)) {
        normalized.analysisStatus = payload.analysisStatus as LabReportDataShape['analysisStatus'];
    }
    if (payload.extractedData && typeof payload.extractedData === 'object') {
        normalized.extractedData = payload.extractedData as Record<string, any>;
    }

    return (Object.keys(normalized).length > 0 ? normalized : null) as DbInsertFileUpload['labReportData'];
}

export class FilesRepository {
    async getFileUpload(id: string): Promise<FileUpload | undefined> {
        const [fileUpload] = await db.select().from(fileUploads).where(eq(fileUploads.id, id));
        return fileUpload || undefined;
    }

    async createFileUpload(insertFileUpload: InsertFileUpload): Promise<FileUpload> {
        // Handle labReportData field properly
        const safeFileUpload: InsertFileUpload = {
            ...insertFileUpload,
            labReportData: normalizeLabReportData(insertFileUpload.labReportData)
        };
        const dbPayload = safeFileUpload as DbInsertFileUpload;
        const [fileUpload] = await db.insert(fileUploads).values(dbPayload).returning();
        return fileUpload;
    }

    async updateFileUpload(id: string, updates: Partial<InsertFileUpload>): Promise<FileUpload | undefined> {
        // Handle labReportData field properly
        const safeUpdates: Partial<InsertFileUpload> = {
            ...updates,
            ...(updates.labReportData !== undefined && {
                labReportData: normalizeLabReportData(updates.labReportData)
            })
        };

        const [fileUpload] = await db
            .update(fileUploads)
            .set(safeUpdates as Partial<DbInsertFileUpload>)
            .where(eq(fileUploads.id, id))
            .returning();
        return fileUpload || undefined;
    }

    async softDeleteFileUpload(id: string, deletedBy: string): Promise<boolean> {
        const result = await db
            .update(fileUploads)
            .set({ deletedAt: new Date(), deletedBy })
            .where(eq(fileUploads.id, id));
        return (result.rowCount ?? 0) > 0;
    }

    async listFileUploadsByUser(userId: string, type?: 'lab_report' | 'medical_document' | 'prescription' | 'other', includeDeleted?: boolean): Promise<FileUpload[]> {
        let whereClause: any = eq(fileUploads.userId, userId);

        if (type) {
            whereClause = and(whereClause, eq(fileUploads.type, type));
        }

        if (!includeDeleted) {
            whereClause = and(whereClause, isNull(fileUploads.deletedAt));
        }

        return await db.select().from(fileUploads).where(whereClause).orderBy(desc(fileUploads.uploadedAt));
    }

    async getLabReportsByUser(userId: string): Promise<FileUpload[]> {
        return this.listFileUploadsByUser(userId, 'lab_report', false);
    }

    async getLabReportById(id: string, userId: string): Promise<FileUpload | undefined> {
        const [labReport] = await db
            .select()
            .from(fileUploads)
            .where(and(
                eq(fileUploads.id, id),
                eq(fileUploads.userId, userId),
                eq(fileUploads.type, 'lab_report'),
                isNull(fileUploads.deletedAt)
            ));
        return labReport || undefined;
    }

    async updateLabReportData(id: string, labReportData: any, userId: string): Promise<FileUpload | undefined> {
        const normalizedData = normalizeLabReportData(labReportData);

        const [labReport] = await db
            .update(fileUploads)
            .set({ labReportData: normalizedData })
            .where(and(
                eq(fileUploads.id, id),
                eq(fileUploads.userId, userId),
                eq(fileUploads.type, 'lab_report')
            ))
            .returning();

        return labReport || undefined;
    }
}

export const filesRepository = new FilesRepository();
