/**
 * Formulas Routes Module
 * 
 * Handles all formula-related endpoints:
 * - /api/users/me/formula/* (user's formulas)
 * - /api/formulas/* (shared/public formulas, review schedules)
 */

import { Router } from 'express';
import { userService } from '../domains/users/user.service';
import { formulaService } from '../domains/formulas/formula.service';
import { notificationService } from '../domains/notifications/notification.service';
import { requireAuth } from './middleware';
import { getIngredientDose, isValidIngredient } from '@shared/ingredients';
import { logger } from '../infrastructure/logging/logger';

const router = Router();

// SECURITY: Immutable formula limits - CANNOT be changed by user requests or AI prompts
const FORMULA_LIMITS = {
  MAX_TOTAL_DOSAGE: 5500,        // Maximum total daily dosage in mg
  DOSAGE_TOLERANCE: 50,          // Allow 50mg tolerance (0.9%) for rounding/calculation differences
  MIN_INGREDIENT_DOSE: 10,       // Global minimum dose per ingredient in mg
  MAX_INGREDIENT_COUNT: 50,      // Maximum number of ingredients
} as const;

// ==================== USER FORMULA ENDPOINTS ====================

// Get current active formula for user
router.get('/current', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const currentFormula = await formulaService.getCurrentFormulaByUser(userId);

    if (!currentFormula) {
      return res.status(404).json({ error: 'No formula found for user' });
    }

    // Get the latest version changes for context (non-fatal)
    let versionChanges: any[] = [];
    try {
      versionChanges = await formulaService.listFormulaVersionChanges(currentFormula.id);
    } catch (e) {
      logger.warn('Non-fatal: unable to load version changes for formula', currentFormula.id, e);
    }

    res.json({
      formula: currentFormula,
      versionChanges: versionChanges.slice(0, 1) // Latest change only
    });
  } catch (error) {
    logger.error('Error fetching current formula:', error);
    res.status(500).json({ error: 'Failed to fetch current formula' });
  }
});

// Get formula version history for user
router.get('/history', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const formulaHistory = await formulaService.getFormulaHistory(userId);

    // Enrich with version change information
    const enrichedHistory = await Promise.all(
      formulaHistory.map(async (formula) => {
        const changes = await formulaService.listFormulaVersionChanges(formula.id);
        return {
          ...formula,
          changes: changes[0] || null // Latest change for this version
        };
      })
    );

    res.json({ history: enrichedHistory });
  } catch (error) {
    logger.error('Error fetching formula history:', error);
    res.status(500).json({ error: 'Failed to fetch formula history' });
  }
});

// Get specific formula version by ID
router.get('/versions/:formulaId', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const formulaId = req.params.formulaId;

    const formula = await formulaService.getFormula(formulaId);

    if (!formula || formula.userId !== userId) {
      return res.status(404).json({ error: 'Formula not found or access denied' });
    }

    // Get version changes for this formula
    const versionChanges = await formulaService.listFormulaVersionChanges(formulaId);

    res.json({
      formula,
      versionChanges
    });
  } catch (error) {
    logger.error('Error fetching formula version:', error);
    res.status(500).json({ error: 'Failed to fetch formula version' });
  }
});

// Compare two formula versions
router.get('/compare/:id1/:id2', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { id1, id2 } = req.params;

    const [formula1, formula2] = await Promise.all([
      formulaService.getFormula(id1),
      formulaService.getFormula(id2)
    ]);

    if (!formula1 || !formula2) {
      return res.status(404).json({ error: 'One or both formulas not found' });
    }

    if (formula1.userId !== userId || formula2.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Calculate differences
    const comparison = {
      formula1,
      formula2,
      differences: {
        totalMgChange: formula2.totalMg - formula1.totalMg,
        basesAdded: formula2.bases.filter((b2: any) =>
          !formula1.bases.some((b1: any) => b1.ingredient === b2.ingredient)
        ),
        basesRemoved: formula1.bases.filter((b1: any) =>
          !formula2.bases.some((b2: any) => b2.ingredient === b1.ingredient)
        ),
        basesModified: formula2.bases.filter((b2: any) => {
          const b1 = formula1.bases.find((b: any) => b.ingredient === b2.ingredient);
          return b1 && b1.amount !== b2.amount;
        }),
        additionsAdded: (formula2.additions || []).filter((a2: any) =>
          !(formula1.additions || []).some((a1: any) => a1.ingredient === a2.ingredient)
        ),
        additionsRemoved: (formula1.additions || []).filter((a1: any) =>
          !(formula2.additions || []).some((a2: any) => a2.ingredient === a1.ingredient)
        ),
        additionsModified: (formula2.additions || []).filter((a2: any) => {
          const a1 = (formula1.additions || []).find((a: any) => a.ingredient === a2.ingredient);
          return a1 && a1.amount !== a2.amount;
        }),
      }
    };

    res.json(comparison);
  } catch (error) {
    logger.error('Error comparing formulas:', error);
    res.status(500).json({ error: 'Failed to compare formulas' });
  }
});

