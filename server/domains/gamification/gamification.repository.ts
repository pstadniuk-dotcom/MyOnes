
import { eq, desc, and, gte, lte, sql, lt, gt } from "drizzle-orm";
import { db } from "../../infrastructure/database/db";
import {
    users, userStreaks, dailyCompletions, optimizeDailyLogs,
    workoutLogs, mealLogs, workoutPlans, workouts,
    exerciseRecords, workoutPreferences, trackingPreferences,
    groceryLists, optimizeSmsPreferences,
    mealPlans,
    type UserStreak, type InsertUserStreak,
    type DailyCompletion, type InsertDailyCompletion,
    type OptimizeDailyLog, type InsertOptimizeDailyLog,
    type WorkoutLog, type InsertWorkoutLog,
    type MealLog, type InsertMealLog,
    type WorkoutPlan, type InsertWorkoutPlan,
    type Workout, type InsertWorkout,
    type ExerciseRecord, type InsertExerciseRecord,
    type WorkoutPreferences, type InsertWorkoutPreferences,
    type TrackingPreferences, type InsertTrackingPreferences,
    type GroceryList, type InsertGroceryList,
    type OptimizeSmsPreferences, type InsertOptimizeSmsPreferences,
    type MealPlan, type InsertMealPlan
} from "@shared/schema";
import { BaseRepository } from "../../infrastructure/database/base.repository";
import { logger } from "../../infrastructure/logging/logger";
import { getUserLocalMidnight, getUserLocalDateString, toUserLocalDateString } from "../../utils/timezone";

export class GamificationRepository extends BaseRepository<typeof userStreaks, UserStreak, InsertUserStreak> {
    constructor(db: any) {
        super(db, userStreaks, "GamificationRepository");
    }

    // --- Daily Logs (Optimize) ---

    async getDailyLog(userId: string, date: Date): Promise<OptimizeDailyLog | undefined> {
        const year = date.getUTCFullYear();
        const month = date.getUTCMonth();
        const day = date.getUTCDate();

        const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
        const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

        const [log] = await this.db
            .select()
            .from(optimizeDailyLogs)
            .where(and(
                eq(optimizeDailyLogs.userId, userId),
                gte(optimizeDailyLogs.logDate, startOfDay),
                lte(optimizeDailyLogs.logDate, endOfDay)
            ))
            .limit(1);
        return log || undefined;
    }

    async listDailyLogs(userId: string, startDate: Date, endDate: Date): Promise<OptimizeDailyLog[]> {
        return await this.db
            .select()
            .from(optimizeDailyLogs)
            .where(and(
                eq(optimizeDailyLogs.userId, userId),
                gte(optimizeDailyLogs.logDate, startDate),
                lte(optimizeDailyLogs.logDate, endDate)
            ))
            .orderBy(desc(optimizeDailyLogs.logDate));
    }

    async updateDailyLog(id: string, updates: Partial<InsertOptimizeDailyLog>): Promise<OptimizeDailyLog | undefined> {
        const [updated] = await this.db
            .update(optimizeDailyLogs)
            .set(updates)
            .where(eq(optimizeDailyLogs.id, id))
            .returning();
        return updated || undefined;
    }

    async createDailyLog(insertLog: InsertOptimizeDailyLog): Promise<OptimizeDailyLog> {
        const [log] = await this.db.insert(optimizeDailyLogs).values(insertLog).returning();
        return log;
    }


    // --- Meal Logs ---

    async createMealLog(log: InsertMealLog): Promise<MealLog> {
        const [created] = await this.db.insert(mealLogs).values(log).returning();
        return created;
    }

    async getMealLogById(logId: string): Promise<MealLog | undefined> {
        const [log] = await this.db.select().from(mealLogs).where(eq(mealLogs.id, logId));
        return log || undefined;
    }

    async getMealLogsForDay(userId: string, date: Date): Promise<MealLog[]> {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        return await this.db
            .select()
            .from(mealLogs)
            .where(and(
                eq(mealLogs.userId, userId),
                gte(mealLogs.loggedAt, startOfDay),
                lte(mealLogs.loggedAt, endOfDay)
            ))
            .orderBy(mealLogs.loggedAt);
    }

    async getMealLogsHistory(userId: string, limit = 50): Promise<MealLog[]> {
        return await this.db
            .select()
            .from(mealLogs)
            .where(eq(mealLogs.userId, userId))
            .orderBy(desc(mealLogs.loggedAt))
            .limit(limit);
    }

    async updateMealLog(logId: string, updates: Partial<InsertMealLog>): Promise<MealLog | undefined> {
        const [updated] = await this.db
            .update(mealLogs)
            .set(updates)
            .where(eq(mealLogs.id, logId))
            .returning();
        return updated || undefined;
    }

    async deleteMealLog(userId: string, logId: string): Promise<boolean> {
        const result = await this.db
            .delete(mealLogs)
            .where(and(eq(mealLogs.id, logId), eq(mealLogs.userId, userId)));
        return (result.rowCount || 0) > 0;
    }

