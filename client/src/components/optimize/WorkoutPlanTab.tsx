import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { Dumbbell, Sparkles, Calendar, History, BarChart3, PlayCircle, Info, ExternalLink, Shuffle, Edit, CheckCircle2, AlertCircle } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { OptimizeLogsByDate } from '@/types/optimize';
import { WorkoutSchedule } from './workout/WorkoutSchedule';
import { WorkoutHistory } from './workout/WorkoutHistory';
import { WorkoutAnalytics } from './workout/WorkoutAnalytics';
import { WorkoutPreferencesDialog } from './workout/WorkoutPreferencesDialog';
import { DynamicExerciseLogger } from './workout/DynamicExerciseLogger';

interface WorkoutPlanTabProps {
  plan: any;
  healthProfile: any;
  dailyLogsByDate?: OptimizeLogsByDate;
  logsLoading?: boolean;
}

export function WorkoutPlanTab({ plan, healthProfile, dailyLogsByDate, logsLoading }: WorkoutPlanTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPreferences, setShowPreferences] = useState(false);
  const [loggingExercise, setLoggingExercise] = useState<any>(null);
  const [completedExercises, setCompletedExercises] = useState<Record<string, any>>({});
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(-1);
  const [playingVideo, setPlayingVideo] = useState<{ id: string; title: string } | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('schedule');
  const [showIncompleteAlert, setShowIncompleteAlert] = useState(false);

  // Generate a stable key for workout progress storage
  // Uses plan ID + day name since workout.id might not exist
  const getWorkoutStorageKey = (workout: any, dayIndex: number) => {
    const planId = plan?.id || 'unknown';
    const dayName = workout?.dayName || `day_${dayIndex}`;
    return `workout_progress_${planId}_${dayName}`;
  };

  // Load progress from local storage when workout is selected
  useEffect(() => {
    if (selectedWorkout && selectedDayIndex !== -1 && plan?.id) {
      const key = getWorkoutStorageKey(selectedWorkout, selectedDayIndex);
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          console.log('📂 Loaded workout progress from storage:', key, parsed);
          setCompletedExercises(parsed);
        } catch (e) {
          console.error("Failed to parse saved workout progress", e);
          setCompletedExercises({});
        }
      } else {
        setCompletedExercises({});
      }
    }
  }, [selectedWorkout?.dayName, selectedDayIndex, plan?.id]);

  // Save progress to local storage whenever it changes
  useEffect(() => {
    if (selectedWorkout && selectedDayIndex !== -1 && plan?.id) {
      const key = getWorkoutStorageKey(selectedWorkout, selectedDayIndex);
      if (Object.keys(completedExercises).length > 0) {
        console.log('💾 Saving workout progress to storage:', key, completedExercises);
        localStorage.setItem(key, JSON.stringify(completedExercises));
      }
    }
  }, [completedExercises, selectedWorkout?.dayName, selectedDayIndex, plan?.id]);

  const { data: workoutLogsData } = useQuery<any>({
    queryKey: ['/api/optimize/workout/logs'],
  });

  const workoutLogs = workoutLogsData?.logs || [];

  const generatePlan = useMutation({
    mutationFn: async (prefs: any) => {
      const res = await apiRequest('POST', '/api/optimize/plans/generate', {
        planTypes: ['workout'],
        preferences: prefs
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/optimize/plans'] });
      setShowPreferences(false);
      toast({
        title: '💪 Plan Generated!',
        description: 'Your personalized workout program is ready.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to generate plan. Please try again.',
        variant: 'destructive',
      });
    }
  });

  const switchWorkout = useMutation({
    mutationFn: async ({ dayIndex, exerciseIndex }: { dayIndex: number; exerciseIndex: number }) => {
      const res = await apiRequest('POST', '/api/optimize/workout/switch', {
        dayIndex,
        exerciseIndex,
        reason: 'User requested alternative exercise',
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to switch exercise');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/optimize/plans'] });
      toast({
        title: '🔄 Exercise Switched!',
        description: 'A new exercise has been generated.',
      });
      // Update selected workout with new exercise immediately
      if (selectedWorkout && data.newExercise) {
        const updatedExercises = [...selectedWorkout.workout.exercises];
        updatedExercises[variables.exerciseIndex] = data.newExercise;
        setSelectedWorkout({
          ...selectedWorkout,
          workout: {
            ...selectedWorkout.workout,
            exercises: updatedExercises,
          },
        });
      }
    },
    onError: (error: Error) => {
      console.error('❌ Failed to switch exercise:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to switch exercise. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const finishWorkout = useMutation({
    mutationFn: async () => {
      const exercisesCompleted = Object.values(completedExercises);
      
      console.log('🏋️ Finishing workout with exercises:', exercisesCompleted);
      console.log('📋 Completed exercises state:', completedExercises);
      
      const res = await apiRequest('POST', '/api/optimize/workout/logs', {
        workoutId: selectedWorkout?.workout?.id,
        workoutName: selectedWorkout?.workout?.name || selectedWorkout?.day || 'Workout',
        completedAt: new Date().toISOString(),
        durationActual: selectedWorkout?.workout?.durationMinutes || 45,
        difficultyRating: 3, // Default
        notes: "Logged via Quick Log",
        exercisesCompleted,
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to log workout');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/optimize/workout/logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/optimize/analytics/workout'] });
      
      // Clear local storage for this workout using the same key function
      if (selectedWorkout && selectedDayIndex !== -1 && plan?.id) {
        const key = getWorkoutStorageKey(selectedWorkout, selectedDayIndex);
        console.log('🗑️ Clearing workout progress from storage:', key);
        localStorage.removeItem(key);
      }
      
      setCompletedExercises({});
      toast({
        title: 'Workout Logged!',
        description: 'Great job! Your progress has been saved.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const deleteWorkoutLog = useMutation({
    mutationFn: async (logId: string) => {
      const res = await apiRequest('DELETE', `/api/optimize/workout/logs/${logId}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete workout');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/optimize/workout/logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/optimize/analytics/workout'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/wellness'] });
      toast({
        title: 'Workout Deleted',
        description: 'The workout session has been removed from your history.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const handleWorkoutClick = (workout: any, index: number) => {
    setSelectedWorkout(workout);
    setSelectedDayIndex(index);
    // Don't open dialog immediately, show details below instead
    // setShowLogDialog(true);
  };

  const handleWorkoutLogged = () => {
    // Move to next unlogged workout
    const weekPlan = plan?.content?.weekPlan || [];
    
    // Find next workout day (skip rest days)
    for (let i = selectedDayIndex + 1; i < weekPlan.length; i++) {
      if (!weekPlan[i].isRestDay) {
        setSelectedWorkout(weekPlan[i]);
        setSelectedDayIndex(i);
        return;
      }
    }
    
    // If no more workouts this week, clear selection
    setSelectedWorkout(null);
    setSelectedDayIndex(-1);
  };

  const handleSwitchExercise = (exerciseIndex: number) => {
    if (selectedDayIndex !== -1) {
      switchWorkout.mutate({ dayIndex: selectedDayIndex, exerciseIndex });
    }
  };

  const handleWatchVideo = async (exerciseName: string) => {
    setIsVideoLoading(true);
    try {
      const res = await apiRequest('GET', `/api/integrations/youtube/search?q=${encodeURIComponent(exerciseName + ' exercise form')}`);
      if (!res.ok) throw new Error('Failed to find video');
      
      const data = await res.json();
      if (data.videoId) {
        setPlayingVideo({ id: data.videoId, title: exerciseName });
      } else {
        toast({ 
          title: 'Video not found', 
          description: 'Could not find a tutorial for this exercise.', 
          variant: 'destructive' 
        });
      }
    } catch (error) {
      console.error('Failed to fetch video:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to load video. Please try again.', 
        variant: 'destructive' 
      });
    } finally {
      setIsVideoLoading(false);
    }
  };

  const handleSaveLog = (data: any) => {
    if (!loggingExercise) return;
    
    setCompletedExercises(prev => ({
      ...prev,
      [loggingExercise.name]: {
        name: loggingExercise.name,
        skipped: false,
        ...data
      }
    }));
    setLoggingExercise(null);
    toast({ 
      title: "Exercise Logged", 
      description: `${loggingExercise.name} saved.` 
    });
  };

  const handleSkipExercise = (exerciseName: string) => {
    setCompletedExercises(prev => ({
      ...prev,
      [exerciseName]: {
        name: exerciseName,
        skipped: true,
        sets: [],
        totalSets: 0,
        completedSets: 0,
        totalVolume: 0
      }
    }));
    setLoggingExercise(null);
    toast({ 
      title: "Exercise Skipped", 
      description: `${exerciseName} marked as skipped.`,
      variant: "default"
    });
  };

  const handleFinishClick = () => {
    const totalExercises = selectedWorkout?.workout?.exercises?.length || 0;
    const accountedFor = Object.keys(completedExercises).length;
    
    // Allow finishing if all exercises are accounted for (logged or skipped)
    if (accountedFor < totalExercises) {
      setShowIncompleteAlert(true);
    } else {
      finishWorkout.mutate();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Workout Tracker</h2>
          <p className="text-muted-foreground">
            Your professional training schedule and analytics.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPreferences(true)}>
            <Sparkles className="mr-2 h-4 w-4" />
            {plan ? 'Regenerate Plan' : 'Create Plan'}
          </Button>
        </div>
      </div>

      {!plan ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <Dumbbell className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Workout Plan Yet</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              Generate a personalized training program based on your health profile, goals, and available equipment.
            </p>
            <Button onClick={() => setShowPreferences(true)}>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Workout Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{plan.content?.programOverview?.focus || "Weekly Schedule"}</CardTitle>
                <CardDescription>
                  {plan.content?.programOverview?.durationWeeks || 8}-week program • {plan.content?.programOverview?.daysPerWeek || 3} days/week
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WorkoutSchedule plan={plan} onWorkoutClick={handleWorkoutClick} workoutLogs={workoutLogs} />
              </CardContent>
            </Card>

            {/* Why This Plan - AI Rationale Card */}
            {plan.content?.weeklyRationale && (
              <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-purple-50/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-indigo-600" />
                    Why This Plan
                  </CardTitle>
                  <CardDescription>
                    AI-powered insights based on your workout history and progress
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                    {plan.content.weeklyRationale}
                  </p>
                  {plan.content?.personalizationNotes?.progressionRationale && (
                    <div className="mt-4 pt-4 border-t border-indigo-100">
                      <h5 className="text-xs font-semibold text-indigo-700 uppercase tracking-wider mb-2">
                        Progression Strategy
                      </h5>
                      <p className="text-sm text-muted-foreground">
                        {plan.content.personalizationNotes.progressionRationale}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {selectedWorkout && (
              <Card className="mt-6 border-primary/20 bg-primary/5 animate-in fade-in slide-in-from-top-4 duration-300">
                <CardHeader>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                      <div className="flex-1">
                        <CardTitle className="text-xl">{selectedWorkout.workout?.name}</CardTitle>
                        <CardDescription className="text-base mt-1">
                          {selectedWorkout.dayName} • {selectedWorkout.workout?.durationMinutes} min • {selectedWorkout.workout?.type}
                        </CardDescription>
                      </div>
                      <Button 
                        onClick={handleFinishClick} 
                        size="lg"
                        className="w-full sm:w-auto animate-in fade-in zoom-in duration-300"
                        disabled={finishWorkout.isPending}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Finish Workout
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">
                          {Object.values(completedExercises).filter((e: any) => !e.skipped).length} logged
                          {Object.values(completedExercises).filter((e: any) => e.skipped).length > 0 && (
                            <span className="text-orange-500 ml-1">
                              • {Object.values(completedExercises).filter((e: any) => e.skipped).length} skipped
                            </span>
                          )}
                          <span className="text-muted-foreground ml-1">
                            / {selectedWorkout.workout?.exercises?.length || 0}
                          </span>
                        </span>
                      </div>
                      <Progress value={(Object.keys(completedExercises).length / (selectedWorkout.workout?.exercises?.length || 1)) * 100} className="h-2" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {selectedWorkout.workout?.focus && (
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          Session Focus
                        </h4>
                        <p className="text-sm text-muted-foreground bg-background/50 p-3 rounded-lg border">
                          {selectedWorkout.workout.focus}
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Dumbbell className="h-4 w-4 text-primary" />
                        Exercises
                      </h4>

                      {selectedWorkout.workout?.exercises?.some((ex: any) => /^[A-Z]\d/.test(ex.name)) && (
                        <Alert className="mb-4 bg-blue-50/50 border-blue-200">
                          <Info className="h-4 w-4 text-blue-600" />
                          <AlertTitle className="text-blue-800 text-sm font-semibold">Pro Tip: Supersets</AlertTitle>
                          <AlertDescription className="text-blue-700 text-xs mt-1">
                            Exercises labeled with the same letter (e.g., <strong>A1</strong> & <strong>A2</strong>) are performed back-to-back with no rest. Rest only after completing the second exercise.
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="grid gap-3 md:grid-cols-2">
                        {selectedWorkout.workout?.exercises?.map((ex: any, i: number) => {
                          const exerciseState = completedExercises[ex.name];
                          const isLogged = exerciseState && !exerciseState.skipped;
                          const isSkipped = exerciseState?.skipped;
                          
                          return (
                            <div key={i} className={`p-4 rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow ${isSkipped ? 'opacity-60 bg-orange-50/30' : ''}`}>
                              <div className="flex justify-between items-start mb-2">
                                <div className="font-semibold text-lg flex-1">{ex.name}</div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant={exerciseState ? "default" : "outline"}
                                    size="sm"
                                    className={`h-7 px-2 text-xs gap-1 ${
                                      isLogged ? "bg-green-600 hover:bg-green-700" : 
                                      isSkipped ? "bg-orange-500 hover:bg-orange-600" : ""
                                    }`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setLoggingExercise(ex);
                                    }}
                                  >
                                    {isLogged ? <CheckCircle2 className="h-3 w-3" /> : 
                                     isSkipped ? <AlertCircle className="h-3 w-3" /> : 
                                     <Edit className="h-3 w-3" />}
                                    {isLogged ? "Logged" : isSkipped ? "Skipped" : "Log"}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs gap-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                    onClick={() => handleSwitchExercise(i)}
                                    disabled={switchWorkout.isPending}
                                  >
                                    <Shuffle className="h-3 w-3" />
                                    Switch
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-[10px] gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleWatchVideo(ex.name);
                                    }}
                                    disabled={isVideoLoading}
                                  >
                                    <PlayCircle className="h-3 w-3" />
                                    Watch
                                  </Button>
                                  <div className="text-xs font-mono bg-muted px-2 py-1 rounded">
                                    {ex.sets} × {ex.reps}
                                  </div>
                                </div>
                              </div>
                              
                              {ex.restSeconds && (
                                <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                                  <History className="h-3 w-3" />
                                  {ex.restSeconds}s rest
                                </div>
                              )}

                              {ex.notes && (
                                <div className="text-sm text-muted-foreground mt-2 pt-2 border-t border-dashed">
                                  "{ex.notes}"
                                </div>
                              )}
                              
                              {ex.healthBenefits && (
                                <div className="mt-2 text-xs text-green-600 bg-green-50 p-2 rounded border border-green-100">
                                  💡 {ex.healthBenefits}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history">
            <WorkoutHistory 
              logs={workoutLogs || []} 
              onDelete={(logId) => deleteWorkoutLog.mutate(logId)}
              isDeleting={deleteWorkoutLog.isPending}
            />
          </TabsContent>

          <TabsContent value="analytics">
            <WorkoutAnalytics />
          </TabsContent>
        </Tabs>
      )}

      <WorkoutPreferencesDialog 
        open={showPreferences} 
        onOpenChange={setShowPreferences}
        onGenerate={(prefs) => generatePlan.mutate(prefs)}
        loading={generatePlan.isPending}
        initialDaysPerWeek={healthProfile?.exerciseDaysPerWeek || 3}
      />

      <Dialog open={!!playingVideo} onOpenChange={(open) => !open && setPlayingVideo(null)}>
        <DialogContent className="sm:max-w-[800px] overflow-hidden bg-zinc-950 text-white border-zinc-800" noPadding>
          <DialogHeader className="p-4 bg-zinc-900/80 backdrop-blur absolute top-0 left-0 right-0 z-10 flex flex-col justify-between items-start border-b border-zinc-800">
            <DialogTitle className="text-zinc-100">How to perform: {playingVideo?.title}</DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              Watch this video tutorial to learn proper form and technique.
            </DialogDescription>
          </DialogHeader>
          <div className="aspect-video w-full mt-14 sm:mt-0 bg-black flex items-center justify-center relative">
            {playingVideo && (
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${playingVideo.id}?autoplay=1&rel=0`}
                title={playingVideo.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="z-0"
              />
            )}
          </div>
          <div className="p-4 bg-zinc-900 flex justify-between items-center border-t border-zinc-800">
            <span className="text-xs text-zinc-400">Video not loading?</span>
            <Button variant="secondary" size="sm" className="h-8 text-xs" asChild>
              <a 
                href={`https://www.youtube.com/watch?v=${playingVideo?.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in YouTube <ExternalLink className="ml-2 h-3 w-3" />
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!loggingExercise} onOpenChange={(open) => !open && setLoggingExercise(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Log {loggingExercise?.name}</DialogTitle>
            <DialogDescription className="flex items-center gap-2 mt-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              {loggingExercise && (
                <span className="text-sm">
                  Prescribed: {loggingExercise.sets} sets × {loggingExercise.reps} reps
                  {loggingExercise.weight && ` @ ${loggingExercise.weight} lbs`}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          {loggingExercise && (
            <DynamicExerciseLogger
              exercise={loggingExercise}
              onSave={handleSaveLog}
              onSkip={handleSkipExercise}
              onCancel={() => setLoggingExercise(null)}
              initialData={completedExercises[loggingExercise.name]}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showIncompleteAlert} onOpenChange={setShowIncompleteAlert}>
        <AlertDialogContent className="sm:max-w-[400px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Complete All Exercises</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="mt-2 text-sm text-muted-foreground">
            You have unlogged exercises in this workout. Please log all exercises before finishing the workout.
          </div>
          <AlertDialogFooter className="flex justify-end gap-2 mt-4">
            <AlertDialogCancel asChild>
              <Button variant="outline">Go Back</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button onClick={() => setShowIncompleteAlert(false)}>
                Understood
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
