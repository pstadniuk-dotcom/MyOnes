import { Router } from 'express';
import { adminController } from '../controller/admin.controller';
import { liveChatController } from '../controller/live-chat.controller';
import { requireAdmin } from '../middleware/middleware';
import { runFormulaReviewCheck } from '../../utils/autoOptimizeScheduler';

const router = Router();

// Dashboard & Analytics
router.get('/stats', requireAdmin, adminController.getStats);
router.get('/stats/enhanced', requireAdmin, adminController.getEnhancedStats);
router.get('/stats/financial', requireAdmin, adminController.getFinancialMetrics);
router.get('/analytics/growth', requireAdmin, adminController.getGrowthAnalytics);
router.get('/analytics/revenue', requireAdmin, adminController.getRevenueAnalytics);

// User Management
router.get('/users', requireAdmin, adminController.searchUsers);
router.get('/users/:id/timeline', requireAdmin, adminController.getUserTimeline);
router.get('/users/:id', requireAdmin, adminController.getUserDetails);
router.delete('/users/:id', requireAdmin, adminController.deleteUser);
router.patch('/users/:id/admin-status', requireAdmin, adminController.updateUserAdminStatus);
router.patch('/users/:id/suspend', requireAdmin, adminController.suspendUser);
router.patch('/users/:id/unsuspend', requireAdmin, adminController.unsuspendUser);
router.get('/users/:id/notes', requireAdmin, adminController.getUserNotes);
router.post('/users/:id/notes', requireAdmin, adminController.addUserNote);

// Support System
router.get('/notifications/counts', requireAdmin, adminController.getNotificationCounts);
router.get('/support-tickets/metrics', requireAdmin, adminController.getSupportTicketMetrics);
router.get('/support-tickets/filter-options', requireAdmin, adminController.getTicketFilterOptions);
router.get('/support-tickets', requireAdmin, adminController.listSupportTickets);
router.get('/support-tickets/:id', requireAdmin, adminController.getSupportTicketDetails);
router.patch('/support-tickets/:id', requireAdmin, adminController.updateSupportTicket);
router.patch('/support-tickets/:id/assign', requireAdmin, adminController.assignSupportTicket);
router.post('/support-tickets/:id/reply', requireAdmin, adminController.replyToSupportTicket);
router.post('/support-tickets/:id/tags', requireAdmin, adminController.addTicketTag);
router.delete('/support-tickets/:id/tags', requireAdmin, adminController.removeTicketTag);
router.post('/support-tickets/bulk-delete', requireAdmin, adminController.bulkDeleteSupportTickets);
router.post('/support-tickets/bulk-close', requireAdmin, adminController.bulkCloseSupportTickets);
router.post('/support-tickets/bulk-update', requireAdmin, adminController.bulkUpdateSupportTickets);

// Live Chat (Admin)
router.get('/live-chats', requireAdmin, liveChatController.adminListSessions);
router.get('/live-chats/count', requireAdmin, liveChatController.adminGetChatCount);
router.get('/live-chats/stream', requireAdmin, liveChatController.adminStream);
router.get('/live-chats/admins', requireAdmin, liveChatController.adminListAdmins);
router.get('/live-chats/analytics', requireAdmin, liveChatController.getAnalytics);
router.post('/live-chats/bulk-delete', requireAdmin, liveChatController.adminBulkDeleteSessions);
router.post('/live-chats/bulk-close', requireAdmin, liveChatController.adminBulkCloseSessions);
router.get('/live-chats/canned-responses', requireAdmin, liveChatController.listCannedResponses);
router.post('/live-chats/canned-responses', requireAdmin, liveChatController.createCannedResponse);
router.post('/live-chats/canned-responses/use', requireAdmin, liveChatController.useCannedResponse);
router.patch('/live-chats/canned-responses/:id', requireAdmin, liveChatController.updateCannedResponse);
router.delete('/live-chats/canned-responses/:id', requireAdmin, liveChatController.deleteCannedResponse);
router.get('/live-chats/:id', requireAdmin, liveChatController.adminGetSession);
router.get('/live-chats/:id/messages', requireAdmin, liveChatController.adminGetMessages);
router.post('/live-chats/:id/messages', requireAdmin, liveChatController.adminSendMessage);
router.post('/live-chats/:id/close', requireAdmin, liveChatController.adminCloseSession);
router.get('/live-chats/:id/stream', requireAdmin, liveChatController.adminStreamSession);
router.post('/live-chats/:id/typing', requireAdmin, liveChatController.adminTyping);
router.post('/live-chats/:id/stop-typing', requireAdmin, liveChatController.adminStopTyping);
router.post('/live-chats/:id/transfer', requireAdmin, liveChatController.adminTransferSession);

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
router.post('/orders/:id/retry-manufacturer', requireAdmin, adminController.retryManufacturerOrder);

