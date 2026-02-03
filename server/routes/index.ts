/**
 * Route aggregation module
 * 
 * This file exports all modular route handlers for use in the main routes.ts file.
 * Routes are being migrated incrementally from the monolithic routes.ts to
 * individual route modules for better organization and maintainability.
 * 
 * Migration Status:
 * ✅ auth.routes.ts - /api/auth/* (signup, login, logout, me)
 * ✅ user.routes.ts - /api/users/* (profile, health-profile, orders, etc.)
 * ✅ notifications.routes.ts - /api/notifications/*
 * ✅ admin.routes.ts - /api/admin/* (stats, users, support-tickets)
 * ✅ support.routes.ts - /api/support/* (FAQ, tickets, help)
 * ✅ consents.routes.ts - /api/consents/*
 * ✅ files.routes.ts - /api/files/*
 * ✅ formulas.routes.ts - /api/formulas/*, /api/users/me/formula/*
 * ✅ ingredients.routes.ts - /api/ingredients/*
 * ✅ wearables.routes.ts - /api/wearables/*
 * ✅ optimize.routes.ts - /api/optimize/*
 * 
 * Still in routes.ts (complex, to be migrated later):
 * - /api/chat/* (AI chat streaming - 1300+ lines, complex SSE handling)
 */

import chatRoutes from "./chat.routes";

// Export all route modules
export { default as authRoutes } from './auth.routes';
export { default as userRoutes } from './user.routes';
export { default as notificationRoutes } from './notifications.routes';
export { default as adminRoutes } from './admin.routes';
export { default as supportRoutes } from './support.routes';
export { default as consentsRoutes } from './consents.routes';
export { default as filesRoutes } from './files.routes';
export { default as formulasRoutes } from './formulas.routes';
export { default as ingredientsRoutes } from './ingredients.routes';
// Junction-based wearables integration (replaces direct OAuth)
export { default as wearablesRoutes } from './junction.routes';
export { default as webhooksRoutes } from './webhooks.routes';
export { default as optimizeRoutes } from './optimize.routes';
export { default as chatRoutes } from './chat.routes';
export { default as dashboardRoutes } from './dashboard.routes';

// Export middleware for use in routes.ts during migration
export {
  requireAuth,
  requireAdmin,
  generateToken,
  verifyToken,
  getClientIP,
  checkRateLimit,
  JWT_SECRET,
  JWT_EXPIRES_IN
} from './middleware';
