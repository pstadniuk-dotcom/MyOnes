/**
 * Universal Metric Catalog
 *
 * Single source of truth for every health metric that any connected
 * wearable can report.  Used by both server (statistics builder) and
 * client (dynamic dashboard tiles).
 */

// ─── Types ───────────────────────────────────────────────────────────

export type MetricPillar =
  | 'sleep'
  | 'activity'
  | 'recovery'
  | 'body'
  | 'workouts'
  | 'heart'
  | 'glucose'
  | 'nutrition';

export interface MetricDefinition {
  /** Stable key used for persistence & lookup, e.g. "sleep_duration" */
  id: string;
  /** Human label, e.g. "Sleep Duration" */
  label: string;
  /** Short dashboard label, e.g. "Sleep" */
  shortLabel: string;
  /** Unit string rendered after the value, e.g. "ms", "kcal", "" */
  unit: string;
  /** Which pillar this metric belongs to */
  pillar: MetricPillar;
  /** Dot-path into `statistics` for the aggregate value, e.g. "sleep.avgDuration" */
  statPath: string;
  /** Dot-path into `data.<category>[]` for daily sparkline values */
  sparkPath: string;
  /** Data category key in `data`, e.g. "sleep", "activity", "body", "workouts" */
  dataCategory: 'sleep' | 'activity' | 'body' | 'workouts';
  /** How the raw number should be formatted for display */
  format: 'sleep' | 'number' | 'integer' | 'decimal1' | 'percent' | 'weight' | 'distance';
  /** Sub-label shown below the value */
  subLabel: string;
  /** Visible by default on a fresh account */
  defaultVisible: boolean;
  /** Default sort order (lower = earlier in grid) */
  defaultOrder: number;
  /** Icon name from lucide-react */
  icon: string;
  /** Tailwind icon BG class */
  iconBg: string;
  /** Tailwind icon color class */
  iconColor: string;
  /** Hex accent color for sparkline */
  accentColor: string;
  /** Which providers typically supply this metric */
  providers: string[];
}

// ─── Helpers to build detail rows format string ──────────────────────

/** Provider slugs that report each metric (superset across all Junction providers) */
const SLEEP_PROVIDERS   = ['oura', 'fitbit', 'garmin', 'whoop_v2', 'withings', 'polar', 'eight_sleep', 'ultrahuman'];
const ACTIVITY_PROVIDERS = ['garmin', 'fitbit', 'oura', 'whoop_v2', 'google_fit', 'polar', 'strava', 'withings', 'peloton', 'ultrahuman', 'wahoo', 'zwift', 'hammerhead'];
const BODY_PROVIDERS     = ['withings', 'fitbit', 'oura', 'garmin', 'polar', 'ultrahuman'];
const RECOVERY_PROVIDERS = ['oura', 'whoop_v2', 'garmin', 'fitbit', 'polar', 'ultrahuman'];
const WORKOUT_PROVIDERS  = ['garmin', 'fitbit', 'strava', 'peloton', 'polar', 'whoop_v2', 'zwift', 'wahoo', 'hammerhead', 'ultrahuman'];
const HEART_PROVIDERS    = ['withings', 'omron', 'kardia', 'garmin', 'polar'];

// ─── Catalog ─────────────────────────────────────────────────────────

