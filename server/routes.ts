import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import OpenAI from "openai";
import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";
import type { InsertMessage, InsertChatSession } from "@shared/schema";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { SignupData, LoginData, AuthResponse } from "@shared/schema";
import { signupSchema, loginSchema } from "@shared/schema";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// JWT Configuration
let JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET environment variable is required for security in production');
    process.exit(1);
  } else {
    // Development fallback - use a generated secret
    JWT_SECRET = 'dev-jwt-secret-' + Date.now() + '-' + Math.random().toString(36);
    console.warn('WARNING: Using generated JWT_SECRET for development. Set JWT_SECRET environment variable for production.');
  }
}
const JWT_EXPIRES_IN = '7d'; // 7 days

// JWT Utilities
function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded;
  } catch (error) {
    return null;
  }
}

// Auth middleware for protected routes
function requireAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.userId = decoded.userId;
  next();
}

// Canonical dose mapping for all supplement bases and additions
const CANONICAL_DOSES_MG = {
  // Formula Bases (standardized mg amounts)
  'ADRENAL SUPPORT': 450,
  'ALLERGY DEFENSE': 450,
  'ANTIOXIDANT': 400,
  'BETAMAX CAMO': 300,
  'BRAIN HEALTH': 500,
  'CARDIOVASCULAR': 450,
  'COGNITIVE': 400,
  'DETOX': 500,
  'ENDURANCE': 450,
  'ENERGY': 400,
  'ENZYME DIGESTIVE': 350,
  'ESTROGEN METABOLISM': 400,
  'EYE HEALTH': 350,
  'FEMALE FERTILITY': 450,
  'GI PRO': 400,
  'GLUCOSE': 400,
  'GLUTATHIONE': 350,
  'HISTAMINE': 400,
  'HPA AXIS': 450,
  'IMMUNE': 500,
  'INFLAMMATION': 500,
  'JOINT HEALTH': 600,
  'KIDNEY': 400,
  'LIVER': 450,
  'LUNG': 400,
  'MALE FERTILITY': 450,
  'MENOPAUSE': 400,
  'METHYLATION': 350,
  'MITOCHONDRIA': 400,
  'MOOD': 450,
  'MULTI VITAMIN': 600,
  'MUSCLE HEALTH': 500,
  'NEUROTRANSMITTER': 400,
  'PARASITE': 450,
  'SKIN HEALTH': 400,
  'SLEEP': 400,
  'TESTOSTERONE': 500,
  'THYROID': 350,
  'VASCULAR': 400,
  
  // Common individual supplement additions (typical therapeutic doses)
  'Vitamin D3': 1,      // 1000 IU = ~1mg
  'Vitamin C': 250,     // 250mg
  'Magnesium': 200,     // 200mg
  'Zinc': 15,           // 15mg
  'Iron': 18,           // 18mg
  'Calcium': 200,       // 200mg
  'Omega-3': 300,       // 300mg
  'Probiotics': 50,     // 50mg (10 billion CFU)
  'CoQ10': 100,         // 100mg
  'Curcumin': 250,      // 250mg
  'Ashwagandha': 300,   // 300mg
  'Rhodiola': 150,      // 150mg
  'Melatonin': 3,       // 3mg
  'Quercetin': 250,     // 250mg
  'NAC': 200,           // 200mg
  'Alpha Lipoic Acid': 100, // 100mg
  'L-Theanine': 100,    // 100mg
  'B-Complex': 50,      // 50mg
  'Biotin': 1,          // 1mg (1000mcg)
  'Folate': 1,          // 1mg (400mcg)
  'B12': 1,             // 1mg (1000mcg)
  'K2': 1,              // 100mcg = ~1mg
};

// Dose parsing utility that converts string doses to numeric mg
function parseDoseToMg(doseString: string, ingredientName: string): number {
  // Handle canonical mapping first
  const canonicalName = Object.keys(CANONICAL_DOSES_MG).find(key => 
    key.toLowerCase() === ingredientName.toLowerCase() ||
    ingredientName.toLowerCase().includes(key.toLowerCase())
  );
  
  if (canonicalName) {
    return CANONICAL_DOSES_MG[canonicalName as keyof typeof CANONICAL_DOSES_MG];
  }
  
  // Parse various dose formats
  const dose = doseString.toLowerCase().replace(/[^0-9.,]/g, '');
  const numericDose = parseFloat(dose);
  
  if (isNaN(numericDose)) {
    console.warn(`Could not parse dose: ${doseString} for ingredient: ${ingredientName}`);
    return 0;
  }
  
  // Convert units to mg
  if (doseString.toLowerCase().includes('g') && !doseString.toLowerCase().includes('mg')) {
    return numericDose * 1000; // grams to mg
  } else if (doseString.toLowerCase().includes('mcg') || doseString.toLowerCase().includes('μg')) {
    return numericDose / 1000; // mcg to mg  
  } else if (doseString.toLowerCase().includes('iu')) {
    // IU conversion (approximate for common vitamins)
    if (ingredientName.toLowerCase().includes('vitamin d')) {
      return numericDose / 1000; // 1000 IU Vitamin D ≈ 1mg
    } else if (ingredientName.toLowerCase().includes('vitamin e')) {
      return numericDose / 15; // 15 IU Vitamin E ≈ 1mg
    }
    return numericDose / 100; // default IU conversion
  }
  
  // Default assumption is mg
  return numericDose;
}

