import fs from 'fs';
import { filesRepository } from './files.repository';
import { ObjectStorageService } from '../../utils/objectStorage';
import { analyzeLabReport, looksLikeLabRequisition } from '../../utils/fileAnalysis';
import { labsService } from '../labs/labs.service';
import { notificationsService } from '../notifications/notifications.service';
import { usersRepository } from '../users/users.repository';
import { sendNotificationEmail } from '../../utils/emailService';
import logger from '../../infra/logging/logger';
import { type InsertFileUpload } from '@shared/schema';
import { systemRepository } from '../system/system.repository';
import posthog, { syncUserProperties } from '../../infra/posthog';

/**
 * Classify a finished lab analysis into the right (analysisStatus, documentKind,
 * progressDetail) tuple so the UI can show meaningful messaging.
 *
 * - markers > 0           → completed / results
 * - 0 markers + requisition text → error  / requisition + clear "this is an order form" message
 * - 0 markers otherwise   → error  / unknown + generic retry message
 */
function classifyAnalysisOutcome(
    markerCount: number,
    rawText?: string,
): {
    analysisStatus: 'completed' | 'error';
    documentKind: 'results' | 'requisition' | 'unknown';
    progressDetail?: string;
} {
    if (markerCount > 0) {
        return { analysisStatus: 'completed', documentKind: 'results' };
    }
    if (looksLikeLabRequisition(rawText)) {
        return {
            analysisStatus: 'error',
            documentKind: 'requisition',
            progressDetail:
                'This looks like a lab requisition (order form), not lab results. ' +
                'Once your results PDF is available from the lab, upload that and we\'ll analyze it.',
        };
    }
    return {
        analysisStatus: 'error',
        documentKind: 'unknown',
        progressDetail: 'We couldn\'t extract any lab markers from this document. Try a clearer scan or a results PDF from the lab.',
    };
}

export class FilesService {
    private objectStorageService: ObjectStorageService;

    constructor() {
        this.objectStorageService = new ObjectStorageService();
    }

    async getFile(fileId: string, userId: string) {
        const fileUpload = await filesRepository.getFileUpload(fileId);
        if (!fileUpload) {
            throw new Error('File not found');
        }
        if (fileUpload.userId !== userId) {
            throw new Error('Access denied');
        }
        return fileUpload;
    }

    async downloadFile(fileId: string, userId: string, auditInfo?: { ipAddress?: string; userAgent?: string }) {
        const fileUpload = await this.getFile(fileId, userId);
        const objectPath = fileUpload.objectPath;
        const buffer = await this.objectStorageService.getLabReportFile(objectPath, userId);

        if (!buffer) {
            // Log failed download
            this.logFileAudit(userId, fileId, 'download', objectPath, false, 'Failed to download file from storage', auditInfo);
            throw new Error('Failed to download file from storage');
        }

        // Log successful download
        this.logFileAudit(userId, fileId, 'download', objectPath, true, undefined, auditInfo);

        return {
            buffer,
            mimeType: fileUpload.mimeType || 'application/octet-stream',
            originalFileName: fileUpload.originalFileName
        };
    }

    async getUserFiles(userId: string, type?: string) {
        const fileType = type === 'lab-reports' ? 'lab_report' : undefined;
        const files = await filesRepository.listFileUploadsByUser(userId, fileType as any, false);

        // Strip rawText from lab report data to reduce API payload size
        // rawText can be 100KB+ for multi-page PDFs and is only used server-side
        return files.map(f => {
            if (f.labReportData && typeof f.labReportData === 'object' && 'rawText' in (f.labReportData as any)) {
                const { rawText, ...rest } = f.labReportData as any;
                return { ...f, labReportData: rest };
            }
            return f;
        });
    }

