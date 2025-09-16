import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MessageSquare, 
  FlaskConical, 
  Package, 
  Activity, 
  TrendingUp, 
  Calendar,
  Bell,
  ArrowRight,
  CheckCircle,
  Clock,
  Zap,
  Heart
} from 'lucide-react';
import { Link } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';

// Mock data - in production this would come from APIs
const mockMetrics = {
  formulaVersion: 3,
  consultationsSessions: 8,
  daysOnFormula: 24,
  nextDelivery: '2024-10-15',
  healthScore: 85,
};

const mockRecentActivity = [
  {
    id: '1',
    type: 'formula_update',
    title: 'Formula Updated',
    description: 'Added Vitamin D3 based on recent lab results',
    time: '2 hours ago',
    icon: FlaskConical,
  },
  {
    id: '2',
    type: 'consultation',
    title: 'AI Consultation',
    description: 'Discussed energy levels and sleep quality',
    time: '1 day ago',
    icon: MessageSquare,
  },
  {
    id: '3',
    type: 'order',
    title: 'Order Shipped',
    description: 'Monthly supplement supply is on its way',
    time: '3 days ago',
    icon: Package,
  },
];

const quickActions = [
  {
    title: 'Start AI Consultation',
    description: 'Chat with ONES AI about your health goals',
    href: '/dashboard/consultation',
    icon: MessageSquare,
    variant: 'primary' as const,
  },
  {
    title: 'View My Formula',
    description: 'See your current personalized supplement formula',
    href: '/dashboard/formula',
    icon: FlaskConical,
    variant: 'secondary' as const,
  },
  {
    title: 'Upload Lab Results',
    description: 'Add new blood work for formula optimization',
    href: '/dashboard/profile?tab=reports',
    icon: Activity,
    variant: 'outline' as const,
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  
  const userName = user?.name?.split(' ')[0] || 'there';
  const userInitials = user?.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || 'U';

  return (
    <div className="space-y-8" data-testid="page-dashboard">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-welcome">
            Welcome back, {userName}!
          </h1>
          <p className="text-muted-foreground">
            Here's an overview of your personalized supplement journey with ONES AI.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src="" alt={user?.name} />
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{user?.name}</span>
            <Badge variant="secondary" className="w-fit">Premium</Badge>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="metric-health-score">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Health Score</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{mockMetrics.healthScore}%</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline w-3 h-3 mr-1" />
              +5% from last month
            </p>
            <Progress value={mockMetrics.healthScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card data-testid="metric-formula-version">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Formula Version</CardTitle>
            <FlaskConical className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">v{mockMetrics.formulaVersion}</div>
            <p className="text-xs text-muted-foreground">Updated 2 days ago</p>
          </CardContent>
        </Card>

        <Card data-testid="metric-consultations">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Sessions</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockMetrics.consultationsSessions}</div>
            <p className="text-xs text-muted-foreground">Total consultations</p>
          </CardContent>
        </Card>

        <Card data-testid="metric-days-active">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Days Active</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockMetrics.daysOnFormula}</div>
            <p className="text-xs text-muted-foreground">On current formula</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card data-testid="section-quick-actions">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Common actions to optimize your health journey
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickActions.map((action) => (
              <Link key={action.title} href={action.href}>
                <div className="flex items-center justify-between p-3 rounded-lg border hover-elevate transition-colors cursor-pointer group" data-testid={`action-${action.title.toLowerCase().replace(' ', '-')}`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-muted group-hover:bg-muted/80 transition-colors">
                      <action.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{action.title}</p>
                      <p className="text-xs text-muted-foreground">{action.description}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card data-testid="section-recent-activity">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Your latest interactions and updates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockRecentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3" data-testid={`activity-${activity.type}`}>
                <div className="p-2 rounded-full bg-muted">
                  <activity.icon className="w-3 h-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{activity.title}</p>
                  <p className="text-xs text-muted-foreground">{activity.description}</p>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Next Steps */}
      <Card data-testid="section-next-steps">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Recommended Next Steps
          </CardTitle>
          <CardDescription>
            Personalized recommendations to optimize your health journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 rounded-lg border">
              <h4 className="font-medium mb-2">Schedule Check-in</h4>
              <p className="text-sm text-muted-foreground mb-3">
                It's been 2 weeks since your last consultation. Share how you're feeling.
              </p>
              <Button size="sm" asChild data-testid="button-schedule-checkin">
                <Link href="/dashboard/consultation">
                  Start Consultation
                </Link>
              </Button>
            </div>
            
            <div className="p-4 rounded-lg border">
              <h4 className="font-medium mb-2">Upload New Labs</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Upload recent blood work to optimize your formula further.
              </p>
              <Button variant="outline" size="sm" asChild data-testid="button-upload-labs">
                <Link href="/dashboard/profile?tab=reports">
                  Upload Reports
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}