    async getTodayNutritionTotals(userId: string): Promise<{ calories: number; protein: number; carbs: number; fat: number; mealsLogged: number; waterOz: number }> {
        const today = new Date();
        const meals = await this.getMealLogsForDay(userId, today);
        return {
            calories: meals.reduce((sum, m) => sum + (m.calories || 0), 0),
            protein: meals.reduce((sum, m) => sum + (m.proteinGrams || 0), 0),
            carbs: meals.reduce((sum, m) => sum + (m.carbsGrams || 0), 0),
            fat: meals.reduce((sum, m) => sum + (m.fatGrams || 0), 0),
            mealsLogged: meals.filter(m => !m.waterOz).length,
            waterOz: meals.reduce((sum, m) => sum + (m.waterOz || 0), 0),
        };
    }

    // --- Workout Plans & Logs ---

    async createWorkoutPlan(plan: InsertWorkoutPlan): Promise<WorkoutPlan> {
        const [created] = await this.db.insert(workoutPlans).values(plan).returning();
        return created;
    }

    async getWorkoutPlan(id: string): Promise<WorkoutPlan | undefined> {
        const [plan] = await this.db.select().from(workoutPlans).where(eq(workoutPlans.id, id));
        return plan || undefined;
    }

    async getActiveWorkoutPlan(userId: string): Promise<WorkoutPlan | undefined> {
        const [plan] = await this.db
            .select()
            .from(workoutPlans)
            .where(and(eq(workoutPlans.userId, userId), eq(workoutPlans.isActive, true)))
            .orderBy(desc(workoutPlans.createdAt))
            .limit(1);
        return plan || undefined;
    }

    async createWorkout(workout: InsertWorkout): Promise<Workout> {
        const [created] = await this.db.insert(workouts).values(workout).returning();
        return created;
    }

    async listWorkoutsForPlan(planId: string): Promise<Workout[]> {
        return await this.db.select().from(workouts).where(eq(workouts.planId, planId));
    }

    async getWorkout(id: string): Promise<Workout | undefined> {
        const [workout] = await this.db.select().from(workouts).where(eq(workouts.id, id));
        return workout || undefined;
    }

    async createWorkoutLog(log: InsertWorkoutLog): Promise<WorkoutLog> {
        const [created] = await this.db.insert(workoutLogs).values(log).returning();
        return created;
    }

    async listWorkoutLogs(userId: string, limit = 10, offset = 0): Promise<WorkoutLog[]> {
        return await this.db
            .select()
            .from(workoutLogs)
            .where(eq(workoutLogs.userId, userId))
            .orderBy(desc(workoutLogs.completedAt))
            .limit(limit)
            .offset(offset);
    }

    async getAllWorkoutLogs(userId: string): Promise<WorkoutLog[]> {
        return await this.db
            .select()
            .from(workoutLogs)
            .where(eq(workoutLogs.userId, userId))
            .orderBy(desc(workoutLogs.completedAt));
    }

    async getWorkoutLogsForDate(userId: string, date: Date): Promise<WorkoutLog[]> {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        return await this.db
            .select()
            .from(workoutLogs)
            .where(and(
                eq(workoutLogs.userId, userId),
                gte(workoutLogs.completedAt, startOfDay),
                lte(workoutLogs.completedAt, endOfDay)
            ));
    }

    async deleteWorkoutLog(userId: string, logId: string): Promise<boolean> {
        const result = await this.db
            .delete(workoutLogs)
            .where(and(eq(workoutLogs.id, logId), eq(workoutLogs.userId, userId)));
        return (result.rowCount || 0) > 0;
    }

    // --- Daily Completions ---

    async getDailyCompletion(userId: string, logDate: Date): Promise<DailyCompletion | undefined> {
        const dateStr = logDate.toISOString().split('T')[0];
        const [completion] = await this.db
            .select()
            .from(dailyCompletions)
            .where(and(eq(dailyCompletions.userId, userId), eq(dailyCompletions.logDate, dateStr)));
        return completion || undefined;
    }

    async upsertDailyCompletion(userId: string, logDate: Date, updates: Partial<InsertDailyCompletion>): Promise<DailyCompletion> {
        const dateStr = logDate.toISOString().split('T')[0];
        const existing = await this.getDailyCompletion(userId, logDate);

        if (existing) {
            const [updated] = await this.db
                .update(dailyCompletions)
                .set({ ...updates, updatedAt: new Date() })
                .where(eq(dailyCompletions.id, existing.id))
                .returning();
            return updated;
        }

        const [created] = await this.db
            .insert(dailyCompletions)
            .values({ userId, logDate: dateStr, ...updates })
            .returning();
        return created;
    }

    // --- User Streaks & Scoring ---

