# ONES Streak & Consistency Tracking Redesign

## Executive Summary

This document outlines a comprehensive redesign of the streak tracking system to support four distinct categories (Nutrition, Workouts, Supplements, Lifestyle), with daily/weekly/monthly views, and a unified consistency scoring model.

---

## 1. Current System Analysis

### Current Schema (`user_streaks` table)
```sql
- id, userId, streakType ('overall', 'nutrition', 'workout', 'supplements')
- currentStreak, longestStreak, lastLoggedDate
```

### Current Limitations
1. **No granular completion tracking** - Only tracks "did something happen" not "what was completed"
2. **No partial completion support** - Binary success/fail model
3. **No weekly/monthly aggregates** - Only daily streak counts
4. **Missing Lifestyle category** - Currently only tracks 3 of 4 planned categories
5. **Inconsistent streak logic** - Different rules scattered across code
6. **No late logging grace period** - Strict 24-hour window breaks streaks

---

## 2. Proposed Data Model

### 2.1 Enhanced Schema

```typescript
// NEW: Daily Completion Records (replaces reliance on optimize_daily_logs alone)
export const dailyCompletions = pgTable("daily_completions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  logDate: date("log_date").notNull(), // DATE only, no time
  
  // Category completion scores (0.0 - 1.0)
  nutritionScore: decimal("nutrition_score", { precision: 3, scale: 2 }),
  workoutScore: decimal("workout_score", { precision: 3, scale: 2 }),
  supplementScore: decimal("supplement_score", { precision: 3, scale: 2 }),
  lifestyleScore: decimal("lifestyle_score", { precision: 3, scale: 2 }),
  
  // Detailed completion data (JSON for flexibility)
  nutritionDetails: json("nutrition_details"), // { mealsLogged: 3, mealsPlanned: 3, calories: 2100 }
  workoutDetails: json("workout_details"), // { completed: true, exerciseCount: 8, duration: 45 }
  supplementDetails: json("supplement_details"), // { morning: true, afternoon: true, evening: false }
  lifestyleDetails: json("lifestyle_details"), // { sleepHours: 7.5, stepsCount: 8000, meditationMins: 10 }
  
  // Overall daily score (weighted average)
  dailyScore: decimal("daily_score", { precision: 3, scale: 2 }),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Unique constraint: one record per user per day
// Index on (userId, logDate) for fast lookups

// ENHANCED: User Streaks with more granular tracking
export const userStreaks = pgTable("user_streaks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  
  streakType: varchar("streak_type", { length: 50 }).notNull(), 
  // Values: 'overall', 'nutrition', 'workout', 'supplements', 'lifestyle'
  
  currentStreak: integer("current_streak").default(0).notNull(),
  longestStreak: integer("longest_streak").default(0).notNull(),
  lastCompletedDate: date("last_completed_date"), // DATE type
  
  // NEW: Weekly & Monthly aggregates (updated by scheduled job)
  currentWeekScore: decimal("current_week_score", { precision: 3, scale: 2 }),
  currentMonthScore: decimal("current_month_score", { precision: 3, scale: 2 }),
  lastWeekScore: decimal("last_week_score", { precision: 3, scale: 2 }),
  lastMonthScore: decimal("last_month_score", { precision: 3, scale: 2 }),
  
  // NEW: Streak preservation (grace period tracking)
  streakFreezeUsed: boolean("streak_freeze_used").default(false),
  streakFreezeDate: date("streak_freeze_date"),
  
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// NEW: Weekly Summaries (materialized for fast dashboard queries)
export const weeklySummaries = pgTable("weekly_summaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  weekStart: date("week_start").notNull(), // Monday of the week
  
  // Days completed per category
  nutritionDays: integer("nutrition_days").default(0),
  workoutDays: integer("workout_days").default(0),
  supplementDays: integer("supplement_days").default(0),
  lifestyleDays: integer("lifestyle_days").default(0),
  
  // Average scores
  avgNutritionScore: decimal("avg_nutrition_score", { precision: 3, scale: 2 }),
  avgWorkoutScore: decimal("avg_workout_score", { precision: 3, scale: 2 }),
  avgSupplementScore: decimal("avg_supplement_score", { precision: 3, scale: 2 }),
  avgLifestyleScore: decimal("avg_lifestyle_score", { precision: 3, scale: 2 }),
  
  // Overall consistency score for the week
  consistencyScore: decimal("consistency_score", { precision: 3, scale: 2 }),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

---

## 3. Completion Rules by Category

### 3.1 Nutrition

| Action | Points | Max Daily Score |
|--------|--------|-----------------|
| Log breakfast | 0.25 | - |
| Log lunch | 0.25 | - |
| Log dinner | 0.25 | - |
| Log snacks (any) | 0.10 | - |
| Meet calorie target (±15%) | 0.15 | - |
| **Full completion** | **1.0** | **1.0** |

**Streak Rules:**
- **Full streak day**: Score ≥ 0.75 (3 meals OR 2 meals + calorie target)
- **Partial credit**: Score 0.50-0.74 counts as 0.5 streak day
- **Streak break**: Score < 0.50

```typescript
function calculateNutritionScore(log: DailyLog): number {
  let score = 0;
  const mealsLogged = log.mealsLogged || [];
  
  if (mealsLogged.includes('breakfast')) score += 0.25;
  if (mealsLogged.includes('lunch')) score += 0.25;
  if (mealsLogged.includes('dinner')) score += 0.25;
  if (mealsLogged.includes('snack')) score += 0.10;
  
  // Calorie target check (if user has nutrition plan)
  if (log.caloriesLogged && log.calorieTarget) {
    const ratio = log.caloriesLogged / log.calorieTarget;
    if (ratio >= 0.85 && ratio <= 1.15) score += 0.15;
  }
  
  return Math.min(score, 1.0);
}
```

### 3.2 Workouts

| Action | Points | Condition |
|--------|--------|-----------|
| Complete planned workout | 1.0 | Full completion |
| Complete 75%+ of exercises | 0.75 | Partial |
| Complete 50%+ of exercises | 0.50 | Minimal |
| Rest day (planned) | 1.0 | If in plan |
| Active recovery/stretching | 0.25 | Bonus |

**Streak Rules:**
- **Full streak day**: Completed planned workout OR planned rest day
- **Partial credit**: 50-74% workout completion = 0.5 day
- **Streak break**: Missed planned workout day (not rest day)

```typescript
function calculateWorkoutScore(log: WorkoutLog | null, plan: WorkoutPlan, dayOfWeek: string): number {
  const todayPlan = plan?.weekPlan?.find(d => d.day === dayOfWeek);
  
  // Planned rest day = full credit
  if (todayPlan?.isRestDay) return 1.0;
  
  // No workout planned and none done
  if (!todayPlan && !log) return null; // N/A - don't count against streak
  
  // Workout completed
  if (log?.completed) {
    const exercisesPlanned = todayPlan?.workout?.exercises?.length || 1;
    const exercisesCompleted = log.exercisesCompleted?.length || 0;
    const completionRatio = exercisesCompleted / exercisesPlanned;
    
    if (completionRatio >= 1.0) return 1.0;
    if (completionRatio >= 0.75) return 0.75;
    if (completionRatio >= 0.50) return 0.50;
    return 0.25;
  }
  
  // Planned workout not done
  return 0;
}
```

### 3.3 Supplements

| Action | Points | Notes |
|--------|--------|-------|
| Morning dose taken | 0.33 | - |
| Afternoon dose taken | 0.33 | - |
| Evening dose taken | 0.34 | - |
| **All 3 doses** | **1.0** | Full day |

**Streak Rules:**
- **Full streak day**: All 3 doses taken (score = 1.0)
- **Partial credit**: 2 doses = 0.67, 1 dose = 0.33
- **Streak break**: Score < 0.33 (no doses taken)

```typescript
function calculateSupplementScore(log: DailyLog): number {
  if (!log) return 0;
  
  let doses = 0;
  if (log.supplementMorning) doses++;
  if (log.supplementAfternoon) doses++;
  if (log.supplementEvening) doses++;
  
  // Return exact proportion
  return doses / 3;
}
```

### 3.4 Lifestyle Goals

| Action | Points | Condition |
|--------|--------|-----------|
| Sleep 7+ hours | 0.30 | From wearable or manual |
| 7,500+ steps | 0.25 | From wearable |
| Hydration goal (100oz) | 0.20 | Logged water |
| Mindfulness/meditation | 0.15 | Any logged session |
| Screen time < 2hrs before bed | 0.10 | Self-reported |

**Streak Rules:**
- **Full streak day**: Score ≥ 0.70 (sleep + steps + hydration minimum)
- **Partial credit**: Score 0.40-0.69 = 0.5 day
- **Streak break**: Score < 0.40

```typescript
function calculateLifestyleScore(
  dailyLog: DailyLog,
  biometricData?: BiometricData
): number {
  let score = 0;
  
  // Sleep (from wearable or manual entry)
  const sleepHours = biometricData?.sleepDuration || dailyLog?.sleepHours;
  if (sleepHours && sleepHours >= 7) score += 0.30;
  else if (sleepHours && sleepHours >= 6) score += 0.15;
  
  // Steps
  const steps = biometricData?.steps;
  if (steps && steps >= 7500) score += 0.25;
  else if (steps && steps >= 5000) score += 0.12;
  
  // Hydration
  const waterOz = dailyLog?.waterIntakeOz || 0;
  if (waterOz >= 100) score += 0.20;
  else if (waterOz >= 64) score += 0.10;
  
  // Mindfulness (future feature)
  if (dailyLog?.meditationMinutes && dailyLog.meditationMinutes > 0) {
    score += 0.15;
  }
  
  // Note: Screen time not currently tracked
  
  return Math.min(score, 1.0);
}
```

---

## 4. Streak Logic Rules

### 4.1 Streak Increment Rules

```typescript
interface StreakUpdateResult {
  newStreak: number;
  isNewRecord: boolean;
  wasPreserved: boolean;
}

