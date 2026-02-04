import { db } from '../../infra/db/db';
import { notifications, notificationPrefs, type Notification, type InsertNotification, type NotificationPref, type InsertNotificationPref } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';

// Helper to handle metadata normalization if needed
const normalizeNotificationMetadata = (metadata: any) => {
    if (!metadata) return null;
    return typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
};

export class NotificationsRepository {
    // Notification Preferences operations
    async getNotificationPrefs(userId: string): Promise<NotificationPref | undefined> {
        const [prefs] = await db.select().from(notificationPrefs).where(eq(notificationPrefs.userId, userId));
        return prefs || undefined;
    }

    async createNotificationPrefs(insertPrefs: InsertNotificationPref): Promise<NotificationPref> {
        const [prefs] = await db.insert(notificationPrefs).values(insertPrefs).returning();
        return prefs;
    }

    async updateNotificationPrefs(userId: string, updates: Partial<InsertNotificationPref>): Promise<NotificationPref | undefined> {
        const [prefs] = await db
            .update(notificationPrefs)
            .set(updates)
            .where(eq(notificationPrefs.userId, userId))
            .returning();
        return prefs || undefined;
    }

    // Notification operations
    async getNotification(id: string): Promise<Notification | undefined> {
        const [notification] = await db.select().from(notifications).where(eq(notifications.id, id));
        return notification || undefined;
    }

    async createNotification(insertNotification: InsertNotification): Promise<Notification> {
        const normalizedNotification = {
            ...insertNotification,
            ...(insertNotification.metadata !== undefined && {
                metadata: normalizeNotificationMetadata(insertNotification.metadata)
            })
        };
        const [notification] = await db.insert(notifications).values(normalizedNotification as any).returning();
        return notification;
    }

    async listNotificationsByUser(userId: string, limit?: number): Promise<Notification[]> {
        const query = db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
        if (limit) {
            return await query.limit(limit);
        }
        return await query;
    }

    async getUnreadNotificationCount(userId: string): Promise<number> {
        const result = await db.select().from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
        return result.length;
    }

    async markNotificationAsRead(id: string, userId: string): Promise<Notification | undefined> {
        const [notification] = await db
            .update(notifications)
            .set({ isRead: true })
            .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
            .returning();
        return notification || undefined;
    }

    async markAllNotificationsAsRead(userId: string): Promise<boolean> {
        await db
            .update(notifications)
            .set({ isRead: true })
            .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
        return true;
    }

    async deleteNotification(id: string, userId: string): Promise<boolean> {
        await db
            .delete(notifications)
            .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
        return true;
    }
}

export const notificationsRepository = new NotificationsRepository();
