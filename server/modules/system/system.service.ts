import YouTube from "youtube-sr";
import logger from '../../infra/logging/logger';
import { systemRepository } from './system.repository';
import { storage } from '../../storage';
import { getUserLocalMidnight } from '../../utils/timezone';
import { type InsertAuditLog } from '@shared/schema';

export class SystemService {
    async searchYouTube(query: string) {
        // Search for multiple videos and randomly select one for variety
        const searchFn = (YouTube as any).search || (YouTube as any).default?.search;

        if (typeof searchFn !== 'function') {
            throw new Error('YouTube.search is not a function');
        }

        const videos = await searchFn(query, { limit: 10 });

        if (videos && videos.length > 0) {
            const randomIndex = Math.floor(Math.random() * videos.length);
            const video = videos[randomIndex];
            return {
                videoId: video.id,
                title: video.title,
                thumbnail: video.thumbnail?.url,
                duration: video.durationFormatted,
                channel: video.channel?.name
            };
        }
        return null;
    }

    async healthCheck() {
        // Basic connectivity check to DB
        await storage.getUserByEmail('health-check@example.com');
        return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || '1.0.0'
        };
    }

    async getDebugInfo() {
        return {
            env: process.env.NODE_ENV,
            railway: process.env.RAILWAY_ENVIRONMENT || 'none',
            nodeVersion: process.version,
            memoryUsage: process.memoryUsage(),
            uptime: process.uptime()
        };
    }

    async getDebugUserInfo(userId: string) {
        const user = await storage.getUser(userId);
        return {
            serverTime: new Date().toISOString(),
            userFound: !!user,
            userId: user?.id,
            email: user?.email ? user.email.substring(0, 10) + '...' : null,
            timezone: user?.timezone,
            timezoneType: typeof user?.timezone,
            calculatedDate: getUserLocalMidnight(user?.timezone || 'America/New_York').toISOString(),
        };
    }

    // Audit Log logic
    async logActivity(data: InsertAuditLog) {
        return await systemRepository.createAuditLog(data);
    }

    async getAuditLogsForUser(userId: string, limit?: number) {
        return await systemRepository.getAuditLogsByUser(userId, limit);
    }

    // App settings logic
    async getSetting(key: string) {
        return await systemRepository.getAppSetting(key);
    }

    async updateSetting(key: string, value: Record<string, any>, updatedBy?: string) {
        return await systemRepository.upsertAppSetting(key, value, updatedBy);
    }
}

export const systemService = new SystemService();