function updateStreak(
  currentStreak: number,
  longestStreak: number,
  lastCompletedDate: Date | null,
  todayScore: number,
  threshold: number = 0.50, // Minimum score to count as completed
  gracePeriodHours: number = 28 // Allow late logging
): StreakUpdateResult {
  const today = startOfDay(new Date());
  const yesterday = subDays(today, 1);
  const lastDate = lastCompletedDate ? startOfDay(lastCompletedDate) : null;
  
  // Already logged today - don't double count
  if (lastDate && isEqual(lastDate, today)) {
    return { newStreak: currentStreak, isNewRecord: false, wasPreserved: false };
  }
  
  // Score too low - doesn't count
  if (todayScore < threshold) {
    // Check if streak should break
    if (lastDate && isBefore(lastDate, yesterday)) {
      return { newStreak: 0, isNewRecord: false, wasPreserved: false };
    }
    return { newStreak: currentStreak, isNewRecord: false, wasPreserved: false };
  }
  
  // Score meets threshold
  let newStreak = currentStreak;
  let wasPreserved = false;
  
  if (!lastDate) {
    // First ever log
    newStreak = 1;
  } else if (isEqual(lastDate, yesterday)) {
    // Logged yesterday - streak continues
    newStreak = currentStreak + 1;
  } else if (isBefore(lastDate, yesterday)) {
    // Gap in logging
    const daysMissed = differenceInDays(today, lastDate) - 1;
    
    if (daysMissed === 1) {
      // One day missed - check grace period (late logging for yesterday)
      const hoursAgo = differenceInHours(new Date(), endOfDay(yesterday));
      if (hoursAgo <= gracePeriodHours) {
        // Allow continuation with warning
        newStreak = currentStreak + 1;
        wasPreserved = true;
      } else {
        newStreak = 1; // Reset
      }
    } else {
      // Multiple days missed - reset
      newStreak = 1;
    }
  }
  
  const isNewRecord = newStreak > longestStreak;
  
  return { newStreak, isNewRecord, wasPreserved };
}
```

### 4.2 Grace Period & Streak Freeze

**Grace Period (28 hours):**
- Allows logging yesterday's activities until 4 AM today
- Prevents unfair streak breaks for night owls
- Automatically applied, no user action needed

**Streak Freeze (Future Feature):**
- Users earn 1 freeze per 14-day streak
- Can be used to preserve streak for 1 missed day
- Limited to 1 use per 30 days
- Must be activated before midnight

---

## 5. Weekly & Monthly Calculations

### 5.1 Weekly Consistency Score

```typescript
interface WeeklyScore {
  categoryScores: {
    nutrition: { daysCompleted: number; avgScore: number };
    workout: { daysCompleted: number; avgScore: number };
    supplements: { daysCompleted: number; avgScore: number };
    lifestyle: { daysCompleted: number; avgScore: number };
  };
  overallConsistency: number; // 0-100
  perfectDays: number;
  partialDays: number;
}

