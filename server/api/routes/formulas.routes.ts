import { Router } from 'express';
import { formulasController } from '../controller/formulas.controller';
import { requireAuth } from '../middleware/middleware';

const router = Router();

// ==================== USER FORMULA ENDPOINTS ====================

// Get current active formula for user
router.get('/current', requireAuth, formulasController.getCurrentFormula);

// Get formula version history for user
router.get('/history', requireAuth, formulasController.getFormulaHistory);

// Get specific formula version by ID
router.get('/versions/:formulaId', requireAuth, formulasController.getFormulaVersion);

// Compare two formula versions
router.get('/compare/:id1/:id2', requireAuth, formulasController.compareFormulas);

// Revert to previous formula version
router.post('/revert', requireAuth, formulasController.revertFormula);

// Add user customizations to a formula
router.patch('/:formulaId/customize', requireAuth, formulasController.customizeFormula);

// Create custom formula from scratch
router.post('/custom', requireAuth, formulasController.createCustomFormula);

// Rename a formula
router.patch('/:formulaId/rename', requireAuth, formulasController.renameFormula);

// Archive a formula (soft delete)
router.post('/:formulaId/archive', requireAuth, formulasController.archiveFormula);

// Restore an archived formula
router.post('/:formulaId/restore', requireAuth, formulasController.restoreFormula);

// Get user's archived formulas
router.get('/archived', requireAuth, formulasController.getArchivedFormulas);

// ==================== REVIEW SCHEDULE ENDPOINTS ====================

// Get review schedule for a formula
router.get('/:formulaId/review-schedule', requireAuth, formulasController.getReviewSchedule);

// Create or update review schedule
router.put('/:formulaId/review-schedule', requireAuth, formulasController.saveReviewSchedule);

// Delete review schedule
router.delete('/:formulaId/review-schedule', requireAuth, formulasController.deleteReviewSchedule);

// Download .ics calendar file for review schedule
router.get('/:formulaId/review-schedule/calendar', requireAuth, formulasController.downloadCalendar);

// Public endpoint - Get shared formula by ID (no auth required)
router.get('/shared/:formulaId', formulasController.getSharedFormula);

export default router;
