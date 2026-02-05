import { useState } from 'react';
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
  Filter,
  Trash2,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Separator } from '@/shared/components/ui/separator';
import { apiRequest } from '@/shared/lib/queryClient';
import { useLocation } from 'wouter';
import type { Notification } from '@shared/schema';

interface NotificationResponse {
  notifications: Notification[];
}

interface UnreadCountResponse {
  count: number;
}

type FilterType = 'all' | 'unread' | 'formula_update' | 'order_update' | 'system';

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

export default function NotificationsPage() {
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<FilterType>('all');
  const queryClient = useQueryClient();

  // Fetch all notifications
  const { data: notificationsData, isLoading } = useQuery<NotificationResponse>({
    queryKey: ['/api/notifications'],
  });

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

  // Filter notifications based on selected tab
  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.isRead;
      case 'formula_update':
        return notification.type === 'formula_update';
      case 'order_update':
        return notification.type === 'order_update';
      case 'system':
        return notification.type === 'system' || notification.type === 'consultation_reminder';
      default:
        return true;
    }
  });

  const handleMarkAsRead = (notificationId: string) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/dashboard')}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6" />
              Notifications
            </h1>
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
      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)} className="mb-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all" className="text-xs sm:text-sm">
            All
            <Badge variant="secondary" className="ml-1.5 text-xs">
              {notifications.length}
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
          </TabsTrigger>
          <TabsTrigger value="order_update" className="text-xs sm:text-sm">
            <Package className="h-3 w-3 mr-1 hidden sm:inline" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="system" className="text-xs sm:text-sm">
            <Info className="h-3 w-3 mr-1 hidden sm:inline" />
            System
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Notifications List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredNotifications.length > 0 ? (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onMarkAsRead={handleMarkAsRead}
            />
          ))}
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
            {filter !== 'all' && (
              <Button
                variant="ghost"
                className="mt-2 text-primary"
                onClick={() => setFilter('all')}
              >
                View all notifications
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Footer hint */}
      {notifications.length > 0 && (
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
