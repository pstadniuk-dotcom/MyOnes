import { membershipRepository } from './membership.repository';
import { storage } from '../../storage';

export class MembershipService {
    async getAllTiers() {
        return await membershipRepository.getAllMembershipTiers();
    }

    async getAvailableTier() {
        const tier = await membershipRepository.getAvailableMembershipTier();
        if (!tier) {
            throw new Error('No membership tier currently available');
        }
        return tier;
    }

    async getMembershipStats() {
        const stats = await membershipRepository.getMembershipStats();
        const tiers = await membershipRepository.getAllMembershipTiers();
        return { stats, tiers };
    }

    async createOrUpdateTier(tierData: any) {
        const { tierKey, name, priceCents, maxCapacity, sortOrder, benefits, isActive } = tierData;

        const existing = await membershipRepository.getMembershipTier(tierKey);
        if (existing) {
            return await membershipRepository.updateMembershipTier(tierKey, {
                name,
                priceCents,
                maxCapacity,
                sortOrder,
                benefits,
                isActive
            });
        } else {
            return await membershipRepository.createMembershipTier({
                tierKey,
                name,
                priceCents,
                maxCapacity,
                sortOrder: sortOrder || 0,
                benefits: benefits || [],
                isActive: isActive !== false
            });
        }
    }

    async seedDefaultTiers() {
        const defaultTiers = [
            {
                tierKey: 'founding',
                name: 'Founding Member',
                priceCents: 1900,
                maxCapacity: 250,
                sortOrder: 1,
                benefits: [
                    'Lock in $19/month forever',
                    'Unlimited AI consultations',
                    'Priority formula adjustments',
                    'Founding member badge'
                ],
                isActive: true
            },
            {
                tierKey: 'early',
                name: 'Early Adopter',
                priceCents: 2900,
                maxCapacity: 1000,
                sortOrder: 2,
                benefits: [
                    'Lock in $29/month forever',
                    'Unlimited AI consultations',
                    'Priority formula adjustments'
                ],
                isActive: true
            },
            {
                tierKey: 'beta',
                name: 'Beta Member',
                priceCents: 3900,
                maxCapacity: 5000,
                sortOrder: 3,
                benefits: [
                    'Lock in $39/month forever',
                    'Unlimited AI consultations'
                ],
                isActive: true
            },
            {
                tierKey: 'standard',
                name: 'Standard Member',
                priceCents: 4900,
                maxCapacity: null,
                sortOrder: 4,
                benefits: [
                    'Standard pricing at $49/month',
                    'Unlimited AI consultations'
                ],
                isActive: true
            }
        ];

        const results = [];
        for (const tier of defaultTiers) {
            const existing = await membershipRepository.getMembershipTier(tier.tierKey);
            if (!existing) {
                const created = await membershipRepository.createMembershipTier(tier);
                results.push({ action: 'created', tier: created });
            } else {
                results.push({ action: 'exists', tier: existing });
            }
        }
        return results;
    }

    async getUsersByTier(tierKey: string) {
        const users = await membershipRepository.getUsersByMembershipTier(tierKey);
        return users.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            membershipTier: u.membershipTier,
            membershipPriceCents: u.membershipPriceCents,
            membershipLockedAt: u.membershipLockedAt
        }));
    }

    async joinMembership(userId: string) {
        const user = await storage.getUser(userId);
        if (!user) {
            throw new Error('User not found');
        }

        if (user.membershipTier && !user.membershipCancelledAt) {
            throw new Error('User already has an active membership');
        }

        const tier = await membershipRepository.getAvailableMembershipTier();
        if (!tier) {
            throw new Error('No membership tier currently available');
        }

        if (tier.maxCapacity !== null && tier.currentCount >= tier.maxCapacity) {
            throw new Error('This tier is full, please try again');
        }

        const updated = await membershipRepository.assignUserMembership(userId, tier.tierKey, tier.priceCents);
        if (!updated) {
            throw new Error('Failed to assign membership');
        }

        return {
            tier: tier.tierKey,
            name: tier.name,
            priceCents: tier.priceCents,
            lockedAt: updated.membershipLockedAt
        };
    }

    async getUserMembership(userId: string) {
        const user = await storage.getUser(userId);
        if (!user) {
            throw new Error('User not found');
        }

        if (!user.membershipTier) {
            return { hasMembership: false };
        }

        const tier = await membershipRepository.getMembershipTier(user.membershipTier);

        return {
            hasMembership: true,
            isCancelled: !!user.membershipCancelledAt,
            tier: user.membershipTier,
            tierName: tier?.name || user.membershipTier,
            priceCents: user.membershipPriceCents,
            lockedAt: user.membershipLockedAt,
            cancelledAt: user.membershipCancelledAt
        };
    }

    async cancelMembership(userId: string) {
        const updated = await membershipRepository.cancelUserMembership(userId);
        if (!updated) {
            throw new Error('No active membership to cancel');
        }
        return updated;
    }
}

export const membershipService = new MembershipService();
