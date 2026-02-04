import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { db } from '../../infra/db/db';
import {
    optimizePlans,
    optimizeDailyLogs,
    mealLogs,
    userStreaks,
    dailyCompletions,
    workoutPlans,
    workouts,
    workoutLogs,
    exerciseRecords,
    workoutPreferences,
    groceryLists,
    optimizeSmsPreferences,
    trackingPreferences,
    mealPlans,
    type OptimizePlan,
    type InsertOptimizePlan,
    type OptimizeDailyLog,
    type InsertOptimizeDailyLog,
    type MealLog,
    type InsertMealLog,
    type UserStreak,
    type DailyCompletion,
    type InsertDailyCompletion,
    type WorkoutPlan,
    type InsertWorkoutPlan,
    type Workout,
    type InsertWorkout,
    type WorkoutLog,
    type InsertWorkoutLog,
    type ExerciseRecord,
    type WorkoutPreferences,
    type InsertWorkoutPreferences,
    type GroceryList,
    type InsertGroceryList,
    type OptimizeSmsPreferences,
    type InsertOptimizeSmsPreferences,
    type TrackingPreferences,
    type InsertTrackingPreferences,
    type MealPlan,
    type InsertMealPlan
} from '@shared/schema';

export class OptimizeRepository {
    // Optimize Plans
    async deactiveOldPlans(userId: string, planType: 'nutrition' | 'workout' | 'lifestyle'): Promise<void> {
        await db
            .update(optimizePlans)
            .set({ isActive: false, updatedAt: new Date() })
            .where(and(
                eq(optimizePlans.userId, userId),
                eq(optimizePlans.planType, planType),
                eq(optimizePlans.isActive, true)
            ));
    }

    async createOptimizePlan(plan: InsertOptimizePlan): Promise<OptimizePlan> {
        const [created] = await db.insert(optimizePlans).values(plan).returning();
        return created;
    }

    async getOptimizePlan(id: string): Promise<OptimizePlan | undefined> {
        const [plan] = await db
            .select()
            .from(optimizePlans)
            .where(eq(optimizePlans.id, id));
        return plan;
    }

    async getActiveOptimizePlan(userId: string, planType: 'nutrition' | 'workout' | 'lifestyle'): Promise<OptimizePlan | undefined> {
        const [plan] = await db
            .select()
            .from(optimizePlans)
            .where(and(
                eq(optimizePlans.userId, userId),
                eq(optimizePlans.planType, planType),
                eq(optimizePlans.isActive, true)
            ))
            .orderBy(desc(optimizePlans.createdAt))
            .limit(1);
        return plan;
    }

    async getOptimizePlans(userId: string): Promise<OptimizePlan[]> {
        return await db
            .select()
            .from(optimizePlans)
            .where(eq(optimizePlans.userId, userId))
            .orderBy(desc(optimizePlans.createdAt));
    }

    async updateOptimizePlan(id: string, updates: Partial<InsertOptimizePlan>): Promise<OptimizePlan | undefined> {
        const [updated] = await db
            .update(optimizePlans)
            .set({ ...updates, updatedAt: new Date() })
            .where(eq(optimizePlans.id, id))
            .returning();
        return updated;
    }

    // Daily Logs
    async createDailyLog(log: InsertOptimizeDailyLog): Promise<OptimizeDailyLog> {
        const [created] = await db.insert(optimizeDailyLogs).values(log).returning();
        return created;
    }

    async getDailyLog(userId: string, startDate: Date, endDate: Date): Promise<OptimizeDailyLog | undefined> {
        const [log] = await db
            .select()
            .from(optimizeDailyLogs)
            .where(and(
                eq(optimizeDailyLogs.userId, userId),
                gte(optimizeDailyLogs.logDate, startDate),
                lte(optimizeDailyLogs.logDate, endDate)
            ))
            .limit(1);
        return log;
    }

    async listDailyLogs(userId: string, startDate: Date, endDate: Date): Promise<OptimizeDailyLog[]> {
        return await db
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
        const [updated] = await db
            .update(optimizeDailyLogs)
            .set(updates)
            .where(eq(optimizeDailyLogs.id, id))
            .returning();
        return updated;
    }

    // Meal Logs
    async createMealLog(log: InsertMealLog): Promise<MealLog> {
        const [created] = await db.insert(mealLogs).values(log).returning();
        return created;
    }

