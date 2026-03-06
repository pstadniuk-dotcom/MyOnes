import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/shared/components/ui/sidebar';
import { AppSidebar } from '@/shared/components/AppSidebar';
import { Button } from '@/shared/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { NotificationsDropdown } from '@/features/notifications/components/NotificationsDropdown';
import {
  ChevronDown,
  LogOut,
  Bell,
  Shield,
  Settings,
  User
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'wouter';
import { useTimezoneSync } from '@/shared/hooks/use-timezone';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { MobileBottomNav, MobileHeader } from '@/shared/components/mobile';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

// Theme toggle removed: site is fixed to light mode

function UserDropdown() {
  const { user, logout } = useAuth();

  if (!user) return null;

  const userInitials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 h-9 px-2 hover:bg-[#054700]/5 transition-colors"
          data-testid="button-user-menu"
        >
          <Avatar className="h-7 w-7 border border-[#054700]/10">
            <AvatarImage src="" alt={user.name} />
            <AvatarFallback className="text-xs bg-[#054700] text-white">{userInitials}</AvatarFallback>
          </Avatar>
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-sm font-medium leading-none text-[#054700]">{user.name}</span>
            <span className="text-xs text-[#5a6623] leading-none">{user.email}</span>
          </div>
          <ChevronDown className="h-4 w-4 text-[#5a6623]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 glass-card border-[#054700]/10 shadow-2xl" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-[#054700]/10">
                <AvatarImage src="" alt={user.name} />
                <AvatarFallback className="text-sm bg-[#054700] text-white">{userInitials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <p className="text-sm font-medium leading-none text-[#054700]">{user.name}</p>
                <p className="text-xs leading-none text-[#5a6623]">{user.email}</p>
              </div>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-[#054700]/10" />
        <DropdownMenuGroup>

          {/* <DropdownMenuItem asChild className="hover:bg-[#054700]/5 focus:bg-[#054700]/5 cursor-pointer">
            <Link href="/dashboard/settings?tab=notifications" data-testid="link-notifications">
              <Bell className="mr-2 h-4 w-4 text-[#5a6623]" />
              <span className="text-[#054700]">Notifications</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="hover:bg-[#054700]/5 focus:bg-[#054700]/5 cursor-pointer">
            <Link href="/dashboard/settings?tab=privacy" data-testid="link-privacy">
              <Shield className="mr-2 h-4 w-4 text-[#5a6623]" />
              <span className="text-[#054700]">Privacy</span>
            </Link>
          </DropdownMenuItem> */}
          <DropdownMenuItem asChild className="hover:bg-[#054700]/5 focus:bg-[#054700]/5 cursor-pointer">
            <Link href="/dashboard/profile" data-testid="link-profile">
              <User className="mr-2 h-4 w-4 text-[#5a6623]" />
              <span className="text-[#054700]">Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="hover:bg-[#054700]/5 focus:bg-[#054700]/5 cursor-pointer">
            <Link href="/dashboard/settings" data-testid="link-settings">
              <Settings className="mr-2 h-4 w-4 text-[#5a6623]" />
              <span className="text-[#054700]">Settings</span>
            </Link>
          </DropdownMenuItem>
          {user.isAdmin && (
            <DropdownMenuItem asChild className="hover:bg-[#054700]/5 focus:bg-[#054700]/5 cursor-pointer">
              <Link href="/admin" data-testid="link-admin-panel">
                {/* <Settings className="mr-2 h-4 w-4 text-[#5a6623]" /> */}
                <Shield className="mr-2 h-4 w-4 text-[#5a6623]" />
                <span className="text-[#054700]">Admin Panel</span>
              </Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-[#054700]/10" />
        <DropdownMenuItem
          onClick={logout}
          className="text-red-600 focus:text-red-600 hover:bg-red-50 focus:bg-red-50 cursor-pointer"
          data-testid="button-logout"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  // Auto-sync user's timezone for SMS reminder scheduling
  useTimezoneSync();

  // Check if we're on mobile
  const isMobile = useIsMobile();

  // Custom sidebar width for dashboard
  const style = {
    "--sidebar-width": "18rem",       // 288px for better content
    "--sidebar-width-icon": "4rem",   // icon width when collapsed
  };

  // Mobile layout: compact header + bottom nav
  if (isMobile) {
    return (
      <div className="flex flex-col min-h-dvh bg-[#ede8e2]">
        {/* Compact mobile header */}
        <MobileHeader />

        {/* Main content - no extra padding, let pages control their own layout */}
        <main className="flex-1 overflow-auto pb-20 bg-gradient-to-br from-[#eef2eb] via-[#ede8e2] to-[#e4e8de] relative">
          {/* Decorative gradient blobs — fixed so they cover full viewport with no cutoff */}
          <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden="true">
            <div className="absolute -top-20 -left-20 w-[500px] h-[500px] rounded-full bg-[#054700]/15 blur-[100px] animate-blob-1" />
            <div className="absolute top-1/4 right-0 w-[450px] h-[450px] rounded-full bg-[#5a6623]/12 blur-[90px] animate-blob-2" />
            <div className="absolute top-1/2 left-0 w-[400px] h-[400px] rounded-full bg-[#8fa370]/18 blur-[80px] animate-blob-4" />
            <div className="absolute bottom-0 left-1/3 w-[550px] h-[550px] rounded-full bg-[#054700]/10 blur-[100px] animate-blob-3" />
            <div className="absolute top-[15%] right-[10%] w-[400px] h-[400px] rounded-full bg-[#5a6623]/14 blur-[90px] animate-blob-5" />
            <div className="absolute bottom-[15%] left-[10%] w-[350px] h-[350px] rounded-full bg-[#8fa370]/15 blur-[80px] animate-blob-6" />
          </div>
          <div className="relative z-10 p-4 pt-5">
            {children}
          </div>
        </main>

        {/* Bottom navigation - thumb zone optimized */}
        <MobileBottomNav />
      </div>
    );
  }

  // Desktop layout: sidebar + header
  return (
    <SidebarProvider defaultOpen={true} style={style as React.CSSProperties}>
      <div className="flex h-screen w-full bg-[#ede8e2]">
        <AppSidebar />
        <SidebarInset>
          <div className="flex flex-col h-full">
            {/* Dashboard Header - V2 Branding */}
            <header
              className="flex items-center justify-between h-16 px-6 border-b border-[#054700]/5 bg-[#ede8e2]/80 backdrop-blur-md"
              data-testid="header-dashboard"
            >
              <div className="flex items-center gap-3">
                <SidebarTrigger className="text-[#054700] hover:bg-[#054700]/5" data-testid="button-sidebar-toggle" />
              </div>

              <div className="flex items-center gap-3">
                {/* Notifications Dropdown */}
                <NotificationsDropdown />

                <UserDropdown />
              </div>
            </header>

            {/* Dashboard Content */}
            <main className="flex-1 overflow-auto p-6 bg-gradient-to-br from-[#eef2eb] via-[#ede8e2] to-[#e4e8de] relative">
              {/* Decorative gradient blobs — fixed so they cover full viewport with no cutoff */}
              <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden="true">
                <div className="absolute -top-20 -left-20 w-[500px] h-[500px] rounded-full bg-[#054700]/15 blur-[100px] animate-blob-1" />
                <div className="absolute top-1/4 right-0 w-[450px] h-[450px] rounded-full bg-[#5a6623]/12 blur-[90px] animate-blob-2" />
                <div className="absolute top-1/2 left-0 w-[400px] h-[400px] rounded-full bg-[#8fa370]/18 blur-[80px] animate-blob-4" />
                <div className="absolute bottom-0 left-1/3 w-[550px] h-[550px] rounded-full bg-[#054700]/10 blur-[100px] animate-blob-3" />
                <div className="absolute top-[15%] right-[10%] w-[400px] h-[400px] rounded-full bg-[#5a6623]/14 blur-[90px] animate-blob-5" />
                <div className="absolute bottom-[15%] left-[10%] w-[350px] h-[350px] rounded-full bg-[#8fa370]/15 blur-[80px] animate-blob-6" />
              </div>
              <div className="relative z-10">
                {children}
              </div>
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}