import { useState, useEffect } from 'react';
import { SetLogger } from './SetLogger';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Trophy } from 'lucide-react';

interface ExerciseSet {
  completed: boolean;
  reps: number;
  weight: number;
  rpe?: number;
}

interface Exercise {
  name: string;
  sets: number;
  reps: number;
  weight?: number;
  tempo?: string;
  rest?: string;
}

interface ExerciseLogFormProps {
  exercise: Exercise;
  onUpdate: (data: { sets: ExerciseSet[]; notes?: string }) => void;
  initialData?: { sets: ExerciseSet[]; notes?: string };
  suggestedWeight?: number;
  lastReps?: number;
  isPrMarked?: boolean;
  onTogglePr?: (exerciseName: string) => void;
}

export function ExerciseLogForm({ 
  exercise, 
  onUpdate, 
  initialData,
  suggestedWeight,
  lastReps,
  isPrMarked,
  onTogglePr,
}: ExerciseLogFormProps) {
  const [sets, setSets] = useState<ExerciseSet[]>(
    initialData?.sets ?? Array.from({ length: exercise.sets }, () => ({
      completed: false,
      reps: exercise.reps,
      weight: exercise.weight ?? 0,
    }))
  );
  const [notes, setNotes] = useState(initialData?.notes ?? '');

  // Update sets when initialData changes (e.g., when suggested weights load)
  useEffect(() => {
    if (initialData?.sets) {
      setSets(initialData.sets);
    }
  }, [initialData]);

  const handleSetUpdate = (setIndex: number, setData: ExerciseSet) => {
    const newSets = [...sets];
    newSets[setIndex] = setData;
    setSets(newSets);
    onUpdate({ sets: newSets, notes });
  };

  const handleNotesChange = (newNotes: string) => {
    setNotes(newNotes);
    onUpdate({ sets, notes: newNotes });
  };

  const completedSets = sets.filter(s => s.completed).length;
  const totalVolume = sets
    .filter(s => s.completed)
    .reduce((sum, s) => sum + (s.weight * s.reps), 0);

  // Calculate max weight used in this session
  const maxWeight = Math.max(...sets.filter(s => s.completed).map(s => s.weight), 0);
  const isNewPr = suggestedWeight && maxWeight > suggestedWeight;

  return (
    <Card className={isPrMarked ? 'ring-2 ring-yellow-400' : ''}>
      <CardHeader className="p-3 sm:p-6">
        <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg">{exercise.name}</span>
            {suggestedWeight && suggestedWeight > 0 && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                Last: {suggestedWeight}lbs × {lastReps || exercise.reps}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm font-normal text-gray-600">
            <span>{completedSets}/{exercise.sets} sets</span>
            <span className="whitespace-nowrap">{totalVolume.toLocaleString()} lbs</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-3 sm:p-6 pt-0 sm:pt-0">{sets.map((set, index) => (
          <SetLogger
            key={index}
            setNumber={index + 1}
            targetReps={exercise.reps}
            targetWeight={exercise.weight}
            onUpdate={(data) => handleSetUpdate(index, data)}
            initialData={set}
          />
        ))}
        
        {/* PR Toggle Button - Always visible */}
        <div className="pt-2 flex items-center gap-3 border-t mt-2">
          <Button
            type="button"
            variant={isPrMarked ? "default" : "outline"}
            size="sm"
            onClick={() => onTogglePr?.(exercise.name)}
            disabled={completedSets === 0}
            className={isPrMarked ? "bg-yellow-500 hover:bg-yellow-600 text-white" : ""}
          >
            <Trophy className="h-4 w-4 mr-1" />
            {isPrMarked ? 'PR Marked! 🎉' : 'Save as PR'}
          </Button>
          {completedSets === 0 && (
            <span className="text-xs text-muted-foreground">
              Complete a set to save as PR
            </span>
          )}
          {isNewPr && !isPrMarked && completedSets > 0 && (
            <span className="text-xs text-green-600 font-medium">
              🔥 New personal best! ({maxWeight}lbs vs {suggestedWeight}lbs)
            </span>
          )}
        </div>
        
        <div className="pt-2">
          <Label htmlFor={`notes-${exercise.name}`} className="text-sm text-gray-600">
            Exercise Notes (optional)
          </Label>
          <Textarea
            id={`notes-${exercise.name}`}
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="How did this feel? Any modifications?"
            className="mt-1"
            rows={2}
          />
        </div>
      </CardContent>
    </Card>
  );
}
