import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import OpenAI from "openai";
import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";
import type { InsertMessage, InsertChatSession } from "@shared/schema";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { SignupData, LoginData, AuthResponse } from "@shared/schema";
import { signupSchema, loginSchema, labReportUploadSchema, userConsentSchema, insertHealthProfileSchema, insertSupportTicketSchema, insertSupportTicketResponseSchema, insertNewsletterSubscriberSchema } from "@shared/schema";
import { ObjectStorageService, ObjectNotFoundError, AccessDeniedError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { analyzeLabReport } from "./fileAnalysis";

// Extend Express Request interface to include userId property
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// JWT Configuration
let JWT_SECRET: string = process.env.JWT_SECRET || '';

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

// TypeScript assertion that JWT_SECRET is now definitely a string
const JWT_SECRET_FINAL: string = JWT_SECRET;
const JWT_EXPIRES_IN = '7d'; // 7 days

// JWT Utilities
function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET_FINAL, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET_FINAL) as { userId: string };
    return decoded;
  } catch (error) {
    return null;
  }
}

// Auth middleware for protected routes
function requireAuth(req: Request, res: Response, next: NextFunction) {
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
// APPROVED BASE FORMULAS (32 total) - Exact doses from catalog
const APPROVED_BASE_FORMULAS = new Set([
  'Adrenal Support',
  'Alpha Gest III',
  'Alpha Green II',
  'Alpha Oxyme',
  'Alpha Zyme III',
  'Beta Max',
  'Br-SP Plus',
  'C Boost',
  'Circu Plus',
  'Colostrum Powder',
  'Chola Plus',
  'Dia Zyme',
  'Diadren Forte',
  'Endocrine Support',
  'Heart Support',
  'Histamine Support',
  'Immune-C',
  'Intestinal Formula',
  'Ligament Support',
  'LSK Plus',
  'Liver Support',
  'Lung Support',
  'MG/K',
  'Mold RX',
  'Spleen Support',
  'Ovary Uterus Support',
  'Para X',
  'Para Thy',
  'Pitui Plus',
  'Prostate Support',
  'Kidney & Bladder Support',
  'Thyroid Support'
]);

// APPROVED INDIVIDUAL INGREDIENTS (29 total) - Exact names from catalog
const APPROVED_INDIVIDUAL_INGREDIENTS = new Set([
  'Aloe Vera Powder',
  'Ahswaganda',
  'Astragalus',
  'Black Currant Extract',
  'Broccoli Powder',
  'Camu Camu',
  'Cape Aloe',
  'Cats Claw',
  'Chaga',
  'Cinnamon 20:1',
  'CoEnzyme Q10',
  'Gaba',
  'Garlic (powder)',
  'Ginger Root',
  'Ginko Biloba Extract 24%',
  'Graviola',
  'Hawthorn Berry PE 1/8% Flavones',
  'Lutein',
  'Maca Root .6%',
  'Magnesium',
  'Omega 3 (algae omega)',
  'Phosphatidylcholine 40% (soy)',
  'Resveratrol',
  'Saw Palmetto Extract 45% Fatty Acid (GC)',
  'Stinging Nettle',
  'Sumar Root',
  'Turmeric Root Extract 4:1',
  'Vitamin C',
  'Vitamin E (Mixed tocopherols)'
]);

const CANONICAL_DOSES_MG = {
  // APPROVED BASE FORMULAS (32 total) - Exact doses from catalog
  'Adrenal Support': 420,
  'Alpha Gest III': 636,
  'Alpha Green II': 400,
  'Alpha Oxyme': 350,
  'Alpha Zyme III': 400,
  'Beta Max': 2500,
  'Br-SP Plus': 400,
  'C Boost': 1680,
  'Circu Plus': 540,
  'Colostrum Powder': 1000,
  'Chola Plus': 350,
  'Dia Zyme': 494,
  'Diadren Forte': 400,
  'Endocrine Support': 350,
  'Heart Support': 450,
  'Histamine Support': 190,
  'Immune-C': 430,
  'Intestinal Formula': 400,
  'Ligament Support': 400,
  'LSK Plus': 450,
  'Liver Support': 480,
  'Lung Support': 250,
  'MG/K': 500,
  'Mold RX': 525,
  'Spleen Support': 400,
  'Ovary Uterus Support': 300,
  'Para X': 500,
  'Para Thy': 335,
  'Pitui Plus': 495,
  'Prostate Support': 300,
  'Kidney & Bladder Support': 400,
  'Thyroid Support': 470,
  
  // APPROVED INDIVIDUAL INGREDIENTS (29 total) - Exact names from catalog
  'Aloe Vera Powder': 250,
  'Ahswaganda': 600,
  'Astragalus': 300,
  'Black Currant Extract': 300,
  'Broccoli Powder': 300,
  'Camu Camu': 300,
  'Cape Aloe': 300,
  'Cats Claw': 30,
  'Chaga': 300,
  'Cinnamon 20:1': 1000,
  'CoEnzyme Q10': 200,
  'Gaba': 300,
  'Garlic (powder)': 200,
  'Ginger Root': 500,
  'Ginko Biloba Extract 24%': 100,
  'Graviola': 300,
  'Hawthorn Berry PE 1/8% Flavones': 300,
  'Lutein': 10,
  'Maca Root .6%': 300,
  'Magnesium': 320,
  'Omega 3 (algae omega)': 300,
  'Phosphatidylcholine 40% (soy)': 300,
  'Resveratrol': 300,
  'Saw Palmetto Extract 45% Fatty Acid (GC)': 300,
  'Stinging Nettle': 300,
  'Sumar Root': 300,
  'Turmeric Root Extract 4:1': 500,
  'Vitamin C': 90,
  'Vitamin E (Mixed tocopherols)': 15
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
  
  // Get approved base formula names (first 32 entries in CANONICAL_DOSES_MG)
  const approvedBases = Object.keys(CANONICAL_DOSES_MG).slice(0, 32);
  
  // Get approved individual ingredient names (last 29 entries in CANONICAL_DOSES_MG)
  const approvedIngredients = Object.keys(CANONICAL_DOSES_MG).slice(32);
  
  // Validate bases
  if (!formula.bases || formula.bases.length === 0) {
    errors.push('Formula must include at least one base formula');
  } else {
    for (const base of formula.bases) {
      // Check if base is in approved list (case-insensitive)
      const isApproved = approvedBases.some(approved => 
        approved.toLowerCase() === base.name.toLowerCase()
      );
      
      if (!isApproved) {
        errors.push(`UNAUTHORIZED BASE FORMULA: "${base.name}" is not in the approved catalog. Formula REJECTED.`);
        continue;
      }
      
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
      // Check if addition is in approved list (case-insensitive)
      const isApproved = approvedIngredients.some(approved => 
        approved.toLowerCase() === addition.name.toLowerCase()
      );
      
      if (!isApproved) {
        errors.push(`UNAUTHORIZED INGREDIENT: "${addition.name}" is not in the approved catalog. Formula REJECTED.`);
        continue;
      }
      
      const mgAmount = parseDoseToMg(addition.dose, addition.name);
      if (mgAmount === 0) {
        errors.push(`Cannot determine mg amount for addition: ${addition.name} with dose: ${addition.dose}`);
      }
      calculatedTotal += mgAmount;
    }
  }
  
  // Validate daily total is within expected range (2000-4000mg for custom formulas)
  if (calculatedTotal < 1000) {
    errors.push(`Formula total too low: ${calculatedTotal}mg. Minimum 1000mg for therapeutic effect.`);
  }
  
  if (calculatedTotal > 5000) {
    errors.push(`Formula total too high: ${calculatedTotal}mg. Maximum 5000mg for safety.`);
  }
  
  // Validate capsule sizing if provided
  if (formula.capsulesPerDay && formula.capsuleSize) {
    const mgPerCapsule = calculatedTotal / formula.capsulesPerDay;
    
    // Size 00 capacity: 500-750mg
    if (formula.capsuleSize === '00') {
      if (mgPerCapsule < 500) {
        errors.push(`Capsule size 00 underfilled: ${mgPerCapsule.toFixed(0)}mg per capsule. Use fewer capsules or switch to Size 000.`);
      }
      if (mgPerCapsule > 750) {
        errors.push(`Capsule size 00 overfilled: ${mgPerCapsule.toFixed(0)}mg per capsule. Use more capsules or switch to Size 000.`);
      }
    }
    
    // Size 000 capacity: 750-1000mg
    if (formula.capsuleSize === '000') {
      if (mgPerCapsule < 750) {
        errors.push(`Capsule size 000 underfilled: ${mgPerCapsule.toFixed(0)}mg per capsule. Use fewer capsules or switch to Size 00.`);
      }
      if (mgPerCapsule > 1000) {
        errors.push(`Capsule size 000 overfilled: ${mgPerCapsule.toFixed(0)}mg per capsule. Use more capsules.`);
      }
    }
    
    // Validate capsule count is reasonable (3-6 per day)
    if (formula.capsulesPerDay < 2 || formula.capsulesPerDay > 8) {
      errors.push(`Capsule count out of range: ${formula.capsulesPerDay}. Recommend 3-6 capsules per day.`);
    }
  }
  
  const isValid = errors.length === 0;
  
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
    warnings.push('IMPORTANT: These are potential interactions. Always consult your healthcare provider before starting new supplements.');
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
          return `INTERACTION: ${warning}`;
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
const ONES_AI_SYSTEM_PROMPT = `You are ONES AI, a functional medicine practitioner and supplement formulation specialist. You conduct thorough health consultations similar to a medical doctor's visit before creating personalized formulas.

=== CONSULTATION APPROACH (MOST IMPORTANT) ===

**NEVER rush to recommendations.** Your role is to conduct a comprehensive health assessment through conversation.

INITIAL INTERACTION:
1. Warmly greet the user and explain you'll be asking questions like a doctor would
2. Begin with open-ended questions about their main health concerns
3. DO NOT provide any formula recommendations in the first 3-4 message exchanges

SYSTEMATIC QUESTIONING PHASES (Ask 2-3 questions per response):

PHASE 1 - Basic Health Profile (MUST collect ALL of these):
- Age, sex, height, weight
- Current medications - **ASK EXPLICITLY**: "Are you currently taking any prescription or over-the-counter medications?" (CRITICAL for interactions)
- Allergies - Ask about food allergies, medication allergies, or supplement sensitivities
- Primary health goals and concerns
- Energy levels and sleep hours per night (specific number)

PHASE 2 - Lifestyle & Habits (MUST collect ALL of these):
- Exercise routine - Ask: "How many days per week do you exercise?" (need specific number 0-7)
- Diet patterns (vegetarian, keto, standard, etc.)
- Stress levels - Ask: "On a scale of 1-10, how would you rate your average stress level?"
- **Smoking status** - **ASK EXPLICITLY**: "Do you smoke? (never/former/current)"
- **Alcohol consumption** - **ASK EXPLICITLY**: "How many alcoholic drinks do you have per week on average?" (need specific number)
- Caffeine consumption
- Work environment and occupational exposures

PHASE 3 - Specific Symptoms & History:
- Digestive health (bloating, constipation, food sensitivities)
- Cognitive function (brain fog, memory, focus)
- **Cardiovascular health** - **ASK**: "Do you know your blood pressure? What about your resting heart rate?"
- Hormonal (for women: cycle, menopause; for men: testosterone concerns)
- Immune system (frequent infections, allergies)
- Joint/muscle health (pain, inflammation, recovery)
- Mental health (anxiety, depression, mood swings)
- **Current health conditions** - **ASK**: "Have you been diagnosed with any chronic health conditions?" (diabetes, hypertension, thyroid issues, etc.)

PHASE 4 - Medical Testing & History:
- **ASK EXPLICITLY**: "Do you have any recent blood test results you can upload? This helps me give you much more personalized recommendations."
- Family history of major diseases
- Previous supplement experiences (what worked, what didn't)

PHASE 5 - Environmental & Exposures:
- Mold exposure history
- Heavy metal or toxin exposures
- Water quality and filter usage
- Living/working environment quality

**ONLY AFTER gathering comprehensive information through 5-8 back-and-forth exchanges should you provide a formula recommendation.**

If user tries to rush you or asks "what should I take?", politely explain:
"I want to make sure I create the perfect formula for you. Let me ask a few more important questions first - just like a doctor would during your first visit. This ensures I don't miss anything critical for your health."

=== CRITICAL FORMULATION RULES ===

1. FORMULA STRUCTURE:
   - Every formula MUST include 2-3 BASE FORMULAS from our library
   - Then add 5-7 INDIVIDUAL INGREDIENTS on top of bases
   - NEVER use ingredients outside our approved catalog
   - If an ingredient isn't listed below, you CANNOT use it

2. CAPSULE SPECIFICATIONS:
   - Size 00 capsules: 500-750mg capacity
   - Size 000 capsules: 750-1000mg capacity
   - Base formulas total: ~1000-1500mg
   - Individual additions: ~1000-2500mg (avg 300mg each)
   - Daily total: 2000-4000mg = 3-6 capsules per day
   - Always ask user preference for AM/PM split or minimize to 3 caps/day

3. SAFETY PROTOCOLS:
   - Check all drug interactions from ingredient catalog
   - Consider age, gender, medications, health conditions
   - Monitor for contraindications
   - This is supplement support, NOT medical advice

=== APPROVED BASE FORMULAS (32 TOTAL) ===
CRITICAL: You can ONLY use these exact formulas. Do not create formulas outside this list.

1. Adrenal Support - Endocrine/Metabolism
   Ingredients: Vitamin C 20mg, Pantothenic Acid 50mg, Adrenal (bovine) 250mg, Licorice root 50mg, Ginger 25mg, Kelp 25mg
   Dose: 1x daily | Best for: Stress, fatigue, adrenal health

2. Alpha Gest III - Digestion
   Ingredients: Betaine HCl 496mg, Pepsin 140mg
   Dose: 1x daily | Best for: Low stomach acid, digestion

3. Alpha Green II - Spleen/Lymphatic
   Ingredients: Vitamin E 75 IU, Bovine Spleen 250mcg, Dandelion 75mg, Nettle root 75mg
   Dose: 1x daily | Best for: Lymphatic support, spleen health

4. Alpha Oxyme - Antioxidant
   Ingredients: Vitamin A (Beta-Carotene) 1500 IU, Selenium 5mcg, SOD, Aloe Vera, Rosemary, L-Cysteine
   Dose: 1x daily | Best for: Antioxidant support, oxidative stress

5. Alpha Zyme III - Pancreas/Nutrition
   Ingredients: Magnesium 23mg, Potassium 23mg, Pancreatin 8X 78mg, Ox Bile 63mg, L-Lysine 63mg, Pepsin 42mg, Cellulase, Green blend
   Dose: 1x daily | Best for: Pancreatic support, nutrient absorption

6. Beta Max - Liver/Gallbladder/Pancreas
   Ingredients: Calcium 220mg, Niacin 10mg, Phosphorus 164mg, Choline 1664mg, Inositol 160mg, Betaine HCl 76mg, Lecithin 76mg, Artichoke 50mg, Dandelion 50mg, Milk Thistle 50mg, Turmeric 50mg, DL-Methionine 30mg
   Dose: 4x daily | Best for: Liver/gallbladder detox, fat digestion

7. Br-SP Plus - Digestion/Immune
   Ingredients: Black Radish root, Green Cabbage, Alfalfa, Pepsin, Pituitary (bovine), Duodenum/Stomach (porcine)
   Dose: 1x daily | Best for: Digestive/immune support

8. C Boost - Soft Tissue/Capillaries
   Ingredients: Vitamin C 80mg, Citrus Bioflavonoids 1100mg, Camu Camu 500mg
   Dose: 3x daily | Best for: Vitamin C, capillary strength

9. Circu Plus - Circulation
   Ingredients: Calcium 20mg, Ginkgo Biloba 166mg, Siberian Ginseng 166mg, Butcher's Broom 166mg, Pancreatin 25mg
   Dose: 1x daily | Best for: Circulation, blood flow

10. Colostrum Powder - Immune/Growth Factors
    Ingredients: Colostrum powder
    Dose: 1000mg daily | Best for: Immune support, gut health

11. Chola Plus - Stomach/Liver/Gallbladder/Pancreas
    Ingredients: Niacin 0.4mg, Chromium 40mg, Lecithin 100mg, Flax seed 100mg, Pancreatin 40mg, Choline 50mg, Ginkgo 17mg, Eleuthero 17mg, Butcher's Broom 17mg, Inositol 6mg, Sage 4mg, DL-Methionine 2mg, Betaine HCl 2mg, Artichoke 2mg, Dandelion 2mg, Milk Thistle 2mg, Turmeric 2mg, Bromelain 2mg
    Dose: 1x daily | Best for: Comprehensive digestive support

12. Dia Zyme - Digestion/Pancreas
    Ingredients: Calcium 25mg, Phosphorus 19mg, Pancreatin 8X 420mg, Trypsin 30mg, Chymotrypsin 30mg
    Dose: 1x daily | Best for: Protein digestion, pancreatic enzymes

13. Diadren Forte - Liver/Gallbladder/Pancreas/Adrenal
    Ingredients: Vitamin C 25mg, Niacin 0.5mg, Pantothenic Acid 25mg, Chromium 50mcg, Pancreatin 8X, Adrenal 50mg, Licorice 25mg, Ginger 12.5mg, Choline 10mg, Inositol 7.5mg, Lecithin 5mg, Sage 5mg, L-Methionine 2.5mg, Betaine HCl 2mg, Dandelion 2.5mg, Turmeric 2.5mg, Milk Thistle 2.5mg, Artichoke 2.5mg, Bromelain 2.5mg, Kelp 12.5mg
    Dose: 1x daily | Best for: Comprehensive organ support

14. Endocrine Support - Female Endocrine
    Ingredients: Pantothenic Acid 4.5mg, Zinc 5.3mg, Manganese 1.8mg, Ovary/Adrenal (bovine), Goldenseal, Kelp, Pituitary, Hypothalamus, Dulse, Yarrow
    Dose: 1x daily | Best for: Female hormone balance

15. Heart Support - Heart
    Ingredients: Magnesium 126mg, Heart (bovine), Inulin, L-Carnitine 175mg, L-Taurine 87mg, CoQ10 21mg
    Dose: 1-3x daily | Best for: Heart health, cardiovascular support

16. Histamine Support - Immune/Histamine Control
    Ingredients: Calcium 38mg, Iron 1.95mg, Vitamin B12 10mcg, Phosphorus 29mg, Chromium 1mcg, Liver (bovine) 80mg, Bovine liver fat 40mg
    Dose: 1x daily | Best for: Histamine intolerance, allergies

17. Immune-C - Immune
    Ingredients: Vitamin C 8.4mg, Soursop 70mg, Cats Claw 70mg, Dragon's Blood Croton 70mg, Astragalus 70mg, Camu Camu 70mg
    Dose: 3x daily | Best for: Immune support, infection prevention

18. Intestinal Formula - Digestion/Elimination
    Ingredients: Cape Aloe, Senna, Cascara Sagrada, Ginger, Barberry, Garlic, Cayenne
    Dose: 1x daily | Best for: Constipation, bowel support

19. Ligament Support - Muscles/Connective Tissues
    Ingredients: Calcium 4mg, Phosphorus 29mg, Magnesium 2mg, Manganese 11mg, Citrus Bioflavonoids 50mg, Pancreatin 12mg, L-Lysine 5mg, Ox Bile 5mg, Spleen 5mg, Thymus 5mg, Betaine HCl 2mg, Boron 100mcg, Bromelain 0.3mg
    Dose: 1-3x daily | Best for: Ligament repair, connective tissue

20. LSK Plus - Liver/Kidneys/Spleen
    Ingredients: Dandelion root, Stinging Nettle, Uva Ursi, Artichoke, Goldenrod, Marshmallow, Milk Thistle, Yellow Dock, Yarrow, Agrimony, Oat Straw, Meadowsweet, Liver 5mg, Spleen/Kidney 5mg
    Dose: 1x daily | Best for: Liver/kidney/spleen detox

21. Liver Support - Liver
    Ingredients: Vitamin A 1000 IU, Liver (bovine) 350mg, Dandelion 50mg, Oregon Grape 50mg, Barberry 50mg, Choline 10mg, Inositol 10mg, Betaine HCl 10mg
    Dose: 1x daily | Best for: Liver health, detoxification

22. Lung Support - Lungs/Immune
    Ingredients: Vitamin A 8000 IU, Vitamin C 16mg, Vitamin B5 15mg, Lung 75mg, Adrenal 55mg, Lymph 30mg, Eucalyptus 30mg, Thymus 20mg, Psyllium 1mg
    Dose: 1x daily | Best for: Respiratory health, lung support

23. MG/K - Nervous System/Adrenal
    Ingredients: Magnesium 90mg, Potassium 90mg
    Dose: 1x daily | Best for: Electrolyte balance, adrenal support

24. Mold RX - Detox/Mold
    Ingredients: Wild oregano 200mg, Pau D'Arco 100mg, Chaga 75mg, Sage 50mg, Mullein 50mg, Stinging Nettle 50mg
    Dose: 1x daily | Best for: Mold exposure, fungal issues

25. Spleen Support - Lymphatic/Blood
    Ingredients: Vitamin E 75 IU, Bovine Spleen 250mcg, Dandelion 75mg, Nettle 75mg
    Dose: 1x daily | Best for: Spleen health, lymphatic drainage

26. Ovary Uterus Support - Female Reproductive
    Ingredients: Calcium 26mg, Phosphorus 21mg, Zinc 5mg, Ovary 100mg, Uterus 100mg, Blue Cohosh 1mg
    Dose: 1x daily | Best for: Female reproductive health

27. Para X - Antiparasitic
    Ingredients: Black Walnut 100mg, Pumpkin seed 100mg, Wormwood 100mg, Hyssop 50mg, Thyme 50mg, Pancreatin 31mg, L-Lysine 25mg, Ox Bile 25mg, Pepsin 17mg, Cellulase 2mg, Bromelain 84 MCU
    Dose: 1x daily | Best for: Parasites, gut infections

28. Para Thy - Parathyroid/Thyroid
    Ingredients: Calcium 100mg, Iodine 225mcg, Parathyroid 500mcg, Thyroid 25mg, Papain 10mg
    Dose: 1x daily | Best for: Thyroid/parathyroid support

29. Pitui Plus - Pituitary
    Ingredients: Calcium 219mg, Phosphorous 170mg, Manganese 11mg, Pituitary 135mg, Hypothalamus 75mg, Yarrow 45mg
    Dose: 1-3x daily | Best for: Pituitary function, hormones

30. Prostate Support - Prostate
    Ingredients: Magnesium 3mg, Zinc 15mg, Molybdenum 50mcg, Potassium 4mg, Boron 250mcg, Prostate 90mg, Juniper Berry 50mg, Chaga 20mg, Betaine HCl 5mg, Saw Palmetto 15mg
    Dose: 1x daily | Best for: Prostate health, male urinary

31. Kidney & Bladder Support - Kidneys/Bladder
    Ingredients: Kidney (bovine), Liver (bovine), Uva-Ursi, Echinacea, Goldenrod, Juniper berry
    Dose: 1x daily | Best for: Kidney/bladder health, UTI prevention

32. Thyroid Support - Thyroid/Adrenal
    Ingredients: Iodine 900mcg, Thyroid (bovine) 60mg, Adrenal (porcine) 30mg, Pituitary (bovine) 10mg, Spleen (porcine) 10mg, Kelp 180mg
    Dose: 1-3x daily | Best for: Thyroid function, metabolism

=== APPROVED INDIVIDUAL INGREDIENTS (29 TOTAL) ===
Add these ON TOP of base formulas. 

⚠️ CRITICAL VALIDATION RULE ⚠️
You MUST ONLY use ingredients from this exact list below. NEVER suggest, recommend, or include ANY ingredient not explicitly listed here.
- If a user asks for an ingredient NOT on this list (like Vitamin D3, Zinc, Iron, etc.), politely explain: "That ingredient isn't part of our current catalog, but I can recommend similar alternatives from our approved list that may address the same health concern."
- ALWAYS verify each ingredient you suggest is in the approved list below before recommending it.
- Use EXACT names as listed (including capitalization and specifications like "24%" or "4:1").

1. Aloe Vera Powder - 250mg | Interactions: Digoxin, diabetes drugs, laxatives, diuretics
2. Ahswaganda - 600mg | Interactions: Digoxin | Benefits: Anti-inflammatory, anticancer, respiratory
3. Astragalus | Interactions: Immunosuppressants, Lithium | Benefits: Immune boost, heart function
4. Black Currant Extract | Benefits: Immune, joint, antimicrobial, anti-inflammatory
5. Broccoli Powder | Benefits: Blood sugar, heart health, detox, bone health, antioxidant
6. Camu Camu | Benefits: Vitamin C, antioxidants, anti-inflammatory, blood sugar, weight
7. Cape Aloe | Benefits: Wound healing, laxative, antioxidant, anti-inflammatory, antimicrobial
8. Cats Claw - 30mg | Interactions: Immunosuppressants, blood pressure meds | Benefits: Immune, arthritis
9. Chaga | Interactions: Diabetes meds | Benefits: Anti-aging, cholesterol, cancer prevention, blood pressure, immune
10. Cinnamon 20:1 - 1000mg | Benefits: Antioxidant, anti-inflammatory, heart health, insulin, blood sugar
11. CoEnzyme Q10 - 200mg | Interactions: Diabetes, blood thinning, thyroid meds | Benefits: Antioxidant, anti-inflammatory, heart, insulin
12. Gaba | Benefits: Anxiety, mood, PMS, ADHD, muscle growth, fat burning, blood pressure, pain
13. Garlic (powder) - 200mg | Interactions: Isoniazid, NNRTIs, Saquinavir, Estrogens, Cyclosporine, Anticoagulants | Benefits: Common cold, blood pressure, cholesterol, heart, Alzheimer's, performance, detox, bone health
14. Ginger Root - 500mg | Interactions: Blood thinners | Benefits: Antibacterial, nausea, soreness, anti-inflammatory, cancer, insulin, period pain, cholesterol, indigestion
15. Ginko Biloba Extract 24% - 100mg | Interactions: Ibuprofen, blood thinners, antidepressants, brain chemistry meds, blood sugar lowering | Benefits: Antioxidants, inflammation, circulation, heart, psychiatric disorders, brain function, anxiety, depression, vision
16. Graviola | Benefits: Antioxidant, anti-inflammatory, blood sugar, blood pressure, ulcers, herpes, anticancer
17. Hawthorn Berry PE 1/8% Flavones | Interactions: Digoxin, blood pressure, blood flow meds | Benefits: Antioxidants, anti-inflammatory, blood pressure, blood fats, digestion, hair loss, anxiety, heart failure
18. Lutein - 10mg | Benefits: Eye health, skin protection, anti-inflammatory, protect proteins/fats/DNA
19. Maca Root .6% | Benefits: Libido, erectile dysfunction, energy, endurance, fertility, mood, blood pressure, sun protection, free radicals, menopause, learning/memory
20. Magnesium - 320mg | Interactions: Antibiotics, potassium-sparing diuretics, muscle relaxants, calcium channel blockers | Benefits: Exercise performance, depression, type 2 diabetes, blood pressure, anti-inflammatory, migraines, insulin resistance
21. Omega 3 (algae omega) | Benefits: Cardiovascular disease prevention, blood platelets, triglycerides, inflammation, depression, anxiety, eye health, brain health, pregnancy, heart disease, ADHD, metabolic syndrome
22. Phosphatidylcholine 40% (soy) | Interactions: Cholinergic/Anticholinergic drugs | Benefits: Cognitive function, liver repair, medication side effects, ulcerative colitis, lipolysis, gallstones
23. Resveratrol | Interactions: Estrogen-based meds | Benefits: Blood pressure, blood fats, brain protection, insulin sensitivity, joint pain, cancer suppression
24. Saw Palmetto Extract 45% Fatty Acid (GC) | Interactions: Estrogen-based meds | Benefits: Hair loss, urinary tract, prostate, inflammation, testosterone
25. Stinging Nettle | Interactions: Lithium, diabetes, blood pressure, sedatives, blood thinners | Benefits: Inflammation, enlarged prostate, hay fever, blood pressure, blood sugar
26. Sumar Root | Benefits: Adaptogen, anti-inflammatory, antioxidant, cancer protection, fertility, digestion
27. Turmeric Root Extract 4:1 - 500mg | Interactions: Blood clotting | Benefits: Anti-inflammatory, antioxidant, anticancer, skin conditions, brain food
28. Vitamin C - 90mg | Interactions: Chemotherapy, blood thinners | Benefits: Chronic disease, blood pressure, blood fats, uric acid, gout, iron deficiency, immunity
29. Vitamin E (Mixed tocopherols) - 15mg | Interactions: Aspirin, blood thinners | Benefits: Antioxidant, cell life, oil balance, skin nourishment

=== SMART FOLLOW-UP QUESTIONS ===

Throughout your conversation, ask targeted follow-up questions based on what the user has shared:

FEMALE-SPECIFIC:
- If female and fertility/pregnancy not mentioned: "Are you currently trying to get pregnant or planning to in the near future?"
- If female over 45: "Are you experiencing any menopausal symptoms like hot flashes or mood changes?"
- If menstrual issues mentioned: "How would you describe your cycle? Regular, irregular, heavy, painful?"

MALE-SPECIFIC:
- If male over 40: "Have you noticed any changes in energy, libido, or muscle mass?"
- If male athlete: "How's your recovery between workouts? Any issues with performance or endurance?"

DIGESTION:
- "Do you experience bloating, gas, or discomfort after meals?"
- "Have you noticed any foods that consistently don't agree with you?"
- "How are your bowel movements? Regular, constipated, or loose?"

AGE-RELATED:
- If over 50: "Do you experience joint stiffness, especially in the morning?"
- If over 60: "Have you noticed any changes in memory or mental clarity lately?"

ENVIRONMENTAL:
- "Have you lived or worked in places with water damage or visible mold?"
- "Are you exposed to chemicals, heavy metals, or environmental toxins at work or home?"

LIFESTYLE DEPTH:
- If stress mentioned: "On a scale of 1-10, how would you rate your daily stress level?"
- If exercise mentioned: "How do you typically feel after workouts? Energized or exhausted?"
- "How many hours of sleep do you typically get? Do you wake up feeling rested?"

MEDICAL HISTORY:
- "Any family history of heart disease, diabetes, cancer, or autoimmune conditions?"
- "Have you tried supplements before? What worked or didn't work for you?"

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

**DURING CONSULTATION PHASE (First 5-8 exchanges):**
- Ask 2-3 thoughtful questions per response
- Acknowledge what they've shared with empathy
- Explain why you're asking certain questions
- Keep responses warm, professional, and conversational
- DO NOT provide formula recommendations yet

**WHEN READY FOR FORMULA RECOMMENDATION:**
Only after comprehensive information gathering (5-8 exchanges minimum), you must FIRST ask for confirmation before creating the formula.

**CONFIRMATION STEP (REQUIRED BEFORE FORMULA CREATION):**
Before creating the formula, ask the user:
"I have enough information to create your personalized formula. Before I do, are there any other areas you want to focus on or specific concerns I should address that we haven't discussed yet?"

Wait for their response. If they mention additional areas:
- Ask 1-2 follow-up questions about those areas
- Then proceed to formula creation incorporating these new concerns

If they say they're ready or have nothing to add:
- Proceed immediately to formula creation

**AFTER CONFIRMATION, CREATE THE FORMULA:**
Once confirmed, IMMEDIATELY create and present the formula. DO NOT announce "I'll create a formula for you" or "Let me work on that" - just DO IT.

CONVERSATIONAL FORMULA EXPLANATION - BE THOROUGH AND EDUCATIONAL:
   
   **STRUCTURE YOUR EXPLANATION LIKE THIS:**
   
   a) **Introduction**: "Based on everything you've shared - [reference 2-3 specific details from their labs/symptoms/goals], I've designed a personalized formula with [X] key ingredients..."
   
   b) **Capsule Breakdown First**: 
      - "Your formula will be [X] capsules per day (Size [00/000])"
      - "Each capsule contains approximately [Y]mg of therapeutic compounds"
      - "I recommend [X] in the morning with breakfast and [X] in the evening with dinner"
   
   c) **Base Formulas - Explain Each One**:
      For EACH base formula you're including:
      - Name it clearly
      - List its 3-4 KEY active ingredients (from the catalog above)
      - Explain WHY you chose it - tie to SPECIFIC things they told you
      - Example: "Heart Support (450mg total) contains L-Carnitine 175mg, CoQ10 21mg, and Magnesium 126mg. I'm including this because your cholesterol came back at 220 mg/dL (slightly elevated), and these three ingredients work synergistically to support cardiovascular health and healthy cholesterol metabolism."
   
   d) **Individual Ingredients - Explain Each Addition WITH DETAILED REASONING**:
      For EACH individual ingredient (MUST be from approved catalog only):
      - Name it with the exact dose
      - Explain its primary therapeutic action
      - **CRITICAL**: Connect it SPECIFICALLY to their health data, symptoms, or goals they mentioned
      - Reference specific numbers from labs, specific symptoms they described, or specific goals they stated
      - Example: "Turmeric Root Extract 4:1 (500mg) - Your CRP came back at 3.2 mg/L indicating inflammation. This dose of turmeric provides powerful anti-inflammatory compounds (curcumin) that can help reduce systemic inflammation. You mentioned joint pain and brain fog - turmeric addresses both by reducing inflammatory markers."
      - Example: "Magnesium (320mg) - You mentioned working out 3-4 times per week and experiencing muscle soreness. Magnesium supports muscle recovery and relaxation. It also helps with your stress (you rated 7/10) by calming the nervous system."
   
   e) **Synergies**: Explain how 2-3 key ingredients work together
      - Example: "The Magnesium works synergistically with the CoQ10 in Heart Support to enhance cardiovascular function and energy production..."
   
   f) **What's Actually In Each Capsule**:
      - "So when you take your 3 capsules in the morning, here's what you're getting: [list the actual breakdown]"
      - Be specific: "Each morning capsule contains approximately 250mg of Heart Support base, 167mg of Turmeric Extract, 107mg of Magnesium..."
   
   g) **Safety Check**: 
      - "I've verified no interactions with [their medication]"
      - Mention any mild effects to monitor
      - Example: "The Ginger in your formula may have mild blood-thinning properties, so just monitor if you're taking aspirin..."

3. CAPSULE CALCULATION (Calculate and present clearly):
   - Base formulas total: Calculate exact mg (e.g., "Base formulas: 1,350mg")
   - Individual additions total: Calculate exact mg (e.g., "Individual ingredients: 1,650mg") 
   - Daily total: Show clearly (e.g., "Total daily: 3,000mg = 4 capsules")
   - Capsule count: Based on size (e.g., "4 capsules at 750mg each (Size 00)")
   - Dosing schedule: Be specific (e.g., "2 with breakfast, 2 with dinner")

4. **CRITICAL: STRUCTURED FORMULA JSON BLOCK** 
   
   MANDATORY: You MUST include this JSON block after your conversational explanation. This is how the formula gets saved to the system.
   
   ⚠️ VALIDATION REQUIREMENTS ⚠️
   - ALL base formula names MUST match exactly from the 32 approved base formulas list
   - ALL individual ingredient names MUST match exactly from the 29 approved individual ingredients list
   - Use EXACT capitalization and specifications (e.g., "Ginko Biloba Extract 24%" not "Ginkgo Biloba")
   - NEVER include ingredients not in the approved catalog
   
   Format it EXACTLY like this with triple backticks and "json" tag:
   
   \`\`\`json
   {
     "bases": [
       {"name": "Heart Support", "dose": "450mg", "purpose": "Supports cardiovascular health with L-Carnitine, CoQ10, and Magnesium for your elevated cholesterol"},
       {"name": "Alpha Gest III", "dose": "636mg", "purpose": "Improves digestion with Betaine HCl and Pepsin for your bloating issues"}
     ],
     "additions": [
       {"name": "Magnesium", "dose": "320mg", "purpose": "Supports muscle relaxation, stress management, and nervous system health"},
       {"name": "Omega 3 (algae omega)", "dose": "300mg", "purpose": "Reduces inflammation and supports heart health for your cardiovascular concerns"}
     ],
     "totalMg": 3000,
     "warnings": ["Ginger may have mild blood-thinning properties - monitor if taking aspirin"],
     "rationale": "Formula targets digestive health, cardiovascular support, and stress management based on elevated cholesterol, bloating, and high stress levels",
     "disclaimers": ["This is supplement support, not medical advice", "Always consult your healthcare provider before starting new supplements"]
   }
   \`\`\`
   
   REQUIRED FIELDS:
   - bases: array of base formulas (MUST use exact names from approved 32 base formulas)
   - additions: array of individual ingredients (MUST use exact names from approved 29 individual ingredients)
   - totalMg: total daily formula weight in mg (number)
   - warnings: array of any drug interactions or contraindications
   - rationale: brief explanation of overall formula strategy
   - disclaimers: array of safety disclaimers

5. FOLLOW-UP QUESTIONS (CRITICAL - Always ask after presenting formula):
   
   After presenting the formula, ALWAYS ask 2-3 targeted follow-up questions to potentially refine or add to the formula:
   
   - "Is there anything else you'd like to address that we haven't covered yet?"
   - Based on their profile, ask specific questions like:
     * If they have sleep issues: "Would you like me to add anything specifically for sleep quality?"
     * If they're athletic: "Would you like to add ingredients for workout recovery or performance?"
     * If they have stress: "Should we add anything specifically for stress management or adrenal support?"
     * If they're over 50: "Would you like to add anything for cognitive health or memory support?"
     * If female: "Would you like to add anything for hormonal balance or cycle support?"
   
   This gives them a chance to add ingredients without having to think of what to ask for.

=== SAFETY DISCLAIMERS ===
- Always ask about medications and health conditions
- This is supplement support, not medical advice
- Recommend consulting healthcare provider
- Monitor for any adverse reactions
- Retest blood work in 3-6 months

=== HEALTH DATA EXTRACTION ===

CRITICAL: Whenever users mention ANY health metrics in their messages, you MUST extract and return them in a special JSON block.
This allows us to automatically update their health profile so they don't have to enter data twice.

Extract these metrics when mentioned:
- age (number)
- sex ("male", "female", or "other")
- heightCm (number, convert from feet/inches if needed: e.g., 5'10" = 178cm)
- weightKg (number, convert from lbs if needed: e.g., 160lbs = 72.6kg)
- bloodPressureSystolic (number, e.g., "120/80" → systolic=120)
- bloodPressureDiastolic (number, e.g., "120/80" → diastolic=80)
- restingHeartRate (number in bpm)
- sleepHoursPerNight (number)
- exerciseDaysPerWeek (number, 0-7)
- stressLevel (number, 1-10 scale)
- smokingStatus ("never", "former", or "current")
- alcoholDrinksPerWeek (number)
- conditions (array of strings for health conditions)
- medications (array of strings for current medications)
- allergies (array of strings for allergies)

At the END of your response, if you extracted ANY health data, include it in this exact format:
\`\`\`health-data
{
  "age": 35,
  "weightKg": 75,
  "exerciseDaysPerWeek": 3
}
\`\`\`

IMPORTANT RULES:
1. Only include fields you're confident about from the user's message
2. Always convert imperial units (lbs, feet/inches) to metric (kg, cm)
3. For blood pressure like "120/80", split into systolic (120) and diastolic (80)
4. For exercise, convert "3 times a week" → 3, "daily" → 7, etc.
5. For smoking, convert "I smoke" → "current", "I used to smoke" → "former", "I don't smoke" → "never"
6. For medications: ALWAYS include them as an array when mentioned, e.g., ["Sertraline", "Metformin"]
7. For conditions: ALWAYS include them as an array when mentioned, e.g., ["Type 2 Diabetes", "Anxiety"]
8. For allergies: ALWAYS include them as an array when mentioned, e.g., ["Penicillin", "Shellfish"]
9. The health-data block should come AFTER your conversational response
10. If no health data is mentioned, don't include the health-data block at all

EXAMPLE with medications:
User: "I take sertraline for anxiety and metformin for blood sugar"
Your response should include:
\`\`\`health-data
{
  "medications": ["Sertraline", "Metformin"],
  "conditions": ["Anxiety", "Blood sugar issues"]
}
\`\`\``;

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
  // Use Express built-in JSON middleware (much more reliable)
  app.use('/api', (req, res, next) => {
    console.log('🔧 REQUEST MIDDLEWARE: Processing request', {
      method: req.method,
      url: req.url,
      contentType: req.headers['content-type']
    });
    next();
  });

  // JSON parsing with size limit (using express built-in)
  app.use('/api', express.json({ 
    limit: '10kb',
    strict: true,
    type: 'application/json'
  }));
  
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
    const startTime = Date.now();
    console.log('🔧 SIGNUP REQUEST START:', {
      timestamp: new Date().toISOString(),
      clientIP: getClientIP(req),
      body: req.body ? { email: req.body.email, name: req.body.name } : 'No body'
    });

    try {
      // Rate limiting for signup (3 attempts per 15 minutes per IP)
      console.log('📋 SIGNUP: Checking rate limit...');
      const clientIP = getClientIP(req);
      const rateLimit = checkRateLimit(`signup-${clientIP}`, 3, 15 * 60 * 1000);
      if (!rateLimit.allowed) {
        console.log('⚠️ SIGNUP: Rate limit exceeded for IP:', clientIP);
        return res.status(429).json({ 
          error: 'Too many signup attempts. Please try again later.', 
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
        });
      }
      console.log('✅ SIGNUP: Rate limit passed');

      // Validate request body
      console.log('📋 SIGNUP: Validating request body...');
      const validatedData = signupSchema.parse(req.body);
      console.log('✅ SIGNUP: Request validation passed for:', validatedData.email);
      
      // Check if user already exists
      console.log('📋 SIGNUP: Checking if user exists...');
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        console.log('⚠️ SIGNUP: User already exists:', validatedData.email);
        return res.status(409).json({ error: 'User with this email already exists' });
      }
      console.log('✅ SIGNUP: User does not exist, proceeding');

      // Hash password with reduced salt rounds for better performance
      console.log('📋 SIGNUP: Hashing password...');
      const saltRounds = 10; // Reduced from 12 for better performance
      const hashedPassword = await bcrypt.hash(validatedData.password, saltRounds);
      console.log('✅ SIGNUP: Password hashed successfully');

      // Create user
      console.log('📋 SIGNUP: Creating user...');
      const userData = {
        name: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone || null,
        password: hashedPassword
      };

      const user = await storage.createUser(userData);
      console.log('✅ SIGNUP: User created successfully:', { id: user.id, email: user.email });
      
      // Generate JWT token
      console.log('📋 SIGNUP: Generating JWT token...');
      const token = generateToken(user.id);
      console.log('✅ SIGNUP: JWT token generated');

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

      const endTime = Date.now();
      console.log('🎉 SIGNUP SUCCESS:', {
        duration: `${endTime - startTime}ms`,
        userId: user.id,
        email: user.email,
        timestamp: new Date().toISOString()
      });

      return res.status(201).json(authResponse);
    } catch (error: any) {
      const endTime = Date.now();
      console.error('❌ SIGNUP ERROR:', {
        duration: `${endTime - startTime}ms`,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        type: error.name
      });
      
      if (error.name === 'ZodError') {
        console.log('📋 SIGNUP: Zod validation error details:', error.errors);
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: error.errors 
        });
      }
      
      return res.status(500).json({ error: 'Failed to create account' });
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
      const userId = req.userId!; // TypeScript assertion: userId is guaranteed to be set after requireAuth
      const user = await storage.getUser(userId);
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
      
      const { message, sessionId, files } = req.body;
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
        const userId = req.userId!; // TypeScript assertion: userId is guaranteed after requireAuth
        chatSession = await storage.createChatSession({ userId, status: 'active' });
      }

      // Get previous messages for context (last 10 messages)
      const previousMessages = chatSession ? 
        (await storage.listMessagesBySession(chatSession.id)).slice(-10) : [];

      // Get user's health profile to check for missing information
      let healthProfile;
      try {
        healthProfile = await storage.getHealthProfile(userId!);
      } catch (e) {
        console.log('No health profile found for user');
      }

      // Build health profile context for AI
      const missingFields: string[] = [];
      const completedFields: string[] = [];
      
      // Helper to check if a value is missing (null, undefined, or empty string)
      const isMissing = (value: any): boolean => {
        return value === null || value === undefined || value === '';
      };
      
      if (healthProfile) {
        // Check basic info
        if (!isMissing(healthProfile.age)) completedFields.push('age');
        else missingFields.push('age');
        
        if (!isMissing(healthProfile.sex)) completedFields.push('sex');
        else missingFields.push('sex');
        
        if (!isMissing(healthProfile.heightCm)) completedFields.push('height');
        else missingFields.push('height');
        
        if (!isMissing(healthProfile.weightKg)) completedFields.push('weight');
        else missingFields.push('weight');
        
        // Check vital signs
        if (!isMissing(healthProfile.bloodPressureSystolic) && !isMissing(healthProfile.bloodPressureDiastolic)) {
          completedFields.push('blood pressure');
        } else {
          missingFields.push('blood pressure');
        }
        
        if (!isMissing(healthProfile.restingHeartRate)) completedFields.push('resting heart rate');
        else missingFields.push('resting heart rate');
        
        // Check lifestyle
        if (!isMissing(healthProfile.sleepHoursPerNight)) completedFields.push('sleep hours');
        else missingFields.push('sleep hours per night');
        
        if (!isMissing(healthProfile.exerciseDaysPerWeek)) completedFields.push('exercise frequency');
        else missingFields.push('exercise frequency');
        
        if (!isMissing(healthProfile.stressLevel)) completedFields.push('stress level');
        else missingFields.push('stress level (1-10)');
        
        // Check risk factors
        if (!isMissing(healthProfile.smokingStatus)) completedFields.push('smoking status');
        else missingFields.push('smoking status');
        
        if (!isMissing(healthProfile.alcoholDrinksPerWeek)) completedFields.push('alcohol consumption');
        else missingFields.push('alcohol consumption per week');
        
        // Check health conditions
        if (healthProfile.conditions && healthProfile.conditions.length > 0) {
          completedFields.push(`health conditions (${healthProfile.conditions.join(', ')})`);
        } else {
          missingFields.push('current health conditions or concerns');
        }
        
        if (healthProfile.medications && healthProfile.medications.length > 0) {
          completedFields.push(`medications (${healthProfile.medications.join(', ')})`);
        } else {
          missingFields.push('current medications');
        }
        
        if (healthProfile.allergies && healthProfile.allergies.length > 0) {
          completedFields.push(`allergies (${healthProfile.allergies.join(', ')})`);
        } else {
          missingFields.push('allergies');
        }
      } else {
        // No health profile at all
        missingFields.push('age', 'sex', 'height', 'weight', 'blood pressure', 'resting heart rate', 
          'sleep hours per night', 'exercise frequency', 'stress level (1-10)', 'smoking status', 
          'alcohol consumption per week', 'current health conditions or concerns', 'current medications', 'allergies');
      }

      // Fetch user's lab reports with extracted data
      const labReports = await storage.getLabReportsByUser(userId!);
      const labDataContext = labReports
        .filter(report => report.labReportData?.analysisStatus === 'completed' && report.labReportData?.extractedData)
        .map(report => {
          const data = report.labReportData!;
          const values = data.extractedData as any[];
          const formattedValues = values.map(v => 
            `${v.testName}: ${v.value} ${v.unit || ''} (${v.status || 'normal'}${v.referenceRange ? `, ref: ${v.referenceRange}` : ''})`
          ).join(', ');
          return `Lab Report from ${data.testDate || 'unknown date'} (${data.labName || 'unknown lab'}): ${formattedValues}`;
        })
        .join('\n');

      const healthContextMessage = `
=== USER'S CURRENT HEALTH PROFILE STATUS ===

Information we have: ${completedFields.length > 0 ? completedFields.join(', ') : 'None yet'}

Information still needed: ${missingFields.length > 0 ? missingFields.join(', ') : 'Complete!'}

${labDataContext ? `=== LABORATORY TEST RESULTS ===
${labDataContext}

