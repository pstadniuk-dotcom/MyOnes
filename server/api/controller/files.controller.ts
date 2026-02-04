import { Request, Response } from 'express';
import { filesService } from '../../modules/files/files.service';
import logger from '../../infra/logging/logger';

export class FilesController {
    async downloadFile(req: Request, res: Response) {
        try {
            const result = await filesService.downloadFile(req.params.fileId, req.userId!);
            res.setHeader('Content-Type', result.mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${result.originalFileName}"`);
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
            if (message.includes('File too large') || message.includes('Invalid file')) {
                res.status(400).json({ error: message });
            } else {
                res.status(500).json({ error: 'Failed to upload file', details: message });
            }
        }
    }

    async reanalyzeFile(req: Request, res: Response) {
        try {
            const result = await filesService.reanalyzeFile(req.params.fileId, req.userId!);
            res.json({
                success: true,
                message: 'Lab report re-analyzed successfully',
                data: result
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
            await filesService.deleteFile(req.params.fileId, req.userId!);
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
}

export const filesController = new FilesController();
