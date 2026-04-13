import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/shared/lib/queryClient';
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  Home,
  Package,
  Users,
  MessageSquare,
  BarChart3,
  Tag,
  Settings,
  FileText,
  BookOpen,
  Shield,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  X,
  FlaskConical,
  DollarSign,
  HelpCircle,
  ArrowLeft,
  Bell,
  Megaphone,
  Bot,
  Globe,
  Crown,
  Target,
  Video,
  Tv,
  Palette,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  href?: string;
  icon: React.ElementType;
  badge?: number;
  children?: { label: string; href: string }[];
}

const navSections: { label?: string; items: NavItem[] }[] = [
  {
    items: [
      { label: 'Home', href: '/admin', icon: Home },
      { label: 'Orders', href: '/admin/orders', icon: Package },
      {
        label: 'Products',
        icon: FlaskConical,
        children: [
          { label: 'Catalog', href: '/admin/products' },
          { label: 'Retail Pricing', href: '/admin/retail-pricing' },
          { label: 'Ingredient Sync', href: '/admin/products/ingredient-sync' },
        ],
      },
      { label: 'Customers', href: '/admin/users', icon: Users },
    ],
  },
  {
    label: 'Sales channels',
    items: [
      {
        label: 'Marketing',
        icon: FileText,
        children: [
          { label: 'Blog', href: '/admin/blog' },
          { label: 'SEO Dashboard', href: '/admin/seo' },
          { label: 'Content', href: '/admin/content' },
        ],
      },
      { label: 'Membership', href: '/admin/membership', icon: Tag },
      { label: 'Outreach Agent', href: '/admin/outreach', icon: Target },
      { label: 'Influencer Hub', href: '/admin/influencers', icon: Crown },
      { label: 'Social Studio', href: '/admin/social', icon: Megaphone },
      { label: 'UGC Studio', href: '/admin/ugc-studio', icon: Video },
      { label: 'Meta Ads', href: '/admin/meta-ads', icon: Tv },
      { label: 'Brand Studio', href: '/admin/brand-studio', icon: Palette },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
      { label: 'Traffic & Attribution', href: '/admin/traffic', icon: Globe },
      { label: 'AI Usage & Costs', href: '/admin/ai-usage', icon: DollarSign },
      { label: 'Conversations', href: '/admin/conversations', icon: MessageSquare },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Support Tickets', href: '/admin/support-tickets', icon: HelpCircle },
      { label: 'Audit & Compliance', href: '/admin/audit-logs', icon: Shield },
      {
        label: 'Settings',
        icon: Settings,
        children: [
          { label: 'AI Configuration', href: '/admin/settings/ai' },
        ],
      },
    ],
  },
];