    async getMealLogById(logId: string): Promise<MealLog | undefined> {
        const [log] = await db
            .select()
            .from(mealLogs)
            .where(eq(mealLogs.id, logId));
        return log;
    }

    async getMealLogsForRange(userId: string, startDate: Date, endDate: Date): Promise<MealLog[]> {
        return await db
            .select()
            .from(mealLogs)
            .where(and(
                eq(mealLogs.userId, userId),
                gte(mealLogs.loggedAt, startDate),
                lte(mealLogs.loggedAt, endDate)
            ))
            .orderBy(mealLogs.loggedAt);
    }

    async getMealLogsHistory(userId: string, limit = 50): Promise<MealLog[]> {
        return await db
            .select()
            .from(mealLogs)
            .where(eq(mealLogs.userId, userId))
            .orderBy(desc(mealLogs.loggedAt))
            .limit(limit);
    }

    async updateMealLog(logId: string, updates: Partial<InsertMealLog>): Promise<MealLog | undefined> {
        const [updated] = await db
            .update(mealLogs)
            .set(updates)
            .where(eq(mealLogs.id, logId))
            .returning();
        return updated;
    }

    async deleteMealLog(userId: string, logId: string): Promise<boolean> {
        const result = await db
            .delete(mealLogs)
            .where(and(eq(mealLogs.id, logId), eq(mealLogs.userId, userId)));
        return (result.rowCount || 0) > 0;
    }

    // User Streaks
    async getUserStreak(userId: string, streakType: 'overall' | 'nutrition' | 'workout' | 'lifestyle' | 'supplements'): Promise<UserStreak | undefined> {
        const [streak] = await db
            .select()
            .from(userStreaks)
            .where(and(
                eq(userStreaks.userId, userId),
                eq(userStreaks.streakType, streakType)
            ));
        return streak;
    }

    async getAllUserStreaks(userId: string): Promise<UserStreak[]> {
        return await db
            .select()
            .from(userStreaks)
            .where(eq(userStreaks.userId, userId));
    }

    async createStreak(streak: typeof userStreaks.$inferInsert): Promise<UserStreak> {
        const [created] = await db.insert(userStreaks).values(streak).returning();
        return created;
    }

    async updateStreak(id: string, updates: Partial<typeof userStreaks.$inferInsert>): Promise<UserStreak | undefined> {
        const [updated] = await db
            .update(userStreaks)
            .set({ ...updates, updatedAt: new Date() })
            .where(eq(userStreaks.id, id))
            .returning();
        return updated;
    }

    // Daily Completions
    async getDailyCompletion(userId: string, logDateStr: string): Promise<DailyCompletion | undefined> {
        const [completion] = await db
            .select()
            .from(dailyCompletions)
            .where(and(
                eq(dailyCompletions.userId, userId),
                eq(dailyCompletions.logDate, logDateStr)
            ));
        return completion;
    }

    async listDailyCompletions(userId: string, startDateStr: string, endDateStr: string): Promise<DailyCompletion[]> {
        return await db
            .select()
            .from(dailyCompletions)
            .where(and(
                eq(dailyCompletions.userId, userId),
                gte(dailyCompletions.logDate, startDateStr),
                lte(dailyCompletions.logDate, endDateStr)
            ));
    }

    async createDailyCompletion(completion: InsertDailyCompletion): Promise<DailyCompletion> {
        const [created] = await db.insert(dailyCompletions).values(completion).returning();
        return created;
    }

    async updateDailyCompletion(id: string, updates: Partial<InsertDailyCompletion>): Promise<DailyCompletion | undefined> {
        const [updated] = await db
            .update(dailyCompletions)
            .set({ ...updates, updatedAt: new Date() })
            .where(eq(dailyCompletions.id, id))
            .returning();
        return updated;
    }

    // Workout Plans & Logs
    async createWorkoutPlan(plan: InsertWorkoutPlan): Promise<WorkoutPlan> {
        const [created] = await db.insert(workoutPlans).values(plan).returning();
        return created;
    }

    async getWorkoutPlan(id: string): Promise<WorkoutPlan | undefined> {
        const [plan] = await db
            .select()
            .from(workoutPlans)
            .where(eq(workoutPlans.id, id));
        return plan;
    }

