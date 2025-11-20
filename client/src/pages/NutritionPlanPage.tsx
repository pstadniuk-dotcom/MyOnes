import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Salad, 
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  ShoppingBasket,
  RefreshCw
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getQueryFn, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import { GroceryListModal } from '@/components/GroceryListModal';

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
}

const WEEKDAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TAB_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const FULL_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
const RANGE_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

const addDays = (date: Date, days: number) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const normalizeDayName = (value?: string) => value?.toLowerCase().trim();

const matchesPlanDay = (day: any, dayNumber: number, weekdayKey: string) => {
  if (!day) return false;
  if (typeof day.day === 'number' && day.day === dayNumber) return true;
  if (typeof day.day === 'string' && parseInt(day.day, 10) === dayNumber) return true;
  if (day.dayName) {
    const normalized = normalizeDayName(day.dayName);
    if (normalized === weekdayKey) return true;
    if (normalized?.startsWith(weekdayKey.slice(0, 3))) return true;
  }
  return false;
};

const getWeekRangeLabel = (start: Date) => {
  const end = addDays(start, 6);
  return `${RANGE_FORMATTER.format(start)} – ${RANGE_FORMATTER.format(end)}`;
};

const getPlanStartDate = (createdAt?: string) => {
  const raw = createdAt ? new Date(createdAt) : new Date();
  const base = new Date(raw);
  base.setHours(0, 0, 0, 0);
  const currentDay = base.getDay(); // Sunday = 0, Monday = 1
  const offset = currentDay === 0 ? -6 : 1 - currentDay;
  return addDays(base, offset);
};

