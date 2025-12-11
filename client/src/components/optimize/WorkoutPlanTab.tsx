import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Dumbbell, Sparkles, Calendar, History, BarChart3, PlayCircle, Info, ExternalLink, Shuffle, CheckCircle2, XCircle, Clock, Zap } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { OptimizeLogsByDate } from '@/types/optimize';
import { WorkoutSchedule } from './workout/WorkoutSchedule';
import { WorkoutHistory } from './workout/WorkoutHistory';
import { WorkoutAnalytics } from './workout/WorkoutAnalytics';
import { WorkoutPreferencesDialog } from './workout/WorkoutPreferencesDialog';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

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
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(-1);
  const [playingVideo, setPlayingVideo] = useState<{ id: string; title: string } | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('schedule');
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [logDuration, setLogDuration] = useState(45);
  const [logDifficulty, setLogDifficulty] = useState(3);
  const [logNotes, setLogNotes] = useState('');
  const [skipReason, setSkipReason] = useState('');

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

  const logWorkout = useMutation({
    mutationFn: async () => {
      console.log('🏋️ Logging workout:', selectedWorkout?.workout?.name);
      
      const res = await apiRequest('POST', '/api/optimize/workout/logs', {
        workoutId: selectedWorkout?.workout?.id,
        workoutName: selectedWorkout?.workout?.name || selectedWorkout?.day || 'Workout',
        completedAt: new Date().toISOString(),
        durationActual: logDuration,
        difficultyRating: logDifficulty,
        notes: logNotes || "Completed workout",
        exercisesCompleted: selectedWorkout?.workout?.exercises?.map((ex: any) => ({
          name: ex.name,
          skipped: false,
          sets: Array.from({ length: ex.sets || 3 }, (_, i) => ({
            setNumber: i + 1,
            completed: true,
            reps: typeof ex.reps === 'string' ? parseInt(ex.reps) || 10 : ex.reps || 10,
            weight: 0
          }))
        })) || [],
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
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/wellness'] });
      queryClient.invalidateQueries({ queryKey: ['/api/optimize/streaks/smart'] });
      
      setShowLogDialog(false);
      setLogDuration(45);
      setLogDifficulty(3);
      setLogNotes('');
      setSelectedWorkout(null);
      setSelectedDayIndex(-1);
      
      toast({
        title: '💪 Workout Logged!',
        description: 'Great job completing your workout!',
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

  const skipWorkout = useMutation({
    mutationFn: async () => {
      console.log('⏭️ Skipping workout:', selectedWorkout?.workout?.name);
      
      const res = await apiRequest('POST', '/api/optimize/workout/logs', {
        workoutId: selectedWorkout?.workout?.id,
        workoutName: selectedWorkout?.workout?.name || selectedWorkout?.day || 'Workout',
        completedAt: new Date().toISOString(),
        durationActual: 0,
        difficultyRating: 0,
        notes: skipReason || "Skipped workout",
        exercisesCompleted: selectedWorkout?.workout?.exercises?.map((ex: any) => ({
          name: ex.name,
          skipped: true,
          sets: []
        })) || [],
        skipped: true,
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to skip workout');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/optimize/workout/logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/optimize/analytics/workout'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/wellness'] });
      queryClient.invalidateQueries({ queryKey: ['/api/optimize/streaks/smart'] });
      
      setShowSkipDialog(false);
      setSkipReason('');
      setSelectedWorkout(null);
      setSelectedDayIndex(-1);
      
      toast({
        title: 'Workout Skipped',
        description: 'Rest is important too. Stay consistent!',
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
    // Set default duration from workout plan
    setLogDuration(workout?.workout?.durationMinutes || 45);
  };

  const handleLogClick = () => {
    setShowLogDialog(true);
  };

  const handleSkipClick = () => {
    setShowSkipDialog(true);
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
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="schedule" className="flex items-center justify-center gap-1.5 text-xs sm:text-sm">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Schedule</span>
              <span className="sm:hidden">Plan</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center justify-center gap-1.5 text-xs sm:text-sm">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center justify-center gap-1.5 text-xs sm:text-sm">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
              <span className="sm:hidden">Stats</span>
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
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button 
                          onClick={handleLogClick} 
                          size="lg"
                          className="flex-1 sm:flex-initial animate-in fade-in zoom-in duration-300 bg-green-600 hover:bg-green-700"
                          disabled={logWorkout.isPending || skipWorkout.isPending}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Log Workout
                        </Button>
                        <Button 
                          onClick={handleSkipClick} 
                          variant="outline"
                          size="lg"
                          className="flex-1 sm:flex-initial animate-in fade-in zoom-in duration-300 border-orange-300 text-orange-600 hover:bg-orange-50"
                          disabled={logWorkout.isPending || skipWorkout.isPending}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Skip
                        </Button>
                      </div>
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
                          return (
                            <div key={i} className="p-4 rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex justify-between items-start mb-2">
                                <div className="font-semibold text-lg flex-1">{ex.name}</div>
                                <div className="flex items-center gap-2">
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

      {/* Log Workout Dialog */}
      <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Log Workout
            </DialogTitle>
            <DialogDescription>
              {selectedWorkout?.workout?.name} - {selectedWorkout?.dayName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Duration */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Duration
                </Label>
                <span className="text-sm font-medium">{logDuration} min</span>
              </div>
              <Slider 
                value={[logDuration]} 
                min={10} 
                max={120} 
                step={5} 
                onValueChange={(vals) => setLogDuration(vals[0])} 
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>10 min</span>
                <span>60 min</span>
                <span>120 min</span>
              </div>
            </div>

            {/* Difficulty */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  How hard was it?
                </Label>
                <span className="text-sm font-medium">
                  {logDifficulty <= 2 ? 'Easy' : logDifficulty <= 4 ? 'Moderate' : 'Hard'}
                </span>
              </div>
              <Slider 
                value={[logDifficulty]} 
                min={1} 
                max={5} 
                step={1} 
                onValueChange={(vals) => setLogDifficulty(vals[0])} 
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Easy</span>
                <span>Moderate</span>
                <span>Hard</span>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea 
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
                placeholder="How did the workout feel? Any PRs?"
                className="resize-none"
                rows={2}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setShowLogDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => logWorkout.mutate()}
              disabled={logWorkout.isPending}
            >
              {logWorkout.isPending ? 'Logging...' : 'Log Workout'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Skip Workout Dialog */}
      <Dialog open={showSkipDialog} onOpenChange={setShowSkipDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-orange-500" />
              Skip Workout
            </DialogTitle>
            <DialogDescription>
              {selectedWorkout?.workout?.name} - {selectedWorkout?.dayName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              That's okay! Rest days happen. Why are you skipping today?
            </p>
            
            <div className="grid grid-cols-2 gap-2">
              {['Tired / Recovery', 'Busy / No time', 'Feeling unwell', 'Other'].map((reason) => (
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

            <Textarea 
              value={skipReason.startsWith('Other') || !['Tired / Recovery', 'Busy / No time', 'Feeling unwell', 'Other'].includes(skipReason) ? skipReason : ''}
              onChange={(e) => setSkipReason(e.target.value)}
              placeholder="Add a note (optional)"
              className="resize-none"
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-2">
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
              {skipWorkout.isPending ? 'Skipping...' : 'Skip Workout'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
