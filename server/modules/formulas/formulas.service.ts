import { formulasRepository } from "./formulas.repository";
import { notificationsService } from "../notifications/notifications.service";
import { usersRepository } from "../users/users.repository";
import { getIngredientDose, isValidIngredient, findIngredientByName } from "@shared/ingredients";
import logger from "../../infra/logging/logger";
import { type Formula, type ReviewSchedule } from "@shared/schema";
import { manufacturerPricingService } from "./manufacturer-pricing.service";
import { autoShipService } from "../billing/autoship.service";
import { FORMULA_LIMITS as CAPSULE_LIMITS, getMaxDosageForCapsules, getMinIngredientCountForCapsules } from "./formula-service";
import { validateFormulaSafety } from "./safety-validator";
import { detectPregnancyStatus, detectNursingStatus } from "./profile-status-detector";
import { unmatchedMedicationsRepository } from "../health/unmatched-medications.repository";

// Helper: persist any medications the safety validator did not recognize so
// the keyword-grooming feedback loop has data. Fire-and-forget; never
// throws (the repo swallows + logs its own errors).
function logUnmatchedMedicationsAsync(
    userId: string,
    unmatched: string[] | undefined,
    normalizedList: Array<{ raw: string; generic: string | null; brandFamily: string | null; drugClass: string | null; confidence: number }>,
    contextEvent: string,
): void {
    if (!unmatched || unmatched.length === 0) return;
    const normByRaw = new Map(normalizedList.map(n => [(n.raw || '').toLowerCase(), n]));
    void unmatchedMedicationsRepository.logMany(
        unmatched.map(raw => ({
            userId,
            rawInput: raw,
            normalized: normByRaw.get(raw.toLowerCase()) ?? null,
            contextEvent,
        }))
    );
}

// Block formulas that include any ingredient currently flagged as
// discontinued in the manufacturer catalog. AI chat already filters these
// via prompt context, but custom/manual formula creation paths bypass that
// guidance and need an explicit gate so users can't ship a formula that
// can't actually be manufactured.
async function assertNoDiscontinuedIngredients(items: Array<{ ingredient?: string; name?: string }>) {
    if (!Array.isArray(items) || items.length === 0) return;
    const { ingredientCatalogRepository } = await import('./ingredient-catalog.repository');
    const catalog = await ingredientCatalogRepository.getAll();
    const discontinued = new Set(
        catalog.filter((i: any) => i.status === 'discontinued').map((i: any) => String(i.name).toLowerCase().trim())
    );
    if (discontinued.size === 0) return;
    const offending: string[] = [];
    for (const item of items) {
        const name = String(item?.ingredient || item?.name || '').toLowerCase().trim();
        if (name && discontinued.has(name)) offending.push(item?.ingredient || item?.name || name);
    }
    if (offending.length > 0) {
        throw new Error(`The following ingredient${offending.length > 1 ? 's are' : ' is'} no longer available from our manufacturer: ${offending.join(', ')}. Please choose alternatives.`);
    }
}

// Capsule-aware dosage limits derived from formula-service.ts
// Max for any capsule count: 12 × 550mg = 6,600mg (absolute ceiling)
// Default (9 caps): 9 × 550mg = 4,950mg
// (Local FORMULA_LIMITS constant removed — was unused; canonical limits live
// in formula-service.ts and are imported as CAPSULE_LIMITS where needed.)

export class FormulasService {
    async getFormulaQuote(userId: string, formulaId?: string, capsuleCount?: number) {
        const formula = formulaId
            ? await formulasRepository.getFormula(formulaId)
            : await formulasRepository.getCurrentFormulaByUser(userId);

        if (!formula || formula.userId !== userId) {
            throw new Error('Formula not found or access denied');
        }

        const quote = await manufacturerPricingService.quoteFormula({
            bases: (formula.bases as any[]) || [],
            additions: (formula.additions as any[]) || [],
            targetCapsules: (formula.targetCapsules as number) || 9,
        }, capsuleCount);

        logger.info('Formula quote generated', {
            userId,
            formulaId: formula.id,
            capsuleCount: quote.capsuleCount,
            available: quote.available,
            mappedIngredients: quote.mappedIngredients,
            unmappedIngredients: quote.unmappedIngredients.length,
        });

        return {
            formulaId: formula.id,
            formulaVersion: formula.version,
            formulaName: formula.name,
            quote,
        };
    }

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

