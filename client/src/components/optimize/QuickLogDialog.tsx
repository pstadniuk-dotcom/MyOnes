import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface QuickLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface QuickLogFormState {
  date: string;
  workoutCompleted: boolean;
  supplementsTaken: boolean;
  waterIntakeOz: string;
  energyLevel: string;
  moodLevel: string;
  sleepQuality: string;
  notes: string;
}

const ratingOptions = [1, 2, 3, 4, 5];

const buildDefaultState = (): QuickLogFormState => ({
  date: new Date().toISOString().slice(0, 10),
  workoutCompleted: false,
  supplementsTaken: false,
  waterIntakeOz: '',
  energyLevel: '',
  moodLevel: '',
  sleepQuality: '',
  notes: '',
});

export function QuickLogDialog({ open, onOpenChange }: QuickLogDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState<QuickLogFormState>(buildDefaultState);

  useEffect(() => {
    if (open) {
      setFormState(buildDefaultState());
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        date: formState.date,
        workoutCompleted: formState.workoutCompleted,
        supplementsTaken: formState.supplementsTaken,
      };

      if (formState.waterIntakeOz) {
        payload.waterIntakeOz = Number(formState.waterIntakeOz);
      }
      if (formState.energyLevel) {
        payload.energyLevel = Number(formState.energyLevel);
      }
      if (formState.moodLevel) {
        payload.moodLevel = Number(formState.moodLevel);
      }
      if (formState.sleepQuality) {
        payload.sleepQuality = Number(formState.sleepQuality);
      }
      if (formState.notes.trim()) {
        payload.notes = formState.notes.trim();
      }

      const res = await apiRequest('POST', '/api/optimize/daily-logs', payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/optimize/daily-logs'] });
      toast({
        title: 'Daily log saved',
        description: 'Your progress has been recorded.',
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Unable to save log',
        description: error.message,
      });
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <DialogHeader>
            <DialogTitle>Quick Daily Log</DialogTitle>
            <DialogDescription>
              Capture today’s nutrition, workouts, recovery signals, and notes in under a minute.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="log-date">Date</Label>
              <Input
                id="log-date"
                type="date"
                value={formState.date}
                onChange={(event) => setFormState((prev) => ({ ...prev, date: event.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Workout</p>
                  <p className="text-xs text-muted-foreground">Training session done</p>
                </div>
                <Switch
                  checked={formState.workoutCompleted}
                  onCheckedChange={(checked) => setFormState((prev) => ({ ...prev, workoutCompleted: checked }))}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Supplements</p>
                  <p className="text-xs text-muted-foreground">Formula taken</p>
                </div>
                <Switch
                  checked={formState.supplementsTaken}
                  onCheckedChange={(checked) => setFormState((prev) => ({ ...prev, supplementsTaken: checked }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="water-intake">Water (oz)</Label>
                <Input
                  id="water-intake"
                  inputMode="numeric"
                  type="number"
                  min={0}
                  value={formState.waterIntakeOz}
                  onChange={(event) => setFormState((prev) => ({ ...prev, waterIntakeOz: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Energy</Label>
                <Select
                  value={formState.energyLevel}
                  onValueChange={(value) => setFormState((prev) => ({ ...prev, energyLevel: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="1-5" />
                  </SelectTrigger>
                  <SelectContent>
                    {ratingOptions.map((value) => (
                      <SelectItem key={`energy-${value}`} value={String(value)}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Mood</Label>
                <Select value={formState.moodLevel} onValueChange={(value) => setFormState((prev) => ({ ...prev, moodLevel: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="1-5" />
                  </SelectTrigger>
                  <SelectContent>
                    {ratingOptions.map((value) => (
                      <SelectItem key={`mood-${value}`} value={String(value)}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Sleep Quality</Label>
                <Select
                  value={formState.sleepQuality}
                  onValueChange={(value) => setFormState((prev) => ({ ...prev, sleepQuality: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="1-5" />
                  </SelectTrigger>
                  <SelectContent>
                    {ratingOptions.map((value) => (
                      <SelectItem key={`sleep-${value}`} value={String(value)}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="log-notes">Notes</Label>
              <Textarea
                id="log-notes"
                rows={3}
                placeholder="Meals, cravings, recovery insights, or anything else to remember."
                value={formState.notes}
                onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save Log'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
