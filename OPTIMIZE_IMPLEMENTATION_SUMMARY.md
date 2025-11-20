# Optimize Feature - Phase 1 Implementation Summary

## Completed: Database Schema & Storage Layer (Jan 15, 2025)

### ✅ Database Schema Added
Successfully added 11 new tables to `shared/schema.ts` and pushed to Supabase database:

#### Core Plan Tables
1. **`optimize_plans`** - Stores AI-generated wellness plans
   - Fields: userId, planType (nutrition/workout/lifestyle), content (JSON), rationale, preferences (JSON), basedOnFormulaId, basedOnLabs (snapshot), isActive
   - Links plans to current supplement formula and lab results
   - Tracks which data was used to generate each plan

2. **`optimize_daily_logs`** - Daily habit tracking
   - Fields: userId, logDate, nutritionCompleted, workoutCompleted, supplementsTaken, waterIntakeOz, energyLevel (1-10), moodLevel (1-10), sleepQuality (1-10), notes
   - Enables tracking compliance and how user feels
   - Powers streak calculations

3. **`user_streaks`** - Consistency tracking
   - Fields: userId, streakType (overall/nutrition/workout/lifestyle), currentStreak, longestStreak, lastLogDate
   - Gamifies healthy habits
   - Separate streaks for each wellness pillar

#### Workout Tables
4. **`workout_plans`** - Weekly workout programs
   - Fields: userId, name, daysPerWeek, duration, experienceLevel, workoutSchedule (JSON), isActive
   - Supports 1-7 days/week programs
   - Beginner/intermediate/advanced levels

5. **`workouts`** - Individual workout sessions
   - Fields: planId, dayOfWeek, name, duration, exercises (JSON array), warmup (JSON), cooldown (JSON)
   - Full exercise library in JSON format
   - Form cues, modifications, target muscles

6. **`workout_logs`** - Completed workout tracking
   - Fields: userId, workoutId, completedAt, exercisesCompleted (JSON), duration, difficultyRating (1-10), notes
   - Tracks actual vs. prescribed exercises
   - User feedback for AI to adapt future programs

#### Nutrition Tables
7. **`meal_plans`** - Weekly nutrition plans
   - Fields: userId, name, startDate, endDate, macros (JSON), meals (JSON), isActive
   - 7-day meal structures with recipes
   - Macro targets based on goals/labs

8. **`recipes`** - Recipe library (to be seeded with 200+ recipes)
   - Fields: name, description, category, ingredients (JSON), instructions (text), prepTimeMinutes, cookTimeMinutes, servings, macros (JSON), tags (array), imageUrl
   - Searchable by tags, category, macros
   - Used to build meal plans

9. **`meal_logs`** - Meal tracking
   - Fields: userId, mealPlanId, recipeId, mealType (breakfast/lunch/dinner/snack), mealDate, servingsConsumed, wasSwapped, notes
   - Tracks compliance and swaps
   - Identifies user preferences over time

10. **`grocery_lists`** - Auto-generated shopping lists
    - Fields: userId, mealPlanId, items (JSON array), generatedDate, isPurchased
    - Pulls ingredients from week's meal plan
    - Groups by category (produce, protein, etc.)

#### SMS & Preferences
11. **`optimize_sms_preferences`** - Enhanced SMS reminders
    - Fields: userId, morningEnabled, morningTime, workoutEnabled, workoutTime, eveningEnabled, eveningTime, includeNutritionInfo, includeWorkoutInfo
    - Extends existing SMS system
    - 3 reminder types: morning, pre-workout, evening

### ✅ Storage Layer Methods Added (`server/storage.ts`)
Implemented 30+ new methods in `DrizzleStorage` class:

#### Optimize Plans
- `createOptimizePlan()` - Save AI-generated plan
- `getOptimizePlan(id)` - Retrieve specific plan
- `getActiveOptimizePlan(userId, planType)` - Get current nutrition/workout/lifestyle plan
- `listOptimizePlans(userId)` - Get all plans for history
- `updateOptimizePlan(id, updates)` - Modify plan (mark inactive, etc.)