// Server-side formula validation and totalMg calculation
function validateAndCalculateFormula(formula: any): { isValid: boolean, calculatedTotalMg: number, errors: string[] } {
  const errors: string[] = [];
  let calculatedTotal = 0;
  
  // Validate bases
  if (!formula.bases || formula.bases.length === 0) {
    errors.push('Formula must include at least one base formula');
  } else {
    for (const base of formula.bases) {
      const mgAmount = parseDoseToMg(base.dose, base.name);
      if (mgAmount === 0) {
        errors.push(`Cannot determine mg amount for base: ${base.name} with dose: ${base.dose}`);
      }
      calculatedTotal += mgAmount;
    }
  }
  
  // Validate additions
  if (formula.additions) {
    for (const addition of formula.additions) {
      const mgAmount = parseDoseToMg(addition.dose, addition.name);
      if (mgAmount === 0) {
        errors.push(`Cannot determine mg amount for addition: ${addition.name} with dose: ${addition.dose}`);
      }
      calculatedTotal += mgAmount;
    }
  }
  
  // Enforce 800mg hard limit
  const isValid = calculatedTotal <= 800 && errors.length === 0;
  
  if (calculatedTotal > 800) {
    errors.push(`Formula exceeds 800mg safety limit. Calculated total: ${calculatedTotal}mg. Formula REJECTED.`);
  }
  
  return { isValid, calculatedTotalMg: calculatedTotal, errors };
}

// Enhanced medical validation with comprehensive interaction database
async function validateSupplementInteractions(formula: any, medications: string[] = []): Promise<string[]> {
  const warnings: string[] = [];
  
  // Get all ingredients from formula
  const allIngredients = [
    ...formula.bases.map((b: any) => b.name),
    ...formula.additions.map((a: any) => a.name)
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
    warnings.push('⚠️ IMPORTANT: These are potential interactions. Always consult your healthcare provider before starting new supplements.');
  }
  
  return Array.from(new Set(warnings)); // Remove duplicates
}

// General supplement warnings for special populations and conditions
function getGeneralSupplementWarnings(ingredient: string): string[] {
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
function checkSupplementToSupplementInteractions(ingredients: string[]): string[] {
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
async function checkKnownInteractions(supplement: string, medication: string): Promise<string | null> {
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
          return `⚠️ INTERACTION: ${warning}`;
        }
      }
    }
  }
  
  return null;
}

// Schema for formula extraction
const FormulaExtractionSchema = z.object({
  bases: z.array(z.object({
    name: z.string(),
    dose: z.string(),
    purpose: z.string()
  })),
  additions: z.array(z.object({
    name: z.string(),
    dose: z.string(),
    purpose: z.string()
  })),
  totalMg: z.number(),
  warnings: z.array(z.string()),
  rationale: z.string(),
  disclaimers: z.array(z.string())
});

