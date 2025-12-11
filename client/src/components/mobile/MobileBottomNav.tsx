import { Home, Sparkles, ClipboardList, User } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Home', exact: true },
  { href: '/dashboard/optimize', icon: Sparkles, label: 'Optimize', exact: false },
  { href: '/dashboard/optimize/tracking', icon: ClipboardList, label: 'Log', exact: true },
  { href: '/dashboard/profile', icon: User, label: 'Profile', exact: false },
];

export function MobileBottomNav() {
  const [location] = useLocation();
  
  const isActive = (item: typeof navItems[0]) => {
    if (item.exact) {
      return location === item.href;
    }
    // For non-exact matches, check if current location starts with href
    // but exclude tracking from optimize match
    if (item.href === '/dashboard/optimize') {
      return location.startsWith('/dashboard/optimize') && !location.includes('/tracking');
    }
    return location.startsWith(item.href);
  };
  
  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-[#1B4332]/10 safe-bottom"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const active = isActive(item);
          
          return (
            <Link key={item.href} href={item.href}>
              <button
                className={cn(
                  "flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all duration-200",
                  "touch-feedback",
                  active 
                    ? "text-[#1B4332]" 
                    : "text-[#52796F] hover:text-[#1B4332]"
                )}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
              >
                <item.icon 
                  className={cn(
                    "h-6 w-6 mb-0.5 transition-all duration-200",
                    active && "stroke-[2.5]"
                  )} 
                />
                <span className={cn(
                  "text-[10px] leading-tight",
                  active ? "font-semibold" : "font-medium"
                )}>
                  {item.label}
                </span>
                {/* Active indicator dot */}
                {active && (
                  <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-[#1B4332]" />
                )}
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