function calculateWeeklyScore(dailyCompletions: DailyCompletion[]): WeeklyScore {
  const categories = ['nutrition', 'workout', 'supplements', 'lifestyle'] as const;
  
  const categoryScores = {} as WeeklyScore['categoryScores'];
  
  for (const cat of categories) {
    const scores = dailyCompletions
      .map(d => d[`${cat}Score`])
      .filter(s => s !== null);
    
    categoryScores[cat] = {
      daysCompleted: scores.filter(s => s >= 0.50).length,
      avgScore: scores.length > 0 
        ? scores.reduce((a, b) => a + b, 0) / scores.length 
        : 0
    };
  }
  
  // Overall consistency: weighted average of category averages
  const weights = { nutrition: 0.25, workout: 0.30, supplements: 0.25, lifestyle: 0.20 };
  const overallConsistency = Math.round(
    Object.entries(weights).reduce((sum, [cat, weight]) => {
      return sum + (categoryScores[cat as keyof typeof categoryScores].avgScore * weight * 100);
    }, 0)
  );
  
  // Perfect days: all 4 categories ≥ 0.75
  const perfectDays = dailyCompletions.filter(d => 
    d.nutritionScore >= 0.75 &&
    d.workoutScore >= 0.75 &&
    d.supplementScore >= 0.75 &&
    d.lifestyleScore >= 0.75
  ).length;
  
  // Partial days: at least 2 categories ≥ 0.50
  const partialDays = dailyCompletions.filter(d => {
    const completedCategories = [
      d.nutritionScore >= 0.50,
      d.workoutScore >= 0.50,
      d.supplementScore >= 0.50,
      d.lifestyleScore >= 0.50
    ].filter(Boolean).length;
    return completedCategories >= 2 && completedCategories < 4;
  }).length;
  
  return { categoryScores, overallConsistency, perfectDays, partialDays };
}
```

### 5.2 Monthly Summary

```typescript
interface MonthlyScore {
  // Same structure as weekly but over 28-31 days
  consistency: number;
  streakDays: number;
  longestStreakThisMonth: number;
  improvement: number; // vs last month
  categoryBreakdown: {
    [category: string]: {
      totalDays: number;
      completedDays: number;
      percentage: number;
      trend: 'up' | 'down' | 'stable';
    };
  };
}
```

---

## 6. Backend Implementation

### 6.1 New API Endpoints

```typescript
// GET /api/streaks/summary
// Returns all streak data for dashboard
interface StreakSummaryResponse {
  streaks: {
    overall: { current: number; longest: number; lastDate: string };
    nutrition: { current: number; longest: number };
    workout: { current: number; longest: number };
    supplements: { current: number; longest: number };
    lifestyle: { current: number; longest: number };
  };
  weekly: {
    consistencyScore: number;
    categoryScores: Record<string, number>;
    perfectDays: number;
  };
  monthly: {
    consistencyScore: number;
    improvement: number; // vs last month
  };
  heatmap: {
    date: string;
    level: 0 | 1 | 2 | 3 | 4;
    scores: { nutrition: number; workout: number; supplements: number; lifestyle: number };
  }[];
}

