import { db } from '../../infra/db/db';
import { fileUploads, labAnalyses, type FileUpload, type InsertFileUpload, type LabAnalysis, type InsertLabAnalysis } from '@shared/schema';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { encryptField, decryptField } from '../../infra/security/fieldEncryption';
import { logger } from '../../infra/logging/logger';

type DbInsertFileUpload = typeof fileUploads.$inferInsert;

type LabReportDataShape = {
    testDate?: string;
    testDateSource?: string;
    testDateConfidence?: 'high' | 'medium' | 'low' | 'none';
    testType?: string;
    labName?: string;
    physicianName?: string;
    analysisStatus?: 'pending' | 'processing' | 'completed' | 'error';
    progressStep?: string;
    progressDetail?: string;
    extractedData?: Array<Record<string, any>> | Record<string, any>;
    markerInsights?: Record<string, any>;
    overallAssessment?: string;
    riskPatterns?: Array<Record<string, any>>;
};

function normalizeLabReportData(data?: unknown): DbInsertFileUpload['labReportData'] {
    if (!data || typeof data !== 'object') {
        return null;
    }

    const payload = data as Record<string, any>;
    const normalized: LabReportDataShape = {};

    if (typeof payload.testDate === 'string') normalized.testDate = payload.testDate;
    if (typeof payload.testDateSource === 'string') normalized.testDateSource = payload.testDateSource;
    if (typeof payload.testDateConfidence === 'string' && ['high', 'medium', 'low', 'none'].includes(payload.testDateConfidence)) {
        normalized.testDateConfidence = payload.testDateConfidence as LabReportDataShape['testDateConfidence'];
    }
    if (typeof payload.testType === 'string') normalized.testType = payload.testType;
    if (typeof payload.labName === 'string') normalized.labName = payload.labName;
    if (typeof payload.physicianName === 'string') normalized.physicianName = payload.physicianName;
    if (typeof payload.analysisStatus === 'string' && ['pending', 'processing', 'completed', 'error'].includes(payload.analysisStatus)) {
        normalized.analysisStatus = payload.analysisStatus as LabReportDataShape['analysisStatus'];
    }
    if (payload.extractedData && typeof payload.extractedData === 'object') {
        normalized.extractedData = payload.extractedData as Record<string, any>;
    }
    if (payload.markerInsights && typeof payload.markerInsights === 'object') {
        normalized.markerInsights = payload.markerInsights;
    }
    if (typeof payload.overallAssessment === 'string') {
        normalized.overallAssessment = payload.overallAssessment;
    }
    if (Array.isArray(payload.riskPatterns)) {
        normalized.riskPatterns = payload.riskPatterns;
    }
    if (typeof payload.progressStep === 'string') {
        normalized.progressStep = payload.progressStep;
    }
    if (typeof payload.progressDetail === 'string') {
        normalized.progressDetail = payload.progressDetail;
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
        // Merge (don't replace) labReportData so each call adds/updates fields
        // instead of clobbering progress/extracted data with a partial write.
        let mergedLabReportData: any = undefined;
        if (updates.labReportData !== undefined) {
            const incoming = (updates.labReportData ?? {}) as any;
            let existing: any = {};
            try {
                const [current] = await db.select({ labReportData: fileUploads.labReportData })
                    .from(fileUploads).where(eq(fileUploads.id, id));
                if (current?.labReportData && typeof current.labReportData === 'object') {
                    existing = current.labReportData;
                }
            } catch (err) {
                logger.warn('Failed to read existing labReportData before merge', { id, error: err });
            }
            mergedLabReportData = { ...existing, ...incoming };

            // Guard against late/out-of-order progress callbacks reverting a
            // terminal status. If the row is already marked completed/error,
            // never let an incoming `processing`/`pending` write overwrite it.
            // This prevents reports that finished analysis from getting stuck
            // showing "Finalizing analysis..." forever (observed when many
            // uploads run in parallel).
            const existingStatus = String(existing?.analysisStatus || '').toLowerCase();
            const incomingStatus = String(incoming?.analysisStatus || '').toLowerCase();
            const isTerminal = existingStatus === 'completed' || existingStatus === 'error';
            const isRegression = incomingStatus === 'processing' || incomingStatus === 'pending';
            if (isTerminal && isRegression) {
                mergedLabReportData.analysisStatus = existing.analysisStatus;
                // Also drop transient progress fields so the UI stops showing them
                delete mergedLabReportData.progressStep;
                delete mergedLabReportData.progressDetail;
            }
        }

        const safeUpdates: Partial<InsertFileUpload> = {
            ...updates,
            ...(mergedLabReportData !== undefined && {
                labReportData: normalizeLabReportData(mergedLabReportData)
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

    /**
     * Recover stale processing records on server startup.
     * Any file stuck in 'processing' or 'pending' gets set to 'error' so the user can retry.
     */
    async recoverStaleProcessing(): Promise<number> {
        const allFiles = await db.select().from(fileUploads)
            .where(and(
                eq(fileUploads.type, 'lab_report'),
                isNull(fileUploads.deletedAt)
            ));

        let recovered = 0;
        for (const file of allFiles) {
            const status = (file.labReportData as any)?.analysisStatus;
            if (status === 'processing' || status === 'pending') {
                await this.updateFileUpload(file.id, {
                    labReportData: {
                        ...((file.labReportData as any) || {}),
                        analysisStatus: 'error',
                        progressDetail: 'Analysis interrupted — please re-analyze.',
                    }
                });
                recovered++;
            }
        }
        return recovered;
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

    // Lab Analysis operations (AI-generated insights)
    async createLabAnalysis(insertAnalysis: InsertLabAnalysis): Promise<LabAnalysis> {
        try {
            // Encrypt sensitive health data before storing
            const encryptedAnalysis = {
                ...insertAnalysis,
                extractedMarkers: insertAnalysis.extractedMarkers
                    ? encryptField(JSON.stringify(insertAnalysis.extractedMarkers))
                    : null,
                aiInsights: insertAnalysis.aiInsights
                    ? encryptField(JSON.stringify(insertAnalysis.aiInsights))
                    : null
            };

            const [analysis] = await db.insert(labAnalyses).values(encryptedAnalysis as any).returning();

            // Decrypt for return
            return {
                ...analysis,
                extractedMarkers: analysis.extractedMarkers
                    ? JSON.parse(decryptField(analysis.extractedMarkers as any))
                    : [],
                aiInsights: analysis.aiInsights
                    ? JSON.parse(decryptField(analysis.aiInsights as any))
                    : undefined
            };
        } catch (error) {
            logger.error('Error creating lab analysis', { error });
            throw new Error('Failed to create lab analysis');
        }
    }

    async getLabAnalysis(fileId: string): Promise<LabAnalysis | undefined> {
        try {
            const [analysis] = await db.select().from(labAnalyses).where(eq(labAnalyses.fileId, fileId));
            if (!analysis) return undefined;

            // Decrypt sensitive fields
            return {
                ...analysis,
                extractedMarkers: analysis.extractedMarkers
                    ? JSON.parse(decryptField(analysis.extractedMarkers as any))
                    : [],
                aiInsights: analysis.aiInsights
                    ? JSON.parse(decryptField(analysis.aiInsights as any))
                    : undefined
            };
        } catch (error) {
            logger.error('Error getting lab analysis', { error });
            return undefined;
        }
    }

    async updateLabAnalysis(id: string, updates: Partial<InsertLabAnalysis>): Promise<LabAnalysis | undefined> {
        try {
            // Encrypt sensitive fields in updates
            const encryptedUpdates = {
                ...updates,
                extractedMarkers: updates.extractedMarkers
                    ? encryptField(JSON.stringify(updates.extractedMarkers))
                    : undefined,
                aiInsights: updates.aiInsights
                    ? encryptField(JSON.stringify(updates.aiInsights))
                    : undefined
            };

            // Remove undefined values
            const cleanUpdates = Object.fromEntries(
                Object.entries(encryptedUpdates).filter(([_, v]) => v !== undefined)
            );

            const [analysis] = await db
                .update(labAnalyses)
                .set(cleanUpdates as any)
                .where(eq(labAnalyses.id, id))
                .returning();

            if (!analysis) return undefined;

            // Decrypt for return
            return {
                ...analysis,
                extractedMarkers: analysis.extractedMarkers
                    ? JSON.parse(decryptField(analysis.extractedMarkers as any))
                    : [],
                aiInsights: analysis.aiInsights
                    ? JSON.parse(decryptField(analysis.aiInsights as any))
                    : undefined
            };
        } catch (error) {
            logger.error('Error updating lab analysis', { error });
            return undefined;
        }
    }

    async listLabAnalysesByUser(userId: string): Promise<LabAnalysis[]> {
        try {
            // Inner-join file_uploads so we exclude analyses whose source file
            // has been soft-deleted. Without this, formula-review and
            // optimize.service still see markers from deleted lab reports.
            const rows = await db
                .select({ analysis: labAnalyses })
                .from(labAnalyses)
                .innerJoin(fileUploads, eq(labAnalyses.fileId, fileUploads.id))
                .where(and(
                    eq(labAnalyses.userId, userId),
                    isNull(fileUploads.deletedAt),
                ))
                .orderBy(desc(labAnalyses.processedAt));

            const analyses = rows.map(r => r.analysis);

            // Decrypt each analysis
            return analyses.map(analysis => ({
                ...analysis,
                extractedMarkers: analysis.extractedMarkers
                    ? JSON.parse(decryptField(analysis.extractedMarkers as any))
                    : [],
                aiInsights: analysis.aiInsights
                    ? JSON.parse(decryptField(analysis.aiInsights as any))
                    : undefined
            }));
        } catch (error) {
            logger.error('Error listing lab analyses by user', { error });
            return [];
        }
    }

    /**
     * Idempotently writes a lab_analyses row for a given file_upload.
     * - One analysis per fileId (by convention; we update the latest if found).
     * - Maps `extractedData` (testName/value/...) to schema's `extractedMarkers` (name/value/...).
     * - Coerces `value` to number when possible (schema requires number).
     * - Status defaults to 'completed' on success, 'error' on failure.
     */
    async upsertLabAnalysisForFile(input: {
        fileId: string;
        userId: string;
        analysisStatus?: 'pending' | 'processing' | 'completed' | 'error';
        extractedData?: Array<Record<string, any>> | undefined;
        aiInsights?: any;
        errorMessage?: string | null;
    }): Promise<LabAnalysis | undefined> {
        const status = input.analysisStatus || 'completed';

        // Map extractedData to lab_analyses.extractedMarkers shape
        const markers = Array.isArray(input.extractedData)
            ? input.extractedData
                .map((row: any) => {
                    const name = row?.testName || row?.name || '';
                    if (!name) return null;
                    const rawVal = row?.value;
                    const numVal = typeof rawVal === 'number'
                        ? rawVal
                        : (typeof rawVal === 'string' ? parseFloat(rawVal.replace(/,/g, '')) : NaN);
                    const inferred = (() => {
                        const s = String(row?.status || '').toLowerCase();
                        if (s === 'high' || s === 'low' || s === 'normal' || s === 'critical') return s;
                        return 'normal';
                    })() as 'normal' | 'high' | 'low' | 'critical';
                    return {
                        name,
                        value: Number.isFinite(numVal) ? numVal : 0,
                        unit: row?.unit || '',
                        referenceRange: row?.referenceRange || '',
                        status: inferred,
                    };
                })
                .filter(Boolean) as any[]
            : [];

        try {
            const [existing] = await db.select({ id: labAnalyses.id })
                .from(labAnalyses)
                .where(eq(labAnalyses.fileId, input.fileId))
                .orderBy(desc(labAnalyses.processedAt))
                .limit(1);

            if (existing) {
                return await this.updateLabAnalysis(existing.id, {
                    analysisStatus: status,
                    extractedMarkers: markers,
                    aiInsights: input.aiInsights ?? undefined,
                    errorMessage: input.errorMessage ?? null,
                } as any);
            }

            return await this.createLabAnalysis({
                fileId: input.fileId,
                userId: input.userId,
                analysisStatus: status,
                extractedMarkers: markers,
                aiInsights: input.aiInsights ?? undefined,
                errorMessage: input.errorMessage ?? null,
            } as any);
        } catch (err) {
            logger.warn('upsertLabAnalysisForFile failed', { fileId: input.fileId, error: err });
            return undefined;
        }
    }
}

export const filesRepository = new FilesRepository();
