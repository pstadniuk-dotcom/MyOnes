import { SYSTEM_SUPPORTS, INDIVIDUAL_INGREDIENTS, normalizeIngredientName } from "@shared/ingredients";
import { z } from "zod";

// SECURITY: Immutable formula limits - CANNOT be changed by user requests or AI prompts
export const FORMULA_LIMITS = {
    CAPSULE_CAPACITY_MG: 550,      // Each capsule holds 550mg
    VALID_CAPSULE_COUNTS: [6, 9, 12] as const, // Allowed capsule counts (6, 9, or 12 - no 15)
    DEFAULT_CAPSULE_COUNT: 9,      // Default if not specified
    DOSAGE_TOLERANCE: 50,          // Allow 50mg tolerance for rounding differences
    BUDGET_TOLERANCE_PERCENT: 0.05, // Allow 5% over capsule budget
    MIN_INGREDIENT_DOSE: 10,       // Global minimum dose per ingredient in mg
    MIN_INGREDIENT_COUNT: 8,       // Minimum 8 ingredients for comprehensive formulas
    MAX_INGREDIENT_COUNT: 50,      // Maximum number of ingredients
} as const;

// Formula extraction schema for AI response parsing
export const FormulaExtractionSchema = z.object({
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

export function autoExpandFormula(formula: any): { expanded: boolean; addedIngredients: string[] } {
    const allIngredients = [...(formula.bases || []), ...(formula.additions || [])];
    const currentCount = allIngredients.length;
    const neededCount = FORMULA_LIMITS.MIN_INGREDIENT_COUNT - currentCount;

    if (neededCount <= 0) {
        return { expanded: false, addedIngredients: [] };
    }

    const targetCapsules = formula.targetCapsules || FORMULA_LIMITS.DEFAULT_CAPSULE_COUNT;
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
        { name: 'Milk Thistle', minDose: 100, normalDose: 150, unit: 'mg', purpose: 'Supports liver health and detoxification pathways.' },
        { name: 'Ginger Root', minDose: 75, normalDose: 150, unit: 'mg', purpose: 'Supports digestion, reduces inflammation, and aids metabolic function.' },
        { name: 'Vitamin C', minDose: 100, normalDose: 200, unit: 'mg', purpose: 'Essential antioxidant supporting immune function and collagen synthesis.' },
        { name: 'CoEnzyme Q10', minDose: 200, normalDose: 200, unit: 'mg', purpose: 'Supports mitochondrial energy production and cardiovascular health.' },
        { name: 'Hawthorn Berry', minDose: 100, normalDose: 200, unit: 'mg', purpose: 'Traditional cardiovascular support for heart muscle function and blood pressure.' },
        { name: 'Cinnamon 20:1', minDose: 25, normalDose: 100, unit: 'mg', purpose: 'Supports healthy blood sugar metabolism and insulin sensitivity.' },
        { name: 'Magnesium', minDose: 100, normalDose: 200, unit: 'mg', purpose: 'Essential mineral for muscle relaxation, energy production, and nervous system function.' },
    ];

    const existingNames = new Set(allIngredients.map(i => i.ingredient.toLowerCase()));
    const addedIngredients: string[] = [];
    let runningBudget = remainingBudget;

    for (const filler of fillerIngredients) {
        if (addedIngredients.length >= neededCount) break;
        if (runningBudget < filler.normalDose) continue;
        if (existingNames.has(filler.name.toLowerCase())) continue;

        if (!formula.additions) formula.additions = [];
        formula.additions.push({
            ingredient: filler.name,
            amount: filler.normalDose,
            unit: filler.unit,
            purpose: filler.purpose
        });

        addedIngredients.push(`${filler.name} ${filler.normalDose}mg`);
        runningBudget -= filler.normalDose;
        existingNames.add(filler.name.toLowerCase());
    }

    if (addedIngredients.length < neededCount) {
        for (const filler of fillerIngredients) {
            if (addedIngredients.length >= neededCount) break;
            if (runningBudget < filler.minDose) continue;
            if (existingNames.has(filler.name.toLowerCase())) continue;

            if (!formula.additions) formula.additions = [];
            formula.additions.push({
                ingredient: filler.name,
                amount: filler.minDose,
                unit: filler.unit,
                purpose: filler.purpose
            });

            addedIngredients.push(`${filler.name} ${filler.minDose}mg`);
            runningBudget -= filler.minDose;
            existingNames.add(filler.name.toLowerCase());
        }
    }

    let finalTotal = [...(formula.bases || []), ...(formula.additions || [])]
        .reduce((sum, ing) => sum + (ing.amount || 0), 0);

    const minTarget = maxDosage;
    if (finalTotal < minTarget) {
        const headroom = maxWithTolerance - finalTotal;
        const sortedAdditions = [...(formula.additions || [])].sort((a: any, b: any) => (b.amount || 0) - (a.amount || 0));

        let usedHeadroom = 0;
        for (const addition of sortedAdditions) {
            if (usedHeadroom >= headroom) break;
            const catalogItem = INDIVIDUAL_INGREDIENTS.find(i => i.name === addition.ingredient);
            if (!catalogItem?.doseRangeMax) continue;
            const currentAmount = addition.amount || 0;
            const canIncrease = catalogItem.doseRangeMax - currentAmount;
            if (canIncrease > 0) {
                const increase = Math.min(canIncrease, headroom - usedHeadroom);
                addition.amount = currentAmount + increase;
                usedHeadroom += increase;
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
    const maxWithTolerance = Math.floor(maxDosage * (1 + FORMULA_LIMITS.BUDGET_TOLERANCE_PERCENT));

    if (formula.targetCapsules && !FORMULA_LIMITS.VALID_CAPSULE_COUNTS.includes(formula.targetCapsules)) {
        errors.push(`Invalid capsule count: ${formula.targetCapsules}. Must be one of: ${FORMULA_LIMITS.VALID_CAPSULE_COUNTS.join(', ')}`);
    }

    if (formula.totalMg > maxWithTolerance) {
        errors.push(`Formula exceeds ${targetCapsules}-capsule budget of ${maxDosage}mg (max ${maxWithTolerance}mg with 5% tolerance). Attempted: ${formula.totalMg}mg. Reduce ingredients or increase capsule count.`);
    }

    const allIngredients = [...(formula.bases || []), ...(formula.additions || [])];

    for (const ingredient of allIngredients) {
        if (ingredient.amount < FORMULA_LIMITS.MIN_INGREDIENT_DOSE) {
            errors.push(`Ingredient "${ingredient.ingredient}" below minimum dose of ${FORMULA_LIMITS.MIN_INGREDIENT_DOSE}mg (attempted: ${ingredient.amount}mg)`);
        }
        const individualIngredient = INDIVIDUAL_INGREDIENTS.find(i => i.name === ingredient.ingredient);
        if (individualIngredient) {
            if (individualIngredient.doseRangeMin && ingredient.amount < individualIngredient.doseRangeMin) {
                errors.push(`"${ingredient.ingredient}" below allowed minimum of ${individualIngredient.doseRangeMin}mg`);
            }
            if (individualIngredient.doseRangeMax && ingredient.amount > individualIngredient.doseRangeMax) {
                errors.push(`"${ingredient.ingredient}" exceeds allowed maximum of ${individualIngredient.doseRangeMax}mg`);
            }
        }
    }

    if (allIngredients.length > FORMULA_LIMITS.MAX_INGREDIENT_COUNT) {
        errors.push(`Formula exceeds maximum ingredient count of ${FORMULA_LIMITS.MAX_INGREDIENT_COUNT}`);
    }

    const approvedNames = new Set([
        ...SYSTEM_SUPPORTS.map(f => f.name),
        ...INDIVIDUAL_INGREDIENTS.map(i => i.name)
    ]);

    for (const ingredient of allIngredients) {
        if (!approvedNames.has(ingredient.ingredient)) {
            errors.push(`Unapproved ingredient: "${ingredient.ingredient}"`);
        }
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
    const warnings: string[] = [];
    const errors: string[] = [];

    const correctNames = (list: any[]) => {
        return list.map(item => {
            const rawName = item.ingredient || item.name;
            const normalized = normalizeIngredientName(rawName);

            const found = SYSTEM_SUPPORTS.find(s => normalizeIngredientName(s.name) === normalized) ||
                INDIVIDUAL_INGREDIENTS.find(i => normalizeIngredientName(i.name) === normalized);

            if (found) {
                if (found.name !== rawName) {
                    warnings.push(`Corrected "${rawName}" to "${found.name}"`);
                }
                return { ...item, ingredient: found.name };
            } else {
                errors.push(`Unrecognized ingredient: "${rawName}"`);
                return item;
            }
        });
    };

    correctedFormula.bases = correctNames(formula.bases || []);
    correctedFormula.additions = correctNames(formula.additions || []);

    return {
        success: errors.length === 0,
        correctedFormula,
        warnings,
        errors
    };
}

export async function validateSupplementInteractions(formula: any, userMedications: string[]): Promise<string[]> {
    const warnings: string[] = [];
    if (!userMedications || userMedications.length === 0) return [];

    // Basic rule-based interaction check
    const allIngredients = [...(formula.bases || []), ...(formula.additions || [])].map(i => i.ingredient.toLowerCase());
    const medsLower = userMedications.map(m => m.toLowerCase());

    const bloodThinners = ['warfarin', 'coumadin', 'clopidogrel', 'plavix', 'aspirin', 'rivaroxaban', 'xarelto', 'apixaban', 'eliquis'];
    if (medsLower.some(m => bloodThinners.some(bt => m.includes(bt)))) {
        if (allIngredients.some(i => i.includes('garlic') || i.includes('ginger') || i.includes('ginkgo') || i.includes('omega') || i.includes('vitamin e'))) {
            warnings.push('Contains ingredients (Garlic/Ginger/Ginkgo/Omega-3/Vit E) that may increase bleeding risk with your blood thinner.');
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