    async getUserStreak(userId: string, streakType: 'overall' | 'nutrition' | 'workout' | 'lifestyle' | 'supplements'): Promise<UserStreak | undefined> {
        const [streak] = await this.db
            .select()
            .from(userStreaks)
            .where(and(eq(userStreaks.userId, userId), eq(userStreaks.streakType, streakType)));

        if (!streak) return undefined;

        // Validation logic
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const lastCompletedStr = streak.lastCompletedDate
            ? (typeof streak.lastCompletedDate === 'string'
                ? streak.lastCompletedDate.split('T')[0]
                : new Date(streak.lastCompletedDate).toISOString().split('T')[0])
            : null;

        if (lastCompletedStr && streak.currentStreak > 0) {
            const lastDate = new Date(lastCompletedStr + 'T12:00:00Z');
            const todayDate = new Date(todayStr + 'T12:00:00Z');
            const daysSinceLast = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

            if (daysSinceLast > 2) {
                // Reset stale streak
                await this.db.update(userStreaks).set({ currentStreak: 0, updatedAt: new Date() }).where(eq(userStreaks.id, streak.id));
                return { ...streak, currentStreak: 0 };
            }
        }
        return streak;
    }

    async getAllUserStreaks(userId: string): Promise<UserStreak[]> {
        return await this.db.select().from(userStreaks).where(eq(userStreaks.userId, userId));
    }

    async updateCategoryStreak(
        userId: string,
        streakType: 'overall' | 'nutrition' | 'workout' | 'supplements' | 'lifestyle',
        todayScore: number,
        logDate: Date,
        threshold: number = 0.50
    ): Promise<UserStreak> {
        const logDateStr = logDate.toISOString().split('T')[0];
        let streak = await this.getUserStreak(userId, streakType);

        if (!streak) {
            const [created] = await this.db.insert(userStreaks).values({
                userId,
                streakType,
                currentStreak: todayScore >= threshold ? 1 : 0,
                longestStreak: todayScore >= threshold ? 1 : 0,
                lastLoggedDate: logDate,
                lastCompletedDate: todayScore >= threshold ? logDateStr : null
            }).returning();
            return created;
        }

        const logDateObj = new Date(logDateStr + 'T12:00:00Z');
        const yesterdayObj = new Date(logDateObj);
        yesterdayObj.setUTCDate(yesterdayObj.getUTCDate() - 1);
        const yesterdayStr = yesterdayObj.toISOString().split('T')[0];

        const lastCompletedStr = streak.lastCompletedDate
            ? (typeof streak.lastCompletedDate === 'string'
                ? streak.lastCompletedDate.split('T')[0]
                : new Date(streak.lastCompletedDate).toISOString().split('T')[0])
            : null;

        let newCurrentStreak = streak.currentStreak;

        if (todayScore >= threshold) {
            if (!lastCompletedStr) {
                newCurrentStreak = 1;
            } else if (lastCompletedStr === yesterdayStr) {
                newCurrentStreak = streak.currentStreak + 1;
            } else if (lastCompletedStr === logDateStr) {
                // Already logged today
            } else {
                const lastCompletedDate = new Date(lastCompletedStr + 'T12:00:00Z');
                const daysDiff = Math.floor((logDateObj.getTime() - lastCompletedDate.getTime()) / (1000 * 60 * 60 * 24));
                if (daysDiff <= 2) {
                    newCurrentStreak = streak.currentStreak + 1;
                } else {
                    newCurrentStreak = 1;
                }
            }
        } else {
            if (lastCompletedStr && lastCompletedStr < yesterdayStr) {
                newCurrentStreak = 0;
            }
        }

        const newLongestStreak = Math.max(newCurrentStreak, streak.longestStreak);
        const [updated] = await this.db
            .update(userStreaks)
            .set({
                currentStreak: newCurrentStreak,
                longestStreak: newLongestStreak,
                lastLoggedDate: logDate,
                lastCompletedDate: todayScore >= threshold ? logDateStr : streak.lastCompletedDate,
                updatedAt: new Date()
            })
            .where(eq(userStreaks.id, streak.id))
            .returning();
        return updated;
    }

    async updateAllStreaks(userId: string, logDate: Date): Promise<{ [key: string]: UserStreak }> {
        const completion = await this.calculateAndSaveDailyScores(userId, logDate);
        const thresholds = { nutrition: 0.50, workout: 0.50, supplements: 0.33, lifestyle: 0.40, overall: 0.50 };
        const results: { [key: string]: UserStreak } = {};

        if (completion.nutritionScore) results.nutrition = await this.updateCategoryStreak(userId, 'nutrition', parseFloat(completion.nutritionScore), logDate, thresholds.nutrition);
        if (completion.workoutScore) results.workout = await this.updateCategoryStreak(userId, 'workout', parseFloat(completion.workoutScore), logDate, thresholds.workout);
        if (completion.supplementScore) results.supplements = await this.updateCategoryStreak(userId, 'supplements', parseFloat(completion.supplementScore), logDate, thresholds.supplements);
        if (completion.lifestyleScore) results.lifestyle = await this.updateCategoryStreak(userId, 'lifestyle', parseFloat(completion.lifestyleScore), logDate, thresholds.lifestyle);
        if (completion.dailyScore) results.overall = await this.updateCategoryStreak(userId, 'overall', parseFloat(completion.dailyScore), logDate, thresholds.overall);

        return results;
    }

