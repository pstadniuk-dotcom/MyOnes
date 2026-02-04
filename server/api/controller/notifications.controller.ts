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
            const updates = req.body;
            const prefs = await notificationsService.updatePreferences(userId, updates);
            res.json(prefs);
        } catch (error) {
            logger.error('Error updating notification preferences controller', { error });
            res.status(500).json({ error: 'Failed to update notification preferences' });
        }
    }
}

export const notificationsController = new NotificationsController();