    async uploadFile(userId: string, uploadedFile: any, auditInfo: any) {
        // Validate file constraints
        const maxSizeBytes = 5 * 1024 * 1024; // 5MB limit
        if (uploadedFile.size > maxSizeBytes) {
            throw new Error(`File too large. Maximum size is 5MB.`);
        }

        const allowedMimeTypes = [
            'application/pdf', 'image/jpeg', 'image/jpg', 'image/png',
            'text/plain', 'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        if (!allowedMimeTypes.includes(uploadedFile.mimetype)) {
            throw new Error('Invalid file type. Only PDF, JPG, PNG, TXT, DOC, and DOCX files are allowed.');
        }

        const fileName = uploadedFile.name.toLowerCase();
        const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.txt', '.doc', '.docx'];
        if (!allowedExtensions.some(ext => fileName.endsWith(ext))) {
            throw new Error('Invalid file extension.');
        }

        // Magic byte verification to prevent spoofing
        const fileBuffer = (uploadedFile.data && uploadedFile.data.length > 0)
            ? uploadedFile.data
            : (uploadedFile.tempFilePath ? fs.readFileSync(uploadedFile.tempFilePath) : Buffer.alloc(0));

        this.validateMagicBytes(uploadedFile, fileBuffer);

        // Determine category.
        //
        // IMPORTANT: The Lab Reports page is currently the ONLY upload entry point in
        // the app. Filename-keyword classification (e.g. requiring words like "lab",
        // "blood", "test") silently mis-classifies common naming patterns like dates
        // ("2026.04.20.pdf") or initials, sending them to `medical_document` where
        // the lab analysis pipeline never runs and they don't appear on the Lab
        // Reports page. Default everything to `lab_report` so OCR + biomarker
        // extraction always runs. Do NOT re-enable filename classification without
        // also adding a separate upload entry point for non-lab medical docs.
        // (Regression introduced by commit 14aa960 — fixed by commit pending.)
        const fileType: 'lab_report' | 'medical_document' | 'prescription' | 'other' = 'lab_report';

        // Dedup: if the same user uploaded a file with the exact same name + size
        // within the last 10 minutes, return that one instead of running OCR/AI again.
        // (Catches the common "double-click upload" case Natalie hit.)
        if (fileType === 'lab_report') {
            try {
                const recent = await filesRepository.listFileUploadsByUser(userId, 'lab_report', false);
                const tenMinAgo = Date.now() - 10 * 60 * 1000;
                const dup = recent.find(f =>
                    f.originalFileName === uploadedFile.name &&
                    f.fileSize === uploadedFile.size &&
                    f.uploadedAt && new Date(f.uploadedAt).getTime() >= tenMinAgo
                );
                if (dup) {
                    logger.info('Skipping duplicate lab upload', {
                        userId,
                        fileName: uploadedFile.name,
                        existingFileId: dup.id,
                    });
                    this.logFileAudit(userId, dup.id, 'upload', dup.objectPath, true, 'Duplicate upload — returned existing file', auditInfo, {
                        originalFileName: uploadedFile.name,
                        fileType,
                        fileSize: uploadedFile.size,
                        mimeType: uploadedFile.mimetype,
                        deduplicated: true,
                    });
                    return {
                        id: dup.id,
                        name: dup.originalFileName,
                        url: dup.objectPath,
                        type: dup.type,
                        size: dup.fileSize,
                        uploadedAt: dup.uploadedAt,
                        hipaaCompliant: true,
                        labData: null,
                        deduplicated: true,
                    };
                }
            } catch (err) {
                logger.warn('Lab upload dedup check failed (continuing with normal upload)', { error: err });
            }
        }

        // Upload to storage
        const normalizedPath = await this.objectStorageService.uploadLabReportFile(
            userId,
            fileBuffer,
            uploadedFile.name,
            uploadedFile.mimetype
        );

        // Save metadata — set initial processing status for lab reports
        const fileUpload = await filesRepository.createFileUpload({
            userId,
            type: fileType,
            objectPath: normalizedPath,
            originalFileName: uploadedFile.name,
            fileSize: uploadedFile.size,
            mimeType: uploadedFile.mimetype,
            hipaaCompliant: true,
            encryptedAtRest: true,
            retentionPolicyId: '7_years',
            ...(fileType === 'lab_report' ? { labReportData: { analysisStatus: 'processing' } } : {})
        });

        // Trigger Analysis in the background (non-blocking)
        if (fileType === 'lab_report') {
            const fileId = fileUpload.id;
            const mimeType = uploadedFile.mimetype;
            const fileName = uploadedFile.name;

            posthog.capture({
                distinctId: userId,
                event: 'lab_report_uploaded',
                properties: {
                    file_id: fileId,
                    file_size_bytes: uploadedFile.size,
                    mime_type: uploadedFile.mimetype,
                },
            });
            void syncUserProperties(userId);

            // Record analysis start time
            await filesRepository.updateFileUpload(fileId, { analysisStartedAt: new Date() } as any);

            void (async () => {
                try {
                    logger.info(`✨ Analyzing lab report in background: ${fileName}`);

                    // Progress callback: update DB so the client can poll for status
                    const onProgress = async (step: string, detail?: string) => {
                        try {
                            await filesRepository.updateFileUpload(fileId, {
                                labReportData: {
                                    analysisStatus: 'processing',
                                    progressStep: step,
                                    progressDetail: detail,
                                }
                            });
                        } catch (_) { /* best-effort */ }
                    };

                    const labDataExtraction = await analyzeLabReport(normalizedPath, mimeType, userId, onProgress);
                    if (labDataExtraction && fileId) {
                        const markers = labDataExtraction.extractedData || [];
                        const outcome = classifyAnalysisOutcome(
                            Array.isArray(markers) ? markers.length : 0,
                            labDataExtraction.rawText,
                        );
                        await filesRepository.updateFileUpload(fileId, {
                            labReportData: {
                                testDate: labDataExtraction.testDate,
                                testDateSource: labDataExtraction.testDateSource,
                                testDateConfidence: labDataExtraction.testDateConfidence,
                                testType: labDataExtraction.testType,
                                labName: labDataExtraction.labName,
                                physicianName: labDataExtraction.physicianName,
                                overallAssessment: labDataExtraction.overallAssessment,
                                riskPatterns: labDataExtraction.riskPatterns,
                                analysisStatus: outcome.analysisStatus,
                                documentKind: outcome.documentKind,
                                progressDetail: outcome.progressDetail,
                                extractedData: markers,
                                rawText: labDataExtraction.rawText,
                            }
                        });
                        // Mirror into lab_analyses so AI Brain / formula review can read structured markers.
                        await filesRepository.upsertLabAnalysisForFile({
                            fileId,
                            userId,
                            analysisStatus: outcome.analysisStatus,
                            extractedData: markers,
                        });
                        // Fire-and-forget: generate marker insights in background
                        void labsService.generateAllMarkerInsights(labDataExtraction.extractedData || []).then(async (markerInsights) => {
                            const currentData = (await filesRepository.getFileUpload(fileId))?.labReportData as any;
                            if (currentData) {
                                await filesRepository.updateFileUpload(fileId, {
                                    labReportData: { ...currentData, markerInsights }
                                });
                                logger.info(`✨ Marker insights generated in background for ${fileName}`);
                            }
                        }).catch(err => logger.warn(`Background insight generation failed for ${fileName}:`, err));
                        logger.info(`✅ Lab report analysis completed: ${fileName}`);
                        // Record analysis completion time
                        await filesRepository.updateFileUpload(fileId, { analysisCompletedAt: new Date() } as any);
                        // Send lab results ready notification (skip if no biomarkers extracted)
                        try {
                            const { canonicalKey } = await import('../labs/biomarker-aliases');
                            const uniqueKeys = new Set<string>();
                            const keyToNames = new Map<string, string[]>();
                            const rawCount = (labDataExtraction.extractedData || []).length;
                            for (const m of labDataExtraction.extractedData || []) {
                                const name = (m as any).testName || (m as any).name || '';
                                if (!name) continue;
                                const key = canonicalKey(name);
                                if (key) {
                                    uniqueKeys.add(key);
                                    if (!keyToNames.has(key)) keyToNames.set(key, []);
                                    keyToNames.get(key)!.push(name);
                                }
                            }
                            // Log any merges so we can spot incorrect alias collisions
                            const merges = [...keyToNames.entries()].filter(([, names]) => names.length > 1);
                            if (merges.length > 0) {
                                logger.info('Canonical dedup merged these markers:', {
                                    rawCount,
                                    dedupCount: uniqueKeys.size,
                                    merges: merges.map(([key, names]) => `${key}: [${names.join(', ')}]`),
                                });
                            } else {
                                logger.info('No canonical merges occurred', { rawCount, dedupCount: uniqueKeys.size });
                            }
                            const markerCount = uniqueKeys.size;
                            posthog.capture({
                                distinctId: userId,
                                event: 'lab_report_analyzed',
                                properties: {
                                    file_id: fileId,
                                    marker_count: markerCount,
                                    raw_marker_count: rawCount,
                                    document_kind: outcome.documentKind,
                                    analysis_status: outcome.analysisStatus,
                                    test_type: labDataExtraction.testType ?? null,
                                    lab_name: labDataExtraction.labName ?? null,
                                },
                            });
                            if (markerCount === 0) {
                                logger.info('Skipping lab results notification — 0 biomarkers extracted', { userId, fileName });
                                return;
                            }
                            await notificationsService.create({
                                userId,
                                type: 'system',
                                title: 'Lab Results Analyzed',
                                content: `Your lab report has been analyzed — ${markerCount} biomarker${markerCount !== 1 ? 's' : ''} extracted. Chat with your AI practitioner to discuss findings.`,
                                metadata: {
                                    actionUrl: '/dashboard/lab-reports',
                                    icon: 'file-check',
                                    priority: 'high'
                                }
                            });

                            const labUser = await usersRepository.getUser(userId);
                            if (labUser && await notificationsService.shouldSendEmail(userId, 'consultation')) {
                                const frontendUrl = process.env.FRONTEND_URL || 'https://ones.health';
                                const firstName = labUser.name?.split(' ')[0] || 'there';
                                const labSource = labDataExtraction.labName ? ` from ${labDataExtraction.labName}` : '';
                                const plural = markerCount !== 1 ? 's' : '';
                                await sendNotificationEmail({
                                    to: labUser.email,
                                    subject: 'Your lab results have been analyzed',
                                    title: 'Lab Results Ready',
                                    type: 'system',
                                    content: `<p>Hi ${firstName},</p><p>We've finished analyzing your lab report${labSource}.</p><p><strong>${markerCount} biomarker${plural}</strong> were extracted and are ready for review.</p><p>Chat with your AI practitioner to get personalized insights and see how your results might affect your formula.</p>`,
                                    actionUrl: `${frontendUrl}/dashboard/lab-reports`,
                                    actionText: 'View Lab Results',
                                });
                            }
                        } catch (notifErr) {
                            logger.warn('Failed to send lab results notification', { userId, error: notifErr });
                        }                    }
                } catch (error) {
                    logger.error('Lab report background analysis failed:', error);
                    if (fileId) {
                        await filesRepository.updateFileUpload(fileId, {
                            labReportData: { analysisStatus: 'error' },
                            analysisCompletedAt: new Date(),
                        } as any);
                        await filesRepository.upsertLabAnalysisForFile({
                            fileId,
                            userId,
                            analysisStatus: 'error',
                            errorMessage: error instanceof Error ? error.message : String(error),
                        });
                    }
                }
            })();
        }

        // Log successful upload
        this.logFileAudit(userId, fileUpload.id, 'upload', normalizedPath, true, undefined, auditInfo, {
            originalFileName: uploadedFile.name,
            fileType: fileType,
            fileSize: uploadedFile.size,
            mimeType: uploadedFile.mimetype,
        });

        return {
            id: fileUpload.id,
            name: uploadedFile.name,
            url: normalizedPath,
            type: fileUpload.type,
            size: uploadedFile.size,
            uploadedAt: fileUpload.uploadedAt,
            hipaaCompliant: true,
            labData: null
        };
    }

