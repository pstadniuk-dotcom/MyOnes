import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Dumbbell, 
  Sparkles,
  Loader2,
  CheckCircle2,
  TrendingUp,
  Flame,
  Clock,
  Target,
  Calendar,
  PlayCircle,
  Info,
  Trophy,
  Zap,
  Heart
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface WorkoutPlanTabProps {
  plan: any;
  healthProfile: any;
}

const WEEKDAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const addDays = (date: Date, days: number) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const getPlanStartDate = (createdAt?: string) => {
  const raw = createdAt ? new Date(createdAt) : new Date();
  const base = new Date(raw);
  base.setHours(0, 0, 0, 0);
  const currentDay = base.getDay();
  const offset = currentDay === 0 ? -6 : 1 - currentDay;
  return addDays(base, offset);
};

const getWorkoutDayIndex = (workout: any) => {
  if (typeof workout?.dayOfWeek === 'number') return workout.dayOfWeek - 1;
  if (workout?.dayName) {
    const normalized = workout.dayName.toLowerCase().trim();
    const idx = WEEKDAY_KEYS.findIndex((day) => normalized === day || normalized?.startsWith(day.slice(0, 3)));
    if (idx >= 0) return idx;
  }
  return null;
};

export function WorkoutPlanTab({ plan, healthProfile }: WorkoutPlanTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeDay, setActiveDay] = useState('day-1');

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
        title: '💪 Plan Generated!',
        description: 'Your personalized workout program is ready.',
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

  // Calculate week tabs
  const weekTabs = useMemo(() => {
    if (!plan?.createdAt) return [];
    
    const planStart = getPlanStartDate(plan.createdAt);
    const workouts = plan?.content?.workouts || [];
    const schedule = plan?.content?.schedule || {};
    
    return WEEKDAY_KEYS.map((weekdayKey, dayNumber) => {
      const currentDate = addDays(planStart, dayNumber);
      const dateLabel = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(currentDate);
      const fullDateLabel = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(currentDate);
      
      // Find workout for this day
      const workout = workouts.find((w: any) => {
        const idx = getWorkoutDayIndex(w);
        return idx === dayNumber;
      });
      
      const scheduledType = schedule[weekdayKey] || schedule[weekdayKey.charAt(0).toUpperCase() + weekdayKey.slice(1)];
      
      return {
        value: `day-${dayNumber + 1}`,
        tabLabel: WEEKDAY_SHORT[dayNumber],
        dateLabel,
        fullDateLabel,
        workout,
        scheduledType,
        isRestDay: scheduledType?.toLowerCase() === 'rest' || (!workout && !scheduledType)
      };
    });
  }, [plan]);

  if (!plan) {
    return (
      <div className="space-y-6">
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/30">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 p-4 mb-4 shadow-lg">
              <Dumbbell className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-2xl font-semibold mb-2">Generate Your Workout Plan</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Our AI will create a personalized training program based on your fitness level, 
              goals, and recovery capacity from your biometric data.
            </p>
            
            {/* Benefits Grid */}
            <div className="grid grid-cols-2 gap-3 w-full max-w-lg mb-6">
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <span>Science-based periodization</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <span>Progressive overload built-in</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <span>Recovery-optimized schedule</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <span>Video form cues</span>
              </div>
            </div>
            
            <Button 
              size="lg"
              onClick={() => generatePlan.mutate()}
              disabled={generatePlan.isPending}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg"
            >
              {generatePlan.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating Your Program...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Generate Workout Plan
                </>
              )}
            </Button>
            
            <p className="text-xs text-muted-foreground mt-4">Takes about 30 seconds</p>
          </CardContent>
        </Card>

        {/* Educational Cards */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <Target className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle className="text-base">Goal-Optimized</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Whether you're building muscle, losing fat, or improving performance, your plan adapts.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <Heart className="h-8 w-8 text-red-600 mb-2" />
              <CardTitle className="text-base">Recovery-Aware</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Integrates HRV, sleep quality, and stress levels to prevent overtraining.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <TrendingUp className="h-8 w-8 text-green-600 mb-2" />
              <CardTitle className="text-base">Progressive</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Automatic progression based on your performance and recovery metrics.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const weekRangeLabel = weekTabs.length > 0 
    ? `${weekTabs[0].dateLabel} – ${weekTabs[6].dateLabel}`
    : '';

  // Mock progress data
  const workoutsCompleted = 12;
  const workoutsThisWeek = 4;
  const weeklyGoal = 5;

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Active Program
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Week {Math.floor((Date.now() - new Date(plan.createdAt).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {weekRangeLabel}
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => generatePlan.mutate()}
          disabled={generatePlan.isPending}
          className="shadow-sm"
        >
          {generatePlan.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Regenerating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Regenerate
            </>
          )}
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/30 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Trophy className="h-5 w-5 text-blue-600" />
              <span className="text-xs text-muted-foreground">All Time</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">{workoutsCompleted}</p>
            <p className="text-xs text-muted-foreground">Workouts</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/30 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Flame className="h-5 w-5 text-purple-600" />
              <span className="text-xs text-muted-foreground">This Week</span>
            </div>
            <p className="text-2xl font-bold text-purple-700">{workoutsThisWeek}/{weeklyGoal}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100/30 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Zap className="h-5 w-5 text-green-600" />
              <span className="text-xs text-muted-foreground">Est.</span>
            </div>
            <p className="text-2xl font-bold text-green-700">2,450</p>
            <p className="text-xs text-muted-foreground">Cal/Workout</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100/30 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <span className="text-xs text-muted-foreground">Average</span>
            </div>
            <p className="text-2xl font-bold text-orange-700">58m</p>
            <p className="text-xs text-muted-foreground">Duration</p>
          </CardContent>
        </Card>
      </div>

      {/* Rationale */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50/50 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="h-5 w-5 text-blue-600" />
            Training Philosophy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {plan.rationale || 'This program is designed to match your fitness level, goals, and recovery capacity.'}
          </p>
        </CardContent>
      </Card>

      {/* Weekly Schedule */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Your Weekly Training Schedule
              </CardTitle>
              <CardDescription className="mt-1">
                {plan.content?.schedule ? 'Follow your personalized split' : 'Custom workout program'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeDay} onValueChange={setActiveDay} className="space-y-6">
            {/* Day Selector */}
            <TabsList className="w-full grid grid-cols-7 gap-2 bg-transparent p-0 h-auto">
              {weekTabs.map((day, idx) => {
                const isToday = idx === new Date().getDay() - 1 || (new Date().getDay() === 0 && idx === 6);
                
                return (
                  <TabsTrigger
                    key={day.value}
                    value={day.value}
                    className={`
                      flex flex-col gap-2 p-3 rounded-xl border-2 transition-all
                      ${day.isRestDay 
                        ? 'data-[state=active]:border-purple-500 data-[state=active]:bg-purple-50' 
                        : 'data-[state=active]:border-blue-500 data-[state=active]:bg-blue-50'
                      }
                      ${isToday ? 'ring-2 ring-blue-200' : ''}
                    `}
                  >
                    <span className="text-xs font-medium text-muted-foreground">
                      {day.tabLabel}
                    </span>
                    <span className="text-sm font-semibold">
                      {day.dateLabel.split(' ')[1]}
                    </span>
                    {day.isRestDay ? (
                      <Badge variant="secondary" className="text-[10px] py-0 px-1 bg-purple-100 text-purple-700">
                        Rest
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] py-0 px-1 bg-blue-100 text-blue-700">
                        Train
                      </Badge>
                    )}
                    {isToday && (
                      <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-blue-500 animate-pulse" />
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {/* Day Content */}
            {weekTabs.map((day) => (
              <TabsContent key={day.value} value={day.value} className="mt-0 space-y-4">
                {/* Day Header */}
                <div className={`
                  rounded-xl border-2 p-4
                  ${day.isRestDay 
                    ? 'border-purple-100 bg-gradient-to-r from-purple-50 to-pink-50/30' 
                    : 'border-blue-100 bg-gradient-to-r from-blue-50 to-cyan-50/30'
                  }
                `}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className={`text-xl font-semibold ${day.isRestDay ? 'text-purple-900' : 'text-blue-900'}`}>
                        {day.scheduledType || (day.isRestDay ? 'Active Recovery' : 'Training Day')}
                      </h3>
                      <p className={`text-sm ${day.isRestDay ? 'text-purple-700' : 'text-blue-700'}`}>
                        {day.fullDateLabel}
                      </p>
                    </div>
                    {day.workout && (
                      <Badge variant="outline" className="bg-white shadow-sm">
                        <Clock className="h-3 w-3 mr-1" />
                        {day.workout.duration || '45-60'} min
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Workout Content */}
                {day.isRestDay ? (
                  <Card className="border-purple-200 bg-purple-50/50">
                    <CardContent className="p-6 text-center">
                      <Heart className="h-12 w-12 text-purple-600 mx-auto mb-3" />
                      <h4 className="font-semibold text-lg mb-2">Recovery Day</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Your body needs time to adapt and grow stronger
                      </p>
                      <div className="grid md:grid-cols-3 gap-3 text-left">
                        <div className="bg-white p-3 rounded-lg">
                          <p className="text-xs font-medium text-purple-700 mb-1">Light Activity</p>
                          <p className="text-xs text-muted-foreground">20-30 min walk or yoga</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <p className="text-xs font-medium text-purple-700 mb-1">Mobility Work</p>
                          <p className="text-xs text-muted-foreground">Focus on tight areas</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <p className="text-xs font-medium text-purple-700 mb-1">Nutrition</p>
                          <p className="text-xs text-muted-foreground">Maintain protein intake</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : day.workout?.exercises ? (
                  <div className="space-y-3">
                    {day.workout.exercises.map((exercise: any, idx: number) => (
                      <Card key={idx} className="group hover:shadow-md transition-all hover:border-blue-200">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold flex-shrink-0">
                              {idx + 1}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between gap-4 mb-2">
                                <div>
                                  <h4 className="font-semibold text-lg">{exercise.name}</h4>
                                  {exercise.muscleGroup && (
                                    <p className="text-xs text-muted-foreground capitalize">
                                      {exercise.muscleGroup}
                                    </p>
                                  )}
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <PlayCircle className="h-4 w-4 mr-2" />
                                  Watch
                                </Button>
                              </div>
                              
                              {/* Sets & Reps */}
                              <div className="flex flex-wrap gap-2 mb-2">
                                {exercise.sets && (
                                  <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                                    {exercise.sets} sets
                                  </Badge>
                                )}
                                {exercise.reps && (
                                  <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                                    {exercise.reps} reps
                                  </Badge>
                                )}
                                {exercise.weight && (
                                  <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                                    {exercise.weight}
                                  </Badge>
                                )}
                                {exercise.rest && (
                                  <Badge variant="outline" className="text-xs">
                                    Rest: {exercise.rest}
                                  </Badge>
                                )}
                              </div>

                              {/* Notes */}
                              {exercise.notes && (
                                <p className="text-sm text-muted-foreground flex items-start gap-2">
                                  <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                  {exercise.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                      <Dumbbell className="h-8 w-8 text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">
                        No workout details available
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Regenerate your plan for detailed exercise prescriptions
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Recovery Tips */}
      {plan.content?.recoveryTips && plan.content.recoveryTips.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-600" />
              Recovery Optimization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-3">
              {plan.content.recoveryTips.map((tip: any, idx: number) => {
                const tipText = typeof tip === 'string' ? tip : tip.text;
                const reason = typeof tip === 'object' ? tip.reason : null;
                
                return (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-sm">{tipText}</span>
                      {reason && (
                        <p className="text-xs text-muted-foreground mt-1">{reason}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