#### Daily Logs & Streaks
- `createDailyLog(log)` - Log day's completion (auto-updates streak)
- `getDailyLog(userId, date)` - Get log for specific day
- `listDailyLogs(userId, startDate, endDate)` - Range query for charts
- `updateDailyLog(id, updates)` - Modify existing log
- `getUserStreak(userId, streakType)` - Get current/longest streak
- `updateUserStreak(userId, logDate)` - Recalculate streak (called automatically)

#### Workout Plans & Logs
- `createWorkoutPlan(plan)` - Save AI-generated program
- `getWorkoutPlan(id)` - Retrieve plan
- `getActiveWorkoutPlan(userId)` - Get current program
- `createWorkout(workout)` - Add individual session to plan
- `getWorkout(id)` - Retrieve session
- `listWorkoutsByPlan(planId)` - Get all sessions in program
- `createWorkoutLog(log)` - Log completed workout
- `listWorkoutLogs(userId, startDate?, endDate?)` - Get workout history

#### Meal Plans & Recipes
- `createMealPlan(plan)` - Save AI-generated nutrition plan
- `getMealPlan(id)` - Retrieve plan
- `getActiveMealPlan(userId)` - Get current week's meals
- `getRecipe(id)` - Retrieve recipe details
- `searchRecipes(filters)` - Find recipes by tags, category, calories, query
  - Supports: `tags`, `category`, `maxCalories`, `query` (name/description search)
- `createMealLog(log)` - Log meal eaten
- `listMealLogs(userId, startDate?, endDate?)` - Get nutrition history

#### Grocery Lists
- `createGroceryList(list)` - Save generated list
- `getGroceryList(id)` - Retrieve list
- `getActiveGroceryList(userId)` - Get current unpurchased list
- `updateGroceryList(id, updates)` - Mark purchased, modify items

#### SMS Preferences
- `getOptimizeSmsPreferences(userId)` - Get user's reminder settings
- `createOrUpdateOptimizeSmsPreferences(prefs)` - Upsert preferences

### ✅ AI Prompt Templates Created (`server/optimize-prompts.ts`)
Three comprehensive prompt builders that inject user data:

#### 1. `buildNutritionPlanPrompt(context)`
**Injects:**
- Demographics (age, sex, height, weight, activity level)
- Medical conditions & medications
- Lab results summary (identifies abnormal markers)
- Current supplement formula (to avoid duplication)
- Dietary restrictions
- User's nutrition goals

**Returns JSON Structure:**
```typescript
{
  macroTargets: { dailyCalories, proteinGrams, carbsGrams, fatGrams },
  weekPlan: [
    {
      day: 1,
      dayName: "Monday",
      meals: [
        {
          mealType: "breakfast",
          name: "Protein-Packed Oatmeal Bowl",
          ingredients: [...],
          instructions: "...",
          prepTimeMinutes: 10,
          macros: { calories: 450, protein: 30, carbs: 52, fat: 14 },
          healthBenefits: "High fiber supports cholesterol management..."
        }
      ],
      dailyTotals: { calories, protein, carbs, fat }
    }
  ],
  shoppingList: [...],
  weeklyGuidance: "This plan addresses your elevated cholesterol...",
  mealPrepTips: [...]
}
```

