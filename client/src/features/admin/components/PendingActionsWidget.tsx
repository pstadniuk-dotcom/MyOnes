import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { 
  Bell, 
  MessageSquare, 
  Package, 
  Clock,
  AlertTriangle
} from 'lucide-react';
import { useLocation } from 'wouter';

interface PendingActionsData {
  openTickets: number;
  pendingOrders: number;
  processingOrders: number;
  reordersdue: number;
  overdueReorders: number;
}

export function PendingActionsWidget() {
  const [, setLocation] = useLocation();
  
  const { data, isLoading, error } = useQuery<PendingActionsData>({
    queryKey: ['/api/admin/analytics/pending-actions'],
    refetchInterval: 60000 // Refresh every minute
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-16 w-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return null;
  }

  const totalPending = data.openTickets + data.pendingOrders + data.processingOrders + data.overdueReorders;

  const items = [
    {
      label: 'Support Tickets',
      count: data.openTickets,
      icon: MessageSquare,
      color: 'bg-blue-500',
      onClick: () => setLocation('/admin/support-tickets'),
      urgent: data.openTickets > 5
    },
    {
      label: 'Pending Orders',
      count: data.pendingOrders,
      icon: Clock,
      color: 'bg-amber-500',
      onClick: () => setLocation('/admin/orders?status=pending'),
      urgent: data.pendingOrders > 0
    },
    {
      label: 'Need Shipping',
      count: data.processingOrders,
      icon: Package,
      color: 'bg-violet-500',
      onClick: () => setLocation('/admin/orders?status=processing'),
      urgent: data.processingOrders > 3
    },
    {
      label: 'Reorder Alerts',
      count: data.overdueReorders,
      icon: AlertTriangle,
      color: 'bg-red-500',
      onClick: () => {}, // Scroll to reorder health
      urgent: data.overdueReorders > 0
    }
  ];

  return (
    <Card className="border-amber-200 bg-amber-50/30" data-testid="pending-actions-widget">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Pending Actions
          {totalPending > 0 && (
            <Badge variant="destructive" className="ml-2">
              {totalPending}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className={`flex flex-col items-center justify-center p-3 rounded-lg transition-all hover:scale-105 cursor-pointer min-w-[100px] ${
                item.count > 0 ? 'bg-white shadow-sm border' : 'bg-muted/30'
              }`}
            >
              <div className={`rounded-full p-2 mb-1 ${item.urgent && item.count > 0 ? item.color : 'bg-muted'}`}>
                <item.icon className={`h-4 w-4 ${item.urgent && item.count > 0 ? 'text-white' : 'text-muted-foreground'}`} />
              </div>
              <span className={`text-lg font-bold ${item.count > 0 ? '' : 'text-muted-foreground'}`}>
                {item.count}
              </span>
              <span className="text-xs text-muted-foreground text-center">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
