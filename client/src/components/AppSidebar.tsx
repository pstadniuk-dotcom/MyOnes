import {
  Home,
  MessageSquare,
  FlaskConical,
  Package,
  User,
  FileText,
  Settings,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Link, useLocation } from 'wouter';

// Simplified menu items for cleaner navigation
const menuItems = [
  {
    title: 'Home',
    url: '/dashboard',
    icon: Home,
  },
  {
    title: 'Chat',
    url: '/dashboard/chat',
    icon: MessageSquare,
  },
  {
    title: 'Formula',
    url: '/dashboard/formula',
    icon: FlaskConical,
  },
  {
    title: 'Lab Reports',
    url: '/dashboard/lab-reports',
    icon: FileText,
  },
  {
    title: 'Profile',
    url: '/dashboard/profile',
    icon: User,
  },
  {
    title: 'Orders',
    url: '/dashboard/orders',
    icon: Package,
  },
  {
    title: 'Settings',
    url: '/dashboard/settings',
    icon: Settings,
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  const isActive = (url: string) => {
    if (url === '/dashboard') {
      return location === '/dashboard';
    }
    return location.startsWith(url);
  };

  return (
    <Sidebar data-testid="sidebar-main">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Ones AI</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    data-testid={`nav-${item.title.toLowerCase().replace(' ', '-')}`}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}