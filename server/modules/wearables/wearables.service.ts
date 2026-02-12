import { wearablesRepository } from './wearables.repository';
import logger from '../../infra/logging/logger';
import {
    getOrCreateJunctionUser,
    generateLinkToken,
    getConnectedProviders,
    disconnectProvider,
    getSleepData,
    getActivityData,
    getBodyData,
    getWorkoutData,
    PROVIDER_MAP,
    PROVIDER_DISPLAY_NAMES,
} from '../../junction';

export class WearablesService {
    async getConnections(userId: string) {
        const junctionUserId = await wearablesRepository.getJunctionUserId(userId);
        if (!junctionUserId) {
            return [];
        }

        const providers = await getConnectedProviders(junctionUserId);

        return providers.map((p: any) => ({
            id: `${junctionUserId}_${p.slug}`,
            userId,
            provider: PROVIDER_MAP[p.slug] || p.slug,
            providerName: PROVIDER_DISPLAY_NAMES[PROVIDER_MAP[p.slug]] || p.name,
            status: p.status === 'connected' ? 'connected' : 'disconnected',
            connectedAt: p.connectedAt || new Date().toISOString(),
            lastSyncedAt: p.lastSyncAt || null,
            source: 'junction',
        }));
    }

    async getConnectLink(userId: string) {
        let junctionUserId = await wearablesRepository.getJunctionUserId(userId);

        if (!junctionUserId) {
            junctionUserId = await getOrCreateJunctionUser(userId, null);
            await wearablesRepository.updateJunctionUserId(userId, junctionUserId);
            logger.info('Created and saved Junction user ID', { userId, junctionUserId });
        }

        const { linkToken, linkWebUrl } = await generateLinkToken(junctionUserId);

        return {
            linkUrl: linkWebUrl,
            linkToken,
        };
    }

    async disconnectDevice(userId: string, connectionId: string) {
        const actualJunctionUserId = await wearablesRepository.getJunctionUserId(userId);
        if (!actualJunctionUserId) {
            throw new Error('Not authorized to disconnect this device');
        }

        if (!connectionId.startsWith(actualJunctionUserId + '_')) {
            throw new Error('Not authorized to disconnect this device');
        }

        const providerSlug = connectionId.substring(actualJunctionUserId.length + 1);
        if (!providerSlug) {
            throw new Error('Invalid connection ID');
        }

        await disconnectProvider(actualJunctionUserId, providerSlug);
    }

    async getBiometricData(userId: string, startDate: string, endDate: string, provider?: string) {
        const junctionUserId = await wearablesRepository.getJunctionUserId(userId);
        if (!junctionUserId) {
            return { data: [] };
        }

        const [sleepData, activityData, bodyData] = await Promise.all([
            getSleepData(junctionUserId, startDate, endDate).catch(() => []),
            getActivityData(junctionUserId, startDate, endDate).catch(() => []),
            getBodyData(junctionUserId, startDate, endDate).catch(() => []),
        ]);

        const dataByDate = new Map<string, any>();

        // Process sleep data
        sleepData.forEach((sleep: any) => {
            const dateKey = sleep.calendarDate || sleep.date?.split('T')[0];
            if (!dateKey) return;

            if (!dataByDate.has(dateKey)) {
                dataByDate.set(dateKey, { date: dateKey, provider: sleep.source?.slug });
            }
            const entry = dataByDate.get(dateKey);
            entry.sleep = {
                score: sleep.sleepScore,
                totalMinutes: sleep.duration ? Math.round(sleep.duration / 60) : null,
                deepSleepMinutes: sleep.deep ? Math.round(sleep.deep / 60) : null,
                remSleepMinutes: sleep.rem ? Math.round(sleep.rem / 60) : null,
                lightSleepMinutes: sleep.light ? Math.round(sleep.light / 60) : null,
                efficiency: sleep.efficiency,
            };
        });

        // Process activity data
        activityData.forEach((activity: any) => {
            const dateKey = activity.calendarDate || activity.date?.split('T')[0];
            if (!dateKey) return;

            if (!dataByDate.has(dateKey)) {
                dataByDate.set(dateKey, { date: dateKey, provider: activity.source?.slug });
            }
            const entry = dataByDate.get(dateKey);
            entry.activity = {
                steps: activity.steps,
                caloriesBurned: activity.caloriesTotal || activity.caloriesActive,
                activeMinutes: activity.activeMinutes || activity.moderateMinutes,
                distance: activity.distance,
                floorsClimbed: activity.floors,
            };
        });

        // Process body data
        bodyData.forEach((body: any) => {
            const dateKey = body.calendarDate || body.date?.split('T')[0];
            if (!dateKey) return;

            if (!dataByDate.has(dateKey)) {
                dataByDate.set(dateKey, { date: dateKey, provider: body.source?.slug });
            }
            const entry = dataByDate.get(dateKey);
            entry.heart = {
                hrvMs: body.hrv?.avgHrv || body.hrvAvg,
                restingRate: body.heartRate?.restingHr || body.restingHeartRate,
                averageRate: body.heartRate?.avgHr,
                maxRate: body.heartRate?.maxHr,
            };
            entry.body = {
                weight: body.weight,
                bodyFat: body.bodyFatPercentage,
                temperature: body.temperature,
                spo2: body.oxygenSaturation,
                respiratoryRate: body.respiratoryRate,
            };
        });

        let data = Array.from(dataByDate.values());
        if (provider) {
            data = data.filter(d => d.provider === provider);
        }

        data.sort((a, b) => a.date.localeCompare(b.date));
        return { data };
    }

