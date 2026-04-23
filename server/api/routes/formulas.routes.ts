import { Router } from 'express';
import { formulasController } from '../controller/formulas.controller';
import { requireAuth } from '../middleware/middleware';

const router = Router();

// ==================== USER FORMULA ENDPOINTS ====================

// Get current active formula for user
router.get('/current', requireAuth, formulasController.getCurrentFormula);

// Get manufacturer quote for current active formula
router.get('/current/quote', requireAuth, formulasController.getFormulaQuote);

// Get formula version history for user
router.get('/history', requireAuth, formulasController.getFormulaHistory);

// Get specific formula version by ID
router.get('/versions/:formulaId', requireAuth, formulasController.getFormulaVersion);

// Get manufacturer quote for specific formula by ID
router.get('/:formulaId/quote', requireAuth, formulasController.getFormulaQuote);

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

// Get formula drift / review status
router.get('/review-status', requireAuth, formulasController.getReviewStatus);

// ==================== SAFETY ACKNOWLEDGMENT ENDPOINTS ====================

// Acknowledge formula warnings (required before checkout for serious warnings)
router.post('/:formulaId/acknowledge-warnings', requireAuth, formulasController.acknowledgeWarnings);

// Get acknowledgment status for a formula
router.get('/:formulaId/acknowledgment-status', requireAuth, formulasController.getAcknowledgmentStatus);

// Public endpoint - Get shared formula by token (no auth required)
router.get('/shared/:shareToken', formulasController.getSharedFormula);

// Toggle formula sharing
router.patch('/:formulaId/share', requireAuth, formulasController.toggleSharing);

export default router;
