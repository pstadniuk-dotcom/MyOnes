import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  ChevronDown, 
  ChevronUp,
  Flame,
  Beef,
  Wheat,
  Droplet,
  Trash2,
  Coffee,
  Sun,
  Moon,
  Apple,
  History,
} from 'lucide-react';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  fiberGrams?: number;
  sugarGrams?: number;
  waterOz?: number;
}

interface DayGroup {
  date: string;
  meals: MealLog[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    water: number;
  };
}

const MEAL_TYPE_CONFIG: Record<string, { icon: typeof Coffee; color: string; label: string }> = {
  breakfast: { icon: Coffee, color: 'bg-amber-100 text-amber-700', label: 'Breakfast' },
  lunch: { icon: Sun, color: 'bg-orange-100 text-orange-700', label: 'Lunch' },
  dinner: { icon: Moon, color: 'bg-indigo-100 text-indigo-700', label: 'Dinner' },
  snack: { icon: Apple, color: 'bg-green-100 text-green-700', label: 'Snack' },
};

function formatDateLabel(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEEE, MMMM d');
}

function DayCard({ dayGroup }: { dayGroup: DayGroup }) {
  const [expanded, setExpanded] = useState(isToday(parseISO(dayGroup.date)));
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
      queryClient.invalidateQueries({ queryKey: ['/api/optimize/nutrition/history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/optimize/nutrition/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/wellness'] });
      toast({
        title: 'Meal Deleted',
        description: 'The meal has been removed from your log.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to delete meal',
        description: error.message,
      });
    },
  });

  return (
    <Card className="overflow-hidden">
      <button
        className="w-full text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <CardHeader className="py-3 hover:bg-muted/50 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">{formatDateLabel(dayGroup.date)}</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {dayGroup.meals.filter(m => !m.waterOz || m.waterOz === 0).length} meals
              </Badge>
            </div>
            <div className="flex items-center gap-4">
              {/* Quick stats */}
              <div className="hidden sm:flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Flame className="h-3 w-3 text-orange-500" />
                  {dayGroup.totals.calories}
                </span>
                <span className="flex items-center gap-1">
                  <Beef className="h-3 w-3 text-red-500" />
                  {dayGroup.totals.protein}g
                </span>
                {dayGroup.totals.water > 0 && (
                  <span className="flex items-center gap-1">
                    <Droplet className="h-3 w-3 text-blue-500" />
                    {dayGroup.totals.water}oz
                  </span>
                )}
              </div>
              {expanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </CardHeader>
      </button>

      {expanded && (
        <CardContent className="border-t pt-4">
          {/* Day Totals */}
          <div className="grid grid-cols-4 gap-2 mb-4 p-3 rounded-lg bg-muted/50">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-orange-500 mb-1">
                <Flame className="h-4 w-4" />
              </div>
              <div className="font-semibold">{dayGroup.totals.calories}</div>
              <div className="text-xs text-muted-foreground">Calories</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-red-500 mb-1">
                <Beef className="h-4 w-4" />
              </div>
              <div className="font-semibold">{dayGroup.totals.protein}g</div>
              <div className="text-xs text-muted-foreground">Protein</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-amber-500 mb-1">
                <Wheat className="h-4 w-4" />
              </div>
              <div className="font-semibold">{dayGroup.totals.carbs}g</div>
              <div className="text-xs text-muted-foreground">Carbs</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-blue-500 mb-1">
                <Droplet className="h-4 w-4" />
              </div>
              <div className="font-semibold">{dayGroup.totals.fat}g</div>
              <div className="text-xs text-muted-foreground">Fat</div>
            </div>
          </div>

          {/* Individual meals */}
          <div className="space-y-2">
            {dayGroup.meals.filter(m => !m.waterOz || m.waterOz === 0).map((meal) => {
              const config = MEAL_TYPE_CONFIG[meal.mealType] || MEAL_TYPE_CONFIG.snack;
              const Icon = config.icon;
              
              return (
                <div 
                  key={meal.id}
                  className="flex items-center gap-3 p-3 rounded-lg border group hover:bg-muted/50 transition-colors"
                >
                  <div className={`p-2 rounded-lg ${config.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {meal.customMealName || meal.planMealName || config.label}
                      </span>
                      {meal.isFromPlan && (
                        <Badge variant="outline" className="text-[10px]">Plan</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(meal.loggedAt), 'h:mm a')}
                      {meal.customMealDescription && (
                        <span className="ml-2 text-muted-foreground/70">
                          • {meal.customMealDescription.slice(0, 50)}
                          {meal.customMealDescription.length > 50 && '...'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    {meal.calories && (
                      <span className="text-muted-foreground">
                        {meal.calories} cal
                      </span>
                    )}
                    {meal.proteinGrams && (
                      <span className="text-muted-foreground hidden sm:inline">
                        {meal.proteinGrams}g P
                      </span>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Meal?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this meal log? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMeal.mutate(meal.id)}
                            className="bg-red-500 hover:bg-red-600"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })}
            
            {/* Water log summary for the day */}
            {dayGroup.totals.water > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-blue-50/50">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                  <Droplet className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">Water Intake</div>
                  <div className="text-xs text-muted-foreground">
                    Throughout the day
                  </div>
                </div>
                <span className="font-semibold text-blue-600">
                  {dayGroup.totals.water} oz
                </span>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export function NutritionHistory() {
  const { data: historyData, isLoading } = useQuery<{ meals: MealLog[] }>({
    queryKey: ['/api/optimize/nutrition/history'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/optimize/nutrition/history');
      if (!res.ok) throw new Error('Failed to fetch nutrition history');
      return res.json();
    },
  });

  // Group meals by date
  const groupedByDay: DayGroup[] = historyData?.meals?.reduce((acc: DayGroup[], meal: MealLog) => {
    const dateKey = format(new Date(meal.loggedAt), 'yyyy-MM-dd');
    
    let dayGroup = acc.find(g => g.date === dateKey);
    if (!dayGroup) {
      dayGroup = {
        date: dateKey,
        meals: [],
        totals: { calories: 0, protein: 0, carbs: 0, fat: 0, water: 0 },
      };
      acc.push(dayGroup);
    }
    
    dayGroup.meals.push(meal);
    
    // Aggregate totals
    if (meal.waterOz) {
      dayGroup.totals.water += meal.waterOz;
    } else {
      dayGroup.totals.calories += meal.calories || 0;
      dayGroup.totals.protein += meal.proteinGrams || 0;
      dayGroup.totals.carbs += meal.carbsGrams || 0;
      dayGroup.totals.fat += meal.fatGrams || 0;
    }
    
    return acc;
  }, []) || [];

  // Sort by date descending
  groupedByDay.sort((a, b) => b.date.localeCompare(a.date));

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="py-3">
              <div className="h-5 bg-muted rounded w-1/3"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (!groupedByDay.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium mb-2">No Nutrition History</h3>
          <p className="text-muted-foreground">
            Start logging your meals and water intake to see your history here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {groupedByDay.map(dayGroup => (
        <DayCard key={dayGroup.date} dayGroup={dayGroup} />
      ))}
    </div>
  );
}