    async getMergedBiometricData(userId: string, startDate: string, endDate: string) {
        const junctionUserId = await wearablesRepository.getJunctionUserId(userId);
        if (!junctionUserId) {
            return { data: [] };
        }

        const [sleepData, activityData, bodyData, workoutData] = await Promise.all([
            getSleepData(junctionUserId, startDate, endDate),
            getActivityData(junctionUserId, startDate, endDate),
            getBodyData(junctionUserId, startDate, endDate),
            getWorkoutData(junctionUserId, startDate, endDate),
        ]);

        const dataByDate = new Map<string, any>();

        const processData = (items: any[], type: string) => {
            for (const item of items) {
                const date = item.calendar_date || item.date || item.timestamp?.split('T')[0];
                if (!date) continue;

                if (!dataByDate.has(date)) {
                    dataByDate.set(date, {
                        date,
                        source: 'junction',
                        sleep: {},
                        activity: {},
                        body: {},
                        workouts: [],
                    });
                }

                const entry = dataByDate.get(date);
                if (type === 'sleep' && item.duration_total_seconds) {
                    entry.sleep = {
                        totalMinutes: Math.round(item.duration_total_seconds / 60),
                        deepMinutes: Math.round((item.duration_deep_sleep_seconds || 0) / 60),
                        remMinutes: Math.round((item.duration_rem_sleep_seconds || 0) / 60),
                        lightMinutes: Math.round((item.duration_light_sleep_seconds || 0) / 60),
                        score: item.sleep_efficiency,
                        hrvMs: item.average_hrv,
                    };
                } else if (type === 'activity') {
                    entry.activity = {
                        steps: item.steps,
                        calories: item.calories_active,
                        distance: item.distance_meters ? Math.round(item.distance_meters) : undefined,
                        activeMinutes: item.active_duration_seconds ? Math.round(item.active_duration_seconds / 60) : undefined,
                    };
                } else if (type === 'body') {
                    entry.body = {
                        weight: item.weight_kg,
                        bodyFat: item.body_fat_percentage,
                    };
                } else if (type === 'workout') {
                    entry.workouts.push({
                        type: item.sport_name || item.title,
                        duration: item.duration_seconds ? Math.round(item.duration_seconds / 60) : undefined,
                        calories: item.calories,
                        distance: item.distance_meters,
                    });
                }
            }
        };

        processData(sleepData, 'sleep');
        processData(activityData, 'activity');
        processData(bodyData, 'body');
        processData(workoutData, 'workout');

        const data = Array.from(dataByDate.values());
        data.sort((a, b) => a.date.localeCompare(b.date));

        return { data };
    }

