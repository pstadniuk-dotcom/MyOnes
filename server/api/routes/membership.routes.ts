import { Router } from 'express';
import { membershipController } from '../controller/membership.controller';
import { requireAuth, requireAdmin } from '../middleware/middleware';

const router = Router();

// Public Routes
router.get('/tiers', membershipController.getAllTiers);
router.get('/current-tier', membershipController.getAvailableTier);

// User Routes
router.post('/join', requireAuth, membershipController.joinMembership);
router.get('/me', requireAuth, membershipController.getMyMembership);
router.post('/cancel', requireAuth, membershipController.cancelMembership);

// Admin Routes
router.get('/admin/stats', requireAdmin, membershipController.getMembershipStats);
router.post('/admin/tiers', requireAdmin, membershipController.createOrUpdateTier);
router.post('/admin/seed', requireAdmin, membershipController.seedDefaultTiers);
router.get('/admin/users/:tierKey', requireAdmin, membershipController.getUsersByTier);

export default router;
