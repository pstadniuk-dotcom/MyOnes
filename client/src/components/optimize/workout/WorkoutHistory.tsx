import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Calendar, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface WorkoutHistoryProps {
  logs: any[];
}

export function WorkoutHistory({ logs }: WorkoutHistoryProps) {
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
      if (!exercise.sets || !Array.isArray(exercise.sets)) return total;
      const exerciseVolume = exercise.sets
        .filter((set: any) => set.completed)
        .reduce((sum: number, set: any) => sum + ((set.weight || 0) * (set.reps || 0)), 0);
      return total + exerciseVolume;
    }, 0);
  };

  const getCompletedSetsCount = (exercisesCompleted: any[]) => {
    if (!exercisesCompleted || !Array.isArray(exercisesCompleted)) return 0;
    return exercisesCompleted.reduce((total, exercise) => {
      if (!exercise.sets || !Array.isArray(exercise.sets)) return total;
      return total + exercise.sets.filter((set: any) => set.completed).length;
    }, 0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Workout History
        </CardTitle>
      </CardHeader>
      <CardContent>
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

              return (
                <div key={log.id} className="border rounded-lg overflow-hidden">
                  <div className="p-4 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {log.workoutName || "Workout Session"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(log.completedAt), 'PPP')}
                            {log.durationActual && ` • ${log.durationActual} min`}
                            {log.difficultyRating && ` • Difficulty ${log.difficultyRating}/5`}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        {hasExerciseData && (
                          <>
                            <div className="text-right mr-2">
                              <div className="text-xs text-gray-500">Volume</div>
                              <div className="font-semibold text-sm">{totalVolume.toLocaleString()} lbs</div>
                            </div>
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
                      </div>
                    </div>
                  </div>

                  {isExpanded && hasExerciseData && (
                    <div className="p-4 space-y-4 border-t">
                      {log.exercisesCompleted.map((exercise: any, exIdx: number) => {
                        // Handle different exercise types
                        const isStrength = exercise.type === 'strength' || (!exercise.type && exercise.sets);
                        const isCardio = exercise.type === 'cardio';
                        const isTimed = exercise.type === 'timed';
                        
                        const exerciseVolume = exercise.sets && Array.isArray(exercise.sets)
                          ? exercise.sets
                              .filter((set: any) => set.completed)
                              .reduce((sum: number, set: any) => sum + ((set.weight || 0) * (set.reps || 0)), 0)
                          : 0;
                        
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
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {exercise.sets.map((set: any, setIdx: number) => (
                                  <div
                                    key={setIdx}
                                    className={`p-2 rounded border text-sm ${
                                      set.completed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                                    }`}
                                  >
                                    <div className="font-medium text-xs text-gray-600 mb-1">
                                      Set {set.setNumber || setIdx + 1}
                                    </div>
                                    {set.completed ? (
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
                                ))}
                              </div>
                            )}
                            
                            {/* Timed exercise sets */}
                            {isTimed && exercise.sets && Array.isArray(exercise.sets) && (
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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
                              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                                <div className="grid grid-cols-3 gap-4">
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