// Revert to previous formula version
router.post('/revert', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { formulaId, reason } = req.body;

    if (!formulaId || !reason) {
      return res.status(400).json({ error: 'Formula ID and revert reason are required' });
    }

    // Get the formula to revert to
    const originalFormula = await formulaService.getFormula(formulaId);

    if (!originalFormula || originalFormula.userId !== userId) {
      return res.status(404).json({ error: 'Formula not found or access denied' });
    }

    // Validate that reverting to this formula doesn't exceed maximum dosage
    if (originalFormula.totalMg > FORMULA_LIMITS.MAX_TOTAL_DOSAGE) {
      return res.status(400).json({
        error: `Cannot revert to this formula as it exceeds the maximum safe dosage of ${FORMULA_LIMITS.MAX_TOTAL_DOSAGE}mg (this version has ${originalFormula.totalMg}mg). This formula was created before dosage limits were enforced. Please create a new formula instead.`
      });
    }

    // Get current highest version for user
    const currentFormula = await formulaService.getCurrentFormulaByUser(userId);
    const nextVersion = currentFormula ? currentFormula.version + 1 : 1;

    // Create new formula version with reverted data
    const revertedFormula = await formulaService.createFormula({
      userId,
      version: nextVersion,
      bases: originalFormula.bases as any,
      additions: originalFormula.additions as any,
      totalMg: originalFormula.totalMg,
      notes: `Reverted to v${originalFormula.version}: ${reason}`
    });

    // Create version change record
    await formulaService.createFormulaVersionChange({
      formulaId: revertedFormula.id,
      summary: `Reverted to version ${originalFormula.version}`,
      rationale: reason
    });

    // 📬 Create notification for formula reversion
    try {
      await notificationService.createNotification({
        userId,
        type: 'formula_update',
        title: `Formula Reverted to V${originalFormula.version}`,
        content: `Your formula has been reverted. Reason: ${reason}`,
        formulaId: revertedFormula.id,
        metadata: {
          actionUrl: '/dashboard/my-formula',
          icon: 'beaker',
          priority: 'low'
        }
      });
    } catch (notifError) {
      logger.error('Failed to create reversion notification:', notifError);
    }

    res.json({
      success: true,
      formula: revertedFormula,
      message: `Successfully reverted to version ${originalFormula.version}`
    });
  } catch (error) {
    logger.error('Error reverting formula:', error);
    res.status(500).json({ error: 'Failed to revert formula' });
  }
});

// Add user customizations to a formula
router.patch('/:formulaId/customize', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { formulaId } = req.params;
    const { addedBases, addedIndividuals } = req.body;

    // Validate that all added ingredients are valid
    const allAdded = [...(addedBases || []), ...(addedIndividuals || [])];
    for (const item of allAdded) {
      if (!isValidIngredient(item.ingredient)) {
        return res.status(400).json({
          error: `Invalid ingredient: ${item.ingredient}. Only catalog ingredients are allowed.`
        });
      }
    }

    // Get the formula
    const formula = await formulaService.getFormula(formulaId);

    if (!formula || formula.userId !== userId) {
      return res.status(404).json({ error: 'Formula not found or access denied' });
    }

    // Calculate new total mg with customizations
    let newTotalMg = formula.totalMg;

    if (addedBases) {
      for (const base of addedBases) {
        const dose = getIngredientDose(base.ingredient);
        if (dose) {
          newTotalMg += dose;
        }
      }
    }

    if (addedIndividuals) {
      for (const individual of addedIndividuals) {
        const dose = getIngredientDose(individual.ingredient);
        if (dose) {
          newTotalMg += dose;
        }
      }
    }

    // Validate that new total doesn't exceed maximum
    if (newTotalMg > FORMULA_LIMITS.MAX_TOTAL_DOSAGE) {
      const addedMg = newTotalMg - formula.totalMg;
      return res.status(400).json({
        error: `Adding these ingredients would exceed the maximum safe dosage of ${FORMULA_LIMITS.MAX_TOTAL_DOSAGE}mg. Current formula: ${formula.totalMg}mg, Adding: ${addedMg}mg, New total would be: ${newTotalMg}mg. Please remove some ingredients first or add fewer ingredients.`
      });
    }

    // Update formula with customizations
    const updatedFormula = await formulaService.updateFormulaCustomizations(
      formulaId,
      { addedBases, addedIndividuals },
      newTotalMg
    );

    res.json({
      success: true,
      formula: updatedFormula,
      message: 'Formula customized successfully'
    });
  } catch (error) {
    logger.error('Error customizing formula:', error);
    res.status(500).json({ error: 'Failed to customize formula' });
  }
});

