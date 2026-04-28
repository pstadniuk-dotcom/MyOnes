import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Badge } from '@/shared/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/shared/hooks/use-toast';
import { useLocation } from 'wouter';
import {
  Users,
  DollarSign,
  Package,
  TrendingUp,
  TrendingDown,
  Download,
  AlertCircle,
  ArrowRight,
  ShoppingCart,
  BarChart3,
  Repeat,
  UserMinus,
  Receipt,
  Crown,
  Building2,
  Globe,
  MessageSquare,
  Clock,
  Percent,
  Wallet,
  Factory,
  RotateCcw,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/shared/components/ui/button';
import { getAuthHeaders } from '@/shared/lib/queryClient';
import { apiRequest } from '@/shared/lib/queryClient';

interface EnhancedStats {
  totalUsers: number;
  totalRevenue: number;
  totalOrders: number;
  totalFormulas: number;
  trends: {
    users: { current: number; previous: number; changePercent: number };
    revenue: { current: number; previous: number; changePercent: number };
    orders: { current: number; previous: number; changePercent: number };
    formulas: { current: number; previous: number; changePercent: number };
  };
  sparklines: {
    users: number[];
    revenue: number[];
    orders: number[];
  };
}

interface FinancialMetrics {
  mrr: number;
  arr: number;
  averageOrderValue: number;
  ltv: number;
  totalCustomers: number;
  churnRate: number;
  reorderRate: number;
  totalCost: number;
  totalRefunds: number;
  netRevenue: number;
  grossMarginPercent: number;
  revenue30d: number;
  cost30d: number;
  refunds30d: number;
  netRevenue30d: number;
  grossMargin30dPercent: number;
}

interface RevenueDataPoint {
  date: string;
  orders: number;
  revenue: number;
}

interface TodaysOrder {
  id: string;
  status: string;
  placedAt: string;
  amountCents: number | null;
  supplyMonths: number | null;
  user: { id: string; name: string; email: string };
  formula?: { totalMg: number; bases: Array<{ ingredient: string; amount: number }> };
}

interface PendingActions {
  openTickets: number;
  pendingOrders: number;
  processingOrders: number;
  overdueReorders: number;
}

function MiniSparkline({ data, color = '#054700', height = 32 }: { data: number[]; color?: string; height?: number }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const width = 80;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="flex-shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrendBadge({ changePercent }: { changePercent: number }) {
  if (changePercent === 0) return <span className="text-xs text-gray-400">--</span>;
  const isPositive = changePercent > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isPositive ? '+' : ''}{changePercent}%
    </span>
  );
}

