/**
 * AI Prompt Templates for Optimize Feature
 * Generates nutrition plans, workout programs, and lifestyle coaching
 * based on user's health profile, labs, supplement formula, and biometric data
 */

import type { HealthProfile, Formula, LabAnalysis } from "../shared/schema";

interface OptimizeContext {
  user: {
    id: string;
    name: string;
    email: string;
  };
  healthProfile?: HealthProfile;
  activeFormula?: Formula;
  labData?: {
    reports: LabAnalysis[];
    summary: string;
  };
  biometrics?: {
    recentSleep?: number; // hours
    recentHRV?: number; // ms
    recentSteps?: number;
    recentRHR?: number; // bpm
  };
  preferences: {
    daysPerWeek?: number; // for workouts
    experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
    dietaryRestrictions?: string[];
    goals?: string;
  };
}

/**
 * Build prompt for AI to generate comprehensive nutrition plan
 * Considers: lab abnormalities, supplement formula (don't duplicate), dietary preferences
 */
export function buildNutritionPlanPrompt(context: OptimizeContext): string {
  const { user, healthProfile, activeFormula, labData, preferences } = context;

  let prompt = `You are a clinical nutrition expert creating a personalized 7-day meal plan for ${user.name}.

# USER HEALTH CONTEXT

## Demographics
`;

  if (healthProfile) {
    prompt += `- Age: ${healthProfile.age || 'Not provided'}
- Sex: ${healthProfile.sex || 'Not provided'}
- Height: ${healthProfile.heightCm ? `${healthProfile.heightCm}cm` : 'Not provided'}
- Weight: ${healthProfile.weightLbs ? `${healthProfile.weightLbs}lbs` : 'Not provided'}
- Activity Level: ${healthProfile.exerciseDaysPerWeek ? `${healthProfile.exerciseDaysPerWeek} days/week` : 'Not specified'}
`;
  }

if (healthProfile?.medications && Array.isArray(healthProfile.medications) && healthProfile.medications.length > 0) {
    prompt += `\n## Current Medications\n${healthProfile.medications.map((m: any) => `- ${m}`).join('\n')}\n`;
  }

  if (labData && labData.summary) {
    prompt += `\n## Lab Results Summary\n${labData.summary}\n\n`;
    prompt += `**Key Areas to Address via Nutrition:**\n`;
    prompt += `- Identify markers that are out of range\n`;
    prompt += `- Suggest foods that support optimization of these markers\n`;
    prompt += `- Avoid foods that may worsen abnormalities\n`;
  }

  if (activeFormula) {
    prompt += `\n## Current Supplement Formula\n`;
    prompt += `User is already taking these supplements - DO NOT duplicate nutrients in meal plan:\n\n`;
    
    if (activeFormula.bases && Array.isArray(activeFormula.bases)) {
      prompt += `**Base Formulas:**\n`;
      activeFormula.bases.forEach((base: any) => {
        prompt += `- ${base.ingredient} (${base.amount}${base.unit})\n`;
      });
    }
    
    if (activeFormula.additions && Array.isArray(activeFormula.additions)) {
      prompt += `\n**Individual Ingredients:**\n`;
      activeFormula.additions.forEach((add: any) => {
        prompt += `- ${add.ingredient} (${add.amount}${add.unit})\n`;
      });
    }

    prompt += `\n**Important:** The meal plan should COMPLEMENT these supplements, not duplicate them. Focus on whole food nutrition.\n`;
  }

  if (preferences.dietaryRestrictions && preferences.dietaryRestrictions.length > 0) {
    prompt += `\n## Dietary Restrictions\n`;
    preferences.dietaryRestrictions.forEach(r => {
      prompt += `- ${r}\n`;
    });
  }

  if (preferences.goals) {
    prompt += `\n## Nutrition Goals\n${preferences.goals}\n`;
  }

  prompt += `\n# TASK

Generate a comprehensive 7-day meal plan optimized for this user's health profile, lab results, and goals.

## Requirements

1. **Macronutrient Targets:**
   - Calculate based on user's weight, activity level, and goals
   - Provide daily breakdown: protein, carbs, fats, calories

2. **Meal Structure:**
   - 3 main meals + 2 snacks per day
   - Each meal includes:
     * Recipe name
     * Ingredients with quantities
     * Macros (calories, protein, carbs, fat)
     * Prep time
     * Why this meal supports their health goals

3. **Lab-Driven Optimization:**
   - Address any abnormal markers through food choices
   - Example: High cholesterol → emphasize fiber, omega-3s, avoid saturated fats
   - Example: Low vitamin D → include fortified foods, fatty fish

4. **Variety & Sustainability:**
   - Different protein sources throughout the week
   - Seasonal, accessible ingredients
   - Realistic prep times (mostly 15-30 min)

5. **Supplement Coordination:**
   - DO NOT recommend foods rich in nutrients already in their supplement formula
   - Focus on vitamins, minerals, and nutrients NOT covered by supplements

## Output Format (JSON)

Return ONLY valid JSON in this exact structure:

\`\`\`json
{
  "macroTargets": {
    "dailyCalories": 2200,
    "proteinGrams": 165,
    "carbsGrams": 220,
    "fatGrams": 73
  },
  "weekPlan": [
    {
      "day": 1,
      "dayName": "Monday",
      "meals": [
        {
          "mealType": "breakfast",
          "name": "Protein-Packed Oatmeal Bowl",
          "ingredients": ["1 cup oats", "1 scoop protein powder", "1/2 cup berries", "1 tbsp almond butter"],
          "instructions": "Cook oats, stir in protein powder, top with berries and almond butter",
          "prepTimeMinutes": 10,
          "macros": {
            "calories": 450,
            "protein": 30,
            "carbs": 52,
            "fat": 14
          },
          "healthBenefits": "High fiber supports cholesterol management; protein stabilizes blood sugar"
        }
      ],
      "dailyTotals": {
        "calories": 2180,
        "protein": 163,
        "carbs": 218,
        "fat": 71
      }
    }
  ],
  "shoppingList": [
    {"item": "Rolled oats", "quantity": "2 lbs", "category": "grains"},
    {"item": "Chicken breast", "quantity": "3 lbs", "category": "protein"}
  ],
  "weeklyGuidance": "This plan addresses your elevated cholesterol by emphasizing soluble fiber (oats, beans, berries) and omega-3s (salmon 3x/week). We're keeping saturated fat under 20g/day to support cardiovascular health.",
  "mealPrepTips": [
    "Sunday: Cook 3 lbs chicken breast, portion into containers",
    "Monday: Prep overnight oats for Tuesday-Thursday"
  ]
}
\`\`\`

Be specific, practical, and evidence-based. This is a real person's health we're optimizing.`;

  return prompt;
}

