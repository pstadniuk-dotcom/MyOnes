import { useRef, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';

// Components
import { TodayAtGlanceCard, TodayAtGlanceEmpty } from '@/components/dashboard/TodayAtGlanceCard';
import { SmartStreakCard, SmartStreakCardEmpty, type SmartStreakData } from '@/components/dashboard/SmartStreakCard';
import type { WellnessData } from '@/types/wellness';
import { emptyWellnessData } from '@/types/wellness';
import type { TrackingPreferences } from '@/types/tracking';
import { defaultTrackingPreferences } from '@/types/tracking';

// Derive today's completion percent from live wellness data (optimistically updated)
function getTodayPercentage(
  wellness: WellnessData,
  prefs: TrackingPreferences
) {
  const enabled = {
    workout: prefs.trackWorkouts !== false,
    nutrition: prefs.trackNutrition !== false,
    supplements: prefs.trackSupplements !== false,
    water: true,
    lifestyle: prefs.trackLifestyle !== false,
  };

  const enabledCount = Object.values(enabled).filter(Boolean).length;
  if (enabledCount === 0) return 0;

  const workoutDone = enabled.workout && (wellness.today.isRestDay || wellness.today.workoutCompleted);
  const nutritionDone = enabled.nutrition && ((wellness.today.mealsLogged?.length || 0) > 0);
  const supplementsDone = enabled.supplements && (
    wellness.today.supplementDosesTaken >= (wellness.today.supplementDosesTotal || 3)
  );
  const waterDone = enabled.water && (
    wellness.today.waterIntakeOz >= (wellness.today.waterGoalOz || 0)
  );
  const lifestyleDone = enabled.lifestyle && false; // No explicit lifestyle flag in wellness.today yet

  const completed = [workoutDone, nutritionDone, supplementsDone, waterDone, lifestyleDone].filter(Boolean).length;
  return Math.round((completed / enabledCount) * 100);
}

function TrackingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-40" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-48" />
        <Skeleton className="h-80" />
      </div>
      <Skeleton className="h-48" />
    </div>
  );
}

