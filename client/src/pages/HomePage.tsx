import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  MessageSquare, 
  FlaskConical, 
  Package, 
  TrendingUp, 
  Upload,
  Shield,
  Sparkles,
  PlayCircle,
  Activity
} from 'lucide-react';
import { Link } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import type { Formula } from '@shared/schema';
import { calculateDosage } from '@/lib/utils';

interface DashboardData {
  metrics: {
    healthScore: number;
    formulaVersion: number;
    consultationsSessions: number;
  };
  currentFormula: Formula | null;
  isNewUser: boolean;
}

function HomeSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-16 w-full" />
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({length: 3}).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const userName = user?.name?.split(' ')[0] || 'there';

  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: ['/api', 'dashboard'],
  });

  if (isLoading) {
    return <HomeSkeleton />;
  }

  const { metrics, currentFormula, isNewUser } = dashboardData || {};

  return (
    <div className="max-w-6xl mx-auto space-y-6" data-testid="page-home">
      {/* Personal Greeting */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground mb-1" data-testid="text-greeting">
          Long live {userName}.
        </h1>
        <p className="text-muted-foreground">
          {isNewUser 
            ? "Start your personalized supplement journey" 
            : "Your health journey overview"
          }
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Health Score */}
        <Card data-testid="card-health-score" className="hover-elevate">
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Health Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-green-600 mb-1">
              {metrics?.healthScore || 0}%
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              In Range
            </p>
            <Progress value={metrics?.healthScore || 0} className="mt-2 h-1" />
          </CardContent>
        </Card>

        {/* Formula Version */}
        <Card data-testid="card-formula-version" className="hover-elevate">
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Formula</CardTitle>
          </CardHeader>
          <CardContent>
            {currentFormula ? (
              <>
                <div className="text-3xl font-semibold mb-1">
                  v{currentFormula.version}
                </div>
                <p className="text-xs text-muted-foreground">
                  {currentFormula.bases.length + (currentFormula.additions?.length || 0)} ingredients
                </p>
                <div className="mt-2">
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Shield className="w-3 h-3" />
                    Active
                  </Badge>
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-semibold mb-1 text-muted-foreground">
                  Not created
                </div>
                <p className="text-xs text-muted-foreground">
                  Start consultation
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Consultations */}
        <Card data-testid="card-consultations" className="hover-elevate">
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Consultations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold mb-1">
              {metrics?.consultationsSessions || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              AI sessions completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* New User Onboarding */}
      {isNewUser && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10" data-testid="card-onboarding">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-semibold text-primary mb-2">
                  Welcome to Ones AI
                </h2>
                <p className="text-muted-foreground">
                  Let's create your personalized supplement formula. Our AI will analyze your health profile to recommend the perfect blend.
                </p>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                    1
                  </div>
                  <span className="text-sm">Start with an AI consultation</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground text-sm font-medium">
                    2
                  </div>
                  <span className="text-sm text-muted-foreground">Get personalized formula</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground text-sm font-medium">
                    3
                  </div>
                  <span className="text-sm text-muted-foreground">Receive supplements monthly</span>
                </div>
              </div>

              <Button asChild className="gap-2" data-testid="button-start-consultation">
                <Link href="/dashboard/chat">
                  <PlayCircle className="w-4 h-4" />
                  Start Consultation
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Formula Preview */}
      {currentFormula && (
        <Card data-testid="card-formula-preview">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-primary" />
                  Your Formula
                </CardTitle>
                <CardDescription>
                  Version {currentFormula.version} • {currentFormula.totalMg}mg total
                </CardDescription>
              </div>
              <Button asChild variant="outline" size="sm" data-testid="button-view-full">
                <Link href="/dashboard/formula">View Full</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Daily Dosage */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Daily Dosage</span>
                  <span className="font-medium text-base" data-testid="text-dosage-display">
                    {calculateDosage(currentFormula.totalMg).display}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {calculateDosage(currentFormula.totalMg).total} capsules per day ({currentFormula.totalMg}mg total)
                </p>
              </div>

              {/* Dosage Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Capsule Fill (4500-6800mg)</span>
                  <span className="font-medium">{currentFormula.totalMg}mg</span>
                </div>
                <Progress 
                  value={Math.min((currentFormula.totalMg / 6800) * 100, 100)} 
                  className="h-2"
                />
              </div>

              {/* Top Ingredients Preview */}
              <div>
                <h4 className="font-medium text-sm mb-2 text-muted-foreground">Top Ingredients</h4>
                <div className="space-y-2">
                  {currentFormula.bases.slice(0, 3).map((base, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{base.ingredient}</span>
                      <span className="text-muted-foreground">{base.amount}mg</span>
                    </div>
                  ))}
                  {currentFormula.bases.length > 3 && (
                    <div className="text-xs text-muted-foreground pt-1">
                      +{currentFormula.bases.length - 3} more ingredients
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button variant="default" size="sm" asChild className="flex-1" data-testid="button-order-now">
                  <Link href="/dashboard/orders">
                    <Package className="w-4 h-4 mr-2" />
                    Order Now
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild className="flex-1" data-testid="button-refine-formula">
                  <Link href="/dashboard/chat">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Refine
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions for Users with Formula */}
      {!isNewUser && currentFormula && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="hover-elevate cursor-pointer" data-testid="card-upload-labs">
            <Link href="/dashboard/lab-reports">
              <CardHeader className="space-y-0 pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Upload className="w-4 h-4 text-primary" />
                  Upload Lab Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Add blood tests for better formula optimization
                </p>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover-elevate cursor-pointer" data-testid="card-track-progress">
            <Link href="/dashboard/formula">
              <CardHeader className="space-y-0 pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  Track Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  View formula history and health trends
                </p>
              </CardContent>
            </Link>
          </Card>
        </div>
      )}

      {/* Promotional/Info Section (inspired by Function Health's right sidebar) */}
      {!isNewUser && (
        <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Sparkles className="w-8 h-8 text-primary flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Optimize Your Formula</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Chat with our AI to refine your supplement blend based on your latest health goals and lab results.
                </p>
                <Button asChild variant="default" size="sm">
                  <Link href="/dashboard/chat">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Start Chat
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
