import { db } from '../../infra/db/db';
import { users, membershipTiers, type MembershipTier, type InsertMembershipTier, type User } from '@shared/schema';
import { eq, sql, and, isNull } from 'drizzle-orm';

export class MembershipRepository {
    async getMembershipTier(tierKey: string): Promise<MembershipTier | undefined> {
        try {
            const [tier] = await db
                .select()
                .from(membershipTiers)
                .where(eq(membershipTiers.tierKey, tierKey));
            return tier || undefined;
        } catch (error) {
            console.error('Error getting membership tier:', error);
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
            console.error('Error getting all membership tiers:', error);
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
            console.error('Error getting available membership tier:', error);
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
            console.error('Error updating membership tier:', error);
            return undefined;
        }
    }

    async incrementTierCount(tierKey: string): Promise<MembershipTier | undefined> {
        try {
            const [updated] = await db
                .update(membershipTiers)
                .set({
                    currentCount: sql`${membershipTiers.currentCount} + 1`,
                    updatedAt: new Date()
                })
                .where(eq(membershipTiers.tierKey, tierKey))
                .returning();
            return updated || undefined;
        } catch (error) {
            console.error('Error incrementing tier count:', error);
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
            console.error('Error decrementing tier count:', error);
            return undefined;
        }
    }

    async assignUserMembership(userId: string, tierKey: string, priceCents: number): Promise<User | undefined> {
        try {
            const [updated] = await db
                .update(users)
                .set({
                    membershipTier: tierKey,
                    membershipPriceCents: priceCents,
                    membershipLockedAt: new Date(),
                    membershipCancelledAt: null
                })
                .where(eq(users.id, userId))
                .returning();

            // Increment the tier count
            if (updated) {
                await this.incrementTierCount(tierKey);
            }

            return updated || undefined;
        } catch (error) {
            console.error('Error assigning user membership:', error);
            return undefined;
        }
    }

    async cancelUserMembership(userId: string): Promise<User | undefined> {
        try {
            // Get user's current tier before cancelling
            const [user] = await db.select().from(users).where(eq(users.id, userId));
            if (!user || !user.membershipTier) {
                return undefined;
            }

            const [updated] = await db
                .update(users)
                .set({
                    membershipCancelledAt: new Date()
                })
                .where(eq(users.id, userId))
                .returning();

            // Decrement the tier count
            if (updated && user.membershipTier) {
                await this.decrementTierCount(user.membershipTier);
            }

            return updated || undefined;
        } catch (error) {
            console.error('Error cancelling user membership:', error);
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
            console.error('Error getting users by membership tier:', error);
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
            console.error('Error getting membership stats:', error);
            return [];
        }
    }
}

export const membershipRepository = new MembershipRepository();
