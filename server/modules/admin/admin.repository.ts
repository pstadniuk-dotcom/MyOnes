import { logger } from '../../infra/logging/logger';
import { db } from '../../infra/db/db';
import {
    users,
    formulas,
    orders,
    supportTickets,
    supportTicketResponses,
    supportTicketActivityLog,
    chatSessions,
    messages,
    fileUploads,
    healthProfiles,
    appSettings,
    ingredientPricing,
    userAdminNotes,
    wearableConnections,
    aiUsageLogs,
    referralEvents,
    marketingCampaigns,
    influencers,
    influencerContent,
    b2bProspects,
    b2bOutreach,
    type User,
    type Formula,
    type Order,
    type SupportTicket,
    type SupportTicketResponse,
    type InsertSupportTicketActivityLog,
    type ChatSession,
    type Message,
    type FileUpload,
    type HealthProfile,
    type InsertSupportTicketResponse,
    type WearableConnection,
    type IngredientPricing,
    type MarketingCampaign,
    type InsertMarketingCampaign,
    type Influencer,
    type InsertInfluencer,
    type InfluencerContent,
    type InsertInfluencerContent,
    type B2bProspect,
    type InsertB2bProspect,
    type B2bOutreach,
    type InsertB2bOutreach,
} from '@shared/schema';
import { eq, desc, asc, and, gte, lte, lt, gt, or, ilike, sql, count, inArray, isNotNull, sum, not, ne } from 'drizzle-orm';
import { decryptToken } from '../../utils/tokenEncryption';
import { decryptField } from '../../infra/security/fieldEncryption';

/**
 * Decrypt message content with fallback for legacy plaintext messages.
 * Returns original content if decryption fails (pre-encryption data).
 */
