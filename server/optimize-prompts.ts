/**
 * AI Prompt Templates for Optimize Feature
 * Generates nutrition plans, workout programs, and lifestyle coaching
 * based on user's health profile, labs, supplement formula, and biometric data
 */

import type { OptimizeContext, PersonalizationSnapshot } from "./optimize-context";
import { buildPersonalizationSnapshot, formatPersonalizationSnapshot } from "./optimize-context";

function resolveSnapshot(context: OptimizeContext, snapshot?: PersonalizationSnapshot) {
  return snapshot ?? buildPersonalizationSnapshot(context);
}

function personalizationBlock(snapshot: PersonalizationSnapshot) {
  return `## Personalization Data (MANDATORY)\n${formatPersonalizationSnapshot(snapshot)}\n\nYou must reference every applicable item from the personalization data inside the plan and fill the required "personalizationNotes" object.`;
}

/**
 * Build prompt for AI to generate comprehensive nutrition plan
 */
export function buildNutritionPlanPrompt(context: OptimizeContext, snapshot?: PersonalizationSnapshot): string {
  const { user, healthProfile, activeFormula, labData, preferences } = context;
  const personalizationSnapshot = resolveSnapshot(context, snapshot);

  let prompt = `You are a clinical nutrition expert creating a personalized 7-day meal plan for ${user.name}.

# USER HEALTH CONTEXT

## Demographics
`;

  if (healthProfile) {
    prompt += `- Age: ${healthProfile.age || "Not provided"}
- Sex: ${healthProfile.sex || "Not provided"}
- Height: ${healthProfile.heightCm ? `${healthProfile.heightCm}cm` : "Not provided"}
- Weight: ${healthProfile.weightLbs ? `${healthProfile.weightLbs}lbs` : "Not provided"}
- Activity Level: ${healthProfile.exerciseDaysPerWeek ? `${healthProfile.exerciseDaysPerWeek} days/week` : "Not specified"}
`;
  }

  if (healthProfile?.medications?.length) {
    prompt += `\n## Current Medications\n${healthProfile.medications.map((m: any) => `- ${m}`).join("\n")}\n`;
  }

  if (labData?.summary) {
    prompt += `\n## Lab Results Summary\n${labData.summary}\n\n`;
    prompt += `Key areas to address via nutrition:\n`;
    prompt += `- Identify markers that are out of range\n`;
    prompt += `- Suggest foods that support optimization of these markers\n`;
    prompt += `- Avoid foods that may worsen abnormalities\n`;
  }

  if (activeFormula) {
    prompt += `\n## Current Supplement Formula\n`;
    prompt += `User is already taking these supplements - DO NOT duplicate nutrients in meal plan:\n\n`;

    if (Array.isArray(activeFormula.bases) && activeFormula.bases.length) {
      prompt += `Base Formulas:\n`;
      activeFormula.bases.forEach((base: any) => {
        prompt += `- ${base.ingredient} (${base.amount}${base.unit})\n`;
      });
    }

    if (Array.isArray(activeFormula.additions) && activeFormula.additions.length) {
      prompt += `\nIndividual Ingredients:\n`;
      activeFormula.additions.forEach((add: any) => {
        prompt += `- ${add.ingredient} (${add.amount}${add.unit})\n`;
      });
    }

    prompt += `\nImportant: The meal plan should complement these supplements, not duplicate them. Focus on whole food nutrition.\n`;
  }

  if (preferences.dietaryRestrictions?.length) {
    prompt += `\n## Dietary Restrictions\n`;
    preferences.dietaryRestrictions.forEach((r) => {
      prompt += `- ${r}\n`;
    });
  }

  if (preferences.goals) {
    prompt += `\n## Nutrition Goals\n${preferences.goals}\n`;
  }

  prompt += `\n${personalizationBlock(personalizationSnapshot)}\n\n# TASK

Generate a comprehensive 7-day meal plan optimized for this user's health profile, lab results, and goals.

** CRITICAL REQUIREMENT: YOU MUST GENERATE ALL 7 DAYS **
- Day 1 (Monday) - REQUIRED
- Day 2 (Tuesday) - REQUIRED
- Day 3 (Wednesday) - REQUIRED  
- Day 4 (Thursday) - REQUIRED
- Day 5 (Friday) - REQUIRED
- Day 6 (Saturday) - REQUIRED
- Day 7 (Sunday) - REQUIRED

Do NOT stop after 4 days. Do NOT skip Friday, Saturday, or Sunday. Generate the complete 7-day week.

## Requirements

MANDATORY: Generate ALL 7 DAYS (Monday-Sunday). The weekPlan array must have exactly 7 day objects.

1. Calculate macro targets from weight/activity/goals
2. Each day: 5 meals (breakfast, snack, lunch, snack, dinner) with NAME ONLY and brief macros
3. Keep ingredient lists to 3-4 items max per meal
4. Instructions: 1 sentence max per meal
5. Health benefits: 1 short sentence max
6. Vary protein sources across days
7. **SNACK GUIDELINES:**
   - Snacks MUST be simple, traditional snacks (e.g., fruit, nuts, yogurt, hard-boiled eggs, protein shake, hummus & veggies).
   - DO NOT suggest "mini-meals" like fish, cooked meats, or complex dishes for snacks.
   - NO smoked fish, sardines, or heavy savory dishes for snacks unless explicitly requested.
   - Keep snacks light, portable, and easy to prepare.
8. **COMPLETE ALL 7 DAYS - this is non-negotiable**
9. **SMART RATIONALE (CRITICAL):** The "weeklyGuidance" field must be a high-quality, personalized explanation of WHY this plan works for THIS user.
   - You MUST explicitly reference their **Health Profile** (e.g., "As a 45-year-old active male...")
   - You MUST explicitly reference their **Lab Results** if available (e.g., "To address your low Vitamin D and elevated LDL...")
   - You MUST explicitly reference their **Goals** (e.g., "To support your goal of muscle gain...")
   - Do NOT use generic phrases like "This plan is balanced." Be specific and scientific.

## Output Format

Return compact JSON. Each meal needs only: mealType, name, 3-4 ingredients, 1-sentence instructions, macros (calories/protein/carbs/fats), 1-sentence healthBenefits.

{
  "nutritionalStrategy": {
    "primaryFocus": "Strategy name (e.g. High Protein)",
    "hydrationGoal": "Daily water target (e.g. 3000ml)",
    "caffeineLimit": "Daily limit (e.g. 200mg)",
    "alcoholLimit": "Weekly limit (e.g. 2 drinks/week)",
    "intermittentFasting": "Protocol if applicable (e.g. 16:8) or null"
  },
  "macroTargets": {"dailyCalories": 2200, "proteinGrams": 165, "carbsGrams": 220, "fatGrams": 73},
  "weekPlan": [
    {"day": 1, "dayName": "Monday", "meals": [5 compact meals], "dailyTotals": {"calories": 2100, "protein": 160, "carbs": 210, "fat": 70}},
    {"day": 2, "dayName": "Tuesday", "meals": [5 compact meals], "dailyTotals": {}},
    {"day": 3, "dayName": "Wednesday", "meals": [5 compact meals], "dailyTotals": {}},
    {"day": 4, "dayName": "Thursday", "meals": [5 compact meals], "dailyTotals": {}},
    {"day": 5, "dayName": "Friday", "meals": [5 compact meals], "dailyTotals": {}},
    {"day": 6, "dayName": "Saturday", "meals": [5 compact meals], "dailyTotals": {}},
    {"day": 7, "dayName": "Sunday", "meals": [5 compact meals], "dailyTotals": {}}
  ],
  "weeklyGuidance": "Detailed, personalized explanation referencing specific profile data and lab results (e.g. 'Designed for your 34yo metabolism and elevated LDL...')",
  "personalizationNotes": {"healthProfileInsights": ["1 insight"], "labInsightsAddressed": ["1 lab focus"], "supplementCoordination": "1 sentence", "goalAlignment": "1 sentence"}
}

Example compact meal: {"mealType": "breakfast", "name": "Greek Yogurt Bowl", "ingredients": ["Greek yogurt", "berries", "granola"], "instructions": "Mix yogurt with toppings", "prepTimeMinutes": 5, "macros": {"calories": 350, "protein": 25, "carbs": 40, "fats": 8}, "healthBenefits": "High protein supports muscle recovery"}

**YOU MUST GENERATE ALL 7 DAYS. Stopping early makes the plan unusable. Keep descriptions brief to fit all days.**
**CRITICAL: The 'weeklyGuidance' field MUST be a detailed paragraph (3-4 sentences) explaining WHY this plan works for this specific user.**
**MANDATORY: You MUST explicitly mention at least 3 specific data points from the user's profile in the 'weeklyGuidance' text (e.g., 'Because your LDL is 140...', 'Given your goal of muscle gain...', 'Since you are 45 years old...'). Do not use generic text.**

Be specific, practical, and evidence-based. This is a real person's health we are optimizing.`;

  return prompt;
}

