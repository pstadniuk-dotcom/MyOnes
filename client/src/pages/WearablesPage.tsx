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
  Settings2,
  GripVertical,
  Eye,
  EyeOff,
  TrendingUp,
  Lightbulb,
  AlertTriangle,
  Pill,
  LucideIcon,
} from 'lucide-react';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { METRIC_CATALOG, METRIC_MAP, DEFAULT_VISIBLE_METRICS, metricsByPillar, type MetricDefinition } from '@shared/metricCatalog';

interface WearableConnection {
  id: string;
  userId: string;
  provider: string;
  providerName: string;
  status: 'connected' | 'disconnected' | 'error';
  connectedAt: string;
  lastSyncedAt: string | null;
  errorMessage?: string | null;
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
  oura: { color: 'text-[#0B0F1C]', bgColor: 'bg-[#054700]/5' },
  whoop_v2: { color: 'text-black', bgColor: 'bg-yellow-50' },
  whoop: { color: 'text-black', bgColor: 'bg-yellow-50' },
  peloton: { color: 'text-red-600', bgColor: 'bg-red-50' },
  freestyle_libre: { color: 'text-blue-500', bgColor: 'bg-blue-50' },
  apple_health_kit: { color: 'text-pink-600', bgColor: 'bg-pink-50' },
  withings: { color: 'text-[#054700]', bgColor: 'bg-[#054700]/5' },
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
  hammerhead: { color: 'text-[#054700]', bgColor: 'bg-[#054700]/5' },
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
    sleep: Record<string, any>[];
    activity: Record<string, any>[];
    body: Record<string, any>[];
    workouts: Record<string, any>[];
  };
  statistics: Record<string, Record<string, number | string | null>>;
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

// --- Icon lookup for catalog-driven rendering ---
const ICON_MAP: Record<string, LucideIcon> = {
  Moon, Footprints, Heart, Flame, Dumbbell, Activity, Clock, Scale,
  Droplets, HeartPulse, Salad, Zap,
};
function getIcon(name: string): LucideIcon { return ICON_MAP[name] ?? Activity; }

// --- Format a metric value for display ---
function formatMetric(val: number | null | undefined, format: string, unit: string): { display: string; unit: string } {
  if (val == null) return { display: '—', unit: '' };
  switch (format) {
    case 'sleep':   return { display: `${Math.floor(val / 60)}h ${Math.round(val % 60)}m`, unit: '' };
    case 'number':  return { display: val.toLocaleString(), unit };
    case 'integer': return { display: String(Math.round(val)), unit };
    case 'decimal1':return { display: (Math.round(val * 10) / 10).toFixed(1), unit };
    case 'percent': return { display: String(Math.round(val)), unit: unit || '%' };
    case 'weight':  return { display: (Math.round(val * 10) / 10).toFixed(1), unit };
    case 'distance': {
      const km = val / 1000;
      return { display: km >= 10 ? km.toFixed(0) : km.toFixed(1), unit: 'km' };
    }
    default:        return { display: String(val), unit };
  }
}

