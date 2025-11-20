import {
  Home,
  MessageSquare,
  FlaskConical,
  Package,
  FileText,
  HelpCircle,
  Watch,
  User,
  Settings,
  Sparkles,
  Salad,
  Dumbbell,
  Heart,
  ChevronRight,
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { Link, useLocation } from 'wouter';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const healthJourneyItems = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: Home,
  },
  {
    title: 'Consultation',
    url: '/dashboard/chat',
    icon: MessageSquare,
  },
  {
    title: 'Formulation',
    url: '/dashboard/formula',
    icon: FlaskConical,
  },
  {
    title: 'Wearables',
    url: '/dashboard/wearables',
    icon: Watch,
  },
  {
    title: 'Labs',
    url: '/dashboard/lab-reports',
    icon: FileText,
  },
];

const accountItems = [
  {
    title: 'Profile',
    url: '/dashboard/profile',
    icon: User,
  },
  {
    title: 'Settings',
    url: '/dashboard/settings',
    icon: Settings,
  },
  {
    title: 'Orders',
    url: '/dashboard/orders',
    icon: Package,
  },
  {
    title: 'Support',
    url: '/dashboard/support',
    icon: HelpCircle,
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

  const isOptimizeActive = location.startsWith('/dashboard/optimize');

  return (
    <Sidebar data-testid="sidebar-main">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Your Health Journey</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {healthJourneyItems.map((item) => (
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
              
              {/* Optimize collapsible menu */}
              <Collapsible defaultOpen={isOptimizeActive} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={isOptimizeActive}>
                      <Sparkles />
                      <span>Optimize</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={location === '/dashboard/optimize/nutrition'}>
                          <Link href="/dashboard/optimize/nutrition">
                            <Salad className="h-4 w-4" />
                            <span>Nutrition</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={location === '/dashboard/optimize/workout'}>
                          <Link href="/dashboard/optimize/workout">
                            <Dumbbell className="h-4 w-4" />
                            <span>Workout</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={location === '/dashboard/optimize/lifestyle'}>
                          <Link href="/dashboard/optimize/lifestyle">
                            <Heart className="h-4 w-4" />
                            <span>Lifestyle</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountItems.map((item) => (
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