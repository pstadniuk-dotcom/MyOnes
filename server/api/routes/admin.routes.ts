import { Router } from 'express';
import { adminController } from '../controller/admin.controller';
import { requireAdmin } from '../middleware/middleware';
import { runFormulaReviewCheck } from '../../utils/autoOptimizeScheduler';
import { generateSocialPosts, generateContentIdeas, generateSocialImage, type GeneratePostsInput } from '../../utils/socialPostService';
import { uploadBrandAsset, listBrandAssets, deleteBrandAsset, analyzeBrandStyle, getBrandStyleProfile } from '../../utils/brandAssetService';
import { logger } from '../../infra/logging/logger';
import type { UploadedFile } from 'express-fileupload';
import crmRoutes from '../../modules/crm/crm.routes';

const router = Router();

// CRM System
router.use('/crm', requireAdmin, crmRoutes);

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
router.get('/orders/:id', requireAdmin, adminController.getOrderDetail);
router.patch('/orders/:id/status', requireAdmin, adminController.updateOrderStatus);
router.post('/orders/:id/refund', requireAdmin, adminController.refundOrder);
router.post('/orders/:id/retry-manufacturer', requireAdmin, adminController.retryManufacturerOrder);
router.post('/orders/:id/tracking', requireAdmin, adminController.updateOrderTracking);

// EPD Gateway — Payments Dashboard (Query API)
router.get('/gateway/transactions', requireAdmin, adminController.getGatewayTransactions);
router.get('/gateway/transactions/pending', requireAdmin, adminController.getGatewayPendingSettlement);
router.get('/gateway/transactions/:transactionId', requireAdmin, adminController.getGatewayTransaction);
router.get('/gateway/vault', requireAdmin, adminController.getGatewayVault);
router.get('/gateway/subscriptions', requireAdmin, adminController.getGatewaySubscriptions);
router.get('/gateway/plans', requireAdmin, adminController.getGatewayPlans);
router.post('/gateway/plans', requireAdmin, adminController.createGatewayPlan);
router.delete('/gateway/subscriptions/:subscriptionId', requireAdmin, adminController.deleteGatewaySubscription);

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

// Ingredient Catalog Sync
router.get('/ingredient-catalog/sync-logs', requireAdmin, adminController.getIngredientSyncLogs);
router.get('/ingredient-catalog/ingredients', requireAdmin, adminController.getManufacturerIngredients);
router.post('/ingredient-catalog/sync', requireAdmin, adminController.triggerIngredientSync);
router.get('/ingredient-catalog/affected-formulas', requireAdmin, adminController.getAffectedFormulas);

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
router.post('/faq/:id/restore', requireAdmin, adminController.restoreFaqItem);

// Help Article Management
router.get('/help-articles', requireAdmin, adminController.listHelpArticles);
router.post('/help-articles', requireAdmin, adminController.createHelpArticle);
router.patch('/help-articles/:id', requireAdmin, adminController.updateHelpArticle);
router.delete('/help-articles/:id', requireAdmin, adminController.deleteHelpArticle);
router.post('/help-articles/:id/restore', requireAdmin, adminController.restoreHelpArticle);

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

// Social Post Generation
router.post('/social/generate-posts', requireAdmin, async (req, res) => {
  try {
    const { platform, topic, tone, count, includeHashtags, contentType } = req.body;
    if (!platform || typeof platform !== 'string') {
      return res.status(400).json({ error: 'platform is required' });
    }
    const validPlatforms = ['instagram', 'twitter', 'linkedin', 'facebook', 'tiktok', 'threads'];
    if (!validPlatforms.includes(platform)) {
      return res.status(400).json({ error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}` });
    }
    const posts = await generateSocialPosts({ platform: platform as GeneratePostsInput['platform'], topic, tone, count, includeHashtags, contentType });
    return res.json({ success: true, posts });
  } catch (err: any) {
    logger.error('[social-gen] generate-posts error', { error: err.message });
    return res.status(500).json({ error: err.message || 'Failed to generate posts' });
  }
});

router.post('/social/generate-ideas', requireAdmin, async (req, res) => {
  try {
    const daysAhead = Math.min(Math.max(parseInt(req.body.daysAhead) || 7, 1), 14);
    const ideas = await generateContentIdeas(daysAhead);
    return res.json({ success: true, ...ideas });
  } catch (err: any) {
    logger.error('[social-gen] generate-ideas error', { error: err.message });
    return res.status(500).json({ error: err.message || 'Failed to generate ideas' });
  }
});

router.post('/social/generate-image', requireAdmin, async (req, res) => {
  try {
    const { visualConcept, platform, modelId } = req.body;
    if (!visualConcept || typeof visualConcept !== 'string') {
      return res.status(400).json({ error: 'visualConcept is required' });
    }
    const validPlatforms = ['instagram', 'twitter', 'linkedin', 'facebook', 'tiktok', 'threads'];
    const safePlatform = validPlatforms.includes(platform) ? platform : 'instagram';
    const imageUrl = await generateSocialImage({ visualConcept, platform: safePlatform, modelId });
    return res.json({ success: true, imageUrl });
  } catch (err: any) {
    logger.error('[social-gen] generate-image error', { error: err.message });
    return res.status(500).json({ error: err.message || 'Failed to generate image' });
  }
});

// ── Brand Assets ─────────────────────────────────────────────────────────

router.get('/social/brand-assets', requireAdmin, async (_req, res) => {
  try {
    const assets = await listBrandAssets();
    return res.json({ success: true, assets });
  } catch (err: any) {
    logger.error('[brand-assets] list error', { error: err.message });
    return res.status(500).json({ error: err.message });
  }
});

router.post('/social/brand-assets', requireAdmin, async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const file = req.files.file as UploadedFile;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ error: 'Only JPEG, PNG, WebP, and GIF images are allowed' });
    }
    const category = req.body.category || 'other';
    const validCategories = ['social_post', 'ad', 'logo', 'product', 'lifestyle', 'other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: `Invalid category. Must be one of: ${validCategories.join(', ')}` });
    }
    const description = typeof req.body.description === 'string' ? req.body.description.slice(0, 500) : undefined;
    const asset = await uploadBrandAsset(file.data, file.name, file.mimetype, category, description);
    return res.json({ success: true, asset });
  } catch (err: any) {
    logger.error('[brand-assets] upload error', { error: err.message });
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/social/brand-assets/:id', requireAdmin, async (req, res) => {
  try {
    const deleted = await deleteBrandAsset(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Asset not found' });
    return res.json({ success: true });
  } catch (err: any) {
    logger.error('[brand-assets] delete error', { error: err.message });
    return res.status(500).json({ error: err.message });
  }
});

router.post('/social/analyze-brand', requireAdmin, async (_req, res) => {
  try {
    const profile = await analyzeBrandStyle();
    return res.json({ success: true, profile });
  } catch (err: any) {
    logger.error('[brand-assets] analyze error', { error: err.message });
    return res.status(500).json({ error: err.message });
  }
});

router.get('/social/brand-profile', requireAdmin, async (_req, res) => {
  try {
    const profile = await getBrandStyleProfile();
    return res.json({ success: true, profile });
  } catch (err: any) {
    logger.error('[brand-assets] get-profile error', { error: err.message });
    return res.status(500).json({ error: err.message });
  }
});

export default router;
