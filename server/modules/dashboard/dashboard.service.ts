import { storage } from '../../storage';
import { dashboardRepository } from './dashboard.repository';
import { chatRepository } from '../chat/chat.repository';
import { filesRepository } from '../files/files.repository';
import { getUserLocalMidnight } from '../../utils/timezone';
import { wearablesRepository } from '../wearables/wearables.repository';
import { optimizeRepository } from '../optimize/optimize.repository';
import { optimizeService } from '../optimize/optimize.service';
import { formulasRepository } from '../formulas/formulas.repository';
import logger from '../../infra/logging/logger';
import { usersRepository } from '../users/users.repository';


export class DashboardService {
    async getMainDashboardData(userId: string) {
        // Fetch all dashboard data in parallel
        const [currentFormula, healthProfile, chatSessions, orders, subscription, labReports] = await Promise.all([
            formulasRepository.getCurrentFormulaByUser(userId),
            usersRepository.getHealthProfile(userId),
            chatRepository.listChatSessionsByUser(userId),
            usersRepository.listOrdersByUser(userId),
            usersRepository.getSubscription(userId),
            filesRepository.listFileUploadsByUser(userId, 'lab_report')
        ]);

        // Calculate metrics
        const totalConsultations = chatSessions.length;
        const recentSessions = chatSessions.slice(0, 3);
        const recentOrders = orders.slice(0, 5);

        const oldestSession = chatSessions.length > 0 ?
            Math.min(...chatSessions.map(s => s.createdAt.getTime())) : Date.now();
        const daysActive = Math.floor((Date.now() - oldestSession) / (1000 * 60 * 60 * 24));

        // Profile Completeness Calculation
        const profileFields = [
            healthProfile?.age, healthProfile?.sex, healthProfile?.weightLbs, healthProfile?.heightCm,
            healthProfile?.bloodPressureSystolic && healthProfile?.bloodPressureDiastolic ? true : null,
            healthProfile?.restingHeartRate, healthProfile?.sleepHoursPerNight,
            healthProfile?.exerciseDaysPerWeek !== null ? true : null,
            healthProfile?.stressLevel, healthProfile?.smokingStatus,
            healthProfile?.alcoholDrinksPerWeek !== null ? true : null,
            (healthProfile?.conditions?.length || 0) > 0 ? true : null,
            (healthProfile?.medications?.length || 0) > 0 ? true : null,
            (healthProfile?.allergies?.length || 0) > 0 ? true : null,
            (labReports?.length || 0) > 0 ? true : null
        ];

        const completedFields = profileFields.filter(f => f !== null && f !== undefined).length;
        const totalFields = profileFields.length;
        const profileCompleteness = Math.round((completedFields / totalFields) * 100);

        // Activity aggregation
        const recentActivity = [
            ...recentOrders.map(o => ({
                id: `order-${o.id}`, type: 'order', title: `Order ${o.status}`,
                description: `Formula v${o.formulaVersion}`, time: o.placedAt.toISOString(), icon: 'Package'
            })),
            ...recentSessions.map(s => ({
                id: `session-${s.id}`, type: 'consultation', title: 'AI Consultation',
                description: `Session ${s.status}`, time: s.createdAt.toISOString(), icon: 'MessageSquare'
            }))
        ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 6);

        return {
            metrics: {
                profileCompleteness,
                completedFields,
                totalFields,
                formulaVersion: currentFormula?.version || 0,
                consultationsSessions: totalConsultations,
                daysActive: Math.max(daysActive, 0),
                nextDelivery: subscription?.renewsAt ? subscription.renewsAt.toISOString() : null
            },
            currentFormula,
            healthProfile,
            recentActivity,
            subscription,
            hasActiveFormula: !!currentFormula,
            isNewUser: !currentFormula && totalConsultations === 0
        };
    }

    async getWellnessDashboardData(userId: string) {
        const user = await storage.getUser(userId);
        const userTimezone = user?.timezone || 'America/New_York';
        const today = getUserLocalMidnight(userTimezone);

        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);

        const [
            workoutPlan, nutritionPlan, lifestylePlan, currentFormula,
            todayLog, weekLogs, monthLogs, workoutLogs, streaks, wearableConnections
        ] = await Promise.all([
            optimizeRepository.getActiveWorkoutPlan(userId),
            optimizeRepository.getActiveOptimizePlan(userId, 'nutrition'),
            optimizeRepository.getActiveOptimizePlan(userId, 'lifestyle'),
            formulasRepository.getCurrentFormulaByUser(userId),
            optimizeRepository.getDailyLog(userId, today, new Date(today.getTime() + 24 * 3600 * 1000)),
            optimizeRepository.listDailyLogs(userId, new Date(today.getTime() - 7 * 24 * 3600 * 1000), today),
            optimizeRepository.listDailyLogs(userId, thirtyDaysAgo, today),
            optimizeRepository.getAllWorkoutLogs(userId),
            optimizeRepository.getAllUserStreaks(userId),
            wearablesRepository.getWearableConnections(userId)
        ]);

        return {
            today: { supplementsTaken: todayLog?.supplementsTaken || false },
            streaks: streaks.map(s => ({ type: s.streakType, current: s.currentStreak || 0 })),
            hasOptimizeSetup: !!(workoutPlan || nutritionPlan || lifestylePlan),
            hasWearableConnected: wearableConnections.length > 0
        };
    }

    async getStreakSummary(userId: string) {
        return await dashboardRepository.getStreakSummary(userId);
    }
}

export const dashboardService = new DashboardService();
