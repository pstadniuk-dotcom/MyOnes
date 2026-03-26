import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Button } from '@/shared/components/ui/button';
import {
  Activity,
  ArrowRight,
  Heart,
  Moon,
  FlaskConical,
  Zap,
  WifiOff,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Clock,
  Pill,
  RotateCw,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────

interface PulseDriver {
  signal: string;
  type: 'wearable' | 'lab';
  severity: 'critical' | 'warning' | 'neutral' | 'positive';
  category: string;
}

type PulseState = 'optimal' | 'adapting' | 'under_recovery' | 'circadian_stress' | 'attention' | 'baseline';

interface LabSnapshotData {
  markers: Array<{ signal: string; severity: string; category: string }>;
  reportAge: 'recent' | 'aging' | 'stale' | null;
  reportDateLabel: string | null;
  hasActiveOrder: boolean;
}

interface PulseIntelligence {
  state: PulseState;
  stateLabel: string;
  stateColor: string;
  headline: string;
  summary: string;
  drivers: PulseDriver[];
  actions: string[];
  hasWearable: boolean;
  hasLabs: boolean;
  labSnapshot: LabSnapshotData | null;
  providers: string[];
  lastUpdated: string;
}

// ── State visual config ──────────────────────────────────────────────

const STATE_THEME: Record<PulseState, {
  gradient: string;
  iconBg: string;
  iconColor: string;
  dotColor: string;
  pulseRing: string;
  icon: React.ElementType;
}> = {
  optimal: {
    gradient: 'from-emerald-50/80 to-white',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-700',
    dotColor: 'bg-emerald-500',
    pulseRing: 'ring-emerald-400/30',
    icon: CheckCircle2,
  },
  adapting: {
    gradient: 'from-amber-50/60 to-white',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-700',
    dotColor: 'bg-amber-500',
    pulseRing: 'ring-amber-400/30',
    icon: Activity,
  },
  under_recovery: {
    gradient: 'from-amber-50/70 to-white',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-700',
    dotColor: 'bg-amber-500',
    pulseRing: 'ring-amber-400/30',
    icon: TrendingDown,
  },
  circadian_stress: {
    gradient: 'from-orange-50/60 to-white',
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-700',
    dotColor: 'bg-orange-500',
    pulseRing: 'ring-orange-400/30',
    icon: Moon,
  },
  attention: {
    gradient: 'from-red-50/50 to-white',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-700',
    dotColor: 'bg-red-500',
    pulseRing: 'ring-red-400/30',
    icon: AlertTriangle,
  },
  baseline: {
    gradient: 'from-slate-50/60 to-white',
    iconBg: 'bg-[#054700]/10',
    iconColor: 'text-[#054700]',
    dotColor: 'bg-slate-400',
    pulseRing: 'ring-slate-300/30',
    icon: Zap,
  },
};

const SEVERITY_ICON: Record<string, { icon: React.ElementType; color: string }> = {
  critical: { icon: AlertTriangle, color: 'text-red-500' },
  warning: { icon: Clock, color: 'text-amber-500' },
  neutral: { icon: Activity, color: 'text-slate-400' },
  positive: { icon: CheckCircle2, color: 'text-emerald-500' },
};

const CATEGORY_ICON: Record<string, React.ElementType> = {
  recovery: Heart,
  sleep: Moon,
  labs: FlaskConical,
  activity: Zap,
};

const REPORT_AGE_STYLE: Record<string, { opacity: string; label: string }> = {
  recent: { opacity: 'opacity-100', label: 'Recent' },
  aging: { opacity: 'opacity-80', label: 'Getting older' },
  stale: { opacity: 'opacity-60', label: 'Consider retesting' },
};

// ── Components ─────────────────────────────────────────────────────────

function DriverRow({ driver }: { driver: PulseDriver }) {
  const sev = SEVERITY_ICON[driver.severity] || SEVERITY_ICON.neutral;
  const CatIcon = CATEGORY_ICON[driver.category] || Activity;
  const SevIcon = sev.icon;

  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <div className="mt-0.5 flex-shrink-0">
        <CatIcon className={`w-3.5 h-3.5 ${sev.color}`} />
      </div>
      <span className="text-sm text-[#054700] leading-snug flex-1">{driver.signal}</span>
      <SevIcon className={`w-3 h-3 mt-1 flex-shrink-0 ${sev.color} opacity-60`} />
    </div>
  );
}