/**
 * Build prompt for AI to generate workout program
 */
export function buildWorkoutPlanPrompt(context: OptimizeContext, snapshot?: PersonalizationSnapshot): string {
  const { user, healthProfile, labData, biometrics, preferences } = context;
  const personalizationSnapshot = resolveSnapshot(context, snapshot);
  const preferredDays = Array.isArray(preferences.preferredDays) ? (preferences.preferredDays as string[]) : [];

  let prompt = `You are a certified strength and conditioning specialist creating a personalized workout program for ${user.name}.

# USER FITNESS CONTEXT

## Current Stats
`;

  if (healthProfile) {
    prompt += `- Age: ${healthProfile.age || "Not provided"}
- Sex: ${healthProfile.sex || "Not provided"}
- Current Activity Level: ${healthProfile.exerciseDaysPerWeek ? `${healthProfile.exerciseDaysPerWeek} days/week` : "Sedentary"}
`;
  }

  if (healthProfile?.bloodPressureSystolic && healthProfile?.bloodPressureDiastolic) {
    prompt += `- Blood Pressure: ${healthProfile.bloodPressureSystolic}/${healthProfile.bloodPressureDiastolic} mmHg
`;
  }

  if (preferences.experienceLevel) {
    prompt += `- Experience Level: ${preferences.experienceLevel}\n`;
  }

  if (preferences.daysPerWeek) {
    prompt += `- Available Training Days: ${preferences.daysPerWeek} days/week\n`;
  }

  if (Array.isArray(preferences.preferredDays) && preferences.preferredDays.length > 0) {
    prompt += `- Preferred Training Days: ${preferences.preferredDays.join(", ")}\n`;
  }

  if (healthProfile?.conditions?.length) {
    prompt += `\n## Medical Considerations\n`;
    healthProfile.conditions.forEach((condition) => {
      prompt += `- ${condition}\n`;
    });
  }

  if (healthProfile?.medications?.length) {
    prompt += `\n## Current Medications\n`;
    healthProfile.medications.forEach((med) => {
      prompt += `- ${med}\n`;
    });
  }

  if (biometrics) {
    prompt += `\n## Recent Biometric Data\n`;
    if (biometrics.recentRHR) prompt += `- Resting Heart Rate: ${biometrics.recentRHR} bpm\n`;
    if (biometrics.recentHRV) prompt += `- Heart Rate Variability: ${biometrics.recentHRV} ms\n`;
    if (biometrics.recentSteps) prompt += `- Average Daily Steps: ${biometrics.recentSteps}\n`;
  }

  if (labData?.summary) {
    prompt += `\n## Lab Insights\n${labData.summary}\n`;
    prompt += `\nTranslate abnormal markers into specific training prescriptions (for example, elevated LDL implies moderate cardio 3 to 4 times per week; impaired glucose tolerance implies intervals plus resistance work; hypertension implies aerobic conditioning and breathing drills).\n`;
  }

  if (preferences.goals) {
    prompt += `\n## Fitness Goals\n${preferences.goals}\n`;
  }

  prompt += `\n${personalizationBlock(personalizationSnapshot)}\n\n# TASK

Create a **PROFESSIONAL-GRADE** structured ${preferences.daysPerWeek || 3}-day per week workout program tailored to this user's level, goals, and limitations.

## Requirements

1. **MANDATORY 7-DAY SCHEDULE:**
   - You MUST generate an array of exactly 7 objects in "weekPlan", representing Monday through Sunday.
   - **DO NOT** group days. Each day must be a separate object.
   - **DO NOT** skip days.

2. **WORKOUT DAYS VS REST DAYS:**
   - The user requested ${preferences.daysPerWeek || 3} workout days per week.
   - ${preferredDays.length > 0 ? `The user prefers to workout on: ${preferredDays.join(", ")}. Schedule full workouts on these days.` : `Distribute the ${preferences.daysPerWeek || 3} workouts evenly throughout the week (e.g., Mon, Wed, Fri).`}
   - On workout days: Provide a full, detailed workout. Set "isRestDay": false.
   - On non-workout days: Set "isRestDay": true. Provide a light "Active Recovery" suggestion (e.g., "30 min walk", "Stretching").

3. **IMPRESSIVE VOLUME & DENSITY (CRITICAL):**
   - **NO "FLUFF" WORKOUTS.** A 60-minute session must be dense and effective.
   - **Minimum 8 Exercises per Session:**
     - 2 Warm-up (Mobility/Activation)
     - 4-5 Main Lifts (Use Supersets like A1/A2 or Circuits to increase density)
     - 1-2 Cardio/Conditioning Finishers
     - 1 Cool-down
   - **Use Professional Notation:** Use "A1. Exercise / A2. Exercise" for supersets in the name field to show sophisticated programming.
   - **Tempo & Intensity:** In the "notes", specify tempo (e.g., "3-0-1-0") or intensity (e.g., "RPE 8") to make it feel professional.

   - **EXERCISE TYPES (CRITICAL):**
   - You MUST classify each exercise with a "type" field:
     - "strength": Standard sets/reps/weight (e.g., Squats, Bench Press).
     - "cardio": Distance/time based (e.g., Running, Rowing, Cycling).
     - "timed": Duration based (e.g., Planks, Stretching, Box Breathing).
   - For "cardio" or "timed" exercises, use the "reps" field to specify duration (e.g., "20 mins") or distance (e.g., "3 miles").
   - **UNITS (CRITICAL):**
     - ALWAYS use **LBS** (pounds) for weight.
     - ALWAYS use **MILES** for distance.
     - Do NOT use kg or km.

5. **STRUCTURED SESSIONS:**
   - **Warm-up:** 5-10 mins (Dynamic stretching, light cardio).
   - **Main Workout:** 35-45 mins (Strength, HIIT, or steady state).
   - **Cool-down:** 5-10 mins (Static stretching, breathing).
   - **Cardio Integration:** If the user has elevated BP, lipids, or weight loss goals, you MUST include dedicated cardio (e.g., "20 mins Zone 2 cycling") either as a separate session or part of the workout.

5. **DEEP PERSONALIZATION:**
   - **Lab-Based Adjustments:**
     - High Cortisol? -> Limit HIIT, focus on strength + recovery.
     - High Glucose/HbA1c? -> Prioritize hypertrophy (glucose disposal) and post-meal walks.
     - High BP? -> Avoid max-effort valsalva maneuvers; focus on rhythmic breathing.
   - **Profile-Based Adjustments:**
     - Sedentary job? -> Focus on posture, hip flexors, and glute activation.
     - Older adult? -> Focus on balance, power, and fall prevention.

6. **OUTPUT QUALITY:**
   - Every workout day must provide a "workout.focus" string tying back to health profile or labs.
   - Every listed exercise must include a "healthBenefits" explanation.
   - Include recovery tips, signs of overtraining, and rest guidance.
   - Populate "personalizationNotes" describing how the program leverages health profile facts, lab findings, supplement coordination, and stated goals.

## Output JSON Structure

Return ONLY valid JSON in this model (values customized):
{
  "programOverview": {"daysPerWeek": 3, "durationWeeks": 8, "focus": "Full-body strength", "targetAudience": "intermediate"},
  "weeklyGuidance": "Detailed, personalized explanation referencing specific profile data and lab results. Explain WHY this workout plan is optimal for them. You MUST explicitly mention at least 3 specific data points from the user's profile (e.g., 'Because your LDL is 140...', 'Given your goal of muscle gain...', 'Since you are 45 years old...').",
  "weekPlan": [
    {
      "day": 1,
      "dayName": "Monday",
      "workout": {
        "name": "Metabolic Strength & Conditioning",
        "durationMinutes": 60,
        "estimatedCalories": 550,
        "type": "strength_cardio",
        "focus": "High-volume hypertrophy to maximize glucose disposal + Zone 2 finish",
        "exercises": [
          {"name": "Warmup: Cat-Cow & T-Spine Rotations", "type": "timed", "sets": 2, "reps": "60 sec", "restSeconds": 0, "notes": "Mobilize spine", "healthBenefits": "Prepares nervous system"},
          {"name": "Warmup: Band Pull-Aparts", "type": "strength", "sets": 2, "reps": "15", "restSeconds": 30, "notes": "Activate rear delts", "healthBenefits": "Postural correction"},
          {"name": "A1. Goblet Squats", "type": "strength", "sets": 4, "reps": "12", "restSeconds": 0, "notes": "Deep depth, tempo 3-0-1-0", "healthBenefits": "Large muscle group activation for metabolic demand"},
          {"name": "A2. Push-Ups", "type": "strength", "sets": 4, "reps": "AMRAP", "restSeconds": 90, "notes": "Chest to floor", "healthBenefits": "Upper body endurance"},
          {"name": "B1. Dumbbell RDL", "type": "strength", "sets": 3, "reps": "10-12", "restSeconds": 0, "notes": "Hinge at hips, flat back", "healthBenefits": "Posterior chain strength"},
          {"name": "B2. Single-Arm Row", "type": "strength", "sets": 3, "reps": "12/side", "restSeconds": 60, "notes": "Control the eccentric", "healthBenefits": "Corrects asymmetry"},
          {"name": "Finisher: Zone 2 Incline Walk", "type": "cardio", "sets": 1, "reps": "20 mins", "restSeconds": 0, "notes": "Incline 10%, Speed 3.0", "healthBenefits": "Lipid oxidation and recovery"},
          {"name": "Cooldown: Box Breathing", "type": "timed", "sets": 1, "reps": "3 mins", "restSeconds": 0, "notes": "Inhale 4s, Hold 4s, Exhale 4s, Hold 4s", "healthBenefits": "Downregulates cortisol"}
        ]
      },
      "isRestDay": false
    },
    {
      "day": 2,
      "dayName": "Tuesday",
      "workout": {
        "name": "Active Recovery",
        "durationMinutes": 30,
        "estimatedCalories": 150,
        "type": "recovery",
        "focus": "Blood flow and stress reduction",
        "exercises": [
           {"name": "Light Walk", "type": "cardio", "sets": 1, "reps": "30 mins", "restSeconds": 0, "notes": "Nature walk if possible", "healthBenefits": "Lowers cortisol"}
        ]
      },
      "isRestDay": true
    }
    // ... MUST INCLUDE ALL 7 DAYS (Wednesday through Sunday)
  ],
  "recoveryTips": ["Walk 5 minutes post session", "90 seconds diaphragmatic breathing"],
  "progressionPlan": {"week1-2": "Establish baseline", "week3-4": "Increase load 5%", "week5-6": "Add reps", "week7-8": "Reassess"},
  "safetyGuidelines": ["Stop if sharp pain", "Use RPE 7-8"],
  "equipmentNeeded": ["Dumbbells", "Bands", "Yoga mat"],
  "personalizationNotes": {
    "healthProfileInsights": ["Resting blood pressure 135/85 so tempo control added"],
    "labInsightsAddressed": ["High LDL implies three moderate cardio blocks per week"],
    "supplementCoordination": "Avoided adaptogens already supplied by formula",
    "goalAlignment": "Supports recomposition and glucose control"
  }
}

Be practical, safe, and results-driven. This program should be sustainable long-term.`;

  return prompt;
}