    async updateFile(fileId: string, userId: string, uploadedFile: any, auditInfo: any) {
        const fileUpload = await this.getFile(fileId, userId);

        // Validate file constraints
        const maxSizeBytes = 5 * 1024 * 1024; // 5MB limit
        if (uploadedFile.size > maxSizeBytes) {
            throw new Error(`File too large. Maximum size is 5MB.`);
        }

        const oldObjectPath = fileUpload.objectPath;

        // Upload new content to storage - generate a new path to prevent CDN caching
        const fileBuffer = (uploadedFile.data && uploadedFile.data.length > 0)
            ? uploadedFile.data
            : (uploadedFile.tempFilePath ? fs.readFileSync(uploadedFile.tempFilePath) : Buffer.alloc(0));

        // Validate spoofing on update as well
        this.validateMagicBytes(uploadedFile, fileBuffer);

        const normalizedPath = await this.objectStorageService.uploadLabReportFile(
            userId,
            fileBuffer,
            uploadedFile.name,
            uploadedFile.mimetype
        );

        // Update metadata
        await filesRepository.updateFileUpload(fileId, {
            objectPath: normalizedPath,
            fileSize: uploadedFile.size,
            mimeType: uploadedFile.mimetype
        });

        // Delete the old file from storage to keep things clean
        try {
            await this.objectStorageService.secureDeleteLabReport(oldObjectPath, userId);
        } catch (err) {
            logger.warn(`Failed to delete old storage object ${oldObjectPath} during update`, err);
        }

        // Trigger Re-analysis in background
        if (fileUpload.type === 'lab_report') {
            await filesRepository.updateFileUpload(fileId, {
                labReportData: { analysisStatus: 'processing' },
                analysisStartedAt: new Date(),
                analysisCompletedAt: null,
            } as any);

            void (async () => {
                try {
                    const labDataExtraction = await analyzeLabReport(normalizedPath, uploadedFile.mimetype, userId);
                    if (labDataExtraction) {
                        const markers = labDataExtraction.extractedData || [];
                        const outcome = classifyAnalysisOutcome(
                            Array.isArray(markers) ? markers.length : 0,
                            labDataExtraction.rawText,
                        );
                        await filesRepository.updateFileUpload(fileId, {
                            labReportData: {
                                testDate: labDataExtraction.testDate,
                                testDateSource: labDataExtraction.testDateSource,
                                testDateConfidence: labDataExtraction.testDateConfidence,
                                testType: labDataExtraction.testType,
                                labName: labDataExtraction.labName,
                                physicianName: labDataExtraction.physicianName,
                                overallAssessment: labDataExtraction.overallAssessment,
                                riskPatterns: labDataExtraction.riskPatterns,
                                analysisStatus: outcome.analysisStatus,
                                documentKind: outcome.documentKind,
                                progressDetail: outcome.progressDetail,
                                extractedData: markers,
                                rawText: labDataExtraction.rawText,
                            }
                        });
                        await filesRepository.upsertLabAnalysisForFile({
                            fileId,
                            userId,
                            analysisStatus: outcome.analysisStatus,
                            extractedData: markers,
                        });
                        logger.info(`✅ Lab report re-analysis completed: ${uploadedFile.name}`);
                        await filesRepository.updateFileUpload(fileId, { analysisCompletedAt: new Date() } as any);
                        // Fire-and-forget: generate marker insights in background
                        void labsService.generateAllMarkerInsights(labDataExtraction.extractedData || []).then(async (markerInsights) => {
                            const currentData = (await filesRepository.getFileUpload(fileId))?.labReportData as any;
                            if (currentData) {
                                await filesRepository.updateFileUpload(fileId, {
                                    labReportData: { ...currentData, markerInsights }
                                });
                            }
                        }).catch(err => logger.warn(`Background insight generation failed:`, err));
                    }
                } catch (error) {
                    logger.error('Lab report analysis failed during update:', error);
                    await filesRepository.updateFileUpload(fileId, {
                        labReportData: { analysisStatus: 'error' },
                        analysisCompletedAt: new Date(),
                    } as any);
                    await filesRepository.upsertLabAnalysisForFile({
                        fileId,
                        userId,
                        analysisStatus: 'error',
                        errorMessage: error instanceof Error ? error.message : String(error),
                    });
                }
            })();
        }

        // Log file update (replacement upload)
        this.logFileAudit(userId, fileId, 'upload', normalizedPath, true, undefined, auditInfo, {
            originalFileName: uploadedFile.name,
            fileSize: uploadedFile.size,
            mimeType: uploadedFile.mimetype,
            replacedPath: oldObjectPath,
        });

        return {
            id: fileId,
            name: uploadedFile.name,
            url: normalizedPath,
            type: fileUpload.type,
            size: uploadedFile.size,
            uploadedAt: new Date(),
            labData: null
        };
    }

