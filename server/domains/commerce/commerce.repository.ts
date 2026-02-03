
import { eq, and, desc, count, sql, gte, lte } from "drizzle-orm";
import {
    orders, subscriptions, addresses, paymentMethodRefs, users, formulas,
    type Order, type InsertOrder,
    type Subscription, type InsertSubscription,
    type Address, type InsertAddress,
    type PaymentMethodRef, type InsertPaymentMethodRef,
    type Formula
} from "@shared/schema";
import { BaseRepository } from "../../infrastructure/database/base.repository";
import { logger } from "../../infrastructure/logging/logger";

export class CommerceRepository extends BaseRepository<typeof orders, Order, InsertOrder> {
    constructor(db: any) {
        super(db, orders, "CommerceRepository");
    }

    // --- Subscription Operations ---

    async getSubscription(userId: string): Promise<Subscription | undefined> {
        try {
            const [subscription] = await this.db
                .select()
                .from(subscriptions)
                .where(eq(subscriptions.userId, userId));
            return subscription || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting subscription:`, error);
            throw error;
        }
    }

    async createSubscription(insertSubscription: InsertSubscription): Promise<Subscription> {
        try {
            const [subscription] = await this.db.insert(subscriptions).values(insertSubscription).returning();
            return subscription;
        } catch (error) {
            logger.error(`[${this.domainName}] Error creating subscription:`, error);
            throw error;
        }
    }

    async updateSubscription(userId: string, updates: Partial<InsertSubscription>): Promise<Subscription | undefined> {
        try {
            const [subscription] = await this.db
                .update(subscriptions)
                .set(updates)
                .where(eq(subscriptions.userId, userId))
                .returning();
            return subscription || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error updating subscription:`, error);
            throw error;
        }
    }

    // --- Order Operations ---

    async listOrdersByUser(userId: string): Promise<Order[]> {
        try {
            return await this.db
                .select()
                .from(orders)
                .where(eq(orders.userId, userId))
                .orderBy(desc(orders.placedAt));
        } catch (error) {
            logger.error(`[${this.domainName}] Error listing orders by user:`, error);
            throw error;
        }
    }

    async updateStatus(id: string, status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled', trackingUrl?: string): Promise<Order | undefined> {
        try {
            const updateData: any = { status };
            if (trackingUrl !== undefined) {
                updateData.trackingUrl = trackingUrl;
            }
            if (status === 'shipped') {
                updateData.shippedAt = new Date();
            }

            const [order] = await this.db
                .update(orders)
                .set(updateData)
                .where(eq(orders.id, id))
                .returning();
            return order || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error updating order status:`, error);
            throw error;
        }
    }

    async findWithFormula(orderId: string): Promise<{ order: Order, formula: Formula | undefined } | undefined> {
        try {
            const [order] = await this.db.select().from(orders).where(eq(orders.id, orderId));
            if (!order) return undefined;

            const [formula] = await this.db
                .select()
                .from(formulas)
                .where(and(eq(formulas.userId, order.userId), eq(formulas.version, order.formulaVersion)));

            return { order, formula: formula || undefined };
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting order with formula:`, error);
            throw error;
        }
    }

    // --- Address Operations ---

    async getAddress(id: string): Promise<Address | undefined> {
        try {
            const [address] = await this.db.select().from(addresses).where(eq(addresses.id, id));
            return address || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting address:`, error);
            throw error;
        }
    }



    async createAddress(insertAddress: InsertAddress): Promise<Address> {
        try {
            const [address] = await this.db.insert(addresses).values(insertAddress).returning();
            return address;
        } catch (error) {
            logger.error(`[${this.domainName}] Error creating address:`, error);
            throw error;
        }
    }

    async updateAddress(id: string, updates: Partial<InsertAddress>): Promise<Address | undefined> {
        try {
            const [address] = await this.db
                .update(addresses)
                .set(updates)
                .where(eq(addresses.id, id))
                .returning();
            return address || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error updating address:`, error);
            throw error;
        }
    }

    async listAddressesByUser(userId: string, type?: 'shipping' | 'billing'): Promise<Address[]> {
        try {
            let whereClause = eq(addresses.userId, userId);
            if (type) {
                whereClause = and(whereClause, eq(addresses.type, type)) as any;
            }

            return await this.db
                .select()
                .from(addresses)
                .where(whereClause)
                .orderBy(desc(addresses.createdAt));
        } catch (error) {
            logger.error(`[${this.domainName}] Error listing addresses by user:`, error);
            throw error;
        }
    }

    // --- Payment Method Operations ---

    async getPaymentMethodRef(id: string): Promise<PaymentMethodRef | undefined> {
        try {
            const [paymentMethod] = await this.db.select().from(paymentMethodRefs).where(eq(paymentMethodRefs.id, id));
            return paymentMethod || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting payment method ref:`, error);
            throw error;
        }
    }

    async createPaymentMethodRef(insertPaymentMethod: InsertPaymentMethodRef): Promise<PaymentMethodRef> {
        try {
            const [paymentMethod] = await this.db.insert(paymentMethodRefs).values(insertPaymentMethod).returning();
            return paymentMethod;
        } catch (error) {
            logger.error(`[${this.domainName}] Error creating payment method ref:`, error);
            throw error;
        }
    }

    async listPaymentMethodsByUser(userId: string): Promise<PaymentMethodRef[]> {
        try {
            return await this.db
                .select()
                .from(paymentMethodRefs)
                .where(eq(paymentMethodRefs.userId, userId))
                .orderBy(desc(paymentMethodRefs.createdAt));
        } catch (error) {
            logger.error(`[${this.domainName}] Error listing payment methods by user:`, error);
            throw error;
        }
    }

    async deletePaymentMethodRef(id: string): Promise<boolean> {
        try {
            const result = await this.db.delete(paymentMethodRefs).where(eq(paymentMethodRefs.id, id));
            // In Drizzle NodePgDatabase, delete returns an object with rowCount
            return (result.rowCount ?? 0) > 0;
        } catch (error) {
            logger.error(`[${this.domainName}] Error deleting payment method ref:`, error);
            throw error;
        }
    }

    // --- Admin Operations ---

    async getTodaysOrders(): Promise<Array<Order & { user: { id: string; name: string; email: string }; formula?: Formula }>> {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const results = await this.db
                .select({
                    order: orders,
                    user: {
                        id: users.id,
                        name: users.name,
                        email: users.email
                    },
                    formula: formulas
                })
                .from(orders)
                .innerJoin(users, eq(orders.userId, users.id))
                .leftJoin(formulas, and(eq(orders.userId, formulas.userId), eq(orders.formulaVersion, formulas.version)))
                .where(gte(orders.placedAt, today))
                .orderBy(desc(orders.placedAt));

            return results.map((r: any) => ({
                ...r.order,
                user: r.user,
                formula: r.formula || undefined
            }));
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting todays orders:`, error);
            throw error;
        }
    }

    async getAllOrders(params: {
        status?: string;
        limit: number;
        offset: number;
        startDate?: Date;
        endDate?: Date;
    }): Promise<{ orders: Array<Order & { user: { id: string; name: string; email: string } }>, total: number }> {
        try {
            const { status, limit, offset, startDate, endDate } = params;

            let whereClause: any = undefined;
            const conditions = [];

            if (status && status !== 'all') {
                conditions.push(eq(orders.status, status as any));
            }
            if (startDate) {
                conditions.push(gte(orders.placedAt, startDate));
            }
            if (endDate) {
                conditions.push(lte(orders.placedAt, endDate));
            }

            if (conditions.length > 0) {
                whereClause = and(...conditions);
            }

            // Total count
            const [countResult] = await this.db
                .select({ count: count() })
                .from(orders)
                .where(whereClause);

            const total = Number(countResult?.count || 0);

            // Fetch orders with users
            const results = await this.db
                .select({
                    order: orders,
                    user: {
                        id: users.id,
                        name: users.name,
                        email: users.email
                    }
                })
                .from(orders)
                .innerJoin(users, eq(orders.userId, users.id))
                .where(whereClause)
                .limit(limit)
                .offset(offset)
                .orderBy(desc(orders.placedAt));

            return {
                orders: results.map((r: any) => ({
                    ...r.order,
                    user: r.user
                })),
                total
            };
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting all orders:`, error);
            throw error;
        }
    }
    async exportOrders(startDate?: Date, endDate?: Date): Promise<Array<{
        id: string;
        userName: string;
        userEmail: string;
        status: string;
        amountCents: number;
        supplyMonths: number | null;
        placedAt: string;
        shippedAt: string | null;
    }>> {
        try {
            const conditions = [];
            if (startDate) conditions.push(gte(orders.placedAt, startDate));
            if (endDate) conditions.push(lte(orders.placedAt, endDate));

            const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

            const results = await this.db
                .select({
                    order: orders,
                    user: {
                        name: users.name,
                        email: users.email
                    }
                })
                .from(orders)
                .leftJoin(users, eq(orders.userId, users.id))
                .where(whereClause)
                .orderBy(desc(orders.placedAt));

            return results.map((r: any) => ({
                id: r.order.id,
                userName: r.user?.name || 'Unknown',
                userEmail: r.user?.email || 'Unknown',
                status: r.order.status,
                amountCents: Number(r.order.amountCents) || 0,
                supplyMonths: r.order.supplyMonths,
                placedAt: r.order.placedAt.toISOString(),
                shippedAt: r.order.shippedAt ? r.order.shippedAt.toISOString() : null
            }));
        } catch (error) {
            logger.error(`[${this.domainName}] Error exporting orders:`, error);
            return [];
        }
    }
}
