import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Flame, 
  Beef, 
  Wheat, 
  Droplet,
  Utensils,
  Coffee,
  Sun,
  Moon,
  Apple,
  Trash2,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface NutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealsLogged: number;
}

interface MealLog {
  id: string;
  mealType: string;
  customMealName?: string;
  customMealDescription?: string;
  planMealName?: string;
  isFromPlan?: boolean;
  loggedAt: string;
  calories?: number;
  proteinGrams?: number;
  carbsGrams?: number;
  fatGrams?: number;
}

interface TodayNutritionSummaryProps {
  totals: NutritionTotals;
  meals: MealLog[];
  targets?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  onMealDeleted?: () => void;
}

const MEAL_TYPE_CONFIG: Record<string, { icon: typeof Coffee; color: string }> = {
  breakfast: { icon: Coffee, color: 'bg-amber-100 text-amber-700' },
  lunch: { icon: Sun, color: 'bg-orange-100 text-orange-700' },
  dinner: { icon: Moon, color: 'bg-indigo-100 text-indigo-700' },
  snack: { icon: Apple, color: 'bg-green-100 text-green-700' },
};

export function TodayNutritionSummary({ 
  totals, 
  meals, 
  targets = { calories: 2000, protein: 150, carbs: 200, fat: 65 },
  onMealDeleted,
}: TodayNutritionSummaryProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMeal = useMutation({
    mutationFn: async (mealId: string) => {
      const res = await apiRequest('DELETE', `/api/optimize/nutrition/meal/${mealId}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete meal');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/optimize/nutrition/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/optimize/nutrition/history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/wellness'] });
      toast({
        title: 'Meal Deleted',
        description: 'The meal has been removed from your log.',
      });
      onMealDeleted?.();
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to delete meal',
        description: error.message,
      });
    },
  });

  const macros = [
    { 
      label: 'Calories', 
      value: totals.calories, 
      target: targets.calories, 
      unit: '', 
      icon: Flame, 
      color: 'text-orange-500',
      bgColor: 'bg-orange-500',
    },
    { 
      label: 'Protein', 
      value: totals.protein, 
      target: targets.protein, 
      unit: 'g', 
      icon: Beef, 
      color: 'text-red-500',
      bgColor: 'bg-red-500',
    },
    { 
      label: 'Carbs', 
      value: totals.carbs, 
      target: targets.carbs, 
      unit: 'g', 
      icon: Wheat, 
      color: 'text-amber-500',
      bgColor: 'bg-amber-500',
    },
    { 
      label: 'Fat', 
      value: totals.fat, 
      target: targets.fat, 
      unit: 'g', 
      icon: Droplet, 
      color: 'text-blue-500',
      bgColor: 'bg-blue-500',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Macro Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {macros.map((macro) => {
          const percentage = Math.min((macro.value / macro.target) * 100, 100);
          const Icon = macro.icon;
          
          return (
            <Card key={macro.label} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`h-4 w-4 ${macro.color}`} />
                  <span className="text-xs text-muted-foreground">{macro.label}</span>
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-2xl font-bold">{macro.value}</span>
                  <span className="text-sm text-muted-foreground">
                    / {macro.target}{macro.unit}
                  </span>
                </div>
                <Progress 
                  value={percentage} 
                  className="h-1.5"
                />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Logged Meals */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Utensils className="h-5 w-5 text-primary" />
              Today's Meals
            </div>
            <Badge variant="secondary">
              {meals.length} logged
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {meals.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Utensils className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No meals logged yet today</p>
              <p className="text-sm">Log your first meal to start tracking!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {meals.map((meal) => {
                const config = MEAL_TYPE_CONFIG[meal.mealType] || MEAL_TYPE_CONFIG.snack;
                const Icon = config.icon;
                
                return (
                  <div 
                    key={meal.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 group hover:bg-muted transition-colors"
                  >
                    <div className={`p-2 rounded-lg ${config.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {meal.customMealName || meal.planMealName || 'Meal'}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(meal.loggedAt), 'h:mm a')}
                        {meal.isFromPlan && (
                          <Badge variant="outline" className="text-[10px] py-0">
                            From Plan
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {meal.calories && (
                        <div className="text-right">
                          <div className="font-semibold text-sm">{meal.calories}</div>
                          <div className="text-[10px] text-muted-foreground">cal</div>
                        </div>
                      )}
                      {meal.proteinGrams && (
                        <div className="text-right">
                          <div className="font-semibold text-sm">{meal.proteinGrams}g</div>
                          <div className="text-[10px] text-muted-foreground">protein</div>
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => deleteMeal.mutate(meal.id)}
                        disabled={deleteMeal.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
