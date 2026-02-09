import { formulasRepository } from "./formulas.repository";
import { notificationsService } from "../notifications/notifications.service";
import { getIngredientDose, isValidIngredient } from "@shared/ingredients";
import logger from "../../infra/logging/logger";
import { type Formula, type ReviewSchedule } from "@shared/schema";

// SECURITY: Immutable formula limits - CANNOT be changed by user requests or AI prompts
const FORMULA_LIMITS = {
    MAX_TOTAL_DOSAGE: 5500,        // Maximum total daily dosage in mg
    DOSAGE_TOLERANCE: 50,          // Allow 50mg tolerance (0.9%) for rounding/calculation differences
    MIN_INGREDIENT_DOSE: 10,       // Global minimum dose per ingredient in mg
    MAX_INGREDIENT_COUNT: 50,      // Maximum number of ingredients
} as const;

export class FormulasService {
    async getCurrentFormula(userId: string) {
        const currentFormula = await formulasRepository.getCurrentFormulaByUser(userId);

        if (!currentFormula) {
            return null;
        }

        // Get the latest version changes for context (non-fatal)
        let versionChanges: any[] = [];
        try {
            versionChanges = await formulasRepository.listFormulaVersionChanges(currentFormula.id);
        } catch (e) {
            logger.warn('Non-fatal: unable to load version changes for formula', currentFormula.id, e);
        }

        return {
            formula: currentFormula,
            versionChanges: versionChanges.slice(0, 1) // Latest change only
        };
    }

    async getFormulaHistory(userId: string) {
        const formulaHistory = await formulasRepository.getFormulaHistory(userId);

        // Enrich with version change information
        const enrichedHistory = await Promise.all(
            formulaHistory.map(async (formula) => {
                const changes = await formulasRepository.listFormulaVersionChanges(formula.id);
                return {
                    ...formula,
                    changes: changes[0] || null // Latest change for this version
                };
            })
        );

        return enrichedHistory;
    }

    async getFormulaVersion(userId: string, formulaId: string) {
        const formula = await formulasRepository.getFormula(formulaId);

        if (!formula || formula.userId !== userId) {
            return null;
        }

        // Get version changes for this formula
        const versionChanges = await formulasRepository.listFormulaVersionChanges(formulaId);

        return {
            formula,
            versionChanges
        };
    }

    async compareFormulas(userId: string, id1: string, id2: string) {
        const [formula1, formula2] = await Promise.all([
            formulasRepository.getFormula(id1),
            formulasRepository.getFormula(id2)
        ]);

        if (!formula1 || !formula2) {
            throw new Error('One or both formulas not found');
        }

        if (formula1.userId !== userId || formula2.userId !== userId) {
            throw new Error('Access denied');
        }

        // Calculate differences
        return {
            formula1,
            formula2,
            differences: {
                totalMgChange: formula2.totalMg - formula1.totalMg,
                basesAdded: (formula2.bases as any[]).filter((b2: any) =>
                    !(formula1.bases as any[]).some((b1: any) => b1.ingredient === b2.ingredient)
                ),
                basesRemoved: (formula1.bases as any[]).filter((b1: any) =>
                    !(formula2.bases as any[]).some((b2: any) => b2.ingredient === b1.ingredient)
                ),
                basesModified: (formula2.bases as any[]).filter((b2: any) => {
                    const b1 = (formula1.bases as any[]).find((b: any) => b.ingredient === b2.ingredient);
                    return b1 && b1.amount !== b2.amount;
                }),
                additionsAdded: ((formula2.additions as any[]) || []).filter((a2: any) =>
                    !((formula1.additions as any[]) || []).some((a1: any) => a1.ingredient === a2.ingredient)
                ),
                additionsRemoved: ((formula1.additions as any[]) || []).filter((a1: any) =>
                    !((formula2.additions as any[]) || []).some((a2: any) => a2.ingredient === a1.ingredient)
                ),
                additionsModified: ((formula2.additions as any[]) || []).filter((a2: any) => {
                    const a1 = ((formula1.additions as any[]) || []).find((a: any) => a.ingredient === a2.ingredient);
                    return a1 && a1.amount !== a2.amount;
                }),
            }
        };
    }