/**
 * Build prompt for AI to generate lifestyle coaching plan
 */
export function buildLifestylePlanPrompt(context: OptimizeContext, snapshot?: PersonalizationSnapshot): string {
  const { user, healthProfile, labData, biometrics, preferences } = context;
  const personalizationSnapshot = resolveSnapshot(context, snapshot);

  let prompt = `You are a functional medicine lifestyle coach creating a personalized wellness protocol for ${user.name}.

# USER WELLNESS CONTEXT

## Current Lifestyle
`;

  if (healthProfile) {
    prompt += `- Sleep: ${healthProfile.sleepHoursPerNight ? `${healthProfile.sleepHoursPerNight} hours/night` : "Not tracked"}
- Stress Level: ${healthProfile.stressLevel || "Not reported"}
- Alcohol: ${healthProfile.alcoholDrinksPerWeek ? `${healthProfile.alcoholDrinksPerWeek} drinks/week` : "None"}
- Smoking: ${healthProfile.smokingStatus || "Not reported"}
`;
  }

  if (biometrics) {
    prompt += `\n## Biometric Trends (recent 7-day average)\n`;
    if (biometrics.recentSleep) prompt += `- Sleep Duration: ${biometrics.recentSleep} hours\n`;
    if (biometrics.recentHRV) prompt += `- HRV: ${biometrics.recentHRV} ms ${biometrics.recentHRV < 50 ? "(LOW - indicates stress/poor recovery)" : "(GOOD)"}\n`;
    if (biometrics.recentRHR) prompt += `- Resting Heart Rate: ${biometrics.recentRHR} bpm\n`;
  }

  if (labData?.summary) {
    prompt += `\n## Lab-driven Lifestyle Targets\n${labData.summary}\n`;
  }

  if (preferences.goals) {
    prompt += `\n## Lifestyle Goals\n${preferences.goals}\n`;
  }

  prompt += `\n${personalizationBlock(personalizationSnapshot)}\n\n# TASK

Create a lifestyle coaching plan that addresses nervous system regulation, sleep hygiene, stress management, and daily routines tailored to this user.

## Requirements

1. Provide a seven-day "weekPlan" array. Each day must include morning protocol, daytime focus, evening shutdown, and nervous system support activities.
2. Tie recommendations back to health profile facts and lab findings (example: high cortisol implies breathwork and balanced meals; low vitamin D implies sunlight exposure guidance).
3. Keep guidance practical with time windows and fallback options for busy days.
4. Suggest daily tracking signals (sleep quality, HRV, mood) and note when to escalate to a practitioner.
5. Populate "personalizationNotes" summarizing how the lifestyle protocol reflects health profile facts, lab trends, supplement timing, and goals.

## Output JSON Structure

{
  "weeklyGuidance": "Detailed, personalized explanation referencing specific profile data and lab results. Explain WHY this lifestyle protocol is optimal for them. You MUST explicitly mention at least 3 specific data points from the user's profile (e.g., 'Because your LDL is 140...', 'Given your goal of muscle gain...', 'Since you are 45 years old...').",
  "weekPlan": [
    {
      "day": 1,
      "dayName": "Monday",
      "focusArea": "Anti-inflammatory morning",
      "morningProtocol": "Wake 6:30 AM, hydrate with mineral water, 5 minutes sunlight",
      "daytimeFocus": "Batch meetings before noon, 10-minute walk after lunch",
      "eveningProtocol": "Blue-light blockers at 8 PM, in bed by 10 PM",
      "nervousSystemSupport": ["Box breathing 4-4-4-4 for 5 minutes"],
      "breathwork": ["Resonant breathing, 6 breaths/min"],
      "healthBenefits": "Targets elevated cortisol and improves HRV"
    }
  ],
  "sleepProtocols": ["Keep bedroom at 65F", "No caffeine after 1 PM"],
  "stressProtocols": ["90-second cold shower finisher", "Daily journaling"],
  "trackingSignals": ["Sleep quality score", "Morning HRV", "Energy level"],
  "escalationGuidelines": "Flag sustained HRV drop below 35 ms or persistent insomnia for medical review",
  "personalizationNotes": {
    "healthProfileInsights": ["Sleep debt averaged 5.5 hours so strict evening routine included"],
    "labInsightsAddressed": ["CRP elevated so anti-inflammatory routines prioritized"],
    "supplementCoordination": "Times adaptogens to avoid overlap with supplement stack",
    "goalAlignment": "Supports stated energy and focus goals"
  }
}

Provide empathetic, achievable guidance with clear next steps.`;

  return prompt;
}

