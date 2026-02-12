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
            filesRepository.listFileUploadsByUser(userId, 'lab_report') // Get uploaded lab reports
        ]);

        // Calculate metrics
        const totalConsultations = chatSessions.length;
        const recentSessions = chatSessions.slice(0, 3);
        const recentOrders = orders.slice(0, 5);

        // Calculate days since user joined (using oldest chat session or current date)
        const oldestSession = chatSessions.length > 0 ?
            Math.min(...chatSessions.map(s => s.createdAt.getTime())) : Date.now();
        const daysActive = Math.floor((Date.now() - oldestSession) / (1000 * 60 * 60 * 24));

        // Profile Completeness Calculation (0-100%)
        const profileFields = {
            // Demographics (2 fields)
            demographics: [
                healthProfile?.age,
                healthProfile?.sex
            ],
            // Physical measurements (2 fields)
            physical: [
                healthProfile?.weightLbs,
                healthProfile?.heightCm
            ],
            // Vital signs (3 fields)
            vitals: [
                healthProfile?.bloodPressureSystolic && healthProfile?.bloodPressureDiastolic ? true : null,
                healthProfile?.restingHeartRate
            ],
            // Lifestyle factors (5 fields)
            lifestyle: [
                healthProfile?.sleepHoursPerNight,
                healthProfile?.exerciseDaysPerWeek !== null && healthProfile?.exerciseDaysPerWeek !== undefined ? true : null,
                healthProfile?.stressLevel,
                healthProfile?.smokingStatus,
                healthProfile?.alcoholDrinksPerWeek !== null && healthProfile?.alcoholDrinksPerWeek !== undefined ? true : null
            ],
            // Medical history (3 fields - count if arrays have items)
            medical: [
                (healthProfile?.conditions && Array.isArray(healthProfile.conditions) && healthProfile.conditions.length > 0) ? true : null,
                (healthProfile?.medications && Array.isArray(healthProfile.medications) && healthProfile.medications.length > 0) ? true : null,
                (healthProfile?.allergies && Array.isArray(healthProfile.allergies) && healthProfile.allergies.length > 0) ? true : null
            ],
            // Lab reports (1 field)
            labs: [
                labReports && labReports.length > 0 ? true : null
            ]
        };

        // Count completed fields
        const completedFields = Object.values(profileFields)
            .flat()
            .filter(field => field !== null && field !== undefined).length;

        // Total possible fields
        const totalFields = Object.values(profileFields)
            .flat().length;

        // Calculate percentage
        const profileCompleteness = Math.round((completedFields / totalFields) * 100);

        // Determine next action message - prioritized by importance
        let nextAction = 'Complete your profile';
        let nextActionDetail = '';

        // Priority 1: Critical demographics
        if (!healthProfile || (!healthProfile.age && !healthProfile.sex)) {
            nextAction = 'Add age and gender';
            nextActionDetail = 'Required for personalized formula';
        }
        // Priority 2: Lab reports (highly valuable)
        else if (!labReports || labReports.length === 0) {
            nextAction = 'Upload lab results';
            nextActionDetail = 'Blood tests unlock precision';
        }
        // Priority 3: Medications (safety critical)
        else if (!healthProfile.medications || !Array.isArray(healthProfile.medications) || healthProfile.medications.length === 0) {
            nextAction = 'Add medications';
            nextActionDetail = 'Prevent dangerous interactions';
        }
        // Priority 4: Conditions (personalization critical)
        else if (!healthProfile.conditions || !Array.isArray(healthProfile.conditions) || healthProfile.conditions.length === 0) {
            nextAction = 'Add health conditions';
            nextActionDetail = 'Target your specific needs';
        }
        // Priority 5: Physical measurements
        else if (!healthProfile.weightLbs || !healthProfile.heightCm) {
            nextAction = 'Add weight and height';
            nextActionDetail = 'Helps calculate optimal dosages';
        }
        // Priority 6: Vital signs
        else if (!healthProfile.bloodPressureSystolic || !healthProfile.bloodPressureDiastolic) {
            nextAction = 'Add blood pressure';
            nextActionDetail = 'Important for cardiovascular support';
        }
        else if (!healthProfile.restingHeartRate) {
            nextAction = 'Add resting heart rate';
            nextActionDetail = 'Helps assess cardiovascular health';
        }
        // Priority 7: Core lifestyle
        else if (!healthProfile.sleepHoursPerNight) {
            nextAction = 'Add sleep hours';
            nextActionDetail = 'Sleep impacts every formula decision';
        }
        else if (healthProfile.exerciseDaysPerWeek === null || healthProfile.exerciseDaysPerWeek === undefined) {
            nextAction = 'Add exercise frequency';
            nextActionDetail = 'Activity level affects needs';
        }
        // Priority 8: Additional lifestyle
        else if (!healthProfile.stressLevel) {
            nextAction = 'Add stress level';
            nextActionDetail = 'Stress impacts nutrient needs';
        }
        else if (!healthProfile.smokingStatus) {
            nextAction = 'Add smoking status';
            nextActionDetail = 'Affects antioxidant requirements';
        }
        else if (healthProfile.alcoholDrinksPerWeek === null || healthProfile.alcoholDrinksPerWeek === undefined) {
            nextAction = 'Add alcohol intake';
            nextActionDetail = 'Impacts liver and B-vitamin needs';
        }
        // Priority 9: Allergies (safety)
        else if (!healthProfile.allergies || !Array.isArray(healthProfile.allergies) || healthProfile.allergies.length === 0) {
            nextAction = 'Add allergies';
            nextActionDetail = 'Ensure ingredient safety';
        }
        // All complete!
        else {
            nextAction = 'Profile complete';
            nextActionDetail = 'All health data collected';
        }

        // Get recent activity
        const recentActivity: Array<{
            id: string;
            type: string;
            title: string;
            description: string;
            time: string;
            icon: string;
        }> = [];

        // Add recent orders
        recentOrders.slice(0, 3).forEach(order => {
            recentActivity.push({
                id: `order-${order.id}`,
                type: 'order',
                title: `Order ${order.status === 'delivered' ? 'Delivered' : order.status === 'shipped' ? 'Shipped' : 'Placed'}`,
                description: `Formula v${order.formulaVersion} - ${order.status}`,
                time: order.placedAt.toISOString(),
                icon: 'Package'
            });
        });

        // Add recent consultations
        recentSessions.slice(0, 3).forEach(session => {
            recentActivity.push({
                id: `session-${session.id}`,
                type: 'consultation',
                title: 'AI Consultation',
                description: `Session ${session.status}`,
                time: session.createdAt.toISOString(),
                icon: 'MessageSquare'
            });
        });

        // Sort by time and limit
        recentActivity.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

        // Build detailed checklist for profile completion
        const profileChecklist = [
            {
                category: 'Demographics & Physical',
                items: [
                    {
                        label: 'Age and gender',
                        complete: !!(healthProfile?.age && healthProfile?.sex),
                        route: '/dashboard/profile?tab=profile'
                    },
                    {
                        label: 'Weight and height',
                        complete: !!(healthProfile?.weightLbs && healthProfile?.heightCm),
                        route: '/dashboard/profile?tab=profile'
                    }
                ]
            },
            {
                category: 'Vital Signs',
                items: [
                    {
                        label: 'Blood pressure',
                        complete: !!(healthProfile?.bloodPressureSystolic && healthProfile?.bloodPressureDiastolic),
                        route: '/dashboard/profile?tab=health'
                    },
                    {
                        label: 'Resting heart rate',
                        complete: !!healthProfile?.restingHeartRate,
                        route: '/dashboard/profile?tab=health'
                    }
                ]
            },
            {
                category: 'Lifestyle',
                items: [
                    {
                        label: 'Sleep hours per night',
                        complete: !!healthProfile?.sleepHoursPerNight,
                        route: '/dashboard/profile?tab=health'
                    },
                    {
                        label: 'Exercise frequency',
                        complete: healthProfile?.exerciseDaysPerWeek !== null && healthProfile?.exerciseDaysPerWeek !== undefined,
                        route: '/dashboard/profile?tab=health'
                    },
                    {
                        label: 'Stress level',
                        complete: !!healthProfile?.stressLevel,
                        route: '/dashboard/profile?tab=health'
                    },
                    {
                        label: 'Smoking status',
                        complete: !!healthProfile?.smokingStatus,
                        route: '/dashboard/profile?tab=health'
                    },
                    {
                        label: 'Alcohol consumption',
                        complete: healthProfile?.alcoholDrinksPerWeek !== null && healthProfile?.alcoholDrinksPerWeek !== undefined,
                        route: '/dashboard/profile?tab=health'
                    }
                ]
            },
            {
                category: 'Medical History',
                items: [
                    {
                        label: 'Current medications',
                        complete: !!(healthProfile?.medications && Array.isArray(healthProfile.medications) && healthProfile.medications.length > 0),
                        route: '/dashboard/profile?tab=health'
                    },
                    {
                        label: 'Health conditions',
                        complete: !!(healthProfile?.conditions && Array.isArray(healthProfile.conditions) && healthProfile.conditions.length > 0),
                        route: '/dashboard/profile?tab=health'
                    },
                    {
                        label: 'Allergies',
                        complete: !!(healthProfile?.allergies && Array.isArray(healthProfile.allergies) && healthProfile.allergies.length > 0),
                        route: '/dashboard/profile?tab=health'
                    }
                ]
            },
            {
                category: 'Lab Reports',
                items: [
                    {
                        label: 'Blood test results',
                        complete: !!(labReports && labReports.length > 0),
                        route: '/dashboard/lab-reports'
                    }
                ]
            }
        ];

        // Next delivery calculation
        const nextDelivery = subscription?.renewsAt || null;

        const dashboardData = {
            metrics: {
                profileCompleteness,
                completedFields,
                totalFields,
                nextAction,
                nextActionDetail,
                formulaVersion: currentFormula?.version || 0,
                consultationsSessions: totalConsultations,
                daysActive: Math.max(daysActive, 0),
                nextDelivery: nextDelivery ? nextDelivery.toISOString().split('T')[0] : null
            },
            profileChecklist,
            currentFormula,
            healthProfile,
            recentActivity: recentActivity.slice(0, 6),
            subscription,
            hasActiveFormula: !!currentFormula,
            isNewUser: !currentFormula && totalConsultations === 0
        };

        return dashboardData;
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
