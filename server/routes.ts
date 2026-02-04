import express, { type Express } from "express";
import type { RateLimitRequestHandler } from "express-rate-limit";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  authRoutes,
  userRoutes,
  notificationRoutes,
  adminRoutes,
  supportRoutes,
  consentsRoutes,
  filesRoutes,
  formulasRoutes,
  ingredientsRoutes,
  wearablesRoutes,
  webhooksRoutes,
  optimizeRoutes,
  membershipRoutes,
  chatRoutes,
  dashboardRoutes,
  systemRoutes
} from "./api/routes";
import { initializeAiSettings } from "./infra/ai/ai-config";
import logger from "./infra/logging/logger";

/**
 * Register all server routes
 * Refactored to use modular route components for better maintainability.
 */
export async function registerRoutes(app: Express, rateLimiters?: { authLimiter?: RateLimitRequestHandler, aiLimiter?: RateLimitRequestHandler }): Promise<Server> {
  // Initialize AI settings from database (loads provider/model overrides)
  try {
    await initializeAiSettings(storage);
  } catch (err) {
    logger.error('Failed to initialize AI settings at startup', { error: err });
  }

  // Use Express built-in JSON middleware (stable and reliable)
  app.use('/api', express.json({
    limit: '10mb',
    strict: true,
    type: 'application/json'
  }));

  // Security headers for all API routes (HIPAA & Security Compliance)
  app.use('/api', (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Apply rate limiters if provided (prevent brute force and AI cost spikes)
  if (rateLimiters?.authLimiter) {
    app.use('/api/auth', rateLimiters.authLimiter);
  }
  if (rateLimiters?.aiLimiter) {
    app.use('/api/chat', rateLimiters.aiLimiter);
  }

  // ----------------------------------------------------------------------------
  // Modular Route Registration
  // ----------------------------------------------------------------------------

  // High-level modules
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/support', supportRoutes);
  app.use('/api/consents', consentsRoutes);
  app.use('/api/files', filesRoutes);

  // Domain specific modules
  app.use('/api/formulas', formulasRoutes);
  app.use('/api/users/me/formula', formulasRoutes); // Legacy & UX consistency mapping
  app.use('/api/ingredients', ingredientsRoutes);
  app.use('/api/wearables', wearablesRoutes);
  app.use('/api/webhooks', webhooksRoutes);
  app.use('/api/optimize', optimizeRoutes);
  app.use('/api/membership', membershipRoutes);

  // AI & Communication
  app.use('/api/chat', chatRoutes);

  // System Utility routes (Health, Debug)
  app.use('/api', systemRoutes);

  logger.info('🚀 Modular backend routes successfully registered');

  // Create and return the HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
