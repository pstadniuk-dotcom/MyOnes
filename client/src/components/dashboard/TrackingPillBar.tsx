import type { TrackingPreferences } from '@/types/tracking';

interface TrackingPillBarProps {
  prefs: TrackingPreferences;
}

export function TrackingPillBar({ prefs }: TrackingPillBarProps) {
  const labels: string[] = [];
  if (prefs.trackNutrition) labels.push('Nutri');
  if (prefs.trackWorkouts) labels.push('Workout');
  if (prefs.trackSupplements) labels.push('Supp');
  if (prefs.trackLifestyle) labels.push('Life');

  // All categories on – don't clutter the UI
  if (labels.length === 4) return null;
  
  // No categories – show warning
  if (labels.length === 0) {
    return (
      <p className="text-xs text-orange-600 font-medium">
        No categories tracked
      </p>
    );
  }

  return (
    <p className="text-xs text-[#52796F]">
      Tracking: {labels.join(' · ')}
    </p>
  );
}
