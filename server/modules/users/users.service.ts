import { usersRepository } from './users.repository';
import { formulasRepository } from '../formulas/formulas.repository';
import { consentsService } from '../consents/consents.service';
import bcrypt from 'bcrypt';
import logger from '../../infra/logging/logger';
import { type InsertHealthProfile, type InsertSubscription, type InsertPaymentMethodRef } from '@shared/schema';
import { billingService } from '../billing/billing.service';

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

    async saveMedicationDisclosure(
        userId: string,
        medications: string[],
        metadata: { ipAddress?: string; userAgent?: string }
    ) {
        const disclosedAt = new Date();

        // Save medications + stamp disclosure timestamp
        const existingProfile = await usersRepository.getHealthProfile(userId);
        if (existingProfile) {
            await usersRepository.updateHealthProfile(userId, {
                medications,
                medicationDisclosedAt: disclosedAt,
            } as any);
        } else {
            await usersRepository.createHealthProfile({
                userId,
                medications,
                medicationDisclosedAt: disclosedAt,
            } as any);
        }

        // Write permanent consent / audit record
        const consentText = medications.length === 0
            ? 'User confirmed: no current prescription medications.'
            : `User disclosed the following prescription medications: ${medications.join(', ')}.`;

        const consent = await consentsService.grantConsent({
            userId,
            consentType: 'medication_disclosure',
            granted: true,
            consentVersion: '1.0',
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent,
            consentText,
            metadata: { source: 'dashboard' },
        });

        logger.info('Medication disclosure saved', {
            userId,
            medicationCount: medications.length,
            disclosedAt,
            consentId: consent.id,
        });

        return { disclosedAt, consentId: consent.id };
    }

    // Formula operations
    async getCurrentFormula(userId: string) {
        return await formulasRepository.getCurrentFormulaByUser(userId);
    }

    // Subscription operations
    async getSubscription(userId: string) {
        const subscription = await usersRepository.getSubscription(userId);
        const user = await usersRepository.getUser(userId);

        if (!subscription) return undefined;

        return {
            ...subscription,
            membershipTier: user?.membershipTier,
            membershipPriceCents: user?.membershipPriceCents
        };
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
        return await billingService.listBillingHistory(userId);
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

    async changePassword(userId: string, currentPassword: string, newPassword: string) {
        const user = await usersRepository.getUser(userId);
        if (!user || !user.password) {
            throw new Error('User not found');
        }

        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidPassword) {
            throw new Error('Invalid current password');
        }

        if (currentPassword === newPassword) {
            throw new Error('New password cannot be the same as current password');
        }

        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        await usersRepository.updateUserPassword(userId, hashedPassword);
    }

    async updateAutoOptimize(userId: string, enabled: boolean) {
        const updated = await usersRepository.updateUser(userId, { autoOptimizeFormula: enabled });
        if (!updated) return undefined;
        return { autoOptimizeFormula: updated.autoOptimizeFormula };
    }

    async getAutoOptimize(userId: string) {
        const user = await usersRepository.getUser(userId);
        if (!user) return undefined;
        return { autoOptimizeFormula: user.autoOptimizeFormula ?? false };
    }
}

export const usersService = new UsersService();