// POST /api/streaks/recalculate
// Admin endpoint to rebuild streak data from daily logs

// GET /api/streaks/history?period=week|month|year
// Detailed historical view
```

### 6.2 Storage Methods

```typescript
// In storage.ts
class DrizzleStorage {
  // Calculate and store daily completion
  async updateDailyCompletion(userId: string, date: Date): Promise<DailyCompletion> {
    const startOfDate = startOfDay(date);
    
    // Gather all data for the day
    const dailyLog = await this.getDailyLog(userId, date);
    const workoutLogs = await this.getWorkoutLogsForDate(userId, date);
    const biometricData = await this.getBiometricDataForDate(userId, date);
    const nutritionPlan = await this.getActiveOptimizePlan(userId, 'nutrition');
    const workoutPlan = await this.getActiveOptimizePlan(userId, 'workout');
    
    // Calculate scores
    const nutritionScore = calculateNutritionScore(dailyLog, nutritionPlan);
    const workoutScore = calculateWorkoutScore(workoutLogs, workoutPlan, format(date, 'EEEE'));
    const supplementScore = calculateSupplementScore(dailyLog);
    const lifestyleScore = calculateLifestyleScore(dailyLog, biometricData);
    
    // Weighted daily score
    const dailyScore = (
      (nutritionScore || 0) * 0.25 +
      (workoutScore || 0) * 0.30 +
      (supplementScore || 0) * 0.25 +
      (lifestyleScore || 0) * 0.20
    );
    
    // Upsert daily completion
    const existing = await db.select()
      .from(dailyCompletions)
      .where(and(
        eq(dailyCompletions.userId, userId),
        eq(dailyCompletions.logDate, startOfDate)
      ))
      .limit(1);
    
    if (existing.length > 0) {
      await db.update(dailyCompletions)
        .set({
          nutritionScore, workoutScore, supplementScore, lifestyleScore, dailyScore,
          nutritionDetails: { mealsLogged: dailyLog?.mealsLogged },
          workoutDetails: workoutLogs[0] || null,
          supplementDetails: {
            morning: dailyLog?.supplementMorning,
            afternoon: dailyLog?.supplementAfternoon,
            evening: dailyLog?.supplementEvening
          },
          lifestyleDetails: {
            sleepHours: biometricData?.sleepDuration,
            steps: biometricData?.steps,
            waterOz: dailyLog?.waterIntakeOz
          },
          updatedAt: new Date()
        })
        .where(eq(dailyCompletions.id, existing[0].id));
      
      return { ...existing[0], nutritionScore, workoutScore, supplementScore, lifestyleScore, dailyScore };
    } else {
      const [created] = await db.insert(dailyCompletions)
        .values({
          userId,
          logDate: startOfDate,
          nutritionScore,
          workoutScore,
          supplementScore,
          lifestyleScore,
          dailyScore,
          nutritionDetails: { mealsLogged: dailyLog?.mealsLogged },
          workoutDetails: workoutLogs[0] || null,
          supplementDetails: {
            morning: dailyLog?.supplementMorning,
            afternoon: dailyLog?.supplementAfternoon,
            evening: dailyLog?.supplementEvening
          },
          lifestyleDetails: {
            sleepHours: biometricData?.sleepDuration,
            steps: biometricData?.steps,
            waterOz: dailyLog?.waterIntakeOz
          }
        })
        .returning();
      
      return created;
    }
  }

