import { logger } from '../../infra/logging/logger';
import { db } from '../../infra/db/db';
import { users, membershipTiers, type MembershipTier, type InsertMembershipTier, type User } from '@shared/schema';
import { eq, sql, and, isNull, lt, or } from 'drizzle-orm';

export class MembershipRepository {
    async getMembershipTier(tierKey: string): Promise<MembershipTier | undefined> {
        try {
            const [tier] = await db
                .select()
                .from(membershipTiers)
                .where(eq(membershipTiers.tierKey, tierKey));
            return tier || undefined;
        } catch (error) {
            logger.error('Error getting membership tier', { error });
            return undefined;
        }
    }

    async getAllMembershipTiers(): Promise<MembershipTier[]> {
        try {
            return await db
                .select()
                .from(membershipTiers)
                .orderBy(membershipTiers.sortOrder);
        } catch (error) {
            logger.error('Error getting all membership tiers', { error });
            return [];
        }
    }

    async getAvailableMembershipTier(): Promise<MembershipTier | undefined> {
        try {
            // Find the first active tier that has available capacity
            const tiers = await db
                .select()
                .from(membershipTiers)
                .where(eq(membershipTiers.isActive, true))
                .orderBy(membershipTiers.sortOrder);

            for (const tier of tiers) {
                // If maxCapacity is null, it means unlimited
                if (tier.maxCapacity === null || tier.currentCount < tier.maxCapacity) {
                    return tier;
                }
            }
            return undefined;
        } catch (error) {
            logger.error('Error getting available membership tier', { error });
            return undefined;
        }
    }

    async createMembershipTier(tier: InsertMembershipTier): Promise<MembershipTier> {
        const [created] = await db
            .insert(membershipTiers)
            .values({
                ...tier,
                benefits: tier.benefits ? [...tier.benefits] : null
            })
            .returning();
        return created;
    }

    async updateMembershipTier(tierKey: string, updates: Partial<InsertMembershipTier>): Promise<MembershipTier | undefined> {
        try {
            const [updated] = await db
                .update(membershipTiers)
                .set({
                    ...updates,
                    benefits: updates.benefits ? [...updates.benefits] : updates.benefits,
                    updatedAt: new Date()
                })
                .where(eq(membershipTiers.tierKey, tierKey))
                .returning();
            return updated || undefined;
        } catch (error) {
            logger.error('Error updating membership tier', { error });
            return undefined;
        }
    }

    /**
     * Atomically increment tier count ONLY if capacity is available.
     * Returns the updated tier if the increment succeeded, undefined if the tier
     * is already at capacity (prevents overselling).
     */
    async incrementTierCount(tierKey: string): Promise<MembershipTier | undefined> {
        try {
            const [updated] = await db
                .update(membershipTiers)
                .set({
                    currentCount: sql`${membershipTiers.currentCount} + 1`,
                    updatedAt: new Date()
                })
                .where(
                    and(
                        eq(membershipTiers.tierKey, tierKey),
                        // Only increment if under capacity (null = unlimited)
                        or(
                            isNull(membershipTiers.maxCapacity),
                            lt(membershipTiers.currentCount, membershipTiers.maxCapacity)
                        )
                    )
                )
                .returning();
            return updated || undefined;
        } catch (error) {
            logger.error('Error incrementing tier count', { error });
            return undefined;
        }
    }

    async decrementTierCount(tierKey: string): Promise<MembershipTier | undefined> {
        try {
            const [updated] = await db
                .update(membershipTiers)
                .set({
                    currentCount: sql`GREATEST(${membershipTiers.currentCount} - 1, 0)`,
                    updatedAt: new Date()
                })
                .where(eq(membershipTiers.tierKey, tierKey))
                .returning();
            return updated || undefined;
        } catch (error) {
            logger.error('Error decrementing tier count', { error });
            return undefined;
        }
    }

