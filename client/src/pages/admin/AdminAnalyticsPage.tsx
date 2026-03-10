import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  TrendingUp,
  Users,
  UserCheck,
  DollarSign,
  Package,
  BarChart3,
  Activity,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// Import existing analytics widgets
import { ConversionFunnel } from '@/features/admin/components/ConversionFunnel';
import { CohortRetentionChart } from '@/features/admin/components/CohortRetentionChart';
import { ReorderHealthWidget } from '@/features/admin/components/ReorderHealthWidget';
import { FormulaInsightsWidget } from '@/features/admin/components/FormulaInsightsWidget';

interface GrowthDataPoint {
  date: string;
  users: number;
  paidUsers: number;
}

interface RevenueDataPoint {
  date: string;
  orders: number;
  revenue: number;
}

interface DashboardStats {
  totalUsers: number;
  totalPaidUsers: number;
  activeUsers: number;
  totalOrders: number;
  totalFormulas: number;
  totalRevenue: number;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: typeof Users;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <Icon className="h-4 w-4 text-gray-400" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <p className="text-xs text-gray-400 mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function AdminAnalyticsPage() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/admin/stats'],
  });

  const { data: growthData, isLoading: growthLoading } = useQuery<GrowthDataPoint[]>({
    queryKey: ['/api/admin/analytics/growth?days=30'],
  });

  const { data: revenueData, isLoading: revenueLoading } = useQuery<RevenueDataPoint[]>({
    queryKey: ['/api/admin/analytics/revenue?days=30'],
  });

  const isLoading = statsLoading || growthLoading || revenueLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <BarChart3 className="h-5 w-5" /> Platform Analytics
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Growth trends, conversion funnels, retention cohorts, and formula insights.
        </p>
      </div>

      {/* Key Stats */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-8 w-16 mb-2" /><Skeleton className="h-3 w-24" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <MetricCard title="Total Users" value={stats?.totalUsers || 0} description="All registered" icon={Users} />
          <MetricCard title="Paid Users" value={stats?.totalPaidUsers || 0} description="Active subscribers" icon={UserCheck} />
          <MetricCard title="Active Users" value={stats?.activeUsers || 0} description="Last 30 days" icon={Activity} />
          <MetricCard title="Total Orders" value={stats?.totalOrders || 0} description="All time" icon={Package} />
          <MetricCard title="Formulas" value={stats?.totalFormulas || 0} description="Custom created" icon={TrendingUp} />
          <MetricCard title="Revenue" value={formatCurrency(stats?.totalRevenue || 0)} description="All time" icon={DollarSign} />
        </div>
      )}

      {/* Conversion Funnel */}
      <ConversionFunnel />

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">User Growth</CardTitle>
            <CardDescription>New users over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {growthLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={growthData || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px' }}
                      labelFormatter={(v) => new Date(v).toLocaleDateString()}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="users" stroke="#054700" strokeWidth={2} name="Total Users" dot={{ fill: '#054700', r: 3 }} />
                    <Line type="monotone" dataKey="paidUsers" stroke="#8a9a2c" strokeWidth={2} name="Paid Users" dot={{ fill: '#8a9a2c', r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily Orders & Revenue</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px' }}
                      labelFormatter={(v) => new Date(v).toLocaleDateString()}
                    />
                    <Legend />
                    <Bar dataKey="orders" fill="#054700" radius={[4, 4, 0, 0]} name="Orders" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reorder Health & Cohort Retention */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ReorderHealthWidget />
        <CohortRetentionChart />
      </div>

      {/* Formula Insights */}
      <FormulaInsightsWidget />
    </div>
  );
}
