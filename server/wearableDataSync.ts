import type { IStorage } from './storage';
import type { WearableConnection } from '@shared/schema';

/**
 * Wearable Data Syncing Service
 * Supports: Oura Ring, Fitbit, WHOOP
 */

// ============================================================================
// WHOOP Data Interfaces
// ============================================================================

interface WhoopRecoveryData {
  cycle_id: number;
  sleep_id: number;
  user_id: number;
  created_at: string;
  updated_at: string;
  score_state: string;
  score: {
    user_calibrating: boolean;
    recovery_score: number; // 0-100
    resting_heart_rate: number;
    hrv_rmssd_milli: number; // milliseconds
    spo2_percentage: number;
    skin_temp_celsius: number;
  };
}

interface WhoopSleepData {
  id: number;
  user_id: number;
  created_at: string;
  updated_at: string;
  start: string; // ISO timestamp
  end: string;
  during_bounds: string;
  score_state: string;
  score: {
    stage_summary: {
      total_in_bed_time_milli: number;
      total_awake_time_milli: number;
      total_no_data_time_milli: number;
      total_light_sleep_time_milli: number;
      total_slow_wave_sleep_time_milli: number; // deep sleep
      total_rem_sleep_time_milli: number;
      sleep_cycle_count: number;
      disturbance_count: number;
    };
    sleep_needed: {
      baseline_milli: number;
      need_from_sleep_debt_milli: number;
      need_from_recent_strain_milli: number;
      need_from_recent_nap_milli: number;
    };
    respiratory_rate: number;
    sleep_performance_percentage: number;
    sleep_consistency_percentage: number;
    sleep_efficiency_percentage: number;
  };
}

interface WhoopCycleData {
  id: number;
  user_id: number;
  created_at: string;
  updated_at: string;
  start: string;
  end: string;
  score_state: string;
  score: {
    strain: number; // 0-21 scale
    kilojoule: number;
    average_heart_rate: number;
    max_heart_rate: number;
  };
}

// ============================================================================
// Oura Ring Data Interfaces
// ============================================================================

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
 * Fitbit Data Syncing Service
 */

interface FitbitSleepData {
  sleep: Array<{
    dateOfSleep: string;
    efficiency: number; // 0-100
    minutesAsleep: number;
    minutesAwake: number;
    timeInBed: number;
    levels: {
      summary: {
        deep?: { minutes: number };
        light?: { minutes: number };
        rem?: { minutes: number };
        wake?: { minutes: number };
      };
    };
  }>;
}

interface FitbitActivityData {
  summary: {
    steps: number;
    caloriesOut: number;
    veryActiveMinutes: number;
    fairlyActiveMinutes: number;
    lightlyActiveMinutes: number;
    sedentaryMinutes: number;
    restingHeartRate?: number;
  };
}

interface FitbitHeartRateData {
  'activities-heart': Array<{
    dateTime: string;
    value: {
      customHeartRateZones: any[];
      heartRateZones: any[];
      restingHeartRate?: number;
    };
  }>;
  'activities-heart-intraday'?: {
    dataset: Array<{ time: string; value: number }>;
  };
}

/**
 * Sync Fitbit data for a specific user
 */
