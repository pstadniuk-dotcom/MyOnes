import { db } from '../../infra/db/db';
import {
    users, healthProfiles, subscriptions, orders, addresses, paymentMethodRefs, formulas,
    type User, type InsertUser,
    type HealthProfile, type InsertHealthProfile,
    type Subscription, type InsertSubscription,
    type Order,
    type Address, type InsertAddress,
    type PaymentMethodRef, type InsertPaymentMethodRef,
    type Formula
} from '@shared/schema';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { decryptField, encryptField } from 'server/infra/security/fieldEncryption';

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
        const [profile] = await db.select().from(healthProfiles).where(eq(healthProfiles.userId, userId));
        return profile || undefined;
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

    // Order operations
    async getOrder(id: string): Promise<Order | undefined> {
        const [order] = await db.select().from(orders).where(eq(orders.id, id));
        return order || undefined;
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

    // Formula operations (user-specific)
    async getCurrentFormulaByUser(userId: string): Promise<Formula | undefined> {
        const [formula] = await db
            .select()
            .from(formulas)
            .where(and(eq(formulas.userId, userId), isNull(formulas.archivedAt)))
            .orderBy(desc(formulas.createdAt))
            .limit(1);
        return formula || undefined;
    }
}

export const usersRepository = new UsersRepository();
