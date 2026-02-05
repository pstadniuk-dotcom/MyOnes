import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { 
  Activity, 
  UserPlus, 
  Package, 
  FlaskConical, 
  MessageSquare,
  RefreshCw
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useLocation } from 'wouter';

interface ActivityItem {
  type: 'signup' | 'order' | 'formula' | 'ticket' | 'message';
  id: string;
  userId: string;
  userName: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

const activityConfig = {
  signup: { icon: UserPlus, color: 'text-blue-500', bg: 'bg-blue-100' },
  order: { icon: Package, color: 'text-emerald-500', bg: 'bg-emerald-100' },
  formula: { icon: FlaskConical, color: 'text-violet-500', bg: 'bg-violet-100' },
  ticket: { icon: MessageSquare, color: 'text-amber-500', bg: 'bg-amber-100' },
  message: { icon: MessageSquare, color: 'text-slate-500', bg: 'bg-slate-100' },
};

function ActivityRow({ item }: { item: ActivityItem }) {
  const [, setLocation] = useLocation();
  const config = activityConfig[item.type];
  const Icon = config.icon;

  const handleClick = () => {
    if (item.type === 'signup' || item.type === 'order' || item.type === 'formula') {
      setLocation(`/admin/users/${item.userId}`);
    } else if (item.type === 'ticket') {
      setLocation(`/admin/support-tickets/${item.id}`);
    }
  };

  return (
    <div 
      className="flex items-start gap-3 p-3 border-b border-muted/30 hover:bg-muted/20 transition-colors cursor-pointer"
      onClick={handleClick}
    >
      <div className={`rounded-full p-2 ${config.bg}`}>
        <Icon className={`h-4 w-4 ${config.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.description}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
          </span>
          {item.metadata?.status && (
            <Badge variant="outline" className="text-xs">
              {item.metadata.status}
            </Badge>
          )}
          {item.metadata?.amountCents && (
            <Badge variant="secondary" className="text-xs">
              ${(item.metadata.amountCents / 100).toFixed(0)}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

export function ActivityFeed() {
  const { data, isLoading, error, refetch, isFetching } = useQuery<ActivityItem[]>({
    queryKey: ['/api/admin/activity-feed'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-3 py-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Failed to load activity feed</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="activity-feed">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Live Activity
          </CardTitle>
          <CardDescription>
            Recent platform activity
          </CardDescription>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 rounded-full hover:bg-muted transition-colors"
          disabled={isFetching}
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          {data.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No recent activity</p>
          ) : (
            data.map((item, index) => (
              <ActivityRow key={`${item.type}-${item.id}-${index}`} item={item} />
            ))
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
