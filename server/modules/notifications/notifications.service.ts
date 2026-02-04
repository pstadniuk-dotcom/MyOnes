import { notificationsRepository } from './notifications.repository';
import { type Notification, type InsertNotification, type NotificationPref, type InsertNotificationPref } from '@shared/schema';
import { logger } from '../../infra/logging/logger';

export class NotificationsService {
    async getUserNotifications(userId: string, limit?: number): Promise<Notification[]> {
        return await notificationsRepository.listNotificationsByUser(userId, limit);
    }

    async getUnreadCount(userId: string): Promise<number> {
        return await notificationsRepository.getUnreadNotificationCount(userId);
    }

    async markAsRead(id: string, userId: string): Promise<Notification | undefined> {
        return await notificationsRepository.markNotificationAsRead(id, userId);
    }

    async markAllAsRead(userId: string): Promise<boolean> {
        return await notificationsRepository.markAllNotificationsAsRead(userId);
    }

    async getPreferences(userId: string): Promise<NotificationPref | undefined> {
        return await notificationsRepository.getNotificationPrefs(userId);
    }

    async updatePreferences(userId: string, updates: Partial<InsertNotificationPref>): Promise<NotificationPref | undefined> {
        return await notificationsRepository.updateNotificationPrefs(userId, updates);
    }

    async create(notification: InsertNotification): Promise<Notification> {
        return await notificationsRepository.createNotification(notification);
    }
}

export const notificationsService = new NotificationsService();