    async revertFormula(userId: string, formulaId: string, reason: string) {
        // Get the formula to revert to
        const originalFormula = await formulasRepository.getFormula(formulaId);

        if (!originalFormula || originalFormula.userId !== userId) {
            throw new Error('Formula not found or access denied');
        }

        // Validate that reverting to this formula doesn't exceed maximum dosage
        if (originalFormula.totalMg > FORMULA_LIMITS.MAX_TOTAL_DOSAGE) {
            throw new Error(`Cannot revert to this formula as it exceeds the maximum safe dosage of ${FORMULA_LIMITS.MAX_TOTAL_DOSAGE}mg (this version has ${originalFormula.totalMg}mg). This formula was created before dosage limits were enforced. Please create a new formula instead.`);
        }

        // Get current highest version for user
        const currentFormula = await formulasRepository.getCurrentFormulaByUser(userId);
        const nextVersion = currentFormula ? currentFormula.version + 1 : 1;

        // Create new formula version with reverted data
        const revertedFormula = await formulasRepository.createFormula({
            userId,
            version: nextVersion,
            bases: originalFormula.bases as any,
            additions: originalFormula.additions as any,
            totalMg: originalFormula.totalMg,
            notes: `Reverted to v${originalFormula.version}: ${reason}`
        });

        // Create version change record
        await formulasRepository.createFormulaVersionChange({
            formulaId: revertedFormula.id,
            summary: `Reverted to version ${originalFormula.version}`,
            rationale: reason
        });

        // 📬 Create notification for formula reversion
        try {
            await notificationsService.create({
                userId,
                type: 'formula_update',
                title: `Formula Reverted to V${originalFormula.version}`,
                content: `Your formula has been reverted. Reason: ${reason}`,
                formulaId: revertedFormula.id,
                metadata: {
                    actionUrl: '/dashboard/formula',
                    icon: 'beaker',
                    priority: 'low'
                }
            });
        } catch (notifError) {
            logger.error('Failed to create reversion notification:', notifError);
        }

        return {
            formula: revertedFormula,
            message: `Successfully reverted to version ${originalFormula.version}`
        };
    }

    async customizeFormula(userId: string, formulaId: string, addedBases: any[], addedIndividuals: any[]) {
        // Validate that all added ingredients are valid
        const allAdded = [...(addedBases || []), ...(addedIndividuals || [])];
        for (const item of allAdded) {
            if (!isValidIngredient(item.ingredient)) {
                throw new Error(`Invalid ingredient: ${item.ingredient}. Only catalog ingredients are allowed.`);
            }
        }

        // Get the formula
        const formula = await formulasRepository.getFormula(formulaId);

        if (!formula || formula.userId !== userId) {
            throw new Error('Formula not found or access denied');
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
            throw new Error(`Adding these ingredients would exceed the maximum safe dosage of ${FORMULA_LIMITS.MAX_TOTAL_DOSAGE}mg. Current formula: ${formula.totalMg}mg, Adding: ${addedMg}mg, New total would be: ${newTotalMg}mg. Please remove some ingredients first or add fewer ingredients.`);
        }

        // Update formula with customizations
        const updatedFormula = await formulasRepository.updateFormulaCustomizations(
            formulaId,
            { addedBases, addedIndividuals },
            newTotalMg
        );

        return updatedFormula;
    }

