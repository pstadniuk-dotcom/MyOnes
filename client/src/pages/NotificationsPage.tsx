import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Bell,
  Check,
  CheckCheck,
  Package,
  Beaker,
  Calendar,
  Info,
  ArrowLeft,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { apiRequest } from '@/shared/lib/queryClient';
import { useLocation } from 'wouter';
import type { Notification } from '@shared/schema';

interface NotificationCounts {
  all: number;
  unread: number;
  formula_update: number;
  order_update: number;
  system: number;
}

interface NotificationResponse {
  notifications: Notification[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
  counts: NotificationCounts;
}

interface UnreadCountResponse {
  count: number;
}

type FilterType = 'all' | 'unread' | 'formula_update' | 'order_update' | 'system';

const getPaginationItems = (currentPage: number, totalPages: number): Array<number | 'ellipsis-left' | 'ellipsis-right'> => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: Array<number | 'ellipsis-left' | 'ellipsis-right'> = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) {
    items.push('ellipsis-left');
  }

  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }

  if (end < totalPages - 1) {
    items.push('ellipsis-right');
  }

  items.push(totalPages);
  return items;
};

const NotificationIcon = ({ type, metadata }: { type: string; metadata?: any }) => {
  const iconProps = { className: "h-5 w-5" };

  if (metadata?.icon) {
    switch (metadata.icon) {
      case 'package':
        return <Package {...iconProps} className="h-5 w-5 text-blue-500" />;
      case 'beaker':
        return <Beaker {...iconProps} className="h-5 w-5 text-green-500" />;
      case 'calendar':
        return <Calendar {...iconProps} className="h-5 w-5 text-purple-500" />;
      default:
        return <Info {...iconProps} className="h-5 w-5 text-gray-500" />;
    }
  }

  switch (type) {
    case 'order_update':
      return <Package {...iconProps} className="h-5 w-5 text-blue-500" />;
    case 'formula_update':
      return <Beaker {...iconProps} className="h-5 w-5 text-green-500" />;
    case 'consultation_reminder':
      return <Calendar {...iconProps} className="h-5 w-5 text-purple-500" />;
    case 'system':
    default:
      return <Info {...iconProps} className="h-5 w-5 text-gray-500" />;
  }
};

const formatNotificationTime = (createdAt: string | Date) => {
  const date = new Date(createdAt);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 24) {
    return formatDistanceToNow(date, { addSuffix: true });
  } else if (diffInHours < 24 * 7) {
    return format(date, 'EEEE \'at\' h:mm a');
  } else {
    return format(date, 'MMM d, yyyy \'at\' h:mm a');
  }
};

const NotificationCard = ({
  notification,
  onMarkAsRead
}: {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
}) => {
  const handleClick = () => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }

    if (notification.metadata?.actionUrl) {
      window.location.href = notification.metadata.actionUrl;
    }
  };

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${!notification.isRead ? 'border-l-4 border-l-primary bg-primary/5' : 'opacity-75'
        }`}
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 p-2 rounded-full bg-muted">
            <NotificationIcon type={notification.type} metadata={notification.metadata} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`font-medium ${notification.isRead ? 'text-muted-foreground' : 'text-foreground'}`}>
                {notification.title}
              </h3>
              {!notification.isRead && (
                <Badge variant="default" className="text-xs">New</Badge>
              )}
              {notification.metadata?.priority === 'high' && (
                <Badge variant="destructive" className="text-xs">Priority</Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground mb-2">
              {notification.content}
            </p>

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {formatNotificationTime(notification.createdAt)}
              </span>

              {!notification.isRead && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsRead(notification.id);
                  }}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Mark as read
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface NotificationsPageProps {
  embedded?: boolean;
}

export default function NotificationsPage({ embedded = false }: NotificationsPageProps) {
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<FilterType>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const queryClient = useQueryClient();
  
  const ITEMS_PER_PAGE = 5;

  // Fetch notifications with server-side pagination + filtering
  const { data: notificationsData, isLoading } = useQuery<NotificationResponse>({
    queryKey: ['/api/notifications', currentPage, ITEMS_PER_PAGE, filter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(ITEMS_PER_PAGE),
        filter,
      });
      const response = await apiRequest('GET', `/api/notifications?${params.toString()}`);
      return response.json();
    },
  });
console.log('notificationsData', notificationsData);
  // Fetch unread count
  const { data: unreadCountData } = useQuery<UnreadCountResponse>({
    queryKey: ['/api/notifications/unread-count'],
  });

  // Mark single notification as read
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) =>
      apiRequest('PATCH', `/api/notifications/${notificationId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });

  // Mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: () =>
      apiRequest('PATCH', '/api/notifications/mark-all-read'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });

  const notifications = notificationsData?.notifications || [];
  const unreadCount = unreadCountData?.count || 0;
  const counts = notificationsData?.counts;
  const allCount = counts?.all ?? 0;
  const formulaCount = counts?.formula_update ?? 0;
  const orderCount = counts?.order_update ?? 0;
  const systemCount = counts?.system ?? 0;
  const totalPages = notificationsData?.totalPages ?? 0;
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;
  const paginationItems = useMemo(() => getPaginationItems(currentPage, totalPages), [currentPage, totalPages]);
