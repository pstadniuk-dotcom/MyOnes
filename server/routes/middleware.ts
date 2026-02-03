/**
 * Authentication and authorization middleware
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { userService } from '../domains/users/user.service';
import { logger } from '../infrastructure/logging/logger';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

// JWT Configuration - SECURITY CRITICAL
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT === 'production';

const JWT_SECRET_RAW = process.env.JWT_SECRET;

if (!JWT_SECRET_RAW) {
  if (isProduction) {
    logger.error('FATAL: JWT_SECRET environment variable is required in production.');
    logger.error('Set JWT_SECRET in Railway dashboard: railway.app → Variables');
    process.exit(1);
  }
  logger.warn('JWT_SECRET not set. Using insecure dev fallback. DO NOT DEPLOY THIS.');
}

export const JWT_SECRET: string = JWT_SECRET_RAW || 'dev-only-insecure-secret-do-not-use-in-production';
export const JWT_EXPIRES_IN = '7d';

/**
 * Generate a JWT token for a user
 */
export function generateToken(userId: string, isAdmin: boolean = false): string {
  return jwt.sign({ userId, isAdmin }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): { userId: string; isAdmin?: boolean } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; isAdmin?: boolean };
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Middleware to require authentication
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.userId = decoded.userId;
  next();
}

/**
 * Middleware to require admin privileges
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    const user = await userService.getUser(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.userId = decoded.userId;
    next();
  } catch (error) {
    logger.error('Admin verification error', { error });
    return res.status(500).json({ error: 'Failed to verify admin status' });
  }
}

// Rate limiting store for API calls
const rateLimitStore = new Map<string, { count: number, resetTime: number }>();

/**
 * Get client IP address from request
 */
export function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

/**
 * Check rate limit for a client
 */
export function checkRateLimit(
  clientId: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(clientId);

  if (!entry || now > entry.resetTime) {
    const resetTime = now + windowMs;
    rateLimitStore.set(clientId, { count: 1, resetTime });
    return { allowed: true, remaining: limit - 1, resetTime };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetTime: entry.resetTime };
}

// Clean up rate limit store periodically
setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];
  rateLimitStore.forEach((value, key) => {
    if (now > value.resetTime) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => rateLimitStore.delete(key));
}, 60000);
