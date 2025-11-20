import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Salad, 
  Dumbbell,
  Heart,
  Sparkles,
  Loader2,
  TrendingUp,
  Target,
  Flame,
  Calendar,
  Award,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/queryClient';
import { Link, useLocation } from 'wouter';
import { NutritionPlanTab } from '@/components/optimize/NutritionPlanTab';
import { WorkoutPlanTab } from '@/components/optimize/WorkoutPlanTab';
import { LifestylePlanTab } from '@/components/optimize/LifestylePlanTab';

interface OptimizePlan {
  id: string;
  planType: 'nutrition' | 'workout' | 'lifestyle';
  isActive: boolean;
  content: any;
  rationale: string;
  createdAt: string;
}

interface HealthProfile {
  id: string;
  age?: number;
  sex?: string;
  goals?: string[];
}

export default function OptimizePage() {
  const [location] = useLocation();
  const queryClient = useQueryClient();
  
  // Determine active tab from URL
  const getActiveTab = () => {
    if (location.includes('nutrition')) return 'nutrition';
    if (location.includes('workout')) return 'workout';
    if (location.includes('lifestyle')) return 'lifestyle';
    return 'nutrition';
  };
  
  const [activeTab, setActiveTab] = useState(getActiveTab());

  // Fetch health profile
  const { data: healthProfile } = useQuery<HealthProfile>({
    queryKey: ['/api/users/me/health-profile'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  // Fetch all plans
  const { data: plans, isLoading: plansLoading } = useQuery<OptimizePlan[]>({
    queryKey: ['/api/optimize/plans'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  const nutritionPlan = plans?.find((p) => p.planType === 'nutrition' && p.isActive);
  const workoutPlan = plans?.find((p) => p.planType === 'workout' && p.isActive);
  const lifestylePlan = plans?.find((p) => p.planType === 'lifestyle' && p.isActive);

  const isProfileComplete = !!healthProfile && !!healthProfile.age && !!healthProfile.sex;

  // Calculate overall progress
  const totalPlans = 3;
  const activePlans = [nutritionPlan, workoutPlan, lifestylePlan].filter(Boolean).length;
  const completionPercentage = (activePlans / totalPlans) * 100;

  // Mock adherence data (would come from daily logging in production)
  const weeklyAdherence = 85;
  const currentStreak = 7;

  if (!isProfileComplete) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
            Optimize
          </h1>
          <p className="text-muted-foreground text-lg">
            AI-powered personalized plans for nutrition, fitness, and lifestyle
          </p>
        </div>

        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-gradient-to-br from-green-500 to-blue-500 p-4 mb-4">
              <Sparkles className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-2xl font-semibold mb-2">Complete Your Health Profile</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-lg">
              To unlock AI-powered optimization plans, we need to understand your health goals, 
              current status, and preferences. This takes just 2 minutes.
            </p>
            <Link href="/dashboard/profile">
              <Button size="lg" className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700">
                <Sparkles className="mr-2 h-5 w-5" />
                Set Up Health Profile
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
            Optimize
          </h1>
          <p className="text-muted-foreground text-lg">
            Your AI-powered health optimization dashboard
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Active Plans</p>
                  <p className="text-3xl font-bold text-green-700">{activePlans}/3</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-600 flex items-center justify-center">
                  <Target className="h-6 w-6 text-white" />
                </div>
              </div>
              <Progress value={completionPercentage} className="mt-3 h-2" />
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Weekly Adherence</p>
                  <p className="text-3xl font-bold text-blue-700">{weeklyAdherence}%</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">+12% from last week</p>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Current Streak</p>
                  <p className="text-3xl font-bold text-orange-700">{currentStreak} days</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-orange-600 flex items-center justify-center">
                  <Flame className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Personal best!</p>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Achievements</p>
                  <p className="text-3xl font-bold text-purple-700">12</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-600 flex items-center justify-center">
                  <Award className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">2 unlocked this week</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="bg-gradient-to-r from-green-500/10 via-blue-500/10 to-purple-500/10 border-none">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-600 to-blue-600 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold">Today's Check-In</p>
                  <p className="text-sm text-muted-foreground">Log your meals, workouts, and wellness</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Clock className="mr-2 h-4 w-4" />
                  Quick Log
                </Button>
                <Button size="sm" className="bg-gradient-to-r from-green-600 to-blue-600">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  View Progress
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-muted/50">
          <TabsTrigger 
            value="nutrition" 
            className="flex flex-col items-center gap-2 py-4 data-[state=active]:bg-gradient-to-br data-[state=active]:from-green-500 data-[state=active]:to-green-600 data-[state=active]:text-white"
          >
            <Salad className="h-5 w-5" />
            <div className="text-center">
              <div className="font-semibold">Nutrition</div>
              <div className="text-xs opacity-80">7-day meal plans</div>
            </div>
            {nutritionPlan && (
              <Badge variant="secondary" className="absolute top-2 right-2 bg-green-100 text-green-700 text-xs">
                Active
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="workout" 
            className="flex flex-col items-center gap-2 py-4 data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white"
          >
            <Dumbbell className="h-5 w-5" />
            <div className="text-center">
              <div className="font-semibold">Workout</div>
              <div className="text-xs opacity-80">Training programs</div>
            </div>
            {workoutPlan && (
              <Badge variant="secondary" className="absolute top-2 right-2 bg-blue-100 text-blue-700 text-xs">
                Active
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="lifestyle" 
            className="flex flex-col items-center gap-2 py-4 data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white"
          >
            <Heart className="h-5 w-5" />
            <div className="text-center">
              <div className="font-semibold">Lifestyle</div>
              <div className="text-xs opacity-80">Sleep & recovery</div>
            </div>
            {lifestylePlan && (
              <Badge variant="secondary" className="absolute top-2 right-2 bg-purple-100 text-purple-700 text-xs">
                Active
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="nutrition" className="space-y-6 mt-0">
          <NutritionPlanTab plan={nutritionPlan} healthProfile={healthProfile} />
        </TabsContent>

        <TabsContent value="workout" className="space-y-6 mt-0">
          <WorkoutPlanTab plan={workoutPlan} healthProfile={healthProfile} />
        </TabsContent>

        <TabsContent value="lifestyle" className="space-y-6 mt-0">
          <LifestylePlanTab plan={lifestylePlan} healthProfile={healthProfile} />
        </TabsContent>
      </Tabs>

      {/* Pro Tip */}
      <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-amber-900 mb-1">Pro Tip</p>
              <p className="text-sm text-amber-800">
                Enable daily check-ins to track your adherence and get personalized recommendations. 
                Our AI learns from your patterns to optimize your plans over time.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
