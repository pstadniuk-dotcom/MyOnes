import {
  Home,
  MessageSquare,
  FlaskConical,
  Package,
  User,
  HelpCircle,
  Brain,
  Activity,
  CreditCard,
  Settings,
  FileText,
  Shield,
  Zap,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';

// Menu items configuration
const mainMenuItems = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: Home,
    description: 'Overview and key metrics',
  },
  {
    title: 'AI Consultation',
    url: '/dashboard/consultation',
    icon: MessageSquare,
    description: 'Chat with ONES AI',
    badge: 'AI',
  },
  {
    title: 'My Formula',
    url: '/dashboard/formula',
    icon: FlaskConical,
    description: 'Current supplement formula',
  },
];

const healthMenuItems = [
  {
    title: 'Health Profile',
    url: '/dashboard/profile',
    icon: Activity,
    description: 'Manage health information',
  },
];

const accountMenuItems = [
  {
    title: 'Orders & Billing',
    url: '/dashboard/orders',
    icon: Package,
    description: 'Subscription and orders',
  },
  {
    title: 'Account Settings',
    url: '/dashboard/profile?tab=settings',
    icon: Settings,
    description: 'Privacy and preferences',
  },
];

const supportMenuItems = [
  {
    title: 'Help Center',
    url: '/dashboard/support',
    icon: HelpCircle,
    description: 'Get help and support',
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const isActive = (url: string) => {
    if (url === '/dashboard') {
      return location === '/dashboard';
    }
    return location.startsWith(url);
  };

  const userInitials = user?.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || 'U';

  return (
    <Sidebar data-testid="sidebar-main">
      {/* Sidebar Header */}
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <Brain className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-lg">ONES</span>
              <Badge variant="secondary" className="text-xs">AI</Badge>
            </div>
            <span className="text-xs text-muted-foreground">Personalized Supplements</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.description}
                    data-testid={`nav-${item.title.toLowerCase().replace(' ', '-')}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Health & Data */}
        <SidebarGroup>
          <SidebarGroupLabel>Health & Data</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {healthMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.description}
                    data-testid={`nav-${item.title.toLowerCase().replace(' ', '-').replace('&', 'and')}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Account */}
        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.description}
                    data-testid={`nav-${item.title.toLowerCase().replace(' ', '-').replace('&', 'and')}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Support */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {supportMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.description}
                    data-testid={`nav-${item.title.toLowerCase().replace(' ', '-')}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Sidebar Footer */}
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-muted-foreground">Premium Plan</p>
          </div>
          <div className="w-2 h-2 bg-green-500 rounded-full" title="Online" />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}