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
      prompt += `System Supports:\n`;
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
2. Each day: 3 MAIN MEALS (breakfast, lunch, dinner) with exciting, restaurant-quality names
3. **MAKE MEALS EXCITING & VARIED:**
   - Use descriptive, appetizing names (e.g., "Crispy Korean BBQ Salmon Bowl" not "Salmon with rice")
   - Rotate through different CUISINES across the week: Mediterranean, Asian, Mexican, Italian, Middle Eastern, American, Indian
   - Include 5-7 key ingredients per meal for real depth of flavor
   - Provide brief but inspiring instructions (2-3 sentences with cooking tips)
   - Vary cooking methods: grilling, roasting, sautéing, slow-cooking, fresh/raw
4. **PROTEIN VARIETY (CRITICAL):**
   - Use DIFFERENT protein sources each day: chicken, beef, fish (salmon, cod, tuna), shrimp, turkey, eggs, tofu, legumes
   - NO chicken for more than 2 days in a row
   - Include at least 2 seafood days per week
5. **SNACK GUIDELINES:**
   - Include 2 snacks per day between meals
   - Keep snacks simple but satisfying (Greek yogurt parfait, mixed nuts, protein shake, apple with almond butter, etc.)
6. **WEEKEND SPECIAL:** Saturday and Sunday meals can be slightly more indulgent/elaborate - treat meals that still hit macros
7. **COMPLETE ALL 7 DAYS - this is non-negotiable**
8. **SMART RATIONALE (CRITICAL):** The "weeklyGuidance" field must be a high-quality, personalized explanation of WHY this plan works for THIS user.
   - You MUST explicitly reference their **Health Profile** (e.g., "As a 45-year-old active male...")
   - You MUST explicitly reference their **Lab Results** if available (e.g., "To address your low Vitamin D and elevated LDL...")
   - You MUST explicitly reference their **Goals** (e.g., "To support your goal of muscle gain...")
   - Do NOT use generic phrases like "This plan is balanced." Be specific and scientific.

## Output Format

Return compact JSON. Each meal needs: mealType, name (MAKE IT APPETIZING!), 5-7 ingredients, 2-3 sentence instructions with tips, macros (calories/protein/carbs/fats), healthBenefits, and cuisine tag.

