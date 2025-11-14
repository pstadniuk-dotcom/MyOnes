import type { IStorage } from './storage';
import type { WearableConnection } from '@shared/schema';

/**
 * Oura Ring Data Syncing Service
 * Fetches daily sleep, activity, and readiness data from Oura API v2
 */

interface OuraSleepData {
  id: string;
  day: string; // YYYY-MM-DD
  score: number; // 0-100
  contributors: {
    deep_sleep: number;
    efficiency: number;
    latency: number;
    rem_sleep: number;
    restfulness: number;
    timing: number;
    total_sleep: number;
  };
  deep_sleep_duration: number; // seconds
  rem_sleep_duration: number; // seconds
  light_sleep_duration: number; // seconds
  total_sleep_duration: number; // seconds
  awake_time: number; // seconds
  average_heart_rate: number;
  lowest_heart_rate: number;
  average_hrv: number;
  time_in_bed: number; // seconds
}

interface OuraReadinessData {
  id: string;
  day: string;
  score: number; // 0-100
  contributors: {
    activity_balance: number;
    body_temperature: number;
    hrv_balance: number;
    previous_day_activity: number;
    previous_night: number;
    recovery_index: number;
    resting_heart_rate: number;
    sleep_balance: number;
  };
  temperature_deviation: number; // Celsius deviation from baseline
  temperature_trend_deviation: number;
}

interface OuraActivityData {
  id: string;
  day: string;
  score: number; // 0-100
  active_calories: number;
  average_met_minutes: number;
  contributors: {
    meet_daily_targets: number;
    move_every_hour: number;
    recovery_time: number;
    stay_active: number;
    training_frequency: number;
    training_volume: number;
  };
  equivalent_walking_distance: number; // meters
  high_activity_met_minutes: number;
  high_activity_time: number; // seconds
  inactivity_alerts: number;
  low_activity_met_minutes: number;
  low_activity_time: number; // seconds
  medium_activity_met_minutes: number;
  medium_activity_time: number; // seconds
  met: {
    interval: number;
    items: number[];
    timestamp: string;
  };
  meters_to_target: number;
  non_wear_time: number; // seconds
  resting_time: number; // seconds
  sedentary_met_minutes: number;
  sedentary_time: number; // seconds
  steps: number;
  target_calories: number;
  target_meters: number;
  total_calories: number;
}

/**
 * Sync Oura data for a specific user
 */
