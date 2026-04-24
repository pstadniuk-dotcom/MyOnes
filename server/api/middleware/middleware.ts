/**
 * Authentication and authorization middleware
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { usersRepository } from '../../modules/users/users.repository';
import { logger } from '../../infra/logging/logger';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      rawBody?: Buffer;
    }
  }
}

// JWT Configuration - SECURITY CRITICAL
const JWT_SECRET_RAW = process.env.JWT_SECRET;

if (!JWT_SECRET_RAW) {
  logger.error('FATAL: JWT_SECRET environment variable is required. Set it before starting the server.');
  process.exit(1);
}

export const JWT_SECRET: string = JWT_SECRET_RAW;
export const JWT_EXPIRES_IN = '1h';
export const REFRESH_TOKEN_EXPIRES_DAYS = 7;

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
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as { userId: string; isAdmin?: boolean };
    return decoded;
  } catch (error) {
    return null;
  }
}

// SSE ticket store — short-lived single-use tokens for EventSource connections
const sseTicketStore = new Map<string, { userId: string; expiresAt: number }>();

/**
 * Create a short-lived single-use SSE ticket for a user.
 * Used instead of passing JWTs in URL query params (which leak into logs/referrers).
 */
export function createSseTicket(userId: string): string {
  const ticket = crypto.randomBytes(32).toString('hex');
  sseTicketStore.set(ticket, { userId, expiresAt: Date.now() + 30_000 }); // 30 seconds
  return ticket;
}

/**
 * Validate and consume an SSE ticket (single-use).
 */
function consumeSseTicket(ticket: string): string | null {
  const entry = sseTicketStore.get(ticket);
  if (!entry) return null;
  sseTicketStore.delete(ticket); // single-use
  if (Date.now() > entry.expiresAt) return null;
  return entry.userId;
}

// Clean up expired SSE tickets
setInterval(() => {
  const now = Date.now();
  sseTicketStore.forEach((value, key) => {
    if (now > value.expiresAt) sseTicketStore.delete(key);
  });
}, 30_000);

/**
 * Middleware to require authentication
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  // Support SSE ticket via query param (EventSource can't set headers)
  const queryTicket = req.query.ticket as string | undefined;

  // 1. Try Bearer token from Authorization header
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.userId = decoded.userId;
    return next();
  }

  // 2. Try SSE ticket (preferred for EventSource)
  if (queryTicket) {
    const userId = consumeSseTicket(queryTicket);
    if (!userId) {
      return res.status(401).json({ error: 'Invalid or expired SSE ticket' });
    }
    req.userId = userId;
    return next();
  }



  return res.status(401).json({ error: 'Authentication required' });
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
    const user = await usersRepository.getUser(decoded.userId);
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
