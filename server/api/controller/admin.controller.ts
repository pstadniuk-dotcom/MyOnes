import { Request, Response } from 'express';
import { adminService } from '../../modules/admin/admin.service';
import { systemRepository } from '../../modules/system/system.repository';
import { logger } from '../../infra/logging/logger';

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

    async getGrowthAnalytics(req: Request, res: Response) {
        try {
            const days = parseInt(req.query.days as string) || 30;
            const growthData = await adminService.getUserGrowth(days);
            res.json(growthData);
        } catch (error) {
            logger.error('Error fetching growth data', { error });
            res.status(500).json({ error: 'Failed to fetch growth data' });
        }
    }

    async getRevenueAnalytics(req: Request, res: Response) {
        try {
            const days = parseInt(req.query.days as string) || 30;
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
            const limit = parseInt(req.query.limit as string) || 20;
            const offset = parseInt(req.query.offset as string) || 0;
            const filter = (req.query.filter as string) || 'all';

            const result = await adminService.searchUsers(query, limit, offset, filter);
            res.json(result);
        } catch (error) {
            logger.error('Error searching users', { error });
            res.status(500).json({ error: 'Failed to search users' });
        }
    }

    async getUserTimeline(req: Request, res: Response) {
        try {
            const timeline = await adminService.getUserTimeline(req.params.id);
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
            res.json(user);
        } catch (error) {
            logger.error('Error fetching user details', { error });
            res.status(500).json({ error: 'Failed to fetch user details' });
        }
    }

    async deleteUser(req: Request, res: Response) {
        try {
            await adminService.deleteUser(req.params.id, (req as any).userId);
            res.json({ success: true, message: 'User deleted successfully' });
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
            const status = (req.query.status as string) || 'all';
            const limit = parseInt(req.query.limit as string) || 50;
            const offset = parseInt(req.query.offset as string) || 0;

            const result = await adminService.listSupportTickets(status, limit, offset);
            res.json(result);
        } catch (error) {
            logger.error('Error fetching support tickets', { error });
            res.status(500).json({ error: 'Failed to fetch support tickets' });
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
            const allowedUpdates = ['status', 'priority', 'adminNotes'];
            const updates: Record<string, any> = {};
            for (const key of allowedUpdates) {
                if (req.body[key] !== undefined) {
                    updates[key] = req.body[key];
                }
            }

            const ticket = await adminService.updateSupportTicket(req.params.id, updates);
            if (!ticket) {
                return res.status(404).json({ error: 'Support ticket not found' });
            }
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
            res.json({ response });
        } catch (error: any) {
            logger.error('Error replying to support ticket', { error });
            if (error.message === 'Support ticket not found') return res.status(404).json({ error: error.message });
            res.status(500).json({ error: 'Failed to reply to support ticket' });
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
            if (!result) {
                return res.status(404).json({ error: 'Conversation not found' });
            }
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
}

export const adminController = new AdminController();
