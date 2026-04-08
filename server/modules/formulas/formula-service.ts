import { SYSTEM_SUPPORTS, INDIVIDUAL_INGREDIENTS, normalizeIngredientName } from "@shared/ingredients";
import { z } from "zod";
import { logger } from '../../infra/logging/logger';

// SECURITY: Immutable formula limits - CANNOT be changed by user requests or AI prompts
export const FORMULA_LIMITS = {
    CAPSULE_CAPACITY_MG: 550,      // Each capsule holds 550mg
    VALID_CAPSULE_COUNTS: [6, 9, 12] as const, // Allowed capsule counts (6, 9, or 12 - no 15)
    DEFAULT_CAPSULE_COUNT: 9,      // Default if not specified
    BUDGET_TOLERANCE_PERCENT: 0.025, // Allow 2.5% over capsule budget
    MIN_BUDGET_UTILIZATION_PERCENT: 1.0, // Require 100% budget utilization — capsules must be fully filled
    MIN_INGREDIENT_DOSE: 10,       // Global minimum dose per ingredient in mg
    MIN_INGREDIENT_COUNT: 8,       // Hard minimum ingredient count for ALL capsule tiers
    MAX_INGREDIENT_COUNT: 50,      // Maximum number of ingredients
} as const;

export function getMinIngredientCountForCapsules(_targetCapsules?: number): number {
    // Flat minimum of 8 ingredients regardless of capsule count.
    // The AI decides whether to go higher based on the user's clinical needs.
    return FORMULA_LIMITS.MIN_INGREDIENT_COUNT;
}

// Formula extraction schema for AI response parsing
export const FormulaExtractionSchema = z.object({
    formulaName: z.string().optional(),
    bases: z.array(z.object({
        ingredient: z.string(),
        amount: z.number(),
        unit: z.string().default('mg'),
        purpose: z.string().optional()
    })).default([]),
    additions: z.array(z.object({
        ingredient: z.string(),
        amount: z.number(),
        unit: z.string().default('mg'),
        purpose: z.string().optional()
    })).default([]),
    totalMg: z.number().optional(),
    rationale: z.string().optional(),
    warnings: z.array(z.string()).default([]),
    disclaimers: z.array(z.string()).default([]),
    targetCapsules: z.number().optional()
});

export function extractCapsuleCountFromMessage(message: string): number | null {
    const patterns = [
        /I'll take (\d+) capsules/i,
        /I've selected (\d+)/i,
        /(\d+) capsules per day/i,
        /(\d+) capsules\/day/i,
        /(\d+) capsules please/i,
        /selected (\d+) capsules/i,
        /choose (\d+) capsules/i,
        /want (\d+) capsules/i,
        /(\d+) caps per day/i,
        /go with (\d+)/i,
    ];

    for (const pattern of patterns) {
        const match = message.match(pattern);
        if (match) {
            const count = parseInt(match[1], 10);
            if (FORMULA_LIMITS.VALID_CAPSULE_COUNTS.includes(count as any)) {
                return count;
            }
        }
    }
    return null;
}

export function getMaxDosageForCapsules(targetCapsules: number): number {
    const validCount = FORMULA_LIMITS.VALID_CAPSULE_COUNTS.includes(targetCapsules as any)
        ? targetCapsules
        : FORMULA_LIMITS.DEFAULT_CAPSULE_COUNT;
    return validCount * FORMULA_LIMITS.CAPSULE_CAPACITY_MG;
}

function getMinAllowedDoseForIngredient(ingredientName: string): number {
    const support = SYSTEM_SUPPORTS.find((s) => s.name === ingredientName);
    if (support) {
        return support.doseMg || FORMULA_LIMITS.MIN_INGREDIENT_DOSE;
    }

    const individual = INDIVIDUAL_INGREDIENTS.find((i) => i.name === ingredientName);
    if (individual) {
        const explicitMin = typeof individual.doseRangeMin === 'number'
            ? individual.doseRangeMin
            : (typeof individual.doseMg === 'number' ? individual.doseMg : FORMULA_LIMITS.MIN_INGREDIENT_DOSE);
        return explicitMin;
    }

    return FORMULA_LIMITS.MIN_INGREDIENT_DOSE;
}

function getMaxAllowedDoseForIngredient(ingredientName: string): number {
    const support = SYSTEM_SUPPORTS.find((s) => s.name === ingredientName);
    if (support) {
        return support.doseRangeMax || support.doseMg;
    }

    const individual = INDIVIDUAL_INGREDIENTS.find((i) => i.name === ingredientName);
    if (individual) {
        return typeof individual.doseRangeMax === 'number'
            ? individual.doseRangeMax
            : individual.doseMg;
    }

    logger.warn('Unknown ingredient encountered — capping max dose at 1000mg', { ingredientName });
    return 1000;
}