    async createCustomFormula(userId: string, name: string | undefined, bases: any[], individuals: any[]) {
        // Validate that at least one ingredient is provided
        if ((!bases || bases.length === 0) && (!individuals || individuals.length === 0)) {
            throw new Error('At least one ingredient is required to create a formula');
        }

        // Validate that all ingredients are valid catalog ingredients
        const allIngredients = [...(bases || []), ...(individuals || [])];
        for (const item of allIngredients) {
            if (!isValidIngredient(item.ingredient)) {
                throw new Error(`Invalid ingredient: ${item.ingredient}. Only catalog ingredients are allowed.`);
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
            throw new Error(`Total dosage of ${totalMg}mg exceeds the maximum safe limit of ${FORMULA_LIMITS.MAX_TOTAL_DOSAGE}mg. Please remove some ingredients.`);
        }

        if (totalMg < 100) {
            throw new Error(`Total dosage of ${totalMg}mg is too low. Please add more ingredients (minimum 100mg recommended).`);
        }

        // Get user's current formula count to determine version number
        const history = await formulasRepository.getFormulaHistory(userId);
        const nextVersion = (history?.length || 0) + 1;

        // Create new formula marked as user-created
        const newFormula = await formulasRepository.createFormula({
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
            await notificationsService.create({
                userId,
                type: 'formula_update',
                title: `Custom Formula V${nextVersion} Created`,
                content: `You've built a custom formula with ${totalMg}mg of ingredients. Consider having AI review it for optimization.`,
                formulaId: newFormula.id,
                metadata: {
                    actionUrl: '/dashboard/formula',
                    icon: 'beaker',
                    priority: 'medium'
                }
            });
        } catch (notifError) {
            logger.error('Failed to create formula notification:', notifError);
        }

        return newFormula;
    }

    async renameFormula(userId: string, formulaId: string, name: string) {
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            throw new Error('Valid name is required');
        }

        if (name.trim().length > 100) {
            throw new Error('Name must be 100 characters or less');
        }

        // Get the formula to verify ownership
        const formula = await formulasRepository.getFormula(formulaId);

        if (!formula || formula.userId !== userId) {
            throw new Error('Formula not found or access denied');
        }

        // Update the formula name
        return await formulasRepository.updateFormulaName(formulaId, name.trim());
    }

    async archiveFormula(userId: string, formulaId: string) {
        // Get the formula to verify ownership
        const formula = await formulasRepository.getFormula(formulaId);

        if (!formula || formula.userId !== userId) {
            throw new Error('Formula not found or access denied');
        }

        if (formula.archivedAt) {
            throw new Error('Formula is already archived');
        }

        // Archive the formula
        const archivedFormula = await formulasRepository.archiveFormula(formulaId);

        // 📬 Create notification for formula archival
        try {
            await notificationsService.create({
                userId,
                type: 'formula_update',
                title: `Formula V${formula.version} Archived`,
                content: formula.name
                    ? `Your formula "${formula.name}" has been archived. You can restore it anytime from the archived formulas section.`
                    : `Your formula (version ${formula.version}) has been archived. You can restore it anytime from the archived formulas section.`,
                formulaId: archivedFormula.id,
                metadata: {
                    actionUrl: '/dashboard/formula',
                    icon: 'archive',
                    priority: 'low'
                }
            });
        } catch (notifError) {
            logger.error('Failed to create archive notification:', notifError);
        }

        return archivedFormula;
    }

    async restoreFormula(userId: string, formulaId: string) {
        // Get the formula to verify ownership
        const formula = await formulasRepository.getFormula(formulaId);

        if (!formula || formula.userId !== userId) {
            throw new Error('Formula not found or access denied');
        }

        if (!formula.archivedAt) {
            throw new Error('Formula is not archived');
        }

        // Restore the formula
        const restoredFormula = await formulasRepository.restoreFormula(formulaId);

        // 📬 Create notification for formula restoration
        try {
            await notificationsService.create({
                userId,
                type: 'formula_update',
                title: `Formula V${formula.version} Restored`,
                content: formula.name
                    ? `Your formula "${formula.name}" has been restored and is now active again.`
                    : `Your formula (version ${formula.version}) has been restored and is now active again.`,
                formulaId: restoredFormula.id,
                metadata: {
                    actionUrl: '/dashboard/formula',
                    icon: 'refresh',
                    priority: 'low'
                }
            });
        } catch (notifError) {
            logger.error('Failed to create restore notification:', notifError);
        }

        return restoredFormula;
    }

    async getArchivedFormulas(userId: string) {
        return await formulasRepository.getArchivedFormulas(userId);
    }

    async getReviewSchedule(userId: string, formulaId: string) {
        // Verify the formula belongs to the user
        const formula = await formulasRepository.getFormula(formulaId);
        if (!formula || formula.userId !== userId) {
            throw new Error('Formula not found');
        }

        return await formulasRepository.getReviewSchedule(userId, formulaId);
    }

    async saveReviewSchedule(userId: string, formulaId: string, data: any) {
        const {
            frequency,
            daysBefore,
            emailReminders,
            smsReminders,
            calendarIntegration,
        } = data;

        // Verify the formula belongs to the user
        const formula = await formulasRepository.getFormula(formulaId);
        if (!formula || formula.userId !== userId) {
            throw new Error('Formula not found');
        }

        // Validate frequency
        if (!['monthly', 'bimonthly', 'quarterly'].includes(frequency)) {
            throw new Error('Invalid frequency. Must be monthly, bimonthly, or quarterly');
        }

        // Validate daysBefore
        if (typeof daysBefore !== 'number' || daysBefore < 1 || daysBefore > 14) {
            throw new Error('daysBefore must be between 1 and 14');
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
        const existingSchedule = await formulasRepository.getReviewSchedule(userId, formulaId);

        if (existingSchedule) {
            // Update existing
            return await formulasRepository.updateReviewSchedule(existingSchedule.id, {
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
            return await formulasRepository.createReviewSchedule({
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
    }

    async deleteReviewSchedule(userId: string, formulaId: string) {
        // Verify the formula belongs to the user
        const formula = await formulasRepository.getFormula(formulaId);
        if (!formula || formula.userId !== userId) {
            throw new Error('Formula not found');
        }

        const schedule = await formulasRepository.getReviewSchedule(userId, formulaId);
        if (!schedule) {
            throw new Error('Review schedule not found');
        }

        return await formulasRepository.deleteReviewSchedule(schedule.id);
    }

    async generateCalendarFile(userId: string, formulaId: string) {
        // Verify the formula belongs to the user
        const formula = await formulasRepository.getFormula(formulaId);
        if (!formula || formula.userId !== userId) {
            throw new Error('Formula not found');
        }

        // Get review schedule
        const schedule = await formulasRepository.getReviewSchedule(userId, formulaId);
        if (!schedule) {
            throw new Error('Review schedule not found. Please set up your review schedule first.');
        }

        // Get user for calendar event
        const user = await formulasRepository.getUserById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Generate .ics file
        const { generateReviewCalendarEvent } = await import('../../utils/calendarGenerator');
        const icsContent = generateReviewCalendarEvent(schedule, user.name);

        return {
            content: icsContent,
            filename: 'ones-review.ics'
        };
    }

    async getSharedFormula(formulaId: string) {
        const formula = await formulasRepository.getFormula(formulaId);

        if (!formula) {
            return null;
        }

        // Get user info (non-sensitive fields only)
        const user = await formulasRepository.getUserById(formula.userId);

        // Return formula with minimal user info
        return {
            formula: {
                id: formula.id,
                version: formula.version,
                name: formula.name,
                createdAt: formula.createdAt,
                totalMg: formula.totalMg,
                bases: formula.bases,
                additions: formula.additions,
                userCustomizations: formula.userCustomizations,
                warnings: formula.warnings,
                userCreated: formula.userCreated,
            },
            user: {
                name: user?.name || 'ONES User',
            }
        };
    }
}

export const formulasService = new FormulasService();
