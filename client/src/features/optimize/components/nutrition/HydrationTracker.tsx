import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Progress } from '@/shared/components/ui/progress';
import { Badge } from '@/shared/components/ui/badge';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import {
  Droplets,
  Plus,
  Minus,
  GlassWater,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/shared/lib/queryClient';
import { useToast } from '@/shared/hooks/use-toast';

interface HydrationTrackerProps {
  currentOz: number;
  goalOz?: number;
  onUpdate?: () => void;
}

const QUICK_ADD_OPTIONS = [
  { oz: 8, label: '8oz', description: 'Small glass' },
  { oz: 12, label: '12oz', description: 'Medium glass' },
  { oz: 16, label: '16oz', description: 'Large glass' },
  { oz: 20, label: '20oz', description: 'Water bottle' },
];

export function HydrationTracker({ currentOz = 0, goalOz = 100, onUpdate }: HydrationTrackerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [customAmount, setCustomAmount] = useState(8);
  const [optimisticOz, setOptimisticOz] = useState<number | null>(null);

  // Use optimistic value if available, otherwise use prop
  const displayOz = optimisticOz !== null ? optimisticOz : currentOz;
  const percentage = Math.min((displayOz / goalOz) * 100, 100);
  const remaining = Math.max(goalOz - displayOz, 0);
  const glassesEquivalent = Math.round(displayOz / 8);

  const logWater = useMutation({
    mutationFn: async (amountOz: number) => {
      const res = await apiRequest('POST', '/api/optimize/nutrition/log-water', { amountOz });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to log water');
      }
      return res.json();
    },
    onMutate: (amountOz: number) => {
      // Optimistic update - immediately show new value
      const newTotal = (optimisticOz !== null ? optimisticOz : currentOz) + amountOz;
      setOptimisticOz(newTotal);
    },
    onSuccess: (data) => {
      // Keep optimistic value synced with server response - don't clear it yet
      setOptimisticOz(data.waterIntakeOz);

      if (data.waterIntakeOz >= goalOz) {
        toast({
          title: '💧 Hydration Goal Reached!',
          description: `You've hit your ${goalOz}oz goal for today!`,
        });
      } else {
        toast({
          title: '💧 Water Logged',
          description: `${data.waterIntakeOz}oz total today`,
        });
      }

      onUpdate?.();
    },
    onError: (error: Error) => {
      // Rollback optimistic update
      setOptimisticOz(null);
      toast({
        variant: 'destructive',
        title: 'Failed to log water',
        description: error.message,
      });
    },
    onSettled: () => {
      // Invalidate queries after mutation settles, then clear optimistic state
      // after queries have had time to refetch
      queryClient.invalidateQueries({ queryKey: ['/api/optimize/nutrition/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/wellness'] });
      setTimeout(() => {
        setOptimisticOz(null);
      }, 1000); // Give queries time to refetch before clearing
    },
  });

  const resetWater = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/optimize/nutrition/reset-water', {});
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to reset water');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/optimize/nutrition/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/wellness'] });
      toast({
        title: 'Water Reset',
        description: 'Your water intake has been reset for today.',
      });
      onUpdate?.();
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to reset',
        description: error.message,
      });
    },
  });

  return (
    <Card className="bg-gradient-to-br from-blue-50/50 to-cyan-50/50 border-blue-100">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Droplets className="h-5 w-5 text-blue-500" />
            Hydration
          </CardTitle>
          {currentOz > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => resetWater.mutate()}
              disabled={resetWater.isPending}
              className="text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress visualization */}
        <div className="text-center space-y-2">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-bold text-blue-600">{currentOz}</span>
            <span className="text-lg text-muted-foreground">/ {goalOz} oz</span>
          </div>
          <Progress
            value={percentage}
            className="h-3 bg-blue-100"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{glassesEquivalent} glasses</span>
            <span>{remaining > 0 ? `${remaining}oz to go` : '✓ Goal reached!'}</span>
          </div>
        </div>

        {/* Quick add buttons - larger touch targets on mobile */}
        <div className="grid grid-cols-4 gap-2">
          {QUICK_ADD_OPTIONS.map((option) => (
            <Button
              key={option.oz}
              variant="outline"
              size="sm"
              onClick={() => logWater.mutate(option.oz)}
              disabled={logWater.isPending}
              className={`flex flex-col h-auto bg-white hover:bg-blue-50 border-blue-200 touch-feedback ${isMobile ? 'py-3 px-2' : 'py-2 px-1'
                }`}
            >
              <GlassWater className={`text-blue-500 mb-1 ${isMobile ? 'h-5 w-5' : 'h-4 w-4'}`} />
              <span className={`font-medium ${isMobile ? 'text-sm' : 'text-xs'}`}>{option.label}</span>
            </Button>
          ))}
        </div>

        {/* Custom amount - larger on mobile */}
        <div className={`flex items-center gap-2 bg-white rounded-lg border border-blue-100 ${isMobile ? 'p-3' : 'p-2'
          }`}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCustomAmount(Math.max(1, customAmount - 4))}
            className={`p-0 touch-feedback ${isMobile ? 'h-10 w-10' : 'h-8 w-8'}`}
          >
            <Minus className={isMobile ? 'h-5 w-5' : 'h-4 w-4'} />
          </Button>
          <div className="flex-1 text-center">
            <span className={`font-bold text-blue-600 ${isMobile ? 'text-xl' : 'text-base'}`}>{customAmount}</span>
            <span className={`text-muted-foreground ${isMobile ? 'text-base' : 'text-sm'}`}> oz</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCustomAmount(customAmount + 4)}
            className={`p-0 touch-feedback ${isMobile ? 'h-10 w-10' : 'h-8 w-8'}`}
          >
            <Plus className={isMobile ? 'h-5 w-5' : 'h-4 w-4'} />
          </Button>
          <Button
            size="sm"
            onClick={() => logWater.mutate(customAmount)}
            disabled={logWater.isPending}
            className={`bg-blue-500 hover:bg-blue-600 touch-feedback ${isMobile ? 'h-10 px-4' : ''}`}
          >
            {logWater.isPending ? (
              <Loader2 className={`animate-spin ${isMobile ? 'h-5 w-5' : 'h-4 w-4'}`} />
            ) : (
              <Plus className={isMobile ? 'h-5 w-5' : 'h-4 w-4'} />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
