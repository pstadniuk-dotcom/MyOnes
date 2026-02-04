import { usersRepository } from './users.repository';
import logger from '../../infra/logging/logger';
import { type InsertHealthProfile, type InsertSubscription, type InsertPaymentMethodRef } from '@shared/schema';

export class UsersService {
    // User profile operations
    async getUserProfile(userId: string) {
        const user = await usersRepository.getUser(userId);
        if (!user) return undefined;

        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }

    async updateUserProfile(userId: string, updates: {
        name?: string;
        email?: string;
        phone?: string | null;
        addressLine1?: string | null;
        addressLine2?: string | null;
        city?: string | null;
        state?: string | null;
        postalCode?: string | null;
        country?: string | null;
    }) {
        // If email is being changed, check if it's already in use
        if (updates.email) {
            const existingUser = await usersRepository.getUserByEmail(updates.email);
            if (existingUser && existingUser.id !== userId) {
                throw new Error('Email already in use by another account');
            }
        }

        const updatedUser = await usersRepository.updateUser(userId, updates);
        if (!updatedUser) return undefined;

        const { password, ...userWithoutPassword } = updatedUser;
        return userWithoutPassword;
    }

    async updateUserTimezone(userId: string, timezone: string) {
        const updatedUser = await usersRepository.updateUser(userId, { timezone });
        if (!updatedUser) return undefined;

        return { timezone: updatedUser.timezone };
    }

    // Health Profile operations
    async getHealthProfile(userId: string) {
        return await usersRepository.getHealthProfile(userId);
    }

    async saveHealthProfile(userId: string, healthProfileData: Partial<InsertHealthProfile>) {
        const existingProfile = await usersRepository.getHealthProfile(userId);

        if (existingProfile) {
            return await usersRepository.updateHealthProfile(userId, healthProfileData);
        } else {
            return await usersRepository.createHealthProfile({
                userId,
                ...healthProfileData
            } as InsertHealthProfile);
        }
    }

    // Formula operations
    async getCurrentFormula(userId: string) {
        return await usersRepository.getCurrentFormulaByUser(userId);
    }

    // Subscription operations
    async getSubscription(userId: string) {
        return await usersRepository.getSubscription(userId);
    }

    async updateSubscription(userId: string, updates: {
        status?: 'active' | 'paused' | 'cancelled';
        plan?: 'monthly' | 'quarterly' | 'annual';
        pausedUntil?: Date;
    }) {
        const allowedUpdates: Partial<InsertSubscription> = {};

        if (updates.status && ['active', 'paused', 'cancelled'].includes(updates.status)) {
            allowedUpdates.status = updates.status;
        }
        if (updates.plan && ['monthly', 'quarterly', 'annual'].includes(updates.plan)) {
            allowedUpdates.plan = updates.plan;
        }
        if (updates.pausedUntil) {
            allowedUpdates.pausedUntil = updates.pausedUntil;
        }

        return await usersRepository.updateSubscription(userId, allowedUpdates);
    }

    // Order operations
    async getOrders(userId: string) {
        return await usersRepository.listOrdersByUser(userId);
    }

    async getBillingHistory(userId: string) {
        const orders = await usersRepository.listOrdersByUser(userId);

        return orders
            .filter(order => order.status === 'delivered')
            .map(order => ({
                id: order.id,
                date: order.placedAt,
                description: `Supplement Order - Formula v${order.formulaVersion}`,
                amount: 89.99,
                status: 'paid',
                invoiceUrl: `/api/invoices/${order.id}`
            }));
    }

    // Payment Method operations
    async getPaymentMethods(userId: string) {
        return await usersRepository.listPaymentMethodsByUser(userId);
    }

    async addPaymentMethod(userId: string, paymentMethodData: {
        stripePaymentMethodId: string;
        brand: string;
        last4: string;
    }) {
        return await usersRepository.createPaymentMethodRef({
            userId,
            ...paymentMethodData
        } as InsertPaymentMethodRef);
    }

    async deletePaymentMethod(userId: string, paymentMethodId: string) {
        const paymentMethod = await usersRepository.getPaymentMethodRef(paymentMethodId);

        if (!paymentMethod || paymentMethod.userId !== userId) {
            throw new Error('Payment method not found');
        }

        return await usersRepository.deletePaymentMethodRef(paymentMethodId);
    }
}

export const usersService = new UsersService();