// --- Resolve a dot-path like "sleep.avgDuration" from an object ---
function resolvePath(obj: any, path: string): any {
  return path.split('.').reduce((o, k) => o?.[k], obj);
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
        onClick ? 'cursor-pointer hover:shadow-md hover:border-[#5a6623]/25' : ''
      } ${
        expanded ? 'border-[#5a6623]/30 ring-1 ring-[#054700]/10' : 'border-[#5a6623]/10'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className={`h-9 w-9 rounded-full ${iconBg} flex items-center justify-center`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-[#5a6623]">{label}</span>
          {onClick && <Chevron className="h-3.5 w-3.5 text-[#5a6623]/50" />}
        </div>
      </div>
      <div>
        {value !== null ? (
          <p className="text-2xl sm:text-3xl font-bold text-[#054700] leading-tight">
            {value}
            {unit && <span className="text-sm font-normal text-[#5a6623] ml-1">{unit}</span>}
          </p>
        ) : (
          <p className="text-base text-[#5a6623] italic">No data yet</p>
        )}
        <p className="text-xs text-[#5a6623] mt-0.5">{sub}</p>
      </div>
      <SparkBars values={sparkValues} color={accentColor} />
      {expanded && detailRows && detailRows.length > 0 && (
        <div className="border-t border-[#5a6623]/10 pt-3 space-y-2" onClick={e => e.stopPropagation()}>
          {detailRows.map((row, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-xs text-[#5a6623]">{row.date}</span>
              <div className="text-right">
                <span className="text-xs font-semibold text-[#054700]">{row.value}</span>
                {row.sub && <span className="text-xs text-[#5a6623] ml-1">{row.sub}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      {expanded && (!detailRows || detailRows.length === 0) && (
        <p className="text-xs text-[#5a6623] border-t border-[#5a6623]/10 pt-3 text-center italic">No detail data available</p>
      )}
    </div>
  );
}

// ─── Customize Metrics Modal ──────────────────────────────────────────

const PILLAR_ORDER: string[] = ['sleep', 'recovery', 'activity', 'body', 'workouts'];
const PILLAR_LABELS: Record<string, string> = {
  sleep: 'Sleep', recovery: 'Recovery', activity: 'Activity',
  body: 'Body', workouts: 'Workouts', heart: 'Heart',
  glucose: 'Glucose', nutrition: 'Nutrition',
};

function CustomizeMetricsModal({
  open,
  onOpenChange,
  visibleMetricIds,
  metricsWithData,
  connectedProviders,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visibleMetricIds: string[];
  metricsWithData: string[];
  connectedProviders: string[];
}) {
  const { toast } = useToast();
  const [selected, setSelected] = useState<string[]>(visibleMetricIds);
  const [saving, setSaving] = useState(false);

  // Sync local state when modal opens or prefs change
  useEffect(() => {
    if (open) {
      setSelected(visibleMetricIds);
    }
  }, [open, visibleMetricIds]);

  const toggle = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiRequest('PUT', '/api/users/me/metric-preferences', { metrics: selected });
      queryClient.invalidateQueries({ queryKey: ['/api/users/me/metric-preferences'] });
      toast({ title: 'Metrics updated', description: `Showing ${selected.length} metric${selected.length === 1 ? '' : 's'} on your dashboard.` });
      onOpenChange(false);
    } catch {
      toast({ title: 'Save failed', description: 'Could not save your metric preferences.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => { setSelected([...DEFAULT_VISIBLE_METRICS]); };

  const grouped = metricsByPillar();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#054700] flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Customize Health Metrics
          </DialogTitle>
          <DialogDescription className="text-[#5a6623]">
            Choose which metrics appear on your dashboard. Metrics with data from your connected devices are highlighted.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-4">
          {PILLAR_ORDER.map(pillarId => {
            const metrics = grouped[pillarId as keyof typeof grouped];
            if (!metrics || metrics.length === 0) return null;
            return (
              <div key={pillarId}>
                <h3 className="text-sm font-semibold text-[#054700] mb-2 flex items-center gap-2">
                  {(() => { const Icon = getIcon(metrics[0].icon); return <Icon className="h-4 w-4 text-[#5a6623]" />; })()}
                  {PILLAR_LABELS[pillarId] || pillarId}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {metrics.map(metric => {
                    const isSelected = selected.includes(metric.id);
                    const hasDataForMetric = metricsWithData.includes(metric.id);
                    const providerMatch = metric.providers.some(p => connectedProviders.includes(p) || connectedProviders.includes(p.replace('_v2', '')));
                    return (
                      <button
                        key={metric.id}
                        onClick={() => toggle(metric.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                          isSelected
                            ? 'border-[#054700] bg-[#054700]/5'
                            : hasDataForMetric
                              ? 'border-transparent bg-white hover:border-[#5a6623]/30'
                              : 'border-transparent bg-white/40 opacity-60 hover:opacity-80'
                        }`}
                      >
                        <div className={`h-8 w-8 rounded-full ${metric.iconBg} flex items-center justify-center flex-shrink-0`}>
                          {(() => { const Icon = getIcon(metric.icon); return <Icon className={`h-4 w-4 ${metric.iconColor}`} />; })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-[#054700] truncate">{metric.label}</span>
                            {hasDataForMetric && (
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0" title="Has data" />
                            )}
                          </div>
                          <p className="text-xs text-[#5a6623] truncate">{metric.subLabel}{metric.unit ? ` (${metric.unit})` : ''}</p>
                        </div>
                        <div className="flex-shrink-0">
                          {isSelected ? (
                            <Eye className="h-4 w-4 text-[#054700]" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-[#5a6623]/40" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#5a6623]/10">
          <button
            onClick={handleReset}
            className="text-xs text-[#5a6623] hover:text-[#054700] transition-colors"
          >
            Reset to defaults
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#5a6623]">{selected.length} selected</span>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#054700] hover:bg-[#054700]/90"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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

  // Fetch Weekly Brief (tiered health analysis)
  const { data: weeklyBrief, isLoading: briefLoading, isError: briefError } = useQuery<{
    tier: 'insufficient' | 'snapshot' | 'early_trends' | 'weekly' | 'full';
    daysOfData: number;
    narrative: string | null;
    actions: string[];
    formulaNote: string | null;
    generatedAt?: string;
    error?: string;
  }>({
    queryKey: ['/api/wearables/weekly-brief'],
    queryFn: () => apiRequest('GET', '/api/wearables/weekly-brief').then(r => r.json()),
    enabled: connections.length > 0 && !histLoading,
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });

  // --- Metric preferences (must be before any early return) ---
  const { data: metricPrefsData } = useQuery<{ metricPreferences: string[] | null }>({
    queryKey: ['/api/users/me/metric-preferences'],
    staleTime: 60 * 1000,
  });
  const [showCustomize, setShowCustomize] = useState(false);

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const response = await apiRequest('POST', `/api/wearables/disconnect/${connectionId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wearables/connections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wearables/health-pulse'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wearables/health-pulse-intelligence'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/wearables/health-pulse-intelligence'] });
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

  // Derived dashboard values (must be before early return for hook consistency)
  const stats = histData?.statistics;
  const activePillars    = pillarsData?.activePillars    ?? [];
  const unlockablePillars = pillarsData?.unlockablePillars ?? [];
  const connectedConnections = connections.filter(connection => connection.status === 'connected');
  const errorConnections = connections.filter(connection => connection.status === 'error');
  const activeConnections = connections.filter(connection => connection.status === 'connected' || connection.status === 'error');

  const savedPrefs = metricPrefsData?.metricPreferences;
  const visibleMetricIds = useMemo(() => savedPrefs ?? DEFAULT_VISIBLE_METRICS, [savedPrefs]);

  // Build sparkline + detail rows dynamically for a given metric
  const buildSparkline = useCallback((metric: MetricDefinition): (number | null)[] => {
    const dataArr = histData?.data?.[metric.dataCategory] ?? [];
    return dataArr.map((row: any) => row[metric.sparkPath] ?? null);
  }, [histData]);

  const buildDetailRows = useCallback((metric: MetricDefinition): DetailRow[] => {
    const dataArr = histData?.data?.[metric.dataCategory] ?? [];
    return dataArr.slice(0, 7).map((row: any) => {
      const raw = row[metric.sparkPath];
      const { display, unit } = formatMetric(raw, metric.format, metric.unit);
      return {
        date: fmtDate(row.date),
        value: display + (unit ? ` ${unit}` : ''),
      };
    }).filter((r: DetailRow) => r.value !== '—');
  }, [histData]);

  // Resolve stat value for a metric
  const getStatValue = useCallback((metric: MetricDefinition): string | null => {
    const raw = resolvePath(stats, metric.statPath);
    if (raw == null) return null;
    const { display, unit } = formatMetric(raw, metric.format, metric.unit);
    if (metric.id === 'workout_duration' && raw) return `${raw}m`;
    return display + (unit ? ` ${unit}` : '');
  }, [stats]);

  // Resolve visible metrics
  const visibleMetrics = useMemo(() => {
    return visibleMetricIds
      .map(id => METRIC_MAP.get(id))
      .filter((m): m is MetricDefinition => m != null);
  }, [visibleMetricIds]);

  // Check if an individual metric has data available
  const hasData = useCallback((metric: MetricDefinition): boolean => {
    const spark = buildSparkline(metric);
    if (spark.some(v => v != null)) return true;
    const statVal = resolvePath(stats, metric.statPath);
    return statVal != null;
  }, [buildSparkline, stats]);

  // Metrics with available data (for the customize modal)
  const metricsWithData = useMemo(() => {
    return METRIC_CATALOG.filter(m => hasData(m)).map(m => m.id);
  }, [hasData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Page Header ── */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#054700]">Wearable Devices</h1>
        <p className="text-sm sm:text-base text-[#5a6623] mt-1">
          Connect your health devices to personalize your supplement formula.
        </p>
      </div>

      {/* ── Connected device chips or empty state ── */}
      {activeConnections.length > 0 ? (
        <div className="space-y-3">
          {/* Error connections — reconnect banner */}
          {errorConnections.map(connection => {
            const colors = PROVIDER_COLORS[connection.provider] || { color: 'text-[#054700]', bgColor: 'bg-[#054700]/5' };
            return (
              <div key={connection.id} className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 shadow-sm">
                <div className={`p-1.5 rounded-lg ${colors.bgColor}`}>
                  <ProviderLogo provider={connection.provider} size="sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#054700] leading-tight">{connection.providerName}</p>
                  <p className="text-xs text-amber-700 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                    {connection.errorMessage || 'Connection lost — please reconnect'}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleConnect(connection.provider)}
                  disabled={isConnecting}
                  className="bg-amber-600 hover:bg-amber-700 text-white flex-shrink-0"
                >
                  {isConnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  <span className="ml-1.5">Reconnect</span>
                </Button>
                <button
                  onClick={() => handleDisconnect(connection.id)}
                  className="text-[#5a6623]/50 hover:text-red-500 transition-colors flex-shrink-0"
                  title="Remove"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            );
          })}

          {/* Connected device chips */}
          <div className="flex items-center gap-3 flex-wrap">
          {connectedConnections.map(connection => {
            const colors = PROVIDER_COLORS[connection.provider] || { color: 'text-[#054700]', bgColor: 'bg-[#054700]/5' };
            return (
              <div key={connection.id} className="flex items-center gap-2 bg-white border border-[#5a6623]/20 rounded-xl px-3 py-2 shadow-sm">
                <div className={`p-1.5 rounded-lg ${colors.bgColor}`}>
                  <ProviderLogo provider={connection.provider} size="sm" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#054700] leading-tight">{connection.providerName}</p>
                  <p className="text-xs text-[#5a6623] flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                    Syncing
                  </p>
                </div>
                <button
                  onClick={() => handleDisconnect(connection.id)}
                  className="ml-1 text-[#5a6623]/50 hover:text-red-500 transition-colors"
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
              className="border-[#054700] text-[#054700]"
            >
              {syncMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              <span className="ml-1.5 hidden sm:inline">Sync</span>
            </Button>
            <Button
              size="sm"
              onClick={() => handleConnect()}
              disabled={isConnecting}
              className="bg-[#054700] hover:bg-[#054700]/90"
            >
              {isConnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              <span className="ml-1.5">Add Device</span>
            </Button>
          </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <Card className="border-dashed bg-white border-[#5a6623]/30">
            <CardContent className="flex flex-col items-center justify-center py-10 px-4">
              <div className="h-14 w-14 rounded-full bg-[#054700]/10 flex items-center justify-center mb-4">
                <Watch className="h-7 w-7 text-[#054700]" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-[#054700]">No devices connected</h3>
              <p className="text-[#5a6623] text-center text-sm max-w-md mb-5">
                Connect a wearable to unlock personalized supplement recommendations based on your sleep, activity, and recovery.
              </p>
              <Button onClick={() => handleConnect()} disabled={isConnecting} className="bg-[#054700] hover:bg-[#054700]/90">
                {isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />}
                Connect Your First Device
              </Button>
            </CardContent>
          </Card>

          {/* Featured integrations for new users */}
          <Card className="border-[#5a6623]/10 shadow-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-[#054700]"><Sparkles className="h-5 w-5" />Featured Integrations</CardTitle>
              <CardDescription className="text-[#5a6623]">Connect a device to start tracking your health</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {featuredProviders.map(provider => {
                  const colors = PROVIDER_COLORS[provider.slug] || { color: 'text-[#054700]', bgColor: 'bg-[#054700]/5' };
                  return (
                    <button
                      key={provider.slug}
                      onClick={() => handleConnect(provider.slug)}
                      disabled={isConnecting}
                      className="flex items-center gap-3 p-3 rounded-xl border-2 border-transparent bg-white/60 hover:bg-white hover:border-[#054700]/20 transition-all text-left disabled:opacity-60"
                    >
                      <div className={`p-2 rounded-lg ${colors.bgColor} flex-shrink-0`}>
                        <ProviderLogo provider={provider.slug} size="md" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm text-[#054700] block truncate">{provider.name}</span>
                        <p className="text-xs text-[#5a6623] truncate">{provider.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── ONES Weekly Brief (connected only, hide when no data) ── */}
      {activeConnections.length > 0 && (briefLoading || weeklyBrief || briefError) && (
        <Card className="border-[#5a6623]/10 shadow-2xl overflow-hidden">
          <CardHeader className="pb-1">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-[#054700] text-base flex items-center gap-2">
                <img src="/ones-logo-icon.svg" alt="" className="h-5 w-5" />
                {weeklyBrief?.tier === 'snapshot' ? 'Your Health Snapshot' :
                 weeklyBrief?.tier === 'early_trends' ? 'Early Trends' :
                 'Your Weekly Brief'}
              </CardTitle>
              <div className="flex items-center gap-2">
                {weeklyBrief?.tier && weeklyBrief.tier !== 'insufficient' && (
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    weeklyBrief.tier === 'full' ? 'bg-emerald-100 text-emerald-700' :
                    weeklyBrief.tier === 'weekly' ? 'bg-blue-100 text-blue-700' :
                    'bg-[#054700]/5 text-[#5a6623]'
                  }`}>
                    {weeklyBrief.daysOfData}d of data
                  </span>
                )}
                {weeklyBrief?.generatedAt && (
                  <span className="text-[10px] text-[#5a6623]/60">
                    {new Date(weeklyBrief.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-1 pb-4 space-y-3">
            {briefLoading ? (
              <div className="space-y-2 animate-pulse">
                <Skeleton className="h-3 w-full bg-[#5a6623]/10" />
                <Skeleton className="h-3 w-full bg-[#5a6623]/10" />
                <Skeleton className="h-3 w-4/5 bg-[#5a6623]/10" />
                <div className="pt-2 space-y-1.5">
                  <Skeleton className="h-3 w-2/3 bg-[#5a6623]/10" />
                  <Skeleton className="h-3 w-1/2 bg-[#5a6623]/10" />
                </div>
              </div>
            ) : weeklyBrief?.narrative ? (
              <>
                {/* AI narrative */}
                <p className="text-sm text-[#5a6623] leading-relaxed">{weeklyBrief.narrative}</p>

                {/* Actions */}
                {weeklyBrief.actions.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <h4 className="text-xs font-semibold text-[#054700] uppercase tracking-wide flex items-center gap-1.5">
                      <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                      Recommended Actions
                    </h4>
                    <div className="space-y-1.5">
                      {weeklyBrief.actions.map((action, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-[#5a6623] bg-white/60 rounded-lg px-3 py-2 border border-[#5a6623]/10">
                          <span className="text-[#054700] font-medium mt-px">{idx + 1}.</span>
                          <span className="leading-relaxed">{action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Formula note */}
                {weeklyBrief.formulaNote && (
                  <div className="flex items-start gap-2 text-xs bg-[#054700]/5 rounded-lg px-3 py-2.5 border border-[#054700]/10">
                    <Pill className="h-3.5 w-3.5 text-[#054700] flex-shrink-0 mt-0.5" />
                    <span className="text-[#054700]/80 leading-relaxed">{weeklyBrief.formulaNote}</span>
                  </div>
                )}
              </>
            ) : weeklyBrief?.tier === 'insufficient' ? (
              <div className="flex items-center gap-2 text-sm text-[#5a6623] py-2">
                <Clock className="h-4 w-4 text-[#5a6623]" />
                <span>{weeklyBrief.narrative || 'Wear your device for a few more days to unlock your first health brief.'}</span>
              </div>
            ) : weeklyBrief?.error || briefError ? (
              <div className="flex items-center gap-2 text-sm text-[#5a6623] py-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>Unable to generate your weekly brief right now. Check back later.</span>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* ── Health Dashboard (connected only) ── */}
      {activeConnections.length > 0 && (
        <Card className="border-[#5a6623]/10 shadow-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-[#5a6623]/10">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-[#054700] text-xl">Your Health Data</CardTitle>
              <div className="flex items-center gap-2">
                {/* Customize button */}
                <button
                  onClick={() => setShowCustomize(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#5a6623] hover:text-[#054700] bg-white border border-[#5a6623]/20 rounded-lg transition-colors"
                  title="Customize metrics"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Customize</span>
                </button>
                {/* Day-range selector */}
                <div className="flex items-center gap-1 bg-white border border-[#5a6623]/20 rounded-lg p-1">
                  {([7, 30, 90] as const).map(d => (
                    <button
                      key={d}
                      onClick={() => setDayRange(d)}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                        dayRange === d
                          ? 'bg-[#054700] text-white shadow-sm'
                          : 'text-[#5a6623] hover:text-[#054700]'
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
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
                {/* Dynamic metric tiles */}
                {visibleMetrics.length > 0 && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {visibleMetrics.map(metric => {
                      const IconComp = getIcon(metric.icon);
                      const statVal = getStatValue(metric);
                      const sparkVals = buildSparkline(metric);
                      const detailRows = buildDetailRows(metric);
                      // Special sub-label for workout sessions
                      const subLabel = metric.id === 'workout_sessions' ? `in ${dayRange} days` :
                        metric.id === 'workout_duration' && stats?.workouts?.mostCommonType
                          ? `usually ${stats.workouts.mostCommonType}` : metric.subLabel;
                      return (
                        <StatTile
                          key={metric.id}
                          icon={IconComp}
                          iconBg={metric.iconBg}
                          iconColor={metric.iconColor}
                          accentColor={metric.accentColor}
                          label={metric.shortLabel}
                          unit=""
                          sub={subLabel}
                          value={statVal}
                          sparkValues={sparkVals}
                          onClick={() => toggleCard(metric.id)}
                          expanded={expandedCard === metric.id}
                          detailRows={detailRows}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Empty state */}
                {visibleMetrics.length === 0 && !histLoading && (
                  <div className="text-center py-8 mt-2">
                    <p className="text-[#5a6623] text-sm">No metrics selected. Click "Customize" to choose which metrics to display.</p>
                  </div>
                )}

                {(histData?.data?.sleep?.length ?? 0) === 0 && (histData?.data?.activity?.length ?? 0) === 0 && !histLoading && visibleMetrics.length > 0 && (
                  <div className="text-center py-8 mt-2">
                    <p className="text-[#5a6623] text-sm">No biometric data yet — sync your device or wait for the first automatic pull.</p>
                    <Button variant="outline" size="sm" className="mt-3 border-[#054700] text-[#054700]" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
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
      {activeConnections.length > 0 && (activePillars.length > 0 || unlockablePillars.length > 0) && (
        <Card className="border-[#5a6623]/10 shadow-2xl">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-[#054700] text-base flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Data Pillars
              </CardTitle>
              {unlockablePillars.length > 0 && (
                <button
                  onClick={() => setShowPillarDevices(true)}
                  className="text-xs font-medium text-[#054700] hover:underline flex items-center gap-1"
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
                  <div key={pillar} className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-[#054700] rounded-full px-3 py-1.5 text-sm font-medium">
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
                    className="flex items-center gap-1.5 bg-white border border-dashed border-[#5a6623]/30 text-[#5a6623] rounded-full px-3 py-1.5 text-sm hover:border-[#054700]/40 hover:text-[#054700] transition-colors"
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
      {activeConnections.length > 0 && (
        <Card className="border-[#5a6623]/10 shadow-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-[#054700]"><Sparkles className="h-5 w-5" />Featured Integrations</CardTitle>
            <CardDescription className="text-[#5a6623]">Add more devices to unlock additional health pillars</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {featuredProviders.map(provider => {
                const colors = PROVIDER_COLORS[provider.slug] || { color: 'text-[#054700]', bgColor: 'bg-[#054700]/5' };
                const isConnected = activeConnections.some(c => c.provider === provider.slug || c.provider === provider.slug.replace('_v2', ''));
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
                        : 'border-transparent bg-white/60 hover:bg-white hover:border-[#054700]/20'
                    } text-left disabled:cursor-default disabled:opacity-100`}
                  >
                    <div className={`p-2 rounded-lg ${colors.bgColor} flex-shrink-0`}>
                        <ProviderLogo provider={provider.slug} size="md" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-[#054700] truncate">{provider.name}</span>
                        {isConnected && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-[#5a6623] truncate">{provider.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-[#5a6623] mt-4">Historical data up to 180 days is automatically imported for AI formula analysis.</p>
          </CardContent>
        </Card>
      )}

      {/* ── Customize Metrics Modal ── */}
      <CustomizeMetricsModal
        open={showCustomize}
        onOpenChange={setShowCustomize}
        visibleMetricIds={visibleMetricIds}
        metricsWithData={metricsWithData}
        connectedProviders={activeConnections.map(c => c.provider)}
      />

      {/* ── Pillar Devices Modal ── */}
      <Dialog open={showPillarDevices} onOpenChange={setShowPillarDevices}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#054700] flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Health Data Pillars
            </DialogTitle>
            <DialogDescription className="text-[#5a6623]">
              See which devices unlock each health pillar. Connected devices are highlighted in green.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {/* Active Pillars */}
            {activePillars.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[#054700] mb-3 flex items-center gap-2">
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
                          <span className="font-medium text-sm text-[#054700]">{def.label}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {devices.map(device => {
                            const isConnected = activeConnections.some(c => c.provider === device.slug || c.provider === device.slug.replace('_v2', ''));
                            return (
                              <div
                                key={device.slug}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs ${
                                  isConnected
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-white border border-[#054700]/10 text-[#5a6623]'
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
                <h3 className="text-sm font-semibold text-[#054700] mb-3 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-[#5a6623]" />
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
                          <Icon className="h-4 w-4 text-[#5a6623]" />
                          <span className="font-medium text-sm text-[#054700]">{up.label}</span>
                        </div>
                        <p className="text-xs text-[#5a6623] mb-2">{up.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {up.suggestedProviders.map(device => {
                            const isConnected = activeConnections.some(c => c.provider === device.slug || c.provider === device.slug.replace('_v2', ''));
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
                                    : 'bg-white/40 border border-[#054700]/10 text-[#054700] hover:bg-white/60 hover:border-[#054700]/30'
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
              className="w-full bg-[#5a6623] hover:bg-[#054700]"
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
