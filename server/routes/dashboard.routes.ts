
import { Router } from "express";
import { format, differenceInDays, startOfWeek, isSameDay } from "date-fns";
import { requireAuth } from "./middleware";
import { userService } from "../domains/users";
import { healthService } from "../domains/health";
import { formulaService } from "../domains/formulas";
import { optimizeService } from "../domains/optimize/optimize.service";
import { gamificationService } from "../domains/gamification";
import { notificationService } from "../domains/notifications";
import { commerceService } from "../domains/commerce";
import { getUserLocalDateString, toUserLocalDateString, getUserLocalMidnight } from "../utils/timezone";
import { logger } from "../infrastructure/logging/logger";

const router = Router();

// Dashboard aggregation endpoint
router.get("/", requireAuth, async (req, res) => {
    try {
        const userId = req.userId!;

        // Fetch critical data in parallel
        const [
            user,
            healthProfile,
            currentFormula,
            upcomingReviews,
            wearableConnections,
            notifications,
            streakData,
            streakRewards,
            subscription
        ] = await Promise.all([
            userService.getUser(userId),
            healthService.getHealthProfile(userId),
            formulaService.getCurrentFormulaByUser(userId),
            formulaService.getUpcomingReviews(userId, 14),
            healthService.getWearableConnections(userId),
            notificationService.listNotificationsByUser(userId, 5),
            gamificationService.getSmartStreakData(userId),
            gamificationService.getStreakRewards(userId),
            commerceService.getSubscription(userId)
        ]);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Calculate profile completeness
        let profileCompleteness = 0;
        const completenessChecks = {
            basicInfo: !!(user.name && user.email),
            healthProfile: !!healthProfile,
            formula: !!currentFormula,
            paymentMethod: !!user.stripeCustomerId, // simplified check
            subscription: !!subscription && subscription.status !== 'inactive'
        };

        const totalChecks = Object.keys(completenessChecks).length;
        const completedChecks = Object.values(completenessChecks).filter(Boolean).length;
        profileCompleteness = Math.round((completedChecks / totalChecks) * 100);

        // Build checklist for frontend
        const profileChecklist = [
            { id: 'profile', label: 'Complete Health Profile', completed: completenessChecks.healthProfile, link: '/onboarding' },
            { id: 'formula', label: 'Create Your Formula', completed: completenessChecks.formula, link: '/dashboard/my-formula' },
            { id: 'subscription', label: 'Start Subscription', completed: completenessChecks.subscription, link: '/dashboard/settings' }
        ];

        res.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                subscriptionStatus: subscription?.status || 'inactive',
                tier: user.membershipTier || 'free'
            },
            stats: {
                streak: streakData.currentStreak,
                activeFormulaVersion: currentFormula?.version || 0,
                nextDelivery: user.reorderWindowStart, // Simplified
                tasksDue: upcomingReviews.length
            },
            completeness: {
                percentage: profileCompleteness,
                checklist: profileChecklist
            },
            status: {
                hasFormula: !!currentFormula,
                hasActiveSubscription: subscription?.status === 'active',
                needsReview: upcomingReviews.length > 0,
                unreadNotifications: notifications.filter((n: any) => !n.isRead).length
            },
            widgets: {
                wearables: wearableConnections.length > 0,
                rewards: {
                    tier: streakRewards.discountTier,
                    discount: streakRewards.discountEarned,
                    status: streakRewards.streakStatus
                }
            }
        });

    } catch (error) {
        logger.error("Dashboard data fetch error:", error);
        res.status(500).json({ error: "Failed to load dashboard" });
    }
});

