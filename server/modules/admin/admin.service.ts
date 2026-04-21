import { adminRepository } from './admin.repository';
import OpenAI from 'openai';
import { logger } from '../../infra/logging/logger';
import { sendNotificationEmail } from '../../utils/emailService';
import { INDIVIDUAL_INGREDIENTS, SYSTEM_SUPPORTS } from '@shared/ingredients';
import { aiRuntimeSettings, ALLOWED_MODELS, normalizeModel } from 'server/infra/ai/ai-config';
import { systemRepository } from '../system/system.repository';
import { manufacturerPricingService, type ManufacturerOrderCustomerInfo } from '../formulas/manufacturer-pricing.service';
import { usersRepository } from '../users/users.repository';
import { formulasRepository } from '../formulas/formulas.repository';
import { wearablesService } from '../wearables/wearables.service';
import { getFrontendUrl } from '../../utils/urlHelper';
import { escapeHtml } from '../../utils/sanitize';
import { epdGateway, isApproved } from '../billing/epd-gateway';

const VALID_ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const;

export class AdminService {
    private async sendUserAccountActionEmail(opts: {
        to: string | null | undefined;
        subject: string;
        title: string;
        contentHtml: string;
        actionUrl?: string;
        actionText?: string;
        userId?: string;
        action: string;
    }): Promise<void> {
        try {
            if (!opts.to) return;
            await sendNotificationEmail({
                to: opts.to,
                subject: opts.subject,
                title: opts.title,
                content: opts.contentHtml,
                actionUrl: opts.actionUrl,
                actionText: opts.actionText,
                type: 'system',
            });
        } catch (error) {
            logger.error('Failed to send user account action email', {
                error,
                to: opts.to,
                userId: opts.userId,
                action: opts.action,
            });
        }
    }

    async getStats() {
        return await adminRepository.getAdminStats();
    }

    async getEnhancedStats(days: number) {
        return await adminRepository.getEnhancedStats(days);
    }

    async getFinancialMetrics() {
        return await adminRepository.getFinancialMetrics();
    }

    async getUserGrowth(days: number) {
        return await adminRepository.getUserGrowthData(days);
    }

    async getRevenueData(days: number) {
        return await adminRepository.getRevenueData(days);
    }

    async searchUsers(
        query: string,
        limit: number,
        offset: number,
        filter: string,
        advancedFilters?: {
            hasDevices?: boolean;
            deviceProviders?: string[];
            hasLabResults?: boolean;
            hasOrders?: boolean;
            minOrders?: number;
            maxOrders?: number;
        },
        sortBy?: string
    ) {
        const result = await adminRepository.searchUsers(query, limit, offset, filter, advancedFilters, sortBy);
        // Sanitize users to remove sensitive fields
        const sanitizedUsers = result.users.map(({ password, ...user }: any) => user);
        return {
            users: sanitizedUsers,
            total: result.total
        };
    }

    async getUserTimeline(userId: string) {
        const timeline = await adminRepository.getUserTimeline(userId);
        const { password, ...sanitizedUser } = timeline.user as any;

        // Fetch wearable connections from Junction (source of truth) instead of empty local DB table
        let wearableDevices = timeline.wearableDevices;
        try {
            const junctionConnections = await wearablesService.getConnections(userId);
            if (junctionConnections.length > 0) {
                wearableDevices = junctionConnections.map((c: any) => ({
                    provider: c.provider,
                    status: c.status,
                    connectedAt: c.connectedAt || null,
                    lastSyncAt: c.lastSyncedAt || null,
                }));
            }
        } catch (error) {
            logger.warn('Failed to fetch Junction wearable connections for admin timeline', { userId, error });
        }

        return {
            ...timeline,
            user: sanitizedUser,
            wearableDevices,
        };
    }

    async getUserById(userId: string) {
        const user = await adminRepository.getUserById(userId);
        if (!user) return null;
        const { password, ...sanitizedUser } = user as any;
        return sanitizedUser;
    }

    async deleteUser(userId: string, adminId: string) {
        const userToDelete = await adminRepository.getUserById(userId);
        if (!userToDelete) throw new Error('User not found');

        if (userToDelete.id === adminId) {
            throw new Error('Cannot delete your own account');
        }

        if (userToDelete.isAdmin) {
            throw new Error('Cannot delete admin accounts');
        }

        const name = escapeHtml(userToDelete.name || 'there');
        const supportUrl = `${getFrontendUrl()}/dashboard/support`;
        await this.sendUserAccountActionEmail({
            to: userToDelete.email,
            subject: 'Your Ones account has been deactivated',
            title: 'Account Deactivated',
            contentHtml: `
                <p>Hi ${name},</p>
                <p>Your account has been deactivated by an administrator. You will no longer be able to log in.</p>
                <p>If you believe this is a mistake, please contact support.</p>
            `,
            actionUrl: supportUrl,
            actionText: 'Contact Support',
            userId,
            action: 'user_delete',
        });

        // Soft-delete: set deletedAt timestamp instead of hard DELETE
        return await adminRepository.updateUser(userId, {
            deletedAt: new Date(),
            deletedBy: adminId,
        });
    }