{
  "nutritionalStrategy": {
    "primaryFocus": "Strategy name (e.g. High Protein Mediterranean)",
    "hydrationGoal": "Daily water target (e.g. 3000ml)",
    "caffeineLimit": "Daily limit (e.g. 200mg)",
    "alcoholLimit": "Weekly limit (e.g. 2 drinks/week)",
    "intermittentFasting": "Protocol if applicable (e.g. 16:8) or null"
  },
  "macroTargets": {"dailyCalories": 2200, "proteinGrams": 165, "carbsGrams": 220, "fatGrams": 73},
  "weekPlan": [
    {"day": 1, "dayName": "Monday", "meals": [
      {"mealType": "breakfast", "name": "Mediterranean Shakshuka with Feta & Za'atar", "cuisine": "Mediterranean", "ingredients": ["eggs", "tomatoes", "bell peppers", "onion", "feta cheese", "za'atar", "olive oil"], "instructions": "Sauté peppers and onions until soft, add crushed tomatoes and simmer 10 mins. Create wells and crack in eggs, cover until set. Top with crumbled feta and za'atar.", "prepTimeMinutes": 20, "macros": {"calories": 450, "protein": 28, "carbs": 20, "fats": 28}, "healthBenefits": "Protein-rich start with anti-inflammatory lycopene from tomatoes"},
      {"mealType": "snack", "name": "Greek Yogurt Parfait", "cuisine": "American", "ingredients": ["Greek yogurt", "mixed berries", "honey", "granola"], "instructions": "Layer yogurt with berries, drizzle honey, top with granola.", "prepTimeMinutes": 3, "macros": {"calories": 250, "protein": 18, "carbs": 30, "fats": 6}, "healthBenefits": "Probiotics and antioxidants"},
      {"mealType": "lunch", "name": "Grilled Chimichurri Steak Salad", "cuisine": "Latin American", "ingredients": ["flank steak", "mixed greens", "cherry tomatoes", "red onion", "avocado", "chimichurri sauce", "lime"], "instructions": "Season steak and grill to medium-rare, let rest 5 mins then slice against grain. Toss greens with tomatoes, onion, and avocado. Top with steak slices and drizzle chimichurri.", "prepTimeMinutes": 25, "macros": {"calories": 520, "protein": 42, "carbs": 15, "fats": 32}, "healthBenefits": "Iron-rich beef with heart-healthy fats from avocado"},
      {"mealType": "snack", "name": "Apple Slices with Almond Butter", "cuisine": "American", "ingredients": ["apple", "almond butter"], "instructions": "Slice apple and serve with almond butter for dipping.", "prepTimeMinutes": 2, "macros": {"calories": 200, "protein": 5, "carbs": 25, "fats": 10}, "healthBenefits": "Fiber and healthy fats for sustained energy"},
      {"mealType": "dinner", "name": "Crispy Teriyaki Salmon with Sesame Bok Choy", "cuisine": "Asian", "ingredients": ["salmon fillet", "teriyaki sauce", "bok choy", "sesame oil", "garlic", "ginger", "sesame seeds", "brown rice"], "instructions": "Pan-sear salmon skin-side down until crispy, flip and glaze with teriyaki. Separately sauté bok choy with garlic, ginger, and sesame oil. Serve over brown rice, garnish with sesame seeds.", "prepTimeMinutes": 30, "macros": {"calories": 580, "protein": 45, "carbs": 40, "fats": 24}, "healthBenefits": "Omega-3 fatty acids for brain health and inflammation reduction"}
    ], "dailyTotals": {"calories": 2000, "protein": 138, "carbs": 130, "fat": 100}},
    {"day": 2, "dayName": "Tuesday", "meals": [5 varied meals with different cuisines], "dailyTotals": {}},
    {"day": 3, "dayName": "Wednesday", "meals": [5 varied meals], "dailyTotals": {}},
    {"day": 4, "dayName": "Thursday", "meals": [5 varied meals], "dailyTotals": {}},
    {"day": 5, "dayName": "Friday", "meals": [5 varied meals], "dailyTotals": {}},
    {"day": 6, "dayName": "Saturday", "meals": [5 SPECIAL weekend meals - slightly more elaborate], "dailyTotals": {}},
    {"day": 7, "dayName": "Sunday", "meals": [5 SPECIAL weekend meals - can include brunch], "dailyTotals": {}}
  ],
  "mealPrepTips": ["Batch cook proteins on Sunday", "Pre-chop vegetables for the week", "Make sauces/dressings ahead"],
  "weeklyGuidance": "Detailed, personalized explanation referencing specific profile data and lab results (e.g. 'Designed for your 34yo metabolism and elevated LDL...')",
  "personalizationNotes": {"healthProfileInsights": ["insight based on actual profile"], "labInsightsAddressed": ["lab-specific recommendation"], "supplementCoordination": "how meals complement supplements", "goalAlignment": "how plan supports stated goals"}
}

**CRITICAL MEAL NAMING:** Names should sound like a restaurant menu, not a hospital cafeteria. Examples:
✅ "Honey Garlic Glazed Pork Tenderloin with Roasted Sweet Potato Mash"
✅ "Spicy Thai Basil Chicken Stir-Fry with Jasmine Rice"
✅ "Herb-Crusted Mediterranean Sea Bass with Lemon Caper Sauce"
❌ "Chicken with rice"
❌ "Fish and vegetables"
❌ "Protein with carbs"

**YOU MUST GENERATE ALL 7 DAYS. Stopping early makes the plan unusable.**
**CRITICAL: The 'weeklyGuidance' field MUST be a detailed paragraph (3-4 sentences) explaining WHY this plan works for this specific user.**
**MANDATORY: You MUST explicitly mention at least 3 specific data points from the user's profile in the 'weeklyGuidance' text (e.g., 'Because your LDL is 140...', 'Given your goal of muscle gain...', 'Since you are 45 years old...'). Do not use generic text.**

Be specific, practical, and evidence-based. This is a real person's health we are optimizing.`;

  return prompt;
}

/**
 * Build prompt for AI to generate workout program
 * @param context - User health/fitness context
 * @param snapshot - Optional personalization snapshot
 * @param historicalAnalysis - Optional formatted historical workout analysis for smart progression
 */
