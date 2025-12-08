import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Droplets, 
  Plus, 
  Minus, 
  GlassWater,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

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
  const [customAmount, setCustomAmount] = useState(8);

  const percentage = Math.min((currentOz / goalOz) * 100, 100);
  const remaining = Math.max(goalOz - currentOz, 0);
  const glassesEquivalent = Math.round(currentOz / 8);

  const logWater = useMutation({
    mutationFn: async (amountOz: number) => {
      const res = await apiRequest('POST', '/api/optimize/nutrition/log-water', { amountOz });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to log water');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/optimize/nutrition/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/wellness'] });
      
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
      toast({
        variant: 'destructive',
        title: 'Failed to log water',
        description: error.message,
      });
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

        {/* Quick add buttons */}
        <div className="grid grid-cols-4 gap-2">
          {QUICK_ADD_OPTIONS.map((option) => (
            <Button
              key={option.oz}
              variant="outline"
              size="sm"
              onClick={() => logWater.mutate(option.oz)}
              disabled={logWater.isPending}
              className="flex flex-col h-auto py-2 px-1 bg-white hover:bg-blue-50 border-blue-200"
            >
              <GlassWater className="h-4 w-4 text-blue-500 mb-1" />
              <span className="font-medium text-xs">{option.label}</span>
            </Button>
          ))}
        </div>

        {/* Custom amount */}
        <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-blue-100">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCustomAmount(Math.max(1, customAmount - 4))}
            className="h-8 w-8 p-0"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <div className="flex-1 text-center">
            <span className="font-bold text-blue-600">{customAmount}</span>
            <span className="text-muted-foreground text-sm"> oz</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCustomAmount(customAmount + 4)}
            className="h-8 w-8 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            onClick={() => logWater.mutate(customAmount)}
            disabled={logWater.isPending}
            className="bg-blue-500 hover:bg-blue-600"
          >
            {logWater.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
