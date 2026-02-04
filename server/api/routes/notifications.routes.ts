import { Router } from 'express';
import { notificationsController } from '../controller/notifications.controller';
import { requireAuth } from '../middleware/middleware';

const router = Router();

// Notification Retrieval
router.get('/', requireAuth, notificationsController.getNotifications);
router.get('/unread-count', requireAuth, notificationsController.getUnreadCount);

// Notification Actions
router.patch('/:id/read', requireAuth, notificationsController.markRead);
router.patch('/mark-all-read', requireAuth, notificationsController.markAllRead);

// Preferences (Added for future use/consistency)
router.get('/preferences', requireAuth, notificationsController.getPreferences);
router.patch('/preferences', requireAuth, notificationsController.updatePreferences);

export default router;
