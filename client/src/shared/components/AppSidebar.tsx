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
  Activity,
  Salad,
  Dumbbell,
  Heart,
  LogOut,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
import { isOptimizeEnabled } from '@/shared/config/features';
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
  useSidebar,
} from '@/shared/components/ui/sidebar';
import { Link, useLocation } from 'wouter';

const healthJourneyItems = [
  { title: 'Dashboard',    url: '/dashboard',         icon: Home },
  { title: 'Consultation', url: '/dashboard/chat',    icon: MessageSquare },
  { title: 'Formulation',  url: '/dashboard/formula', icon: FlaskConical },
  { title: 'Wearables',    url: '/dashboard/wearables', icon: Watch },
  { title: 'Labs',         url: '/dashboard/lab-reports', icon: FileText },
];

const optimizeItems = [
  { title: 'Tracking',  url: '/dashboard/optimize/tracking',   icon: Activity },
  { title: 'Nutrition', url: '/dashboard/optimize/nutrition',  icon: Salad },
  { title: 'Workout',   url: '/dashboard/optimize/workout',    icon: Dumbbell },
  { title: 'Lifestyle', url: '/dashboard/optimize/lifestyle',  icon: Heart },
];

const accountItems = [
  { title: 'Profile',  url: '/dashboard/profile',  icon: User },
  { title: 'Settings', url: '/dashboard/settings', icon: Settings },
  { title: 'Orders',   url: '/dashboard/orders',   icon: Package },
  { title: 'Support',  url: '/dashboard/support',  icon: HelpCircle },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { logout } = useAuth();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const isActive = (url: string) => {
    if (url === '/dashboard') return location === '/dashboard';
    return location.startsWith(url);
  };

  const activeClass = 'bg-[#054700] text-white font-medium shadow-sm';
  const inactiveClass = 'text-[#054700] hover:bg-[#054700]/10 hover:text-[#054700]';

  return (
    <Sidebar
      collapsible="icon"
      data-testid="sidebar-main"
      className="border-r border-[#054700]/10 bg-[#ede8e2]/80 backdrop-blur-md"
    >
      {/* Header — full logo when expanded, "O" initial when collapsed */}
      <SidebarHeader className="h-16 border-b border-[#054700]/10 flex items-center justify-center">
        <Link href="/" className="flex items-center justify-center w-full">
          {isCollapsed
            ? <span className="text-[#054700] font-bold text-xl select-none">O</span>
            : <img src="/ones-logo-light.svg" alt="Ones" className="h-7" />
          }
        </Link>
      </SidebarHeader>

      <SidebarContent className="py-4 flex flex-col">

        {/* Health Journey */}
        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="text-[#5a6623] text-xs font-medium uppercase tracking-wider px-3 mb-2">
              Your Health Journey
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {healthJourneyItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className={`rounded-lg transition-all duration-200 ${isActive(item.url) ? activeClass : inactiveClass}`}
                    data-testid={`nav-${item.title.toLowerCase().replace(' ', '-')}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4 shrink-0" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Optimize */}
        {isOptimizeEnabled() && (
          <SidebarGroup className="mt-4">
            {!isCollapsed && (
              <SidebarGroupLabel className="text-[#5a6623] text-xs font-medium uppercase tracking-wider px-3 mb-2">
                Optimize
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {optimizeItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                      className={`rounded-lg transition-all duration-200 ${isActive(item.url) ? activeClass : inactiveClass}`}
                      data-testid={`nav-optimize-${item.title.toLowerCase()}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="w-4 h-4 shrink-0" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Account */}
        <SidebarGroup className="mt-4">
          {!isCollapsed && (
            <SidebarGroupLabel className="text-[#5a6623] text-xs font-medium uppercase tracking-wider px-3 mb-2">
              Account
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {accountItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className={`rounded-lg transition-all duration-200 ${isActive(item.url) ? activeClass : inactiveClass}`}
                    data-testid={`nav-${item.title.toLowerCase().replace(' ', '-')}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4 shrink-0" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Sign Out */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setShowSignOutConfirm(true)}
                  tooltip="Sign Out"
                  className="rounded-lg transition-all duration-200 text-red-600 hover:bg-red-50 hover:text-red-700 w-full justify-start"
                  data-testid="nav-logout"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  {!isCollapsed && <span>Sign Out</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>

      {!isCollapsed && (
        <SidebarFooter className="p-4 border-t border-[#054700]/10">
          <p className="text-[#5a6623] text-xs text-center">© 2026 Ones</p>
        </SidebarFooter>
      )}

      <AlertDialog open={showSignOutConfirm} onOpenChange={setShowSignOutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be signed out of your account. Any unsaved changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={logout} className="bg-red-600 hover:bg-red-700 text-white">
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}