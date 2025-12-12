import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Heart, 
  Sparkles,
  Loader2,
  CheckCircle2,
  Moon,
  Leaf,
  Wind,
  Sun,
  Sunrise,
  TrendingUp,
  Clock,
  Zap,
  Youtube,
  ExternalLink,
  Target,
  Lightbulb,
  BedDouble,
  AlarmClock
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
  const [playingVideo, setPlayingVideo] = useState<{ id: string; title: string } | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);

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

  const handleWatchVideo = async (searchQuery: string, title: string) => {
    setIsVideoLoading(true);
    try {
      const res = await apiRequest('GET', `/api/integrations/youtube/search?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error('Failed to find video');
      
      const data = await res.json();
      if (data.videoId) {
        setPlayingVideo({ id: data.videoId, title });
      } else {
        toast({ 
          title: 'Video not found', 
          description: 'Could not find a video for this topic.', 
          variant: 'destructive' 
        });
      }
    } catch (error) {
      console.error('Failed to fetch video:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to load video. Please try again.', 
        variant: 'destructive' 
      });
    } finally {
      setIsVideoLoading(false);
    }
  };

  if (!plan) {
    return (
      <div className="space-y-6">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-gradient-to-br from-green-500 to-emerald-500 p-4 mb-4 shadow-lg">
              <Heart className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-2xl font-semibold mb-2">Generate Your Lifestyle Plan</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Create personalized morning routines, evening wind-down protocols, and stress management tools 
              tailored to your health goals.
            </p>
            
            {/* Benefits Grid */}
            <div className="grid grid-cols-2 gap-3 w-full max-w-lg mb-6">
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Morning intentions</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Evening wind-down</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Stress management tools</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Weekly focus areas</span>
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
              <Sun className="h-8 w-8 text-yellow-500 mb-2" />
              <CardTitle className="text-base">Morning Intentions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Start your day with purpose and positive momentum through personalized rituals.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <Moon className="h-8 w-8 text-indigo-500 mb-2" />
              <CardTitle className="text-base">Evening Wind-Down</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Optimize your sleep quality with science-backed evening routines.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <Leaf className="h-8 w-8 text-green-600 mb-2" />
              <CardTitle className="text-base">Stress Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Evidence-based techniques to regulate your nervous system throughout the day.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const content = plan.content || {};
  const morningIntentions = content.morningIntentions || {};
  const eveningRoutine = content.eveningRoutine || {};
  const stressTools = content.stressTools || {};
  const weeklyFocus = content.weeklyFocus || {};
  const sleepTargets = content.sleepTargets || {};
  
  // Map routine arrays (AI generates 'routine', normalize for UI)
  const morningRoutine = morningIntentions.routine || [];
  const eveningRoutineSteps = eveningRoutine.routine || [];
  const stressTechniques = stressTools.techniques || [];

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              Active Protocol
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Generated {new Date(plan.createdAt).toLocaleDateString()}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Your personalized morning, evening, and stress management routines
          </p>
        </div>
        <div className="flex justify-center w-full">
          <Button 
            variant="outline" 
            size="lg"
            onClick={() => generatePlan.mutate()}
            disabled={generatePlan.isPending}
            className="shadow-sm w-full max-w-[200px]"
          >
            {generatePlan.isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Regenerate
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Rationale */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            Your Personalized Approach
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {plan.aiRationale || 'This protocol is designed to optimize your sleep quality, manage stress, and enhance recovery based on your unique biomarkers.'}
          </p>
        </CardContent>
      </Card>

      {/* Morning Intentions */}
      <Card className="shadow-lg border-yellow-200">
        <CardHeader className="bg-gradient-to-r from-yellow-50 to-transparent">
          <div className="flex flex-col gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Sun className="h-7 w-7 text-yellow-600" />
                Morning Intentions
              </CardTitle>
              <CardDescription className="text-base mt-1">
                {morningIntentions.theme || 'Start your day with purpose'}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleWatchVideo(
                morningIntentions.youtubeSearch || 'morning motivation affirmations 10 minutes',
                'Morning Motivation'
              )}
              disabled={isVideoLoading}
              className="text-yellow-700 border-yellow-300 hover:bg-yellow-50 w-full"
            >
              {isVideoLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Youtube className="h-5 w-5 mr-2" />
                  Find Motivation Video
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {/* Affirmation */}
          {morningIntentions.affirmation && (
            <div className="p-5 rounded-lg bg-yellow-50 border border-yellow-200 text-center">
              <p className="text-xl font-medium text-yellow-900 italic leading-relaxed">
                "{morningIntentions.affirmation}"
              </p>
              <p className="text-sm text-yellow-700 mt-3">Daily Affirmation</p>
            </div>
          )}

          {/* Morning Steps */}
          {morningRoutine.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-base text-yellow-800 flex items-center gap-2">
                <Sunrise className="h-5 w-5" />
                Morning Routine Steps
              </h4>
              {morningRoutine.map((step: any, idx: number) => (
                <div key={idx} className="flex items-start gap-4 p-4 bg-gradient-to-r from-yellow-50 to-transparent rounded-lg border border-yellow-100">
                  <div className="h-8 w-8 rounded-full bg-yellow-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {step.step || idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-lg text-yellow-900">{step.action}</p>
                    {step.duration && (
                      <Badge variant="secondary" className="mt-2 text-sm bg-yellow-100 text-yellow-700 px-3 py-1">
                        <Clock className="h-4 w-4 mr-1" />
                        {step.duration}
                      </Badge>
                    )}
                    {(step.why || step.reason) && (
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{step.why || step.reason}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Motivation */}
          {morningIntentions.motivation && (
            <div className="p-3 rounded-lg bg-yellow-50/50 border border-yellow-100">
              <p className="text-sm text-yellow-800">
                <Lightbulb className="h-4 w-4 inline mr-2 text-yellow-600" />
                {morningIntentions.motivation}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Evening Wind-Down */}
      <Card className="shadow-lg border-indigo-200">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-transparent">
          <div className="flex flex-col gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Moon className="h-7 w-7 text-indigo-600" />
                Evening Wind-Down
              </CardTitle>
              <CardDescription className="text-base mt-1">
                Prepare your body and mind for restful sleep
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleWatchVideo(
                eveningRoutine.youtubeSearch || 'guided sleep meditation 10 minutes',
                'Sleep Meditation'
              )}
              disabled={isVideoLoading}
              className="text-indigo-700 border-indigo-300 hover:bg-indigo-50 w-full"
            >
              {isVideoLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Youtube className="h-5 w-5 mr-2" />
                  Sleep Meditation Video
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {/* Sleep Schedule */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-100 text-center">
              <AlarmClock className="h-6 w-6 mx-auto text-indigo-600 mb-2" />
              <p className="text-sm text-indigo-600 font-medium">Wind-Down</p>
              <p className="text-xl font-bold text-indigo-900">
                {eveningRoutine.startTime || '9:00 PM'}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-100 text-center">
              <BedDouble className="h-6 w-6 mx-auto text-indigo-600 mb-2" />
              <p className="text-sm text-indigo-600 font-medium">Bedtime</p>
              <p className="text-xl font-bold text-indigo-900">
                {eveningRoutine.bedtime || sleepTargets.bedtime || '10:30 PM'}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-100 text-center">
              <Sunrise className="h-6 w-6 mx-auto text-indigo-600 mb-2" />
              <p className="text-sm text-indigo-600 font-medium">Wake Time</p>
              <p className="text-xl font-bold text-indigo-900">
                {morningIntentions.wakeTime || sleepTargets.wakeTime || '6:30 AM'}
              </p>
            </div>
          </div>

          {/* Evening Steps */}
          {eveningRoutineSteps.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-base text-indigo-800 flex items-center gap-2">
                <Moon className="h-5 w-5" />
                Wind-Down Steps
              </h4>
              {eveningRoutineSteps.map((step: any, idx: number) => (
                <div key={idx} className="flex items-start gap-4 p-4 bg-gradient-to-r from-indigo-50 to-transparent rounded-lg border border-indigo-100">
                  <div className="h-8 w-8 rounded-full bg-indigo-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {step.step || idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-lg text-indigo-900">{step.action}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {step.time && (
                        <Badge variant="secondary" className="text-xs bg-indigo-100 text-indigo-700">
                          <Clock className="h-3 w-3 mr-1" />
                          {step.time}
                        </Badge>
                      )}
                      {step.duration && (
                        <Badge variant="outline" className="text-xs text-indigo-600 border-indigo-300">
                          {step.duration}
                        </Badge>
                      )}
                    </div>
                    {(step.why || step.reason) && (
                      <p className="text-sm text-muted-foreground mt-1">{step.why || step.reason}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sleep Tips */}
          {sleepTargets.tips && sleepTargets.tips.length > 0 && (
            <div className="p-4 rounded-lg bg-indigo-50/50 border border-indigo-100">
              <h4 className="font-semibold text-sm text-indigo-800 mb-2">Sleep Optimization Tips</h4>
              <div className="grid md:grid-cols-2 gap-2">
                {sleepTargets.tips.map((tip: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-indigo-800">{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Stress Tools */}
      <Card className="shadow-lg border-green-200">
        <CardHeader className="bg-gradient-to-r from-green-50 to-transparent">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Leaf className="h-6 w-6 text-green-600" />
                Daily Stress Tools
              </CardTitle>
              <CardDescription>
                Quick techniques to regulate your nervous system
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleWatchVideo(
                '10 minute guided meditation stress relief',
                'Guided Meditation'
              )}
              disabled={isVideoLoading}
              className="text-green-700 border-green-300 hover:bg-green-50"
            >
              {isVideoLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Youtube className="h-4 w-4 mr-2" />
                  Guided Meditation
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Stress Techniques */}
          {stressTechniques.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm text-green-800 flex items-center gap-2 mb-3">
                <Wind className="h-4 w-4" />
                Stress Management Techniques
              </h4>
              <div className="space-y-3">
                {stressTechniques.map((technique: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-lg bg-green-50 border border-green-100">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-green-500 text-white flex items-center justify-center flex-shrink-0">
                        <Wind className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-green-900">{technique.name}</p>
                        <p className="text-sm text-green-700 mt-1">{technique.description}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {technique.duration && (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                              <Clock className="h-3 w-3 mr-1" />
                              {technique.duration}
                            </Badge>
                          )}
                          {technique.when && (
                            <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                              {technique.when}
                            </Badge>
                          )}
                        </div>
                        {technique.youtubeSearch && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleWatchVideo(technique.youtubeSearch, technique.name)}
                            disabled={isVideoLoading}
                            className="mt-2 text-green-700 hover:text-green-900 hover:bg-green-100 h-7 text-xs"
                          >
                            <Youtube className="h-3 w-3 mr-1" />
                            Watch Tutorial
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Emergency Reset */}
          {stressTools.emergencyReset && (
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
              <div className="flex items-start gap-3">
                <Zap className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-amber-900">Emergency Reset</p>
                  <p className="text-sm text-amber-800 mt-1">{stressTools.emergencyReset}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly Focus */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-transparent">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-600" />
            This Week's Focus
          </CardTitle>
          <CardDescription>
            {weeklyFocus.theme || 'Building better habits'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {weeklyFocus.description && (
            <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
              <p className="text-sm text-purple-800">{weeklyFocus.description}</p>
            </div>
          )}

          {weeklyFocus.actionItems && weeklyFocus.actionItems.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm text-purple-800 mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Action Items
              </h4>
              <div className="space-y-2">
                {weeklyFocus.actionItems.map((item: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2 p-2 bg-white rounded border border-purple-100">
                    <CheckCircle2 className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-purple-900">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {weeklyFocus.youtubeSearch && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleWatchVideo(weeklyFocus.youtubeSearch, weeklyFocus.theme || 'Weekly Focus')}
              disabled={isVideoLoading}
              className="text-purple-700 border-purple-300 hover:bg-purple-50"
            >
              {isVideoLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Youtube className="h-4 w-4 mr-2" />
                  Watch Related Content
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* YouTube Video Dialog */}
      <Dialog open={!!playingVideo} onOpenChange={(open) => !open && setPlayingVideo(null)}>
        <DialogContent className="sm:max-w-[800px] overflow-hidden bg-zinc-950 text-white border-zinc-800" noPadding>
          <DialogHeader className="p-4 bg-zinc-900/80 backdrop-blur absolute top-0 left-0 right-0 z-10 flex flex-col justify-between items-start border-b border-zinc-800">
            <DialogTitle className="text-zinc-100">{playingVideo?.title}</DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              Watch this video to enhance your wellness routine.
            </DialogDescription>
          </DialogHeader>
          <div className="aspect-video w-full mt-14 sm:mt-0 bg-black flex items-center justify-center relative">
            {playingVideo && (
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${playingVideo.id}?autoplay=1&rel=0`}
                title={playingVideo.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="z-0"
              />
            )}
          </div>
          <div className="p-4 bg-zinc-900 flex justify-between items-center border-t border-zinc-800">
            <span className="text-xs text-zinc-400">Video not loading?</span>
            <Button variant="secondary" size="sm" className="h-8 text-xs" asChild>
              <a 
                href={`https://www.youtube.com/watch?v=${playingVideo?.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in YouTube <ExternalLink className="ml-2 h-3 w-3" />
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