  // Update all streaks for a user
  async updateAllStreaks(userId: string, date: Date): Promise<void> {
    const completion = await this.updateDailyCompletion(userId, date);
    
    const categories = [
      { type: 'overall', score: completion.dailyScore, threshold: 0.50 },
      { type: 'nutrition', score: completion.nutritionScore, threshold: 0.50 },
      { type: 'workout', score: completion.workoutScore, threshold: 0.50 },
      { type: 'supplements', score: completion.supplementScore, threshold: 0.33 },
      { type: 'lifestyle', score: completion.lifestyleScore, threshold: 0.40 },
    ];
    
    for (const cat of categories) {
      if (cat.score === null) continue; // Skip if no data for category
      
      const streak = await this.getUserStreak(userId, cat.type);
      const result = updateStreak(
        streak?.currentStreak || 0,
        streak?.longestStreak || 0,
        streak?.lastCompletedDate,
        cat.score,
        cat.threshold
      );
      
      await this.upsertUserStreak(userId, cat.type, {
        currentStreak: result.newStreak,
        longestStreak: Math.max(result.newStreak, streak?.longestStreak || 0),
        lastCompletedDate: cat.score >= cat.threshold ? date : streak?.lastCompletedDate
      });
    }
  }

  // Get streak summary for dashboard
  async getStreakSummary(userId: string): Promise<StreakSummaryResponse> {
    const [overall, nutrition, workout, supplements, lifestyle] = await Promise.all([
      this.getUserStreak(userId, 'overall'),
      this.getUserStreak(userId, 'nutrition'),
      this.getUserStreak(userId, 'workout'),
      this.getUserStreak(userId, 'supplements'),
      this.getUserStreak(userId, 'lifestyle'),
    ]);
    
    // Get last 30 days of completions for heatmap
    const thirtyDaysAgo = subDays(new Date(), 30);
    const completions = await db.select()
      .from(dailyCompletions)
      .where(and(
        eq(dailyCompletions.userId, userId),
        gte(dailyCompletions.logDate, thirtyDaysAgo)
      ))
      .orderBy(dailyCompletions.logDate);
    
    // Calculate weekly scores
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
    const thisWeekCompletions = completions.filter(c => 
      new Date(c.logDate) >= weekStart
    );
    const weeklyScore = calculateWeeklyScore(thisWeekCompletions);
    
    // Calculate monthly scores
    const monthStart = startOfMonth(new Date());
    const thisMonthCompletions = completions.filter(c =>
      new Date(c.logDate) >= monthStart
    );
    const monthlyScore = calculateWeeklyScore(thisMonthCompletions); // Same calculation
    
    // Build heatmap
    const heatmap = [];
    for (let i = 29; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const completion = completions.find(c => 
        format(new Date(c.logDate), 'yyyy-MM-dd') === dateStr
      );
      
      // Calculate level (0-4) based on daily score
      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (completion?.dailyScore) {
        if (completion.dailyScore >= 0.90) level = 4;
        else if (completion.dailyScore >= 0.70) level = 3;
        else if (completion.dailyScore >= 0.50) level = 2;
        else if (completion.dailyScore >= 0.25) level = 1;
      }
      
      heatmap.push({
        date: dateStr,
        level,
        scores: {
          nutrition: completion?.nutritionScore || 0,
          workout: completion?.workoutScore || 0,
          supplements: completion?.supplementScore || 0,
          lifestyle: completion?.lifestyleScore || 0
        }
      });
    }
    
    return {
      streaks: {
        overall: { 
          current: overall?.currentStreak || 0, 
          longest: overall?.longestStreak || 0,
          lastDate: overall?.lastCompletedDate?.toISOString()
        },
        nutrition: { current: nutrition?.currentStreak || 0, longest: nutrition?.longestStreak || 0 },
        workout: { current: workout?.currentStreak || 0, longest: workout?.longestStreak || 0 },
        supplements: { current: supplements?.currentStreak || 0, longest: supplements?.longestStreak || 0 },
        lifestyle: { current: lifestyle?.currentStreak || 0, longest: lifestyle?.longestStreak || 0 },
      },
      weekly: {
        consistencyScore: weeklyScore.overallConsistency,
        categoryScores: {
          nutrition: weeklyScore.categoryScores.nutrition.avgScore * 100,
          workout: weeklyScore.categoryScores.workout.avgScore * 100,
          supplements: weeklyScore.categoryScores.supplements.avgScore * 100,
          lifestyle: weeklyScore.categoryScores.lifestyle.avgScore * 100,
        },
        perfectDays: weeklyScore.perfectDays
      },
      monthly: {
        consistencyScore: monthlyScore.overallConsistency,
        improvement: 0 // TODO: Compare to last month
      },
      heatmap
    };
  }
}
```

### 6.3 Scheduled Jobs

```typescript
// Run nightly at 2 AM to recalculate weekly summaries
async function weeklyAggregationJob() {
  const users = await storage.getAllUsers();
  
  for (const user of users) {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const completions = await storage.getWeeklyCompletions(user.id, weekStart);
    const score = calculateWeeklyScore(completions);
    
    await storage.upsertWeeklySummary(user.id, weekStart, score);
  }
}

