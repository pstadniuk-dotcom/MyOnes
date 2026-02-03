import { z } from "zod";
import {
    SYSTEM_SUPPORTS,
    INDIVIDUAL_INGREDIENTS,
    normalizeIngredientName
} from "@shared/ingredients";
import { FORMULA_LIMITS } from "../ai";

// Estimate Amazon cost for equivalent supplements
export function estimateAmazonCost(ingredientCount: number): number {
    const avgCostPerSupplement = 18;
    return ingredientCount * avgCostPerSupplement;
}

// Calculate max dosage based on capsule count
export function getMaxDosageForCapsules(targetCapsules: number): number {
    const validCount = FORMULA_LIMITS.VALID_CAPSULE_COUNTS.includes(targetCapsules as any)
        ? targetCapsules
        : FORMULA_LIMITS.DEFAULT_CAPSULE_COUNT;
    return validCount * FORMULA_LIMITS.CAPSULE_CAPACITY_MG;
}

// SINGLE SOURCE OF TRUTH: Build canonical doses from shared ingredient catalog
export const CANONICAL_DOSES_MG = Object.fromEntries(
    [...SYSTEM_SUPPORTS, ...INDIVIDUAL_INGREDIENTS].map(ing => [ing.name, ing.doseMg])
);

// Combined set of ALL approved ingredients (bases + individuals) for category-agnostic validation
export const ALL_APPROVED_INGREDIENTS = new Set([
    ...SYSTEM_SUPPORTS.map(f => f.name),
    ...INDIVIDUAL_INGREDIENTS.map(i => i.name)
]);

// Helper function to check if an ingredient is approved
export function isIngredientApproved(ingredientName: string, approvedSet: Set<string>): boolean {
    const normalized = normalizeIngredientName(ingredientName);
    if (approvedSet.has(normalized)) return true;

    const normalizedLower = normalized.toLowerCase();
    let foundMatch = false;
    approvedSet.forEach((approved) => {
        if (!foundMatch && approved.toLowerCase() === normalizedLower) {
            foundMatch = true;
        }
    });
    return foundMatch;
}

export function isAnyIngredientApproved(ingredientName: string): boolean {
    return isIngredientApproved(ingredientName, ALL_APPROVED_INGREDIENTS);
}

// Schema for formula extraction
export const FormulaExtractionSchema = z.object({
    bases: z.array(z.object({
        ingredient: z.string(),
        amount: z.number(),
        unit: z.string(),
        purpose: z.string()
    })),
    additions: z.array(z.object({
        ingredient: z.string(),
        amount: z.number(),
        unit: z.string(),
        purpose: z.string()
    })),
    totalMg: z.number().optional(),
    targetCapsules: z.number().optional(),
    warnings: z.array(z.string()),
    rationale: z.string(),
    disclaimers: z.array(z.string())
});

