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

// Export all route modules
export { default as authRoutes } from '../modules/auth/routes';
export { default as userRoutes } from '../modules/users/routes';
export { default as notificationRoutes } from '../modules/notifications/routes';
export { default as adminRoutes } from '../modules/admin/routes';
export { default as supportRoutes } from '../modules/support/routes';
export { default as consentsRoutes } from '../modules/consents/routes';
export { default as filesRoutes } from '../modules/files/routes';
export { default as formulasRoutes } from '../modules/formulas/routes';
export { default as ingredientsRoutes } from '../modules/ingredients/routes';
// Junction-based wearables integration (replaces direct OAuth)
export { default as wearablesRoutes } from '../modules/wearables/routes';
export { default as webhooksRoutes } from '../modules/webhooks/routes';
export { default as optimizeRoutes } from '../modules/optimize/routes';
export { default as membershipRoutes } from '../modules/membership/routes';

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