export function autoFitFormulaToBudget(formula: any): {
    adjusted: boolean;
    fitsBudget: boolean;
    previousTotalMg: number;
    newTotalMg: number;
    reductionAppliedMg: number;
    maxAllowedMg: number;
    removedIngredients?: string[];
    message?: string;
} {
    const targetCapsules = formula.targetCapsules || FORMULA_LIMITS.DEFAULT_CAPSULE_COUNT;
    const maxDosage = getMaxDosageForCapsules(targetCapsules);
    const maxAllowedMg = Math.floor(maxDosage * (1 + FORMULA_LIMITS.BUDGET_TOLERANCE_PERCENT));

    const allItems = [...(formula.bases || []), ...(formula.additions || [])];
    const previousTotalMg = allItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    let excess = previousTotalMg - maxAllowedMg;

    if (excess <= 0) {
        formula.totalMg = previousTotalMg;
        return {
            adjusted: false,
            fitsBudget: true,
            previousTotalMg,
            newTotalMg: previousTotalMg,
            reductionAppliedMg: 0,
            maxAllowedMg,
        };
    }

    type Candidate = {
        list: 'additions' | 'bases';
        index: number;
        ingredient: string;
        currentAmount: number;
        minAllowed: number;
        reducible: number;
    };

    const candidates: Candidate[] = [];

    (formula.additions || []).forEach((item: any, index: number) => {
        const currentAmount = Number(item.amount || 0);
        const minAllowed = getMinAllowedDoseForIngredient(item.ingredient);
        const reducible = Math.max(0, currentAmount - minAllowed);
        if (reducible > 0) {
            candidates.push({
                list: 'additions',
                index,
                ingredient: item.ingredient,
                currentAmount,
                minAllowed,
                reducible,
            });
        }
    });

    (formula.bases || []).forEach((item: any, index: number) => {
        const currentAmount = Number(item.amount || 0);
        const minAllowed = getMinAllowedDoseForIngredient(item.ingredient);
        const reducible = Math.max(0, currentAmount - minAllowed);
        if (reducible > 0) {
            candidates.push({
                list: 'bases',
                index,
                ingredient: item.ingredient,
                currentAmount,
                minAllowed,
                reducible,
            });
        }
    });

    candidates.sort((a, b) => {
        if (a.list !== b.list) {
            return a.list === 'additions' ? -1 : 1;
        }
        return b.reducible - a.reducible;
    });

    for (const candidate of candidates) {
        if (excess <= 0) break;

        const targetList = candidate.list === 'additions' ? formula.additions : formula.bases;
        const current = targetList[candidate.index];
        const currentAmount = Number(current?.amount || 0);
        const minAllowed = getMinAllowedDoseForIngredient(current?.ingredient);
        const reducible = Math.max(0, currentAmount - minAllowed);
        if (reducible <= 0) continue;

        const reduction = Math.min(excess, reducible);
        current.amount = Math.max(minAllowed, Math.round(currentAmount - reduction));
        excess -= reduction;
    }

    let newTotalMg = [...(formula.bases || []), ...(formula.additions || [])]
        .reduce((sum, item) => sum + (item.amount || 0), 0);
    formula.totalMg = newTotalMg;

    const removedIngredients: string[] = [];

    if (newTotalMg > maxAllowedMg && Array.isArray(formula.additions) && formula.additions.length > 0) {
        const sortedByAmount = formula.additions
            .map((item: any, index: number) => ({ item, index, amount: Number(item?.amount || 0) }))
            .sort((a: any, b: any) => a.amount - b.amount);

        const toRemove = new Set<number>();
        let overage = newTotalMg - maxAllowedMg;

        for (const candidate of sortedByAmount) {
            if (overage <= 0) break;
            if (!candidate.item?.ingredient) continue;
            toRemove.add(candidate.index);
            removedIngredients.push(candidate.item.ingredient);
            overage -= candidate.amount;
        }

        if (toRemove.size > 0) {
            formula.additions = formula.additions.filter((_: any, index: number) => !toRemove.has(index));
            newTotalMg = [...(formula.bases || []), ...(formula.additions || [])]
                .reduce((sum, item) => sum + (item.amount || 0), 0);
            formula.totalMg = newTotalMg;
        }
    }

    const reductionAppliedMg = Math.max(0, previousTotalMg - newTotalMg);
    const fitsBudget = newTotalMg <= maxAllowedMg;

    return {
        adjusted: reductionAppliedMg > 0,
        fitsBudget,
        previousTotalMg,
        newTotalMg,
        reductionAppliedMg,
        maxAllowedMg,
        removedIngredients,
        message: reductionAppliedMg > 0
            ? `Auto-trimmed ${reductionAppliedMg}mg to fit ${targetCapsules}-capsule budget (${newTotalMg}/${maxAllowedMg}mg).${removedIngredients.length ? ` Removed: ${removedIngredients.slice(0, 3).join(', ')}${removedIngredients.length > 3 ? '…' : ''}.` : ''}`
            : undefined,
    };
}