// Run on every daily log update
async function onDailyLogUpdate(userId: string, date: Date) {
  await storage.updateAllStreaks(userId, date);
}
```

---

## 7. UI Design Specifications

### 7.1 Redesigned Streak Card

```
┌─────────────────────────────────────────────────────────────┐
│  🔥 Streaks & Consistency                    [Daily|Weekly] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │   12    │  │    8    │  │   15    │  │    5    │        │
│  │  days   │  │  days   │  │  days   │  │  days   │        │
│  │ 🥗 Food │  │💪 Work  │  │ 💊 Supps│  │ 🧘 Life │        │
│  │ ▲ +3    │  │ ▼ -1    │  │ ★ Best! │  │ ═ same  │        │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
│                                                             │
│  ── Overall Consistency Score ────────────────────────────  │
│  [████████████████████░░░░░░░░░░] 78%                       │
│                                                             │
│  ── Last 30 Days ─────────────────────────────────────────  │
│  S  M  T  W  T  F  S                                        │
│  ░  ░  ▓  █  █  █  ▓  ← Week 1                             │
│  █  █  ▓  ▓  █  █  ░                                        │
│  ▓  █  █  █  ▓  ▓  █                                        │
│  █  █  ▓  █  █  ▓  ▓                                        │
│  █  ▓  ▓  ·  ·  ·  ·  ← This week                          │
│                                                             │
│  Legend: ░ None  ▓ Partial  █ Full  · Future               │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Category Streak Badges