// Create custom formula from scratch
router.post('/custom', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { name, bases, individuals } = req.body;

    // Validate that at least one ingredient is provided
    if ((!bases || bases.length === 0) && (!individuals || individuals.length === 0)) {
      return res.status(400).json({
        error: 'At least one ingredient is required to create a formula'
      });
    }

    // Validate that all ingredients are valid catalog ingredients
    const allIngredients = [...(bases || []), ...(individuals || [])];
    for (const item of allIngredients) {
      if (!isValidIngredient(item.ingredient)) {
        return res.status(400).json({
          error: `Invalid ingredient: ${item.ingredient}. Only catalog ingredients are allowed.`
        });
      }
    }

    // Calculate total mg
    let totalMg = 0;

    if (bases) {
      for (const base of bases) {
        const dose = getIngredientDose(base.ingredient);
        if (dose) {
          totalMg += dose;
        }
      }
    }

    if (individuals) {
      for (const individual of individuals) {
        const dose = getIngredientDose(individual.ingredient);
        if (dose) {
          totalMg += dose;
        }
      }
    }

    // Validate dosage limits
    if (totalMg > FORMULA_LIMITS.MAX_TOTAL_DOSAGE) {
      return res.status(400).json({
        error: `Total dosage of ${totalMg}mg exceeds the maximum safe limit of ${FORMULA_LIMITS.MAX_TOTAL_DOSAGE}mg. Please remove some ingredients.`
      });
    }

    if (totalMg < 100) {
      return res.status(400).json({
        error: `Total dosage of ${totalMg}mg is too low. Please add more ingredients (minimum 100mg recommended).`
      });
    }

    // Get user's current formula count to determine version number
    const history = await formulaService.getFormulaHistory(userId);
    const nextVersion = (history?.length || 0) + 1;

    // Create new formula marked as user-created
    const newFormula = await formulaService.createFormula({
      userId,
      version: nextVersion,
      name: name?.trim() || undefined,
      userCreated: true,
      bases: bases || [],
      additions: individuals || [],
      userCustomizations: {},
      totalMg,
      rationale: 'Custom formula built by user',
      warnings: [],
      disclaimers: [
        'This formula was built manually without AI analysis.',
        'Consider discussing with AI for optimization and safety review.',
        'Always consult your healthcare provider before starting any new supplement regimen.'
      ],
      notes: null
    });

    // 📬 Create notification for user-built formula
    try {
      await notificationService.createNotification({
        userId,
        type: 'formula_update',
        title: `Custom Formula V${nextVersion} Created`,
        content: `You've built a custom formula with ${totalMg}mg of ingredients. Consider having AI review it for optimization.`,
        formulaId: newFormula.id,
        metadata: {
          actionUrl: '/dashboard/my-formula',
          icon: 'beaker',
          priority: 'medium'
        }
      });
    } catch (notifError) {
      logger.error('Failed to create formula notification:', notifError);
    }

    res.json({
      success: true,
      formula: newFormula,
      message: 'Custom formula created successfully'
    });
  } catch (error) {
    logger.error('Error creating custom formula:', error);
    res.status(500).json({ error: 'Failed to create custom formula' });
  }
});