export function autoExpandFormula(formula: any): { expanded: boolean; addedIngredients: string[] } {
    const allIngredients = [...(formula.bases || []), ...(formula.additions || [])];
    const currentCount = allIngredients.length;
    const targetCapsules = formula.targetCapsules || FORMULA_LIMITS.DEFAULT_CAPSULE_COUNT;
    const minIngredientCount = getMinIngredientCountForCapsules(targetCapsules);
    const neededCount = minIngredientCount - currentCount;

    const maxDosage = getMaxDosageForCapsules(targetCapsules);
    const maxWithTolerance = Math.floor(maxDosage * (1 + FORMULA_LIMITS.BUDGET_TOLERANCE_PERCENT));

    let currentTotal = 0;
    for (const ing of allIngredients) {
        currentTotal += ing.amount || 0;
    }

    let remainingBudget = maxWithTolerance - currentTotal;

    const fillerIngredients = [
        { name: 'Garlic', minDose: 50, normalDose: 150, unit: 'mg', purpose: 'Supports cardiovascular health and healthy cholesterol levels through allicin and sulfur compounds.' },
        { name: 'Resveratrol', minDose: 50, normalDose: 150, unit: 'mg', purpose: 'Provides antioxidant support for endothelial function and healthy aging.' },
        { name: 'Ginkgo Biloba Extract 24%', minDose: 40, normalDose: 120, unit: 'mg', purpose: 'Supports circulation and cognitive function through improved blood flow.' },
        { name: 'Ginger Root', minDose: 75, normalDose: 150, unit: 'mg', purpose: 'Supports digestion, reduces inflammation, and aids metabolic function.' },
        { name: 'CoEnzyme Q10', minDose: 100, normalDose: 200, unit: 'mg', purpose: 'Supports mitochondrial energy production and cardiovascular health.' },
        { name: 'Hawthorn Berry', minDose: 50, normalDose: 100, unit: 'mg', purpose: 'Traditional cardiovascular support for heart muscle function and blood pressure.' },
        { name: 'Cinnamon 20:1', minDose: 30, normalDose: 100, unit: 'mg', purpose: 'Supports healthy blood sugar metabolism and insulin sensitivity.' },
        { name: 'Magnesium', minDose: 100, normalDose: 200, unit: 'mg', purpose: 'Essential mineral for muscle relaxation, energy production, and nervous system function.' },
    ];

    const existingNames = new Set(allIngredients.map(i => i.ingredient.toLowerCase()));
    const addedIngredients: string[] = [];
    let runningBudget = remainingBudget;

    const minTarget = Math.floor(maxDosage * FORMULA_LIMITS.MIN_BUDGET_UTILIZATION_PERCENT);

    for (const filler of fillerIngredients) {
        if (runningBudget <= 0) break;
        const shouldAddForCount = neededCount > 0 && addedIngredients.length < neededCount;
        const shouldAddForBudget = currentTotal < minTarget;
        if (!shouldAddForCount && !shouldAddForBudget) break;
        const minAllowedForFiller = getMinAllowedDoseForIngredient(filler.name);
        const maxAllowedForFiller = getMaxAllowedDoseForIngredient(filler.name);
        const preferredDose = Math.min(maxAllowedForFiller, Math.max(minAllowedForFiller, filler.normalDose));
        if (runningBudget < preferredDose) continue;
        if (existingNames.has(filler.name.toLowerCase())) continue;

        if (!formula.additions) formula.additions = [];
        formula.additions.push({
            ingredient: filler.name,
                amount: preferredDose,
            unit: filler.unit,
            purpose: filler.purpose
        });

        addedIngredients.push(`${filler.name} ${preferredDose}mg`);
        runningBudget -= preferredDose;
        currentTotal += preferredDose;
        existingNames.add(filler.name.toLowerCase());
    }

    if ((neededCount > 0 && addedIngredients.length < neededCount) || currentTotal < minTarget) {
        for (const filler of fillerIngredients) {
            if (runningBudget <= 0) break;
            const shouldAddForCount = neededCount > 0 && addedIngredients.length < neededCount;
            const shouldAddForBudget = currentTotal < minTarget;
            if (!shouldAddForCount && !shouldAddForBudget) break;
            const minAllowedForFiller = getMinAllowedDoseForIngredient(filler.name);
            const maxAllowedForFiller = getMaxAllowedDoseForIngredient(filler.name);
            const fallbackDose = Math.min(maxAllowedForFiller, Math.max(minAllowedForFiller, filler.minDose));
            if (runningBudget < fallbackDose) continue;
            if (existingNames.has(filler.name.toLowerCase())) continue;

            if (!formula.additions) formula.additions = [];
            formula.additions.push({
                ingredient: filler.name,
                    amount: fallbackDose,
                unit: filler.unit,
                purpose: filler.purpose
            });

            addedIngredients.push(`${filler.name} ${fallbackDose}mg`);
            runningBudget -= fallbackDose;
            currentTotal += fallbackDose;
            existingNames.add(filler.name.toLowerCase());
        }
    }

    let finalTotal = [...(formula.bases || []), ...(formula.additions || [])]
        .reduce((sum, ing) => sum + (ing.amount || 0), 0);

    if (finalTotal < minTarget) {
        // Target the exact capsule budget (maxDosage), using maxWithTolerance as the hard ceiling
        const fillTarget = maxDosage;
        const deficit = fillTarget - finalTotal;
        if (deficit > 0) {
            // First boost additions that have room to grow
            const sortedAdditions = [...(formula.additions || [])].sort((a: any, b: any) => (b.amount || 0) - (a.amount || 0));
            let usedHeadroom = 0;
            for (const addition of sortedAdditions) {
                if (usedHeadroom >= deficit) break;
                const catalogItem = INDIVIDUAL_INGREDIENTS.find(i => i.name === addition.ingredient);
                if (!catalogItem?.doseRangeMax) continue;
                const currentAmount = addition.amount || 0;
                const canIncrease = catalogItem.doseRangeMax - currentAmount;
                if (canIncrease > 0) {
                    const increase = Math.min(canIncrease, deficit - usedHeadroom);
                    addition.amount = currentAmount + increase;
                    usedHeadroom += increase;
                }
            }

            // If additions alone weren't enough, also boost bases (system supports) by multiplier
            if (usedHeadroom < deficit) {
                for (const base of (formula.bases || [])) {
                    if (usedHeadroom >= deficit) break;
                    const support = SYSTEM_SUPPORTS.find(s => s.name === base.ingredient);
                    if (!support) continue;
                    const baseDose = support.doseMg;
                    const currentAmount = base.amount || 0;
                    const currentMultiplier = Math.round(currentAmount / baseDose);
                    if (currentMultiplier < 3) {
                        const nextMultiplier = Math.min(3, currentMultiplier + 1);
                        const increase = (nextMultiplier - currentMultiplier) * baseDose;
                        if (increase > 0 && usedHeadroom + increase <= deficit + (maxWithTolerance - fillTarget)) {
                            base.amount = nextMultiplier * baseDose;
                            usedHeadroom += increase;
                        }
                    }
                }
            }
        }

        finalTotal = [...(formula.bases || []), ...(formula.additions || [])]
            .reduce((sum, ing) => sum + (ing.amount || 0), 0);
    }

    if (finalTotal < minTarget) {
        const existing = new Set<string>([
            ...(formula.bases || []).map((item: any) => item.ingredient.toLowerCase()),
            ...(formula.additions || []).map((item: any) => item.ingredient.toLowerCase()),
        ]);

        const fallbackCandidates = [...INDIVIDUAL_INGREDIENTS]
            .map((ingredient) => {
                const minAllowed = getMinAllowedDoseForIngredient(ingredient.name);
                const maxAllowed = getMaxAllowedDoseForIngredient(ingredient.name);
                return {
                    ingredient,
                    minAllowed,
                    maxAllowed,
                };
            })
            .filter((candidate) => !existing.has(candidate.ingredient.name.toLowerCase()))
            .sort((a, b) => a.minAllowed - b.minAllowed);

        for (const candidate of fallbackCandidates) {
            if (finalTotal >= minTarget) break;
            const remainingHeadroom = maxWithTolerance - finalTotal;
            if (remainingHeadroom < candidate.minAllowed) continue;

            const targetDose = Math.min(
                candidate.maxAllowed,
                Math.max(candidate.minAllowed, Math.min(remainingHeadroom, candidate.ingredient.doseMg || candidate.minAllowed))
            );

            if (!formula.additions) formula.additions = [];
            formula.additions.push({
                ingredient: candidate.ingredient.name,
                amount: targetDose,
                unit: 'mg',
                purpose: `Completes comprehensive coverage and meets protocol utilization for ${targetCapsules}-capsule plan.`,
            });

            finalTotal += targetDose;
        }
    }

    // Final micro-fill: if still below minTarget by a small amount, proportionally
    // boost existing ingredients to close the gap (handles rounding edge cases)
    if (finalTotal < minTarget) {
        const deficit = minTarget - finalTotal;
        const boostableIngredients = [...(formula.additions || []), ...(formula.bases || [])]
            .map((item: any) => {
                const maxAllowed = getMaxAllowedDoseForIngredient(item.ingredient);
                const current = item.amount || 0;
                return { item, headroom: Math.max(0, maxAllowed - current) };
            })
            .filter(entry => entry.headroom > 0);

        if (boostableIngredients.length > 0) {
            const totalHeadroom = boostableIngredients.reduce((s, e) => s + e.headroom, 0);
            let remainingDeficit = deficit;
            for (const entry of boostableIngredients) {
                if (remainingDeficit <= 0) break;
                const share = Math.min(
                    entry.headroom,
                    Math.ceil((entry.headroom / totalHeadroom) * deficit)
                );
                const increase = Math.min(share, remainingDeficit);
                entry.item.amount = (entry.item.amount || 0) + increase;
                remainingDeficit -= increase;
            }
        }

        finalTotal = [...(formula.bases || []), ...(formula.additions || [])]
            .reduce((sum, ing) => sum + (ing.amount || 0), 0);
    }

    formula.totalMg = finalTotal;
    return { expanded: addedIngredients.length > 0, addedIngredients };
}

