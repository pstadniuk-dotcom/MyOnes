import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { 
  Pill, 
  Dumbbell, 
  Utensils, 
  Droplets,
  Check,
  ChevronRight,
  Sparkles,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  Plus,
  Settings2,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';
import type { TodayPlan } from '@/types/wellness';
import type { TrackingPreferences } from '@/types/tracking';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { LogWorkoutDialog } from '@/components/optimize/workout/LogWorkoutDialog';

interface TodayAtGlanceCardProps {
  data: TodayPlan;
  trackingPrefs?: TrackingPreferences;
  todayPercentage?: number;
  onLogSupplements?: () => void;
  onLogWater?: () => void;
  onLogWaterAmount?: (oz: number) => void;
  onLogSupplementDose?: (dose: 'morning' | 'afternoon' | 'evening', taken: boolean) => void;
}

export function TodayAtGlanceCard({ data, trackingPrefs, todayPercentage, onLogSupplements, onLogWater, onLogWaterAmount, onLogSupplementDose }: TodayAtGlanceCardProps) {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [waterInput, setWaterInput] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [localPrefs, setLocalPrefs] = useState<TrackingPreferences>(trackingPrefs || {});
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [skipReason, setSkipReason] = useState('');
  
  // Fetch workout plan for detailed logging
  const { data: workoutPlan } = useQuery<any>({
    queryKey: ['/api/optimize/plans', 'workout'],
    queryFn: async () => {
      const response = await apiRequest('/api/optimize/plans?type=workout', { method: 'GET' });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: showLogDialog, // Only fetch when dialog opens
  });
  
  // Get today's workout from the plan
  const todayDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todayWorkout = workoutPlan?.content?.weeklySchedule?.find(
    (day: any) => day.day?.toLowerCase() === todayDayName.toLowerCase()
  );
  
  // Build selectedWorkout object for LogWorkoutDialog
  const selectedWorkout = todayWorkout ? {
    workout: todayWorkout.workout,
    day: todayWorkout.day,
    dayName: todayWorkout.day,
  } : null;
  
  // Preferences with defaults
  const showSupplements = trackingPrefs?.trackSupplements !== false;
  const showWorkouts = trackingPrefs?.trackWorkouts !== false;
  const showNutrition = trackingPrefs?.trackNutrition !== false;
  const showHydration = (trackingPrefs?.hydrationGoalOz ?? 64) > 0;
  const showLifestyle = trackingPrefs?.trackLifestyle !== false;
  const hydrationGoal = trackingPrefs?.hydrationGoalOz ?? 64;
  
  const waterPercentage = Math.min((data.waterIntakeOz / (data.waterGoalOz || hydrationGoal)) * 100, 100);
  const mealsLoggedCount = data.mealsLogged.length;
  const timeOfDay = new Date().getHours();
  const GreetingIcon = timeOfDay < 17 ? Sun : Moon;
  
  // Supplement dose progress
  const supplementDosesTaken = data.supplementDosesTaken ?? 0;
  const supplementDosesTotal = data.supplementDosesTotal ?? 3;
  const allSupplementsTaken = supplementDosesTaken === supplementDosesTotal;
  const capsulesPerDose = data.capsulesPerDose ?? 2;

  // Save preferences mutation
  const savePrefs = useMutation({
    mutationFn: async (prefs: TrackingPreferences) => {
      const response = await apiRequest('/api/optimize/tracking-preferences', {
        method: 'POST',
        body: JSON.stringify(prefs),
      });
      if (!response.ok) throw new Error('Failed to save preferences');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/optimize/tracking-preferences'] });
      queryClient.invalidateQueries({ queryKey: ['/api/optimize/streaks/smart'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/wellness'] });
      setSettingsOpen(false);
    },
  });

  // Log lifestyle metrics mutation
  const logLifestyle = useMutation({
    mutationFn: async (data: { sleepQuality?: number; energyLevel?: number; moodLevel?: number }) => {
      const response = await apiRequest('/api/optimize/daily-logs', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to log lifestyle');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/wellness'] });
      queryClient.invalidateQueries({ queryKey: ['/api/optimize/streaks/smart'] });
    },
  });

  // Toggle rest day mutation with optimistic update
  const toggleRestDay = useMutation({
    mutationFn: async (isRestDay: boolean) => {
      const response = await apiRequest('/api/optimize/daily-logs', {
        method: 'POST',
        body: JSON.stringify({ isRestDay }),
      });
      if (!response.ok) throw new Error('Failed to toggle rest day');
      return response.json();
    },
    onMutate: async (isRestDay) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/dashboard/wellness'] });
      
      // Snapshot current value
      const previousWellness = queryClient.getQueryData(['/api/dashboard/wellness']);
      
      // Optimistically update
      queryClient.setQueryData(['/api/dashboard/wellness'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          today: {
            ...old.today,
            isRestDay,
          },
        };
      });
      
      return { previousWellness };
    },
    onError: (_err, _isRestDay, context) => {
      // Rollback on error
      if (context?.previousWellness) {
        queryClient.setQueryData(['/api/dashboard/wellness'], context.previousWellness);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/wellness'] });
      // Delay streak refresh to let backend catch up
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/optimize/streaks/smart'] });
      }, 500);
    },
  });

  // Quick skip workout mutation (marks as rest day) with optimistic update
  const skipWorkout = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/optimize/daily-logs', {
        method: 'POST',
        body: JSON.stringify({ isRestDay: true }),
      });
      if (!response.ok) throw new Error('Failed to skip workout');
      return response.json();
    },
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/dashboard/wellness'] });
      await queryClient.cancelQueries({ queryKey: ['/api/optimize/streaks/smart'] });
      
      // Snapshot current values
      const previousWellness = queryClient.getQueryData(['/api/dashboard/wellness']);
      const previousStreaks = queryClient.getQueryData(['/api/optimize/streaks/smart']);
      
      // Optimistically update as rest day
      queryClient.setQueryData(['/api/dashboard/wellness'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          today: {
            ...old.today,
            isRestDay: true,
          },
        };
      });
      
      // Optimistically update streak data
      queryClient.setQueryData(['/api/optimize/streaks/smart'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          todayBreakdown: old.todayBreakdown ? {
            ...old.todayBreakdown,
            workout: { done: false, isRestDay: true }
          } : old.todayBreakdown,
        };
      });
      
      return { previousWellness, previousStreaks };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousWellness) {
        queryClient.setQueryData(['/api/dashboard/wellness'], context.previousWellness);
      }
      if (context?.previousStreaks) {
        queryClient.setQueryData(['/api/optimize/streaks/smart'], context.previousStreaks);
      }
    },
    onSuccess: async () => {
      // Use refetchQueries to ensure we wait for fresh data
      await queryClient.refetchQueries({ queryKey: ['/api/dashboard/wellness'] });
      await queryClient.refetchQueries({ queryKey: ['/api/optimize/streaks/smart'] });
      setShowSkipDialog(false);
      setSkipReason('');
    },
  });

  return (
    <Card className="bg-gradient-to-br from-[#1B4332]/5 to-[#52796F]/5 border-[#1B4332]/10 hover:border-[#1B4332]/20 transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-[#1B4332] flex items-center gap-2">
            <GreetingIcon className="h-5 w-5 text-[#D4A574]" />
            Log Actions
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#52796F]">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
            <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Settings2 className="h-4 w-4 text-[#52796F]" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="end">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-[#1B4332] mb-2">Show in Today View</h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="show-supplements"
                          checked={localPrefs.trackSupplements !== false}
                          onCheckedChange={(checked) => {
                            setLocalPrefs(prev => ({ ...prev, trackSupplements: !!checked }));
                          }}
                        />
                        <Label htmlFor="show-supplements" className="flex items-center gap-2 text-sm cursor-pointer">
                          <Pill className="h-4 w-4 text-purple-600" />
                          Supplements
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="show-workouts"
                          checked={localPrefs.trackWorkouts !== false}
                          onCheckedChange={(checked) => {
                            setLocalPrefs(prev => ({ ...prev, trackWorkouts: !!checked }));
                          }}
                        />
                        <Label htmlFor="show-workouts" className="flex items-center gap-2 text-sm cursor-pointer">
                          <Dumbbell className="h-4 w-4 text-blue-600" />
                          Workouts
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="show-nutrition"
                          checked={localPrefs.trackNutrition !== false}
                          onCheckedChange={(checked) => {
                            setLocalPrefs(prev => ({ ...prev, trackNutrition: !!checked }));
                          }}
                        />
                        <Label htmlFor="show-nutrition" className="flex items-center gap-2 text-sm cursor-pointer">
                          <Utensils className="h-4 w-4 text-green-600" />
                          Nutrition
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="show-lifestyle"
                          checked={localPrefs.trackLifestyle !== false}
                          onCheckedChange={(checked) => {
                            setLocalPrefs(prev => ({ ...prev, trackLifestyle: !!checked }));
                          }}
                        />
                        <Label htmlFor="show-lifestyle" className="flex items-center gap-2 text-sm cursor-pointer">
                          <Moon className="h-4 w-4 text-amber-600" />
                          Lifestyle
                        </Label>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="hydration-goal" className="flex items-center gap-2 text-sm mb-2">
                      <Droplets className="h-4 w-4 text-cyan-600" />
                      Daily Water Goal (oz)
                    </Label>
                    <Input
                      id="hydration-goal"
                      type="number"
                      placeholder="64"
                      value={localPrefs.hydrationGoalOz ?? ''}
                      onChange={(e) => {
                        const val = e.target.value ? parseInt(e.target.value) : null;
                        setLocalPrefs(prev => ({ ...prev, hydrationGoalOz: val }));
                      }}
                      className="h-8"
                      min="0"
                      max="200"
                    />
                    <p className="text-[10px] text-[#52796F] mt-1">Set to 0 to hide hydration tracking</p>
                  </div>
                  <Button 
                    size="sm" 
                    className="w-full bg-[#1B4332] hover:bg-[#143728]"
                    onClick={() => savePrefs.mutate(localPrefs)}
                    disabled={savePrefs.isPending}
                  >
                    {savePrefs.isPending ? 'Saving...' : 'Save Settings'}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Today's Progress Bar */}
        {todayPercentage !== undefined && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-[#1B4332]">Today's Progress</h4>
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs",
                  todayPercentage >= 100 
                    ? "bg-green-100 text-green-700 border-green-300"
                    : todayPercentage >= 50
                    ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                    : "bg-gray-100 text-gray-600 border-gray-300"
                )}
              >
                {todayPercentage}% Complete
              </Badge>
            </div>
            <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
                  todayPercentage >= 100 ? "bg-green-500" :
                  todayPercentage >= 75 ? "bg-lime-400" :
                  todayPercentage >= 50 ? "bg-yellow-400" :
                  todayPercentage >= 25 ? "bg-orange-400" :
                  "bg-red-400"
                )}
                style={{ width: `${Math.min(todayPercentage, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Supplements - Inline dose tracking */}
        {showSupplements && (data.formulaName ? (
          <div className="p-3 md:p-4 rounded-xl bg-white border border-[#1B4332]/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "p-2.5 md:p-1.5 rounded-lg flex-shrink-0",
                  allSupplementsTaken ? 'bg-green-100' : 'bg-[#1B4332]/10'
                )}>
                  <Pill className={cn(
                    "h-5 w-5 md:h-4 md:w-4",
                    allSupplementsTaken ? 'text-green-600' : 'text-[#1B4332]'
                  )} />
                </div>
                <div>
                  <p className="font-medium text-sm md:text-base text-[#1B4332]">Supplements</p>
                  <p className="text-xs text-[#52796F]">{capsulesPerDose} capsules per dose</p>
                </div>
              </div>
              {allSupplementsTaken && (
                <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] px-1.5 py-0 flex-shrink-0">
                  <Check className="h-2.5 w-2.5 mr-0.5" />
                  Done
                </Badge>
              )}
            </div>
            {/* Dose buttons - larger touch targets on mobile */}
            <div className="flex gap-2">
              <button
                onClick={() => onLogSupplementDose?.('morning', !data.supplementMorning)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-3 md:py-2 px-2 rounded-lg text-sm md:text-xs font-medium transition-all touch-feedback",
                  data.supplementMorning 
                    ? "bg-green-100 text-green-700 border border-green-200" 
                    : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-[#1B4332]/5 hover:border-[#1B4332]/20"
                )}
              >
                <Sunrise className="h-4 w-4 md:h-3.5 md:w-3.5" />
                <span>AM</span>
                {data.supplementMorning && <Check className="h-3.5 w-3.5 md:h-3 md:w-3" />}
              </button>
              <button
                onClick={() => onLogSupplementDose?.('afternoon', !data.supplementAfternoon)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-3 md:py-2 px-2 rounded-lg text-sm md:text-xs font-medium transition-all touch-feedback",
                  data.supplementAfternoon 
                    ? "bg-green-100 text-green-700 border border-green-200" 
                    : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-[#1B4332]/5 hover:border-[#1B4332]/20"
                )}
              >
                <Sun className="h-4 w-4 md:h-3.5 md:w-3.5" />
                <span>Noon</span>
                {data.supplementAfternoon && <Check className="h-3.5 w-3.5 md:h-3 md:w-3" />}
              </button>
              <button
                onClick={() => onLogSupplementDose?.('evening', !data.supplementEvening)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-3 md:py-2 px-2 rounded-lg text-sm md:text-xs font-medium transition-all touch-feedback",
                  data.supplementEvening 
                    ? "bg-green-100 text-green-700 border border-green-200" 
                    : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-[#1B4332]/5 hover:border-[#1B4332]/20"
                )}
              >
                <Sunset className="h-4 w-4 md:h-3.5 md:w-3.5" />
                <span>PM</span>
                {data.supplementEvening && <Check className="h-3.5 w-3.5 md:h-3 md:w-3" />}
              </button>
            </div>
          </div>
        ) : (
          <Link href="/dashboard/chat">
            <div className="flex items-center justify-between p-3 md:p-4 rounded-xl bg-white border border-dashed border-[#1B4332]/20 hover:border-[#1B4332]/40 transition-all cursor-pointer touch-feedback">
              <div className="flex items-center gap-2">
                <div className="p-2.5 md:p-1.5 rounded-lg bg-[#1B4332]/5 flex-shrink-0">
                  <Pill className="h-5 w-5 md:h-4 md:w-4 text-[#1B4332]/50" />
                </div>
                <div>
                  <p className="font-medium text-sm md:text-base text-[#1B4332]">No Formula Yet</p>
                  <p className="text-xs text-[#52796F]">Chat to create your formula</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-[#52796F]" />
            </div>
          </Link>
        ))}

        {/* Today's Workout */}
        {showWorkouts && (
          <div className="p-3 md:p-4 rounded-xl bg-white border border-[#1B4332]/10">
            {/* Mobile: Stack layout / Desktop: Row layout */}
            <div className={isMobile ? "space-y-3" : "flex items-center justify-between"}>
              <Link href="/dashboard/optimize/workout" className={isMobile ? "flex items-center gap-3" : "flex items-center gap-3 flex-1"}>
                <div className={`p-2.5 md:p-2 rounded-lg flex-shrink-0 ${
                  data.workoutCompleted || data.isRestDay 
                    ? 'bg-green-100' 
                    : data.hasWorkoutToday 
                      ? 'bg-[#D4A574]/20' 
                      : 'bg-gray-100'
                }`}>
                  <Dumbbell className={`h-5 w-5 ${
                    data.workoutCompleted || data.isRestDay
                      ? 'text-green-600' 
                      : data.hasWorkoutToday 
                        ? 'text-[#D4A574]' 
                        : 'text-gray-400'
                  }`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm md:text-base text-[#1B4332] truncate">
                      {data.isRestDay 
                        ? 'Rest Day' 
                        : data.hasWorkoutToday 
                          ? data.workoutName || 'Today\'s Workout' 
                          : 'No Workout Scheduled'}
                    </p>
                    {/* Status badge inline on mobile */}
                    {isMobile && (data.workoutCompleted || data.isRestDay) && (
                      <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] px-1.5 py-0 flex-shrink-0">
                        <Check className="h-2.5 w-2.5 mr-0.5" />
                        {data.workoutCompleted ? 'Done' : 'Rest'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-[#52796F]">
                    {data.isRestDay 
                      ? 'Taking a recovery day'
                      : data.workoutCompleted
                        ? 'Workout completed!'
                        : data.hasWorkoutToday 
                          ? `${data.workoutExerciseCount} exercises • ${data.workoutDurationMinutes} min`
                          : 'Tap to view workout plan'}
                  </p>
                </div>
              </Link>
              
              {/* Action buttons - full width on mobile */}
              <div className={isMobile ? "flex gap-2 w-full" : "flex items-center gap-2 flex-shrink-0"}>
                {data.workoutCompleted ? (
                  !isMobile && (
                    <Badge className="bg-green-100 text-green-700 border-green-200">
                      <Check className="h-3 w-3 mr-1" />
                      Done
                    </Badge>
                  )
                ) : data.isRestDay ? (
                  !isMobile && (
                    <Badge className="bg-green-100 text-green-700 border-green-200">
                      <Check className="h-3 w-3 mr-1" />
                      Skipped
                    </Badge>
                  )
                ) : (
                  <>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className={`text-xs border-orange-200 text-orange-600 hover:bg-orange-50 touch-feedback ${
                        isMobile ? 'flex-1 h-10' : ''
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        setShowSkipDialog(true);
                      }}
                      disabled={skipWorkout.isPending}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1.5" />
                      Skip
                    </Button>
                    <Button 
                      size="sm" 
                      className={`text-xs bg-green-600 hover:bg-green-700 text-white touch-feedback ${
                        isMobile ? 'flex-1 h-10' : ''
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        setShowLogDialog(true);
                      }}
                      disabled={skipWorkout.isPending}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      Log Workout
                    </Button>
                  </>
                )}
              </div>
            </div>
            {/* Undo skip option */}
            {data.isRestDay && !data.workoutCompleted && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <Button 
                  size="sm" 
                  variant="ghost"
                  className="text-xs text-gray-500 hover:text-gray-700 w-full h-9"
                  onClick={() => toggleRestDay.mutate(false)}
                  disabled={toggleRestDay.isPending}
                >
                  Undo skip
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Today's Meals - Clickable */}
        {showNutrition && (
          <Link href="/dashboard/optimize/nutrition?view=log">
            <div className="flex items-center justify-between p-3 md:p-4 rounded-xl bg-white border border-[#1B4332]/10 hover:border-[#1B4332]/30 hover:shadow-sm transition-all cursor-pointer group touch-feedback">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`p-2.5 md:p-2 rounded-lg flex-shrink-0 ${mealsLoggedCount > 0 ? 'bg-green-100' : 'bg-[#1B4332]/10'}`}>
                  <Utensils className={`h-5 w-5 ${mealsLoggedCount > 0 ? 'text-green-600' : 'text-[#1B4332]'}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm md:text-base text-[#1B4332]">Nutrition</p>
                  <p className="text-xs text-[#52796F] truncate">
                    {mealsLoggedCount > 0 ? `${mealsLoggedCount} meal${mealsLoggedCount !== 1 ? 's' : ''} logged today` : 'Track your meals'}
                  </p>
                </div>
              </div>
              {mealsLoggedCount > 0 ? (
                <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100 flex-shrink-0">
                  <Check className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">Logged</span>
                  <span className="sm:hidden">✓</span>
                </Badge>
              ) : (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-xs border-[#1B4332]/20 text-[#1B4332] group-hover:bg-[#1B4332] group-hover:text-white flex-shrink-0"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">Log Meal</span>
                  <span className="sm:hidden">Log</span>
                </Button>
              )}
            </div>
          </Link>
        )}

        {/* Water Intake - With input */}
        {showHydration && (
          <div className="p-3 md:p-4 rounded-xl bg-white border border-[#1B4332]/10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 md:p-2 rounded-lg flex-shrink-0 ${waterPercentage >= 100 ? 'bg-blue-100' : 'bg-blue-50'}`}>
                  <Droplets className={`h-5 w-5 ${waterPercentage >= 100 ? 'text-blue-600' : 'text-blue-400'}`} />
                </div>
                <div>
                  <p className="font-medium text-sm md:text-base text-[#1B4332]">Hydration</p>
                  <p className="text-xs text-[#52796F]">{data.waterIntakeOz} / {data.waterGoalOz || hydrationGoal} oz</p>
                </div>
              </div>
              {waterPercentage >= 100 && (
                <Badge className="bg-blue-100 text-blue-700 border-blue-200 flex-shrink-0">
                  <Check className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">Goal Met</span>
                  <span className="sm:hidden">✓</span>
                </Badge>
              )}
            </div>
            <Progress 
              value={waterPercentage} 
              className="h-2.5 md:h-2 bg-blue-100 mb-3"
            />
            {/* Quick add buttons + custom input - stacked on very small screens */}
            <div className={isMobile ? "space-y-2" : "flex items-center gap-2"}>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  className="text-xs border-blue-200 text-blue-600 hover:bg-blue-50 flex-1 sm:flex-none h-10 sm:h-8 touch-feedback"
                  onClick={() => onLogWaterAmount?.(8)}
                >
                  +8 oz
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="text-xs border-blue-200 text-blue-600 hover:bg-blue-50 flex-1 sm:flex-none h-10 sm:h-8 touch-feedback"
                  onClick={() => onLogWaterAmount?.(16)}
                >
                  +16 oz
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="oz"
                  value={waterInput}
                  onChange={(e) => setWaterInput(e.target.value)}
                  className="h-10 sm:h-8 text-base sm:text-xs w-20 sm:w-16"
                  min="1"
                  max="64"
                />
                <Button 
                  size="sm" 
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white h-10 sm:h-8 px-3 sm:px-2 touch-feedback"
                  onClick={() => {
                    const oz = parseInt(waterInput);
                    if (oz > 0) {
                      onLogWaterAmount?.(oz);
                      setWaterInput('');
                    }
                  }}
                  disabled={!waterInput || parseInt(waterInput) <= 0}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Lifestyle - Sleep, Energy, Mood */}
        {showLifestyle && (
          <div className="p-3 rounded-xl bg-white border border-[#1B4332]/10">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg ${(data.sleepQuality && data.energyLevel && data.moodLevel) ? 'bg-amber-100' : 'bg-amber-50'}`}>
                <Moon className={`h-5 w-5 ${(data.sleepQuality && data.energyLevel && data.moodLevel) ? 'text-amber-600' : 'text-amber-400'}`} />
              </div>
              <div>
                <p className="font-medium text-sm text-[#1B4332]">Lifestyle Check-in</p>
                <p className="text-xs text-[#52796F]">How are you feeling today?</p>
              </div>
              {data.sleepQuality && data.energyLevel && data.moodLevel && (
                <Badge className="ml-auto bg-amber-100 text-amber-700 border-amber-200">
                  <Check className="h-3 w-3 mr-1" />
                  Logged
                </Badge>
              )}
            </div>
            <div className="space-y-3">
              <LifestyleRating 
                label="Sleep Quality" 
                value={data.sleepQuality} 
                icon="🌙" 
                onChange={(val) => logLifestyle.mutate({ sleepQuality: val })}
              />
              <LifestyleRating 
                label="Energy Level" 
                value={data.energyLevel} 
                icon="⚡" 
                onChange={(val) => logLifestyle.mutate({ energyLevel: val })}
              />
              <LifestyleRating 
                label="Mood" 
                value={data.moodLevel} 
                icon="😊" 
                onChange={(val) => logLifestyle.mutate({ moodLevel: val })}
              />
            </div>
          </div>
        )}
      </CardContent>

      {/* Log Workout Dialog */}
      {/* Log Workout Dialog - Full detailed logging with sets/weights/PRs */}
      <LogWorkoutDialog
        open={showLogDialog}
        onOpenChange={setShowLogDialog}
        selectedWorkout={selectedWorkout}
        onSuccess={() => {
          queryClient.refetchQueries({ queryKey: ['/api/optimize/workout/logs'] });
          queryClient.refetchQueries({ queryKey: ['/api/dashboard/wellness'] });
          queryClient.refetchQueries({ queryKey: ['/api/optimize/streaks/smart'] });
        }}
      />

      {/* Skip Workout Dialog */}
      <Dialog open={showSkipDialog} onOpenChange={setShowSkipDialog}>
        <DialogContent className="sm:max-w-[350px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-orange-500" />
              Skip Today's Workout
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              No worries! Rest is important too. Why are you skipping?
            </p>
            
            <div className="grid grid-cols-2 gap-2">
              {['Tired', 'Busy', 'Not feeling well', 'Other'].map((reason) => (
                <Button
                  key={reason}
                  variant={skipReason === reason ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs"
                  onClick={() => setSkipReason(reason)}
                >
                  {reason}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => {
                setShowSkipDialog(false);
                setSkipReason('');
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="outline"
              className="flex-1 border-orange-300 text-orange-600 hover:bg-orange-50"
              onClick={() => skipWorkout.mutate()}
              disabled={skipWorkout.isPending}
            >
              {skipWorkout.isPending ? 'Skipping...' : 'Skip'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Lifestyle rating component
function LifestyleRating({ 
  label, 
  value, 
  icon, 
  onChange 
}: { 
  label: string; 
  value?: number; 
  icon: string;
  onChange: (val: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-sm">{icon}</span>
        <span className="text-xs text-[#52796F]">{label}</span>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            onClick={() => onChange(rating)}
            className={cn(
              "w-7 h-7 rounded-full text-xs font-medium transition-all",
              value === rating 
                ? "bg-amber-500 text-white" 
                : "bg-gray-100 text-gray-500 hover:bg-amber-100 hover:text-amber-600"
            )}
          >
            {rating}
          </button>
        ))}
      </div>
    </div>
  );
}

// Empty state for users without optimize setup
export function TodayAtGlanceEmpty() {
  return (
    <Card className="bg-gradient-to-br from-[#1B4332]/5 to-[#52796F]/5 border-[#1B4332]/10 border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
        <div className="p-3 rounded-full bg-[#1B4332]/10 mb-4">
          <Sparkles className="h-6 w-6 text-[#1B4332]" />
        </div>
        <h3 className="font-semibold text-[#1B4332] mb-1">Your Daily Dashboard</h3>
        <p className="text-sm text-[#52796F] max-w-xs mb-4">
          Track your supplements, workouts, and meals all in one place. Start by setting up your optimize plans.
        </p>
        <Link href="/dashboard/optimize">
          <Button className="bg-[#1B4332] hover:bg-[#143728] text-white">
            <Sparkles className="h-4 w-4 mr-2" />
            Set Up Optimize
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