**Key Features:**
- Lab-driven optimization (e.g., high cholesterol → more fiber, less saturated fat)
- Complements supplement formula (doesn't duplicate nutrients)
- 7 days, 3 meals + 2 snacks/day
- Practical prep times (15-30 min)
- Auto-generated shopping list

#### 2. `buildWorkoutPlanPrompt(context)`
**Injects:**
- Age, sex, current activity level
- Experience level (beginner/intermediate/advanced)
- Available training days (1-7/week)
- Injuries/limitations (works around them)
- Medical conditions
- Biometric data (RHR, HRV, steps)
- Fitness goals

**Returns JSON Structure:**
```typescript
{
  programOverview: {
    daysPerWeek: 3,
    durationWeeks: 8,
    focus: "Full-body strength with cardiovascular conditioning",
    targetAudience: "intermediate"
  },
  weeklySchedule: { monday: "Upper Body Strength", wednesday: "Lower Body + Core", ... },
  workouts: [
    {
      dayOfWeek: 1,
      workoutName: "Upper Body Strength",
      totalDuration: 50,
      warmup: { exercises: [...] },
      mainWorkout: {
        exercises: [
          {
            name: "Dumbbell Bench Press",
            sets: 3,
            reps: "8-10",
            rest: "90 seconds",
            formCues: ["Keep shoulder blades retracted", ...],
            modifications: { easier: "Push-ups on knees", harder: "Barbell bench press" },
            targetMuscles: ["chest", "triceps", "shoulders"]
          }
        ]
      },
      cooldown: { exercises: [...] }
    }
  ],
  progressionPlan: { "week1-2": "Learn movement patterns", "week3-4": "Increase weight by 5-10%", ... },
  safetyGuidelines: [...],
  equipmentNeeded: [...]
}
```

**Key Features:**
- Safe progressions (conservative start, gradual increase)
- Injury-aware exercise selection
- Form cues for every exercise
- Beginner/advanced modifications
- Clear progression plan (8-week programs)
- Safety guidelines (when to stop, red flags)

#### 3. `buildLifestylePlanPrompt(context)`
**Injects:**
- Current lifestyle (sleep hours, stress level, alcohol, smoking)
- Biometric trends (7-day avg: sleep duration, HRV, RHR)
- Major stressors
- Lab results (how lifestyle impacts markers)
- Wellness goals

**Returns JSON Structure:**
```typescript
{
  sleepProtocol: {
    targetHours: 7.5,
    bedtime: "10:30 PM",
    wakeTime: "6:00 AM",
    eveningRoutine: [
      { time: "9:00 PM", action: "Dim lights, stop screens" },
      { time: "10:30 PM", action: "Lights out" }
    ],
    morningRoutine: [...],
    sleepHygiene: [...]
  },
  stressManagement: {
    dailyPractices: [
      {
        technique: "Box Breathing",
        duration: 5,
        timing: "Morning before work",
        instructions: "Inhale 4 counts, hold 4, exhale 4, hold 4. Repeat 5 cycles.",
        benefits: "Activates parasympathetic nervous system, reduces cortisol"
      }
    ],
    acuteStressToolkit: [...]
  },
  hydrationPlan: {
    dailyTarget: "100 oz",
    timing: [...],
    electrolytes: "Add 1/4 tsp sea salt to morning water..."
  },
  recoveryProtocol: {
    dailyRecovery: [...],
    weeklyRecovery: [...],
    signsToRest: ["HRV drops >10ms below baseline", ...]
  },
  habitStack: {
    morning: ["☀️ Sunlight exposure (6:05 AM)", "💧 Hydrate 16oz (6:15 AM)", ...],
    evening: [...]
  },
  weeklyChecklist: [...],
  rationale: "Your HRV of 45ms suggests sympathetic dominance..."
}
```

**Key Features:**
- Data-driven recommendations (uses biometric trends)
- Evidence-based techniques (breathing, light exposure, etc.)
- Micro-habits (5-10 min practices)
- Habit stacking (anchor to existing routines)
- Clear recovery protocols (when to rest)
- Weekly checklist for consistency

### ✅ Database Migration Verified
Ran `npm run db:push` successfully, confirmed all tables exist:
```
✅ Found 39 tables:
   - optimize_plans ✓
   - optimize_daily_logs ✓
   - workout_plans ✓
   - workouts ✓
   - workout_logs ✓
   - meal_plans ✓
   - recipes ✓
   - meal_logs ✓
   - grocery_lists ✓
   - optimize_sms_preferences ✓
   - user_streaks ✓
```

### ✅ Dev Server Running
Server started successfully with all schedulers:
- SMS reminder scheduler ✓
- Wearable token refresh scheduler ✓
- Wearable data sync scheduler ✓

---

## Next Steps (Phase 2): API Routes

### Required Endpoints (Week 2)

#### Plan Generation
- **POST `/api/optimize/plans/generate`**
  - Body: `{ planTypes: ['nutrition', 'workout', 'lifestyle'], preferences: {...} }`
  - Calls AI with appropriate prompt builder
  - Saves all 3 plans to database
  - Returns: `{ nutritionPlan, workoutPlan, lifestylePlan }`

#### Plan Retrieval
- **GET `/api/optimize/plans/:type`** (type = nutrition | workout | lifestyle)
  - Returns active plan for user
  - Includes full content JSON

- **GET `/api/optimize/plans/history`**
  - Returns all past plans (paginated)
  - Filters by planType optional

#### Daily Logging
- **POST `/api/optimize/daily-log`**
  - Body: `{ logDate, nutritionCompleted, workoutCompleted, supplementsTaken, waterIntakeOz, energyLevel, moodLevel, sleepQuality, notes }`
  - Auto-updates streak via `storage.createDailyLog()`
  - Returns: `{ log, updatedStreak }`

- **GET `/api/optimize/daily-log/:date`**
  - Returns log for specific date

- **GET `/api/optimize/daily-logs?startDate=X&endDate=Y`**
  - Range query for charts/analytics

#### Streaks
- **GET `/api/optimize/streaks`**
  - Returns all streak types (overall, nutrition, workout, lifestyle)
  - Current and longest for each

#### Workouts
- **GET `/api/optimize/workouts/today`**
  - Returns today's scheduled workout from active plan
  - Checks dayOfWeek and returns matching workout

- **POST `/api/optimize/workouts/log`**
  - Body: `{ workoutId, completedAt, exercisesCompleted, duration, difficultyRating, notes }`
  - Logs completed workout
  - Returns: `{ log }`

- **GET `/api/optimize/workouts/history`**
  - Paginated workout logs
  - Optional date range filters

#### Nutrition
- **GET `/api/optimize/nutrition/today`**
  - Returns today's meals from active meal plan
  - Includes recipes for each meal

- **GET `/api/optimize/recipes/search?tags=X&category=Y&maxCalories=Z&query=Q`**
  - Search recipe library
  - Returns: `{ recipes: [...] }`

- **POST `/api/optimize/nutrition/swap-meal`**
  - Body: `{ mealPlanId, dayOfWeek, mealType, newRecipeId }`
  - Swaps a meal in user's plan
  - Returns: `{ updatedMealPlan }`

- **POST `/api/optimize/nutrition/log`**
  - Body: `{ recipeId, mealType, mealDate, servingsConsumed, wasSwapped, notes }`
  - Logs meal eaten
  - Returns: `{ log }`

#### Grocery Lists
- **POST `/api/optimize/grocery-list/generate`**
  - Pulls ingredients from active meal plan
  - Groups by category
  - Returns: `{ groceryList }`

- **GET `/api/optimize/grocery-list`**
  - Returns current unpurchased list

- **PATCH `/api/optimize/grocery-list/:id`**
  - Body: `{ isPurchased: true }` or `{ items: [...] }`
  - Updates list
  - Returns: `{ groceryList }`

#### SMS Preferences
- **GET `/api/optimize/sms/preferences`**
  - Returns user's reminder settings

- **PUT `/api/optimize/sms/preferences`**
  - Body: `{ morningEnabled, morningTime, workoutEnabled, workoutTime, eveningEnabled, eveningTime, includeNutritionInfo, includeWorkoutInfo }`
  - Upsert preferences
  - Returns: `{ preferences }`

### Implementation Pattern (Example)
```typescript
// POST /api/optimize/plans/generate
app.post('/api/optimize/plans/generate', requireAuth, async (req, res) => {
  const userId = req.userId!;
  const { planTypes, preferences } = req.body;
  
  // Get user context
  const user = await storage.getUser(userId);
  const healthProfile = await storage.getHealthProfile(userId);
  const activeFormula = await storage.getCurrentFormulaByUser(userId);
  const labReports = await storage.getCompletedLabAnalyses(userId);
  
  const context: OptimizeContext = {
    user: { id: userId, name: user.name, email: user.email },
    healthProfile,
    activeFormula,
    labData: labReports.length > 0 ? {
      reports: labReports,
      summary: labReports[0].analysis // Latest analysis
    } : undefined,
    preferences
  };
  
  const results = {};
  
  // Generate each requested plan type
  for (const planType of planTypes) {
    let prompt: string;
    if (planType === 'nutrition') {
      prompt = buildNutritionPlanPrompt(context);
    } else if (planType === 'workout') {
      prompt = buildWorkoutPlanPrompt(context);
    } else if (planType === 'lifestyle') {
      prompt = buildLifestylePlanPrompt(context);
    }
    
    // Call AI (use same streaming logic as chat)
    const aiResponse = await callAI(prompt); // Anthropic or OpenAI
    const planContent = JSON.parse(aiResponse);
    
    // Save to database
    const plan = await storage.createOptimizePlan({
      userId,
      planType,
      content: planContent,
      rationale: planContent.weeklyGuidance || planContent.rationale,
      preferences,
      basedOnFormulaId: activeFormula?.id,
      basedOnLabs: labReports.length > 0 ? JSON.stringify(labReports[0]) : null,
      isActive: true
    });
    
    results[planType] = plan;
  }
  
  res.json(results);
});
```

---

## Phase 3: Frontend Pages (Weeks 3-4)

### Pages to Create

1. **`OptimizePage.tsx`** - Dashboard/overview
   - 3 cards: Nutrition, Workout, Lifestyle
   - Each shows status (plan active/inactive, last completed, streak)
   - "Generate Plan" button for each type
   - Links to detail pages

2. **`NutritionPlanPage.tsx`** - Daily meal view
   - Today's meals from active plan
   - Recipe cards with macros
   - "Swap Meal" button → opens recipe search modal
   - "Log Meal" checkbox for each meal
   - Week view tab (grid of all 7 days)

3. **`WorkoutPlanPage.tsx`** - Today's workout
   - Shows today's scheduled workout
   - Exercise list with sets/reps/rest
   - Form cues expandable
   - "Start Workout" → timer mode
   - "Log Completed" button

4. **`LifestyleCoachingPage.tsx`** - Habit tracking
   - Morning/evening routine checklist
   - Hydration tracker (water intake oz)
   - Sleep quality rating (1-10)
   - Energy/mood sliders
   - Streak display (fire icon + number)

5. **`OptimizeHistoryPage.tsx`** - Past plans
   - Timeline of all plans (nutrition, workout, lifestyle)
   - View past plans (read-only)
   - "Regenerate" button to create new plan

### Component Patterns
- Use `@tanstack/react-query` for all data fetching
- Toast notifications for log confirmations
- Skeleton loaders for async data
- shadcn/ui components (Card, Button, Checkbox, Slider, etc.)

---

## Phase 4: Enhanced SMS Reminders (Weeks 7-8)

### Scheduler Updates (`server/smsReminderScheduler.ts`)

#### 3 Reminder Types

1. **Morning Reminder (configurable time, e.g., 7:00 AM)**
   ```
   ☀️ Good morning, Pete!

   TODAY'S PLAN:
   🍳 Breakfast: Protein-Packed Oatmeal Bowl (450 cal)
   🥗 Lunch: Grilled Chicken Salad (520 cal)
   🍽️ Dinner: Salmon & Quinoa Bowl (680 cal)

   💊 Don't forget your supplements!
   💧 Hydration goal: 100oz

   Current streak: 🔥 12 days - keep it up!
   ```

2. **Pre-Workout Reminder (configurable, e.g., 5:30 PM)**
   ```
   💪 Workout time, Pete!

   TODAY'S WORKOUT:
   Upper Body Strength (45 min)
   - Dumbbell Bench Press 3x8-10
   - Bent-Over Rows 3x8-10
   - Shoulder Press 3x10-12
   - Bicep Curls 3x12-15

   Reply DONE when complete ✅
   ```

3. **Evening Check-In (configurable, e.g., 9:00 PM)**
   ```
   🌙 End-of-day check-in, Pete!

   Did you complete today?
   Reply with:
   ✅ YES - All done!
   🍽️ NUTRITION - Just meals
   💪 WORKOUT - Just workout
   ❌ SKIP - Tomorrow's a new day
   ```

#### Two-Way SMS
- User replies: `DONE`, `YES`, `NUTRITION`, `WORKOUT`, `SKIP`
- Webhook processes reply, auto-logs to daily log
- Sends confirmation: "✅ Logged! Keep up the great work 🔥"

#### Implementation
```typescript
// In smsReminderScheduler.ts
async function sendOptimizeReminders() {
  const users = await storage.listAllUsers();
  
  for (const user of users) {
    const prefs = await storage.getOptimizeSmsPreferences(user.id);
    if (!prefs) continue;
    
    const now = new Date();
    const currentTime = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    // Morning reminder
    if (prefs.morningEnabled && prefs.morningTime === currentTime) {
      const mealPlan = await storage.getActiveMealPlan(user.id);
      const streak = await storage.getUserStreak(user.id, 'overall');
      
      let message = `☀️ Good morning, ${user.name}!\n\n`;
      
      if (prefs.includeNutritionInfo && mealPlan) {
        const todaysMeals = extractTodaysMeals(mealPlan); // Helper function
        message += `TODAY'S PLAN:\n`;
        todaysMeals.forEach(meal => {
          message += `${mealTypeEmoji(meal.type)} ${meal.name} (${meal.macros.calories} cal)\n`;
        });
        message += `\n`;
      }
      
      message += `💊 Don't forget your supplements!\n`;
      message += `💧 Hydration goal: ${prefs.hydrationTarget || '100'}oz\n\n`;
      
      if (streak) {
        message += `Current streak: 🔥 ${streak.currentStreak} days - keep it up!`;
      }
      
      await twilioClient.messages.create({
        to: user.phone,
        from: process.env.TWILIO_PHONE,
        body: message
      });
    }
    
    // Workout reminder
    if (prefs.workoutEnabled && prefs.workoutTime === currentTime) {
      const workoutPlan = await storage.getActiveWorkoutPlan(user.id);
      if (!workoutPlan) continue;
      
      const todaysWorkout = await getTodaysWorkout(workoutPlan); // Helper
      if (!todaysWorkout) continue;
      
      let message = `💪 Workout time, ${user.name}!\n\n`;
      message += `TODAY'S WORKOUT:\n`;
      message += `${todaysWorkout.name} (${todaysWorkout.duration} min)\n`;
      
      const mainExercises = todaysWorkout.exercises.slice(0, 4); // First 4
      mainExercises.forEach(ex => {
        message += `- ${ex.name} ${ex.sets}x${ex.reps}\n`;
      });
      
      message += `\nReply DONE when complete ✅`;
      
      await twilioClient.messages.create({
        to: user.phone,
        from: process.env.TWILIO_PHONE,
        body: message
      });
    }
    
    // Evening check-in
    if (prefs.eveningEnabled && prefs.eveningTime === currentTime) {
      const message = `🌙 End-of-day check-in, ${user.name}!\n\n` +
        `Did you complete today?\n` +
        `Reply with:\n` +
        `✅ YES - All done!\n` +
        `🍽️ NUTRITION - Just meals\n` +
        `💪 WORKOUT - Just workout\n` +
        `❌ SKIP - Tomorrow's a new day`;
      
      await twilioClient.messages.create({
        to: user.phone,
        from: process.env.TWILIO_PHONE,
        body: message
      });
    }
  }
}