    async reanalyzeFile(fileId: string, userId: string) {
        const fileUpload = await filesRepository.getFileUpload(fileId);

        if (!fileUpload) throw new Error('File not found');
        if (fileUpload.userId !== userId) throw new Error('Unauthorized');
        if (fileUpload.type !== 'lab_report') throw new Error('Only lab reports can be re-analyzed');

        const existingData = (fileUpload.labReportData as any) || {};

        const labData = await analyzeLabReport(
            fileUpload.objectPath,
            fileUpload.mimeType || 'text/plain',
            userId
        );

        // Use explicit field picking (like the upload path) to avoid losing data
        // when AI structuring fails and returns only { rawText }.
        // Preserve existing extractedData if the new analysis didn't produce any.
        // Note: [] is truthy, so we must check .length explicitly.
        const hasNewMarkers = Array.isArray(labData.extractedData) && labData.extractedData.length > 0;
        const newExtractedData = hasNewMarkers ? labData.extractedData : (existingData.extractedData || []);
        const hasAnyMarkers = hasNewMarkers || (Array.isArray(existingData.extractedData) && existingData.extractedData.length > 0);
        const outcome = classifyAnalysisOutcome(hasAnyMarkers ? 1 : 0, labData.rawText);

        // If user already verified the collection date, never overwrite it.
        const dateIsLocked = Boolean(existingData.testDateVerifiedAt);
        await filesRepository.updateFileUpload(fileId, {
            labReportData: {
                testDate: dateIsLocked ? existingData.testDate : (labData.testDate || existingData.testDate),
                testDateSource: dateIsLocked ? existingData.testDateSource : (labData.testDateSource || existingData.testDateSource),
                testDateConfidence: dateIsLocked ? existingData.testDateConfidence : (labData.testDateConfidence || existingData.testDateConfidence),
                testDateVerifiedAt: existingData.testDateVerifiedAt,
                testDateVerifiedBy: existingData.testDateVerifiedBy,
                priorTestDate: existingData.priorTestDate,
                testType: labData.testType || existingData.testType,
                labName: labData.labName || existingData.labName,
                physicianName: labData.physicianName || existingData.physicianName,
                overallAssessment: labData.overallAssessment || existingData.overallAssessment,
                riskPatterns: labData.riskPatterns || existingData.riskPatterns,
                analysisStatus: outcome.analysisStatus,
                documentKind: outcome.documentKind,
                progressDetail: outcome.progressDetail,
                extractedData: newExtractedData,
            }
        });

        await filesRepository.upsertLabAnalysisForFile({
            fileId,
            userId,
            analysisStatus: outcome.analysisStatus,
            extractedData: newExtractedData,
        });

        // Fire-and-forget: generate marker insights in background
        void labsService.generateAllMarkerInsights(newExtractedData).then(async (markerInsights) => {
            const currentData = (await filesRepository.getFileUpload(fileId))?.labReportData as any;
            if (currentData) {
                await filesRepository.updateFileUpload(fileId, {
                    labReportData: { ...currentData, markerInsights }
                });
            }
        }).catch(err => logger.warn(`Background insight generation failed:`, err));

        return labData;
    }

