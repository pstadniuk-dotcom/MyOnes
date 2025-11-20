import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dumbbell, 
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Calendar
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getQueryFn, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';

interface OptimizePlan {
  id: string;
  planType: 'nutrition' | 'workout' | 'lifestyle';
  isActive: boolean;
  content: any;
  rationale: string;
  createdAt: string;
}

interface HealthProfile {
  id: string;
  age?: number;
  sex?: string;
}

interface RecoveryTip {
  text: string;
  reason?: string;
}

const WEEKDAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TAB_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const FULL_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
const RANGE_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const addDays = (date: Date, days: number) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const normalizeDayName = (value?: string) => value?.toLowerCase().trim();

const getScheduleLabel = (schedule: Record<string, string> | undefined, weekday: string) => {
  if (!schedule) return undefined;
  return schedule[weekday] || schedule[capitalize(weekday)];
};

const getPlanStartDate = (createdAt?: string) => {
  const raw = createdAt ? new Date(createdAt) : new Date();
  const base = new Date(raw);
  base.setHours(0, 0, 0, 0);
  const currentDay = base.getDay();
  const offset = currentDay === 0 ? -6 : 1 - currentDay;
  return addDays(base, offset);
};

const getWeekRangeLabel = (start: Date) => {
  const end = addDays(start, 6);
  return `${RANGE_FORMATTER.format(start)} – ${RANGE_FORMATTER.format(end)}`;
};

const getWorkoutDayIndex = (workout: any, schedule?: Record<string, string>) => {
  if (typeof workout?.dayOfWeek === 'number') return workout.dayOfWeek - 1;
  if (typeof workout?.dayOfWeek === 'string') {
    const parsed = parseInt(workout.dayOfWeek, 10);
    if (!Number.isNaN(parsed)) return parsed - 1;
  }
  if (workout?.dayName) {
    const normalized = normalizeDayName(workout.dayName);
    const idx = WEEKDAY_KEYS.findIndex((day) => normalized === day || normalized?.startsWith(day.slice(0, 3)));
    if (idx >= 0) return idx;
  }
  if (schedule && workout?.workoutName) {
    const matchIdx = WEEKDAY_KEYS.findIndex((day) => {
      const scheduled = getScheduleLabel(schedule, day);
      return scheduled && scheduled.toLowerCase() === workout.workoutName.toLowerCase();
    });
    if (matchIdx >= 0) return matchIdx;
  }
  return null;
};

const normalizeRecoveryTips = (tips?: any[]): RecoveryTip[] => {
  if (!Array.isArray(tips)) return [];
  return tips
    .map((tip) => {
      if (!tip) return null;
      if (typeof tip === 'string') return { text: tip };
      if (typeof tip === 'object') {
        const text = tip.practice || tip.habit || tip.tip || tip.activity || tip.text;
        if (!text) return null;
        return { text, reason: tip.reason };
      }
      return null;
    })
    .filter(Boolean) as RecoveryTip[];
};

const findRecoveryTipForDay = (tips: RecoveryTip[], weekdayKey: string): RecoveryTip | undefined => {
  if (!tips.length) return undefined;
  const dayName = WEEKDAY_SHORT[WEEKDAY_KEYS.indexOf(weekdayKey)] || weekdayKey;
  const match = tips.find((tip) => tip.text.toLowerCase().includes(dayName.toLowerCase()));
  return match || tips[0];
};

