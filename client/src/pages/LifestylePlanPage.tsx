import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Moon
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getQueryFn, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';

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

export default function LifestylePlanPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: healthProfile } = useQuery<HealthProfile>({
    queryKey: ['/api/users/me/health-profile'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  const { data: plans } = useQuery<OptimizePlan[]>({
    queryKey: ['/api/optimize/plans'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  const lifestylePlan = plans?.find((p: OptimizePlan) => p.planType === 'lifestyle' && p.isActive);

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
        title: 'Plan Generated',
        description: 'Your lifestyle plan is ready!',
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

  const isProfileComplete = !!healthProfile;

  if (!isProfileComplete) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Lifestyle Plan</h1>
          <p className="text-muted-foreground">
            Sleep, stress, and recovery protocols based on your biometrics
          </p>
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Heart className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Complete Your Health Profile</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              To unlock AI-powered lifestyle plans, we need to understand your sleep patterns, stress levels, and recovery needs.
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

  if (!lifestylePlan) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Lifestyle Plan</h1>
          <p className="text-muted-foreground">
            Sleep, stress, and recovery protocols based on your biometrics
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-purple-50 p-4 mb-4">
              <Heart className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Generate Your Lifestyle Plan</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Our AI will create personalized sleep, stress management, and recovery protocols based on your health data.
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
                  Generate Lifestyle Plan
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Lifestyle Plan</h1>
          <p className="text-muted-foreground">
            Generated {new Date(lifestylePlan.createdAt).toLocaleDateString()}
          </p>
        </div>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-purple-600" />
            Why This Plan?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {lifestylePlan.rationale || 'This plan is tailored to optimize your sleep, stress, and recovery.'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5 text-purple-600" />
            Your Protocols
          </CardTitle>
          <CardDescription>
            Personalized sleep, stress, and recovery guidance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {lifestylePlan.content?.sleepProtocol && (
              <div>
                <h3 className="font-semibold mb-2">Sleep Optimization</h3>
                <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                  <div><span className="font-medium">Target:</span> {lifestylePlan.content.sleepProtocol.targetHours} hours</div>
                  <div><span className="font-medium">Bedtime:</span> {lifestylePlan.content.sleepProtocol.bedtime}</div>
                </div>
                {lifestylePlan.content.sleepProtocol.reason && (
                  <p className="text-xs text-muted-foreground mb-3">Why: {lifestylePlan.content.sleepProtocol.reason}</p>
                )}
                {lifestylePlan.content.sleepProtocol.eveningRoutine && (
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="font-medium text-sm mb-2">Evening Routine:</p>
                    <ul className="text-sm space-y-1">
                      {lifestylePlan.content.sleepProtocol.eveningRoutine.map((step: any, idx: number) => (
                        <li key={idx} className="text-muted-foreground">
                          <span className="font-medium text-foreground">{step.time}:</span> {step.action}
                          {step.reason && (
                            <span className="block text-xs">{step.reason}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {lifestylePlan.content.sleepProtocol.morningRoutine && (
                  <div className="bg-muted/30 p-3 rounded-lg mt-3">
                    <p className="font-medium text-sm mb-2">Morning Routine:</p>
                    <ul className="text-sm space-y-1">
                      {lifestylePlan.content.sleepProtocol.morningRoutine.map((step: any, idx: number) => (
                        <li key={`morning-${idx}`} className="text-muted-foreground">
                          <span className="font-medium text-foreground">{step.time}:</span> {step.action}
                          {step.reason && <span className="block text-xs">{step.reason}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {lifestylePlan.content?.stressManagement?.dailyPractices && (
              <div>
                <h3 className="font-semibold mb-2">Stress Management</h3>
                <div className="space-y-3">
                  {lifestylePlan.content.stressManagement.dailyPractices.map((practice: any, idx: number) => (
                    <div key={idx} className="bg-muted/50 p-3 rounded-lg">
                      <p className="font-medium">{practice.technique}</p>
                      <p className="text-sm text-muted-foreground">{practice.duration} min | {practice.timing}</p>
                      <p className="text-xs text-muted-foreground mt-1">{practice.instructions}</p>
                      {practice.reason && (
                        <p className="text-xs text-muted-foreground mt-1">Why: {practice.reason}</p>
                      )}
                    </div>
                  ))}
                </div>
                {lifestylePlan.content.stressManagement.acuteStressToolkit && (
                  <div className="bg-muted/30 p-3 rounded-lg mt-4">
                    <p className="font-medium text-sm mb-2">Acute Stress Toolkit</p>
                    <ul className="text-sm space-y-1">
                      {lifestylePlan.content.stressManagement.acuteStressToolkit.map((tool: any, idx: number) => (
                        <li key={`tool-${idx}`} className="text-muted-foreground">
                          <span className="font-medium text-foreground">{tool.tool || tool}</span>
                          {tool.reason && <span className="block text-xs">{tool.reason}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {!lifestylePlan.content?.sleepProtocol && !lifestylePlan.content?.stressManagement && (
              <div className="text-center py-8 text-muted-foreground">
                <p>Plan data unavailable. Try regenerating the plan.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily Progress</CardTitle>
          <CardDescription>
            Track your lifestyle adherence (coming soon)
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
