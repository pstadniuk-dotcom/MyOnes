import { Router } from 'express';
import { adminController } from '../controller/admin.controller';
import { requireAdmin } from '../middleware/middleware';

const router = Router();

// Dashboard & Analytics
router.get('/stats', requireAdmin, adminController.getStats);
router.get('/analytics/growth', requireAdmin, adminController.getGrowthAnalytics);
router.get('/analytics/revenue', requireAdmin, adminController.getRevenueAnalytics);

// User Management
router.get('/users', requireAdmin, adminController.searchUsers);
router.get('/users/:id/timeline', requireAdmin, adminController.getUserTimeline);
router.get('/users/:id', requireAdmin, adminController.getUserDetails);
router.delete('/users/:id', requireAdmin, adminController.deleteUser);
router.patch('/users/:id/admin-status', requireAdmin, adminController.updateUserAdminStatus);
router.get('/users/:id/notes', requireAdmin, adminController.getUserNotes);
router.post('/users/:id/notes', requireAdmin, adminController.addUserNote);

// Support System
router.get('/support-tickets', requireAdmin, adminController.listSupportTickets);
router.get('/support-tickets/:id', requireAdmin, adminController.getSupportTicketDetails);
router.patch('/support-tickets/:id', requireAdmin, adminController.updateSupportTicket);
router.post('/support-tickets/:id/reply', requireAdmin, adminController.replyToSupportTicket);

// Conversation Intelligence
router.get('/conversations/stats', requireAdmin, adminController.getConversationStats);
router.get('/conversations/insights/latest', requireAdmin, adminController.getLatestInsights);
router.post('/conversations/insights/generate', requireAdmin, adminController.generateInsights);
router.get('/conversations', requireAdmin, adminController.listConversations);
router.get('/conversations/:sessionId', requireAdmin, adminController.getConversationDetails);

// Advanced Analytics
router.get('/analytics/funnel', requireAdmin, adminController.getFunnel);
router.get('/analytics/cohorts', requireAdmin, adminController.getCohorts);
router.get('/analytics/reorder-health', requireAdmin, adminController.getReorderHealth);
router.get('/analytics/formula-insights', requireAdmin, adminController.getFormulaInsights);
router.get('/analytics/pending-actions', requireAdmin, adminController.getPendingActions);
router.get('/activity-feed', requireAdmin, adminController.getActivityFeed);

// Order Management
router.get('/orders/today', requireAdmin, adminController.getTodaysOrders);
router.get('/orders', requireAdmin, adminController.listOrders);
router.patch('/orders/:id/status', requireAdmin, adminController.updateOrderStatus);

// Export
router.get('/export/users', requireAdmin, adminController.exportUsers);
router.get('/export/orders', requireAdmin, adminController.exportOrders);

router.get('/ai-settings', requireAdmin, adminController.getAiSettings);
router.post('/ai-settings', requireAdmin, adminController.updateAiSettings);

export default router;
