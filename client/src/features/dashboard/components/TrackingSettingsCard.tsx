import { useState, useEffect } from 'react';
import { Settings2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { CategoryChip } from '@/shared/components/ui/CategoryChip';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/shared/lib/api';
import { useToast } from '@/shared/hooks/use-toast';
import type { TrackingPreferences } from '@/types/tracking';
import { defaultTrackingPreferences, categoryMeta, type TrackingCategory } from '@/types/tracking';

interface TrackingSettingsCardProps {
  initialPrefs: TrackingPreferences;
  onSaved?: () => void;
}

const categoryKeys: TrackingCategory[] = ['nutrition', 'workouts', 'supplements', 'lifestyle'];

export function TrackingSettingsCard({ initialPrefs, onSaved }: TrackingSettingsCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState<TrackingPreferences>(initialPrefs);

  // Sync draft when initialPrefs changes (after refetch)
  useEffect(() => {
    setDraft(initialPrefs);
  }, [initialPrefs]);

  const savePrefs = useMutation({
    mutationFn: async (prefs: TrackingPreferences) => {
      const res = await apiRequest('/api/optimize/tracking-preferences', {
        method: 'POST',
        body: JSON.stringify(prefs),
      });
      if (!res.ok) throw new Error('Save failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/optimize/tracking-preferences'] });
      queryClient.invalidateQueries({ queryKey: ['/api/optimize/streaks/summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/wellness'] });
      toast({ title: 'Settings saved', description: 'Your tracking preferences have been updated.' });
      onSaved?.();
    },
    onError: () => {
      toast({ title: 'Failed to save', description: 'Please try again.', variant: 'destructive' });
      setDraft(initialPrefs); // revert
    },
  });

  const handleSave = () => {
    savePrefs.mutate(draft);
  };

  const handleReset = () => {
    setDraft(initialPrefs);
  };

  const toggleCategory = (cat: TrackingCategory, checked: boolean) => {
    const prefKey = categoryMeta[cat].prefKey;
    setDraft(prev => ({ ...prev, [prefKey]: checked }));
  };

  const isCategoryChecked = (cat: TrackingCategory): boolean => {
    const prefKey = categoryMeta[cat].prefKey;
    return draft[prefKey] !== false;
  };

  return (
    <Card className="border-[#1B4332]/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-[#1B4332]">
          <Settings2 className="h-4 w-4" />
          Tracking settings
        </CardTitle>
        <CardDescription className="text-sm text-[#52796F]">
          Choose what counts toward your streaks.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Row 1: Category chips */}
        <div>
          <Label className="text-xs text-[#52796F] mb-2 block">Categories</Label>
          <div className="flex flex-wrap gap-2">
            {categoryKeys.map(cat => (
              <CategoryChip
                key={cat}
                label={categoryMeta[cat].label}
                checked={isCategoryChecked(cat)}
                onChange={(checked) => toggleCategory(cat, checked)}
                disabled={savePrefs.isPending}
              />
            ))}
          </div>
        </div>

        {/* Row 2: Hydration goal and Pause until */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="hydration" className="text-xs text-[#52796F]">
              Hydration goal (oz)
            </Label>
            <Input
              id="hydration"
              type="number"
              min={0}
              placeholder="e.g. 80"
              value={draft.hydrationGoalOz ?? ''}
              onChange={(e) =>
                setDraft(prev => ({
                  ...prev,
                  hydrationGoalOz: e.target.value ? Number(e.target.value) : null,
                }))
              }
              disabled={savePrefs.isPending}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="pause" className="text-xs text-[#52796F]">
              Pause until
            </Label>
            <Input
              id="pause"
              type="date"
              value={draft.pauseUntil ?? ''}
              onChange={(e) =>
                setDraft(prev => ({
                  ...prev,
                  pauseUntil: e.target.value || null,
                }))
              }
              disabled={savePrefs.isPending}
              className="mt-1"
            />
          </div>
        </div>

        {/* Footer buttons */}
        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={savePrefs.isPending}
          >
            Reset
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={savePrefs.isPending}
            className="bg-[#1B4332] hover:bg-[#143728] text-white"
          >
            {savePrefs.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>

        <p className="text-[10px] text-[#52796F] text-right">
          Changes apply immediately to streaks.
        </p>
      </CardContent>
    </Card>
  );
}
