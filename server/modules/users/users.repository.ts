import { db } from '../../infra/db/db';
import {
    users, healthProfiles, subscriptions, orders, addresses, paymentMethodRefs, formulas,
    type User, type InsertUser,
    type HealthProfile, type InsertHealthProfile,
    type Subscription, type InsertSubscription,
    type Order, type InsertOrder,
    type Address, type InsertAddress,
    type PaymentMethodRef, type InsertPaymentMethodRef,
    type Formula
} from '@shared/schema';
import { eq, and, desc, isNull, inArray, sql, lt, lte, gt, gte } from 'drizzle-orm';
import { decryptField, encryptField } from 'server/infra/security/fieldEncryption';
import { newsletterSubscribers, userStreaks, type NewsletterSubscriber, type InsertNewsletterSubscriber } from '@shared/schema';

export class UsersRepository {
    // User operations
    async getUser(id: string): Promise<User | undefined> {
        const [user] = await db.select().from(users).where(eq(users.id, id));
        return user || undefined;
    }

    async getUserByEmail(email: string): Promise<User | undefined> {
        const [user] = await db.select().from(users).where(eq(users.email, email));
        return user || undefined;
    }

    async getUserByPhone(phone: string): Promise<User | undefined> {
        const [user] = await db.select().from(users).where(eq(users.phone, phone));
        return user || undefined;
    }

    async getUserByGoogleId(googleId: string): Promise<User | undefined> {
        const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
        return user || undefined;
    }

    async getUserByFacebookId(facebookId: string): Promise<User | undefined> {
        const [user] = await db.select().from(users).where(eq(users.facebookId, facebookId));
        return user || undefined;
    }