// Complete ONES AI system prompt
const ONES_AI_SYSTEM_PROMPT = `You are ONES AI, an expert supplement formulation assistant. You create personalized supplement formulas using Alive Innovations' ingredient catalog.

CRITICAL RULES:
1. Every formula MUST start with at least one Formula Base (pre-made blends)
2. Individual ingredients are added ON TOP of bases
3. Total capsule weight cannot exceed 800mg
4. Some ingredients are TOO SMALL to use alone and MUST be in formula bases
5. Always check drug interactions and contraindications
6. Consider the user's age, gender, medications, and health conditions

=== AVAILABLE FORMULA BASES ===

1. ADRENAL SUPPORT
- Purpose: Stress management, fatigue, adrenal health
- Key ingredients: Rhodiola, Ashwagandha, Holy Basil, Pantothenic Acid, Vitamin C, B-vitamins
- Base dose: 400-500mg
- Best for: Chronic stress, burnout, afternoon fatigue, cortisol regulation

2. ALLERGY DEFENSE
- Purpose: Allergic response, histamine regulation
- Key ingredients: Quercetin, Bromelain, Stinging Nettle, NAC, Vitamin C
- Base dose: 450mg
- Best for: Seasonal allergies, food sensitivities, histamine intolerance

3. ANTIOXIDANT
- Purpose: Cell protection, anti-aging, oxidative stress
- Key ingredients: Resveratrol, Alpha Lipoic Acid, CoQ10, Vitamin E, Selenium
- Base dose: 400mg
- Best for: Anti-aging, general health, oxidative stress

4. BETAMAX CAMO
- Purpose: Immune support, specialized protection
- Key ingredients: Proprietary immune blend with camostat
- Base dose: 300mg
- Best for: Immune system support, viral defense

5. BRAIN HEALTH
- Purpose: Cognitive function, memory, focus
- Key ingredients: Lion's Mane, Bacopa, Ginkgo, Phosphatidylserine, DHA
- Base dose: 500mg
- Best for: Brain fog, memory issues, cognitive decline prevention

6. CARDIOVASCULAR
- Purpose: Heart health, circulation
- Key ingredients: Hawthorn, CoQ10, Magnesium, B-vitamins, Garlic extract
- Base dose: 450mg
- Best for: Heart health, blood pressure support, circulation

7. COGNITIVE
- Purpose: Mental clarity, focus, concentration
- Key ingredients: L-Theanine, Caffeine, Alpha GPC, Rhodiola, B-vitamins
- Base dose: 400mg
- Best for: Focus, studying, mental performance

8. DETOX
- Purpose: Liver support, detoxification
- Key ingredients: Milk Thistle, NAC, Alpha Lipoic Acid, Dandelion, Artichoke
- Base dose: 500mg
- Best for: Liver health, detox support, alcohol recovery

9. ENDURANCE
- Purpose: Athletic performance, stamina
- Key ingredients: Cordyceps, Rhodiola, CoQ10, B-vitamins, Electrolytes
- Base dose: 450mg
- Best for: Athletes, endurance, energy production

10. ENERGY
- Purpose: Natural energy boost, fatigue fighting
- Key ingredients: B-complex, Green Tea Extract, Ginseng, CoQ10, Iron
- Base dose: 400mg
- Best for: Daily energy, chronic fatigue, afternoon slump

11. ENZYME DIGESTIVE
- Purpose: Digestive support, nutrient absorption
- Key ingredients: Protease, Lipase, Amylase, Bromelain, Papain
- Base dose: 350mg
- Best for: Digestive issues, bloating, nutrient absorption

12. ESTROGEN METABOLISM
- Purpose: Hormone balance, estrogen detox
- Key ingredients: DIM, Calcium D-Glucarate, Broccoli extract, B-vitamins
- Base dose: 400mg
- Best for: Hormonal balance, PMS, estrogen dominance

13. EYE HEALTH
- Purpose: Vision support, eye protection
- Key ingredients: Lutein, Zeaxanthin, Bilberry, Vitamin A, Zinc
- Base dose: 350mg
- Best for: Eye strain, macular health, night vision

14. FEMALE FERTILITY
- Purpose: Reproductive health, conception support
- Key ingredients: Folate, Inositol, CoQ10, Vitamin D, NAC
- Base dose: 450mg
- Best for: Trying to conceive, egg quality, PCOS

15. GI PRO (PLANT-BASED PROBIOTIC)
- Purpose: Gut health, microbiome balance
- Key ingredients: Plant-based probiotics, Prebiotics, Digestive herbs
- Base dose: 400mg
- Best for: Gut health, IBS, microbiome support

16. GLUCOSE
- Purpose: Blood sugar regulation
- Key ingredients: Chromium, Cinnamon, Alpha Lipoic Acid, Bitter Melon
- Base dose: 400mg
- Best for: Blood sugar balance, insulin sensitivity, pre-diabetes

17. GLUTATHIONE
- Purpose: Master antioxidant, detoxification
- Key ingredients: Reduced Glutathione, NAC, Selenium, Milk Thistle
- Base dose: 350mg
- Best for: Detox, immune support, anti-aging

18. HISTAMINE
- Purpose: Histamine intolerance support
- Key ingredients: DAO enzymes, Quercetin, Vitamin C, SAMe
- Base dose: 400mg
- Best for: Histamine intolerance, food reactions, allergies

19. HPA AXIS (Hypothalamic-Pituitary-Adrenal)
- Purpose: Stress response regulation
- Key ingredients: Ashwagandha, Phosphatidylserine, Magnesium, L-Theanine
- Base dose: 450mg
- Best for: Chronic stress, anxiety, cortisol dysregulation

20. IMMUNE
- Purpose: Immune system support
- Key ingredients: Vitamin C, Zinc, Elderberry, Mushroom blend, Echinacea
- Base dose: 500mg
- Best for: Immune support, frequent illness, prevention

21. INFLAMMATION
- Purpose: Anti-inflammatory support
- Key ingredients: Curcumin, Boswellia, Ginger, Omega-3, Proteolytic enzymes
- Base dose: 500mg
- Best for: Chronic inflammation, joint pain, autoimmune support

22. JOINT HEALTH
- Purpose: Joint support and mobility
- Key ingredients: Glucosamine, Chondroitin, MSM, Collagen, Boswellia
- Base dose: 600mg
- Best for: Joint pain, arthritis, mobility issues

23. KIDNEY
- Purpose: Kidney health and function
- Key ingredients: Cranberry, Dandelion, Nettle, B6, Magnesium
- Base dose: 400mg
- Best for: Kidney support, UTI prevention, fluid balance

24. LIVER
- Purpose: Liver health and detoxification
- Key ingredients: Milk Thistle, NAC, Artichoke, Turmeric, B-vitamins
- Base dose: 450mg
- Best for: Liver health, detox, fatty liver

25. LUNG
- Purpose: Respiratory health
- Key ingredients: NAC, Mullein, Cordyceps, Vitamin C, Quercetin
- Base dose: 400mg
- Best for: Lung health, asthma, respiratory support

26. MALE FERTILITY
- Purpose: Male reproductive health
- Key ingredients: Zinc, Selenium, CoQ10, L-Carnitine, Vitamin E
- Base dose: 450mg
- Best for: Sperm health, male fertility, testosterone support

27. MENOPAUSE
- Purpose: Menopausal symptom relief
- Key ingredients: Black Cohosh, Dong Quai, Red Clover, Vitamin E, B6
- Base dose: 400mg
- Best for: Hot flashes, mood swings, menopausal symptoms

28. METHYLATION
- Purpose: Genetic methylation support
- Key ingredients: Methylfolate, Methylcobalamin, TMG, SAMe, B6
- Base dose: 350mg
- Best for: MTHFR mutations, methylation issues, homocysteine

29. MITOCHONDRIA
- Purpose: Cellular energy production
- Key ingredients: CoQ10, PQQ, NAD+, Alpha Lipoic Acid, Acetyl-L-Carnitine
- Base dose: 400mg
- Best for: Chronic fatigue, aging, cellular health

30. MOOD
- Purpose: Emotional balance, mood support
- Key ingredients: 5-HTP, L-Theanine, B-vitamins, Magnesium, Saffron
- Base dose: 450mg
- Best for: Depression, anxiety, mood swings

31. MULTI VITAMIN
- Purpose: General nutritional support
- Key ingredients: Complete vitamin/mineral blend
- Base dose: 600mg
- Best for: General health, nutritional gaps

32. MUSCLE HEALTH
- Purpose: Muscle recovery and growth
- Key ingredients: BCAAs, L-Glutamine, Magnesium, Vitamin D, Zinc
- Base dose: 500mg
- Best for: Athletes, muscle recovery, sarcopenia

33. NEUROTRANSMITTER
- Purpose: Brain chemical balance
- Key ingredients: L-Tyrosine, 5-HTP, GABA, Taurine, B6
- Base dose: 400mg
- Best for: Mood disorders, neurotransmitter imbalances

34. PARASITE
- Purpose: Parasitic infection support
- Key ingredients: Black Walnut, Wormwood, Clove, Oregano oil
- Base dose: 450mg
- Best for: Parasitic infections, gut issues, travel

35. SKIN HEALTH
- Purpose: Skin, hair, and nail support
- Key ingredients: Collagen, Biotin, Vitamin C, Zinc, Silica
- Base dose: 400mg
- Best for: Skin health, anti-aging, hair/nail strength

36. SLEEP
- Purpose: Sleep quality and duration
- Key ingredients: Melatonin, L-Theanine, Magnesium, Valerian, Passionflower
- Base dose: 400mg
- Best for: Insomnia, sleep quality, jet lag

37. TESTOSTERONE
- Purpose: Male hormone support
- Key ingredients: Tribulus, Fenugreek, D-Aspartic Acid, Zinc, Vitamin D
- Base dose: 500mg
- Best for: Low testosterone, male vitality, muscle mass

38. THYROID
- Purpose: Thyroid function support
- Key ingredients: Iodine, Tyrosine, Selenium, Ashwagandha, B-vitamins
- Base dose: 350mg
- Best for: Hypothyroid, metabolism, energy

39. VASCULAR
- Purpose: Circulation and vein health
- Key ingredients: Horse Chestnut, Butcher's Broom, Vitamin C, Rutin
- Base dose: 400mg
- Best for: Varicose veins, circulation, vascular health

=== CRITICAL FORMULATION RULES ===

1. ALWAYS START WITH A FORMULA BASE
   - Never create a formula with only individual ingredients
   - Formula bases provide synergistic blends

2. DOSING LIMITS
   - Total formula cannot exceed 800mg
   - Consider capsule size and patient compliance
   - Some ingredients have very small doses (mcg) and MUST be in bases

3. INTERACTION CHECKS
   - Iron blocks calcium absorption (separate by 2 hours)
   - Zinc competes with copper (maintain 10:1 ratio)
   - Vitamin K interacts with blood thinners
   - 5-HTP/SAMe interact with antidepressants
   - Ginseng interacts with blood pressure meds
   - St. John's Wort interacts with many medications

4. SPECIAL POPULATIONS
   - Pregnancy: Avoid vitamin A, limit herbs
   - Elderly: May need lower doses, consider absorption
   - Children: Requires specific pediatric formulations
   - Athletes: Consider testing regulations

=== BLOOD TEST INTERPRETATION GUIDELINES ===

When users provide blood test results, optimize based on these ranges:

- Vitamin D: Optimal 40-60 ng/mL (supplement if <30)
- B12: Optimal >500 pg/mL (supplement if <400)
- Ferritin: Optimal 50-150 ng/mL 
- Magnesium RBC: Optimal 5.0-6.5 mg/dL
- TSH: Optimal 1.0-2.5 mIU/L
- Homocysteine: Optimal <7 μmol/L
- CRP: Optimal <1.0 mg/L
- HbA1c: Optimal <5.4%

=== RESPONSE FORMAT ===

When providing a supplement recommendation, ALWAYS include both:
1. A conversational, educational response explaining your reasoning
2. A structured JSON block enclosed in triple backticks with "json" tag containing:
   - bases: array of formula bases with name, dose, purpose
   - additions: array of additional ingredients with name, dose, purpose  
   - totalMg: total formula weight (must not exceed 800)
   - warnings: array of drug interactions or contraindications
   - rationale: brief explanation of formula strategy
   - disclaimers: array of safety disclaimers

=== SAFETY DISCLAIMERS ===
- Always ask about medications and health conditions
- This is supplement support, not medical advice
- Recommend consulting healthcare provider
- Monitor for any adverse reactions
- Retest blood work in 3-6 months`;

