/**
 * Junction Wearables Routes Module
 * 
 * Handles all /api/wearables/* endpoints using Junction (Vital) API:
 * - Device connections via Junction Link
 * - Biometric data retrieval
 * - Provider management
 * 
 * This replaces the direct OAuth integrations with Fitbit, Oura, WHOOP.
 */

import { Router, Request, Response } from 'express';
import { storage } from '../../storage';
import { requireAuth } from '../../routes/middleware';
import logger from '../../logger';
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

const router = Router();

/**
 * Get user's connected wearable devices via Junction
 */
router.get('/connections', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    
    // Get user to check for Junction user ID
    const user = await storage.getUser(userId);
    if (!user?.junctionUserId) {
      // No Junction user yet, return empty connections
      return res.json([]);
    }

    // Get connected providers from Junction
    const providers = await getConnectedProviders(user.junctionUserId);
    
    // Map to our connection format
    const connections = providers.map((p: any) => ({
      id: `${user.junctionUserId}_${p.slug}`,
      userId,
      provider: PROVIDER_MAP[p.slug] || p.slug,
      providerName: PROVIDER_DISPLAY_NAMES[PROVIDER_MAP[p.slug]] || p.name,
      status: p.status === 'connected' ? 'connected' : 'disconnected',
      connectedAt: p.connectedAt || new Date().toISOString(),
      lastSyncedAt: p.lastSyncAt || null,
      // Junction handles tokens internally
      source: 'junction',
    }));

    res.json(connections);
  } catch (error) {
    logger.error('Error fetching wearable connections:', error);
    res.status(500).json({ error: 'Failed to fetch wearable connections' });
  }
});

/**
 * Get Junction Link URL to connect a new wearable device
 * This returns a URL that opens Junction's hosted connection widget
 */
router.get('/connect', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    
    // Get or create Junction user
    const user = await storage.getUser(userId);
    let junctionUserId = user?.junctionUserId;

    if (!junctionUserId) {
      // Create Junction user and save the ID
      junctionUserId = await getOrCreateJunctionUser(userId, null);
      
      // Update user with Junction user ID
      await storage.updateUser(userId, { junctionUserId });
      logger.info('Created and saved Junction user ID', { userId, junctionUserId });
    }

    // Generate link token for Junction Link widget
    const { linkToken, linkWebUrl } = await generateLinkToken(junctionUserId);

    // Return the link URL - frontend will redirect user here
    res.json({ 
      linkUrl: linkWebUrl,
      linkToken, // Can be used with @tryvital/vital-link React component
    });
  } catch (error) {
    logger.error('Error generating Junction link:', error);
    res.status(500).json({ error: 'Failed to generate connection link' });
  }
});

/**
 * Legacy connect endpoint for backwards compatibility
 * Redirects to the new Junction Link flow
 */
router.get('/connect/:provider', requireAuth, async (req: Request, res: Response) => {
  // All providers now use Junction Link, redirect to unified endpoint
  return res.redirect('/api/wearables/connect');
});

/**
 * Disconnect a wearable device
 */
router.post('/disconnect/:connectionId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { connectionId } = req.params;

    // Connection ID format: {junctionUserId}_{providerSlug}
    const parts = connectionId.split('_');
    if (parts.length < 2) {
      return res.status(400).json({ error: 'Invalid connection ID' });
    }
    
    const junctionUserId = parts.slice(0, -1).join('_'); // Handle UUIDs with underscores
    const providerSlug = parts[parts.length - 1];

    // Verify user owns this connection
    const user = await storage.getUser(userId);
    if (user?.junctionUserId !== junctionUserId) {
      return res.status(403).json({ error: 'Not authorized to disconnect this device' });
    }

    // Disconnect via Junction
    await disconnectProvider(junctionUserId, providerSlug);

    res.json({ success: true });
  } catch (error) {
    logger.error('Error disconnecting wearable:', error);
    res.status(500).json({ error: 'Failed to disconnect device' });
  }
});

/**
 * Get normalized biometric data for a date range
 */
router.get('/biometric-data', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { startDate, endDate, provider } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const user = await storage.getUser(userId);
    if (!user?.junctionUserId) {
      return res.json({ data: [] });
    }

    // Fetch data from Junction APIs in parallel
    const [sleepData, activityData, bodyData] = await Promise.all([
      getSleepData(user.junctionUserId, startDate as string, endDate as string).catch(() => []),
      getActivityData(user.junctionUserId, startDate as string, endDate as string).catch(() => []),
      getBodyData(user.junctionUserId, startDate as string, endDate as string).catch(() => []),
    ]);

    // Combine and normalize the data
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

    // Process body data (HRV, resting HR, etc.)
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

    // Convert map to array and filter by provider if specified
    let data = Array.from(dataByDate.values());
    if (provider) {
      data = data.filter(d => d.provider === provider);
    }

    // Sort by date
    data.sort((a, b) => a.date.localeCompare(b.date));

    res.json({ data });
  } catch (error) {
    logger.error('Error fetching biometric data:', error);
    res.status(500).json({ error: 'Failed to fetch biometric data' });
  }
});