    async calculateAndSaveDailyScores(userId: string, logDate: Date): Promise<DailyCompletion> {
        const [dailyLog, meals, workoutPlan, workoutLogs] = await Promise.all([
            this.getDailyLog(userId, logDate),
            this.getMealLogsForDay(userId, logDate),
            this.getActiveWorkoutPlan(userId),
            this.getWorkoutLogsForDate(userId, logDate)
        ]);

        const workoutLog = workoutLogs.length > 0 ? workoutLogs[0] : null;
        const nutritionScore = this.calculateNutritionScore(dailyLog, meals);
        const dayOfWeek = logDate.toLocaleDateString('en-US', { weekday: 'long' });
        const workoutScore = this.calculateWorkoutScore(workoutLog, workoutPlan, dayOfWeek);
        const supplementScore = this.calculateSupplementScore(dailyLog);
        const lifestyleScore = this.calculateLifestyleScore(dailyLog);

        let dailyScore;
        if (workoutScore === null) {
            dailyScore = (nutritionScore * 0.35 + supplementScore * 0.35 + lifestyleScore * 0.30);
        } else {
            dailyScore = (nutritionScore * 0.25 + workoutScore * 0.30 + supplementScore * 0.25 + lifestyleScore * 0.20);
        }

        return await this.upsertDailyCompletion(userId, logDate, {
            nutritionScore: nutritionScore.toFixed(2),
            workoutScore: workoutScore?.toFixed(2) ?? null,
            supplementScore: supplementScore.toFixed(2),
            lifestyleScore: lifestyleScore.toFixed(2),
            dailyScore: dailyScore.toFixed(2),
        });
    }

    // Helper calculators
    private calculateNutritionScore(dailyLog: OptimizeDailyLog | null | undefined, meals: MealLog[]): number {
        if (!dailyLog && meals.length === 0) return 0;
        let score = 0;
        const mealTypes = new Set(meals.map(m => m.mealType));
        if (mealTypes.has('breakfast')) score += 0.25;
        if (mealTypes.has('lunch')) score += 0.25;
        if (mealTypes.has('dinner')) score += 0.25;
        if (mealTypes.has('snack')) score += 0.10;
        const totalCalories = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
        if (totalCalories >= 1500 && totalCalories <= 3000) score += 0.15;
        return Math.min(score, 1.0);
    }

    private calculateWorkoutScore(workoutLog: WorkoutLog | null, workoutPlan: WorkoutPlan | null | undefined, dayOfWeek: string): number | null {
        const schedule = workoutPlan?.workoutSchedule as Array<{ day: string; isRestDay?: boolean }> | null;
        const todayPlan = schedule?.find(d => d.day.toLowerCase() === dayOfWeek.toLowerCase());
        if (todayPlan?.isRestDay) return 1.0;
        if (!todayPlan && !workoutLog) return null;
        if (workoutLog?.completedAt) {
            const exercisesCompleted = (workoutLog.exercisesCompleted as unknown[] | null)?.length || 0;
            if (exercisesCompleted >= 6) return 1.0;
            if (exercisesCompleted >= 4) return 0.75;
            if (exercisesCompleted >= 2) return 0.50;
            return exercisesCompleted > 0 ? 0.25 : 0;
        }
        return 0;
    }

    private calculateSupplementScore(dailyLog: OptimizeDailyLog | null | undefined): number {
        if (!dailyLog) return 0;
        let doses = 0;
        if (dailyLog.supplementMorning) doses++;
        if (dailyLog.supplementAfternoon) doses++;
        if (dailyLog.supplementEvening) doses++;
        return Math.round((doses / 3) * 100) / 100;
    }

    private calculateLifestyleScore(dailyLog: OptimizeDailyLog | null | undefined): number {
        let score = 0;
        if (dailyLog?.sleepQuality) score += 0.33;
        if (dailyLog?.energyLevel) score += 0.33;
        if (dailyLog?.moodLevel) score += 0.34;
        const waterOz = dailyLog?.waterIntakeOz || 0;
        if (waterOz >= 64) score += 0.10;
        return Math.min(score, 1.0);
    }

    // --- Preferences (Tracking / SMS / Workout) ---

    async getTrackingPreferences(userId: string): Promise<TrackingPreferences | undefined> {
        const [prefs] = await this.db.select().from(trackingPreferences).where(eq(trackingPreferences.userId, userId));
        return prefs || undefined;
    }

    async upsertTrackingPreferences(userId: string, prefs: Partial<InsertTrackingPreferences>): Promise<TrackingPreferences> {
        const existing = await this.getTrackingPreferences(userId);
        if (existing) {
            const [updated] = await this.db.update(trackingPreferences).set({ ...prefs, updatedAt: new Date() }).where(eq(trackingPreferences.id, existing.id)).returning();
            return updated;
        }
        const [created] = await this.db.insert(trackingPreferences).values({ ...prefs, userId }).returning();
        return created;
    }

    async getWorkoutPreferences(userId: string): Promise<WorkoutPreferences | undefined> {
        const [prefs] = await this.db.select().from(workoutPreferences).where(eq(workoutPreferences.userId, userId));
        return prefs || undefined;
    }