Each category shows:
- Current streak count
- Trend indicator (up/down/stable vs last week)
- "Best!" badge if at longest streak
- Category icon with color coding

### 7.3 Heatmap Enhancements

- **Tooltip on hover**: Shows breakdown of all 4 categories for that day
- **Click to view**: Opens day detail modal
- **Color gradient**: Based on composite daily score, not just activity count
- **Future days**: Grayed out dots

### 7.4 Weekly View Toggle

When "Weekly" is selected:
- Shows bar chart of weekly consistency scores (last 8 weeks)
- Category breakdown for selected week
- Week-over-week comparison

### 7.5 Mobile Considerations

- Heatmap scrolls horizontally on small screens
- Category cards stack 2x2 instead of 1x4
- Tap instead of hover for tooltips

---

## 8. Migration Plan

### Phase 1: Schema Migration
1. Create `daily_completions` table
2. Add new columns to `user_streaks` (lifestyle support, weekly/monthly scores)
3. Create `weekly_summaries` table
4. Backfill `daily_completions` from existing `optimize_daily_logs`

### Phase 2: Backend Logic
1. Implement new score calculation functions
2. Update `updateUserStreak` to handle all 4 categories
3. Add nightly aggregation job
4. Create new API endpoints

### Phase 3: Frontend Update
1. Update `wellness.ts` types
2. Redesign `StreakHeatmap` component
3. Add category toggle UI
4. Implement new tooltip and detail views

### Phase 4: Testing & Rollout
1. Test with existing user data
2. Verify streak calculations match expectations
3. A/B test new UI with subset of users
4. Full rollout

---

## 9. Success Metrics

- **Engagement**: Users checking streak card daily
- **Streak length**: Average/median streak increases
- **Multi-category tracking**: % of users completing 3+ categories daily
- **Retention**: Users with streaks more likely to return

---

## 10. Future Enhancements

1. **Streak Freeze**: Purchasable with points or earned
2. **Streak Challenges**: Compete with friends
3. **Milestone Rewards**: Badges at 7, 30, 100 days
4. **Smart Reminders**: "You're 1 supplement away from maintaining streak!"
5. **Streak Recovery**: Ability to backfill within 24 hours with proof
