import { db } from '../../infra/db/db';
import {
    users,
    formulas,
    orders,
    supportTickets,
    supportTicketResponses,
    chatSessions,
    messages,
    fileUploads,
    healthProfiles,
    appSettings,
    userAdminNotes,
    wearableConnections,
    type User,
    type Formula,
    type Order,
    type SupportTicket,
    type SupportTicketResponse,
    type ChatSession,
    type Message,
    type FileUpload,
    type HealthProfile,
    type InsertSupportTicketResponse,
    type WearableConnection
} from '@shared/schema';
import { eq, desc, and, gte, lte, lt, gt, or, ilike, sql, count, inArray, isNotNull } from 'drizzle-orm';
import { decryptToken } from '../../utils/tokenEncryption';

export class AdminRepository {
    async getAdminStats(): Promise<{
        totalUsers: number;
        totalPaidUsers: number;
        totalRevenue: number;
        activeUsers: number;
        totalOrders: number;
        totalFormulas: number;
    }> {
        try {
            const [userStats] = await db.select({ count: count() }).from(users);
            const totalUsers = Number(userStats?.count || 0);

            const [formulaStats] = await db.select({ count: count() }).from(formulas);
            const totalFormulas = Number(formulaStats?.count || 0);

            const [orderStats] = await db.select({ count: count() }).from(orders);
            const totalOrders = Number(orderStats?.count || 0);

            const paidUsersResult = await db
                .selectDistinct({ userId: orders.userId })
                .from(orders);
            const totalPaidUsers = paidUsersResult.length;

            const usersWithFormulas = await db
                .selectDistinct({ userId: formulas.userId })
                .from(formulas);
            const activeUsers = usersWithFormulas.length;

            const [revenueStats] = await db
                .select({ totalRevenueCents: sql<number>`COALESCE(SUM(amount_cents), 0)` })
                .from(orders);
            const totalRevenue = Number(revenueStats?.totalRevenueCents || 0) / 100;

            return {
                totalUsers,
                totalPaidUsers,
                totalRevenue,
                activeUsers,
                totalOrders,
                totalFormulas
            };
        } catch (error) {
            console.error('Error getting admin stats:', error);
            return {
                totalUsers: 0,
                totalPaidUsers: 0,
                totalRevenue: 0,
                activeUsers: 0,
                totalOrders: 0,
                totalFormulas: 0
            };
        }
    }

