import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/shared/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { useToast } from '@/shared/hooks/use-toast';
import {
  Watch,
  Activity,
  Heart,
  Moon,
  Footprints,
  Flame,
  Dumbbell,
  Scale,
  Droplets,
  HeartPulse,
  Salad,
  CheckCircle2,
  XCircle,
  Loader2,
  Link as LinkIcon,
  RefreshCw,
  Plus,
  Sparkles,
  Lock,
  Zap,
  Clock,
  ChevronDown,
  ChevronUp,
  LucideIcon,
} from 'lucide-react';
import { useState } from 'react';

interface WearableConnection {
  id: string;
  userId: string;
  provider: string;
  providerName: string;
  status: 'connected' | 'disconnected' | 'error';
  connectedAt: string;
  lastSyncedAt: string | null;
  source: 'junction';
}

// Priority providers for ONES - Activity focused
// Logos are handled by ProviderLogo component with special overrides for non-standard names
const PRIORITY_PROVIDERS = [
  { slug: 'garmin', name: 'Garmin', priority: 1, description: 'Fitness watches & GPS' },
  { slug: 'fitbit', name: 'Fitbit', priority: 2, description: 'Activity trackers' },
  { slug: 'oura', name: 'Oura Ring', priority: 3, description: 'Sleep & recovery tracking' },
  { slug: 'whoop_v2', name: 'WHOOP', priority: 4, description: 'Strain & recovery coach' },
  { slug: 'google_fit', name: 'Google Fit', priority: 5, description: 'Android health platform' },
  { slug: 'withings', name: 'Withings', priority: 6, description: 'Smart scales & health monitors' },
  { slug: 'strava', name: 'Strava', priority: 8, description: 'Activity social network' },
  { slug: 'polar', name: 'Polar', priority: 9, description: 'Sports tech pioneer' },
  { slug: 'peloton', name: 'Peloton', priority: 10, description: 'Connected fitness' },
  { slug: 'eight_sleep', name: 'Eight Sleep', priority: 11, description: 'Smart mattress' },
  { slug: 'ultrahuman', name: 'Ultrahuman', priority: 12, description: 'Metabolic fitness' },
  { slug: 'zwift', name: 'Zwift', priority: 13, description: 'Virtual cycling app' },
  { slug: 'wahoo', name: 'Wahoo', priority: 14, description: 'Indoor bike trainers' },
  { slug: 'freestyle_libre', name: 'Freestyle Libre', priority: 15, description: 'Continuous glucose monitor' },
  { slug: 'dexcom', name: 'Dexcom', priority: 16, description: 'Continuous glucose monitor' },
  { slug: 'cronometer', name: 'Cronometer', priority: 17, description: 'Nutrition tracking app' },
  { slug: 'omron', name: 'Omron', priority: 18, description: 'Blood pressure monitors' },
  { slug: 'kardia', name: 'Kardia', priority: 19, description: 'Portable ECG sensors' },
  { slug: 'beurer', name: 'Beurer', priority: 20, description: 'Blood pressure & glucose' },
  { slug: 'hammerhead', name: 'Hammerhead', priority: 21, description: 'Cycling computers' },
];

const WEB_UNSUPPORTED_PROVIDERS = new Set(['beurer']);

