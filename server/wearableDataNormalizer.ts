/**
 * Wearable Data Normalization Layer
 * 
 * Normalizes biometric data from different wearable providers into a unified format.
 * Handles unit conversions and field mapping across Oura, Fitbit, and WHOOP.
 */

export interface NormalizedBiometricData {
  // Identifiers
  provider: 'oura' | 'fitbit' | 'whoop';
  date: Date;
  
  // Sleep metrics (all in minutes, scores 0-100)
  sleep: {
    totalMinutes: number | null;
    deepMinutes: number | null;
    remMinutes: number | null;
    lightMinutes: number | null;
    awakeMinutes: number | null;
    score: number | null; // 0-100
    efficiency: number | null; // 0-100 percentage
  };
  
  // Heart metrics
  heart: {
    restingRate: number | null; // bpm
    averageRate: number | null; // bpm
    maxRate: number | null; // bpm
    hrvMs: number | null; // milliseconds (standardized)
  };
  
  // Recovery & Readiness
  recovery: {
    score: number | null; // 0-100 (WHOOP recovery or Oura readiness)
    readinessScore: number | null; // 0-100 (Oura only)
    strainScore: number | null; // 0-21 (WHOOP only, null for others)
  };
  
  // Activity metrics
  activity: {
    steps: number | null;
    caloriesBurned: number | null; // kcal
    activeMinutes: number | null;
  };
  
  // Additional vitals
  vitals: {
    spo2Percentage: number | null; // 0-100
    skinTempCelsius: number | null;
    respiratoryRate: number | null; // breaths per minute
  };
  
  // Data quality indicators
  quality: {
    hasCompleteData: boolean;
    missingSleep: boolean;
    missingHeart: boolean;
    missingActivity: boolean;
  };
  
  // Raw data reference
  rawData: any;
}

/**
 * Normalize Oura Ring data
 * Note: Oura uses SECONDS for sleep duration
 */
export function normalizeOuraData(data: any): NormalizedBiometricData {
  const sleepTotal = data.sleepHours; // Already converted to minutes in sync
  const deepSleep = data.deepSleepMinutes;
  const remSleep = data.remSleepMinutes;
  const lightSleep = data.lightSleepMinutes;
  
  return {
    provider: 'oura',
    date: new Date(data.dataDate),
    
    sleep: {
      totalMinutes: sleepTotal,
      deepMinutes: deepSleep,
      remMinutes: remSleep,
      lightMinutes: lightSleep,
      awakeMinutes: null, // Calculate if total_sleep_duration and time_in_bed available
      score: data.sleepScore, // 0-100
      efficiency: null, // Could calculate from raw data
    },
    
    heart: {
      restingRate: data.restingHeartRate,
      averageRate: data.averageHeartRate,
      maxRate: data.maxHeartRate,
      hrvMs: data.hrvMs, // Already in milliseconds
    },
    
    recovery: {
      score: data.readinessScore, // Oura's readiness = recovery
      readinessScore: data.readinessScore,
      strainScore: null, // Oura doesn't have strain
    },
    
    activity: {
      steps: data.steps,
      caloriesBurned: data.caloriesBurned,
      activeMinutes: data.activeMinutes,
    },
    
    vitals: {
      spo2Percentage: data.spo2Percentage,
      skinTempCelsius: data.skinTempCelsius,
      respiratoryRate: data.respiratoryRate,
    },
    
    quality: {
      hasCompleteData: !!(sleepTotal && deepSleep && data.hrvMs && data.readinessScore),
      missingSleep: !sleepTotal,
      missingHeart: !data.restingHeartRate && !data.hrvMs,
      missingActivity: !data.steps && !data.caloriesBurned,
    },
    
    rawData: data.rawData,
  };
}

/**
 * Normalize Fitbit data
 * Note: Fitbit uses MINUTES for sleep duration (no conversion needed)
 */
export function normalizeFitbitData(data: any): NormalizedBiometricData {
  const sleepTotal = data.sleepHours; // Already in minutes
  const deepSleep = data.deepSleepMinutes;
  const remSleep = data.remSleepMinutes;
  const lightSleep = data.lightSleepMinutes;
  
  return {
    provider: 'fitbit',
    date: new Date(data.dataDate),
    
    sleep: {
      totalMinutes: sleepTotal,
      deepMinutes: deepSleep,
      remMinutes: remSleep,
      lightMinutes: lightSleep,
      awakeMinutes: null,
      score: data.sleepScore, // Fitbit sleep efficiency (0-100)
      efficiency: data.sleepScore,
    },
    
    heart: {
      restingRate: data.restingHeartRate,
      averageRate: data.averageHeartRate,
      maxRate: data.maxHeartRate,
      hrvMs: data.hrvMs, // Fitbit doesn't provide HRV in daily summary
    },
    
    recovery: {
      score: null, // Fitbit doesn't have recovery score
      readinessScore: null,
      strainScore: null,
    },
    
    activity: {
      steps: data.steps,
      caloriesBurned: data.caloriesBurned,
      activeMinutes: data.activeMinutes,
    },
    
    vitals: {
      spo2Percentage: data.spo2Percentage,
      skinTempCelsius: data.skinTempCelsius,
      respiratoryRate: data.respiratoryRate,
    },
    
    quality: {
      hasCompleteData: !!(sleepTotal && data.steps && data.restingHeartRate),
      missingSleep: !sleepTotal,
      missingHeart: !data.restingHeartRate,
      missingActivity: !data.steps,
    },
    
    rawData: data.rawData,
  };
}

