import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileScrollableTabs } from '@/components/mobile';
import { 
  Salad, 
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  ShoppingBasket,
  RefreshCw,
  TrendingUp,
  Apple,
  Flame,
  Droplets,
  Clock,
  ChevronRight,
  Info,
  ChefHat,
  Utensils,
  History,
  ClipboardList,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { MealLogger } from './nutrition/MealLogger';
import { HydrationTracker } from './nutrition/HydrationTracker';
import { TodayNutritionSummary } from './nutrition/TodayNutritionSummary';
import { NutritionHistory } from './nutrition/NutritionHistory';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { GroceryListModal } from '@/components/GroceryListModal';
import type { OptimizeLogsByDate } from '@/types/optimize';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Share2, Mail, MessageSquare } from "lucide-react";

interface NutritionPlanTabProps {
  plan: any;
  healthProfile: any;
  dailyLogsByDate?: OptimizeLogsByDate;
  logsLoading?: boolean;
}

const WEEKDAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'];

const addDays = (date: Date, days: number) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const getPlanStartDate = (createdAt?: string) => {
  const raw = createdAt ? new Date(createdAt) : new Date();
  const base = new Date(raw);
  base.setHours(0, 0, 0, 0);
  const currentDay = base.getDay();
  const offset = currentDay === 0 ? -6 : 1 - currentDay;
  return addDays(base, offset);
};