// Webhook handler for incoming SMS
app.post('/api/webhooks/twilio/sms', async (req, res) => {
  const { From: phoneNumber, Body: body } = req.body;
  
  const user = await storage.getUserByPhone(phoneNumber);
  if (!user) {
    return res.status(404).send('User not found');
  }
  
  const response = body.trim().toUpperCase();
  const today = new Date();
  
  let nutritionCompleted = false;
  let workoutCompleted = false;
  
  if (response === 'YES' || response === 'DONE') {
    nutritionCompleted = true;
    workoutCompleted = true;
  } else if (response === 'NUTRITION') {
    nutritionCompleted = true;
  } else if (response === 'WORKOUT') {
    workoutCompleted = true;
  } else if (response === 'SKIP') {
    // Log nothing, just acknowledge
  }
  
  if (nutritionCompleted || workoutCompleted) {
    await storage.createDailyLog({
      userId: user.id,
      logDate: today,
      nutritionCompleted,
      workoutCompleted,
      supplementsTaken: false, // They'll update via app
      waterIntakeOz: null,
      energyLevel: null,
      moodLevel: null,
      sleepQuality: null,
      notes: `Auto-logged via SMS reply: ${response}`
    });
  }
  
  const confirmMessage = response === 'SKIP' 
    ? `No worries! Tomorrow's a fresh start 💪`
    : `✅ Logged! Keep up the great work 🔥`;
  
  await twilioClient.messages.create({
    to: phoneNumber,
    from: process.env.TWILIO_PHONE,
    body: confirmMessage
  });
  
  res.sendStatus(200);
});
```

---

## Future Enhancements (Post-Launch)

1. **Recipe Seeding**
   - Create script to seed `recipes` table with 200+ recipes
   - Categories: breakfast, lunch, dinner, snacks, desserts
   - Tags: vegan, gluten-free, dairy-free, high-protein, low-carb, etc.
   - Include images (stock photos or AI-generated)

2. **AI Plan Regeneration**
   - "Regenerate Plan" button on OptimizePage
   - Keeps preferences but refreshes content
   - Useful when user gets bored with current plan

3. **Progress Charts**
   - Line charts for energy/mood/sleep over time
   - Bar charts for workout frequency
   - Macro adherence vs. targets

4. **Social Features**
   - Share streak on social media
   - Leaderboard (opt-in, friends only)

5. **Integration with Wearables**
   - Auto-log workouts from Fitbit/Oura/Whoop
   - Use sleep data to adjust lifestyle protocols
   - HRV-based recovery recommendations

6. **Peptide Expansion** (Later)
   - Chat-based physician consultation AFTER checkout
   - Prescription peptides (BPC-157, TB-500, etc.)
   - Telemedicine partnerships for Rx

---

## Technical Notes

### Data Flow (User Journey)
1. User visits `/optimize` → sees 3 cards (Nutrition, Workout, Lifestyle)
2. Clicks "Generate Nutrition Plan" → preferences modal (dietary restrictions, goals)
3. Backend calls `buildNutritionPlanPrompt(context)` with user data
4. AI returns JSON → saved to `optimize_plans` table
5. Frontend redirects to `/optimize/nutrition` → displays week's meals
6. User logs meals daily → streak updates automatically
7. SMS reminders sent at configured times → user replies DONE
8. Webhook auto-logs completion → streak continues

### Database Relationships
```
users
  └── health_profiles (1:1)
  └── formulas (1:many) → activeFormula linked to plans
  └── lab_analyses (1:many) → latest used in plan generation
  └── optimize_plans (1:many)
  └── optimize_daily_logs (1:many)
  └── user_streaks (1:many)
  └── workout_plans (1:many)
      └── workouts (1:many)
  └── meal_plans (1:many)
  └── meal_logs (1:many)
  └── workout_logs (1:many)
  └── grocery_lists (1:many)
  └── optimize_sms_preferences (1:1)
