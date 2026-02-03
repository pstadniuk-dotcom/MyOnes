
/**
 * Formula Interaction Utilities
 * 
 * Handles validation of supplement interactions, warnings, and safety checks.
 * Extracted from legacy routes.ts.
 */

// Enhanced medical validation with comprehensive interaction database
export async function validateSupplementInteractions(formula: any, medications: string[] = []): Promise<string[]> {
    const warnings: string[] = [];

    // Get all ingredients from formula
    const allIngredients = [
        ...(formula.bases?.map((b: any) => b.ingredient) || []),
        ...(formula.additions?.map((a: any) => a.ingredient) || [])
    ];

    // Check for general supplement warnings regardless of medications
    for (const ingredient of allIngredients) {
        const generalWarnings = getGeneralSupplementWarnings(ingredient);
        warnings.push(...generalWarnings);
    }

    // Check medication interactions if user has medications
    if (medications.length > 0) {
        for (const ingredient of allIngredients) {
            for (const medication of medications) {
                const interaction = await checkKnownInteractions(ingredient, medication);
                if (interaction) {
                    warnings.push(interaction);
                }
            }
        }
    }

    // Check for supplement-to-supplement interactions
    const supplementInteractions = checkSupplementToSupplementInteractions(allIngredients);
    warnings.push(...supplementInteractions);

    // Add mandatory safety disclaimer
    if (warnings.length > 0) {
        warnings.push('IMPORTANT: These are potential interactions. Always consult your healthcare provider before starting new supplements.');
    }

    return Array.from(new Set(warnings)); // Remove duplicates
}

// General supplement warnings for special populations and conditions
export function getGeneralSupplementWarnings(ingredient: string): string[] {
    const warnings: string[] = [];
    const ingredientLower = ingredient.toLowerCase();

    // High-risk supplements that require medical supervision
    const highRiskSupplements = {
        'iron': 'Iron supplements can be toxic in excess. Monitor iron levels and avoid if you have hemochromatosis.',
        'vitamin a': 'High-dose Vitamin A can be toxic. Avoid during pregnancy.',
        'vitamin k': 'Vitamin K affects blood clotting. Monitor if taking blood thinners.',
        '5-htp': '5-HTP affects serotonin levels. Can cause serotonin syndrome with antidepressants.',
        'same': 'SAMe affects neurotransmitters. Can interact with antidepressants and blood thinners.',
        'ginseng': 'Ginseng can affect blood pressure and blood sugar. Monitor if diabetic or hypertensive.',
        'ginkgo': 'Ginkgo increases bleeding risk. Avoid before surgery or with blood thinners.',
        'garlic': 'High-dose garlic increases bleeding risk. Avoid before surgery.',
        'ginger': 'High-dose ginger increases bleeding risk and can affect blood pressure.',
        'turmeric': 'Turmeric/Curcumin increases bleeding risk and can affect blood sugar.',
        'st. john\'s wort': 'St. John\'s Wort interacts with many medications including birth control, antidepressants, and blood thinners.',
        'kava': 'Kava can cause liver damage. Avoid if you have liver problems or take liver-affecting medications.',
        'yohimbe': 'Yohimbe can cause dangerous blood pressure changes and heart problems.',
        'ephedra': 'Ephedra (Ma Huang) can cause heart problems and is banned in many supplements.',
        'comfrey': 'Comfrey can cause liver damage and is not safe for internal use.'
    };

    for (const [supplement, warning] of Object.entries(highRiskSupplements)) {
        if (ingredientLower.includes(supplement)) {
            warnings.push(warning);
        }
    }

    return warnings;
}

// Check for supplement-to-supplement interactions
export function checkSupplementToSupplementInteractions(ingredients: string[]): string[] {
    const warnings: string[] = [];
    const ingredientLower = ingredients.map(i => i.toLowerCase());

    // Common supplement interactions
    const interactions = [
        {
            supplements: ['iron', 'calcium'],
            warning: 'Iron and Calcium compete for absorption. Take Iron and Calcium supplements 2+ hours apart.'
        },
        {
            supplements: ['zinc', 'copper'],
            warning: 'High-dose Zinc can deplete Copper. Maintain 10:1 Zinc:Copper ratio.'
        },
        {
            supplements: ['vitamin c', 'iron'],
            warning: 'Vitamin C enhances Iron absorption - monitor for iron overload if taking both.'
        },
        {
            supplements: ['magnesium', 'calcium'],
            warning: 'High-dose Calcium can interfere with Magnesium absorption. Balance is important.'
        },
        {
            supplements: ['5-htp', 'same'],
            warning: 'Both 5-HTP and SAMe affect serotonin/neurotransmitters. Avoid combining without medical supervision.'
        }
    ];

    for (const interaction of interactions) {
        const foundSupplements = interaction.supplements.filter(supplement =>
            ingredientLower.some(ingredient => ingredient.includes(supplement))
        );

        if (foundSupplements.length >= 2) {
            warnings.push(interaction.warning);
        }
    }

    return warnings;
}