console.log(paginationItems, 'paginationItems');
  const handleMarkAsRead = (notificationId: string) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  // Handle filter change and reset to page 1
  const handleFilterChange = (value: string) => {
    setFilter(value as FilterType);
    setCurrentPage(1);
  };

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className={embedded ? "space-y-4" : "container max-w-4xl mx-auto py-6 px-4"}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {!embedded && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/dashboard')}
              className="h-9 w-9"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            {!embedded && (
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Bell className="h-6 w-6" />
                Notifications
              </h1>
            )}
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={markAllAsReadMutation.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={handleFilterChange} className="mb-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all" className="text-xs sm:text-sm">
            All
            <Badge variant="secondary" className="ml-1.5 text-xs">
              {allCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="unread" className="text-xs sm:text-sm">
            Unread
            {unreadCount > 0 && (
              <Badge variant="default" className="ml-1.5 text-xs">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="formula_update" className="text-xs sm:text-sm">
            <Beaker className="h-3 w-3 mr-1 hidden sm:inline" />
            Formula
            {formulaCount > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs">
                {formulaCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="order_update" className="text-xs sm:text-sm">
            <Package className="h-3 w-3 mr-1 hidden sm:inline" />
            Orders
            {orderCount > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs">
                {orderCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="system" className="text-xs sm:text-sm">
            <Info className="h-3 w-3 mr-1 hidden sm:inline" />
            System
            {systemCount > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs">
                {systemCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Notifications List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : notifications.length > 0 ? (
        <div className="space-y-4">
          {/* Notifications */}
          <div className="space-y-3">
            {notifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!hasPrevPage}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                {paginationItems.map((item, index) =>
                  typeof item === 'number' ? (
                    <Button
                      key={item}
                      variant={item === currentPage ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(item)}
                      className="min-w-9"
                    >
                      {item}
                    </Button>
                  ) : (
                    <span key={`${item}-${index}`} className="px-1 text-muted-foreground text-sm">
                      ...
                    </span>
                  )
                )}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!hasNextPage}
                  onClick={() => setCurrentPage(next => next + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-lg mb-1">
              {filter === 'all' ? 'No notifications yet' : `No ${filter.replace('_', ' ')} notifications`}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {filter === 'all'
                ? "When you receive notifications about your formula, orders, or account, they'll appear here."
                : `You don't have any ${filter.replace('_', ' ')} notifications at the moment.`}
            </p>
            {/* {filter !== 'all' && (
              <Button
                variant="ghost"
                className="mt-2 text-primary"
                onClick={() => setFilter('all')}
              >
                View all notifications
              </Button>
            )} */}
          </CardContent>
        </Card>
      )}

      {/* Footer hint */}
      {allCount > 0 && (
        <p className="text-xs text-muted-foreground text-center mt-6">
          Notifications are kept for 30 days. Manage notification preferences in{' '}
          <Button
            variant="ghost"
            className="h-auto p-0 text-xs text-primary hover:underline"
            onClick={() => setLocation('/dashboard/settings#notifications')}
          >
            Settings
          </Button>
        </p>
      )}
    </div>
  );
}
