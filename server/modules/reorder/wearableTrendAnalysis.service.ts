/**
 * Wearable Trend Analysis Service
 *
 * Analyzes 8 weeks of biometric wearable data to produce structured trend findings
 * for the Smart Re-Order AI recommendation engine. This is the data layer that
 * feeds into the AI prompt for reorder recommendations.
 */

import { wearablesRepository } from '../wearables/wearables.repository';

export interface TrendFinding {
  metric: string;       // e.g. "HRV", "Deep Sleep", "Resting HR"
  trend: 'improving' | 'declining' | 'stable';
  detail: string;       // Human-readable finding
  firstHalfAvg: number;
  secondHalfAvg: number;
  changePct: number;    // % change (positive = improving for most metrics)
}

export interface WearableTrendAnalysis {
  userId: string;
  periodStart: Date;
  periodEnd: Date;
  daysWithData: number;
  totalDays: number;
  dataQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'none';
  findings: TrendFinding[];
  /** Human-readable summary for SMS/email */
  summary: string;
  /** Raw averages for AI prompt context */
  averages: {
    sleepScore?: number;
    sleepHours?: number;
    deepSleepMinutes?: number;
    remSleepMinutes?: number;
    hrvMs?: number;
    restingHeartRate?: number;
    recoveryScore?: number;
    steps?: number;
    spo2?: number;
  };
}

/**
 * Compute average of a number array. Returns null if empty.
 */
function avg(arr: number[]): number | null {
  return arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
}

/**
 * Compute trend by comparing first half vs second half of data.
 * @param higherIsBetter - true for HRV, sleep score, deep sleep; false for resting HR
 */
function computeTrend(
  arr: number[],
  metricName: string,
  unit: string,
  higherIsBetter: boolean = true,
): TrendFinding | null {
  if (arr.length < 6) return null; // Need at least 6 data points

  const half = Math.floor(arr.length / 2);
  const firstHalfAvg = avg(arr.slice(0, half))!;
  const secondHalfAvg = avg(arr.slice(half))!;

  if (firstHalfAvg === 0) return null;

  const rawChangePct = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
  const changePct = Math.round(rawChangePct * 10) / 10;
  const isPositiveChange = higherIsBetter ? changePct > 0 : changePct < 0;

  let trend: 'improving' | 'declining' | 'stable';
  if (Math.abs(changePct) < 3) {
    trend = 'stable';
  } else if (isPositiveChange) {
    trend = 'improving';
  } else {
    trend = 'declining';
  }

  const direction = changePct > 0 ? 'up' : 'down';
  const detail = trend === 'stable'
    ? `${metricName} has been stable at ${secondHalfAvg}${unit} (±${Math.abs(changePct)}%)`
    : `${metricName} ${direction} ${Math.abs(changePct)}% (${firstHalfAvg}${unit} → ${secondHalfAvg}${unit})`;

  return {
    metric: metricName,
    trend,
    detail,
    firstHalfAvg,
    secondHalfAvg,
    changePct,
  };
}

/**
 * Determine data quality based on days with data vs total days.
 */
function getDataQuality(daysWithData: number, totalDays: number): 'excellent' | 'good' | 'fair' | 'poor' | 'none' {
  if (daysWithData === 0) return 'none';
  const ratio = daysWithData / totalDays;
  if (ratio >= 0.85) return 'excellent';
  if (ratio >= 0.65) return 'good';
  if (ratio >= 0.40) return 'fair';
  return 'poor';
}