export async function syncFitbitData(
  userId: string,
  connection: WearableConnection,
  storage: IStorage,
  daysToSync: number = 7
): Promise<{ success: boolean; daysSynced: number; error?: string }> {
  try {
    console.log(`Starting Fitbit sync for user ${userId}, last ${daysToSync} days`);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysToSync);

    let daysSynced = 0;

    // Sync each day individually (Fitbit API requires single-date requests)
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD

      try {
        // Fetch sleep data
        const sleepResponse = await fetch(
          `https://api.fitbit.com/1.2/user/-/sleep/date/${dateStr}.json`,
          {
            headers: {
              'Authorization': `Bearer ${connection.accessToken}`,
            },
          }
        );

        if (!sleepResponse.ok) {
          console.error(`Fitbit sleep API error for ${dateStr}:`, sleepResponse.status);
          continue;
        }

        const sleepData: FitbitSleepData = await sleepResponse.json();

        // Fetch activity data
        const activityResponse = await fetch(
          `https://api.fitbit.com/1/user/-/activities/date/${dateStr}.json`,
          {
            headers: {
              'Authorization': `Bearer ${connection.accessToken}`,
            },
          }
        );

        const activityData: FitbitActivityData = activityResponse.ok 
          ? await activityResponse.json() 
          : { summary: { steps: 0, caloriesOut: 0, veryActiveMinutes: 0, fairlyActiveMinutes: 0, lightlyActiveMinutes: 0, sedentaryMinutes: 0 } };

        // Fetch heart rate data
        const heartRateResponse = await fetch(
          `https://api.fitbit.com/1/user/-/activities/heart/date/${dateStr}/1d.json`,
          {
            headers: {
              'Authorization': `Bearer ${connection.accessToken}`,
            },
          }
        );

        const heartRateData: FitbitHeartRateData = heartRateResponse.ok 
          ? await heartRateResponse.json() 
          : { 'activities-heart': [] };

        // Process sleep data (Fitbit can have multiple sleep sessions per day)
        const mainSleep = sleepData.sleep?.[0]; // Get primary sleep session

        if (mainSleep) {
          const heartRateValue = heartRateData['activities-heart']?.[0]?.value;

          // Save to biometric_data table
          await storage.saveBiometricData({
            userId,
            connectionId: connection.id,
            provider: 'fitbit',
            dataDate: new Date(dateStr + 'T00:00:00Z'),
            
            // Sleep metrics (Fitbit already uses minutes!)
            sleepScore: mainSleep.efficiency || null,
            sleepHours: mainSleep.minutesAsleep || null,
            deepSleepMinutes: mainSleep.levels?.summary?.deep?.minutes || null,
            remSleepMinutes: mainSleep.levels?.summary?.rem?.minutes || null,
            lightSleepMinutes: mainSleep.levels?.summary?.light?.minutes || null,
            
            // Heart metrics
            hrvMs: null, // Fitbit doesn't expose HRV in daily summary API
            restingHeartRate: heartRateValue?.restingHeartRate || activityData.summary?.restingHeartRate || null,
            averageHeartRate: null, // Would need intraday data
            maxHeartRate: null,
            
            // Recovery scores (Fitbit doesn't have these)
            recoveryScore: null,
            readinessScore: null,
            strainScore: null,
            
            // Activity metrics
            steps: activityData.summary?.steps || null,
            caloriesBurned: activityData.summary?.caloriesOut || null,
            activeMinutes: (activityData.summary?.veryActiveMinutes || 0) + (activityData.summary?.fairlyActiveMinutes || 0),
            
            // Additional metrics
            spo2Percentage: null, // Not in standard API
            skinTempCelsius: null,
            respiratoryRate: null,
            
            // Store raw data for reference
            rawData: {
              sleep: mainSleep,
              activity: activityData.summary,
              heartRate: heartRateValue || null,
            },
          });

          daysSynced++;
        }

        // Rate limiting - Fitbit allows 150 requests/hour (2.5/min)
        await new Promise(resolve => setTimeout(resolve, 400)); // 400ms between requests

      } catch (error) {
        console.error(`Error syncing Fitbit data for ${dateStr}:`, error);
        // Continue with next day
      }
    }

    // Update connection's last sync time
    await storage.updateWearableConnection(connection.id, {
      lastSyncAt: new Date(),
      lastSyncError: null,
      status: 'connected',
    });

    console.log(`✅ Fitbit sync complete for user ${userId}: ${daysSynced} days synced`);

    return { success: true, daysSynced };

  } catch (error) {
    console.error('Error syncing Fitbit data:', error);
    
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

/**
 * Sync all active Fitbit connections (called by cron job)
 */
export async function syncAllFitbitConnections(storage: IStorage): Promise<void> {
  try {
    console.log('🔄 Starting daily Fitbit sync for all users...');

    const allConnections = await storage.getAllWearableConnections();
    const fitbitConnections = allConnections.filter(
      conn => conn.provider === 'fitbit' && conn.status === 'connected'
    );

    console.log(`Found ${fitbitConnections.length} Fitbit connections to sync`);

    let successCount = 0;
    let errorCount = 0;

    for (const connection of fitbitConnections) {
      const result = await syncFitbitData(connection.userId, connection, storage, 1); // Sync yesterday
      
      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }

      // Rate limiting - 400ms between users
      await new Promise(resolve => setTimeout(resolve, 400));
    }

    console.log(`✅ Fitbit sync complete: ${successCount} success, ${errorCount} errors`);

  } catch (error) {
    console.error('Error in daily Fitbit sync:', error);
  }
}