/**
 * Normalize WHOOP data
 * Note: WHOOP uses MILLISECONDS for sleep duration (converted to minutes in sync)
 */
export function normalizeWhoopData(data: any): NormalizedBiometricData {
  const sleepTotal = data.sleepHours; // Already converted from milliseconds to minutes
  const deepSleep = data.deepSleepMinutes;
  const remSleep = data.remSleepMinutes;
  const lightSleep = data.lightSleepMinutes;
  
  return {
    provider: 'whoop',
    date: new Date(data.dataDate),
    
    sleep: {
      totalMinutes: sleepTotal,
      deepMinutes: deepSleep,
      remMinutes: remSleep,
      lightMinutes: lightSleep,
      awakeMinutes: null,
      score: data.sleepScore, // Sleep performance percentage
      efficiency: null,
    },
    
    heart: {
      restingRate: data.restingHeartRate,
      averageRate: data.averageHeartRate,
      maxRate: data.maxHeartRate,
      hrvMs: data.hrvMs, // Already in milliseconds
    },
    
    recovery: {
      score: data.recoveryScore, // 0-100
      readinessScore: data.recoveryScore, // Map recovery to readiness
      strainScore: data.strainScore, // 0-21 unique to WHOOP
    },
    
    activity: {
      steps: null, // WHOOP doesn't track steps
      caloriesBurned: data.caloriesBurned, // Already converted from kJ
      activeMinutes: null,
    },
    
    vitals: {
      spo2Percentage: data.spo2Percentage,
      skinTempCelsius: data.skinTempCelsius,
      respiratoryRate: data.respiratoryRate,
    },
    
    quality: {
      hasCompleteData: !!(sleepTotal && data.recoveryScore && data.strainScore && data.hrvMs),
      missingSleep: !sleepTotal,
      missingHeart: !data.restingHeartRate && !data.hrvMs,
      missingActivity: true, // WHOOP doesn't track steps
    },
    
    rawData: data.rawData,
  };
}

/**
 * Normalize any wearable data based on provider
 */
export function normalizeBiometricData(data: any): NormalizedBiometricData {
  switch (data.provider) {
    case 'oura':
      return normalizeOuraData(data);
    case 'fitbit':
      return normalizeFitbitData(data);
    case 'whoop':
      return normalizeWhoopData(data);
    default:
      throw new Error(`Unknown provider: ${data.provider}`);
  }
}

/**
 * Get unified biometric data for a user across all connected devices
 * Merges data from multiple providers for the same date
 */
