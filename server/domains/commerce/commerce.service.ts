
import {
    type Subscription, type InsertSubscription,
    type Order, type InsertOrder,
    type PaymentMethodRef, type InsertPaymentMethodRef,
    type Address, type InsertAddress
} from "@shared/schema";
import { CommerceRepository } from "./commerce.repository";
import { logger } from "../../infrastructure/logging/logger";

export class CommerceService {
    constructor(private readonly repository: CommerceRepository) { }

    // --- Subscription Management ---

    async getSubscription(userId: string): Promise<Subscription | undefined> {
        return this.repository.getSubscription(userId);
    }

    async updateSubscription(userId: string, updates: any): Promise<Subscription | undefined> {
        // Validate allowed updates (logic moved from routes.ts)
        const allowedUpdates: any = {};
        if (updates.status && ['active', 'paused', 'cancelled'].includes(updates.status)) {
            allowedUpdates.status = updates.status;
        }
        if (updates.plan && ['monthly', 'quarterly', 'annual'].includes(updates.plan)) {
            allowedUpdates.plan = updates.plan;
        }
        if (updates.pausedUntil) {
            allowedUpdates.pausedUntil = new Date(updates.pausedUntil);
        }

        if (Object.keys(allowedUpdates).length === 0) {
            return undefined;
        }

        return this.repository.updateSubscription(userId, allowedUpdates);
    }

    // --- Order Management ---

    async getOrdersByUser(userId: string): Promise<Order[]> {
        return this.repository.listOrdersByUser(userId);
    }

    async getOrder(id: string): Promise<Order | undefined> {
        return this.repository.findById(id);
    }

    async getOrderWithFormula(orderId: string) {
        return this.repository.findWithFormula(orderId);
    }

    // --- Billing & Payments ---

    async getPaymentMethodsByUser(userId: string): Promise<PaymentMethodRef[]> {
        return this.repository.listPaymentMethodsByUser(userId);
    }

    async addPaymentMethod(userId: string, data: { stripePaymentMethodId: string, brand: string, last4: string }): Promise<PaymentMethodRef> {
        return this.repository.createPaymentMethodRef({
            userId,
            stripePaymentMethodId: data.stripePaymentMethodId,
            brand: data.brand,
            last4: data.last4
        });
    }

    async deletePaymentMethod(userId: string, paymentMethodId: string): Promise<boolean> {
        // Verify ownership
        const paymentMethod = await this.repository.getPaymentMethodRef(paymentMethodId);
        if (!paymentMethod || paymentMethod.userId !== userId) {
            return false;
        }
        return this.repository.deletePaymentMethodRef(paymentMethodId);
    }

    async getBillingHistory(userId: string) {
        const orders = await this.repository.listOrdersByUser(userId);

        // Transform orders into billing format (logic moved from routes.ts)
        return orders
            .filter(order => order.status === 'delivered')
            .map(order => ({
                id: order.id,
                date: order.placedAt,
                description: `Supplement Order - Formula v${order.formulaVersion}`,
                amount: 89.99, // TODO: Add actual price to Order schema
                status: 'paid',
                invoiceUrl: `/api/invoices/${order.id}`
            }));
    }

    // --- Address Management ---

    async getAddressesByUser(userId: string, type?: 'shipping' | 'billing'): Promise<Address[]> {
        return this.repository.listAddressesByUser(userId, type);
    }

    async createAddress(userId: string, data: InsertAddress): Promise<Address> {
        return this.repository.createAddress({
            ...data,
            userId
        });
    }

    // --- Admin Operations ---

    async getTodaysOrders() {
        return this.repository.getTodaysOrders();
    }

    async getAllOrders(params: {
        status?: string;
        limit: number;
        offset: number;
        startDate?: Date;
        endDate?: Date;
    }) {
        return this.repository.getAllOrders(params);
    }

    async updateOrderStatus(id: string, status: any, trackingUrl?: string) {
        return this.repository.updateStatus(id, status, trackingUrl);
    }

    async exportOrders(startDate?: Date, endDate?: Date) {
        return this.repository.exportOrders(startDate, endDate);
    }
}
