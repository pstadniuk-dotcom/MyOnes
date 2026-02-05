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
  Activity,
  Salad,
  Dumbbell,
  Heart,
} from 'lucide-react';
import { FEATURES, isOptimizeEnabled } from '@/shared/config/features';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/shared/components/ui/sidebar';
import { Link, useLocation } from 'wouter';

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

const optimizeItems = [
  {
    title: 'Tracking',
    url: '/dashboard/optimize/tracking',
    icon: Activity,
  },
  {
    title: 'Nutrition',
    url: '/dashboard/optimize/nutrition',
    icon: Salad,
  },
  {
    title: 'Workout',
    url: '/dashboard/optimize/workout',
    icon: Dumbbell,
  },
  {
    title: 'Lifestyle',
    url: '/dashboard/optimize/lifestyle',
    icon: Heart,
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

  return (
    <Sidebar data-testid="sidebar-main" className="border-r border-[#1B4332]/10 bg-[#FAF7F2]">
      <SidebarHeader className="p-6 border-b border-[#1B4332]/10">
        <Link href="/" className="flex items-center -space-x-3">
          <img src="/ones-logo-icon.svg" alt="" className="h-9 w-9" />
          <img src="/ones-logo-green.svg" alt="ONES" className="h-7" />
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[#52796F] text-xs font-medium uppercase tracking-wider px-3 mb-2">
            Your Health Journey
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {healthJourneyItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className={`
                      rounded-lg px-3 py-2.5 transition-all duration-200
                      ${isActive(item.url)
                        ? 'bg-[#1B4332] text-white font-medium shadow-sm'
                        : 'text-[#1B4332] hover:bg-[#1B4332]/10 hover:text-[#1B4332]'
                      }
                    `}
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

        {/* Optimize Section - Hidden when features are disabled */}
        {isOptimizeEnabled() && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-[#52796F] text-xs font-medium uppercase tracking-wider px-3 mb-2">
              Optimize
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {optimizeItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      className={`
                      rounded-lg px-3 py-2.5 transition-all duration-200
                      ${isActive(item.url)
                          ? 'bg-[#1B4332] text-white font-medium shadow-sm'
                          : 'text-[#1B4332] hover:bg-[#1B4332]/10 hover:text-[#1B4332]'
                        }
                    `}
                      data-testid={`nav-optimize-${item.title.toLowerCase()}`}
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
        )}

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-[#52796F] text-xs font-medium uppercase tracking-wider px-3 mb-2">
            Account
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className={`
                      rounded-lg px-3 py-2.5 transition-all duration-200
                      ${isActive(item.url)
                        ? 'bg-[#1B4332] text-white font-medium shadow-sm'
                        : 'text-[#1B4332] hover:bg-[#1B4332]/10 hover:text-[#1B4332]'
                      }
                    `}
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
      <SidebarFooter className="p-4 border-t border-[#1B4332]/10">
        <p className="text-[#52796F] text-xs text-center">
          © 2025 ONES AI
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}