// Server-side formula validation and totalMg calculation
export function validateAndCalculateFormula(formula: any): { isValid: boolean, calculatedTotalMg: number, errors: string[] } {
    const errors: string[] = [];
    let calculatedTotal = 0;
    let ingredientCount = 0;

    if (!formula.bases || formula.bases.length === 0) {
        errors.push('Formula must include at least one system support');
    } else {
        for (const base of formula.bases) {
            ingredientCount++;
            if (!isAnyIngredientApproved(base.ingredient)) {
                errors.push(`UNAUTHORIZED INGREDIENT: "${base.ingredient}" is not in the approved catalog.`);
                continue;
            }
            const mgAmount = typeof base.amount === 'number' ? base.amount : 0;
            calculatedTotal += mgAmount;

            if (mgAmount < FORMULA_LIMITS.MIN_INGREDIENT_DOSE) {
                errors.push(`Ingredient "${base.ingredient}" below minimum dose of ${FORMULA_LIMITS.MIN_INGREDIENT_DOSE}mg`);
            }

            const catalogBase = SYSTEM_SUPPORTS.find(f => f.name === base.ingredient);
            if (catalogBase) {
                const baseDose = catalogBase.doseMg;
                const validDoses = [baseDose, baseDose * 2, baseDose * 3];
                if (!validDoses.includes(mgAmount)) {
                    errors.push(`system support "${base.ingredient}" must be dosed at 1x, 2x, or 3x.`);
                }
            }
        }
    }

    if (formula.additions) {
        for (const addition of formula.additions) {
            ingredientCount++;
            if (!isAnyIngredientApproved(addition.ingredient)) {
                errors.push(`UNAUTHORIZED INGREDIENT: "${addition.ingredient}" is not in the approved catalog.`);
                continue;
            }
            const mgAmount = typeof addition.amount === 'number' ? addition.amount : 0;
            calculatedTotal += mgAmount;

            if (mgAmount < FORMULA_LIMITS.MIN_INGREDIENT_DOSE) {
                errors.push(`Ingredient "${addition.ingredient}" below ${FORMULA_LIMITS.MIN_INGREDIENT_DOSE}mg`);
            }

            const individualIngredient = INDIVIDUAL_INGREDIENTS.find(i => i.name === addition.ingredient);
            if (individualIngredient) {
                if (individualIngredient.doseRangeMin && mgAmount < individualIngredient.doseRangeMin) {
                    errors.push(`"${addition.ingredient}" below allowed minimum of ${individualIngredient.doseRangeMin}mg`);
                }
                if (individualIngredient.doseRangeMax && mgAmount > individualIngredient.doseRangeMax) {
                    errors.push(`"${addition.ingredient}" exceeds allowed maximum of ${individualIngredient.doseRangeMax}mg`);
                }
            }
        }
    }

    if (ingredientCount > FORMULA_LIMITS.MAX_INGREDIENT_COUNT) {
        errors.push(`Formula exceeds maximum ingredient count of ${FORMULA_LIMITS.MAX_INGREDIENT_COUNT}`);
    }
    if (ingredientCount < FORMULA_LIMITS.MIN_INGREDIENT_COUNT) {
        errors.push(`Formula must contain at least ${FORMULA_LIMITS.MIN_INGREDIENT_COUNT} ingredients`);
    }

    const targetCapsules = formula.targetCapsules || FORMULA_LIMITS.DEFAULT_CAPSULE_COUNT;
    const maxDosageForCapsules = getMaxDosageForCapsules(targetCapsules);
    const maxWithTolerance = Math.floor(maxDosageForCapsules * (1 + FORMULA_LIMITS.BUDGET_TOLERANCE_PERCENT));
    if (calculatedTotal > maxWithTolerance) {
        errors.push(`Formula total too high: ${calculatedTotal}mg. Maximum ${maxDosageForCapsules}mg for ${targetCapsules}-capsule protocol.`);
    }

    return { isValid: errors.length === 0, calculatedTotalMg: calculatedTotal, errors };
}

