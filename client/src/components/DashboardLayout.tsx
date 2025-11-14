import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { NotificationsDropdown } from '@/components/NotificationsDropdown';
import { 
  ChevronDown, 
  LogOut, 
  Bell, 
  Shield
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'wouter';
import { useEffect, useState } from 'react';
import { useTimezoneSync } from '@/hooks/use-timezone';

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
          className="flex items-center gap-2 h-9 px-2 hover-elevate" 
          data-testid="button-user-menu"
        >
          <Avatar className="h-7 w-7">
            <AvatarImage src="" alt={user.name} />
            <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
          </Avatar>
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-sm font-medium leading-none">{user.name}</span>
            <span className="text-xs text-muted-foreground leading-none">{user.email}</span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src="" alt={user.name} />
                <AvatarFallback className="text-sm">{userInitials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <p className="text-sm font-medium leading-none">{user.name}</p>
                <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
              </div>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/settings?tab=notifications" data-testid="link-notifications">
              <Bell className="mr-2 h-4 w-4" />
              <span>Notifications</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/settings?tab=privacy" data-testid="link-privacy">
              <Shield className="mr-2 h-4 w-4" />
              <span>Privacy</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={logout} 
          className="text-red-600 focus:text-red-600" 
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

  // Custom sidebar width for dashboard
  const style = {
    "--sidebar-width": "18rem",       // 288px for better content
    "--sidebar-width-icon": "4rem",   // icon width when collapsed
  };

  return (
    <SidebarProvider defaultOpen={true} style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <SidebarInset>
          <div className="flex flex-col h-full">
            {/* Dashboard Header */}
            <header 
              className="flex items-center justify-between h-14 px-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
              data-testid="header-dashboard"
            >
              <div className="flex items-center gap-2">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <div className="h-6 w-px bg-border mx-2" />
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-lg">Ones</span>
                  <Badge variant="secondary" className="text-xs">AI</Badge>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Notifications Dropdown */}
                <NotificationsDropdown />

                {/* Theme toggle removed */}
                
                <UserDropdown />
              </div>
            </header>

            {/* Dashboard Content */}
            <main className="flex-1 overflow-auto p-6 bg-muted/30">
              {children}
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}