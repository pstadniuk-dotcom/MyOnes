import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Salad, 
  Dumbbell,
  Heart,
  Sparkles,
  Calendar,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/queryClient';
import { Link, useLocation, useParams } from 'wouter';
import { NutritionPlanTab } from '@/components/optimize/NutritionPlanTab';
import { WorkoutPlanTab } from '@/components/optimize/WorkoutPlanTab';
import { LifestylePlanTab } from '@/components/optimize/LifestylePlanTab';
import type { OptimizeLogsByDate } from '@/types/optimize';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

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
  const [location, navigate] = useLocation();
  const params = useParams<{ tab?: string }>();
  
  // Get tab from URL param (e.g., /dashboard/optimize/workout)
  const urlTab = params.tab as 'nutrition' | 'workout' | 'lifestyle' | undefined;

  // Fetch health profile
  const { data: healthProfile, isLoading: profileLoading } = useQuery<HealthProfile>({
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
  const isLoading = profileLoading || plansLoading;

  const planSections = [
    {
      key: 'nutrition' as const,
      title: 'Nutrition',
      description: 'Meal plans & macros',
      icon: Salad,
      accent: 'from-green-500 to-green-600',
      badgeClass: 'bg-green-100 text-green-700',
      isActive: !!nutritionPlan,
      content: (
        <NutritionPlanTab
          plan={nutritionPlan}
          healthProfile={healthProfile}
        />
      ),
    },
    {
      key: 'workout' as const,
      title: 'Workout',
      description: 'Training schedule',
      icon: Dumbbell,
      accent: 'from-blue-500 to-blue-600',
      badgeClass: 'bg-blue-100 text-blue-700',
      isActive: !!workoutPlan,
      content: (
        <WorkoutPlanTab
          plan={workoutPlan}
          healthProfile={healthProfile}
        />
      ),
    },
    {
      key: 'lifestyle' as const,
      title: 'Lifestyle',
      description: 'Sleep & recovery',
      icon: Heart,
      accent: 'from-purple-500 to-purple-600',
      badgeClass: 'bg-purple-100 text-purple-700',
      isActive: !!lifestylePlan,
      content: <LifestylePlanTab plan={lifestylePlan} healthProfile={healthProfile} />,
    },
  ];

  // Calculate default tab - prioritize URL param, then first active plan
  const defaultTab = useMemo(() => {
    // If URL has a valid tab param, use it
    if (urlTab && ['nutrition', 'workout', 'lifestyle'].includes(urlTab)) {
      return urlTab as 'nutrition' | 'workout' | 'lifestyle';
    }
    if (plansLoading) return 'nutrition' as const; // Default while loading
    return (planSections.find((section) => section.isActive)?.key ?? planSections[0].key) as typeof planSections[number]['key'];
  }, [urlTab, nutritionPlan, workoutPlan, lifestylePlan, plansLoading]);
  
  const [activePlanTab, setActivePlanTab] = useState<typeof defaultTab>(defaultTab);
  
  // Update active tab when URL param changes or plans finish loading
  useEffect(() => {
    if (urlTab && ['nutrition', 'workout', 'lifestyle'].includes(urlTab)) {
      setActivePlanTab(urlTab as 'nutrition' | 'workout' | 'lifestyle');
    } else if (!plansLoading) {
      setActivePlanTab(defaultTab);
    }
  }, [urlTab, defaultTab, plansLoading]);

  // Show loading state while fetching profile/plans to prevent flash of incomplete profile card
  if (isLoading) {
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
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

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
    <div className="container mx-auto px-4 md:p-6 max-w-7xl space-y-6">

      {/* Header Section */}
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
            Optimize
          </h1>
          <p className="text-muted-foreground text-base md:text-lg">
            Your AI-powered health optimization dashboard
          </p>
        </div>
      </div>

      {/* Plan Sections */}
      <Tabs value={activePlanTab} onValueChange={(value) => {
        setActivePlanTab(value as typeof activePlanTab);
        navigate(`/dashboard/optimize/${value}`);
      }} className="space-y-8">
        <TabsList className="h-auto w-full rounded-xl border bg-muted/20 p-1 grid grid-cols-2 md:grid-cols-3 gap-1">
          {planSections.map((section) => {
            const Icon = section.icon;
            return (
              <TabsTrigger
                key={section.key}
                value={section.key}
                className="w-full justify-start rounded-lg border border-transparent px-3 py-2 text-left transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className={`h-8 w-8 rounded-md flex items-center justify-center flex-shrink-0 ${
                    activePlanTab === section.key ? section.badgeClass : 'bg-muted text-muted-foreground'
                  }`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">{section.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{section.description}</p>
                  </div>
                </div>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Reminders Setup Prompt */}
        <Card className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border-none">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">Stay on Track with Reminders</p>
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-5 w-5 text-purple-500 hover:text-purple-600 hover:bg-purple-100/50 rounded-full p-0">
                          <Sparkles className="h-3 w-3" />
                        </Button>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-80 bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
                        <div className="flex gap-3">
                          <div className="h-8 w-8 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
                            <Sparkles className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="font-semibold text-purple-900 mb-1 text-sm">Pro Tip</p>
                            <p className="text-xs text-purple-800">
                              Set up personalized reminders for supplements, workouts, meals, and check-ins. 
                              Daily reminders help you stay consistent and achieve your health goals faster.
                            </p>
                          </div>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  </div>
                  <p className="text-sm text-muted-foreground">Configure reminders for supplements, workouts, meals & more</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href="/dashboard/settings#notifications">
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Set Up Reminders
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
        {planSections.map((section) => (
          <TabsContent key={section.key} value={section.key} className="mt-0 space-y-6">
            <div className="rounded-3xl border bg-card/70 p-6 shadow-sm">
              {section.content}
            </div>
          </TabsContent>
        ))}
      </Tabs>

    </div>
  );
}
