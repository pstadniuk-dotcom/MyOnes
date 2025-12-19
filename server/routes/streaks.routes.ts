/**
 * Streak Rewards Routes
 * 
 * Handles streak-based discount rewards for supplement compliance
 */

import { Router } from 'express';
import { storage } from '../storage';
import { requireAuth } from './middleware';
import logger from '../logger';

const router = Router();

/**
 * GET /api/streaks/rewards
 * Get user's current streak rewards data
 */
router.get('/rewards', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const rewards = await storage.getStreakRewards(userId);
    res.json(rewards);
  } catch (error) {
    logger.error('Error fetching streak rewards:', error);
    res.status(500).json({ error: 'Failed to fetch streak rewards' });
  }
});

/**
 * POST /api/streaks/check-supplement-completion
 * Check if all supplements were taken today and update streak
 * Called after supplement logging
 */
router.post('/check-supplement-completion', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { allDosesTaken } = req.body;
    
    if (typeof allDosesTaken !== 'boolean') {
      return res.status(400).json({ error: 'allDosesTaken boolean required' });
    }

    await storage.updateStreakProgress(userId, allDosesTaken);
    
    // Return updated rewards
    const rewards = await storage.getStreakRewards(userId);
    res.json({ 
      success: true, 
      rewards,
      message: allDosesTaken ? 'Streak updated!' : 'Keep going to maintain your streak'
    });
  } catch (error) {
    logger.error('Error checking supplement completion:', error);
    res.status(500).json({ error: 'Failed to update streak' });
  }
});

/**
 * GET /api/streaks/discount
 * Get the current discount amount for the user
 */
router.get('/discount', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const rewards = await storage.getStreakRewards(userId);
    
    // Only return discount if in reorder window
    const canApplyDiscount = ['ready', 'warning', 'grace'].includes(rewards.streakStatus);
    
    res.json({
      discountPercent: canApplyDiscount ? rewards.discountEarned : 0,
      canApply: canApplyDiscount,
      streakDays: rewards.currentStreak,
      tier: rewards.discountTier,
      status: rewards.streakStatus,
    });
  } catch (error) {
    logger.error('Error fetching streak discount:', error);
    res.status(500).json({ error: 'Failed to fetch discount' });
  }
});

/**
 * POST /api/streaks/apply-discount
 * Apply streak discount to an order
 */
router.post('/apply-discount', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { orderId } = req.body;
    
    if (!orderId) {
      return res.status(400).json({ error: 'orderId required' });
    }

    // Verify the order belongs to the user
    const order = await storage.getOrder(orderId);
    if (!order || order.userId !== userId) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Apply the discount
    const discountApplied = await storage.applyStreakDiscount(userId, orderId);
    
    res.json({
      success: true,
      discountApplied,
      message: discountApplied > 0 
        ? `${discountApplied}% streak discount applied!` 
        : 'No discount available'
    });
  } catch (error) {
    logger.error('Error applying streak discount:', error);
    res.status(500).json({ error: 'Failed to apply discount' });
  }
});

/**
 * GET /api/streaks/tiers
 * Get all available streak tiers
 */
router.get('/tiers', async (_req, res) => {
  const tiers = [
    { days: 7, discount: 5, badge: '🥉', label: 'Consistent' },
    { days: 14, discount: 8, badge: '🥈', label: 'Committed' },
    { days: 30, discount: 10, badge: '🥇', label: 'Dedicated' },
    { days: 60, discount: 15, badge: '💎', label: 'Loyal' },
    { days: 90, discount: 20, badge: '👑', label: 'Champion' },
  ];
  res.json({ tiers, maxDiscount: 20 });
});

export default router;