export function validateFormulaLimits(formula: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const targetCapsules = formula.targetCapsules || FORMULA_LIMITS.DEFAULT_CAPSULE_COUNT;
    const maxDosage = getMaxDosageForCapsules(targetCapsules);
    const minDosage = Math.floor(maxDosage * FORMULA_LIMITS.MIN_BUDGET_UTILIZATION_PERCENT);
    const maxWithTolerance = Math.floor(maxDosage * (1 + FORMULA_LIMITS.BUDGET_TOLERANCE_PERCENT));

    if (formula.targetCapsules && !FORMULA_LIMITS.VALID_CAPSULE_COUNTS.includes(formula.targetCapsules)) {
        errors.push(`Invalid capsule count: ${formula.targetCapsules}. Must be one of: ${FORMULA_LIMITS.VALID_CAPSULE_COUNTS.join(', ')}`);
    }

    if (formula.totalMg > maxWithTolerance) {
        errors.push(`Formula exceeds ${targetCapsules}-capsule budget of ${maxDosage}mg (max ${maxWithTolerance}mg with 2.5% tolerance). Attempted: ${formula.totalMg}mg. Reduce ingredients or increase capsule count.`);
    }

    if (formula.totalMg < minDosage) {
        errors.push(`Formula under-fills ${targetCapsules}-capsule budget. Minimum required: ${minDosage}mg (100% of ${maxDosage}mg). Attempted: ${formula.totalMg}mg.`);
    }

    const allIngredients = [...(formula.bases || []), ...(formula.additions || [])];
    const minIngredientCount = getMinIngredientCountForCapsules(targetCapsules);

    if (allIngredients.length < minIngredientCount) {
        errors.push(`Formula requires at least ${minIngredientCount} ingredients for a ${targetCapsules}-capsule daily protocol. Attempted: ${allIngredients.length}.`);
    }

    for (const ingredient of allIngredients) {
        const minAllowed = getMinAllowedDoseForIngredient(ingredient.ingredient);
        const maxAllowed = getMaxAllowedDoseForIngredient(ingredient.ingredient);

        if (ingredient.amount < minAllowed) {
            errors.push(`Ingredient "${ingredient.ingredient}" below minimum dose of ${minAllowed}mg (attempted: ${ingredient.amount}mg)`);
        }
        if (ingredient.amount > maxAllowed) {
            errors.push(`Ingredient "${ingredient.ingredient}" exceeds allowed maximum of ${maxAllowed}mg (attempted: ${ingredient.amount}mg)`);
        }
    }

    if (allIngredients.length > FORMULA_LIMITS.MAX_INGREDIENT_COUNT) {
        errors.push(`Formula exceeds maximum ingredient count of ${FORMULA_LIMITS.MAX_INGREDIENT_COUNT}`);
    }

    return { valid: errors.length === 0, errors };
}

export function isAnyIngredientApproved(name: string): boolean {
    if (!name) return false;
    const normalized = normalizeIngredientName(name);
    return SYSTEM_SUPPORTS.some(f => normalizeIngredientName(f.name) === normalized) ||
        INDIVIDUAL_INGREDIENTS.some(i => normalizeIngredientName(i.name) === normalized);
}

export function parseDoseToMg(doseStr: string, ingredientName: string): number {
    if (!doseStr) return 0;
    const match = doseStr.match(/(\d+(?:\.\d+)?)\s*(mg|g|mcg)?/i);
    if (!match) return 0;
    let val = parseFloat(match[1]);
    const unit = (match[2] || 'mg').toLowerCase();
    if (unit === 'g') val *= 1000;
    if (unit === 'mcg') val /= 1000;
    return Math.round(val);
}

export function validateAndCalculateFormula(formula: any) {
    const errors: string[] = [];
    let totalMg = 0;

    const bases = formula.bases || [];
    const additions = formula.additions || [];

    bases.forEach((b: any) => {
        totalMg += b.amount || 0;
        if (!isAnyIngredientApproved(b.ingredient)) {
            errors.push(`UNAUTHORIZED INGREDIENT: ${b.ingredient}`);
        }
    });

    additions.forEach((a: any) => {
        totalMg += a.amount || 0;
        if (!isAnyIngredientApproved(a.ingredient)) {
            errors.push(`UNAUTHORIZED INGREDIENT: ${a.ingredient}`);
        }
    });

    return {
        isValid: errors.length === 0,
        errors,
        calculatedTotalMg: totalMg
    };
}