export const wearableTrendAnalysisService = {
  /**
   * Analyze 8 weeks of biometric data for a user.
   * Returns structured findings that feed into the AI reorder recommendation prompt.
   */
  async analyze8WeekTrends(userId: string): Promise<WearableTrendAnalysis> {
    const now = new Date();
    const periodEnd = now;
    const periodStart = new Date(now.getTime() - 56 * 24 * 60 * 60 * 1000); // 8 weeks = 56 days

    const biometricDays = await wearablesRepository.getBiometricData(userId, periodStart, periodEnd);
    const totalDays = 56;
    const daysWithData = biometricDays.length;
    const dataQuality = getDataQuality(daysWithData, totalDays);

    if (daysWithData === 0) {
      return {
        userId,
        periodStart,
        periodEnd,
        daysWithData: 0,
        totalDays,
        dataQuality: 'none',
        findings: [],
        summary: 'No wearable data available for this period.',
        averages: {},
      };
    }

    // Extract metric arrays from biometric data
    // The data comes from wearablesRepository which returns raw biometric_data rows
    const sleepScores: number[] = [];
    const sleepMinutes: number[] = [];
    const deepSleepMins: number[] = [];
    const remSleepMins: number[] = [];
    const hrvValues: number[] = [];
    const restingHRs: number[] = [];
    const recoveryScores: number[] = [];
    const stepCounts: number[] = [];
    const spo2Values: number[] = [];

    for (const day of biometricDays) {
      // Handle both raw DB format and Junction-mapped format
      const sleepScore = day.sleepScore ?? day.sleep?.score;
      const totalSleep = day.sleepHours ?? day.sleep?.totalMinutes;
      const deepSleep = day.deepSleepMinutes ?? day.sleep?.deepSleepMinutes;
      const remSleep = day.remSleepMinutes ?? day.sleep?.remSleepMinutes;
      const hrv = day.hrvMs ?? day.heart?.hrvMs;
      const rhr = day.restingHeartRate ?? day.heart?.restingRate;
      const recovery = day.recoveryScore ?? day.heart?.recoveryScore;
      const steps = day.steps ?? day.activity?.steps;
      const spo2 = day.spo2Percentage ?? day.body?.spo2;

      if (sleepScore) sleepScores.push(sleepScore);
      if (totalSleep) sleepMinutes.push(totalSleep);
      if (deepSleep) deepSleepMins.push(deepSleep);
      if (remSleep) remSleepMins.push(remSleep);
      if (hrv) hrvValues.push(hrv);
      if (rhr) restingHRs.push(rhr);
      if (recovery) recoveryScores.push(recovery);
      if (steps) stepCounts.push(steps);
      if (spo2) spo2Values.push(spo2);
    }

    // Compute findings
    const findings: TrendFinding[] = [];

    const sleepScoreTrend = computeTrend(sleepScores, 'Sleep Score', '/100', true);
    if (sleepScoreTrend) findings.push(sleepScoreTrend);

    const sleepDurationTrend = computeTrend(sleepMinutes, 'Sleep Duration', 'min', true);
    if (sleepDurationTrend) findings.push(sleepDurationTrend);

    const deepSleepTrend = computeTrend(deepSleepMins, 'Deep Sleep', 'min', true);
    if (deepSleepTrend) findings.push(deepSleepTrend);

    const remSleepTrend = computeTrend(remSleepMins, 'REM Sleep', 'min', true);
    if (remSleepTrend) findings.push(remSleepTrend);

    const hrvTrend = computeTrend(hrvValues, 'HRV', 'ms', true);
    if (hrvTrend) findings.push(hrvTrend);

    const rhrTrend = computeTrend(restingHRs, 'Resting Heart Rate', 'bpm', false); // Lower is better
    if (rhrTrend) findings.push(rhrTrend);

    const recoveryTrend = computeTrend(recoveryScores, 'Recovery Score', '%', true);
    if (recoveryTrend) findings.push(recoveryTrend);

    const stepsTrend = computeTrend(stepCounts, 'Daily Steps', '', true);
    if (stepsTrend) findings.push(stepsTrend);

    // Build human-readable summary
    const summaryParts: string[] = [];
    const notable = findings.filter(f => f.trend !== 'stable');
    const declining = findings.filter(f => f.trend === 'declining');
    const improving = findings.filter(f => f.trend === 'improving');

    if (notable.length === 0) {
      summaryParts.push(`Your metrics have been stable over the past 8 weeks.`);
    } else {
      if (improving.length > 0) {
        summaryParts.push(`Improving: ${improving.map(f => f.metric).join(', ')}.`);
      }
      if (declining.length > 0) {
        summaryParts.push(`Needs attention: ${declining.map(f => f.metric).join(', ')}.`);
      }
    }

    summaryParts.push(`(${daysWithData}/${totalDays} days tracked, ${dataQuality} data quality)`);

    return {
      userId,
      periodStart,
      periodEnd,
      daysWithData,
      totalDays,
      dataQuality,
      findings,
      summary: summaryParts.join(' '),
      averages: {
        sleepScore: avg(sleepScores) ?? undefined,
        sleepHours: sleepMinutes.length > 0 ? Math.round((avg(sleepMinutes)! / 60) * 10) / 10 : undefined,
        deepSleepMinutes: avg(deepSleepMins) ?? undefined,
        remSleepMinutes: avg(remSleepMins) ?? undefined,
        hrvMs: avg(hrvValues) ?? undefined,
        restingHeartRate: avg(restingHRs) ?? undefined,
        recoveryScore: avg(recoveryScores) ?? undefined,
        steps: avg(stepCounts) ?? undefined,
        spo2: avg(spo2Values) ?? undefined,
      },
    };
  },
};