export async function syncOuraData(
  userId: string,
  connection: WearableConnection,
  storage: IStorage,
  daysToSync: number = 7
): Promise<{ success: boolean; daysSynced: number; error?: string }> {
  try {
    console.log(`Starting Oura sync for user ${userId}, last ${daysToSync} days`);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysToSync);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Fetch sleep data
    const sleepResponse = await fetch(
      `https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=${startDateStr}&end_date=${endDateStr}`,
      {
        headers: {
          'Authorization': `Bearer ${connection.accessToken}`,
        },
      }
    );

    if (!sleepResponse.ok) {
      const errorText = await sleepResponse.text();
      console.error('Oura sleep API error:', sleepResponse.status, errorText);
      throw new Error(`Oura API error: ${sleepResponse.status}`);
    }

    const sleepData = await sleepResponse.json();

    // Fetch readiness data
    const readinessResponse = await fetch(
      `https://api.ouraring.com/v2/usercollection/daily_readiness?start_date=${startDateStr}&end_date=${endDateStr}`,
      {
        headers: {
          'Authorization': `Bearer ${connection.accessToken}`,
        },
      }
    );

    const readinessData = readinessResponse.ok ? await readinessResponse.json() : { data: [] };

    // Fetch activity data
    const activityResponse = await fetch(
      `https://api.ouraring.com/v2/usercollection/daily_activity?start_date=${startDateStr}&end_date=${endDateStr}`,
      {
        headers: {
          'Authorization': `Bearer ${connection.accessToken}`,
        },
      }
    );

    const activityData = activityResponse.ok ? await activityResponse.json() : { data: [] };

    // Process and save each day's data
    const sleepByDate = new Map<string, OuraSleepData>();
    const readinessByDate = new Map<string, OuraReadinessData>();
    const activityByDate = new Map<string, OuraActivityData>();

    sleepData.data?.forEach((item: OuraSleepData) => sleepByDate.set(item.day, item));
    readinessData.data?.forEach((item: OuraReadinessData) => readinessByDate.set(item.day, item));
    activityData.data?.forEach((item: OuraActivityData) => activityByDate.set(item.day, item));

    let daysSynced = 0;

    // Combine data by date and save to database
    for (const date of Array.from(sleepByDate.keys())) {
      const sleep = sleepByDate.get(date)!;
      const readiness = readinessByDate.get(date);
      const activity = activityByDate.get(date);

      // Save to biometric_data table
      await storage.saveBiometricData({
        userId,
        connectionId: connection.id,
        provider: 'oura',
        dataDate: new Date(date + 'T00:00:00Z'),
        
        // Sleep metrics
        sleepScore: sleep.score || null,
        sleepHours: sleep.total_sleep_duration ? Math.round(sleep.total_sleep_duration / 60) : null,
        deepSleepMinutes: sleep.deep_sleep_duration ? Math.round(sleep.deep_sleep_duration / 60) : null,
        remSleepMinutes: sleep.rem_sleep_duration ? Math.round(sleep.rem_sleep_duration / 60) : null,
        lightSleepMinutes: sleep.light_sleep_duration ? Math.round(sleep.light_sleep_duration / 60) : null,
        
        // Heart metrics
        hrvMs: sleep.average_hrv ? Math.round(sleep.average_hrv) : null,
        restingHeartRate: sleep.lowest_heart_rate || null,
        averageHeartRate: sleep.average_heart_rate || null,
        maxHeartRate: null, // Oura doesn't provide max HR in sleep data
        
        // Readiness
        recoveryScore: readiness?.score || null,
        readinessScore: readiness?.score || null,
        strainScore: null, // Oura doesn't have strain (that's WHOOP)
        
        // Activity metrics
        steps: activity?.steps || null,
        caloriesBurned: activity?.total_calories || null,
        activeMinutes: activity?.high_activity_time ? Math.round(activity.high_activity_time / 60) : null,
        
        // Additional metrics
        spo2Percentage: null, // Oura v2 doesn't expose SpO2 directly
        skinTempCelsius: readiness?.temperature_deviation ? Math.round((readiness.temperature_deviation) * 10) : null,
        respiratoryRate: null, // Not in daily summaries
        
        // Store raw data for reference
        rawData: {
          sleep,
          readiness: readiness || null,
          activity: activity || null,
        },
      });

      daysSynced++;
    }

    // Update connection's last sync time
    await storage.updateWearableConnection(connection.id, {
      lastSyncAt: new Date(),
      lastSyncError: null,
      status: 'connected',
    });

    console.log(`✅ Oura sync complete for user ${userId}: ${daysSynced} days synced`);

    return { success: true, daysSynced };

  } catch (error) {
    console.error('Error syncing Oura data:', error);
    
    // Update connection with error
    await storage.updateWearableConnection(connection.id, {
      lastSyncError: error instanceof Error ? error.message : 'Unknown error',
      status: 'error',
    });

    return {
      success: false,
      daysSynced: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Sync all active Oura connections (called by cron job)
 */
export async function syncAllOuraConnections(storage: IStorage): Promise<void> {
  try {
    console.log('🔄 Starting daily Oura sync for all users...');

    // Get all connected Oura devices
    const allConnections = await storage.getAllWearableConnections();
    const ouraConnections = allConnections.filter(
      conn => conn.provider === 'oura' && conn.status === 'connected'
    );

    console.log(`Found ${ouraConnections.length} Oura connections to sync`);

    let successCount = 0;
    let errorCount = 0;

    // Sync each connection
    for (const connection of ouraConnections) {
      const result = await syncOuraData(connection.userId, connection, storage, 1); // Sync yesterday
      
      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }

      // Rate limiting - wait 1 second between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`✅ Oura sync complete: ${successCount} success, ${errorCount} errors`);

  } catch (error) {
    console.error('Error in daily Oura sync:', error);
  }
}
