import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Button } from '@/shared/components/ui/button';
import {
  Activity,
  Heart,
  Moon,
  Footprints,
  Wifi,
  WifiOff,
  FlaskConical,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';

interface TodayMetrics {
  sleepMinutes: number | null;
  deepSleepMinutes: number | null;
  sleepScore: number | null;
  hrvMs: number | null;
  steps: number | null;
  activeMinutes: number | null;
}

interface Trends {
  dates: string[];
  sleepMinutes: (number | null)[];
  hrv: (number | null)[];
  steps: (number | null)[];
}

interface LabMarker {
  name: string;
  value: string;
  unit: string;
  status: 'normal' | 'high' | 'low' | 'critical';
  referenceRange: string;
}

interface HealthPulseData {
  connected: boolean;
  providers: string[];
  today: TodayMetrics;
  trends: Trends;
  labMarkers: LabMarker[];
  labReportDate: string | null;
  lastUpdated: string;
}

// Tiny inline sparkline bar chart
function SparkBars({ values, color = '#1B4332' }: { values: (number | null)[]; color?: string }) {
  const validValues = values.filter((v): v is number => v !== null);
  const max = validValues.length > 0 ? Math.max(...validValues) : 1;

  return (
    <div className="flex items-end gap-0.5 h-8">
      {values.map((v, i) => {
        const height = v !== null && max > 0 ? Math.max(8, Math.round((v / max) * 32)) : 4;
        return (
          <div
            key={i}
            className="flex-1 rounded-t-sm transition-all"
            style={{
              height: `${height}px`,
              backgroundColor: v !== null ? color : '#E8F0EC',
              opacity: i === values.length - 1 ? 1 : 0.5 + (i / values.length) * 0.5,
            }}
          />
        );
      })}
    </div>
  );
}

// Trend arrow compared last value vs 3-day average
function TrendBadge({ values }: { values: (number | null)[] }) {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length < 2) return null;

  const last = valid[valid.length - 1];
  const prev = valid.slice(0, -1).reduce((a, b) => a + b, 0) / (valid.length - 1);
  const pct = prev > 0 ? ((last - prev) / prev) * 100 : 0;

  if (Math.abs(pct) < 3) {
    return <Minus className="w-3 h-3 text-[#52796F]" />;
  }
  if (pct > 0) {
    return <ArrowUpRight className="w-3 h-3 text-emerald-600" />;
  }
  return <ArrowDownRight className="w-3 h-3 text-amber-500" />;
}