    async syncData(userId: string) {
        const junctionUserId = await wearablesRepository.getJunctionUserId(userId);
        if (!junctionUserId) {
            throw new Error('No wearables connected');
        }

        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        await Promise.all([
            getSleepData(junctionUserId, startDate, endDate).catch(() => []),
            getActivityData(junctionUserId, startDate, endDate).catch(() => []),
            getBodyData(junctionUserId, startDate, endDate).catch(() => []),
        ]);

        return {
            success: true,
            message: 'Data sync initiated via Junction',
        };
    }

    async getInsights(userId: string, days: number = 30) {
        const junctionUserId = await wearablesRepository.getJunctionUserId(userId);
        if (!junctionUserId) {
            return {
                insights: { sleep: null, heart: null, recovery: null, activity: null },
                message: 'No wearables connected',
            };
        }

        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const [sleepData, activityData, bodyData] = await Promise.all([
            getSleepData(junctionUserId, startDate, endDate).catch(() => []),
            getActivityData(junctionUserId, startDate, endDate).catch(() => []),
            getBodyData(junctionUserId, startDate, endDate).catch(() => []),
        ]);

        if (sleepData.length === 0 && activityData.length === 0 && bodyData.length === 0) {
            return {
                insights: { sleep: null, heart: null, recovery: null, activity: null },
                message: 'No data available for insights',
            };
        }

        const sleepDurations = sleepData.map((s: any) => s.duration ? s.duration / 60 : null).filter(Boolean) as number[];
        const sleepScores = sleepData.map((s: any) => s.sleepScore).filter(Boolean) as number[];
        const hrvValues = bodyData.map((b: any) => b.hrv?.avgHrv || b.hrvAvg).filter(Boolean) as number[];
        const restingHRs = bodyData.map((b: any) => b.heartRate?.restingHr || b.restingHeartRate).filter(Boolean) as number[];
        const steps = activityData.map((a: any) => a.steps).filter(Boolean) as number[];

        const insights = {
            sleep: sleepDurations.length > 0 ? {
                averageMinutes: Math.round(sleepDurations.reduce((a, b) => a + b, 0) / sleepDurations.length),
                averageScore: sleepScores.length > 0
                    ? Math.round(sleepScores.reduce((a, b) => a + b, 0) / sleepScores.length)
                    : null,
                trend: this.calculateTrend(sleepDurations),
                qualityTrend: sleepScores.length > 0 ? this.calculateTrend(sleepScores) : null,
            } : null,

            heart: hrvValues.length > 0 || restingHRs.length > 0 ? {
                averageHRV: hrvValues.length > 0
                    ? Math.round(hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length)
                    : null,
                averageRestingHR: restingHRs.length > 0
                    ? Math.round(restingHRs.reduce((a, b) => a + b, 0) / restingHRs.length)
                    : null,
                hrvTrend: hrvValues.length > 0 ? this.calculateTrend(hrvValues) : null,
                restingHRTrend: restingHRs.length > 0 ? this.calculateTrend(restingHRs) : null,
            } : null,

            recovery: null,

            activity: steps.length > 0 ? {
                averageSteps: Math.round(steps.reduce((a, b) => a + b, 0) / steps.length),
                trend: this.calculateTrend(steps),
            } : null,
        };

        return { insights, daysAnalyzed: days };
    }

    async getHistoricalData(userId: string, days: number = 90) {
        const junctionUserId = await wearablesRepository.getJunctionUserId(userId);
        if (!junctionUserId) {
            return {
                success: false,
                error: 'No wearable connected',
                data: null,
            };
        }

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];

        const [sleepData, activityData, bodyData, workoutData] = await Promise.all([
            getSleepData(junctionUserId, startStr, endStr).catch(e => { logger.error('Sleep fetch error:', e); return []; }),
            getActivityData(junctionUserId, startStr, endStr).catch(e => { logger.error('Activity fetch error:', e); return []; }),
            getBodyData(junctionUserId, startStr, endStr).catch(e => { logger.error('Body fetch error:', e); return []; }),
            getWorkoutData(junctionUserId, startStr, endStr).catch(e => { logger.error('Workout fetch error:', e); return []; }),
        ]);