/**
 * Build prompt for AI to generate workout program
 * Considers: fitness level, time availability, injuries, health goals
 */
export function buildWorkoutPlanPrompt(context: OptimizeContext): string {
  const { user, healthProfile, labData, biometrics, preferences } = context;

  let prompt = `You are a certified strength & conditioning specialist creating a personalized workout program for ${user.name}.

# USER FITNESS CONTEXT

## Current Stats
`;

  if (healthProfile) {
    prompt += `- Age: ${healthProfile.age || 'Not provided'}
- Sex: ${healthProfile.sex || 'Not provided'}
- Current Activity Level: ${healthProfile.exerciseDaysPerWeek ? `${healthProfile.exerciseDaysPerWeek} days/week` : 'Sedentary'}
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

  if (healthProfile?.conditions && healthProfile.conditions.length > 0) {
    prompt += `\n## Medical Considerations\n`;
    healthProfile.conditions.forEach((condition) => {
      prompt += `- ${condition}\n`;
    });
  }

  if (healthProfile?.medications && healthProfile.medications.length > 0) {
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
    prompt += `\nTranslate abnormal markers into specific training prescriptions. For example: elevated LDL → prioritize moderate-intensity cardio 3-4x/week; impaired glucose tolerance → include interval training + resistance work that improves insulin sensitivity; hypertension → emphasize aerobic conditioning, breathing drills, and avoid heavy Valsalva maneuvers.\n`;
  }

  if (preferences.goals) {
    prompt += `\n## Fitness Goals\n${preferences.goals}\n`;
  }

  prompt += `\n# TASK

Create a structured ${preferences.daysPerWeek || 3}-day/week workout program tailored to this user's level, goals, and limitations.

## Requirements

1. **Progressive Overload:**
   - Start conservatively based on experience level
   - Clear progression plan (weights, reps, sets)
   - Build gradually to prevent injury

2. **Program Structure:**
   - Warm-up routine (5-10 min)
   - Main workout (30-45 min)
   - Cool-down/stretching (5-10 min)

3. **Exercise Selection:**
   - Appropriate for experience level
   - Work around any injuries
   - Include compound movements (if appropriate)
   - Balance muscle groups

4. **Safety & Form:**
   - Form cues for each exercise
   - Modification options for beginners
   - Red flags to stop (pain, dizziness, etc.)

5. **Metabolic & Cardiovascular Priorities:**
  - Explicitly address lab abnormalities or health conditions (e.g., dyslipidemia, insulin resistance, high blood pressure)
  - Specify cardio dosage, intensity zones, and frequency when cholesterol, triglycerides, or glucose markers are elevated
  - Include heart-healthy conditioning blocks even inside strength days when relevant

6. **Why Each Element Matters:**
  - Every workout object must include \`healthFocus\` explaining the intent (e.g., "Improves HDL by combining moderate cardio + tempo strength")
  - Every exercise (warmup/main/cooldown) needs a \`healthBenefits\` string tying it back to labs, biometrics, or health goals

7. **Recovery Guidance:**
   - Rest days between sessions
   - Active recovery suggestions
   - Signs of overtraining

## Output Format (JSON)

Return ONLY valid JSON in this exact structure:

\`\`\`json
{
  "programOverview": {
    "daysPerWeek": 3,
    "durationWeeks": 8,
    "focus": "Full-body strength with cardiovascular conditioning",
    "targetAudience": "intermediate"
  },
  "weeklySchedule": {
    "monday": "Upper Body Strength",
    "wednesday": "Lower Body + Core",
    "friday": "Full Body Conditioning"
  },
  "workouts": [
    {
      "dayOfWeek": 1,
      "workoutName": "Upper Body Strength",
      "totalDuration": 50,
      "healthFocus": "Improves insulin sensitivity via large compound lifts and finishes with moderate cardio",
      "warmup": {
        "exercises": [
          {"name": "Arm circles", "duration": "30 seconds", "sets": 2, "healthBenefits": "Lubricates shoulder joint before pressing"},
          {"name": "Band pull-aparts", "reps": 15, "sets": 2, "healthBenefits": "Activates postural muscles to support better breathing mechanics"}
        ]
      },
      "mainWorkout": {
        "exercises": [
          {
            "name": "Dumbbell Bench Press",
            "sets": 3,
            "reps": "8-10",
            "rest": "90 seconds",
            "formCues": ["Keep shoulder blades retracted", "Lower weight to chest level", "Press through heels"],
            "modifications": {
              "easier": "Push-ups on knees",
              "harder": "Barbell bench press"
            },
            "targetMuscles": ["chest", "triceps", "shoulders"],
            "healthBenefits": "Builds lean mass to improve metabolic rate without spiking BP"
          }
        ]
      },
      "cooldown": {
        "exercises": [
          {"name": "Chest doorway stretch", "duration": "30 seconds", "sets": 2, "healthBenefits": "Opens anterior chain for better breathing and posture"},
          {"name": "Shoulder rolls", "duration": "30 seconds", "sets": 2, "healthBenefits": "Downregulates nervous system after loading"}
        ]
      }
    }
  ],
  "progressionPlan": {
    "week1-2": "Learn movement patterns, establish baseline",
    "week3-4": "Increase weight by 5-10% if form is good",
    "week5-6": "Add 1-2 reps per set OR increase weight",
    "week7-8": "Test new 1RMs or max reps"
  },
  "safetyGuidelines": [
    "Stop immediately if you feel sharp pain (not muscle burn)",
    "Never sacrifice form for heavier weight",
    "Warm up properly before every session"
  ],
  "equipmentNeeded": [
    "Dumbbells (5-25 lbs)",
    "Resistance bands",
    "Yoga mat"
  ]
}
\`\`\`

Be practical, safe, and results-driven. This program should be sustainable long-term.`;

  return prompt;
}