export function mergeMultiProviderData(dataArray: NormalizedBiometricData[]): NormalizedBiometricData {
  if (dataArray.length === 0) {
    throw new Error('No data to merge');
  }
  
  if (dataArray.length === 1) {
    return dataArray[0];
  }
  
  // Priority: WHOOP > Oura > Fitbit (WHOOP has most comprehensive recovery metrics)
  const priorityOrder = ['whoop', 'oura', 'fitbit'];
  const sorted = [...dataArray].sort((a, b) => {
    return priorityOrder.indexOf(a.provider) - priorityOrder.indexOf(b.provider);
  });
  
  const merged: NormalizedBiometricData = {
    provider: sorted[0].provider, // Use highest priority provider
    date: sorted[0].date,
    sleep: { totalMinutes: null, deepMinutes: null, remMinutes: null, lightMinutes: null, awakeMinutes: null, score: null, efficiency: null },
    heart: { restingRate: null, averageRate: null, maxRate: null, hrvMs: null },
    recovery: { score: null, readinessScore: null, strainScore: null },
    activity: { steps: null, caloriesBurned: null, activeMinutes: null },
    vitals: { spo2Percentage: null, skinTempCelsius: null, respiratoryRate: null },
    quality: { hasCompleteData: false, missingSleep: true, missingHeart: true, missingActivity: true },
    rawData: {},
  };
  
  // Merge data with fallback logic (first non-null value wins)
  for (const data of sorted) {
    // Sleep
    merged.sleep.totalMinutes = merged.sleep.totalMinutes ?? data.sleep.totalMinutes;
    merged.sleep.deepMinutes = merged.sleep.deepMinutes ?? data.sleep.deepMinutes;
    merged.sleep.remMinutes = merged.sleep.remMinutes ?? data.sleep.remMinutes;
    merged.sleep.lightMinutes = merged.sleep.lightMinutes ?? data.sleep.lightMinutes;
    merged.sleep.awakeMinutes = merged.sleep.awakeMinutes ?? data.sleep.awakeMinutes;
    merged.sleep.score = merged.sleep.score ?? data.sleep.score;
    merged.sleep.efficiency = merged.sleep.efficiency ?? data.sleep.efficiency;
    
    // Heart
    merged.heart.restingRate = merged.heart.restingRate ?? data.heart.restingRate;
    merged.heart.averageRate = merged.heart.averageRate ?? data.heart.averageRate;
    merged.heart.maxRate = merged.heart.maxRate ?? data.heart.maxRate;
    merged.heart.hrvMs = merged.heart.hrvMs ?? data.heart.hrvMs;
    
    // Recovery
    merged.recovery.score = merged.recovery.score ?? data.recovery.score;
    merged.recovery.readinessScore = merged.recovery.readinessScore ?? data.recovery.readinessScore;
    merged.recovery.strainScore = merged.recovery.strainScore ?? data.recovery.strainScore;
    
    // Activity (prefer Fitbit for steps)
    if (data.provider === 'fitbit') {
      merged.activity.steps = data.activity.steps ?? merged.activity.steps;
    } else {
      merged.activity.steps = merged.activity.steps ?? data.activity.steps;
    }
    merged.activity.caloriesBurned = merged.activity.caloriesBurned ?? data.activity.caloriesBurned;
    merged.activity.activeMinutes = merged.activity.activeMinutes ?? data.activity.activeMinutes;
    
    // Vitals
    merged.vitals.spo2Percentage = merged.vitals.spo2Percentage ?? data.vitals.spo2Percentage;
    merged.vitals.skinTempCelsius = merged.vitals.skinTempCelsius ?? data.vitals.skinTempCelsius;
    merged.vitals.respiratoryRate = merged.vitals.respiratoryRate ?? data.vitals.respiratoryRate;
    
    // Raw data (merge all)
    merged.rawData[data.provider] = data.rawData;
  }
  
  // Update quality indicators
  merged.quality.missingSleep = !merged.sleep.totalMinutes;
  merged.quality.missingHeart = !merged.heart.restingRate && !merged.heart.hrvMs;
  merged.quality.missingActivity = !merged.activity.steps && !merged.activity.caloriesBurned;
  merged.quality.hasCompleteData = !merged.quality.missingSleep && !merged.quality.missingHeart;
  
  return merged;
}

/**
 * Calculate sleep quality score (0-100) based on duration and stages
 * Useful when provider doesn't give a sleep score
 */
export function calculateSleepQuality(sleep: NormalizedBiometricData['sleep']): number {
  if (!sleep.totalMinutes) return 0;
  
  let score = 0;
  
  // Duration score (40 points): optimal is 7-9 hours
  const hours = sleep.totalMinutes / 60;
  if (hours >= 7 && hours <= 9) {
    score += 40;
  } else if (hours >= 6 && hours < 7) {
    score += 30;
  } else if (hours >= 5 && hours < 6) {
    score += 20;
  } else if (hours < 5 || hours > 10) {
    score += 10;
  }
  
  // Deep sleep score (30 points): optimal is 15-25% of total
  if (sleep.deepMinutes && sleep.totalMinutes) {
    const deepPercent = (sleep.deepMinutes / sleep.totalMinutes) * 100;
    if (deepPercent >= 15 && deepPercent <= 25) {
      score += 30;
    } else if (deepPercent >= 10 && deepPercent < 15) {
      score += 20;
    } else if (deepPercent >= 8 && deepPercent < 10) {
      score += 10;
    }
  }
  
  // REM sleep score (30 points): optimal is 20-25% of total
  if (sleep.remMinutes && sleep.totalMinutes) {
    const remPercent = (sleep.remMinutes / sleep.totalMinutes) * 100;
    if (remPercent >= 20 && remPercent <= 25) {
      score += 30;
    } else if (remPercent >= 15 && remPercent < 20) {
      score += 20;
    } else if (remPercent >= 10 && remPercent < 15) {
      score += 10;
    }
  }
  
  return Math.min(100, score);
}

/**
 * Get trend analysis for a metric over time
 */
export function calculateTrend(values: number[]): {
  direction: 'up' | 'down' | 'stable';
  percentage: number;
  average: number;
} {
  if (values.length < 2) {
    return { direction: 'stable', percentage: 0, average: values[0] || 0 };
  }
  
  const average = values.reduce((sum, val) => sum + val, 0) / values.length;
  const recent = values.slice(-3).reduce((sum, val) => sum + val, 0) / Math.min(3, values.length);
  const older = values.slice(0, -3).reduce((sum, val) => sum + val, 0) / Math.max(1, values.length - 3);
  
  const change = ((recent - older) / older) * 100;
  
  return {
    direction: change > 5 ? 'up' : change < -5 ? 'down' : 'stable',
    percentage: Math.abs(change),
    average,
  };
}
