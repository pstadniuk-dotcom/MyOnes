import { useState } from 'react';
import { MessageSquare, FlaskConical, Sparkles, ClipboardList, Menu, Home, User, Settings, FileText, Activity, ChevronUp, X, Watch, LogOut } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/shared/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/shared/components/ui/sheet';
import { FEATURES, isOptimizeEnabled } from '@/shared/config/features';
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

// Base nav items - filtered based on feature flags
const allNavItems = [
  { href: '/dashboard/chat', icon: MessageSquare, label: 'AI Chat', exact: false, requiresFeature: null },
  { href: '/dashboard/formula', icon: FlaskConical, label: 'Formula', exact: false, requiresFeature: null },
  { href: '/dashboard/optimize', icon: Sparkles, label: 'Optimize', exact: false, requiresFeature: 'OPTIMIZE' as const },
  { href: '/dashboard/optimize/tracking', icon: ClipboardList, label: 'Log', exact: true, requiresFeature: 'TRACKING_PAGE' as const },
  { href: '/dashboard/wearables', icon: Watch, label: 'Wearables', exact: true, requiresFeature: null },
];

// Full menu items for the slide-up sheet - filtered based on feature flags
const allMenuItems = [
  { href: '/dashboard', icon: Home, label: 'Dashboard', description: 'Your health overview', requiresFeature: null },
  { href: '/dashboard/chat', icon: MessageSquare, label: 'AI Chat', description: 'Talk to your health AI', requiresFeature: null },
  { href: '/dashboard/formula', icon: FlaskConical, label: 'My Formula', description: 'Your supplement formula', requiresFeature: null },
  { href: '/dashboard/optimize', icon: Sparkles, label: 'Optimize', description: 'Nutrition, workout & lifestyle', requiresFeature: 'OPTIMIZE' as const },
  { href: '/dashboard/optimize/tracking', icon: Activity, label: 'Daily Log', description: 'Track your progress', requiresFeature: 'TRACKING_PAGE' as const },
  { href: '/dashboard/wearables', icon: Watch, label: 'Wearables', description: 'Connect fitness trackers', requiresFeature: null },
  { href: '/dashboard/lab-reports', icon: FileText, label: 'Lab Results', description: 'Upload and analyze labs', requiresFeature: null },
  { href: '/dashboard/profile', icon: User, label: 'Profile', description: 'Your health profile', requiresFeature: null },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings', description: 'App preferences', requiresFeature: null },
];

// Filter items based on feature flags
function filterByFeature<T extends { requiresFeature: string | null }>(items: T[]): T[] {
  return items.filter(item => {
    if (item.requiresFeature === null) return true;
    if (item.requiresFeature === 'OPTIMIZE') return isOptimizeEnabled();
    if (item.requiresFeature === 'TRACKING_PAGE') return FEATURES.TRACKING_PAGE;
    return true;
  });
}

export function MobileBottomNav() {
  const [location, navigate] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { logout } = useAuth();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  // Filter nav items based on feature flags
  const navItems = filterByFeature(allNavItems);
  const menuItems = filterByFeature(allMenuItems);

  const isActive = (item: typeof navItems[0]) => {
    if (item.exact) {
      return location === item.href;
    }
    // For non-exact matches, check if current location starts with href
    // but exclude tracking from optimize match
    if (item.href === '/dashboard/optimize') {
      return location.startsWith('/dashboard/optimize') && !location.includes('/tracking');
    }
    // For chat, also match consultation
    if (item.href === '/dashboard/chat') {
      return location === '/dashboard/chat' || location === '/dashboard/consultation';
    }
    return location.startsWith(item.href);
  };

  const isMenuItemActive = (href: string) => {
    if (href === '/dashboard') {
      return location === '/dashboard';
    }
    if (href === '/dashboard/optimize') {
      return location.startsWith('/dashboard/optimize') && !location.includes('/tracking');
    }
    if (href === '/dashboard/optimize/tracking') {
      return location === '/dashboard/optimize/tracking';
    }
    return location.startsWith(href);
  };

  const handleMenuItemClick = (href: string) => {
    setMenuOpen(false);
    navigate(href);
  };

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-[#ede8e2]/95 backdrop-blur-md border-t border-[#054700]/10 safe-bottom"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-between w-full h-16 px-2">
          {navItems.map((item) => {
            const active = isActive(item);

            return (
              <Link key={item.href} href={item.href} className="flex-1">
                <button
                  className={cn(
                    "flex flex-col items-center justify-center w-full h-14 rounded-xl transition-all duration-200",
                    "touch-feedback",
                    active
                      ? "text-[#054700]"
                      : "text-[#5a6623] hover:text-[#054700]"
                  )}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5 mb-0.5 transition-all duration-200",
                      active && "stroke-[2.5]"
                    )}
                  />
                  <span className={cn(
                    "text-[10px] leading-tight truncate max-w-full px-1",
                    active ? "font-semibold" : "font-medium"
                  )}>
                    {item.label}
                  </span>
                  {/* Active indicator dot */}
                  {active && (
                    <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-[#054700]" />
                  )}
                </button>
              </Link>
            );
          })}

          {/* Menu button */}
          <button
            onClick={() => setMenuOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-14 rounded-xl transition-all duration-200",
              "touch-feedback text-[#5a6623] hover:text-[#054700]"
            )}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5 mb-0.5" />
            <span className="text-[10px] leading-tight font-medium">More</span>
          </button>
        </div>
      </nav>

      {/* Slide-up menu sheet */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-auto pb-safe" hideCloseButton>
          <SheetHeader className="pb-4 border-b">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg font-semibold text-[#054700]">Navigation</SheetTitle>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-2 rounded-full bg-[#054700]/10 hover:bg-[#054700]/20 transition-colors"
                aria-label="Close menu"
              >
                <X className="h-5 w-5 text-[#054700]" />
              </button>
            </div>
          </SheetHeader>

          <div className="py-4 space-y-1">
            {menuItems.map((item) => {
              const active = isMenuItemActive(item.href);
              return (
                <button
                  key={item.href}
                  onClick={() => handleMenuItemClick(item.href)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl transition-all",
                    "touch-feedback text-left",
                    active
                      ? "bg-[#054700]/10 text-[#054700]"
                      : "hover:bg-[#054700]/5 text-[#054700]/80"
                  )}
                >
                  <div className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0",
                    active ? "bg-[#054700] text-white" : "bg-[#054700]/10 text-[#5a6623]"
                  )}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "font-semibold text-base",
                      active && "text-[#054700]"
                    )}>
                      {item.label}
                    </p>
                    <p className="text-sm text-[#5a6623] truncate">
                      {item.description}
                    </p>
                  </div>
                  {active && (
                    <div className="h-2 w-2 rounded-full bg-[#054700] flex-shrink-0" />
                  )}
                </button>
              );
            })}

            {/* Sign Out Button */}
            <button
              onClick={() => {
                setMenuOpen(false);
                setShowSignOutConfirm(true);
              }}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-xl transition-all",
                "touch-feedback text-left hover:bg-red-50 text-red-600"
              )}
            >
              <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-red-50 text-red-600">
                <LogOut className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-base">Sign Out</p>
                <p className="text-sm text-red-500/70 truncate">Sign out of your account</p>
              </div>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showSignOutConfirm} onOpenChange={setShowSignOutConfirm}>
        <AlertDialogContent className="w-[90vw] rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be signed out of your account. Any unsaved changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2">
            <AlertDialogCancel className="flex-1 rounded-2xl mt-0">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={logout}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-2xl"
            >
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