    /**
     * Assign a user to a membership tier within a transaction.
     * Atomically: update user row + increment tier count (with capacity guard).
     * Returns undefined if the tier is at capacity or the user isn't found.
     */
    async assignUserMembership(userId: string, tierKey: string, priceCents: number): Promise<User | undefined> {
        try {
            return await db.transaction(async (tx) => {
                // 1. Atomically increment tier count — fails if tier is full
                const [tierUpdated] = await tx
                    .update(membershipTiers)
                    .set({
                        currentCount: sql`${membershipTiers.currentCount} + 1`,
                        updatedAt: new Date()
                    })
                    .where(
                        and(
                            eq(membershipTiers.tierKey, tierKey),
                            or(
                                isNull(membershipTiers.maxCapacity),
                                lt(membershipTiers.currentCount, membershipTiers.maxCapacity)
                            )
                        )
                    )
                    .returning();

                if (!tierUpdated) {
                    // Tier is at capacity — roll back
                    throw new Error('TIER_AT_CAPACITY');
                }

                // 2. Update user with tier assignment
                const [updated] = await tx
                    .update(users)
                    .set({
                        membershipTier: tierKey,
                        membershipPriceCents: priceCents,
                        membershipLockedAt: new Date(),
                        membershipCancelledAt: null
                    })
                    .where(eq(users.id, userId))
                    .returning();

                return updated || undefined;
            });
        } catch (error: any) {
            if (error?.message === 'TIER_AT_CAPACITY') {
                logger.warn('Tier is at capacity, cannot assign user', { tierKey, userId });
                return undefined;
            }
            logger.error('Error assigning user membership', { error });
            return undefined;
        }
    }

    /**
     * Cancel a user's membership within a transaction.
     * Atomically: mark user as cancelled + decrement tier count.
     * Preserves membershipTier and membershipPriceCents for reactivation.
     */
    async cancelUserMembership(userId: string): Promise<User | undefined> {
        try {
            return await db.transaction(async (tx) => {
                // Get user's current tier before cancelling
                const [user] = await tx.select().from(users).where(eq(users.id, userId));
                if (!user || !user.membershipTier || user.membershipCancelledAt) {
                    return undefined;
                }

                const [updated] = await tx
                    .update(users)
                    .set({
                        membershipCancelledAt: new Date()
                    })
                    .where(and(eq(users.id, userId), isNull(users.membershipCancelledAt)))
                    .returning();

                // Decrement the tier count
                if (updated && user.membershipTier) {
                    await tx
                        .update(membershipTiers)
                        .set({
                            currentCount: sql`GREATEST(${membershipTiers.currentCount} - 1, 0)`,
                            updatedAt: new Date()
                        })
                        .where(eq(membershipTiers.tierKey, user.membershipTier));
                }

                return updated || undefined;
            });
        } catch (error) {
            logger.error('Error cancelling user membership', { error });
            return undefined;
        }
    }

    async getUsersByMembershipTier(tierKey: string): Promise<User[]> {
        try {
            return await db
                .select()
                .from(users)
                .where(and(
                    eq(users.membershipTier, tierKey),
                    isNull(users.membershipCancelledAt)
                ));
        } catch (error) {
            logger.error('Error getting users by membership tier', { error });
            return [];
        }
    }

    async getMembershipStats(): Promise<{ tier: string; count: number; capacity: number }[]> {
        try {
            const tiers = await this.getAllMembershipTiers();
            return tiers.map(tier => ({
                tier: tier.tierKey,
                count: tier.currentCount,
                capacity: tier.maxCapacity || 0 // 0 means unlimited
            }));
        } catch (error) {
            logger.error('Error getting membership stats', { error });
            return [];
        }
    }

    /**
     * Reconcile tier counts by counting actual active members per tier.
     * Corrects any drift from crashes or partial failures.
     * Returns the number of tiers that had their count corrected.
     */
    async reconcileTierCounts(): Promise<{ tier: string; oldCount: number; newCount: number }[]> {
        const corrections: { tier: string; oldCount: number; newCount: number }[] = [];
        try {
            const tiers = await this.getAllMembershipTiers();
            for (const tier of tiers) {
                const activeUsers = await db
                    .select({ count: sql<number>`count(*)::int` })
                    .from(users)
                    .where(and(
                        eq(users.membershipTier, tier.tierKey),
                        isNull(users.membershipCancelledAt)
                    ));
                const actualCount = activeUsers[0]?.count ?? 0;
                if (actualCount !== tier.currentCount) {
                    await db
                        .update(membershipTiers)
                        .set({ currentCount: actualCount, updatedAt: new Date() })
                        .where(eq(membershipTiers.tierKey, tier.tierKey));
                    corrections.push({ tier: tier.tierKey, oldCount: tier.currentCount, newCount: actualCount });
                }
            }
        } catch (error) {
            logger.error('Error reconciling tier counts', { error });
        }
        return corrections;
    }
}

export const membershipRepository = new MembershipRepository();