// Export
router.get('/export/users', requireAdmin, adminController.exportUsers);
router.get('/export/orders', requireAdmin, adminController.exportOrders);

router.get('/ai-settings', requireAdmin, adminController.getAiSettings);
router.post('/ai-settings', requireAdmin, adminController.updateAiSettings);
router.post('/ai-settings/test', requireAdmin, adminController.testAiSettings);

router.get('/ingredient-pricing', requireAdmin, adminController.listIngredientPricing);
router.patch('/ingredient-pricing/:id', requireAdmin, adminController.updateIngredientPricing);

// Product Catalog
router.get('/products/catalog', requireAdmin, adminController.getProductCatalog);

// AI Usage Tracking
router.get('/ai-usage', requireAdmin, adminController.getAiUsageSummary);
router.get('/ai-usage/user/:id', requireAdmin, adminController.getAiUsageByUser);

// Audit & Compliance
router.get('/audit-logs', requireAdmin, adminController.listAuditLogs);
router.get('/audit-logs/admin', requireAdmin, adminController.listAdminAuditLogs);
router.get('/audit-logs/auth', requireAdmin, adminController.listAuthAuditLogs);
router.get('/safety-logs', requireAdmin, adminController.listSafetyLogs);
router.get('/warning-acknowledgments', requireAdmin, adminController.listWarningAcknowledgments);
router.get('/consents', requireAdmin, adminController.listConsents);

// FAQ Management
router.get('/faq', requireAdmin, adminController.listFaqItems);
router.post('/faq', requireAdmin, adminController.createFaqItem);
router.patch('/faq/:id', requireAdmin, adminController.updateFaqItem);
router.delete('/faq/:id', requireAdmin, adminController.deleteFaqItem);

// Help Article Management
router.get('/help-articles', requireAdmin, adminController.listHelpArticles);
router.post('/help-articles', requireAdmin, adminController.createHelpArticle);
router.patch('/help-articles/:id', requireAdmin, adminController.updateHelpArticle);
router.delete('/help-articles/:id', requireAdmin, adminController.deleteHelpArticle);

// Newsletter Subscribers
router.get('/newsletter', requireAdmin, adminController.listNewsletterSubscribers);
router.patch('/newsletter/:id', requireAdmin, adminController.toggleNewsletterSubscriber);

// Traffic & Attribution Analytics
router.get('/analytics/traffic-sources', requireAdmin, adminController.getTrafficSources);
router.get('/analytics/utm-campaigns', requireAdmin, adminController.getUtmCampaigns);
router.get('/analytics/referrals', requireAdmin, adminController.getReferralStats);

// Marketing Campaigns
router.get('/campaigns', requireAdmin, adminController.listCampaigns);
router.post('/campaigns', requireAdmin, adminController.createCampaign);
router.patch('/campaigns/:id', requireAdmin, adminController.updateCampaign);
router.delete('/campaigns/:id', requireAdmin, adminController.deleteCampaign);

// Influencer Hub
router.get('/influencers', requireAdmin, adminController.listInfluencers);
router.get('/influencers/stats', requireAdmin, adminController.getInfluencerStats);
router.get('/influencers/:id', requireAdmin, adminController.getInfluencer);
router.post('/influencers', requireAdmin, adminController.createInfluencer);
router.patch('/influencers/:id', requireAdmin, adminController.updateInfluencer);
router.delete('/influencers/:id', requireAdmin, adminController.deleteInfluencer);
router.get('/influencers/:id/content', requireAdmin, adminController.listInfluencerContent);
router.post('/influencers/:id/content', requireAdmin, adminController.createInfluencerContent);

// B2B Medical Prospecting
router.get('/b2b/prospects', requireAdmin, adminController.listB2bProspects);
router.get('/b2b/stats', requireAdmin, adminController.getB2bStats);
router.get('/b2b/prospects/:id', requireAdmin, adminController.getB2bProspect);
router.post('/b2b/prospects', requireAdmin, adminController.createB2bProspect);
router.patch('/b2b/prospects/:id', requireAdmin, adminController.updateB2bProspect);
router.delete('/b2b/prospects/:id', requireAdmin, adminController.deleteB2bProspect);
router.get('/b2b/prospects/:id/outreach', requireAdmin, adminController.listB2bOutreach);
router.post('/b2b/prospects/:id/outreach', requireAdmin, adminController.createB2bOutreach);

// Formula Review Scheduler — manual trigger for testing
router.post('/formula-review/trigger', requireAdmin, async (req, res) => {
  try {
    const results = await runFormulaReviewCheck();
    return res.json({ success: true, results });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
