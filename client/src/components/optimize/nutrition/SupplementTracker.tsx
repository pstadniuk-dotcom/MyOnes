import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pill, Sun, CloudSun, Moon, Check, Sparkles, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

interface SupplementTrackerProps {
  todayLog?: {
    supplementMorning?: boolean;
    supplementAfternoon?: boolean;
    supplementEvening?: boolean;
  };
  formula?: {
    name: string;
    totalMg: number;
    version: number;
    ingredients?: { name: string; dosage: number }[];
  };
}

interface DoseConfig {
  id: 'morning' | 'afternoon' | 'evening';
  label: string;
  timeHint: string;
  icon: typeof Sun;
  iconColor: string;
  bgColor: string;
  borderColor: string;
}

const DOSES: DoseConfig[] = [
  {
    id: 'morning',
    label: 'Morning',
    timeHint: 'With breakfast',
    icon: Sun,
    iconColor: 'text-amber-500',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  {
    id: 'afternoon',
    label: 'Afternoon',
    timeHint: 'With lunch',
    icon: CloudSun,
    iconColor: 'text-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  {
    id: 'evening',
    label: 'Evening',
    timeHint: 'With dinner',
    icon: Moon,
    iconColor: 'text-indigo-500',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
  },
];

export function SupplementTracker({ todayLog, formula }: SupplementTrackerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Calculate capsules per dose
  const totalCapsules = formula ? Math.ceil(formula.totalMg / 750) : 6;
  const capsulesPerDose = Math.ceil(totalCapsules / 3);

  const logDose = useMutation({
    mutationFn: async ({ dose, taken }: { dose: 'morning' | 'afternoon' | 'evening'; taken: boolean }) => {
      const payload: Record<string, boolean> = {};
      
      // Map dose to field name
      if (dose === 'morning') payload.supplementMorning = taken;
      if (dose === 'afternoon') payload.supplementAfternoon = taken;
      if (dose === 'evening') payload.supplementEvening = taken;
      
      const res = await apiRequest('POST', '/api/optimize/daily-logs', payload);
      return res.json();
    },
    onSuccess: (_, { dose, taken }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/wellness'] });
      queryClient.invalidateQueries({ queryKey: ['/api/optimize/daily-logs'] });
      toast({
        title: taken ? '💊 Dose logged!' : 'Dose unmarked',
        description: taken 
          ? `${dose.charAt(0).toUpperCase() + dose.slice(1)} supplements recorded.`
          : `${dose.charAt(0).toUpperCase() + dose.slice(1)} dose unmarked.`,
      });
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Failed to log',
        description: 'Could not save supplement dose. Please try again.',
      });
    },
  });

  const dosesTaken = [
    todayLog?.supplementMorning,
    todayLog?.supplementAfternoon,
    todayLog?.supplementEvening,
  ].filter(Boolean).length;

  const allDosesTaken = dosesTaken === 3;

  return (
    <Card className="border-[#1B4332]/20 bg-gradient-to-br from-[#1B4332]/5 to-emerald-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#1B4332]/10">
              <Pill className="h-5 w-5 text-[#1B4332]" />
            </div>
            <div>
              <CardTitle className="text-lg text-[#1B4332]">Daily Supplements</CardTitle>
              <CardDescription className="text-[#52796F]">
                {formula ? `${formula.totalMg}mg total • ${totalCapsules} capsules` : 'No formula active'}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant={allDosesTaken ? "default" : "outline"}
              className={cn(
                "text-sm",
                allDosesTaken 
                  ? "bg-green-100 text-green-700 border-green-200" 
                  : "border-[#1B4332]/30 text-[#1B4332]"
              )}
            >
              {dosesTaken}/3 doses
            </Badge>
            {formula?.ingredients && (
              <HoverCard>
                <HoverCardTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Info className="h-4 w-4 text-[#52796F]" />
                  </Button>
                </HoverCardTrigger>
                <HoverCardContent className="w-72" align="end">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Your Formula Ingredients</h4>
                    <div className="space-y-1">
                      {formula.ingredients.slice(0, 8).map((ing, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{ing.name}</span>
                          <span className="font-medium">{ing.dosage}mg</span>
                        </div>
                      ))}
                      {formula.ingredients.length > 8 && (
                        <p className="text-xs text-muted-foreground">
                          +{formula.ingredients.length - 8} more ingredients
                        </p>
                      )}
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {DOSES.map((dose) => {
            const isTaken = dose.id === 'morning' 
              ? todayLog?.supplementMorning 
              : dose.id === 'afternoon' 
                ? todayLog?.supplementAfternoon 
                : todayLog?.supplementEvening;
            const Icon = dose.icon;
            
            return (
              <button
                key={dose.id}
                onClick={() => logDose.mutate({ dose: dose.id, taken: !isTaken })}
                disabled={logDose.isPending}
                className={cn(
                  "relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                  "hover:scale-[1.02] active:scale-[0.98]",
                  isTaken 
                    ? "bg-green-50 border-green-300 shadow-sm" 
                    : `${dose.bgColor} ${dose.borderColor} hover:border-[#1B4332]/40`
                )}
              >
                {isTaken && (
                  <div className="absolute top-2 right-2">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                )}
                <Icon className={cn("h-6 w-6", isTaken ? "text-green-600" : dose.iconColor)} />
                <div className="text-center">
                  <p className={cn(
                    "font-semibold text-sm",
                    isTaken ? "text-green-700" : "text-[#1B4332]"
                  )}>
                    {dose.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{dose.timeHint}</p>
                  <p className={cn(
                    "text-xs mt-1 font-medium",
                    isTaken ? "text-green-600" : "text-[#52796F]"
                  )}>
                    {capsulesPerDose} capsule{capsulesPerDose !== 1 ? 's' : ''}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
        
        {allDosesTaken && (
          <div className="mt-4 p-3 rounded-lg bg-green-100/50 border border-green-200 text-center">
            <p className="text-sm text-green-700 font-medium flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4" />
              All supplements taken today! Great job!
            </p>
          </div>
        )}
        
        {!formula && (
          <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-center">
            <p className="text-sm text-amber-700">
              Complete your AI consultation to get a personalized formula.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