// Validation function to enforce immutable limits
export function validateFormulaLimits(formula: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Determine capsule-based max dosage with 5% tolerance
    const targetCapsules = formula.targetCapsules || FORMULA_LIMITS.DEFAULT_CAPSULE_COUNT;
    const maxDosage = getMaxDosageForCapsules(targetCapsules);
    const maxWithTolerance = Math.floor(maxDosage * (1 + FORMULA_LIMITS.BUDGET_TOLERANCE_PERCENT));

    // Validate targetCapsules is a valid option
    if (formula.targetCapsules && !FORMULA_LIMITS.VALID_CAPSULE_COUNTS.includes(formula.targetCapsules)) {
        errors.push(`Invalid capsule count: ${formula.targetCapsules}. Must be one of: ${FORMULA_LIMITS.VALID_CAPSULE_COUNTS.join(', ')}`);
    }

    // Check total dosage limit based on capsule count (with 5% tolerance)
    if (formula.totalMg > maxWithTolerance) {
        errors.push(`Formula exceeds ${targetCapsules}-capsule budget of ${maxDosage}mg (max ${maxWithTolerance}mg with 5% tolerance). Attempted: ${formula.totalMg}mg. Reduce ingredients or increase capsule count.`);
    }

    // Validate all ingredients (bases + additions)
    const allIngredients = [...(formula.bases || []), ...(formula.additions || [])];

    for (const ingredient of allIngredients) {
        // Check minimum ingredient dose (global minimum)
        if (ingredient.amount < FORMULA_LIMITS.MIN_INGREDIENT_DOSE) {
            errors.push(`Ingredient "${ingredient.ingredient}" below minimum dose of ${FORMULA_LIMITS.MIN_INGREDIENT_DOSE}mg (attempted: ${ingredient.amount}mg)`);
        }

        // Validate dose ranges for individual ingredients
        const individualIngredient = INDIVIDUAL_INGREDIENTS.find(i => i.name === ingredient.ingredient);
        if (individualIngredient) {
            // Check if ingredient has dose range constraints (min/max)
            if (individualIngredient.doseRangeMin && ingredient.amount < individualIngredient.doseRangeMin) {
                errors.push(
                    `"${ingredient.ingredient}" below allowed minimum of ${individualIngredient.doseRangeMin}mg (attempted: ${ingredient.amount}mg). ` +
                    `Allowed range: ${individualIngredient.doseRangeMin}-${individualIngredient.doseRangeMax}mg`
                );
            }
            if (individualIngredient.doseRangeMax && ingredient.amount > individualIngredient.doseRangeMax) {
                errors.push(
                    `"${ingredient.ingredient}" exceeds allowed maximum of ${individualIngredient.doseRangeMax}mg (attempted: ${ingredient.amount}mg). ` +
                    `Allowed range: ${individualIngredient.doseRangeMin}-${individualIngredient.doseRangeMax}mg`
                );
            }
        }
    }

    // Check total ingredient count - maximum
    if (allIngredients.length > FORMULA_LIMITS.MAX_INGREDIENT_COUNT) {
        errors.push(`Formula exceeds maximum ingredient count of ${FORMULA_LIMITS.MAX_INGREDIENT_COUNT} (attempted: ${allIngredients.length})`);
    }

    // Check total ingredient count - minimum (must have at least 8 unique ingredients)
    if (allIngredients.length < FORMULA_LIMITS.MIN_INGREDIENT_COUNT) {
        errors.push(`Formula must contain at least ${FORMULA_LIMITS.MIN_INGREDIENT_COUNT} ingredients for comprehensive support (has: ${allIngredients.length})`);
    }

    // Verify all ingredients are approved
    for (const ingredient of allIngredients) {
        if (!isAnyIngredientApproved(ingredient.ingredient)) {
            errors.push(`Unapproved ingredient: "${ingredient.ingredient}"`);
        }
    }

    // Validate system supports use valid dose multiples (1x, 2x, or 3x)
    if (formula.bases && formula.bases.length > 0) {
        for (const base of formula.bases) {
            const catalogBase = SYSTEM_SUPPORTS.find(f => f.name === base.ingredient);
            if (catalogBase) {
                const baseDose = catalogBase.doseMg;
                const validDoses = [baseDose, baseDose * 2, baseDose * 3];

                if (!validDoses.includes(base.amount)) {
                    errors.push(
                        `system support "${base.ingredient}" must be dosed at 1x (${baseDose}mg), 2x (${baseDose * 2}mg), or 3x (${baseDose * 3}mg). ` +
                        `Attempted: ${base.amount}mg. ` +
                        `Use 1x for mild support, 2x for moderate issues, 3x for therapeutic intervention.`
                    );
                }
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

export function validateAndCorrectIngredientNames(formula: any): {
    success: boolean;
    correctedFormula: any;
    errors: string[];
    warnings: string[];
} {
    const errors: string[] = [];
    const warnings: string[] = [];
    const correctedFormula = JSON.parse(JSON.stringify(formula));

    for (let i = 0; i < correctedFormula.bases.length; i++) {
        const base = correctedFormula.bases[i];
        const originalName = base.ingredient;
        const normalizedName = normalizeIngredientName(originalName);
        const catalogBase = SYSTEM_SUPPORTS.find(f => f.name.toLowerCase() === normalizedName.toLowerCase());

        if (!catalogBase) {
            warnings.push(`Removed unapproved system support: "${originalName}"`);
            correctedFormula.bases.splice(i, 1);
            i--;
        } else if (originalName !== catalogBase.name) {
            warnings.push(`AUTO-CORRECTED: "${originalName}" → "${catalogBase.name}"`);
            correctedFormula.bases[i].ingredient = catalogBase.name;
        }
    }

    for (let i = 0; i < correctedFormula.additions.length; i++) {
        const addition = correctedFormula.additions[i];
        const originalName = addition.ingredient;
        const normalizedName = normalizeIngredientName(originalName);
        const catalogIngredient = INDIVIDUAL_INGREDIENTS.find(ing => ing.name.toLowerCase() === normalizedName.toLowerCase());

        if (!catalogIngredient) {
            warnings.push(`Removed unapproved ingredient: "${originalName}"`);
            correctedFormula.additions.splice(i, 1);
            i--;
        } else if (originalName !== catalogIngredient.name) {
            warnings.push(`AUTO-CORRECTED: "${originalName}" → "${catalogIngredient.name}"`);
            correctedFormula.additions[i].ingredient = catalogIngredient.name;
        }
    }

    return { success: errors.length === 0, correctedFormula, errors, warnings };
}

export function normalizePromptHealthProfile(profile: any): any {
    if (!profile) return undefined;
    const { conditions, medications, allergies, healthGoals, ...rest } = profile;
    return {
        ...rest,
        conditions: conditions ?? undefined,
        medications: medications ?? undefined,
        allergies: allergies ?? undefined,
        healthGoals: healthGoals ?? undefined,
    };
}

export function normalizePromptFormula(formula: any): any {
    if (!formula) return undefined;
    const { additions, userCustomizations, ...rest } = formula;
    return {
        ...rest,
        additions: additions ?? undefined,
        userCustomizations: userCustomizations ?? undefined,
    };
}