    /**
     * Let the user confirm or correct the collection date for a lab report.
     *
     * Validates the supplied date (ISO YYYY-MM-DD, no future dates, not
     * before 1970), stamps `testDateVerifiedAt` / `testDateVerifiedBy` so
     * future re-analyses don't overwrite it, and preserves the prior AI
     * guess under `priorTestDate` so we can offer an undo.
     */
    async verifyLabReportDate(
        fileId: string,
        userId: string,
        newDate: string
    ): Promise<{ testDate: string; testDateVerifiedAt: string }> {
        const fileUpload = await filesRepository.getFileUpload(fileId);
        if (!fileUpload) throw new Error('File not found');
        if (fileUpload.userId !== userId) throw new Error('Unauthorized');
        if (fileUpload.type !== 'lab_report') throw new Error('Only lab reports have a collection date');

        if (typeof newDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
            throw new Error('Invalid date format — expected YYYY-MM-DD');
        }
        const parsed = new Date(newDate);
        const ms = parsed.getTime();
        if (Number.isNaN(ms)) throw new Error('Invalid date');
        if (ms > Date.now() + 24 * 60 * 60 * 1000) {
            throw new Error('Collection date cannot be in the future');
        }
        if (ms < new Date('1970-01-01').getTime()) {
            throw new Error('Collection date is too far in the past');
        }

        const existing = (fileUpload.labReportData as any) || {};
        const verifiedAt = new Date().toISOString();

        await filesRepository.updateFileUpload(fileId, {
            labReportData: {
                ...existing,
                testDate: newDate,
                testDateSource: 'user-verified',
                testDateConfidence: 'high',
                testDateVerifiedAt: verifiedAt,
                testDateVerifiedBy: userId,
                priorTestDate: existing.priorTestDate || existing.testDate || undefined,
            }
        });

        logger.info('Lab report collection date verified by user', {
            fileId,
            userId,
            newDate,
            priorDate: existing.testDate,
        });

        return { testDate: newDate, testDateVerifiedAt: verifiedAt };
    }