    async upsertWorkoutPreferences(userId: string, prefs: Partial<InsertWorkoutPreferences>): Promise<WorkoutPreferences> {
        const existing = await this.getWorkoutPreferences(userId);
        if (existing) {
            const updates: any = { ...prefs, updatedAt: new Date() };
            if (prefs.preferredDays) {
                updates.preferredDays = prefs.preferredDays as string[];
            }
            const [updated] = await this.db.update(workoutPreferences).set(updates).where(eq(workoutPreferences.id, existing.id)).returning();
            return updated;
        }
        const [created] = await this.db.insert(workoutPreferences).values({
            userId,
            preferredDays: (prefs.preferredDays ?? ['Monday', 'Wednesday', 'Friday']) as string[],
            preferredTime: prefs.preferredTime ?? '07:00',
            smsEnabled: prefs.smsEnabled ?? false,
            calendarSync: prefs.calendarSync ?? false
        }).returning();
        return created;
    }

    async getOptimizeSmsPreferences(userId: string): Promise<OptimizeSmsPreferences | undefined> {
        const [prefs] = await this.db.select().from(optimizeSmsPreferences).where(eq(optimizeSmsPreferences.userId, userId));
        return prefs || undefined;
    }

    async createOrUpdateOptimizeSmsPreferences(userId: string, prefs: Partial<InsertOptimizeSmsPreferences>): Promise<OptimizeSmsPreferences> {
        const existing = await this.getOptimizeSmsPreferences(userId);
        if (existing) {
            const [updated] = await this.db.update(optimizeSmsPreferences).set({ ...prefs, updatedAt: new Date() }).where(eq(optimizeSmsPreferences.id, existing.id)).returning();
            return updated;
        }
        const [created] = await this.db.insert(optimizeSmsPreferences).values({ ...prefs, userId }).returning();
        return created;
    }

    // --- Exercise Records ---

    async getExerciseRecord(userId: string, exerciseName: string): Promise<ExerciseRecord | undefined> {
        const [record] = await this.db
            .select()
            .from(exerciseRecords)
            .where(and(eq(exerciseRecords.userId, userId), eq(exerciseRecords.exerciseName, exerciseName)));
        return record || undefined;
    }

    async getExerciseRecords(userId: string): Promise<ExerciseRecord[]> {
        return await this.db.select().from(exerciseRecords).where(eq(exerciseRecords.userId, userId)).orderBy(desc(exerciseRecords.updatedAt));
    }

    async getTrackedPRs(userId: string): Promise<ExerciseRecord[]> {
        return await this.db
            .select()
            .from(exerciseRecords)
            .where(and(eq(exerciseRecords.userId, userId), eq(exerciseRecords.isPrTracked, true)))
            .orderBy(desc(exerciseRecords.prWeight));
    }

    async upsertExerciseRecord(userId: string, exerciseName: string, data: {
        lastWeight?: number;
        lastReps?: number;
        prWeight?: number;
        prReps?: number;
        isPrTracked?: boolean;
    }): Promise<ExerciseRecord> {
        const existing = await this.getExerciseRecord(userId, exerciseName);

        if (existing) {
            const updates: Partial<ExerciseRecord> = { updatedAt: new Date() };

            if (data.lastWeight !== undefined) {
                updates.lastWeight = data.lastWeight;
                updates.lastReps = data.lastReps ?? null;
                updates.lastLoggedAt = new Date();
            }

            if (data.isPrTracked !== undefined) updates.isPrTracked = data.isPrTracked;
            if (data.prWeight !== undefined) {
                updates.prWeight = data.prWeight;
                updates.prReps = data.prReps ?? null;
                updates.prDate = new Date();
            }

            const [updated] = await this.db.update(exerciseRecords).set(updates).where(eq(exerciseRecords.id, existing.id)).returning();
            return updated;
        }

        const [created] = await this.db.insert(exerciseRecords).values({
            userId,
            exerciseName,
            lastWeight: data.lastWeight ?? null,
            lastReps: data.lastReps ?? null,
            lastLoggedAt: data.lastWeight ? new Date() : null,
            prWeight: data.prWeight ?? null,
            prReps: data.prReps ?? null,
            prDate: data.prWeight ? new Date() : null,
            isPrTracked: data.isPrTracked ?? false,
        }).returning();
        return created;
    }

    async deleteExercisePR(userId: string, exerciseName: string): Promise<boolean> {
        const existing = await this.getExerciseRecord(userId, exerciseName);
        if (!existing) return false;

        const [updated] = await this.db.update(exerciseRecords).set({
            isPrTracked: false,
            prWeight: null,
            prReps: null,
            prDate: null,
            updatedAt: new Date(),
        }).where(eq(exerciseRecords.id, existing.id)).returning();
        return !!updated;
    }

    // --- Grocery Lists ---

    async createGroceryList(list: InsertGroceryList): Promise<GroceryList> {
        const [created] = await this.db.insert(groceryLists).values(list).returning();
        return created;
    }

    async getGroceryList(id: string): Promise<GroceryList | undefined> {
        const [list] = await this.db.select().from(groceryLists).where(eq(groceryLists.id, id));
        return list || undefined;
    }

