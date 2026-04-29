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

        // Count-preservation guard: keep enough additions so the formula
        // still meets the minimum ingredient count for its capsule tier.
        // Otherwise autoExpand has to backfill with generic filler — losing
        // the clinically-chosen ingredients the AI selected for this user.
        const minIngredientCount = getMinIngredientCountForCapsules(targetCapsules);
        const baseCount = (formula.bases || []).length;
        const minAdditionsToKeep = Math.max(0, minIngredientCount - baseCount);
        const maxRemovable = Math.max(0, formula.additions.length - minAdditionsToKeep);

        for (const candidate of sortedByAmount) {
            if (overage <= 0) break;
            if (toRemove.size >= maxRemovable) break;
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

export function autoExpandFormula(formula: any, rejectedIngredients: string[] = []): { expanded: boolean; addedIngredients: string[] } {
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

    // Filler suggestions — minDose/normalDose are hints; actual values are clamped
    // against the catalog's authoritative doseRangeMin/doseRangeMax via
    // get*AllowedDoseForIngredient() below.
    const fillerIngredients = [
        { name: 'Garlic', minDose: 300, normalDose: 600, unit: 'mg', purpose: 'Supports cardiovascular health and healthy cholesterol levels through allicin and sulfur compounds.' },
        { name: 'Resveratrol', minDose: 75, normalDose: 200, unit: 'mg', purpose: 'Provides antioxidant support for endothelial function and healthy aging.' },
        { name: 'Ginkgo Biloba Extract 24%', minDose: 120, normalDose: 120, unit: 'mg', purpose: 'Supports circulation and cognitive function through improved blood flow.' },
        { name: 'Ginger Root', minDose: 250, normalDose: 500, unit: 'mg', purpose: 'Supports digestion, reduces inflammation, and aids metabolic function.' },
        { name: 'CoEnzyme Q10', minDose: 30, normalDose: 100, unit: 'mg', purpose: 'Supports mitochondrial energy production and cardiovascular health.' },
        { name: 'Hawthorn Berry', minDose: 160, normalDose: 300, unit: 'mg', purpose: 'Traditional cardiovascular support for heart muscle function and blood pressure.' },
        { name: 'Cinnamon 20:1', minDose: 30, normalDose: 100, unit: 'mg', purpose: 'Supports healthy blood sugar metabolism and insulin sensitivity.' },
        { name: 'Magnesium', minDose: 100, normalDose: 200, unit: 'mg', purpose: 'Essential mineral for muscle relaxation, energy production, and nervous system function.' },
    ].filter(f => !rejectedIngredients.some(r => r.toLowerCase().trim() === f.name.toLowerCase()));

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
        const rejectedLc = new Set(rejectedIngredients.map(r => r.toLowerCase().trim()));

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
            .filter((candidate) => !rejectedLc.has(candidate.ingredient.name.toLowerCase()))
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

/**
 * Defensive last-mile clamp. Brings every ingredient amount inside its
 * approved [min, max] range and recomputes totalMg. Existing callers
 * (validateAndCorrectIngredientNames, formula-expander) already clamp at
 * their boundaries, but this guards against any future code path that
 * mutates a formula without going through them. Returns an array of
 * human-readable adjustment notes for SSE/log surfacing.
 */
export function clampIngredientDosesToRange(formula: any): string[] {
    const notes: string[] = [];
    const all = [...(formula.bases || []), ...(formula.additions || [])];
    for (const ing of all) {
        if (!ing) continue;
        // Guard against NaN/Infinity/non-numeric amounts. AI sometimes returns
        // strings or string-numbers; reject anything that won't behave like a
        // safe number and force it to the ingredient's clinical minimum so
        // downstream validation has something defensible to work with.
        const rawAmount = ing.amount;
        const numericAmount = typeof rawAmount === 'number' ? rawAmount : Number(rawAmount);
        if (!Number.isFinite(numericAmount)) {
            const fallback = getMinAllowedDoseForIngredient(ing.ingredient);
            logger.warn('Non-finite ingredient amount detected during clamp', {
                ingredient: ing.ingredient,
                rawAmount,
                fallback,
            });
            ing.amount = fallback;
            notes.push(`Could not parse amount for ${ing.ingredient}; defaulted to ${fallback}mg.`);
            continue;
        }
        const minAllowed = getMinAllowedDoseForIngredient(ing.ingredient);
        const maxAllowed = getMaxAllowedDoseForIngredient(ing.ingredient);
        const clamped = Math.min(maxAllowed, Math.max(minAllowed, Math.round(numericAmount)));
        if (clamped !== numericAmount) {
            ing.amount = clamped;
            notes.push(`Adjusted ${ing.ingredient} from ${numericAmount}mg to ${clamped}mg (clinical range ${minAllowed}-${maxAllowed}mg).`);
        } else if (clamped !== rawAmount) {
            // Coerce string-number into actual number even when no clamp needed.
            ing.amount = clamped;
        }
    }
    if (notes.length > 0) {
        formula.totalMg = [...(formula.bases || []), ...(formula.additions || [])]
            .reduce((sum: number, i: any) => sum + (Number.isFinite(i.amount) ? i.amount : 0), 0);
    }
    return notes;
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
    if (!match) {
        logger.warn('parseDoseToMg could not parse dose string', { doseStr, ingredientName });
        return 0;
    }
    let val = parseFloat(match[1]);
    if (!Number.isFinite(val)) {
        logger.warn('parseDoseToMg parsed non-finite value', { doseStr, ingredientName, parsed: val });
        return 0;
    }
    const unit = (match[2] || 'mg').toLowerCase();
    if (unit === 'g') val *= 1000;
    if (unit === 'mcg') val /= 1000;
    const rounded = Math.round(val);
    return Number.isFinite(rounded) ? rounded : 0;
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