export function buildWorkoutPlanPrompt(
  context: OptimizeContext, 
  snapshot?: PersonalizationSnapshot,
  historicalAnalysis?: string
): string {
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
    
    // Add specific programming guidance based on experience level
    if (preferences.experienceLevel === 'beginner') {
      prompt += `
### BEGINNER PROGRAMMING REQUIREMENTS:
- Focus on fundamental movement patterns (squat, hinge, push, pull, carry)
- Use machines and guided movements where possible for safety
- Lower intensity: RPE 5-7, lighter weights with higher reps (12-15)
- Longer rest periods (90-120 seconds between sets)
- Simpler exercises: avoid complex Olympic lifts, heavy deadlifts, advanced plyometrics
- Include detailed form cues in exercise notes
- Full body workouts or simple upper/lower splits only
- NO supersets or circuits until movement mastery is established
- Emphasize time under tension and mind-muscle connection
- Example exercises: Leg Press, Cable Rows, Machine Chest Press, Assisted Pull-Ups, Goblet Squats, Dumbbell Lunges
`;
    } else if (preferences.experienceLevel === 'intermediate') {
      prompt += `
### INTERMEDIATE PROGRAMMING REQUIREMENTS:
- Progressive overload with compound lifts (Barbell Squats, Deadlifts, Bench Press, Rows)
- Moderate intensity: RPE 7-8, challenging weights (8-12 reps)
- Include supersets (A1/A2 format) for efficiency
- Mix of compound and isolation work
- Periodization awareness: vary rep ranges week to week
- Include some unilateral work for balance (Bulgarian Split Squats, Single-Arm Rows)
- Can include basic power movements (Box Jumps, Med Ball Throws)
- Standard rest periods (60-90 seconds)
- Push/Pull/Legs or Upper/Lower splits work well
`;
    } else if (preferences.experienceLevel === 'advanced') {
      prompt += `
### ADVANCED PROGRAMMING REQUIREMENTS:
- Complex periodization: undulating rep schemes, deload protocols
- High intensity: RPE 8-9, heavy loads (3-6 reps for strength, 6-10 for hypertrophy)
- Advanced techniques: drop sets, rest-pause, cluster sets, tempo prescriptions
- Olympic lift variations if appropriate (Power Cleans, Hang Snatches)
- Plyometrics and explosive movements (Depth Jumps, Reactive Box Jumps)
- Advanced supersets and tri-sets for density
- Shorter rest periods where appropriate (45-60 seconds for hypertrophy)
- Include specialty exercises: Deficit Deadlifts, Pause Squats, Board Press
- Finishers: EMOM, AMRAP, Tabata, Ascending/Descending Ladders
- Intensity techniques in notes (e.g., "5-3-1 tempo", "Double pause at bottom")
- Consider weak point training and muscle imbalance correction
- **MINIMUM 10-12 EXERCISES per session** (more volume and density than beginner/intermediate)
`;
    }
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

  // Add historical workout analysis for intelligent progression
  if (historicalAnalysis) {
    prompt += `\n# WORKOUT HISTORY & PROGRESSION INTELLIGENCE\n`;
    prompt += historicalAnalysis;
    prompt += `\n
## How to Use This History Data:
1. **Progressive Overload:** For exercises showing consistent performance, increase weight by 2.5-5% or add 1-2 reps.
2. **Exercise Selection:** Include exercises the user has been doing to maintain movement mastery, but also introduce new variations for continued adaptation.
3. **Volume Management:** If total volume is trending up, the user is adapting well - continue progression. If declining, consider a deload or reduced intensity.
4. **PR Recognition:** Acknowledge exercises where the user set personal records - this motivates continued effort.
5. **Plateau Breaking:** For exercises showing plateau, suggest technique variations, tempo changes, or different rep schemes.
6. **Recovery Awareness:** High difficulty ratings suggest adequate challenge. Very high (5/5) consistently may indicate need for recovery focus.
`;
  }

  if (labData?.summary) {
    prompt += `\n## Lab Insights\n${labData.summary}\n`;
    prompt += `\nTranslate abnormal markers into specific training prescriptions (for example, elevated LDL implies moderate cardio 3 to 4 times per week; impaired glucose tolerance implies intervals plus resistance work; hypertension implies aerobic conditioning and breathing drills).\n`;
  }

  if (preferences.goals) {
    prompt += `\n## Fitness Goals\n${preferences.goals}\n`;
  }

  // Calculate required exercise count based on experience level
  const experienceLevel = preferences.experienceLevel || 'intermediate';
  let minExercises = 8;
  let maxExercises = 8;
  if (experienceLevel === 'beginner') {
    minExercises = 6;
    maxExercises = 7;
  } else if (experienceLevel === 'advanced') {
    minExercises = 10;
    maxExercises = 12;
  }

  prompt += `\n${personalizationBlock(personalizationSnapshot)}\n\n# TASK

Create a **PROFESSIONAL-GRADE** structured ${preferences.daysPerWeek || 3}-day per week workout program tailored to this user's level, goals, and limitations.

## ⚠️ CRITICAL: EXERCISE COUNT FOR ${experienceLevel.toUpperCase()} LEVEL
**You MUST include EXACTLY ${minExercises}-${maxExercises} exercises per workout session.**
This is NON-NEGOTIABLE. Count your exercises before submitting. If you have fewer than ${minExercises} exercises, ADD MORE.

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

3. **MAKE WORKOUTS EXCITING & VARIED (CRITICAL):**
   - **WORKOUT THEMES:** Each workout day should have an exciting, motivating theme name:
     - ✅ "Power & Explosiveness Day", "Metabolic Mayhem", "Athletic Performance Circuit", "Strength & Sculpt", "Total Body Burn"
     - ❌ "Day 1", "Upper Body", "Workout A"
   - **EXERCISE VARIETY:** Use a mix of:
     - Compound lifts (Squats, Deadlifts, Bench, Rows)
     - Athletic movements (Box Jumps, Med Ball Slams, Kettlebell Swings)
     - Functional training (Turkish Get-ups, Farmer's Carries, Sled Pushes)
     - Unilateral work (Split Squats, Single-Arm Rows)
     - Core challenges (Pallof Press, Ab Wheel, Hanging Leg Raises)
   - **NO BORING EXERCISES:** Avoid 3 days of the same dumbbell curls. Rotate variations.
   - **FINISHERS:** End each workout with an exciting finisher (EMOM, AMRAP, Tabata, Ladder)

4. **EXERCISE COUNT: ${minExercises}-${maxExercises} PER SESSION (MANDATORY FOR ${experienceLevel.toUpperCase()}):**
   - **NO "FLUFF" WORKOUTS.** A 60-minute session must be dense and effective.
   - **Structure each workout with:**
     - 2 Warm-up exercises (Dynamic mobility, activation drills)
     - ${experienceLevel === 'advanced' ? '6-8' : experienceLevel === 'beginner' ? '3-4' : '4-5'} Main Lifts (Use Supersets like A1/A2 or Circuits to increase density)
     - 1-2 Cardio/Conditioning Finishers
     - 1 Cool-down exercise
   - **Use Professional Notation:** Use "A1. Exercise / A2. Exercise" for supersets in the name field to show sophisticated programming.
   - **Tempo & Intensity:** In the "notes", specify tempo (e.g., "3-0-1-0") or intensity (e.g., "RPE 8") to make it feel professional.

5. **EXERCISE TYPES (CRITICAL):**
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

**CRITICAL: DO NOT copy the example exercises below. Create UNIQUE workouts tailored to this user's experience level and goals. The example is just for JSON structure reference.**

**EXERCISE COUNT REQUIREMENT (MANDATORY):**
- Beginner: 6-7 exercises per workout
- Intermediate: 8 exercises per workout  
- Advanced: 10-12 exercises per workout (THIS IS NON-NEGOTIABLE FOR ADVANCED)

Return ONLY valid JSON in this model (values customized):
{
  "programOverview": {"daysPerWeek": 3, "durationWeeks": 8, "focus": "Full-body strength", "targetAudience": "intermediate"},
  "weeklyGuidance": "Detailed, personalized explanation referencing specific profile data and lab results...",
  "weekPlan": [
    {
      "day": 1,
      "dayName": "Monday",
      "workout": {
        "name": "Power & Athletic Performance",
        "durationMinutes": 65,
        "estimatedCalories": 600,
        "type": "strength_power",
        "focus": "Explosive power development with strength base",
        "exercises": [
          {"name": "Warmup: Dynamic Hip Circles", "type": "timed", "sets": 2, "reps": "30 sec/side", "restSeconds": 0, "notes": "Open hips", "healthBenefits": "Joint mobility"},
          {"name": "Warmup: Arm Circles & Shoulder Dislocates", "type": "timed", "sets": 2, "reps": "45 sec", "restSeconds": 0, "notes": "Full ROM", "healthBenefits": "Shoulder prep"},
          {"name": "A1. Barbell Back Squat", "type": "strength", "sets": 5, "reps": "5", "restSeconds": 0, "notes": "RPE 8, brace core", "healthBenefits": "Total body strength"},
          {"name": "A2. Box Jumps", "type": "strength", "sets": 5, "reps": "3", "restSeconds": 120, "notes": "Step down, explosive up", "healthBenefits": "Power development"},
          {"name": "B1. Romanian Deadlift", "type": "strength", "sets": 4, "reps": "8", "restSeconds": 0, "notes": "3-1-1-0 tempo", "healthBenefits": "Posterior chain"},
          {"name": "B2. Dumbbell Walking Lunges", "type": "strength", "sets": 4, "reps": "12 total", "restSeconds": 90, "notes": "Long stride", "healthBenefits": "Unilateral strength"},
          {"name": "C1. Pallof Press", "type": "strength", "sets": 3, "reps": "10/side", "restSeconds": 0, "notes": "Anti-rotation", "healthBenefits": "Core stability"},
          {"name": "C2. Face Pulls", "type": "strength", "sets": 3, "reps": "15", "restSeconds": 60, "notes": "Squeeze at top", "healthBenefits": "Posture correction"},
          {"name": "Finisher: Assault Bike Intervals", "type": "cardio", "sets": 1, "reps": "8x20s on/40s off", "restSeconds": 0, "notes": "All-out effort", "healthBenefits": "Metabolic conditioning"},
          {"name": "Cooldown: 90/90 Hip Stretch", "type": "timed", "sets": 1, "reps": "2 mins", "restSeconds": 0, "notes": "Both sides", "healthBenefits": "Hip recovery"}
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
  "weeklyRationale": "A detailed 2-3 paragraph explanation of WHY this specific plan was created for this user. Reference their workout history, recent performance trends, exercises where they've progressed or plateaued, and how this week's workouts address their specific situation. This should feel personalized and intelligent, not generic. Example: 'Based on your last 4 weeks of training, you've shown great progress in compound lifts with a 12% volume increase. Your bench press and squats are trending up nicely. However, I noticed your pull exercises have plateaued. This week, I'm introducing Romanian Deadlift variations and adding an extra set to rows to break through that plateau. Your average difficulty rating of 3.8/5 suggests you're ready for slightly more challenging workouts...'",
  "personalizationNotes": {
    "healthProfileInsights": ["Resting blood pressure 135/85 so tempo control added"],
    "labInsightsAddressed": ["High LDL implies three moderate cardio blocks per week"],
    "supplementCoordination": "Avoided adaptogens already supplied by formula",
    "goalAlignment": "Supports recomposition and glucose control",
    "progressionRationale": "If workout history was provided, explain specific exercise progressions here"
  }
}

**⚠️ FINAL CHECK: You are generating for ${experienceLevel.toUpperCase()} level. Each workout MUST have ${minExercises}-${maxExercises} exercises. COUNT THEM.**

Be practical, safe, and results-driven. This program should be sustainable long-term.`;

  return prompt;
}

