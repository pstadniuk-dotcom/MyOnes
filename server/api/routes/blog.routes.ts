import { Router } from 'express';
import {
  listPosts,
  getCategories,
  searchPosts,
  getPost,
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
} from '../controller/blog.controller';
import { requireAdmin } from '../middleware/middleware';

const router = Router();

// ── Public routes ──
router.get('/', listPosts);
router.get('/categories', getCategories);
router.get('/search', searchPosts);

// ── Admin routes — must come before /:slug to avoid shadowing ──
router.get('/admin/all', requireAdmin, adminListPosts);
router.post('/admin/generate', requireAdmin, adminAiGenerate);
router.get('/admin/:id', requireAdmin, adminGetPost);
router.patch('/admin/:id', requireAdmin, adminUpdatePost);
router.patch('/admin/:id/publish', requireAdmin, adminTogglePublish);
router.delete('/admin/:id', requireAdmin, adminDeletePost);
router.post('/admin/:id/ai-revise', requireAdmin, adminAiRevise);

// ── Admin legacy routes ──
router.post('/', requireAdmin, createPost);
router.put('/:slug', requireAdmin, updatePost);
router.post('/bulk/insert', requireAdmin, bulkCreatePosts);

// ── Public post (last, catches /:slug) ──
router.get('/:slug', getPost);

export default router;