USE THIS LAB DATA: When creating supplement recommendations, consider these test results. If values are out of range, address them with targeted supplementation.
` : ''}
INSTRUCTIONS FOR GATHERING MISSING INFORMATION:
- Naturally weave requests for missing information into the conversation
- Don't ask for all missing items at once - prioritize the most important ones first
- If the user doesn't know or doesn't want to provide certain information, that's okay - leave it blank
- Priority order: medications > health conditions > age/sex/height/weight > vital signs > lifestyle factors
- Always extract and save any health data the user provides in the health-data JSON block
`;

      // Build conversation history with file context
      let messageWithFileContext = message;
      if (files && files.length > 0) {
        const fileDescriptions = files.map((file: any) => `${file.name} (${file.type})`).join(', ');
        messageWithFileContext = `[User has attached files: ${fileDescriptions}] ${message}`;
      }

      const conversationHistory: Array<{role: 'system' | 'user' | 'assistant', content: string}> = [
        { role: 'system', content: ONES_AI_SYSTEM_PROMPT + healthContextMessage },
        ...previousMessages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        })),
        { role: 'user', content: messageWithFileContext }
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
            model: 'gpt-3.5-turbo', // Using GPT-3.5-turbo as it's widely accessible without organization verification
            messages: conversationHistory,
            stream: true,
            max_completion_tokens: 2000,
            temperature: 0.7
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
          
          // Remove the formula JSON block from fullResponse before displaying to user
          // This keeps the conversational response clean while still extracting the data
          fullResponse = fullResponse.replace(/```json\s*{[\s\S]*?}\s*```\s*/g, '').trim();
        }
      } catch (e) {
        console.log('No valid formula JSON found in response');
      }

      // Extract health data from response if present
      let healthDataUpdated = false;
      try {
        const healthDataMatch = fullResponse.match(/```health-data\s*({[\s\S]*?})\s*```/);
        if (healthDataMatch && userId) {
          const healthData = JSON.parse(healthDataMatch[1]);
          console.log('Extracted health data from AI response:', healthData);
          
          // Get existing health profile to merge with new data
          const existingProfile = await storage.getHealthProfile(userId);
          
          // Merge with existing data (new data takes precedence)
          const mergedData = {
            age: healthData.age ?? existingProfile?.age,
            sex: healthData.sex ?? existingProfile?.sex,
            heightCm: healthData.heightCm ?? existingProfile?.heightCm,
            weightKg: healthData.weightKg ?? existingProfile?.weightKg,
            bloodPressureSystolic: healthData.bloodPressureSystolic ?? existingProfile?.bloodPressureSystolic,
            bloodPressureDiastolic: healthData.bloodPressureDiastolic ?? existingProfile?.bloodPressureDiastolic,
            restingHeartRate: healthData.restingHeartRate ?? existingProfile?.restingHeartRate,
            sleepHoursPerNight: healthData.sleepHoursPerNight ?? existingProfile?.sleepHoursPerNight,
            exerciseDaysPerWeek: healthData.exerciseDaysPerWeek ?? existingProfile?.exerciseDaysPerWeek,
            stressLevel: healthData.stressLevel ?? existingProfile?.stressLevel,
            smokingStatus: healthData.smokingStatus ?? existingProfile?.smokingStatus,
            alcoholDrinksPerWeek: healthData.alcoholDrinksPerWeek ?? existingProfile?.alcoholDrinksPerWeek,
            conditions: healthData.conditions ?? existingProfile?.conditions,
            medications: healthData.medications ?? existingProfile?.medications,
            allergies: healthData.allergies ?? existingProfile?.allergies,
          };
          
          // Validate merged data against schema before persisting
          const validatedData = insertHealthProfileSchema.omit({ userId: true }).parse(mergedData);
          
          // Update or create health profile
          if (existingProfile) {
            await storage.updateHealthProfile(userId, validatedData);
          } else {
            await storage.createHealthProfile({
              userId,
              ...validatedData
            });
          }
          
          console.log('Health profile automatically updated from AI conversation');
          healthDataUpdated = true;
          
          // Remove the health-data block from fullResponse before saving
          fullResponse = fullResponse.replace(/```health-data\s*{[\s\S]*?}\s*```\s*/g, '').trim();
        }
      } catch (e) {
        console.log('No valid health data found in response or error updating profile:', e);
      }

      // Save extracted formula to storage if valid
      let savedFormula = null;
      if (extractedFormula && chatSession && userId) {
        try {
          // CRITICAL: Validate all ingredients against approved catalog
          // Validate base formulas
          for (const base of extractedFormula.bases) {
            if (!APPROVED_BASE_FORMULAS.has(base.name)) {
              console.error(`VALIDATION ERROR: Unapproved base formula "${base.name}" detected in AI response`);
              throw new Error(`The ingredient "${base.name}" is not in our approved catalog. Please use only approved base formulas.`);
            }
          }
          
          // Validate individual ingredients
          for (const addition of extractedFormula.additions) {
            if (!APPROVED_INDIVIDUAL_INGREDIENTS.has(addition.name)) {
              console.error(`VALIDATION ERROR: Unapproved ingredient "${addition.name}" detected in AI response`);
              throw new Error(`The ingredient "${addition.name}" is not in our approved catalog. Please use only approved individual ingredients.`);
            }
          }
          
          // Get current formula to determine next version number
          const currentFormula = await storage.getCurrentFormulaByUser(userId);
          const nextVersion = currentFormula ? currentFormula.version + 1 : 1;
          
          // Convert formula to storage format
          const formulaData = {
            userId,
            bases: extractedFormula.bases.map((b: any) => ({
              ingredient: b.name,
              amount: parseDoseToMg(b.dose, b.name),
              unit: 'mg',
              purpose: b.purpose
            })),
            additions: extractedFormula.additions.map((a: any) => ({
              ingredient: a.name,
              amount: parseDoseToMg(a.dose, a.name),
              unit: 'mg',
              purpose: a.purpose
            })),
            totalMg: extractedFormula.totalMg,
            rationale: extractedFormula.rationale,
            warnings: extractedFormula.warnings || [],
            disclaimers: extractedFormula.disclaimers || [],
            version: nextVersion
          };
          
          savedFormula = await storage.createFormula(formulaData);
          console.log(`Formula v${nextVersion} saved successfully for user ${userId}`);
        } catch (formulaSaveError) {
          console.error('Error saving formula:', formulaSaveError);
          // Don't throw - just log the error and continue without saving invalid formula
        }
      }
      
      // Send health data update notification if applicable
      if (healthDataUpdated) {
        sendSSE({
          type: 'health_data_updated',
          message: "✓ We've updated your health profile based on the information you provided.",
          sessionId: chatSession?.id
        });
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
      const userId = req.userId!; // TypeScript assertion: userId guaranteed after requireAuth
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
      const userId = req.userId!; // TypeScript assertion: userId guaranteed after requireAuth

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
      const userId = req.userId!; // TypeScript assertion: userId guaranteed after requireAuth
      const sessions = await storage.listChatSessionsByUser(userId);
      
      res.json(sessions);
    } catch (error) {
      console.error('List chat sessions error:', error);
      res.status(500).json({ error: 'Failed to list chat sessions' });
    }
  });

  // Get consultation history with enriched data
  app.get('/api/consultations/history', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const sessions = await storage.listChatSessionsByUser(userId);
      
      // Build messages map for all sessions
      const messagesMap: Record<string, any[]> = {};
      
      // Enrich each session with additional data
      const enrichedSessions = await Promise.all(sessions.map(async (session) => {
        const messages = await storage.listMessagesBySession(session.id);
        
        // Store messages in map for frontend
        messagesMap[session.id] = messages;
        
        const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
        const hasFormula = messages.some(msg => msg.content?.includes('"bases":') || msg.content?.includes('"additions":'));
        
        return {
          id: session.id,
          title: `Consultation ${new Date(session.createdAt).toLocaleDateString()}`,
          lastMessage: lastMessage ? lastMessage.content.substring(0, 100) : 'No messages',
          timestamp: session.createdAt,
          messageCount: messages.length,
          hasFormula,
          status: session.status
        };
      }));
      
      res.json({ sessions: enrichedSessions, messages: messagesMap });
    } catch (error) {
      console.error('Get consultation history error:', error);
      res.status(500).json({ error: 'Failed to get consultation history' });
    }
  });

  // Delete consultation session
  app.delete('/api/consultations/:sessionId', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const sessionId = req.params.sessionId;
      
      // Verify session belongs to user
      const session = await storage.getChatSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      if (session.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Delete the session (this should cascade delete messages)
      await storage.deleteChatSession(sessionId);
      
      res.json({ success: true, sessionId });
    } catch (error) {
      console.error('Delete consultation error:', error);
      res.status(500).json({ error: 'Failed to delete consultation' });
    }
  });

  // Get dashboard data
  app.get('/api/dashboard', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!; // TypeScript assertion: userId guaranteed after requireAuth
      
      // Fetch all dashboard data in parallel
      const [currentFormula, healthProfile, chatSessions, orders, subscription] = await Promise.all([
        storage.getCurrentFormulaByUser(userId),
        storage.getHealthProfile(userId),
        storage.listChatSessionsByUser(userId),
        storage.listOrdersByUser(userId),
        storage.getSubscription(userId)
      ]);

      // Calculate metrics
      const totalConsultations = chatSessions.length;
      const recentSessions = chatSessions.slice(0, 3);
      const recentOrders = orders.slice(0, 5);
      
      // Calculate days since user joined (using oldest chat session or current date)
      const oldestSession = chatSessions.length > 0 ? 
        Math.min(...chatSessions.map(s => s.createdAt.getTime())) : Date.now();
      const daysActive = Math.floor((Date.now() - oldestSession) / (1000 * 60 * 60 * 24));
      
      // Comprehensive Health Score Calculation (0-100)
      let healthScore = 0;
      const scoreBreakdown: Record<string, {score: number, max: number, status: string}> = {};
      
      // 1. BMI Score (20 points max)
      if (healthProfile?.weightKg && healthProfile?.heightCm) {
        const heightM = healthProfile.heightCm / 100;
        const bmi = healthProfile.weightKg / (heightM * heightM);
        let bmiScore = 0;
        let bmiStatus = '';
        
        if (bmi >= 18.5 && bmi <= 24.9) {
          bmiScore = 20;
          bmiStatus = 'Healthy weight';
        } else if ((bmi >= 17 && bmi < 18.5) || (bmi >= 25 && bmi <= 29.9)) {
          bmiScore = 15;
          bmiStatus = bmi < 18.5 ? 'Slightly underweight' : 'Slightly overweight';
        } else if ((bmi >= 15 && bmi < 17) || (bmi >= 30 && bmi <= 34.9)) {
          bmiScore = 10;
          bmiStatus = bmi < 17 ? 'Underweight' : 'Overweight';
        } else {
          bmiScore = 5;
          bmiStatus = bmi < 15 ? 'Severely underweight' : 'Obese';
        }
        
        healthScore += bmiScore;
        scoreBreakdown['bmi'] = { score: bmiScore, max: 20, status: `${bmi.toFixed(1)} - ${bmiStatus}` };
      }
      
      // 2. Blood Pressure Score (20 points max)
      if (healthProfile?.bloodPressureSystolic && healthProfile?.bloodPressureDiastolic) {
        const sys = healthProfile.bloodPressureSystolic;
        const dia = healthProfile.bloodPressureDiastolic;
        let bpScore = 0;
        let bpStatus = '';
        
        if (sys < 120 && dia < 80) {
          bpScore = 20;
          bpStatus = 'Optimal';
        } else if (sys >= 120 && sys <= 129 && dia < 80) {
          bpScore = 15;
          bpStatus = 'Elevated';
        } else if ((sys >= 130 && sys <= 139) || (dia >= 80 && dia <= 89)) {
          bpScore = 10;
          bpStatus = 'Stage 1 Hypertension';
        } else {
          bpScore = 5;
          bpStatus = 'Stage 2+ Hypertension';
        }
        
        healthScore += bpScore;
        scoreBreakdown['bloodPressure'] = { score: bpScore, max: 20, status: `${sys}/${dia} - ${bpStatus}` };
      }
      
      // 3. Lifestyle Factors (30 points max)
      let lifestyleScore = 0;
      
      // Sleep (10 points)
      if (healthProfile?.sleepHoursPerNight) {
        const sleep = healthProfile.sleepHoursPerNight;
        let sleepScore = 0;
        if (sleep >= 7 && sleep <= 9) sleepScore = 10;
        else if (sleep === 6 || sleep === 10) sleepScore = 7;
        else sleepScore = 3;
        lifestyleScore += sleepScore;
        scoreBreakdown['sleep'] = { score: sleepScore, max: 10, status: `${sleep} hours/night` };
      }
      
      // Exercise (10 points)
      if (healthProfile?.exerciseDaysPerWeek !== null && healthProfile?.exerciseDaysPerWeek !== undefined) {
        const exercise = healthProfile.exerciseDaysPerWeek;
        let exerciseScore = 0;
        if (exercise >= 5) exerciseScore = 10;
        else if (exercise >= 3) exerciseScore = 7;
        else if (exercise >= 1) exerciseScore = 4;
        else exerciseScore = 0;
        lifestyleScore += exerciseScore;
        scoreBreakdown['exercise'] = { score: exerciseScore, max: 10, status: `${exercise} days/week` };
      }
      
      // Stress Level (10 points)
      if (healthProfile?.stressLevel) {
        const stress = healthProfile.stressLevel;
        let stressScore = 0;
        if (stress >= 1 && stress <= 3) stressScore = 10;
        else if (stress >= 4 && stress <= 6) stressScore = 7;
        else stressScore = 3;
        lifestyleScore += stressScore;
        scoreBreakdown['stress'] = { score: stressScore, max: 10, status: `Level ${stress}/10` };
      }
      
      healthScore += lifestyleScore;
      
      // 4. Risk Factors (15 points max)
      let riskScore = 0;
      
      // Smoking (10 points)
      if (healthProfile?.smokingStatus) {
        const smoking = healthProfile.smokingStatus;
        let smokingScore = 0;
        if (smoking === 'never') smokingScore = 10;
        else if (smoking === 'former') smokingScore = 7;
        else smokingScore = 0;
        riskScore += smokingScore;
        scoreBreakdown['smoking'] = { score: smokingScore, max: 10, status: smoking.charAt(0).toUpperCase() + smoking.slice(1) };
      }
      
      // Alcohol (5 points)
      if (healthProfile?.alcoholDrinksPerWeek !== null && healthProfile?.alcoholDrinksPerWeek !== undefined) {
        const drinks = healthProfile.alcoholDrinksPerWeek;
        let alcoholScore = 0;
        if (drinks <= 7) alcoholScore = 5;
        else if (drinks <= 14) alcoholScore = 3;
        else alcoholScore = 0;
        riskScore += alcoholScore;
        scoreBreakdown['alcohol'] = { score: alcoholScore, max: 5, status: `${drinks} drinks/week` };
      }
      
      healthScore += riskScore;
      
      // 5. Heart Health (10 points max)
      if (healthProfile?.restingHeartRate) {
        const hr = healthProfile.restingHeartRate;
        let hrScore = 0;
        let hrStatus = '';
        if (hr >= 60 && hr <= 80) {
          hrScore = 10;
          hrStatus = 'Excellent';
        } else if ((hr >= 50 && hr < 60) || (hr > 80 && hr <= 90)) {
          hrScore = 7;
          hrStatus = 'Good';
        } else {
          hrScore = 3;
          hrStatus = 'Needs attention';
        }
        healthScore += hrScore;
        scoreBreakdown['heartRate'] = { score: hrScore, max: 10, status: `${hr} bpm - ${hrStatus}` };
      }
      
      // 6. Data Completeness Bonus (5 points)
      const fieldsProvided = [
        healthProfile?.age,
        healthProfile?.weightKg,
        healthProfile?.heightCm,
        healthProfile?.bloodPressureSystolic,
        healthProfile?.sleepHoursPerNight,
        healthProfile?.exerciseDaysPerWeek,
        healthProfile?.stressLevel,
        healthProfile?.smokingStatus,
        healthProfile?.alcoholDrinksPerWeek,
        healthProfile?.restingHeartRate
      ].filter(v => v !== null && v !== undefined).length;
      
      const completenessScore = Math.floor((fieldsProvided / 10) * 5);
      healthScore += completenessScore;
      scoreBreakdown['completeness'] = { 
        score: completenessScore, 
        max: 5, 
        status: `${fieldsProvided}/10 fields complete` 
      };
      
      // Cap at 100
      healthScore = Math.min(Math.round(healthScore), 100);

      // Get recent activity
      const recentActivity: Array<{
        id: string;
        type: string;
        title: string;
        description: string;
        time: string;
        icon: string;
      }> = [];
      
      // Add recent orders
      recentOrders.slice(0, 3).forEach(order => {
        recentActivity.push({
          id: `order-${order.id}`,
          type: 'order',
          title: `Order ${order.status === 'delivered' ? 'Delivered' : order.status === 'shipped' ? 'Shipped' : 'Placed'}`,
          description: `Formula v${order.formulaVersion} - ${order.status}`,
          time: order.placedAt.toISOString(),
          icon: 'Package'
        });
      });

      // Add recent consultations
      recentSessions.slice(0, 3).forEach(session => {
        recentActivity.push({
          id: `session-${session.id}`,
          type: 'consultation',
          title: 'AI Consultation',
          description: `Session ${session.status}`,
          time: session.createdAt.toISOString(),
          icon: 'MessageSquare'
        });
      });

      // Sort by time and limit
      recentActivity.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

      // Next delivery calculation
      const nextDelivery = subscription?.renewsAt || null;

      const dashboardData = {
        metrics: {
          healthScore,
          healthScoreBreakdown: scoreBreakdown,
          formulaVersion: currentFormula?.version || 0,
          consultationsSessions: totalConsultations,
          daysActive: Math.max(daysActive, 0),
          nextDelivery: nextDelivery ? nextDelivery.toISOString().split('T')[0] : null
        },
        currentFormula,
        healthProfile,
        recentActivity: recentActivity.slice(0, 6),
        subscription,
        hasActiveFormula: !!currentFormula,
        isNewUser: !currentFormula && totalConsultations === 0
      };

      res.json(dashboardData);
    } catch (error) {
      console.error('Get dashboard data error:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
  });

  // Get user's current formula
  app.get('/api/users/me/formula', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!; // TypeScript assertion: userId guaranteed after requireAuth
      const currentFormula = await storage.getCurrentFormulaByUser(userId);
      
      if (!currentFormula) {
        return res.status(404).json({ error: 'No formula found' });
      }

      res.json(currentFormula);
    } catch (error) {
      console.error('Get current formula error:', error);
      res.status(500).json({ error: 'Failed to fetch formula' });
    }
  });

  // Get user's health profile
  app.get('/api/users/me/health-profile', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!; // TypeScript assertion: userId guaranteed after requireAuth
      const healthProfile = await storage.getHealthProfile(userId);
      
      if (!healthProfile) {
        return res.status(404).json({ error: 'No health profile found' });
      }

      res.json(healthProfile);
    } catch (error) {
      console.error('Get health profile error:', error);
      res.status(500).json({ error: 'Failed to fetch health profile' });
    }
  });

  // Create or update health profile
  app.post('/api/users/me/health-profile', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!; // TypeScript assertion: userId guaranteed after requireAuth
      
      // Validate request body with proper Zod schema
      const healthProfileUpdate = insertHealthProfileSchema.omit({ userId: true }).parse({
        age: req.body.age,
        sex: req.body.sex,
        weightKg: req.body.weightKg,
        heightCm: req.body.heightCm,
        bloodPressureSystolic: req.body.bloodPressureSystolic,
        bloodPressureDiastolic: req.body.bloodPressureDiastolic,
        restingHeartRate: req.body.restingHeartRate,
        sleepHoursPerNight: req.body.sleepHoursPerNight,
        exerciseDaysPerWeek: req.body.exerciseDaysPerWeek,
        stressLevel: req.body.stressLevel,
        smokingStatus: req.body.smokingStatus,
        alcoholDrinksPerWeek: req.body.alcoholDrinksPerWeek,
        conditions: req.body.conditions,
        medications: req.body.medications,
        allergies: req.body.allergies
      });

      // Check if profile exists
      const existingProfile = await storage.getHealthProfile(userId);
      
      let healthProfile;
      if (existingProfile) {
        healthProfile = await storage.updateHealthProfile(userId, healthProfileUpdate);
      } else {
        healthProfile = await storage.createHealthProfile({
          userId,
          ...healthProfileUpdate
        });
      }

      res.json(healthProfile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid health profile data', 
          details: error.errors 
        });
      }
      console.error('Save health profile error:', error);
      res.status(500).json({ error: 'Failed to save health profile' });
    }
  });

  // Get user's orders
  app.get('/api/users/me/orders', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!; // TypeScript assertion: userId guaranteed after requireAuth
      const orders = await storage.listOrdersByUser(userId);
      
      res.json(orders);
    } catch (error) {
      console.error('Get orders error:', error);
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  });

  // Get user's subscription
  app.get('/api/users/me/subscription', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!; // TypeScript assertion: userId guaranteed after requireAuth
      const subscription = await storage.getSubscription(userId);
      
      if (!subscription) {
        return res.status(404).json({ error: 'No subscription found' });
      }

      res.json(subscription);
    } catch (error) {
      console.error('Get subscription error:', error);
      res.status(500).json({ error: 'Failed to fetch subscription' });
    }
  });

  // Update user's subscription (pause, resume, cancel, change plan)
  app.patch('/api/users/me/subscription', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!; // TypeScript assertion: userId guaranteed after requireAuth
      const { status, plan, pausedUntil } = req.body;
      
      // Validate allowed updates
      const allowedUpdates: any = {};
      if (status && ['active', 'paused', 'cancelled'].includes(status)) {
        allowedUpdates.status = status;
      }
      if (plan && ['monthly', 'quarterly', 'annual'].includes(plan)) {
        allowedUpdates.plan = plan;
      }
      if (pausedUntil) {
        allowedUpdates.pausedUntil = new Date(pausedUntil);
      }
      
      const updatedSubscription = await storage.updateSubscription(userId, allowedUpdates);
      
      if (!updatedSubscription) {
        return res.status(404).json({ error: 'Subscription not found' });
      }

      res.json(updatedSubscription);
    } catch (error) {
      console.error('Update subscription error:', error);
      res.status(500).json({ error: 'Failed to update subscription' });
    }
  });

  // Get user's payment methods
  app.get('/api/users/me/payment-methods', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!; // TypeScript assertion: userId guaranteed after requireAuth
      const paymentMethods = await storage.listPaymentMethodsByUser(userId);
      
      res.json(paymentMethods);
    } catch (error) {
      console.error('Get payment methods error:', error);
      res.status(500).json({ error: 'Failed to fetch payment methods' });
    }
  });

  // Add new payment method
  app.post('/api/users/me/payment-methods', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!; // TypeScript assertion: userId guaranteed after requireAuth
      const { stripePaymentMethodId, brand, last4 } = req.body;
      
      if (!stripePaymentMethodId || !brand || !last4) {
        return res.status(400).json({ error: 'Missing required payment method data' });
      }
      
      const paymentMethod = await storage.createPaymentMethodRef({
        userId,
        stripePaymentMethodId,
        brand,
        last4
      });
      
      res.json(paymentMethod);
    } catch (error) {
      console.error('Add payment method error:', error);
      res.status(500).json({ error: 'Failed to add payment method' });
    }
  });

  // Delete payment method
  app.delete('/api/users/me/payment-methods/:id', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!; // TypeScript assertion: userId guaranteed after requireAuth
      const paymentMethodId = req.params.id;
      
      // Verify the payment method belongs to the user
      const paymentMethod = await storage.getPaymentMethodRef(paymentMethodId);
      if (!paymentMethod || paymentMethod.userId !== userId) {
        return res.status(404).json({ error: 'Payment method not found' });
      }
      
      const deleted = await storage.deletePaymentMethodRef(paymentMethodId);
      
      if (!deleted) {
        return res.status(400).json({ error: 'Failed to delete payment method' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Delete payment method error:', error);
      res.status(500).json({ error: 'Failed to delete payment method' });
    }
  });

  // Get user's billing history
  app.get('/api/users/me/billing-history', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!; // TypeScript assertion: userId guaranteed after requireAuth
      
      // Get orders as billing history for now (can be enhanced with separate billing table later)
      const orders = await storage.listOrdersByUser(userId);
      
      // Transform orders into billing format
      const billingHistory = orders
        .filter(order => order.status === 'delivered') // Only include completed orders
        .map(order => ({
          id: order.id,
          date: order.placedAt,
          description: `Supplement Order - Formula v${order.formulaVersion}`,
          amount: 89.99, // TODO: Add actual price to Order schema
          status: 'paid',
          invoiceUrl: `/api/invoices/${order.id}` // Placeholder for future invoice generation
        }));
      
      res.json(billingHistory);
    } catch (error) {
      console.error('Get billing history error:', error);
      res.status(500).json({ error: 'Failed to fetch billing history' });
    }
  });

  // Get consultation history (enhanced format for ConsultationPage)
  app.get('/api/consultations/history', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!; // TypeScript assertion: userId guaranteed after requireAuth
      
      // Fetch user's chat sessions
      const sessions = await storage.listChatSessionsByUser(userId);
      
      // Fetch messages for all sessions and organize them
      const messagesPromises = sessions.map(session => 
        storage.listMessagesBySession(session.id).then(messages => ({
          sessionId: session.id,
          messages
        }))
      );
      
      const sessionMessages = await Promise.all(messagesPromises);
      
      // Organize messages by session ID
      const messagesMap: Record<string, any[]> = {};
      sessionMessages.forEach(({ sessionId, messages }) => {
        messagesMap[sessionId] = messages.map(msg => ({
          id: msg.id,
          content: msg.content,
          sender: msg.role === 'assistant' ? 'ai' : 'user',
          timestamp: msg.createdAt,
          sessionId: msg.sessionId
          // Note: file attachments and formula data not currently stored in messages schema
          // These features can be implemented by extending the messages table in the future
        }));
      });

      // Enhance sessions with metadata for frontend
      const enhancedSessions = sessions.map(session => {
        const sessionMsgs = messagesMap[session.id] || [];
        const lastMessage = sessionMsgs[sessionMsgs.length - 1];
        const hasFormula = sessionMsgs.some(msg => msg.formula);
        
        return {
          id: session.id,
          title: `Consultation ${new Date(session.createdAt).toLocaleDateString()}`,
          lastMessage: lastMessage?.content?.substring(0, 100) + '...' || 'New consultation',
          timestamp: session.createdAt,
          messageCount: sessionMsgs.length,
          hasFormula,
          status: session.status
        };
      });

      // Sort sessions by most recent first
      enhancedSessions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      res.json({
        sessions: enhancedSessions,
        messages: messagesMap
      });
    } catch (error) {
      console.error('Get consultation history error:', error);
      res.status(500).json({ error: 'Failed to fetch consultation history' });
    }
  });

  // Grant user consent for HIPAA-compliant operations
  app.post('/api/consents/grant', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const { consentType, consentVersion, consentText } = req.body;
      
      // Validate consent type
      const validConsentTypes = ['lab_data_processing', 'ai_analysis', 'data_retention', 'third_party_sharing'];
      if (!validConsentTypes.includes(consentType)) {
        return res.status(400).json({ error: 'Invalid consent type' });
      }
      
      // Get audit information
      const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];
      
      // Create consent record
      const consent = await storage.createUserConsent({
        userId,
        consentType,
        granted: true,
        grantedAt: new Date(),
        consentVersion: consentVersion || '1.0',
        ipAddress,
        userAgent,
        consentText: consentText || `User consents to ${consentType}`,
        metadata: {
          source: 'upload_form'
        }
      });
      
      console.log("HIPAA AUDIT LOG - Consent Granted:", {
        timestamp: new Date().toISOString(),
        userId,
        consentType,
        ipAddress,
        userAgent
      });
      
      res.json({ success: true, consent });
    } catch (error) {
      console.error('Consent grant error:', error);
      res.status(500).json({ error: 'Failed to grant consent' });
    }
  });

  // Get user's uploaded files
  app.get('/api/files/user/:userId/:type', requireAuth, async (req, res) => {
    const { userId, type } = req.params;
    const requestingUserId = req.userId!;

    // Users can only access their own files
    if (userId !== requestingUserId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
      const fileType = type === 'lab-reports' ? 'lab_report' : undefined;
      const files = await storage.listFileUploadsByUser(userId, fileType, false);
      res.json(files);
    } catch (error) {
      console.error('Error fetching files:', error);
      res.status(500).json({ error: 'Failed to fetch files' });
    }
  });

  // HIPAA-compliant file upload endpoint with full audit logging and consent enforcement
  app.post('/api/files/upload', requireAuth, async (req, res) => {
    const userId = req.userId!;
    const auditInfo = {
      ipAddress: req.ip || req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
      userAgent: req.headers['user-agent']
    };

    try {
      // Check if file was uploaded
      if (!req.files || !req.files.file) {
        // Log failed upload attempt
        console.warn("HIPAA AUDIT LOG - Failed Upload Attempt:", {
          timestamp: new Date().toISOString(),
          userId,
          action: 'write',
          objectPath: 'upload-attempt',
          ipAddress: auditInfo.ipAddress,
          userAgent: auditInfo.userAgent,
          success: false,
          reason: 'No file uploaded'
        });
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const uploadedFile = Array.isArray(req.files.file) ? req.files.file[0] : req.files.file;
      
      // File validation with HIPAA audit logging
      const maxSizeBytes = 10 * 1024 * 1024; // 10MB limit
      const allowedMimeTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.txt', '.doc', '.docx'];

      if (uploadedFile.size > maxSizeBytes) {
        console.warn("HIPAA AUDIT LOG - File Too Large:", {
          timestamp: new Date().toISOString(),
          userId,
          action: 'write',
          objectPath: uploadedFile.name,
          ipAddress: auditInfo.ipAddress,
          userAgent: auditInfo.userAgent,
          success: false,
          reason: `File too large: ${uploadedFile.size} bytes (max: ${maxSizeBytes})`
        });
        return res.status(400).json({ 
          error: 'File too large. Maximum size is 10MB.' 
        });
      }

      if (!allowedMimeTypes.includes(uploadedFile.mimetype)) {
        console.warn("HIPAA AUDIT LOG - Invalid File Type:", {
          timestamp: new Date().toISOString(),
          userId,
          action: 'write',
          objectPath: uploadedFile.name,
          ipAddress: auditInfo.ipAddress,
          userAgent: auditInfo.userAgent,
          success: false,
          reason: `Invalid MIME type: ${uploadedFile.mimetype}`
        });
        return res.status(400).json({ 
          error: 'Invalid file type. Only PDF, JPG, PNG, TXT, DOC, and DOCX files are allowed.' 
        });
      }

      const fileName = uploadedFile.name.toLowerCase();
      const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
      if (!hasValidExtension) {
        console.warn("HIPAA AUDIT LOG - Invalid File Extension:", {
          timestamp: new Date().toISOString(),
          userId,
          action: 'write',
          objectPath: uploadedFile.name,
          ipAddress: auditInfo.ipAddress,
          userAgent: auditInfo.userAgent,
          success: false,
          reason: `Invalid file extension for: ${fileName}`
        });
        return res.status(400).json({ 
          error: 'Invalid file extension. Only .pdf, .jpg, .jpeg, .png, .txt, .doc, and .docx files are allowed.' 
        });
      }

      // Determine file type category for HIPAA compliance
      let fileType: 'lab_report' | 'medical_document' | 'prescription' | 'other' = 'other';
      const labKeywords = ['lab', 'blood', 'test', 'cbc', 'panel', 'result', 'report', 'analysis', 'metabolic', 'lipid', 'thyroid', 'vitamin', 'serum', 'urine', 'specimen'];
      const fileNameLower = fileName.toLowerCase();
      
      if (labKeywords.some(keyword => fileNameLower.includes(keyword))) {
        fileType = 'lab_report';
      } else if (fileName.includes('prescription') || fileName.includes('rx')) {
        fileType = 'prescription';  
      } else if (allowedMimeTypes.slice(0, 4).includes(uploadedFile.mimetype)) {
        fileType = 'medical_document';
      }

      // Use HIPAA-compliant ObjectStorageService for secure upload
      const objectStorageService = new ObjectStorageService();
      
      // Get secure upload URL with consent enforcement and audit logging
      const uploadUrl = await objectStorageService.getLabReportUploadURL(
        userId, 
        uploadedFile.name,
        auditInfo
      );

      // Upload file using the secure signed URL
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: uploadedFile.data,
        headers: {
          'Content-Type': uploadedFile.mimetype,
          'Content-Length': uploadedFile.size.toString()
        }
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status: ${response.status}`);
      }

      // Set HIPAA-compliant ACL policy for the uploaded file
      const normalizedPath = await objectStorageService.setLabReportAclPolicy(
        uploadUrl,
        userId,
        uploadedFile.name,
        fileType,
        auditInfo
      );

      // Save file metadata to storage with HIPAA compliance fields
      const fileUpload = await storage.createFileUpload({
        userId,
        type: fileType,
        objectPath: normalizedPath,
        originalFileName: uploadedFile.name,
        fileSize: uploadedFile.size,
        mimeType: uploadedFile.mimetype,
        hipaaCompliant: true,
        encryptedAtRest: true,
        retentionPolicyId: '7_years' // Default 7-year retention for medical records
      });

      // Analyze lab reports automatically (PDF or images only)
      let labDataExtraction = null;
      if (fileType === 'lab_report' && (uploadedFile.mimetype === 'application/pdf' || uploadedFile.mimetype.startsWith('image/'))) {
        try {
          console.log(`Analyzing lab report: ${uploadedFile.name}`);
          labDataExtraction = await analyzeLabReport(normalizedPath, uploadedFile.mimetype, userId);
          
          // Update file upload with extracted lab data
          if (labDataExtraction && fileUpload.id) {
            await storage.updateFileUpload(fileUpload.id, {
              labReportData: {
                testDate: labDataExtraction.testDate,
                testType: labDataExtraction.testType,
                labName: labDataExtraction.labName,
                physicianName: labDataExtraction.physicianName,
                analysisStatus: 'completed',
                extractedData: labDataExtraction.extractedData || []
              }
            });
            console.log(`Lab data extracted successfully from ${uploadedFile.name}`);
          }
        } catch (error) {
          console.error('Lab report analysis failed:', error);
          // Update status to error but don't fail the upload
          if (fileUpload.id) {
            await storage.updateFileUpload(fileUpload.id, {
              labReportData: {
                analysisStatus: 'error'
              }
            });
          }
        }
      }

      // Log successful upload
      console.log("HIPAA AUDIT LOG - Successful Upload:", {
        timestamp: new Date().toISOString(),
        userId,
        action: 'write',
        objectPath: normalizedPath,
        ipAddress: auditInfo.ipAddress,
        userAgent: auditInfo.userAgent,
        success: true,
        reason: `Successfully uploaded ${fileType}: ${uploadedFile.name}`
      });

      // Return file metadata with lab data if extracted
      const responseData = {
        id: fileUpload.id,
        name: uploadedFile.name,
        url: normalizedPath,
        type: fileUpload.type,
        size: uploadedFile.size,
        uploadedAt: fileUpload.uploadedAt,
        hipaaCompliant: true,
        labData: labDataExtraction
      };

      res.json(responseData);
      
    } catch (error) {
      // Log failed upload with full error details
      console.error("HIPAA AUDIT LOG - Upload Error:", {
        timestamp: new Date().toISOString(),
        userId,
        action: 'write',
        objectPath: 'upload-error',
        ipAddress: auditInfo.ipAddress,
        userAgent: auditInfo.userAgent,
        success: false,
        reason: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });

      if (error instanceof Error && error.name === 'ConsentRequiredError') {
        return res.status(403).json({ 
          error: 'User consent required for file upload',
          details: error.message
        });
      }
      
      console.error('File upload error:', error);
      res.status(500).json({ error: 'Failed to upload file' });
    }
  });

  // Delete lab report with audit logging
  app.delete('/api/files/:fileId', requireAuth, async (req, res) => {
    const userId = req.userId!;
    const { fileId } = req.params;
    const auditInfo = {
      ipAddress: req.ip || req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
      userAgent: req.headers['user-agent']
    };

    try {
      // Verify file belongs to user
      const fileUpload = await storage.getFileUpload(fileId);
      
      if (!fileUpload) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      if (fileUpload.userId !== userId) {
        console.warn("HIPAA AUDIT LOG - Unauthorized Delete Attempt:", {
          timestamp: new Date().toISOString(),
          userId,
          fileId,
          action: 'delete',
          ipAddress: auditInfo.ipAddress,
          userAgent: auditInfo.userAgent,
          success: false,
          reason: 'User does not own this file'
        });
        return res.status(403).json({ error: 'Access denied' });
      }

      // Soft delete the file
      const deleted = await storage.softDeleteFileUpload(fileId, userId);
      
      if (!deleted) {
        throw new Error('Failed to delete file');
      }

      // Log successful deletion
      console.log("HIPAA AUDIT LOG - File Deleted:", {
        timestamp: new Date().toISOString(),
        userId,
        fileId,
        fileName: fileUpload.fileName,
        fileType: fileUpload.type,
        action: 'delete',
        ipAddress: auditInfo.ipAddress,
        userAgent: auditInfo.userAgent,
        success: true,
        reason: 'User requested file deletion'
      });

      res.json({ success: true, message: 'File deleted successfully' });
      
    } catch (error) {
      console.error("HIPAA AUDIT LOG - Delete Error:", {
        timestamp: new Date().toISOString(),
        userId,
        fileId,
        action: 'delete',
        ipAddress: auditInfo.ipAddress,
        userAgent: auditInfo.userAgent,
        success: false,
        reason: `Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      
      console.error('File delete error:', error);
      res.status(500).json({ error: 'Failed to delete file' });
    }
  });

  // ==================== FORMULA MANAGEMENT ENDPOINTS ====================

  // Get current active formula for user
  app.get('/api/users/me/formula/current', requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.userId!; // TypeScript assertion: userId guaranteed after requireAuth
      const currentFormula = await storage.getCurrentFormulaByUser(userId);
      
      if (!currentFormula) {
        return res.status(404).json({ error: 'No formula found for user' });
      }

      // Get the latest version changes for context
      const versionChanges = await storage.listFormulaVersionChanges(currentFormula.id);
      
      res.json({
        formula: currentFormula,
        versionChanges: versionChanges.slice(0, 1) // Latest change only
      });
    } catch (error) {
      console.error('Error fetching current formula:', error);
      res.status(500).json({ error: 'Failed to fetch current formula' });
    }
  });

  // Get formula version history for user
  app.get('/api/users/me/formula/history', requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.userId!; // TypeScript assertion: userId guaranteed after requireAuth
      const formulaHistory = await storage.getFormulaHistory(userId);
      
      // Enrich with version change information
      const enrichedHistory = await Promise.all(
        formulaHistory.map(async (formula) => {
          const changes = await storage.listFormulaVersionChanges(formula.id);
          return {
            ...formula,
            changes: changes[0] || null // Latest change for this version
          };
        })
      );
      
      res.json({ history: enrichedHistory });
    } catch (error) {
      console.error('Error fetching formula history:', error);
      res.status(500).json({ error: 'Failed to fetch formula history' });
    }
  });

  // Get specific formula version by ID
  app.get('/api/users/me/formula/versions/:formulaId', requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.userId!; // TypeScript assertion: userId guaranteed after requireAuth
      const formulaId = req.params.formulaId;
      
      const formula = await storage.getFormula(formulaId);
      
      if (!formula || formula.userId !== userId) {
        return res.status(404).json({ error: 'Formula not found or access denied' });
      }

      // Get version changes for this formula
      const versionChanges = await storage.listFormulaVersionChanges(formulaId);
      
      res.json({
        formula,
        versionChanges
      });
    } catch (error) {
      console.error('Error fetching formula version:', error);
      res.status(500).json({ error: 'Failed to fetch formula version' });
    }
  });

  // Revert to previous formula version
  app.post('/api/users/me/formula/revert', requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.userId;
      const { formulaId, reason } = req.body;
      
      if (!formulaId || !reason) {
        return res.status(400).json({ error: 'Formula ID and revert reason are required' });
      }

      // Get the formula to revert to
      const originalFormula = await storage.getFormula(formulaId);
      
      if (!originalFormula || originalFormula.userId !== userId) {
        return res.status(404).json({ error: 'Formula not found or access denied' });
      }

      // Get current highest version for user
      const currentFormula = await storage.getCurrentFormulaByUser(userId);
      const nextVersion = currentFormula ? currentFormula.version + 1 : 1;

      // Create new formula version with reverted data
      const revertedFormula = await storage.createFormula({
        userId,
        version: nextVersion,
        bases: originalFormula.bases as any,
        additions: originalFormula.additions as any,
        totalMg: originalFormula.totalMg,
        notes: `Reverted to v${originalFormula.version}: ${reason}`
      });

      // Create version change record
      await storage.createFormulaVersionChange({
        formulaId: revertedFormula.id,
        summary: `Reverted to version ${originalFormula.version}`,
        rationale: reason
      });

      res.json({ 
        success: true, 
        formula: revertedFormula,
        message: `Successfully reverted to version ${originalFormula.version}`
      });
    } catch (error) {
      console.error('Error reverting formula:', error);
      res.status(500).json({ error: 'Failed to revert formula' });
    }
  });

  // Compare two formula versions
  app.get('/api/users/me/formula/compare/:id1/:id2', requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.userId;
      const { id1, id2 } = req.params;
      
      const [formula1, formula2] = await Promise.all([
        storage.getFormula(id1),
        storage.getFormula(id2)
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
          basesAdded: formula2.bases.filter(b2 => 
            !formula1.bases.some(b1 => b1.ingredient === b2.ingredient)
          ),
          basesRemoved: formula1.bases.filter(b1 => 
            !formula2.bases.some(b2 => b2.ingredient === b1.ingredient)
          ),
          basesModified: formula2.bases.filter(b2 => {
            const b1 = formula1.bases.find(b => b.ingredient === b2.ingredient);
            return b1 && b1.amount !== b2.amount;
          }),
          additionsAdded: (formula2.additions || []).filter(a2 => 
            !(formula1.additions || []).some(a1 => a1.ingredient === a2.ingredient)
          ),
          additionsRemoved: (formula1.additions || []).filter(a1 => 
            !(formula2.additions || []).some(a2 => a2.ingredient === a1.ingredient)
          ),
          additionsModified: (formula2.additions || []).filter(a2 => {
            const a1 = (formula1.additions || []).find(a => a.ingredient === a2.ingredient);
            return a1 && a1.amount !== a2.amount;
          })
        }
      };

      res.json(comparison);
    } catch (error) {
      console.error('Error comparing formulas:', error);
      res.status(500).json({ error: 'Failed to compare formulas' });
    }
  });

  // Get ingredient detailed information
  app.get('/api/ingredients/:ingredientName', requireAuth, async (req: any, res: any) => {
    try {
      const ingredientName = decodeURIComponent(req.params.ingredientName);
      
      // This would normally query a comprehensive ingredient database
      // For now, return structured data based on ingredient name
      const ingredientInfo = {
        name: ingredientName,
        dosage: CANONICAL_DOSES_MG[ingredientName as keyof typeof CANONICAL_DOSES_MG] || 0,
        benefits: getIngredientBenefits(ingredientName),
        interactions: await getIngredientInteractions(ingredientName),
        category: getIngredientCategory(ingredientName),
        dailyValuePercentage: getDailyValuePercentage(ingredientName),
        sources: getIngredientSources(ingredientName),
        qualityIndicators: getQualityIndicators(ingredientName),
        alternatives: getAlternatives(ingredientName),
        researchBacking: getResearchBacking(ingredientName)
      };

      res.json(ingredientInfo);
    } catch (error) {
      console.error('Error fetching ingredient information:', error);
      res.status(500).json({ error: 'Failed to fetch ingredient information' });
    }
  });

  // Helper functions for ingredient information (these would be more comprehensive in production)
  function getIngredientBenefits(ingredient: string): string[] {
    const benefits: Record<string, string[]> = {
      'BRAIN HEALTH': ['Supports cognitive function', 'Enhances memory', 'Improves focus and concentration'],
      'IMMUNE': ['Boosts immune system', 'Supports natural defenses', 'Helps fight infections'],
      'ENERGY': ['Increases natural energy', 'Reduces fatigue', 'Supports cellular energy production'],
      'Vitamin D3': ['Supports bone health', 'Immune system support', 'Mood regulation'],
      'Magnesium': ['Muscle and nerve function', 'Bone health', 'Energy metabolism'],
      'Omega-3': ['Heart health', 'Brain function', 'Anti-inflammatory effects']
    };
    
    return benefits[ingredient] || ['General health support'];
  }

  function getIngredientCategory(ingredient: string): string {
    if (Object.keys(CANONICAL_DOSES_MG).includes(ingredient) && 
        !['Vitamin D3', 'Vitamin C', 'Magnesium', 'Zinc', 'Iron'].includes(ingredient)) {
      return 'Formula Base';
    }
    return 'Individual Supplement';
  }

  async function getIngredientInteractions(ingredient: string): Promise<string[]> {
    const interactions: string[] = [];
    
    // Check for known interactions
    const knownInteractions: Record<string, string[]> = {
      'Vitamin D3': ['May enhance calcium absorption - monitor calcium levels'],
      'Magnesium': ['May reduce absorption of some antibiotics - take separately'],
      'Iron': ['May reduce absorption with calcium - take separately'],
      'Omega-3': ['May enhance blood-thinning effects of warfarin'],
      'IMMUNE': ['May enhance immune response - consult doctor if on immunosuppressants'],
      'BRAIN HEALTH': ['May interact with cognitive medications - consult healthcare provider']
    };
    
    if (knownInteractions[ingredient]) {
      interactions.push(...knownInteractions[ingredient]);
    }
    
    return interactions;
  }

  function getDailyValuePercentage(ingredient: string): number | null {
    // This would query a comprehensive nutrient database
    const dvValues: Record<string, number> = {
      'Vitamin D3': 500, // 1000 IU = 500% DV
      'Vitamin C': 278,  // 250mg = 278% DV
      'Magnesium': 48,   // 200mg = 48% DV
      'Zinc': 136       // 15mg = 136% DV
    };
    
    return dvValues[ingredient] || null;
  }

  function getIngredientSources(ingredient: string): string[] {
    const sources: Record<string, string[]> = {
      'Vitamin D3': ['Lichen extract', 'Lanolin (sheep wool)'],
      'Magnesium': ['Magnesium glycinate', 'Magnesium citrate'],
      'Omega-3': ['Fish oil', 'Algae oil'],
      'BRAIN HEALTH': ['Lion\'s Mane mushroom', 'Bacopa monnieri', 'Ginkgo biloba']
    };
    
    return sources[ingredient] || ['Natural sources'];
  }

  function getQualityIndicators(ingredient: string): string[] {
    return [
      'Third-party tested',
      'USP verified',
      'Non-GMO',
      'Heavy metals tested'
    ];
  }

  function getAlternatives(ingredient: string): string[] {
    const alternatives: Record<string, string[]> = {
      'Vitamin D3': ['Vitamin D2', 'Sunlight exposure'],
      'Magnesium': ['Magnesium oxide', 'Magnesium malate'],
      'ENERGY': ['ENDURANCE', 'ADRENAL SUPPORT']
    };
    
    return alternatives[ingredient] || [];
  }

  function getResearchBacking(ingredient: string): { studyCount: number, evidenceLevel: string } {
    // This would query a research database
    return {
      studyCount: Math.floor(Math.random() * 100) + 50,
      evidenceLevel: 'Strong'
    };
  }

  // Remove duplicate function - already defined above

  // Notification API routes
  app.get('/api/notifications', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const limit = parseInt(req.query.limit as string) || 10;
      const notifications = await storage.listNotificationsByUser(userId, limit);
      res.json({ notifications });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  });

  app.get('/api/notifications/unread-count', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      res.status(500).json({ error: 'Failed to get unread notification count' });
    }
  });

  app.patch('/api/notifications/:id/read', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const notificationId = req.params.id;
      
      const notification = await storage.markNotificationAsRead(notificationId, userId);
      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      
      res.json({ notification });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  });

  app.patch('/api/notifications/mark-all-read', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const success = await storage.markAllNotificationsAsRead(userId);
      
      if (!success) {
        return res.status(500).json({ error: 'Failed to mark all notifications as read' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
  });

  // Helper route to create sample notifications for testing
  app.post('/api/notifications/sample', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      
      // Create sample notifications
      const sampleNotifications = [
        {
          userId,
          type: 'order_update' as const,
          title: 'Order Shipped',
          content: 'Your personalized supplement formula has been shipped and is on its way.',
          metadata: { actionUrl: '/dashboard/orders', icon: 'package', priority: 'medium' as const }
        },
        {
          userId,
          type: 'formula_update' as const,
          title: 'New Formula Recommendation',
          content: 'Based on your recent lab results, we have updated your formula with enhanced antioxidants.',
          metadata: { actionUrl: '/dashboard/my-formula', icon: 'beaker', priority: 'high' as const }
        }
      ];

      const createdNotifications = [];
      for (const notification of sampleNotifications) {
        const created = await storage.createNotification(notification);
        createdNotifications.push(created);
      }

      res.json({ notifications: createdNotifications });
    } catch (error) {
      console.error('Error creating sample notifications:', error);
      res.status(500).json({ error: 'Failed to create sample notifications' });
    }
  });

  // Support system API endpoints
  // FAQ endpoints
  app.get('/api/support/faq', async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const faqItems = await storage.listFaqItems(category);
      res.json({ faqItems });
    } catch (error) {
      console.error('Error fetching FAQ items:', error);
      res.status(500).json({ error: 'Failed to fetch FAQ items' });
    }
  });

  app.get('/api/support/faq/:id', async (req, res) => {
    try {
      const faqItem = await storage.getFaqItem(req.params.id);
      if (!faqItem) {
        return res.status(404).json({ error: 'FAQ item not found' });
      }
      res.json({ faqItem });
    } catch (error) {
      console.error('Error fetching FAQ item:', error);
      res.status(500).json({ error: 'Failed to fetch FAQ item' });
    }
  });

  // Support ticket endpoints
  app.get('/api/support/tickets', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const tickets = await storage.listSupportTicketsByUser(userId);
      res.json({ tickets });
    } catch (error) {
      console.error('Error fetching support tickets:', error);
      res.status(500).json({ error: 'Failed to fetch support tickets' });
    }
  });

  app.get('/api/support/tickets/:id', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const ticketWithResponses = await storage.getSupportTicketWithResponses(req.params.id, userId);
      if (!ticketWithResponses) {
        return res.status(404).json({ error: 'Support ticket not found' });
      }
      res.json(ticketWithResponses);
    } catch (error) {
      console.error('Error fetching support ticket:', error);
      res.status(500).json({ error: 'Failed to fetch support ticket' });
    }
  });

  app.post('/api/support/tickets', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      
      // Validate request body with Zod
      const validationResult = insertSupportTicketSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: 'Invalid ticket data', 
          details: validationResult.error.errors 
        });
      }
      
      const ticketData = {
        ...validationResult.data,
        userId
      };
      const ticket = await storage.createSupportTicket(ticketData);
      res.json({ ticket });
    } catch (error) {
      console.error('Error creating support ticket:', error);
      res.status(500).json({ error: 'Failed to create support ticket' });
    }
  });

  app.post('/api/support/tickets/:id/responses', requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const ticketId = req.params.id;
      
      // Validate request body with Zod
      const messageValidation = z.object({
        message: z.string().min(1, 'Message cannot be empty').max(2000, 'Message too long')
      }).safeParse(req.body);
      
      if (!messageValidation.success) {
        return res.status(400).json({ 
          error: 'Invalid message data', 
          details: messageValidation.error.errors 
        });
      }
      
      // Verify user owns the ticket
      const ticket = await storage.getSupportTicket(ticketId);
      if (!ticket || ticket.userId !== userId) {
        return res.status(404).json({ error: 'Support ticket not found' });
      }
      
      const responseData = {
        ticketId,
        userId,
        message: messageValidation.data.message,
        isStaff: false
      };
      const response = await storage.createSupportTicketResponse(responseData);
      res.json({ response });
    } catch (error) {
      console.error('Error creating support ticket response:', error);
      res.status(500).json({ error: 'Failed to create response' });
    }
  });

  // Help article endpoints
  app.get('/api/support/help', async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const articles = await storage.listHelpArticles(category);
      res.json({ articles });
    } catch (error) {
      console.error('Error fetching help articles:', error);
      res.status(500).json({ error: 'Failed to fetch help articles' });
    }
  });

  app.get('/api/support/help/:id', async (req, res) => {
    try {
      const article = await storage.getHelpArticle(req.params.id);
      if (!article) {
        return res.status(404).json({ error: 'Help article not found' });
      }
      
      // Increment view count
      await storage.incrementHelpArticleViewCount(req.params.id);
      
      res.json({ article });
    } catch (error) {
      console.error('Error fetching help article:', error);
      res.status(500).json({ error: 'Failed to fetch help article' });
    }
  });

  // Newsletter subscription endpoint (public)
  app.post('/api/newsletter/subscribe', async (req, res) => {
    try {
      const { email } = insertNewsletterSubscriberSchema.parse(req.body);
      
      // Check if email already exists
      const existing = await storage.getNewsletterSubscriberByEmail(email);
      if (existing) {
        if (existing.isActive) {
          return res.status(400).json({ error: 'Email already subscribed' });
        } else {
          // Reactivate subscription
          await storage.reactivateNewsletterSubscriber(email);
          return res.json({ success: true, message: 'Subscription reactivated' });
        }
      }
      
      // Create new subscription
      const subscriber = await storage.createNewsletterSubscriber({ email });
      res.json({ success: true, subscriber });
    } catch (error) {
      // Handle Zod validation errors with 400
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid email address', 
          details: error.errors 
        });
      }
      
      console.error('Newsletter subscription error:', error);
      res.status(500).json({ error: 'Failed to subscribe to newsletter' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
