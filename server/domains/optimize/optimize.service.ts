
import { OptimizeRepository } from "./optimize.repository";
import {
    OptimizePlan, InsertOptimizePlan,
    OptimizeDailyLog, InsertOptimizeDailyLog,
    GroceryList, InsertGroceryList,
    ExerciseRecord, InsertExerciseRecord,
    UserStreak,
    WorkoutPlan, InsertWorkoutPlan,
    Workout, InsertWorkout,
    WorkoutLog, InsertWorkoutLog,
    WorkoutPreferences, InsertWorkoutPreferences,
    MealPlan, InsertMealPlan,
    Recipe, InsertRecipe,
    TrackingPreferences, InsertTrackingPreferences,
    OptimizeSmsPreferences, InsertOptimizeSmsPreferences
} from "@shared/schema";
import { db } from "../../infrastructure/database/db";

export class OptimizeService {
    private repository: OptimizeRepository;

    constructor() {
        this.repository = new OptimizeRepository(db);
    }

    // Optimize Plans
    async createOptimizePlan(plan: InsertOptimizePlan): Promise<OptimizePlan> {
        return this.repository.createOptimizePlan(plan);
    }

    async getOptimizePlan(id: string): Promise<OptimizePlan | undefined> {
        return this.repository.getOptimizePlan(id);
    }

    async getActiveOptimizePlan(userId: string, planType: 'nutrition' | 'workout' | 'lifestyle'): Promise<OptimizePlan | undefined> {
        return this.repository.getActiveOptimizePlan(userId, planType);
    }

    async getOptimizePlans(userId: string): Promise<OptimizePlan[]> {
        return this.repository.getOptimizePlans(userId);
    }

    async updateOptimizePlan(id: string, updates: Partial<InsertOptimizePlan>): Promise<OptimizePlan | undefined> {
        return this.repository.updateOptimizePlan(id, updates);
    }

    // Daily Logs
    async createDailyLog(log: InsertOptimizeDailyLog): Promise<OptimizeDailyLog> {
        return this.repository.createDailyLog(log);
    }

    async getDailyLog(userId: string, date: Date): Promise<OptimizeDailyLog | undefined> {
        return this.repository.getDailyLog(userId, date);
    }

    async listDailyLogs(userId: string, startDate: Date, endDate: Date): Promise<OptimizeDailyLog[]> {
        return this.repository.listDailyLogs(userId, startDate, endDate);
    }

    async updateDailyLog(id: string, updates: Partial<InsertOptimizeDailyLog>): Promise<OptimizeDailyLog | undefined> {
        return this.repository.updateDailyLog(id, updates);
    }

    // Workout Plans & Workouts
    async createWorkoutPlan(plan: InsertWorkoutPlan): Promise<WorkoutPlan> {
        return this.repository.createWorkoutPlan(plan);
    }

    async getActiveWorkoutPlan(userId: string): Promise<WorkoutPlan | undefined> {
        return this.repository.getActiveWorkoutPlan(userId);
    }

    async getWorkoutPlan(id: string): Promise<WorkoutPlan | undefined> {
        return this.repository.getWorkoutPlan(id);
    }

    async createWorkout(workout: InsertWorkout): Promise<Workout> {
        return this.repository.createWorkout(workout);
    }

    async getWorkout(id: string): Promise<Workout | undefined> {
        return this.repository.getWorkout(id);
    }

    // Workout Logs
    async createWorkoutLog(log: InsertWorkoutLog): Promise<WorkoutLog> {
        return this.repository.createWorkoutLog(log);
    }

    async listWorkoutLogs(userId: string, limit = 10, offset = 0): Promise<WorkoutLog[]> {
        return this.repository.listWorkoutLogs(userId, limit, offset);
    }

    async getAllWorkoutLogs(userId: string): Promise<WorkoutLog[]> {
        return this.repository.getAllWorkoutLogs(userId);
    }

    async deleteWorkoutLog(userId: string, logId: string): Promise<boolean> {
        return this.repository.deleteWorkoutLog(userId, logId);
    }

    // Workout Preferences
    async getWorkoutPreferences(userId: string): Promise<WorkoutPreferences | undefined> {
        return this.repository.getWorkoutPreferences(userId);
    }

    async updateWorkoutPreferences(userId: string, updates: Partial<InsertWorkoutPreferences>): Promise<WorkoutPreferences> {
        return this.repository.updateWorkoutPreferences(userId, updates);
    }

    // Grocery Lists
    async createGroceryList(list: InsertGroceryList): Promise<GroceryList> {
        return this.repository.createGroceryList(list);
    }

    async getGroceryList(id: string): Promise<GroceryList | undefined> {
        return this.repository.getGroceryList(id);
    }

    async getActiveGroceryList(userId: string): Promise<GroceryList | undefined> {
        return this.repository.getActiveGroceryList(userId);
    }

    async updateGroceryList(id: string, updates: Partial<InsertGroceryList>): Promise<GroceryList | undefined> {
        return this.repository.updateGroceryList(id, updates);
    }

    // Exercise Records
    async getExerciseRecord(userId: string, exerciseName: string): Promise<ExerciseRecord | undefined> {
        return this.repository.getExerciseRecord(userId, exerciseName);
    }

    async getExerciseRecords(userId: string): Promise<ExerciseRecord[]> {
        return this.repository.getExerciseRecords(userId);
    }

    async getTrackedPRs(userId: string): Promise<ExerciseRecord[]> {
        return this.repository.getTrackedPRs(userId);
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
        return this.repository.upsertExerciseRecord(userId, exerciseName, data);
    }

    async deleteExercisePR(userId: string, exerciseName: string): Promise<boolean> {
        return this.repository.deleteExercisePR(userId, exerciseName);
    }

    // Streaks
    async getUserStreak(userId: string, streakType: string): Promise<UserStreak | undefined> {
        return this.repository.getUserStreak(userId, streakType);
    }

    async updateAllStreaks(userId: string, logDate: Date): Promise<void> {
        return this.repository.updateAllStreaks(userId, logDate);
    }

    // Meal Plans & Recipes
    async createMealPlan(plan: InsertMealPlan): Promise<MealPlan> {
        return this.repository.createMealPlan(plan);
    }

    async getActiveMealPlan(userId: string): Promise<MealPlan | undefined> {
        return this.repository.getActiveMealPlan(userId);
    }

    async getMealPlan(id: string): Promise<MealPlan | undefined> {
        return this.repository.getMealPlan(id);
    }

    async createRecipe(recipe: InsertRecipe): Promise<Recipe> {
        return this.repository.createRecipe(recipe);
    }

    async getRecipe(id: string): Promise<Recipe | undefined> {
        return this.repository.getRecipe(id);
    }

    // Preferences
    async getTrackingPreferences(userId: string): Promise<TrackingPreferences | undefined> {
        return this.repository.getTrackingPreferences(userId);
    }

    async upsertTrackingPreferences(userId: string, prefs: Partial<InsertTrackingPreferences>): Promise<TrackingPreferences> {
        return this.repository.upsertTrackingPreferences(userId, prefs);
    }

    async getOptimizeSmsPreferences(userId: string): Promise<OptimizeSmsPreferences | undefined> {
        return this.repository.getOptimizeSmsPreferences(userId);
    }

    async createOrUpdateOptimizeSmsPreferences(userId: string, prefs: Partial<InsertOptimizeSmsPreferences>): Promise<OptimizeSmsPreferences> {
        return this.repository.createOrUpdateOptimizeSmsPreferences(userId, prefs);
    }
}

export const optimizeService = new OptimizeService();