// Rename a formula
router.patch('/:formulaId/rename', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { formulaId } = req.params;
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Valid name is required' });
    }

    if (name.trim().length > 100) {
      return res.status(400).json({ error: 'Name must be 100 characters or less' });
    }

    // Get the formula to verify ownership
    const formula = await formulaService.getFormula(formulaId);

    if (!formula || formula.userId !== userId) {
      return res.status(404).json({ error: 'Formula not found or access denied' });
    }

    // Update the formula name
    const updatedFormula = await formulaService.updateFormulaName(formulaId, name.trim());

    res.json({
      success: true,
      formula: updatedFormula,
      message: 'Formula renamed successfully'
    });
  } catch (error) {
    logger.error('Error renaming formula:', error);
    res.status(500).json({ error: 'Failed to rename formula' });
  }
});

// Archive a formula (soft delete)
router.post('/:formulaId/archive', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { formulaId } = req.params;

    // Get the formula to verify ownership
    const formula = await formulaService.getFormula(formulaId);

    if (!formula || formula.userId !== userId) {
      return res.status(404).json({ error: 'Formula not found or access denied' });
    }

    if (formula.archivedAt) {
      return res.status(400).json({ error: 'Formula is already archived' });
    }

    // Archive the formula
    const archivedFormula = await formulaService.archiveFormula(formulaId);

    // 📬 Create notification for formula archival
    try {
      await notificationService.createNotification({
        userId,
        type: 'formula_update',
        title: `Formula V${formula.version} Archived`,
        content: formula.name
          ? `Your formula "${formula.name}" has been archived. You can restore it anytime from the archived formulas section.`
          : `Your formula (version ${formula.version}) has been archived. You can restore it anytime from the archived formulas section.`,
        formulaId: archivedFormula.id,
        metadata: {
          actionUrl: '/dashboard/my-formula',
          icon: 'archive',
          priority: 'low'
        }
      });
    } catch (notifError) {
      logger.error('Failed to create archive notification:', notifError);
    }

    res.json({
      success: true,
      formula: archivedFormula,
      message: 'Formula archived successfully'
    });
  } catch (error) {
    logger.error('Error archiving formula:', error);
    res.status(500).json({ error: 'Failed to archive formula' });
  }
});

// Restore an archived formula
router.post('/:formulaId/restore', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { formulaId } = req.params;

    // Get the formula to verify ownership
    const formula = await formulaService.getFormula(formulaId);

    if (!formula || formula.userId !== userId) {
      return res.status(404).json({ error: 'Formula not found or access denied' });
    }

    if (!formula.archivedAt) {
      return res.status(400).json({ error: 'Formula is not archived' });
    }

    // Restore the formula
    const restoredFormula = await formulaService.restoreFormula(formulaId);

    // 📬 Create notification for formula restoration
    try {
      await notificationService.createNotification({
        userId,
        type: 'formula_update',
        title: `Formula V${formula.version} Restored`,
        content: formula.name
          ? `Your formula "${formula.name}" has been restored and is now active again.`
          : `Your formula (version ${formula.version}) has been restored and is now active again.`,
        formulaId: restoredFormula.id,
        metadata: {
          actionUrl: '/dashboard/my-formula',
          icon: 'refresh',
          priority: 'low'
        }
      });
    } catch (notifError) {
      logger.error('Failed to create restore notification:', notifError);
    }

    res.json({
      success: true,
      formula: restoredFormula,
      message: 'Formula restored successfully'
    });
  } catch (error) {
    logger.error('Error restoring formula:', error);
    res.status(500).json({ error: 'Failed to restore formula' });
  }
});

// Get user's archived formulas
router.get('/archived', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const archivedFormulas = await formulaService.getArchivedFormulas(userId);

    res.json({ archived: archivedFormulas });
  } catch (error) {
    logger.error('Error fetching archived formulas:', error);
    res.status(500).json({ error: 'Failed to fetch archived formulas' });
  }
});

// ==================== REVIEW SCHEDULE ENDPOINTS ====================

// Get review schedule for a formula
router.get('/:formulaId/review-schedule', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { formulaId } = req.params;

    // Verify the formula belongs to the user
    const formula = await formulaService.getFormula(formulaId);
    if (!formula || formula.userId !== userId) {
      return res.status(404).json({ error: 'Formula not found' });
    }

    const schedule = await formulaService.getReviewSchedule(userId, formulaId);
    res.json(schedule || null);
  } catch (error) {
    logger.error('Error fetching review schedule:', error);
    res.status(500).json({ error: 'Failed to fetch review schedule' });
  }
});