    async suspendUser(userId: string, adminId: string, reason?: string) {
        const user = await adminRepository.getUserById(userId);
        if (!user) throw new Error('User not found');
        if (user.id === adminId) throw new Error('Cannot suspend yourself');
        if (user.isAdmin) throw new Error('Cannot suspend admin accounts');

        const updated = await adminRepository.updateUser(userId, {
            suspendedAt: new Date(),
            suspendedBy: adminId,
            suspendedReason: reason || null,
        });
        if (!updated) throw new Error('Failed to suspend user');

        const name = escapeHtml(user.name || 'there');
        const reasonText = reason ? escapeHtml(reason) : null;
        const supportUrl = `${getFrontendUrl()}/dashboard/support`;
        await this.sendUserAccountActionEmail({
            to: user.email,
            subject: 'Your Ones account has been suspended',
            title: 'Account Suspended',
            contentHtml: `
                <p>Hi ${name},</p>
                <p>Your account has been suspended by an administrator. You will be unable to log in until it is restored.</p>
                ${reasonText ? `<p><strong>Reason:</strong> ${reasonText}</p>` : ''}
                <p>If you believe this is a mistake, please contact support.</p>
            `,
            actionUrl: supportUrl,
            actionText: 'Contact Support',
            userId,
            action: 'user_suspend',
        });

        const { password, ...sanitized } = updated as any;
        return sanitized;
    }

    async unsuspendUser(userId: string, adminId: string) {
        const user = await adminRepository.getUserById(userId);
        if (!user) throw new Error('User not found');

        const updated = await adminRepository.updateUser(userId, {
            suspendedAt: null,
            suspendedBy: null,
            suspendedReason: null,
        });
        if (!updated) throw new Error('Failed to unsuspend user');

        const name = escapeHtml(user.name || 'there');
        const loginUrl = `${getFrontendUrl()}/login`;
        await this.sendUserAccountActionEmail({
            to: user.email,
            subject: 'Your Ones account has been restored',
            title: 'Account Restored',
            contentHtml: `
                <p>Hi ${name},</p>
                <p>Your account suspension has been lifted by an administrator. You can log in again.</p>
            `,
            actionUrl: loginUrl,
            actionText: 'Log In',
            userId,
            action: 'user_unsuspend',
        });

        const { password, ...sanitized } = updated as any;
        return sanitized;
    }

    async updateUserAdminStatus(userId: string, adminId: string, isAdmin: boolean) {
        const userToUpdate = await adminRepository.getUserById(userId);
        if (!userToUpdate) throw new Error('User not found');

        if (userToUpdate.id === adminId && !isAdmin) {
            throw new Error('Cannot remove your own admin status');
        }

        const updatedUser = await adminRepository.updateUser(userId, { isAdmin });
        if (!updatedUser) throw new Error('Failed to update user');

        const name = escapeHtml(userToUpdate.name || 'there');
        const dashboardUrl = `${getFrontendUrl()}/dashboard`;
        await this.sendUserAccountActionEmail({
            to: userToUpdate.email,
            subject: isAdmin ? 'You have been granted admin access' : 'Your admin access has been revoked',
            title: isAdmin ? 'Admin Access Granted' : 'Admin Access Revoked',
            contentHtml: `
                <p>Hi ${name},</p>
                <p>Your account privileges were updated by an administrator.</p>
                <p><strong>Admin access:</strong> ${isAdmin ? 'Enabled' : 'Disabled'}</p>
                <p>If you believe this change is unexpected, please contact support.</p>
            `,
            actionUrl: dashboardUrl,
            actionText: 'Go to Dashboard',
            userId,
            action: isAdmin ? 'user_admin_grant' : 'user_admin_revoke',
        });

        const { password, ...sanitizedUser } = updatedUser as any;
        return sanitizedUser;
    }

    async getTodaysOrders() {
        return await adminRepository.getTodaysOrders();
    }

    // SLA deadlines by priority (in hours)
    private static SLA_HOURS: Record<string, number> = {
        urgent: 2,
        high: 8,
        medium: 24,
        low: 72,
    };

    async listSupportTickets(options: {
        status?: string;
        priority?: string;
        assignedTo?: string;
        category?: string;
        search?: string;
        tag?: string;
        slaBreached?: boolean;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        limit?: number;
        offset?: number;
    }) {
        return await adminRepository.listAllSupportTickets(options);
    }

    async getNotificationCounts() {
        const supportCounts = await adminRepository.getOpenSupportTicketCount();
        return {
            supportTickets: supportCounts.open + supportCounts.inProgress,
            openTickets: supportCounts.open,
            inProgressTickets: supportCounts.inProgress,
        };
    }

