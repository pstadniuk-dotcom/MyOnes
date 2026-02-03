
import { eq, desc, and, gte, lte, sql, isNull } from "drizzle-orm";
import {
    optimizePlans, optimizeDailyLogs, groceryLists, exerciseRecords, userStreaks,
    workoutPlans, workouts, workoutLogs, workoutPreferences,
    mealPlans, recipes, mealLogs, optimizeSmsPreferences, trackingPreferences,
    dailyCompletions, weeklySummaries,
    type OptimizePlan, type InsertOptimizePlan,
    type OptimizeDailyLog, type InsertOptimizeDailyLog,
    type GroceryList, type InsertGroceryList,
    type ExerciseRecord, type InsertExerciseRecord,
    type UserStreak, type InsertUserStreak,
    type WorkoutPlan, type InsertWorkoutPlan,
    type Workout, type InsertWorkout,
    type WorkoutLog, type InsertWorkoutLog,
    type WorkoutPreferences, type InsertWorkoutPreferences,
    type MealPlan, type InsertMealPlan,
    type Recipe, type InsertRecipe,
    type MealLog, type InsertMealLog,
    type OptimizeSmsPreferences, type InsertOptimizeSmsPreferences,
    type TrackingPreferences, type InsertTrackingPreferences,
    type DailyCompletion, type InsertDailyCompletion,
    type WeeklySummary, type InsertWeeklySummary
} from "@shared/schema";
import { BaseRepository } from "../../infrastructure/database/base.repository";
import { logger } from "../../infrastructure/logging/logger";

export class OptimizeRepository extends BaseRepository<typeof optimizePlans, OptimizePlan, InsertOptimizePlan> {
    constructor(db: any) {
        super(db, optimizePlans, "OptimizeRepository");
    }

    // ==================== Optimize Plans ====================

    async createOptimizePlan(plan: InsertOptimizePlan): Promise<OptimizePlan> {
        try {
            const [created] = await this.db.insert(optimizePlans).values(plan).returning();
            return created;
        } catch (error) {
            logger.error(`[${this.domainName}] Error creating optimize plan:`, error);
            throw error;
        }
    }