// Create or update review schedule
router.put('/:formulaId/review-schedule', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { formulaId } = req.params;
    const {
      frequency,
      daysBefore,
      emailReminders,
      smsReminders,
      calendarIntegration,
    } = req.body;

    // Verify the formula belongs to the user
    const formula = await formulaService.getFormula(formulaId);
    if (!formula || formula.userId !== userId) {
      return res.status(404).json({ error: 'Formula not found' });
    }

    // Validate frequency
    if (!['monthly', 'bimonthly', 'quarterly'].includes(frequency)) {
      return res.status(400).json({ error: 'Invalid frequency. Must be monthly, bimonthly, or quarterly' });
    }

    // Validate daysBefore
    if (typeof daysBefore !== 'number' || daysBefore < 1 || daysBefore > 14) {
      return res.status(400).json({ error: 'daysBefore must be between 1 and 14' });
    }

    // Calculate next review date based on frequency and formula creation date
    const frequencyDays: Record<string, number> = {
      monthly: 30,
      bimonthly: 60,
      quarterly: 90,
    };

    const days = frequencyDays[frequency];

    const formulaDate = new Date(formula.createdAt);
    const nextReviewDate = new Date(formulaDate);
    nextReviewDate.setDate(nextReviewDate.getDate() + days - daysBefore);

    // If the calculated date is in the past, add another cycle
    if (nextReviewDate < new Date()) {
      nextReviewDate.setDate(nextReviewDate.getDate() + days);
    }

    // Check if schedule already exists
    const existingSchedule = await formulaService.getReviewSchedule(userId, formulaId);

    let schedule;
    if (existingSchedule) {
      // Update existing
      schedule = await formulaService.updateReviewSchedule(existingSchedule.id, {
        frequency,
        daysBefore,
        nextReviewDate,
        emailReminders: emailReminders ?? true,
        smsReminders: smsReminders ?? false,
        calendarIntegration: calendarIntegration ?? null,
        isActive: true,
      });
    } else {
      // Create new
      schedule = await formulaService.createReviewSchedule({
        userId,
        formulaId,
        frequency,
        daysBefore,
        nextReviewDate,
        lastReviewDate: null,
        emailReminders: emailReminders ?? true,
        smsReminders: smsReminders ?? false,
        calendarIntegration: calendarIntegration ?? null,
        isActive: true,
      });
    }

    res.json(schedule);
  } catch (error) {
    logger.error('Error saving review schedule:', error);
    res.status(500).json({ error: 'Failed to save review schedule' });
  }
});

// Delete review schedule
router.delete('/:formulaId/review-schedule', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { formulaId } = req.params;

    // Verify the formula belongs to the user
    const formula = await formulaService.getFormula(formulaId);
    if (!formula || formula.userId !== userId) {
      return res.status(404).json({ error: 'Formula not found' });
    }

    const schedule = await formulaService.getReviewSchedule(userId, formulaId);
    if (!schedule) {
      return res.status(404).json({ error: 'Review schedule not found' });
    }

    await formulaService.deleteReviewSchedule(schedule.id);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting review schedule:', error);
    res.status(500).json({ error: 'Failed to delete review schedule' });
  }
});

// Download .ics calendar file for review schedule
router.get('/:formulaId/review-schedule/calendar', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { formulaId } = req.params;

    // Verify the formula belongs to the user
    const formula = await formulaService.getFormula(formulaId);
    if (!formula || formula.userId !== userId) {
      return res.status(404).json({ error: 'Formula not found' });
    }

    // Get review schedule
    const schedule = await formulaService.getReviewSchedule(userId, formulaId);
    if (!schedule) {
      return res.status(404).json({ error: 'Review schedule not found. Please set up your review schedule first.' });
    }

    // Get user for calendar event
    const user = await userService.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate .ics file
    const { generateReviewCalendarEvent } = await import('../calendarGenerator');
    const icsContent = generateReviewCalendarEvent(schedule, user.name);

    // Send as downloadable file
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="ones-review.ics"');
    res.send(icsContent);
  } catch (error) {
    logger.error('Error generating calendar file:', error);
    res.status(500).json({ error: 'Failed to generate calendar file' });
  }
});

export default router;