/**
 * Build prompt for AI to generate lifestyle coaching plan
 */
export function buildLifestylePlanPrompt(context: OptimizeContext, snapshot?: PersonalizationSnapshot): string {
  const { user, healthProfile, labData, biometrics, preferences } = context;
  const personalizationSnapshot = resolveSnapshot(context, snapshot);

  let prompt = `You are a holistic wellness coach creating a personalized lifestyle protocol for ${user.name}.

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

Create a lifestyle wellness plan with morning intentions, evening routines, stress management tools, and a weekly focus area.

## Requirements

1. Create an inspiring morning routine focused on setting intentions and motivation
2. Create a calming evening wind-down routine for optimal sleep
3. Provide practical stress management techniques with breathing exercises
4. Set a weekly focus theme that rotates each week
5. Include YouTube search terms for finding relevant guided content
6. Tie recommendations to user's health profile and goals

## Output JSON Structure

{
  "weeklyGuidance": "Personalized explanation of why this lifestyle protocol is optimal for them, referencing their specific health data and goals.",
  
  "morningIntentions": {
    "title": "Morning Intention Setting",
    "wakeTime": "6:30 AM",
    "routine": [
      {
        "step": 1,
        "action": "Hydrate with warm lemon water",
        "duration": "2 min",
        "why": "Kickstarts metabolism and hydration after sleep"
      },
      {
        "step": 2,
        "action": "5 minutes of morning sunlight exposure",
        "duration": "5 min",
        "why": "Sets circadian rhythm and boosts cortisol awakening response"
      },
      {
        "step": 3,
        "action": "Set your intention for the day",
        "duration": "3 min",
        "why": "Creates focus and purpose"
      }
    ],
    "affirmation": "I am capable, focused, and ready to embrace today's challenges.",
    "youtubeSearch": "morning motivation affirmations 10 minutes"
  },
  
  "eveningRoutine": {
    "title": "Evening Wind-Down",
    "startTime": "9:00 PM",
    "bedtime": "10:30 PM",
    "routine": [
      {
        "step": 1,
        "action": "Blue light blocking glasses on",
        "time": "9:00 PM",
        "why": "Protects melatonin production"
      },
      {
        "step": 2,
        "action": "Light stretching or gentle yoga",
        "time": "9:15 PM",
        "duration": "10 min",
        "why": "Releases physical tension from the day"
      },
      {
        "step": 3,
        "action": "Gratitude journaling - write 3 things",
        "time": "9:30 PM",
        "duration": "5 min",
        "why": "Shifts mind to positive state before sleep"
      },
      {
        "step": 4,
        "action": "Sleep meditation or breathing",
        "time": "10:00 PM",
        "duration": "10 min",
        "why": "Activates parasympathetic nervous system"
      }
    ],
    "youtubeSearch": "guided sleep meditation 10 minutes"
  },
  
  "stressTools": {
    "title": "Daily Stress Management",
    "techniques": [
      {
        "name": "Box Breathing",
        "description": "Inhale 4 sec, hold 4 sec, exhale 4 sec, hold 4 sec. Repeat 4 times.",
        "duration": "2-3 min",
        "when": "When feeling overwhelmed or before important meetings",
        "youtubeSearch": "box breathing exercise guided"
      },
      {
        "name": "5-4-3-2-1 Grounding",
        "description": "Notice 5 things you see, 4 you hear, 3 you feel, 2 you smell, 1 you taste",
        "duration": "2 min",
        "when": "During anxiety or racing thoughts",
        "youtubeSearch": null
      },
      {
        "name": "10-Minute Meditation",
        "description": "Guided mindfulness meditation for stress relief",
        "duration": "10 min",
        "when": "Midday break or after work",
        "youtubeSearch": "10 minute guided meditation stress relief"
      }
    ],
    "emergencyReset": "If overwhelmed: Step outside, 10 deep breaths, cold water on wrists"
  },
  
  "weeklyFocus": {
    "theme": "Sleep Optimization",
    "description": "This week, prioritize consistent sleep timing. Go to bed and wake at the same time daily, even weekends.",
    "actionItems": [
      "Set phone alarm for bedtime routine start",
      "Track sleep quality each morning (1-5 scale)",
      "No screens in bedroom"
    ],
    "youtubeSearch": "sleep hygiene tips"
  },
  
  "sleepTargets": {
    "targetHours": 8,
    "bedtime": "10:30 PM",
    "wakeTime": "6:30 AM",
    "tips": [
      "Keep bedroom at 65-68°F",
      "No caffeine after 2 PM",
      "Dim lights 2 hours before bed"
    ]
  }
}

Make the content warm, encouraging, and achievable. Focus on building sustainable habits.`;

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
