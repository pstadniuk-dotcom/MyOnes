import { adminRepository } from './admin.repository';
import OpenAI from 'openai';
import { logger } from '../../infra/logging/logger';
import { sendNotificationEmail } from '../../utils/emailService';
import { INDIVIDUAL_INGREDIENTS, SYSTEM_SUPPORTS } from '@shared/ingredients';

export class AdminService {
    async getStats() {
        return await adminRepository.getAdminStats();
    }

    async getUserGrowth(days: number) {
        return await adminRepository.getUserGrowthData(days);
    }

    async getRevenueData(days: number) {
        return await adminRepository.getRevenueData(days);
    }

    async searchUsers(query: string, limit: number, offset: number, filter: string) {
        const result = await adminRepository.searchUsers(query, limit, offset, filter);
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
        return {
            ...timeline,
            user: sanitizedUser
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

        return await adminRepository.deleteUser(userId);
    }

    async updateUserAdminStatus(userId: string, adminId: string, isAdmin: boolean) {
        const userToUpdate = await adminRepository.getUserById(userId);
        if (!userToUpdate) throw new Error('User not found');

        if (userToUpdate.id === adminId && !isAdmin) {
            throw new Error('Cannot remove your own admin status');
        }

        const updatedUser = await adminRepository.updateUser(userId, { isAdmin });
        if (!updatedUser) throw new Error('Failed to update user');

        const { password, ...sanitizedUser } = updatedUser as any;
        return sanitizedUser;
    }

    async getTodaysOrders() {
        return await adminRepository.getTodaysOrders();
    }

    async listSupportTickets(status: string, limit: number, offset: number) {
        return await adminRepository.listAllSupportTickets(status, limit, offset);
    }

    async getSupportTicketDetails(ticketId: string) {
        const ticket = await adminRepository.getSupportTicket(ticketId);
        if (!ticket) return null;

        const responses = await adminRepository.listSupportTicketResponses(ticketId);
        const user = await adminRepository.getUserById(ticket.userId);

        return {
            ticket,
            responses,
            user: user ? { id: user.id, name: user.name, email: user.email } : null
        };
    }

    async updateSupportTicket(ticketId: string, updates: any) {
        return await adminRepository.updateSupportTicket(ticketId, updates);
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

        // Send email notification to user
        try {
            const user = await adminRepository.getUserById(ticket.userId);
            if (user) {
                const ticketUrl = `https://myones.ai/support/tickets/${ticketId}`;
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

        const analysisPrompt = `You are analyzing user conversations from ONES AI, a personalized supplement platform. 
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
            model: 'gpt-4o',
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
        return await adminRepository.updateOrderStatus(orderId, status, trackingUrl);
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

    async exportOrders(startDate?: Date, endDate?: Date) {
        const orders = await adminRepository.exportOrders(startDate, endDate);
        const headers = ['Order ID', 'User Name', 'User Email', 'Status', 'Amount', 'Supply (Days)', 'Placed At', 'Shipped At'];
        const rows = orders.map(o => [
            o.id,
            `"${(o.userName || '').replace(/"/g, '""')}"`,
            o.userEmail,
            o.status,
            `$${(o.amountCents / 100).toFixed(2)}`,
            o.supplyMonths ? o.supplyMonths * 30 : 90,
            o.placedAt,
            o.shippedAt || ''
        ].join(','));
        return [headers.join(','), ...rows].join('\n');
    }
}

export const adminService = new AdminService();
