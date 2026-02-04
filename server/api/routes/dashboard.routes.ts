import { Router } from 'express';
import { dashboardController } from '../controller/dashboard.controller';
import { requireAuth } from '../middleware/middleware';

const router = Router();

// Main Dashboard Data
router.get('/', requireAuth, dashboardController.getDashboardData);

// Wellness/Tracking Dashboard
router.get('/wellness', requireAuth, dashboardController.getWellnessData);

// Multi-domain Habit/Streak Summary
router.get('/streaks/summary', requireAuth, dashboardController.getStreakSummary);

export default router;