export function validateAndCorrectIngredientNames(formula: any) {
    const correctedFormula = { ...formula };
    correctedFormula.bases = [...(formula.bases || [])];
    correctedFormula.additions = [...(formula.additions || [])];

    const warnings: string[] = [];
    const errors: string[] = []; // We won't use this for "unrecognized" anymore, only logic errors if any

    const processList = (list: any[], type: 'base' | 'addition') => {
        for (let i = 0; i < list.length; i++) {
            const item = list[i];
            const rawName = item.ingredient || item.name;
            const normalized = normalizeIngredientName(rawName);

            const found = SYSTEM_SUPPORTS.find(s => normalizeIngredientName(s.name) === normalized) ||
                INDIVIDUAL_INGREDIENTS.find(i => normalizeIngredientName(i.name) === normalized);

            if (found) {
                if (found.name !== rawName) {
                    warnings.push(`Auto-corrected "${rawName}" to "${found.name}"`);
                }

                const isSystemSupport = SYSTEM_SUPPORTS.some(s => s.name === found.name);
                const numericAmount = Number(item.amount || found.doseMg || 0);
                let normalizedAmount = Number.isFinite(numericAmount) ? numericAmount : found.doseMg;

                if (isSystemSupport) {
                    const baseDose = found.doseMg;
                    const allowedMultipliers = [1, 2, 3];
                    const closestMultiplier = allowedMultipliers.reduce((closest, candidate) => {
                        const closestDelta = Math.abs(baseDose * closest - normalizedAmount);
                        const candidateDelta = Math.abs(baseDose * candidate - normalizedAmount);
                        return candidateDelta < closestDelta ? candidate : closest;
                    }, 1);
                    const clampedMultiplier = Math.min(3, Math.max(1, closestMultiplier));
                    normalizedAmount = baseDose * clampedMultiplier;
                } else {
                    const minAllowed = getMinAllowedDoseForIngredient(found.name);
                    const maxAllowed = getMaxAllowedDoseForIngredient(found.name);
                    normalizedAmount = Math.min(maxAllowed, Math.max(minAllowed, Math.round(normalizedAmount)));
                }

                list[i] = { ...item, ingredient: found.name, amount: normalizedAmount };
            } else {
                // SILENT REMOVAL logic from old_routes:
                // Remove the unapproved item and add a warning instead of erroring
                const warningMsg = `Removed unapproved ${type}: "${rawName}"`;
                warnings.push(warningMsg);
                list.splice(i, 1);
                i--; // Adjust index
            }
        }
    };

    processList(correctedFormula.bases, 'base');
    processList(correctedFormula.additions, 'addition');

    // Deduplicate: merge any duplicate ingredients (keep highest dose, warn)
    const deduplicateList = (list: any[], type: 'base' | 'addition') => {
        const seen = new Map<string, number>(); // name → index
        for (let i = 0; i < list.length; i++) {
            const key = list[i].ingredient.toLowerCase();
            if (seen.has(key)) {
                const existingIdx = seen.get(key)!;
                const existingAmount = list[existingIdx].amount || 0;
                const duplicateAmount = list[i].amount || 0;
                const mergedAmount = Math.max(existingAmount, duplicateAmount);
                list[existingIdx] = { ...list[existingIdx], amount: mergedAmount };
                warnings.push(`Merged duplicate ${type} "${list[i].ingredient}" (kept ${mergedAmount}mg)`);
                list.splice(i, 1);
                i--;
            } else {
                seen.set(key, i);
            }
        }
    };
    deduplicateList(correctedFormula.bases, 'base');
    deduplicateList(correctedFormula.additions, 'addition');

    // Also check for cross-list duplicates (same ingredient in bases AND additions)
    const baseNames = new Set(correctedFormula.bases.map((b: any) => b.ingredient.toLowerCase()));
    for (let i = 0; i < correctedFormula.additions.length; i++) {
        if (baseNames.has(correctedFormula.additions[i].ingredient.toLowerCase())) {
            warnings.push(`Removed duplicate addition "${correctedFormula.additions[i].ingredient}" (already in bases)`);
            correctedFormula.additions.splice(i, 1);
            i--;
        }
    }

    return {
        success: true, // Always true if it reaches here, since we remove instead of erroring
        correctedFormula,
        warnings,
        errors
    };
}

/**
 * @deprecated Use validateFormulaSafety from safety-validator.ts instead.
 * This function is superseded by the structured SafetyWarning system which provides
 * severity-tiered enforcement (critical/serious/informational) and sub-ingredient expansion.
 * Kept as dead code reference — safe to remove entirely.
 */
