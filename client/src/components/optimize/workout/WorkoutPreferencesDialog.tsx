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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';

interface WorkoutPreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (prefs: any) => void;
  loading: boolean;
  initialDaysPerWeek?: number;
  initialExperienceLevel?: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function WorkoutPreferencesDialog({
  open,
  onOpenChange,
  onGenerate,
  loading,
  initialDaysPerWeek = 3,
  initialExperienceLevel = 'intermediate'
}: WorkoutPreferencesDialogProps) {
  const [daysPerWeek, setDaysPerWeek] = useState(initialDaysPerWeek);
  const [experienceLevel, setExperienceLevel] = useState(initialExperienceLevel);
  const [preferredDays, setPreferredDays] = useState<string[]>([]);

  const handleDayToggle = (day: string) => {
    if (preferredDays.includes(day)) {
      setPreferredDays(preferredDays.filter(d => d !== day));
    } else {
      setPreferredDays([...preferredDays, day]);
    }
  };

  const handleGenerate = () => {
    onGenerate({
      daysPerWeek,
      experienceLevel,
      preferredDays
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Customize Your Plan</DialogTitle>
          <DialogDescription>
            Adjust your preferences to get a workout plan that fits your schedule.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Experience Level</Label>
            <RadioGroup 
              value={experienceLevel} 
              onValueChange={setExperienceLevel}
              className="flex flex-col space-y-1"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="beginner" id="beginner" />
                <Label htmlFor="beginner">Beginner</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="intermediate" id="intermediate" />
                <Label htmlFor="intermediate">Intermediate</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="advanced" id="advanced" />
                <Label htmlFor="advanced">Advanced</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Days per Week ({daysPerWeek})</Label>
            <div className="flex gap-2">
              {[2, 3, 4, 5, 6].map((num) => (
                <Button
                  key={num}
                  variant={daysPerWeek === num ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDaysPerWeek(num)}
                  className="w-10 h-10 p-0"
                >
                  {num}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Preferred Days (Optional)</Label>
            <div className="grid grid-cols-2 gap-2">
              {DAYS.map((day) => (
                <div key={day} className="flex items-center space-x-2">
                  <Checkbox 
                    id={day} 
                    checked={preferredDays.includes(day)}
                    onCheckedChange={() => handleDayToggle(day)}
                  />
                  <Label htmlFor={day} className="text-sm font-normal cursor-pointer">
                    {day}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? "Generating..." : "Generate Plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