export default function WorkoutPlanPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: healthProfile } = useQuery<HealthProfile>({
    queryKey: ['/api/users/me/health-profile'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  const { data: plans } = useQuery<OptimizePlan[]>({
    queryKey: ['/api/optimize/plans'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  const workoutPlan = plans?.find((p: OptimizePlan) => p.planType === 'workout' && p.isActive);

  const [activeDay, setActiveDay] = useState('day-1');

  useEffect(() => {
    setActiveDay('day-1');
  }, [workoutPlan?.id]);

  const planStartDate = useMemo(() => getPlanStartDate(workoutPlan?.createdAt), [workoutPlan?.createdAt]);
  const weekRangeLabel = useMemo(() => getWeekRangeLabel(planStartDate), [planStartDate]);

  const workoutByDay = useMemo(() => {
    const map = new Map<number, any>();
    if (!workoutPlan?.content?.workouts) return map;
    workoutPlan.content.workouts.forEach((workout: any) => {
      const idx = getWorkoutDayIndex(workout, workoutPlan.content.weeklySchedule);
      if (idx !== null && idx >= 0 && idx < 7) {
        map.set(idx, workout);
      }
    });
    return map;
  }, [workoutPlan?.content?.workouts, workoutPlan?.content?.weeklySchedule]);

  const recoveryTips = useMemo(
    () => normalizeRecoveryTips(workoutPlan?.content?.recoveryProtocol?.dailyRecovery),
    [workoutPlan?.content?.recoveryProtocol?.dailyRecovery]
  );

  const weekTabs = useMemo(() => {
    return WEEKDAY_KEYS.map((weekday, idx) => {
      const date = addDays(planStartDate, idx);
      const workout = workoutByDay.get(idx);
      const scheduleLabel = getScheduleLabel(workoutPlan?.content?.weeklySchedule, weekday);
      const restTip = findRecoveryTipForDay(recoveryTips, weekday);
      return {
        value: `day-${idx + 1}`,
        tabLabel: WEEKDAY_SHORT[idx],
        dateLabel: TAB_DATE_FORMATTER.format(date),
        fullDateLabel: FULL_DATE_FORMATTER.format(date),
        workout,
        scheduleLabel,
        restTip,
      };
    });
  }, [planStartDate, workoutByDay, workoutPlan?.content?.weeklySchedule, recoveryTips]);

  const formatExerciseMeta = (ex: any) => {
    const parts: string[] = [];
    if (ex.sets && ex.reps) {
      parts.push(`${ex.sets} sets × ${ex.reps}`);
    } else if (ex.duration) {
      parts.push(ex.duration);
    }
    if (ex.rest) {
      parts.push(`Rest ${ex.rest}`);
    }
    return parts.join(' | ');
  };

  const generatePlan = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/optimize/plans/generate', {
        planTypes: ['workout'],
        preferences: {}
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/optimize/plans'] });
      toast({
        title: 'Plan Generated',
        description: 'Your workout plan is ready!',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: error.message,
      });
    },
  });

  const isProfileComplete = !!healthProfile;

  if (!isProfileComplete) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Workout Plan</h1>
          <p className="text-muted-foreground">
            AI-powered exercise programs with progressions and form guidance
          </p>
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Dumbbell className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Complete Your Health Profile</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              To unlock AI-powered workout plans, we need to understand your fitness level, goals, and any injuries or limitations.
            </p>
            <Link href="/dashboard/profile">
              <Button>
                <Sparkles className="mr-2 h-4 w-4" />
                Set Up Health Profile
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!workoutPlan) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Workout Plan</h1>
          <p className="text-muted-foreground">
            AI-powered exercise programs with progressions and form guidance
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-blue-50 p-4 mb-4">
              <Dumbbell className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Generate Your Workout Plan</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Our AI will create a personalized exercise program based on your fitness level, goals, and any injuries.
            </p>
            <Button 
              onClick={() => generatePlan.mutate()}
              disabled={generatePlan.isPending}
            >
              {generatePlan.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Plan...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Workout Plan
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Workout Plan</h1>
          <p className="text-muted-foreground">
            Generated {new Date(workoutPlan.createdAt).toLocaleDateString()}
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => generatePlan.mutate()}
          disabled={generatePlan.isPending}
        >
          {generatePlan.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Regenerating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Regenerate Plan
            </>
          )}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            Why This Plan?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {workoutPlan.rationale || 'This plan is tailored to your fitness level and goals.'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Weekly Program
          </CardTitle>
          <CardDescription>
            Week of {weekRangeLabel}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeDay} onValueChange={setActiveDay} className="space-y-4">
            <TabsList className="w-full flex-wrap gap-2 bg-transparent p-0">
              {weekTabs.map((day) => (
                <TabsTrigger
                  key={day.value}
                  value={day.value}
                  className="flex h-auto min-w-[90px] flex-col gap-1 rounded-lg border px-3 py-2 text-left"
                >
                  <span className="text-xs font-medium uppercase text-muted-foreground tracking-wide">{day.tabLabel}</span>
                  <span className="text-sm font-semibold text-foreground">{day.dateLabel}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {weekTabs.map((day) => (
              <TabsContent key={day.value} value={day.value}>
                {day.workout ? (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-4">
                      <div className="flex flex-col gap-1">
                        <p className="text-lg font-semibold">{day.workout.workoutName}</p>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">{day.fullDateLabel}</p>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {day.workout.totalDuration && (
                            <Badge variant="secondary" className="bg-white/80 text-foreground">
                              {day.workout.totalDuration} min
                            </Badge>
                          )}
                          {day.scheduleLabel && (
                            <Badge variant="outline" className="border-blue-200 text-blue-700">
                              {day.scheduleLabel}
                            </Badge>
                          )}
                        </div>
                        {day.workout.healthFocus && (
                          <p className="text-xs text-muted-foreground mt-2">Why: {day.workout.healthFocus}</p>
                        )}
                      </div>
                    </div>

                    {day.workout.warmup?.exercises && day.workout.warmup.exercises.length > 0 && (
                      <div className="rounded border p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Warm-Up</p>
                        <div className="mt-2 space-y-2">
                          {day.workout.warmup.exercises.map((ex: any, idx: number) => (
                            <div key={`warmup-${day.value}-${idx}`} className="rounded bg-muted/60 p-2 text-sm">
                              <p className="font-medium">{ex.name}</p>
                              <p className="text-xs text-muted-foreground">{formatExerciseMeta(ex)}</p>
                              {ex.healthBenefits && (
                                <p className="text-xs text-muted-foreground mt-1">{ex.healthBenefits}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {day.workout.mainWorkout?.exercises && (
                      <div className="space-y-2">
                        {day.workout.mainWorkout.exercises.map((ex: any, idx: number) => (
                          <div key={`main-${day.value}-${idx}`} className="rounded-lg border p-3 text-sm">
                            <p className="font-medium">{ex.name}</p>
                            <p className="text-xs text-muted-foreground">{formatExerciseMeta(ex)}</p>
                            {ex.healthBenefits && (
                              <p className="text-xs text-muted-foreground mt-1">{ex.healthBenefits}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {day.workout.cooldown?.exercises && day.workout.cooldown.exercises.length > 0 && (
                      <div className="rounded border p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cool Down</p>
                        <div className="mt-2 space-y-2">
                          {day.workout.cooldown.exercises.map((ex: any, idx: number) => (
                            <div key={`cool-${day.value}-${idx}`} className="rounded bg-muted/60 p-2 text-sm">
                              <p className="font-medium">{ex.name}</p>
                              <p className="text-xs text-muted-foreground">{formatExerciseMeta(ex)}</p>
                              {ex.healthBenefits && (
                                <p className="text-xs text-muted-foreground mt-1">{ex.healthBenefits}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-4">
                    <p className="font-semibold">Active Recovery / Rest Day</p>
                    <p className="text-sm text-muted-foreground">
                      Use today for light movement, mobility work, or mindful breathing so your nervous system can reset.
                    </p>
                    {day.restTip ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Suggested: {day.restTip.text}
                        {day.restTip.reason ? ` — ${day.restTip.reason}` : ''}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Suggested: 10 min mobility + 20 min zone 2 walk + deep breathing before bed.
                      </p>
                    )}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily Progress</CardTitle>
          <CardDescription>
            Track your workout completion (coming soon)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <p className="text-sm">Daily logging feature in development</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
