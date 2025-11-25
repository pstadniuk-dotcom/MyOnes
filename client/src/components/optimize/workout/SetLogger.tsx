import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface SetLoggerProps {
  setNumber: number;
  targetReps: number;
  targetWeight?: number;
  onUpdate: (data: { completed: boolean; reps: number; weight: number; rpe?: number }) => void;
  initialData?: { completed: boolean; reps: number; weight: number; rpe?: number };
}

export function SetLogger({ setNumber, targetReps, targetWeight, onUpdate, initialData }: SetLoggerProps) {
  const [completed, setCompleted] = useState(initialData?.completed ?? false);
  const [reps, setReps] = useState(initialData?.reps ?? targetReps);
  const [weight, setWeight] = useState(initialData?.weight ?? targetWeight ?? 0);
  const [rpe, setRpe] = useState<number | undefined>(initialData?.rpe);

  const handleUpdate = (updates: Partial<{ completed: boolean; reps: number; weight: number; rpe?: number }>) => {
    const newData = {
      completed: updates.completed ?? completed,
      reps: updates.reps ?? reps,
      weight: updates.weight ?? weight,
      rpe: updates.rpe ?? rpe,
    };
    
    if (updates.completed !== undefined) setCompleted(updates.completed);
    if (updates.reps !== undefined) setReps(updates.reps);
    if (updates.weight !== undefined) setWeight(updates.weight);
    if (updates.rpe !== undefined) setRpe(updates.rpe);
    
    onUpdate(newData);
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-3 border rounded-lg bg-gray-50">
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Checkbox
          id={`set-${setNumber}-complete`}
          checked={completed}
          onCheckedChange={(checked) => handleUpdate({ completed: checked === true })}
        />
        <Label htmlFor={`set-${setNumber}-complete`} className="font-medium">
          Set {setNumber}
        </Label>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full sm:w-auto">
        <div className="flex items-center gap-2 flex-1 sm:flex-initial">
          <Label htmlFor={`set-${setNumber}-weight`} className="text-sm text-gray-600 whitespace-nowrap">
            Weight (lbs)
          </Label>
          <Input
            id={`set-${setNumber}-weight`}
            type="number"
            min="0"
            step="5"
            value={weight}
            onChange={(e) => handleUpdate({ weight: parseFloat(e.target.value) || 0 })}
            className="w-20"
            disabled={!completed}
          />
        </div>

        <div className="flex items-center gap-2 flex-1 sm:flex-initial">
          <Label htmlFor={`set-${setNumber}-reps`} className="text-sm text-gray-600">
            Reps
          </Label>
          <Input
            id={`set-${setNumber}-reps`}
            type="number"
            min="0"
            value={reps}
            onChange={(e) => handleUpdate({ reps: parseInt(e.target.value) || 0 })}
            className="w-16"
            disabled={!completed}
          />
        </div>

        <div className="flex items-center gap-2 flex-1 sm:flex-initial">
          <Label htmlFor={`set-${setNumber}-rpe`} className="text-sm text-gray-600">
            RPE
          </Label>
          <Input
            id={`set-${setNumber}-rpe`}
            type="number"
            min="1"
            max="10"
            value={rpe ?? ''}
            onChange={(e) => handleUpdate({ rpe: parseInt(e.target.value) || undefined })}
            className="w-16"
            placeholder="1-10"
            disabled={!completed}
          />
        </div>
      </div>

      {targetReps && (
        <div className="w-full sm:w-auto sm:ml-auto text-xs sm:text-sm text-gray-500">
          Target: {targetWeight ? `${targetWeight} lbs × ` : ''}{targetReps} reps
        </div>
      )}
    </div>
  );
}