export default function TrackingPage() {
  const queryClient = useQueryClient();
  
  // Debounce refs to prevent rapid-fire clicks
  const waterDebounceRef = useRef<boolean>(false);
  const supplementDebounceRef = useRef<boolean>(false);

  // Wellness data (for today at a glance and personal records)
  const { data: wellnessData, isLoading: wellnessLoading } = useQuery<WellnessData>({
    queryKey: ['/api/dashboard/wellness'],
    staleTime: 1000 * 60 * 5,
  });

  // Smart streak data (new endpoint with percentage-based progress)
  const { data: smartStreakData, isLoading: streakLoading } = useQuery<SmartStreakData>({
    queryKey: ['/api/optimize/streaks/smart'],
    staleTime: 1000 * 60 * 5,
  });

  // Tracking preferences
  const { data: trackingPrefs } = useQuery<TrackingPreferences>({
    queryKey: ['/api/optimize/tracking-preferences'],
    staleTime: 1000 * 60 * 10,
  });

  // Mutation for logging supplement doses with optimistic update
  const logSupplementDose = useMutation({
    mutationFn: async ({ dose, taken }: { dose: 'morning' | 'afternoon' | 'evening', taken: boolean }) => {
      const payload: Record<string, boolean> = {};
      if (dose === 'morning') payload.supplementMorning = taken;
      if (dose === 'afternoon') payload.supplementAfternoon = taken;
      if (dose === 'evening') payload.supplementEvening = taken;
      
      const response = await apiRequest('/api/optimize/daily-logs', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to log supplement: ${response.status}`);
      }
      
      return response.json();
    },
    onMutate: async ({ dose, taken }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/dashboard/wellness'] });
      
      // Snapshot current value
      const previousWellness = queryClient.getQueryData<WellnessData>(['/api/dashboard/wellness']);
      
      // Optimistically update
      if (previousWellness) {
        const key = dose === 'morning' ? 'supplementMorning' : 
                   dose === 'afternoon' ? 'supplementAfternoon' : 'supplementEvening';
        queryClient.setQueryData<WellnessData>(['/api/dashboard/wellness'], {
          ...previousWellness,
          today: {
            ...previousWellness.today,
            [key]: taken,
            supplementDosesTaken: [
              dose === 'morning' ? taken : previousWellness.today.supplementMorning,
              dose === 'afternoon' ? taken : previousWellness.today.supplementAfternoon,
              dose === 'evening' ? taken : previousWellness.today.supplementEvening,
            ].filter(Boolean).length,
          },
        });
      }
      
      return { previousWellness };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousWellness) {
        queryClient.setQueryData(['/api/dashboard/wellness'], context.previousWellness);
      }
    },
    onSettled: () => {
      // Debounce the refetch - only refetch wellness data after mutation settles
      // The streak recalculation happens server-side in the daily-logs endpoint
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/wellness'] });
      // Delay streak refresh slightly to let backend catch up
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/optimize/streaks/smart'] });
      }, 500);
    },
  });

  // Mutation for logging water intake with optimistic update
  // Uses the dedicated log-water endpoint which adds server-side (prevents race conditions)
  const logWaterAmount = useMutation({
    mutationFn: async (oz: number) => {
      const res = await apiRequest('/api/optimize/nutrition/log-water', {
        method: 'POST',
        body: JSON.stringify({ amountOz: oz }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to log water');
      }
      return res.json();
    },
    onMutate: async (oz) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/dashboard/wellness'] });
      
      // Snapshot current value
      const previousWellness = queryClient.getQueryData<WellnessData>(['/api/dashboard/wellness']);
      
      // Optimistically update water intake
      if (previousWellness) {
        const newWaterIntake = (previousWellness.today.waterIntakeOz || 0) + oz;
        queryClient.setQueryData<WellnessData>(['/api/dashboard/wellness'], {
          ...previousWellness,
          today: {
            ...previousWellness.today,
            waterIntakeOz: newWaterIntake,
          },
        });
      }
      
      return { previousWellness };
    },
    onError: (_err, _oz, context) => {
      // Rollback on error
      if (context?.previousWellness) {
        queryClient.setQueryData(['/api/dashboard/wellness'], context.previousWellness);
      }
    },
    onSettled: () => {
      // Refetch to get server-confirmed value
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/wellness'] });
      // Delay streak refresh to let backend catch up
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/optimize/streaks/smart'] });
        waterDebounceRef.current = false; // Allow new water logs
      }, 500);
    },
  });

  // Debounced handlers to prevent rapid-fire clicks
  const handleLogWater = useCallback((oz: number) => {
    if (waterDebounceRef.current || logWaterAmount.isPending) return;
    waterDebounceRef.current = true;
    logWaterAmount.mutate(oz);
  }, [logWaterAmount]);

  const handleLogSupplement = useCallback((dose: 'morning' | 'afternoon' | 'evening', taken: boolean) => {
    if (supplementDebounceRef.current || logSupplementDose.isPending) return;
    supplementDebounceRef.current = true;
    logSupplementDose.mutate({ dose, taken }, {
      // Reset debounce ref in onSettled to ensure it works even on error
      onSettled: () => {
        supplementDebounceRef.current = false;
      },
    });
  }, [logSupplementDose]);

  const wellness = wellnessData || emptyWellnessData;
  const prefs = trackingPrefs || defaultTrackingPreferences;
  const hasData = wellness.today.hasWorkoutToday || wellness.today.hasMealPlan || wellness.hasOptimizeSetup;
  const isLoading = wellnessLoading || streakLoading;

  const todayPercentage = getTodayPercentage(wellness, prefs);

  if (isLoading) {
    return (
      <div className="w-full px-4 py-4 md:max-w-6xl md:mx-auto space-y-4 md:space-y-6" data-testid="page-tracking">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-[#1B4332] mb-1">Tracking</h1>
          <p className="text-sm md:text-base text-[#52796F]">Monitor your daily progress</p>
        </div>
        <TrackingSkeleton />
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-4 md:max-w-6xl md:mx-auto space-y-4 md:space-y-6" data-testid="page-tracking">
      {/* Page Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-semibold text-[#1B4332] mb-1">Tracking</h1>
        <p className="text-sm md:text-base text-[#52796F]">Monitor your daily progress</p>
      </div>

      {hasData ? (
        <div className="space-y-4">
          {/* Section Header */}
          <h2 className="text-base md:text-lg font-semibold text-[#1B4332] flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Today's Wellness
          </h2>
          
          {/* Main Layout: Today at a Glance + Smart Streak Card */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            <TodayAtGlanceCard 
              data={wellness.today}
              trackingPrefs={prefs}
              todayPercentage={todayPercentage}
              onLogSupplementDose={handleLogSupplement}
              onLogWaterAmount={handleLogWater}
            />
            {smartStreakData ? (
              <SmartStreakCard 
                data={smartStreakData}
                trackingPrefs={prefs}
              />
            ) : (
              <SmartStreakCardEmpty />
            )}
          </div>
        </div>
      ) : (
        // Empty state for users without tracking data
        <div className="space-y-4">
          <h2 className="text-base md:text-lg font-semibold text-[#1B4332] flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Get Started with Tracking
          </h2>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            <TodayAtGlanceEmpty />
            <SmartStreakCardEmpty />
          </div>
        </div>
      )}
    </div>
  );
}