        // Validate that reverting to this formula doesn't exceed maximum dosage for its capsule count (with 2.5% tolerance)
        const revertBaseBudget = getMaxDosageForCapsules(originalFormula.targetCapsules || CAPSULE_LIMITS.DEFAULT_CAPSULE_COUNT);
        const revertHardLimit = Math.floor(revertBaseBudget * (1 + CAPSULE_LIMITS.BUDGET_TOLERANCE_PERCENT));
        if (originalFormula.totalMg > revertHardLimit) {
            throw new Error(`Cannot revert to this formula as it exceeds the maximum safe dosage of ${revertHardLimit}mg for ${originalFormula.targetCapsules || CAPSULE_LIMITS.DEFAULT_CAPSULE_COUNT} capsules (this version has ${originalFormula.totalMg}mg). This formula was created before dosage limits were enforced. Please create a new formula instead.`);
        }

        // Validate minimum ingredient count
        const revertCapsules = originalFormula.targetCapsules || CAPSULE_LIMITS.DEFAULT_CAPSULE_COUNT;
        const revertMinIngredients = getMinIngredientCountForCapsules(revertCapsules);
        const revertBases = (originalFormula.bases as any[]) || [];
        const revertAdditions = (originalFormula.additions as any[]) || [];
        const revertTotalIngredients = revertBases.length + revertAdditions.length;
        if (revertTotalIngredients < revertMinIngredients) {
            throw new Error(`Cannot revert to this formula — it only has ${revertTotalIngredients} ingredients, but ${revertCapsules} capsules/day requires at least ${revertMinIngredients}. Please create a new formula instead.`);
        }

        // ── SAFETY RE-VALIDATION ────────────────────────────────────────────
        // Run the full safety validator against the user's CURRENT health
        // profile. Older formula versions were validated against the profile
        // that existed AT THE TIME they were created — but the user may have
        // since added a medication, allergy, or condition that makes the old
        // formula unsafe (e.g. started Warfarin, became pregnant). Block the
        // revert if any critical safety issue surfaces.
        const profile = await usersRepository.getHealthProfile(userId);
        const userMedications: string[] = (profile as any)?.medications || [];
        const userMedicationsNormalized = (profile as any)?.medicationsNormalized || [];
        const userConditions: string[] = (profile as any)?.conditions || [];
        const userAllergies: string[] = (profile as any)?.allergies || [];
        const isPregnant = detectPregnancyStatus(userConditions);
        const isNursing = detectNursingStatus(userConditions);

        const safetyResult = validateFormulaSafety({
            formula: {
                bases: revertBases,
                additions: revertAdditions,
            },
            userMedications,
            userMedicationsNormalized,
            userConditions,
            userAllergies,
            isPregnant,
            isNursing,
        });
        logUnmatchedMedicationsAsync(userId, safetyResult.unmatchedMedications, userMedicationsNormalized, 'safety_validator_revert');

        if (!safetyResult.safe) {
            const reasons = safetyResult.blockedReasons.join('; ');
            logger.warn('Formula revert BLOCKED by safety validator', {
                userId,
                originalFormulaId: formulaId,
                originalVersion: originalFormula.version,
                blockedReasons: safetyResult.blockedReasons,
                criticalCount: safetyResult.warnings.filter(w => w.severity === 'critical').length,
            });
            throw new Error(`Cannot revert to v${originalFormula.version}: it contains ingredients that conflict with your current health profile (medications, allergies, or conditions). ${reasons}. Please create a new formula instead so we can build a safe protocol around your latest profile.`);
        }

