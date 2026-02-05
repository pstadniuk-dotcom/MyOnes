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
  Settings
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
          className="flex items-center gap-2 h-9 px-2 hover:bg-[#1B4332]/5 transition-colors"
          data-testid="button-user-menu"
        >
          <Avatar className="h-7 w-7 border border-[#1B4332]/10">
            <AvatarImage src="" alt={user.name} />
            <AvatarFallback className="text-xs bg-[#1B4332] text-white">{userInitials}</AvatarFallback>
          </Avatar>
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-sm font-medium leading-none text-[#1B4332]">{user.name}</span>
            <span className="text-xs text-[#52796F] leading-none">{user.email}</span>
          </div>
          <ChevronDown className="h-4 w-4 text-[#52796F]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 bg-[#FAF7F2] border-[#1B4332]/10" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-[#1B4332]/10">
                <AvatarImage src="" alt={user.name} />
                <AvatarFallback className="text-sm bg-[#1B4332] text-white">{userInitials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <p className="text-sm font-medium leading-none text-[#1B4332]">{user.name}</p>
                <p className="text-xs leading-none text-[#52796F]">{user.email}</p>
              </div>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-[#1B4332]/10" />
        <DropdownMenuGroup>
          {user.isAdmin && (
            <DropdownMenuItem asChild className="hover:bg-[#1B4332]/5 focus:bg-[#1B4332]/5 cursor-pointer">
              <Link href="/admin" data-testid="link-admin-panel">
                <Settings className="mr-2 h-4 w-4 text-[#52796F]" />
                <span className="text-[#1B4332]">Admin Panel</span>
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild className="hover:bg-[#1B4332]/5 focus:bg-[#1B4332]/5 cursor-pointer">
            <Link href="/dashboard/settings?tab=notifications" data-testid="link-notifications">
              <Bell className="mr-2 h-4 w-4 text-[#52796F]" />
              <span className="text-[#1B4332]">Notifications</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="hover:bg-[#1B4332]/5 focus:bg-[#1B4332]/5 cursor-pointer">
            <Link href="/dashboard/settings?tab=privacy" data-testid="link-privacy">
              <Shield className="mr-2 h-4 w-4 text-[#52796F]" />
              <span className="text-[#1B4332]">Privacy</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-[#1B4332]/10" />
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
      <div className="flex flex-col min-h-dvh bg-[#FAF7F2]">
        {/* Compact mobile header */}
        <MobileHeader />

        {/* Main content - no extra padding, let pages control their own layout */}
        <main className="flex-1 overflow-auto pb-20">
          {children}
        </main>

        {/* Bottom navigation - thumb zone optimized */}
        <MobileBottomNav />
      </div>
    );
  }

  // Desktop layout: sidebar + header
  return (
    <SidebarProvider defaultOpen={true} style={style as React.CSSProperties}>
      <div className="flex h-screen w-full bg-[#FAF7F2]">
        <AppSidebar />
        <SidebarInset>
          <div className="flex flex-col h-full">
            {/* Dashboard Header - V2 Branding */}
            <header
              className="flex items-center justify-between h-16 px-6 border-b border-[#1B4332]/5 bg-[#FAF7F2]/80 backdrop-blur-md"
              data-testid="header-dashboard"
            >
              <div className="flex items-center gap-3">
                <SidebarTrigger className="text-[#1B4332] hover:bg-[#1B4332]/5" data-testid="button-sidebar-toggle" />
              </div>

              <div className="flex items-center gap-3">
                {/* Notifications Dropdown */}
                <NotificationsDropdown />

                <UserDropdown />
              </div>
            </header>

            {/* Dashboard Content */}
            <main className="flex-1 overflow-auto p-6 bg-[#FAF7F2]">
              {children}
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}