export async function validateSupplementInteractions(formula: any, userMedications: string[]): Promise<string[]> {
    const warnings: string[] = [];
    const allIngredients = [...(formula.bases || []), ...(formula.additions || [])].map((i: any) => (i.ingredient || '').toLowerCase());

    // Helper: check if any user medication matches any drug keyword
    const has = (meds: string[], drugList: string[]) =>
        meds.some(m => drugList.some(d => m.includes(d)));
    // Helper: check if any formula ingredient matches any supplement keyword
    const hasIngr = (keywords: string[]) =>
        allIngredients.some(i => keywords.some(k => i.includes(k)));
    // Helper: collect matching ingredient names for the warning message
    const matchingIngr = (keywords: string[]) => {
        const matches = new Set<string>();
        for (const i of allIngredients) {
            for (const k of keywords) {
                if (i.includes(k)) matches.add(i);
            }
        }
        return [...matches];
    };

    // ── Antiplatelet stacking check (no medication needed) ──────────────
    const antiplateletKeywords = ['omega', 'fish oil', 'garlic', 'ginger', 'vitamin e', 'resveratrol', 'curcumin', 'nattokinase', 'bromelain'];
    const antiplateletMatches = matchingIngr(antiplateletKeywords);
    if (antiplateletMatches.length >= 3) {
        warnings.push(`Your formula stacks ${antiplateletMatches.length} ingredients with antiplatelet/anticoagulant activity (${antiplateletMatches.join(', ')}). This may increase bleeding risk even without a blood thinner — discuss with your physician.`);
    }

    // Early exit if no medications disclosed
    if (!userMedications || userMedications.length === 0) {
        if (allIngredients.length > 0) {
            warnings.push('If you take any prescription medications, consult your physician or pharmacist before starting this formula.');
        }
        return warnings;
    }

    const medsLower = userMedications.map(m => m.toLowerCase());

    // ── 1. Anticoagulants / Blood Thinners ──────────────────────────────
    const bloodThinners = ['warfarin', 'coumadin', 'clopidogrel', 'plavix', 'aspirin', 'rivaroxaban', 'xarelto', 'apixaban', 'eliquis', 'dabigatran', 'pradaxa', 'heparin', 'enoxaparin'];
    const btSupplements = ['omega', 'fish oil', 'garlic', 'ginger', 'ginkgo', 'vitamin e', 'resveratrol', 'curcumin', 'nattokinase', 'bromelain'];
    if (has(medsLower, bloodThinners) && hasIngr(btSupplements)) {
        const found = matchingIngr(btSupplements);
        warnings.push(`Contains ${found.join(', ')} which may increase bleeding risk with your blood thinner. Consult your physician.`);
    }

    // ── 2. Antidepressants / Psychiatric Medications ────────────────────
    const ssriSnri = ['sertraline', 'zoloft', 'fluoxetine', 'prozac', 'escitalopram', 'lexapro', 'citalopram', 'paroxetine', 'paxil', 'venlafaxine', 'effexor', 'duloxetine', 'cymbalta', 'bupropion', 'wellbutrin', 'maoi', 'phenelzine', 'tranylcypromine', 'lithium', 'quetiapine', 'seroquel'];
    const ssriSupplements = ["st. john's wort", 'st john', '5-htp', 'same', 'tryptophan', 'gaba', 'rhodiola', 'ashwagandha'];
    if (has(medsLower, ssriSnri)) {
        // Absolute contraindication: St. John's Wort
        if (hasIngr(["st. john", "st john"])) {
            warnings.push("CRITICAL: St. John's Wort must NEVER be combined with antidepressants — risk of serotonin syndrome. Remove immediately.");
        }
        const otherPsych = ssriSupplements.filter(s => !s.includes('st john'));
        if (hasIngr(otherPsych)) {
            const found = matchingIngr(otherPsych);
            warnings.push(`Contains ${found.join(', ')} which may interact with your psychiatric medication. Discuss with your prescribing clinician.`);
        }
    }

    // ── 3. Thyroid Medications ──────────────────────────────────────────
    const thyroidMeds = ['levothyroxine', 'synthroid', 'tirosint', 'liothyronine', 'cytomel', 'armour thyroid'];
    const thyroidSupplements = ['thyroid support', 'ashwagandha', 'iodine', 'kelp', 'seaweed', 'selenium', 'zinc'];
    if (has(medsLower, thyroidMeds) && hasIngr(thyroidSupplements)) {
        const found = matchingIngr(thyroidSupplements);
        warnings.push(`Contains ${found.join(', ')} which may affect thyroid function while on thyroid medication. Take supplements 4+ hours apart from thyroid meds. Coordinate with your clinician.`);
    }

    // ── 4. Diabetes / Blood Sugar Medications ───────────────────────────
    const diabetesMeds = ['metformin', 'insulin', 'glipizide', 'glyburide', 'semaglutide', 'ozempic', 'wegovy', 'tirzepatide', 'mounjaro', 'sitagliptin', 'januvia', 'empagliflozin', 'jardiance', 'dapagliflozin', 'canagliflozin'];
    const diabetesSupplements = ['berberine', 'cinnamon', 'chromium', 'alpha lipoic', 'innoslim', 'bitter melon', 'gymnema'];
    if (has(medsLower, diabetesMeds) && hasIngr(diabetesSupplements)) {
        const found = matchingIngr(diabetesSupplements);
        warnings.push(`Contains ${found.join(', ')} which may lower blood glucose alongside your diabetes medication. Monitor for hypoglycemia.`);
    }

    // ── 5. Blood Pressure Medications ───────────────────────────────────
    const bpMeds = ['lisinopril', 'amlodipine', 'metoprolol', 'losartan', 'valsartan', 'hydrochlorothiazide', 'carvedilol', 'verapamil', 'diltiazem', 'enalapril', 'ramipril'];
    const bpSupplements = ['magnesium', 'coq10', 'hawthorn', 'garlic', 'omega', 'potassium'];
    if (has(medsLower, bpMeds) && hasIngr(bpSupplements)) {
        const found = matchingIngr(bpSupplements);
        warnings.push(`Contains ${found.join(', ')} which may further lower blood pressure with your antihypertensive medication. Monitor blood pressure closely.`);
    }

    // ── 6. Immunosuppressants / Transplant Medications ──────────────────
    const immunoMeds = ['cyclosporine', 'tacrolimus', 'mycophenolate', 'prednisone', 'methotrexate', 'azathioprine', 'sirolimus'];
    const immunoSupplements = ["st. john", "st john", 'echinacea', 'milk thistle', 'astragalus', 'elderberry', 'mushroom'];
    if (has(medsLower, immunoMeds)) {
        if (hasIngr(["st. john", "st john"])) {
            warnings.push("CRITICAL: St. John's Wort dramatically reduces immunosuppressant drug levels — this is life-threatening for transplant patients. Remove immediately.");
        }
        if (hasIngr(['echinacea', 'astragalus', 'elderberry', 'mushroom'])) {
            const found = matchingIngr(['echinacea', 'astragalus', 'elderberry', 'mushroom']);
            warnings.push(`Contains immune-stimulating ingredients (${found.join(', ')}) which are contraindicated with immunosuppressant therapy. Consult your physician.`);
        }
        if (hasIngr(['milk thistle'])) {
            warnings.push('Milk Thistle may alter CYP3A4 enzyme activity, affecting immunosuppressant drug levels. Physician review required.');
        }
    }

    // ── 7. Chemotherapy / Oncology Medications ───────────────────────────
    const chemoKeywords = ['chemotherapy', 'chemo', 'tamoxifen', 'anastrozole', 'letrozole', 'cisplatin', 'carboplatin', 'doxorubicin', 'paclitaxel', 'cyclophosphamide'];
    const chemoSupplements = ["st. john", "st john", 'high-dose', 'nac', 'melatonin'];
    if (has(medsLower, chemoKeywords) && hasIngr(chemoSupplements)) {
        warnings.push('You are on oncology medications. High-dose antioxidants and certain supplements may interfere with treatment. Physician oncologist review is REQUIRED before using any supplement.');
    }

    // ── 8. Statins (Cholesterol Medications) ────────────────────────────
    const statins = ['atorvastatin', 'lipitor', 'rosuvastatin', 'crestor', 'simvastatin', 'zocor', 'pravastatin', 'fluvastatin', 'lovastatin'];
    if (has(medsLower, statins)) {
        if (hasIngr(['red yeast rice'])) {
            warnings.push('CRITICAL: Red Yeast Rice contains natural lovastatin and must NOT be combined with statin medications — risk of rhabdomyolysis. Remove immediately.');
        }
        const statinRisky = ['niacin', 'berberine'];
        if (hasIngr(statinRisky)) {
            const found = matchingIngr(statinRisky);
            warnings.push(`Contains ${found.join(', ')} which has additive lipid-lowering effects with your statin. Monitor for muscle pain/weakness (myopathy).`);
        }
    }

    // ── 9. Hormone Medications (HRT, Testosterone, Contraceptives) ──────
    const hormoneMeds = ['estradiol', 'progesterone', 'testosterone', 'birth control', 'contraceptive', 'clomid', 'clomiphene', 'finasteride', 'propecia', 'spironolactone'];
    const hormoneSupplements = ['ashwagandha', 'maca', 'dhea', 'dim', 'saw palmetto', 'black cohosh', 'vitex', 'tribulus'];
    if (has(medsLower, hormoneMeds) && hasIngr(hormoneSupplements)) {
        const found = matchingIngr(hormoneSupplements);
        warnings.push(`Contains hormone-modulating ingredients (${found.join(', ')}) which may interact with your hormone therapy. Coordinate with your prescribing physician.`);
    }

    // ── 10. Seizure / Epilepsy Medications ──────────────────────────────
    const seizureMeds = ['carbamazepine', 'tegretol', 'phenytoin', 'dilantin', 'valproic', 'depakote', 'lamotrigine', 'lamictal', 'gabapentin', 'neurontin', 'levetiracetam', 'keppra', 'topiramate', 'topamax'];
    const seizureSupplements = ['ginkgo', 'evening primrose', 'vitamin b6', "st. john", "st john"];
    if (has(medsLower, seizureMeds) && hasIngr(seizureSupplements)) {
        const found = matchingIngr(seizureSupplements);
        warnings.push(`Contains ${found.join(', ')} which may lower seizure threshold or alter anti-epileptic drug levels. Consult your neurologist before starting.`);
    }

    // ── 11. Sedatives / Benzodiazepines / Sleep Medications ─────────────
    const sedativeMeds = ['diazepam', 'valium', 'alprazolam', 'xanax', 'lorazepam', 'ativan', 'clonazepam', 'klonopin', 'zolpidem', 'ambien', 'eszopiclone', 'lunesta', 'temazepam'];
    const sedativeSupplements = ['valerian', 'gaba', 'melatonin', 'kava', 'passionflower', 'magnolia'];
    if (has(medsLower, sedativeMeds) && hasIngr(sedativeSupplements)) {
        const found = matchingIngr(sedativeSupplements);
        warnings.push(`Contains ${found.join(', ')} which may cause additive sedation with your sedative/sleep medication. Risk of excessive drowsiness — consult your physician.`);
    }

    // ── 12. Opioid Pain Medications ─────────────────────────────────────
    const opioidMeds = ['oxycodone', 'oxycontin', 'hydrocodone', 'vicodin', 'tramadol', 'ultram', 'morphine', 'codeine', 'fentanyl', 'methadone', 'buprenorphine', 'suboxone'];
    const opioidSupplements = ['valerian', 'gaba', 'kava', 'passionflower', 'magnolia', 'melatonin'];
    if (has(medsLower, opioidMeds) && hasIngr(opioidSupplements)) {
        const found = matchingIngr(opioidSupplements);
        warnings.push(`Contains sedating supplements (${found.join(', ')}) which may cause dangerous additive CNS depression with opioid medications. Physician approval required.`);
    }

    // ── 13. ADHD Stimulant Medications ───────────────────────────────────
    const adhdMeds = ['methylphenidate', 'ritalin', 'concerta', 'amphetamine', 'adderall', 'lisdexamfetamine', 'vyvanse', 'dextroamphetamine', 'dexedrine', 'atomoxetine', 'strattera'];
    const adhdSupplements = ['caffeine', 'rhodiola', 'ginseng', 'tyrosine', 'yohimbine', 'synephrine'];
    if (has(medsLower, adhdMeds) && hasIngr(adhdSupplements)) {
        const found = matchingIngr(adhdSupplements);
        warnings.push(`Contains stimulating ingredients (${found.join(', ')}) which may cause additive cardiovascular stress and overstimulation with your ADHD medication. Discuss with your physician.`);
    }

    // ── 14. PPIs / Acid Reducers ────────────────────────────────────────
    const ppiMeds = ['omeprazole', 'prilosec', 'pantoprazole', 'protonix', 'esomeprazole', 'nexium', 'lansoprazole', 'prevacid', 'famotidine', 'pepcid', 'ranitidine'];
    const ppiSupplements = ['iron', 'calcium', 'magnesium', 'vitamin b12', 'zinc'];
    if (has(medsLower, ppiMeds) && hasIngr(ppiSupplements)) {
        const found = matchingIngr(ppiSupplements);
        warnings.push(`PPIs reduce absorption of ${found.join(', ')}. Take these supplements at least 2 hours apart from your acid reducer for best absorption.`);
    }

    // ── 15. Antibiotics ─────────────────────────────────────────────────
    const antibiotics = ['tetracycline', 'doxycycline', 'minocycline', 'ciprofloxacin', 'cipro', 'levofloxacin', 'levaquin', 'moxifloxacin', 'amoxicillin', 'azithromycin'];
    const antibioticSupplements = ['calcium', 'iron', 'magnesium', 'zinc'];
    if (has(medsLower, antibiotics) && hasIngr(antibioticSupplements)) {
        const found = matchingIngr(antibioticSupplements);
        warnings.push(`Minerals (${found.join(', ')}) can chelate and reduce absorption of your antibiotic. Take supplements at least 2-4 hours apart from your antibiotic dose.`);
    }

    // ── 16. Corticosteroids ─────────────────────────────────────────────
    const corticosteroids = ['prednisone', 'prednisolone', 'dexamethasone', 'methylprednisolone', 'hydrocortisone', 'budesonide'];
    if (has(medsLower, corticosteroids)) {
        if (hasIngr(['licorice', 'glycyrrhizin'])) {
            warnings.push('Licorice Root may worsen potassium depletion and fluid retention caused by corticosteroids. Avoid or use deglycyrrhizinated (DGL) form only.');
        }
        if (hasIngr(['echinacea', 'astragalus', 'elderberry', 'mushroom'])) {
            const found = matchingIngr(['echinacea', 'astragalus', 'elderberry', 'mushroom']);
            warnings.push(`Immune-stimulating ingredients (${found.join(', ')}) may counteract the immunosuppressive effect of your corticosteroid. Consult your physician.`);
        }
    }

    // ── 17. Heart Rhythm / Cardiac Glycosides ───────────────────────────
    const cardiacMeds = ['digoxin', 'lanoxin', 'amiodarone', 'flecainide', 'sotalol', 'dofetilide', 'dronedarone'];
    const cardiacSupplements = ['magnesium', 'potassium', 'hawthorn', 'licorice', 'glycyrrhizin'];
    if (has(medsLower, cardiacMeds) && hasIngr(cardiacSupplements)) {
        const found = matchingIngr(cardiacSupplements);
        warnings.push(`Contains ${found.join(', ')} which can shift electrolyte balance and affect heart rhythm while on cardiac medications. Physician monitoring required.`);
    }

    // ── 18. CYP450 Enzyme Interactions (Narrow Therapeutic Index) ────────
    const narrowTIDrugs = ['warfarin', 'cyclosporine', 'tacrolimus', 'theophylline', 'phenytoin', 'digoxin', 'lithium', 'carbamazepine'];
    const cyp450Supplements = ["st. john", "st john", 'goldenseal', 'grapefruit'];
    if (has(medsLower, narrowTIDrugs) && hasIngr(cyp450Supplements)) {
        const found = matchingIngr(cyp450Supplements);
        warnings.push(`Contains CYP450 enzyme modulators (${found.join(', ')}) which can dramatically alter blood levels of your narrow-therapeutic-index medication. This is potentially dangerous — physician review required.`);
    }

    // ── 19. Kidney Impairment Considerations ────────────────────────────
    const kidneyKeywords = ['kidney', 'renal', 'dialysis', 'ckd', 'chronic kidney'];
    // Check both medications and conditions-as-medications (users sometimes list conditions)
    if (has(medsLower, kidneyKeywords)) {
        const kidneySupplements = ['potassium', 'magnesium', 'phosphorus', 'creatine', 'vitamin c'];
        if (hasIngr(kidneySupplements)) {
            const found = matchingIngr(kidneySupplements);
            warnings.push(`Contains ${found.join(', ')} which require dose adjustment or avoidance with kidney impairment. Consult your nephrologist before starting.`);
        }
    }

    return warnings;
}