    async getSupportTicketDetails(ticketId: string) {
        const ticket = await adminRepository.getSupportTicket(ticketId);
        if (!ticket) return null;

        const responses = await adminRepository.listSupportTicketResponses(ticketId);
        const user = await adminRepository.getUserById(ticket.userId);
        const activityLog = await adminRepository.getTicketActivityLog(ticketId);

        return {
            ticket,
            responses,
            user: user ? { id: user.id, name: user.name, email: user.email } : null,
            activityLog,
        };
    }

    async updateSupportTicket(ticketId: string, updates: any, adminId?: string) {
        const oldTicket = adminId ? await adminRepository.getSupportTicket(ticketId) : null;
        const result = await adminRepository.updateSupportTicket(ticketId, updates);

        // Log activity for tracked changes
        if (adminId && oldTicket && result) {
            if (updates.status && updates.status !== oldTicket.status) {
                await adminRepository.logTicketActivity({
                    ticketId,
                    userId: adminId,
                    action: 'status_change',
                    oldValue: oldTicket.status,
                    newValue: updates.status,
                });
            }
            if (updates.priority && updates.priority !== oldTicket.priority) {
                await adminRepository.logTicketActivity({
                    ticketId,
                    userId: adminId,
                    action: 'priority_change',
                    oldValue: oldTicket.priority,
                    newValue: updates.priority,
                });
            }
            if (updates.assignedTo !== undefined && updates.assignedTo !== oldTicket.assignedTo) {
                await adminRepository.logTicketActivity({
                    ticketId,
                    userId: adminId,
                    action: 'assignment',
                    oldValue: oldTicket.assignedTo || 'unassigned',
                    newValue: updates.assignedTo || 'unassigned',
                });
            }
        }

        return result;
    }

    async bulkDeleteSupportTickets(ticketIds: string[]) {
        return await adminRepository.bulkDeleteSupportTickets(ticketIds);
    }

    async bulkCloseSupportTickets(ticketIds: string[]) {
        return await adminRepository.bulkCloseSupportTickets(ticketIds);
    }

    async bulkUpdateSupportTickets(ticketIds: string[], updates: any, adminId?: string) {
        const count = await adminRepository.bulkUpdateSupportTickets(ticketIds, updates);

        // Log bulk actions
        if (adminId) {
            const action = updates.status ? 'bulk_status_change' :
                           updates.priority ? 'bulk_priority_change' :
                           updates.assignedTo !== undefined ? 'bulk_assignment' : 'bulk_update';
            for (const id of ticketIds) {
                await adminRepository.logTicketActivity({
                    ticketId: id,
                    userId: adminId,
                    action,
                    newValue: JSON.stringify(updates),
                });
            }
        }

        return count;
    }

    async addTicketTag(ticketId: string, tag: string, adminId?: string) {
        const ticket = await adminRepository.getSupportTicket(ticketId);
        if (!ticket) return null;
        const currentTags = ticket.tags || [];
        if (currentTags.includes(tag)) return ticket;
        const updated = await adminRepository.updateSupportTicket(ticketId, { tags: [...currentTags, tag] } as any);
        if (adminId) {
            await adminRepository.logTicketActivity({
                ticketId, userId: adminId, action: 'tag_add', newValue: tag,
            });
        }
        return updated;
    }

    async removeTicketTag(ticketId: string, tag: string, adminId?: string) {
        const ticket = await adminRepository.getSupportTicket(ticketId);
        if (!ticket) return null;
        const currentTags = (ticket.tags || []).filter((t: string) => t !== tag);
        const updated = await adminRepository.updateSupportTicket(ticketId, { tags: currentTags } as any);
        if (adminId) {
            await adminRepository.logTicketActivity({
                ticketId, userId: adminId, action: 'tag_remove', oldValue: tag,
            });
        }
        return updated;
    }

    calculateSlaDeadline(priority: string, createdAt: Date): Date {
        const hours = AdminService.SLA_HOURS[priority] || 24;
        const deadline = new Date(createdAt);
        deadline.setHours(deadline.getHours() + hours);
        return deadline;
    }

    async replyToSupportTicket(ticketId: string, adminId: string, message: string) {
        const ticket = await adminRepository.getSupportTicket(ticketId);
        if (!ticket) throw new Error('Support ticket not found');

        const response = await adminRepository.createSupportTicketResponse({
            ticketId,
            userId: adminId,
            message,
            isStaff: true
        });

        // Log reply activity
        await adminRepository.logTicketActivity({
            ticketId,
            userId: adminId,
            action: 'reply',
            metadata: JSON.stringify({ messageLength: message.length }),
        });

        // Send email notification to user
        try {
            const user = await adminRepository.getUserById(ticket.userId);
            if (user) {
                const ticketUrl = `https://ones.health/dashboard/support`;
                await sendNotificationEmail({
                    to: user.email,
                    subject: `Response to: ${ticket.subject}`,
                    title: 'Support Team Response',
                    content: `
            <strong>Ticket Subject:</strong> ${ticket.subject}<br/>
            <strong>Response:</strong> ${message}
          `,
                    actionUrl: ticketUrl,
                    actionText: 'View Ticket',
                    type: 'system'
                });
            }
        } catch (emailError) {
            logger.error('Failed to send response notification email', { error: emailError });
        }

        return response;
    }

