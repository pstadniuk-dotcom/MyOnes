import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  Heart,
  Upload,
  User,
  HelpCircle,
  AlertCircle,
  Shield,
  Target,
  Sparkles,
  PlayCircle,
  FileText,
  Info,
  Scale,
  Stethoscope,
  Moon,
  Dumbbell,
  Brain,
  Cigarette,
  Wine
} from 'lucide-react';
import { Link } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';
import type { Formula, HealthProfile, Subscription } from '@shared/schema';

// Types for dashboard data
interface HealthScoreBreakdown {
  [key: string]: {
    score: number;
    max: number;
    status: string;
  };
}

interface DashboardMetrics {
  healthScore: number;
  healthScoreBreakdown?: HealthScoreBreakdown;
  formulaVersion: number;
  consultationsSessions: number;
  daysActive: number;
  nextDelivery: string | null;
}

// Using Formula type from shared schema

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  time: string;
  icon: string;
}

interface DashboardData {
  metrics: DashboardMetrics;
  currentFormula: Formula | null;
  healthProfile: HealthProfile | null;
  recentActivity: ActivityItem[];
  subscription: Subscription | null;
  hasActiveFormula: boolean;
  isNewUser: boolean;
}

// Component for displaying loading state
function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({length: 4}).map((_, i) => (
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
          <CardContent className="space-y-3">
            {Array.from({length: 3}).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({length: 3}).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Welcome section for new users
function WelcomeOnboarding({ userName }: { userName: string }) {
  return (
    <div className="mb-8">
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10" data-testid="section-welcome-onboarding">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-primary mb-2">
                  Welcome to Ones AI, {userName}!
                </h2>
                <p className="text-muted-foreground">
                  Let's create your personalized supplement formula. Our AI will analyze your health profile and goals to recommend the perfect blend just for you.
                </p>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                    1
                  </div>
                  <span className="text-sm">Start with an AI consultation about your health goals</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground text-sm font-medium">
                    2
                  </div>
                  <span className="text-sm text-muted-foreground">Get your personalized formula recommendation</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground text-sm font-medium">
                    3
                  </div>
                  <span className="text-sm text-muted-foreground">Receive your custom supplements monthly</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button asChild className="gap-2" data-testid="button-start-journey">
                  <Link href="/dashboard/consultation">
                    <PlayCircle className="w-4 h-4" />
                    Start My Journey
                  </Link>
                </Button>
                <Button variant="outline" asChild className="gap-2" data-testid="button-learn-more">
                  <Link href="/science">
                    <FileText className="w-4 h-4" />
                    Learn More
                  </Link>
                </Button>
              </div>
            </div>
            
            <div className="hidden sm:block">
              <Sparkles className="w-16 h-16 text-primary/30" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Current Formula Widget
function CurrentFormulaWidget({ formula }: { formula: Formula }) {
  const userAddedCount = (formula.userCustomizations?.addedBases?.length || 0) + (formula.userCustomizations?.addedIndividuals?.length || 0);
  const totalIngredients = formula.bases.length + (formula.additions?.length || 0) + userAddedCount;
  const safetyPercentage = Math.min((formula.totalMg / 6800) * 100, 100);
  const isOptimal = formula.totalMg >= 4500 && formula.totalMg <= 6800;

  return (
    <Card className="mb-6" data-testid="widget-current-formula">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-primary" />
              My Current Formula v{formula.version}
            </CardTitle>
            <CardDescription>
              {totalIngredients} ingredients • {formula.totalMg}mg total
            </CardDescription>
          </div>
          <Badge variant={isOptimal ? "default" : "secondary"} className="gap-1">
            <Shield className="w-3 h-3" />
            {isOptimal ? "Optimized" : "Active"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Safety Compliance */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Capsule Fill (4500-6800mg)</span>
              <span className="font-medium">{formula.totalMg}mg / 6800mg</span>
            </div>
            <Progress 
              value={safetyPercentage} 
              className="h-2"
              data-testid="progress-safety-limit"
            />
          </div>

          {/* Ingredient Breakdown */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <h4 className="font-medium text-sm mb-2">
                Base Formulas ({formula.bases.length + (formula.userCustomizations?.addedBases?.length || 0)})
              </h4>
              <div className="space-y-1">
                {formula.bases.slice(0, 2).map((base, index) => (
                  <div key={index} className="flex justify-between text-xs">
                    <span className="truncate">{base.ingredient}</span>
                    <span className="text-muted-foreground ml-2">{base.amount}mg</span>
                  </div>
                ))}
                {formula.userCustomizations?.addedBases?.slice(0, 3 - Math.min(formula.bases.length, 2)).map((base, index) => (
                  <div key={`user-base-${index}`} className="flex justify-between text-xs">
                    <span className="truncate text-purple-700 dark:text-purple-400">{base.ingredient}</span>
                    <span className="text-muted-foreground ml-2">{base.amount}mg</span>
                  </div>
                ))}
                {(formula.bases.length + (formula.userCustomizations?.addedBases?.length || 0)) > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{(formula.bases.length + (formula.userCustomizations?.addedBases?.length || 0)) - 3} more
                  </div>
                )}
              </div>
            </div>
            
            {((formula.additions?.length || 0) + (formula.userCustomizations?.addedIndividuals?.length || 0)) > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">
                  Additions ({(formula.additions?.length || 0) + (formula.userCustomizations?.addedIndividuals?.length || 0)})
                </h4>
                <div className="space-y-1">
                  {formula.additions?.slice(0, 2).map((addition, index) => (
                    <div key={index} className="flex justify-between text-xs">
                      <span className="truncate">{addition.ingredient}</span>
                      <span className="text-muted-foreground ml-2">{addition.amount}mg</span>
                    </div>
                  ))}
                  {formula.userCustomizations?.addedIndividuals?.slice(0, 3 - Math.min((formula.additions?.length || 0), 2)).map((ind, index) => (
                    <div key={`user-ind-${index}`} className="flex justify-between text-xs">
                      <span className="truncate text-purple-700 dark:text-purple-400">{ind.ingredient}</span>
                      <span className="text-muted-foreground ml-2">{ind.amount}mg</span>
                    </div>
                  ))}
                  {((formula.additions?.length || 0) + (formula.userCustomizations?.addedIndividuals?.length || 0)) > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{((formula.additions?.length || 0) + (formula.userCustomizations?.addedIndividuals?.length || 0)) - 3} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button variant="default" size="sm" asChild className="flex-1" data-testid="button-view-formula">
              <Link href="/dashboard/formula">
                <FlaskConical className="w-4 h-4 mr-2" />
                View Details
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="flex-1" data-testid="button-order-refill">
              <Link href="/dashboard/orders">
                <Package className="w-4 h-4 mr-2" />
                Order Refill
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild data-testid="button-update-formula">
              <Link href="/dashboard/consultation">
                <MessageSquare className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInHours < 48) return '1 day ago';
  return `${Math.floor(diffInHours / 24)} days ago`;
}

// Icon mapping
function getActivityIcon(iconName: string) {
  const icons: Record<string, any> = {
    'Package': Package,
    'MessageSquare': MessageSquare,
    'FlaskConical': FlaskConical,
    'Activity': Activity,
    'User': User,
  };
  return icons[iconName] || Activity;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const userName = user?.name?.split(' ')[0] || 'there';
  const userInitials = user?.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || 'U';

  // Fetch dashboard data using configured queryClient
  const { data: dashboardData, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['/api', 'dashboard'],
  });

  // Show error message if data fetch fails - moved to useEffect to prevent infinite re-render
  useEffect(() => {
    if (error) {
      toast({
        title: "Error loading dashboard",
        description: "Please refresh the page to try again.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Show loading state
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // Show error state
  if (error || !dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-6">
          <div className="text-center space-y-3">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
            <h3 className="text-lg font-semibold">Failed to load dashboard</h3>
            <p className="text-muted-foreground">Please refresh the page to try again.</p>
            <Button onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const { metrics, currentFormula, recentActivity, isNewUser } = dashboardData;

  // Quick Actions with enhanced functionality
  const quickActions = [
    {
      title: 'Start New Consultation',
      description: 'Chat with Ones AI about your health goals',
      href: '/dashboard/consultation',
      icon: MessageSquare,
      variant: 'default' as const,
      primary: true
    },
    ...(currentFormula ? [{
      title: 'View My Formula',
      description: 'See your current personalized supplement formula',
      href: '/dashboard/formula',
      icon: FlaskConical,
      variant: 'secondary' as const,
      primary: false
    }] : []),
    {
      title: 'Order Refill',
      description: currentFormula ? 'Quick reorder your current formula' : 'Order supplements after consultation',
      href: '/dashboard/orders',
      icon: Package,
      variant: 'outline' as const,
      primary: false,
      disabled: !currentFormula
    },
    {
      title: 'Upload Blood Test',
      description: 'Add lab results for formula optimization',
      href: '/dashboard/profile?tab=reports',
      icon: Upload,
      variant: 'outline' as const,
      primary: false
    },
    {
      title: 'Update Health Profile',
      description: 'Manage your health information and goals',
      href: '/dashboard/profile',
      icon: User,
      variant: 'ghost' as const,
      primary: false
    },
    {
      title: 'Contact Support',
      description: 'Get help with your supplement journey',
      href: '/dashboard/support',
      icon: HelpCircle,
      variant: 'ghost' as const,
      primary: false
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5" data-testid="page-dashboard">
      <div className="space-y-8 p-6">
        {/* Modern Welcome Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/10 border rounded-2xl backdrop-blur-sm p-6">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 opacity-50"></div>
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 ring-4 ring-primary/20">
                <AvatarImage src="" alt={userName} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-xl font-bold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-bold tracking-tight" data-testid="text-welcome">
                  Welcome back, {userName}!
                </h1>
                <p className="text-muted-foreground">
                  {isNewUser 
                    ? "Let's start your personalized supplement journey with Ones AI." 
                    : "Here's your personalized supplement journey overview."
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                <Sparkles className="w-3 h-3 mr-1" />
                Premium Member
              </Badge>
            </div>
          </div>
        </div>

        {/* Welcome/Onboarding for New Users */}
        {isNewUser && <WelcomeOnboarding userName={userName} />}

        {/* Current Formula Widget */}
        {currentFormula && <CurrentFormulaWidget formula={currentFormula} />}

        {/* Key Metrics */}
        {!isNewUser && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Enhanced Health Score Card with Breakdown */}
          <Dialog>
            <DialogTrigger asChild>
              <Card data-testid="metric-health-score" className="cursor-pointer hover-elevate">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Health Score</CardTitle>
                  <div className="flex items-center gap-1">
                    <Heart className="h-4 w-4 text-muted-foreground" />
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{metrics.healthScore}%</div>
                  <p className="text-xs text-muted-foreground">
                    <TrendingUp className="inline w-3 h-3 mr-1" />
                    Click for breakdown
                  </p>
                  <Progress value={metrics.healthScore} className="mt-2" />
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-green-600" />
                  Health Score Breakdown
                </DialogTitle>
                <DialogDescription>
                  Your overall health score is {metrics.healthScore}% based on real health metrics
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {metrics.healthScoreBreakdown ? (
                  Object.entries(metrics.healthScoreBreakdown).map(([key, data]) => {
                    const getIcon = (key: string) => {
                      const icons: Record<string, any> = {
                        bmi: Scale,
                        bloodPressure: Stethoscope,
                        sleep: Moon,
                        exercise: Dumbbell,
                        stress: Brain,
                        smoking: Cigarette,
                        alcohol: Wine,
                        heartRate: Heart,
                        completeness: CheckCircle
                      };
                      return icons[key] || Activity;
                    };
                    const Icon = getIcon(key);
                    const percentage = Math.round((data.score / data.max) * 100);
                    
                    return (
                      <div key={key} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-primary" />
                            <span className="font-medium capitalize">
                              {key === 'bmi' ? 'BMI' : 
                               key === 'bloodPressure' ? 'Blood Pressure' :
                               key === 'heartRate' ? 'Heart Rate' :
                               key === 'completeness' ? 'Profile Completeness' :
                               key.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                          </div>
                          <Badge variant={percentage >= 80 ? "default" : percentage >= 60 ? "secondary" : "destructive"}>
                            {data.score}/{data.max}
                          </Badge>
                        </div>
                        <Progress value={percentage} className="mb-2" />
                        <p className="text-sm text-muted-foreground">{data.status}</p>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground mb-4">
                      Complete your health profile to see your detailed health score
                    </p>
                    <Link href="/dashboard/profile?tab=health">
                      <Button data-testid="button-complete-profile">
                        <User className="w-4 h-4 mr-2" />
                        Complete Profile
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Card data-testid="metric-formula-version">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Formula Version</CardTitle>
              <FlaskConical className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.formulaVersion > 0 ? `v${metrics.formulaVersion}` : 'None'}
              </div>
              <p className="text-xs text-muted-foreground">
                {currentFormula ? 'Active formula' : 'No formula yet'}
              </p>
            </CardContent>
          </Card>

          <Card data-testid="metric-consultations">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Sessions</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.consultationsSessions}</div>
              <p className="text-xs text-muted-foreground">Total consultations</p>
            </CardContent>
          </Card>

          <Card data-testid="metric-days-active">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Days Active</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.daysActive}</div>
              <p className="text-xs text-muted-foreground">On your health journey</p>
            </CardContent>
          </Card>
        </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Quick Actions */}
          <Card data-testid="section-quick-actions">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              {isNewUser ? "Get started with your health journey" : "Common actions to optimize your health journey"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickActions.map((action) => (
              <Link key={action.title} href={action.href}>
                <div 
                  className={`flex items-center justify-between p-3 rounded-lg border hover-elevate transition-colors cursor-pointer group ${
                    action.disabled ? 'opacity-50 pointer-events-none' : ''
                  } ${action.primary ? 'border-primary/20 bg-primary/5' : ''}`} 
                  data-testid={`action-${action.title.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-md transition-colors ${
                      action.primary 
                        ? 'bg-primary text-primary-foreground group-hover:bg-primary/90' 
                        : 'bg-muted group-hover:bg-muted/80'
                    }`}>
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

          {/* Recent Activity / Health Snapshot */}
          <Card data-testid="section-recent-activity">
            <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              {recentActivity.length > 0 ? "Recent Activity" : "Health Snapshot"}
              </CardTitle>
              <CardDescription>
                {recentActivity.length > 0 
                  ? "Your latest interactions and updates"
                  : "Track your health journey progress"
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentActivity.length > 0 ? (
                // Show recent activity
                recentActivity.map((activity) => {
                  const IconComponent = getActivityIcon(activity.icon);
                  return (
                    <div key={activity.id} className="flex items-start gap-3" data-testid={`activity-${activity.type}`}>
                      <div className="p-2 rounded-full bg-muted">
                        <IconComponent className="w-3 h-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">{activity.description}</p>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(activity.time)}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                // Show health snapshot for new users
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg border">
                    <Target className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Set Your Health Goals</p>
                      <p className="text-xs text-muted-foreground">Define what you want to achieve</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 rounded-lg border">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Start AI Consultation</p>
                      <p className="text-xs text-muted-foreground">Get personalized recommendations</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 rounded-lg border opacity-50">
                    <FlaskConical className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Receive Your Formula</p>
                      <p className="text-xs text-muted-foreground">Custom blend for your needs</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Next Steps */}
        {!isNewUser && (
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
                {metrics.consultationsSessions === 0 || metrics.daysActive > 14 ? (
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-medium mb-2">Schedule Check-in</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      {metrics.consultationsSessions === 0 
                        ? "Start with your first AI consultation to get personalized recommendations."
                        : "It's been a while since your last consultation. Share how you're feeling."
                      }
                    </p>
                    <Button size="sm" asChild data-testid="button-schedule-checkin">
                      <Link href="/dashboard/consultation">
                        Start Consultation
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-medium mb-2">Track Progress</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Monitor how your current formula is working for you.
                    </p>
                    <Button size="sm" variant="outline" asChild data-testid="button-track-progress">
                      <Link href="/dashboard/profile">
                        Update Profile
                      </Link>
                    </Button>
                  </div>
                )}
                
                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium mb-2">Upload Lab Results</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Add recent blood work to optimize your formula further.
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
        )}
      </div>
    </div>
  );
}