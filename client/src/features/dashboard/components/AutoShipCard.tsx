import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";
import { Package, Pause, Play, SkipForward, XCircle, Truck, DollarSign, Calendar } from "lucide-react";
import { useToast } from "@/shared/hooks/use-toast";
import { buildApiUrl } from "@/shared/lib/api";
import { getAuthHeaders } from "@/shared/lib/queryClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface AutoShipData {
  id: string;
  status: 'active' | 'paused' | 'cancelled';
  formulaId: string | null;
  formulaVersion: number;
  priceCents: number;
  supplyWeeks: number;
  nextShipmentDate: string | null;
  memberDiscountApplied: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AutoShipResponse {
  enabled: boolean;
  autoShip: AutoShipData | null;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const now = new Date();
  const target = new Date(dateStr);
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export function AutoShipCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<AutoShipResponse>({
    queryKey: ['/api/billing/auto-ship'],
    queryFn: async () => {
      const res = await fetch(buildApiUrl('/api/billing/auto-ship'), {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load auto-ship status');
      return res.json();
    },
  });

  const performAction = async (action: 'pause' | 'resume' | 'cancel' | 'skip-next') => {
    setActionLoading(action);
    try {
      const res = await fetch(buildApiUrl(`/api/billing/auto-ship/${action}`), {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(body.error || 'Request failed');
      }

      const result = await res.json();
      toast({
        title: 'Auto-Ship Updated',
        description: result.message,
      });

      // Refetch
      queryClient.invalidateQueries({ queryKey: ['/api/billing/auto-ship'] });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Not loaded yet or no auto-ship
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Auto-Ship
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return null; // Silently hide if auto-ship isn't available
  }

  const autoShip = data.autoShip;

  // No auto-ship set up yet — show a teaser
  if (!autoShip) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Auto-Ship
          </CardTitle>
          <CardDescription>
            Automatic formula deliveries every 8 weeks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-muted-foreground/30 p-4 text-center">
            <Truck className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Auto-ship activates automatically when you place your first formula order.
              Never run out of your supplements!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isActive = autoShip.status === 'active';
  const isPaused = autoShip.status === 'paused';
  const isCancelled = autoShip.status === 'cancelled';
  const days = daysUntil(autoShip.nextShipmentDate);

  const statusBadge = isActive ? (
    <Badge variant="default" className="bg-green-600">Active</Badge>
  ) : isPaused ? (
    <Badge variant="secondary">Paused</Badge>
  ) : (
    <Badge variant="destructive">Cancelled</Badge>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Auto-Ship
          </CardTitle>
          {statusBadge}
        </div>
        <CardDescription>
          Automatic formula deliveries every {autoShip.supplyWeeks} weeks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Price</p>
              <p className="font-semibold">
                {formatPrice(autoShip.priceCents)}
                {autoShip.memberDiscountApplied && (
                  <span className="text-xs text-green-600 ml-1">(member)</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Next Shipment</p>
              <p className="font-semibold">
                {isActive && autoShip.nextShipmentDate ? (
                  <>
                    {formatDate(autoShip.nextShipmentDate)}
                    {days !== null && days > 0 && (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({days} day{days !== 1 ? 's' : ''})
                      </span>
                    )}
                  </>
                ) : isPaused ? (
                  'Paused'
                ) : (
                  '—'
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Formula v{autoShip.formulaVersion} · {autoShip.supplyWeeks}-week supply
        </div>

        {/* Actions */}
        {!isCancelled && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {isActive && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => performAction('skip-next')}
                  disabled={!!actionLoading}
                  className="gap-1"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  {actionLoading === 'skip-next' ? 'Skipping...' : 'Skip Next'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => performAction('pause')}
                  disabled={!!actionLoading}
                  className="gap-1"
                >
                  <Pause className="w-3.5 h-3.5" />
                  {actionLoading === 'pause' ? 'Pausing...' : 'Pause'}
                </Button>
              </>
            )}
            {isPaused && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => performAction('resume')}
                disabled={!!actionLoading}
                className="gap-1"
              >
                <Play className="w-3.5 h-3.5" />
                {actionLoading === 'resume' ? 'Resuming...' : 'Resume'}
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!!actionLoading}
                  className="gap-1 text-destructive hover:text-destructive"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Cancel
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Auto-Ship?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will stop all future automatic shipments. You can still place manual orders
                    from your dashboard. This action can be reversed by placing a new order.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Auto-Ship</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => performAction('cancel')}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {actionLoading === 'cancel' ? 'Cancelling...' : 'Yes, Cancel'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {isCancelled && (
          <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            <p>Your auto-ship has been cancelled. Place a new order to restart automatic deliveries.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