/**
 * Sync WHOOP data for a specific user
 */
export async function syncWhoopData(
  userId: string,
  connection: WearableConnection,
  storage: IStorage,
  daysToSync: number = 7
): Promise<{ success: boolean; daysSynced: number; error?: string }> {
  try {
    console.log(`Starting WHOOP sync for user ${userId}, last ${daysToSync} days`);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysToSync);

    let daysSynced = 0;

    // WHOOP API v2 - Get cycles (daily activity/strain data)
    const cyclesResponse = await fetch(
      `https://api.prod.whoop.com/developer/v1/cycle?start=${startDate.toISOString()}&end=${endDate.toISOString()}`,
      {
        headers: {
          'Authorization': `Bearer ${connection.accessToken}`,
        },
      }
    );

    if (!cyclesResponse.ok) {
      throw new Error(`WHOOP cycles API error: ${cyclesResponse.status}`);
    }

    const cyclesData = await cyclesResponse.json();
    const cycles: WhoopCycleData[] = cyclesData.records || [];

    // Get recovery data
    const recoveryResponse = await fetch(
      `https://api.prod.whoop.com/developer/v1/recovery?start=${startDate.toISOString()}&end=${endDate.toISOString()}`,
      {
        headers: {
          'Authorization': `Bearer ${connection.accessToken}`,
        },
      }
    );

    const recoveryData = recoveryResponse.ok ? await recoveryResponse.json() : { records: [] };
    const recoveries: WhoopRecoveryData[] = recoveryData.records || [];

    // Get sleep data
    const sleepResponse = await fetch(
      `https://api.prod.whoop.com/developer/v1/activity/sleep?start=${startDate.toISOString()}&end=${endDate.toISOString()}`,
      {
        headers: {
          'Authorization': `Bearer ${connection.accessToken}`,
        },
      }
    );

    const sleepData = sleepResponse.ok ? await sleepResponse.json() : { records: [] };
    const sleeps: WhoopSleepData[] = sleepData.records || [];

    // Create a map of data by date
    const dataByDate = new Map<string, { cycle?: WhoopCycleData; recovery?: WhoopRecoveryData; sleep?: WhoopSleepData }>();

    // Group cycles by date
    cycles.forEach(cycle => {
      const date = cycle.start.split('T')[0];
      if (!dataByDate.has(date)) dataByDate.set(date, {});
      dataByDate.get(date)!.cycle = cycle;
    });

    // Group recoveries by date
    recoveries.forEach(recovery => {
      const date = recovery.created_at.split('T')[0];
      if (!dataByDate.has(date)) dataByDate.set(date, {});
      dataByDate.get(date)!.recovery = recovery;
    });

    // Group sleeps by date
    sleeps.forEach(sleep => {
      const date = sleep.start.split('T')[0];
      if (!dataByDate.has(date)) dataByDate.set(date, {});
      dataByDate.get(date)!.sleep = sleep;
    });

    // Process each day's data
    for (const [dateStr, data] of dataByDate.entries()) {
      const { cycle, recovery, sleep } = data;

      // Only save if we have at least some data
      if (!cycle && !recovery && !sleep) continue;

      // Convert WHOOP's milliseconds to minutes for sleep data
      const sleepMinutes = sleep?.score?.stage_summary?.total_in_bed_time_milli 
        ? Math.round(sleep.score.stage_summary.total_in_bed_time_milli / 60000)
        : null;
      
      const deepSleepMinutes = sleep?.score?.stage_summary?.total_slow_wave_sleep_time_milli
        ? Math.round(sleep.score.stage_summary.total_slow_wave_sleep_time_milli / 60000)
        : null;
      
      const remSleepMinutes = sleep?.score?.stage_summary?.total_rem_sleep_time_milli
        ? Math.round(sleep.score.stage_summary.total_rem_sleep_time_milli / 60000)
        : null;
      
      const lightSleepMinutes = sleep?.score?.stage_summary?.total_light_sleep_time_milli
        ? Math.round(sleep.score.stage_summary.total_light_sleep_time_milli / 60000)
        : null;

      await storage.saveBiometricData({
        userId,
        connectionId: connection.id,
        provider: 'whoop',
        dataDate: new Date(dateStr + 'T00:00:00Z'),
        
        // Sleep metrics (converted from milliseconds to minutes)
        sleepScore: sleep?.score?.sleep_performance_percentage || null,
        sleepHours: sleepMinutes,
        deepSleepMinutes,
        remSleepMinutes,
        lightSleepMinutes,
        
        // Heart metrics (WHOOP uses milliseconds for HRV)
        hrvMs: recovery?.score?.hrv_rmssd_milli || null,
        restingHeartRate: recovery?.score?.resting_heart_rate || cycle?.score?.average_heart_rate || null,
        averageHeartRate: cycle?.score?.average_heart_rate || null,
        maxHeartRate: cycle?.score?.max_heart_rate || null,
        
        // WHOOP-specific scores
        recoveryScore: recovery?.score?.recovery_score || null,
        readinessScore: null, // WHOOP calls this "recovery"
        strainScore: cycle?.score?.strain || null, // 0-21 scale
        
        // Activity metrics
        steps: null, // WHOOP doesn't track steps
        caloriesBurned: cycle?.score?.kilojoule ? Math.round(cycle.score.kilojoule / 4.184) : null, // Convert kJ to kcal
        activeMinutes: null,
        
        // Additional metrics
        spo2Percentage: recovery?.score?.spo2_percentage || null,
        skinTempCelsius: recovery?.score?.skin_temp_celsius || null,
        respiratoryRate: sleep?.score?.respiratory_rate || null,
        
        // Store raw data
        rawData: {
          cycle: cycle || null,
          recovery: recovery || null,
          sleep: sleep || null,
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

    console.log(`✅ WHOOP sync complete for user ${userId}: ${daysSynced} days synced`);

    return { success: true, daysSynced };

  } catch (error) {
    console.error('Error syncing WHOOP data:', error);
    
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
 * Sync all active WHOOP connections (called by cron job)
 */
export async function syncAllWhoopConnections(storage: IStorage): Promise<void> {
  try {
    console.log('🔄 Starting daily WHOOP sync for all users...');

    const allConnections = await storage.getAllWearableConnections();
    const whoopConnections = allConnections.filter(
      conn => conn.provider === 'whoop' && conn.status === 'connected'
    );

    console.log(`Found ${whoopConnections.length} WHOOP connections to sync`);

    let successCount = 0;
    let errorCount = 0;

    for (const connection of whoopConnections) {
      const result = await syncWhoopData(connection.userId, connection, storage, 1); // Sync yesterday
      
      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }

      // Rate limiting - 1 second between users
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`✅ WHOOP sync complete: ${successCount} success, ${errorCount} errors`);

  } catch (error) {
    console.error('Error in daily WHOOP sync:', error);
  }
}
