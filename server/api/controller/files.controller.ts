import { Request, Response } from 'express';
import { filesService } from '../../modules/files/files.service';
import logger from '../../infra/logging/logger';

export class FilesController {
    async previewFile(req: Request, res: Response) {
        try {
            const auditInfo = {
                ipAddress: req.ip || req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
                userAgent: req.headers['user-agent']
            };
            const result = await filesService.downloadFile(req.params.fileId, req.userId!, auditInfo);
            res.setHeader('Content-Type', result.mimeType);
            res.setHeader('Content-Disposition', `inline; filename="${result.originalFileName}"`);
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.send(result.buffer);
        } catch (error) {
            logger.error('File preview error:', error);
            const message = error instanceof Error ? error.message : 'Failed to preview file';
            if (message === 'File not found') {
                res.status(404).json({ error: message });
            } else if (message === 'Access denied') {
                res.status(403).json({ error: message });
            } else {
                res.status(500).json({ error: message });
            }
        }
    }

    async downloadFile(req: Request, res: Response) {
        try {
            const auditInfo = {
                ipAddress: req.ip || req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
                userAgent: req.headers['user-agent']
            };
            const result = await filesService.downloadFile(req.params.fileId, req.userId!, auditInfo);
            res.setHeader('Content-Type', result.mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${result.originalFileName}"`);
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.send(result.buffer);
        } catch (error) {
            logger.error('File download error:', error);
            const message = error instanceof Error ? error.message : 'Failed to download file';
            if (message === 'File not found') {
                res.status(404).json({ error: message });
            } else if (message === 'Access denied') {
                res.status(403).json({ error: message });
            } else {
                res.status(500).json({ error: message });
            }
        }
    }

    async getUserFiles(req: Request, res: Response) {
        try {
            const { userId, type } = req.params;
            if (userId !== req.userId!) {
                return res.status(403).json({ error: 'Unauthorized' });
            }
            const files = await filesService.getUserFiles(userId, type);
            res.json(files);
        } catch (error) {
            logger.error('Error fetching files:', error);
            res.status(500).json({ error: 'Failed to fetch files' });
        }
    }

    async uploadFile(req: Request, res: Response) {
        const userId = req.userId!;
        const auditInfo = {
            ipAddress: req.ip || req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
            userAgent: req.headers['user-agent']
        };

        try {
            if (!req.files || !req.files.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            const uploadedFile = Array.isArray(req.files.file) ? req.files.file[0] : req.files.file;
            const result = await filesService.uploadFile(userId, uploadedFile, auditInfo);
            res.json(result);

        } catch (error) {
            logger.error('File upload error:', error);
            const message = error instanceof Error ? error.message : 'Failed to upload file';
            if (message.includes('Missing required consents')) {
                res.status(403).json({ error: message });
            } else if (message.includes('File too large') || message.includes('Invalid file')) {
                res.status(400).json({ error: message });
            } else {
                res.status(500).json({ error: 'Failed to upload file', details: message });
            }
        }
    }

    async updateFile(req: Request, res: Response) {
        const userId = req.userId!;
        const fileId = req.params.fileId;
        const auditInfo = {
            ipAddress: req.ip || req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
            userAgent: req.headers['user-agent']
        };

        try {
            if (!req.files || !req.files.file) {
                return res.status(400).json({ error: 'No file provided for update' });
            }

            const uploadedFile = Array.isArray(req.files.file) ? req.files.file[0] : req.files.file;
            const result = await filesService.updateFile(fileId, userId, uploadedFile, auditInfo);
            res.json(result);

        } catch (error) {
            logger.error('File update error:', error);
            const message = error instanceof Error ? error.message : 'Failed to update file';
            if (message === 'File not found') {
                res.status(404).json({ error: message });
            } else if (message === 'Access denied') {
                res.status(403).json({ error: message });
            } else if (message.includes('File too large')) {
                res.status(400).json({ error: message });
            } else {
                res.status(500).json({ error: 'Failed to update file', details: message });
            }
        }
    }

    async reanalyzeFile(req: Request, res: Response) {
        try {
            const result = await filesService.startReanalyzeFile(req.params.fileId, req.userId!);
            res.status(202).json({
                success: true,
                queued: result.queued,
                status: result.status,
                message: result.queued
                    ? 'Lab report re-analysis started in background'
                    : 'Lab report re-analysis is already in progress'
            });
        } catch (error) {
            logger.error('Re-analysis error:', error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            if (message === 'File not found') {
                res.status(404).json({ error: message });
            } else if (message === 'Unauthorized') {
                res.status(403).json({ error: message });
            } else if (message.includes('Only lab reports')) {
                res.status(400).json({ error: message });
            } else {
                res.status(500).json({ error: 'Failed to re-analyze lab report', details: message });
            }
        }
    }

    async deleteFile(req: Request, res: Response) {
        try {
            const auditInfo = {
                ipAddress: req.ip || req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
                userAgent: req.headers['user-agent']
            };
            await filesService.deleteFile(req.params.fileId, req.userId!, auditInfo);
            res.json({ success: true, message: 'File deleted successfully' });
        } catch (error) {
            logger.error('File delete error:', error);
            const message = error instanceof Error ? error.message : 'Failed to delete file';
            if (message === 'File not found') {
                res.status(404).json({ error: message });
            } else if (message === 'Access denied') {
                res.status(403).json({ error: message });
            } else {
                res.status(500).json({ error: message });
            }
        }
    }

    async bulkDeleteFiles(req: Request, res: Response) {
        try {
            const { fileIds } = req.body;
            if (!Array.isArray(fileIds) || fileIds.length === 0) {
                return res.status(400).json({ error: 'fileIds must be a non-empty array' });
            }
            if (fileIds.length > 50) {
                return res.status(400).json({ error: 'Cannot delete more than 50 files at once' });
            }
            const auditInfo = {
                ipAddress: req.ip || req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
                userAgent: req.headers['user-agent']
            };
            const results = await filesService.bulkDeleteFiles(fileIds, req.userId!, auditInfo);
            const deleted = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;
            res.json({ success: true, deleted, failed, results });
        } catch (error) {
            logger.error('Bulk delete error:', error);
            res.status(500).json({ error: 'Failed to delete files' });
        }
    }

    async verifyLabReportDate(req: Request, res: Response) {
        try {
            const { testDate } = req.body || {};
            if (typeof testDate !== 'string' || !testDate) {
                return res.status(400).json({ error: 'testDate is required (YYYY-MM-DD)' });
            }
            const result = await filesService.verifyLabReportDate(
                req.params.fileId,
                req.userId!,
                testDate
            );
            res.json({ success: true, ...result });
        } catch (error) {
            logger.error('Verify date error:', error);
            const message = error instanceof Error ? error.message : 'Failed to verify date';
            if (message === 'File not found') {
                res.status(404).json({ error: message });
            } else if (message === 'Unauthorized') {
                res.status(403).json({ error: message });
            } else if (
                message.startsWith('Invalid') ||
                message.includes('cannot be in the future') ||
                message.includes('too far in the past') ||
                message.includes('Only lab reports')
            ) {
                res.status(400).json({ error: message });
            } else {
                res.status(500).json({ error: message });
            }
        }
    }
}

export const filesController = new FilesController();