export default function NutritionPlanPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if health profile is complete
  const { data: healthProfile } = useQuery<HealthProfile>({
    queryKey: ['/api/users/me/health-profile'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  // Fetch active nutrition plan
  const { data: plans } = useQuery<OptimizePlan[]>({
    queryKey: ['/api/optimize/plans'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  const nutritionPlan = plans?.find((p: OptimizePlan) => p.planType === 'nutrition' && p.isActive);

  const [activeDay, setActiveDay] = useState('day-1');
  const [showGroceryList, setShowGroceryList] = useState(false);
  const [swappingMeal, setSwappingMeal] = useState<string | null>(null);

  useEffect(() => {
    setActiveDay('day-1');
  }, [nutritionPlan?.id]);

  const planStartDate = useMemo(() => getPlanStartDate(nutritionPlan?.createdAt), [nutritionPlan?.createdAt]);

  const weekRangeLabel = useMemo(() => getWeekRangeLabel(planStartDate), [planStartDate]);

  const weekTabs = useMemo(() => {
    if (!nutritionPlan?.content?.weekPlan) return [];
    return WEEKDAY_KEYS.map((weekday, idx) => {
      const planDay = nutritionPlan.content.weekPlan.find((day: any) => matchesPlanDay(day, idx + 1, weekday));
      const date = addDays(planStartDate, idx);
      return {
        value: `day-${idx + 1}`,
        tabLabel: WEEKDAY_SHORT[idx],
        dateLabel: TAB_DATE_FORMATTER.format(date),
        fullDateLabel: FULL_DATE_FORMATTER.format(date),
        planDay,
        weekdayLabel: planDay?.dayName || WEEKDAY_SHORT[idx],
      };
    });
  }, [nutritionPlan?.content?.weekPlan, planStartDate]);

  // Generate plan mutation
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
      toast({
        title: 'Plan Generated',
        description: 'Your nutrition plan is ready!',
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
    mutationFn: async ({ day, mealType, currentMeal, id }: { day: number, mealType: string, currentMeal: any, id: string }) => {
      if (!nutritionPlan) throw new Error("No active plan");
      setSwappingMeal(id);
      const res = await apiRequest('POST', '/api/optimize/nutrition/swap-meal', {
        planId: nutritionPlan.id,
        day,
        mealType,
        currentMeal
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/optimize/plans'] });
      toast({
        title: 'Meal Swapped',
        description: 'A new meal has been generated.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Swap Failed',
        description: error.message,
      });
    },
    onSettled: () => {
      setSwappingMeal(null);
    }
  });

  // Check if health profile exists
  const isProfileComplete = !!healthProfile;

  // Empty state - no health profile
  if (!isProfileComplete) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Nutrition Plan</h1>
          <p className="text-muted-foreground">
            AI-powered meal plans personalized to your health data
          </p>
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Salad className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Complete Your Health Profile</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              To unlock AI-powered nutrition plans, we need to understand your health goals, dietary preferences, and lab results.
            </p>
            <Link href="/dashboard/profile">
              <Button>
                <Sparkles className="mr-2 h-4 w-4" />
                Set Up Health Profile
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No plan generated yet
  if (!nutritionPlan) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Nutrition Plan</h1>
          <p className="text-muted-foreground">
            AI-powered meal plans personalized to your health data
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-green-50 p-4 mb-4">
              <Salad className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Generate Your Nutrition Plan</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Our AI will analyze your health profile, lab results, and supplement formula to create a personalized 7-day meal plan.
            </p>
            <Button 
              onClick={() => generatePlan.mutate()}
              disabled={generatePlan.isPending}
            >
              {generatePlan.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Plan...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Nutrition Plan
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Plan exists - show it
  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Nutrition Plan</h1>
          <p className="text-muted-foreground">
            Generated {new Date(nutritionPlan.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setShowGroceryList(true)}
          >
            <ShoppingBasket className="mr-2 h-4 w-4" />
            Grocery List
          </Button>
          <Button 
            variant="outline" 
            onClick={() => generatePlan.mutate()}
            disabled={generatePlan.isPending}
          >
            {generatePlan.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Regenerate Plan
              </>
            )}
          </Button>
        </div>
      </div>

      <GroceryListModal open={showGroceryList} onOpenChange={setShowGroceryList} />

      {/* Rationale */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-green-600" />
            Why This Plan?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {nutritionPlan.rationale || 'This plan is tailored to your unique health profile and goals.'}
          </p>
        </CardContent>
      </Card>

      {/* Macro Targets */}
      {nutritionPlan.content?.macroTargets && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Macro Targets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{nutritionPlan.content.macroTargets.dailyCalories}</p>
                <p className="text-xs text-muted-foreground">Calories</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{nutritionPlan.content.macroTargets.proteinGrams}g</p>
                <p className="text-xs text-muted-foreground">Protein</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{nutritionPlan.content.macroTargets.carbsGrams}g</p>
                <p className="text-xs text-muted-foreground">Carbs</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{nutritionPlan.content.macroTargets.fatGrams}g</p>
                <p className="text-xs text-muted-foreground">Fat</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 7-Day Meal Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-green-600" />
            7-Day Meal Plan
          </CardTitle>
          <CardDescription>
            Week of {weekRangeLabel}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {nutritionPlan.content?.weekPlan && Array.isArray(nutritionPlan.content.weekPlan) ? (
            <Tabs value={activeDay} onValueChange={setActiveDay} className="space-y-4">
              <TabsList className="w-full flex-wrap gap-2 bg-transparent p-0">
                {weekTabs.map((day) => (
                  <TabsTrigger
                    key={day.value}
                    value={day.value}
                    className="flex h-auto min-w-[90px] flex-col gap-1 rounded-lg border px-3 py-2 text-left"
                  >
                    <span className="text-xs font-medium uppercase text-muted-foreground tracking-wide">{day.tabLabel}</span>
                    <span className="text-sm font-semibold text-foreground">{day.dateLabel}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
              {weekTabs.map((day) => (
                <TabsContent key={day.value} value={day.value}>
                  <div className="rounded-lg border border-green-100 bg-green-50/40 p-4">
                    <div className="flex flex-col gap-1">
                      <p className="text-lg font-semibold">{day.planDay?.dayName || day.tabLabel}</p>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{day.fullDateLabel}</p>
                      {day.planDay?.dailyTotals && (
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary" className="bg-white/80 text-foreground">
                            {day.planDay.dailyTotals.calories} cal
                          </Badge>
                          <Badge variant="secondary" className="bg-white/80 text-foreground">
                            {day.planDay.dailyTotals.protein}g protein
                          </Badge>
                          <Badge variant="secondary" className="bg-white/80 text-foreground">
                            {day.planDay.dailyTotals.carbs}g carbs
                          </Badge>
                          <Badge variant="secondary" className="bg-white/80 text-foreground">
                            {day.planDay.dailyTotals.fat}g fat
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  {day.planDay ? (
                    <div className="mt-4 space-y-3">
                      {day.planDay.meals?.map((meal: any, idx: number) => {
                        const mealId = `${day.value}-${meal.mealType}-${idx}`;
                        const isSwapping = swappingMeal === mealId;
                        
                        return (
                        <div key={mealId} className="rounded-lg border p-3 relative group">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between pr-8">
                            <div>
                              <p className="font-medium">{meal.name}</p>
                              <p className="text-xs capitalize text-muted-foreground">{meal.mealType}</p>
                            </div>
                            {meal.macros?.calories && (
                              <Badge variant="outline" className="w-fit text-xs">
                                {meal.macros.calories} cal
                              </Badge>
                            )}
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`absolute top-2 right-2 h-8 w-8 transition-opacity ${isSwapping ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                            onClick={() => swapMeal.mutate({ 
                              day: day.planDay.day, 
                              mealType: meal.mealType,
                              currentMeal: meal,
                              id: mealId
                            })}
                            disabled={isSwapping || swapMeal.isPending}
                            title="Swap this meal"
                          >
                            <RefreshCw className={`h-4 w-4 ${isSwapping ? 'animate-spin' : ''}`} />
                          </Button>

                          {meal.healthBenefits && (
                            <p className="mt-2 text-xs text-muted-foreground">{meal.healthBenefits}</p>
                          )}
                          {Array.isArray(meal.ingredients) && meal.ingredients.length > 0 && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Ingredients: {meal.ingredients.join(', ')}
                            </p>
                          )}
                        </div>
                      )})}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      No AI meals were generated for this day. Use leftovers, prioritize hydration, or regenerate the plan for fresh ideas.
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Plan data unavailable. Try regenerating the plan.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shopping List */}
      {nutritionPlan.content?.shoppingList && nutritionPlan.content.shoppingList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Shopping List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {nutritionPlan.content.shoppingList.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between">
                  <span>{item.item}</span>
                  <span className="text-muted-foreground">{item.quantity}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Meal Prep Tips */}
      {nutritionPlan.content?.mealPrepTips && nutritionPlan.content.mealPrepTips.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Meal Prep Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {nutritionPlan.content.mealPrepTips.map((tip: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Daily Logging */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Progress</CardTitle>
          <CardDescription>
            Track your meal adherence (coming soon)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <p className="text-sm">Daily logging feature in development</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
