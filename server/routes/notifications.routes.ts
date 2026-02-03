/**
 * Notification routes
 * Handles: notifications, notification preferences
 */

import { Router } from 'express';
import { logger } from '../infrastructure/logging/logger';
import { requireAuth } from './middleware';
import { notificationService } from '../domains/notifications/notification.service';

const router = Router();

/**
 * GET /api/notifications
 * Get user's notifications
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const limit = parseInt(req.query.limit as string) || 10;
    const notifications = await notificationService.listNotificationsByUser(userId, limit);
    res.json({ notifications });
  } catch (error) {
    logger.error('Error fetching notifications', { error });
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications
 */
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const count = await notificationService.getUnreadNotificationCount(userId);
    res.json({ count });
  } catch (error) {
    logger.error('Error getting unread notification count', { error });
    res.status(500).json({ error: 'Failed to get unread notification count' });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a notification as read
 */
router.patch('/:id/read', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const notificationId = req.params.id;

    const notification = await notificationService.markNotificationAsRead(notificationId, userId);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ notification });
  } catch (error) {
    logger.error('Error marking notification as read', { error });
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

/**
 * PATCH /api/notifications/mark-all-read
 * Mark all notifications as read
 */
router.patch('/mark-all-read', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const success = await notificationService.markAllNotificationsAsRead(userId);

    if (!success) {
      return res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Error marking all notifications as read', { error });
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

/**
 * GET /api/notifications/prefs
 * Get notification preferences
 */
router.get('/prefs', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    let prefs = await notificationService.getNotificationPrefs(userId);

    if (!prefs) {
      prefs = await notificationService.createNotificationPrefs({
        userId,
        emailConsultation: true,
        emailShipping: true,
        emailBilling: true,
        smsConsultation: false,
        smsShipping: false,
        smsBilling: false,
      });
    }

    res.json(prefs);
  } catch (error) {
    logger.error('Error fetching notification preferences', { error });
    res.status(500).json({ error: 'Failed to fetch notification preferences' });
  }
});

/**
 * PUT /api/notifications/prefs
 * Update notification preferences
 */
router.put('/prefs', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const updates = req.body;

    let prefs = await notificationService.getNotificationPrefs(userId);

    if (!prefs) {
      prefs = await notificationService.createNotificationPrefs({
        userId,
        ...updates
      });
    } else {
      prefs = await notificationService.updateNotificationPrefs(userId, updates);
    }

    res.json(prefs);
  } catch (error) {
    logger.error('Error updating notification preferences', { error });
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});

export default router;
