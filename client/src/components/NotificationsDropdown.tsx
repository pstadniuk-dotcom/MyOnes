import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { Bell, Check, CheckCheck, Eye, Package, Beaker, Calendar, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { apiRequest } from '@/lib/queryClient';
import type { Notification } from '@shared/schema';

interface NotificationResponse {
  notifications: Notification[];
}

interface UnreadCountResponse {
  count: number;
}

const NotificationIcon = ({ type, metadata }: { type: string; metadata?: any }) => {
  const iconProps = { className: "h-4 w-4" };
  
  // Use metadata icon if available, otherwise fallback to type-based icons
  if (metadata?.icon) {
    switch (metadata.icon) {
      case 'package':
        return <Package {...iconProps} />;
      case 'beaker':
        return <Beaker {...iconProps} />;
      case 'calendar':
        return <Calendar {...iconProps} />;
      default:
        return <Info {...iconProps} />;
    }
  }
  
  // Fallback to notification type icons
  switch (type) {
    case 'order_update':
      return <Package {...iconProps} />;
    case 'formula_update':
      return <Beaker {...iconProps} />;
    case 'consultation_reminder':
      return <Calendar {...iconProps} />;
    case 'system':
    default:
      return <Info {...iconProps} />;
  }
};

const formatNotificationTime = (createdAt: string | Date) => {
  const date = new Date(createdAt);
  const now = new Date();
  const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60);
  
  if (diffInMinutes < 60) {
    return formatDistanceToNow(date, { addSuffix: true });
  } else if (diffInMinutes < 24 * 60) {
    return format(date, 'h:mm a');
  } else {
    return format(date, 'MMM d');
  }
};

const NotificationItem = ({ 
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
    
    // Navigate to action URL if provided
    if (notification.metadata?.actionUrl) {
      window.location.href = notification.metadata.actionUrl;
    }
  };

  return (
    <DropdownMenuItem 
      className="flex items-start gap-3 p-3 cursor-pointer hover-elevate"
      onClick={handleClick}
      data-testid={`notification-item-${notification.id}`}
    >
      <div className="flex-shrink-0 mt-0.5">
        <NotificationIcon type={notification.type} metadata={notification.metadata} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className={`text-sm font-medium leading-none ${notification.isRead ? 'text-muted-foreground' : 'text-foreground'}`}>
            {notification.title}
          </p>
          {!notification.isRead && (
            <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
          )}
        </div>
        
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          {notification.content}
        </p>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {formatNotificationTime(notification.createdAt)}
          </span>
          
          {notification.metadata?.priority === 'high' && (
            <Badge variant="destructive" className="text-xs h-5">
              Priority
            </Badge>
          )}
          
          {!notification.isRead && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-2 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsRead(notification.id);
              }}
              data-testid={`button-mark-read-${notification.id}`}
            >
              <Check className="h-3 w-3 mr-1" />
              Mark read
            </Button>
          )}
        </div>
      </div>
    </DropdownMenuItem>
  );
};

export function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notificationsData, isLoading } = useQuery<NotificationResponse>({
    queryKey: ['/api/notifications'],
    enabled: isOpen,
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
  const hasUnreadNotifications = unreadCount > 0;

  const handleMarkAsRead = (notificationId: string) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="w-9 h-9 relative" 
          data-testid="button-notifications"
        >
          <Bell className="h-4 w-4" />
          {hasUnreadNotifications && (
            <span 
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full text-[10px] font-medium flex items-center justify-center text-white border-2 border-background"
              data-testid="notification-badge"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        className="w-80 p-0" 
        align="end" 
        forceMount
        data-testid="notifications-dropdown"
      >
        <DropdownMenuLabel className="flex items-center justify-between p-4 pb-2">
          <span className="font-semibold">Notifications</span>
          {hasUnreadNotifications && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isPending}
              className="h-6 px-2 text-xs"
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        
        <Separator />
        
        <ScrollArea className="max-h-96">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : notifications.length > 0 ? (
            <div className="p-1">
              {notifications.map((notification, index) => (
                <div key={notification.id}>
                  <NotificationItem 
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                  />
                  {index < notifications.length - 1 && <Separator className="my-1" />}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground">You're all caught up!</p>
            </div>
          )}
        </ScrollArea>
        
        <Separator />
        
        <div className="p-2">
          <DropdownMenuItem asChild>
            <Button 
              variant="ghost" 
              className="w-full justify-center text-sm"
              onClick={() => window.location.href = '/dashboard/notifications'}
              data-testid="link-view-all-notifications"
            >
              <Eye className="h-4 w-4 mr-2" />
              View all notifications
            </Button>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}