        const historicalData = {
            summary: {
                daysOfData: days,
                dateRange: { start: startStr, end: endStr },
                dataPoints: {
                    sleep: sleepData.length,
                    activity: activityData.length,
                    body: bodyData.length,
                    workouts: workoutData.length,
                },
            },
            sleep: sleepData.map((s: any) => ({
                date: s.calendar_date || s.calendarDate,
                totalMinutes: s.duration_total_seconds ? Math.round(s.duration_total_seconds / 60) : s.duration,
                deepSleepMinutes: s.duration_deep_sleep_seconds ? Math.round(s.duration_deep_sleep_seconds / 60) : s.deepSleep,
                remSleepMinutes: s.duration_rem_sleep_seconds ? Math.round(s.duration_rem_sleep_seconds / 60) : s.remSleep,
                lightSleepMinutes: s.duration_light_sleep_seconds ? Math.round(s.duration_light_sleep_seconds / 60) : s.lightSleep,
                awakeMinutes: s.duration_awake_seconds ? Math.round(s.duration_awake_seconds / 60) : s.awakeTime,
                efficiency: s.sleep_efficiency || s.efficiency,
                score: s.sleep_score || s.score,
                hrv: s.average_hrv || s.hrv?.average,
                restingHR: s.hr_lowest || s.heartRate?.min,
                respiratoryRate: s.respiratory_rate || s.respiratoryRate,
                source: s.source?.slug || 'unknown',
            })),
            activity: activityData.map((a: any) => ({
                date: a.calendar_date || a.calendarDate || a.date?.split('T')[0],
                steps: a.steps,
                caloriesActive: a.calories_active || a.caloriesActive,
                caloriesTotal: a.calories_total || a.caloriesTotal,
                distanceMeters: a.distance_meters || a.distance,
                floorsClimbed: a.floors_climbed || a.floorsClimbed,
                activeMinutes: a.active_duration_seconds ? Math.round(a.active_duration_seconds / 60) : a.activeMinutes,
                sedentaryMinutes: a.sedentary_duration_seconds ? Math.round(a.sedentary_duration_seconds / 60) : a.sedentaryMinutes,
                lowIntensityMinutes: a.low_intensity_duration_seconds ? Math.round(a.low_intensity_duration_seconds / 60) : a.lowIntensity,
                moderateIntensityMinutes: a.moderate_intensity_duration_seconds ? Math.round(a.moderate_intensity_duration_seconds / 60) : a.moderateIntensity,
                highIntensityMinutes: a.high_intensity_duration_seconds ? Math.round(a.high_intensity_duration_seconds / 60) : a.highIntensity,
                avgHeartRate: a.heart_rate?.avg_bpm || a.heartRate?.average,
                maxHeartRate: a.heart_rate?.max_bpm || a.heartRate?.max,
                source: a.source?.slug || 'unknown',
            })),
            body: bodyData.map((b: any) => ({
                date: b.calendar_date || b.calendarDate || b.date?.split('T')[0],
                weight: b.weight_kg || b.weight,
                bodyFat: b.body_fat_percentage || b.bodyFat,
                bmi: b.bmi,
                restingHR: b.hr_resting || b.heartRate?.resting,
                hrvAvg: b.hrv_avg || b.hrv?.average,
                hrvMax: b.hrv_max || b.hrv?.max,
                bloodOxygen: b.blood_oxygen || b.spo2,
                respiratoryRate: b.respiratory_rate || b.respiratoryRate,
                source: b.source?.slug || 'unknown',
            })),
            workouts: workoutData.map((w: any) => ({
                date: w.calendar_date || w.time_start?.split('T')[0],
                type: w.sport?.name || w.title || w.sport_name,
                durationMinutes: w.duration_seconds ? Math.round(w.duration_seconds / 60) : w.duration,
                calories: w.calories,
                distanceMeters: w.distance_meters || w.distance,
                avgHeartRate: w.average_hr || w.heartRate?.average,
                maxHeartRate: w.max_hr || w.heartRate?.max,
                avgSpeed: w.average_speed,
                source: w.source?.slug || 'unknown',
            })),
        };