/**
 * Get merged biometric data (combines data from all providers by date)
 * Junction already normalizes data, so this is the same as the regular endpoint
 */
router.get('/biometric-data/merged', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const user = await storage.getUser(userId);

    if (!user?.junctionUserId) {
      return res.json({ data: [] });
    }

    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    // Get all data types from Junction
    const [sleepData, activityData, bodyData, workoutData] = await Promise.all([
      getSleepData(user.junctionUserId, startDate as string, endDate as string),
      getActivityData(user.junctionUserId, startDate as string, endDate as string),
      getBodyData(user.junctionUserId, startDate as string, endDate as string),
      getWorkoutData(user.junctionUserId, startDate as string, endDate as string),
    ]);

    // Merge data by date
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

    res.json({ data });
  } catch (error) {
    logger.error('Error fetching merged biometric data:', error);
    res.status(500).json({ error: 'Failed to fetch merged biometric data' });
  }
});

/**
 * Manual sync endpoint - Junction handles syncing automatically
 * This endpoint is kept for compatibility but just returns success
 */
router.post('/sync', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const user = await storage.getUser(userId);

    if (!user?.junctionUserId) {
      return res.status(404).json({ error: 'No wearables connected' });
    }

    // Junction syncs automatically, but we can trigger a refresh
    // by requesting recent data
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    await Promise.all([
      getSleepData(user.junctionUserId, startDate, endDate).catch(() => []),
      getActivityData(user.junctionUserId, startDate, endDate).catch(() => []),
      getBodyData(user.junctionUserId, startDate, endDate).catch(() => []),
    ]);

    res.json({
      success: true,
      message: 'Data sync initiated via Junction',
    });
  } catch (error) {
    logger.error('Error in manual sync:', error);
    res.status(500).json({ error: 'Failed to sync data' });
  }
});

/**
 * Get biometric trends and insights
 */
router.get('/insights', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const days = parseInt(req.query.days as string) || 30;

    const user = await storage.getUser(userId);
    if (!user?.junctionUserId) {
      return res.json({
        insights: { sleep: null, heart: null, recovery: null, activity: null },
        message: 'No wearables connected',
      });
    }

    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Fetch data from Junction
    const [sleepData, activityData, bodyData] = await Promise.all([
      getSleepData(user.junctionUserId, startDate, endDate).catch(() => []),
      getActivityData(user.junctionUserId, startDate, endDate).catch(() => []),
      getBodyData(user.junctionUserId, startDate, endDate).catch(() => []),
    ]);

    if (sleepData.length === 0 && activityData.length === 0 && bodyData.length === 0) {
      return res.json({
        insights: { sleep: null, heart: null, recovery: null, activity: null },
        message: 'No data available for insights',
      });
    }

    // Calculate averages and trends
    const calculateTrend = (values: number[]): 'improving' | 'declining' | 'stable' => {
      if (values.length < 3) return 'stable';
      const recent = values.slice(-Math.min(7, Math.floor(values.length / 2)));
      const earlier = values.slice(0, Math.min(7, Math.floor(values.length / 2)));
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
      const change = (recentAvg - earlierAvg) / earlierAvg;
      if (change > 0.05) return 'improving';
      if (change < -0.05) return 'declining';
      return 'stable';
    };

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
        trend: calculateTrend(sleepDurations),
        qualityTrend: sleepScores.length > 0 ? calculateTrend(sleepScores) : null,
      } : null,

      heart: hrvValues.length > 0 || restingHRs.length > 0 ? {
        averageHRV: hrvValues.length > 0 
          ? Math.round(hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length) 
          : null,
        averageRestingHR: restingHRs.length > 0 
          ? Math.round(restingHRs.reduce((a, b) => a + b, 0) / restingHRs.length) 
          : null,
        hrvTrend: hrvValues.length > 0 ? calculateTrend(hrvValues) : null,
        restingHRTrend: restingHRs.length > 0 ? calculateTrend(restingHRs) : null,
      } : null,

      recovery: null, // Junction provides this via different endpoint

      activity: steps.length > 0 ? {
        averageSteps: Math.round(steps.reduce((a, b) => a + b, 0) / steps.length),
        trend: calculateTrend(steps),
      } : null,
    };

    res.json({ insights, daysAnalyzed: days });
  } catch (error) {
    logger.error('Error calculating insights:', error);
    res.status(500).json({ error: 'Failed to calculate insights' });
  }
});