    async getActiveWorkoutPlan(userId: string): Promise<WorkoutPlan | undefined> {
        const [plan] = await db
            .select()
            .from(workoutPlans)
            .where(and(
                eq(workoutPlans.userId, userId),
                eq(workoutPlans.isActive, true)
            ))
            .orderBy(desc(workoutPlans.createdAt))
            .limit(1);
        return plan;
    }

    async createWorkout(workout: InsertWorkout): Promise<Workout> {
        const [created] = await db.insert(workouts).values(workout).returning();
        return created;
    }

    async listWorkoutsForPlan(planId: string): Promise<Workout[]> {
        return await db
            .select()
            .from(workouts)
            .where(eq(workouts.planId, planId));
    }

    async getWorkout(id: string): Promise<Workout | undefined> {
        const [workout] = await db
            .select()
            .from(workouts)
            .where(eq(workouts.id, id));
        return workout;
    }

    async createWorkoutLog(log: InsertWorkoutLog): Promise<WorkoutLog> {
        const [created] = await db.insert(workoutLogs).values(log).returning();
        return created;
    }

    async listWorkoutLogs(userId: string, limit = 10, offset = 0): Promise<WorkoutLog[]> {
        return await db
            .select()
            .from(workoutLogs)
            .where(eq(workoutLogs.userId, userId))
            .orderBy(desc(workoutLogs.completedAt))
            .limit(limit)
            .offset(offset);
    }

    async getAllWorkoutLogs(userId: string): Promise<WorkoutLog[]> {
        return await db
            .select()
            .from(workoutLogs)
            .where(eq(workoutLogs.userId, userId))
            .orderBy(desc(workoutLogs.completedAt));
    }

    async getWorkoutLogsForRange(userId: string, startDate: Date, endDate: Date): Promise<WorkoutLog[]> {
        return await db
            .select()
            .from(workoutLogs)
            .where(and(
                eq(workoutLogs.userId, userId),
                gte(workoutLogs.completedAt, startDate),
                lte(workoutLogs.completedAt, endDate)
            ));
    }

    async deleteWorkoutLog(userId: string, logId: string): Promise<boolean> {
        const result = await db
            .delete(workoutLogs)
            .where(and(eq(workoutLogs.id, logId), eq(workoutLogs.userId, userId)));
        return (result.rowCount || 0) > 0;
    }

    // Exercise Records
    async getExerciseRecord(userId: string, exerciseName: string): Promise<ExerciseRecord | undefined> {
        const [record] = await db
            .select()
            .from(exerciseRecords)
            .where(and(
                eq(exerciseRecords.userId, userId),
                eq(exerciseRecords.exerciseName, exerciseName)
            ));
        return record;
    }

    async getExerciseRecords(userId: string): Promise<ExerciseRecord[]> {
        return await db
            .select()
            .from(exerciseRecords)
            .where(eq(exerciseRecords.userId, userId))
            .orderBy(desc(exerciseRecords.updatedAt));
    }

    async getTrackedPRs(userId: string): Promise<ExerciseRecord[]> {
        return await db
            .select()
            .from(exerciseRecords)
            .where(and(
                eq(exerciseRecords.userId, userId),
                eq(exerciseRecords.isPrTracked, true)
            ))
            .orderBy(desc(exerciseRecords.prWeight));
    }

    async createExerciseRecord(record: typeof exerciseRecords.$inferInsert): Promise<ExerciseRecord> {
        const [created] = await db.insert(exerciseRecords).values(record).returning();
        return created;
    }

    async updateExerciseRecord(id: string, updates: Partial<typeof exerciseRecords.$inferInsert>): Promise<ExerciseRecord | undefined> {
        const [updated] = await db
            .update(exerciseRecords)
            .set({ ...updates, updatedAt: new Date() })
            .where(eq(exerciseRecords.id, id))
            .returning();
        return updated;
    }

    // Workout Preferences
    async getWorkoutPreferences(userId: string): Promise<WorkoutPreferences | undefined> {
        const [prefs] = await db
            .select()
            .from(workoutPreferences)
            .where(eq(workoutPreferences.userId, userId));
        return prefs;
    }

    async createWorkoutPreferences(prefs: InsertWorkoutPreferences): Promise<WorkoutPreferences> {
        const [created] = await db.insert(workoutPreferences).values(prefs as any).returning();
        return created;
    }

    async updateWorkoutPreferences(id: string, updates: Partial<InsertWorkoutPreferences>): Promise<WorkoutPreferences | undefined> {
        const [updated] = await db
            .update(workoutPreferences)
            .set({ ...updates, updatedAt: new Date() } as any)
            .where(eq(workoutPreferences.id, id))
            .returning();
        return updated;
    }

