import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Heart, 
  Sparkles,
  Loader2,
  CheckCircle2,
  Moon,
  Brain,
  Wind,
  Sun,
  Sunrise,
  Info,
  TrendingUp,
  Thermometer,
  Clock,
  Zap
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface LifestylePlanTabProps {
  plan: any;
  healthProfile: any;
}

export function LifestylePlanTab({ plan, healthProfile }: LifestylePlanTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const generatePlan = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/optimize/plans/generate', {
        planTypes: ['lifestyle'],
        preferences: {}
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/optimize/plans'] });
      toast({
        title: '🌙 Plan Generated!',
        description: 'Your lifestyle optimization plan is ready.',
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

  if (!plan) {
    return (
      <div className="space-y-6">
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/30">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-4 mb-4 shadow-lg">
              <Heart className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-2xl font-semibold mb-2">Generate Your Lifestyle Plan</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Optimize your sleep, stress management, and recovery with AI-powered protocols 
              tailored to your biomarkers and daily patterns.
            </p>
            
            {/* Benefits Grid */}
            <div className="grid grid-cols-2 gap-3 w-full max-w-lg mb-6">
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <span>Sleep optimization protocol</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <span>Stress management toolkit</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <span>Recovery strategies</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <span>Circadian rhythm support</span>
              </div>
            </div>
            
            <Button 
              size="lg"
              onClick={() => generatePlan.mutate()}
              disabled={generatePlan.isPending}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg"
            >
              {generatePlan.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating Your Plan...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Generate Lifestyle Plan
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
              <Moon className="h-8 w-8 text-purple-600 mb-2" />
              <CardTitle className="text-base">Sleep Science</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Optimize your sleep architecture for better recovery, hormone balance, and cognitive function.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <Brain className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle className="text-base">Stress Mastery</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Evidence-based techniques to regulate your nervous system and build resilience.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <Zap className="h-8 w-8 text-amber-600 mb-2" />
              <CardTitle className="text-base">Energy Optimization</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Align your daily rhythms with your natural biology for sustained energy and focus.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Mock sleep data (would come from wearables in production)
  const sleepScore = 85;
  const avgSleepDuration = 7.2;
  const stressLevel = 'Moderate';
  const recoveryScore = 78;

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
              Active Protocol
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Generated {new Date(plan.createdAt).toLocaleDateString()}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Personalized sleep, stress, and recovery optimization
          </p>
        </div>
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
              <Sparkles className="mr-2 h-4 w-4" />
              Regenerate
            </>
          )}
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/30 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Moon className="h-5 w-5 text-purple-600" />
              <span className="text-xs text-muted-foreground">Last Night</span>
            </div>
            <p className="text-2xl font-bold text-purple-700">{sleepScore}</p>
            <p className="text-xs text-muted-foreground">Sleep Score</p>
            <Progress value={sleepScore} className="mt-2 h-1" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/30 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <span className="text-xs text-muted-foreground">Avg</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">{avgSleepDuration}h</p>
            <p className="text-xs text-muted-foreground">Sleep Duration</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/30 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Brain className="h-5 w-5 text-amber-600" />
              <span className="text-xs text-muted-foreground">Current</span>
            </div>
            <p className="text-xl font-bold text-amber-700">{stressLevel}</p>
            <p className="text-xs text-muted-foreground">Stress Level</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100/30 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Zap className="h-5 w-5 text-green-600" />
              <span className="text-xs text-muted-foreground">Today</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{recoveryScore}</p>
            <p className="text-xs text-muted-foreground">Recovery</p>
            <Progress value={recoveryScore} className="mt-2 h-1" />
          </CardContent>
        </Card>
      </div>

      {/* Rationale */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50/50 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="h-5 w-5 text-purple-600" />
            Your Personalized Approach
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {plan.rationale || 'This protocol is designed to optimize your sleep quality, manage stress, and enhance recovery based on your unique biomarkers.'}
          </p>
        </CardContent>
      </Card>

      {/* Sleep Protocol */}
      {plan.content?.sleepProtocol && (
        <Card className="shadow-lg border-purple-200">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-transparent">
            <CardTitle className="flex items-center gap-2">
              <Moon className="h-6 w-6 text-purple-600" />
              Sleep Optimization Protocol
            </CardTitle>
            <CardDescription>
              Maximize sleep quality and recovery
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Sleep Targets */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-purple-50 border border-purple-100">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-purple-600" />
                  <p className="font-semibold text-purple-900">Target Duration</p>
                </div>
                <p className="text-2xl font-bold text-purple-700">
                  {plan.content.sleepProtocol.targetHours || 8} hours
                </p>
              </div>
              
              <div className="p-4 rounded-lg bg-purple-50 border border-purple-100">
                <div className="flex items-center gap-2 mb-2">
                  <Moon className="h-5 w-5 text-purple-600" />
                  <p className="font-semibold text-purple-900">Bedtime</p>
                </div>
                <p className="text-2xl font-bold text-purple-700">
                  {plan.content.sleepProtocol.bedtime || '10:30 PM'}
                </p>
              </div>
              
              <div className="p-4 rounded-lg bg-purple-50 border border-purple-100">
                <div className="flex items-center gap-2 mb-2">
                  <Sunrise className="h-5 w-5 text-purple-600" />
                  <p className="font-semibold text-purple-900">Wake Time</p>
                </div>
                <p className="text-2xl font-bold text-purple-700">
                  {plan.content.sleepProtocol.wakeTime || '6:30 AM'}
                </p>
              </div>
            </div>

            {plan.content.sleepProtocol.reason && (
              <div className="p-4 rounded-lg bg-purple-50/50 border border-purple-100">
                <p className="text-sm text-purple-900">
                  <span className="font-semibold">Why this schedule: </span>
                  {plan.content.sleepProtocol.reason}
                </p>
              </div>
            )}

            {/* Evening Routine */}
            {plan.content.sleepProtocol.eveningRoutine && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Moon className="h-5 w-5 text-purple-600" />
                  <h4 className="font-semibold text-lg">Evening Wind-Down Routine</h4>
                </div>
                <div className="space-y-2">
                  {plan.content.sleepProtocol.eveningRoutine.map((step: any, idx: number) => (
                    <Card key={idx} className="bg-gradient-to-r from-purple-50 to-transparent border-purple-100">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="h-8 w-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {step.time}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-purple-900 mb-1">{step.action}</p>
                            {step.reason && (
                              <p className="text-sm text-muted-foreground">{step.reason}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Morning Routine */}
            {plan.content.sleepProtocol.morningRoutine && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Sun className="h-5 w-5 text-amber-600" />
                  <h4 className="font-semibold text-lg">Morning Activation Routine</h4>
                </div>
                <div className="space-y-2">
                  {plan.content.sleepProtocol.morningRoutine.map((step: any, idx: number) => (
                    <Card key={idx} className="bg-gradient-to-r from-amber-50 to-transparent border-amber-100">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="h-8 w-8 rounded-full bg-amber-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {step.time}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-amber-900 mb-1">{step.action}</p>
                            {step.reason && (
                              <p className="text-sm text-muted-foreground">{step.reason}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stress Management */}
      {plan.content?.stressManagement?.dailyPractices && (
        <Card className="shadow-lg border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-transparent">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-blue-600" />
              Stress Management Toolkit
            </CardTitle>
            <CardDescription>
              Daily practices to regulate your nervous system
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {plan.content.stressManagement.dailyPractices.map((practice: any, idx: number) => (
              <Card key={idx} className="bg-gradient-to-r from-blue-50 to-transparent border-blue-100">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
                      <Wind className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg text-blue-900 mb-1">
                        {practice.technique}
                      </h4>
                      <div className="flex gap-3 mb-2">
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                          <Clock className="h-3 w-3 mr-1" />
                          {practice.duration} min
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {practice.timing}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {practice.instructions}
                      </p>
                      {practice.reason && (
                        <p className="text-sm text-blue-900 bg-blue-50 p-2 rounded">
                          <span className="font-medium">Why: </span>
                          {practice.reason}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Acute Stress Toolkit */}
            {plan.content.stressManagement.acuteStressToolkit && (
              <div className="mt-6 p-4 rounded-lg bg-amber-50 border border-amber-200">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-5 w-5 text-amber-600" />
                  <h4 className="font-semibold text-amber-900">Emergency Stress Tools</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Use these when you need immediate stress relief:
                </p>
                <div className="grid md:grid-cols-2 gap-2">
                  {plan.content.stressManagement.acuteStressToolkit.map((tool: any, idx: number) => {
                    const toolText = typeof tool === 'string' ? tool : tool.tool;
                    const reason = typeof tool === 'object' ? tool.reason : null;
                    
                    return (
                      <div key={idx} className="flex items-start gap-2 p-2 bg-white rounded">
                        <CheckCircle2 className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-sm font-medium">{toolText}</span>
                          {reason && (
                            <p className="text-xs text-muted-foreground mt-1">{reason}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Integration Tips */}
      <Card className="border-green-200 bg-gradient-to-r from-green-50 to-transparent">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Optimization Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Consistency is key</p>
                <p className="text-xs text-muted-foreground">Stick to your sleep schedule even on weekends</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Track your progress</p>
                <p className="text-xs text-muted-foreground">Use a wearable to monitor sleep and recovery</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Environment matters</p>
                <p className="text-xs text-muted-foreground">Keep bedroom cool (65-68°F) and dark</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Practice daily</p>
                <p className="text-xs text-muted-foreground">Stress management works best with consistency</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
