
import { eq, or, ilike, and, inArray, count, desc, sql } from "drizzle-orm";
import { users, passwordResetTokens, orders, formulas, userAdminNotes, type User, type InsertUser } from "@shared/schema";
import { BaseRepository } from "../../infrastructure/database/base.repository";
import { logger } from "../../infrastructure/logging/logger";

export class UserRepository extends BaseRepository<typeof users, User, InsertUser> {
    constructor(db: any) {
        super(db, users, "UserRepository");
    }

    /**
     * Find user by email
     */
    async findByEmail(email: string): Promise<User | undefined> {
        try {
            const [user] = await this.db
                .select()
                .from(this.table)
                .where(eq(this.table.email, email))
                .limit(1);
            return user || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error finding by email:`, error);
            throw error;
        }
    }

    /**
     * Find user by phone
     */
    async findByPhone(phone: string): Promise<User | undefined> {
        try {
            const [user] = await this.db
                .select()
                .from(this.table)
                .where(eq(this.table.phone, phone))
                .limit(1);
            return user || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error finding by phone:`, error);
            throw error;
        }
    }

    /**
     * Find user by Junction ID
     */
    async findByJunctionId(junctionUserId: string): Promise<User | undefined> {
        try {
            const [user] = await this.db
                .select()
                .from(this.table)
                .where(eq(this.table.junctionUserId, junctionUserId))
                .limit(1);
            return user || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error finding by Junction ID:`, error);
            throw error;
        }
    }

    /**
     * Update user password
     */
    async updatePassword(userId: string, hashedPassword: string): Promise<void> {
        try {
            await this.update(userId, { password: hashedPassword });
        } catch (error) {
            logger.error(`[${this.domainName}] Error updating password:`, error);
            throw error;
        }
    }

    /**
     * Create password reset token
     */
    async createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
        try {
            await this.db.insert(passwordResetTokens).values({
                userId,
                token,
                expiresAt,
                used: false
            });
        } catch (error) {
            logger.error(`[${this.domainName}] Error creating password reset token:`, error);
            throw error;
        }
    }

    /**
     * Get password reset token
     */
    async getPasswordResetToken(token: string): Promise<{ userId: string; expiresAt: Date; used: boolean } | undefined> {
        try {
            const [result] = await this.db
                .select()
                .from(passwordResetTokens)
                .where(eq(passwordResetTokens.token, token))
                .limit(1);
            return result;
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting password reset token:`, error);
            throw error;
        }
    }

    /**
     * Mark password reset token as used
     */
    async markPasswordResetTokenUsed(token: string): Promise<void> {
        try {
            await this.db
                .update(passwordResetTokens)
                .set({ used: true })
                .where(eq(passwordResetTokens.token, token));
        } catch (error) {
            logger.error(`[${this.domainName}] Error marking password reset token used:`, error);
            throw error;
        }
    }

    /**
     * Search users (Admin)
     */
    async searchUsers(query: string, limit: number, offset: number, filter: string = 'all'): Promise<{ users: User[]; total: number }> {
        try {
            const searchPattern = `%${query}%`;
            const searchCondition = or(
                ilike(this.table.email, searchPattern),
                ilike(this.table.name, searchPattern),
                ilike(this.table.phone, searchPattern)
            );

            let whereClause = searchCondition;

            if (filter === 'paid') {
                const paidUserIds = await this.db.selectDistinct({ userId: orders.userId }).from(orders);
                const paidIds = paidUserIds.map(p => p.userId);
                if (paidIds.length === 0) {
                    return { users: [], total: 0 };
                }
                whereClause = and(searchCondition, inArray(this.table.id, paidIds));
            } else if (filter === 'active') {
                const activeUserIds = await this.db.selectDistinct({ userId: formulas.userId }).from(formulas);
                const activeIds = activeUserIds.map(a => a.userId);
                if (activeIds.length === 0) {
                    return { users: [], total: 0 };
                }
                whereClause = and(searchCondition, inArray(this.table.id, activeIds));
            }

            // Get total count
            const [totalResult] = await this.db
                .select({ count: count() })
                .from(this.table)
                .where(whereClause);
            const total = Number(totalResult?.count || 0);

            // Get users
            const result = await this.db
                .select()
                .from(this.table)
                .where(whereClause)
                .limit(limit)
                .offset(offset)
                .orderBy(desc(this.table.createdAt));

            return { users: result, total };
        } catch (error) {
            logger.error(`[${this.domainName}] Error searching users:`, error);
            throw error;
        }
    }

    /**
     * Get admin dashboard stats
     */
    async getAdminStats(): Promise<{
        totalUsers: number;
        totalPaidUsers: number;
        totalRevenue: number;
        activeUsers: number;
        totalOrders: number;
        totalFormulas: number;
    }> {
        try {
            const [userStats] = await this.db.select({ count: count() }).from(users);
            const totalUsers = Number(userStats?.count || 0);

            const [formulaStats] = await this.db.select({ count: count() }).from(formulas);
            const totalFormulas = Number(formulaStats?.count || 0);

            const [orderStats] = await this.db.select({ count: count() }).from(orders);
            const totalOrders = Number(orderStats?.count || 0);

            const paidUsersResult = await this.db
                .selectDistinct({ userId: orders.userId })
                .from(orders);
            const totalPaidUsers = paidUsersResult.length;

            const usersWithFormulas = await this.db
                .selectDistinct({ userId: formulas.userId })
                .from(formulas);
            const activeUsers = usersWithFormulas.length;

            // Calculate total revenue from orders
            const [revenueStats] = await this.db
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
            logger.error(`[${this.domainName}] Error getting admin stats:`, error);
            throw error;
        }
    }

    /**
     * Get admin notes for a user
     */
    async getUserAdminNotes(userId: string): Promise<Array<{
        id: string;
        content: string;
        adminId: string;
        adminName: string;
        createdAt: Date;
    }>> {
        try {
            const notes = await this.db
                .select()
                .from(userAdminNotes)
                .where(eq(userAdminNotes.userId, userId))
                .orderBy(desc(userAdminNotes.createdAt));

            // Enrich with admin name
            const enrichedNotes = await Promise.all(
                notes.map(async (note) => {
                    const [admin] = await this.db
                        .select({ name: users.name })
                        .from(users)
                        .where(eq(users.id, note.adminId));
                    return {
                        id: note.id,
                        content: note.content,
                        adminId: note.adminId,
                        adminName: admin?.name || 'Unknown',
                        createdAt: note.createdAt
                    };
                })
            );

            return enrichedNotes;
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting user admin notes:`, error);
            throw error;
        }
    }

    /**
     * Add admin note for a user
     */
    async addUserAdminNote(userId: string, adminId: string, content: string) {
        try {
            const [note] = await this.db
                .insert(userAdminNotes)
                .values({
                    userId,
                    adminId,
                    content
                })
                .returning();
            return note;
        } catch (error) {
            logger.error(`[${this.domainName}] Error adding user admin note:`, error);
            throw error;
        }
    }
}