        const stats = {
            sleep: {
                avgDuration: historicalData.sleep.length > 0
                    ? Math.round(historicalData.sleep.reduce((sum, s) => sum + (s.totalMinutes || 0), 0) / historicalData.sleep.length)
                    : null,
                avgScore: historicalData.sleep.filter(s => s.score).length > 0
                    ? Math.round(historicalData.sleep.filter(s => s.score).reduce((sum, s) => sum + s.score, 0) / historicalData.sleep.filter(s => s.score).length)
                    : null,
                avgHRV: historicalData.sleep.filter(s => s.hrv).length > 0
                    ? Math.round(historicalData.sleep.filter(s => s.hrv).reduce((sum, s) => sum + s.hrv, 0) / historicalData.sleep.filter(s => s.hrv).length)
                    : null,
            },
            activity: {
                avgSteps: historicalData.activity.length > 0
                    ? Math.round(historicalData.activity.reduce((sum, a) => sum + (a.steps || 0), 0) / historicalData.activity.length)
                    : null,
                avgActiveMinutes: historicalData.activity.filter(a => a.activeMinutes).length > 0
                    ? Math.round(historicalData.activity.filter(a => a.activeMinutes).reduce((sum, a) => sum + a.activeMinutes, 0) / historicalData.activity.filter(a => a.activeMinutes).length)
                    : null,
                avgCaloriesActive: historicalData.activity.filter(a => a.caloriesActive).length > 0
                    ? Math.round(historicalData.activity.filter(a => a.caloriesActive).reduce((sum, a) => sum + a.caloriesActive, 0) / historicalData.activity.filter(a => a.caloriesActive).length)
                    : null,
            },
            body: {
                latestWeight: historicalData.body.filter(b => b.weight).slice(-1)[0]?.weight || null,
                avgRestingHR: historicalData.body.filter(b => b.restingHR).length > 0
                    ? Math.round(historicalData.body.filter(b => b.restingHR).reduce((sum, b) => sum + b.restingHR, 0) / historicalData.body.filter(b => b.restingHR).length)
                    : null,
                avgHRV: historicalData.body.filter(b => b.hrvAvg).length > 0
                    ? Math.round(historicalData.body.filter(b => b.hrvAvg).reduce((sum, b) => sum + b.hrvAvg, 0) / historicalData.body.filter(b => b.hrvAvg).length)
                    : null,
            },
            workouts: {
                totalCount: historicalData.workouts.length,
                avgPerWeek: historicalData.workouts.length > 0
                    ? Math.round((historicalData.workouts.length / days) * 7 * 10) / 10
                    : 0,
                avgDuration: historicalData.workouts.length > 0
                    ? Math.round(historicalData.workouts.reduce((sum, w) => sum + (w.durationMinutes || 0), 0) / historicalData.workouts.length)
                    : null,
                mostCommonType: historicalData.workouts.length > 0
                    ? this.getMostCommonWorkoutType(historicalData.workouts)
                    : null,
            },
        };

        return {
            success: true,
            data: historicalData,
            statistics: stats,
        };
    }

    private calculateTrend(values: number[]): 'improving' | 'declining' | 'stable' {
        if (values.length < 3) return 'stable';
        const recent = values.slice(-Math.min(7, Math.floor(values.length / 2)));
        const earlier = values.slice(0, Math.min(7, Math.floor(values.length / 2)));
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
        const change = (recentAvg - earlierAvg) / earlierAvg;
        if (change > 0.05) return 'improving';
        if (change < -0.05) return 'declining';
        return 'stable';
    }

    private getMostCommonWorkoutType(workouts: any[]): string | null {
        const typeCounts: Record<string, number> = {};
        workouts.forEach(w => {
            if (w.type) {
                typeCounts[w.type] = (typeCounts[w.type] || 0) + 1;
            }
        });

        let maxCount = 0;
        let mostCommon = null;
        for (const [type, count] of Object.entries(typeCounts)) {
            if (count > maxCount) {
                maxCount = count;
                mostCommon = type;
            }
        }
        return mostCommon;
    }
}

export const wearablesService = new WearablesService();
