import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  DollarSign, 
  Activity, 
  Package,
  TrendingUp,
  UserCheck
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useEffect } from 'react';

// Types for API responses
interface DashboardStats {
  totalUsers: number;
  totalPaidUsers: number;
  activeUsers: number;
  totalOrders: number;
  totalFormulas: number;
  totalRevenue: number;
}

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

// Stat Card Component
function StatCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend 
}: { 
  title: string; 
  value: string | number; 
  description: string; 
  icon: typeof Users;
  trend?: string;
}) {
  return (
    <Card data-testid={`stat-card-${title.toLowerCase().replace(/\s/g, '-')}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={`stat-value-${title.toLowerCase().replace(/\s/g, '-')}`}>
          {value}
        </div>
        <p className="text-xs text-muted-foreground">
          {description}
        </p>
        {trend && (
          <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-1">
            <TrendingUp className="h-3 w-3" />
            <span>{trend}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Loading Skeleton
function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { toast } = useToast();

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery<DashboardStats>({
    queryKey: ['/api/admin/stats'],
  });

  // Fetch user growth data
  const { data: growthData, isLoading: growthLoading, error: growthError } = useQuery<GrowthDataPoint[]>({
    queryKey: ['/api/admin/analytics/growth?days=30'],
  });

  // Fetch revenue data
  const { data: revenueData, isLoading: revenueLoading, error: revenueError } = useQuery<RevenueDataPoint[]>({
    queryKey: ['/api/admin/analytics/revenue?days=30'],
  });

  // Show error toast if any query fails
  useEffect(() => {
    if (statsError || growthError || revenueError) {
      toast({
        title: "Error loading dashboard data",
        description: (statsError || growthError || revenueError)?.message || "Please try again later.",
        variant: "destructive"
      });
    }
  }, [statsError, growthError, revenueError, toast]);

  const isLoading = statsLoading || growthLoading || revenueLoading;

  if (isLoading) {
    return (
      <div className="p-8">
        <DashboardSkeleton />
      </div>
    );
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-8" data-testid="page-admin-dashboard">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-admin-dashboard">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            Overview of platform metrics and user activity
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="section-stats-cards">
          <StatCard
            title="Total Users"
            value={stats?.totalUsers || 0}
            description="All registered users"
            icon={Users}
          />
          <StatCard
            title="Paid Users"
            value={stats?.totalPaidUsers || 0}
            description="Users with active subscriptions"
            icon={UserCheck}
          />
          <StatCard
            title="Active Users"
            value={stats?.activeUsers || 0}
            description="Users active in last 30 days"
            icon={Activity}
          />
          <StatCard
            title="Total Orders"
            value={stats?.totalOrders || 0}
            description="All time orders"
            icon={Package}
          />
          <StatCard
            title="Total Formulas"
            value={stats?.totalFormulas || 0}
            description="Custom formulas created"
            icon={Activity}
          />
          <StatCard
            title="Total Revenue"
            value={formatCurrency(stats?.totalRevenue || 0)}
            description="All time revenue"
            icon={DollarSign}
          />
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* User Growth Chart */}
          <Card data-testid="chart-user-growth">
            <CardHeader>
              <CardTitle>User Growth</CardTitle>
              <CardDescription>
                New users over the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={growthData || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      className="text-xs"
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="users" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      name="Total Users"
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="paidUsers" 
                      stroke="hsl(var(--chart-2))" 
                      strokeWidth={2}
                      name="Paid Users"
                      dot={{ fill: 'hsl(var(--chart-2))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Daily Orders Chart */}
          <Card data-testid="chart-daily-orders">
            <CardHeader>
              <CardTitle>Daily Orders</CardTitle>
              <CardDescription>
                Orders placed over the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      className="text-xs"
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <Legend />
                    <Bar 
                      dataKey="orders" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                      name="Orders"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