export function normalizePromptHealthProfile(profile: any): string {
    if (!profile) return "No health profile provided.";
    return `
- Age: ${profile.age || 'Not specified'}
- Sex: ${profile.sex || 'Not specified'}
- Weight: ${profile.weightLbs ? profile.weightLbs + ' lbs' : 'Not specified'}
- Height: ${profile.heightCm ? profile.heightCm + ' cm' : 'Not specified'}
- Blood Pressure: ${profile.bloodPressureSystolic && profile.bloodPressureDiastolic ? profile.bloodPressureSystolic + '/' + profile.bloodPressureDiastolic : 'Not specified'}
- Resting Heart Rate: ${profile.restingHeartRate ? profile.restingHeartRate + ' bpm' : 'Not specified'}
- Sleep: ${profile.sleepHoursPerNight ? profile.sleepHoursPerNight + ' hours/night' : 'Not specified'}
- Exercise: ${profile.exerciseDaysPerWeek !== undefined ? profile.exerciseDaysPerWeek + ' days/week' : 'Not specified'}
- Stress Level: ${profile.stressLevel || 'Not specified'}
- Smoking: ${profile.smokingStatus || 'Not specified'}
- Alcohol: ${profile.alcoholDrinksPerWeek !== undefined ? profile.alcoholDrinksPerWeek + ' drinks/week' : 'Not specified'}
- Conditions: ${Array.isArray(profile.conditions) ? profile.conditions.join(', ') : (profile.conditions || 'None')}
- Medications: ${Array.isArray(profile.medications) ? profile.medications.join(', ') : (profile.medications || 'None')}
- Allergies: ${Array.isArray(profile.allergies) ? profile.allergies.join(', ') : (profile.allergies || 'None')}
`.trim();
}

export function normalizePromptFormula(formula: any): string {
    if (!formula) return "No existing formula.";
    const basesStr = (formula.bases || []).map((b: any) => `${b.ingredient}: ${b.amount}mg`).join('\n');
    const additionsStr = (formula.additions || []).map((a: any) => `${a.ingredient}: ${a.amount}mg`).join('\n');
    return `
Current Formula (v${formula.version || 0}):
BASES:
${basesStr || 'None'}

ADDITIONS:
${additionsStr || 'None'}

Total Dosage: ${formula.totalMg || 0}mg
`.trim();
}
