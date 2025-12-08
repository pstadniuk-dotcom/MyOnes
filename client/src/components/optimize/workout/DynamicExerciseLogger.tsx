import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Dumbbell, Activity, CheckCircle2, Save, Trophy } from 'lucide-react';
import { Exercise } from '@/types/optimize';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface DynamicExerciseLoggerProps {
  exercise: Exercise;
  onSave: (logData: any) => void;
  onSkip?: (exerciseName: string, reason?: string) => void;
  onCancel?: () => void;
  initialData?: any;
}

export function DynamicExerciseLogger({ exercise, onSave, onSkip, onCancel, initialData }: DynamicExerciseLoggerProps) {
  // Infer type if missing
  const exerciseType = exercise.type || inferExerciseType(exercise);
  const storageKey = `workout_draft_${exercise.name.replace(/\s+/g, '_')}`;

  // Fetch exercise records for weight suggestions
  const { data: exerciseRecords } = useQuery({
    queryKey: ['/api/optimize/exercise-records'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/optimize/exercise-records');
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Find last record for this exercise
  const lastRecord = exerciseRecords?.find((rec: any) => rec.exerciseName === exercise.name);
  const suggestedWeight = lastRecord?.lastWeight;
  const lastReps = lastRecord?.lastReps;

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
  
  // PR tracking state
  const [saveAsPr, setSaveAsPr] = useState(false);
  
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

    // Check if it's a cardio machine row (rowing machine) vs strength row exercise
    // Strength rows: "single-arm row", "dumbbell row", "barbell row", "cable row", "bent-over row", "t-bar row"
    // Cardio rows: "rowing", "row machine", "erg", "rower", standalone "row" with time-based reps
    const isStrengthRow = name.includes('row') && (
      name.includes('arm') || 
      name.includes('dumbbell') || 
      name.includes('barbell') || 
      name.includes('cable') || 
      name.includes('bent') || 
      name.includes('t-bar') ||
      name.includes('pendlay') ||
      name.includes('seated') ||
      name.includes('meadows') ||
      name.includes('kroc') ||
      // Check if reps are numeric (strength) vs time-based (cardio)
      (!reps.includes('min') && !reps.includes('sec') && !reps.includes('meter') && !reps.includes('m '))
    );

    // Timed exercises (planks, holds, stretches, breathing)
    if (reps.includes('min') || reps.includes('sec') || name.includes('plank') || name.includes('hold') || name.includes('breathing') || name.includes('stretch')) {
      // But check if it's cardio with time (running, rowing machine, biking)
      const isCardioWithTime = name.includes('run') || name.includes('bike') || name.includes('swim') || name.includes('walk') ||
        (name.includes('row') && !isStrengthRow) || name.includes('rowing') || name.includes('erg');
      if (isCardioWithTime) {
        return 'cardio';
      }
      return 'timed';
    }
    
    // Pure cardio exercises (machines, running, etc.)
    if (name.includes('run') || name.includes('bike') || name.includes('swim') || name.includes('rowing') || name.includes('erg') || name.includes('elliptical') || name.includes('stairmaster')) {
      return 'cardio';
    }
    
    // Row that's not a strength row = cardio (rowing machine)
    if (name.includes('row') && !isStrengthRow) {
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
    // For timed exercises, auto-mark as completed when duration is entered
    if (field === 'duration' && value) {
      newSets[index].completed = true;
    }
    setSets(newSets);
  };

  const toggleSetComplete = (index: number) => {
    const newSets = [...sets];
    newSets[index].completed = !newSets[index].completed;
    setSets(newSets);
  };

  const handleSave = () => {
    // For timed and cardio exercises, clicking save means you completed the exercise
    // Mark all sets as completed when saving (unless explicitly skipping)
    let finalSets = sets;
    
    if (exerciseType === 'timed') {
      // Mark all sets as completed for timed exercises when logging
      finalSets = sets.map(s => ({ ...s, completed: true }));
    } else if (exerciseType === 'cardio') {
      // For cardio, mark as completed if any data was entered
      finalSets = sets.map(s => ({ ...s, completed: true }));
    } else {
      // For strength, auto-mark sets as completed if they have weight and reps
      finalSets = sets.map(s => ({
        ...s,
        completed: s.completed || (s.weight > 0 && s.reps > 0)
      }));
    }
    
    const logData = {
      name: exercise.name,
      type: exerciseType,
      sets: finalSets,
      // Add summary data for cardio
      summary: exerciseType === 'cardio' ? { distance, duration, intensity } : undefined,
      // Add quick stats for display
      totalSets: finalSets.length,
      completedSets: finalSets.filter(s => s.completed).length,
      totalVolume: exerciseType === 'strength' 
        ? finalSets.filter(s => s.completed).reduce((sum, s) => sum + ((s.weight || 0) * (s.reps || 0)), 0)
        : 0,
      // PR flag
      saveAsPr: saveAsPr,
    };
    
    // Save exercise record with max weight (for future suggestions)
    if (exerciseType === 'strength') {
      const completedSets = finalSets.filter(s => s.completed && s.weight > 0);
      if (completedSets.length > 0) {
        const maxWeightSet = completedSets.reduce((max, s) => s.weight > max.weight ? s : max, completedSets[0]);
        
        // Update last weight for suggestions
        apiRequest('POST', '/api/optimize/exercise-records', {
          exerciseName: exercise.name,
          weight: maxWeightSet.weight,
          reps: maxWeightSet.reps,
        }).catch(err => console.error('Failed to save exercise record:', err));
        
        // Save PR if marked
        if (saveAsPr) {
          apiRequest('POST', '/api/optimize/exercise-records/pr', {
            exerciseName: exercise.name,
            weight: maxWeightSet.weight,
            notes: `PR achieved during workout`,
          }).catch(err => console.error('Failed to save PR:', err));
        }
      }
    }
    
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
          {onSkip && (
            <Button 
              variant="ghost" 
              className="flex-1 text-muted-foreground hover:text-orange-600 hover:bg-orange-50" 
              onClick={() => onSkip(exercise.name)}
            >
              Skip Exercise
            </Button>
          )}
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
          {onSkip && (
            <Button 
              variant="ghost" 
              className="flex-1 text-muted-foreground hover:text-orange-600 hover:bg-orange-50" 
              onClick={() => onSkip(exercise.name)}
            >
              Skip Exercise
            </Button>
          )}
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
  const completedSetsCount = sets.filter(s => s.completed || (s.weight > 0 && s.reps > 0)).length;
  const maxWeightThisSession = Math.max(...sets.filter(s => s.weight > 0).map(s => s.weight), 0);
  const isNewPr = suggestedWeight && maxWeightThisSession > suggestedWeight;

  return (
    <div className="space-y-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary bg-primary/10 p-3 rounded-lg">
          <Dumbbell className="h-5 w-5" />
          <span className="font-medium">Strength Training</span>
        </div>
        {suggestedWeight && suggestedWeight > 0 && (
          <div className="text-xs text-muted-foreground bg-muted px-3 py-2 rounded-lg">
            Last: <span className="font-semibold">{suggestedWeight} lbs</span> × {lastReps || '?'} reps
          </div>
        )}
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

      {/* PR Toggle Button */}
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
        <Button
          type="button"
          variant={saveAsPr ? "default" : "outline"}
          size="sm"
          onClick={() => setSaveAsPr(!saveAsPr)}
          disabled={completedSetsCount === 0 && maxWeightThisSession === 0}
          className={saveAsPr ? "bg-yellow-500 hover:bg-yellow-600 text-white" : ""}
        >
          <Trophy className="h-4 w-4 mr-1" />
          {saveAsPr ? 'PR Marked! 🎉' : 'Save as PR'}
        </Button>
        {completedSetsCount === 0 && maxWeightThisSession === 0 && (
          <span className="text-xs text-muted-foreground">
            Enter weight to save as PR
          </span>
        )}
        {isNewPr && !saveAsPr && (
          <span className="text-xs text-green-600 font-medium">
            🔥 New personal best! ({maxWeightThisSession} lbs vs {suggestedWeight} lbs)
          </span>
        )}
      </div>

      <div className="flex gap-3 mt-4">
        {onSkip && (
          <Button 
            variant="ghost" 
            className="flex-1 text-muted-foreground hover:text-orange-600 hover:bg-orange-50" 
            onClick={() => onSkip(exercise.name)}
          >
            Skip Exercise
          </Button>
        )}
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
