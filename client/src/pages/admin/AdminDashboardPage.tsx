import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Badge } from '@/shared/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/shared/hooks/use-toast';
import { useLocation } from 'wouter';
import {
  Users,
  DollarSign,
  Package,
  TrendingUp,
  TrendingDown,
  Clock,
  Download,
  AlertCircle,
  ArrowRight,
  ShoppingCart,
  BarChart3,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/shared/components/ui/button';
import { apiRequest } from '@/shared/lib/queryClient';

interface DashboardStats {
  totalUsers: number;
  totalPaidUsers: number;
  activeUsers: number;
  totalOrders: number;
  totalFormulas: number;
  totalRevenue: number;
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

function MetricCard({
  title,
  value,
  icon: Icon,
  onClick,
}: {
  title: string;
  value: string;
  icon?: React.ElementType;
  onClick?: () => void;
}) {
  return (
    <Card
      className={onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
      onClick={onClick}
    >
      <CardContent className="pt-5 pb-4 px-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          {Icon && <Icon className="h-4 w-4 text-gray-400" />}
        </div>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
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

export default function AdminDashboardPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [dateRange] = useState('30');

  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery<DashboardStats>({
    queryKey: ['/api/admin/stats'],
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

  useEffect(() => {
    if (statsError) {
      toast({
        title: "Error loading dashboard",
        description: statsError?.message || "Please try again.",
        variant: "destructive"
      });
    }
  }, [statsError, toast]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD',
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(amount);

  if (statsLoading || revenueLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
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
        <Button variant="outline" size="sm" onClick={() => window.open('/api/admin/export/users', '_blank')}>
          <Download className="h-4 w-4 mr-1.5" /> Export
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Users" value={String(stats?.totalUsers ?? 0)} icon={Users} onClick={() => setLocation('/admin/users')} />
        <MetricCard title="Total Revenue" value={formatCurrency(stats?.totalRevenue ?? 0)} icon={DollarSign} />
        <MetricCard title="Total Orders" value={String(stats?.totalOrders ?? 0)} icon={Package} onClick={() => setLocation('/admin/orders')} />
        <MetricCard title="Active Formulas" value={String(stats?.totalFormulas ?? 0)} icon={BarChart3} />
      </div>

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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Total sales over time</CardTitle>
          <CardDescription>Last {dateRange} days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px' }} labelFormatter={(v) => new Date(v).toLocaleDateString()} formatter={(value: number) => [`$${value}`, 'Revenue']} />
                <Line type="monotone" dataKey="revenue" stroke="#054700" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#054700' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard title="Paid Users" value={String(stats?.totalPaidUsers ?? 0)} icon={Users} onClick={() => setLocation('/admin/users?filter=paid')} />
        <MetricCard title="Active Users" value={String(stats?.activeUsers ?? 0)} icon={Users} onClick={() => setLocation('/admin/users?filter=active')} />
        <MetricCard title="Formulas Created" value={String(stats?.totalFormulas ?? 0)} icon={BarChart3} />
      </div>
    </div>
  );
}
