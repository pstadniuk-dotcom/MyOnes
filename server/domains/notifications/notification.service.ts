
import { NotificationRepository } from "./notification.repository";
import { type Notification, type InsertNotification, type NotificationPref, type InsertNotificationPref, type User } from "@shared/schema";
import { db } from "../../infrastructure/database/db";
import { sendNotificationEmail } from "../../emailService";
import { sendNotificationSms } from "../../smsService";
import { logger } from "../../infrastructure/logging/logger";

export class NotificationService {
    private repository: NotificationRepository;

    constructor() {
        this.repository = new NotificationRepository(db);
    }

    async getNotification(id: string): Promise<Notification | undefined> {
        return this.repository.getNotification(id);
    }

    async createNotification(notification: InsertNotification): Promise<Notification> {
        return this.repository.createNotification(notification);
    }

    async listNotificationsByUser(userId: string, limit?: number): Promise<Notification[]> {
        return this.repository.listNotificationsByUser(userId, limit);
    }

    async getUnreadNotificationCount(userId: string): Promise<number> {
        return this.repository.getUnreadNotificationCount(userId);
    }

    async markNotificationAsRead(id: string, userId: string): Promise<Notification | undefined> {
        return this.repository.markNotificationAsRead(id, userId);
    }

    async markAllNotificationsAsRead(userId: string): Promise<boolean> {
        return this.repository.markAllNotificationsAsRead(userId);
    }

    async deleteNotification(id: string, userId: string): Promise<boolean> {
        return this.repository.deleteNotification(id, userId);
    }

    // Notification Preferences
    async getNotificationPrefs(userId: string): Promise<NotificationPref | undefined> {
        return this.repository.getNotificationPrefs(userId);
    }

    async createNotificationPrefs(prefs: InsertNotificationPref): Promise<NotificationPref> {
        return this.repository.createNotificationPrefs(prefs);
    }

    async updateNotificationPrefs(userId: string, updates: Partial<InsertNotificationPref>): Promise<NotificationPref | undefined> {
        return this.repository.updateNotificationPrefs(userId, updates);
    }

    async sendNotificationsForUser(notification: Notification, user: User): Promise<void> {
        try {
            const prefs = await this.getNotificationPrefs(user.id);

            let shouldSendEmail = false;
            let shouldSendSms = false;

            if (prefs) {
                switch (notification.type) {
                    case 'order_update':
                        shouldSendEmail = prefs.emailShipping;
                        shouldSendSms = prefs.smsShipping;
                        break;
                    case 'formula_update':
                        shouldSendEmail = prefs.emailConsultation;
                        shouldSendSms = prefs.smsConsultation;
                        break;
                    case 'consultation_reminder':
                        shouldSendEmail = prefs.emailConsultation;
                        shouldSendSms = prefs.smsConsultation;
                        break;
                    case 'system':
                        shouldSendEmail = prefs.emailBilling;
                        shouldSendSms = prefs.smsBilling;
                        break;
                    default:
                        shouldSendEmail = true;
                        shouldSendSms = false;
                }
            } else {
                shouldSendEmail = true;
                shouldSendSms = false;
            }

            let actionUrl = (notification.metadata as any)?.actionUrl;
            if (actionUrl) {
                const baseUrl = process.env.APP_URL || 'https://my-ones.vercel.app';
                if (!actionUrl.startsWith('http')) {
                    actionUrl = `${baseUrl}${actionUrl}`;
                }
            }

            if (shouldSendEmail) {
                await sendNotificationEmail({
                    to: user.email,
                    subject: notification.title,
                    title: notification.title,
                    content: notification.content,
                    actionUrl,
                    actionText: actionUrl ? 'View Details' : undefined,
                    type: notification.type as any
                });
            }

            if (shouldSendSms && user.phone) {
                const smsMessage = actionUrl
                    ? `${notification.content} ${actionUrl}`
                    : notification.content;

                await sendNotificationSms({
                    to: user.phone,
                    message: smsMessage,
                    type: notification.type as any
                });
            }
        } catch (error) {
            logger.error('Error sending notifications:', error);
        }
    }
}

export const notificationService = new NotificationService();