// Wellness Dashboard implementation
router.get("/wellness", requireAuth, async (req, res) => {
    try {
        const userId = req.userId!;

        // Get user timezone
        const user = await userService.getUser(userId);
        const userTimezone = user?.timezone || 'America/New_York';

        // Calculate date ranges respecting timezone
        const today = getUserLocalMidnight(userTimezone);
        const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday start
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);

        // For streaks calculation (last 30 days)
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);

        // Fetch all data in parallel for efficiency
        const [
            workoutPlan,
            nutritionPlan,
            lifestylePlan,
            currentFormula,
            todayLog,
            weekLogs,
            monthLogs,
            workoutLogs,
            streaks,
            wearableConnections
        ] = await Promise.all([
            gamificationService.getActiveWorkoutPlan(userId),
            gamificationService.getActiveMealPlan(userId),
            optimizeService.getActiveOptimizePlan(userId, 'lifestyle'),
            formulaService.getCurrentFormulaByUser(userId),
            gamificationService.getDailyLog(userId, today),
            gamificationService.listDailyLogs(userId, weekStart, todayEnd), // Use todayEnd to include today
            gamificationService.listDailyLogs(userId, thirtyDaysAgo, todayEnd),
            gamificationService.getAllWorkoutLogs(userId),
            Promise.all([
                gamificationService.getSmartStreakData(userId, userTimezone),
            ]),
            healthService.getWearableConnections(userId)
        ]);

        const [smartStreakData] = streaks;
        const hasOptimizeSetup = !!(workoutPlan || nutritionPlan || lifestylePlan);
        const hasWearableConnected = wearableConnections.length > 0;

        // ========== TODAY'S PLAN ==========
        const dayOfWeek = today.getDay(); // 0 = Sunday
        const todayDayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];

        // Find today's workout from the plan
        let todayWorkout = null;
        let hasWorkoutToday = false;
        const workoutContent = (workoutPlan as any)?.content as { weekPlan?: any[] } | undefined;

        if (workoutContent?.weekPlan) {
            const weekPlan = workoutContent.weekPlan;

            todayWorkout = weekPlan.find((day: any) => {
                const dayName = day.dayName || '';
                return typeof dayName === 'string' &&
                    dayName.toLowerCase() === todayDayName.toLowerCase() &&
                    !day.isRestDay;
            });
            hasWorkoutToday = !!todayWorkout;
        }

        // Check if today's workout was logged (using user's timezone for date comparison)
        const todayDateStr = getUserLocalDateString(userTimezone);
        const todayWorkoutCompleted = workoutLogs.some((log: any) => {
            const logDateStr = toUserLocalDateString(new Date(log.completedAt), userTimezone);
            return logDateStr === todayDateStr;
        });

        // Find today's meals from nutrition plan
        let todaysMeals: { type: string; name: string; calories?: number }[] = [];
        const nutritionContent = (nutritionPlan as any)?.content as any;

        if (nutritionContent?.weekPlan || nutritionContent?.mealPlan) {
            // Logic to extract meals for today
            const map = nutritionContent.mealPlan || (nutritionContent.weekPlan ?
                nutritionContent.weekPlan.find((d: any) => d.dayName?.toLowerCase() === todayDayName.toLowerCase())?.meals
                : null);

            // If map is array (weekPlan style)
            if (Array.isArray(map)) {
                todaysMeals = map.map((meal: any) => ({
                    type: meal.type || meal.mealType || 'meal',
                    name: meal.name || meal.recipe || meal.description || 'Planned meal',
                    calories: meal.calories
                }));
            } else if (map && typeof map === 'object' && !Array.isArray(map)) {
                // Legacy map style { monday: [...], tuesday: [...] }
                const todayMeals = map[todayDayName.toLowerCase()] || [];
                if (Array.isArray(todayMeals)) {
                    todaysMeals = todayMeals.map((meal: any) => ({
                        type: meal.type || meal.mealType || 'meal',
                        name: meal.name || meal.recipe || meal.description || 'Planned meal',
                        calories: meal.calories
                    }));
                }
            }
        }

        // Calculate capsules per dose based on formula
        const totalCapsules = currentFormula ? Math.ceil(currentFormula.totalMg / 750) : 6; // ~750mg per capsule
        const capsulesPerDose = Math.ceil(totalCapsules / 3); // Split into 3 doses

        const todayPlan = {
            supplementsTaken: todayLog?.supplementsTaken || false,
            supplementMorning: todayLog?.supplementMorning || false,
            supplementAfternoon: todayLog?.supplementAfternoon || false,
            supplementEvening: todayLog?.supplementEvening || false,
            supplementDosesTaken: [
                todayLog?.supplementMorning,
                todayLog?.supplementAfternoon,
                todayLog?.supplementEvening
            ].filter(Boolean).length,
            supplementDosesTotal: 3,
            capsulesPerDose,
            totalCapsules,
            formulaName: currentFormula ? `Formula v${currentFormula.version}` : undefined,
            dosageInfo: currentFormula ? `${currentFormula.totalMg}mg daily` : undefined,

            hasWorkoutToday,
            workoutName: todayWorkout?.workout?.name || todayWorkout?.title,
            workoutExerciseCount: todayWorkout?.workout?.exercises?.length || 0,
            workoutDurationMinutes: todayWorkout?.workout?.durationMinutes || 45,
            workoutCompleted: todayWorkoutCompleted,
            isRestDay: todayLog?.isRestDay || false,

            hasMealPlan: !!nutritionPlan,
            mealsPlanned: todaysMeals.length,
            mealsLogged: (todayLog?.mealsLogged as string[]) || [],
            todaysMeals,

            waterIntakeOz: todayLog?.waterIntakeOz || 0,
            waterGoalOz: 100,

            energyLevel: todayLog?.energyLevel,
            moodLevel: todayLog?.moodLevel,
            sleepQuality: todayLog?.sleepQuality
        };

        // ========== WEEKLY PROGRESS ==========
        const weekWorkoutLogs = workoutLogs.filter((log: any) => {
            const logDate = new Date(log.completedAt);
            return logDate >= weekStart && logDate <= todayEnd;
        });

        // Get planned workouts per week from plan
        let plannedWorkoutsPerWeek = 0;
        if (workoutContent?.weekPlan) {
            plannedWorkoutsPerWeek = workoutContent.weekPlan
                .filter((day: any) => !day.isRestDay).length;
        }

        // Count days with nutrition logged this week
        const nutritionDaysLogged = weekLogs.filter(log =>
            log.nutritionCompleted || (log.mealsLogged && (log.mealsLogged as string[]).length > 0)
        ).length;

        // Count days supplements taken this week
        const supplementDaysTaken = weekLogs.filter(log => log.supplementsTaken).length;

        // Days elapsed this week (1-7)
        const daysElapsedThisWeek = Math.min(dayOfWeek === 0 ? 7 : dayOfWeek, 7);

        const weeklyProgress = {
            workouts: {
                completed: weekWorkoutLogs.length,
                total: plannedWorkoutsPerWeek || daysElapsedThisWeek, // fallback if no plan
                percentage: plannedWorkoutsPerWeek > 0
                    ? Math.round((weekWorkoutLogs.length / plannedWorkoutsPerWeek) * 100)
                    : 0
            },
            nutrition: {
                daysLogged: nutritionDaysLogged,
                totalDays: daysElapsedThisWeek,
                percentage: Math.round((nutritionDaysLogged / daysElapsedThisWeek) * 100)
            },
            supplements: {
                daysTaken: supplementDaysTaken,
                totalDays: daysElapsedThisWeek,
                percentage: Math.round((supplementDaysTaken / daysElapsedThisWeek) * 100)
            },
            overallScore: Math.round(
                ((weekWorkoutLogs.length / (plannedWorkoutsPerWeek || 1)) * 40) +
                ((nutritionDaysLogged / daysElapsedThisWeek) * 30) +
                ((supplementDaysTaken / daysElapsedThisWeek) * 30)
            )
        };

        // ========== STREAKS & HEATMAP ==========
        const activityMap: { date: string; level: 0 | 1 | 2 | 3 | 4; activities: string[] }[] = [];

        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateStr = format(date, 'yyyy-MM-dd');

            // Find log for this date
            const dayLog = monthLogs.find(log => {
                const logDate = new Date(log.logDate);
                return format(logDate, 'yyyy-MM-dd') === dateStr;
            });

            // Check if workout was done this day
            const hadWorkout = workoutLogs.some((log: any) => {
                const logDate = new Date(log.completedAt);
                return format(logDate, 'yyyy-MM-dd') === dateStr;
            });

            const activities: string[] = [];
            if (hadWorkout) activities.push('workout');
            if (dayLog?.nutritionCompleted || (dayLog?.mealsLogged as string[])?.length > 0) activities.push('nutrition');
            if (dayLog?.supplementsTaken) activities.push('supplements');

            // Level: 0 = nothing, 1 = 1 activity, 2 = 2 activities, 3 = 3 activities, 4 = all + high ratings
            let level: 0 | 1 | 2 | 3 | 4 = Math.min(activities.length, 3) as 0 | 1 | 2 | 3;
            if (activities.length >= 3 && dayLog?.energyLevel && dayLog.energyLevel >= 4) {
                level = 4;
            }

            activityMap.push({ date: dateStr, level, activities });
        }

        // Use smartStreakData for the breakdown
        const streakData = {
            overall: {
                current: smartStreakData.currentStreak,
                longest: smartStreakData.longestStreak,
                lastLoggedDate: new Date().toISOString()
            },
            workout: {
                current: 0,
                longest: 0
            },
            nutrition: {
                current: 0,
                longest: 0
            },
            activityMap
        };

        // ========== PERSONAL RECORDS ==========
        const personalRecords: { exerciseName: string; weight: number; previousWeight?: number; date: string; isNew: boolean }[] = [];
        const trackedPRs = await gamificationService.getTrackedPRs(userId);
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);

        trackedPRs.forEach((pr: any) => {
            if (pr.prWeight) {
                personalRecords.push({
                    exerciseName: pr.exerciseName,
                    weight: pr.prWeight,
                    previousWeight: pr.lastWeight || undefined,
                    date: pr.prDate?.toISOString() || new Date().toISOString(),
                    isNew: pr.prDate ? new Date(pr.prDate) >= sevenDaysAgo : false
                });
            }
        });

        // ========== INSIGHTS ==========
        const insights: { id: string; type: string; icon: string; message: string; metric?: string; change?: number }[] = [];

        if (smartStreakData.currentStreak >= 7) {
            insights.push({
                id: 'streak-week',
                type: 'streak',
                icon: '🔥',
                message: `${smartStreakData.currentStreak} day streak! Keep the momentum going.`,
                metric: `${smartStreakData.currentStreak} days`
            });
        }

        const newPRs = personalRecords.filter(pr => pr.isNew);
        if (newPRs.length > 0) {
            insights.push({
                id: 'new-pr',
                type: 'achievement',
                icon: '🏆',
                message: `New PR on ${newPRs[0].exerciseName}! ${newPRs[0].weight} lbs`,
                metric: `+${(newPRs[0].weight - (newPRs[0].previousWeight || 0))} lbs`
            });
        }

        const limitedInsights = insights.slice(0, 4);

        res.json({
            today: todayPlan,
            weeklyProgress,
            streaks: streakData,
            personalRecords: personalRecords.slice(0, 10),
            insights: limitedInsights,
            hasOptimizeSetup,
            hasWearableConnected,
            lastUpdated: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Get wellness dashboard error:', error);
        res.status(500).json({ error: 'Failed to fetch wellness data' });
    }
});

export default router;