function decryptMessageContent(content: string): string {
    try {
        return decryptField(content);
    } catch {
        return content; // legacy plaintext
    }
}

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
            logger.error('Error getting admin stats', { error });
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

    async getEnhancedStats(days: number = 30): Promise<{
        totalUsers: number;
        totalRevenue: number;
        totalOrders: number;
        totalFormulas: number;
        trends: {
            users: { current: number; previous: number; changePercent: number };
            revenue: { current: number; previous: number; changePercent: number };
            orders: { current: number; previous: number; changePercent: number };
            formulas: { current: number; previous: number; changePercent: number };
        };
        sparklines: {
            users: number[];
            revenue: number[];
            orders: number[];
        };
    }> {
        try {
            const now = new Date();
            const currentStart = new Date();
            currentStart.setDate(now.getDate() - days);
            const previousStart = new Date();
            previousStart.setDate(currentStart.getDate() - days);

            // Totals
            const [userStats] = await db.select({ count: count() }).from(users);
            const totalUsers = Number(userStats?.count || 0);
            const [formulaStats] = await db.select({ count: count() }).from(formulas);
            const totalFormulas = Number(formulaStats?.count || 0);
            const [orderStats] = await db.select({ count: count() }).from(orders);
            const totalOrders = Number(orderStats?.count || 0);
            const [revenueStats] = await db
                .select({ total: sql<number>`COALESCE(SUM(amount_cents), 0)` })
                .from(orders);
            const totalRevenue = Number(revenueStats?.total || 0) / 100;

            // Current period counts
            const [currentUsers] = await db.select({ count: count() }).from(users)
                .where(gte(users.createdAt, currentStart));
            const [previousUsers] = await db.select({ count: count() }).from(users)
                .where(and(gte(users.createdAt, previousStart), lt(users.createdAt, currentStart)));

            const [currentOrders] = await db.select({ count: count() }).from(orders)
                .where(gte(orders.placedAt, currentStart));
            const [previousOrders] = await db.select({ count: count() }).from(orders)
                .where(and(gte(orders.placedAt, previousStart), lt(orders.placedAt, currentStart)));

            const [currentRevenue] = await db
                .select({ total: sql<number>`COALESCE(SUM(amount_cents), 0)` })
                .from(orders).where(gte(orders.placedAt, currentStart));
            const [previousRevenue] = await db
                .select({ total: sql<number>`COALESCE(SUM(amount_cents), 0)` })
                .from(orders).where(and(gte(orders.placedAt, previousStart), lt(orders.placedAt, currentStart)));

            const [currentFormulas] = await db.select({ count: count() }).from(formulas)
                .where(gte(formulas.createdAt, currentStart));
            const [previousFormulas] = await db.select({ count: count() }).from(formulas)
                .where(and(gte(formulas.createdAt, previousStart), lt(formulas.createdAt, currentStart)));

            const calcChange = (curr: number, prev: number) =>
                prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100);

            const cUsers = Number(currentUsers?.count || 0);
            const pUsers = Number(previousUsers?.count || 0);
            const cOrders = Number(currentOrders?.count || 0);
            const pOrders = Number(previousOrders?.count || 0);
            const cRevenue = Number(currentRevenue?.total || 0) / 100;
            const pRevenue = Number(previousRevenue?.total || 0) / 100;
            const cFormulas = Number(currentFormulas?.count || 0);
            const pFormulas = Number(previousFormulas?.count || 0);

            // Sparkline data: daily counts for last 7 days
            const sparklineStart = new Date();
            sparklineStart.setDate(now.getDate() - 7);

            const dailyUsers = await db
                .select({ date: sql<string>`DATE(created_at)`, count: count() })
                .from(users)
                .where(gte(users.createdAt, sparklineStart))
                .groupBy(sql`DATE(created_at)`)
                .orderBy(sql`DATE(created_at)`);

            const dailyOrders = await db
                .select({ date: sql<string>`DATE(placed_at)`, count: count() })
                .from(orders)
                .where(gte(orders.placedAt, sparklineStart))
                .groupBy(sql`DATE(placed_at)`)
                .orderBy(sql`DATE(placed_at)`);

            const dailyRevenue = await db
                .select({ date: sql<string>`DATE(placed_at)`, total: sql<number>`COALESCE(SUM(amount_cents), 0)` })
                .from(orders)
                .where(gte(orders.placedAt, sparklineStart))
                .groupBy(sql`DATE(placed_at)`)
                .orderBy(sql`DATE(placed_at)`);

            // Fill in missing days with 0
            const fillSparkline = (data: Array<{ date: string; count?: number; total?: number }>, useTotal = false): number[] => {
                const map = new Map<string, number>();
                data.forEach(d => map.set(d.date, useTotal ? Number(d.total || 0) / 100 : Number(d.count || 0)));
                const result: number[] = [];
                for (let i = 6; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(now.getDate() - i);
                    const key = d.toISOString().split('T')[0];
                    result.push(map.get(key) || 0);
                }
                return result;
            };

            return {
                totalUsers,
                totalRevenue,
                totalOrders,
                totalFormulas,
                trends: {
                    users: { current: cUsers, previous: pUsers, changePercent: calcChange(cUsers, pUsers) },
                    revenue: { current: cRevenue, previous: pRevenue, changePercent: calcChange(cRevenue, pRevenue) },
                    orders: { current: cOrders, previous: pOrders, changePercent: calcChange(cOrders, pOrders) },
                    formulas: { current: cFormulas, previous: pFormulas, changePercent: calcChange(cFormulas, pFormulas) },
                },
                sparklines: {
                    users: fillSparkline(dailyUsers),
                    revenue: fillSparkline(dailyRevenue, true),
                    orders: fillSparkline(dailyOrders),
                },
            };
        } catch (error) {
            logger.error('Error getting enhanced stats', { error });
            return {
                totalUsers: 0, totalRevenue: 0, totalOrders: 0, totalFormulas: 0,
                trends: {
                    users: { current: 0, previous: 0, changePercent: 0 },
                    revenue: { current: 0, previous: 0, changePercent: 0 },
                    orders: { current: 0, previous: 0, changePercent: 0 },
                    formulas: { current: 0, previous: 0, changePercent: 0 },
                },
                sparklines: { users: [], revenue: [], orders: [] },
            };
        }
    }

    async getFinancialMetrics(): Promise<{
        mrr: number;
        arr: number;
        averageOrderValue: number;
        ltv: number;
        totalCustomers: number;
        churnRate: number;
        reorderRate: number;
    }> {
        try {
            // Total revenue and orders
            const [revStats] = await db
                .select({
                    totalRevenueCents: sql<number>`COALESCE(SUM(amount_cents), 0)`,
                    totalOrders: count(),
                })
                .from(orders);

            const totalRevenueCents = Number(revStats?.totalRevenueCents || 0);
            const totalOrders = Number(revStats?.totalOrders || 0);
            const averageOrderValue = totalOrders > 0 ? totalRevenueCents / totalOrders / 100 : 0;

            // Distinct paying customers
            const payingCustomers = await db.selectDistinct({ userId: orders.userId }).from(orders);
            const totalCustomers = payingCustomers.length;

            // LTV = total revenue / total customers
            const ltv = totalCustomers > 0 ? totalRevenueCents / 100 / totalCustomers : 0;

            // Revenue in last 30 days for MRR approximation
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const [recentRev] = await db
                .select({ total: sql<number>`COALESCE(SUM(amount_cents), 0)` })
                .from(orders)
                .where(gte(orders.placedAt, thirtyDaysAgo));
            const mrr = Number(recentRev?.total || 0) / 100;
            const arr = mrr * 12;

            // Reorder rate: users with 2+ orders / users with 1+ orders
            const orderCounts = await db
                .select({ userId: orders.userId, cnt: count() })
                .from(orders)
                .groupBy(orders.userId);
            const repeatCustomers = orderCounts.filter(c => Number(c.cnt) >= 2).length;
            const reorderRate = totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0;

            // Churn rate: users who ordered 60+ days ago but not in last 60 days
            const sixtyDaysAgo = new Date();
            sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
            const recentOrderUsers = await db
                .selectDistinct({ userId: orders.userId })
                .from(orders)
                .where(gte(orders.placedAt, sixtyDaysAgo));
            const recentSet = new Set(recentOrderUsers.map(r => r.userId));
            const churned = payingCustomers.filter(c => !recentSet.has(c.userId)).length;
            const churnRate = totalCustomers > 0 ? Math.round((churned / totalCustomers) * 100) : 0;

            return {
                mrr: Math.round(mrr * 100) / 100,
                arr: Math.round(arr * 100) / 100,
                averageOrderValue: Math.round(averageOrderValue * 100) / 100,
                ltv: Math.round(ltv * 100) / 100,
                totalCustomers,
                churnRate,
                reorderRate,
            };
        } catch (error) {
            logger.error('Error getting financial metrics', { error });
            return { mrr: 0, arr: 0, averageOrderValue: 0, ltv: 0, totalCustomers: 0, churnRate: 0, reorderRate: 0 };
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
            logger.error('Error getting user growth data', { error });
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
            logger.error('Error getting revenue data', { error });
            return [];
        }
    }

    async searchUsers(
        query: string,
        limit: number,
        offset: number,
        filter: string = 'all',
        advancedFilters?: {
            hasDevices?: boolean;
            deviceProviders?: string[];
            hasLabResults?: boolean;
            hasOrders?: boolean;
            minOrders?: number;
            maxOrders?: number;
        },
        sortBy?: string
    ): Promise<{ users: (User & { aiCostCents?: number; aiCallCount?: number })[]; total: number }> {
        try {
            const searchPattern = `%${query}%`;
            const searchCondition = or(
                ilike(users.email, searchPattern),
                ilike(users.name, searchPattern),
                ilike(users.phone, searchPattern)
            );

            // Collect user ID sets for each filter, then intersect
            let candidateIds: string[] | null = null; // null = no restriction

            // Basic filter: paid / active
            if (filter === 'paid') {
                const paidUserIds = await db.selectDistinct({ userId: orders.userId }).from(orders);
                const paidIds = paidUserIds.map(p => p.userId);
                if (paidIds.length === 0) return { users: [], total: 0 };
                candidateIds = paidIds;
            } else if (filter === 'active') {
                const activeUserIds = await db.selectDistinct({ userId: formulas.userId }).from(formulas);
                const activeIds = activeUserIds.map(a => a.userId);
                if (activeIds.length === 0) return { users: [], total: 0 };
                candidateIds = activeIds;
            }

            // Helper to intersect ID sets
            const intersect = (existing: string[] | null, incoming: string[]): string[] => {
                if (existing === null) return incoming;
                const set = new Set(incoming);
                return existing.filter(id => set.has(id));
            };

            // Advanced: has devices connected
            if (advancedFilters?.hasDevices === true) {
                const connected = await db.selectDistinct({ userId: wearableConnections.userId })
                    .from(wearableConnections)
                    .where(eq(wearableConnections.status, 'connected'));
                const ids = connected.map(r => r.userId);
                if (ids.length === 0) return { users: [], total: 0 };
                candidateIds = intersect(candidateIds, ids);
                if (candidateIds.length === 0) return { users: [], total: 0 };
            } else if (advancedFilters?.hasDevices === false) {
                // Users with NO connected devices
                const connected = await db.selectDistinct({ userId: wearableConnections.userId })
                    .from(wearableConnections)
                    .where(eq(wearableConnections.status, 'connected'));
                const connectedSet = new Set(connected.map(r => r.userId));
                const allUsers = await db.select({ id: users.id }).from(users);
                const noDeviceIds = allUsers.map(u => u.id).filter(id => !connectedSet.has(id));
                if (noDeviceIds.length === 0) return { users: [], total: 0 };
                candidateIds = intersect(candidateIds, noDeviceIds);
                if (candidateIds.length === 0) return { users: [], total: 0 };
            }

            // Advanced: specific device providers
            if (advancedFilters?.deviceProviders && advancedFilters.deviceProviders.length > 0) {
                const withProviders = await db.selectDistinct({ userId: wearableConnections.userId })
                    .from(wearableConnections)
                    .where(and(
                        inArray(wearableConnections.provider, advancedFilters.deviceProviders as any),
                        eq(wearableConnections.status, 'connected')
                    ));
                const ids = withProviders.map(r => r.userId);
                if (ids.length === 0) return { users: [], total: 0 };
                candidateIds = intersect(candidateIds, ids);
                if (candidateIds.length === 0) return { users: [], total: 0 };
            }

            // Advanced: has lab results
            if (advancedFilters?.hasLabResults === true) {
                const withLabs = await db.selectDistinct({ userId: fileUploads.userId })
                    .from(fileUploads)
                    .where(eq(fileUploads.type, 'lab_report'));
                const ids = withLabs.map(r => r.userId);
                if (ids.length === 0) return { users: [], total: 0 };
                candidateIds = intersect(candidateIds, ids);
                if (candidateIds.length === 0) return { users: [], total: 0 };
            } else if (advancedFilters?.hasLabResults === false) {
                const withLabs = await db.selectDistinct({ userId: fileUploads.userId })
                    .from(fileUploads)
                    .where(eq(fileUploads.type, 'lab_report'));
                const labSet = new Set(withLabs.map(r => r.userId));
                const allUsers = await db.select({ id: users.id }).from(users);
                const noLabIds = allUsers.map(u => u.id).filter(id => !labSet.has(id));
                if (noLabIds.length === 0) return { users: [], total: 0 };
                candidateIds = intersect(candidateIds, noLabIds);
                if (candidateIds.length === 0) return { users: [], total: 0 };
            }

            // Advanced: has orders
            if (advancedFilters?.hasOrders === true) {
                const withOrders = await db.selectDistinct({ userId: orders.userId }).from(orders);
                const ids = withOrders.map(r => r.userId);
                if (ids.length === 0) return { users: [], total: 0 };
                candidateIds = intersect(candidateIds, ids);
                if (candidateIds.length === 0) return { users: [], total: 0 };
            } else if (advancedFilters?.hasOrders === false) {
                const withOrders = await db.selectDistinct({ userId: orders.userId }).from(orders);
                const orderSet = new Set(withOrders.map(r => r.userId));
                const allUsers = await db.select({ id: users.id }).from(users);
                const noOrderIds = allUsers.map(u => u.id).filter(id => !orderSet.has(id));
                if (noOrderIds.length === 0) return { users: [], total: 0 };
                candidateIds = intersect(candidateIds, noOrderIds);
                if (candidateIds.length === 0) return { users: [], total: 0 };
            }

            // Advanced: min/max orders
            if (advancedFilters?.minOrders !== undefined || advancedFilters?.maxOrders !== undefined) {
                const orderCounts = await db
                    .select({ userId: orders.userId, cnt: count() })
                    .from(orders)
                    .groupBy(orders.userId);
                let filtered = orderCounts;
                if (advancedFilters.minOrders !== undefined) {
                    filtered = filtered.filter(r => Number(r.cnt) >= advancedFilters.minOrders!);
                }
                if (advancedFilters.maxOrders !== undefined) {
                    filtered = filtered.filter(r => Number(r.cnt) <= advancedFilters.maxOrders!);
                }
                const ids = filtered.map(r => r.userId);
                if (ids.length === 0) return { users: [], total: 0 };
                candidateIds = intersect(candidateIds, ids);
                if (candidateIds.length === 0) return { users: [], total: 0 };
            }

            // Build final where clause
            let whereClause = searchCondition;
            if (candidateIds !== null) {
                whereClause = and(searchCondition, inArray(users.id, candidateIds));
            }

            // Sort by AI cost (highest first) or by created date
            if (sortBy === 'aiCost') {
                // Use a subquery to get cost per user and sort by it
                const costSubquery = db
                    .select({
                        userId: aiUsageLogs.userId,
                        totalCost: sql<number>`COALESCE(SUM(${aiUsageLogs.estimatedCostCents}), 0)`.as('total_cost'),
                        callCount: sql<number>`COUNT(*)`.as('call_count'),
                    })
                    .from(aiUsageLogs)
                    .groupBy(aiUsageLogs.userId)
                    .as('ai_costs');

                const userQuery = db
                    .select({
                        user: users,
                        aiCostCents: sql<number>`COALESCE(${costSubquery.totalCost}, 0)`,
                        aiCallCount: sql<number>`COALESCE(${costSubquery.callCount}, 0)`,
                    })
                    .from(users)
                    .leftJoin(costSubquery, eq(users.id, costSubquery.userId))
                    .where(whereClause)
                    .orderBy(sql`COALESCE(${costSubquery.totalCost}, 0) DESC`)
                    .limit(limit)
                    .offset(offset);

                const countQuery = db
                    .select({ count: count() })
                    .from(users)
                    .where(whereClause);

                const [foundRows, countRows] = await Promise.all([
                    userQuery,
                    countQuery
                ]);

                const enrichedUsers = foundRows.map(row => ({
                    ...row.user,
                    aiCostCents: Number(row.aiCostCents) || 0,
                    aiCallCount: Number(row.aiCallCount) || 0,
                }));

                return {
                    users: enrichedUsers,
                    total: Number(countRows?.[0]?.count || 0)
                };
            }

            // Default: sort by created date, still enrich with AI cost
            const costSubquery = db
                .select({
                    userId: aiUsageLogs.userId,
                    totalCost: sql<number>`COALESCE(SUM(${aiUsageLogs.estimatedCostCents}), 0)`.as('total_cost'),
                    callCount: sql<number>`COUNT(*)`.as('call_count'),
                })
                .from(aiUsageLogs)
                .groupBy(aiUsageLogs.userId)
                .as('ai_costs_default');

            const userQuery = db
                .select({
                    user: users,
                    aiCostCents: sql<number>`COALESCE(${costSubquery.totalCost}, 0)`,
                    aiCallCount: sql<number>`COALESCE(${costSubquery.callCount}, 0)`,
                })
                .from(users)
                .leftJoin(costSubquery, eq(users.id, costSubquery.userId))
                .where(whereClause)
                .orderBy(desc(users.createdAt))
                .limit(limit)
                .offset(offset);

            const countQuery = db
                .select({ count: count() })
                .from(users)
                .where(whereClause);

            const [foundRows, countRows] = await Promise.all([
                userQuery,
                countQuery
            ]);

            const enrichedUsers = foundRows.map(row => ({
                ...row.user,
                aiCostCents: Number(row.aiCostCents) || 0,
                aiCallCount: Number(row.aiCallCount) || 0,
            }));

            return {
                users: enrichedUsers,
                total: Number(countRows?.[0]?.count || 0)
            };
        } catch (error) {
            logger.error('Error searching users', { error });
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
            logger.error('Error getting today\'s orders', { error });
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
        wearableDevices: Array<{ provider: string; status: string; connectedAt: Date | null; lastSyncAt: Date | null }>;
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
            const userWearables = await db.select({
                provider: wearableConnections.provider,
                status: wearableConnections.status,
                connectedAt: wearableConnections.connectedAt,
                lastSyncAt: wearableConnections.lastSyncAt,
            }).from(wearableConnections).where(eq(wearableConnections.userId, userId));

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
                fileUploads: userFileUploads,
                wearableDevices: userWearables
            };
        } catch (error) {
            logger.error('Error getting user timeline', { error });
            throw error;
        }
    }

    async listAllSupportTickets(options: {
        status?: string;
        priority?: string;
        assignedTo?: string | 'unassigned';
        category?: string;
        search?: string;
        tag?: string;
        slaBreached?: boolean;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        limit?: number;
        offset?: number;
    } = {}): Promise<{ tickets: Array<SupportTicket & { userName: string, userEmail: string }>, total: number }> {
        try {
            const {
                status, priority, assignedTo, category, search, tag,
                slaBreached, sortBy = 'createdAt', sortOrder = 'desc',
                limit = 50, offset = 0
            } = options;

            const conditions: any[] = [];
            if (status && status !== 'all') {
                conditions.push(eq(supportTickets.status, status as any));
            }
            if (priority && priority !== 'all') {
                conditions.push(eq(supportTickets.priority, priority as any));
            }
            if (assignedTo === 'unassigned') {
                conditions.push(sql`${supportTickets.assignedTo} IS NULL`);
            } else if (assignedTo) {
                conditions.push(eq(supportTickets.assignedTo, assignedTo));
            }
            if (category && category !== 'all') {
                conditions.push(eq(supportTickets.category, category));
            }
            if (search) {
                conditions.push(
                    or(
                        ilike(supportTickets.subject, `%${search}%`),
                        ilike(supportTickets.description, `%${search}%`),
                        ilike(users.name, `%${search}%`),
                        ilike(users.email, `%${search}%`)
                    )
                );
            }
            if (tag) {
                conditions.push(sql`${tag} = ANY(${supportTickets.tags})`);
            }
            if (slaBreached !== undefined) {
                conditions.push(eq(supportTickets.slaBreached, slaBreached));
            }

            const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

            // Sorting
            const sortColumnMap: Record<string, any> = {
                createdAt: supportTickets.createdAt,
                updatedAt: supportTickets.updatedAt,
                lastActivityAt: supportTickets.lastActivityAt,
                priority: supportTickets.priority,
                slaDeadline: supportTickets.slaDeadline,
            };
            const sortCol = sortColumnMap[sortBy] || supportTickets.createdAt;
            const orderFn = sortOrder === 'asc' ? asc : desc;

            const [countResult] = await db
                .select({ count: count() })
                .from(supportTickets)
                .innerJoin(users, eq(supportTickets.userId, users.id))
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
                .orderBy(orderFn(sortCol))
                .limit(limit)
                .offset(offset);

            return {
                tickets: ticketList.map(t => ({ ...t.ticket, userName: t.userName, userEmail: t.userEmail })),
                total: Number(countResult?.count || 0)
            };
        } catch (error) {
            logger.error('Error listing all support tickets', { error });
            return { tickets: [], total: 0 };
        }
    }

    async getSupportTicket(id: string): Promise<SupportTicket | undefined> {
        try {
            const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, id));
            return ticket || undefined;
        } catch (error) {
            logger.error('Error getting support ticket', { error });
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
            logger.error('Error listing support ticket responses', { error });
            return [];
        }
    }

    async createSupportTicketResponse(response: InsertSupportTicketResponse): Promise<SupportTicketResponse> {
        try {
            const [created] = await db.insert(supportTicketResponses).values(response).returning();

            // Update ticket response count and last activity
            const updateData: any = {
                updatedAt: new Date(),
                lastActivityAt: new Date(),
                responseCount: sql`${supportTickets.responseCount} + 1`,
            };

            // Set firstResponseAt if this is staff and it's the first staff response
            if (response.isStaff) {
                const existingStaffResponses = await db
                    .select({ count: count() })
                    .from(supportTicketResponses)
                    .where(and(
                        eq(supportTicketResponses.ticketId, response.ticketId),
                        eq(supportTicketResponses.isStaff, true),
                        ne(supportTicketResponses.id, created.id)
                    ));
                if (Number(existingStaffResponses[0]?.count || 0) === 0) {
                    updateData.firstResponseAt = new Date();
                }
            }

            await db.update(supportTickets)
                .set(updateData)
                .where(eq(supportTickets.id, response.ticketId));

            return created;
        } catch (error) {
            logger.error('Error creating support ticket response', { error });
            throw new Error('Failed to create support ticket response');
        }
    }

    async updateSupportTicket(id: string, updates: Partial<SupportTicket>): Promise<SupportTicket | undefined> {
        try {
            const [updated] = await db
                .update(supportTickets)
                .set({ ...updates, updatedAt: new Date(), lastActivityAt: new Date() })
                .where(eq(supportTickets.id, id))
                .returning();
            return updated || undefined;
        } catch (error) {
            logger.error('Error updating support ticket', { error });
            return undefined;
        }
    }

    async bulkDeleteSupportTickets(ticketIds: string[]): Promise<number> {
        if (ticketIds.length === 0) return 0;
        const deleted = await db.delete(supportTickets).where(inArray(supportTickets.id, ticketIds)).returning();
        return deleted.length;
    }

    async bulkCloseSupportTickets(ticketIds: string[]): Promise<number> {
        if (ticketIds.length === 0) return 0;
        const updated = await db
            .update(supportTickets)
            .set({ status: 'closed', updatedAt: new Date(), resolvedAt: new Date(), lastActivityAt: new Date() })
            .where(inArray(supportTickets.id, ticketIds))
            .returning();
        return updated.length;
    }

    async bulkUpdateSupportTickets(ticketIds: string[], updates: Partial<SupportTicket>): Promise<number> {
        if (ticketIds.length === 0) return 0;
        const updated = await db
            .update(supportTickets)
            .set({ ...updates, updatedAt: new Date(), lastActivityAt: new Date() })
            .where(inArray(supportTickets.id, ticketIds))
            .returning();
        return updated.length;
    }

    async getOpenSupportTicketCount(): Promise<{ open: number; inProgress: number }> {
        try {
            const [openCount] = await db
                .select({ count: count() })
                .from(supportTickets)
                .where(eq(supportTickets.status, 'open'));
            const [inProgressCount] = await db
                .select({ count: count() })
                .from(supportTickets)
                .where(eq(supportTickets.status, 'in_progress'));
            return {
                open: Number(openCount?.count || 0),
                inProgress: Number(inProgressCount?.count || 0),
            };
        } catch (error) {
            logger.error('Error getting open support ticket count', { error });
            return { open: 0, inProgress: 0 };
        }
    }

    async getSupportTicketMetrics(days: number = 30): Promise<{
        totalTickets: number;
        openTickets: number;
        inProgressTickets: number;
        resolvedTickets: number;
        closedTickets: number;
        avgFirstResponseMinutes: number | null;
        avgResolutionMinutes: number | null;
        slaBreachedCount: number;
        ticketsByCategory: Array<{ category: string; count: number }>;
        ticketsByPriority: Array<{ priority: string; count: number }>;
        ticketsPerDay: Array<{ date: string; count: number }>;
        topAssignees: Array<{ assignedTo: string; count: number; resolved: number }>;
    }> {
        try {
            const since = new Date();
            since.setDate(since.getDate() - days);

            const dateFilter = gte(supportTickets.createdAt, since);

            // Total and status counts
            const [total] = await db.select({ count: count() }).from(supportTickets).where(dateFilter);
            const [open] = await db.select({ count: count() }).from(supportTickets).where(and(dateFilter, eq(supportTickets.status, 'open')));
            const [inProg] = await db.select({ count: count() }).from(supportTickets).where(and(dateFilter, eq(supportTickets.status, 'in_progress')));
            const [resolved] = await db.select({ count: count() }).from(supportTickets).where(and(dateFilter, eq(supportTickets.status, 'resolved')));
            const [closed] = await db.select({ count: count() }).from(supportTickets).where(and(dateFilter, eq(supportTickets.status, 'closed')));

            // Avg first response time (in minutes)
            const [avgFrt] = await db
                .select({
                    avg: sql<number>`AVG(EXTRACT(EPOCH FROM (${supportTickets.firstResponseAt} - ${supportTickets.createdAt})) / 60)`
                })
                .from(supportTickets)
                .where(and(dateFilter, isNotNull(supportTickets.firstResponseAt)));

            // Avg resolution time (in minutes)
            const [avgRes] = await db
                .select({
                    avg: sql<number>`AVG(EXTRACT(EPOCH FROM (${supportTickets.resolvedAt} - ${supportTickets.createdAt})) / 60)`
                })
                .from(supportTickets)
                .where(and(dateFilter, isNotNull(supportTickets.resolvedAt)));

            // SLA breached count
            const [slaBreach] = await db
                .select({ count: count() })
                .from(supportTickets)
                .where(and(dateFilter, eq(supportTickets.slaBreached, true)));

            // By category
            const byCategory = await db
                .select({ category: supportTickets.category, count: count() })
                .from(supportTickets)
                .where(dateFilter)
                .groupBy(supportTickets.category)
                .orderBy(desc(count()));

            // By priority
            const byPriority = await db
                .select({ priority: supportTickets.priority, count: count() })
                .from(supportTickets)
                .where(dateFilter)
                .groupBy(supportTickets.priority);

            // Per day
            const perDay = await db
                .select({
                    date: sql<string>`TO_CHAR(${supportTickets.createdAt}, 'YYYY-MM-DD')`,
                    count: count()
                })
                .from(supportTickets)
                .where(dateFilter)
                .groupBy(sql`TO_CHAR(${supportTickets.createdAt}, 'YYYY-MM-DD')`)
                .orderBy(sql`TO_CHAR(${supportTickets.createdAt}, 'YYYY-MM-DD')`);

            // Top assignees
            const topAssignees = await db
                .select({
                    assignedTo: supportTickets.assignedTo,
                    count: count(),
                    resolved: sql<number>`COUNT(*) FILTER (WHERE ${supportTickets.status} IN ('resolved', 'closed'))`
                })
                .from(supportTickets)
                .where(and(dateFilter, isNotNull(supportTickets.assignedTo)))
                .groupBy(supportTickets.assignedTo)
                .orderBy(desc(count()))
                .limit(10);

            return {
                totalTickets: Number(total?.count || 0),
                openTickets: Number(open?.count || 0),
                inProgressTickets: Number(inProg?.count || 0),
                resolvedTickets: Number(resolved?.count || 0),
                closedTickets: Number(closed?.count || 0),
                avgFirstResponseMinutes: avgFrt?.avg ? Math.round(Number(avgFrt.avg)) : null,
                avgResolutionMinutes: avgRes?.avg ? Math.round(Number(avgRes.avg)) : null,
                slaBreachedCount: Number(slaBreach?.count || 0),
                ticketsByCategory: byCategory.map(r => ({ category: r.category, count: Number(r.count) })),
                ticketsByPriority: byPriority.map(r => ({ priority: r.priority, count: Number(r.count) })),
                ticketsPerDay: perDay.map(r => ({ date: r.date, count: Number(r.count) })),
                topAssignees: topAssignees.map(r => ({ assignedTo: r.assignedTo!, count: Number(r.count), resolved: Number(r.resolved) })),
            };
        } catch (error) {
            logger.error('Error getting support ticket metrics', { error });
            throw error;
        }
    }

    async logTicketActivity(entry: InsertSupportTicketActivityLog): Promise<void> {
        try {
            await db.insert(supportTicketActivityLog).values(entry);
        } catch (error) {
            logger.error('Error logging ticket activity', { error });
        }
    }

    async getTicketActivityLog(ticketId: string): Promise<Array<{ action: string; oldValue: string | null; newValue: string | null; metadata: string | null; createdAt: Date; userName: string | null }>> {
        try {
            const entries = await db
                .select({
                    action: supportTicketActivityLog.action,
                    oldValue: supportTicketActivityLog.oldValue,
                    newValue: supportTicketActivityLog.newValue,
                    metadata: supportTicketActivityLog.metadata,
                    createdAt: supportTicketActivityLog.createdAt,
                    userName: users.name,
                })
                .from(supportTicketActivityLog)
                .leftJoin(users, eq(supportTicketActivityLog.userId, users.id))
                .where(eq(supportTicketActivityLog.ticketId, ticketId))
                .orderBy(desc(supportTicketActivityLog.createdAt));
            return entries;
        } catch (error) {
            logger.error('Error getting ticket activity log', { error });
            return [];
        }
    }

    async getAllTicketCategories(): Promise<string[]> {
        try {
            const result = await db
                .selectDistinct({ category: supportTickets.category })
                .from(supportTickets)
                .orderBy(supportTickets.category);
            return result.map(r => r.category);
        } catch (error) {
            logger.error('Error getting ticket categories', { error });
            return [];
        }
    }

    async getAllTicketTags(): Promise<string[]> {
        try {
            const result = await db
                .select({ tag: sql<string>`DISTINCT UNNEST(${supportTickets.tags})` })
                .from(supportTickets);
            return result.map(r => r.tag).sort();
        } catch (error) {
            logger.error('Error getting ticket tags', { error });
            return [];
        }
    }

    async getAdminUsers(): Promise<Array<{ id: string; name: string; email: string }>> {
        try {
            const admins = await db
                .select({ id: users.id, name: users.name, email: users.email })
                .from(users)
                .where(eq(users.isAdmin, true))
                .orderBy(users.name);
            return admins;
        } catch (error) {
            logger.error('Error getting admin users', { error });
            return [];
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
                messages: userMessages.map(m => ({ ...m, content: decryptMessageContent(m.content) })),
                total: Number(totalCount)
            };
        } catch (error) {
            logger.error('Error getting user messages', { error });
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
                        messages: sessionMessages.map(m => ({ ...m, content: decryptMessageContent(m.content) })),
                        messageCount: sessionMessages.length
                    };
                })
            );

            return {
                conversations,
                total: Number(totalCount)
            };
        } catch (error) {
            logger.error('Error getting all conversations', { error });
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
            logger.error('Error getting conversation insights', { error });
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
            logger.error('Error saving conversation insights', { error });
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
                messages: sessionMessages.map(m => ({
                    ...m,
                    content: decryptMessageContent(m.content),
                    attachments: Array.isArray((m as any).attachments) ? (m as any).attachments : []
                }))
            };
        } catch (error) {
            logger.error('Error getting conversation details', { error });
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
            logger.error('Error getting conversion funnel', { error });
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
            logger.error('Error getting cohort retention', { error });
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
            logger.error('Error getting reorder health', { error });
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
            logger.error('Error getting formula insights', { error });
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
            logger.error('Error getting pending actions', { error });
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

            // Fetch orders and their users in 2 queries instead of N+1
            const recentOrders = await db.select().from(orders).orderBy(desc(orders.placedAt)).limit(limit);
            if (recentOrders.length > 0) {
                const orderUserIds = [...new Set(recentOrders.map(o => o.userId))];
                const orderUsers = await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, orderUserIds));
                const orderUserMap = new Map(orderUsers.map(u => [u.id, u.name]));
                for (const o of recentOrders) {
                    const userName = orderUserMap.get(o.userId) || 'Unknown';
                    activities.push({ type: 'order', id: o.id, userId: o.userId, userName, description: `${userName} placed an order`, timestamp: o.placedAt, metadata: { status: o.status, amountCents: o.amountCents } });
                }
            }

            // Fetch formulas and their users in 2 queries instead of N+1
            const recentFormulas = await db.select().from(formulas).orderBy(desc(formulas.createdAt)).limit(limit);
            if (recentFormulas.length > 0) {
                const formulaUserIds = [...new Set(recentFormulas.map(f => f.userId))];
                const formulaUsers = await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, formulaUserIds));
                const formulaUserMap = new Map(formulaUsers.map(u => [u.id, u.name]));
                for (const f of recentFormulas) {
                    const userName = formulaUserMap.get(f.userId) || 'Unknown';
                    activities.push({ type: 'formula', id: f.id, userId: f.userId, userName, description: `${userName} ${f.version > 1 ? 'updated' : 'created'} their formula`, timestamp: f.createdAt, metadata: { version: f.version, totalMg: f.totalMg } });
                }
            }

            // Fetch tickets and their users in 2 queries instead of N+1
            const recentTickets = await db.select().from(supportTickets).orderBy(desc(supportTickets.createdAt)).limit(limit);
            if (recentTickets.length > 0) {
                const ticketUserIds = [...new Set(recentTickets.map(t => t.userId))];
                const ticketUsers = await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, ticketUserIds));
                const ticketUserMap = new Map(ticketUsers.map(u => [u.id, u.name]));
                for (const t of recentTickets) {
                    const userName = ticketUserMap.get(t.userId) || 'Unknown';
                    activities.push({ type: 'ticket', id: t.id, userId: t.userId, userName, description: `${userName} opened a support ticket: ${t.subject}`, timestamp: t.createdAt, metadata: { status: t.status, subject: t.subject } });
                }
            }

            return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
        } catch (error) {
            logger.error('Error getting activity feed', { error });
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

            // Batch-fetch users and formulas to avoid N+1 queries
            const userIds = [...new Set(orderList.map(o => o.userId))];
            const [orderUserRows, formulaRows] = await Promise.all([
                userIds.length > 0
                    ? db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(inArray(users.id, userIds))
                    : Promise.resolve([]),
                orderList.length > 0
                    ? db.select().from(formulas).where(
                        inArray(formulas.userId, userIds)
                    )
                    : Promise.resolve([]),
            ]);
            const userRowMap = new Map(orderUserRows.map(u => [u.id, u]));
            // Key formulas by "userId:version" for O(1) lookup
            const formulaRowMap = new Map(formulaRows.map(f => [`${f.userId}:${f.version}`, f]));
            const enrichedOrders = orderList.map(order => ({
                ...order,
                user: userRowMap.get(order.userId) ?? null,
                formula: formulaRowMap.get(`${order.userId}:${order.formulaVersion}`) ?? null,
            }));

            return { orders: enrichedOrders, total: Number(countResult?.count || 0) };
        } catch (error) {
            logger.error('Error getting all orders', { error });
            return { orders: [], total: 0 };
        }
    }

    async updateOrderStatus(id: string, status: string, trackingUrl?: string): Promise<Order | undefined> {
        try {
            const [order] = await db.update(orders).set({ status: status as any, trackingUrl, shippedAt: status === 'shipped' ? new Date() : undefined }).where(eq(orders.id, id)).returning();
            return order || undefined;
        } catch (error) {
            logger.error('Error updating order status', { error });
            return undefined;
        }
    }

    async listIngredientPricing(): Promise<IngredientPricing[]> {
        try {
            return await db
                .select()
                .from(ingredientPricing)
                .orderBy(ingredientPricing.ingredientName);
        } catch (error) {
            logger.error('Error listing ingredient pricing', { error });
            return [];
        }
    }

    async updateIngredientPricing(
        id: string,
        updates: {
            ingredientName: string;
            typicalCapsuleMg: number;
            typicalBottleCapsules: number;
            typicalRetailPriceCents: number;
            isActive: boolean;
        }
    ): Promise<IngredientPricing | undefined> {
        try {
            const [updated] = await db
                .update(ingredientPricing)
                .set({
                    ingredientName: updates.ingredientName,
                    typicalCapsuleMg: updates.typicalCapsuleMg,
                    typicalBottleCapsules: updates.typicalBottleCapsules,
                    typicalRetailPriceCents: updates.typicalRetailPriceCents,
                    isActive: updates.isActive,
                    updatedAt: new Date(),
                })
                .where(eq(ingredientPricing.id, id))
                .returning();

            return updated || undefined;
        } catch (error) {
            logger.error('Error updating ingredient pricing', { error });
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
            logger.error('Error getting user admin notes', { error });
            return [];
        }
    }

    async addUserAdminNote(userId: string, adminId: string, content: string): Promise<any> {
        try {
            const [note] = await db.insert(userAdminNotes).values({ userId, adminId, content }).returning();
            const [admin] = await db.select({ name: users.name }).from(users).where(eq(users.id, adminId));
            return { ...note, adminName: admin?.name || 'Unknown' };
        } catch (error) {
            logger.error('Error adding user admin note', { error });
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
            logger.error('Error exporting users', { error });
            return [];
        }
    }

    async exportOrders(startDate?: Date, endDate?: Date, status?: string): Promise<any[]> {
        try {
            let whereConditions: any[] = [];
            if (startDate) whereConditions.push(gte(orders.placedAt, startDate));
            if (endDate) whereConditions.push(lte(orders.placedAt, endDate));
            if (status && status !== 'all') whereConditions.push(eq(orders.status, status as any));
            const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
            const orderList = await db.select().from(orders).where(whereClause).orderBy(desc(orders.placedAt));

            return await Promise.all(orderList.map(async (order) => {
                const [user] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, order.userId));
                return {
                    id: order.id,
                    userName: user?.name || 'Unknown',
                    userEmail: user?.email || 'Unknown',
                    status: order.status,
                    amountCents: order.amountCents,
                    supplyMonths: order.supplyMonths,
                    placedAt: order.placedAt.toISOString(),
                    shippedAt: order.shippedAt?.toISOString() || null,
                    trackingUrl: order.trackingUrl || null,
                };
            }));
        } catch (error) {
            logger.error('Error exporting orders', { error });
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

    // ---- Traffic Source & Attribution Analytics ----

    async getTrafficSourceBreakdown(
        days?: number,
        startDate?: Date,
        endDate?: Date,
    ): Promise<Array<{ channel: string; count: number; paidCount: number; revenue: number }>> {
        try {
            const conditions = [];
            if (startDate) {
                conditions.push(gte(users.createdAt, startDate));
            } else if (days) {
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - days);
                conditions.push(gte(users.createdAt, startDate));
            }
            if (endDate) {
                conditions.push(lte(users.createdAt, endDate));
            }

            const channelData = await db
                .select({
                    channel: sql<string>`COALESCE(${users.signupChannel}, 'direct')`,
                    count: count(),
                })
                .from(users)
                .where(conditions.length > 0 ? and(...conditions) : undefined)
                .groupBy(sql`COALESCE(${users.signupChannel}, 'direct')`);

            // Get paid users and revenue per channel
            const results = [];
            for (const row of channelData) {
                const channelUsers = await db
                    .select({ id: users.id })
                    .from(users)
                    .where(and(
                        sql`COALESCE(${users.signupChannel}, 'direct') = ${row.channel}`,
                        ...(conditions.length > 0 ? conditions : [])
                    ));
                const userIds = channelUsers.map(u => u.id);

                let paidCount = 0;
                let revenue = 0;
                if (userIds.length > 0) {
                    const orderData = await db
                        .select({
                            paidUsers: sql<number>`COUNT(DISTINCT ${orders.userId})`,
                            totalRevenue: sql<number>`COALESCE(SUM(${orders.amountCents}), 0)`,
                        })
                        .from(orders)
                        .where(inArray(orders.userId, userIds));
                    paidCount = Number(orderData[0]?.paidUsers || 0);
                    revenue = Number(orderData[0]?.totalRevenue || 0) / 100;
                }

                results.push({
                    channel: row.channel,
                    count: Number(row.count),
                    paidCount,
                    revenue,
                });
            }

            return results.sort((a, b) => b.count - a.count);
        } catch (error) {
            logger.error('Error getting traffic source breakdown', { error });
            return [];
        }
    }

    async getUtmCampaignBreakdown(
        days?: number,
        startDate?: Date,
        endDate?: Date,
    ): Promise<Array<{ campaign: string; source: string; medium: string; signups: number; orders: number; revenue: number }>> {
        try {
            const conditions = [isNotNull(users.utmCampaign)];
            if (startDate) {
                conditions.push(gte(users.createdAt, startDate));
            } else if (days) {
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - days);
                conditions.push(gte(users.createdAt, startDate));
            }
            if (endDate) {
                conditions.push(lte(users.createdAt, endDate));
            }

            const campaigns = await db
                .select({
                    campaign: users.utmCampaign,
                    source: sql<string>`MODE() WITHIN GROUP (ORDER BY ${users.utmSource})`,
                    medium: sql<string>`MODE() WITHIN GROUP (ORDER BY ${users.utmMedium})`,
                    signups: count(),
                })
                .from(users)
                .where(and(...conditions))
                .groupBy(users.utmCampaign)
                .orderBy(desc(count()));

            const results = [];
            for (const row of campaigns) {
                const campaignUsers = await db
                    .select({ id: users.id })
                    .from(users)
                    .where(and(eq(users.utmCampaign, row.campaign!), ...(conditions.slice(1))));
                const userIds = campaignUsers.map(u => u.id);

                let orderCount = 0;
                let revenue = 0;
                if (userIds.length > 0) {
                    const [orderData] = await db
                        .select({
                            orders: count(),
                            totalRevenue: sql<number>`COALESCE(SUM(${orders.amountCents}), 0)`,
                        })
                        .from(orders)
                        .where(inArray(orders.userId, userIds));
                    orderCount = Number(orderData?.orders || 0);
                    revenue = Number(orderData?.totalRevenue || 0) / 100;
                }

                results.push({
                    campaign: row.campaign || 'unknown',
                    source: row.source || 'unknown',
                    medium: row.medium || 'unknown',
                    signups: Number(row.signups),
                    orders: orderCount,
                    revenue,
                });
            }

            return results;
        } catch (error) {
            logger.error('Error getting UTM campaign breakdown', { error });
            return [];
        }
    }

    async getReferralStats(): Promise<{
        totalReferrers: number;
        totalReferred: number;
        topReferrers: Array<{ userId: string; name: string; email: string; referralCode: string; referralCount: number; revenueGenerated: number }>;
    }> {
        try {
            const referredUsers = await db
                .select({ count: count() })
                .from(users)
                .where(isNotNull(users.referredByUserId));
            const totalReferred = Number(referredUsers[0]?.count || 0);

            const referrerCounts = await db
                .select({
                    userId: users.referredByUserId,
                    count: count(),
                })
                .from(users)
                .where(isNotNull(users.referredByUserId))
                .groupBy(users.referredByUserId);
            const totalReferrers = referrerCounts.length;

            // Top referrers with their details
            const topReferrers = [];
            const sorted = referrerCounts.sort((a, b) => Number(b.count) - Number(a.count)).slice(0, 10);
            for (const r of sorted) {
                if (!r.userId) continue;
                const [referrer] = await db.select({ name: users.name, email: users.email, referralCode: users.referralCode }).from(users).where(eq(users.id, r.userId));
                if (!referrer) continue;

                // Revenue from referred users
                const referredIds = await db.select({ id: users.id }).from(users).where(eq(users.referredByUserId, r.userId));
                let revenueGenerated = 0;
                if (referredIds.length > 0) {
                    const [rev] = await db.select({ total: sql<number>`COALESCE(SUM(${orders.amountCents}), 0)` })
                        .from(orders).where(inArray(orders.userId, referredIds.map(u => u.id)));
                    revenueGenerated = Number(rev?.total || 0) / 100;
                }

                topReferrers.push({
                    userId: r.userId,
                    name: referrer.name,
                    email: referrer.email,
                    referralCode: referrer.referralCode || '',
                    referralCount: Number(r.count),
                    revenueGenerated,
                });
            }

            return { totalReferrers, totalReferred, topReferrers };
        } catch (error) {
            logger.error('Error getting referral stats', { error });
            return { totalReferrers: 0, totalReferred: 0, topReferrers: [] };
        }
    }

    // ---- Marketing Campaigns CRUD ----

    async listMarketingCampaigns(): Promise<MarketingCampaign[]> {
        return await db.select().from(marketingCampaigns).orderBy(desc(marketingCampaigns.createdAt));
    }

    async getMarketingCampaign(id: string): Promise<MarketingCampaign | undefined> {
        const [campaign] = await db.select().from(marketingCampaigns).where(eq(marketingCampaigns.id, id));
        return campaign;
    }

    async createMarketingCampaign(data: InsertMarketingCampaign): Promise<MarketingCampaign> {
        const [campaign] = await db.insert(marketingCampaigns).values(data).returning();
        return campaign;
    }

    async updateMarketingCampaign(id: string, updates: Partial<InsertMarketingCampaign>): Promise<MarketingCampaign | undefined> {
        const [campaign] = await db
            .update(marketingCampaigns)
            .set({ ...updates, updatedAt: new Date() })
            .where(eq(marketingCampaigns.id, id))
            .returning();
        return campaign;
    }

    async deleteMarketingCampaign(id: string): Promise<boolean> {
        const result = await db.delete(marketingCampaigns).where(eq(marketingCampaigns.id, id)).returning();
        return result.length > 0;
    }

    // ---- Influencer Management ----

    async listInfluencers(status?: string): Promise<Influencer[]> {
        if (status && status !== 'all') {
            return await db.select().from(influencers).where(eq(influencers.status, status)).orderBy(desc(influencers.createdAt));
        }
        return await db.select().from(influencers).orderBy(desc(influencers.createdAt));
    }

    async getInfluencer(id: string): Promise<Influencer | undefined> {
        const [inf] = await db.select().from(influencers).where(eq(influencers.id, id));
        return inf;
    }

    async createInfluencer(data: InsertInfluencer): Promise<Influencer> {
        const [inf] = await db.insert(influencers).values(data).returning();
        return inf;
    }

    async updateInfluencer(id: string, updates: Partial<InsertInfluencer>): Promise<Influencer | undefined> {
        const [inf] = await db.update(influencers).set({ ...updates, updatedAt: new Date() }).where(eq(influencers.id, id)).returning();
        return inf;
    }

    async deleteInfluencer(id: string): Promise<boolean> {
        const result = await db.delete(influencers).where(eq(influencers.id, id)).returning();
        return result.length > 0;
    }

    async getInfluencerStats(): Promise<{ total: number; active: number; totalRevenue: number; totalCommissions: number; byPlatform: Array<{ platform: string; count: number }> }> {
        try {
            const [total] = await db.select({ count: count() }).from(influencers);
            const [active] = await db.select({ count: count() }).from(influencers).where(eq(influencers.status, 'active'));
            const [revenue] = await db.select({
                revenue: sql<number>`COALESCE(SUM(total_revenue_cents), 0)`,
                commissions: sql<number>`COALESCE(SUM(total_commission_cents), 0)`,
            }).from(influencers);
            const byPlatform = await db.select({ platform: influencers.platform, count: count() }).from(influencers).groupBy(influencers.platform);

            return {
                total: Number(total?.count || 0),
                active: Number(active?.count || 0),
                totalRevenue: Number(revenue?.revenue || 0) / 100,
                totalCommissions: Number(revenue?.commissions || 0) / 100,
                byPlatform: byPlatform.map(p => ({ platform: p.platform, count: Number(p.count) })),
            };
        } catch (error) {
            logger.error('Error getting influencer stats', { error });
            return { total: 0, active: 0, totalRevenue: 0, totalCommissions: 0, byPlatform: [] };
        }
    }

    async listInfluencerContent(influencerId: string): Promise<InfluencerContent[]> {
        return await db.select().from(influencerContent).where(eq(influencerContent.influencerId, influencerId)).orderBy(desc(influencerContent.createdAt));
    }

    async createInfluencerContent(data: InsertInfluencerContent): Promise<InfluencerContent> {
        const [content] = await db.insert(influencerContent).values(data).returning();
        return content;
    }

    // ---- B2B Medical Prospecting ----

    async listB2bProspects(status?: string, limit = 50, offset = 0): Promise<{ prospects: B2bProspect[]; total: number }> {
        const conditions = [];
        if (status && status !== 'all') conditions.push(eq(b2bProspects.status, status));

        const [totalResult] = await db.select({ count: count() }).from(b2bProspects).where(conditions.length > 0 ? and(...conditions) : undefined);
        const prospects = await db.select().from(b2bProspects)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(b2bProspects.leadScore))
            .limit(limit).offset(offset);

        return { prospects, total: Number(totalResult?.count || 0) };
    }

    async getB2bProspect(id: string): Promise<B2bProspect | undefined> {
        const [prospect] = await db.select().from(b2bProspects).where(eq(b2bProspects.id, id));
        return prospect;
    }

    async createB2bProspect(data: InsertB2bProspect): Promise<B2bProspect> {
        const [prospect] = await db.insert(b2bProspects).values(data).returning();
        return prospect;
    }

    async updateB2bProspect(id: string, updates: Partial<InsertB2bProspect>): Promise<B2bProspect | undefined> {
        const [prospect] = await db.update(b2bProspects).set({ ...updates, updatedAt: new Date() }).where(eq(b2bProspects.id, id)).returning();
        return prospect;
    }

    async deleteB2bProspect(id: string): Promise<boolean> {
        const result = await db.delete(b2bProspects).where(eq(b2bProspects.id, id)).returning();
        return result.length > 0;
    }

    async getB2bStats(): Promise<{ totalProspects: number; newThisMonth: number; qualified: number; contacted: number; converted: number; avgLeadScore: number }> {
        try {
            const [total] = await db.select({ count: count() }).from(b2bProspects);

            // Count new prospects created this month
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const [newThisMonthResult] = await db.select({ count: count() }).from(b2bProspects)
                .where(sql`${b2bProspects.createdAt} >= ${startOfMonth}`);

            const byStatus = await db.select({ status: b2bProspects.status, count: count() }).from(b2bProspects).groupBy(b2bProspects.status);
            const statusMap = Object.fromEntries(byStatus.map(s => [s.status, Number(s.count)]));

            const [avgScore] = await db.select({ avg: sql<number>`COALESCE(AVG(lead_score), 0)` }).from(b2bProspects);

            return {
                totalProspects: Number(total?.count || 0),
                newThisMonth: Number(newThisMonthResult?.count || 0),
                qualified: statusMap['qualified'] || 0,
                contacted: statusMap['contacted'] || 0,
                converted: (statusMap['won'] || 0),
                avgLeadScore: Math.round(Number(avgScore?.avg || 0)),
            };
        } catch (error) {
            logger.error('Error getting B2B stats', { error });
            return { totalProspects: 0, newThisMonth: 0, qualified: 0, contacted: 0, converted: 0, avgLeadScore: 0 };
        }
    }

    async listB2bOutreach(prospectId: string): Promise<B2bOutreach[]> {
        return await db.select().from(b2bOutreach).where(eq(b2bOutreach.prospectId, prospectId)).orderBy(desc(b2bOutreach.createdAt));
    }

    async createB2bOutreach(data: InsertB2bOutreach): Promise<B2bOutreach> {
        const [outreach] = await db.insert(b2bOutreach).values(data).returning();
        return outreach;
    }
}

export const adminRepository = new AdminRepository();
