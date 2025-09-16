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
import { Bell, ChevronDown, Moon, Sun, User, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'wouter';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <Button variant="ghost" size="icon" className="w-9 h-9"><Sun className="h-4 w-4" /></Button>;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      className="w-9 h-9"
      data-testid="button-theme-toggle"
    >
      {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

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
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/profile" data-testid="link-profile">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/profile?tab=settings" data-testid="link-settings">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
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
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
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
                  <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
                    <span className="text-xs font-bold text-primary-foreground">O</span>
                  </div>
                  <span className="font-semibold text-lg">ONES</span>
                  <Badge variant="secondary" className="text-xs">AI</Badge>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Notification Bell */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="w-9 h-9 relative" 
                  data-testid="button-notifications"
                >
                  <Bell className="h-4 w-4" />
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white">
                    2
                  </span>
                  <span className="sr-only">Notifications</span>
                </Button>

                <ThemeToggle />
                
                <div className="h-6 w-px bg-border mx-1" />
                
                <UserDropdown />
              </div>
            </header>

            {/* Dashboard Content */}
            <main className="flex-1 overflow-hidden p-6 bg-muted/30">
              {children}
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}