    async startReanalyzeFile(fileId: string, userId: string) {
        const fileUpload = await filesRepository.getFileUpload(fileId);

        if (!fileUpload) throw new Error('File not found');
        if (fileUpload.userId !== userId) throw new Error('Unauthorized');
        if (fileUpload.type !== 'lab_report') throw new Error('Only lab reports can be re-analyzed');

        const existingStatus = String((fileUpload.labReportData as any)?.analysisStatus || '').toLowerCase();
        if (existingStatus === 'processing' || existingStatus === 'pending') {
            return { queued: false, status: 'processing' as const };
        }

        await filesRepository.updateFileUpload(fileId, {
            labReportData: {
                ...((fileUpload.labReportData as any) || {}),
                analysisStatus: 'processing'
            },
            analysisStartedAt: new Date(),
            analysisCompletedAt: null,
        } as any);

        const existingData = (fileUpload.labReportData as any) || {};

        void (async () => {
            try {
                const labData = await analyzeLabReport(
                    fileUpload.objectPath,
                    fileUpload.mimeType || 'text/plain',
                    userId
                );

                // Use explicit field picking to avoid losing data when AI
                // structuring fails and returns only { rawText }.
                // Preserve existing extractedData if the new analysis didn't produce any.
                // Note: [] is truthy, so we must check .length explicitly.
                const hasNewMarkers = Array.isArray(labData.extractedData) && labData.extractedData.length > 0;
                const newExtractedData = hasNewMarkers ? labData.extractedData : (existingData.extractedData || []);
                const hasAnyMarkers = hasNewMarkers || (Array.isArray(existingData.extractedData) && existingData.extractedData.length > 0);
                const outcome = classifyAnalysisOutcome(hasAnyMarkers ? 1 : 0, labData.rawText);

                const dateIsLocked = Boolean(existingData.testDateVerifiedAt);
                await filesRepository.updateFileUpload(fileId, {
                    labReportData: {
                        testDate: dateIsLocked ? existingData.testDate : (labData.testDate || existingData.testDate),
                        testDateSource: dateIsLocked ? existingData.testDateSource : (labData.testDateSource || existingData.testDateSource),
                        testDateConfidence: dateIsLocked ? existingData.testDateConfidence : (labData.testDateConfidence || existingData.testDateConfidence),
                        testDateVerifiedAt: existingData.testDateVerifiedAt,
                        testDateVerifiedBy: existingData.testDateVerifiedBy,
                        priorTestDate: existingData.priorTestDate,
                        testType: labData.testType || existingData.testType,
                        labName: labData.labName || existingData.labName,
                        physicianName: labData.physicianName || existingData.physicianName,
                        overallAssessment: labData.overallAssessment || existingData.overallAssessment,
                        riskPatterns: labData.riskPatterns || existingData.riskPatterns,
                        analysisStatus: outcome.analysisStatus,
                        documentKind: outcome.documentKind,
                        progressDetail: outcome.progressDetail,
                        extractedData: newExtractedData,
                    },
                    analysisCompletedAt: new Date(),
                } as any);

                await filesRepository.upsertLabAnalysisForFile({
                    fileId,
                    userId,
                    analysisStatus: outcome.analysisStatus,
                    extractedData: newExtractedData,
                });

                // Fire-and-forget: generate marker insights in background
                void labsService.generateAllMarkerInsights(newExtractedData).then(async (markerInsights) => {
                    const currentData = (await filesRepository.getFileUpload(fileId))?.labReportData as any;
                    if (currentData) {
                        await filesRepository.updateFileUpload(fileId, {
                            labReportData: { ...currentData, markerInsights }
                        });
                    }
                }).catch(err => logger.warn(`Background insight generation failed:`, err));

                // Send lab re-analysis notification
                try {
                    const markerCount = newExtractedData?.length || 0;
                    await notificationsService.create({
                        userId,
                        type: 'system',
                        title: 'Lab Re-Analysis Complete',
                        content: `Your lab report has been re-analyzed — ${markerCount} biomarker${markerCount !== 1 ? 's' : ''} extracted.`,
                        metadata: {
                            actionUrl: '/dashboard/lab-reports',
                            icon: 'file-check',
                            priority: 'medium'
                        }
                    });
                } catch (notifErr) {
                    logger.warn('Failed to send re-analysis notification', { userId, error: notifErr });
                }
            } catch (error) {
                logger.error('Background re-analysis error:', error);
                await filesRepository.updateFileUpload(fileId, {
                    labReportData: {
                        ...existingData,
                        analysisStatus: 'error'
                    },
                    analysisCompletedAt: new Date(),
                } as any);
                await filesRepository.upsertLabAnalysisForFile({
                    fileId,
                    userId,
                    analysisStatus: 'error',
                    errorMessage: error instanceof Error ? error.message : String(error),
                });
            }
        })();

        return { queued: true, status: 'processing' as const };
    }

