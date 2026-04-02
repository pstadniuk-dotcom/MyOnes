import { Request, Response } from 'express';
import { adminService } from '../../modules/admin/admin.service';
import { systemRepository } from '../../modules/system/system.repository';
import { supportRepository } from '../../modules/support/support.repository';
import { logAdminAction, listAdminAuditLogs } from '../../modules/admin/admin-audit';
import { listAuthAuditLogs } from '../../modules/auth/auth-audit';
import { logger } from '../../infra/logging/logger';
import { manufacturerPricingService } from '../../modules/formulas/manufacturer-pricing.service';
import { ingredientCatalogRepository } from '../../modules/formulas/ingredient-catalog.repository';
import { ingredientCatalogSyncService } from '../../modules/formulas/ingredient-catalog-sync.service';
import { formulasRepository } from '../../modules/formulas/formulas.repository';
import { SYSTEM_SUPPORTS, INDIVIDUAL_INGREDIENTS, ALL_INGREDIENTS, SYSTEM_SUPPORT_DETAILS } from '@shared/ingredients';

export class AdminController {
    async getStats(req: Request, res: Response) {
        try {
            const stats = await adminService.getStats();
            res.json(stats);
        } catch (error) {
            logger.error('Error fetching admin stats', { error });
            res.status(500).json({ error: 'Failed to fetch admin statistics' });
        }
    }

    async getEnhancedStats(req: Request, res: Response) {
        try {
            const days = Math.min(Math.max(parseInt(req.query.days as string) || 30, 1), 365);
            const stats = await adminService.getEnhancedStats(days);
            res.json(stats);
        } catch (error) {
            logger.error('Error fetching enhanced stats', { error });
            res.status(500).json({ error: 'Failed to fetch enhanced statistics' });
        }
    }

    async getFinancialMetrics(req: Request, res: Response) {
        try {
            const metrics = await adminService.getFinancialMetrics();
            res.json(metrics);
        } catch (error) {
            logger.error('Error fetching financial metrics', { error });
            res.status(500).json({ error: 'Failed to fetch financial metrics' });
        }
    }

    async getGrowthAnalytics(req: Request, res: Response) {
        try {
            const days = Math.min(Math.max(parseInt(req.query.days as string) || 30, 1), 365);
            const growthData = await adminService.getUserGrowth(days);
            res.json(growthData);
        } catch (error) {
            logger.error('Error fetching growth data', { error });
            res.status(500).json({ error: 'Failed to fetch growth data' });
        }
    }

    async getRevenueAnalytics(req: Request, res: Response) {
        try {
            const days = Math.min(Math.max(parseInt(req.query.days as string) || 30, 1), 365);
            const revenueData = await adminService.getRevenueData(days);
            res.json(revenueData);
        } catch (error) {
            logger.error('Error fetching revenue data', { error });
            res.status(500).json({ error: 'Failed to fetch revenue data' });
        }
    }

    async searchUsers(req: Request, res: Response) {
        try {
            const query = (req.query.q as string) || '';
            const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
            const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
            const filter = (req.query.filter as string) || 'all';
            const sortBy = (req.query.sortBy as string) || undefined;

            // Parse advanced filters from query params
            const advancedFilters: {
                hasDevices?: boolean;
                deviceProviders?: string[];
                hasLabResults?: boolean;
                hasOrders?: boolean;
                minOrders?: number;
                maxOrders?: number;
            } = {};

            if (req.query.hasDevices !== undefined) {
                advancedFilters.hasDevices = req.query.hasDevices === 'true';
            }
            if (req.query.deviceProviders) {
                advancedFilters.deviceProviders = (req.query.deviceProviders as string).split(',').filter(Boolean);
            }
            if (req.query.hasLabResults !== undefined) {
                advancedFilters.hasLabResults = req.query.hasLabResults === 'true';
            }
            if (req.query.hasOrders !== undefined) {
                advancedFilters.hasOrders = req.query.hasOrders === 'true';
            }
            if (req.query.minOrders) {
                const parsed = parseInt(req.query.minOrders as string);
                advancedFilters.minOrders = Number.isFinite(parsed) ? Math.max(parsed, 0) : undefined;
            }
            if (req.query.maxOrders) {
                const parsed = parseInt(req.query.maxOrders as string);
                advancedFilters.maxOrders = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), 10000) : undefined;
            }

