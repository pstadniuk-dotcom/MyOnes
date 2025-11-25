import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { ExerciseLogForm } from './ExerciseLogForm';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LogWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedWorkout?: any;
  onSuccess?: () => void;
}

interface ExerciseSet {
  completed: boolean;
  reps: number;
  weight: number;
  rpe?: number;
}

interface ExerciseLog {
  name: string;
  sets: ExerciseSet[];
  notes?: string;
}

export function LogWorkoutDialog({ open, onOpenChange, selectedWorkout, onSuccess }: LogWorkoutDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [duration, setDuration] = useState(45);
  const [difficulty, setDifficulty] = useState(3);
  const [notes, setNotes] = useState('');
  const [exerciseLogs, setExerciseLogs] = useState<Record<string, ExerciseLog>>({});

  // Initialize exercise logs when workout changes
  useEffect(() => {
    if (selectedWorkout?.workout?.exercises) {
      const initialLogs: Record<string, ExerciseLog> = {};
      selectedWorkout.workout.exercises.forEach((ex: any) => {
        initialLogs[ex.name] = {
          name: ex.name,
          sets: Array.from({ length: ex.sets }, () => ({
            completed: false,
            reps: ex.reps,
            weight: ex.weight ?? 0,
          })),
        };
      });
      setExerciseLogs(initialLogs);
    }
  }, [selectedWorkout]);

  const handleExerciseUpdate = (exerciseName: string, data: { sets: ExerciseSet[]; notes?: string }) => {
    setExerciseLogs(prev => ({
      ...prev,
      [exerciseName]: {
        name: exerciseName,
        ...data,
      },
    }));
  };

  const logWorkout = useMutation({
    mutationFn: async () => {
      const exercisesCompleted = Object.values(exerciseLogs).map(log => ({
        name: log.name,
        sets: log.sets,
        notes: log.notes,
      }));

      console.log('Logging workout:', {
        workoutId: selectedWorkout?.workout?.id,
        exerciseCount: exercisesCompleted.length,
        totalSets: exercisesCompleted.reduce((sum, ex) => sum + ex.sets.length, 0),
      });

      const res = await apiRequest('POST', '/api/optimize/workout/logs', {
        workoutId: selectedWorkout?.workout?.id,
        completedAt: new Date().toISOString(),
        durationActual: duration,
        difficultyRating: difficulty,
        notes,
        exercisesCompleted,
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to log workout');
      }
      
      return res.json();
    },
    onSuccess: () => {
      console.log('✅ Workout logged successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/optimize/workout/logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/optimize/daily'] });
      onOpenChange(false);
      toast({
        title: 'Workout Logged! 💪',
        description: 'Great job! Your workout has been recorded.',
      });
      // Reset form
      setNotes('');
      setDifficulty(3);
      setDuration(45);
      setExerciseLogs({});
      // Call parent success handler
      onSuccess?.();
    },
    onError: (error: Error) => {
      console.error('❌ Failed to log workout:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to log workout.',
        variant: 'destructive',
      });
    }
  });

  const totalCompletedSets = Object.values(exerciseLogs).reduce(
    (sum, log) => sum + log.sets.filter(s => s.completed).length,
    0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[85vh] flex flex-col p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Log Workout</DialogTitle>
          <DialogDescription className="text-sm">
            {selectedWorkout ? `Record your session: ${selectedWorkout.workout?.name}` : "Record a completed workout session."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-4 sm:-mx-6 px-4 sm:px-6" style={{ maxHeight: 'calc(85vh - 180px)' }}>
          <div className="grid gap-6 py-4">
            {/* Exercise Logging */}
            {selectedWorkout?.workout?.exercises && (
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-gray-700">
                  Exercise Tracking ({totalCompletedSets} sets completed)
                </h3>
                {selectedWorkout.workout.exercises.map((exercise: any) => (
                  <ExerciseLogForm
                    key={exercise.name}
                    exercise={exercise}
                    onUpdate={(data) => handleExerciseUpdate(exercise.name, data)}
                    initialData={exerciseLogs[exercise.name]}
                  />
                ))}
              </div>
            )}

            {/* Workout Summary */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold text-sm text-gray-700">Workout Summary</h3>
              
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[duration]}
                    onValueChange={(vals) => setDuration(vals[0])}
                    min={5}
                    max={180}
                    step={5}
                    className="flex-1"
                  />
                  <span className="w-12 text-right font-mono">{duration}m</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Difficulty (1-5)</Label>
                <div className="flex gap-1.5 sm:gap-2">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <Button
                      key={num}
                      variant={difficulty === num ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDifficulty(num)}
                      className="flex-1 h-9 sm:h-10 text-sm sm:text-base"
                    >
                      {num}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {difficulty === 1 && "Very Easy"}
                  {difficulty === 3 && "Moderate"}
                  {difficulty === 5 && "Maximum Effort"}
                </p>
              </div>

              <div className="space-y-2 pb-4">
                <Label className="text-sm font-medium">Workout Notes</Label>
                <Textarea 
                  placeholder="Overall thoughts, energy levels, any issues?" 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button onClick={() => logWorkout.mutate()} disabled={logWorkout.isPending} className="w-full sm:w-auto">
            {logWorkout.isPending ? "Saving..." : "Save Workout"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