    async getSupportTicketMetrics(days: number = 30) {
        return await adminRepository.getSupportTicketMetrics(days);
    }

    async getTicketFilterOptions() {
        const [categories, tags, admins] = await Promise.all([
            adminRepository.getAllTicketCategories(),
            adminRepository.getAllTicketTags(),
            adminRepository.getAdminUsers(),
        ]);
        return { categories, tags, admins };
    }

    async getConversationStats(days: number) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { total: totalMessages } = await adminRepository.getAllUserMessages(1, startDate, endDate);
        const { total: totalConversations } = await adminRepository.getAllConversations(1, 0, startDate, endDate);

        return {
            dateRange: { start: startDate, end: endDate },
            totalConversations,
            totalUserMessages: totalMessages,
            averageMessagesPerConversation: totalConversations > 0 ? Math.round(totalMessages / totalConversations) : 0
        };
    }

    async getLatestInsights() {
        const insights = await adminRepository.getLatestConversationInsights();
        if (!insights) {
            return {
                hasInsights: false,
                message: 'No insights generated yet. Click "Generate Insights" to analyze conversations.'
            };
        }
        return {
            hasInsights: true,
            insights
        };
    }

    async generateInsights(days: number) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { messages: userMessages, total: totalMessages } = await adminRepository.getAllUserMessages(2000, startDate, endDate);

        if (userMessages.length === 0) {
            return {
                generatedAt: new Date(),
                dateRange: { start: startDate, end: endDate },
                messageCount: 0,
                summary: 'No user messages found in the selected date range.',
                ingredientRequests: [],
                featureRequests: [],
                commonQuestions: [],
                sentimentOverview: { positive: 0, neutral: 0, negative: 0 },
                rawAnalysis: 'No data to analyze.'
            };
        }

        const availableIngredients = [
            ...Object.keys(SYSTEM_SUPPORTS),
            ...Object.keys(INDIVIDUAL_INGREDIENTS)
        ];

        const messageTexts = userMessages.map(m => m.content).join('\n---\n');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const analysisPrompt = `You are analyzing user conversations from Ones, a personalized supplement platform. 
Users chat with an AI health practitioner to create custom supplement formulas.

Analyze these ${userMessages.length} user messages from the past ${days} days and provide product insights.

AVAILABLE INGREDIENTS IN OUR CATALOG:
${availableIngredients.slice(0, 100).join(', ')}... (and ${availableIngredients.length - 100} more)

USER MESSAGES TO ANALYZE:
${messageTexts.slice(0, 50000)} 

Provide a JSON response with the following structure:
{
  "summary": "A 2-3 sentence executive summary of what users are discussing and asking for",
  "ingredientRequests": [
    {"name": "Ingredient Name", "count": 5, "available": true/false, "context": "Why users want it"}
  ],
  "featureRequests": [
    {"feature": "Feature description", "count": 3, "category": "one of: supplements, workouts, nutrition, tracking, ui, other"}
  ],
  "commonQuestions": [
    {"question": "What users commonly ask", "count": 10}
  ],
  "sentimentOverview": {
    "positive": 65,
    "neutral": 25, 
    "negative": 10
  },
  "topThemes": ["theme1", "theme2", "theme3"],
  "actionableInsights": [
    "Specific recommendation for product improvement"
  ]
}

Return ONLY valid JSON.`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4.1',
            messages: [{ role: 'user', content: analysisPrompt }],
            max_completion_tokens: 4000,
            temperature: 0.3
        });

        const rawAnalysis = completion.choices[0]?.message?.content || '';
        let analysisData;
        try {
            const jsonMatch = rawAnalysis.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, rawAnalysis];
            analysisData = JSON.parse(jsonMatch[1] || rawAnalysis);
        } catch (parseError) {
            logger.warn('Failed to parse AI analysis JSON', { parseError });
            analysisData = { summary: rawAnalysis.slice(0, 500), sentimentOverview: { positive: 33, neutral: 34, negative: 33 } };
        }

        const insights = {
            generatedAt: new Date(),
            dateRange: { start: startDate, end: endDate },
            messageCount: totalMessages,
            summary: analysisData.summary || 'Analysis completed.',
            ingredientRequests: analysisData.ingredientRequests || [],
            featureRequests: analysisData.featureRequests || [],
            commonQuestions: analysisData.commonQuestions || [],
            sentimentOverview: analysisData.sentimentOverview || { positive: 0, neutral: 0, negative: 0 },
            topThemes: analysisData.topThemes || [],
            actionableInsights: analysisData.actionableInsights || [],
            rawAnalysis
        };

        await adminRepository.saveConversationInsights(insights);
        return insights;
    }

    async listConversations(limit: number, offset: number, startDate?: Date, endDate?: Date) {
        const result = await adminRepository.getAllConversations(limit, offset, startDate, endDate);
        return {
            conversations: result.conversations.map(conv => ({
                sessionId: conv.session.id,
                status: conv.session.status,
                createdAt: conv.session.createdAt,
                user: conv.user,
                messageCount: conv.messageCount,
                preview: conv.messages.find(m => m.role === 'user')?.content?.slice(0, 150) || 'No messages'
            })),
            total: result.total,
            limit,
            offset
        };
    }

    async getConversationDetails(sessionId: string) {
        return await adminRepository.getConversationDetails(sessionId);
    }

    async getFunnel() {
        return await adminRepository.getConversionFunnel();
    }

    async getCohorts(months: number) {
        return await adminRepository.getCohortRetention(months);
    }

    async getReorderHealth() {
        return await adminRepository.getReorderHealth();
    }

    async getFormulaInsights() {
        return await adminRepository.getFormulaInsights();
    }

    async getPendingActions() {
        return await adminRepository.getPendingActions();
    }

    async getActivityFeed(limit: number) {
        return await adminRepository.getActivityFeed(limit);
    }

    async listOrders(options: any) {
        return await adminRepository.getAllOrders(options);
    }

    async updateOrderStatus(orderId: string, status: string, trackingUrl?: string) {
        if (!VALID_ORDER_STATUSES.includes(status as any)) {
            throw new Error(`Invalid order status "${status}". Must be one of: ${VALID_ORDER_STATUSES.join(', ')}`);
        }
        const order = await adminRepository.updateOrderStatus(orderId, status, trackingUrl);

        // Start Smart Re-Order cycle for members when order ships
        if (order && status === 'shipped' && order.formulaId) {
            try {
                const user = await usersRepository.getUser(order.userId);
                if (user?.membershipTier && !user.membershipCancelledAt) {
                    const { reorderService } = await import('../reorder/reorder.service');
                    await reorderService.createScheduleForOrder(
                        order.userId,
                        order.formulaId,
                        order.formulaVersion,
                        order.shippedAt ?? new Date(),
                    );
                    logger.info(`[SmartReorder] Created schedule for member ${order.userId}, order ${orderId}`);
                }
            } catch (err) {
                logger.error(`[SmartReorder] Failed to create schedule for order ${orderId}:`, err);
            }
        }

        return order;
    }

    async retryManufacturerOrder(orderId: string): Promise<{ success: boolean; manufacturerOrderId?: string; error?: string }> {
        const order = await usersRepository.getOrder(orderId);
        if (!order) {
            return { success: false, error: 'Order not found' };
        }

        if (order.manufacturerOrderStatus === 'submitted') {
            return { success: false, error: 'Manufacturer order already submitted' };
        }

        // Re-quote if no quote or quote expired
        let quoteId = order.manufacturerQuoteId;
        if (!quoteId || (order.manufacturerQuoteExpiresAt && order.manufacturerQuoteExpiresAt.getTime() < Date.now())) {
            if (!order.formulaId) {
                return { success: false, error: 'Order has no formula reference — cannot re-quote' };
            }
            const formula = await formulasRepository.getFormula(order.formulaId);
            if (!formula) {
                return { success: false, error: 'Formula not found — cannot re-quote' };
            }

            logger.info('Admin retry: re-quoting expired/missing quote', { orderId, formulaId: order.formulaId });
            const freshQuote = await manufacturerPricingService.quoteFormula({
                bases: (formula.bases as any[]) || [],
                additions: (formula.additions as any[]) || [],
                targetCapsules: (formula.targetCapsules as number) || 9,
            }, (formula.targetCapsules as number) || 9);

            if (!freshQuote.available || !freshQuote.quoteId) {
                return { success: false, error: `Re-quote failed: ${freshQuote.reason || 'unavailable'}` };
            }

            quoteId = freshQuote.quoteId;
            await usersRepository.updateOrder(orderId, {
                manufacturerQuoteId: quoteId,
                manufacturerQuoteExpiresAt: freshQuote.quoteExpiresAt ? new Date(freshQuote.quoteExpiresAt) : null,
            });
        }

        // Place the manufacturer order — build customer info from user profile
        const user = await usersRepository.getUser(order.userId);
        let customerInfo: ManufacturerOrderCustomerInfo | undefined;
        if (user) {
            const shippingAddresses = await usersRepository.listAddressesByUser(order.userId, 'shipping');
            const billingAddresses = await usersRepository.listAddressesByUser(order.userId, 'billing');
            const shippingAddr = shippingAddresses[0];
            const billingAddr = billingAddresses[0] || shippingAddr;
            const addrLine1 = shippingAddr?.line1 || user.addressLine1;
            const addrCity = shippingAddr?.city || user.city;
            const addrZip = shippingAddr?.postalCode || user.postalCode;

            if (addrLine1 && addrCity && addrZip) {
                customerInfo = {
                    customerName: user.name || 'Customer',
                    email: user.email,
                    phone: user.phone || undefined,
                    billingAddress: {
                        line1: billingAddr?.line1 || addrLine1,
                        line2: billingAddr?.line2 || undefined,
                        city: billingAddr?.city || addrCity,
                        state: billingAddr?.state || user.state || undefined,
                        zip: billingAddr?.postalCode || addrZip,
                        country: billingAddr?.country || user.country || 'US',
                    },
                    shippingAddress: {
                        line1: addrLine1,
                        line2: shippingAddr?.line2 || user.addressLine2 || undefined,
                        city: addrCity,
                        state: shippingAddr?.state || user.state || undefined,
                        zip: addrZip,
                        country: shippingAddr?.country || user.country || 'US',
                    },
                };
            }
        }

        const result = await manufacturerPricingService.placeManufacturerOrder(quoteId, customerInfo);
        if (result.success) {
            await usersRepository.updateOrder(orderId, {
                manufacturerOrderId: result.orderId || null,
                manufacturerOrderStatus: 'submitted',
            });
            logger.info('Admin retry: manufacturer order placed', { orderId, manufacturerOrderId: result.orderId });
            return { success: true, manufacturerOrderId: result.orderId };
        } else {
            logger.error('Admin retry: manufacturer order still failed', { orderId, error: result.error });
            await usersRepository.updateOrder(orderId, {
                manufacturerOrderStatus: 'failed',
            });
            return { success: false, error: result.error };
        }
    }

    async getUserNotes(userId: string) {
        return await adminRepository.getUserAdminNotes(userId);
    }

    async addUserNote(userId: string, adminId: string, content: string) {
        return await adminRepository.addUserAdminNote(userId, adminId, content);
    }

    async exportUsers(filter: string) {
        const users = await adminRepository.exportUsers(filter);
        const headers = ['ID', 'Name', 'Email', 'Phone', 'Created At', 'Has Formula', 'Has Orders', 'Total Spent'];
        const rows = users.map(u => [
            u.id,
            `"${(u.name || '').replace(/"/g, '""')}"`,
            u.email,
            u.phone || '',
            u.createdAt,
            u.hasFormula ? 'Yes' : 'No',
            u.orderCount > 0 ? 'Yes' : 'No',
            `$${(u.totalSpent / 100).toFixed(2)}`
        ].join(','));
        return [headers.join(','), ...rows].join('\n');
    }

    async exportOrders(startDate?: Date, endDate?: Date, status?: string) {
        const orders = await adminRepository.exportOrders(startDate, endDate, status);
        const csvEscape = (value: unknown) => {
            const str = value === null || value === undefined ? '' : String(value);
            return `"${str.replace(/"/g, '""')}"`;
        };

        const headers = ['Order ID', 'Customer', 'Status', 'Amount', 'Supply (Days)', 'Placed At', 'Shipped At', 'Tracking URL'];
        const rows = orders.map(o => [
            csvEscape(o.id),
            csvEscape(o.userEmail ? `${o.userName} (${o.userEmail})` : o.userName),
            csvEscape(o.status),
            csvEscape(o.amountCents === null || o.amountCents === undefined ? '-' : `$${(Number(o.amountCents) / 100).toFixed(2)}`),
            csvEscape(`${o.supplyMonths ? o.supplyMonths * 30 : 90} days`),
            csvEscape(o.placedAt),
            csvEscape(o.shippedAt || ''),
            csvEscape(o.trackingUrl || ''),
        ].join(','));
        return [headers.join(','), ...rows].join('\n');
    }

    async getAiSettings() {
        return {
            provider: aiRuntimeSettings.provider || (process.env.AI_PROVIDER || 'openai'),
            model: aiRuntimeSettings.model || process.env.AI_MODEL || ((process.env.AI_PROVIDER || 'openai').toLowerCase() === 'anthropic' ? 'claude-sonnet-4-6' : 'gpt-4o'),
            source: aiRuntimeSettings.provider || aiRuntimeSettings.model ? 'override' : 'env',
            updatedAt: aiRuntimeSettings.updatedAt || null
        };
    }

    async updateAiSettings(userId: string | null, provider: string, model: string, reset: boolean) {
        if (reset) {
            aiRuntimeSettings.provider = undefined;
            aiRuntimeSettings.model = undefined;
            aiRuntimeSettings.updatedAt = new Date().toISOString();
            aiRuntimeSettings.source = 'env';
            // Remove persisted settings to revert to env defaults
            try { await systemRepository.deleteAppSetting('ai_settings') } catch { };
            return { success: true, message: 'AI settings reset to environment defaults', settings: aiRuntimeSettings };
        }
        if (provider && !['openai', 'anthropic'].includes(String(provider).toLowerCase())) {
            return { error: 'Invalid provider. Must be "openai" or "anthropic".' };
        }
        const effectiveProvider: 'openai' | 'anthropic' = (provider ? String(provider).toLowerCase() : (aiRuntimeSettings.provider || (process.env.AI_PROVIDER as any) || 'openai')) as 'openai' | 'anthropic';
        if (provider) aiRuntimeSettings.provider = effectiveProvider;

        if (model) {
            const normalized = normalizeModel(effectiveProvider, String(model));
            const allowed = ALLOWED_MODELS[effectiveProvider];
            if (!normalized || !allowed.includes(normalized)) {
                return {
                    error: `Invalid model for provider '${effectiveProvider}'. Allowed: ${allowed.join(', ')}`,
                    suggestion: allowed[0]
                };
            }
            aiRuntimeSettings.model = normalized;
        }
        aiRuntimeSettings.updatedAt = new Date().toISOString();
        aiRuntimeSettings.source = 'override';
        // Persist settings to DB
        try {
            await systemRepository.upsertAppSetting('ai_settings', {
                provider: aiRuntimeSettings.provider,
                model: aiRuntimeSettings.model,
                updatedAt: aiRuntimeSettings.updatedAt
            }, userId || null);
        } catch (e) {
            logger.error('Error persisting AI settings', { error: e });
            // Non-fatal; continue with in-memory override
        }
        return { success: true, settings: aiRuntimeSettings }
    }

    async listIngredientPricing() {
        return await adminRepository.listIngredientPricing();
    }

    async testAiConnection(): Promise<{ ok: boolean; provider: string; model: string; sample?: string; error?: string }> {
        const provider = (aiRuntimeSettings.provider || process.env.AI_PROVIDER || 'openai') as 'openai' | 'anthropic';
        const model = aiRuntimeSettings.model || (provider === 'anthropic' ? 'claude-sonnet-4-6' : 'gpt-4o');

        try {
            if (provider === 'openai') {
                const apiKey = process.env.OPENAI_API_KEY;
                if (!apiKey) return { ok: false, provider, model, error: 'OPENAI_API_KEY not set' };
                const openai = new OpenAI({ apiKey });
                const completion = await openai.chat.completions.create({
                    model,
                    messages: [{ role: 'user', content: 'Respond with exactly: OK' }],
                    max_tokens: 5,
                });
                const sample = completion.choices?.[0]?.message?.content?.trim() || '';
                return { ok: true, provider, model, sample };
            } else {
                const apiKey = process.env.ANTHROPIC_API_KEY;
                if (!apiKey) return { ok: false, provider, model, error: 'ANTHROPIC_API_KEY not set' };
                const res = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': apiKey,
                        'anthropic-version': '2023-06-01',
                    },
                    body: JSON.stringify({
                        model,
                        max_tokens: 5,
                        messages: [{ role: 'user', content: 'Respond with exactly: OK' }],
                    }),
                });
                if (!res.ok) {
                    const errBody = await res.text();
                    return { ok: false, provider, model, error: `HTTP ${res.status}: ${errBody.slice(0, 200)}` };
                }
                const data = await res.json();
                const sample = data?.content?.[0]?.text?.trim() || '';
                return { ok: true, provider, model, sample };
            }
        } catch (err: any) {
            return { ok: false, provider, model, error: err.message || 'Unknown error' };
        }
    }

    async updateIngredientPricing(id: string, updates: {
        ingredientName: string;
        typicalCapsuleMg: number;
        typicalBottleCapsules: number;
        typicalRetailPriceCents: number;
        isActive: boolean;
    }) {
        return await adminRepository.updateIngredientPricing(id, updates);
    }

    // Traffic & Attribution
    async getTrafficSources(days?: number, startDate?: Date, endDate?: Date) {
        return await adminRepository.getTrafficSourceBreakdown(days, startDate, endDate);
    }

    async getUtmCampaigns(days?: number, startDate?: Date, endDate?: Date) {
        return await adminRepository.getUtmCampaignBreakdown(days, startDate, endDate);
    }

    async getReferralStats() {
        return await adminRepository.getReferralStats();
    }

    // Marketing Campaigns
    async listCampaigns() {
        return await adminRepository.listMarketingCampaigns();
    }

    async createCampaign(data: any) {
        return await adminRepository.createMarketingCampaign(data);
    }

    async updateCampaign(id: string, updates: any) {
        return await adminRepository.updateMarketingCampaign(id, updates);
    }

    async deleteCampaign(id: string) {
        return await adminRepository.deleteMarketingCampaign(id);
    }

    // Influencer Hub
    async listInfluencers(filters?: { status?: string; platform?: string }) {
        return await adminRepository.listInfluencers(filters?.status);
    }

    async getInfluencer(id: string) {
        return await adminRepository.getInfluencer(id);
    }

    async createInfluencer(data: any) {
        return await adminRepository.createInfluencer(data);
    }

    async updateInfluencer(id: string, updates: any) {
        return await adminRepository.updateInfluencer(id, updates);
    }

    async deleteInfluencer(id: string) {
        return await adminRepository.deleteInfluencer(id);
    }

    async getInfluencerStats() {
        return await adminRepository.getInfluencerStats();
    }

    async listInfluencerContent(influencerId: string) {
        return await adminRepository.listInfluencerContent(influencerId);
    }

    async createInfluencerContent(data: any) {
        return await adminRepository.createInfluencerContent(data);
    }

    // B2B Medical Prospecting
    async listB2bProspects(filters?: { status?: string; practiceType?: string }) {
        return await adminRepository.listB2bProspects(filters?.status, filters?.practiceType);
    }

    async getB2bProspect(id: string) {
        return await adminRepository.getB2bProspect(id);
    }

    async createB2bProspect(data: any) {
        return await adminRepository.createB2bProspect(data);
    }

    async updateB2bProspect(id: string, updates: any) {
        return await adminRepository.updateB2bProspect(id, updates);
    }

    async deleteB2bProspect(id: string) {
        return await adminRepository.deleteB2bProspect(id);
    }

    async getB2bStats() {
        return await adminRepository.getB2bStats();
    }

    async listB2bOutreach(prospectId: string) {
        return await adminRepository.listB2bOutreach(prospectId);
    }

    async createB2bOutreach(data: any) {
        return await adminRepository.createB2bOutreach(data);
    }

    // ── Order Detail ─────────────────────────────────────────────────

    async getOrderDetail(orderId: string): Promise<any> {
        const order = await usersRepository.getOrder(orderId);
        if (!order) return null;

        const user = await usersRepository.getUser(order.userId);
        const formula = order.formulaId ? await formulasRepository.getFormula(order.formulaId) : null;
        const addresses = await usersRepository.listAddressesByUser(order.userId, 'shipping');

        return {
            ...order,
            user: user ? { id: user.id, name: user.name, email: user.email, phone: user.phone } : null,
            formula: formula ? {
                id: formula.id,
                version: formula.version,
                name: formula.name,
                bases: formula.bases,
                additions: formula.additions,
                targetCapsules: formula.targetCapsules,
            } : null,
            shippingAddress: addresses[0] || null,
        };
    }

    // ── Refund Order ─────────────────────────────────────────────────

    async refundOrder(orderId: string, amountCents?: number, reason?: string): Promise<{
        success: boolean;
        refundTransactionId?: string;
        refundedAmountCents?: number;
        error?: string;
    }> {
        const order = await usersRepository.getOrder(orderId);
        if (!order) return { success: false, error: 'Order not found' };

        if (!order.gatewayTransactionId) {
            return { success: false, error: 'No gateway transaction ID — cannot refund. This order may not have been charged.' };
        }

        if (order.status === 'cancelled') {
            return { success: false, error: 'Order is already cancelled' };
        }

        const orderAmountCents = order.amountCents || 0;
        const refundCents = amountCents ?? orderAmountCents; // Full refund if no amount specified

        if (refundCents <= 0) {
            return { success: false, error: 'Refund amount must be greater than zero' };
        }
        if (refundCents > orderAmountCents) {
            return { success: false, error: `Refund amount ($${(refundCents / 100).toFixed(2)}) exceeds order total ($${(orderAmountCents / 100).toFixed(2)})` };
        }

        const refundDollars = (refundCents / 100).toFixed(2);

        try {
            const result = await epdGateway.refund(order.gatewayTransactionId, refundDollars);

            if (!isApproved(result)) {
                logger.warn('EPD refund declined', {
                    orderId, transactionId: order.gatewayTransactionId,
                    responsetext: result.responsetext, response_code: result.response_code,
                });
                return { success: false, error: `Refund declined: ${result.responsetext}` };
            }

            // Update order status to cancelled
            await adminRepository.updateOrderStatus(orderId, 'cancelled');

            logger.info('Order refunded via EPD', {
                orderId, refundCents, transactionId: order.gatewayTransactionId,
                refundTransactionId: result.transactionid, reason,
            });

            // Notify user via email
            const user = await usersRepository.getUser(order.userId);
            if (user?.email) {
                try {
                    await sendNotificationEmail({
                        to: user.email,
                        subject: 'Your ONES Order Has Been Refunded',
                        title: 'Refund Processed',
                        content: `<p>A refund of <strong>$${refundDollars}</strong> has been issued for your order.</p>
                            <p>Please allow 5-10 business days for the refund to appear on your statement.</p>
                            ${reason ? `<p><strong>Reason:</strong> ${escapeHtml(reason)}</p>` : ''}`,
                        type: 'order_update',
                    });
                } catch (emailErr) {
                    logger.warn('Failed to send refund email', { orderId, error: emailErr });
                }
            }

            return {
                success: true,
                refundTransactionId: result.transactionid,
                refundedAmountCents: refundCents,
            };
        } catch (err) {
            logger.error('EPD refund request failed', { orderId, error: err });
            return { success: false, error: 'Payment gateway error — please try again or refund via EPD console.' };
        }
    }
}

export const adminService = new AdminService();
