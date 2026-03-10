/**
 * SmartReorderCard — Dashboard component showing Smart Re-Order status for members.
 *
 * States:
 * 1. No active schedule → "Smart Re-Order is included with your membership"
 * 2. Active schedule, counting down → Progress bar with days remaining
 * 3. Awaiting approval → AI findings + APPROVE / DELAY buttons
 * 4. Approved → "Charging shortly..."
 * 5. Charged → "Order placed" (briefly, then resets to new cycle)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/shared/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import { Repeat, Clock, Sparkles, Check, Pause, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useToast } from '@/shared/hooks/use-toast';

interface ReorderStatus {
  active: boolean;
  daysUntilReorder?: number;
  canDelay?: boolean;
  schedule?: {
    id: string;
    status: string;
    formulaVersion: number;
    supplyStartDate: string;
    supplyEndDate: string;
    delayCount: number;
  };
  recommendation?: {
    id: string;
    status: string;
    recommendsChanges: boolean;
    trendSummary: string;
    findings: Array<{
      metric: string;
      trend: 'improving' | 'declining' | 'stable';
      detail: string;
    }>;
    suggestedChanges: Array<{
      action: string;
      ingredient: string;
      rationale: string;
    }>;
    smsSentAt: string | null;
    autoApproveAt: string | null;
  } | null;
}

export function SmartReorderCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: status, isLoading } = useQuery<ReorderStatus>({
    queryKey: ['/api/reorder/status'],
    queryFn: () => apiRequest('GET', '/api/reorder/status').then((r: Response) => r.json()),
    refetchInterval: 60_000, // Refresh every minute
  });

  const approveMutation = useMutation({
    mutationFn: (scheduleId: string) =>
      apiRequest('POST', '/api/reorder/approve', { scheduleId }).then((r: Response) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reorder/status'] });
      toast({ title: 'Reorder approved', description: 'Your card will be charged shortly.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to approve reorder.', variant: 'destructive' });
    },
  });

  const delayMutation = useMutation({
    mutationFn: (scheduleId: string) =>
      apiRequest('POST', '/api/reorder/delay', { scheduleId }).then((r: Response) => r.json()),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/reorder/status'] });
      toast({
        title: data.success ? 'Reorder delayed' : 'Cannot delay',
        description: data.message,
        variant: data.success ? 'default' : 'destructive',
      });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delay reorder.', variant: 'destructive' });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-3 bg-muted rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!status?.active) {
    return (
      <Card className="border-[#054700]/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Repeat className="w-4 h-4 text-[#054700]" />
            Smart Re-Order
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">
            Included with your membership. After your first order ships, your AI practitioner will
            automatically review your wearable data before each reorder.
          </p>
        </CardContent>
      </Card>
    );
  }

  const schedule = status.schedule!;
  const daysLeft = status.daysUntilReorder ?? 0;
  const totalDays = 56; // 8 weeks
  const progressPct = Math.max(0, Math.min(100, ((totalDays - daysLeft) / totalDays) * 100));

  const isAwaitingApproval = schedule.status === 'awaiting_approval' && status.recommendation;
  const isApproved = schedule.status === 'approved';
  const isCharged = schedule.status === 'charged';

  return (
    <Card className={isAwaitingApproval ? 'border-amber-300 bg-amber-50/30' : 'border-[#054700]/20'}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Repeat className="w-4 h-4 text-[#054700]" />
            Smart Re-Order
          </CardTitle>
          <Badge variant="outline" className="text-[10px]">
            V{schedule.formulaVersion}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* Supply progress */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Supply remaining</span>
            <span className="font-medium flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {daysLeft} days
            </span>
          </div>
          <Progress value={progressPct} className="h-1.5" />
        </div>

        {/* Awaiting Approval — show AI findings */}
        {isAwaitingApproval && status.recommendation && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-xs font-medium text-amber-800">AI Review Ready</span>
            </div>

            <p className="text-xs text-muted-foreground">
              {status.recommendation.trendSummary}
            </p>

            {/* Trend findings */}
            {status.recommendation.findings.length > 0 && (
              <div className="space-y-1">
                {status.recommendation.findings.slice(0, 4).map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    {f.trend === 'improving' ? (
                      <TrendingUp className="w-3 h-3 text-green-600 shrink-0" />
                    ) : f.trend === 'declining' ? (
                      <TrendingDown className="w-3 h-3 text-red-500 shrink-0" />
                    ) : (
                      <Minus className="w-3 h-3 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-muted-foreground">{f.detail}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                className="flex-1 bg-[#054700] hover:bg-[#054700]/90 text-xs h-8"
                onClick={() => approveMutation.mutate(schedule.id)}
                disabled={approveMutation.isPending}
              >
                <Check className="w-3 h-3 mr-1" />
                {status.recommendation.recommendsChanges ? 'Approve Changes' : 'Approve Reorder'}
              </Button>
              {status.canDelay && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-8"
                  onClick={() => delayMutation.mutate(schedule.id)}
                  disabled={delayMutation.isPending}
                >
                  <Pause className="w-3 h-3 mr-1" />
                  Delay 2 Weeks
                </Button>
              )}
            </div>

            {status.recommendation.autoApproveAt && (
              <p className="text-[10px] text-muted-foreground text-center">
                Auto-approves {new Date(status.recommendation.autoApproveAt).toLocaleDateString()} if no response
              </p>
            )}
          </div>
        )}

        {/* Approved — charge pending */}
        {isApproved && (
          <div className="flex items-center gap-2 text-xs text-[#054700]">
            <Check className="w-3.5 h-3.5" />
            <span>Approved — your card will be charged shortly.</span>
          </div>
        )}

        {/* Charged — order placed */}
        {isCharged && (
          <div className="flex items-center gap-2 text-xs text-[#054700]">
            <Check className="w-3.5 h-3.5" />
            <span>Reorder placed! Your formula is on its way.</span>
          </div>
        )}

        {/* Active — counting down */}
        {schedule.status === 'active' && !isAwaitingApproval && (
          <p className="text-[10px] text-muted-foreground">
            Your AI practitioner will review your wearable data {REVIEW_DAYS_BEFORE} days before your supply runs out
            and send you a recommendation via text.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

const REVIEW_DAYS_BEFORE = 5;
