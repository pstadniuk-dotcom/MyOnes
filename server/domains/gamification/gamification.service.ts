
import { GamificationRepository } from "./gamification.repository";
import {
    type InsertUserStreak, type InsertDailyCompletion, type InsertOptimizeDailyLog,
    type InsertWorkoutLog, type InsertMealLog, type InsertWorkoutPlan,
    type InsertWorkout, type InsertExerciseRecord, type InsertWorkoutPreferences,
    type InsertTrackingPreferences, type InsertGroceryList, type InsertOptimizeSmsPreferences,
    type InsertMealPlan
} from "@shared/schema";

export class GamificationService {
    constructor(private gamificationRepository: GamificationRepository) { }

    // --- Streaks & Rewards ---
    async getSmartStreakData(userId: string, timezone?: string) {
        return this.gamificationRepository.getSmartStreakData(userId, timezone);
    }

    async getStreakRewards(userId: string) {
        return this.gamificationRepository.getStreakRewards(userId);
    }

    async applyStreakDiscount(userId: string, orderId: string) {
        return this.gamificationRepository.applyStreakDiscount(userId, orderId);
    }

    async updateStreakStatuses() {
        return this.gamificationRepository.updateStreakStatuses();
    }

    async resetLapsedStreaks() {
        return this.gamificationRepository.resetStreakForLapsedUsers();
    }

    // --- Daily Logs ---
    async getDailyLog(userId: string, date: Date) {
        return this.gamificationRepository.getDailyLog(userId, date);
    }

    async listDailyLogs(userId: string, startDate: Date, endDate: Date) {
        return this.gamificationRepository.listDailyLogs(userId, startDate, endDate);
    }

    async createDailyLog(log: InsertOptimizeDailyLog) {
        return this.gamificationRepository.createDailyLog(log);
    }

    async updateDailyLog(id: string, updates: Partial<InsertOptimizeDailyLog>) {
        return this.gamificationRepository.updateDailyLog(id, updates);
    }

    // --- Daily Completion ---
    async getDailyCompletion(userId: string, date: Date) {
        return this.gamificationRepository.getDailyCompletion(userId, date);
    }

    async upsertDailyCompletion(userId: string, date: Date, updates: Partial<InsertDailyCompletion>) {
        return this.gamificationRepository.upsertDailyCompletion(userId, date, updates);
    }

    async calculateAndSaveDailyScores(userId: string, date: Date) {
        return this.gamificationRepository.calculateAndSaveDailyScores(userId, date);
    }

    // --- Meal Logs ---
    async createMealLog(log: InsertMealLog) {
        return this.gamificationRepository.createMealLog(log);
    }

    async getMealLogs(userId: string, date: Date) {
        return this.gamificationRepository.getMealLogsForDay(userId, date);
    }

    async getMealLogsHistory(userId: string, limit?: number) {
        return this.gamificationRepository.getMealLogsHistory(userId, limit);
    }

    async updateMealLog(id: string, updates: Partial<InsertMealLog>) {
        return this.gamificationRepository.updateMealLog(id, updates);
    }

    async deleteMealLog(userId: string, id: string) {
        return this.gamificationRepository.deleteMealLog(userId, id);
    }

    async getNutritionTotals(userId: string) {
        return this.gamificationRepository.getTodayNutritionTotals(userId);
    }

    // --- Workouts ---
    async getActiveWorkoutPlan(userId: string) {
        return this.gamificationRepository.getActiveWorkoutPlan(userId);
    }

    async createWorkoutPlan(plan: InsertWorkoutPlan) {
        return this.gamificationRepository.createWorkoutPlan(plan);
    }

    async createWorkoutLog(log: InsertWorkoutLog) {
        return this.gamificationRepository.createWorkoutLog(log);
    }

    async listWorkoutLogs(userId: string, limit?: number, offset?: number) {
        return this.gamificationRepository.listWorkoutLogs(userId, limit, offset);
    }

    async getAllWorkoutLogs(userId: string) {
        return this.gamificationRepository.getAllWorkoutLogs(userId);
    }

    async deleteWorkoutLog(userId: string, id: string) {
        return this.gamificationRepository.deleteWorkoutLog(userId, id);
    }

    // --- Exercise Records ---
    async getExerciseRecord(userId: string, exerciseName: string) {
        return this.gamificationRepository.getExerciseRecord(userId, exerciseName);
    }

    async getExerciseRecords(userId: string) {
        return this.gamificationRepository.getExerciseRecords(userId);
    }

    async getTrackedPRs(userId: string) {
        return this.gamificationRepository.getTrackedPRs(userId);
    }

    async upsertExerciseRecord(userId: string, exerciseName: string, data: any) {
        return this.gamificationRepository.upsertExerciseRecord(userId, exerciseName, data);
    }

    async deleteExercisePR(userId: string, exerciseName: string) {
        return this.gamificationRepository.deleteExercisePR(userId, exerciseName);
    }

    // --- Preferences ---
    async getTrackingPreferences(userId: string) {
        return this.gamificationRepository.getTrackingPreferences(userId);
    }

    async upsertTrackingPreferences(userId: string, prefs: Partial<InsertTrackingPreferences>) {
        return this.gamificationRepository.upsertTrackingPreferences(userId, prefs);
    }

    async getWorkoutPreferences(userId: string) {
        return this.gamificationRepository.getWorkoutPreferences(userId);
    }

    async upsertWorkoutPreferences(userId: string, prefs: Partial<InsertWorkoutPreferences>) {
        return this.gamificationRepository.upsertWorkoutPreferences(userId, prefs);
    }

    async getSmsPreferences(userId: string) {
        return this.gamificationRepository.getOptimizeSmsPreferences(userId);
    }

    async upsertSmsPreferences(userId: string, prefs: Partial<InsertOptimizeSmsPreferences>) {
        return this.gamificationRepository.createOrUpdateOptimizeSmsPreferences(userId, prefs);
    }

    // --- Grocery List ---
    async getActiveGroceryList(userId: string) {
        return this.gamificationRepository.getActiveGroceryList(userId);
    }

    async createGroceryList(list: InsertGroceryList) {
        return this.gamificationRepository.createGroceryList(list);
    }

    async updateGroceryList(id: string, updates: Partial<InsertGroceryList>) {
        return this.gamificationRepository.updateGroceryList(id, updates);
    }

    // --- Meal Plans ---
    async getActiveMealPlan(userId: string) {
        return this.gamificationRepository.getActiveMealPlan(userId);
    }

    async createMealPlan(plan: InsertMealPlan) {
        return this.gamificationRepository.createMealPlan(plan);
    }
}