/**
 * Build prompt for AI to generate lifestyle coaching plan
 * Considers: sleep data, stress levels, recovery metrics, health goals
 */
export function buildLifestylePlanPrompt(context: OptimizeContext): string {
  const { user, healthProfile, labData, biometrics, preferences } = context;

  let prompt = `You are a functional medicine lifestyle coach creating a personalized wellness protocol for ${user.name}.

# USER WELLNESS CONTEXT

## Current Lifestyle
`;

  if (healthProfile) {
    prompt += `- Sleep: ${healthProfile.sleepHoursPerNight ? `${healthProfile.sleepHoursPerNight} hours/night` : 'Not tracked'}
- Stress Level: ${healthProfile.stressLevel || 'Not reported'}
- Alcohol: ${healthProfile.alcoholDrinksPerWeek ? `${healthProfile.alcoholDrinksPerWeek} drinks/week` : 'None'}
- Smoking: ${healthProfile.smokingStatus || 'Not reported'}
`;
  }

  if (biometrics) {
    prompt += `\n## Biometric Trends (Recent 7-day average)\n`;
    if (biometrics.recentSleep) prompt += `- Sleep Duration: ${biometrics.recentSleep} hours\n`;
    if (biometrics.recentHRV) prompt += `- HRV: ${biometrics.recentHRV} ms ${biometrics.recentHRV < 50 ? '(LOW - indicates stress/poor recovery)' : '(GOOD)'}\n`;
    if (biometrics.recentRHR) prompt += `- Resting HR: ${biometrics.recentRHR} bpm\n`;
  }

if (labData && labData.summary) {
    prompt += `\n## Lab-Based Insights\n${labData.summary}\n`;
    prompt += `\nConsider how lifestyle factors (sleep, stress, hydration) impact these markers.\n`;
  }

  if (preferences.goals) {
    prompt += `\n## Wellness Goals\n${preferences.goals}\n`;
  }

  prompt += `\n# TASK

Create a comprehensive lifestyle optimization protocol addressing sleep, stress, recovery, and daily habits.

## Requirements

1. **Sleep Optimization:**
   - Target sleep duration based on data
   - Sleep hygiene protocol
   - Evening routine recommendations
   - Morning light exposure strategy
  - Include a short \`reason\` for target hours and each routine step

2. **Stress Management:**
   - Evidence-based techniques (breathing, meditation, etc.)
   - Daily practices (5-10 min realistic)
   - Acute stress response toolkit
  - Provide a \`reason\` for every technique that references labs/biometrics/health profile

3. **Recovery Protocols:**
   - Post-workout recovery
   - Weekly recovery day activities
   - Signs you need extra rest
  - Each recommendation should include a \`reason\` tying it to user data when possible

4. **Hydration Strategy:**
   - Daily water intake target
   - Electrolyte timing (based on activity)
   - Avoid: excessive caffeine, late-day fluids
    "reason": "7.5 hours lowers evening cortisol and supports lipid metabolism",

5. **Habit Stacking:**
   - Morning routine (10-15 min)
      {"time": "9:00 PM", "action": "Dim lights, stop screens", "reason": "Reduces blue light to boost melatonin"},
      {"time": "9:30 PM", "action": "Take magnesium supplement", "reason": "Supports parasympathetic shift"},
      {"time": "10:00 PM", "action": "Read or gentle stretching", "reason": "Lowers evening cortisol"},
      {"time": "10:30 PM", "action": "Lights out", "reason": "Fixed sleep window keeps circadian rhythm aligned"}

Return ONLY valid JSON in this exact structure:
      {"time": "6:00 AM", "action": "Wake naturally (no snooze)", "reason": "Avoids cortisol spikes"},
      {"time": "6:05 AM", "action": "10 min sunlight exposure outside", "reason": "Anchors circadian clock"},
      {"time": "6:15 AM", "action": "Hydrate with 16oz water", "reason": "Replenishes overnight fluid loss"}
  "sleepProtocol": {
    "targetHours": 7.5,
      {"tip": "Keep bedroom 65-68°F", "reason": "Cool temps improve deep sleep"},
      {"tip": "Use blackout curtains or sleep mask", "reason": "Keeps melatonin high"},
      {"tip": "White noise if needed", "reason": "Reduces sleep fragmentation"},
      {"tip": "No caffeine after 2 PM", "reason": "Prevents REM suppression"}
      {"time": "9:30 PM", "action": "Take magnesium supplement"},
      {"time": "10:00 PM", "action": "Read or gentle stretching"},
      {"time": "10:30 PM", "action": "Lights out"}
    ],
    "morningRoutine": [
      {"time": "6:00 AM", "action": "Wake naturally (no snooze)"},
      {"time": "6:05 AM", "action": "10 min sunlight exposure outside"},
      {"time": "6:15 AM", "action": "Hydrate with 16oz water"}
    ],
        "reason": "Activates parasympathetic nervous system to lower cortisol/LDL"
      "Keep bedroom 65-68°F",
      "Use blackout curtains or sleep mask",
      "White noise if needed",
      {"tool": "4-7-8 breathing", "reason": "Drops heart rate quickly"},
      {"tool": "5-minute walk outside", "reason": "Improves insulin sensitivity during stress"},
      {"tool": "Cold water on face", "reason": "Triggers vagal response"}
  "stressManagement": {
    "dailyPractices": [
      {
        "technique": "Box Breathing",
        "duration": 5,
      {"time": "Upon waking", "amount": "16 oz", "reason": "Rehydrates after sleep"},
      {"time": "Mid-morning", "amount": "20 oz", "reason": "Supports cognitive performance"},
      {"time": "Before lunch", "amount": "16 oz", "reason": "Helps satiety for weight goals"},
      {"time": "Afternoon", "amount": "20 oz", "reason": "Counters afternoon fatigue"},
      {"time": "Pre-workout", "amount": "16 oz", "reason": "Optimizes plasma volume"},
      {"time": "With dinner", "amount": "12 oz", "reason": "Aids digestion"}
      "4-7-8 breathing (immediate calm in 60 seconds)",
    "electrolytes": "Add 1/4 tsp sea salt to morning water; electrolyte drink post-workout",
    "reason": "Balances sodium losses from training and supports blood pressure"
      "Cold water on face (dive reflex)"
    ]
  },
      {"practice": "10 min foam rolling before bed", "reason": "Improves circulation and lowers RHR"},
      {"practice": "Contrast shower: 30s cold, 90s hot, repeat 3x", "reason": "Reduces inflammation and aids lipid metabolism"}
    "timing": [
      {"time": "Upon waking", "amount": "16 oz"},
      {"practice": "Sunday: 30 min gentle yoga or stretching", "reason": "Stimulates parasympathetic recovery"},
      {"practice": "Wednesday: Active recovery walk (20-30 min)", "reason": "Improves HDL via NEAT"}
      {"time": "Afternoon", "amount": "20 oz"},
      {"time": "Pre-workout", "amount": "16 oz"},
      {"time": "With dinner", "amount": "12 oz"}
    ],
    "electrolytes": "Add 1/4 tsp sea salt to morning water; electrolyte drink post-workout"
  },
  "recoveryProtocol": {
    "dailyRecovery": [
      "10 min foam rolling before bed",
      {"habit": "☀️ Sunlight exposure (6:05 AM)", "reason": "Boosts serotonin and circadian alignment"},
      {"habit": "💧 Hydrate 16oz (6:15 AM)", "reason": "Supports lipid transport"},
      {"habit": "🧘 5-min breathing exercise (6:20 AM)", "reason": "Keeps HRV higher"}
      "Sunday: 30 min gentle yoga or stretching",
      "Wednesday: Active recovery walk (20-30 min)"
    ],
    "signsToRest": [
      "HRV drops >10ms below baseline",
      "Resting HR elevated >5 bpm",
      "Persistent fatigue despite sleep"
    ]
  },
  "habitStack": {
    "morning": [
      "☀️ Sunlight exposure (6:05 AM)",
      "💧 Hydrate 16oz (6:15 AM)",
      "🧘 5-min breathing exercise (6:20 AM)",
      "💊 Take supplements with breakfast (7:00 AM)"
    ],
    "evening": [
      "🌙 Dim lights (9:00 PM)",
      "📵 Screens off (9:00 PM)",
      "🧊 Foam roll 10 min (9:30 PM)",
      "📖 Read 20 min (10:00 PM)"
    ]
  },
  "weeklyChecklist": [
    "✅ 7+ hours sleep each night",
    "✅ Daily breathing practice",
    "✅ 100oz water daily",
    "✅ 1 full recovery day",
    "✅ Consistent sleep/wake times (±30 min)"
  ],
  "rationale": "Your HRV of 45ms suggests sympathetic dominance (stress response). This protocol prioritizes parasympathetic activation through sleep optimization, breathwork, and structured recovery. Expect HRV to improve 10-20% within 4 weeks."
}
\`\`\`

Be specific, actionable, and sustainable. Small consistent changes compound over time.`;

  return prompt;
}
