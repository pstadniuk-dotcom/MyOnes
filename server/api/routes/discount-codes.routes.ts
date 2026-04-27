import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/middleware';
import { discountCodesController } from '../controller/discount-codes.controller';

const router = Router();

// User-facing: preview the effect of a code at checkout (does NOT reserve it)
router.post('/validate', requireAuth, discountCodesController.validate);

// Admin CRUD
router.get('/admin', requireAdmin, discountCodesController.list);
router.get('/admin/stats', requireAdmin, discountCodesController.stats);
router.post('/admin', requireAdmin, discountCodesController.create);
router.patch('/admin/:id', requireAdmin, discountCodesController.update);
router.delete('/admin/:id', requireAdmin, discountCodesController.deactivate);

export default router;