    async getActiveGroceryList(userId: string): Promise<GroceryList | undefined> {
        const [list] = await this.db
            .select()
            .from(groceryLists)
            .where(and(eq(groceryLists.userId, userId), eq(groceryLists.isArchived, false)))
            .orderBy(desc(groceryLists.generatedAt))
            .limit(1);
        return list || undefined;
    }

    async updateGroceryList(id: string, updates: Partial<InsertGroceryList>): Promise<GroceryList | undefined> {
        const [updated] = await this.db.update(groceryLists).set(updates).where(eq(groceryLists.id, id)).returning();
        return updated || undefined;
    }

    // --- Meal Plans ---

    async createMealPlan(plan: InsertMealPlan): Promise<MealPlan> {
        const [created] = await this.db.insert(mealPlans).values(plan).returning();
        return created;
    }

    async getMealPlan(id: string): Promise<MealPlan | undefined> {
        const [plan] = await this.db.select().from(mealPlans).where(eq(mealPlans.id, id));
        return plan || undefined;
    }

    async getActiveMealPlan(userId: string): Promise<MealPlan | undefined> {
        const [plan] = await this.db
            .select()
            .from(mealPlans)
            .where(and(eq(mealPlans.userId, userId), eq(mealPlans.isActive, true)))
            .orderBy(desc(mealPlans.createdAt))
            .limit(1);
        return plan || undefined;
    }

    // --- Complex Streak Logic ---