        // Log non-blocking serious warnings so we have a record of what was
        // surfaced when the user reverted (useful for compliance audits).
        const seriousWarnings = safetyResult.warnings.filter(w => w.severity === 'serious');
        if (seriousWarnings.length > 0) {
            logger.info('Formula revert proceeding with serious (non-blocking) warnings', {
                userId,
                originalFormulaId: formulaId,
                originalVersion: originalFormula.version,
                seriousWarnings: seriousWarnings.map(w => ({ category: w.category, message: w.message })),
            });
        }

        // Create new formula version with reverted data (preserve all fields).
        // safetyValidation is REPLACED with a freshly-computed result so the
        // audit trail reflects validation against the user's CURRENT profile.
        // Uses createNextVersionFormula for race-safe version assignment.
        const revertedFormula = await formulasRepository.createNextVersionFormula(userId, {
            userId,
            bases: originalFormula.bases as any,
            additions: originalFormula.additions as any,
            totalMg: originalFormula.totalMg,
            targetCapsules: originalFormula.targetCapsules,
            rationale: originalFormula.rationale as any,
            warnings: originalFormula.warnings as any,
            disclaimers: originalFormula.disclaimers as any,
            safetyValidation: safetyResult as any,
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

        // Sync auto-ship price if user has an active auto-ship
        await this.syncAutoShipIfActive(userId, revertedFormula.id, revertedFormula.version);

        return {
            formula: revertedFormula,
            message: `Successfully reverted to version ${originalFormula.version}`
        };
    }

    async customizeFormula(userId: string, formulaId: string, addedBases: any[], addedIndividuals: any[]) {
        // Validate that all added ingredients are valid and within dose ranges
        const allAdded = [...(addedBases || []), ...(addedIndividuals || [])];

        // Reject any ingredient currently flagged as discontinued in the
        // manufacturer catalog before we do anything else.
        await assertNoDiscontinuedIngredients(allAdded);

        for (const item of allAdded) {
            if (!isValidIngredient(item.ingredient)) {
                throw new Error(`Invalid ingredient: ${item.ingredient}. Only catalog ingredients are allowed.`);
            }
            // Validate per-ingredient dose range if amount is specified
            if (item.amount) {
                const ingredientInfo = findIngredientByName(item.ingredient);
                if (ingredientInfo && ingredientInfo.doseRangeMin !== undefined && ingredientInfo.doseRangeMax !== undefined) {
                    if (item.amount < ingredientInfo.doseRangeMin || item.amount > ingredientInfo.doseRangeMax) {
                        throw new Error(`${item.ingredient} dose of ${item.amount}mg is outside the allowed range (${ingredientInfo.doseRangeMin}-${ingredientInfo.doseRangeMax}mg).`);
                    }
                }
            }
        }

        // Get the formula
        const formula = await formulasRepository.getFormula(formulaId);

        if (!formula || formula.userId !== userId) {
            throw new Error('Formula not found or access denied');
        }

        // Check for duplicate ingredients (don't add something already in the formula)
        const existingIngredients = new Set([
            ...((formula.bases as any[]) || []).map((b: any) => (b.ingredient || '').toLowerCase()),
            ...((formula.additions as any[]) || []).map((a: any) => (a.ingredient || '').toLowerCase()),
            ...((formula.userCustomizations as any)?.addedBases || []).map((b: any) => (b.ingredient || '').toLowerCase()),
            ...((formula.userCustomizations as any)?.addedIndividuals || []).map((i: any) => (i.ingredient || '').toLowerCase()),
        ]);
        for (const item of allAdded) {
            if (existingIngredients.has(item.ingredient.toLowerCase())) {
                throw new Error(`${item.ingredient} is already in this formula. Remove it first if you want to change the dose.`);
            }
        }

        // Calculate new total mg with customizations.
        // Use user-specified amount, falling back to catalog default. If neither
        // is available we now THROW instead of silently dropping the ingredient
        // from the total — silent drops let the user save a formula whose stored
        // totalMg doesn't match the ingredient list.
        let newTotalMg = formula.totalMg;

        const resolveDose = (item: any): number => {
            const explicit = Number(item.amount);
            if (Number.isFinite(explicit) && explicit > 0) return explicit;
            const catalog = getIngredientDose(item.ingredient);
            if (typeof catalog === 'number' && Number.isFinite(catalog) && catalog > 0) return catalog;
            throw new Error(`Cannot determine dose for ${item.ingredient} — please specify an amount.`);
        };

        if (addedBases) {
            for (const base of addedBases) {
                newTotalMg += resolveDose(base);
            }
        }

        if (addedIndividuals) {
            for (const individual of addedIndividuals) {
                newTotalMg += resolveDose(individual);
            }
        }

        // Validate that new total doesn't exceed maximum for this formula's capsule count (with 2.5% tolerance)
        const customizeBaseBudget = getMaxDosageForCapsules(formula.targetCapsules || CAPSULE_LIMITS.DEFAULT_CAPSULE_COUNT);
        const customizeHardLimit = Math.floor(customizeBaseBudget * (1 + CAPSULE_LIMITS.BUDGET_TOLERANCE_PERCENT));
        if (newTotalMg > customizeHardLimit) {
            const addedMg = newTotalMg - formula.totalMg;
            throw new Error(`Adding these ingredients would exceed the maximum safe dosage of ${customizeHardLimit}mg for ${formula.targetCapsules || CAPSULE_LIMITS.DEFAULT_CAPSULE_COUNT} capsules. Current formula: ${formula.totalMg}mg, Adding: ${addedMg}mg, New total would be: ${newTotalMg}mg. Please remove some ingredients first or add fewer ingredients.`);
        }

        // ── SAFETY RE-VALIDATION ────────────────────────────────────────────
        // Run safety validator against current health profile, including the
        // newly-added ingredients. Block the customization if a critical issue
        // surfaces (e.g. user just added Garlic to a formula while on Warfarin).
        const profile = await usersRepository.getHealthProfile(userId);
        const userMedications: string[] = (profile as any)?.medications || [];
        const userMedicationsNormalized = (profile as any)?.medicationsNormalized || [];
        const userConditions: string[] = (profile as any)?.conditions || [];
        const userAllergies: string[] = (profile as any)?.allergies || [];
        const customizeSafety = validateFormulaSafety({
            formula: {
                bases: [...((formula.bases as any[]) || []), ...(addedBases || [])],
                additions: [...((formula.additions as any[]) || []), ...(addedIndividuals || [])],
            },
            userMedications,
            userMedicationsNormalized,
            userConditions,
            userAllergies,
            isPregnant: detectPregnancyStatus(userConditions),
            isNursing: detectNursingStatus(userConditions),
        });
        logUnmatchedMedicationsAsync(userId, customizeSafety.unmatchedMedications, userMedicationsNormalized, 'safety_validator_customize');
        if (!customizeSafety.safe) {
            logger.warn('Formula customization BLOCKED by safety validator', {
                userId,
                formulaId,
                blockedReasons: customizeSafety.blockedReasons,
            });
            throw new Error(`Cannot add these ingredients — they conflict with your current health profile: ${customizeSafety.blockedReasons.join('; ')}`);
        }

        // Update formula with customizations
        const updatedFormula = await formulasRepository.updateFormulaCustomizations(
            formulaId,
            { addedBases, addedIndividuals },
            newTotalMg
        );

        return updatedFormula;
    }

    async createCustomFormula(userId: string, name: string | undefined, bases: any[], individuals: any[], targetCapsules?: number) {
        // Validate that at least one ingredient is provided
        if ((!bases || bases.length === 0) && (!individuals || individuals.length === 0)) {
            throw new Error('At least one ingredient is required to create a formula');
        }

        // Validate that all ingredients are valid catalog ingredients and within dose ranges
        const allIngredients = [...(bases || []), ...(individuals || [])];

        // Reject any ingredient currently flagged as discontinued in the
        // manufacturer catalog. Manual creation bypasses the AI prompt
        // context that normally filters these out.
        await assertNoDiscontinuedIngredients(allIngredients);

        for (const item of allIngredients) {
            if (!isValidIngredient(item.ingredient)) {
                throw new Error(`Invalid ingredient: ${item.ingredient}. Only catalog ingredients are allowed.`);
            }
            // Validate per-ingredient dose range if amount is specified
            if (item.amount) {
                const ingredientInfo = findIngredientByName(item.ingredient);
                if (ingredientInfo && ingredientInfo.doseRangeMin !== undefined && ingredientInfo.doseRangeMax !== undefined) {
                    if (item.amount < ingredientInfo.doseRangeMin || item.amount > ingredientInfo.doseRangeMax) {
                        throw new Error(`${item.ingredient} dose of ${item.amount}mg is outside the allowed range (${ingredientInfo.doseRangeMin}-${ingredientInfo.doseRangeMax}mg).`);
                    }
                }
            }
        }

        // Calculate total mg.
        // Use user-specified amount, falling back to catalog default. If neither
        // resolves to a positive number we THROW — silently dropping ingredients
        // would let the user save a formula whose stored totalMg doesn't match
        // its ingredient list, breaking pricing and downstream validation.
        let totalMg = 0;
        const resolveCustomDose = (item: any): number => {
            const explicit = Number(item.amount);
            if (Number.isFinite(explicit) && explicit > 0) return explicit;
            const catalog = getIngredientDose(item.ingredient);
            if (typeof catalog === 'number' && Number.isFinite(catalog) && catalog > 0) return catalog;
            throw new Error(`Cannot determine dose for ${item.ingredient} — please specify an amount.`);
        };

        if (bases) {
            for (const base of bases) {
                totalMg += resolveCustomDose(base);
            }
        }

        if (individuals) {
            for (const individual of individuals) {
                totalMg += resolveCustomDose(individual);
            }
        }

        // Validate dosage limits against capsule budget (with 2.5% tolerance)
        const capsuleCount = (targetCapsules && CAPSULE_LIMITS.VALID_CAPSULE_COUNTS.includes(targetCapsules as any))
            ? targetCapsules
            : CAPSULE_LIMITS.DEFAULT_CAPSULE_COUNT;
        const baseBudget = getMaxDosageForCapsules(capsuleCount);
        const hardLimit = Math.floor(baseBudget * (1 + CAPSULE_LIMITS.BUDGET_TOLERANCE_PERCENT));
        if (totalMg > hardLimit) {
            throw new Error(`Total dosage of ${totalMg}mg exceeds the maximum limit of ${hardLimit}mg for ${capsuleCount} capsules per day (${baseBudget}mg + 2.5% tolerance). Please remove some ingredients.`);
        }

        if (totalMg < 100) {
            throw new Error(`Total dosage of ${totalMg}mg is too low. Please add more ingredients (minimum 100mg recommended).`);
        }

        // Validate minimum ingredient count for the chosen capsule tier
        const minIngredients = getMinIngredientCountForCapsules(capsuleCount);
        if (allIngredients.length < minIngredients) {
            throw new Error(`A ${capsuleCount}-capsule formula requires at least ${minIngredients} ingredients. You've added ${allIngredients.length}. Please add ${minIngredients - allIngredients.length} more ingredient${minIngredients - allIngredients.length > 1 ? 's' : ''}.`);
        }

        // ── SAFETY VALIDATION ──────────────────────────────────────────────
        // Custom formulas built without AI still need to be safety-checked
        // against the user's medications, allergies, and conditions.
        const customCreateProfile = await usersRepository.getHealthProfile(userId);
        const customMedications: string[] = (customCreateProfile as any)?.medications || [];
        const customMedicationsNormalized = (customCreateProfile as any)?.medicationsNormalized || [];
        const customConditions: string[] = (customCreateProfile as any)?.conditions || [];
        const customAllergies: string[] = (customCreateProfile as any)?.allergies || [];
        const customSafety = validateFormulaSafety({
            formula: { bases: bases || [], additions: individuals || [] },
            userMedications: customMedications,
            userMedicationsNormalized: customMedicationsNormalized,
            userConditions: customConditions,
            userAllergies: customAllergies,
            isPregnant: detectPregnancyStatus(customConditions),
            isNursing: detectNursingStatus(customConditions),
        });
        logUnmatchedMedicationsAsync(userId, customSafety.unmatchedMedications, customMedicationsNormalized, 'safety_validator_custom_create');
        if (!customSafety.safe) {
            logger.warn('Custom formula creation BLOCKED by safety validator', {
                userId,
                blockedReasons: customSafety.blockedReasons,
            });
            throw new Error(`Cannot create this formula — it conflicts with your current health profile: ${customSafety.blockedReasons.join('; ')}`);
        }

        // Create new formula marked as user-created.
        // Uses createNextVersionFormula for race-safe version assignment
        // (per-user advisory lock prevents duplicate v=N+1 from concurrent saves).
        const newFormula = await formulasRepository.createNextVersionFormula(userId, {
            userId,
            name: name?.trim() || undefined,
            userCreated: true,
            bases: bases || [],
            additions: individuals || [],
            userCustomizations: {},
            totalMg,
            targetCapsules: capsuleCount,
            rationale: 'Custom formula built by user',
            warnings: [],
            disclaimers: [
                'This formula was built manually without AI analysis.',
                'Consider discussing with AI for optimization and safety review.',
                'Always consult your healthcare provider before starting any new supplement regimen.'
            ],
            safetyValidation: customSafety as any,
            notes: null
        });

        // For downstream notifications/messages.
        const nextVersion = newFormula.version;

        // 📬 In-app notification only — formula emails were removed
        // (per user feedback: emailing on every formula iteration felt spammy).
        // Order confirmation emails still fire from the billing service after checkout.
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

        // Sync auto-ship price if user has an active auto-ship
        await this.syncAutoShipIfActive(userId, newFormula.id, newFormula.version);

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

    /**
     * Calculate the next review date from subscription renewal or last order.
     * 
     * Logic:
     *  1. If subscription.renewsAt exists → next shipment = renewsAt
     *  2. Else if user has orders → next shipment = latest order.placedAt + supplyWeeks * 7 days
     *  3. Else → fall back to formula.createdAt + 56 days
     * 
     * Review date = next shipment date - daysBefore
     * 
     * For "every_other" (quarterly), the shipment date is doubled.
     */
    private async calculateNextReviewDate(
        userId: string,
        formula: Formula,
        frequency: string,
        daysBefore: number,
    ): Promise<Date> {
        const SUPPLY_WEEKS = 8;
        let nextShipmentDate: Date;

        // 1. Try subscription renewsAt
        const subscription = await usersRepository.getSubscription(userId);
        if (subscription?.renewsAt) {
            nextShipmentDate = new Date(subscription.renewsAt);
        } else {
            // 2. Fall back to latest order + supply weeks
            const orders = await usersRepository.listOrdersByUser(userId);
            if (orders.length > 0) {
                const latestOrder = orders[0]; // already sorted desc by placedAt
                const supplyWeeks = (latestOrder as any).supplyWeeks ?? SUPPLY_WEEKS;
                nextShipmentDate = new Date(latestOrder.placedAt);
                nextShipmentDate.setDate(nextShipmentDate.getDate() + supplyWeeks * 7);
            } else {
                // 3. No orders — use formula creation date + supply period
                nextShipmentDate = new Date(formula.createdAt);
                nextShipmentDate.setDate(nextShipmentDate.getDate() + SUPPLY_WEEKS * 7);
            }
        }

        // For "every_other" / quarterly, skip one cycle
        if (frequency === 'quarterly') {
            nextShipmentDate.setDate(nextShipmentDate.getDate() + SUPPLY_WEEKS * 7);
        }

        // Review date = shipment date - daysBefore
        const nextReviewDate = new Date(nextShipmentDate);
        nextReviewDate.setDate(nextReviewDate.getDate() - daysBefore);

        // If in the past, advance by one full supply cycle (or two for every_other)
        const cycleDays = frequency === 'quarterly' ? SUPPLY_WEEKS * 7 * 2 : SUPPLY_WEEKS * 7;
        while (nextReviewDate < new Date()) {
            nextReviewDate.setDate(nextReviewDate.getDate() + cycleDays);
        }

        return nextReviewDate;
    }

    async saveReviewSchedule(userId: string, formulaId: string, data: any) {
        const {
            frequency,
            daysBefore = 10,
            emailReminders,
            smsReminders,
            calendarIntegration,
        } = data;

        // Verify the formula belongs to the user
        const formula = await formulasRepository.getFormula(formulaId);
        if (!formula || formula.userId !== userId) {
            throw new Error('Formula not found');
        }

        // Validate frequency — accept both legacy and new values
        if (!['monthly', 'bimonthly', 'quarterly'].includes(frequency)) {
            throw new Error('Invalid frequency. Must be bimonthly or quarterly');
        }

        // Validate daysBefore (now fixed at 10, but accept 1-14 for flexibility)
        const effectiveDaysBefore = typeof daysBefore === 'number' && daysBefore >= 1 && daysBefore <= 14
            ? daysBefore
            : 10;

        // Calculate next review date from subscription/order data
        const nextReviewDate = await this.calculateNextReviewDate(userId, formula, frequency, effectiveDaysBefore);

        // Check if schedule already exists
        const existingSchedule = await formulasRepository.getReviewSchedule(userId, formulaId);

        if (existingSchedule) {
            // Update existing
            return await formulasRepository.updateReviewSchedule(existingSchedule.id, {
                frequency,
                daysBefore: effectiveDaysBefore,
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
                daysBefore: effectiveDaysBefore,
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

    async getSharedFormula(shareToken: string) {
        const formula = await formulasRepository.getSharedFormulaByToken(shareToken);

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
                name: user?.name || 'Ones User',
            }
        };
    }

    async toggleSharing(userId: string, formulaId: string, isSharedPublicly: boolean) {
        const formula = await formulasRepository.getFormula(formulaId);

        if (!formula || formula.userId !== userId) {
            throw new Error('Formula not found or access denied');
        }

        const updatedFormula = await formulasRepository.updateSharingOptions(formulaId, isSharedPublicly);

        return {
            isSharedPublicly: updatedFormula.isSharedPublicly,
            shareToken: updatedFormula.shareToken,
        };
    }

    /**
     * If the user has an active auto-ship, sync the formula price.
     * Called after any formula creation/modification. Non-blocking — failures
     * are logged but don't break the primary flow.
     */
    async syncAutoShipIfActive(userId: string, formulaId: string, formulaVersion: number): Promise<void> {
        try {
            const autoShip = await autoShipService.getAutoShip(userId);
            if (autoShip && autoShip.status === 'active') {
                await autoShipService.syncFormulaPrice({ userId, formulaId, formulaVersion });
                logger.info('Auto-ship price synced after formula change', {
                    userId,
                    formulaId,
                    formulaVersion,
                    autoShipId: autoShip.id,
                });
            }
        } catch (err) {
            logger.error('Failed to sync auto-ship after formula change — user unaffected', {
                userId,
                formulaId,
                formulaVersion,
                error: err instanceof Error ? err.message : err,
            });
        }
    }
}

export const formulasService = new FormulasService();
