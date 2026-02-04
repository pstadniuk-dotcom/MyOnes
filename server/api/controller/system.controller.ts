import { Request, Response } from 'express';
import { systemService } from '../../modules/system/system.service';
import logger from '../../infra/logging/logger';

export class SystemController {
    async searchYouTube(req: Request, res: Response) {
        const query = req.query.q as string;
        if (!query) {
            return res.status(400).json({ error: 'Query parameter "q" is required' });
        }

        try {
            const video = await systemService.searchYouTube(query);
            if (video) {
                res.json(video);
            } else {
                res.status(404).json({ error: 'No videos found' });
            }
        } catch (error) {
            logger.error('YouTube search error:', error);
            res.status(500).json({ error: 'Failed to search YouTube' });
        }
    }

    async healthCheck(req: Request, res: Response) {
        try {
            const status = await systemService.healthCheck();
            res.json(status);
        } catch (error) {
            logger.error('Health check failed:', error);
            res.status(503).json({ status: 'unhealthy', error: 'Database connection failed' });
        }
    }

    async getDebugInfo(req: Request, res: Response) {
        try {
            const info = await systemService.getDebugInfo();
            res.json(info);
        } catch (error) {
            logger.error('Debug info error:', error);
            res.status(500).json({ error: 'Failed to get debug info' });
        }
    }

    async getDebugUserInfo(req: Request, res: Response) {
        try {
            const { userId } = req.params;
            const info = await systemService.getDebugUserInfo(userId);
            res.json(info);
        } catch (error) {
            logger.error('Debug user info error:', error);
            res.status(500).json({ error: 'Failed to get debug user info' });
        }
    }

    async getAuditLogs(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
            const logs = await systemService.getAuditLogsForUser(userId, limit);
            res.json(logs);
        } catch (error) {
            logger.error('Error fetching audit logs:', error);
            res.status(500).json({ error: 'Failed to fetch audit logs' });
        }
    }

    async getAppSetting(req: Request, res: Response) {
        try {
            const { key } = req.params;
            const setting = await systemService.getSetting(key);
            if (!setting) {
                return res.status(404).json({ error: 'Setting not found' });
            }
            res.json(setting);
        } catch (error) {
            logger.error('Error fetching app setting:', error);
            res.status(500).json({ error: 'Failed to fetch app setting' });
        }
    }
}

export const systemController = new SystemController();
