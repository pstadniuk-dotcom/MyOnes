export interface TrackingPreferences {
  trackNutrition?: boolean;
  trackWorkouts?: boolean;
  trackSupplements?: boolean;
  trackLifestyle?: boolean;
  hydrationGoalOz?: number | null;
  pauseUntil?: string | null;
}

export const defaultTrackingPreferences: TrackingPreferences = {
  trackNutrition: true,
  trackWorkouts: true,
  trackSupplements: true,
  trackLifestyle: true,
  hydrationGoalOz: null,
  pauseUntil: null,
};

/** Category keys for iteration */
export type TrackingCategory = 'nutrition' | 'workouts' | 'supplements' | 'lifestyle';

/** Metadata for each category (label and corresponding pref key) */
export const categoryMeta: Record<TrackingCategory, { label: string; prefKey: keyof TrackingPreferences }> = {
  nutrition:    { label: 'Nutrition',    prefKey: 'trackNutrition' },
  workouts:     { label: 'Workouts',     prefKey: 'trackWorkouts' },
  supplements:  { label: 'Supplements',  prefKey: 'trackSupplements' },
  lifestyle:    { label: 'Lifestyle',    prefKey: 'trackLifestyle' },
};
