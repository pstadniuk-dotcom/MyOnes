/**
 * User-related routes
 * Handles: profile management, health profiles, subscriptions, payments
 */

import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { logger } from '../logger';
import { requireAuth } from './middleware';
import { insertHealthProfileSchema } from '@shared/schema';

const router = Router();

/**
 * GET /api/users/me/formula
 * Get user's current active formula
 */
router.get('/me/formula', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const currentFormula = await storage.getCurrentFormulaByUser(userId);
    
    if (!currentFormula) {
      return res.status(404).json({ error: 'No formula found' });
    }

    res.json(currentFormula);
  } catch (error) {
    logger.error('Get current formula error', { error });
    res.status(500).json({ error: 'Failed to fetch formula' });
  }
});

/**
 * GET /api/users/me/health-profile
 * Get user's health profile
 */
router.get('/me/health-profile', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const healthProfile = await storage.getHealthProfile(userId);
    
    if (!healthProfile) {
      return res.status(404).json({ error: 'No health profile found' });
    }

    res.json(healthProfile);
  } catch (error) {
    logger.error('Get health profile error', { error });
    res.status(500).json({ error: 'Failed to fetch health profile' });
  }
});

/**
 * POST /api/users/me/health-profile
 * Create or update user's health profile
 */
router.post('/me/health-profile', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    
    logger.info('Health profile save request', { userId, body: req.body });
    
    // Validate request body with proper Zod schema
    const healthProfileUpdate = insertHealthProfileSchema.omit({ userId: true }).parse({
      age: req.body.age,
      sex: req.body.sex,
      weightLbs: req.body.weightLbs,
      heightCm: req.body.heightCm,
      bloodPressureSystolic: req.body.bloodPressureSystolic,
      bloodPressureDiastolic: req.body.bloodPressureDiastolic,
      restingHeartRate: req.body.restingHeartRate,
      sleepHoursPerNight: req.body.sleepHoursPerNight,
      exerciseDaysPerWeek: req.body.exerciseDaysPerWeek,
      stressLevel: req.body.stressLevel,
      smokingStatus: req.body.smokingStatus,
      alcoholDrinksPerWeek: req.body.alcoholDrinksPerWeek,
      conditions: req.body.conditions,
      medications: req.body.medications,
      allergies: req.body.allergies
    });

    logger.info('Health profile validated', { userId, validatedData: healthProfileUpdate });

    // Check if profile exists
    const existingProfile = await storage.getHealthProfile(userId);
    
    logger.info('Existing profile check', { userId, hasExisting: !!existingProfile });
    
    let healthProfile;
    if (existingProfile) {
      healthProfile = await storage.updateHealthProfile(userId, healthProfileUpdate);
      logger.info('Health profile updated', { userId, result: !!healthProfile });
    } else {
      healthProfile = await storage.createHealthProfile({
        userId,
        ...healthProfileUpdate
      });
      logger.info('Health profile created', { userId, result: !!healthProfile });
    }

    res.json(healthProfile);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('Health profile validation error', { error: error.errors });
      return res.status(400).json({ 
        error: 'Invalid health profile data', 
        details: error.errors 
      });
    }
    logger.error('Save health profile error', { 
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error 
    });
    res.status(500).json({ error: 'Failed to save health profile' });
  }
});

/**
 * PATCH /api/users/me/profile
 * Update user profile (name, email, phone, address)
 */
router.patch('/me/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    
    // Create validation schema for profile updates
    const updateProfileSchema = z.object({
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      phone: z.string().nullable().optional(),
      addressLine1: z.string().nullable().optional(),
      addressLine2: z.string().nullable().optional(),
      city: z.string().nullable().optional(),
      state: z.string().nullable().optional(),
      postalCode: z.string().nullable().optional(),
      country: z.string().nullable().optional(),
    });
    
    // Validate request body
    const validatedData = updateProfileSchema.parse(req.body);
    
    // If email is being changed, check if it's already in use
    if (validatedData.email) {
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser && existingUser.id !== userId) {
        return res.status(409).json({ error: 'Email already in use by another account' });
      }
    }
    
    // Update user profile
    const updatedUser = await storage.updateUser(userId, validatedData);
    
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Return user without password
    const { password, ...userWithoutPassword } = updatedUser;
    res.json({ user: userWithoutPassword });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid profile data', 
        details: error.errors 
      });
    }
    logger.error('Update profile error', { error });
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * GET /api/users/me/orders
 * Get user's order history
 */
router.get('/me/orders', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const orders = await storage.listOrdersByUser(userId);
    res.json(orders);
  } catch (error) {
    logger.error('Get orders error', { error });
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

/**
 * PATCH /api/users/me/timezone
 * Update user's timezone for SMS scheduling
 */
router.patch('/me/timezone', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { timezone } = req.body;
    
    if (!timezone || typeof timezone !== 'string') {
      return res.status(400).json({ error: 'Valid timezone required' });
    }
    
    const updatedUser = await storage.updateUser(userId, { timezone });
    
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ timezone: updatedUser.timezone });
  } catch (error) {
    logger.error('Update timezone error', { error });
    res.status(500).json({ error: 'Failed to update timezone' });
  }
});

/**
 * GET /api/users/me/subscription
 * Get user's subscription status
 */
router.get('/me/subscription', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const subscription = await storage.getSubscription(userId);
    
    if (!subscription) {
      return res.status(404).json({ error: 'No subscription found' });
    }
    
    res.json(subscription);
  } catch (error) {
    logger.error('Get subscription error', { error });
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

/**
 * GET /api/users/me/sessions
 * Get user's chat sessions
 */
router.get('/me/sessions', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const sessions = await storage.listChatSessionsByUser(userId);
    res.json(sessions);
  } catch (error) {
    logger.error('Get sessions error', { error });
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

export default router;
