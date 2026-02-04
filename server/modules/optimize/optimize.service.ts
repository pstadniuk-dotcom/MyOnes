import OpenAI from 'openai';
import { nanoid } from 'nanoid';
import { startOfWeek, format, differenceInDays, isSameDay } from 'date-fns';
import { optimizeRepository } from './optimize.repository';
import { usersRepository } from '../users/users.repository';
import { storage } from '../../storage';
import {
    buildNutritionPlanPrompt,
    buildWorkoutPlanPrompt,
    buildLifestylePlanPrompt,
    buildRecipePrompt
} from '../../utils/optimize-prompts';
import { parseAiJson } from '../../utils/parseAiJson';
import { normalizePlanContent, DEFAULT_MEAL_TYPES } from '../../utils/optimize-normalizer';
import { getUserLocalMidnight, getUserLocalDateString, toUserLocalDateString } from '../../utils/timezone';
import logger from '../../infra/logging/logger';
import type {
    OptimizeDailyLog,
    InsertOptimizeDailyLog,
    OptimizePlan,
    MealLog,
    WorkoutLog,
    WorkoutPlan,
    DailyCompletion,
    UserStreak
} from '@shared/schema';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export class OptimizeService {
    // Helper to map ingredient to grocery item
    private mapIngredientToItem(value: any) {
        if (!value) return null;
        if (typeof value === 'string') {
            return { id: nanoid(8), item: value, category: 'General', checked: false };
        }
        const itemName = value.item || value.name || value.ingredient;
        if (!itemName) return null;
        return {
            id: nanoid(8),
            item: itemName,
            amount: value.quantity || value.amount || value.qty || undefined,
            unit: value.unit,
            category: value.category || value.type || 'General',
            checked: Boolean(value.checked && value.checked === true),
        };
    }

    // Helper to build grocery items from plan content
    private buildGroceryItemsFromPlanContent(content: any) {
        if (Array.isArray(content?.shoppingList) && content.shoppingList.length > 0) {
            return content.shoppingList
                .map((item: any) => this.mapIngredientToItem(item))
                .filter((item: any) => Boolean(item))
                .map((item: any) => ({ ...item, checked: false }));
        }
        const aggregated = new Map<string, any>();
        const weekPlan = Array.isArray(content?.weekPlan) ? content.weekPlan : [];
        weekPlan.forEach((day: any) => {
            if (!Array.isArray(day?.meals)) return;
            day.meals.forEach((meal: any) => {
                if (!Array.isArray(meal?.ingredients)) return;
                meal.ingredients.forEach((ingredient: any) => {
                    const normalized = this.mapIngredientToItem(ingredient);
                    if (!normalized) return;
                    const key = normalized.item.toLowerCase();
                    if (aggregated.has(key)) return;
                    aggregated.set(key, normalized);
                });
            });
        });
        return Array.from(aggregated.values());
    }

    private buildGroceryListPrompt(mealsText: string): string {
        return `You are a smart nutritionist assistant creating a PRACTICAL grocery shopping list.
Return a JSON object with this structure: { "items": [ { "item": "Eggs", "amount": "1", "unit": "dozen", "category": "Dairy/Eggs" } ] }
Meal Plan: ${mealsText}`;
    }

    // --- Core Service Methods ---

    async getPlans(userId: string) {
        return await optimizeRepository.getOptimizePlans(userId);
    }

    async getStreaks(userId: string) {
        return await optimizeRepository.getAllUserStreaks(userId);
    }

    async generatePlans(userId: string, planTypes: string[], preferences: any) {
        logger.info('🎯 OPTIMIZE PLAN GENERATION STARTED', { userId, planTypes, preferences });
        if (!Array.isArray(planTypes) || planTypes.length === 0) throw new Error('planTypes array is required');

        const user = await usersRepository.getUser(userId);
        if (!user) throw new Error('User not found');

        const healthProfile = await usersRepository.getHealthProfile(userId);
        const activeFormula = await usersRepository.getCurrentFormulaByUser(userId);
        const labAnalyses = await storage.listLabAnalysesByUser(userId);

        const labSummary = labAnalyses.map(analysis => analysis.aiInsights?.summary || '').filter(Boolean).join('\n\n');

        const optimizeContext = {
            user: { id: user.id, name: user.name, email: user.email },
            healthProfile,
            activeFormula,
            labData: labAnalyses.length > 0 ? { reports: labAnalyses, summary: labSummary || 'Lab analyses available.' } : undefined,
            preferences: preferences || {},
        };

        const results: Record<string, any> = {};

        for (const planType of planTypes) {
            let prompt: string;
            switch (planType) {
                case 'nutrition': prompt = buildNutritionPlanPrompt(optimizeContext); break;
                case 'workout': prompt = buildWorkoutPlanPrompt(optimizeContext); break;
                case 'lifestyle': prompt = buildLifestylePlanPrompt(optimizeContext); break;
                default: throw new Error(`Invalid plan type: ${planType}`);
            }

            let systemMessage = `You are a wellness expert. Format your response as valid JSON for a 7-day ${planType} plan.`;

            try {
                const response = await openai.chat.completions.create({
                    model: 'gpt-4o-2024-08-06',
                    messages: [{ role: 'system', content: systemMessage }, { role: 'user', content: prompt }],
                    temperature: 0.7,
                    max_tokens: 16000,
                });

                const content = response.choices[0].message.content || '{}';
                const planContent = parseAiJson(content);
                const normalizedContent = normalizePlanContent(planType as any, planContent);

                const plan = await optimizeRepository.createOptimizePlan({
                    userId,
                    planType: planType as any,
                    content: normalizedContent,
                    aiRationale: planContent.weeklyGuidance || 'Personalized plan generated',
                    preferences: preferences || {},
                    basedOnFormulaId: activeFormula?.id || null,
                    basedOnLabs: labAnalyses.length > 0 ? labAnalyses[0] : null as any,
                    isActive: true,
                });
                results[planType] = plan;
            } catch (e) {
                logger.error(`Error generating ${planType} plan:`, e);
            }
        }

        return results;
    }

    async getDailyLogs(userId: string, start?: string, end?: string) {
        const endDate = end ? new Date(end) : new Date();
        endDate.setHours(23, 59, 59, 999);
        const startDate = start ? new Date(start) : new Date(endDate);
        if (!start) startDate.setDate(endDate.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);

        const logs = await optimizeRepository.listDailyLogs(userId, startDate, endDate);
        const normalizedLogs = logs.map(log => ({ ...log, logDate: new Date(log.logDate).toISOString() }));
        const logsByDate = normalizedLogs.reduce<Record<string, any>>((acc, log) => {
            acc[log.logDate.slice(0, 10)] = log;
            return acc;
        }, {});

        const streaks = await optimizeRepository.getAllUserStreaks(userId);
        return { range: { start: startDate.toISOString(), end: endDate.toISOString() }, logs: normalizedLogs, logsByDate, streaks };
    }

    async logMealCompletion(userId: string, date: string, mealType: string) {
        const logDate = new Date(date);
        const startOfDay = new Date(logDate); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(logDate); endOfDay.setHours(23, 59, 59, 999);

        const existingLog = await optimizeRepository.getDailyLog(userId, startOfDay, endOfDay);
        const mealsLogged = new Set<string>(Array.isArray(existingLog?.mealsLogged) ? (existingLog!.mealsLogged as string[]) : []);
        mealsLogged.add(mealType.toLowerCase());

        const nutritionCompleted = mealsLogged.size >= DEFAULT_MEAL_TYPES.length;
        let updatedLog;
        if (existingLog) {
            updatedLog = await optimizeRepository.updateDailyLog(existingLog.id, { mealsLogged: Array.from(mealsLogged), nutritionCompleted });
        } else {
            updatedLog = await optimizeRepository.createDailyLog({
                userId, logDate, mealsLogged: Array.from(mealsLogged), nutritionCompleted,
                workoutCompleted: false, supplementsTaken: false, isRestDay: false,
                supplementMorning: false, supplementAfternoon: false, supplementEvening: false
            });
        }

        // Trigger score calculation and streak updates
        await this.calculateAndSaveDailyScores(userId, date);
        return updatedLog;
    }

    async calculateAndSaveDailyScores(userId: string, dateStr: string) {
        const logDate = new Date(dateStr);
        const start = new Date(logDate); start.setHours(0, 0, 0, 0);
        const end = new Date(logDate); end.setHours(23, 59, 59, 999);

        const [dailyLog, mealLogs, workoutLogs, workoutPlan] = await Promise.all([
            optimizeRepository.getDailyLog(userId, start, end),
            optimizeRepository.getMealLogsForRange(userId, start, end),
            optimizeRepository.getWorkoutLogsForRange(userId, start, end),
            optimizeRepository.getActiveWorkoutPlan(userId)
        ]);

        const dayName = format(logDate, 'EEEE').toLowerCase();
        const nutritionScore = this.calculateNutritionScore(dailyLog, mealLogs);
        const workoutLog = workoutLogs.length > 0 ? workoutLogs[0] : null;
        const workoutScore = this.calculateWorkoutScore(workoutLog, workoutPlan, dayName);
        const supplementScore = this.calculateSupplementScore(dailyLog);
        const lifestyleScore = this.calculateLifestyleScore(dailyLog);

        // Calculate overall daily score
        let totalItems = 0;
        let totalScore = 0;

        if (nutritionScore !== null) { totalScore += nutritionScore; totalItems++; }
        if (workoutScore !== null) { totalScore += workoutScore; totalItems++; }
        if (supplementScore !== null) { totalScore += supplementScore; totalItems++; }
        if (lifestyleScore !== null) { totalScore += lifestyleScore; totalItems++; }

        const dailyScore = totalItems > 0 ? (totalScore / totalItems) : 0;

        const completionData = {
            userId,
            logDate: dateStr,
            nutritionScore: nutritionScore?.toFixed(2) || '0.00',
            workoutScore: workoutScore?.toFixed(2) || '0.00',
            supplementScore: supplementScore?.toFixed(2) || '0.00',
            lifestyleScore: lifestyleScore?.toFixed(2) || '0.00',
            dailyScore: dailyScore.toFixed(2),
            updatedAt: new Date()
        };

        const existing = await optimizeRepository.getDailyCompletion(userId, dateStr);
        if (existing) {
            await optimizeRepository.updateDailyCompletion(existing.id, completionData as any);
        } else {
            await optimizeRepository.createDailyCompletion(completionData as any);
        }

        // Update category streaks
        await this.updateCategoryStreak(userId, 'nutrition', nutritionScore || 0, logDate);
        if (workoutScore !== null) await this.updateCategoryStreak(userId, 'workout', workoutScore, logDate);
        await this.updateCategoryStreak(userId, 'supplements', supplementScore || 0, logDate);
        await this.updateCategoryStreak(userId, 'lifestyle', lifestyleScore || 0, logDate);
        await this.updateCategoryStreak(userId, 'overall', dailyScore, logDate);

        return completionData;
    }

    private calculateNutritionScore(dailyLog: any, meals: any[]): number {
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

    private calculateWorkoutScore(workoutLog: any, workoutPlan: any, dayOfWeek: string): number | null {
        const schedule = workoutPlan?.content?.weekPlan as any[] | null; // Access content.weekPlan
        const todayPlan = schedule?.find(d => d.day.toLowerCase() === dayOfWeek.toLowerCase());
        if (todayPlan?.isRestDay) return 1.0;
        if (!todayPlan && !workoutLog) return null;
        if (workoutLog?.completedAt) {
            const exercisesCount = (workoutLog.exercisesCompleted as any[])?.length || 0;
            if (exercisesCount >= 6) return 1.0;
            if (exercisesCount >= 4) return 0.75;
            if (exercisesCount >= 2) return 0.50;
            return exercisesCount > 0 ? 0.25 : 0;
        }
        return 0;
    }

    private calculateSupplementScore(dailyLog: any): number {
        if (!dailyLog) return 0;
        let doses = 0;
        if (dailyLog.supplementMorning) doses++;
        if (dailyLog.supplementAfternoon) doses++;
        if (dailyLog.supplementEvening) doses++;
        return Math.round((doses / 3) * 100) / 100;
    }

    private calculateLifestyleScore(dailyLog: any): number {
        if (!dailyLog) return 0.5; // Base score
        let score = 0.5;
        if (dailyLog.sleepHours && dailyLog.sleepHours >= 7) score += 0.25;
        if (dailyLog.mood && ['great', 'good'].includes(dailyLog.mood)) score += 0.15;
        if (dailyLog.stressLevel && dailyLog.stressLevel <= 3) score += 0.10;
        return Math.min(score, 1.0);
    }

    async createWorkoutLog(userId: string, data: any) {
        const log = await optimizeRepository.createWorkoutLog({
            userId,
            workoutId: data.workoutId || null,
            completedAt: new Date(data.completedAt),
            durationActual: data.durationActual || null,
            difficultyRating: data.difficultyRating || null,
            exercisesCompleted: data.exercisesCompleted || [],
            notes: data.notes || null,
        });

        const logDate = new Date(data.completedAt);
        logDate.setHours(0, 0, 0, 0);
        const startOfDay = new Date(logDate); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(logDate); endOfDay.setHours(23, 59, 59, 999);

        const existingDailyLog = await optimizeRepository.getDailyLog(userId, startOfDay, endOfDay);
        if (existingDailyLog) {
            await optimizeRepository.updateDailyLog(existingDailyLog.id, { workoutCompleted: true });
        } else {
            await optimizeRepository.createDailyLog({
                userId, logDate, mealsLogged: [], nutritionCompleted: false, workoutCompleted: true,
                supplementsTaken: false, isRestDay: false,
                supplementMorning: false, supplementAfternoon: false, supplementEvening: false
            });
        }

        await this.updateAllStreaks(userId, logDate);
        return log;
    }

    async saveDailyLog(userId: string, data: any) {
        const logDate = data.date ? new Date(data.date) : new Date();
        const startOfDay = new Date(logDate); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(logDate); endOfDay.setHours(23, 59, 59, 999);

        const existingLog = await optimizeRepository.getDailyLog(userId, startOfDay, endOfDay);
        const updates = { ...data };
        delete updates.date;

        let updatedLog;
        if (existingLog) {
            updatedLog = await optimizeRepository.updateDailyLog(existingLog.id, updates);
        } else {
            updatedLog = await optimizeRepository.createDailyLog({
                userId, logDate, mealsLogged: [], nutritionCompleted: false, workoutCompleted: false,
                supplementsTaken: false, isRestDay: false,
                supplementMorning: false, supplementAfternoon: false, supplementEvening: false,
                ...updates
            });
        }
        await this.updateAllStreaks(userId, logDate);
        return updatedLog;
    }

    async generateRecipe(userId: string, data: any) {
        const { mealName, ingredients, dietaryRestrictions } = data;
        const prompt = buildRecipePrompt(mealName, ingredients || [], dietaryRestrictions || []);
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
        });
        return parseAiJson(completion.choices[0].message.content || '{}');
    }

    async getWorkoutAnalytics(userId: string) {
        const logs = await optimizeRepository.getAllWorkoutLogs(userId);
        const records = await optimizeRepository.getExerciseRecords(userId);

        // Aggregate logic
        const exerciseCounts: Record<string, number> = {};
        const muscleGroupCounts: Record<string, number> = {};
        logs.forEach(log => {
            (log.exercisesCompleted as any[])?.forEach(ex => {
                exerciseCounts[ex.name] = (exerciseCounts[ex.name] || 0) + 1;
                this.identifyMuscleGroup(ex.name).forEach(g => muscleGroupCounts[g] = (muscleGroupCounts[g] || 0) + 1);
            });
        });

        return {
            totalWorkouts: logs.length,
            currentStreak: this.calculateWorkoutStreak(logs),
            muscleGroupBreakdown: Object.entries(muscleGroupCounts).map(([name, count]) => ({ name, count })),
            personalRecords: records.filter(r => r.isPrTracked),
        };
    }

    private identifyMuscleGroup(name: string): string[] {
        const n = name.toLowerCase();
        const g = [];
        if (n.includes('bench') || n.includes('chest')) g.push('Chest');
        if (n.includes('squat') || n.includes('leg')) g.push('Legs');
        if (n.includes('row') || n.includes('back')) g.push('Back');
        return g.length > 0 ? g : ['Other'];
    }

    private calculateWorkoutStreak(logs: WorkoutLog[]): number {
        if (logs.length === 0) return 0;
        const sorted = [...logs].sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
        let streak = 0;
        let current = new Date(); current.setHours(0, 0, 0, 0);
        for (const log of sorted) {
            const logDate = new Date(log.completedAt); logDate.setHours(0, 0, 0, 0);
            const diff = differenceInDays(current, logDate);
            if (diff === 0) continue;
            if (diff === 1) { streak++; current = logDate; } else break;
        }
        return streak;
    }

    async swapMeal(userId: string, data: any) {
        const { planId, dayIndex, mealIndex, mealType } = data;
        const plan = await optimizeRepository.getOptimizePlan(planId);
        if (!plan) throw new Error('Plan not found');
        const content = plan.content as any;
        const meals = content.weekPlan[dayIndex].meals;
        const currentMeal = meals[mealIndex];

        const prompt = `Suggest replacement for ${currentMeal.name} (${mealType})`;
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' }
        });
        const newMeal = JSON.parse(completion.choices[0].message.content || '{}');
        meals[mealIndex] = newMeal;
        return await optimizeRepository.updateOptimizePlan(planId, { content });
    }

    async switchExercise(userId: string, data: any) {
        const { dayIndex, exerciseIndex } = data;
        const plan = await optimizeRepository.getActiveOptimizePlan(userId, 'workout');
        if (!plan) throw new Error('Plan not found');
        const content = plan.content as any;
        const exercises = content.weekPlan[dayIndex].workout.exercises;
        const currentEx = exercises[exerciseIndex];

        const prompt = `Suggest replacement for exercise ${currentEx.name}`;
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' }
        });
        const newEx = JSON.parse(completion.choices[0].message.content || '{}');
        exercises[exerciseIndex] = newEx;
        return await optimizeRepository.updateOptimizePlan(plan.id, { content });
    }

    // --- Re-implementing logic from storage.ts ---

    async updateAllStreaks(userId: string, logDate: Date) {
        const dateStr = logDate.toISOString().split('T')[0];
        const [dailyLog, meals, workoutPlan, workoutLogs] = await Promise.all([
            optimizeRepository.getDailyLog(userId, logDate, logDate), // simplified date lookup for this recreation
            optimizeRepository.getMealLogsForRange(userId, logDate, logDate),
            optimizeRepository.getActiveWorkoutPlan(userId),
            optimizeRepository.getWorkoutLogsForRange(userId, logDate, logDate)
        ]);

        // Simplified scores for now
        const completion = {
            nutritionScore: meals.length >= 3 ? '1.00' : '0.50',
            workoutScore: workoutLogs.length > 0 ? '1.00' : '0.00',
            supplementScore: dailyLog?.supplementsTaken ? '1.00' : '0.00',
            lifestyleScore: '0.80',
            dailyScore: '0.80'
        };

        await optimizeRepository.createDailyCompletion({ userId, logDate: dateStr, ...completion } as any);

        // Update streaks
        const types = ['nutrition', 'workout', 'supplements', 'lifestyle', 'overall'] as const;
        for (const t of types) {
            const score = parseFloat((completion as any)[`${t === 'overall' ? 'daily' : t}Score`]);
            await this.updateCategoryStreak(userId, t, score, logDate);
        }
    }

    private async updateCategoryStreak(userId: string, type: any, score: number, logDate: Date) {
        const streak = await optimizeRepository.getUserStreak(userId, type);
        const dateStr = logDate.toISOString().split('T')[0];
        if (!streak) {
            await optimizeRepository.createStreak({ userId, streakType: type, currentStreak: score >= 0.5 ? 1 : 0, longestStreak: score >= 0.5 ? 1 : 0, lastCompletedDate: score >= 0.5 ? dateStr : null });
        } else {
            const isNew = score >= 0.5;
            const newStreak = isNew ? streak.currentStreak + 1 : 0;
            await optimizeRepository.updateStreak(streak.id, { currentStreak: newStreak, longestStreak: Math.max(newStreak, streak.longestStreak), lastCompletedDate: isNew ? dateStr : streak.lastCompletedDate });
        }
    }

    async getTrackedPRsForUser(userId: string) { return await optimizeRepository.getTrackedPRs(userId); }
    async getExerciseRecordsForUser(userId: string) { return await optimizeRepository.getExerciseRecords(userId); }
    async getExerciseRecordForUser(userId: string, name: string) { return await optimizeRepository.getExerciseRecord(userId, name); }
    async deleteExercisePRForUser(userId: string, name: string) { return await optimizeRepository.deleteExercisePR(userId, name); }
}

export const optimizeService = new OptimizeService();
