import { Router } from 'express';
import { storage } from '../../storage';
import { membershipRepository } from './repository';
import { requireAuth, requireAdmin } from '../../routes/middleware';

const router = Router();

// ============================================
// MEMBERSHIP TIER ROUTES
// ============================================

// Get all membership tiers (public - for pricing page)
router.get('/api/membership/tiers', async (req, res) => {
    try {
        const tiers = await membershipRepository.getAllMembershipTiers();
        res.json(tiers);
    } catch (error) {
        console.error('Error fetching membership tiers:', error);
        res.status(500).json({ error: 'Failed to fetch membership tiers' });
    }
});

// Get the current available tier (public - for signup flow)
router.get('/api/membership/current-tier', async (req, res) => {
    try {
        const tier = await membershipRepository.getAvailableMembershipTier();
        if (!tier) {
            res.status(404).json({ error: 'No membership tier currently available' });
            return;
        }
        res.json(tier);
    } catch (error) {
        console.error('Error fetching current membership tier:', error);
        res.status(500).json({ error: 'Failed to fetch current tier' });
    }
});

// Get membership stats (admin only)
router.get('/api/admin/membership/stats', requireAdmin, async (req, res) => {
    try {
        const stats = await membershipRepository.getMembershipStats();
        const tiers = await membershipRepository.getAllMembershipTiers();
        res.json({ stats, tiers });
    } catch (error) {
        console.error('Error fetching membership stats:', error);
        res.status(500).json({ error: 'Failed to fetch membership stats' });
    }
});

// Create or update membership tier (admin only)
router.post('/api/admin/membership/tiers', requireAdmin, async (req, res) => {
    try {
        const { tierKey, name, priceCents, maxCapacity, sortOrder, benefits, isActive } = req.body;

        // Check if tier already exists
        const existing = await membershipRepository.getMembershipTier(tierKey);
        if (existing) {
            const updated = await membershipRepository.updateMembershipTier(tierKey, {
                name,
                priceCents,
                maxCapacity,
                sortOrder,
                benefits,
                isActive
            });
            res.json(updated);
        } else {
            const created = await membershipRepository.createMembershipTier({
                tierKey,
                name,
                priceCents,
                maxCapacity,
                sortOrder: sortOrder || 0,
                benefits: benefits || [],
                isActive: isActive !== false
            });
            res.status(201).json(created);
        }
    } catch (error) {
        console.error('Error creating/updating membership tier:', error);
        res.status(500).json({ error: 'Failed to save membership tier' });
    }
});

// Seed default membership tiers (admin only, one-time setup)
router.post('/api/admin/membership/seed', requireAdmin, async (req, res) => {
    try {
        const defaultTiers = [
            {
                tierKey: 'founding',
                name: 'Founding Member',
                priceCents: 1900, // $19
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
                priceCents: 2900, // $29
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
                priceCents: 3900, // $39
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
                priceCents: 4900, // $49
                maxCapacity: null, // unlimited
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

        res.json({ message: 'Membership tiers seeded', results });
    } catch (error) {
        console.error('Error seeding membership tiers:', error);
        res.status(500).json({ error: 'Failed to seed membership tiers' });
    }
});

// Get users by membership tier (admin only)
router.get('/api/admin/membership/users/:tierKey', requireAdmin, async (req, res) => {
    try {
        const { tierKey } = req.params;
        const users = await membershipRepository.getUsersByMembershipTier(tierKey);
        res.json(users.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            membershipTier: u.membershipTier,
            membershipPriceCents: u.membershipPriceCents,
            membershipLockedAt: u.membershipLockedAt
        })));
    } catch (error) {
        console.error('Error fetching users by tier:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Assign membership to current user (during signup/upgrade)
router.post('/api/membership/join', requireAuth, async (req, res) => {
    try {
        const userId = (req as any).userId;

        // Get the user to check if they already have a membership
        const user = await storage.getUser(userId);
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        if (user.membershipTier && !user.membershipCancelledAt) {
            res.status(400).json({ error: 'User already has an active membership' });
            return;
        }

        // Get the current available tier
        const tier = await membershipRepository.getAvailableMembershipTier();
        if (!tier) {
            res.status(400).json({ error: 'No membership tier currently available' });
            return;
        }

        // Check capacity
        if (tier.maxCapacity !== null && tier.currentCount >= tier.maxCapacity) {
            res.status(400).json({ error: 'This tier is full, please try again' });
            return;
        }

        // Assign the membership
        const updated = await membershipRepository.assignUserMembership(userId, tier.tierKey, tier.priceCents);
        if (!updated) {
            res.status(500).json({ error: 'Failed to assign membership' });
            return;
        }

        res.json({
            message: 'Membership assigned successfully',
            membership: {
                tier: tier.tierKey,
                name: tier.name,
                priceCents: tier.priceCents,
                lockedAt: updated.membershipLockedAt
            }
        });
    } catch (error) {
        console.error('Error joining membership:', error);
        res.status(500).json({ error: 'Failed to join membership' });
    }
});

// Get current user's membership info
router.get('/api/membership/me', requireAuth, async (req, res) => {
    try {
        const userId = (req as any).userId;
        const user = await storage.getUser(userId);

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        if (!user.membershipTier) {
            res.json({ hasMembership: false });
            return;
        }

        const tier = await membershipRepository.getMembershipTier(user.membershipTier);

        res.json({
            hasMembership: true,
            isCancelled: !!user.membershipCancelledAt,
            tier: user.membershipTier,
            tierName: tier?.name || user.membershipTier,
            priceCents: user.membershipPriceCents,
            lockedAt: user.membershipLockedAt,
            cancelledAt: user.membershipCancelledAt
        });
    } catch (error) {
        console.error('Error fetching user membership:', error);
        res.status(500).json({ error: 'Failed to fetch membership' });
    }
});

// Cancel membership
router.post('/api/membership/cancel', requireAuth, async (req, res) => {
    try {
        const userId = (req as any).userId;
        const updated = await membershipRepository.cancelUserMembership(userId);

        if (!updated) {
            res.status(400).json({ error: 'No active membership to cancel' });
            return;
        }

        res.json({ message: 'Membership cancelled', cancelledAt: updated.membershipCancelledAt });
    } catch (error) {
        console.error('Error cancelling membership:', error);
        res.status(500).json({ error: 'Failed to cancel membership' });
    }
});

export default router;