// Comprehensive known interactions database (significantly expanded)
export async function checkKnownInteractions(supplement: string, medication: string): Promise<string | null> {
    const interactions: Record<string, Record<string, string>> = {
        // Blood thinners and coagulation
        'Vitamin K': {
            'warfarin': 'Vitamin K can interfere with warfarin effectiveness. Monitor INR closely.',
            'coumadin': 'Vitamin K can interfere with coumadin effectiveness. Monitor INR closely.',
            'heparin': 'Vitamin K can affect clotting times with heparin.',
            'aspirin': 'Monitor bleeding risk when combining Vitamin K with aspirin.'
        },
        'Garlic': {
            'warfarin': 'Garlic may increase bleeding risk with warfarin.',
            'aspirin': 'Garlic + aspirin increases bleeding risk.',
            'clopidogrel': 'Garlic may increase bleeding risk with clopidogrel.'
        },
        'Ginkgo': {
            'warfarin': 'Ginkgo significantly increases bleeding risk with warfarin.',
            'aspirin': 'Ginkgo + aspirin increases bleeding risk.',
            'ibuprofen': 'Ginkgo + NSAIDs increases bleeding risk.'
        },

        // Mood and psychiatric medications
        'St. John\'s Wort': {
            'ssri': 'St. John\'s Wort may cause serotonin syndrome with SSRIs.',
            'antidepressants': 'St. John\'s Wort may interact with antidepressants causing serotonin syndrome.',
            'birth control': 'St. John\'s Wort can reduce birth control effectiveness.',
            'digoxin': 'St. John\'s Wort can reduce digoxin levels.',
            'cyclosporine': 'St. John\'s Wort can reduce cyclosporine levels.',
            'simvastatin': 'St. John\'s Wort can reduce statin effectiveness.'
        },
        '5-HTP': {
            'ssri': '5-HTP with SSRIs may cause serotonin syndrome.',
            'antidepressants': '5-HTP with antidepressants may cause serotonin syndrome.',
            'maoi': '5-HTP with MAOIs can be dangerous.',
            'tramadol': '5-HTP with tramadol increases serotonin syndrome risk.'
        },
        'SAMe': {
            'antidepressants': 'SAMe can interact with antidepressants.',
            'maoi': 'SAMe with MAOIs can cause dangerous interactions.'
        },

        // Cardiovascular medications
        'Ginseng': {
            'blood pressure': 'Ginseng may interact with blood pressure medications.',
            'ace inhibitor': 'Ginseng may affect ACE inhibitor effectiveness.',
            'beta blocker': 'Ginseng may interact with beta blockers.',
            'calcium channel blocker': 'Ginseng may affect calcium channel blockers.',
            'digoxin': 'Ginseng may increase digoxin levels.',
            'warfarin': 'Ginseng may affect warfarin metabolism.'
        },
        'Hawthorn': {
            'digoxin': 'Hawthorn may increase digoxin effects.',
            'beta blocker': 'Hawthorn may enhance beta blocker effects.',
            'calcium channel blocker': 'Hawthorn may enhance calcium channel blocker effects.'
        },

        // Diabetes medications
        'Chromium': {
            'insulin': 'Chromium may enhance insulin effects - monitor blood sugar.',
            'metformin': 'Chromium may enhance metformin effects.',
            'diabetes': 'Chromium may affect blood sugar levels with diabetes medications.'
        },
        'Cinnamon': {
            'diabetes': 'Cinnamon may enhance diabetes medication effects - monitor blood sugar.',
            'insulin': 'Cinnamon may enhance insulin effects.'
        },

        // Thyroid medications  
        'Iron': {
            'thyroid': 'Iron can interfere with thyroid medication absorption. Take 4+ hours apart.',
            'levothyroxine': 'Iron reduces levothyroxine absorption. Take 4+ hours apart.',
            'calcium': 'Iron and calcium compete for absorption. Take separately.'
        },
        'Calcium': {
            'thyroid': 'Calcium can interfere with thyroid medication absorption.',
            'levothyroxine': 'Calcium reduces levothyroxine absorption. Take 4+ hours apart.',
            'antibiotics': 'Calcium can reduce antibiotic absorption.'
        },

        // Seizure medications
        'Folate': {
            'phenytoin': 'Folate may reduce phenytoin levels.',
            'carbamazepine': 'Folate may interact with carbamazepine.',
            'valproic acid': 'Folate may interact with valproic acid.'
        },

        // Immunosuppressants
        'Echinacea': {
            'immunosuppressant': 'Echinacea may counteract immunosuppressive medications.',
            'cyclosporine': 'Echinacea may reduce cyclosporine effectiveness.',
            'tacrolimus': 'Echinacea may interact with tacrolimus.'
        },

        // Antibiotics
        'Zinc': {
            'antibiotic': 'Zinc can reduce antibiotic absorption. Take 2+ hours apart.',
            'quinolone': 'Zinc significantly reduces quinolone antibiotic absorption.'
        },

        // Sleep medications
        'Melatonin': {
            'sedative': 'Melatonin may enhance sedative effects.',
            'sleeping pill': 'Melatonin may enhance sleeping medication effects.',
            'benzodiazepine': 'Melatonin may enhance benzodiazepine effects.'
        },
        'Valerian': {
            'sedative': 'Valerian may enhance sedative effects.',
            'sleeping pill': 'Valerian may enhance sleeping medication effects.'
        }
    };

    // Check if supplement is in our database
    const supplementLower = supplement.toLowerCase();
    const medicationLower = medication.toLowerCase();

    for (const [suppKey, medInteractions] of Object.entries(interactions)) {
        if (supplementLower.includes(suppKey.toLowerCase())) {
            for (const [medKey, warning] of Object.entries(medInteractions)) {
                if (medicationLower.includes(medKey.toLowerCase()) ||
                    medKey.toLowerCase().includes(medicationLower)) {
                    return `INTERACTION: ${warning}`;
                }
            }
        }
    }

    return null;
}
