import { db } from '../../infra/db/db';
import { notifications, notificationPrefs, type Notification, type InsertNotification, type NotificationPref, type InsertNotificationPref } from '@shared/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';

export type NotificationFilter = 'all' | 'unread' | 'formula_update' | 'order_update' | 'system';

export interface NotificationCounts {
    all: number;
    unread: number;
    formula_update: number;
    order_update: number;
    system: number;
}

// Helper to handle metadata normalization if needed
const normalizeNotificationMetadata = (metadata: any) => {
    if (!metadata) return null;
    return typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
};

export class NotificationsRepository {
    private buildFilterCondition(userId: string, filter: NotificationFilter) {
        switch (filter) {
            case 'unread':
                return and(eq(notifications.userId, userId), eq(notifications.isRead, false));
            case 'formula_update':
                return and(eq(notifications.userId, userId), eq(notifications.type, 'formula_update'));
            case 'order_update':
                return and(eq(notifications.userId, userId), eq(notifications.type, 'order_update'));
            case 'system':
                return and(eq(notifications.userId, userId), inArray(notifications.type, ['system', 'consultation_reminder']));
            case 'all':
            default:
                return eq(notifications.userId, userId);
        }
    }

    async getNotificationCountsByUser(userId: string): Promise<NotificationCounts> {
        const [allRows, unreadRows, formulaRows, orderRows, systemRows] = await Promise.all([
            db.select({ id: notifications.id }).from(notifications).where(eq(notifications.userId, userId)),
            db.select({ id: notifications.id }).from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.isRead, false))),
            db.select({ id: notifications.id }).from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.type, 'formula_update'))),
            db.select({ id: notifications.id }).from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.type, 'order_update'))),
            db.select({ id: notifications.id }).from(notifications).where(and(eq(notifications.userId, userId), inArray(notifications.type, ['system', 'consultation_reminder']))),
        ]);

        return {
            all: allRows.length,
            unread: unreadRows.length,
            formula_update: formulaRows.length,
            order_update: orderRows.length,
            system: systemRows.length,
        };
    }

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

    async listNotificationsByUserWithPagination(userId: string, page: number, limit: number, filter: NotificationFilter = 'all'): Promise<{
        notifications: Notification[];
        totalCount: number;
        page: number;
        limit: number;
        totalPages: number;
        counts: NotificationCounts;
    }> {
        const offset = (page - 1) * limit;
        const filterCondition = this.buildFilterCondition(userId, filter);
        
        // Get total count
        const countResult = await db
            .select()
            .from(notifications)
            .where(filterCondition);
        const totalCount = countResult.length;
        const counts = await this.getNotificationCountsByUser(userId);
        
        // Get paginated results
        const notificationsList = await db
            .select()
            .from(notifications)
            .where(filterCondition)
            .orderBy(desc(notifications.createdAt))
            .limit(limit)
            .offset(offset);
        
        const totalPages = Math.ceil(totalCount / limit);
        
        return {
            notifications: notificationsList,
            totalCount,
            page,
            limit,
            totalPages,
            counts,
        };
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