    async getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined> {
        const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, stripeCustomerId));
        return user || undefined;
    }

    async getUserByStripeSubscriptionId(stripeSubscriptionId: string): Promise<User | undefined> {
        const [user] = await db.select().from(users).where(eq(users.stripeSubscriptionId, stripeSubscriptionId));
        return user || undefined;
    }

    async listAllUsers(): Promise<User[]> {
        return await db.select().from(users);
    }

    async createUser(insertUser: InsertUser): Promise<User> {
        const [user] = await db.insert(users).values(insertUser).returning();
        return user;
    }

    async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
        const [user] = await db
            .update(users)
            .set(updates)
            .where(eq(users.id, id))
            .returning();
        return user || undefined;
    }

    async updateUserPassword(userId: string, hashedPassword: string): Promise<void> {
        await db
            .update(users)
            .set({ password: hashedPassword })
            .where(eq(users.id, userId));
    }

    async deleteUser(id: string): Promise<boolean> {
        const result = await db.delete(users).where(eq(users.id, id)).returning();
        return result.length > 0;
    }

    // Health Profile operations
    async getHealthProfile(userId: string): Promise<HealthProfile | undefined> {
        try {
            const [profile] = await db.select().from(healthProfiles).where(eq(healthProfiles.userId, userId));
            if (!profile) return undefined;

            // Decrypt sensitive medical fields with error handling for each field
            let conditions: string[] = [];
            let medications: string[] = [];
            let allergies: string[] = [];

            try {
                if (profile.conditions) {
                    // Check if it's already a plain array (not encrypted)
                    if (Array.isArray(profile.conditions)) {
                        conditions = profile.conditions;
                    } else if (typeof profile.conditions === 'string') {
                        conditions = JSON.parse(decryptField(profile.conditions));
                    }
                }
            } catch (decryptError) {
                console.error('Error decrypting conditions, using empty array:', decryptError);
            }

            try {
                if (profile.medications) {
                    if (Array.isArray(profile.medications)) {
                        medications = profile.medications;
                    } else if (typeof profile.medications === 'string') {
                        medications = JSON.parse(decryptField(profile.medications));
                    }
                }
            } catch (decryptError) {
                console.error('Error decrypting medications, using empty array:', decryptError);
            }

            try {
                if (profile.allergies) {
                    if (Array.isArray(profile.allergies)) {
                        allergies = profile.allergies;
                    } else if (typeof profile.allergies === 'string') {
                        allergies = JSON.parse(decryptField(profile.allergies));
                    }
                }
            } catch (decryptError) {
                console.error('Error decrypting allergies, using empty array:', decryptError);
            }

            return {
                ...profile,
                conditions,
                medications,
                allergies
            };
        } catch (error) {
            console.error('Error getting health profile:', error);
            return undefined;
        }
    }


    async createHealthProfile(insertProfile: InsertHealthProfile): Promise<HealthProfile> {
        const encryptedProfile = {
            ...insertProfile,
            conditions: insertProfile.conditions && insertProfile.conditions.length > 0
                ? encryptField(JSON.stringify(insertProfile.conditions))
                : null,
            medications: insertProfile.medications && insertProfile.medications.length > 0
                ? encryptField(JSON.stringify(insertProfile.medications))
                : null,
            allergies: insertProfile.allergies && insertProfile.allergies.length > 0
                ? encryptField(JSON.stringify(insertProfile.allergies))
                : null
        };

        const [profile] = await db.insert(healthProfiles).values(encryptedProfile as any).returning();

        // Decrypt for return
        return {
            ...profile,
            conditions: profile.conditions
                ? JSON.parse(decryptField(profile.conditions as any))
                : [],
            medications: profile.medications
                ? JSON.parse(decryptField(profile.medications as any))
                : [],
            allergies: profile.allergies
                ? JSON.parse(decryptField(profile.allergies as any))
                : []
        };
    }

    async updateHealthProfile(userId: string, updates: Partial<InsertHealthProfile>): Promise<HealthProfile | undefined> {
        const encryptedUpdates = {
            ...updates,
            conditions: updates.conditions !== undefined
                ? (updates.conditions && updates.conditions.length > 0
                    ? encryptField(JSON.stringify(updates.conditions))
                    : null)
                : undefined,
            medications: updates.medications !== undefined
                ? (updates.medications && updates.medications.length > 0
                    ? encryptField(JSON.stringify(updates.medications))
                    : null)
                : undefined,
            allergies: updates.allergies !== undefined
                ? (updates.allergies && updates.allergies.length > 0
                    ? encryptField(JSON.stringify(updates.allergies))
                    : null)
                : undefined,
            // Always update the timestamp
            updatedAt: new Date()
        };

        // Remove undefined values (but keep null values)
        const cleanUpdates = Object.fromEntries(
            Object.entries(encryptedUpdates).filter(([_, v]) => v !== undefined)
        );

        console.log('Updating health profile:', { userId, fieldsToUpdate: Object.keys(cleanUpdates) });

        const [profile] = await db
            .update(healthProfiles)
            .set(cleanUpdates as any)
            .where(eq(healthProfiles.userId, userId))
            .returning();

        if (!profile) {
            console.error('Health profile update returned no result for userId:', userId);
            return undefined;
        }

        // Decrypt for return
        return {
            ...profile,
            conditions: profile.conditions
                ? JSON.parse(decryptField(profile.conditions as any))
                : [],
            medications: profile.medications
                ? JSON.parse(decryptField(profile.medications as any))
                : [],
            allergies: profile.allergies
                ? JSON.parse(decryptField(profile.allergies as any))
                : []
        };
    }

    // Subscription operations
    async getSubscription(userId: string): Promise<Subscription | undefined> {
        const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
        return subscription || undefined;
    }

    async getSubscriptionByStripeSubscriptionId(stripeSubscriptionId: string): Promise<Subscription | undefined> {
        const [subscription] = await db
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));
        return subscription || undefined;
    }

    async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
        const [sub] = await db.insert(subscriptions).values(subscription).returning();
        return sub;
    }

    async updateSubscription(userId: string, updates: Partial<InsertSubscription>): Promise<Subscription | undefined> {
        const [subscription] = await db
            .update(subscriptions)
            .set(updates)
            .where(eq(subscriptions.userId, userId))
            .returning();
        return subscription || undefined;
    }

    async updateSubscriptionByStripeSubscriptionId(
        stripeSubscriptionId: string,
        updates: Partial<InsertSubscription>
    ): Promise<Subscription | undefined> {
        const [subscription] = await db
            .update(subscriptions)
            .set(updates)
            .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
            .returning();
        return subscription || undefined;
    }

    async upsertSubscriptionForUser(userId: string, values: InsertSubscription): Promise<Subscription> {
        const existing = await this.getSubscription(userId);
        if (existing) {
            const updated = await this.updateSubscription(userId, values);
            if (updated) {
                return updated;
            }
        }
        return this.createSubscription(values);
    }

    async getUpcomingRenewals(daysAhead: number): Promise<Subscription[]> {
        const targetDateStart = new Date();
        targetDateStart.setDate(targetDateStart.getDate() + daysAhead);
        targetDateStart.setHours(0, 0, 0, 0);

        const targetDateEnd = new Date(targetDateStart);
        targetDateEnd.setHours(23, 59, 59, 999);

        return await db
            .select()
            .from(subscriptions)
            .where(and(
                eq(subscriptions.status, 'active'),
                gte(subscriptions.renewsAt, targetDateStart),
                lte(subscriptions.renewsAt, targetDateEnd)
            ));
    }

    // Order operations
    async getOrder(id: string): Promise<Order | undefined> {
        const [order] = await db.select().from(orders).where(eq(orders.id, id));
        return order || undefined;
    }

    async getOrderByStripeSessionId(sessionId: string): Promise<Order | undefined> {
        const [order] = await db.select().from(orders).where(eq(orders.stripeSessionId, sessionId));
        return order || undefined;
    }

    async createOrder(order: InsertOrder): Promise<Order> {
        const [created] = await db.insert(orders).values([order] as any).returning();
        return created;
    }

    async updateOrder(id: string, updates: Partial<InsertOrder>): Promise<Order | undefined> {
        const [updated] = await db
            .update(orders)
            .set(updates as any)
            .where(eq(orders.id, id))
            .returning();
        return updated || undefined;
    }

    async listOrdersByUser(userId: string): Promise<Order[]> {
        return await db
            .select()
            .from(orders)
            .where(eq(orders.userId, userId))
            .orderBy(desc(orders.placedAt));
    }

    async getOrderWithFormula(orderId: string): Promise<{ order: Order, formula: Formula | undefined } | undefined> {
        const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
        if (!order) return undefined;

        const [formula] = await db
            .select()
            .from(formulas)
            .where(and(eq(formulas.userId, order.userId), eq(formulas.version, order.formulaVersion)));
        return { order, formula: formula || undefined };
    }

    // Address operations
    async getAddress(id: string): Promise<Address | undefined> {
        const [address] = await db.select().from(addresses).where(eq(addresses.id, id));
        return address || undefined;
    }

    async createAddress(address: InsertAddress): Promise<Address> {
        const [addr] = await db.insert(addresses).values(address).returning();
        return addr;
    }

    async updateAddress(id: string, updates: Partial<InsertAddress>): Promise<Address | undefined> {
        const [address] = await db
            .update(addresses)
            .set(updates)
            .where(eq(addresses.id, id))
            .returning();
        return address || undefined;
    }

    async listAddressesByUser(userId: string, type?: 'shipping' | 'billing'): Promise<Address[]> {
        const whereClause = type
            ? and(eq(addresses.userId, userId), eq(addresses.type, type))
            : eq(addresses.userId, userId);

        return await db.select().from(addresses).where(whereClause).orderBy(desc(addresses.createdAt));
    }

    // Payment Method operations
    async getPaymentMethodRef(id: string): Promise<PaymentMethodRef | undefined> {
        const [paymentMethod] = await db.select().from(paymentMethodRefs).where(eq(paymentMethodRefs.id, id));
        return paymentMethod || undefined;
    }

    async createPaymentMethodRef(paymentMethod: InsertPaymentMethodRef): Promise<PaymentMethodRef> {
        const [pm] = await db.insert(paymentMethodRefs).values(paymentMethod).returning();
        return pm;
    }

    async listPaymentMethodsByUser(userId: string): Promise<PaymentMethodRef[]> {
        return await db
            .select()
            .from(paymentMethodRefs)
            .where(eq(paymentMethodRefs.userId, userId));
    }

    async deletePaymentMethodRef(id: string): Promise<boolean> {
        const result = await db.delete(paymentMethodRefs).where(eq(paymentMethodRefs.id, id)).returning();
        return result.length > 0;
    }

    // Newsletter subscriber operations
    async getNewsletterSubscriberByEmail(email: string): Promise<NewsletterSubscriber | undefined> {
        try {
            const normalizedEmail = email.trim().toLowerCase();
            const [subscriber] = await db
                .select()
                .from(newsletterSubscribers)
                .where(eq(newsletterSubscribers.email, normalizedEmail));
            return subscriber || undefined;
        } catch (error) {
            console.error('Error getting newsletter subscriber:', error);
            return undefined;
        }
    }

    async createNewsletterSubscriber(insertSubscriber: InsertNewsletterSubscriber): Promise<NewsletterSubscriber> {
        try {
            const normalizedEmail = insertSubscriber.email.trim().toLowerCase();
            const [subscriber] = await db
                .insert(newsletterSubscribers)
                .values({ email: normalizedEmail })
                .returning();
            return subscriber;
        } catch (error) {
            console.error('Error creating newsletter subscriber:', error);
            throw error;
        }
    }

    async reactivateNewsletterSubscriber(email: string): Promise<boolean> {
        try {
            const normalizedEmail = email.trim().toLowerCase();
            await db
                .update(newsletterSubscribers)
                .set({ isActive: true })
                .where(eq(newsletterSubscribers.email, normalizedEmail));
            return true;
        } catch (error) {
            console.error('Error reactivating newsletter subscriber:', error);
            return false;
        }
    }

    // Streak Rewards operations
    private calculateDiscountTier(streakDays: number): { discount: number; tier: string } {
        if (streakDays >= 90) return { discount: 20, tier: 'Champion' };
        if (streakDays >= 60) return { discount: 15, tier: 'Loyal' };
        if (streakDays >= 30) return { discount: 10, tier: 'Dedicated' };
        if (streakDays >= 14) return { discount: 8, tier: 'Committed' };
        if (streakDays >= 7) return { discount: 5, tier: 'Consistent' };
        return { discount: 0, tier: 'Building' };
    }

    async getStreakRewards(userId: string): Promise<{
        currentStreak: number;
        discountEarned: number;
        discountTier: string;
        lastOrderDate: Date | null;
        reorderWindowStart: Date | null;
        reorderDeadline: Date | null;
        streakStatus: 'building' | 'ready' | 'warning' | 'grace' | 'lapsed';
        daysUntilReorderWindow: number | null;
        daysUntilDeadline: number | null;
    }> {
        try {
            // Get streak from user_streaks table (supplements streak)
            const [streak] = await db
                .select()
                .from(userStreaks)
                .where(and(
                    eq(userStreaks.userId, userId),
                    inArray(userStreaks.streakType, ['supplements', 'overall'])
                ))
                .orderBy(desc(userStreaks.streakType))
                .limit(1);

            const [user] = await db.select().from(users).where(eq(users.id, userId));

            const currentStreak = streak?.currentStreak || 0;
            const { discount, tier } = this.calculateDiscountTier(currentStreak);
            const now = new Date();

            // Calculate days until reorder window and deadline
            let daysUntilReorderWindow: number | null = null;
            let daysUntilDeadline: number | null = null;

            if (user?.reorderWindowStart) {
                const windowDiff = Math.ceil((user.reorderWindowStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                daysUntilReorderWindow = windowDiff > 0 ? windowDiff : 0;
            }

            if (user?.reorderDeadline) {
                const deadlineDiff = Math.ceil((user.reorderDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                daysUntilDeadline = deadlineDiff > 0 ? deadlineDiff : 0;
            }

            return {
                currentStreak,
                discountEarned: discount,
                discountTier: tier,
                lastOrderDate: user?.lastOrderDate || null,
                reorderWindowStart: user?.reorderWindowStart || null,
                reorderDeadline: user?.reorderDeadline || null,
                streakStatus: (user?.streakStatus as any) || 'building',
                daysUntilReorderWindow,
                daysUntilDeadline,
            };
        } catch (error) {
            console.error('Error getting streak rewards:', error);
            return {
                currentStreak: 0,
                discountEarned: 0,
                discountTier: 'Building',
                lastOrderDate: null,
                reorderWindowStart: null,
                reorderDeadline: null,
                streakStatus: 'building',
                daysUntilReorderWindow: null,
                daysUntilDeadline: null,
            };
        }
    }

    async updateStreakProgress(userId: string, supplementsComplete: boolean): Promise<void> {
        try {
            if (!supplementsComplete) return; // Only increment on complete days

            const [user] = await db.select().from(users).where(eq(users.id, userId));
            if (!user) return;

            const newStreak = (user.streakCurrentDays || 0) + 1;
            const { discount } = this.calculateDiscountTier(newStreak);

            await db
                .update(users)
                .set({
                    streakCurrentDays: newStreak,
                    streakDiscountEarned: discount,
                })
                .where(eq(users.id, userId));

            console.log(`🔥 Streak updated for user ${userId}: ${newStreak} days, ${discount}% discount`);
        } catch (error) {
            console.error('Error updating streak progress:', error);
        }
    }

    async applyStreakDiscount(userId: string, orderId: string): Promise<number> {
        try {
            const [user] = await db.select().from(users).where(eq(users.id, userId));
            if (!user) return 0;

            const discountToApply = user.streakDiscountEarned || 0;

            if (discountToApply > 0) {
                const now = new Date();
                const reorderWindowStart = new Date(now);
                reorderWindowStart.setDate(reorderWindowStart.getDate() + 75);
                const reorderDeadline = new Date(now);
                reorderDeadline.setDate(reorderDeadline.getDate() + 95);

                // Update user with new order date and calculated reorder windows
                // Keep the streak going - don't reset it
                await db
                    .update(users)
                    .set({
                        lastOrderDate: now,
                        reorderWindowStart,
                        reorderDeadline,
                        streakStatus: 'building',
                    })
                    .where(eq(users.id, userId));

                console.log(`💰 Applied ${discountToApply}% streak discount to order ${orderId}`);
            }

            return discountToApply;
        } catch (error) {
            console.error('Error applying streak discount:', error);
            return 0;
        }
    }

    async resetStreakForLapsedUsers(): Promise<number> {
        try {
            const now = new Date();

            // Find users whose deadline has passed (Day 100+)
            const gracePeriodEnd = new Date(now);
            gracePeriodEnd.setDate(gracePeriodEnd.getDate() - 5); // 5 day grace period

            const result = await db
                .update(users)
                .set({
                    streakCurrentDays: 0,
                    streakDiscountEarned: 0,
                    streakStatus: 'lapsed',
                })
                .where(and(
                    lt(users.reorderDeadline, gracePeriodEnd),
                    sql`${users.streakStatus} != 'lapsed'`
                ))
                .returning();

            if (result.length > 0) {
                console.log(`⚠️ Reset streaks for ${result.length} lapsed users`);
            }

            return result.length;
        } catch (error) {
            console.error('Error resetting lapsed streaks:', error);
            return 0;
        }
    }

    async updateStreakStatuses(): Promise<void> {
        try {
            const now = new Date();

            // Update to 'ready' - in reorder window (Day 75-85)
            await db
                .update(users)
                .set({ streakStatus: 'ready' })
                .where(and(
                    lte(users.reorderWindowStart, now),
                    gt(users.reorderDeadline, new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000)), // More than 10 days to deadline
                    sql`${users.streakStatus} = 'building'`
                ));

            // Update to 'warning' - approaching deadline (Day 86-90)
            const warningThreshold = new Date(now);
            warningThreshold.setDate(warningThreshold.getDate() + 10);
            await db
                .update(users)
                .set({ streakStatus: 'warning' })
                .where(and(
                    lte(users.reorderWindowStart, now),
                    lte(users.reorderDeadline, warningThreshold),
                    gt(users.reorderDeadline, now),
                    sql`${users.streakStatus} IN ('building', 'ready')`
                ));

            // Update to 'grace' - past deadline but in grace period (Day 91-95)
            await db
                .update(users)
                .set({ streakStatus: 'grace' })
                .where(and(
                    lte(users.reorderDeadline, now),
                    gt(users.reorderDeadline, new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)), // Within 5 day grace
                    sql`${users.streakStatus} IN ('building', 'ready', 'warning')`
                ));

            console.log('✅ Streak statuses updated');
        } catch (error) {
            console.error('Error updating streak statuses:', error);
        }
    }
}

export const usersRepository = new UsersRepository();
