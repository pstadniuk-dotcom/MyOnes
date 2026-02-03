
import { eq, and, desc, count } from "drizzle-orm";
import { notifications, notificationPrefs, type Notification, type InsertNotification, type NotificationPref, type InsertNotificationPref } from "@shared/schema";
import { BaseRepository } from "../../infrastructure/database/base.repository";
import { logger } from "../../infrastructure/logging/logger";

type NotificationMetadataShape = {
    actionUrl?: string;
    icon?: string;
    priority?: 'low' | 'medium' | 'high';
    additionalData?: Record<string, any>;
};

export class NotificationRepository extends BaseRepository<typeof notifications, Notification, InsertNotification> {
    constructor(db: any) {
        super(db, notifications, "NotificationRepository");
    }

    private normalizeNotificationMetadata(metadata?: unknown): NotificationMetadataShape | undefined {
        if (!metadata || typeof metadata !== 'object') {
            return undefined;
        }

        const payload = metadata as Record<string, any>;
        const normalized: NotificationMetadataShape = {};

        if (typeof payload.actionUrl === 'string') normalized.actionUrl = payload.actionUrl;
        if (typeof payload.icon === 'string') normalized.icon = payload.icon;
        if (typeof payload.priority === 'string' && ['low', 'medium', 'high'].includes(payload.priority)) {
            normalized.priority = payload.priority as NotificationMetadataShape['priority'];
        }
        if (payload.additionalData && typeof payload.additionalData === 'object') {
            normalized.additionalData = payload.additionalData as Record<string, any>;
        }

        return Object.keys(normalized).length > 0 ? normalized : undefined;
    }

    async getNotification(id: string): Promise<Notification | undefined> {
        try {
            const [notification] = await this.db.select().from(notifications).where(eq(notifications.id, id));
            return notification || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting notification:`, error);
            return undefined;
        }
    }

    async createNotification(insertNotification: InsertNotification): Promise<Notification> {
        try {
            const normalizedNotification = {
                ...insertNotification,
                metadata: insertNotification.metadata !== undefined
                    ? this.normalizeNotificationMetadata(insertNotification.metadata)
                    : undefined
            } as any;

            const [notification] = await this.db.insert(notifications).values(normalizedNotification).returning();
            return notification;
        } catch (error) {
            logger.error(`[${this.domainName}] Error creating notification:`, error);
            throw error;
        }
    }

    async listNotificationsByUser(userId: string, limit?: number): Promise<Notification[]> {
        try {
            const query = this.db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
            if (limit) {
                return await query.limit(limit);
            }
            return await query;
        } catch (error) {
            logger.error(`[${this.domainName}] Error listing notifications:`, error);
            return [];
        }
    }

    async getUnreadNotificationCount(userId: string): Promise<number> {
        try {
            const [result] = await this.db
                .select({ value: count() })
                .from(notifications)
                .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
            return Number(result?.value || 0);
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting unread count:`, error);
            return 0;
        }
    }

    async markNotificationAsRead(id: string, userId: string): Promise<Notification | undefined> {
        try {
            const [notification] = await this.db
                .update(notifications)
                .set({ isRead: true })
                .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
                .returning();
            return notification || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error marking as read:`, error);
            return undefined;
        }
    }

    async markAllNotificationsAsRead(userId: string): Promise<boolean> {
        try {
            await this.db
                .update(notifications)
                .set({ isRead: true })
                .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
            return true;
        } catch (error) {
            logger.error(`[${this.domainName}] Error marking all as read:`, error);
            return false;
        }
    }

    async deleteNotification(id: string, userId: string): Promise<boolean> {
        try {
            const result = await this.db
                .delete(notifications)
                .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
            return (result.rowCount ?? 0) > 0;
        } catch (error) {
            logger.error(`[${this.domainName}] Error deleting notification:`, error);
            return false;
        }
    }

    // Notification Preferences
    async getNotificationPrefs(userId: string): Promise<NotificationPref | undefined> {
        try {
            const [prefs] = await this.db.select().from(notificationPrefs).where(eq(notificationPrefs.userId, userId));
            return prefs || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting prefs:`, error);
            return undefined;
        }
    }

    async createNotificationPrefs(insertPrefs: InsertNotificationPref): Promise<NotificationPref> {
        try {
            const [prefs] = await this.db.insert(notificationPrefs).values(insertPrefs).returning();
            return prefs;
        } catch (error) {
            logger.error(`[${this.domainName}] Error creating prefs:`, error);
            throw error;
        }
    }

    async updateNotificationPrefs(userId: string, updates: Partial<InsertNotificationPref>): Promise<NotificationPref | undefined> {
        try {
            const [prefs] = await this.db
                .update(notificationPrefs)
                .set(updates)
                .where(eq(notificationPrefs.userId, userId))
                .returning();
            return prefs || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error updating prefs:`, error);
            return undefined;
        }
    }
}