function EnhancedMetricCard({
  title,
  value,
  icon: Icon,
  trend,
  sparkline,
  sparkColor,
  onClick,
}: {
  title: string;
  value: string;
  icon?: React.ElementType;
  trend?: { current: number; previous: number; changePercent: number };
  sparkline?: number[];
  sparkColor?: string;
  onClick?: () => void;
}) {
  return (
    <Card
      className={`${onClick ? 'cursor-pointer hover:shadow-md transition-all' : ''} overflow-hidden`}
      onClick={onClick}
    >
      <CardContent className="pt-5 pb-4 px-5">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          {Icon && <Icon className="h-4 w-4 text-gray-400" />}
        </div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
            {trend && (
              <div className="mt-1">
                <TrendBadge changePercent={trend.changePercent} />
                <span className="text-[11px] text-gray-400 ml-1.5">vs prev 30d</span>
              </div>
            )}
          </div>
          {sparkline && sparkline.length > 0 && (
            <MiniSparkline data={sparkline} color={sparkColor} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    processing: { label: 'Processing', className: 'bg-blue-100 text-blue-800 border-blue-200' },
    submitted: { label: 'Submitted', className: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    shipped: { label: 'Shipped', className: 'bg-purple-100 text-purple-800 border-purple-200' },
    delivered: { label: 'Delivered', className: 'bg-green-100 text-green-800 border-green-200' },
    cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-800 border-red-200' },
  };
  const c = config[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
  return <Badge variant="outline" className={c.className}>{c.label}</Badge>;
}

function FinancialCard({ label, value, icon: Icon, description }: { label: string; value: string; icon: React.ElementType; description?: string }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50/60 border border-gray-100">
      <div className="p-2 rounded-md bg-white border border-gray-200">
        <Icon className="h-4 w-4 text-gray-500" />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="text-lg font-semibold text-gray-900">{value}</p>
        {description && <p className="text-[11px] text-gray-400 mt-0.5">{description}</p>}
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [dateRange] = useState('30');
  const queryClient = useQueryClient();
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const { data: enhanced, isLoading: enhancedLoading, error: enhancedError } = useQuery<EnhancedStats>({
    queryKey: [`/api/admin/stats/enhanced?days=${dateRange}`],
  });

  const { data: financial, isLoading: financialLoading } = useQuery<FinancialMetrics>({
    queryKey: ['/api/admin/stats/financial'],
  });

  const { data: revenueData, isLoading: revenueLoading } = useQuery<RevenueDataPoint[]>({
    queryKey: [`/api/admin/analytics/revenue?days=${dateRange}`],
  });

  const { data: todaysOrders } = useQuery<TodaysOrder[]>({
    queryKey: ['/api/admin/orders/today'],
  });

  const { data: pendingActions } = useQuery<PendingActions>({
    queryKey: ['/api/admin/analytics/pending-actions'],
  });

  const { data: activityFeed } = useQuery<Array<{ type: string; message: string; timestamp: string; metadata?: any }>>({
    queryKey: ['/api/admin/activity-feed?limit=8'],
  });
  useEffect(() => {
    if (enhancedError) {
      toast({
        title: "Error loading dashboard",
        description: (enhancedError as any)?.message || "Please try again.",
        variant: "destructive"
      });
    }
  }, [enhancedError, toast]);

  const [isExporting, setIsExporting] = useState(false);

  const resetOrdersMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/orders/bulk-mark-test', { confirm: true });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Orders reset',
        description: `${data.updated ?? 0} order${data.updated === 1 ? '' : 's'} marked as test. Dashboard totals will refresh.`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/stats/enhanced?days=${dateRange}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats/financial'] });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/analytics/revenue?days=${dateRange}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics/pending-actions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      setResetConfirmOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Reset failed',
        description: error?.message || 'Could not mark orders as test.',
        variant: 'destructive',
      });
    },
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/admin/export/users', {
        headers: {
          ...getAuthHeaders(),
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Export failed' }));
        throw new Error(errorData.error || 'Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export successful",
        description: "Your user data has been exported.",
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD',
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(amount);

  const isLoading = enhancedLoading || revenueLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const totalPending = (pendingActions?.openTickets ?? 0) +
    (pendingActions?.pendingOrders ?? 0) + (pendingActions?.processingOrders ?? 0);

  return (
    <div className="space-y-6" data-testid="page-admin-dashboard">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, let's get started.
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setResetConfirmOpen(true)}
            disabled={resetOrdersMutation.isPending}
            title="Mark all existing orders as test orders so they stop affecting revenue, margins, and projections."
          >
            <RotateCcw className="h-4 w-4 mr-1.5" />
            {resetOrdersMutation.isPending ? 'Resetting...' : 'Reset orders data'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download className="h-4 w-4 mr-1.5" />
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </div>

      {resetConfirmOpen && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">Reset all orders to test orders?</p>
              <p className="text-xs text-amber-800 mt-1">
                This flips <span className="font-medium">every existing order</span> to <code className="px-1 bg-amber-100 rounded">is_test_order = true</code>. No rows are deleted &mdash; you can flip individual orders back from the Orders page. After this, revenue, margins, MRR, ARR, projections, and the sales chart will show only orders placed going forward.
              </p>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => resetOrdersMutation.mutate()}
                  disabled={resetOrdersMutation.isPending}
                >
                  Yes, mark all orders as test
                </Button>
                <Button size="sm" variant="outline" onClick={() => setResetConfirmOpen(false)} disabled={resetOrdersMutation.isPending}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alerts Banner */}
      {totalPending > 0 && (
        <div className="flex flex-wrap gap-3">
          {(pendingActions?.pendingOrders ?? 0) > 0 && (
            <button onClick={() => setLocation('/admin/orders')} className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 rounded-lg text-sm hover:bg-yellow-100 transition-colors">
              <AlertCircle className="h-4 w-4" /> {pendingActions!.pendingOrders} orders to fulfill
            </button>
          )}
          {(pendingActions?.openTickets ?? 0) > 0 && (
            <button onClick={() => setLocation('/admin/support-tickets')} className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 rounded-lg text-sm hover:bg-blue-100 transition-colors">
              <AlertCircle className="h-4 w-4" /> {pendingActions!.openTickets} open tickets
            </button>
          )}
          {(pendingActions?.overdueReorders ?? 0) > 0 && (
            <button onClick={() => setLocation('/admin/users?filter=active')} className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-800 px-4 py-2 rounded-lg text-sm hover:bg-red-100 transition-colors">
              <AlertCircle className="h-4 w-4" /> {pendingActions!.overdueReorders} overdue reorders
            </button>
          )}
        </div>
      )}

      {/* KPI Cards with Sparklines */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <EnhancedMetricCard
          title="Total Users"
          value={String(enhanced?.totalUsers ?? 0)}
          icon={Users}
          trend={enhanced?.trends.users}
          sparkline={enhanced?.sparklines.users}
          sparkColor="#054700"
          onClick={() => setLocation('/admin/users')}
        />
        <EnhancedMetricCard
          title="Total Revenue"
          value={formatCurrency(enhanced?.totalRevenue ?? 0)}
          icon={DollarSign}
          trend={enhanced?.trends.revenue}
          sparkline={enhanced?.sparklines.revenue}
          sparkColor="#059669"
        />
        <EnhancedMetricCard
          title="Total Orders"
          value={String(enhanced?.totalOrders ?? 0)}
          icon={Package}
          trend={enhanced?.trends.orders}
          sparkline={enhanced?.sparklines.orders}
          sparkColor="#2563eb"
          onClick={() => setLocation('/admin/orders')}
        />
        <EnhancedMetricCard
          title="Active Formulas"
          value={String(enhanced?.totalFormulas ?? 0)}
          icon={BarChart3}
          trend={enhanced?.trends.formulas}
        />
      </div>

      {/* Financial Metrics */}
      {!financialLoading && financial && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Financial Overview</CardTitle>
            <CardDescription>Revenue, cost, and margin (test orders excluded)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Profitability row — the numbers Pete actually wants to see */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <FinancialCard
                label="Net Revenue"
                value={formatCurrency(financial.netRevenue)}
                icon={Wallet}
                description="Revenue − cost − refunds"
              />
              <FinancialCard
                label="Manufacturer Cost"
                value={formatCurrency(financial.totalCost)}
                icon={Factory}
                description="Lifetime cost of goods"
              />
              <FinancialCard
                label="Gross Margin"
                value={`${financial.grossMarginPercent}%`}
                icon={Percent}
                description="(Revenue − cost) / revenue"
              />
              <FinancialCard
                label="Refunds"
                value={formatCurrency(financial.totalRefunds)}
                icon={UserMinus}
                description="Lifetime refunded"
              />
            </div>

            {/* Last-30-day profitability */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <FinancialCard
                label="Net Revenue (30d)"
                value={formatCurrency(financial.netRevenue30d)}
                icon={Wallet}
                description={`Rev ${formatCurrency(financial.revenue30d)} − cost ${formatCurrency(financial.cost30d)}`}
              />
              <FinancialCard
                label="Cost (30d)"
                value={formatCurrency(financial.cost30d)}
                icon={Factory}
                description="Manufacturer cost"
              />
              <FinancialCard
                label="Margin (30d)"
                value={`${financial.grossMargin30dPercent}%`}
                icon={Percent}
                description="Last 30 days"
              />
              <FinancialCard
                label="Refunds (30d)"
                value={formatCurrency(financial.refunds30d)}
                icon={UserMinus}
                description="Last 30 days"
              />
            </div>

            {/* Existing customer / recurring metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 pt-1 border-t border-gray-100">
              <FinancialCard label="MRR" value={formatCurrency(financial.mrr)} icon={DollarSign} description="Monthly recurring" />
              <FinancialCard label="ARR" value={formatCurrency(financial.arr)} icon={DollarSign} description="Annual projection" />
              <FinancialCard label="AOV" value={formatCurrency(financial.averageOrderValue)} icon={Receipt} description="Avg order value" />
              <FinancialCard label="LTV" value={formatCurrency(financial.ltv)} icon={TrendingUp} description="Per customer" />
              <FinancialCard label="Customers" value={String(financial.totalCustomers)} icon={Users} description="Total paying" />
              <FinancialCard label="Reorder Rate" value={`${financial.reorderRate}%`} icon={Repeat} description="2+ orders" />
              <FinancialCard label="Churn Rate" value={`${financial.churnRate}%`} icon={UserMinus} description="60d inactive" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revenue Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Total sales over time</CardTitle>
          <CardDescription>Last {dateRange} days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData || []}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#054700" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#054700" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(v) => `$${v}`} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }} labelFormatter={(v) => new Date(v).toLocaleDateString()} formatter={(value: number) => [`$${value}`, 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#054700" strokeWidth={2} fill="url(#revenueGradient)" dot={false} activeDot={{ r: 4, fill: '#054700', stroke: 'white', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Today's Orders */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-medium">Today's Orders</CardTitle>
              <Badge variant="secondary" className="text-xs">{todaysOrders?.length ?? 0}</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setLocation('/admin/orders')} className="text-[#054700]">
              View all <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!todaysOrders || todaysOrders.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-sm">
              <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-gray-300" /> No orders today yet
            </div>
          ) : (
            <div className="divide-y">
              <div className="grid grid-cols-[1fr_120px_100px_100px_100px] gap-4 px-5 py-2 text-xs font-medium text-gray-500 bg-gray-50/80">
                <span>Customer</span><span>Time</span><span>Total</span><span>Supply</span><span>Status</span>
              </div>
              {todaysOrders.slice(0, 10).map((order) => (
                <div key={order.id} className="grid grid-cols-[1fr_120px_100px_100px_100px] gap-4 px-5 py-3 hover:bg-gray-50 cursor-pointer items-center" onClick={() => setLocation(`/admin/users/${order.user.id}`)}>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{order.user.name}</p>
                    <p className="text-xs text-gray-500">{order.user.email}</p>
                  </div>
                  <span className="text-sm text-gray-600">{format(new Date(order.placedAt), 'h:mm a')}</span>
                  <span className="text-sm font-medium text-gray-900">{order.amountCents ? `$${(order.amountCents / 100).toFixed(2)}` : '\u2014'}</span>
                  <span className="text-sm text-gray-600">{order.supplyMonths ? `${order.supplyMonths} mo` : '\u2014'}</span>
                  <OrderStatusBadge status={order.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Links */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {[
              { label: 'Traffic', icon: Globe, href: '/admin/traffic' },
              { label: 'Influencers', icon: Crown, href: '/admin/influencers' },
              { label: 'B2B Prospects', icon: Building2, href: '/admin/b2b' },
              { label: 'Conversations', icon: MessageSquare, href: '/admin/conversations' },
            ].map((link) => (
              <button
                key={link.href}
                onClick={() => setLocation(link.href)}
                className="flex items-center gap-2 p-3 rounded-lg text-sm text-gray-700 hover:bg-[#054700]/5 hover:text-[#054700] transition-colors border border-gray-100"
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base font-medium">Recent Activity (Customers)</CardTitle>
                <CardDescription>Latest events across your platform</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/admin/users')}
                className="text-[#054700]"
              >
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!activityFeed || activityFeed.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {activityFeed.slice(0, 6).map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-full bg-gray-100">
                      <Clock className="h-3 w-3 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">{item.message}</p>
                      <p className="text-xs text-gray-400">{format(new Date(item.timestamp), 'MMM d, h:mm a')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
