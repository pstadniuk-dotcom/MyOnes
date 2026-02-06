import { Request, Response } from 'express';
import { notificationsService } from '../../modules/notifications/notifications.service';
import { logger } from '../../infra/logging/logger';

export class NotificationsController {
    async getNotifications(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const limit = parseInt(req.query.limit as string) || 10;
            const notifications = await notificationsService.getUserNotifications(userId, limit);
            res.json({ notifications });
        } catch (error) {
            logger.error('Error fetching notifications controller', { error });
            res.status(500).json({ error: 'Failed to fetch notifications' });
        }
    }

    async getUnreadCount(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const count = await notificationsService.getUnreadCount(userId);
            res.json({ count });
        } catch (error) {
            logger.error('Error getting unread notification count controller', { error });
            res.status(500).json({ error: 'Failed to get unread notification count' });
        }
    }

    async markRead(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const notificationId = req.params.id;

            const notification = await notificationsService.markAsRead(notificationId, userId);
            if (!notification) {
                return res.status(404).json({ error: 'Notification not found' });
            }

            res.json({ notification });
        } catch (error) {
            logger.error('Error marking notification as read controller', { error });
            res.status(500).json({ error: 'Failed to mark notification as read' });
        }
    }

    async markAllRead(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const success = await notificationsService.markAllAsRead(userId);

            if (!success) {
                return res.status(500).json({ error: 'Failed to mark all notifications as read' });
            }

            res.json({ success: true });
        } catch (error) {
            logger.error('Error marking all notifications as read controller', { error });
            res.status(500).json({ error: 'Failed to mark all notifications as read' });
        }
    }

    async getPreferences(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const prefs = await notificationsService.getPreferences(userId);
            res.json(prefs);
        } catch (error) {
            logger.error('Error fetching notification preferences controller', { error });
            res.status(500).json({ error: 'Failed to fetch notification preferences' });
        }
    }

    async updatePreferences(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            // const updates = req.body;

            const {
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
            } = req.body;

            // Validate boolean input
            if (
                typeof emailConsultation !== 'boolean' ||
                typeof emailShipping !== 'boolean' ||
                typeof emailBilling !== 'boolean' ||
                typeof smsConsultation !== 'boolean' ||
                typeof smsShipping !== 'boolean' ||
                typeof smsBilling !== 'boolean'
            ) {
                return res.status(400).json({ error: 'Invalid preference values' });
            }

            // Validate daily reminder fields if provided
            if (dailyRemindersEnabled !== undefined && typeof dailyRemindersEnabled !== 'boolean') {
                return res.status(400).json({ error: 'Invalid dailyRemindersEnabled value' });
            }

            // Validate time slot values
            const validTimeSlots = ['morning', 'afternoon', 'evening', 'custom', 'off', 'all'];
            if (pillsTimeSlot && !validTimeSlots.includes(pillsTimeSlot)) {
                return res.status(400).json({ error: 'Invalid pillsTimeSlot value' });
            }
            if (workoutTimeSlot && !validTimeSlots.includes(workoutTimeSlot)) {
                return res.status(400).json({ error: 'Invalid workoutTimeSlot value' });
            }
            if (nutritionTimeSlot && !validTimeSlots.includes(nutritionTimeSlot)) {
                return res.status(400).json({ error: 'Invalid nutritionTimeSlot value' });
            }
            if (lifestyleTimeSlot && !validTimeSlots.includes(lifestyleTimeSlot)) {
                return res.status(400).json({ error: 'Invalid lifestyleTimeSlot value' });
            }

            const prefs = await notificationsService.updatePreferences(userId, {
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
            });
            res.json(prefs);
        } catch (error) {
            logger.error('Error updating notification preferences controller', { error });
            res.status(500).json({ error: 'Failed to update notification preferences' });
        }
    }
}

export const notificationsController = new NotificationsController();
