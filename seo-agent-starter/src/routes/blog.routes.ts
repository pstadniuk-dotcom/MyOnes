/**
 * Blog Routes — Express router for all blog endpoints
 *
 * Mount this at /api/blog in your Express app.
 *
 * CUSTOMIZE: Replace `requireAdmin` with your own auth middleware.
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  listPosts,
  getCategories,
  searchPosts,
  getPost,
  getSitemap,
  getBlogSitemap,
  createPost,
  updatePost,
  bulkCreatePosts,
  adminListPosts,
  adminGetPost,
  adminUpdatePost,
  adminTogglePublish,
  adminDeletePost,
  adminAiRevise,
  adminAiGenerate,
  adminGetAutoGenSettings,
  adminSaveAutoGenSettings,
  adminTriggerAutoGenRun,
} from './blog.controller';

const router = Router();

// ─────────────────────────────────────────────────────────────
// Auth Middleware Placeholder
// CUSTOMIZE: Replace with your real auth middleware
// ─────────────────────────────────────────────────────────────
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // Example: check for a Bearer token or session
  // const token = req.headers.authorization?.split(' ')[1];
  // if (!verifyAdminToken(token)) return res.status(403).json({ error: 'Forbidden' });

  // For development, allow all requests through:
  const adminKey = req.headers['x-admin-key'];
  if (process.env.ADMIN_API_KEY && adminKey !== process.env.ADMIN_API_KEY) {
    return res.status(403).json({ error: 'Forbidden — invalid admin key' });
  }
  next();
}

// ── Public routes ────────────────────────────────────────────
router.get('/', listPosts);
router.get('/sitemap.xml', getSitemap);
router.get('/sitemap-blog.xml', getBlogSitemap);
router.get('/categories', getCategories);
router.get('/search', searchPosts);

// ── Admin routes (must come before /:slug to avoid shadowing) ──
router.get('/admin/all', requireAdmin, adminListPosts);
router.post('/admin/generate', requireAdmin, adminAiGenerate);
router.get('/admin/auto-gen/settings', requireAdmin, adminGetAutoGenSettings);
router.patch('/admin/auto-gen/settings', requireAdmin, adminSaveAutoGenSettings);
router.post('/admin/auto-gen/run', requireAdmin, adminTriggerAutoGenRun);
router.get('/admin/:id', requireAdmin, adminGetPost);
router.patch('/admin/:id', requireAdmin, adminUpdatePost);
router.patch('/admin/:id/publish', requireAdmin, adminTogglePublish);
router.delete('/admin/:id', requireAdmin, adminDeletePost);
router.post('/admin/:id/ai-revise', requireAdmin, adminAiRevise);

// ── Admin legacy routes ──
router.post('/', requireAdmin, createPost);
router.put('/:slug', requireAdmin, updatePost);
router.post('/bulk/insert', requireAdmin, bulkCreatePosts);

// ── Public post (last — catches /:slug) ──
router.get('/:slug', getPost);

export default router;
