import { Request, Response } from 'express';
import { membershipService } from '../../modules/membership/membership.service';

export class MembershipController {
    async getAllTiers(req: Request, res: Response) {
        try {
            const tiers = await membershipService.getAllTiers();
            res.json(tiers);
        } catch (error) {
            console.error('Error fetching membership tiers:', error);
            res.status(500).json({ error: 'Failed to fetch membership tiers' });
        }
    }

    async getAvailableTier(req: Request, res: Response) {
        try {
            const tier = await membershipService.getAvailableTier();
            res.json(tier);
        } catch (error: any) {
            console.error('Error fetching current membership tier:', error);
            if (error.message === 'No membership tier currently available') {
                return res.status(404).json({ error: error.message });
            }
            res.status(500).json({ error: 'Failed to fetch current tier' });
        }
    }

    async getMembershipStats(req: Request, res: Response) {
        try {
            const stats = await membershipService.getMembershipStats();
            res.json(stats);
        } catch (error) {
            console.error('Error fetching membership stats:', error);
            res.status(500).json({ error: 'Failed to fetch membership stats' });
        }
    }

    async createOrUpdateTier(req: Request, res: Response) {
        try {
            const result = await membershipService.createOrUpdateTier(req.body);
            res.json(result);
        } catch (error) {
            console.error('Error creating/updating membership tier:', error);
            res.status(500).json({ error: 'Failed to save membership tier' });
        }
    }

    async seedDefaultTiers(req: Request, res: Response) {
        try {
            const results = await membershipService.seedDefaultTiers();
            res.json({ message: 'Membership tiers seeded', results });
        } catch (error) {
            console.error('Error seeding membership tiers:', error);
            res.status(500).json({ error: 'Failed to seed membership tiers' });
        }
    }

    async getUsersByTier(req: Request, res: Response) {
        try {
            const { tierKey } = req.params;
            const users = await membershipService.getUsersByTier(tierKey);
            res.json(users);
        } catch (error) {
            console.error('Error fetching users by tier:', error);
            res.status(500).json({ error: 'Failed to fetch users' });
        }
    }

    async joinMembership(req: Request, res: Response) {
        try {
            const userId = (req as any).userId;
            const result = await membershipService.joinMembership(userId);
            res.json({
                message: 'Membership assigned successfully',
                membership: result
            });
        } catch (error: any) {
            console.error('Error joining membership:', error);
            const status = ['User not found', 'No membership tier currently available'].includes(error.message) ? 404 : 400;
            if (error.message === 'Failed to assign membership') {
                return res.status(500).json({ error: error.message });
            }
            res.status(status).json({ error: error.message });
        }
    }

    async getMyMembership(req: Request, res: Response) {
        try {
            const userId = (req as any).userId;
            const membership = await membershipService.getUserMembership(userId);
            res.json(membership);
        } catch (error: any) {
            console.error('Error fetching user membership:', error);
            const status = error.message === 'User not found' ? 404 : 500;
            res.status(status).json({ error: error.message });
        }
    }

    async cancelMembership(req: Request, res: Response) {
        try {
            const userId = (req as any).userId;
            const updated = await membershipService.cancelMembership(userId);
            res.json({ message: 'Membership cancelled', cancelledAt: updated.membershipCancelledAt });
        } catch (error: any) {
            console.error('Error cancelling membership:', error);
            res.status(400).json({ error: error.message });
        }
    }
}

export const membershipController = new MembershipController();