            const hasAdvanced = Object.keys(advancedFilters).length > 0;
            const result = await adminService.searchUsers(query, limit, offset, filter, hasAdvanced ? advancedFilters : undefined, sortBy);
            res.json(result);
        } catch (error) {
            logger.error('Error searching users', { error });
            res.status(500).json({ error: 'Failed to search users' });
        }
    }

    async getUserTimeline(req: Request, res: Response) {
        try {
            const timeline = await adminService.getUserTimeline(req.params.id);
            await logAdminAction(req, 'user_view', 'user', req.params.id, { view: 'timeline' });
            res.json(timeline);
        } catch (error: any) {
            logger.error('Error fetching user timeline', { error, userId: req.params.id });
            if (error.message === 'User not found') {
                return res.status(404).json({ error: 'User not found' });
            }
            res.status(500).json({ error: 'Failed to fetch user timeline' });
        }
    }

    async getUserDetails(req: Request, res: Response) {
        try {
            const user = await adminService.getUserById(req.params.id);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            await logAdminAction(req, 'user_view', 'user', req.params.id, { view: 'details' });
            res.json(user);
        } catch (error) {
            logger.error('Error fetching user details', { error });
            res.status(500).json({ error: 'Failed to fetch user details' });
        }
    }

    async deleteUser(req: Request, res: Response) {
        try {
            await adminService.deleteUser(req.params.id, (req as any).userId);
            await logAdminAction(req, 'user_delete', 'user', req.params.id, { softDelete: true });
            res.json({ success: true, message: 'User has been deactivated (soft-deleted)' });
        } catch (error: any) {
            logger.error('Error deleting user', { error, userId: req.params.id });
            if (error.message === 'User not found') return res.status(404).json({ error: error.message });
            res.status(400).json({ error: error.message || 'Failed to delete user' });
        }
    }

    async updateUserAdminStatus(req: Request, res: Response) {
        try {
            const { isAdmin } = req.body;
            if (typeof isAdmin !== 'boolean') {
                return res.status(400).json({ error: 'isAdmin must be a boolean' });
            }

            const updatedUser = await adminService.updateUserAdminStatus(req.params.id, (req as any).userId, isAdmin);
            await logAdminAction(req, isAdmin ? 'user_admin_grant' : 'user_admin_revoke', 'user', req.params.id, { isAdmin });
            res.json(updatedUser);
        } catch (error: any) {
            logger.error('Error updating admin status', { error, userId: req.params.id });
            if (error.message === 'User not found') return res.status(404).json({ error: error.message });
            res.status(400).json({ error: error.message || 'Failed to update admin status' });
        }
    }

    async getTodaysOrders(req: Request, res: Response) {
        try {
            const orders = await adminService.getTodaysOrders();
            res.json(orders);
        } catch (error) {
            logger.error('Error fetching today\'s orders', { error });
            res.status(500).json({ error: 'Failed to fetch today\'s orders' });
        }
    }

    async listSupportTickets(req: Request, res: Response) {
        try {
            const result = await adminService.listSupportTickets({
                status: (req.query.status as string) || 'all',
                priority: req.query.priority as string,
                assignedTo: req.query.assignedTo as string,
                category: req.query.category as string,
                search: req.query.search as string,
                tag: req.query.tag as string,
                slaBreached: req.query.slaBreached === 'true' ? true : req.query.slaBreached === 'false' ? false : undefined,
                sortBy: req.query.sortBy as string,
                sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
                limit: parseInt(req.query.limit as string) || 50,
                offset: parseInt(req.query.offset as string) || 0,
            });
            res.json(result);
        } catch (error) {
            logger.error('Error fetching support tickets', { error });
            res.status(500).json({ error: 'Failed to fetch support tickets' });
        }
    }

    async getNotificationCounts(_req: Request, res: Response) {
        try {
            const counts = await adminService.getNotificationCounts();
            res.json(counts);
        } catch (error) {
            logger.error('Error fetching notification counts', { error });
            res.status(500).json({ error: 'Failed to fetch notification counts' });
        }
    }

    async getSupportTicketDetails(req: Request, res: Response) {
        try {
            const details = await adminService.getSupportTicketDetails(req.params.id);
            if (!details) {
                return res.status(404).json({ error: 'Support ticket not found' });
            }
            res.json(details);
        } catch (error) {
            logger.error('Error fetching support ticket details', { error });
            res.status(500).json({ error: 'Failed to fetch support ticket details' });
        }
    }

    async updateSupportTicket(req: Request, res: Response) {
        try {
            const allowedUpdates = ['status', 'priority', 'adminNotes', 'assignedTo', 'category', 'tags'];
            const updates: Record<string, any> = {};
            for (const key of allowedUpdates) {
                if (req.body[key] !== undefined) {
                    updates[key] = req.body[key];
                }
            }
            // Auto-set resolvedAt when resolving/closing
            if (updates.status === 'resolved' || updates.status === 'closed') {
                updates.resolvedAt = new Date();
            }

            const ticket = await adminService.updateSupportTicket(req.params.id, updates, (req as any).userId);
            if (!ticket) {
                return res.status(404).json({ error: 'Support ticket not found' });
            }
            await logAdminAction(req, 'ticket_status_change', 'ticket', req.params.id, updates);
            res.json(ticket);
        } catch (error) {
            logger.error('Error updating support ticket', { error });
            res.status(500).json({ error: 'Failed to update support ticket' });
        }
    }

    async replyToSupportTicket(req: Request, res: Response) {
        try {
            const { message } = req.body;
            if (!message || typeof message !== 'string') {
                return res.status(400).json({ error: 'Message is required' });
            }

            const response = await adminService.replyToSupportTicket(req.params.id, (req as any).userId, message);
            await logAdminAction(req, 'ticket_reply', 'ticket', req.params.id, { messageLength: message.length });
            res.json({ response });
        } catch (error: any) {
            logger.error('Error replying to support ticket', { error });
            if (error.message === 'Support ticket not found') return res.status(404).json({ error: error.message });
            res.status(500).json({ error: 'Failed to reply to support ticket' });
        }
    }

    async bulkDeleteSupportTickets(req: Request, res: Response) {
        try {
            const { ids } = req.body;
            if (!Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ error: 'ids array is required' });
            }
            const count = await adminService.bulkDeleteSupportTickets(ids);
            await logAdminAction(req, 'bulk_delete_tickets', 'ticket', ids.join(','), { count });
            res.json({ deleted: count });
        } catch (error) {
            logger.error('Error bulk deleting support tickets', { error });
            res.status(500).json({ error: 'Failed to delete support tickets' });
        }
    }

    async bulkCloseSupportTickets(req: Request, res: Response) {
        try {
            const { ids } = req.body;
            if (!Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ error: 'ids array is required' });
            }
            const count = await adminService.bulkCloseSupportTickets(ids);
            await logAdminAction(req, 'bulk_close_tickets', 'ticket', ids.join(','), { count });
            res.json({ closed: count });
        } catch (error) {
            logger.error('Error bulk closing support tickets', { error });
            res.status(500).json({ error: 'Failed to close support tickets' });
        }
    }

    async getConversationStats(req: Request, res: Response) {
        try {
            const days = parseInt(req.query.days as string) || 30;
            const stats = await adminService.getConversationStats(days);
            res.json(stats);
        } catch (error) {
            logger.error('Error fetching conversation stats', { error });
            res.status(500).json({ error: 'Failed to fetch conversation stats' });
        }
    }

    async getLatestInsights(req: Request, res: Response) {
        try {
            const result = await adminService.getLatestInsights();
            res.json(result);
        } catch (error) {
            logger.error('Error fetching conversation insights', { error });
            res.status(500).json({ error: 'Failed to fetch conversation insights' });
        }
    }

    async generateInsights(req: Request, res: Response) {
        try {
            const days = parseInt(req.body.days as string) || 30;
            const insights = await adminService.generateInsights(days);
            res.json({ success: true, insights });
        } catch (error) {
            logger.error('Error generating conversation insights', { error });
            res.status(500).json({ error: 'Failed to generate conversation insights' });
        }
    }

    async listConversations(req: Request, res: Response) {
        try {
            const limit = parseInt(req.query.limit as string) || 50;
            const offset = parseInt(req.query.offset as string) || 0;
            const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
            const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

            const result = await adminService.listConversations(limit, offset, startDate, endDate);
            res.json(result);
        } catch (error) {
            logger.error('Error fetching conversations', { error });
            res.status(500).json({ error: 'Failed to fetch conversations' });
        }
    }

    async getConversationDetails(req: Request, res: Response) {
        try {
            const result = await adminService.getConversationDetails(req.params.sessionId);
             console.log('res................................',result)
            if (!result) {
                return res.status(404).json({ error: 'Conversation not found' });
            }
            await logAdminAction(req, 'conversation_view', 'conversation', req.params.sessionId);
            res.json(result);
        } catch (error) {
            logger.error('Error fetching conversation details', { error });
            res.status(500).json({ error: 'Failed to fetch conversation details' });
        }
    }

    async getFunnel(req: Request, res: Response) {
        try {
            const funnel = await adminService.getFunnel();
            res.json(funnel);
        } catch (error) {
            logger.error('Error fetching funnel data', { error });
            res.status(500).json({ error: 'Failed to fetch funnel data' });
        }
    }

    async getCohorts(req: Request, res: Response) {
        try {
            const months = parseInt(req.query.months as string) || 6;
            const cohorts = await adminService.getCohorts(months);
            res.json(cohorts);
        } catch (error) {
            logger.error('Error fetching cohort data', { error });
            res.status(500).json({ error: 'Failed to fetch cohort data' });
        }
    }

    async getReorderHealth(req: Request, res: Response) {
        try {
            const health = await adminService.getReorderHealth();
            res.json(health);
        } catch (error) {
            logger.error('Error fetching reorder health', { error });
            res.status(500).json({ error: 'Failed to fetch reorder health' });
        }
    }

    async getFormulaInsights(req: Request, res: Response) {
        try {
            const insights = await adminService.getFormulaInsights();
            res.json(insights);
        } catch (error) {
            logger.error('Error fetching formula insights', { error });
            res.status(500).json({ error: 'Failed to fetch formula insights' });
        }
    }

    async getPendingActions(req: Request, res: Response) {
        try {
            const pending = await adminService.getPendingActions();
            res.json(pending);
        } catch (error) {
            logger.error('Error fetching pending actions', { error });
            res.status(500).json({ error: 'Failed to fetch pending actions' });
        }
    }

    async getActivityFeed(req: Request, res: Response) {
        try {
            const limit = parseInt(req.query.limit as string) || 20;
            const feed = await adminService.getActivityFeed(limit);
            res.json(feed);
        } catch (error) {
            logger.error('Error fetching activity feed', { error });
            res.status(500).json({ error: 'Failed to fetch activity feed' });
        }
    }

    async listOrders(req: Request, res: Response) {
        try {
            const status = req.query.status as string;
            const limit = parseInt(req.query.limit as string) || 50;
            const offset = parseInt(req.query.offset as string) || 0;
            const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
            const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

            const result = await adminService.listOrders({ status, limit, offset, startDate, endDate });
            res.json(result);
        } catch (error) {
            logger.error('Error fetching orders', { error });
            res.status(500).json({ error: 'Failed to fetch orders' });
        }
    }

    async updateOrderStatus(req: Request, res: Response) {
        try {
            const { status, trackingUrl } = req.body;
            const order = await adminService.updateOrderStatus(req.params.id, status, trackingUrl);
            if (!order) {
                return res.status(404).json({ error: 'Order not found' });
            }
            await logAdminAction(req, 'order_status_change', 'order', req.params.id, { status, trackingUrl });
            res.json(order);
        } catch (error) {
            logger.error('Error updating order status', { error });
            res.status(500).json({ error: 'Failed to update order status' });
        }
    }

    async retryManufacturerOrder(req: Request, res: Response) {
        try {
            const result = await adminService.retryManufacturerOrder(req.params.id);
            if (!result.success) {
                return res.status(result.error === 'Order not found' ? 404 : 400).json({ error: result.error });
            }
            await logAdminAction(req, 'manufacturer_order_retry', 'order', req.params.id, { manufacturerOrderId: result.manufacturerOrderId });
            res.json({ success: true, manufacturerOrderId: result.manufacturerOrderId });
        } catch (error) {
            logger.error('Error retrying manufacturer order', { error });
            res.status(500).json({ error: 'Failed to retry manufacturer order' });
        }
    }

    async getUserNotes(req: Request, res: Response) {
        try {
            const notes = await adminService.getUserNotes(req.params.id);
            res.json(notes);
        } catch (error) {
            logger.error('Error fetching user notes', { error });
            res.status(500).json({ error: 'Failed to fetch user notes' });
        }
    }

    async addUserNote(req: Request, res: Response) {
        try {
            const { content } = req.body;
            const adminId = (req as any).userId;
            const note = await adminService.addUserNote(req.params.id, adminId, content);
            await logAdminAction(req, 'user_note_add', 'user', req.params.id, { noteId: note.id });
            res.json(note);
        } catch (error) {
            logger.error('Error adding user note', { error });
            res.status(500).json({ error: 'Failed to add user note' });
        }
    }

    async exportUsers(req: Request, res: Response) {
        try {
            const filter = req.query.filter as string || 'all';
            const csv = await adminService.exportUsers(filter);
            await logAdminAction(req, 'data_export', 'user', null, { exportType: 'users', filter });
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="users-export-${new Date().toISOString().split('T')[0]}.csv"`);
            res.send(csv);
        } catch (error) {
            logger.error('Error exporting users', { error });
            res.status(500).json({ error: 'Failed to export users' });
        }
    }

    async exportOrders(req: Request, res: Response) {
        try {
            const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
            const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
            const status = req.query.status as string | undefined;
            const csv = await adminService.exportOrders(startDate, endDate, status);
            await logAdminAction(req, 'data_export', 'order', null, { exportType: 'orders', startDate, endDate, status });
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="orders-export-${new Date().toISOString().split('T')[0]}.csv"`);
            res.send(csv);
        } catch (error) {
            logger.error('Error exporting orders', { error });
            res.status(500).json({ error: 'Failed to export orders' });
        }
    }

    async getAiSettings(req: Request, res: Response) {
        try {
            const settings = await adminService.getAiSettings();
            res.json(settings);
        } catch (error) {
            logger.error('Error fetching AI settings', { error });
            res.status(500).json({ error: 'Failed to fetch AI settings' });
        }
    }

    async updateAiSettings(req: Request, res: Response) {
        try {
            const { provider, model, reset } = req.body;
            const settings = await adminService.updateAiSettings(req.userId!, provider, model, reset);
            await logAdminAction(req, 'settings_update', 'ai_settings', null, { provider, model, reset: !!reset });
            res.json(settings);
        } catch (error) {
            logger.error('Error updating AI settings', { error });
            res.status(500).json({ error: 'Failed to update AI settings' });
        }
    }

    async testAiSettings(req: Request, res: Response) {
        try {
            const result = await adminService.testAiConnection();
            res.json(result);
        } catch (error) {
            logger.error('Error testing AI settings', { error });
            res.status(500).json({ ok: false, error: 'Failed to test AI connection' });
        }
    }

    async listIngredientPricing(req: Request, res: Response) {
        try {
            const pricing = await adminService.listIngredientPricing();
            res.json(pricing);
        } catch (error) {
            logger.error('Error fetching ingredient pricing', { error });
            res.status(500).json({ error: 'Failed to fetch ingredient pricing' });
        }
    }

    async updateIngredientPricing(req: Request, res: Response) {
        try {
            const {
                ingredientName,
                typicalCapsuleMg,
                typicalBottleCapsules,
                typicalRetailPriceCents,
                isActive,
            } = req.body || {};

            const parsedCapsuleMg = Number(typicalCapsuleMg);
            const parsedBottleCapsules = Number(typicalBottleCapsules);
            const parsedRetailPriceCents = Number(typicalRetailPriceCents);

            if (!ingredientName || typeof ingredientName !== 'string') {
                return res.status(400).json({ error: 'ingredientName is required' });
            }
            if (!Number.isFinite(parsedCapsuleMg) || parsedCapsuleMg <= 0) {
                return res.status(400).json({ error: 'typicalCapsuleMg must be a positive number' });
            }
            if (!Number.isFinite(parsedBottleCapsules) || parsedBottleCapsules <= 0) {
                return res.status(400).json({ error: 'typicalBottleCapsules must be a positive number' });
            }
            if (!Number.isFinite(parsedRetailPriceCents) || parsedRetailPriceCents <= 0) {
                return res.status(400).json({ error: 'typicalRetailPriceCents must be a positive number' });
            }
            if (typeof isActive !== 'boolean') {
                return res.status(400).json({ error: 'isActive must be a boolean' });
            }

            const updated = await adminService.updateIngredientPricing(req.params.id, {
                ingredientName: ingredientName.trim(),
                typicalCapsuleMg: Math.round(parsedCapsuleMg),
                typicalBottleCapsules: Math.round(parsedBottleCapsules),
                typicalRetailPriceCents: Math.round(parsedRetailPriceCents),
                isActive,
            });

            if (!updated) {
                return res.status(404).json({ error: 'Ingredient pricing not found' });
            }

            await logAdminAction(req, 'ingredient_pricing_update', 'ingredient', req.params.id, {
                ingredientName: ingredientName.trim(),
                typicalCapsuleMg: Math.round(parsedCapsuleMg),
                typicalRetailPriceCents: Math.round(parsedRetailPriceCents),
                isActive,
            });

            res.json(updated);
        } catch (error) {
            logger.error('Error updating ingredient pricing', { error });
            res.status(500).json({ error: 'Failed to update ingredient pricing' });
        }
    }

    // ── Audit & Compliance Endpoints ────────────────────────────────────

    async listAuditLogs(req: Request, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 50;
            const userId = req.query.userId as string | undefined;
            const action = req.query.action as string | undefined;

            const result = await systemRepository.listAuditLogs({ page, limit, userId, action });
            res.json({ data: result.data, total: result.total, page, limit });
        } catch (error) {
            logger.error('Error fetching audit logs', { error });
            res.status(500).json({ error: 'Failed to fetch audit logs' });
        }
    }

    async listSafetyLogs(req: Request, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 50;
            const userId = req.query.userId as string | undefined;
            const severity = req.query.severity as string | undefined;

            const result = await systemRepository.listSafetyAuditLogs({ page, limit, userId, severity });
            res.json({ data: result.data, total: result.total, page, limit });
        } catch (error) {
            logger.error('Error fetching safety logs', { error });
            res.status(500).json({ error: 'Failed to fetch safety logs' });
        }
    }

    async listWarningAcknowledgments(req: Request, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 50;
            const userId = req.query.userId as string | undefined;

            const result = await systemRepository.listWarningAcknowledgments({ page, limit, userId });
            res.json({ data: result.data, total: result.total, page, limit });
        } catch (error) {
            logger.error('Error fetching warning acknowledgments', { error });
            res.status(500).json({ error: 'Failed to fetch warning acknowledgments' });
        }
    }

    async listConsents(req: Request, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 50;
            const userId = req.query.userId as string | undefined;
            const consentType = req.query.consentType as string | undefined;

            const result = await systemRepository.listUserConsents({ page, limit, userId, consentType });
            res.json({ data: result.data, total: result.total, page, limit });
        } catch (error) {
            logger.error('Error fetching consents', { error });
            res.status(500).json({ error: 'Failed to fetch consents' });
        }
    }

    // ── User Suspend/Unsuspend ──────────────────────────────────────────

    async suspendUser(req: Request, res: Response) {
        try {
            const { reason } = req.body;
            const user = await adminService.suspendUser(req.params.id, (req as any).userId, reason);
            await logAdminAction(req, 'user_suspend', 'user', req.params.id, { reason });
            res.json(user);
        } catch (error: any) {
            logger.error('Error suspending user', { error, userId: req.params.id });
            if (error.message === 'User not found') return res.status(404).json({ error: error.message });
            res.status(400).json({ error: error.message || 'Failed to suspend user' });
        }
    }

    async unsuspendUser(req: Request, res: Response) {
        try {
            const user = await adminService.unsuspendUser(req.params.id, (req as any).userId);
            await logAdminAction(req, 'user_unsuspend', 'user', req.params.id);
            res.json(user);
        } catch (error: any) {
            logger.error('Error unsuspending user', { error, userId: req.params.id });
            if (error.message === 'User not found') return res.status(404).json({ error: error.message });
            res.status(400).json({ error: error.message || 'Failed to unsuspend user' });
        }
    }

    // ── FAQ Management ──────────────────────────────────────────────────

    async listFaqItems(req: Request, res: Response) {
        try {
            const category = req.query.category as string | undefined;
            // Admin sees all FAQ items including unpublished
            const items = await supportRepository.listFaqItems(category);
            res.json(items);
        } catch (error) {
            logger.error('Error fetching FAQ items', { error });
            res.status(500).json({ error: 'Failed to fetch FAQ items' });
        }
    }

    async createFaqItem(req: Request, res: Response) {
        try {
            const { category, question, answer, isPublished, displayOrder } = req.body;
            if (!category || !question || !answer) {
                return res.status(400).json({ error: 'category, question, and answer are required' });
            }
            const item = await supportRepository.createFaqItem({
                category, question, answer,
                isPublished: isPublished ?? true,
                displayOrder: displayOrder ?? 0,
            });
            await logAdminAction(req, 'faq_create', 'faq', item.id, { category, question: question.slice(0, 100) });
            res.json(item);
        } catch (error) {
            logger.error('Error creating FAQ item', { error });
            res.status(500).json({ error: 'Failed to create FAQ item' });
        }
    }

    async updateFaqItem(req: Request, res: Response) {
        try {
            const { category, question, answer, isPublished, displayOrder } = req.body;
            const updates: Record<string, any> = {};
            if (category !== undefined) updates.category = category;
            if (question !== undefined) updates.question = question;
            if (answer !== undefined) updates.answer = answer;
            if (isPublished !== undefined) updates.isPublished = isPublished;
            if (displayOrder !== undefined) updates.displayOrder = displayOrder;

            const item = await supportRepository.updateFaqItem(req.params.id, updates);
            if (!item) return res.status(404).json({ error: 'FAQ item not found' });
            await logAdminAction(req, 'faq_update', 'faq', req.params.id, updates);
            res.json(item);
        } catch (error) {
            logger.error('Error updating FAQ item', { error });
            res.status(500).json({ error: 'Failed to update FAQ item' });
        }
    }

    async deleteFaqItem(req: Request, res: Response) {
        try {
            const deleted = await supportRepository.deleteFaqItem(req.params.id);
            if (!deleted) return res.status(404).json({ error: 'FAQ item not found' });
            await logAdminAction(req, 'faq_delete', 'faq', req.params.id);
            res.json({ success: true });
        } catch (error) {
            logger.error('Error deleting FAQ item', { error });
            res.status(500).json({ error: 'Failed to delete FAQ item' });
        }
    }

    // ── Help Article Management ─────────────────────────────────────────

    async listHelpArticles(req: Request, res: Response) {
        try {
            const category = req.query.category as string | undefined;
            const articles = await supportRepository.listHelpArticles(category);
            res.json(articles);
        } catch (error) {
            logger.error('Error fetching help articles', { error });
            res.status(500).json({ error: 'Failed to fetch help articles' });
        }
    }

    async createHelpArticle(req: Request, res: Response) {
        try {
            const { category, title, content, isPublished, displayOrder } = req.body;
            if (!category || !title || !content) {
                return res.status(400).json({ error: 'category, title, and content are required' });
            }
            const article = await supportRepository.createHelpArticle({
                category, title, content,
                isPublished: isPublished ?? true,
                displayOrder: displayOrder ?? 0,
            });
            await logAdminAction(req, 'help_article_create', 'help_article', article.id, { category, title: title.slice(0, 100) });
            res.json(article);
        } catch (error) {
            logger.error('Error creating help article', { error });
            res.status(500).json({ error: 'Failed to create help article' });
        }
    }

    async updateHelpArticle(req: Request, res: Response) {
        try {
            const { category, title, content, isPublished, displayOrder } = req.body;
            const updates: Record<string, any> = {};
            if (category !== undefined) updates.category = category;
            if (title !== undefined) updates.title = title;
            if (content !== undefined) updates.content = content;
            if (isPublished !== undefined) updates.isPublished = isPublished;
            if (displayOrder !== undefined) updates.displayOrder = displayOrder;

            const article = await supportRepository.updateHelpArticle(req.params.id, updates);
            if (!article) return res.status(404).json({ error: 'Help article not found' });
            await logAdminAction(req, 'help_article_update', 'help_article', req.params.id, updates);
            res.json(article);
        } catch (error) {
            logger.error('Error updating help article', { error });
            res.status(500).json({ error: 'Failed to update help article' });
        }
    }

    async deleteHelpArticle(req: Request, res: Response) {
        try {
            const deleted = await supportRepository.deleteHelpArticle(req.params.id);
            if (!deleted) return res.status(404).json({ error: 'Help article not found' });
            await logAdminAction(req, 'help_article_delete', 'help_article', req.params.id);
            res.json({ success: true });
        } catch (error) {
            logger.error('Error deleting help article', { error });
            res.status(500).json({ error: 'Failed to delete help article' });
        }
    }

    // ── Newsletter Subscribers ──────────────────────────────────────────

    async listNewsletterSubscribers(req: Request, res: Response) {
        try {
            const { newsletterSubscribers } = await import('@shared/schema');
            const { db } = await import('../../infra/db/db');
            const { desc, count } = await import('drizzle-orm');

            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 50;
            const offset = (page - 1) * limit;

            const [countResult] = await db.select({ count: count() }).from(newsletterSubscribers);
            const subscribers = await db.select().from(newsletterSubscribers)
                .orderBy(desc(newsletterSubscribers.subscribedAt))
                .limit(limit).offset(offset);

            res.json({ data: subscribers, total: Number(countResult?.count || 0), page, limit });
        } catch (error) {
            logger.error('Error fetching newsletter subscribers', { error });
            res.status(500).json({ error: 'Failed to fetch newsletter subscribers' });
        }
    }

    async toggleNewsletterSubscriber(req: Request, res: Response) {
        try {
            const { newsletterSubscribers } = await import('@shared/schema');
            const { db } = await import('../../infra/db/db');
            const { eq } = await import('drizzle-orm');

            const { isActive } = req.body;
            if (typeof isActive !== 'boolean') {
                return res.status(400).json({ error: 'isActive must be a boolean' });
            }

            const [updated] = await db.update(newsletterSubscribers)
                .set({ isActive })
                .where(eq(newsletterSubscribers.id, req.params.id))
                .returning();

            if (!updated) return res.status(404).json({ error: 'Subscriber not found' });
            await logAdminAction(req, 'newsletter_subscriber_toggle', 'newsletter', req.params.id, { isActive });
            res.json(updated);
        } catch (error) {
            logger.error('Error toggling newsletter subscriber', { error });
            res.status(500).json({ error: 'Failed to toggle subscriber' });
        }
    }

    // ── Admin Audit Logs ────────────────────────────────────────────────

    async listAdminAuditLogs(req: Request, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 50;
            const adminId = req.query.adminId as string | undefined;
            const action = req.query.action as string | undefined;
            const targetType = req.query.targetType as string | undefined;

            const result = await listAdminAuditLogs({ page, limit, adminId, action, targetType });
            res.json({ data: result.data, total: result.total, page, limit });
        } catch (error) {
            logger.error('Error fetching admin audit logs', { error });
            res.status(500).json({ error: 'Failed to fetch admin audit logs' });
        }
    }

    async listAuthAuditLogs(req: Request, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 50;
            const action = req.query.action as string | undefined;
            const email = req.query.email as string | undefined;

            const result = await listAuthAuditLogs({ page, limit, action, email });
            res.json({ data: result.data, total: result.total, page, limit });
        } catch (error) {
            logger.error('Error fetching auth audit logs', { error });
            res.status(500).json({ error: 'Failed to fetch auth audit logs' });
        }
    }

    // ── Ticket Assignment ───────────────────────────────────────────────

    async assignSupportTicket(req: Request, res: Response) {
        try {
            const { assignedTo } = req.body;
            const ticket = await adminService.updateSupportTicket(req.params.id, { assignedTo: assignedTo || null }, (req as any).userId);
            if (!ticket) return res.status(404).json({ error: 'Support ticket not found' });
            await logAdminAction(req, 'ticket_assign', 'ticket', req.params.id, { assignedTo });
            res.json(ticket);
        } catch (error) {
            logger.error('Error assigning support ticket', { error });
            res.status(500).json({ error: 'Failed to assign support ticket' });
        }
    }

    async bulkUpdateSupportTickets(req: Request, res: Response) {
        try {
            const { ids, updates } = req.body;
            if (!Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ error: 'ids array is required' });
            }
            const allowedKeys = ['status', 'priority', 'assignedTo', 'category'];
            const safeUpdates: Record<string, any> = {};
            for (const key of allowedKeys) {
                if (updates?.[key] !== undefined) safeUpdates[key] = updates[key];
            }
            if (safeUpdates.status === 'resolved' || safeUpdates.status === 'closed') {
                safeUpdates.resolvedAt = new Date();
            }
            const count = await adminService.bulkUpdateSupportTickets(ids, safeUpdates, (req as any).userId);
            await logAdminAction(req, 'bulk_update_tickets', 'ticket', ids.join(','), { count, updates: safeUpdates });
            res.json({ updated: count });
        } catch (error) {
            logger.error('Error bulk updating support tickets', { error });
            res.status(500).json({ error: 'Failed to bulk update support tickets' });
        }
    }

    async getSupportTicketMetrics(req: Request, res: Response) {
        try {
            const days = parseInt(req.query.days as string) || 30;
            const metrics = await adminService.getSupportTicketMetrics(days);
            res.json(metrics);
        } catch (error) {
            logger.error('Error fetching support ticket metrics', { error });
            res.status(500).json({ error: 'Failed to fetch support ticket metrics' });
        }
    }

    async getTicketFilterOptions(_req: Request, res: Response) {
        try {
            const options = await adminService.getTicketFilterOptions();
            res.json(options);
        } catch (error) {
            logger.error('Error fetching ticket filter options', { error });
            res.status(500).json({ error: 'Failed to fetch ticket filter options' });
        }
    }

    async addTicketTag(req: Request, res: Response) {
        try {
            const { tag } = req.body;
            if (!tag || typeof tag !== 'string') return res.status(400).json({ error: 'tag is required' });
            const ticket = await adminService.addTicketTag(req.params.id, tag.toLowerCase().trim(), (req as any).userId);
            if (!ticket) return res.status(404).json({ error: 'Support ticket not found' });
            res.json(ticket);
        } catch (error) {
            logger.error('Error adding ticket tag', { error });
            res.status(500).json({ error: 'Failed to add ticket tag' });
        }
    }

    async removeTicketTag(req: Request, res: Response) {
        try {
            const { tag } = req.body;
            if (!tag || typeof tag !== 'string') return res.status(400).json({ error: 'tag is required' });
            const ticket = await adminService.removeTicketTag(req.params.id, tag, (req as any).userId);
            if (!ticket) return res.status(404).json({ error: 'Support ticket not found' });
            res.json(ticket);
        } catch (error) {
            logger.error('Error removing ticket tag', { error });
            res.status(500).json({ error: 'Failed to remove ticket tag' });
        }
    }

    // ── Product Catalog (ingredients + manufacturer status) ─────────────

    async getProductCatalog(req: Request, res: Response) {
        try {
            // Build our catalog with system supports detail
            const systemSupports = SYSTEM_SUPPORTS.map(ing => {
                const details = SYSTEM_SUPPORT_DETAILS.find(
                    d => d.name.toLowerCase() === ing.name.toLowerCase()
                );
                return {
                    name: ing.name,
                    category: 'system_support' as const,
                    doseMg: ing.doseMg,
                    doseRangeMin: ing.doseRangeMin,
                    doseRangeMax: ing.doseRangeMax,
                    description: ing.description,
                    systemSupported: details?.systemSupported || null,
                    activeIngredients: details?.activeIngredients || [],
                    suggestedDosage: details?.suggestedDosage || null,
                };
            });

            const individualIngredients = INDIVIDUAL_INGREDIENTS.map(ing => ({
                name: ing.name,
                category: 'individual' as const,
                doseMg: ing.doseMg,
                doseRangeMin: ing.doseRangeMin,
                doseRangeMax: ing.doseRangeMax,
                type: ing.type || null,
                description: ing.description || ing.suggestedUse || null,
                benefits: ing.benefits || [],
            }));

            // Try to get manufacturer mapping status
            let manufacturerMapping: any = null;
            try {
                const allNames = ALL_INGREDIENTS.map(i => i.name);
                manufacturerMapping = await manufacturerPricingService.auditCatalogMappings(allNames);
            } catch (e: any) {
                logger.warn('Failed to fetch manufacturer catalog mappings', { error: e?.message });
            }

            res.json({
                systemSupports,
                individualIngredients,
                totals: {
                    systemSupports: systemSupports.length,
                    individualIngredients: individualIngredients.length,
                    total: systemSupports.length + individualIngredients.length,
                },
                manufacturer: manufacturerMapping ? {
                    available: manufacturerMapping.available,
                    mappedCount: manufacturerMapping.mappedCount,
                    unmappedCount: manufacturerMapping.unmappedCount,
                    coveragePercent: manufacturerMapping.coveragePercent,
                    mapped: manufacturerMapping.mapped,
                    unmapped: manufacturerMapping.unmapped,
                } : null,
            });
        } catch (error) {
            logger.error('Error fetching product catalog', { error });
            res.status(500).json({ error: 'Failed to fetch product catalog' });
        }
    }

    // ── AI USAGE TRACKING ───────────────────────────────────────────────────

    async getAiUsageSummary(req: Request, res: Response) {
        try {
            const days = parseInt(req.query.days as string) || 30;
            const { getUsageSummary } = await import('../../modules/ai-usage/ai-usage.service');
            const summary = await getUsageSummary(days);
            res.json(summary);
        } catch (error) {
            logger.error('Error fetching AI usage summary', { error });
            res.status(500).json({ error: 'Failed to fetch AI usage data' });
        }
    }

    async getAiUsageByUser(req: Request, res: Response) {
        try {
            const userId = req.params.id;
            const days = parseInt(req.query.days as string) || 30;
            const { getUserUsageDetails } = await import('../../modules/ai-usage/ai-usage.service');
            const details = await getUserUsageDetails(userId, days);
            res.json(details);
        } catch (error) {
            logger.error('Error fetching user AI usage', { error });
            res.status(500).json({ error: 'Failed to fetch user AI usage' });
        }
    }

    // Traffic & Attribution
    async getTrafficSources(req: Request, res: Response) {
        try {
            const days = req.query.days ? Math.min(Math.max(parseInt(req.query.days as string), 1), 365) : undefined;
            const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
            const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
            const sources = await adminService.getTrafficSources(days, startDate, endDate);
            res.json(sources);
        } catch (error) {
            logger.error('Error fetching traffic sources', { error });
            res.status(500).json({ error: 'Failed to fetch traffic sources' });
        }
    }

    async getUtmCampaigns(req: Request, res: Response) {
        try {
            const days = req.query.days ? Math.min(Math.max(parseInt(req.query.days as string), 1), 365) : undefined;
            const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
            const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
            const campaigns = await adminService.getUtmCampaigns(days, startDate, endDate);
            res.json(campaigns);
        } catch (error) {
            logger.error('Error fetching UTM campaigns', { error });
            res.status(500).json({ error: 'Failed to fetch UTM campaigns' });
        }
    }

    async getReferralStats(req: Request, res: Response) {
        try {
            const stats = await adminService.getReferralStats();
            res.json(stats);
        } catch (error) {
            logger.error('Error fetching referral stats', { error });
            res.status(500).json({ error: 'Failed to fetch referral stats' });
        }
    }

    // Marketing Campaigns
    async listCampaigns(req: Request, res: Response) {
        try {
            const campaigns = await adminService.listCampaigns();
            res.json(campaigns);
        } catch (error) {
            logger.error('Error listing campaigns', { error });
            res.status(500).json({ error: 'Failed to list campaigns' });
        }
    }

    async createCampaign(req: Request, res: Response) {
        try {
            const campaign = await adminService.createCampaign({ ...req.body, createdBy: req.userId });
            res.status(201).json(campaign);
        } catch (error) {
            logger.error('Error creating campaign', { error });
            res.status(500).json({ error: 'Failed to create campaign' });
        }
    }

    async updateCampaign(req: Request, res: Response) {
        try {
            const campaign = await adminService.updateCampaign(req.params.id, req.body);
            if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
            res.json(campaign);
        } catch (error) {
            logger.error('Error updating campaign', { error });
            res.status(500).json({ error: 'Failed to update campaign' });
        }
    }

    async deleteCampaign(req: Request, res: Response) {
        try {
            const deleted = await adminService.deleteCampaign(req.params.id);
            if (!deleted) return res.status(404).json({ error: 'Campaign not found' });
            res.json({ success: true });
        } catch (error) {
            logger.error('Error deleting campaign', { error });
            res.status(500).json({ error: 'Failed to delete campaign' });
        }
    }

    // Influencer Hub
    async listInfluencers(req: Request, res: Response) {
        try {
            const filters: any = {};
            if (req.query.status) filters.status = req.query.status;
            if (req.query.platform) filters.platform = req.query.platform;
            const influencers = await adminService.listInfluencers(filters);
            res.json(influencers);
        } catch (error) {
            logger.error('Error listing influencers', { error });
            res.status(500).json({ error: 'Failed to list influencers' });
        }
    }

    async getInfluencer(req: Request, res: Response) {
        try {
            const influencer = await adminService.getInfluencer(req.params.id);
            if (!influencer) return res.status(404).json({ error: 'Influencer not found' });
            res.json(influencer);
        } catch (error) {
            logger.error('Error fetching influencer', { error });
            res.status(500).json({ error: 'Failed to fetch influencer' });
        }
    }

    async createInfluencer(req: Request, res: Response) {
        try {
            const influencer = await adminService.createInfluencer(req.body);
            res.status(201).json(influencer);
        } catch (error) {
            logger.error('Error creating influencer', { error });
            res.status(500).json({ error: 'Failed to create influencer' });
        }
    }

    async updateInfluencer(req: Request, res: Response) {
        try {
            const influencer = await adminService.updateInfluencer(req.params.id, req.body);
            if (!influencer) return res.status(404).json({ error: 'Influencer not found' });
            res.json(influencer);
        } catch (error) {
            logger.error('Error updating influencer', { error });
            res.status(500).json({ error: 'Failed to update influencer' });
        }
    }

    async deleteInfluencer(req: Request, res: Response) {
        try {
            const deleted = await adminService.deleteInfluencer(req.params.id);
            if (!deleted) return res.status(404).json({ error: 'Influencer not found' });
            res.json({ success: true });
        } catch (error) {
            logger.error('Error deleting influencer', { error });
            res.status(500).json({ error: 'Failed to delete influencer' });
        }
    }

    async getInfluencerStats(req: Request, res: Response) {
        try {
            const stats = await adminService.getInfluencerStats();
            res.json(stats);
        } catch (error) {
            logger.error('Error fetching influencer stats', { error });
            res.status(500).json({ error: 'Failed to fetch influencer stats' });
        }
    }

    async listInfluencerContent(req: Request, res: Response) {
        try {
            const content = await adminService.listInfluencerContent(req.params.id);
            res.json(content);
        } catch (error) {
            logger.error('Error listing influencer content', { error });
            res.status(500).json({ error: 'Failed to list influencer content' });
        }
    }

    async createInfluencerContent(req: Request, res: Response) {
        try {
            const content = await adminService.createInfluencerContent(req.body);
            res.status(201).json(content);
        } catch (error) {
            logger.error('Error creating influencer content', { error });
            res.status(500).json({ error: 'Failed to create influencer content' });
        }
    }

    // B2B Medical Prospecting
    async listB2bProspects(req: Request, res: Response) {
        try {
            const filters: any = {};
            if (req.query.status) filters.status = req.query.status;
            if (req.query.practiceType) filters.practiceType = req.query.practiceType;
            const result = await adminService.listB2bProspects(filters);
            res.json(result.prospects);
        } catch (error) {
            logger.error('Error listing B2B prospects', { error });
            res.status(500).json({ error: 'Failed to list B2B prospects' });
        }
    }

    async getB2bProspect(req: Request, res: Response) {
        try {
            const prospect = await adminService.getB2bProspect(req.params.id);
            if (!prospect) return res.status(404).json({ error: 'Prospect not found' });
            res.json(prospect);
        } catch (error) {
            logger.error('Error fetching B2B prospect', { error });
            res.status(500).json({ error: 'Failed to fetch B2B prospect' });
        }
    }

    async createB2bProspect(req: Request, res: Response) {
        try {
            const prospect = await adminService.createB2bProspect(req.body);
            res.status(201).json(prospect);
        } catch (error) {
            logger.error('Error creating B2B prospect', { error });
            res.status(500).json({ error: 'Failed to create B2B prospect' });
        }
    }

    async updateB2bProspect(req: Request, res: Response) {
        try {
            const prospect = await adminService.updateB2bProspect(req.params.id, req.body);
            if (!prospect) return res.status(404).json({ error: 'Prospect not found' });
            res.json(prospect);
        } catch (error) {
            logger.error('Error updating B2B prospect', { error });
            res.status(500).json({ error: 'Failed to update B2B prospect' });
        }
    }

    async deleteB2bProspect(req: Request, res: Response) {
        try {
            const deleted = await adminService.deleteB2bProspect(req.params.id);
            if (!deleted) return res.status(404).json({ error: 'Prospect not found' });
            res.json({ success: true });
        } catch (error) {
            logger.error('Error deleting B2B prospect', { error });
            res.status(500).json({ error: 'Failed to delete B2B prospect' });
        }
    }

    async getB2bStats(req: Request, res: Response) {
        try {
            const stats = await adminService.getB2bStats();
            res.json(stats);
        } catch (error) {
            logger.error('Error fetching B2B stats', { error });
            res.status(500).json({ error: 'Failed to fetch B2B stats' });
        }
    }

    async listB2bOutreach(req: Request, res: Response) {
        try {
            const outreach = await adminService.listB2bOutreach(req.params.id);
            res.json(outreach);
        } catch (error) {
            logger.error('Error listing B2B outreach', { error });
            res.status(500).json({ error: 'Failed to list B2B outreach' });
        }
    }

    async createB2bOutreach(req: Request, res: Response) {
        try {
            const outreach = await adminService.createB2bOutreach(req.body);
            res.status(201).json(outreach);
        } catch (error) {
            logger.error('Error creating B2B outreach', { error });
            res.status(500).json({ error: 'Failed to create B2B outreach' });
        }
    }

    async getIngredientSyncLogs(req: Request, res: Response) {
        try {
            const limit = parseInt(req.query.limit as string) || 20;
            const logs = await ingredientCatalogRepository.getRecentSyncLogs(limit);
            res.json(logs);
        } catch (error) {
            logger.error('Error fetching ingredient sync logs', { error });
            res.status(500).json({ error: 'Failed to fetch sync logs' });
        }
    }

    async getManufacturerIngredients(req: Request, res: Response) {
        try {
            const statusFilter = req.query.status as string;
            let ingredients;
            if (statusFilter === 'active') {
                ingredients = await ingredientCatalogRepository.getAllActive();
            } else {
                ingredients = await ingredientCatalogRepository.getAll();
            }
            res.json(ingredients);
        } catch (error) {
            logger.error('Error fetching manufacturer ingredients', { error });
            res.status(500).json({ error: 'Failed to fetch ingredients' });
        }
    }

    async triggerIngredientSync(req: Request, res: Response) {
        try {
            const result = await ingredientCatalogSyncService.syncCatalog();
            res.json(result);
        } catch (error) {
            logger.error('Error triggering ingredient sync', { error });
            res.status(500).json({ error: 'Failed to trigger ingredient sync' });
        }
    }

    async getAffectedFormulas(req: Request, res: Response) {
        try {
            const affected = await formulasRepository.getFormulasNeedingReformulation();
            res.json(affected);
        } catch (error) {
            logger.error('Error fetching affected formulas', { error });
            res.status(500).json({ error: 'Failed to fetch affected formulas' });
        }
    }
}

export const adminController = new AdminController();