export const METRIC_CATALOG: MetricDefinition[] = [
  // ── Sleep ──────────────────────────────────────────────────────────
  {
    id: 'sleep_duration',
    label: 'Sleep Duration',
    shortLabel: 'Sleep',
    unit: '',
    pillar: 'sleep',
    statPath: 'sleep.avgDuration',
    sparkPath: 'totalMinutes',
    dataCategory: 'sleep',
    format: 'sleep',
    subLabel: 'avg per night',
    defaultVisible: true,
    defaultOrder: 1,
    icon: 'Moon',
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    accentColor: '#6366F1',
    providers: SLEEP_PROVIDERS,
  },
  {
    id: 'sleep_score',
    label: 'Sleep Score',
    shortLabel: 'Sleep Score',
    unit: '',
    pillar: 'sleep',
    statPath: 'sleep.avgScore',
    sparkPath: 'score',
    dataCategory: 'sleep',
    format: 'integer',
    subLabel: 'avg quality score',
    defaultVisible: false,
    defaultOrder: 2,
    icon: 'Moon',
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    accentColor: '#6366F1',
    providers: ['oura', 'fitbit', 'garmin', 'whoop_v2', 'withings', 'polar'],
  },
  {
    id: 'deep_sleep',
    label: 'Deep Sleep',
    shortLabel: 'Deep Sleep',
    unit: '',
    pillar: 'sleep',
    statPath: 'sleep.avgDeepSleep',
    sparkPath: 'deepSleepMinutes',
    dataCategory: 'sleep',
    format: 'sleep',
    subLabel: 'avg per night',
    defaultVisible: false,
    defaultOrder: 3,
    icon: 'Moon',
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-500',
    accentColor: '#6366F1',
    providers: SLEEP_PROVIDERS,
  },
  {
    id: 'rem_sleep',
    label: 'REM Sleep',
    shortLabel: 'REM',
    unit: '',
    pillar: 'sleep',
    statPath: 'sleep.avgRemSleep',
    sparkPath: 'remSleepMinutes',
    dataCategory: 'sleep',
    format: 'sleep',
    subLabel: 'avg per night',
    defaultVisible: false,
    defaultOrder: 4,
    icon: 'Moon',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    accentColor: '#8B5CF6',
    providers: SLEEP_PROVIDERS,
  },
  {
    id: 'light_sleep',
    label: 'Light Sleep',
    shortLabel: 'Light Sleep',
    unit: '',
    pillar: 'sleep',
    statPath: 'sleep.avgLightSleep',
    sparkPath: 'lightSleepMinutes',
    dataCategory: 'sleep',
    format: 'sleep',
    subLabel: 'avg per night',
    defaultVisible: false,
    defaultOrder: 5,
    icon: 'Moon',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-400',
    accentColor: '#60A5FA',
    providers: SLEEP_PROVIDERS,
  },
  {
    id: 'sleep_efficiency',
    label: 'Sleep Efficiency',
    shortLabel: 'Efficiency',
    unit: '%',
    pillar: 'sleep',
    statPath: 'sleep.avgEfficiency',
    sparkPath: 'efficiency',
    dataCategory: 'sleep',
    format: 'percent',
    subLabel: 'time asleep vs in bed',
    defaultVisible: false,
    defaultOrder: 6,
    icon: 'Moon',
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    accentColor: '#6366F1',
    providers: ['oura', 'fitbit', 'garmin', 'withings'],
  },
  {
    id: 'respiratory_rate_sleep',
    label: 'Respiratory Rate',
    shortLabel: 'Resp Rate',
    unit: 'brpm',
    pillar: 'sleep',
    statPath: 'sleep.avgRespiratoryRate',
    sparkPath: 'respiratoryRate',
    dataCategory: 'sleep',
    format: 'decimal1',
    subLabel: 'breaths per minute',
    defaultVisible: false,
    defaultOrder: 7,
    icon: 'Activity',
    iconBg: 'bg-cyan-100',
    iconColor: 'text-cyan-600',
    accentColor: '#06B6D4',
    providers: ['oura', 'fitbit', 'garmin', 'withings'],
  },

  // ── Recovery / HRV ────────────────────────────────────────────────
  {
    id: 'hrv',
    label: 'Heart Rate Variability',
    shortLabel: 'HRV',
    unit: 'ms',
    pillar: 'recovery',
    statPath: 'sleep.avgHRV',
    sparkPath: 'hrv',
    dataCategory: 'sleep',
    format: 'integer',
    subLabel: 'avg heart rate variability',
    defaultVisible: true,
    defaultOrder: 10,
    icon: 'Heart',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
    accentColor: '#EF4444',
    providers: RECOVERY_PROVIDERS,
  },
  {
    id: 'resting_hr_sleep',
    label: 'Resting Heart Rate',
    shortLabel: 'Resting HR',
    unit: 'bpm',
    pillar: 'recovery',
    statPath: 'sleep.avgRestingHR',
    sparkPath: 'restingHR',
    dataCategory: 'sleep',
    format: 'integer',
    subLabel: 'lowest overnight',
    defaultVisible: false,
    defaultOrder: 11,
    icon: 'HeartPulse',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-500',
    accentColor: '#F43F5E',
    providers: RECOVERY_PROVIDERS,
  },
  {
    id: 'readiness_score',
    label: 'Readiness Score',
    shortLabel: 'Readiness',
    unit: '',
    pillar: 'recovery',
    statPath: 'sleep.avgReadiness',
    sparkPath: 'readinessScore',
    dataCategory: 'sleep',
    format: 'integer',
    subLabel: 'recovery readiness',
    defaultVisible: false,
    defaultOrder: 12,
    icon: 'Zap',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    accentColor: '#10B981',
    providers: ['oura', 'garmin', 'fitbit'],
  },
  {
    id: 'recovery_score',
    label: 'Recovery Score',
    shortLabel: 'Recovery',
    unit: '',
    pillar: 'recovery',
    statPath: 'body.avgRecoveryScore',
    sparkPath: 'recoveryScore',
    dataCategory: 'body',
    format: 'integer',
    subLabel: 'daily recovery',
    defaultVisible: false,
    defaultOrder: 13,
    icon: 'Zap',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    accentColor: '#10B981',
    providers: ['whoop_v2', 'garmin'],
  },

  // ── Activity ───────────────────────────────────────────────────────
  {
    id: 'steps',
    label: 'Steps',
    shortLabel: 'Steps',
    unit: '',
    pillar: 'activity',
    statPath: 'activity.avgSteps',
    sparkPath: 'steps',
    dataCategory: 'activity',
    format: 'number',
    subLabel: 'avg per day',
    defaultVisible: true,
    defaultOrder: 20,
    icon: 'Footprints',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    accentColor: '#10B981',
    providers: ACTIVITY_PROVIDERS,
  },
  {
    id: 'active_calories',
    label: 'Active Calories',
    shortLabel: 'Active Cals',
    unit: 'kcal',
    pillar: 'activity',
    statPath: 'activity.avgCaloriesActive',
    sparkPath: 'caloriesActive',
    dataCategory: 'activity',
    format: 'number',
    subLabel: 'avg burned per day',
    defaultVisible: true,
    defaultOrder: 21,
    icon: 'Flame',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    accentColor: '#F59E0B',
    providers: ACTIVITY_PROVIDERS,
  },
  {
    id: 'total_calories',
    label: 'Total Calories',
    shortLabel: 'Total Cals',
    unit: 'kcal',
    pillar: 'activity',
    statPath: 'activity.avgCaloriesTotal',
    sparkPath: 'caloriesTotal',
    dataCategory: 'activity',
    format: 'number',
    subLabel: 'avg per day',
    defaultVisible: false,
    defaultOrder: 22,
    icon: 'Flame',
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    accentColor: '#EA580C',
    providers: ACTIVITY_PROVIDERS,
  },
  {
    id: 'active_minutes',
    label: 'Active Minutes',
    shortLabel: 'Active Min',
    unit: 'min',
    pillar: 'activity',
    statPath: 'activity.avgActiveMinutes',
    sparkPath: 'activeMinutes',
    dataCategory: 'activity',
    format: 'integer',
    subLabel: 'avg per day',
    defaultVisible: false,
    defaultOrder: 23,
    icon: 'Activity',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-500',
    accentColor: '#22C55E',
    providers: ACTIVITY_PROVIDERS,
  },
  {
    id: 'distance',
    label: 'Distance',
    shortLabel: 'Distance',
    unit: 'km',
    pillar: 'activity',
    statPath: 'activity.avgDistance',
    sparkPath: 'distanceMeters',
    dataCategory: 'activity',
    format: 'distance',
    subLabel: 'avg per day',
    defaultVisible: false,
    defaultOrder: 24,
    icon: 'Footprints',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    accentColor: '#10B981',
    providers: ['garmin', 'fitbit', 'strava', 'polar', 'whoop_v2', 'google_fit'],
  },
  {
    id: 'floors_climbed',
    label: 'Floors Climbed',
    shortLabel: 'Floors',
    unit: '',
    pillar: 'activity',
    statPath: 'activity.avgFloors',
    sparkPath: 'floorsClimbed',
    dataCategory: 'activity',
    format: 'integer',
    subLabel: 'avg per day',
    defaultVisible: false,
    defaultOrder: 25,
    icon: 'Activity',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    accentColor: '#10B981',
    providers: ['fitbit', 'garmin'],
  },
  {
    id: 'avg_heart_rate',
    label: 'Avg Heart Rate',
    shortLabel: 'Avg HR',
    unit: 'bpm',
    pillar: 'activity',
    statPath: 'activity.avgHeartRate',
    sparkPath: 'avgHeartRate',
    dataCategory: 'activity',
    format: 'integer',
    subLabel: 'during activity',
    defaultVisible: false,
    defaultOrder: 26,
    icon: 'HeartPulse',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-500',
    accentColor: '#F43F5E',
    providers: ['garmin', 'fitbit', 'polar', 'whoop_v2'],
  },
  {
    id: 'max_heart_rate',
    label: 'Max Heart Rate',
    shortLabel: 'Max HR',
    unit: 'bpm',
    pillar: 'activity',
    statPath: 'activity.avgMaxHeartRate',
    sparkPath: 'maxHeartRate',
    dataCategory: 'activity',
    format: 'integer',
    subLabel: 'peak during activity',
    defaultVisible: false,
    defaultOrder: 27,
    icon: 'HeartPulse',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
    accentColor: '#EF4444',
    providers: ['garmin', 'fitbit', 'polar', 'whoop_v2'],
  },

  // ── Body ───────────────────────────────────────────────────────────
  {
    id: 'weight',
    label: 'Weight',
    shortLabel: 'Weight',
    unit: 'kg',
    pillar: 'body',
    statPath: 'body.latestWeight',
    sparkPath: 'weight',
    dataCategory: 'body',
    format: 'decimal1',
    subLabel: 'latest reading',
    defaultVisible: false,
    defaultOrder: 30,
    icon: 'Scale',
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
    accentColor: '#64748B',
    providers: BODY_PROVIDERS,
  },
  {
    id: 'body_fat',
    label: 'Body Fat',
    shortLabel: 'Body Fat',
    unit: '%',
    pillar: 'body',
    statPath: 'body.latestBodyFat',
    sparkPath: 'bodyFat',
    dataCategory: 'body',
    format: 'decimal1',
    subLabel: 'latest reading',
    defaultVisible: false,
    defaultOrder: 31,
    icon: 'Scale',
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-500',
    accentColor: '#94A3B8',
    providers: ['withings', 'fitbit', 'garmin'],
  },
  {
    id: 'bmi',
    label: 'BMI',
    shortLabel: 'BMI',
    unit: '',
    pillar: 'body',
    statPath: 'body.latestBMI',
    sparkPath: 'bmi',
    dataCategory: 'body',
    format: 'decimal1',
    subLabel: 'body mass index',
    defaultVisible: false,
    defaultOrder: 32,
    icon: 'Scale',
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
    accentColor: '#64748B',
    providers: ['withings', 'fitbit'],
  },
  {
    id: 'blood_oxygen',
    label: 'Blood Oxygen',
    shortLabel: 'SpO2',
    unit: '%',
    pillar: 'body',
    statPath: 'body.avgBloodOxygen',
    sparkPath: 'bloodOxygen',
    dataCategory: 'body',
    format: 'integer',
    subLabel: 'avg oxygen saturation',
    defaultVisible: false,
    defaultOrder: 33,
    icon: 'Droplets',
    iconBg: 'bg-sky-100',
    iconColor: 'text-sky-600',
    accentColor: '#0284C7',
    providers: ['oura', 'garmin', 'fitbit', 'withings'],
  },
  {
    id: 'respiratory_rate_body',
    label: 'Respiratory Rate',
    shortLabel: 'Resp Rate',
    unit: 'brpm',
    pillar: 'body',
    statPath: 'body.avgRespiratoryRate',
    sparkPath: 'respiratoryRate',
    dataCategory: 'body',
    format: 'decimal1',
    subLabel: 'avg breaths per minute',
    defaultVisible: false,
    defaultOrder: 34,
    icon: 'Activity',
    iconBg: 'bg-cyan-100',
    iconColor: 'text-cyan-600',
    accentColor: '#06B6D4',
    providers: ['oura', 'garmin', 'fitbit', 'withings'],
  },
  {
    id: 'resting_hr_body',
    label: 'Resting Heart Rate',
    shortLabel: 'Resting HR',
    unit: 'bpm',
    pillar: 'body',
    statPath: 'body.avgRestingHR',
    sparkPath: 'restingHR',
    dataCategory: 'body',
    format: 'integer',
    subLabel: 'avg resting rate',
    defaultVisible: false,
    defaultOrder: 35,
    icon: 'HeartPulse',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-500',
    accentColor: '#F43F5E',
    providers: BODY_PROVIDERS,
  },

  // ── Workouts ───────────────────────────────────────────────────────
  {
    id: 'workout_sessions',
    label: 'Workout Sessions',
    shortLabel: 'Sessions',
    unit: '',
    pillar: 'workouts',
    statPath: 'workouts.totalCount',
    sparkPath: 'durationMinutes',
    dataCategory: 'workouts',
    format: 'integer',
    subLabel: 'total count',
    defaultVisible: true,
    defaultOrder: 40,
    icon: 'Dumbbell',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    accentColor: '#8B5CF6',
    providers: WORKOUT_PROVIDERS,
  },
  {
    id: 'workout_frequency',
    label: 'Workout Frequency',
    shortLabel: 'Per Week',
    unit: '',
    pillar: 'workouts',
    statPath: 'workouts.avgPerWeek',
    sparkPath: 'durationMinutes',
    dataCategory: 'workouts',
    format: 'decimal1',
    subLabel: 'avg frequency',
    defaultVisible: true,
    defaultOrder: 41,
    icon: 'Activity',
    iconBg: 'bg-sky-100',
    iconColor: 'text-sky-600',
    accentColor: '#0EA5E9',
    providers: WORKOUT_PROVIDERS,
  },
  {
    id: 'workout_duration',
    label: 'Workout Duration',
    shortLabel: 'Avg Duration',
    unit: '',
    pillar: 'workouts',
    statPath: 'workouts.avgDuration',
    sparkPath: 'durationMinutes',
    dataCategory: 'workouts',
    format: 'integer',
    subLabel: 'per session',
    defaultVisible: true,
    defaultOrder: 42,
    icon: 'Clock',
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-600',
    accentColor: '#14B8A6',
    providers: WORKOUT_PROVIDERS,
  },
  {
    id: 'workout_calories',
    label: 'Workout Calories',
    shortLabel: 'Workout Cal',
    unit: 'kcal',
    pillar: 'workouts',
    statPath: 'workouts.avgCalories',
    sparkPath: 'calories',
    dataCategory: 'workouts',
    format: 'number',
    subLabel: 'avg per session',
    defaultVisible: false,
    defaultOrder: 43,
    icon: 'Flame',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    accentColor: '#F59E0B',
    providers: WORKOUT_PROVIDERS,
  },
  {
    id: 'workout_avg_hr',
    label: 'Workout Avg HR',
    shortLabel: 'Workout HR',
    unit: 'bpm',
    pillar: 'workouts',
    statPath: 'workouts.avgHeartRate',
    sparkPath: 'avgHeartRate',
    dataCategory: 'workouts',
    format: 'integer',
    subLabel: 'avg during workouts',
    defaultVisible: false,
    defaultOrder: 44,
    icon: 'HeartPulse',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-500',
    accentColor: '#F43F5E',
    providers: ['garmin', 'fitbit', 'polar', 'whoop_v2', 'strava'],
  },
  {
    id: 'workout_distance',
    label: 'Workout Distance',
    shortLabel: 'Distance',
    unit: 'km',
    pillar: 'workouts',
    statPath: 'workouts.avgDistance',
    sparkPath: 'distanceMeters',
    dataCategory: 'workouts',
    format: 'distance',
    subLabel: 'avg per session',
    defaultVisible: false,
    defaultOrder: 45,
    icon: 'Footprints',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    accentColor: '#10B981',
    providers: ['garmin', 'strava', 'polar', 'zwift', 'hammerhead'],
  },
];

// ─── Lookup helpers ──────────────────────────────────────────────────

/** Map of metric id → definition for O(1) lookup */
export const METRIC_MAP = new Map(METRIC_CATALOG.map(m => [m.id, m]));

/** Metric IDs that should be visible by default */
export const DEFAULT_VISIBLE_METRICS = METRIC_CATALOG
  .filter(m => m.defaultVisible)
  .sort((a, b) => a.defaultOrder - b.defaultOrder)
  .map(m => m.id);

/** Group metrics by pillar */
export function metricsByPillar(): Record<MetricPillar, MetricDefinition[]> {
  const groups: Record<string, MetricDefinition[]> = {};
  for (const m of METRIC_CATALOG) {
    (groups[m.pillar] ??= []).push(m);
  }
  return groups as Record<MetricPillar, MetricDefinition[]>;
}

/** Which providers can supply a given metric */
export function providersForMetric(metricId: string): string[] {
  return METRIC_MAP.get(metricId)?.providers ?? [];
}

/** All metric IDs a specific provider can report */
export function metricsForProvider(providerSlug: string): string[] {
  return METRIC_CATALOG
    .filter(m => m.providers.includes(providerSlug))
    .map(m => m.id);
}