/**
 * Get available providers that can be connected via Junction
 * Returns priority providers for ONES platform
 */
router.get('/available-providers', requireAuth, async (_req: Request, res: Response) => {
  // Priority providers for ONES - Activity focused
  // Note: Junction uses 'googlefit' (no underscore) for logo URLs
  const providers = [
    { slug: 'garmin', name: 'Garmin', priority: 1, category: 'fitness', description: 'Fitness watches & GPS', logo: 'https://storage.googleapis.com/vital-assets/garmin.png', historicalDays: 90 },
    { slug: 'google_fit', name: 'Google Fit', priority: 2, category: 'fitness', description: 'Android health platform', logo: 'https://storage.googleapis.com/vital-assets/googlefit.png', historicalDays: 90 },
    { slug: 'fitbit', name: 'Fitbit', priority: 3, category: 'fitness', description: 'Activity trackers', logo: 'https://storage.googleapis.com/vital-assets/fitbit.png', historicalDays: 90 },
    { slug: 'oura', name: 'Oura Ring', priority: 4, category: 'sleep', description: 'Sleep & recovery tracking', logo: 'https://storage.googleapis.com/vital-assets/oura.png', historicalDays: 180 },
    { slug: 'whoop_v2', name: 'WHOOP', priority: 5, category: 'fitness', description: 'Strain & recovery coach', logo: 'https://storage.googleapis.com/vital-assets/whoop.png', historicalDays: 180 },
    { slug: 'peloton', name: 'Peloton', priority: 6, category: 'fitness', description: 'Connected fitness', logo: 'https://storage.googleapis.com/vital-assets/peloton.png', historicalDays: 180 },
    { slug: 'freestyle_libre', name: 'Freestyle Libre', priority: 7, category: 'cgm', description: 'Continuous glucose monitoring', logo: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgNDAiPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iNDAiIGZpbGw9IiMwMDQ4OGEiIHJ4PSI0Ii8+PHRleHQgeD0iNTAiIHk9IjI2IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+QWJib3R0PC90ZXh0Pjwvc3ZnPg==', historicalDays: 90 },
  ];

  res.json({ providers });
});

/**
 * Get comprehensive historical data for AI analysis
 * 
 * When a user connects their wearable, Junction automatically fetches historical data:
 * - Garmin: 90 days
 * - Google Fit: 90 days  
 * - Fitbit: 90 days (activity timeseries limited to 14 days)
 * - Oura: 180 days
 * - WHOOP: 180 days
 * - Peloton: 180 days
 * - Freestyle Libre: 90 days
 * 
 * This endpoint retrieves that data for the AI to analyze and create personalized supplements.
 */
router.get('/historical-data', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const days = parseInt(req.query.days as string) || 90;
    
    const user = await storage.getUser(userId);
    if (!user?.junctionUserId) {
      return res.json({ 
        success: false, 
        error: 'No wearable connected',
        data: null,
      });
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    logger.info('Fetching historical wearable data for AI analysis', { 
      userId, 
      junctionUserId: user.junctionUserId,
      days,
      startDate: startStr,
      endDate: endStr,
    });

    // Fetch all data types from Junction
    const [sleepData, activityData, bodyData, workoutData] = await Promise.all([
      getSleepData(user.junctionUserId, startStr, endStr).catch(e => { logger.error('Sleep fetch error:', e); return []; }),
      getActivityData(user.junctionUserId, startStr, endStr).catch(e => { logger.error('Activity fetch error:', e); return []; }),
      getBodyData(user.junctionUserId, startStr, endStr).catch(e => { logger.error('Body fetch error:', e); return []; }),
      getWorkoutData(user.junctionUserId, startStr, endStr).catch(e => { logger.error('Workout fetch error:', e); return []; }),
    ]);

    // Structure data for AI analysis
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
      
      // Sleep metrics for AI analysis
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
      
      // Activity metrics for AI analysis
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
      
      // Body composition and vitals
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
      
      // Workout sessions
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

    // Calculate aggregate statistics for AI
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
          ? getMostCommonWorkoutType(historicalData.workouts)
          : null,
      },
    };

    logger.info('Historical data fetched for AI analysis', { 
      userId,
      sleepRecords: sleepData.length,
      activityRecords: activityData.length,
      bodyRecords: bodyData.length,
      workoutRecords: workoutData.length,
    });

    res.json({ 
      success: true, 
      data: historicalData,
      statistics: stats,
    });
  } catch (error) {
    logger.error('Error fetching historical data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch historical data',
      data: null,
    });
  }
});

// Helper function to find most common workout type
function getMostCommonWorkoutType(workouts: any[]): string | null {
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

export default router;
