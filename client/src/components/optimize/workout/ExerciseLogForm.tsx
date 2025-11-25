import { useState } from 'react';
import { SetLogger } from './SetLogger';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

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
}

export function ExerciseLogForm({ exercise, onUpdate, initialData }: ExerciseLogFormProps) {
  const [sets, setSets] = useState<ExerciseSet[]>(
    initialData?.sets ?? Array.from({ length: exercise.sets }, () => ({
      completed: false,
      reps: exercise.reps,
      weight: exercise.weight ?? 0,
    }))
  );
  const [notes, setNotes] = useState(initialData?.notes ?? '');

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

  return (
    <Card>
      <CardHeader className="p-3 sm:p-6">
        <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <span className="text-base sm:text-lg">{exercise.name}</span>
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