    async getOptimizePlan(id: string): Promise<OptimizePlan | undefined> {
        try {
            const [plan] = await this.db
                .select()
                .from(optimizePlans)
                .where(eq(optimizePlans.id, id));
            return plan || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting optimize plan:`, error);
            return undefined;
        }
    }

    async getActiveOptimizePlan(userId: string, planType: 'nutrition' | 'workout' | 'lifestyle'): Promise<OptimizePlan | undefined> {
        try {
            const [plan] = await this.db
                .select()
                .from(optimizePlans)
                .where(and(
                    eq(optimizePlans.userId, userId),
                    eq(optimizePlans.planType, planType),
                    eq(optimizePlans.isActive, true)
                ))
                .orderBy(desc(optimizePlans.createdAt))
                .limit(1);
            return plan || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting active optimize plan:`, error);
            return undefined;
        }
    }

    async getOptimizePlans(userId: string): Promise<OptimizePlan[]> {
        try {
            return await this.db
                .select()
                .from(optimizePlans)
                .where(eq(optimizePlans.userId, userId))
                .orderBy(desc(optimizePlans.createdAt));
        } catch (error) {
            logger.error(`[${this.domainName}] Error listing optimize plans:`, error);
            return [];
        }
    }

    async updateOptimizePlan(id: string, updates: Partial<InsertOptimizePlan>): Promise<OptimizePlan | undefined> {
        try {
            const [updated] = await this.db
                .update(optimizePlans)
                .set(updates)
                .where(eq(optimizePlans.id, id))
                .returning();
            return updated || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error updating optimize plan:`, error);
            return undefined;
        }
    }

    // ==================== Daily Logs (General) ====================

    async createDailyLog(log: InsertOptimizeDailyLog): Promise<OptimizeDailyLog> {
        try {
            const [created] = await this.db.insert(optimizeDailyLogs).values(log).returning();

            // Update streak after logging
            await this.updateUserStreak(log.userId, log.logDate);

            return created;
        } catch (error) {
            logger.error(`[${this.domainName}] Error creating daily log:`, error);
            throw error;
        }
    }

    async getDailyLog(userId: string, date: Date): Promise<OptimizeDailyLog | undefined> {
        try {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

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
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting daily log:`, error);
            return undefined;
        }
    }

    async listDailyLogs(userId: string, startDate: Date, endDate: Date): Promise<OptimizeDailyLog[]> {
        try {
            return await this.db
                .select()
                .from(optimizeDailyLogs)
                .where(and(
                    eq(optimizeDailyLogs.userId, userId),
                    gte(optimizeDailyLogs.logDate, startDate),
                    lte(optimizeDailyLogs.logDate, endDate)
                ))
                .orderBy(desc(optimizeDailyLogs.logDate));
        } catch (error) {
            logger.error(`[${this.domainName}] Error listing daily logs:`, error);
            return [];
        }
    }

    async updateDailyLog(id: string, updates: Partial<InsertOptimizeDailyLog>): Promise<OptimizeDailyLog | undefined> {
        try {
            const [updated] = await this.db
                .update(optimizeDailyLogs)
                .set(updates)
                .where(eq(optimizeDailyLogs.id, id))
                .returning();

            if (updated) {
                // Update streak if log is updated
                await this.updateUserStreak(updated.userId, updated.logDate);
            }

            return updated || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error updating daily log:`, error);
            return undefined;
        }
    }

    // ==================== Workout Plans & Workouts ====================

    async createWorkoutPlan(plan: InsertWorkoutPlan): Promise<WorkoutPlan> {
        try {
            const [created] = await this.db.insert(workoutPlans).values(plan).returning();
            return created;
        } catch (error) {
            logger.error(`[${this.domainName}] Error creating workout plan:`, error);
            throw error;
        }
    }

    async getActiveWorkoutPlan(userId: string): Promise<WorkoutPlan | undefined> {
        try {
            const [plan] = await this.db
                .select()
                .from(workoutPlans)
                .where(and(eq(workoutPlans.userId, userId), eq(workoutPlans.isActive, true)))
                .limit(1);
            return plan || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting active workout plan:`, error);
            return undefined;
        }
    }

    async getWorkoutPlan(id: string): Promise<WorkoutPlan | undefined> {
        try {
            const [plan] = await this.db
                .select()
                .from(workoutPlans)
                .where(eq(workoutPlans.id, id));
            return plan || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting workout plan:`, error);
            return undefined;
        }
    }

    async createWorkout(workout: InsertWorkout): Promise<Workout> {
        try {
            const [created] = await this.db.insert(workouts).values(workout).returning();
            return created;
        } catch (error) {
            logger.error(`[${this.domainName}] Error creating workout:`, error);
            throw error;
        }
    }

    async listWorkoutsForPlan(planId: string): Promise<Workout[]> {
        try {
            return await this.db
                .select()
                .from(workouts)
                .where(eq(workouts.planId, planId));
        } catch (error) {
            logger.error(`[${this.domainName}] Error listing workouts for plan:`, error);
            return [];
        }
    }

    async getWorkout(id: string): Promise<Workout | undefined> {
        try {
            const [workout] = await this.db
                .select()
                .from(workouts)
                .where(eq(workouts.id, id));
            return workout || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting workout:`, error);
            return undefined;
        }
    }

    // ==================== Workout Logs ====================

    async createWorkoutLog(log: InsertWorkoutLog): Promise<WorkoutLog> {
        try {
            const [created] = await this.db.insert(workoutLogs).values(log).returning();
            return created;
        } catch (error) {
            logger.error(`[${this.domainName}] Error creating workout log:`, error);
            throw error;
        }
    }

    async listWorkoutLogs(userId: string, limit = 10, offset = 0): Promise<WorkoutLog[]> {
        try {
            return await this.db
                .select()
                .from(workoutLogs)
                .where(eq(workoutLogs.userId, userId))
                .orderBy(desc(workoutLogs.completedAt))
                .limit(limit)
                .offset(offset);
        } catch (error) {
            logger.error(`[${this.domainName}] Error listing workout logs:`, error);
            return [];
        }
    }

    async getAllWorkoutLogs(userId: string): Promise<WorkoutLog[]> {
        try {
            return await this.db
                .select()
                .from(workoutLogs)
                .where(eq(workoutLogs.userId, userId))
                .orderBy(desc(workoutLogs.completedAt));
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting all workout logs:`, error);
            return [];
        }
    }

    async deleteWorkoutLog(userId: string, logId: string): Promise<boolean> {
        try {
            const result = await this.db
                .delete(workoutLogs)
                .where(and(eq(workoutLogs.id, logId), eq(workoutLogs.userId, userId)));
            return (result.rowCount ?? 0) > 0;
        } catch (error) {
            logger.error(`[${this.domainName}] Error deleting workout log:`, error);
            return false;
        }
    }

    // ==================== Workout Preferences ====================

    async getWorkoutPreferences(userId: string): Promise<WorkoutPreferences | undefined> {
        try {
            const [prefs] = await this.db
                .select()
                .from(workoutPreferences)
                .where(eq(workoutPreferences.userId, userId));
            return prefs || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting workout preferences:`, error);
            return undefined;
        }
    }

    async updateWorkoutPreferences(userId: string, updates: Partial<InsertWorkoutPreferences>): Promise<WorkoutPreferences> {
        try {
            const { userId: _, ...realUpdates } = updates as any;
            const existing = await this.getWorkoutPreferences(userId);
            if (existing) {
                const [updated] = await this.db
                    .update(workoutPreferences)
                    .set({ ...realUpdates, updatedAt: new Date() } as any)
                    .where(eq(workoutPreferences.userId, userId))
                    .returning();
                return updated;
            } else {
                const [created] = await this.db
                    .insert(workoutPreferences)
                    .values({ userId, ...realUpdates })
                    .returning();
                return created;
            }
        } catch (error) {
            logger.error(`[${this.domainName}] Error updating workout preferences:`, error);
            throw error;
        }
    }

    // ==================== Grocery Lists ====================

    async createGroceryList(list: InsertGroceryList): Promise<GroceryList> {
        try {
            const [created] = await this.db.insert(groceryLists).values(list).returning();
            return created;
        } catch (error) {
            logger.error(`[${this.domainName}] Error creating grocery list:`, error);
            throw error;
        }
    }

    async getGroceryList(id: string): Promise<GroceryList | undefined> {
        try {
            const [list] = await this.db
                .select()
                .from(groceryLists)
                .where(eq(groceryLists.id, id));
            return list || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting grocery list:`, error);
            return undefined;
        }
    }

    async getActiveGroceryList(userId: string): Promise<GroceryList | undefined> {
        try {
            const [list] = await this.db
                .select()
                .from(groceryLists)
                .where(and(
                    eq(groceryLists.userId, userId),
                    eq(groceryLists.isArchived, false)
                ))
                .orderBy(desc(groceryLists.generatedAt))
                .limit(1);
            return list || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting active grocery list:`, error);
            return undefined;
        }
    }

    async updateGroceryList(id: string, updates: Partial<InsertGroceryList>): Promise<GroceryList | undefined> {
        try {
            const [updated] = await this.db
                .update(groceryLists)
                .set(updates)
                .where(eq(groceryLists.id, id))
                .returning();
            return updated || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error updating grocery list:`, error);
            return undefined;
        }
    }

    // ==================== Exercise Records ====================

    async getExerciseRecord(userId: string, exerciseName: string): Promise<ExerciseRecord | undefined> {
        try {
            const [record] = await this.db
                .select()
                .from(exerciseRecords)
                .where(and(
                    eq(exerciseRecords.userId, userId),
                    eq(exerciseRecords.exerciseName, exerciseName)
                ));
            return record || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting exercise record:`, error);
            return undefined;
        }
    }

    async getExerciseRecords(userId: string): Promise<ExerciseRecord[]> {
        try {
            return await this.db
                .select()
                .from(exerciseRecords)
                .where(eq(exerciseRecords.userId, userId))
                .orderBy(desc(exerciseRecords.updatedAt));
        } catch (error) {
            logger.error(`[${this.domainName}] Error listing exercise records:`, error);
            return [];
        }
    }

    async getTrackedPRs(userId: string): Promise<ExerciseRecord[]> {
        try {
            return await this.db
                .select()
                .from(exerciseRecords)
                .where(and(
                    eq(exerciseRecords.userId, userId),
                    eq(exerciseRecords.isPrTracked, true)
                ))
                .orderBy(desc(exerciseRecords.prWeight));
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting tracked PRs:`, error);
            return [];
        }
    }

    async upsertExerciseRecord(userId: string, exerciseName: string, data: {
        oneRepMax?: number;
        prWeight?: number;
        prReps?: number;
        isPrTracked?: boolean;
        lastWeight?: number;
        lastReps?: number;
        notes?: string;
    }): Promise<ExerciseRecord> {
        try {
            const existing = await this.getExerciseRecord(userId, exerciseName);

            if (existing) {
                const updates: any = {
                    ...data,
                    updatedAt: new Date()
                };
                if (data.lastWeight !== undefined) updates.lastLoggedAt = new Date();

                const [updated] = await this.db
                    .update(exerciseRecords)
                    .set(updates)
                    .where(eq(exerciseRecords.id, existing.id))
                    .returning();
                return updated;
            } else {
                const payload: any = {
                    userId,
                    exerciseName,
                    ...data
                };
                if (data.lastWeight !== undefined) payload.lastLoggedAt = new Date();

                const [created] = await this.db
                    .insert(exerciseRecords)
                    .values(payload)
                    .returning();
                return created;
            }
        } catch (error) {
            logger.error(`[${this.domainName}] Error upserting exercise record:`, error);
            throw error;
        }
    }

    async deleteExercisePR(userId: string, exerciseName: string): Promise<boolean> {
        try {
            const [existing] = await this.db
                .select()
                .from(exerciseRecords)
                .where(and(eq(exerciseRecords.userId, userId), eq(exerciseRecords.exerciseName, exerciseName)));

            if (!existing) return false;

            const result = await this.db
                .update(exerciseRecords)
                .set({
                    isPrTracked: false,
                    prWeight: null,
                    prReps: null,
                    updatedAt: new Date()
                })
                .where(eq(exerciseRecords.id, existing.id));

            return (result.rowCount ?? 0) > 0;
        } catch (error) {
            logger.error(`[${this.domainName}] Error deleting exercise PR:`, error);
            return false;
        }
    }

    // ==================== User Streaks ====================

    async getUserStreak(userId: string, streakType: string): Promise<UserStreak | undefined> {
        try {
            const [streak] = await this.db
                .select()
                .from(userStreaks)
                .where(and(
                    eq(userStreaks.userId, userId),
                    eq(userStreaks.streakType, streakType)
                ));
            return streak || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting user streak:`, error);
            return undefined;
        }
    }

    async updateUserStreak(userId: string, logDate: Date): Promise<void> {
        // Logic for updating streaks (kept simple here, matching storage.ts complexity if needed)
        // Ref: storage.ts around Line 3180
        try {
            // Potentially complex logic here. For now, we'll keep the placeholder logic
            // and refine it if specific streak behavior is required.
        } catch (error) {
            logger.error(`[${this.domainName}] Error updating user streak:`, error);
        }
    }

    async updateAllStreaks(userId: string, logDate: Date): Promise<void> {
        // Logic for updating all category streaks
    }

    // ==================== Meal Plans & Recipes ====================

    async createMealPlan(plan: InsertMealPlan): Promise<MealPlan> {
        try {
            const [created] = await this.db.insert(mealPlans).values(plan).returning();
            return created;
        } catch (error) {
            logger.error(`[${this.domainName}] Error creating meal plan:`, error);
            throw error;
        }
    }

    async getActiveMealPlan(userId: string): Promise<MealPlan | undefined> {
        try {
            const [plan] = await this.db
                .select()
                .from(mealPlans)
                .where(and(eq(mealPlans.userId, userId), eq(mealPlans.isActive, true)))
                .limit(1);
            return plan || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting active meal plan:`, error);
            return undefined;
        }
    }

    async getMealPlan(id: string): Promise<MealPlan | undefined> {
        try {
            const [plan] = await this.db
                .select()
                .from(mealPlans)
                .where(eq(mealPlans.id, id));
            return plan || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting meal plan:`, error);
            return undefined;
        }
    }

    async createRecipe(recipe: InsertRecipe): Promise<Recipe> {
        try {
            const [created] = await this.db.insert(recipes).values(recipe).returning();
            return created;
        } catch (error) {
            logger.error(`[${this.domainName}] Error creating recipe:`, error);
            throw error;
        }
    }

    async getRecipe(id: string): Promise<Recipe | undefined> {
        try {
            const [recipe] = await this.db
                .select()
                .from(recipes)
                .where(eq(recipes.id, id));
            return recipe || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting recipe:`, error);
            return undefined;
        }
    }

    // ==================== Tracking & SMS Preferences ====================

    async getTrackingPreferences(userId: string): Promise<TrackingPreferences | undefined> {
        try {
            const [prefs] = await this.db
                .select()
                .from(trackingPreferences)
                .where(eq(trackingPreferences.userId, userId));
            return prefs || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting tracking preferences:`, error);
            return undefined;
        }
    }

    async upsertTrackingPreferences(userId: string, prefs: Partial<InsertTrackingPreferences>): Promise<TrackingPreferences> {
        try {
            const existing = await this.getTrackingPreferences(userId);

            if (existing) {
                const [updated] = await this.db
                    .update(trackingPreferences)
                    .set({ ...prefs, updatedAt: new Date() } as any)
                    .where(eq(trackingPreferences.id, existing.id))
                    .returning();
                return updated;
            }

            const [created] = await this.db
                .insert(trackingPreferences)
                .values({ ...prefs, userId } as any)
                .returning();
            return created;
        } catch (error) {
            logger.error(`[${this.domainName}] Error upserting tracking preferences:`, error);
            throw error;
        }
    }

    async getOptimizeSmsPreferences(userId: string): Promise<OptimizeSmsPreferences | undefined> {
        try {
            const [prefs] = await this.db
                .select()
                .from(optimizeSmsPreferences)
                .where(eq(optimizeSmsPreferences.userId, userId));
            return prefs || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting SMS preferences:`, error);
            return undefined;
        }
    }

    async createOrUpdateOptimizeSmsPreferences(userId: string, prefs: Partial<InsertOptimizeSmsPreferences>): Promise<OptimizeSmsPreferences> {
        try {
            const existing = await this.getOptimizeSmsPreferences(userId);

            if (existing) {
                const [updated] = await this.db
                    .update(optimizeSmsPreferences)
                    .set({ ...prefs, updatedAt: new Date() } as any)
                    .where(eq(optimizeSmsPreferences.id, existing.id))
                    .returning();
                return updated;
            } else {
                const [created] = await this.db
                    .insert(optimizeSmsPreferences)
                    .values({ ...prefs, userId } as any)
                    .returning();
                return created;
            }
        } catch (error) {
            logger.error(`[${this.domainName}] Error creating/updating SMS preferences:`, error);
            throw error;
        }
    }
}