    async deleteFile(fileId: string, userId: string, auditInfo?: { ipAddress?: string; userAgent?: string }) {
        const fileUpload = await filesRepository.getFileUpload(fileId);
        if (!fileUpload) throw new Error('File not found');
        if (fileUpload.userId !== userId) {
            this.logFileAudit(userId, fileId, 'access_denied', fileUpload.objectPath, false, 'Access denied on delete', auditInfo);
            throw new Error('Access denied');
        }

        const deletedFromStorage = await this.objectStorageService.secureDeleteLabReport(fileUpload.objectPath, userId);
        const deleted = await filesRepository.softDeleteFileUpload(fileId, userId);

        if (!deleted || !deletedFromStorage) {
            this.logFileAudit(userId, fileId, 'delete', fileUpload.objectPath, false, 'Failed to delete file', auditInfo);
            throw new Error('Failed to delete file');
        }

        // Log successful deletion
        this.logFileAudit(userId, fileId, 'delete', fileUpload.objectPath, true, undefined, auditInfo, {
            originalFileName: fileUpload.originalFileName,
        });
        return true;
    }

    async bulkDeleteFiles(fileIds: string[], userId: string, auditInfo?: { ipAddress?: string; userAgent?: string }) {
        const results: { id: string; success: boolean; error?: string }[] = [];
        for (const fileId of fileIds) {
            try {
                await this.deleteFile(fileId, userId, auditInfo);
                results.push({ id: fileId, success: true });
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                results.push({ id: fileId, success: false, error: message });
            }
        }
        return results;
    }