const PROVIDER_COLORS: Record<string, { color: string; bgColor: string }> = {
  garmin: { color: 'text-blue-600', bgColor: 'bg-blue-50' },
  google_fit: { color: 'text-green-600', bgColor: 'bg-green-50' },
  fitbit: { color: 'text-[#00B0B9]', bgColor: 'bg-[#00B0B9]/10' },
  oura: { color: 'text-[#0B0F1C]', bgColor: 'bg-slate-100' },
  whoop_v2: { color: 'text-black', bgColor: 'bg-yellow-50' },
  whoop: { color: 'text-black', bgColor: 'bg-yellow-50' },
  peloton: { color: 'text-red-600', bgColor: 'bg-red-50' },
  freestyle_libre: { color: 'text-blue-500', bgColor: 'bg-blue-50' },
  apple_health_kit: { color: 'text-pink-600', bgColor: 'bg-pink-50' },
  withings: { color: 'text-slate-700', bgColor: 'bg-slate-50' },
  strava: { color: 'text-orange-600', bgColor: 'bg-orange-50' },
  polar: { color: 'text-red-700', bgColor: 'bg-red-50' },
  eight_sleep: { color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
  ultrahuman: { color: 'text-purple-600', bgColor: 'bg-purple-50' },
  zwift: { color: 'text-orange-500', bgColor: 'bg-orange-50' },
  wahoo: { color: 'text-blue-700', bgColor: 'bg-blue-50' },
  dexcom: { color: 'text-teal-600', bgColor: 'bg-teal-50' },
  cronometer: { color: 'text-green-700', bgColor: 'bg-green-50' },
  omron: { color: 'text-blue-600', bgColor: 'bg-blue-50' },
  kardia: { color: 'text-red-500', bgColor: 'bg-red-50' },
  beurer: { color: 'text-cyan-600', bgColor: 'bg-cyan-50' },
  hammerhead: { color: 'text-slate-800', bgColor: 'bg-slate-100' },
};

function ProviderLogo({ provider, size = 'md' }: { provider: string; size?: 'sm' | 'md' | 'lg' }) {
  const [imgError, setImgError] = useState(false);
  const sizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  const domainByProvider: Record<string, string> = {
    garmin: 'garmin.com',
    fitbit: 'fitbit.com',
    oura: 'ouraring.com',
    whoop_v2: 'whoop.com',
    google_fit: 'google.com',
    apple_health_kit: 'apple.com',
    withings: 'withings.com',
    strava: 'strava.com',
    polar: 'polar.com',
    peloton: 'onepeloton.com',
    eight_sleep: 'eightsleep.com',
    ultrahuman: 'ultrahuman.com',
    zwift: 'zwift.com',
    wahoo: 'wahoofitness.com',
    freestyle_libre: 'freestyle.abbott',
    dexcom: 'dexcom.com',
    cronometer: 'cronometer.com',
    omron: 'omronhealthcare.com',
    kardia: 'kardia.com',
    beurer: 'beurer.com',
    hammerhead: 'hammerhead.io',
  };

  const domain = domainByProvider[provider] || `${provider}.com`;
  const logoUrl = `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;

  if (imgError) {
    return <Watch className={`${sizeClasses[size]} text-muted-foreground`} />;
  }

  return (
    <img
      src={logoUrl}
      alt={`${provider} logo`}
      className={`${sizeClasses[size]} object-contain rounded-md`}
      onError={() => setImgError(true)}
    />
  );
}

// --- Interfaces ---
interface PillarsData {
  activePillars: string[];
  unlockablePillars: { pillar: string; label: string; description: string; suggestedProviders: { slug: string; name: string; logo?: string }[] }[];
}

interface HistoricalData {
  success: boolean;
  data: {
    sleep: { date: string; totalMinutes: number | null; hrv: number | null; score: number | null; source: string }[];
    activity: { date: string; steps: number | null; caloriesActive: number | null; activeMinutes: number | null; source: string }[];
    body: any[];
    workouts: any[];
  };
  statistics: {
    sleep: { avgDuration: number | null; avgScore: number | null; avgHRV: number | null };
    activity: { avgSteps: number | null; avgActiveMinutes: number | null; avgCaloriesActive: number | null };
    body: { latestWeight: number | null; avgRestingHR: number | null; avgHRV: number | null };
    workouts: { totalCount: number; avgPerWeek: number; avgDuration: number | null; mostCommonType: string | null };
  };
}

// --- Pillar definitions ---
const PILLAR_DEFS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'sleep',    label: 'Sleep',    icon: Moon },
  { id: 'activity', label: 'Activity', icon: Footprints },
  { id: 'recovery', label: 'Recovery', icon: Heart },
  { id: 'workouts', label: 'Workouts', icon: Dumbbell },
  { id: 'body',     label: 'Body',     icon: Scale },
  { id: 'glucose',  label: 'Glucose',  icon: Droplets },
  { id: 'heart',    label: 'Heart',    icon: HeartPulse },
  { id: 'nutrition',label: 'Nutrition',icon: Salad },
];

// Map of suggested devices per pillar (matches backend PILLAR_SUGGESTED)
const PILLAR_DEVICE_MAP: Record<string, { slug: string; name: string }[]> = {
  sleep:    [{ slug: 'oura', name: 'Oura Ring' }, { slug: 'eight_sleep', name: 'Eight Sleep' }, { slug: 'fitbit', name: 'Fitbit' }, { slug: 'whoop_v2', name: 'WHOOP' }, { slug: 'garmin', name: 'Garmin' }, { slug: 'polar', name: 'Polar' }, { slug: 'withings', name: 'Withings' }],
  activity: [{ slug: 'garmin', name: 'Garmin' }, { slug: 'fitbit', name: 'Fitbit' }, { slug: 'google_fit', name: 'Google Fit' }, { slug: 'polar', name: 'Polar' }, { slug: 'strava', name: 'Strava' }, { slug: 'whoop_v2', name: 'WHOOP' }, { slug: 'withings', name: 'Withings' }, { slug: 'ultrahuman', name: 'Ultrahuman' }, { slug: 'peloton', name: 'Peloton' }, { slug: 'wahoo', name: 'Wahoo' }, { slug: 'zwift', name: 'Zwift' }, { slug: 'hammerhead', name: 'Hammerhead' }],
  recovery: [{ slug: 'oura', name: 'Oura Ring' }, { slug: 'whoop_v2', name: 'WHOOP' }, { slug: 'garmin', name: 'Garmin' }, { slug: 'fitbit', name: 'Fitbit' }, { slug: 'polar', name: 'Polar' }, { slug: 'ultrahuman', name: 'Ultrahuman' }],
  workouts: [{ slug: 'garmin', name: 'Garmin' }, { slug: 'fitbit', name: 'Fitbit' }, { slug: 'strava', name: 'Strava' }, { slug: 'peloton', name: 'Peloton' }, { slug: 'polar', name: 'Polar' }, { slug: 'whoop_v2', name: 'WHOOP' }, { slug: 'zwift', name: 'Zwift' }, { slug: 'wahoo', name: 'Wahoo' }, { slug: 'hammerhead', name: 'Hammerhead' }, { slug: 'ultrahuman', name: 'Ultrahuman' }],
  body:     [{ slug: 'withings', name: 'Withings' }, { slug: 'fitbit', name: 'Fitbit' }, { slug: 'oura', name: 'Oura Ring' }, { slug: 'garmin', name: 'Garmin' }, { slug: 'polar', name: 'Polar' }, { slug: 'ultrahuman', name: 'Ultrahuman' }],
  glucose:  [{ slug: 'freestyle_libre', name: 'Freestyle Libre' }, { slug: 'dexcom', name: 'Dexcom' }, { slug: 'beurer', name: 'Beurer' }],
  heart:    [{ slug: 'withings', name: 'Withings' }, { slug: 'omron', name: 'Omron' }, { slug: 'kardia', name: 'Kardia' }, { slug: 'beurer', name: 'Beurer' }, { slug: 'garmin', name: 'Garmin' }, { slug: 'polar', name: 'Polar' }],
  nutrition:[{ slug: 'cronometer', name: 'Cronometer' }],
};

// --- Helper functions ---
const fmtSleep = (mins: number | null) =>
  mins ? `${Math.floor(mins / 60)}h ${mins % 60}m` : '—';
const fmtNum = (n: number | null) =>
  n != null ? n.toLocaleString() : '—';

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// --- SparkBars mini chart ---
function SparkBars({ values, color }: { values: (number | null)[]; color: string }) {
  const valid = values.filter((v): v is number => v !== null);
  const max = valid.length > 0 ? Math.max(...valid) : 1;
  return (
    <div className="flex items-end gap-[2px] h-10">
      {values.map((v, i) => {
        const h = v !== null && max > 0 ? Math.max(4, Math.round((v / max) * 40)) : 3;
        return (
          <div
            key={i}
            className="flex-1 rounded-t-sm transition-all"
            style={{
              height: `${h}px`,
              backgroundColor: v !== null ? color : '#E8F0EC',
              opacity: 0.3 + (i / Math.max(values.length - 1, 1)) * 0.7,
            }}
          />
        );
      })}
    </div>
  );
}

// --- Stat tile ---
type DetailRow = { date: string; value: string; sub?: string };

function StatTile({
  icon: Icon,
  iconBg,
  iconColor,
  accentColor,
  label,
  value,
  unit,
  sub,
  sparkValues,
  onClick,
  expanded,
  detailRows,
}: {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  accentColor: string;
  label: string;
  value: string | null;
  unit: string;
  sub: string;
  sparkValues: (number | null)[];
  onClick?: () => void;
  expanded?: boolean;
  detailRows?: DetailRow[];
}) {
  const Chevron = expanded ? ChevronUp : ChevronDown;
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border p-4 sm:p-5 flex flex-col gap-3 shadow-sm transition-all ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-[#52796F]/25' : ''
      } ${
        expanded ? 'border-[#52796F]/30 ring-1 ring-[#1B4332]/10' : 'border-[#52796F]/10'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className={`h-9 w-9 rounded-full ${iconBg} flex items-center justify-center`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-[#52796F]">{label}</span>
          {onClick && <Chevron className="h-3.5 w-3.5 text-[#52796F]/50" />}
        </div>
      </div>
      <div>
        {value !== null ? (
          <p className="text-2xl sm:text-3xl font-bold text-[#1B4332] leading-tight">
            {value}
            {unit && <span className="text-sm font-normal text-[#52796F] ml-1">{unit}</span>}
          </p>
        ) : (
          <p className="text-base text-[#52796F] italic">No data yet</p>
        )}
        <p className="text-xs text-[#52796F] mt-0.5">{sub}</p>
      </div>
      <SparkBars values={sparkValues} color={accentColor} />
      {expanded && detailRows && detailRows.length > 0 && (
        <div className="border-t border-[#52796F]/10 pt-3 space-y-2" onClick={e => e.stopPropagation()}>
          {detailRows.map((row, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-xs text-[#52796F]">{row.date}</span>
              <div className="text-right">
                <span className="text-xs font-semibold text-[#1B4332]">{row.value}</span>
                {row.sub && <span className="text-xs text-[#52796F] ml-1">{row.sub}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      {expanded && (!detailRows || detailRows.length === 0) && (
        <p className="text-xs text-[#52796F] border-t border-[#52796F]/10 pt-3 text-center italic">No detail data available</p>
      )}
    </div>
  );
}

export default function WearablesPage() {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [dayRange, setDayRange] = useState<7 | 30 | 90>(30);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [showPillarDevices, setShowPillarDevices] = useState(false);
  const toggleCard = (id: string) => setExpandedCard(prev => prev === id ? null : id);
  const featuredProviders = PRIORITY_PROVIDERS.filter((provider) => !WEB_UNSUPPORTED_PROVIDERS.has(provider.slug));

  // Fetch connected devices
  const { data: connections = [], isLoading } = useQuery<WearableConnection[]>({
    queryKey: ['/api/wearables/connections'],
  });

  // Fetch active/unlockable pillars based on connected devices
  const { data: pillarsData } = useQuery<PillarsData>({
    queryKey: ['/api/wearables/pillars'],
    enabled: connections.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch historical biometric data for the selected day range
  const { data: histData, isLoading: histLoading } = useQuery<HistoricalData>({
    queryKey: ['/api/wearables/historical-data', dayRange],
    queryFn: () => apiRequest('GET', `/api/wearables/historical-data?days=${dayRange}`).then(r => r.json()),
    enabled: connections.length > 0,
    staleTime: 3 * 60 * 1000,
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const response = await apiRequest('POST', `/api/wearables/disconnect/${connectionId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wearables/connections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wearables/health-pulse'] });
      toast({
        title: 'Device disconnected',
        description: 'Your wearable device has been disconnected successfully.',
      });
    },
    onError: () => {
      toast({
        title: 'Disconnect failed',
        description: 'Failed to disconnect device. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/wearables/sync');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wearables/connections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wearables/health-pulse'] });
      toast({
        title: 'Sync initiated',
        description: 'Your wearable data is being synced.',
      });
    },
    onError: () => {
      toast({
        title: 'Sync failed',
        description: 'Failed to sync data. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Handle connect - opens Junction Link widget
  const handleConnect = async (provider?: string) => {
    if (provider && WEB_UNSUPPORTED_PROVIDERS.has(provider)) {
      toast({
        title: 'Provider not available yet',
        description: `${provider} is not currently supported in the web connection flow.`,
      });
      return;
    }

    setIsConnecting(true);

    const buildConnectQuery = (forceFresh: boolean) => {
      const cacheBust = `_=${Date.now()}`;
      const freshParam = forceFresh ? '&fresh=1' : '';
      return provider
        ? `?provider=${encodeURIComponent(provider)}${freshParam}&${cacheBust}`
        : `?${forceFresh ? 'fresh=1&' : ''}${cacheBust}`;
    };

    const requestConnect = async (forceFresh: boolean) => {
      const query = buildConnectQuery(forceFresh);
      const res = await apiRequest('GET', `/api/wearables/connect${query}`);

      if (res.status === 401) {
        toast({
          title: 'Authentication required',
          description: 'Please log in to connect your wearable.',
          variant: 'destructive',
        });
        window.location.href = '/login?next=/dashboard/wearables';
        return;
      }

      const data = await res.json();
      if (data?.linkUrl) {
        window.location.href = data.linkUrl;
        return;
      }

      throw new Error(data?.error || 'Failed to start the connection flow.');
    };

    try {
      await requestConnect(false);
    } catch (err) {
      console.error('Connect error', err);

      try {
        await requestConnect(true);
      } catch (retryErr: any) {
        console.error('Connect retry error', retryErr);
        toast({
          title: 'Connection error',
          description: retryErr?.message || 'Could not start the wearable connection flow. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = (connectionId: string) => {
    disconnectMutation.mutate(connectionId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Derived dashboard values
  const stats = histData?.statistics;
  const sleepSparkline = (histData?.data?.sleep  ?? []).map(s => s.totalMinutes ?? null);
  const stepsSparkline = (histData?.data?.activity ?? []).map(a => a.steps ?? null);
  const hrvSparkline   = (histData?.data?.sleep  ?? []).map(s => s.hrv ?? null);
  const calSparkline   = (histData?.data?.activity ?? []).map(a => a.caloriesActive ?? null);
  // Detail rows for expandable tiles
  const sleepRows: DetailRow[] = (histData?.data?.sleep ?? []).slice(0, 7).map(s => ({
    date: fmtDate(s.date),
    value: fmtSleep(s.totalMinutes),
    sub: s.totalMinutes ? undefined : undefined,
  }));
  const stepsRows: DetailRow[] = (histData?.data?.activity ?? []).slice(0, 7).map(a => ({
    date: fmtDate(a.date),
    value: a.steps != null ? fmtNum(a.steps) + ' steps' : '—',
    sub: a.activeMinutes ? `${a.activeMinutes}m active` : undefined,
  }));
  const hrvRows: DetailRow[] = (histData?.data?.sleep ?? []).filter(s => s.hrv != null).slice(0, 7).map(s => ({
    date: fmtDate(s.date),
    value: `${s.hrv}ms`,
  }));
  const calRows: DetailRow[] = (histData?.data?.activity ?? []).filter(a => a.caloriesActive != null).slice(0, 7).map(a => ({
    date: fmtDate(a.date),
    value: a.caloriesActive != null ? fmtNum(a.caloriesActive) + ' kcal' : '—',
  }));
  const workoutRows: DetailRow[] = (histData?.data?.workouts ?? []).slice(0, 7).map(w => ({
    date: fmtDate(w.date),
    value: w.type ? `${w.type}` : 'Workout',
    sub: w.durationMinutes ? `${w.durationMinutes}m` : undefined,
  }));
  // Workout sparklines from individual records
  const workoutDurationSparkline = (histData?.data?.workouts ?? []).map((w: any) => w.durationMinutes ?? null);
  const activePillars    = pillarsData?.activePillars    ?? [];
  const unlockablePillars = pillarsData?.unlockablePillars ?? [];
  const connectedConnections = connections.filter(connection => connection.status === 'connected');

  return (
    <div className="space-y-6 px-1 sm:px-0">

      {/* ── Page Header ── */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1B4332]">Wearable Devices</h1>
        <p className="text-sm sm:text-base text-[#52796F] mt-1">
          Connect your health devices to personalize your supplement formula.
        </p>
      </div>

      {/* ── Connected device chips or empty state ── */}
      {connectedConnections.length > 0 ? (
        <div className="flex items-center gap-3 flex-wrap">
          {connectedConnections.map(connection => {
            const colors = PROVIDER_COLORS[connection.provider] || { color: 'text-gray-600', bgColor: 'bg-gray-50' };
            return (
              <div key={connection.id} className="flex items-center gap-2 bg-white border border-[#52796F]/20 rounded-xl px-3 py-2 shadow-sm">
                <div className={`p-1.5 rounded-lg ${colors.bgColor}`}>
                  <ProviderLogo provider={connection.provider} size="sm" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1B4332] leading-tight">{connection.providerName}</p>
                  <p className="text-xs text-[#52796F] flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                    Syncing
                  </p>
                </div>
                <button
                  onClick={() => handleDisconnect(connection.id)}
                  className="ml-1 text-[#52796F]/50 hover:text-red-500 transition-colors"
                  title="Disconnect"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            );
          })}
          <div className="flex gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="border-[#1B4332] text-[#1B4332]"
            >
              {syncMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              <span className="ml-1.5 hidden sm:inline">Sync</span>
            </Button>
            <Button
              size="sm"
              onClick={() => handleConnect()}
              disabled={isConnecting}
              className="bg-[#1B4332] hover:bg-[#1B4332]/90"
            >
              {isConnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              <span className="ml-1.5">Add Device</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <Card className="border-dashed bg-[#FAF7F2] border-[#52796F]/30">
            <CardContent className="flex flex-col items-center justify-center py-10 px-4">
              <div className="h-14 w-14 rounded-full bg-[#1B4332]/10 flex items-center justify-center mb-4">
                <Watch className="h-7 w-7 text-[#1B4332]" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-[#1B4332]">No devices connected</h3>
              <p className="text-[#52796F] text-center text-sm max-w-md mb-5">
                Connect a wearable to unlock personalized supplement recommendations based on your sleep, activity, and recovery.
              </p>
              <Button onClick={() => handleConnect()} disabled={isConnecting} className="bg-[#1B4332] hover:bg-[#1B4332]/90">
                {isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />}
                Connect Your First Device
              </Button>
            </CardContent>
          </Card>

          {/* Featured integrations for new users */}
          <Card className="bg-[#FAF7F2] border-[#52796F]/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-[#1B4332]"><Sparkles className="h-5 w-5" />Featured Integrations</CardTitle>
              <CardDescription className="text-[#52796F]">Connect a device to start tracking your health</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {featuredProviders.map(provider => {
                  const colors = PROVIDER_COLORS[provider.slug] || { color: 'text-gray-600', bgColor: 'bg-gray-100' };
                  return (
                    <button
                      key={provider.slug}
                      onClick={() => handleConnect(provider.slug)}
                      disabled={isConnecting}
                      className="flex items-center gap-3 p-3 rounded-xl border-2 border-transparent bg-white/60 hover:bg-white hover:border-[#1B4332]/20 transition-all text-left disabled:opacity-60"
                    >
                      <div className={`p-2 rounded-lg ${colors.bgColor} flex-shrink-0`}>
                        <ProviderLogo provider={provider.slug} size="md" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm text-[#1B4332] block truncate">{provider.name}</span>
                        <p className="text-xs text-[#52796F] truncate">{provider.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Health Dashboard (connected only) ── */}
      {connectedConnections.length > 0 && (
        <Card className="bg-[#FAF7F2] border-[#52796F]/20 overflow-hidden">
          <CardHeader className="pb-3 border-b border-[#52796F]/10">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-[#1B4332] text-xl">Your Health Data</CardTitle>
              {/* Day-range selector */}
              <div className="flex items-center gap-1 bg-white border border-[#52796F]/20 rounded-lg p-1">
                {([7, 30, 90] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => setDayRange(d)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                      dayRange === d
                        ? 'bg-[#1B4332] text-white shadow-sm'
                        : 'text-[#52796F] hover:text-[#1B4332]'
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6">
            {histLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
              </div>
            ) : (
              <>
                {/* 4 Stat Tiles */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <StatTile
                    icon={Moon} iconBg="bg-indigo-100" iconColor="text-indigo-600" accentColor="#6366F1"
                    label="Sleep" unit="" sub="avg per night"
                    value={stats?.sleep?.avgDuration != null ? fmtSleep(stats.sleep.avgDuration) : null}
                    sparkValues={sleepSparkline}
                    onClick={() => toggleCard('sleep')}
                    expanded={expandedCard === 'sleep'}
                    detailRows={sleepRows}
                  />
                  <StatTile
                    icon={Footprints} iconBg="bg-emerald-100" iconColor="text-emerald-600" accentColor="#10B981"
                    label="Steps" unit="" sub="avg per day"
                    value={stats?.activity?.avgSteps != null ? fmtNum(stats.activity.avgSteps) : null}
                    sparkValues={stepsSparkline}
                    onClick={() => toggleCard('steps')}
                    expanded={expandedCard === 'steps'}
                    detailRows={stepsRows}
                  />
                  <StatTile
                    icon={Heart} iconBg="bg-rose-100" iconColor="text-rose-600" accentColor="#EF4444"
                    label="HRV" unit="ms" sub="avg heart rate variability"
                    value={stats?.sleep?.avgHRV?.toString() ?? null}
                    sparkValues={hrvSparkline}
                    onClick={() => toggleCard('hrv')}
                    expanded={expandedCard === 'hrv'}
                    detailRows={hrvRows}
                  />
                  <StatTile
                    icon={Flame} iconBg="bg-amber-100" iconColor="text-amber-600" accentColor="#F59E0B"
                    label="Active Cals" unit="kcal" sub="avg burned per day"
                    value={stats?.activity?.avgCaloriesActive != null ? fmtNum(stats.activity.avgCaloriesActive) : null}
                    sparkValues={calSparkline}
                    onClick={() => toggleCard('cals')}
                    expanded={expandedCard === 'cals'}
                    detailRows={calRows}
                  />
                </div>

                {/* Workout stat tiles */}
                {(stats?.workouts?.totalCount ?? 0) > 0 && (
                  <div className="mt-3 sm:mt-4 grid grid-cols-3 gap-3 sm:gap-4">
                    <StatTile
                      icon={Dumbbell} iconBg="bg-violet-100" iconColor="text-violet-600" accentColor="#8B5CF6"
                      label="Sessions" unit="" sub={`in ${dayRange} days`}
                      value={String(stats!.workouts.totalCount)}
                      sparkValues={workoutDurationSparkline}
                      onClick={() => toggleCard('workouts')}
                      expanded={expandedCard === 'workouts'}
                      detailRows={workoutRows}
                    />
                    <StatTile
                      icon={Activity} iconBg="bg-sky-100" iconColor="text-sky-600" accentColor="#0EA5E9"
                      label="Per Week" unit="" sub="avg frequency"
                      value={String(stats!.workouts.avgPerWeek)}
                      sparkValues={workoutDurationSparkline}
                      onClick={() => toggleCard('workouts')}
                      expanded={expandedCard === 'workouts'}
                      detailRows={workoutRows}
                    />
                    <StatTile
                      icon={Clock} iconBg="bg-teal-100" iconColor="text-teal-600" accentColor="#14B8A6"
                      label="Avg Duration" unit="" sub={stats!.workouts.mostCommonType ? `usually ${stats!.workouts.mostCommonType}` : 'per session'}
                      value={stats!.workouts.avgDuration ? `${stats!.workouts.avgDuration}m` : null}
                      sparkValues={workoutDurationSparkline}
                      onClick={() => toggleCard('workouts')}
                      expanded={expandedCard === 'workouts'}
                      detailRows={workoutRows}
                    />
                  </div>
                )}

                {/* Empty state */}
                {(histData?.data?.sleep?.length ?? 0) === 0 && (histData?.data?.activity?.length ?? 0) === 0 && !histLoading && (
                  <div className="text-center py-8 mt-2">
                    <p className="text-[#52796F] text-sm">No biometric data yet — sync your device or wait for the first automatic pull.</p>
                    <Button variant="outline" size="sm" className="mt-3 border-[#1B4332] text-[#1B4332]" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
                      {syncMutation.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-2 h-3.5 w-3.5" />}
                      Sync Now
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Data Pillars (connected only) ── */}
      {connectedConnections.length > 0 && (activePillars.length > 0 || unlockablePillars.length > 0) && (
        <Card className="bg-[#FAF7F2] border-[#52796F]/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-[#1B4332] text-base flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Data Pillars
              </CardTitle>
              {unlockablePillars.length > 0 && (
                <button
                  onClick={() => setShowPillarDevices(true)}
                  className="text-xs font-medium text-[#1B4332] hover:underline flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Add device to unlock more
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="flex flex-wrap gap-2">
              {/* Active pillars */}
              {activePillars.map(pillar => {
                const def = PILLAR_DEFS.find(p => p.id === pillar);
                if (!def) return null;
                const Icon = def.icon;
                return (
                  <div key={pillar} className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-[#1B4332] rounded-full px-3 py-1.5 text-sm font-medium">
                    <Icon className="h-3.5 w-3.5 text-emerald-600" />
                    {def.label}
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  </div>
                );
              })}
              {/* Locked pillars — muted chips */}
              {unlockablePillars.map(up => {
                const def = PILLAR_DEFS.find(p => p.id === up.pillar);
                if (!def) return null;
                const Icon = def.icon;
                return (
                  <button
                    key={up.pillar}
                    onClick={() => setShowPillarDevices(true)}
                    title={`Unlock ${up.label}: ${up.description}`}
                    className="flex items-center gap-1.5 bg-white border border-dashed border-[#52796F]/30 text-[#52796F] rounded-full px-3 py-1.5 text-sm hover:border-[#1B4332]/40 hover:text-[#1B4332] transition-colors"
                  >
                    <Icon className="h-3.5 w-3.5 opacity-50" />
                    {def.label}
                    <Lock className="h-3 w-3 opacity-40" />
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Featured Integrations (connected — add more) ── */}
      {connectedConnections.length > 0 && (
        <Card className="bg-[#FAF7F2] border-[#52796F]/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-[#1B4332]"><Sparkles className="h-5 w-5" />Featured Integrations</CardTitle>
            <CardDescription className="text-[#52796F]">Add more devices to unlock additional health pillars</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {featuredProviders.map(provider => {
                const colors = PROVIDER_COLORS[provider.slug] || { color: 'text-gray-600', bgColor: 'bg-gray-100' };
                const isConnected = connectedConnections.some(c => c.provider === provider.slug || c.provider === provider.slug.replace('_v2', ''));
                return (
                  <button
                    key={provider.slug}
                    onClick={() => {
                      if (!isConnected) {
                        handleConnect(provider.slug);
                      }
                    }}
                    disabled={isConnected || isConnecting}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                      isConnected
                        ? 'border-emerald-400 bg-emerald-50/50'
                        : 'border-transparent bg-white/60 hover:bg-white hover:border-[#1B4332]/20'
                    } text-left disabled:cursor-default disabled:opacity-100`}
                  >
                    <div className={`p-2 rounded-lg ${colors.bgColor} flex-shrink-0`}>
                        <ProviderLogo provider={provider.slug} size="md" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-[#1B4332] truncate">{provider.name}</span>
                        {isConnected && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-[#52796F] truncate">{provider.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-[#52796F] mt-4">Historical data up to 180 days is automatically imported for AI formula analysis.</p>
          </CardContent>
        </Card>
      )}

      {/* ── Pillar Devices Modal ── */}
      <Dialog open={showPillarDevices} onOpenChange={setShowPillarDevices}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#1B4332] flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Health Data Pillars
            </DialogTitle>
            <DialogDescription className="text-[#52796F]">
              See which devices unlock each health pillar. Connected devices are highlighted in green.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {/* Active Pillars */}
            {activePillars.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[#1B4332] mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Active Pillars
                </h3>
                <div className="space-y-3">
                  {activePillars.map(pillarId => {
                    const def = PILLAR_DEFS.find(p => p.id === pillarId);
                    if (!def) return null;
                    const Icon = def.icon;
                    const devices = PILLAR_DEVICE_MAP[pillarId] || [];
                    
                    return (
                      <div key={pillarId} className="bg-emerald-50/50 border border-emerald-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className="h-4 w-4 text-emerald-600" />
                          <span className="font-medium text-sm text-[#1B4332]">{def.label}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {devices.map(device => {
                            const isConnected = connectedConnections.some(c => c.provider === device.slug || c.provider === device.slug.replace('_v2', ''));
                            return (
                              <div
                                key={device.slug}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs ${
                                  isConnected
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-white border border-gray-200 text-gray-600'
                                }`}
                              >
                                {device.name}
                                {isConnected && <CheckCircle2 className="h-3 w-3" />}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Unlockable Pillars */}
            {unlockablePillars.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[#1B4332] mb-3 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-[#52796F]" />
                  Unlock More Pillars
                </h3>
                <div className="space-y-3">
                  {unlockablePillars.map(up => {
                    const def = PILLAR_DEFS.find(p => p.id === up.pillar);
                    if (!def) return null;
                    const Icon = def.icon;
                    
                    return (
                      <div key={up.pillar} className="bg-white border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="h-4 w-4 text-[#52796F]" />
                          <span className="font-medium text-sm text-[#1B4332]">{up.label}</span>
                        </div>
                        <p className="text-xs text-[#52796F] mb-2">{up.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {up.suggestedProviders.map(device => {
                            const isConnected = connectedConnections.some(c => c.provider === device.slug || c.provider === device.slug.replace('_v2', ''));
                            return (
                              <button
                                key={device.slug}
                                onClick={() => {
                                  setShowPillarDevices(false);
                                  handleConnect(device.slug);
                                }}
                                disabled={isConnected}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors ${
                                  isConnected
                                    ? 'bg-emerald-500 text-white cursor-default'
                                    : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-[#1B4332]/30'
                                }`}
                              >
                                {device.name}
                                {isConnected && <CheckCircle2 className="h-3 w-3" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t">
            <Button
              onClick={() => handleConnect()}
              disabled={isConnecting}
              className="w-full bg-[#52796F] hover:bg-[#1B4332]"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Connect New Device
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