    // Grocery Lists
    async createGroceryList(list: InsertGroceryList): Promise<GroceryList> {
        const [created] = await db
            .insert(groceryLists)
            .values(list)
            .returning();
        return created;
    }

    async getGroceryList(id: string): Promise<GroceryList | undefined> {
        const [list] = await db
            .select()
            .from(groceryLists)
            .where(eq(groceryLists.id, id));
        return list;
    }

    async getActiveGroceryList(userId: string): Promise<GroceryList | undefined> {
        const [list] = await db
            .select()
            .from(groceryLists)
            .where(and(
                eq(groceryLists.userId, userId),
                eq(groceryLists.isArchived, false)
            ))
            .orderBy(desc(groceryLists.generatedAt))
            .limit(1);
        return list;
    }

    async updateGroceryList(id: string, updates: Partial<InsertGroceryList>): Promise<GroceryList | undefined> {
        const [updated] = await db
            .update(groceryLists)
            .set(updates)
            .where(eq(groceryLists.id, id))
            .returning();
        return updated;
    }

    // SMS Preferences
    async getOptimizeSmsPreferences(userId: string): Promise<OptimizeSmsPreferences | undefined> {
        const [prefs] = await db
            .select()
            .from(optimizeSmsPreferences)
            .where(eq(optimizeSmsPreferences.userId, userId));
        return prefs;
    }

    async createOptimizeSmsPreferences(prefs: InsertOptimizeSmsPreferences): Promise<OptimizeSmsPreferences> {
        const [created] = await db.insert(optimizeSmsPreferences).values(prefs as any).returning();
        return created;
    }

    async updateOptimizeSmsPreferences(id: string, updates: Partial<InsertOptimizeSmsPreferences>): Promise<OptimizeSmsPreferences | undefined> {
        const [updated] = await db
            .update(optimizeSmsPreferences)
            .set({ ...updates, updatedAt: new Date() } as any)
            .where(eq(optimizeSmsPreferences.id, id))
            .returning();
        return updated;
    }

    // Tracking Preferences
    async getTrackingPreferences(userId: string): Promise<TrackingPreferences | undefined> {
        const [prefs] = await db
            .select()
            .from(trackingPreferences)
            .where(eq(trackingPreferences.userId, userId));
        return prefs;
    }

    async createTrackingPreferences(prefs: InsertTrackingPreferences): Promise<TrackingPreferences> {
        const [created] = await db.insert(trackingPreferences).values(prefs as any).returning();
        return created;
    }

    async updateTrackingPreferences(id: string, updates: Partial<InsertTrackingPreferences>): Promise<TrackingPreferences | undefined> {
        const [updated] = await db
            .update(trackingPreferences)
            .set({ ...updates, updatedAt: new Date() } as any)
            .where(eq(trackingPreferences.id, id))
            .returning();
        return updated;
    }

    // Meal Plans
    async createMealPlan(plan: InsertMealPlan): Promise<MealPlan> {
        const [created] = await db.insert(mealPlans).values(plan).returning();
        return created;
    }

    async getMealPlan(id: string): Promise<MealPlan | undefined> {
        const [plan] = await db
            .select()
            .from(mealPlans)
            .where(eq(mealPlans.id, id));
        return plan;
    }

    async getActiveMealPlan(userId: string): Promise<MealPlan | undefined> {
        const [plan] = await db
            .select()
            .from(mealPlans)
            .where(and(
                eq(mealPlans.userId, userId),
                eq(mealPlans.isActive, true)
            ))
            .orderBy(desc(mealPlans.createdAt))
            .limit(1);
        return plan;
    }

    async deleteExercisePR(userId: string, exerciseName: string): Promise<boolean> {
        const [record] = await db
            .select()
            .from(exerciseRecords)
            .where(and(
                eq(exerciseRecords.userId, userId),
                eq(exerciseRecords.exerciseName, exerciseName)
            ));
        if (!record) return false;
        await db
            .update(exerciseRecords)
            .set({
                isPrTracked: false,
                prWeight: null,
                prReps: null,
                prDate: null,
                updatedAt: new Date()
            })
            .where(eq(exerciseRecords.id, record.id));
        return true;
    }
}

export const optimizeRepository = new OptimizeRepository();