    /**
     * Non-fatal audit log helper — writes to audit_logs table for HIPAA compliance.
     * Never throws; failures are logged but won't break file operations.
     */
    private logFileAudit(
        userId: string,
        fileId: string,
        action: 'upload' | 'view' | 'download' | 'delete' | 'share' | 'access_denied',
        objectPath: string,
        success: boolean,
        errorMessage?: string,
        auditInfo?: { ipAddress?: string; userAgent?: string },
        metadata?: Record<string, any>,
    ): void {
        systemRepository.createAuditLog({
            userId,
            action,
            fileId,
            objectPath,
            success,
            errorMessage: errorMessage || null,
            ipAddress: auditInfo?.ipAddress || null,
            userAgent: auditInfo?.userAgent || null,
            metadata: metadata || null,
        }).catch((err) => {
            logger.error('Failed to write file audit log', { err, action, fileId, userId });
        });
    }

    private validateMagicBytes(uploadedFile: any, fileBuffer: Buffer): void {
        // The PDF specification allows up to 1024 bytes of garbage before the %PDF- signature
        const hex = fileBuffer.toString('hex', 0, 1024).toUpperCase();
        let isValidMagic = false;

        if (uploadedFile.mimetype === 'application/pdf') {
            if (hex.includes('25504446')) isValidMagic = true;
        } else if (uploadedFile.mimetype.startsWith('image/jp')) {
            // JPEG SOI is FF D8. Next byte is usually FF (marker start).
            if (hex.startsWith('FFD8FF')) isValidMagic = true;
            // Also allow FFD8DB (DQT) and FFD8EE (COM) which are valid starts for some JPEGs
            else if (hex.startsWith('FFD8DB') || hex.startsWith('FFD8EE')) isValidMagic = true;
        } else if (uploadedFile.mimetype === 'image/png') {
            if (hex.startsWith('89504E470D0A1A0A')) isValidMagic = true;
        } else if (uploadedFile.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            // DOCX is a ZIP container
            if (hex.startsWith('504B0304')) isValidMagic = true;
        } else if (uploadedFile.mimetype === 'application/msword') {
            // Legacy DOC format
            if (hex.startsWith('D0CF11E0A1B11AE1')) isValidMagic = true;
        } else if (uploadedFile.mimetype === 'text/plain') {
            // Plain text has no magic bytes we can reliably check without false negatives
            isValidMagic = true;
        } else {
            // If it's another type that passed the mime check but we don't have magic bytes for it,
            // we'll allow it for now but log a warning.
            logger.warn(`No magic byte check for mimetype: ${uploadedFile.mimetype}`);
            isValidMagic = true;
        }

        if (!isValidMagic) {
            throw new Error('File content does not match its extension (possible spoofing).');
        }
    }
}

export const filesService = new FilesService();
