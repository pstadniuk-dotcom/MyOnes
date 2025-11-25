import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Dumbbell, Activity, CheckCircle2, Save } from 'lucide-react';
import { Exercise } from '@/types/optimize';

interface DynamicExerciseLoggerProps {
  exercise: Exercise;
  onSave: (logData: any) => void;
  onCancel?: () => void;
  initialData?: any;
}

export function DynamicExerciseLogger({ exercise, onSave, onCancel, initialData }: DynamicExerciseLoggerProps) {
  // Infer type if missing
  const exerciseType = exercise.type || inferExerciseType(exercise);
  const storageKey = `workout_draft_${exercise.name.replace(/\s+/g, '_')}`;

  // Load draft from local storage
  const loadDraft = () => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load draft", e);
    }
    return null;
  };

  const draft = loadDraft();

  // State depends on type
  const [sets, setSets] = useState<any[]>(
    initialData?.sets || draft?.sets || initializeSets(exercise, exerciseType)
  );
  
  // Cardio/Timed specific state
  const [duration, setDuration] = useState<string>(
    initialData?.duration || draft?.duration || ''
  );
  const [distance, setDistance] = useState<string>(
    initialData?.distance || draft?.distance || ''
  );
  const [intensity, setIntensity] = useState<number>(
    initialData?.intensity || draft?.intensity || 5
  );

  // Save draft whenever state changes
  useEffect(() => {
    const dataToSave = {
      sets,
      duration,
      distance,
      intensity,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(storageKey, JSON.stringify(dataToSave));
  }, [sets, duration, distance, intensity, storageKey]);

  function inferExerciseType(ex: Exercise): 'strength' | 'cardio' | 'timed' {
    const name = ex.name.toLowerCase();
    const reps = String(ex.reps).toLowerCase();

    if (reps.includes('min') || reps.includes('sec') || name.includes('plank') || name.includes('hold')) {
      if (name.includes('run') || name.includes('row') || name.includes('bike') || name.includes('swim') || name.includes('walk')) {
        return 'cardio';
      }
      return 'timed';
    }
    if (name.includes('run') || name.includes('row') || name.includes('bike') || name.includes('swim')) {
      return 'cardio';
    }
    return 'strength';
  }

  function initializeSets(ex: Exercise, type: string) {
    const count = ex.sets || 1;
    
    // Parse reps value - handle non-numeric like "AMRAP", "12/side", "10-12"
    const parseRepsValue = (reps: any): number => {
      if (!reps) return 0;
      if (typeof reps === 'number') return reps;
      const str = String(reps).toLowerCase();
      
      // Extract first number from string
      const match = str.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    };
    
    const parsedReps = parseRepsValue(ex.reps);
    
    return Array.from({ length: count }, (_, i) => ({
      setNumber: i + 1,
      reps: parsedReps,
      weight: ex.weight || 0,
      completed: false,
      rpe: 7,
      // Cardio specific defaults
      distance: '',
      duration: '',
      split: ''
    }));
  }

  const handleSetChange = (index: number, field: string, value: any) => {
    const newSets = [...sets];
    newSets[index] = { ...newSets[index], [field]: value };
    setSets(newSets);
  };

  const toggleSetComplete = (index: number) => {
    const newSets = [...sets];
    newSets[index].completed = !newSets[index].completed;
    setSets(newSets);
  };

  const handleSave = () => {
    const logData = {
      name: exercise.name,
      type: exerciseType,
      sets: sets.filter(s => s.completed), // Only save completed sets? Or all?
      // Add summary data for cardio
      summary: exerciseType === 'cardio' ? { distance, duration, intensity } : undefined
    };
    
    // Clear draft on successful save
    localStorage.removeItem(storageKey);
    
    onSave(logData);
  };

  if (exerciseType === 'cardio') {
    return (
      <div className="space-y-6 py-4">
        <div className="flex items-center gap-2 text-blue-600 bg-blue-50 p-3 rounded-lg">
          <Activity className="h-5 w-5" />
          <span className="font-medium">Cardio Session</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Duration</Label>
            <div className="relative">
              <Input 
                placeholder="e.g. 30:00" 
                value={duration} 
                onChange={(e) => setDuration(e.target.value)} 
              />
              <Clock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Distance</Label>
            <Input 
              placeholder="e.g. 3 miles" 
              value={distance} 
              onChange={(e) => setDistance(e.target.value)} 
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between">
            <Label>Intensity (RPE 1-10)</Label>
            <span className="text-sm font-medium text-muted-foreground">{intensity}</span>
          </div>
          <Slider 
            value={[intensity]} 
            min={1} 
            max={10} 
            step={1} 
            onValueChange={(vals) => setIntensity(vals[0])} 
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Easy</span>
            <span>Moderate</span>
            <span>Max Effort</span>
          </div>
        </div>

        <div className="flex gap-3">
          {onCancel && (
            <Button variant="outline" className="flex-1" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button className="flex-1" onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Log Cardio Session
          </Button>
        </div>
      </div>
    );
  }

  if (exerciseType === 'timed') {
    return (
      <div className="space-y-6 py-4">
        <div className="flex items-center gap-2 text-orange-600 bg-orange-50 p-3 rounded-lg">
          <Clock className="h-5 w-5" />
          <span className="font-medium">Timed Exercise</span>
        </div>

        <div className="space-y-4">
          {sets.map((set, i) => (
            <div key={i} className="flex items-center gap-4 p-3 border rounded-lg bg-card">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Set {set.setNumber}</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input 
                    className="w-32" 
                    placeholder="Duration" 
                    value={set.duration || set.reps} // Default to prescribed reps (e.g. "60s")
                    onChange={(e) => handleSetChange(i, 'duration', e.target.value)}
                  />
                </div>
              </div>
              <Button
                variant={set.completed ? "default" : "outline"}
                size="icon"
                className={set.completed ? "bg-green-600 hover:bg-green-700" : ""}
                onClick={() => toggleSetComplete(i)}
              >
                <CheckCircle2 className="h-5 w-5" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          {onCancel && (
            <Button variant="outline" className="flex-1" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button className="flex-1" onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Log Timed Sets
          </Button>
        </div>
      </div>
    );
  }

  // Default: Strength
  return (
    <div className="space-y-6 py-4">
      <div className="flex items-center gap-2 text-primary bg-primary/10 p-3 rounded-lg">
        <Dumbbell className="h-5 w-5" />
        <span className="font-medium">Strength Training</span>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
          <div className="col-span-2 text-center">SET</div>
          <div className="col-span-4 text-center">LBS</div>
          <div className="col-span-4 text-center">REPS</div>
          <div className="col-span-2 text-center">DONE</div>
        </div>

        {sets.map((set, i) => (
          <div key={i} className={`grid grid-cols-12 gap-2 items-center ${set.completed ? 'opacity-50' : ''}`}>
            <div className="col-span-2 flex justify-center">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                {set.setNumber}
              </div>
            </div>
            <div className="col-span-4">
              <Input 
                type="number" 
                className="text-center h-10" 
                value={set.weight || ''} 
                onChange={(e) => handleSetChange(i, 'weight', e.target.value ? parseFloat(e.target.value) : 0)}
                min="0"
                step="5"
              />
            </div>
            <div className="col-span-4">
              <Input 
                type="number"
                className="text-center h-10" 
                value={set.reps || ''} 
                onChange={(e) => handleSetChange(i, 'reps', e.target.value ? parseInt(e.target.value, 10) : 0)}
                min="0"
                step="1"
              />
            </div>
            <div className="col-span-2 flex justify-center">
              <Button
                variant={set.completed ? "default" : "outline"}
                size="icon"
                className={`h-10 w-10 ${set.completed ? "bg-green-600 hover:bg-green-700 border-green-600" : ""}`}
                onClick={() => toggleSetComplete(i)}
              >
                <CheckCircle2 className="h-5 w-5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mt-4">
        {onCancel && (
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button className="flex-1" onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Save Log
        </Button>
      </div>
    </div>
  );
}
