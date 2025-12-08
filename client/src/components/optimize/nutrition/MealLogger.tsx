import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Utensils, 
  Coffee, 
  Sun, 
  Moon, 
  Apple,
  Loader2,
  Sparkles,
  CheckCircle2,
  Mic,
  MicOff,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface PlanMeal {
  mealType: string;
  name: string;
  macros?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
}

interface MealLoggerProps {
  todayPlanMeals?: PlanMeal[];
  onMealLogged?: () => void;
}

const MEAL_TYPES = [
  { value: 'breakfast', label: 'Breakfast', icon: Coffee, color: 'bg-amber-100 text-amber-700' },
  { value: 'lunch', label: 'Lunch', icon: Sun, color: 'bg-orange-100 text-orange-700' },
  { value: 'dinner', label: 'Dinner', icon: Moon, color: 'bg-indigo-100 text-indigo-700' },
  { value: 'snack', label: 'Snack', icon: Apple, color: 'bg-green-100 text-green-700' },
];

export function MealLogger({ todayPlanMeals, onMealLogged }: MealLoggerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [mealType, setMealType] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isFromPlan, setIsFromPlan] = useState(false);
  const [selectedPlanMeal, setSelectedPlanMeal] = useState<string>('');
  
  // Voice recording state (matching AIChat pattern)
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const initialInputRef = useRef<string>('');

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  const handleVoiceInput = useCallback(async () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toast({
        title: "Voice Input Not Supported",
        description: "Your browser doesn't support voice recognition.",
        variant: "destructive"
      });
      return;
    }

    // If already recording, stop it
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    try {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;
      
      let finalTranscript = '';
      
      recognition.onstart = () => {
        setIsListening(true);
        initialInputRef.current = description;
      };
      
      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Update input with both final and interim results
        const baseText = initialInputRef.current.trim();
        const combinedTranscript = (finalTranscript + interimTranscript).trim();
        const newValue = baseText + (baseText && combinedTranscript ? ' ' : '') + combinedTranscript + (interimTranscript ? ' [Speaking...]' : '');
        setDescription(newValue);
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        recognitionRef.current = null;
        
        if (event.error === 'not-allowed') {
          toast({
            title: "Microphone Access Denied",
            description: "Please allow microphone access to use voice input.",
            variant: "destructive"
          });
        } else if (event.error !== 'aborted' && event.error !== 'no-speech') {
          toast({
            title: "Voice Recognition Error",
            description: "Failed to capture voice input. Please try again.",
            variant: "destructive"
          });
        }
      };
      
      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
        // Clean up the [Speaking...] indicator
        setDescription(prev => prev.replace(' [Speaking...]', '').trim());
      };
      
      recognition.start();
    } catch (error) {
      setIsListening(false);
      recognitionRef.current = null;
      toast({
        title: "Voice Input Error",
        description: "Unable to start voice recognition.",
        variant: "destructive"
      });
    }
  }, [toast, isListening, description]);
  const logMeal = useMutation({
    mutationFn: async (data: { 
      mealType: string; 
      description: string; 
      isFromPlan: boolean;
      planMealName?: string;
      manualNutrition?: {
        calories?: number;
        protein?: number;
        carbs?: number;
        fat?: number;
      };
    }) => {
      const res = await apiRequest('POST', '/api/optimize/nutrition/log-meal-detailed', data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to log meal');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/optimize/nutrition/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/optimize/nutrition/history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/wellness'] });
      
      const nutrition = data.nutritionData;
      toast({
        title: '🍽️ Meal Logged!',
        description: nutrition 
          ? `${nutrition.calories} cal • ${nutrition.protein}g protein`
          : 'Your meal has been recorded.',
      });
      
      setIsOpen(false);
      setMealType('');
      setDescription('');
      setIsFromPlan(false);
      setSelectedPlanMeal('');
      onMealLogged?.();
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to log meal',
        description: error.message,
      });
    },
  });

  const handleLogPlanMeal = (meal: PlanMeal) => {
    setMealType(meal.mealType);
    setDescription(meal.name);
    setIsFromPlan(true);
    setSelectedPlanMeal(meal.name);
    
    // Convert plan macros to manualNutrition format so the API uses them directly
    const manualNutrition = meal.macros ? {
      calories: meal.macros.calories,
      protein: meal.macros.protein,
      carbs: meal.macros.carbs,
      fat: meal.macros.fat,
    } : undefined;
    
    logMeal.mutate({
      mealType: meal.mealType,
      description: meal.name,
      isFromPlan: true,
      planMealName: meal.name,
      manualNutrition,
    });
  };

  const handleLogCustomMeal = () => {
    // Stop voice recording if active
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    // Clean up any [Speaking...] indicator
    const cleanDescription = description.replace(' [Speaking...]', '').trim();

    if (!mealType || !cleanDescription) {
      toast({
        variant: 'destructive',
        title: 'Missing information',
        description: 'Please select a meal type and describe what you ate.',
      });
      return;
    }

    logMeal.mutate({
      mealType,
      description: cleanDescription,
      isFromPlan: false,
    });
  };

  const getMealTypeInfo = (type: string) => 
    MEAL_TYPES.find(m => m.value === type) || MEAL_TYPES[0];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Utensils className="h-5 w-5 text-primary" />
          Log a Meal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Custom meal logging - PRIMARY ACTION */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="w-full h-12 gap-2 text-base font-medium">
              <Plus className="h-5 w-5" />
              Log What You Ate
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Log What You Ate
              </DialogTitle>
              <DialogDescription>
                Describe your meal and AI will calculate the nutrition facts.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Meal Type</Label>
                <Select value={mealType} onValueChange={setMealType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select meal type" />
                  </SelectTrigger>
                  <SelectContent>
                    {MEAL_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>What did you eat?</Label>
                <Textarea
                  placeholder="e.g., Greek yogurt with honey and berries, two scrambled eggs with toast..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className={isListening ? 'border-red-500 ring-2 ring-red-500/20' : ''}
                />
                <p className="text-xs text-muted-foreground">
                  {isListening ? (
                    <span className="text-red-500 font-medium">🎤 Listening... speak now, then click Log Meal when done</span>
                  ) : (
                    'Be specific about portions and ingredients. Tap the mic to use voice input.'
                  )}
                </p>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleLogCustomMeal}
                  disabled={logMeal.isPending || !mealType || !description.trim().replace(' [Speaking...]', '')}
                  className="flex-1"
                >
                  {logMeal.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Log Meal & Calculate Nutrition
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleVoiceInput}
                  className={`h-10 w-10 shrink-0 transition-all duration-300 ${
                    isListening 
                      ? 'bg-red-500 hover:bg-red-600 text-white border-red-600 animate-pulse' 
                      : 'bg-red-500 hover:bg-red-600 text-white border-red-600'
                  }`}
                  title={isListening ? 'Stop recording' : 'Voice input'}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Quick log from plan meals - SECONDARY */}
        {todayPlanMeals && todayPlanMeals.length > 0 && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or quick log from plan</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="grid gap-2">
                {todayPlanMeals.map((meal, idx) => {
                  const typeInfo = getMealTypeInfo(meal.mealType);
                  const Icon = typeInfo.icon;
                  
                  return (
                    <Button
                      key={idx}
                      variant="outline"
                      className="justify-start h-auto py-2.5 px-3"
                      onClick={() => handleLogPlanMeal(meal)}
                      disabled={logMeal.isPending}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className={`p-1.5 rounded-md ${typeInfo.color}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-medium text-sm">{meal.name}</div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {meal.mealType}
                            {meal.macros?.calories && ` • ${meal.macros.calories} cal`}
                          </div>
                        </div>
                        {logMeal.isPending && selectedPlanMeal === meal.name ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-muted-foreground/50" />
                        )}
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