```

### Performance Considerations
- Daily logs table will grow quickly (1 row/user/day = 365 rows/year/user)
- Index on `user_id` and `log_date` for fast lookups
- Consider archiving logs older than 90 days to separate table
- Recipe search uses `sql` template literals for JSON queries (fast in PostgreSQL)
- Streak calculation happens on write (not read) to avoid N+1 queries

### Error Handling
- If AI fails to return valid JSON → retry once, then fallback to basic template
- If user has no active formula → still generate plan, just skip formula context
- If no lab data → skip lab-driven recommendations
- SMS failures → log to `audit_logs`, retry 3 times with exponential backoff

---

## Success Metrics (To Track)
- % of users who generate at least 1 plan
- Average streak length (overall, nutrition, workout, lifestyle separately)
- Daily log completion rate
- SMS reply rate (DONE, YES, etc.)
- Meal swap frequency (indicates boredom with plan)
- Workout completion rate vs. prescribed
- Avg time between plan regenerations

---

## Deployment Checklist
- [ ] Run `npm run db:push` on production Supabase
- [ ] Seed recipes table (create seeding script)
- [ ] Add Twilio webhook URL to Twilio console
- [ ] Test SMS reminders in staging environment
- [ ] Add Optimize routes to Railway backend
- [ ] Deploy Optimize pages to Vercel frontend
- [ ] Update QUICKSTART.md with Optimize feature docs

---

**Status:** ✅ Phase 1 Complete (Database + Storage + Prompts)  
**Next:** Phase 2 - API Routes Implementation  
**Timeline:** 6-8 weeks total (2 weeks/phase)