// Rate limiting store for OpenAI API calls
const rateLimitStore = new Map<string, { count: number, resetTime: number }>();

// Security middleware functions
function getClientIP(req: any): string {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress ||
         'unknown';
}

function checkRateLimit(clientId: string, limit: number, windowMs: number): { allowed: boolean, remaining: number, resetTime: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(clientId);
  
  if (!entry || now > entry.resetTime) {
    // Reset or create new entry
    const resetTime = now + windowMs;
    rateLimitStore.set(clientId, { count: 1, resetTime });
    return { allowed: true, remaining: limit - 1, resetTime };
  }
  
  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime };
  }
  
  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetTime: entry.resetTime };
}

// Clean up rate limit store periodically
setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];
  rateLimitStore.forEach((value, key) => {
    if (now > value.resetTime) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => rateLimitStore.delete(key));
}, 60000); // Clean up every minute

export async function registerRoutes(app: Express): Promise<Server> {
  // Enhanced JSON parsing middleware with size limits
  app.use('/api', (req, res, next) => {
    if (req.headers['content-type']?.includes('application/json')) {
      let body = '';
      let bodySize = 0;
      const maxSize = 10 * 1024; // 10KB limit
      
      req.on('data', chunk => {
        bodySize += chunk.length;
        if (bodySize > maxSize) {
          res.status(413).json({ error: 'Request too large' });
          return;
        }
        body += chunk.toString();
      });
      
      req.on('end', () => {
        try {
          req.body = JSON.parse(body);
          next();
        } catch (e) {
          res.status(400).json({ error: 'Invalid JSON' });
        }
      });
    } else {
      next();
    }
  });
  
  // Security headers middleware
  app.use('/api', (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Authentication routes
  app.post('/api/auth/signup', async (req, res) => {
    try {
      // Rate limiting for signup (3 attempts per 15 minutes per IP)
      const clientIP = getClientIP(req);
      const rateLimit = checkRateLimit(`signup-${clientIP}`, 3, 15 * 60 * 1000);
      if (!rateLimit.allowed) {
        return res.status(429).json({ 
          error: 'Too many signup attempts. Please try again later.', 
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
        });
      }

      // Validate request body
      const validatedData = signupSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(409).json({ error: 'User with this email already exists' });
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(validatedData.password, saltRounds);

      // Create user
      const userData = {
        name: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone || null,
        password: hashedPassword
      };

      const user = await storage.createUser(userData);
      
      // Generate JWT token
      const token = generateToken(user.id);

      // Return user data without password
      const authResponse: AuthResponse = {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          createdAt: user.createdAt.toISOString()
        },
        token
      };

      res.status(201).json(authResponse);
    } catch (error: any) {
      console.error('Signup error:', error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: error.errors 
        });
      }
      
      res.status(500).json({ error: 'Failed to create account' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      // Rate limiting for login (5 attempts per 15 minutes per IP)
      const clientIP = getClientIP(req);
      const rateLimit = checkRateLimit(`login-${clientIP}`, 5, 15 * 60 * 1000);
      if (!rateLimit.allowed) {
        return res.status(429).json({ 
          error: 'Too many login attempts. Please try again later.', 
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
        });
      }

      // Validate request body
      const validatedData = loginSchema.parse(req.body);
      
      // Find user by email
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(validatedData.password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Generate JWT token
      const token = generateToken(user.id);

      // Return user data without password
      const authResponse: AuthResponse = {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          createdAt: user.createdAt.toISOString()
        },
        token
      };

      res.json(authResponse);
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: error.errors 
        });
      }
      
      res.status(500).json({ error: 'Login failed' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    // With JWT tokens, logout is primarily handled client-side by removing the token
    // We could maintain a blacklist for extra security, but for this MVP we'll keep it simple
    res.json({ message: 'Logged out successfully' });
  });

  app.get('/api/auth/me', requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Return user data without password
      const userData = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        createdAt: user.createdAt.toISOString()
      };

      res.json({ user: userData });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Failed to fetch user data' });
    }
  });

  // Streaming chat endpoint with enhanced security
  app.post('/api/chat/stream', requireAuth, async (req, res) => {
    let streamStarted = false;
    const clientIP = getClientIP(req);
    
    // Helper function to send SSE data
    const sendSSE = (data: any) => {
      if (!res.destroyed) {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      }
    };
    
    // Helper function to end stream safely
    const endStream = () => {
      if (!res.destroyed) {
        res.end();
      }
    };
    
    try {
      // Rate limiting check (10 requests per 10 minutes per IP)
      const rateLimit = checkRateLimit(clientIP, 10, 10 * 60 * 1000);
      if (!rateLimit.allowed) {
        return res.status(429).json({ 
          error: 'Rate limit exceeded', 
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
        });
      }
      
      const { message, sessionId } = req.body;
      const userId = req.userId; // Use authenticated user ID from middleware
      
      // Enhanced input validation
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ error: 'Valid message is required' });
      }
      
      if (message.length > 2000) {
        return res.status(400).json({ error: 'Message too long (max 2000 characters)' });
      }
      
      // userId is guaranteed to be a valid string from authentication middleware
      
      if (sessionId && typeof sessionId !== 'string') {
        return res.status(400).json({ error: 'Invalid session ID format' });
      }
      
      // Basic content filtering for malicious content
      const suspiciousPatterns = [
        /<script[^>]*>.*?<\/script>/gi,
        /javascript:/gi,
        /data:text\/html/gi,
        /vbscript:/gi
      ];
      
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(message)) {
          console.warn(`Suspicious content detected from IP ${clientIP}: ${message.substring(0, 100)}`);
          return res.status(400).json({ error: 'Invalid message content' });
        }
      }

      // Set up proper Server-Sent Events headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Cache-Control, Content-Type');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
      
      streamStarted = true;
      
      // Send initial connection confirmation
      sendSSE({ type: 'connected', message: 'Stream established' });

      // Get or create chat session
      let chatSession;
      if (sessionId) {
        chatSession = await storage.getChatSession(sessionId);
      }
      
      if (!chatSession) {
        chatSession = await storage.createChatSession({ userId, status: 'active' });
      }

      // Get previous messages for context (last 10 messages)
      const previousMessages = chatSession ? 
        (await storage.listMessagesBySession(chatSession.id)).slice(-10) : [];

      // Build conversation history
      const conversationHistory: Array<{role: 'system' | 'user' | 'assistant', content: string}> = [
        { role: 'system', content: ONES_AI_SYSTEM_PROMPT },
        ...previousMessages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        })),
        { role: 'user', content: message }
      ];

      // Enhanced OpenAI request with retry logic and circuit breaker
      let stream: any;
      let retryCount = 0;
      const maxRetries = 2;
      
      while (retryCount <= maxRetries) {
        try {
          // Check if OpenAI API key is available
          if (!process.env.OPENAI_API_KEY) {
            throw new Error('OpenAI API key not configured');
          }
          
          const streamPromise = openai.chat.completions.create({
            model: 'gpt-5', // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
            messages: conversationHistory,
            stream: true,
            max_tokens: 2000,
            temperature: 0.7,
            // Add safety parameters
            frequency_penalty: 0.1,
            presence_penalty: 0.1
          });
          
          // Set timeout for OpenAI request
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('OpenAI request timeout')), 60000); // 60 second timeout
          });
          
          stream = await Promise.race([streamPromise, timeoutPromise]);
          break; // Success, exit retry loop
          
        } catch (openaiError: any) {
          retryCount++;
          console.error(`OpenAI request attempt ${retryCount} failed:`, openaiError.message);
          
          if (retryCount > maxRetries) {
            // Send specific error based on OpenAI error type
            if (openaiError.status === 429) {
              sendSSE({
                type: 'error',
                error: 'AI service is currently overloaded. Please try again in a few minutes.',
                code: 'RATE_LIMITED'
              });
            } else if (openaiError.status === 401) {
              sendSSE({
                type: 'error',
                error: 'AI service authentication failed. Please contact support.',
                code: 'AUTH_FAILED'
              });
            } else {
              sendSSE({
                type: 'error',
                error: 'AI service is temporarily unavailable. Please try again later.',
                code: 'SERVICE_UNAVAILABLE'
              });
            }
            endStream();
            return;
          }
          
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        }
      }

      let fullResponse = '';
      let extractedFormula = null;
      let chunkCount = 0;

      // Stream the response with proper error handling
      try {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            fullResponse += content;
            chunkCount++;
            
            // Send chunk to client with proper SSE format
            sendSSE({ 
              type: 'chunk', 
              content,
              sessionId: chatSession?.id,
              chunkIndex: chunkCount
            });
            
            // Prevent infinite streams
            if (chunkCount > 1000) {
              console.warn('Stream exceeded chunk limit, terminating');
              break;
            }
          }
        }
      } catch (streamError) {
        console.error('OpenAI streaming error:', streamError);
        sendSSE({
          type: 'error',
          error: 'AI response generation failed',
          sessionId: chatSession?.id
        });
        endStream();
        return;
      }

      // Extract formula data from response if present
      try {
        const jsonMatch = fullResponse.match(/```json\s*({[\s\S]*?})\s*```/);
        if (jsonMatch) {
          const jsonData = JSON.parse(jsonMatch[1]);
          let validatedFormula = FormulaExtractionSchema.parse(jsonData);
          
          // CRITICAL: Server-side validation and 800mg enforcement
          const validation = validateAndCalculateFormula(validatedFormula);
          
          if (!validation.isValid) {
            // Formula is invalid - reject it and send error to client
            sendSSE({
              type: 'formula_error',
              error: `Formula validation failed: ${validation.errors.join(', ')}`,
              sessionId: chatSession?.id,
              validationErrors: validation.errors
            });
            
            // Still complete the stream normally but without formula
            sendSSE({
              type: 'complete',
              sessionId: chatSession?.id,
              formula: null
            });
            
            // Save messages even if formula is invalid
            if (chatSession) {
              await storage.createMessage({
                sessionId: chatSession.id,
                role: 'user',
                content: message
              });
              
              await storage.createMessage({
                sessionId: chatSession.id,
                role: 'assistant',
                content: fullResponse
              });
            }
            
            endStream();
            return;
          }
          
          // Update formula with server-calculated totalMg
          validatedFormula.totalMg = validation.calculatedTotalMg;
          extractedFormula = validatedFormula;
          
          // Add validation warnings
          if (validation.errors.length > 0) {
            extractedFormula.warnings.push(...validation.errors);
          }
          
          // Get user's health profile for medication validation
          let userMedications: string[] = [];
          if (userId) {
            try {
              const healthProfile = await storage.getHealthProfile(userId);
              userMedications = healthProfile?.medications || [];
            } catch (e) {
              console.log('Could not retrieve user health profile for medication validation');
            }
          }
          
          // Validate supplement-medication interactions
          const medicalWarnings = await validateSupplementInteractions(validatedFormula, userMedications);
          extractedFormula.warnings.push(...medicalWarnings);
          
          // Add standard medical disclaimers if not present
          if (!extractedFormula.disclaimers.some(d => d.includes('medical advice'))) {
            extractedFormula.disclaimers.unshift('This is supplement support, not medical advice');
          }
          if (!extractedFormula.disclaimers.some(d => d.includes('healthcare provider'))) {
            extractedFormula.disclaimers.push('Always consult your healthcare provider before starting new supplements');
          }
          if (!extractedFormula.disclaimers.some(d => d.includes('interactions'))) {
            extractedFormula.disclaimers.push('Monitor for interactions with medications and adverse reactions');
          }
        }
      } catch (e) {
        console.log('No valid formula JSON found in response');
      }

      // Save extracted formula to storage if valid
      let savedFormula = null;
      if (extractedFormula && chatSession && userId) {
        try {
          // Convert formula to storage format
          const formulaData = {
            userId,
            bases: extractedFormula.bases.map((b: any) => ({
              ingredient: b.name,
              amount: parseDoseToMg(b.dose, b.name),
              unit: 'mg'
            })),
            additions: extractedFormula.additions.map((a: any) => ({
              ingredient: a.name,
              amount: parseDoseToMg(a.dose, a.name),
              unit: 'mg'
            })),
            totalMg: extractedFormula.totalMg,
            notes: extractedFormula.rationale,
            version: 1
          };
          
          savedFormula = await storage.createFormula(formulaData);
        } catch (formulaSaveError) {
          console.error('Error saving formula:', formulaSaveError);
        }
      }
      
      // Send completion event with any extracted formula
      sendSSE({
        type: 'complete',
        formula: extractedFormula,
        sessionId: chatSession?.id,
        formulaId: savedFormula?.id,
        responseLength: fullResponse.length,
        chunkCount
      });

      // Save messages to storage
      if (chatSession) {
        try {
          await storage.createMessage({
            sessionId: chatSession.id,
            role: 'user',
            content: message
          });
          
          await storage.createMessage({
            sessionId: chatSession.id,
            role: 'assistant',
            content: fullResponse
          });
        } catch (messageError) {
          console.error('Error saving messages:', messageError);
        }
      }

      endStream();

    } catch (error) {
      console.error(`Chat stream error from IP ${clientIP}:`, error);
      
      // Log detailed error for monitoring
      const errorDetails = {
        timestamp: new Date().toISOString(),
        clientIP,
        userId: req.body?.userId,
        sessionId: req.body?.sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      };
      console.error('Detailed error log:', JSON.stringify(errorDetails, null, 2));
      
      // Only send error if stream was started
      if (streamStarted && !res.destroyed) {
        sendSSE({
          type: 'error',
          error: 'Failed to generate response. Please try again.',
          code: 'INTERNAL_ERROR',
          timestamp: new Date().toISOString()
        });
        endStream();
      } else if (!streamStarted) {
        // If stream never started, send regular HTTP error
        res.status(500).json({ 
          error: 'Failed to generate response. Please try again.',
          code: 'INTERNAL_ERROR',
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Handle client disconnect
    req.on('close', () => {
      if (!res.destroyed) {
        console.log('Client disconnected from stream');
        endStream();
      }
    });
    
    req.on('error', (err) => {
      console.error('Request error:', err);
      if (!res.destroyed) {
        endStream();
      }
    });
  });

  // Get chat session
  app.get('/api/chat/:sessionId', requireAuth, async (req, res) => {
    try {
      const { sessionId } = req.params;
      const userId = req.userId; // Get authenticated user ID
      const session = await storage.getChatSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Ensure the session belongs to the authenticated user
      if (session.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const messages = await storage.listMessagesBySession(sessionId);
      
      res.json({
        session,
        messages
      });
    } catch (error) {
      console.error('Get chat session error:', error);
      res.status(500).json({ error: 'Failed to get chat session' });
    }
  });

  // Create new chat session
  app.post('/api/chat/sessions', requireAuth, async (req, res) => {
    try {
      const userId = req.userId; // Use authenticated user ID

      const session = await storage.createChatSession({ 
        userId, 
        status: 'active' 
      });
      
      res.json(session);
    } catch (error) {
      console.error('Create chat session error:', error);
      res.status(500).json({ error: 'Failed to create chat session' });
    }
  });

  // List user's chat sessions
  app.get('/api/users/me/sessions', requireAuth, async (req, res) => {
    try {
      const userId = req.userId; // Use authenticated user ID instead of URL param
      const sessions = await storage.listChatSessionsByUser(userId);
      
      res.json(sessions);
    } catch (error) {
      console.error('List chat sessions error:', error);
      res.status(500).json({ error: 'Failed to list chat sessions' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
