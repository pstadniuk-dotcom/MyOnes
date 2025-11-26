/**
 * Authentication routes
 * Handles: signup, login, logout, and user session management
 */

import { Router } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { storage } from '../storage';
import { logger } from '../logger';
import { 
  requireAuth, 
  generateToken, 
  getClientIP, 
  checkRateLimit 
} from './middleware';
import { signupSchema, loginSchema, type AuthResponse } from '@shared/schema';

const router = Router();

/**
 * POST /api/auth/signup
 * Register a new user account
 */
router.post('/signup', async (req, res) => {
  const startTime = Date.now();
  logger.info('Signup request started', {
    clientIP: getClientIP(req),
    email: req.body?.email
  });

  try {
    // Rate limiting for signup (3 attempts per 15 minutes per IP)
    const clientIP = getClientIP(req);
    const rateLimit = checkRateLimit(`signup-${clientIP}`, 3, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      logger.warn('Signup rate limit exceeded', { clientIP });
      return res.status(429).json({ 
        error: 'Too many signup attempts. Please try again later.', 
        retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
      });
    }

    // Validate request body
    const validatedData = signupSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(validatedData.email);
    if (existingUser) {
      logger.info('Signup failed: user exists', { email: validatedData.email });
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Hash password with secure salt rounds
    const saltRounds = 12; // OWASP recommendation
    const hashedPassword = await bcrypt.hash(validatedData.password, saltRounds);

    // Create user
    const userData = {
      name: validatedData.name,
      email: validatedData.email,
      phone: validatedData.phone || null,
      password: hashedPassword
    };

    const user = await storage.createUser(userData);
    logger.info('User created successfully', { userId: user.id, email: user.email });
    
    // Generate JWT token
    const token = generateToken(user.id, user.isAdmin || false);

    // Return user data without password
    const authResponse: AuthResponse = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        createdAt: user.createdAt.toISOString(),
        isAdmin: user.isAdmin || false
      },
      token
    };

    logger.info('Signup success', { 
      duration: `${Date.now() - startTime}ms`,
      userId: user.id 
    });

    return res.status(201).json(authResponse);
  } catch (error: any) {
    logger.error('Signup error', { 
      error: error.message,
      duration: `${Date.now() - startTime}ms`,
      type: error.name
    });
    
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
    }
    
    return res.status(500).json({ error: 'Failed to create account' });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
router.post('/login', async (req, res) => {
  try {
    // Rate limiting for login (5 attempts per 15 minutes per IP)
    const clientIP = getClientIP(req);
    const rateLimit = checkRateLimit(`login-${clientIP}`, 5, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      logger.warn('Login rate limit exceeded', { clientIP });
      return res.status(429).json({ 
        error: 'Too many login attempts. Please try again later.', 
        retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
      });
    }

    // Validate request body
    const validatedData = loginSchema.parse(req.body);
    
    // Find user by email
    const user = await storage.getUserByEmail(validatedData.email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(validatedData.password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = generateToken(user.id, user.isAdmin || false);

    // Return user data without password
    const authResponse: AuthResponse = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        createdAt: user.createdAt.toISOString(),
        isAdmin: user.isAdmin || false
      },
      token
    };

    logger.info('Login success', { userId: user.id });
    res.json(authResponse);
  } catch (error: any) {
    logger.error('Login error', { error: error.message });
    
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
    }
    
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /api/auth/logout
 * Log out the current user (client-side token removal)
 */
router.post('/logout', (req, res) => {
  // With JWT tokens, logout is primarily handled client-side
  res.json({ message: 'Logged out successfully' });
});

/**
 * GET /api/auth/me
 * Get the current authenticated user's data
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return user data without password
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      addressLine1: user.addressLine1,
      addressLine2: user.addressLine2,
      city: user.city,
      state: user.state,
      postalCode: user.postalCode,
      country: user.country,
      createdAt: user.createdAt.toISOString(),
      isAdmin: user.isAdmin || false
    };

    res.json({ user: userData });
  } catch (error) {
    logger.error('Get user error', { error });
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

export default router;
