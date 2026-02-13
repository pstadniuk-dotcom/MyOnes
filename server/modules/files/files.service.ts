import { filesRepository } from './files.repository';
import { ObjectStorageService } from '../../utils/objectStorage';
import { analyzeLabReport } from '../../utils/fileAnalysis';
import logger from '../../infra/logging/logger';
import { type InsertFileUpload } from '@shared/schema';

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

    async downloadFile(fileId: string, userId: string) {
        const fileUpload = await this.getFile(fileId, userId);
        const objectPath = fileUpload.objectPath;
        const buffer = await this.objectStorageService.getLabReportFile(objectPath, userId);

        if (!buffer) {
            throw new Error('Failed to download file from storage');
        }

        return {
            buffer,
            mimeType: fileUpload.mimeType || 'application/octet-stream',
            originalFileName: fileUpload.originalFileName
        };
    }

    async getUserFiles(userId: string, type?: string) {
        const fileType = type === 'lab-reports' ? 'lab_report' : undefined;
        return await filesRepository.listFileUploadsByUser(userId, fileType as any, false);
    }

    async uploadFile(userId: string, uploadedFile: any, auditInfo: any) {
        // Validate file constraints
        const maxSizeBytes = 10 * 1024 * 1024; // 10MB limit
        if (uploadedFile.size > maxSizeBytes) {
            throw new Error(`File too large. Maximum size is 10MB.`);
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

        // Determine category
        // let fileType: 'lab_report' | 'medical_document' | 'prescription' | 'other' = 'other';
        let fileType: 'lab_report' | 'medical_document' | 'prescription' | 'other' = 'lab_report';
        const labKeywords = ['lab', 'blood', 'test', 'cbc', 'panel', 'result', 'report', 'analysis', 'metabolic', 'lipid', 'thyroid', 'vitamin', 'serum', 'urine', 'specimen'];

        // if (labKeywords.some(keyword => fileName.includes(keyword))) {
        //     fileType = 'lab_report';
        // } else if (fileName.includes('prescription') || fileName.includes('rx')) {
        //     fileType = 'prescription';
        // } else if (allowedMimeTypes.slice(0, 4).includes(uploadedFile.mimetype)) {
        //     fileType = 'medical_document';
        // }

        // Upload to storage
        const normalizedPath = await this.objectStorageService.uploadLabReportFile(
            userId,
            uploadedFile.data,
            uploadedFile.name,
            uploadedFile.mimetype
        );

        // Save metadata
        const fileUpload = await filesRepository.createFileUpload({
            userId,
            type: fileType,
            objectPath: normalizedPath,
            originalFileName: uploadedFile.name,
            fileSize: uploadedFile.size,
            mimeType: uploadedFile.mimetype,
            hipaaCompliant: true,
            encryptedAtRest: true,
            retentionPolicyId: '7_years'
        });

        // Trigger Analysis
        let labDataExtraction = null;
        if (fileType === 'lab_report') {
            if (uploadedFile.mimetype === 'application/pdf' || uploadedFile.mimetype.startsWith('image/')) {
                try {
                    logger.info(`✨ Analyzing lab report: ${uploadedFile.name}`);
                    labDataExtraction = await analyzeLabReport(normalizedPath, uploadedFile.mimetype, userId);
                    if (labDataExtraction && fileUpload.id) {
                        await filesRepository.updateFileUpload(fileUpload.id, {
                            labReportData: {
                                testDate: labDataExtraction.testDate,
                                testType: labDataExtraction.testType,
                                labName: labDataExtraction.labName,
                                physicianName: labDataExtraction.physicianName,
                                analysisStatus: 'completed',
                                extractedData: labDataExtraction.extractedData || []
                            }
                        });
                    }
                } catch (error) {
                    logger.error('Lab report analysis failed:', error);
                    if (fileUpload.id) {
                        await filesRepository.updateFileUpload(fileUpload.id, {
                            labReportData: { analysisStatus: 'error' }
                        });
                    }
                }
            } else if (uploadedFile.mimetype === 'text/plain') {
                // Background analysis
                analyzeLabReport(normalizedPath, uploadedFile.mimetype, userId)
                    .then(async (extraction) => {
                        if (extraction && fileUpload.id) {
                            await filesRepository.updateFileUpload(fileUpload.id, {
                                labReportData: {
                                    testDate: extraction.testDate,
                                    testType: extraction.testType,
                                    labName: extraction.labName,
                                    physicianName: extraction.physicianName,
                                    analysisStatus: 'completed',
                                    extractedData: extraction.extractedData || []
                                }
                            });
                        }
                    })
                    .catch(async () => {
                        if (fileUpload.id) {
                            await filesRepository.updateFileUpload(fileUpload.id, {
                                labReportData: { analysisStatus: 'error' }
                            });
                        }
                    });
            }
        }

        return {
            id: fileUpload.id,
            name: uploadedFile.name,
            url: normalizedPath,
            type: fileUpload.type,
            size: uploadedFile.size,
            uploadedAt: fileUpload.uploadedAt,
            hipaaCompliant: true,
            labData: labDataExtraction
        };
    }

    async reanalyzeFile(fileId: string, userId: string) {
        const fileUpload = await filesRepository.getFileUpload(fileId);

        if (!fileUpload) throw new Error('File not found');
        if (fileUpload.userId !== userId) throw new Error('Unauthorized');
        if (fileUpload.type !== 'lab_report') throw new Error('Only lab reports can be re-analyzed');

        const labData = await analyzeLabReport(
            fileUpload.objectPath,
            fileUpload.mimeType || 'text/plain',
            userId
        );

        await filesRepository.updateFileUpload(fileId, {
            labReportData: { ...labData, analysisStatus: 'completed' }
        });

        return labData;
    }

    async deleteFile(fileId: string, userId: string) {
        const fileUpload = await filesRepository.getFileUpload(fileId);
        if (!fileUpload) throw new Error('File not found');
        if (fileUpload.userId !== userId) throw new Error('Access denied');

        const deletedFromStorage = await this.objectStorageService.secureDeleteLabReport(fileUpload.objectPath, userId);
        const deleted = await filesRepository.softDeleteFileUpload(fileId, userId);

        if (!deleted || !deletedFromStorage) {
            throw new Error('Failed to delete file');
        }
        return true;
    }
}

export const filesService = new FilesService();
