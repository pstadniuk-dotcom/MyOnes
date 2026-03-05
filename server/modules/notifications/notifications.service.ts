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
        let prefs = await notificationsRepository.getNotificationPrefs(userId);
        if (!prefs) {
            prefs = await notificationsRepository.createNotificationPrefs({
                userId,
                emailConsultation: true,
                emailShipping: true,
                emailBilling: true,
                smsConsultation: false,
                smsShipping: false,
                smsBilling: false,
            });
        }
        return prefs;
    }

    async updatePreferences(userId: string, {
        emailConsultation,
        emailShipping,
        emailBilling,
        smsConsultation,
        smsShipping,
        smsBilling,
        dailyRemindersEnabled,
        reminderBreakfast,
        reminderLunch,
        reminderDinner,
        // Time slot preferences
        reminderMorning,
        reminderAfternoon,
        reminderEvening,
        pillsTimeSlot,
        workoutTimeSlot,
        nutritionTimeSlot,
        lifestyleTimeSlot,
        pillsCustomTime,
        workoutCustomTime,
        nutritionCustomTime,
        lifestyleCustomTime,
    }: any): Promise<NotificationPref | undefined> {
        // return await notificationsRepository.updateNotificationPrefs(userId, updates);

        let prefs = await notificationsRepository.getNotificationPrefs(userId);

        if (!prefs) {
            // Create if doesn't exist
            prefs = await notificationsRepository.createNotificationPrefs({
                userId,
                emailConsultation,
                emailShipping,
                emailBilling,
                smsConsultation,
                smsShipping,
                smsBilling,
                dailyRemindersEnabled: dailyRemindersEnabled ?? false,
                reminderBreakfast: reminderMorning ?? reminderBreakfast ?? '08:00',
                reminderLunch: reminderAfternoon ?? reminderLunch ?? '12:00',
                reminderDinner: reminderEvening ?? reminderDinner ?? '18:00',
                pillsTimeSlot: pillsTimeSlot ?? 'all',
                workoutTimeSlot: workoutTimeSlot ?? 'morning',
                nutritionTimeSlot: nutritionTimeSlot ?? 'morning',
                lifestyleTimeSlot: lifestyleTimeSlot ?? 'evening',
                pillsCustomTime: pillsCustomTime ?? null,
                workoutCustomTime: workoutCustomTime ?? null,
                nutritionCustomTime: nutritionCustomTime ?? null,
                lifestyleCustomTime: lifestyleCustomTime ?? null,
            });
        } else {
            // Update existing
            prefs = await notificationsRepository.updateNotificationPrefs(userId, {
                emailConsultation,
                emailShipping,
                emailBilling,
                smsConsultation,
                smsShipping,
                smsBilling,
                dailyRemindersEnabled: dailyRemindersEnabled ?? prefs.dailyRemindersEnabled,
                reminderBreakfast: reminderMorning ?? reminderBreakfast ?? prefs.reminderBreakfast,
                reminderLunch: reminderAfternoon ?? reminderLunch ?? prefs.reminderLunch,
                reminderDinner: reminderEvening ?? reminderDinner ?? prefs.reminderDinner,
                pillsTimeSlot: pillsTimeSlot ?? (prefs as any).pillsTimeSlot ?? 'all',
                workoutTimeSlot: workoutTimeSlot ?? (prefs as any).workoutTimeSlot ?? 'morning',
                nutritionTimeSlot: nutritionTimeSlot ?? (prefs as any).nutritionTimeSlot ?? 'morning',
                lifestyleTimeSlot: lifestyleTimeSlot ?? (prefs as any).lifestyleTimeSlot ?? 'evening',
                pillsCustomTime: pillsCustomTime !== undefined ? pillsCustomTime : (prefs as any).pillsCustomTime,
                workoutCustomTime: workoutCustomTime !== undefined ? workoutCustomTime : (prefs as any).workoutCustomTime,
                nutritionCustomTime: nutritionCustomTime !== undefined ? nutritionCustomTime : (prefs as any).nutritionCustomTime,
                lifestyleCustomTime: lifestyleCustomTime !== undefined ? lifestyleCustomTime : (prefs as any).lifestyleCustomTime,
            });
        }

        return prefs || undefined;
    }

    async create(notification: InsertNotification): Promise<Notification> {
        return await notificationsRepository.createNotification(notification);
    }

    /**
     * Check if user has opted in to email for a given category.
     * Categories: 'consultation' | 'shipping' | 'billing' | 'system'
     * System/transactional emails (welcome, verification, password reset) always send.
     */
    async shouldSendEmail(userId: string, category: 'consultation' | 'shipping' | 'billing' | 'system'): Promise<boolean> {
        if (category === 'system') return true; // transactional emails always send
        try {
            const prefs = await this.getPreferences(userId);
            if (!prefs) return true; // default to sending if no prefs found
            switch (category) {
                case 'consultation': return prefs.emailConsultation !== false;
                case 'shipping': return prefs.emailShipping !== false;
                case 'billing': return prefs.emailBilling !== false;
                default: return true;
            }
        } catch (err) {
            logger.warn('Failed to check email preferences, defaulting to send', { userId, category, error: err });
            return true;
        }
    }

    /**
     * Check if user has opted in to SMS for a given category.
     */
    async shouldSendSms(userId: string, category: 'consultation' | 'shipping' | 'billing'): Promise<boolean> {
        try {
            const prefs = await this.getPreferences(userId);
            if (!prefs) return false; // default to NOT sending SMS if no prefs
            switch (category) {
                case 'consultation': return prefs.smsConsultation === true;
                case 'shipping': return prefs.smsShipping === true;
                case 'billing': return prefs.smsBilling === true;
                default: return false;
            }
        } catch (err) {
            logger.warn('Failed to check SMS preferences, defaulting to no-send', { userId, category, error: err });
            return false;
        }
    }
}

export const notificationsService = new NotificationsService();
