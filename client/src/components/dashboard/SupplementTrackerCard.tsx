import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, Sun, Cloud, Moon, Pill, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface SupplementDose {
  time: 'morning' | 'afternoon' | 'evening';
  label: string;
  icon: typeof Sun;
  taken: boolean;
}

interface WellnessData {
  todayPlan?: {
    supplementMorning?: boolean;
    supplementAfternoon?: boolean;
    supplementEvening?: boolean;
    supplementDosesTotal?: number;
  };
}

export function SupplementTrackerCard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [pendingDose, setPendingDose] = useState<string | null>(null);

  // Fetch wellness data to get current supplement status
  const { data: wellnessData, isLoading } = useQuery<WellnessData>({
    queryKey: ['/api/dashboard/wellness'],
  });

  const supplementMorning = wellnessData?.todayPlan?.supplementMorning ?? false;
  const supplementAfternoon = wellnessData?.todayPlan?.supplementAfternoon ?? false;
  const supplementEvening = wellnessData?.todayPlan?.supplementEvening ?? false;
  const totalDoses = wellnessData?.todayPlan?.supplementDosesTotal ?? 3;

  const doses: SupplementDose[] = [
    { time: 'morning', label: 'Morning', icon: Sun, taken: supplementMorning },
    { time: 'afternoon', label: 'Midday', icon: Cloud, taken: supplementAfternoon },
    { time: 'evening', label: 'Evening', icon: Moon, taken: supplementEvening },
  ];

  const dosesTaken = doses.filter(d => d.taken).length;
  const allTaken = dosesTaken === totalDoses;

  const logDoseMutation = useMutation({
    mutationFn: async ({ dose, taken }: { dose: 'morning' | 'afternoon' | 'evening', taken: boolean }) => {
      const payload: Record<string, boolean> = {};
      if (dose === 'morning') payload.supplementMorning = taken;
      if (dose === 'afternoon') payload.supplementAfternoon = taken;
      if (dose === 'evening') payload.supplementEvening = taken;
      
      const response = await apiRequest('/api/optimize/daily-logs', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error('Failed to log supplement');
      }
      return response.json();
    },
    onMutate: async ({ dose }) => {
      setPendingDose(dose);
    },
    onSuccess: (_, { dose, taken }) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/wellness'] });
      queryClient.invalidateQueries({ queryKey: ['/api/optimize/streaks/smart'] });
      queryClient.invalidateQueries({ queryKey: ['/api/streaks/rewards'] });
      
      if (taken) {
        toast({
          title: '💊 Dose logged!',
          description: `Great job staying consistent!`,
        });
      }
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to log dose. Please try again.',
      });
    },
    onSettled: () => {
      setPendingDose(null);
    },
  });

  const handleToggleDose = (dose: SupplementDose) => {
    logDoseMutation.mutate({ dose: dose.time, taken: !dose.taken });
  };

  if (isLoading) {
    return <SupplementTrackerCardSkeleton />;
  }

  return (
    <Card className="bg-white border-[#1B4332]/10 hover:border-[#1B4332]/20 transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-[#1B4332] flex items-center gap-2">
            <Pill className="h-5 w-5 text-[#52796F]" />
            Today's Supplements
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <span className={cn(
              "text-sm font-medium",
              allTaken ? "text-green-600" : "text-[#52796F]"
            )}>
              {dosesTaken}/{totalDoses}
            </span>
            {allTaken && (
              <span className="text-green-600 text-sm">✓</span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-3 gap-2">
          {doses.map((dose) => {
            const Icon = dose.icon;
            const isPending = pendingDose === dose.time;
            
            return (
              <Button
                key={dose.time}
                variant="outline"
                className={cn(
                  "h-auto py-3 px-2 flex flex-col items-center gap-1.5 transition-all",
                  "border-[#1B4332]/10 hover:border-[#1B4332]/30",
                  dose.taken && "bg-green-50 border-green-200 hover:bg-green-100 hover:border-green-300",
                  isPending && "opacity-70"
                )}
                onClick={() => handleToggleDose(dose)}
                disabled={isPending}
              >
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center transition-colors",
                  dose.taken 
                    ? "bg-green-500 text-white" 
                    : "bg-[#1B4332]/5 text-[#52796F]"
                )}>
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : dose.taken ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span className={cn(
                  "text-xs font-medium",
                  dose.taken ? "text-green-700" : "text-[#52796F]"
                )}>
                  {dose.label}
                </span>
              </Button>
            );
          })}
        </div>
        
        {allTaken && (
          <div className="mt-3 text-center">
            <p className="text-sm text-green-600 font-medium">
              🎉 All doses taken today!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SupplementTrackerCardSkeleton() {
  return (
    <Card className="bg-white border-[#1B4332]/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-12" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function SupplementTrackerCardEmpty() {
  return (
    <Card className="bg-white border-[#1B4332]/10 border-dashed">
      <CardContent className="py-8 text-center">
        <Pill className="h-10 w-10 text-[#52796F]/50 mx-auto mb-3" />
        <p className="text-[#52796F] text-sm">
          No active formula yet
        </p>
        <p className="text-[#52796F]/70 text-xs mt-1">
          Complete your consultation to get started
        </p>
      </CardContent>
    </Card>
  );
}