function formatSleep(minutes: number | null): string {
  if (minutes === null) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function formatNumber(n: number | null, unit = ''): string {
  if (n === null) return '—';
  const formatted = n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;
  return unit ? `${formatted} ${unit}` : formatted;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  normal: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  high: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  low: { bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500' },
  critical: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
};

function LabMarkerPill({ marker }: { marker: LabMarker }) {
  const colors = STATUS_COLORS[marker.status] || STATUS_COLORS.normal;
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${colors.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors.dot}`} />
      <span className={`text-xs font-medium ${colors.text} truncate max-w-[80px]`} title={marker.name}>
        {marker.name}
      </span>
      <span className={`text-xs ${colors.text} opacity-80 flex-shrink-0`}>
        {marker.value}{marker.unit ? ` ${marker.unit}` : ''}
      </span>
    </div>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
  sub,
  sparkValues,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  sparkValues?: (number | null)[];
}) {
  return (
    <div className="bg-[#1B4332]/[0.03] rounded-xl p-3 flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 text-[#52796F]" />
          <span className="text-[11px] font-medium text-[#52796F] uppercase tracking-wide">{label}</span>
        </div>
        {sparkValues && <TrendBadge values={sparkValues} />}
      </div>
      <div className="text-lg font-semibold text-[#1B4332] leading-tight">{value}</div>
      {sub && <div className="text-[11px] text-[#52796F]">{sub}</div>}
      {sparkValues && (
        <div className="mt-1">
          <SparkBars values={sparkValues} />
        </div>
      )}
    </div>
  );
}

function NoDeviceState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
      <div className="w-12 h-12 rounded-full bg-[#1B4332]/5 flex items-center justify-center">
        <WifiOff className="w-6 h-6 text-[#52796F]" />
      </div>
      <div>
        <p className="text-sm font-medium text-[#1B4332]">No device connected</p>
        <p className="text-xs text-[#52796F] mt-0.5">Connect a wearable to see your daily health data</p>
      </div>
      <Button asChild variant="outline" size="sm" className="border-[#1B4332] text-[#1B4332] hover:bg-[#1B4332] hover:text-white rounded-full">
        <Link href="/dashboard/wearables">Connect device</Link>
      </Button>
    </div>
  );
}

export function HealthPulseCard() {
  const { data, isLoading, error } = useQuery<HealthPulseData>({
    queryKey: ['/api/wearables/health-pulse'],
    staleTime: 5 * 60 * 1000, // 5 mins
  });

  return (
    <Card className="bg-white border-[#1B4332]/10 hover:border-[#1B4332]/20 hover:shadow-md transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#1B4332]" />
            <CardTitle className="text-base font-semibold text-[#1B4332]">Health Pulse</CardTitle>
          </div>
          {!isLoading && data && (
            <Badge
              className={`text-[11px] gap-1 rounded-full ${
                data.connected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-[#1B4332]/5 text-[#52796F] border-[#1B4332]/10'
              }`}
              variant="outline"
            >
              {data.connected ? (
                <>
                  <Wifi className="w-2.5 h-2.5" />
                  {data.providers[0] || 'Connected'}
                </>
              ) : (
                <>
                  <WifiOff className="w-2.5 h-2.5" />
                  No device
                </>
              )}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
            <Skeleton className="h-20 rounded-xl" />
          </div>
        )}

        {error && (
          <p className="text-sm text-[#52796F] text-center py-4">Unable to load health data</p>
        )}

        {!isLoading && !error && data && !data.connected && <NoDeviceState />}

        {!isLoading && !error && data && data.connected && (
          <>
            {/* Today's snapshot grid */}
            <div className="grid grid-cols-2 gap-2">
              <MetricTile
                icon={Moon}
                label="Sleep"
                value={formatSleep(data.today.sleepMinutes)}
                sub={data.today.sleepScore ? `${data.today.sleepScore}% efficiency` : data.today.deepSleepMinutes ? `${formatSleep(data.today.deepSleepMinutes)} deep` : undefined}
                sparkValues={data.trends.sleepMinutes}
              />
              <MetricTile
                icon={Heart}
                label="HRV"
                value={data.today.hrvMs !== null ? `${data.today.hrvMs} ms` : '—'}
                sub="Heart rate variability"
                sparkValues={data.trends.hrv}
              />
              <MetricTile
                icon={Footprints}
                label="Steps"
                value={formatNumber(data.today.steps)}
                sub={data.today.steps !== null ? (data.today.steps >= 10000 ? 'Goal reached!' : `${Math.round((data.today.steps / 10000) * 100)}% of goal`) : undefined}
                sparkValues={data.trends.steps}
              />
              <MetricTile
                icon={Activity}
                label="Active"
                value={data.today.activeMinutes !== null ? `${data.today.activeMinutes} min` : '—'}
                sub="Active minutes today"
              />
            </div>

            {/* Lab markers section */}
            {data.labMarkers.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <FlaskConical className="w-3.5 h-3.5 text-[#52796F]" />
                    <span className="text-xs font-medium text-[#52796F] uppercase tracking-wide">Latest Blood Markers</span>
                  </div>
                  {data.labReportDate && (
                    <span className="text-[10px] text-[#52796F]/70">{data.labReportDate}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {data.labMarkers.map((marker, i) => (
                    <LabMarkerPill key={i} marker={marker} />
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2 text-[10px] text-[#52796F]/70">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />Normal</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />High</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-sky-500 inline-block" />Low</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />Critical</span>
                </div>
              </div>
            )}

            {data.labMarkers.length === 0 && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-[#1B4332]/[0.03] text-[#52796F]">
                <FlaskConical className="w-4 h-4 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium">No lab data yet</p>
                  <Link href="/dashboard/lab-reports" className="text-[11px] underline underline-offset-2">Upload blood test results</Link>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-[#52796F]/60">7-day trends shown in bars</span>
              <Link href="/dashboard/wearables" className="text-[11px] text-[#52796F] hover:text-[#1B4332] underline underline-offset-2 transition-colors">
                Manage devices
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