    async getUserGrowthData(days: number): Promise<Array<{ date: string; users: number; paidUsers: number }>> {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const dailyUsers = await db
                .select({
                    date: sql<string>`DATE(created_at)`,
                    count: count()
                })
                .from(users)
                .where(gte(users.createdAt, startDate))
                .groupBy(sql`DATE(created_at)`)
                .orderBy(sql`DATE(created_at)`);

            const paidUserIds = await db
                .selectDistinct({ userId: orders.userId, orderDate: sql<string>`DATE(placed_at)` })
                .from(orders)
                .where(gte(orders.placedAt, startDate));

            let cumulativeUsers = 0;
            let cumulativePaid = 0;

            const paidByDate = new Map<string, number>();
            paidUserIds.forEach(({ orderDate }) => {
                paidByDate.set(orderDate, (paidByDate.get(orderDate) || 0) + 1);
            });

            return dailyUsers.map(row => {
                cumulativeUsers += Number(row.count);
                cumulativePaid += (paidByDate.get(row.date) || 0);

                return {
                    date: row.date,
                    users: cumulativeUsers,
                    paidUsers: cumulativePaid
                };
            });
        } catch (error) {
            console.error('Error getting user growth data:', error);
            return [];
        }
    }

    async getRevenueData(days: number): Promise<Array<{ date: string; revenue: number; orders: number }>> {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const revenueData = await db
                .select({
                    date: sql<string>`DATE(placed_at)`,
                    orders: count(),
                    revenueCents: sql<number>`COALESCE(SUM(amount_cents), 0)`
                })
                .from(orders)
                .where(gte(orders.placedAt, startDate))
                .groupBy(sql`DATE(placed_at)`)
                .orderBy(sql`DATE(placed_at)`);

            return revenueData.map(row => ({
                date: row.date,
                revenue: Number(row.revenueCents || 0) / 100,
                orders: Number(row.orders)
            }));
        } catch (error) {
            console.error('Error getting revenue data:', error);
            return [];
        }
    }

    async searchUsers(query: string, limit: number, offset: number, filter: string = 'all'): Promise<{ users: User[]; total: number }> {
        try {
            const searchPattern = `%${query}%`;
            const searchCondition = or(
                ilike(users.email, searchPattern),
                ilike(users.name, searchPattern),
                ilike(users.phone, searchPattern)
            );

            let whereClause = searchCondition;

            if (filter === 'paid') {
                const paidUserIds = await db.selectDistinct({ userId: orders.userId }).from(orders);
                const paidIds = paidUserIds.map(p => p.userId);
                if (paidIds.length === 0) {
                    return { users: [], total: 0 };
                }
                whereClause = and(searchCondition, inArray(users.id, paidIds));
            } else if (filter === 'active') {
                const activeUserIds = await db.selectDistinct({ userId: formulas.userId }).from(formulas);
                const activeIds = activeUserIds.map(a => a.userId);
                if (activeIds.length === 0) {
                    return { users: [], total: 0 };
                }
                whereClause = and(searchCondition, inArray(users.id, activeIds));
            }

            const userQuery = db
                .select()
                .from(users)
                .where(whereClause)
                .orderBy(desc(users.createdAt))
                .limit(limit)
                .offset(offset);

            const countQuery = db
                .select({ count: count() })
                .from(users)
                .where(whereClause);

            const [foundUsers, countRows] = await Promise.all([
                userQuery,
                countQuery
            ]);

            return {
                users: foundUsers,
                total: Number(countRows?.[0]?.count || 0)
            };
        } catch (error) {
            console.error('Error searching users:', error);
            return { users: [], total: 0 };
        }
    }

    async getTodaysOrders(): Promise<Array<Order & { user: { id: string; name: string; email: string }; formula?: Formula }>> {
        try {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            const todayOrders = await db
                .select()
                .from(orders)
                .where(gte(orders.placedAt, todayStart))
                .orderBy(desc(orders.placedAt));

            const enrichedOrders = await Promise.all(
                todayOrders.map(async (order) => {
                    const [user] = await db.select({
                        id: users.id,
                        name: users.name,
                        email: users.email
                    }).from(users).where(eq(users.id, order.userId));

                    const [formula] = await db
                        .select()
                        .from(formulas)
                        .where(
                            and(
                                eq(formulas.userId, order.userId),
                                eq(formulas.version, order.formulaVersion)
                            )
                        );

                    return { ...order, user, formula };
                })
            );

            return enrichedOrders;
        } catch (error) {
            console.error('Error getting today\'s orders:', error);
            return [];
        }
    }

    async getUserTimeline(userId: string): Promise<{
        user: User;
        healthProfile?: HealthProfile;
        formulas: Formula[];
        orders: Array<Order & { formula?: Formula }>;
        chatSessions: ChatSession[];
        fileUploads: FileUpload[];
    }> {
        try {
            const [user] = await db.select().from(users).where(eq(users.id, userId));
            if (!user) {
                throw new Error('User not found');
            }

            const [healthProfile] = await db.select().from(healthProfiles).where(eq(healthProfiles.userId, userId));
            const userFormulas = await db.select().from(formulas).where(eq(formulas.userId, userId)).orderBy(desc(formulas.createdAt));
            const userOrders = await db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.placedAt));
            const userChatSessions = await db.select().from(chatSessions).where(eq(chatSessions.userId, userId)).orderBy(desc(chatSessions.createdAt));
            const userFileUploads = await db.select().from(fileUploads).where(eq(fileUploads.userId, userId)).orderBy(desc(fileUploads.uploadedAt));

            const enrichedOrders = await Promise.all(
                userOrders.map(async (order) => {
                    const [formula] = await db
                        .select()
                        .from(formulas)
                        .where(
                            and(
                                eq(formulas.userId, userId),
                                eq(formulas.version, order.formulaVersion)
                            )
                        );
                    return { ...order, formula };
                })
            );

            return {
                user,
                healthProfile: healthProfile || undefined,
                formulas: userFormulas,
                orders: enrichedOrders,
                chatSessions: userChatSessions,
                fileUploads: userFileUploads
            };
        } catch (error) {
            console.error('Error getting user timeline:', error);
            throw error;
        }
    }

    async listAllSupportTickets(status?: string, limit: number = 50, offset: number = 0): Promise<{ tickets: Array<SupportTicket & { userName: string, userEmail: string }>, total: number }> {
        try {
            let whereClause = undefined;
            if (status && status !== 'all') {
                whereClause = eq(supportTickets.status, status as any);
            }

            const [countResult] = await db
                .select({ count: count() })
                .from(supportTickets)
                .where(whereClause);

            const ticketList = await db
                .select({
                    ticket: supportTickets,
                    userName: users.name,
                    userEmail: users.email
                })
                .from(supportTickets)
                .innerJoin(users, eq(supportTickets.userId, users.id))
                .where(whereClause)
                .orderBy(desc(supportTickets.createdAt))
                .limit(limit)
                .offset(offset);

            return {
                tickets: ticketList.map(t => ({ ...t.ticket, userName: t.userName, userEmail: t.userEmail })),
                total: Number(countResult?.count || 0)
            };
        } catch (error) {
            console.error('Error listing all support tickets:', error);
            return { tickets: [], total: 0 };
        }
    }

    async getSupportTicket(id: string): Promise<SupportTicket | undefined> {
        try {
            const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, id));
            return ticket || undefined;
        } catch (error) {
            console.error('Error getting support ticket:', error);
            return undefined;
        }
    }

    async listSupportTicketResponses(ticketId: string): Promise<SupportTicketResponse[]> {
        try {
            return await db
                .select()
                .from(supportTicketResponses)
                .where(eq(supportTicketResponses.ticketId, ticketId))
                .orderBy(supportTicketResponses.createdAt);
        } catch (error) {
            console.error('Error listing support ticket responses:', error);
            return [];
        }
    }

    async createSupportTicketResponse(response: InsertSupportTicketResponse): Promise<SupportTicketResponse> {
        try {
            const [created] = await db.insert(supportTicketResponses).values(response).returning();
            return created;
        } catch (error) {
            console.error('Error creating support ticket response:', error);
            throw new Error('Failed to create support ticket response');
        }
    }

    async updateSupportTicket(id: string, updates: Partial<SupportTicket>): Promise<SupportTicket | undefined> {
        try {
            const [updated] = await db
                .update(supportTickets)
                .set({ ...updates, updatedAt: new Date() })
                .where(eq(supportTickets.id, id))
                .returning();
            return updated || undefined;
        } catch (error) {
            console.error('Error updating support ticket:', error);
            return undefined;
        }
    }

    async getAllUserMessages(limit: number = 1000, startDate?: Date, endDate?: Date): Promise<{
        messages: Array<{
            content: string;
            createdAt: Date;
            sessionId: string;
            userId: string;
        }>;
        total: number;
    }> {
        try {
            const dateConditions = [eq(messages.role, 'user')];
            if (startDate) {
                dateConditions.push(gte(messages.createdAt, startDate));
            }
            if (endDate) {
                dateConditions.push(lte(messages.createdAt, endDate));
            }

            const [{ count: totalCount }] = await db
                .select({ count: sql<number>`count(*)` })
                .from(messages)
                .where(and(...dateConditions));

            const userMessages = await db
                .select({
                    content: messages.content,
                    createdAt: messages.createdAt,
                    sessionId: messages.sessionId,
                    userId: chatSessions.userId
                })
                .from(messages)
                .innerJoin(chatSessions, eq(messages.sessionId, chatSessions.id))
                .where(and(...dateConditions))
                .orderBy(desc(messages.createdAt))
                .limit(limit);

            return {
                messages: userMessages,
                total: Number(totalCount)
            };
        } catch (error) {
            console.error('Error getting user messages:', error);
            throw new Error('Failed to get user messages');
        }
    }

    async getAllConversations(limit: number = 50, offset: number = 0, startDate?: Date, endDate?: Date): Promise<{
        conversations: Array<{
            session: ChatSession;
            user: { id: string; name: string; email: string };
            messages: Message[];
            messageCount: number;
        }>;
        total: number;
    }> {
        try {
            const dateConditions = [];
            if (startDate) {
                dateConditions.push(gte(chatSessions.createdAt, startDate));
            }
            if (endDate) {
                dateConditions.push(lte(chatSessions.createdAt, endDate));
            }

            const [{ count: totalCount }] = await db
                .select({ count: sql<number>`count(*)` })
                .from(chatSessions)
                .where(dateConditions.length > 0 ? and(...dateConditions) : undefined);

            const sessionsWithUsers = await db
                .select({
                    session: chatSessions,
                    userId: users.id,
                    userName: users.name,
                    userEmail: users.email
                })
                .from(chatSessions)
                .innerJoin(users, eq(chatSessions.userId, users.id))
                .where(dateConditions.length > 0 ? and(...dateConditions) : undefined)
                .orderBy(desc(chatSessions.createdAt))
                .limit(limit)
                .offset(offset);

            const conversations = await Promise.all(
                sessionsWithUsers.map(async ({ session, userId, userName, userEmail }) => {
                    const sessionMessages = await db
                        .select()
                        .from(messages)
                        .where(eq(messages.sessionId, session.id))
                        .orderBy(messages.createdAt);

                    return {
                        session,
                        user: { id: userId, name: userName, email: userEmail },
                        messages: sessionMessages,
                        messageCount: sessionMessages.length
                    };
                })
            );

            return {
                conversations,
                total: Number(totalCount)
            };
        } catch (error) {
            console.error('Error getting all conversations:', error);
            throw new Error('Failed to get conversations');
        }
    }

    async getLatestConversationInsights(): Promise<any | null> {
        try {
            const [setting] = await db
                .select()
                .from(appSettings)
                .where(eq(appSettings.key, 'conversation_insights_latest'));

            if (!setting) return null;

            const data = setting.value as any;
            return {
                ...data,
                generatedAt: new Date(data.generatedAt),
                dateRange: {
                    start: new Date(data.dateRange.start),
                    end: new Date(data.dateRange.end)
                }
            };
        } catch (error) {
            console.error('Error getting conversation insights:', error);
            return null;
        }
    }

    async saveConversationInsights(insights: any): Promise<void> {
        try {
            const insightsData = {
                ...insights,
                generatedAt: insights.generatedAt.toISOString(),
                dateRange: {
                    start: insights.dateRange.start.toISOString(),
                    end: insights.dateRange.end.toISOString()
                }
            };

            const key = `conversation_insights_${insights.generatedAt.toISOString()}`;
            await db.insert(appSettings).values({
                key,
                value: insightsData
            }).onConflictDoUpdate({
                target: appSettings.key,
                set: { value: insightsData, updatedAt: new Date() }
            });

            await db.insert(appSettings).values({
                key: 'conversation_insights_latest',
                value: insightsData
            }).onConflictDoUpdate({
                target: appSettings.key,
                set: { value: insightsData, updatedAt: new Date() }
            });
        } catch (error) {
            console.error('Error saving conversation insights:', error);
            throw new Error('Failed to save conversation insights');
        }
    }

    async getConversationDetails(sessionId: string): Promise<{
        session: ChatSession;
        user: { id: string; name: string; email: string };
        messages: Message[];
    } | null> {
        try {
            const [sessionWithUser] = await db
                .select({
                    session: chatSessions,
                    userId: users.id,
                    userName: users.name,
                    userEmail: users.email
                })
                .from(chatSessions)
                .innerJoin(users, eq(chatSessions.userId, users.id))
                .where(eq(chatSessions.id, sessionId));

            if (!sessionWithUser) return null;

            const sessionMessages = await db
                .select()
                .from(messages)
                .where(eq(messages.sessionId, sessionId))
                .orderBy(messages.createdAt);

            return {
                session: sessionWithUser.session,
                user: {
                    id: sessionWithUser.userId,
                    name: sessionWithUser.userName,
                    email: sessionWithUser.userEmail
                },
                messages: sessionMessages
            };
        } catch (error) {
            console.error('Error getting conversation details:', error);
            throw new Error('Failed to get conversation details');
        }
    }

    async getConversionFunnel(): Promise<any> {
        try {
            const [signupCount] = await db.select({ count: count() }).from(users);
            const totalSignups = Number(signupCount?.count || 0);

            const profilesComplete = await db
                .select({ userId: healthProfiles.userId })
                .from(healthProfiles)
                .where(
                    or(
                        isNotNull(healthProfiles.age),
                        isNotNull(healthProfiles.sex),
                        sql`jsonb_array_length(${healthProfiles.healthGoals}) > 0`
                    )
                );
            const profileCount = profilesComplete.length;

            const usersWithFormula = await db
                .selectDistinct({ userId: formulas.userId })
                .from(formulas);
            const formulaCount = usersWithFormula.length;

            const usersWithOrders = await db
                .selectDistinct({ userId: orders.userId })
                .from(orders);
            const firstOrderCount = usersWithOrders.length;

            const orderCounts = await db
                .select({
                    userId: orders.userId,
                    orderCount: count()
                })
                .from(orders)
                .groupBy(orders.userId);
            const reorderCount = orderCounts.filter(oc => Number(oc.orderCount) > 1).length;

            return {
                totalSignups,
                profilesComplete: profileCount,
                formulasCreated: formulaCount,
                firstOrders: firstOrderCount,
                reorders: reorderCount,
                conversionRates: {
                    signupToProfile: totalSignups > 0 ? Math.round((profileCount / totalSignups) * 100) : 0,
                    profileToFormula: profileCount > 0 ? Math.round((formulaCount / profileCount) * 100) : 0,
                    formulaToOrder: formulaCount > 0 ? Math.round((firstOrderCount / formulaCount) * 100) : 0,
                    orderToReorder: firstOrderCount > 0 ? Math.round((reorderCount / firstOrderCount) * 100) : 0,
                }
            };
        } catch (error) {
            console.error('Error getting conversion funnel:', error);
            return { totalSignups: 0, profilesComplete: 0, formulasCreated: 0, firstOrders: 0, reorders: 0, conversionRates: {} };
        }
    }

    async getCohortRetention(months: number = 6): Promise<any[]> {
        try {
            const cohorts = [];
            const now = new Date();

            for (let i = 0; i < months; i++) {
                const cohortDate = new Date(now);
                cohortDate.setMonth(cohortDate.getMonth() - i);
                const cohortStart = new Date(cohortDate.getFullYear(), cohortDate.getMonth(), 1);
                const cohortEnd = new Date(cohortDate.getFullYear(), cohortDate.getMonth() + 1, 0);
                const cohortLabel = cohortStart.toISOString().slice(0, 7);

                const cohortUsers = await db
                    .select({ id: users.id })
                    .from(users)
                    .where(and(gte(users.createdAt, cohortStart), lte(users.createdAt, cohortEnd)));
                const totalUsers = cohortUsers.length;
                const userIds = cohortUsers.map(u => u.id);

                if (totalUsers === 0 || userIds.length === 0) {
                    cohorts.push({ cohort: cohortLabel, month: i, totalUsers: 0, ordered: 0, reordered: 0, retention: 0 });
                    continue;
                }

                const orderedUsers = await db
                    .selectDistinct({ userId: orders.userId })
                    .from(orders)
                    .where(inArray(orders.userId, userIds));
                const ordered = orderedUsers.length;

                const reorderedCounts = await db
                    .select({ userId: orders.userId, cnt: count() })
                    .from(orders)
                    .where(inArray(orders.userId, userIds))
                    .groupBy(orders.userId);
                const reordered = reorderedCounts.filter(r => Number(r.cnt) > 1).length;

                const retention = ordered > 0 ? Math.round((reordered / ordered) * 100) : 0;
                cohorts.push({ cohort: cohortLabel, month: i, totalUsers, ordered, reordered, retention });
            }

            return cohorts.reverse();
        } catch (error) {
            console.error('Error getting cohort retention:', error);
            return [];
        }
    }

    async getReorderHealth(): Promise<any> {
        try {
            const now = new Date();
            const lastOrders = await db
                .select({
                    userId: orders.userId,
                    lastOrderDate: sql<Date>`MAX(placed_at)`
                })
                .from(orders)
                .groupBy(orders.userId);

            const dueSoon = [];
            const overdue = [];
            const atRisk = [];
            let healthyCount = 0;

            for (const row of lastOrders) {
                const lastDate = new Date(row.lastOrderDate);
                const daysSince = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

                const [user] = await db
                    .select({ id: users.id, name: users.name, email: users.email })
                    .from(users)
                    .where(eq(users.id, row.userId));

                if (!user) continue;

                const userInfo = {
                    userId: user.id,
                    name: user.name,
                    email: user.email,
                    daysSinceOrder: daysSince,
                    lastOrderDate: lastDate.toISOString().split('T')[0]
                };

                if (daysSince >= 100) {
                    atRisk.push(userInfo);
                } else if (daysSince >= 90) {
                    overdue.push(userInfo);
                } else if (daysSince >= 75) {
                    dueSoon.push(userInfo);
                } else {
                    healthyCount++;
                }
            }

            return {
                dueSoon: dueSoon.sort((a, b) => b.daysSinceOrder - a.daysSinceOrder),
                overdue: overdue.sort((a, b) => b.daysSinceOrder - a.daysSinceOrder),
                atRisk: atRisk.sort((a, b) => b.daysSinceOrder - a.daysSinceOrder),
                summary: {
                    dueSoonCount: dueSoon.length,
                    overdueCount: overdue.length,
                    atRiskCount: atRisk.length,
                    healthyCount
                }
            };
        } catch (error) {
            console.error('Error getting reorder health:', error);
            return { dueSoon: [], overdue: [], atRisk: [], summary: {} };
        }
    }

    async getFormulaInsights(): Promise<{
        totalFormulas: number;
        averageIngredients: number;
        averageTotalMg: number;
        popularBases: Array<{ name: string; count: number; percentage: number }>;
        popularAdditions: Array<{ name: string; count: number; percentage: number }>;
        customizationRate: number;
        unusedSystemSupports: string[];
        unusedIndividuals: string[];
        totalAvailableSystemSupports: number;
        totalAvailableIndividuals: number;
    }> {
        // Import ingredient catalogs
        const { SYSTEM_SUPPORTS, INDIVIDUAL_INGREDIENTS } = await import('@shared/ingredients');

        try {
            const allFormulas = await db.select().from(formulas);
            const totalFormulas = allFormulas.length;

            // Get all available ingredient names
            const allSystemSupportNames = SYSTEM_SUPPORTS.map(s => s.name);
            const allIndividualNames = INDIVIDUAL_INGREDIENTS.map(i => i.name);

            if (totalFormulas === 0) {
                return {
                    totalFormulas: 0,
                    averageIngredients: 0,
                    averageTotalMg: 0,
                    popularBases: [],
                    popularAdditions: [],
                    customizationRate: 0,
                    unusedSystemSupports: allSystemSupportNames,
                    unusedIndividuals: allIndividualNames,
                    totalAvailableSystemSupports: allSystemSupportNames.length,
                    totalAvailableIndividuals: allIndividualNames.length
                };
            }

            // Count ingredient usage
            const baseCounts: Record<string, number> = {};
            const additionCounts: Record<string, number> = {};
            let totalIngredients = 0;
            let totalMg = 0;
            let customizedCount = 0;

            for (const formula of allFormulas) {
                const bases = (formula.bases as Array<{ ingredient: string }>) || [];
                const additions = (formula.additions as Array<{ ingredient: string }>) || [];
                const customs = formula.userCustomizations as { addedBases?: Array<any>; addedIndividuals?: Array<any> } | null;

                totalIngredients += bases.length + additions.length;
                totalMg += formula.totalMg;

                for (const base of bases) {
                    baseCounts[base.ingredient] = (baseCounts[base.ingredient] || 0) + 1;
                }
                for (const add of additions) {
                    additionCounts[add.ingredient] = (additionCounts[add.ingredient] || 0) + 1;
                }

                if (customs && ((customs.addedBases?.length || 0) > 0 || (customs.addedIndividuals?.length || 0) > 0)) {
                    customizedCount++;
                }
            }

            // Find unused ingredients
            const usedSystemSupports = new Set(Object.keys(baseCounts));
            const usedIndividuals = new Set(Object.keys(additionCounts));

            const unusedSystemSupports = allSystemSupportNames.filter(name => !usedSystemSupports.has(name));
            const unusedIndividuals = allIndividualNames.filter(name => !usedIndividuals.has(name));

            // Sort and format popular ingredients
            const popularBases = Object.entries(baseCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([name, count]) => ({
                    name,
                    count,
                    percentage: Math.round((count / totalFormulas) * 100)
                }));

            const popularAdditions = Object.entries(additionCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([name, count]) => ({
                    name,
                    count,
                    percentage: Math.round((count / totalFormulas) * 100)
                }));

            return {
                totalFormulas: totalFormulas ?? 0,
                averageIngredients: Math.round(totalIngredients / totalFormulas),
                averageTotalMg: Math.round(totalMg / totalFormulas),
                popularBases: popularBases ?? [],
                popularAdditions: popularAdditions ?? [],
                customizationRate: Math.round((customizedCount / totalFormulas) * 100),
                unusedSystemSupports: unusedSystemSupports ?? [],
                unusedIndividuals: unusedIndividuals ?? [],
                totalAvailableSystemSupports: allSystemSupportNames.length,
                totalAvailableIndividuals: allIndividualNames.length
            };
        } catch (error) {
            console.error('Error getting formula insights:', error);
            return {
                totalFormulas: 0,
                averageIngredients: 0,
                averageTotalMg: 0,
                popularBases: [],
                popularAdditions: [],
                customizationRate: 0,
                unusedSystemSupports: [],
                unusedIndividuals: [],
                totalAvailableSystemSupports: 0,
                totalAvailableIndividuals: 0
            };
        }
    }

    async getPendingActions(): Promise<any> {
        try {
            const [ticketCount] = await db.select({ count: count() }).from(supportTickets).where(eq(supportTickets.status, 'open'));
            const [pendingCount] = await db.select({ count: count() }).from(orders).where(eq(orders.status, 'pending'));
            const [processingCount] = await db.select({ count: count() }).from(orders).where(eq(orders.status, 'processing'));
            const reorderHealth = await this.getReorderHealth();

            return {
                openTickets: Number(ticketCount?.count || 0),
                pendingOrders: Number(pendingCount?.count || 0),
                processingOrders: Number(processingCount?.count || 0),
                reordersdue: reorderHealth.summary.dueSoonCount,
                overdueReorders: reorderHealth.summary.overdueCount + reorderHealth.summary.atRiskCount
            };
        } catch (error) {
            console.error('Error getting pending actions:', error);
            return {};
        }
    }

    async getActivityFeed(limit: number = 20): Promise<any[]> {
        try {
            const activities: any[] = [];

            const recentUsers = await db.select().from(users).orderBy(desc(users.createdAt)).limit(limit);
            for (const u of recentUsers) {
                activities.push({ type: 'signup', id: u.id, userId: u.id, userName: u.name, description: `${u.name} signed up`, timestamp: u.createdAt });
            }

            const recentOrders = await db.select().from(orders).orderBy(desc(orders.placedAt)).limit(limit);
            for (const o of recentOrders) {
                const [user] = await db.select({ name: users.name }).from(users).where(eq(users.id, o.userId));
                activities.push({ type: 'order', id: o.id, userId: o.userId, userName: user?.name || 'Unknown', description: `${user?.name || 'Unknown'} placed an order`, timestamp: o.placedAt, metadata: { status: o.status, amountCents: o.amountCents } });
            }

            const recentFormulas = await db.select().from(formulas).orderBy(desc(formulas.createdAt)).limit(limit);
            for (const f of recentFormulas) {
                const [user] = await db.select({ name: users.name }).from(users).where(eq(users.id, f.userId));
                activities.push({ type: 'formula', id: f.id, userId: f.userId, userName: user?.name || 'Unknown', description: `${user?.name || 'Unknown'} ${f.version > 1 ? 'updated' : 'created'} their formula`, timestamp: f.createdAt, metadata: { version: f.version, totalMg: f.totalMg } });
            }

            const recentTickets = await db.select().from(supportTickets).orderBy(desc(supportTickets.createdAt)).limit(limit);
            for (const t of recentTickets) {
                const [user] = await db.select({ name: users.name }).from(users).where(eq(users.id, t.userId));
                activities.push({ type: 'ticket', id: t.id, userId: t.userId, userName: user?.name || 'Unknown', description: `${user?.name || 'Unknown'} opened a support ticket: ${t.subject}`, timestamp: t.createdAt, metadata: { status: t.status, subject: t.subject } });
            }

            return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
        } catch (error) {
            console.error('Error getting activity feed:', error);
            return [];
        }
    }

    async getAllOrders(options: any): Promise<{ orders: any[], total: number }> {
        try {
            const { status, limit = 50, offset = 0, startDate, endDate } = options;
            let whereConditions = [];
            if (status && status !== 'all') whereConditions.push(eq(orders.status, status as any));
            if (startDate) whereConditions.push(gte(orders.placedAt, startDate));
            if (endDate) whereConditions.push(lte(orders.placedAt, endDate));

            const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
            const [countResult] = await db.select({ count: count() }).from(orders).where(whereClause);
            const orderList = await db.select().from(orders).where(whereClause).orderBy(desc(orders.placedAt)).limit(limit).offset(offset);

            const enrichedOrders = await Promise.all(
                orderList.map(async (order) => {
                    const [user] = await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.id, order.userId));
                    const [formula] = await db.select().from(formulas).where(and(eq(formulas.userId, order.userId), eq(formulas.version, order.formulaVersion)));
                    return { ...order, user, formula };
                })
            );

            return { orders: enrichedOrders, total: Number(countResult?.count || 0) };
        } catch (error) {
            console.error('Error getting all orders:', error);
            return { orders: [], total: 0 };
        }
    }

    async updateOrderStatus(id: string, status: string, trackingUrl?: string): Promise<Order | undefined> {
        try {
            const [order] = await db.update(orders).set({ status: status as any, trackingUrl, shippedAt: status === 'shipped' ? new Date() : undefined }).where(eq(orders.id, id)).returning();
            return order || undefined;
        } catch (error) {
            console.error('Error updating order status:', error);
            return undefined;
        }
    }

    async getUserAdminNotes(userId: string): Promise<any[]> {
        try {
            const notes = await db.select().from(userAdminNotes).where(eq(userAdminNotes.userId, userId)).orderBy(desc(userAdminNotes.createdAt));
            return await Promise.all(notes.map(async (note) => {
                const [admin] = await db.select({ name: users.name }).from(users).where(eq(users.id, note.adminId));
                return { ...note, adminName: admin?.name || 'Unknown' };
            }));
        } catch (error) {
            console.error('Error getting user admin notes:', error);
            return [];
        }
    }

    async addUserAdminNote(userId: string, adminId: string, content: string): Promise<any> {
        try {
            const [note] = await db.insert(userAdminNotes).values({ userId, adminId, content }).returning();
            const [admin] = await db.select({ name: users.name }).from(users).where(eq(users.id, adminId));
            return { ...note, adminName: admin?.name || 'Unknown' };
        } catch (error) {
            console.error('Error adding user admin note:', error);
            throw new Error('Failed to add admin note');
        }
    }

    async exportUsers(filter: string = 'all'): Promise<any[]> {
        try {
            let userList = await db.select().from(users).orderBy(desc(users.createdAt));
            if (filter === 'paid') {
                const paidUserIds = await db.selectDistinct({ userId: orders.userId }).from(orders);
                const paidIds = new Set(paidUserIds.map(p => p.userId));
                userList = userList.filter(u => paidIds.has(u.id));
            } else if (filter === 'active') {
                const activeUserIds = await db.selectDistinct({ userId: formulas.userId }).from(formulas);
                const activeIds = new Set(activeUserIds.map(a => a.userId));
                userList = userList.filter(u => activeIds.has(u.id));
            }

            return await Promise.all(userList.map(async (user) => {
                const [formulaExists] = await db.select({ id: formulas.id }).from(formulas).where(eq(formulas.userId, user.id)).limit(1);
                const userOrders = await db.select({ amountCents: orders.amountCents }).from(orders).where(eq(orders.userId, user.id));
                const totalSpent = userOrders.reduce((sum, o) => sum + (o.amountCents || 0), 0);
                return { id: user.id, name: user.name, email: user.email, phone: user.phone, createdAt: user.createdAt.toISOString(), hasFormula: !!formulaExists, orderCount: userOrders.length, totalSpent };
            }));
        } catch (error) {
            console.error('Error exporting users:', error);
            return [];
        }
    }

    async exportOrders(startDate?: Date, endDate?: Date): Promise<any[]> {
        try {
            let whereConditions = [];
            if (startDate) whereConditions.push(gte(orders.placedAt, startDate));
            if (endDate) whereConditions.push(lte(orders.placedAt, endDate));
            const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
            const orderList = await db.select().from(orders).where(whereClause).orderBy(desc(orders.placedAt));

            return await Promise.all(orderList.map(async (order) => {
                const [user] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, order.userId));
                return { id: order.id, userName: user?.name || 'Unknown', userEmail: user?.email || 'Unknown', status: order.status, amountCents: order.amountCents || 0, supplyMonths: order.supplyMonths, placedAt: order.placedAt.toISOString(), shippedAt: order.shippedAt?.toISOString() || null };
            }));
        } catch (error) {
            console.error('Error exporting orders:', error);
            return [];
        }
    }

    // Common operations used by Admin
    async getUserById(id: string): Promise<User | undefined> {
        const [user] = await db.select().from(users).where(eq(users.id, id));
        return user || undefined;
    }

    async updateUser(id: string, updates: any): Promise<User | undefined> {
        const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
        return user || undefined;
    }

    async deleteUser(id: string): Promise<boolean> {
        const result = await db.delete(users).where(eq(users.id, id)).returning();
        return result.length > 0;
    }
}

export const adminRepository = new AdminRepository();