function NavItemRow({
  item,
  isCollapsed,
  location,
}: {
  item: NavItem;
  isCollapsed: boolean;
  location: string;
}) {
  const [expanded, setExpanded] = useState(() => {
    if (!item.children) return false;
    return item.children.some((c) => location.startsWith(c.href));
  });

  const isActive = item.href
    ? item.href === '/admin'
      ? location === '/admin'
      : location.startsWith(item.href)
    : item.children?.some((c) => location.startsWith(c.href)) ?? false;

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
            isActive
              ? 'text-[#054700] font-medium bg-[#054700]/5'
              : 'text-[#3a3a3a] hover:bg-[#054700]/5 hover:text-[#054700]'
          )}
        >
          <item.icon className="h-[18px] w-[18px] shrink-0" />
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left">{item.label}</span>
              <ChevronRight
                className={cn(
                  'h-4 w-4 transition-transform',
                  expanded && 'rotate-90'
                )}
              />
            </>
          )}
        </button>
        {expanded && !isCollapsed && (
          <div className="ml-8 mt-0.5 space-y-0.5">
            {item.children.map((child) => {
              const childActive = location.startsWith(child.href);
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={cn(
                    'block px-3 py-1.5 rounded-md text-sm transition-colors',
                    childActive
                      ? 'text-[#054700] font-medium bg-[#054700]/5'
                      : 'text-[#666] hover:bg-[#054700]/5 hover:text-[#054700]'
                  )}
                >
                  {child.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href!}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
        isActive
          ? 'text-[#054700] font-medium bg-[#054700]/8'
          : 'text-[#3a3a3a] hover:bg-[#054700]/5 hover:text-[#054700]'
      )}
    >
      <item.icon className="h-[18px] w-[18px] shrink-0" />
      {!isCollapsed && <span>{item.label}</span>}
      {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
        <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const { data: notifCounts } = useQuery<{
    supportTickets: number;
    openTickets: number;
    inProgressTickets: number;
  }>({
    queryKey: ['/api/admin/notifications/counts'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/notifications/counts');
      return res.json();
    },
    refetchInterval: 30_000, // poll every 30s
  });

  const totalNotifications = (notifCounts?.supportTickets || 0);

  const userInitials = user?.name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || 'A';

  // Inject notification badges into nav items
  const navWithBadges = navSections.map((section) => ({
    ...section,
    items: section.items.map((item) => {
      if (item.label === 'Support Tickets') {
        return { ...item, badge: notifCounts?.supportTickets || 0 };
      }
      return item;
    }),
  }));

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-gray-200 shrink-0">
        <Link href="/admin" className="flex items-center gap-2">
          <img src="/ones-logo-light.svg" alt="Ones" className="h-7" />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {navWithBadges.map((section, i) => (
          <div key={i}>
            {section.label && (
              <p className="px-3 mb-1.5 text-xs font-bold text-primary uppercase tracking-wider">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavItemRow
                  key={item.label}
                  item={item}
                  isCollapsed={false}
                  location={location}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer: Back to Dashboard */}
      <div className="border-t border-gray-200 p-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-3 py-2 text-sm text-[#054700] bg-[#054700]/20 hover:text-[#054700] hover:bg-[#054700]/5 rounded-md transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-[#f6f6f3]">
      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex flex-col bg-white border-r border-gray-200 w-60 shrink-0"
      >
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/30"
          onClick={() => setMobileSidebarOpen(false)}
        >
          <aside
            className="w-60 h-full bg-white flex flex-col shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 h-14 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <img src="/ones-logo-light.svg" alt="Ones" className="h-7" />
              </div>
              <button onClick={() => setMobileSidebarOpen(false)}>
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
              {navSections.map((section, i) => (
                <div key={i}>
                  {section.label && (
                    <p className="px-3 mb-1.5 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {section.label}
                    </p>
                  )}
                  <div className="space-y-0.5">
                    {section.items.map((item) => (
                      <NavItemRow
                        key={item.label}
                        item={item}
                        isCollapsed={false}
                        location={location}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </nav>
            <div className="border-t border-gray-200 p-3">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-3 py-2 text-sm text-[#666] hover:text-[#054700] rounded-md"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Dashboard
              </Link>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-1.5 rounded-md hover:bg-gray-100"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <button
              className="relative p-1.5 rounded-md hover:bg-gray-100 transition-colors"
              onClick={() => setLocation('/admin/support-tickets')}
              title={totalNotifications > 0 ? `${totalNotifications} open support ticket${totalNotifications !== 1 ? 's' : ''}` : 'No new notifications'}
            >
              <Bell className="h-5 w-5 text-gray-600" />
              {totalNotifications > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
                  {totalNotifications > 99 ? '99+' : totalNotifications}
                </span>
              )}
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-50 transition-colors">
                <Avatar className="h-7 w-7 border border-gray-200">
                  <AvatarFallback className="text-xs bg-[#054700] text-white">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-gray-700 hidden sm:inline">
                  {user?.name}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile" className="cursor-pointer">
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="cursor-pointer">
                    User Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="text-red-600 focus:text-red-600"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-[#f6f6f3]">
          <div className="max-w-[1400px] mx-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