export function NutritionPlanTab({ plan, healthProfile, dailyLogsByDate }: NutritionPlanTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  
  // Check for view=log URL parameter to auto-switch to log tab
  const getViewParam = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('view');
  };
  
  const [mainTab, setMainTab] = useState(() => getViewParam() === 'log' ? 'log' : 'plan');
  
  // Update tab when URL param changes (e.g., navigating from dashboard)
  // Check on every render since wouter doesn't trigger remounts
  useEffect(() => {
    const checkViewParam = () => {
      const viewParam = getViewParam();
      if (viewParam === 'log') {
        setMainTab('log');
        // Clear the URL param after switching to avoid issues on tab change
        const url = new URL(window.location.href);
        url.searchParams.delete('view');
        window.history.replaceState({}, '', url.toString());
      }
    };
    
    // Check immediately
    checkViewParam();
    
    // Also listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', checkViewParam);
    return () => window.removeEventListener('popstate', checkViewParam);
  }, []);
  
  const [activeDay, setActiveDay] = useState('day-1');
  const [showGroceryList, setShowGroceryList] = useState(false);
  const [swappingMeal, setSwappingMeal] = useState<string | null>(null);
  const [viewingRecipe, setViewingRecipe] = useState<{ mealName: string, recipe: any } | null>(null);
  const [isRecipeOpen, setIsRecipeOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState('');
  const [shareMethod, setShareMethod] = useState<'sms' | 'email'>('sms');

  // Fetch today's nutrition data for logging tab
  const { data: todayNutrition, refetch: refetchTodayNutrition } = useQuery<{
    totals: { calories: number; protein: number; carbs: number; fat: number; mealsLogged: number; waterOz: number };
    meals: any[];
    waterIntakeOz: number;
  }>({
    queryKey: ['/api/optimize/nutrition/today'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/optimize/nutrition/today');
      if (!res.ok) throw new Error('Failed to fetch today nutrition');
      return res.json();
    },
    enabled: mainTab === 'log',
  });

  // Get today's planned meals for quick logging
  const todayPlanMeals = useMemo(() => {
    if (!plan?.content?.weekPlan) return [];
    const today = new Date().getDay();
    const dayIndex = today === 0 ? 6 : today - 1; // Adjust for week starting Monday
    const todayPlan = plan.content.weekPlan[dayIndex];
    return todayPlan?.meals || [];
  }, [plan]);

  const generatePlan = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/optimize/plans/generate', {
        planTypes: ['nutrition'],
        preferences: {}
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/optimize/plans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/optimize/grocery-list'] });
      queryClient.invalidateQueries({ queryKey: ['/api/optimize/grocery-list'] });
      toast({
        title: '🎉 Plan Generated!',
        description: 'Your personalized nutrition plan is ready.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: error.message,
      });
    },
  });

  const swapMeal = useMutation({
    mutationFn: async ({ dayIndex, mealType, currentMealName, mealIndex, id }: any) => {
      setSwappingMeal(id);
      const res = await apiRequest('POST', '/api/optimize/nutrition/swap-meal', {
        planId: plan?.id,
        dayIndex,
        mealType,
        currentMealName,
        mealIndex
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/optimize/plans'] });
      toast({
        title: 'Meal Swapped',
        description: 'Your meal has been replaced with a new option.',
      });
      setSwappingMeal(null);
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Swap Failed',
        description: error.message,
      });
      setSwappingMeal(null);
    },
  });

  const generateRecipe = useMutation({
    mutationFn: async (data: { mealName: string, ingredients: string[] }) => {
      const res = await apiRequest('POST', '/api/optimize/nutrition/recipe', data);
      return res.json();
    },
    onSuccess: (recipe, variables) => {
      setViewingRecipe({ mealName: variables.mealName, recipe });
      setIsRecipeOpen(true);
    },
    onError: (error) => {
      toast({
        title: "Failed to generate recipe",
        description: "Please try again later.",
        variant: "destructive",
      });
      // Clear any pending recipe state on error
      setViewingRecipe(null);
      setIsRecipeOpen(false);
    }
  });

  const shareRecipe = useMutation({
    mutationFn: async (data: { recipe: any, method: 'sms' | 'email', target: string }) => {
      await apiRequest('POST', '/api/optimize/nutrition/recipe/share', data);
    },
    onSuccess: () => {
      toast({
        title: 'Recipe Shared',
        description: 'The recipe has been sent successfully.',
      });
      setShareOpen(false);
      setShareTarget('');
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Share Failed',
        description: error.message,
      });
    }
  });

  // Calculate week tabs
  const weekTabs = useMemo(() => {
    if (!plan?.createdAt) return [];
    
    const planStart = getPlanStartDate(plan.createdAt);
    const weekPlan = Array.isArray(plan?.content?.weekPlan) ? plan.content.weekPlan : [];
    
    return WEEKDAY_KEYS.map((weekdayKey, dayNumber) => {
      const currentDate = addDays(planStart, dayNumber);
      const dateLabel = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(currentDate);
      const fullDateLabel = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(currentDate);
      const planDay = weekPlan[dayNumber] || weekPlan.find((d: any) => {
        const normalized = d?.dayName?.toLowerCase().trim();
        return normalized === weekdayKey || normalized?.startsWith(weekdayKey.slice(0, 3));
      });
      const dateKey = currentDate.toISOString().slice(0, 10);
      const dailyLog = dailyLogsByDate?.[dateKey];
      
      return {
        value: `day-${dayNumber + 1}`,
        tabLabel: WEEKDAY_SHORT[dayNumber],
        dateLabel,
        fullDateLabel,
        planDay,
        dayNumber,
        dateKey,
        dailyLog,
      };
    });
  }, [plan, dailyLogsByDate]);

  const weekRangeLabel = weekTabs.length > 0 
    ? `${weekTabs[0]?.dateLabel ?? ''} – ${weekTabs[weekTabs.length - 1]?.dateLabel ?? ''}`
    : '';
  const planNeedsRegeneration = Boolean(plan?.content?.autoHealMeta?.missingDays);

  if (!plan) {
    return (
      <div className="space-y-6">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-gradient-to-br from-primary to-primary p-4 mb-4 shadow-lg">
              <Salad className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-2xl font-semibold mb-2">Generate Your Nutrition Plan</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Our AI will analyze your health profile, lab results, and supplement formula to create 
              a personalized 7-day meal plan optimized for your goals.
            </p>
            
            {/* Benefits Grid */}
            <div className="grid grid-cols-2 gap-3 w-full max-w-lg mb-6">
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Macro-balanced meals</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Personalized portions</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Shopping list included</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Meal prep guidance</span>
              </div>
            </div>
            
            <Button 
              size="lg"
              onClick={() => generatePlan.mutate()}
              disabled={generatePlan.isPending}
              className="bg-gradient-to-r from-primary to-primary hover:from-primary/90 hover:to-primary/90 shadow-lg"
            >
              {generatePlan.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating Your Plan...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Generate Nutrition Plan
                </>
              )}
            </Button>
            
            <p className="text-xs text-muted-foreground mt-4">Takes about 30 seconds</p>
          </CardContent>
        </Card>

        {/* Educational Cards */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <Apple className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-base">Science-Backed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Every meal is designed using evidence-based nutrition principles tailored to your biomarkers.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <RefreshCw className="h-8 w-8 text-stone-600 mb-2" />
              <CardTitle className="text-base">Flexible Swaps</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Don't like a meal? Swap it instantly with AI-generated alternatives that match your macros.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <TrendingUp className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-base">Adaptive Plans</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Your plan evolves with your progress, lab results, and wearable data for continuous optimization.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Tab Navigation */}
      <Tabs value={mainTab} onValueChange={setMainTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 h-auto p-1.5 gap-1.5">
          <TabsTrigger value="plan" className="flex flex-col items-center justify-center gap-1 py-3 text-sm">
            <ClipboardList className="h-6 w-6" />
            <span className="font-medium">Plan</span>
          </TabsTrigger>
          <TabsTrigger value="log" className="flex flex-col items-center justify-center gap-1 py-3 text-sm">
            <Utensils className="h-6 w-6" />
            <span className="font-medium">Log</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex flex-col items-center justify-center gap-1 py-3 text-sm">
            <History className="h-6 w-6" />
            <span className="font-medium">History</span>
          </TabsTrigger>
        </TabsList>

        {/* ===== MEAL PLAN TAB ===== */}
        <TabsContent value="plan" className="space-y-6 mt-0">
          {/* Header Actions */}
          <div className="flex flex-col gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                  Active Plan
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  Generated {new Date(plan.createdAt).toLocaleDateString()}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Week of {weekRangeLabel}
              </p>
            </div>
            <div className="flex gap-3 w-full justify-center">
              <Button 
                variant="outline"
                onClick={() => setShowGroceryList(true)}
                className="shadow-sm flex-1 max-w-[180px]"
                size="lg"
              >
                <ShoppingBasket className="mr-2 h-5 w-5" />
                Grocery List
              </Button>
              <Button 
                variant="outline" 
                onClick={() => generatePlan.mutate()}
                disabled={generatePlan.isPending}
                className="shadow-sm flex-1 max-w-[180px]"
                size="lg"
              >
                {generatePlan.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    <span className="hidden sm:inline">Regenerating...</span>
                    <span className="sm:hidden">...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-5 w-5" />
                    Regenerate
                  </>
                )}
              </Button>
            </div>
          </div>

      <GroceryListModal open={showGroceryList} onOpenChange={setShowGroceryList} />

      {planNeedsRegeneration && (
        <Alert className="border-yellow-300 bg-yellow-50">
          <AlertTitle className="flex items-center gap-2 text-yellow-900">
            <AlertCircle className="h-4 w-4" />
            Plan needs regeneration
          </AlertTitle>
          <AlertDescription className="text-sm text-yellow-900/80">
            We filled in missing days to keep things moving, but you should regenerate this plan to receive fully personalized meals.
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Flame className="h-5 w-5 text-primary" />
              <span className="text-xs text-muted-foreground">Daily</span>
            </div>
            <p className="text-2xl font-bold text-primary">
              {plan.content?.macroTargets?.dailyCalories || 2000}
            </p>
            <p className="text-xs text-muted-foreground">Calories</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-stone-50 to-stone-100/30 border-stone-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Apple className="h-5 w-5 text-stone-600" />
              <span className="text-xs text-muted-foreground">Target</span>
            </div>
            <p className="text-2xl font-bold text-stone-700">
              {plan.content?.macroTargets?.proteinGrams || 150}g
            </p>
            <p className="text-xs text-muted-foreground">Protein</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Droplets className="h-5 w-5 text-primary" />
              <span className="text-xs text-muted-foreground">Daily</span>
            </div>
            <p className="text-2xl font-bold text-primary">3.5L</p>
            <p className="text-xs text-muted-foreground">Hydration</p>
          </CardContent>
        </Card>
      </div>

      {/* Rationale */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="h-5 w-5 text-primary" />
            Why This Plan Works for You
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {plan.aiRationale || 'This plan is tailored to your unique health profile, goals, and supplement formula.'}
          </p>
        </CardContent>
      </Card>

      {/* 7-Day Meal Plan */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Your 7-Day Meal Plan
              </CardTitle>
              <CardDescription className="mt-1">
                Tap any day to view meals • Hover meals to swap
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeDay} onValueChange={setActiveDay} className="space-y-6">
            {/* Day Selector - Scrollable on mobile */}
            {isMobile ? (
              <MobileScrollableTabs>
                <TabsList className="flex gap-3 !bg-transparent p-0 h-auto w-max">
                  {weekTabs.map((day, idx) => {
                    const isToday = idx === new Date().getDay() - 1 || (new Date().getDay() === 0 && idx === 6);
                    
                    return (
                      <TabsTrigger
                        key={day.value}
                        value={day.value}
                        className={`
                          flex flex-col items-center gap-2 py-4 px-5 rounded-xl border-2 transition-all snap-start min-w-[80px]
                          data-[state=active]:border-primary data-[state=active]:bg-primary/5
                          ${isToday ? 'ring-2 ring-primary/20' : ''}
                        `}
                      >
                        <span className="text-sm font-medium text-muted-foreground">
                          {day.tabLabel}
                        </span>
                        <span className="text-lg font-bold">
                          {day.dateLabel.split(' ')[1]}
                        </span>
                        {isToday && (
                          <Badge variant="secondary" className="text-xs py-0.5 px-2 bg-primary/10 text-primary">
                            Today
                          </Badge>
                        )}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </MobileScrollableTabs>
            ) : (
              <TabsList className="w-full grid grid-cols-7 gap-2 bg-transparent p-0 h-auto">
                {weekTabs.map((day, idx) => {
                  const isToday = idx === new Date().getDay() - 1 || (new Date().getDay() === 0 && idx === 6);
                  
                  return (
                    <TabsTrigger
                      key={day.value}
                      value={day.value}
                      className={`
                        flex flex-col gap-2 p-3 rounded-xl border-2 transition-all
                        data-[state=active]:border-primary data-[state=active]:bg-primary/5
                        ${isToday ? 'ring-2 ring-primary/20' : ''}
                      `}
                    >
                      <span className="text-xs font-medium text-muted-foreground">
                        {day.tabLabel}
                      </span>
                      <span className="text-sm font-semibold">
                        {day.dateLabel.split(' ')[1]}
                      </span>
                      {isToday && (
                        <Badge variant="secondary" className="text-[10px] py-0 px-1 bg-primary/10 text-primary">
                          Today
                        </Badge>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            )}

            {/* Day Content */}
                {weekTabs.map((day) => (
              <TabsContent key={day.value} value={day.value} className="mt-0 space-y-4">
                {/* Day Header */}
                <div className="rounded-xl border-2 border-primary/10 bg-gradient-to-r from-primary/5 to-primary/10 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-primary">
                        {day.planDay?.dayName || day.tabLabel}
                      </h3>
                      <p className="text-sm text-primary/80">{day.fullDateLabel}</p>
                    </div>
                    {day.planDay?.dailyTotals && (
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="bg-white shadow-sm">
                          🔥 {day.planDay.dailyTotals.calories} cal
                        </Badge>
                        <Badge variant="secondary" className="bg-white shadow-sm">
                          💪 {day.planDay.dailyTotals.protein}g
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>

                {/* Meals */}
                    {day.planDay?.meals ? (
                  <div className="flex flex-col gap-4 w-full">
                    {day.planDay.meals.map((meal: any, idx: number) => {
                      const mealId = `${day.value}-${meal.mealType}-${idx}`;
                      const isSwapping = swappingMeal === mealId;
                      
                      return (
                        <Card 
                          key={mealId} 
                          className="w-full shadow-sm border-muted"
                        >
                          <CardContent className="p-5">
                            <div className="flex flex-col gap-3">
                              {/* Header row with meal type and calories */}
                              <div className="flex items-center justify-between">
                                <Badge 
                                  variant="outline" 
                                  className="text-sm capitalize bg-primary/5 text-primary border-primary/20 px-3 py-1"
                                >
                                  {meal.mealType}
                                </Badge>
                                {meal.macros?.calories && (
                                  <span className="text-sm font-medium text-muted-foreground">
                                    {meal.macros.calories} cal
                                  </span>
                                )}
                              </div>
                              
                              {/* Meal name */}
                              <h4 className="font-semibold text-xl leading-tight">{meal.name}</h4>
                              
                              {/* Health benefits */}
                              {meal.healthBenefits && (
                                <p className="text-sm text-muted-foreground leading-relaxed flex items-start gap-2">
                                  <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                  {meal.healthBenefits}
                                </p>
                              )}
                              
                              {/* Ingredients preview */}
                              {meal.ingredients && meal.ingredients.length > 0 && (
                                <p className="text-sm text-muted-foreground">
                                  {meal.ingredients.slice(0, 4).join(' • ')}
                                  {meal.ingredients.length > 4 && ` +${meal.ingredients.length - 4} more`}
                                </p>
                              )}
                              
                              {/* Action buttons - always visible */}
                              <div className="flex gap-2 pt-2 border-t mt-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => generateRecipe.mutate({ 
                                    mealName: meal.name, 
                                    ingredients: meal.ingredients || [] 
                                  })}
                                  disabled={generateRecipe.isPending}
                                >
                                  <ChefHat className={`h-4 w-4 mr-2 ${generateRecipe.isPending && generateRecipe.variables?.mealName === meal.name ? 'animate-spin' : ''}`} />
                                  Recipe
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => swapMeal.mutate({ 
                                    dayIndex: day.planDay.day - 1, 
                                    mealType: meal.mealType,
                                    currentMealName: meal.name,
                                    mealIndex: idx,
                                    id: mealId
                                  })}
                                  disabled={isSwapping || swapMeal.isPending}
                                >
                                  <RefreshCw className={`h-4 w-4 mr-2 ${isSwapping ? 'animate-spin' : ''}`} />
                                  Swap
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                      <Clock className="h-8 w-8 text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">
                        No meals planned for this day
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Consider it a flex day or regenerate your plan
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Meal Prep Tips */}
      {plan.content?.mealPrepTips && plan.content.mealPrepTips.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Meal Prep Tips for This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-3">
              {plan.content.mealPrepTips.map((tip: string, idx: number) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{tip}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      </TabsContent>

      {/* ===== LOG MEALS TAB ===== */}
      <TabsContent value="log" className="space-y-6 mt-0">
        {/* Today's Summary */}
        {todayNutrition && (
          <TodayNutritionSummary 
            totals={todayNutrition.totals}
            meals={todayNutrition.meals}
            targets={{
              calories: plan?.content?.macroTargets?.dailyCalories || 2000,
              protein: plan?.content?.macroTargets?.proteinGrams || 150,
              carbs: plan?.content?.macroTargets?.carbsGrams || 200,
              fat: plan?.content?.macroTargets?.fatGrams || 65,
            }}
            onMealDeleted={() => refetchTodayNutrition()}
          />
        )}

        {/* Meal Logger and Hydration Tracker - stacked on mobile, side by side on desktop */}
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4 w-full">
          <MealLogger 
            todayPlanMeals={todayPlanMeals}
            onMealLogged={() => refetchTodayNutrition()}
          />
          <HydrationTracker 
            currentOz={todayNutrition?.waterIntakeOz || 0}
            goalOz={100}
            onUpdate={() => refetchTodayNutrition()}
          />
        </div>
      </TabsContent>

      {/* ===== HISTORY TAB ===== */}
      <TabsContent value="history" className="space-y-4 mt-0 w-full">
        <NutritionHistory />
      </TabsContent>
      </Tabs>

      {/* Recipe Dialog */}
      <Dialog open={isRecipeOpen} onOpenChange={setIsRecipeOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <DialogTitle className="text-2xl flex items-center gap-2">
                <ChefHat className="h-6 w-6 text-primary" />
                {viewingRecipe?.recipe?.name || viewingRecipe?.mealName}
              </DialogTitle>
              
              <Popover open={shareOpen} onOpenChange={setShareOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none">Share Recipe</h4>
                      <p className="text-sm text-muted-foreground">
                        Send this recipe to your phone or email.
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
                        <Button 
                          variant={shareMethod === 'sms' ? 'secondary' : 'ghost'} 
                          size="sm" 
                          className="flex-1"
                          onClick={() => setShareMethod('sms')}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          SMS
                        </Button>
                        <Button 
                          variant={shareMethod === 'email' ? 'secondary' : 'ghost'} 
                          size="sm" 
                          className="flex-1"
                          onClick={() => setShareMethod('email')}
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Email
                        </Button>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="target">
                          {shareMethod === 'sms' ? 'Phone Number' : 'Email Address'}
                        </Label>
                        <Input
                          id="target"
                          placeholder={shareMethod === 'sms' ? '+1234567890' : 'you@example.com'}
                          value={shareTarget}
                          onChange={(e) => setShareTarget(e.target.value)}
                        />
                      </div>
                      <Button 
                        onClick={() => shareRecipe.mutate({ 
                          recipe: viewingRecipe?.recipe, 
                          method: shareMethod, 
                          target: shareTarget 
                        })}
                        disabled={!shareTarget || shareRecipe.isPending}
                      >
                        {shareRecipe.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          'Send'
                        )}
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <DialogDescription>
              {viewingRecipe?.recipe?.description}
            </DialogDescription>
          </DialogHeader>
          
          {viewingRecipe?.recipe && (
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-6">
                {/* Meta Info */}
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Prep: {viewingRecipe.recipe.prepTime}
                  </div>
                  <div className="flex items-center gap-1">
                    <Flame className="h-4 w-4" />
                    Cook: {viewingRecipe.recipe.cookTime}
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    {viewingRecipe.recipe.macros?.calories} cal
                  </div>
                </div>

                {/* Ingredients */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <ShoppingBasket className="h-4 w-4 text-primary" />
                    Ingredients
                  </h4>
                  <ul className="grid sm:grid-cols-2 gap-2">
                    {viewingRecipe.recipe.ingredients?.map((ing: any, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm bg-muted/30 p-2 rounded">
                        <span className="font-medium">{ing.amount}</span>
                        <span>{ing.item}</span>
                        {ing.notes && <span className="text-muted-foreground italic">({ing.notes})</span>}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Instructions */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Instructions
                  </h4>
                  <div className="space-y-4">
                    {viewingRecipe.recipe.instructions?.map((step: string, idx: number) => (
                      <div key={idx} className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </div>
                        <p className="text-sm leading-relaxed">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Macros */}
                <div className="bg-muted/30 p-4 rounded-lg">
                  <h4 className="font-semibold mb-3 text-sm">Nutritional Breakdown</h4>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2 bg-background rounded shadow-sm">
                      <div className="text-xs text-muted-foreground">Protein</div>
                      <div className="font-bold text-primary">{viewingRecipe.recipe.macros?.protein}g</div>
                    </div>
                    <div className="p-2 bg-background rounded shadow-sm">
                      <div className="text-xs text-muted-foreground">Carbs</div>
                      <div className="font-bold text-primary">{viewingRecipe.recipe.macros?.carbs}g</div>
                    </div>
                    <div className="p-2 bg-background rounded shadow-sm">
                      <div className="text-xs text-muted-foreground">Fats</div>
                      <div className="font-bold text-primary">{viewingRecipe.recipe.macros?.fat}g</div>
                    </div>
                    <div className="p-2 bg-background rounded shadow-sm">
                      <div className="text-xs text-muted-foreground">Calories</div>
                      <div className="font-bold text-primary">{viewingRecipe.recipe.macros?.calories}</div>
                    </div>
                  </div>
                </div>

                {/* Chef's Tip */}
                {viewingRecipe.recipe.chefTip && (
                  <Alert className="bg-primary/5 border-primary/20">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <AlertTitle>Chef's Tip</AlertTitle>
                    <AlertDescription>
                      {viewingRecipe.recipe.chefTip}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