function ActionRow({ action, index }: { action: string; index: number }) {
  return (
    <div className="flex items-start gap-2.5 py-1">
      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#054700]/[0.08] flex items-center justify-center mt-0.5">
        <span className="text-[10px] font-semibold text-[#054700]">{index + 1}</span>
      </span>
      <span className="text-sm text-[#054700]/80 leading-snug">{action}</span>
    </div>
  );
}

function LabSnapshotSection({ labSnapshot }: { labSnapshot: LabSnapshotData }) {
  const ageStyle = labSnapshot.reportAge
    ? REPORT_AGE_STYLE[labSnapshot.reportAge]
    : REPORT_AGE_STYLE.recent;
  const isStale = labSnapshot.reportAge === 'stale';

  return (
    <div className={`bg-white/40 rounded-xl border border-[#054700]/[0.05] p-3.5 ${ageStyle.opacity}`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <FlaskConical className="w-3 h-3 text-[#5a6623]" />
          <span className="text-[10px] font-semibold text-[#5a6623] uppercase tracking-wider">
            Lab Snapshot
          </span>
        </div>
        {labSnapshot.reportDateLabel && (
          <span className="text-[10px] text-[#5a6623]/60 flex items-center gap-1">
            {isStale && <RotateCw className="w-2.5 h-2.5" />}
            Tested {labSnapshot.reportDateLabel}
          </span>
        )}
      </div>
      <div className="divide-y divide-[#054700]/5">
        {labSnapshot.markers.map((marker, i) => {
          const sev = SEVERITY_ICON[marker.severity] || SEVERITY_ICON.neutral;
          const SevIcon = sev.icon;
          return (
            <div key={i} className="flex items-start gap-2.5 py-1.5">
              <div className="mt-0.5 flex-shrink-0">
                <FlaskConical className={`w-3.5 h-3.5 ${sev.color}`} />
              </div>
              <span className="text-sm text-[#054700]/70 leading-snug flex-1">{marker.signal}</span>
              <SevIcon className={`w-3 h-3 mt-1 flex-shrink-0 ${sev.color} opacity-40`} />
            </div>
          );
        })}
      </div>
      {labSnapshot.hasActiveOrder && (
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-600 bg-emerald-50/60 rounded-lg px-2.5 py-1.5">
          <Pill className="w-3 h-3" />
          <span>Being addressed in your formula</span>
        </div>
      )}
      {isStale && (
        <div className="mt-2 text-[10px] text-amber-600 bg-amber-50/60 rounded-lg px-2.5 py-1.5 text-center">
          These results are over 3 months old — consider retesting for up-to-date insights
        </div>
      )}
    </div>
  );
}

function PulseDot({ state }: { state: PulseState }) {
  const theme = STATE_THEME[state] || STATE_THEME.baseline;
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className={`absolute inline-flex h-full w-full rounded-full ${theme.dotColor} opacity-30 animate-ping`} />
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${theme.dotColor}`} />
    </span>
  );
}

function NoDataState() {
  return (
    <div className="flex flex-col items-center text-center gap-4 py-6">
      <div className="relative">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#054700]/10 to-[#5a6623]/10 flex items-center justify-center">
          <Zap className="w-6 h-6 text-[#054700]" />
        </div>
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-[#054700]">Your Health Pulse awaits</p>
        <p className="text-xs text-[#5a6623] max-w-[240px] leading-relaxed">
          Connect a wearable or upload lab results to unlock personalized health intelligence.
        </p>
      </div>
      <div className="flex gap-2">
        <Button asChild variant="outline" size="sm" className="rounded-full border-[#054700]/20 text-[#054700] hover:bg-[#054700] hover:text-white text-xs h-8 px-3">
          <Link href="/dashboard/wearables">
            <WifiOff className="w-3 h-3 mr-1.5" />
            Connect device
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="rounded-full border-[#054700]/20 text-[#054700] hover:bg-[#054700] hover:text-white text-xs h-8 px-3">
          <Link href="/dashboard/lab-reports">
            <FlaskConical className="w-3 h-3 mr-1.5" />
            Upload labs
          </Link>
        </Button>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────

export function HealthPulseCard() {
  const { data, isLoading, error } = useQuery<PulseIntelligence>({
    queryKey: ['/api/wearables/health-pulse-intelligence'],
    staleTime: 5 * 60 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const state = data?.state || 'baseline';
  const theme = STATE_THEME[state];
  const StateIcon = theme.icon;
  const hasData = data && (data.hasWearable || data.hasLabs);

  return (
    <Card className={`relative overflow-hidden bg-gradient-to-br ${theme.gradient} border-[#054700]/8 hover:border-[#054700]/15 hover:shadow-lg transition-all duration-300`}>
      <CardContent className="p-0">
        {/* Loading state */}
        {isLoading && (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-64" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-8 w-full rounded-lg" />
              <Skeleton className="h-8 w-full rounded-lg" />
              <Skeleton className="h-8 w-3/4 rounded-lg" />
            </div>
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="p-6 text-center">
            <p className="text-sm text-[#5a6623]">Unable to load health intelligence</p>
          </div>
        )}

        {/* No data state */}
        {!isLoading && !error && data && !hasData && (
          <div className="p-6">
            <NoDataState />
          </div>
        )}

        {/* Main intelligence card */}
        {!isLoading && !error && data && hasData && (
          <div className="p-5 sm:p-6 space-y-4">
            {/* Header: State icon + headline */}
            <div className="flex items-start gap-3.5">
              <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${theme.iconBg} flex items-center justify-center ring-2 ${theme.pulseRing}`}>
                <StateIcon className={`w-5 h-5 ${theme.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <PulseDot state={state} />
                  <span className="text-[11px] font-medium text-[#5a6623] uppercase tracking-wider">
                    Health Pulse
                  </span>
                  {data.providers.length > 0 && (
                    <span className="text-[10px] text-[#5a6623]/50 ml-auto">
                      {data.providers[0]}
                    </span>
                  )}
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-[#054700] leading-tight">
                  {data.headline}
                </h3>
              </div>
            </div>

            {/* Summary */}
            <p className="text-sm text-[#5a6623] leading-relaxed pl-[3.375rem]">
              {data.summary}
            </p>

            {/* Key Drivers */}
            {data.drivers.length > 0 && (
              <div className="bg-white/60 rounded-xl border border-[#054700]/[0.06] p-3.5">
                <div className="text-[10px] font-semibold text-[#5a6623] uppercase tracking-wider mb-1.5">
                  Key Signals
                </div>
                <div className="divide-y divide-[#054700]/5">
                  {data.drivers.map((driver, i) => (
                    <DriverRow key={i} driver={driver} />
                  ))}
                </div>
              </div>
            )}

            {/* Lab Snapshot (separate from pulse state) */}
            {data.labSnapshot && data.labSnapshot.markers.length > 0 && (
              <LabSnapshotSection labSnapshot={data.labSnapshot} />
            )}

            {/* Actions */}
            {data.actions.length > 0 && (
              <div className="pl-0.5">
                <div className="text-[10px] font-semibold text-[#5a6623] uppercase tracking-wider mb-1.5">
                  Next Steps
                </div>
                <div className="space-y-0.5">
                  {data.actions.map((action, i) => (
                    <ActionRow key={i} action={action} index={i} />
                  ))}
                </div>
              </div>
            )}

            {/* Footer links */}
            <div className="flex items-center justify-between pt-1 border-t border-[#054700]/5">
              <div className="flex gap-3">
                {data.hasLabs && (
                  <Link href="/dashboard/lab-reports" className="text-[11px] text-[#5a6623] hover:text-[#054700] transition-colors flex items-center gap-1">
                    <FlaskConical className="w-3 h-3" />
                    Labs
                    <ArrowRight className="w-2.5 h-2.5" />
                  </Link>
                )}
                {data.hasWearable && (
                  <Link href="/dashboard/wearables" className="text-[11px] text-[#5a6623] hover:text-[#054700] transition-colors flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    Devices
                    <ArrowRight className="w-2.5 h-2.5" />
                  </Link>
                )}
              </div>
              <span className="text-[10px] text-[#5a6623]/40">
                Updated {new Date(data.lastUpdated).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
