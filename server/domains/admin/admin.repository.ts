
import { sql, desc, eq, and, gte, lte, count, or, isNotNull } from "drizzle-orm";
import { db } from "../../infrastructure/database/db";
import {
    users, orders, supportTickets, conversationInsights, dailyCompletions, weeklySummaries,
    type User, type InsertUser,
    type Order,
    healthProfiles,
    formulas
} from "@shared/schema";
import { logger } from "../../infrastructure/logging/logger";

export class AdminRepository {
    constructor(private db: any) { }

    async getUserGrowthData(days: number) {
        try {
            // This is a simplified implementation. Real implementation would groupby date.
            // Using raw SQL for date grouping is often easier
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const result = await this.db.execute(sql`
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as count
                FROM ${users}
                WHERE created_at >= ${startDate}
                GROUP BY DATE(created_at)
                ORDER BY date ASC
            `);

            return result.map((r: any) => ({
                date: r.date,
                count: Number(r.count)
            }));
        } catch (error) {
            logger.error(`[AdminRepository] Error getting user growth data:`, error);
            return [];
        }
    }

    async getRevenueData(days: number) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const result = await this.db.execute(sql`
                SELECT 
                    DATE(placed_at) as date,
                    SUM(total_amount_cents) as amount
                FROM ${orders}
                WHERE placed_at >= ${startDate}
                AND status != 'cancelled'
                GROUP BY DATE(placed_at)
                ORDER BY date ASC
            `);

            return result.map((r: any) => ({
                date: r.date,
                amount: Number(r.amount) / 100 // Convert cents to dollars
            }));
        } catch (error) {
            logger.error(`[AdminRepository] Error getting revenue data:`, error);
            return [];
        }
    }

    async getPendingActions() {
        try {
            const [pendingOrders] = await this.db
                .select({ count: sql`count(*)` })
                .from(orders)
                .where(eq(orders.status, 'processing'));

            const [openTickets] = await this.db
                .select({ count: sql`count(*)` })
                .from(supportTickets)
                .where(eq(supportTickets.status, 'open'));

            // Mocking other pending actions for now as per likely previous implementation
            return {
                pendingOrders: Number(pendingOrders.count),
                openTickets: Number(openTickets.count),
                pendingReviews: 0,
                flaggedContent: 0
            };
        } catch (error) {
            logger.error(`[AdminRepository] Error getting pending actions:`, error);
            return { pendingOrders: 0, openTickets: 0, pendingReviews: 0, flaggedContent: 0 };
        }
    }

    async getActivityFeed(limit: number) {
        try {
            // Simplified feed: recent users and orders
            const recentUsers = await this.db
                .select()
                .from(users)
                .orderBy(desc(users.createdAt))
                .limit(limit);

            const recentOrders = await this.db
                .select()
                .from(orders)
                .orderBy(desc(orders.placedAt))
                .limit(limit);

            const feed = [
                ...recentUsers.map((u: any) => ({
                    type: 'user_signup',
                    id: u.id,
                    title: `New user signup: ${u.name}`,
                    date: u.createdAt,
                    details: { email: u.email }
                })),
                ...recentOrders.map((o: any) => ({
                    type: 'new_order',
                    id: o.id,
                    title: `New order #${o.orderNumber || o.id.slice(0, 8)}`,
                    date: o.placedAt,
                    details: { amount: o.totalAmountCents / 100, status: o.status }
                }))
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, limit);

            return feed;
        } catch (error) {
            logger.error(`[AdminRepository] Error getting activity feed:`, error);
            return [];
        }
    }

    async getConversionFunnel() {
        try {
            // Total signups
            const [signupCount] = await this.db.select({ count: count() }).from(users);
            const totalSignups = Number(signupCount?.count || 0);

            // Profiles with meaningful data (age, sex, or health goals filled)
            const profilesComplete = await this.db
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

            // Users with at least one formula
            const usersWithFormula = await db
                .selectDistinct({ userId: formulas.userId })
                .from(formulas);
            const formulaCount = usersWithFormula.length;

            // Users with at least one order
            const usersWithOrders = await db
                .selectDistinct({ userId: orders.userId })
                .from(orders);
            const firstOrderCount = usersWithOrders.length;

            // Users with more than one order (reorders)
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
            return {
                totalSignups: 0,
                profilesComplete: 0,
                formulasCreated: 0,
                firstOrders: 0,
                reorders: 0,
                conversionRates: { signupToProfile: 0, profileToFormula: 0, formulaToOrder: 0, orderToReorder: 0 }
            };
        }
    }

    async getCohortRetention(months: number) {
        // Placeholder
        return [
            { cohort: 'Jan 2024', month1: 100, month2: 80, month3: 60 },
            { cohort: 'Feb 2024', month1: 100, month2: 85, month3: 65 }
        ];
    }

    async getUserTimeline(userId: string): Promise<Array<{
        date: Date;
        type: string;
        details: string;
    }>> {
        try {
            const timeline = [];

            // Orders
            const userOrders = await this.db
                .select()
                .from(orders)
                .where(eq(orders.userId, userId))
                .orderBy(desc(orders.placedAt));

            for (const order of userOrders) {
                timeline.push({
                    date: order.placedAt,
                    type: 'order',
                    details: `Order #${order.orderNumber} - $${Number(order.totalAmountCents) / 100} (${order.status})`
                });
            }

            // Support Tickets
            const tickets = await this.db
                .select()
                .from(supportTickets)
                .where(eq(supportTickets.userId, userId))
                .orderBy(desc(supportTickets.createdAt));

            for (const ticket of tickets) {
                timeline.push({
                    date: ticket.createdAt,
                    type: 'support_ticket',
                    details: `Ticket #${ticket.ticketNumber}: ${ticket.subject} (${ticket.status})`
                });
            }

            // Sort by date desc
            return timeline.sort((a, b) => b.date.getTime() - a.date.getTime());
        } catch (error) {
            logger.error(`[AdminRepository] Error getting user timeline:`, error);
            return [];
        }
    }

    async exportUsers(filter: string = 'all'): Promise<Array<{
        id: string;
        name: string;
        email: string;
        phone: string | null;
        createdAt: string;
        hasFormula: boolean;
        orderCount: number;
        totalSpent: number;
    }>> {
        try {
            const allUsers = await this.db.select().from(users).orderBy(desc(users.createdAt));

            const result = [];
            for (const user of allUsers) {
                // Get order stats
                const userOrders = await this.db
                    .select()
                    .from(orders)
                    .where(eq(orders.userId, user.id));

                const orderCount = userOrders.length;
                const totalSpent = userOrders
                    .filter((o: Order) => o.status !== 'cancelled')
                    .reduce((sum: number, o: Order) => sum + (Number(o.amountCents) || 0), 0);

                if (filter === 'customers' && orderCount === 0) continue;

                result.push({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    createdAt: user.createdAt.toISOString(),
                    hasFormula: false, // Legacy field, logic simplified
                    orderCount,
                    totalSpent: totalSpent / 100
                });
            }

            return result;
        } catch (error) {
            logger.error(`[AdminRepository] Error exporting users:`, error);
            return [];
        }
    }

    async getReorderHealth() {
        // Placeholder
        return {
            healthy: 70,
            atRisk: 20,
            churned: 10
        };
    }
}