    async getSmartStreakData(userId: string, userTimezone: string = 'America/New_York'): Promise<{
        currentStreak: number;
        longestStreak: number;
        monthlyProgress: Array<{
            date: string;
            percentage: number;
            isRestDay: boolean;
            breakdown: {
                workout: { done: boolean; isRestDay: boolean };
                nutrition: { score: number; mealsLogged: number; mainMeals: number; goal: number };
                supplements: { taken: number; total: number };
                water: { current: number; goal: number };
                lifestyle: { sleepLogged: boolean; energyLogged: boolean; moodLogged: boolean; complete: boolean };
            };
        }>;
        todayBreakdown: {
            workout: { done: boolean; isRestDay: boolean };
            nutrition: { score: number; mealsLogged: number; mainMeals: number; goal: number };
            supplements: { taken: number; total: number };
            water: { current: number; goal: number };
            lifestyle: { sleepLogged: boolean; energyLogged: boolean; moodLogged: boolean; complete: boolean };
        } | null;
    }> {
        const prefs = await this.getTrackingPreferences(userId);
        const hydrationGoal = prefs?.hydrationGoalOz ?? 64;

        const workoutPlan = await this.getActiveWorkoutPlan(userId);
        let restDays: number[] = [];

        if (workoutPlan?.workoutSchedule) {
            try {
                const schedule = typeof workoutPlan.workoutSchedule === 'string'
                    ? JSON.parse(workoutPlan.workoutSchedule)
                    : workoutPlan.workoutSchedule;

                if (Array.isArray(schedule)) {
                    const dayMap: Record<string, number> = {
                        'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
                        'thursday': 4, 'friday': 5, 'saturday': 6
                    };

                    schedule.forEach((item: any) => {
                        const dayIndex = dayMap[item.day?.toLowerCase()];
                        if (dayIndex !== undefined && (!item.workoutId || item.workoutId === 'rest' || item.isRestDay)) {
                            restDays.push(dayIndex);
                        }
                    });
                }
            } catch (e) {
                // Ignore parsing errors
            }
        }

        const today = getUserLocalMidnight(userTimezone);
        const startOfMonth = new Date(today);
        startOfMonth.setDate(today.getDate() - 29);
        const todayStr = getUserLocalDateString(userTimezone);

        const monthlyProgress: any[] = [];

        const endOfMonth = new Date(today);
        endOfMonth.setDate(endOfMonth.getDate() + 1);
        endOfMonth.setHours(23, 59, 59, 999);

        const allDailyLogs = await this.listDailyLogs(userId, startOfMonth, endOfMonth);
        const dailyLogsByDate = new Map<string, any>();
        allDailyLogs.forEach(log => {
            const dateStr = toUserLocalDateString(new Date(log.logDate), userTimezone);
            dailyLogsByDate.set(dateStr, log);
        });

        const allCompletions = await this.db.select().from(dailyCompletions).where(and(
            eq(dailyCompletions.userId, userId),
            gte(dailyCompletions.logDate, startOfMonth.toISOString().split('T')[0]),
            lte(dailyCompletions.logDate, endOfMonth.toISOString().split('T')[0])
        ));
        const completionsByDate = new Map<string, any>();
        allCompletions.forEach(c => completionsByDate.set(c.logDate, c));

        const allWorkoutLogsRange = await this.db.select().from(workoutLogs).where(and(
            eq(workoutLogs.userId, userId),
            gte(workoutLogs.completedAt, startOfMonth),
            lte(workoutLogs.completedAt, endOfMonth)
        ));

        const workoutLogsByDate = new Map<string, any[]>();
        allWorkoutLogsRange.forEach(log => {
            const dateStr = toUserLocalDateString(new Date(log.completedAt), userTimezone);
            if (!workoutLogsByDate.has(dateStr)) workoutLogsByDate.set(dateStr, []);
            workoutLogsByDate.get(dateStr)!.push(log);
        });

        const allMealLogs = await this.db.select().from(mealLogs).where(and(
            eq(mealLogs.userId, userId),
            gte(mealLogs.loggedAt, startOfMonth),
            lte(mealLogs.loggedAt, endOfMonth)
        ));
        const mealLogsByDate = new Map<string, any[]>();
        allMealLogs.forEach(log => {
            const dateStr = toUserLocalDateString(new Date(log.loggedAt), userTimezone);
            if (!mealLogsByDate.has(dateStr)) mealLogsByDate.set(dateStr, []);
            mealLogsByDate.get(dateStr)!.push(log);
        });

        for (let i = 0; i < 30; i++) {
            const date = new Date(startOfMonth);
            date.setDate(startOfMonth.getDate() + i);
            const dateStr = toUserLocalDateString(date, userTimezone);
            const dayOfWeek = date.getDay();

            const dailyLog = dailyLogsByDate.get(dateStr);
            const isRestDay = dailyLog?.isRestDay || restDays.includes(dayOfWeek);
            const completion = completionsByDate.get(dateStr);
            const dayWorkoutLogs = workoutLogsByDate.get(dateStr) || [];
            const workoutDone = dayWorkoutLogs.length > 0;
            const mealsLogged = mealLogsByDate.get(dateStr) || [];
            const uniqueMealTypes = new Set(mealsLogged.map((m: any) => m.mealType));
            const mainMealsLogged = (['breakfast', 'lunch', 'dinner'] as const).filter(type => uniqueMealTypes.has(type)).length;

            const breakdown = {
                workout: { done: workoutDone, isRestDay },
                nutrition: {
                    score: completion?.nutritionScore ? Math.round(parseFloat(completion.nutritionScore) * 100) : 0,
                    mealsLogged: mealsLogged.length,
                    mainMeals: mainMealsLogged,
                    goal: 3
                },
                supplements: {
                    taken: [dailyLog?.supplementMorning, dailyLog?.supplementAfternoon, dailyLog?.supplementEvening].filter(Boolean).length,
                    total: 3
                },
                water: { current: dailyLog?.waterIntakeOz || 0, goal: hydrationGoal },
                lifestyle: {
                    sleepLogged: !!dailyLog?.sleepQuality,
                    energyLogged: !!dailyLog?.energyLevel,
                    moodLogged: !!dailyLog?.moodLevel,
                    complete: !!(dailyLog?.sleepQuality && dailyLog?.energyLevel && dailyLog?.moodLevel)
                }
            };

            const isToday = dateStr === todayStr;
            const enabled = {
                workout: prefs?.trackWorkouts !== false,
                nutrition: prefs?.trackNutrition !== false,
                supplements: prefs?.trackSupplements !== false,
                water: hydrationGoal > 0,
                lifestyle: prefs?.trackLifestyle !== false,
            };

            let completed = 0;
            let total = 0;

            const workoutHasData = isRestDay || workoutDone;
            const nutritionHasData = breakdown.nutrition.mealsLogged > 0;
            const supplementsHasData = breakdown.supplements.taken > 0;
            const waterHasData = breakdown.water.current > 0;
            const lifestyleHasData = breakdown.lifestyle.sleepLogged || breakdown.lifestyle.energyLogged || breakdown.lifestyle.moodLogged;

            if (enabled.workout && (isToday || workoutHasData)) { total++; if (workoutHasData) completed++; }
            if (enabled.nutrition && (isToday || nutritionHasData)) { total++; if (nutritionHasData) completed++; }
            if (enabled.supplements && (isToday || supplementsHasData)) { total++; if (breakdown.supplements.taken >= breakdown.supplements.total) completed++; }
            if (enabled.water && (isToday || waterHasData)) { total++; if (breakdown.water.current >= breakdown.water.goal) completed++; }
            if (enabled.lifestyle && (isToday || lifestyleHasData)) { total++; if (breakdown.lifestyle.complete) completed++; }

            const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

            monthlyProgress.push({ date: dateStr, percentage, isRestDay, breakdown });
        }

        const todayData = monthlyProgress.find(d => d.date === todayStr);
        const STREAK_THRESHOLD = 50;
        let calculatedCurrentStreak = 0;

        let startIndex = monthlyProgress.length - 1;
        if (startIndex >= 0 && monthlyProgress[startIndex].date === todayStr) {
            const todayPercentage = monthlyProgress[startIndex].percentage;
            const todayIsRestDay = monthlyProgress[startIndex].isRestDay;
            if (todayPercentage >= STREAK_THRESHOLD || todayIsRestDay) calculatedCurrentStreak++;
            startIndex--;
        }

        for (let i = startIndex; i >= 0; i--) {
            if (monthlyProgress[i].percentage >= STREAK_THRESHOLD || monthlyProgress[i].isRestDay) calculatedCurrentStreak++;
            else break;
        }

        let calculatedLongestStreak = 0;
        let tempStreak = 0;
        for (const day of monthlyProgress) {
            if (day.percentage >= STREAK_THRESHOLD || day.isRestDay) {
                tempStreak++;
                calculatedLongestStreak = Math.max(calculatedLongestStreak, tempStreak);
            } else {
                tempStreak = 0;
            }
        }

        return {
            currentStreak: calculatedCurrentStreak,
            longestStreak: calculatedLongestStreak,
            monthlyProgress,
            todayBreakdown: todayData?.breakdown ?? null
        };
    }