/**
 * Build prompt for AI to generate a single recipe
 */
export function buildRecipePrompt(mealName: string, ingredients: string[], dietaryRestrictions: string[] = []): string {
  let prompt = `You are a professional chef and nutritionist. Create a detailed, easy-to-follow recipe for "${mealName}".

Ingredients to include:
${ingredients.map(i => `- ${i}`).join('\n')}

`;

  if (dietaryRestrictions.length > 0) {
    prompt += `Dietary Restrictions to respect:
${dietaryRestrictions.map(r => `- ${r}`).join('\n')}

`;
  }

  prompt += `
Requirements:
1. Simple, clear instructions.
2. Prep time and cook time.
3. Exact measurements for 1 serving.
4. Nutritional breakdown (Calories, Protein, Carbs, Fat).
5. A brief "Chef's Tip" for better flavor or easier prep.

Output JSON format:
{
  "name": "Recipe Name",
  "description": "Brief appetizing description",
  "prepTime": "10 mins",
  "cookTime": "15 mins",
  "servings": 1,
  "ingredients": [
    {"item": "Chicken Breast", "amount": "150g", "notes": "boneless, skinless"},
    {"item": "Olive Oil", "amount": "1 tbsp", "notes": ""}
  ],
  "instructions": [
    "Step 1...",
    "Step 2..."
  ],
  "macros": {
    "calories": 450,
    "protein": 35,
    "carbs": 10,
    "fat": 20
  },
  "chefTip": "Marinate for at least 30 mins for best results."
}
`;

  return prompt;
}
