import { wearablesRepository } from './wearables.repository';
import { filesRepository } from '../files/files.repository';
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

const PILLAR_META: Record<string, { label: string; description: string }> = {
    sleep: { label: 'Sleep', description: 'Sleep duration, stages & quality' },
    activity: { label: 'Activity', description: 'Steps, calories & active minutes' },
    recovery: { label: 'Recovery', description: 'HRV, heart rate & stress' },
    workouts: { label: 'Workouts', description: 'Exercise sessions & performance' },
    body: { label: 'Body', description: 'Weight, BMI & body composition' },
    glucose: { label: 'Glucose', description: 'Continuous blood sugar monitoring' },
    heart: { label: 'Heart', description: 'Blood pressure & ECG readings' },
    nutrition: { label: 'Nutrition', description: 'Calories, hydration & macros' },
};

// Static map of suggested providers per unlockable pillar
const PILLAR_SUGGESTED: Record<string, { slug: string; name: string; logo?: string }[]> = {
    sleep:    [{ slug: 'oura', name: 'Oura Ring' }, { slug: 'eight_sleep', name: 'Eight Sleep' }, { slug: 'fitbit', name: 'Fitbit' }, { slug: 'whoop_v2', name: 'WHOOP' }, { slug: 'garmin', name: 'Garmin' }, { slug: 'polar', name: 'Polar' }, { slug: 'withings', name: 'Withings' }],
    activity: [{ slug: 'garmin', name: 'Garmin' }, { slug: 'fitbit', name: 'Fitbit' }, { slug: 'google_fit', name: 'Google Fit' }, { slug: 'apple_health_kit', name: 'Apple Health' }, { slug: 'polar', name: 'Polar' }, { slug: 'strava', name: 'Strava' }, { slug: 'whoop_v2', name: 'WHOOP' }, { slug: 'withings', name: 'Withings' }, { slug: 'ultrahuman', name: 'Ultrahuman' }, { slug: 'peloton', name: 'Peloton' }, { slug: 'wahoo', name: 'Wahoo' }, { slug: 'zwift', name: 'Zwift' }, { slug: 'hammerhead', name: 'Hammerhead' }],
    recovery: [{ slug: 'oura', name: 'Oura Ring' }, { slug: 'whoop_v2', name: 'WHOOP' }, { slug: 'garmin', name: 'Garmin' }, { slug: 'fitbit', name: 'Fitbit' }, { slug: 'polar', name: 'Polar' }, { slug: 'apple_health_kit', name: 'Apple Health' }, { slug: 'ultrahuman', name: 'Ultrahuman' }],
    workouts: [{ slug: 'garmin', name: 'Garmin' }, { slug: 'fitbit', name: 'Fitbit' }, { slug: 'strava', name: 'Strava' }, { slug: 'peloton', name: 'Peloton' }, { slug: 'apple_health_kit', name: 'Apple Health' }, { slug: 'polar', name: 'Polar' }, { slug: 'whoop_v2', name: 'WHOOP' }, { slug: 'zwift', name: 'Zwift' }, { slug: 'wahoo', name: 'Wahoo' }, { slug: 'hammerhead', name: 'Hammerhead' }, { slug: 'ultrahuman', name: 'Ultrahuman' }],
    body:     [{ slug: 'withings', name: 'Withings' }, { slug: 'fitbit', name: 'Fitbit' }, { slug: 'oura', name: 'Oura Ring' }, { slug: 'apple_health_kit', name: 'Apple Health' }, { slug: 'garmin', name: 'Garmin' }, { slug: 'polar', name: 'Polar' }, { slug: 'ultrahuman', name: 'Ultrahuman' }],
    glucose:  [{ slug: 'freestyle_libre', name: 'Freestyle Libre' }, { slug: 'dexcom', name: 'Dexcom' }, { slug: 'beurer', name: 'Beurer' }],
    heart:    [{ slug: 'withings', name: 'Withings' }, { slug: 'omron', name: 'Omron' }, { slug: 'kardia', name: 'Kardia' }, { slug: 'beurer', name: 'Beurer' }, { slug: 'garmin', name: 'Garmin' }, { slug: 'apple_health_kit', name: 'Apple Health' }, { slug: 'polar', name: 'Polar' }],
    nutrition:[{ slug: 'cronometer', name: 'Cronometer' }],
};

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

    async getConnectLink(userId: string, provider?: string) {
        let junctionUserId = await wearablesRepository.getJunctionUserId(userId);

        if (!junctionUserId) {
            junctionUserId = await getOrCreateJunctionUser(userId, null);
            await wearablesRepository.updateJunctionUserId(userId, junctionUserId);
            logger.info('Created and saved Junction user ID', { userId, junctionUserId });
        }

        const { linkToken, linkWebUrl } = await generateLinkToken(junctionUserId, provider as any);

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
                // SDK returns duration fields in seconds; duration_total_seconds is legacy snake_case, s.total/s.duration are camelCase SDK fields
                totalMinutes: s.duration_total_seconds
                    ? Math.round(s.duration_total_seconds / 60)
                    : (s.total != null ? Math.round(s.total / 60) : s.duration != null ? Math.round(s.duration / 60) : null),
                deepSleepMinutes: s.duration_deep_sleep_seconds
                    ? Math.round(s.duration_deep_sleep_seconds / 60)
                    : (s.deep != null ? Math.round(s.deep / 60) : null),
                remSleepMinutes: s.duration_rem_sleep_seconds
                    ? Math.round(s.duration_rem_sleep_seconds / 60)
                    : (s.rem != null ? Math.round(s.rem / 60) : null),
                lightSleepMinutes: s.duration_light_sleep_seconds
                    ? Math.round(s.duration_light_sleep_seconds / 60)
                    : (s.light != null ? Math.round(s.light / 60) : null),
                awakeMinutes: s.duration_awake_seconds
                    ? Math.round(s.duration_awake_seconds / 60)
                    : (s.awake != null ? Math.round(s.awake / 60) : null),
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
                // caloriesActive can be negative in Fitbit demo data — clamp to 0
                caloriesActive: Math.max(0, a.calories_active ?? a.caloriesActive ?? 0) || null,
                caloriesTotal: a.calories_total || a.caloriesTotal,
                distanceMeters: a.distance_meters || a.distance,
                floorsClimbed: a.floors_climbed || a.floorsClimbed,
                // SDK exposes intensity buckets as low/medium/high (in minutes); active = medium + high
                activeMinutes: ((a.medium || 0) + (a.high || 0)) || null,
                lowIntensityMinutes: a.low_intensity_duration_seconds ? Math.round(a.low_intensity_duration_seconds / 60) : (a.low ?? null),
                moderateIntensityMinutes: a.moderate_intensity_duration_seconds ? Math.round(a.moderate_intensity_duration_seconds / 60) : (a.medium ?? null),
                highIntensityMinutes: a.high_intensity_duration_seconds ? Math.round(a.high_intensity_duration_seconds / 60) : (a.high ?? null),
                // SDK uses camelCase heartRate.avgBpm / maxBpm
                avgHeartRate: a.heart_rate?.avg_bpm || a.heartRate?.avgBpm,
                maxHeartRate: a.heart_rate?.max_bpm || a.heartRate?.maxBpm,
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
                date: w.calendar_date || w.calendarDate || w.time_start?.split('T')[0] || w.timeStart?.split('T')[0],
                type: w.sport?.name || w.title || w.sport_name,
                // SDK has timeStart/timeEnd (camelCase); compute duration from those when duration_seconds is absent
                durationMinutes: w.duration_seconds
                    ? Math.round(w.duration_seconds / 60)
                    : (w.timeStart && w.timeEnd
                        ? Math.round((new Date(w.timeEnd).getTime() - new Date(w.timeStart).getTime()) / 60000)
                        : null),
                calories: w.calories,
                distanceMeters: w.distance_meters || w.distance,
                // SDK uses camelCase averageHr/maxHr
                avgHeartRate: w.average_hr || w.averageHr || w.heartRate?.average,
                maxHeartRate: w.max_hr || w.maxHr || w.heartRate?.max,
                avgSpeed: w.average_speed || w.averageSpeed,
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
                avgCaloriesActive: (() => {
                    const calories = historicalData.activity
                        .map(a => a.caloriesActive)
                        .filter((value): value is number => value != null);
                    return calories.length > 0
                        ? Math.round(calories.reduce((sum, value) => sum + value, 0) / calories.length)
                        : null;
                })(),
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
                avgDuration: (() => {
                    const withDuration = historicalData.workouts.filter(w => w.durationMinutes != null && w.durationMinutes > 0);
                    return withDuration.length > 0
                        ? Math.round(withDuration.reduce((sum, w) => sum + w.durationMinutes!, 0) / withDuration.length)
                        : null;
                })(),
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

    async getPillars(userId: string) {
        const junctionUserId = await wearablesRepository.getJunctionUserId(userId);
        if (!junctionUserId) {
            return { activePillars: [], unlockablePillars: Object.keys(PILLAR_META).map(p => ({ pillar: p, label: PILLAR_META[p].label, description: PILLAR_META[p].description, suggestedProviders: PILLAR_SUGGESTED[p] ?? [] })) };
        }

        // Derive active pillars from real data, not unreliable provider catalog
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const [sleepData, activityData, bodyData, workoutData, connectedProviders] = await Promise.all([
            getSleepData(junctionUserId, startDate, endDate).catch(() => []),
            getActivityData(junctionUserId, startDate, endDate).catch(() => []),
            getBodyData(junctionUserId, startDate, endDate).catch(() => []),
            getWorkoutData(junctionUserId, startDate, endDate).catch(() => []),
            getConnectedProviders(junctionUserId).catch(() => []),
        ]);

        const connectedProviderSlugs = new Set<string>(
            (connectedProviders as any[])
                .filter((provider: any) => provider?.status === 'connected')
                .flatMap((provider: any) => {
                    const raw = provider?.slug;
                    if (!raw) return [];
                    const mapped = PROVIDER_MAP[raw] || raw;
                    return [raw, mapped];
                })
        );

        const hasConnectedProviderForPillar = (pillar: string) =>
            (PILLAR_SUGGESTED[pillar] ?? []).some((provider) => {
                const mapped = PROVIDER_MAP[provider.slug] || provider.slug;
                return connectedProviderSlugs.has(provider.slug) || connectedProviderSlugs.has(mapped);
            });

        const hasHRV = sleepData.some((s: any) => s.average_hrv != null || s.hrv?.average != null || s.hrv != null)
            || bodyData.some((b: any) => b.hrv?.rmssd?.avg != null || b.hrv_avg != null);

        const dataPresence: Record<string, boolean> = {
            sleep:    sleepData.length > 0 || hasConnectedProviderForPillar('sleep'),
            activity: activityData.length > 0 || hasConnectedProviderForPillar('activity'),
            workouts: workoutData.length > 0 || hasConnectedProviderForPillar('workouts'),
            body:     bodyData.length > 0 || hasConnectedProviderForPillar('body'),
            recovery: hasHRV || hasConnectedProviderForPillar('recovery'),
            glucose:  hasConnectedProviderForPillar('glucose'),
            heart:    hasConnectedProviderForPillar('heart'),
            nutrition: hasConnectedProviderForPillar('nutrition'),
        };

        const activePillars: string[] = [];
        const unlockablePillars: { pillar: string; label: string; description: string; suggestedProviders: { slug: string; name: string; logo?: string }[] }[] = [];

        for (const [pillar, active] of Object.entries(dataPresence)) {
            if (active) {
                activePillars.push(pillar);
            } else {
                unlockablePillars.push({
                    pillar,
                    label: PILLAR_META[pillar].label,
                    description: PILLAR_META[pillar].description,
                    suggestedProviders: PILLAR_SUGGESTED[pillar] ?? [],
                });
            }
        }

        return { activePillars, unlockablePillars };
    }

    async getHealthPulseSummary(userId: string) {
        const junctionUserId = await wearablesRepository.getJunctionUserId(userId);

        // Get 7 days of wearable data + latest lab analyses in parallel
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const [sleepData, activityData, bodyData, labAnalyses] = await Promise.all([
            junctionUserId ? getSleepData(junctionUserId, startDate, endDate).catch(() => []) : Promise.resolve([]),
            junctionUserId ? getActivityData(junctionUserId, startDate, endDate).catch(() => []) : Promise.resolve([]),
            junctionUserId ? getBodyData(junctionUserId, startDate, endDate).catch(() => []) : Promise.resolve([]),
            filesRepository.listLabAnalysesByUser(userId).catch(() => []),
        ]);

        // Check connected providers
        let providers: string[] = [];
        if (junctionUserId) {
            try {
                const connected = await getConnectedProviders(junctionUserId);
                providers = connected.filter((p: any) => p.status === 'connected').map((p: any) => PROVIDER_DISPLAY_NAMES[PROVIDER_MAP[p.slug]] || p.name);
            } catch {
                providers = [];
            }
        }

        // Build date-keyed map of the last 7 days
        const dateMap = new Map<string, { sleepMinutes: number | null; deepSleepMinutes: number | null; hrv: number | null; sleepScore: number | null; steps: number | null; activeMinutes: number | null }>();

        // Initialise each of the 7 days with nulls so we have full arrays even without data
        for (let i = 6; i >= 0; i--) {
            const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            dateMap.set(d, { sleepMinutes: null, deepSleepMinutes: null, hrv: null, sleepScore: null, steps: null, activeMinutes: null });
        }

        // Fill sleep data (uses Junction normalized format: duration_total_seconds, average_hrv, sleep_efficiency)
        for (const s of sleepData as any[]) {
            const date = s.calendar_date || s.calendarDate || s.date?.split('T')[0];
            if (!date || !dateMap.has(date)) continue;
            const entry = dateMap.get(date)!;
            if (s.duration_total_seconds) entry.sleepMinutes = Math.round(s.duration_total_seconds / 60);
            if (s.duration_deep_sleep_seconds) entry.deepSleepMinutes = Math.round(s.duration_deep_sleep_seconds / 60);
            if (s.average_hrv) entry.hrv = Math.round(s.average_hrv);
            if (s.sleep_efficiency) entry.sleepScore = Math.round(s.sleep_efficiency * 100);
            // Fallback for older format
            if (!entry.sleepMinutes && s.duration) entry.sleepMinutes = Math.round(s.duration / 60);
            if (!entry.hrv && (s.hrv?.avgHrv || s.hrvAvg)) entry.hrv = Math.round(s.hrv?.avgHrv || s.hrvAvg);
        }

        // Fill activity data
        for (const a of activityData as any[]) {
            const date = a.calendar_date || a.calendarDate || a.date?.split('T')[0];
            if (!date || !dateMap.has(date)) continue;
            const entry = dateMap.get(date)!;
            if (a.steps) entry.steps = a.steps;
            if (a.active_duration_seconds) entry.activeMinutes = Math.round(a.active_duration_seconds / 60);
            else if (a.activeMinutes) entry.activeMinutes = a.activeMinutes;
        }

        const sortedDates = Array.from(dateMap.keys()).sort();
        const today = sortedDates[sortedDates.length - 1];
        const todayEntry = dateMap.get(today)!;

        // Lab markers from most recent analysis
        const latestLab = labAnalyses[0] || null;
        const labMarkers = latestLab?.extractedMarkers
            ? (latestLab.extractedMarkers as any[]).slice(0, 8).map((m: any) => ({
                name: m.name,
                value: m.value,
                unit: m.unit || '',
                status: m.status || 'normal',
                referenceRange: m.referenceRange || '',
            }))
            : [];

        return {
            connected: providers.length > 0,
            providers,
            today: {
                sleepMinutes: todayEntry.sleepMinutes,
                deepSleepMinutes: todayEntry.deepSleepMinutes,
                sleepScore: todayEntry.sleepScore,
                hrvMs: todayEntry.hrv,
                steps: todayEntry.steps,
                activeMinutes: todayEntry.activeMinutes,
            },
            trends: {
                dates: sortedDates,
                sleepMinutes: sortedDates.map(d => dateMap.get(d)!.sleepMinutes),
                hrv: sortedDates.map(d => dateMap.get(d)!.hrv),
                steps: sortedDates.map(d => dateMap.get(d)!.steps),
            },
            labMarkers,
            labReportDate: latestLab?.processedAt ? new Date(latestLab.processedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null,
            lastUpdated: new Date().toISOString(),
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