    private calculateDiscountTier(streakDays: number): { discount: number; tier: string } {
        if (streakDays >= 90) return { discount: 20, tier: 'Champion' };
        if (streakDays >= 60) return { discount: 15, tier: 'Loyal' };
        if (streakDays >= 30) return { discount: 10, tier: 'Dedicated' };
        if (streakDays >= 14) return { discount: 8, tier: 'Committed' };
        if (streakDays >= 7) return { discount: 5, tier: 'Consistent' };
        return { discount: 0, tier: 'Building' };
    }

    async getStreakRewards(userId: string): Promise<{
        currentStreak: number;
        discountEarned: number;
        discountTier: string;
        lastOrderDate: Date | null;
        reorderWindowStart: Date | null;
        reorderDeadline: Date | null;
        streakStatus: 'building' | 'ready' | 'warning' | 'grace' | 'lapsed';
        daysUntilReorderWindow: number | null;
        daysUntilDeadline: number | null;
    }> {
        try {
            const streak = await this.getUserStreak(userId, 'supplements') || await this.getUserStreak(userId, 'overall');
            const [user] = await this.db.select().from(users).where(eq(users.id, userId));

            const currentStreak = streak?.currentStreak || 0;
            const { discount, tier } = this.calculateDiscountTier(currentStreak);
            const now = new Date();

            let daysUntilReorderWindow: number | null = null;
            let daysUntilDeadline: number | null = null;

            if (user?.reorderWindowStart) {
                const windowDiff = Math.ceil((user.reorderWindowStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                daysUntilReorderWindow = windowDiff > 0 ? windowDiff : 0;
            }

            if (user?.reorderDeadline) {
                const deadlineDiff = Math.ceil((user.reorderDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                daysUntilDeadline = deadlineDiff > 0 ? deadlineDiff : 0;
            }

            return {
                currentStreak,
                discountEarned: discount,
                discountTier: tier,
                lastOrderDate: user?.lastOrderDate || null,
                reorderWindowStart: user?.reorderWindowStart || null,
                reorderDeadline: user?.reorderDeadline || null,
                streakStatus: (user?.streakStatus as any) || 'building',
                daysUntilReorderWindow,
                daysUntilDeadline,
            };
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting streak rewards:`, error);
            return {
                currentStreak: 0,
                discountEarned: 0,
                discountTier: 'Building',
                lastOrderDate: null,
                reorderWindowStart: null,
                reorderDeadline: null,
                streakStatus: 'building',
                daysUntilReorderWindow: null,
                daysUntilDeadline: null,
            };
        }
    }

    async applyStreakDiscount(userId: string, orderId: string): Promise<number> {
        const [user] = await this.db.select().from(users).where(eq(users.id, userId));
        if (!user) return 0;

        const discountToApply = user.streakDiscountEarned || 0;
        if (discountToApply > 0) {
            const now = new Date();
            const reorderWindowStart = new Date(now);
            reorderWindowStart.setDate(reorderWindowStart.getDate() + 75);
            const reorderDeadline = new Date(now);
            reorderDeadline.setDate(reorderDeadline.getDate() + 95);

            await this.db.update(users).set({
                lastOrderDate: now,
                reorderWindowStart,
                reorderDeadline,
                streakStatus: 'building'
            }).where(eq(users.id, userId));
        }
        return discountToApply;
    }

    async resetStreakForLapsedUsers(): Promise<number> {
        const now = new Date();
        const gracePeriodEnd = new Date(now);
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() - 5);

        const result = await this.db
            .update(users)
            .set({ streakCurrentDays: 0, streakDiscountEarned: 0, streakStatus: 'lapsed' })
            .where(and(lt(users.reorderDeadline, gracePeriodEnd), sql`${users.streakStatus} != 'lapsed'`))
            .returning();
        return result.length;
    }

    async updateStreakStatuses(): Promise<void> {
        const now = new Date();
        // Ready
        await this.db.update(users).set({ streakStatus: 'ready' })
            .where(and(lte(users.reorderWindowStart, now), gt(users.reorderDeadline, new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000)), sql`${users.streakStatus} = 'building'`));
        // Warning
        const warningThreshold = new Date(now);
        warningThreshold.setDate(warningThreshold.getDate() + 10);
        await this.db.update(users).set({ streakStatus: 'warning' })
            .where(and(lte(users.reorderWindowStart, now), lte(users.reorderDeadline, warningThreshold), gt(users.reorderDeadline, now), sql`${users.streakStatus} IN ('building', 'ready')`));
        // Grace
        await this.db.update(users).set({ streakStatus: 'grace' })
            .where(and(lte(users.reorderDeadline, now), gt(users.reorderDeadline, new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)), sql`${users.streakStatus} IN ('building', 'ready', 'warning')`));
    }
}
