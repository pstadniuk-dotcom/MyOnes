import { db } from '../../infra/db/db';
import {
    userStreaks, dailyCompletions, trackingPreferences,
    type UserStreak, type DailyCompletion, type TrackingPreferences
} from '@shared/schema';
import { eq, and, gte, desc } from 'drizzle-orm';

export class DashboardRepository {
    async getTrackingPreferences(userId: string): Promise<TrackingPreferences | undefined> {
        const [prefs] = await db.select().from(trackingPreferences).where(eq(trackingPreferences.userId, userId));
        return prefs || undefined;
    }

    async getAllUserStreaks(userId: string): Promise<UserStreak[]> {
        return await db.select().from(userStreaks).where(eq(userStreaks.userId, userId));
    }

    async getDailyCompletion(userId: string, date: Date): Promise<DailyCompletion | undefined> {
        const dateStr = date.toISOString().split('T')[0];
        const [completion] = await db
            .select()
            .from(dailyCompletions)
            .where(and(
                eq(dailyCompletions.userId, userId),
                eq(dailyCompletions.logDate, dateStr)
            ));
        return completion || undefined;
    }

    async getStreakSummary(userId: string): Promise<{
        overall: { current: number; longest: number };
        nutrition: { current: number; longest: number };
        workout: { current: number; longest: number };
        supplements: { current: number; longest: number };
        lifestyle: { current: number; longest: number };
        todayScores: {
            nutrition: number | null;
            workout: number | null;
            supplements: number | null;
            lifestyle: number | null;
            overall: number;
        } | null;
        weeklyProgress: Array<{
            date: string;
            nutritionScore: number | null;
            workoutScore: number | null;
            supplementScore: number | null;
            lifestyleScore: number | null;
            dailyScore: number | null;
        }>;
        isPaused?: boolean;
    }> {
        const prefs = await this.getTrackingPreferences(userId);

        // Check if tracking is paused
        const isPaused = prefs?.pauseUntil ? new Date(prefs.pauseUntil) > new Date() : false;

        const enabled = {
            nutrition: prefs?.trackNutrition !== false,
            workout: prefs?.trackWorkouts !== false,
            supplements: prefs?.trackSupplements !== false,
            lifestyle: prefs?.trackLifestyle !== false,
        };

        const streaks = await this.getAllUserStreaks(userId);

        const defaultStreak = { current: 0, longest: 0 };
        const streakMap: { [key: string]: { current: number; longest: number } } = {};
        for (const s of streaks) {
            streakMap[s.streakType] = { current: s.currentStreak, longest: s.longestStreak };
        }

        const today = new Date();
        const todayCompletion = await this.getDailyCompletion(userId, today);

        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const weeklyCompletions = await db
            .select()
            .from(dailyCompletions)
            .where(and(
                eq(dailyCompletions.userId, userId),
                gte(dailyCompletions.logDate, weekAgo.toISOString().split('T')[0])
            ))
            .orderBy(dailyCompletions.logDate);

        return {
            overall: streakMap['overall'] || defaultStreak,
            nutrition: enabled.nutrition ? (streakMap['nutrition'] || defaultStreak) : defaultStreak,
            workout: enabled.workout ? (streakMap['workout'] || defaultStreak) : defaultStreak,
            supplements: enabled.supplements ? (streakMap['supplements'] || defaultStreak) : defaultStreak,
            lifestyle: enabled.lifestyle ? (streakMap['lifestyle'] || defaultStreak) : defaultStreak,
            todayScores: isPaused ? null : (todayCompletion ? {
                nutrition: enabled.nutrition ? parseFloat(todayCompletion.nutritionScore || '0') : null,
                workout: enabled.workout && todayCompletion.workoutScore ? parseFloat(todayCompletion.workoutScore) : null,
                supplements: enabled.supplements ? parseFloat(todayCompletion.supplementScore || '0') : null,
                lifestyle: enabled.lifestyle ? parseFloat(todayCompletion.lifestyleScore || '0') : null,
                overall: parseFloat(todayCompletion.dailyScore || '0'),
            } : null),
            weeklyProgress: weeklyCompletions.map(c => ({
                date: c.logDate,
                nutritionScore: enabled.nutrition && c.nutritionScore ? parseFloat(c.nutritionScore) : null,
                workoutScore: enabled.workout && c.workoutScore ? parseFloat(c.workoutScore) : null,
                supplementScore: enabled.supplements && c.supplementScore ? parseFloat(c.supplementScore) : null,
                lifestyleScore: enabled.lifestyle && c.lifestyleScore ? parseFloat(c.lifestyleScore) : null,
                dailyScore: c.dailyScore ? parseFloat(c.dailyScore) : null,
            })),
            isPaused,
        };
    }
}

export const dashboardRepository = new DashboardRepository();
