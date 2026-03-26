import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar';
import {
  MessageSquare,
  FlaskConical,
  Package,
  Upload,
  Shield,
  Sparkles,
  PlayCircle,
  ArrowRight,
  Sun,
  Moon,
  Sunset,
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import type { Formula } from '@shared/schema';
import { calculateDosage } from '@/shared/lib/utils';
import { useState } from 'react';
import { ProfileCompletionDialog } from '@/features/auth/components/ProfileCompletionDialog';
import { HealthPulseCard } from '@/features/dashboard/components/HealthPulseCard';
import FormulaReviewBanner from '@/features/dashboard/components/FormulaReviewBanner';

// Map next actions to their appropriate routes
function getNextActionRoute(nextAction: string): string {
  const actionRoutes: Record<string, string> = {
    // Lab reports
    'Upload lab results': '/dashboard/lab-reports',

    // Demographics & physical → health tab, basic-info section
    'Add age and gender': '/dashboard/profile?tab=health&section=basic-info',
    'Add demographics': '/dashboard/profile?tab=health&section=basic-info',
    'Add weight and height': '/dashboard/profile?tab=health&section=basic-info',

    // Vital signs
    'Add blood pressure': '/dashboard/profile?tab=health&section=vital-signs',
    'Add resting heart rate': '/dashboard/profile?tab=health&section=vital-signs',

    // Lifestyle factors
    'Add sleep hours': '/dashboard/profile?tab=health&section=lifestyle-factors',
    'Add exercise frequency': '/dashboard/profile?tab=health&section=lifestyle-factors',
    'Add stress level': '/dashboard/profile?tab=health&section=lifestyle-factors',
    'Add lifestyle data': '/dashboard/profile?tab=health&section=lifestyle-factors',

    // Risk factors / medical history
    'Add medications': '/dashboard/profile?tab=health&section=risk-factors',
    'Add health conditions': '/dashboard/profile?tab=health&section=risk-factors',
    'Add allergies': '/dashboard/profile?tab=health&section=risk-factors',
    'Add smoking status': '/dashboard/profile?tab=health&section=risk-factors',
    'Add alcohol intake': '/dashboard/profile?tab=health&section=risk-factors',

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

function getGreeting(): { text: string; icon: React.ElementType } {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Good morning', icon: Sun };
  if (hour < 17) return { text: 'Good afternoon', icon: Sunset };
  return { text: 'Good evening', icon: Moon };
}

export default function HomePage() {
  const { user } = useAuth();
  const userName = user?.name?.split(' ')[0] || 'there';
  const userInitials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [, navigate] = useLocation();
  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;

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
      {/* Personal Greeting — glass card with avatar & time-of-day */}
      <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 shadow-[0_1px_20px_rgba(0,0,0,0.04)] px-5 py-4 md:px-6 md:py-5">
        <div className="flex items-center gap-4">
          <Avatar className="h-11 w-11 ring-2 ring-[#054700]/10 shadow-sm flex-shrink-0">
            <AvatarFallback className="bg-[#054700] text-white text-sm font-medium">{userInitials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <GreetingIcon className="w-3.5 h-3.5 text-[#5a6623]" />
              <span className="text-xs text-[#5a6623] font-medium">{greeting.text}</span>
            </div>
            <h1 className="text-lg md:text-2xl font-semibold text-[#054700] leading-tight truncate" data-testid="text-greeting">
              Long live {userName}.
            </h1>
          </div>
          <img src="/ones-logo-icon.svg" alt="" className="hidden md:block w-8 h-8 opacity-[0.08]" />
        </div>
      </div>

      {/* Quick Stats — mobile horizontal scroll, desktop grid */}
      <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
        {/* Profile Completeness — primary action card */}
        <Card
          data-testid="card-profile-completeness"
          className="min-w-[70%] snap-start md:min-w-0 border-[#054700]/15 bg-gradient-to-br from-[#054700]/[0.03] to-transparent shadow-[0_1px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer ring-1 ring-[#054700]/[0.06]"
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
            <Progress value={metrics?.profileCompleteness || 0} className="mt-2 h-1.5 bg-[#054700]/10" />
          </CardContent>
        </Card>

        {/* Formula Version */}
        <Card data-testid="card-formula-version" className="min-w-[70%] snap-start md:min-w-0 border-[#054700]/8 shadow-[0_1px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer" onClick={() => navigate(currentFormula ? '/dashboard/formula' : '/dashboard/chat?new=true')}>
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
        <Card data-testid="card-consultations" className="min-w-[70%] snap-start md:min-w-0 border-[#054700]/8 shadow-[0_1px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer" onClick={() => navigate('/dashboard/chat?new=true')}>
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#5a6623]">Consultations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-[#054700] mb-1">
              {metrics?.consultationsSessions || 0}
            </div>
            <p className="text-xs text-[#5a6623]">
              {(metrics?.consultationsSessions || 0) > 0 ? 'Start new session' : 'Start your first consultation'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* New User Onboarding — stepper with connecting line */}
      {isNewUser && (
        <Card className="border-[#054700]/10 bg-white/70 backdrop-blur-sm shadow-[0_1px_20px_rgba(0,0,0,0.04)]" data-testid="card-onboarding">
          <CardContent className="p-6 md:p-8">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl md:text-2xl font-semibold text-[#054700] mb-1">
                  Welcome to Ones
                </h2>
                <p className="text-sm text-[#5a6623] leading-relaxed">
                  Let's create your personalized supplement formula in a few steps.
                </p>
              </div>

              {/* Stepper with vertical connecting line */}
              <div className="relative space-y-0">
                {/* Vertical line behind steps */}
                <div className="absolute left-[18px] top-5 bottom-5 w-px bg-[#054700]/10" />

                {/* Step 1 */}
                <div className="relative flex items-start gap-4 pb-5">
                  <div className={`relative z-10 flex items-center justify-center w-9 h-9 rounded-full text-sm font-semibold flex-shrink-0 transition-colors ${
                    isStep1Complete ? 'bg-[#054700] text-white shadow-sm' : 'bg-[#054700] text-white shadow-sm'
                  }`}>
                    {isStep1Complete ? '✓' : '1'}
                  </div>
                  <div className="flex-1 pt-1">
                    <span className="text-sm text-[#054700] font-medium">Complete your health profile</span>
                    <p className="text-xs text-[#5a6623] mt-0.5">
                      {isStep1Complete ? `${metrics?.profileCompleteness}% complete` : 'Age, medications, health goals & more'}
                    </p>
                  </div>
                  {!isStep1Complete && (
                    <Button asChild variant="outline" size="sm" className="border-[#054700] text-[#054700] hover:bg-[#054700] hover:text-white rounded-full mt-0.5">
                      <Link href="/dashboard/profile?tab=profile">Start</Link>
                    </Button>
                  )}
                </div>

                {/* Step 2 */}
                <div className="relative flex items-start gap-4 pb-5">
                  <div className={`relative z-10 flex items-center justify-center w-9 h-9 rounded-full text-sm font-semibold flex-shrink-0 transition-colors ${
                    isStep2Complete ? 'bg-[#054700] text-white shadow-sm' : (isStep1Complete ? 'bg-[#054700] text-white shadow-sm' : 'bg-[#054700]/10 text-[#5a6623]')
                  }`}>
                    {isStep2Complete ? '✓' : '2'}
                  </div>
                  <div className="flex-1 pt-1">
                    <span className={`text-sm font-medium ${isStep2Complete || isStep1Complete ? 'text-[#054700]' : 'text-[#5a6623]'}`}>
                      Upload blood tests
                    </span>
                    <p className="text-xs text-[#5a6623]/70 mt-0.5">
                      {isStep2Complete ? 'Tests uploaded' : 'Optional but recommended for precision'}
                    </p>
                  </div>
                  <Button asChild variant="ghost" size="sm" className="text-[#5a6623] hover:text-[#054700] hover:bg-[#054700]/5 rounded-full mt-0.5">
                    <Link href="/dashboard/lab-reports">
                      <Upload className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>

                {/* Step 3 */}
                <div className="relative flex items-start gap-4 pb-5">
                  <div className={`relative z-10 flex items-center justify-center w-9 h-9 rounded-full text-sm font-semibold flex-shrink-0 transition-colors ${
                    isStep3Complete ? 'bg-[#054700] text-white shadow-sm' : (isStep1Complete ? 'bg-[#054700] text-white shadow-sm' : 'bg-[#054700]/10 text-[#5a6623]')
                  }`}>
                    {isStep3Complete ? '✓' : '3'}
                  </div>
                  <div className="flex-1 pt-1">
                    <span className={`text-sm font-medium ${isStep3Complete || isStep1Complete ? 'text-[#054700]' : 'text-[#5a6623]'}`}>
                      Start AI consultation
                    </span>
                    <p className="text-xs text-[#5a6623]/70 mt-0.5">Get your personalized formula</p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="relative flex items-start gap-4">
                  <div className={`relative z-10 flex items-center justify-center w-9 h-9 rounded-full text-sm font-semibold flex-shrink-0 transition-colors ${
                    isStep4Complete ? 'bg-[#054700] text-white shadow-sm' : (isStep3Complete ? 'bg-[#054700] text-white shadow-sm' : 'bg-[#054700]/10 text-[#5a6623]')
                  }`}>
                    {isStep4Complete ? '✓' : '4'}
                  </div>
                  <div className="flex-1 pt-1">
                    <span className={`text-sm font-medium ${isStep4Complete || isStep3Complete ? 'text-[#054700]' : 'text-[#5a6623]'}`}>
                      Receive supplements monthly
                    </span>
                  </div>
                </div>
              </div>

              {/* CTA */}
              {!isStep1Complete ? (
                <div className="flex flex-col sm:flex-row gap-3 pt-1">
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
                  <Link href="/dashboard/chat?new=true" onClick={() => localStorage.setItem('forceNewChat', Date.now().toString())}>
                    <PlayCircle className="w-4 h-4" />
                    Start AI Consultation
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Formula Preview — simplified */}
      {currentFormula && (
        <Card data-testid="card-formula-preview" className="border-[#054700]/8 shadow-[0_1px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.08)] transition-all duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-[#054700]">
                  <FlaskConical className="w-5 h-5 text-[#054700]" />
                  {currentFormula.name || `Version ${currentFormula.version}`}
                </CardTitle>
                <CardDescription className="text-[#5a6623] mt-1">
                  {currentFormula.name && `Version ${currentFormula.version} • `}
                  <span data-testid="text-dosage-display">
                    {calculateDosage(currentFormula.totalMg, currentFormula.targetCapsules || undefined).display}
                  </span>
                  {' '}• {currentFormula.totalMg}mg total
                </CardDescription>
              </div>
              <Button asChild variant="outline" size="sm" className="border-[#054700] text-[#054700] hover:bg-[#054700] hover:text-white rounded-full" data-testid="button-view-full">
                <Link href="/dashboard/formula">View Full</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Ingredients as chips */}
              <div>
                <p className="text-xs text-[#5a6623] font-medium uppercase tracking-wider mb-2">Ingredients</p>
                <div className="flex flex-wrap gap-1.5">
                  {currentFormula.bases.slice(0, 6).map((base, index) => (
                    <span key={index} className="inline-flex items-center gap-1 bg-[#054700]/[0.06] text-[#054700] text-xs font-medium px-2.5 py-1 rounded-full">
                      {base.ingredient}
                      <span className="text-[#054700]/40 text-[10px]">{base.amount}mg</span>
                    </span>
                  ))}
                  {currentFormula.bases.length > 6 && (
                    <span className="inline-flex items-center text-xs text-[#5a6623] px-2 py-1">
                      +{currentFormula.bases.length - 6} more
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-1">
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

      {/* Quick Actions — compact inline bar */}
      {!isNewUser && currentFormula && (
        <div className="bg-white/50 backdrop-blur-sm rounded-2xl border border-[#054700]/6 shadow-[0_1px_12px_rgba(0,0,0,0.03)] p-1.5 flex gap-1.5">
          <Link href="/dashboard/lab-reports" className="flex-1" data-testid="card-upload-labs">
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl hover:bg-white/80 transition-colors cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-[#054700]/[0.07] flex items-center justify-center flex-shrink-0">
                <Upload className="w-4 h-4 text-[#054700]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#054700]">Upload Labs</p>
                <p className="text-xs text-[#5a6623] truncate">Optimize your formula</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[#054700]/30 ml-auto flex-shrink-0" />
            </div>
          </Link>
          <Link href="/dashboard/orders" className="flex-1" data-testid="card-view-orders">
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl hover:bg-white/80 transition-colors cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-[#054700]/[0.07] flex items-center justify-center flex-shrink-0">
                <Package className="w-4 h-4 text-[#054700]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#054700]">Orders</p>
                <p className="text-xs text-[#5a6623] truncate">Track shipping status</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[#054700]/30 ml-auto flex-shrink-0" />
            </div>
          </Link>
        </div>
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
