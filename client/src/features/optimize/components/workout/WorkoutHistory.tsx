import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { CheckCircle2, Calendar, ChevronDown, ChevronUp, TrendingUp, AlertCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/shared/components/ui/alert-dialog';

interface WorkoutHistoryProps {
  logs: any[];
  onDelete?: (logId: string) => void;
  isDeleting?: boolean;
}

export function WorkoutHistory({ logs, onDelete, isDeleting }: WorkoutHistoryProps) {
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  const toggleExpanded = (logId: string) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const calculateTotalVolume = (exercisesCompleted: any[]) => {
    if (!exercisesCompleted || !Array.isArray(exercisesCompleted)) return 0;
    return exercisesCompleted.reduce((total, exercise) => {
      // Skip skipped exercises
      if (exercise.skipped) return total;
      
      // Use pre-calculated totalVolume if available
      if (typeof exercise.totalVolume === 'number' && exercise.totalVolume > 0) {
        return total + exercise.totalVolume;
      }
      
      // Calculate from sets
      if (!exercise.sets || !Array.isArray(exercise.sets)) return total;
      
      // Include all sets that have weight and reps, or are marked completed
      const exerciseVolume = exercise.sets
        .filter((set: any) => set.completed || (set.weight > 0 && set.reps > 0))
        .reduce((sum: number, set: any) => sum + ((set.weight || 0) * (set.reps || 0)), 0);
      return total + exerciseVolume;
    }, 0);
  };

  const getCompletedSetsCount = (exercisesCompleted: any[]) => {
    if (!exercisesCompleted || !Array.isArray(exercisesCompleted)) return 0;
    return exercisesCompleted.reduce((total, exercise) => {
      if (exercise.skipped) return total;
      if (!exercise.sets || !Array.isArray(exercise.sets)) return total;
      // Count sets that are either marked completed OR have both weight and reps filled in
      return total + exercise.sets.filter((set: any) => set.completed || (set.weight > 0 && set.reps > 0)).length;
    }, 0);
  };

  const getCompletionStats = (exercisesCompleted: any[]) => {
    if (!exercisesCompleted || !Array.isArray(exercisesCompleted)) {
      return { logged: 0, skipped: 0, total: 0, percentage: 0 };
    }
    const logged = exercisesCompleted.filter(e => !e.skipped).length;
    const skipped = exercisesCompleted.filter(e => e.skipped).length;
    const total = exercisesCompleted.length;
    const percentage = total > 0 ? Math.round((logged / total) * 100) : 0;
    return { logged, skipped, total, percentage };
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Workout History
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-hidden">
        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No workouts logged yet. Start training!
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => {
              const isExpanded = expandedLogs.has(log.id);
              const totalVolume = calculateTotalVolume(log.exercisesCompleted);
              const completedSets = getCompletedSetsCount(log.exercisesCompleted);
              const hasExerciseData = log.exercisesCompleted && log.exercisesCompleted.length > 0;
              const completionStats = getCompletionStats(log.exercisesCompleted);

              return (
                <div key={log.id} className="border rounded-lg overflow-hidden">
                  <div className="p-3 sm:p-4 bg-gray-50">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0 sm:justify-between">
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="font-medium truncate">
                            {log.workoutName || "Workout Session"}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {format(new Date(log.completedAt), 'PPP')}
                            {log.durationActual && ` • ${log.durationActual} min`}
                            {log.difficultyRating && ` • Difficulty ${log.difficultyRating}/5`}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-7 sm:ml-4 flex-wrap justify-end">
                        {hasExerciseData && (
                          <>
                            {/* Completion percentage */}
                            <div className="text-right mr-1 sm:mr-2">
                              <div className="text-[10px] sm:text-xs text-gray-500">Completed</div>
                              <div className="font-semibold text-xs sm:text-sm">
                                {completionStats.percentage}%
                                {completionStats.skipped > 0 && (
                                  <span className="text-[10px] sm:text-xs text-orange-500 ml-1">
                                    ({completionStats.skipped} skip)
                                  </span>
                                )}
                              </div>
                            </div>
                            {/* Volume */}
                            {totalVolume > 0 && (
                              <div className="text-right mr-1 sm:mr-2 hidden xs:block">
                                <div className="text-[10px] sm:text-xs text-gray-500">Volume</div>
                                <div className="font-semibold text-xs sm:text-sm">{totalVolume.toLocaleString()} lbs</div>
                              </div>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpanded(log.id)}
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </>
                        )}
                        {!hasExerciseData && <Badge variant="outline">Completed</Badge>}
                        
                        {/* Delete button */}
                        {onDelete && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                disabled={isDeleting}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Workout?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete this workout session from {format(new Date(log.completedAt), 'PPP')}. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => onDelete(log.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </div>

                  {isExpanded && hasExerciseData && (
                    <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 border-t overflow-hidden">
                      {log.exercisesCompleted.map((exercise: any, exIdx: number) => {
                        // Handle skipped exercises
                        if (exercise.skipped) {
                          return (
                            <div key={exIdx} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-orange-500" />
                                <span className="font-medium text-orange-700">{exercise.name}</span>
                              </div>
                              <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                                Skipped
                              </Badge>
                            </div>
                          );
                        }
                        
                        // Handle different exercise types
                        const isStrength = exercise.type === 'strength' || (!exercise.type && exercise.sets);
                        const isCardio = exercise.type === 'cardio';
                        const isTimed = exercise.type === 'timed';
                        
                        // Calculate volume including sets with weight/reps even if not marked completed
                        const exerciseVolume = exercise.totalVolume || (exercise.sets && Array.isArray(exercise.sets)
                          ? exercise.sets
                              .filter((set: any) => set.completed || (set.weight > 0 && set.reps > 0))
                              .reduce((sum: number, set: any) => sum + ((set.weight || 0) * (set.reps || 0)), 0)
                          : 0);
                        
                        return (
                          <div key={exIdx} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="font-medium">{exercise.name}</div>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                {isStrength && exerciseVolume > 0 && (
                                  <>
                                    <TrendingUp className="h-4 w-4" />
                                    <span>{exerciseVolume.toLocaleString()} lbs</span>
                                  </>
                                )}
                                {isCardio && exercise.summary && (
                                  <div className="flex gap-2 text-xs">
                                    {exercise.summary.duration && <span>⏱️ {exercise.summary.duration}</span>}
                                    {exercise.summary.distance && <span>📍 {exercise.summary.distance}</span>}
                                    {exercise.summary.intensity && <span>💪 RPE {exercise.summary.intensity}</span>}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Strength exercise sets */}
                            {isStrength && exercise.sets && Array.isArray(exercise.sets) && (
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 overflow-hidden">
                                {exercise.sets.map((set: any, setIdx: number) => {
                                  // Consider a set "done" if completed or has weight+reps
                                  const isDone = set.completed || (set.weight > 0 && set.reps > 0);
                                  return (
                                  <div
                                    key={setIdx}
                                    className={`p-2 rounded border text-sm ${
                                      isDone ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                                    }`}
                                  >
                                    <div className="font-medium text-xs text-gray-600 mb-1">
                                      Set {set.setNumber || setIdx + 1}
                                    </div>
                                    {isDone ? (
                                      <>
                                        <div className="font-semibold">
                                          {set.weight} lbs × {set.reps}
                                        </div>
                                        {set.rpe && (
                                          <div className="text-xs text-gray-600">RPE: {set.rpe}</div>
                                        )}
                                      </>
                                    ) : (
                                      <div className="text-gray-400 text-xs">Skipped</div>
                                    )}
                                  </div>
                                  );
                                })}
                              </div>
                            )}
                            
                            {/* Timed exercise sets */}
                            {isTimed && exercise.sets && Array.isArray(exercise.sets) && (
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 overflow-hidden">
                                {exercise.sets.map((set: any, setIdx: number) => (
                                  <div
                                    key={setIdx}
                                    className={`p-2 rounded border text-sm ${
                                      set.completed ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                                    }`}
                                  >
                                    <div className="font-medium text-xs text-gray-600 mb-1">
                                      Set {set.setNumber || setIdx + 1}
                                    </div>
                                    {set.completed ? (
                                      <div className="font-semibold">
                                        {set.duration || set.reps}
                                      </div>
                                    ) : (
                                      <div className="text-gray-400 text-xs">Skipped</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Cardio summary */}
                            {isCardio && exercise.summary && (
                              <div className="bg-blue-50 border border-blue-200 rounded p-2 sm:p-3 text-sm overflow-hidden">
                                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                                  {exercise.summary.duration && (
                                    <div>
                                      <div className="text-xs text-gray-600">Duration</div>
                                      <div className="font-semibold">{exercise.summary.duration}</div>
                                    </div>
                                  )}
                                  {exercise.summary.distance && (
                                    <div>
                                      <div className="text-xs text-gray-600">Distance</div>
                                      <div className="font-semibold">{exercise.summary.distance}</div>
                                    </div>
                                  )}
                                  {exercise.summary.intensity && (
                                    <div>
                                      <div className="text-xs text-gray-600">Intensity</div>
                                      <div className="font-semibold">RPE {exercise.summary.intensity}</div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {exercise.notes && (
                              <div className="text-sm text-gray-600 italic bg-gray-50 p-2 rounded">
                                💬 {exercise.notes}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {log.notes && (
                        <div className="pt-2 border-t">
                          <div className="text-xs font-medium text-gray-600 mb-1">Workout Notes</div>
                          <div className="text-sm text-gray-700">{log.notes}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
