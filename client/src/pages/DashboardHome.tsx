import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Input } from '@/shared/components/ui/input';
import {
  MessageSquare,
  FlaskConical,
  Package,
  Upload,
  Shield,
  Sparkles,
  PlayCircle,
  TrendingUp,
  Bell,
  X,
} from 'lucide-react';
import { Link } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Formula } from '@shared/schema';
import { calculateDosage, CAPSULE_TIER_INFO, type CapsuleCount } from '@/shared/lib/utils';
import { useState } from 'react';
import { ProfileCompletionDialog } from '@/features/auth/components/ProfileCompletionDialog';
import { HealthPulseCard } from '@/features/dashboard/components/HealthPulseCard';
import FormulaReviewBanner from '@/features/dashboard/components/FormulaReviewBanner';
import { apiRequest } from '@/shared/lib/queryClient';
import { useToast } from '@/shared/hooks/use-toast';

// ── Phone number prompt banner ─────────────────────────────────────────────
const PHONE_DISMISS_KEY = 'ones_phone_prompt_dismissed';

function PhonePromptBanner({ userPhone }: { userPhone: string | null | undefined }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState('');
  const [dismissed, setDismissed] = useState(() => {
    try {
      const stored = localStorage.getItem(PHONE_DISMISS_KEY);
      if (!stored) return false;
      const { until } = JSON.parse(stored);
      return Date.now() < until;
    } catch {
      return false;
    }
  });

  const saveMutation = useMutation({
    mutationFn: () => apiRequest('PATCH', '/api/users/me/profile', { phone: phone.trim() }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({ title: 'Phone number saved! You\'ll now receive supplement reminders.' });
      setDismissed(true);
    },
    onError: () => toast({ title: 'Could not save phone number', variant: 'destructive' }),
  });

  const dismiss = () => {
    // Dismiss for 7 days
    localStorage.setItem(PHONE_DISMISS_KEY, JSON.stringify({ until: Date.now() + 7 * 24 * 60 * 60 * 1000 }));
    setDismissed(true);
  };

  if (dismissed || userPhone) return null;

  return (
    <div className="flex items-center gap-3 bg-[#054700]/5 border border-[#054700]/15 rounded-xl px-4 py-3">
      <div className="flex items-center justify-center w-8 h-8 bg-[#054700]/10 rounded-full flex-shrink-0">
        <Bell className="w-4 h-4 text-[#054700]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#054700]">Add your phone for supplement reminders</p>
        <p className="text-xs text-[#5a6623] mt-0.5">Get daily SMS reminders to take your Ones formula on schedule.</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Input
          placeholder="+1 (555) 000-0000"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          className="w-40 h-8 text-sm"
          type="tel"
          onKeyDown={e => e.key === 'Enter' && phone.trim() && saveMutation.mutate()}
        />
        <Button
          size="sm"
          className="h-8 bg-[#054700] hover:bg-[#043d00] text-white text-xs px-3 whitespace-nowrap"
          disabled={!phone.trim() || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? '...' : 'Save'}
        </Button>
        <button
          onClick={dismiss}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Map next actions to their appropriate routes
function getNextActionRoute(nextAction: string): string {
  const actionRoutes: Record<string, string> = {
    // Lab reports
    'Upload lab results': '/dashboard/lab-reports',

    // Profile tab - demographics & physical
    'Add age and gender': '/dashboard/profile?tab=profile',
    'Add demographics': '/dashboard/profile?tab=profile',
    'Add weight and height': '/dashboard/profile?tab=profile',

    // Health tab - medical & lifestyle
    'Add medications': '/dashboard/profile?tab=health',
    'Add health conditions': '/dashboard/profile?tab=health',
    'Add allergies': '/dashboard/profile?tab=health',
    'Add blood pressure': '/dashboard/profile?tab=health',
    'Add resting heart rate': '/dashboard/profile?tab=health',
    'Add sleep hours': '/dashboard/profile?tab=health',
    'Add exercise frequency': '/dashboard/profile?tab=health',
    'Add stress level': '/dashboard/profile?tab=health',
    'Add smoking status': '/dashboard/profile?tab=health',
    'Add alcohol intake': '/dashboard/profile?tab=health',
    'Add lifestyle data': '/dashboard/profile?tab=health',

    // Complete states
    'Profile complete': '/dashboard/formula',
    'Complete your profile': '/dashboard/chat'
  };

  return actionRoutes[nextAction] || '/dashboard/chat';
}

interface ChecklistItem {
  label: string;
  complete: boolean;
  route: string;
}

interface ChecklistCategory {
  category: string;
  items: ChecklistItem[];
}

interface DashboardData {
  metrics: {
    profileCompleteness: number;
    completedFields: number;
    totalFields: number;
    nextAction: string;
    nextActionDetail: string;
    formulaVersion: number;
    consultationsSessions: number;
  };
  profileChecklist: ChecklistCategory[];
  currentFormula: Formula | null;
  isNewUser: boolean;
}

// Theme toggling removed: app is light-only

function HomeSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-16 w-full" />
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const userName = user?.name?.split(' ')[0] || 'there';
  const [showProfileDialog, setShowProfileDialog] = useState(false);

  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: ['/api', 'dashboard'],
  });

  if (isLoading) {
    return <HomeSkeleton />;
  }

  const { metrics, profileChecklist, currentFormula, isNewUser } = dashboardData || {};

  // Step completion logic
  const isStep1Complete = (metrics?.profileCompleteness || 0) >= 50;
  const isStep2Complete = profileChecklist?.find(c => c.category === 'Lab Reports')?.items.every(i => i.complete) || false;
  const isStep3Complete = (metrics?.consultationsSessions || 0) > 0;
  const isStep4Complete = !!currentFormula;

  return (
    <div className="w-full px-4 py-4 md:max-w-6xl md:mx-auto space-y-4 md:space-y-6" data-testid="page-home">
      {/* Personal Greeting - V2 Branding */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-semibold text-[#054700] mb-1" data-testid="text-greeting">
            Long live {userName}.
          </h1>
          <p className="text-sm md:text-base text-[#5a6623]">
            {isNewUser
              ? "Start your personalized supplement journey"
              : "Your health journey overview"
            }
          </p>
        </div>
      </div>

      {/* Phone number prompt — only shown to users without a phone on file */}
      <PhonePromptBanner userPhone={(user as any)?.phone} />

      {/* Quick Stats - V2 Styled Cards */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-3">
        {/* Profile Completeness */}
        <Card
          data-testid="card-profile-completeness"
          className="border-[#054700]/10 shadow-2xl hover:border-[#054700]/20 hover:shadow-md transition-all cursor-pointer"
          onClick={() => setShowProfileDialog(true)}
        >
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#5a6623]">Profile Completeness</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-[#054700] mb-1">
              {metrics?.profileCompleteness || 0}%
            </div>
            <p className="text-xs text-[#5a6623]">
              {metrics?.nextAction || 'Complete your profile'}
            </p>
            <Progress value={metrics?.profileCompleteness || 0} className="mt-2 h-1 bg-[#054700]/10" />
          </CardContent>
        </Card>

        {/* Formula Version */}
        <Card data-testid="card-formula-version" className="border-[#054700]/10 shadow-2xl hover:border-[#054700]/20 hover:shadow-md transition-all">
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#5a6623]">Current Formula</CardTitle>
          </CardHeader>
          <CardContent>
            {currentFormula ? (
              <>
                <div className="text-3xl font-semibold text-[#054700] mb-1">
                  {currentFormula.name || `Version ${currentFormula.version}`}
                </div>
                <p className="text-xs text-[#5a6623]">
                  {currentFormula.name && `Version ${currentFormula.version} • `}
                  {currentFormula.bases.length + (currentFormula.additions?.length || 0)} ingredients
                </p>
                <div className="mt-2">
                  <Badge className="text-xs gap-1 bg-[#054700]/10 text-[#054700] hover:bg-[#054700]/20">
                    <Shield className="w-3 h-3" />
                    Active
                  </Badge>
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-semibold mb-1 text-[#5a6623]">
                  Not created
                </div>
                <p className="text-xs text-[#5a6623]">
                  Start consultation
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Consultations */}
        <Card data-testid="card-consultations" className="border-[#054700]/10 shadow-2xl hover:border-[#054700]/20 hover:shadow-md transition-all">
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#5a6623]">Consultations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-[#054700] mb-1">
              {metrics?.consultationsSessions || 0}
            </div>
            <p className="text-xs text-[#5a6623]">
              AI sessions completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* New User Onboarding - V2 Styled */}
      {isNewUser && (
        <Card className="border-[#054700]/20 bg-gradient-to-r from-[#054700]/5 to-[#5a6623]/10" data-testid="card-onboarding">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-semibold text-[#054700] mb-2">
                  Welcome to Ones AI
                </h2>
                <p className="text-[#5a6623]">
                  Let's create your personalized supplement formula. First, tell us about yourself so our AI can make the best recommendations.
                </p>
              </div>

              {/* Step 1: Health Profile */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${isStep1Complete
                    ? 'bg-green-600 text-white'
                    : 'bg-[#054700] text-white'
                    }`}>
                    {isStep1Complete ? '✓' : '1'}
                  </div>
                  <div className="flex-1">
                    <span className="text-sm text-[#054700] font-medium">Complete your health profile</span>
                    <p className="text-xs text-[#5a6623]">
                      {isStep1Complete
                        ? `${metrics?.profileCompleteness}% complete`
                        : 'Age, medications, health goals & more'}
                    </p>
                  </div>
                  {!isStep1Complete && (
                    <Button asChild variant="outline" size="sm" className="border-[#054700] text-[#054700] hover:bg-[#054700] hover:text-white rounded-full">
                      <Link href="/dashboard/profile?tab=profile">
                        Start
                      </Link>
                    </Button>
                  )}
                </div>

                {/* Step 2: Upload Blood Tests (Optional) */}
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${isStep2Complete
                    ? 'bg-green-600 text-white'
                    : (isStep1Complete ? 'bg-[#054700] text-white' : 'bg-[#054700]/10 text-[#5a6623]')
                    }`}>
                    {isStep2Complete ? '✓' : '2'}
                  </div>
                  <div className="flex-1">
                    <span className={`text-sm font-medium ${isStep2Complete || isStep1Complete ? 'text-[#054700]' : 'text-[#5a6623]'}`}>
                      Upload blood tests
                    </span>
                    <p className="text-xs text-[#5a6623]/70">
                      {isStep2Complete ? 'Tests uploaded' : 'Optional but recommended for precision'}
                    </p>
                  </div>
                  <Button asChild variant="ghost" size="sm" className="text-[#5a6623] hover:text-[#054700] hover:bg-[#054700]/5 rounded-full">
                    <Link href="/dashboard/lab-reports">
                      <Upload className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>

                {/* Step 3: AI Consultation */}
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${isStep3Complete
                    ? 'bg-green-600 text-white'
                    : (isStep1Complete ? 'bg-[#054700] text-white' : 'bg-[#054700]/10 text-[#5a6623]')
                    }`}>
                    {isStep3Complete ? '✓' : '3'}
                  </div>
                  <div className="flex-1">
                    <span className={`text-sm font-medium ${isStep3Complete || isStep1Complete ? 'text-[#054700]' : 'text-[#5a6623]'}`}>
                      Start AI consultation
                    </span>
                    <p className="text-xs text-[#5a6623]/70">Get your personalized formula</p>
                  </div>
                </div>

                {/* Step 4: Receive Formula */}
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${isStep4Complete
                    ? 'bg-green-600 text-white'
                    : (isStep3Complete ? 'bg-[#054700] text-white' : 'bg-[#054700]/10 text-[#5a6623]')
                    }`}>
                    {isStep4Complete ? '✓' : '4'}
                  </div>
                  <span className={`text-sm font-medium ${isStep4Complete || isStep3Complete ? 'text-[#054700]' : 'text-[#5a6623]'}`}>
                    Receive supplements monthly
                  </span>
                </div>
              </div>

              {/* Conditional CTA based on profile completeness */}
              {!isStep1Complete ? (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button asChild className="gap-2 bg-[#054700] hover:bg-[#043d00] text-white rounded-full px-6" data-testid="button-complete-profile">
                    <Link href="/dashboard/profile?tab=profile">
                      <Sparkles className="w-4 h-4" />
                      Complete Health Profile
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="gap-2 border-[#054700]/30 text-[#5a6623] hover:bg-[#054700]/5 rounded-full px-6" data-testid="button-start-consultation">
                    <Link href="/dashboard/chat">
                      <MessageSquare className="w-4 h-4" />
                      Skip to Consultation
                    </Link>
                  </Button>
                </div>
              ) : (
                <Button asChild className="gap-2 bg-[#054700] hover:bg-[#043d00] text-white rounded-full px-6" data-testid="button-start-consultation">
                  <Link href="/dashboard/chat?new=true">
                    <PlayCircle className="w-4 h-4" />
                    Start AI Consultation
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Formula Preview - V2 Styled */}
      {currentFormula && (
        <Card data-testid="card-formula-preview" className="border-[#054700]/10 shadow-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-[#054700]">
                  <FlaskConical className="w-5 h-5 text-[#054700]" />
                  {currentFormula.name || `Version ${currentFormula.version}`}
                </CardTitle>
                <CardDescription className="text-[#5a6623]">
                  {currentFormula.name && `Version ${currentFormula.version} • `}{currentFormula.totalMg}mg total
                </CardDescription>
              </div>
              <Button asChild variant="outline" size="sm" className="border-[#054700] text-[#054700] hover:bg-[#054700] hover:text-white rounded-full" data-testid="button-view-full">
                <Link href="/dashboard/formula">View Full</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Daily Dosage */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#5a6623]">Daily Dosage</span>
                  <span className="font-medium text-base text-[#054700]" data-testid="text-dosage-display">
                    {calculateDosage(currentFormula.totalMg, currentFormula.targetCapsules || undefined).display}
                  </span>
                </div>
                <p className="text-xs text-[#5a6623]">
                  {currentFormula.targetCapsules || calculateDosage(currentFormula.totalMg).total} capsules per day ({currentFormula.totalMg}mg total)
                  {currentFormula.targetCapsules && CAPSULE_TIER_INFO[currentFormula.targetCapsules as CapsuleCount] && (
                    <span className="ml-1">• {CAPSULE_TIER_INFO[currentFormula.targetCapsules as CapsuleCount].label}</span>
                  )}
                </p>
              </div>

              {/* Dosage Progress - now based on capsule budget */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#5a6623]">
                    Capsule Fill ({currentFormula.targetCapsules || 9} caps = {((currentFormula.targetCapsules || 9) * 550).toLocaleString()}mg)
                  </span>
                  <span className="font-medium text-[#054700]">{currentFormula.totalMg}mg</span>
                </div>
                <Progress
                  value={Math.min((currentFormula.totalMg / ((currentFormula.targetCapsules || 9) * 550)) * 100, 100)}
                  className="h-2 bg-[#054700]/10"
                />
              </div>

              {/* Top Ingredients Preview */}
              <div>
                <h4 className="font-medium text-sm mb-2 text-[#5a6623]">Top Ingredients</h4>
                <div className="space-y-2">
                  {currentFormula.bases.slice(0, 3).map((base, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-[#054700]">{base.ingredient}</span>
                      <span className="text-[#5a6623]">{base.amount}mg</span>
                    </div>
                  ))}
                  {currentFormula.bases.length > 3 && (
                    <div className="text-xs text-[#5a6623] pt-1">
                      +{currentFormula.bases.length - 3} more ingredients
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button size="sm" asChild className="flex-1 bg-[#054700] hover:bg-[#043d00] text-white rounded-full" data-testid="button-order-now">
                  <Link href="/dashboard/formula">
                    <Package className="w-4 h-4 mr-2" />
                    Order Now
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild className="flex-1 border-[#054700] text-[#054700] hover:bg-[#054700] hover:text-white rounded-full" data-testid="button-refine-formula">
                  <Link href={currentFormula.chatSessionId ? `/dashboard/chat?session_id=${currentFormula.chatSessionId}` : "/dashboard/chat"}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Refine
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formula drift / review banner — only shown when review is recommended */}
      {currentFormula && <FormulaReviewBanner />}

      {/* Health Pulse: wearable snapshot + lab markers — always visible */}
      <HealthPulseCard />

      {/* Quick Actions for Users with Formula - V2 Styled */}
      {!isNewUser && currentFormula && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-[#054700]/10 shadow-2xl hover:border-[#054700]/20 hover:shadow-md transition-all cursor-pointer" data-testid="card-upload-labs">
            <Link href="/dashboard/lab-reports">
              <CardHeader className="space-y-0 pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-[#054700]">
                  <Upload className="w-4 h-4 text-[#054700]" />
                  Upload Lab Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#5a6623]">
                  Add blood tests for better formula optimization
                </p>
              </CardContent>
            </Link>
          </Card>

          <Card className="border-[#054700]/10 shadow-2xl hover:border-[#054700]/20 hover:shadow-md transition-all cursor-pointer" data-testid="card-view-orders">
            <Link href="/dashboard/orders">
              <CardHeader className="space-y-0 pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-[#054700]">
                  <Package className="w-4 h-4 text-[#054700]" />
                  View Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#5a6623]">
                  Track your supplement orders and shipping status
                </p>
              </CardContent>
            </Link>
          </Card>
        </div>
      )}

      {/* Promotional/Info Section - V2 Styled */}
      {!isNewUser && (
        <Card className="bg-gradient-to-br from-[#054700]/10 to-[#5a6623]/5 border-[#054700]/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Sparkles className="w-8 h-8 text-[#D4A574] flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1 text-[#054700]">Optimize Your Formula</h3>
                <p className="text-sm text-[#5a6623] mb-3">
                  Chat with our AI to refine your supplement blend based on your latest health goals and lab results.
                </p>
                <Button asChild size="sm" className="bg-[#054700] hover:bg-[#043d00] text-white rounded-full">
                  <Link href="/dashboard/chat?new=true">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Start Chat
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Completion Dialog */}
      <ProfileCompletionDialog
        open={showProfileDialog}
        onOpenChange={setShowProfileDialog}
        profileCompleteness={metrics?.profileCompleteness || 0}
        checklist={profileChecklist || []}
      />
    </div>
  );
}
