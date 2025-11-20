import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
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
  Info
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { GroceryListModal } from '@/components/GroceryListModal';

interface NutritionPlanTabProps {
  plan: any;
  healthProfile: any;
}

const WEEKDAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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

export function NutritionPlanTab({ plan, healthProfile }: NutritionPlanTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeDay, setActiveDay] = useState('day-1');
  const [showGroceryList, setShowGroceryList] = useState(false);
  const [swappingMeal, setSwappingMeal] = useState<string | null>(null);

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
    mutationFn: async ({ day, mealType, id }: any) => {
      setSwappingMeal(id);
      const res = await apiRequest('POST', '/api/optimize/nutrition/swap-meal', {
        planId: plan?.id,
        day,
        mealType
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

  // Calculate week tabs
  const weekTabs = useMemo(() => {
    if (!plan?.createdAt) return [];
    
    const planStart = getPlanStartDate(plan.createdAt);
    const weekPlan = plan?.content?.weekPlan || [];
    
    return WEEKDAY_KEYS.map((weekdayKey, dayNumber) => {
      const currentDate = addDays(planStart, dayNumber);
      const dateLabel = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(currentDate);
      const fullDateLabel = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(currentDate);
      const planDay = weekPlan.find((d: any) => {
        const normalized = d?.dayName?.toLowerCase().trim();
        return normalized === weekdayKey || normalized?.startsWith(weekdayKey.slice(0, 3));
      });
      
      return {
        value: `day-${dayNumber + 1}`,
        tabLabel: WEEKDAY_SHORT[dayNumber],
        dateLabel,
        fullDateLabel,
        planDay,
        dayNumber
      };
    });
  }, [plan]);

  if (!plan) {
    return (
      <div className="space-y-6">
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100/30">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-gradient-to-br from-green-500 to-emerald-500 p-4 mb-4 shadow-lg">
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
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Macro-balanced meals</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Personalized portions</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Shopping list included</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Meal prep guidance</span>
              </div>
            </div>
            
            <Button 
              size="lg"
              onClick={() => generatePlan.mutate()}
              disabled={generatePlan.isPending}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg"
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
              <Apple className="h-8 w-8 text-green-600 mb-2" />
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
              <RefreshCw className="h-8 w-8 text-blue-600 mb-2" />
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
              <TrendingUp className="h-8 w-8 text-purple-600 mb-2" />
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

  const weekRangeLabel = weekTabs.length > 0 
    ? `${weekTabs[0].dateLabel} – ${weekTabs[6].dateLabel}`
    : '';

  // Calculate daily adherence (mock data - would come from logging)
  const dailyAdherence = [95, 100, 87, 92, 100, 78, 85];

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
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
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setShowGroceryList(true)}
            className="shadow-sm"
          >
            <ShoppingBasket className="mr-2 h-4 w-4" />
            Grocery List
          </Button>
          <Button 
            variant="outline" 
            onClick={() => generatePlan.mutate()}
            disabled={generatePlan.isPending}
            className="shadow-sm"
          >
            {generatePlan.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate
              </>
            )}
          </Button>
        </div>
      </div>

      <GroceryListModal open={showGroceryList} onOpenChange={setShowGroceryList} />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100/30 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Flame className="h-5 w-5 text-green-600" />
              <span className="text-xs text-muted-foreground">Daily</span>
            </div>
            <p className="text-2xl font-bold text-green-700">
              {plan.content?.macroTargets?.dailyCalories || 2000}
            </p>
            <p className="text-xs text-muted-foreground">Calories</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/30 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Apple className="h-5 w-5 text-blue-600" />
              <span className="text-xs text-muted-foreground">Target</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">
              {plan.content?.macroTargets?.proteinGrams || 150}g
            </p>
            <p className="text-xs text-muted-foreground">Protein</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/30 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Droplets className="h-5 w-5 text-purple-600" />
              <span className="text-xs text-muted-foreground">Daily</span>
            </div>
            <p className="text-2xl font-bold text-purple-700">3.5L</p>
            <p className="text-xs text-muted-foreground">Hydration</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100/30 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-5 w-5 text-orange-600" />
              <span className="text-xs text-muted-foreground">This Week</span>
            </div>
            <p className="text-2xl font-bold text-orange-700">91%</p>
            <p className="text-xs text-muted-foreground">Adherence</p>
          </CardContent>
        </Card>
      </div>

      {/* Rationale */}
      <Card className="border-green-200 bg-gradient-to-r from-green-50/50 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="h-5 w-5 text-green-600" />
            Why This Plan Works for You
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {plan.rationale || 'This plan is tailored to your unique health profile, goals, and supplement formula.'}
          </p>
        </CardContent>
      </Card>

      {/* 7-Day Meal Plan */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-green-600" />
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
            {/* Day Selector */}
            <TabsList className="w-full grid grid-cols-7 gap-2 bg-transparent p-0 h-auto">
              {weekTabs.map((day, idx) => {
                const adherence = dailyAdherence[idx];
                const isToday = idx === new Date().getDay() - 1 || (new Date().getDay() === 0 && idx === 6);
                
                return (
                  <TabsTrigger
                    key={day.value}
                    value={day.value}
                    className={`
                      flex flex-col gap-2 p-3 rounded-xl border-2 transition-all
                      data-[state=active]:border-green-500 data-[state=active]:bg-green-50
                      ${isToday ? 'ring-2 ring-green-200' : ''}
                    `}
                  >
                    <span className="text-xs font-medium text-muted-foreground">
                      {day.tabLabel}
                    </span>
                    <span className="text-sm font-semibold">
                      {day.dateLabel.split(' ')[1]}
                    </span>
                    {adherence && (
                      <Progress value={adherence} className="h-1" />
                    )}
                    {isToday && (
                      <Badge variant="secondary" className="text-[10px] py-0 px-1 bg-green-100 text-green-700">
                        Today
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {/* Day Content */}
            {weekTabs.map((day) => (
              <TabsContent key={day.value} value={day.value} className="mt-0 space-y-4">
                {/* Day Header */}
                <div className="rounded-xl border-2 border-green-100 bg-gradient-to-r from-green-50 to-emerald-50/30 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-green-900">
                        {day.planDay?.dayName || day.tabLabel}
                      </h3>
                      <p className="text-sm text-green-700">{day.fullDateLabel}</p>
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
                  <div className="grid gap-3">
                    {day.planDay.meals.map((meal: any, idx: number) => {
                      const mealId = `${day.value}-${meal.mealType}-${idx}`;
                      const isSwapping = swappingMeal === mealId;
                      
                      return (
                        <Card 
                          key={mealId} 
                          className="group hover:shadow-md transition-all hover:border-green-200 relative overflow-hidden"
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge 
                                    variant="outline" 
                                    className="text-xs capitalize bg-green-50 text-green-700 border-green-200"
                                  >
                                    {meal.mealType}
                                  </Badge>
                                  {meal.macros?.calories && (
                                    <span className="text-xs text-muted-foreground">
                                      {meal.macros.calories} cal
                                    </span>
                                  )}
                                </div>
                                <h4 className="font-semibold text-lg mb-2">{meal.name}</h4>
                                {meal.healthBenefits && (
                                  <p className="text-sm text-muted-foreground mb-2 flex items-start gap-2">
                                    <Sparkles className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                    {meal.healthBenefits}
                                  </p>
                                )}
                                {meal.ingredients && meal.ingredients.length > 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    {meal.ingredients.slice(0, 3).join(' • ')}
                                    {meal.ingredients.length > 3 && ` +${meal.ingredients.length - 3} more`}
                                  </p>
                                )}
                              </div>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`
                                  transition-all
                                  ${isSwapping ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                                `}
                                onClick={() => swapMeal.mutate({ 
                                  day: day.planDay.day, 
                                  mealType: meal.mealType,
                                  currentMeal: meal,
                                  id: mealId
                                })}
                                disabled={isSwapping || swapMeal.isPending}
                              >
                                <RefreshCw className={`h-4 w-4 mr-2 ${isSwapping ? 'animate-spin' : ''}`} />
                                Swap
                              </Button>
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
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{tip}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
