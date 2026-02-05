import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { 
  AlertTriangle, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Mail,
  User
} from 'lucide-react';
import { useLocation } from 'wouter';

interface ReorderHealthData {
  dueSoon: Array<{ userId: string; name: string; email: string; daysSinceOrder: number; lastOrderDate: string }>;
  overdue: Array<{ userId: string; name: string; email: string; daysSinceOrder: number; lastOrderDate: string }>;
  atRisk: Array<{ userId: string; name: string; email: string; daysSinceOrder: number; lastOrderDate: string }>;
  summary: { dueSoonCount: number; overdueCount: number; atRiskCount: number; healthyCount: number };
}

function UserRow({ 
  user, 
  status 
}: { 
  user: { userId: string; name: string; email: string; daysSinceOrder: number; lastOrderDate: string }; 
  status: 'due' | 'overdue' | 'atrisk';
}) {
  const [, setLocation] = useLocation();

  const statusConfig = {
    due: { badge: 'default', label: 'Due Soon', color: 'text-amber-600' },
    overdue: { badge: 'secondary', label: 'Overdue', color: 'text-orange-600' },
    atrisk: { badge: 'destructive', label: 'At Risk', color: 'text-red-600' }
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center justify-between p-3 border-b border-muted/30 hover:bg-muted/20 transition-colors">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className={`text-sm font-semibold ${config.color}`}>
            {user.daysSinceOrder} days
          </p>
          <p className="text-xs text-muted-foreground">
            Last: {user.lastOrderDate}
          </p>
        </div>
        <Badge variant={config.badge as any} className="text-xs">
          {config.label}
        </Badge>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setLocation(`/admin/users/${user.userId}`)}
        >
          View
        </Button>
      </div>
    </div>
  );
}

export function ReorderHealthWidget() {
  const { data, isLoading, error } = useQuery<ReorderHealthData>({
    queryKey: ['/api/admin/analytics/reorder-health'],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reorder Health (90-Day Cycle)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Failed to load reorder health data</p>
        </CardContent>
      </Card>
    );
  }

  const { summary } = data;
  const totalCustomers = summary.dueSoonCount + summary.overdueCount + summary.atRiskCount + summary.healthyCount;

  return (
    <Card data-testid="reorder-health-widget">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Reorder Health (90-Day Supply Cycle)
        </CardTitle>
        <CardDescription>
          Track customers based on their 90-day supply reorder window
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="text-center p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
            <p className="text-xl font-bold text-emerald-600">{summary.healthyCount}</p>
            <p className="text-xs text-muted-foreground">Healthy (&lt;75d)</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Clock className="h-5 w-5 mx-auto text-amber-500 mb-1" />
            <p className="text-xl font-bold text-amber-600">{summary.dueSoonCount}</p>
            <p className="text-xs text-muted-foreground">Due Soon (75-90d)</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <AlertTriangle className="h-5 w-5 mx-auto text-orange-500 mb-1" />
            <p className="text-xl font-bold text-orange-600">{summary.overdueCount}</p>
            <p className="text-xs text-muted-foreground">Overdue (90-100d)</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertCircle className="h-5 w-5 mx-auto text-red-500 mb-1" />
            <p className="text-xl font-bold text-red-600">{summary.atRiskCount}</p>
            <p className="text-xs text-muted-foreground">At Risk (100d+)</p>
          </div>
        </div>

        {/* Detailed Lists */}
        <Tabs defaultValue="atrisk" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="atrisk" className="text-xs">
              At Risk ({summary.atRiskCount})
            </TabsTrigger>
            <TabsTrigger value="overdue" className="text-xs">
              Overdue ({summary.overdueCount})
            </TabsTrigger>
            <TabsTrigger value="due" className="text-xs">
              Due Soon ({summary.dueSoonCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="atrisk">
            <ScrollArea className="h-64">
              {data.atRisk.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No customers at risk 🎉</p>
              ) : (
                data.atRisk.slice(0, 10).map(user => (
                  <UserRow key={user.userId} user={user} status="atrisk" />
                ))
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="overdue">
            <ScrollArea className="h-64">
              {data.overdue.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No overdue customers</p>
              ) : (
                data.overdue.slice(0, 10).map(user => (
                  <UserRow key={user.userId} user={user} status="overdue" />
                ))
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="due">
            <ScrollArea className="h-64">
              {data.dueSoon.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No customers due for reorder yet</p>
              ) : (
                data.dueSoon.slice(0, 10).map(user => (
                  <UserRow key={user.userId} user={user} status="due" />
                ))
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
