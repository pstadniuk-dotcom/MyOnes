import { useState, useRef, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/shared/components/ui/alert-dialog';
import { Textarea } from '@/shared/components/ui/textarea';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import {
  FileText, Plus, Trash2, Loader2, Upload, ClipboardPaste, Eye, Edit2,
  TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, Activity,
  Heart, Beaker, ChevronDown, ChevronUp, Filter, Search, RefreshCw,
  Sparkles, Shield, ArrowUpRight, ArrowDownRight,
  UtensilsCrossed, Dumbbell, Info, MessageCircle, Ban,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/shared/hooks/use-toast';
import { queryClient, apiRequest, getAuthHeaders } from '@/shared/lib/queryClient';
import { buildApiUrl } from '@/shared/lib/api';
import { useLocation } from 'wouter';
import type { FileUpload, UserConsent } from '@shared/schema';

// ── Types ─────────────────────────────────────────────────────────────

interface LabSummaryPayload {
  labSummary?: string;
  labMarkers?: Array<{
    name: string;
    value: string | number;
    unit?: string;
    status?: 'normal' | 'high' | 'low' | 'critical';
  }>;
  labReportDate?: string | null;
  labChanges?: string[];
  labNextActions?: string[];
  labConfidenceSource?: string | null;
}

interface MarkerHistory {
  date: string;
  value: number | null;
  rawValue: string;
  unit: string;
  status: 'normal' | 'high' | 'low' | 'critical';
  reportId: string;
}

interface AggregatedBiomarker {
  key: string;
  name: string;
  category: string;
  latest: {
    value: number | null;
    rawValue: string;
    unit: string;
    referenceRange: string;
    status: 'normal' | 'high' | 'low' | 'critical';
    date: string;
    reportId: string;
  };
  previous: {
    value: number | null;
    rawValue: string;
    status: 'normal' | 'high' | 'low' | 'critical';
    date: string;
  } | null;
  delta: number | null;
  deltaAbsolute: number | null;
  trend: 'improving' | 'worsening' | 'stable' | 'new';
  clinicalDirection: string;
  history: MarkerHistory[];
  insight?: MarkerInsightData | null;
}

interface PanelScore {
  category: string;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  markerCount: number;
  inRange: number;
  outOfRange: number;
  critical: number;
  label: string;
}

interface HealthScore {
  overall: number;
  grade: string;
  label: string;
  panels: PanelScore[];
  momentum: 'improving' | 'declining' | 'steady' | 'new';
  momentumLabel: string;
}

interface FocusAction {
  type: 'lifestyle' | 'followup';
  text: string;
}

interface FocusArea {
  panel: string;
  emoji: string;
  grade: string;
  score: number;
  markers: Array<{
    name: string;
    value: string;
    unit: string;
    status: 'high' | 'low' | 'critical';
    refRange: string;
  }>;
  insight: string;
  actions: FocusAction[];
}

interface AnalysisSummary {
  headline: string;
  narrative: string;
  strengths: string[];      // panel names that are all-clear
  focusAreas: FocusArea[];  // troubled panels with embedded markers + advice
}

interface BiomarkersDashboard {
  markers: AggregatedBiomarker[];
  healthScore: HealthScore;
  analysisSummary: AnalysisSummary;
  summary: {
    totalMarkers: number;
    normal: number;
    high: number;
    low: number;
    critical: number;
    improving: number;
    worsening: number;
    stable: number;
    newMarkers: number;
  };
  reports: Array<{
    id: string;
    fileName: string;
    testDate: string | null;
    uploadedAt: string;
    testType: string | null;
    labName: string | null;
    markerCount: number;
    status: string;
  }>;
  comparison: {
    hasMultipleReports: boolean;
    latestReportDate: string | null;
    previousReportDate: string | null;
    changes: Array<{
      name: string;
      from: string;
      to: string;
      unit: string;
      trend: 'improving' | 'worsening' | 'stable';
      percentChange: number | null;
    }>;
  };
}

// ── Constants ──────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  normal:   { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500', label: 'Normal' },
  high:     { color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   dot: 'bg-amber-500',   label: 'High' },
  low:      { color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200',     dot: 'bg-blue-500',    label: 'Low' },
  critical: { color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',      dot: 'bg-red-500',     label: 'Critical' },
} as const;

const TREND_CONFIG = {
  improving: { color: 'text-emerald-600', icon: TrendingUp,   label: 'Improving' },
  worsening: { color: 'text-red-600',     icon: TrendingDown, label: 'Worsening' },
  stable:    { color: 'text-[#5a6623]',   icon: Minus,        label: 'Stable' },
  new:       { color: 'text-[#5a6623]',   icon: Plus,         label: 'New' },
} as const;

const CATEGORY_ICONS: Record<string, string> = {
  'Lipid Panel': '🫀',
  'Complete Blood Count': '🩸',
  'Metabolic Panel': '⚗️',
  'Liver Function': '🫁',
  'Thyroid': '🦋',
  'Vitamins & Minerals': '💊',
  'Hormones': '🧬',
  'Inflammation': '🔥',
  'Diabetes & Blood Sugar': '🍬',
  'Kidney Function': '🫘',
  'Cardiac': '❤️',
  'Omega & Fatty Acids': '🐟',
  'Urinalysis': '🧪',
  'Autoimmune & Immune': '🛡️',
  'Prostate': '🔬',
  'Toxicology & Metals': '☣️',
  'Blood Type': '🏷️',
  'Coagulation': '🩹',
  'Other': '📋',
};

const PANEL_FRIENDLY_NAMES: Record<string, string> = {
  'Lipid Panel': 'Heart & Cholesterol',
  'Complete Blood Count': 'Blood Cells & Oxygen',
  'Metabolic Panel': 'Metabolism & Organs',
  'Liver Function': 'Liver Health',
  'Thyroid': 'Thyroid Function',
  'Vitamins & Minerals': 'Vitamins & Minerals',
  'Hormones': 'Hormones & Energy',
  'Inflammation': 'Inflammation',
  'Diabetes & Blood Sugar': 'Blood Sugar',
  'Kidney Function': 'Kidney Health',
  'Cardiac': 'Heart Muscle',
  'Omega & Fatty Acids': 'Omega-3 & Fatty Acids',
  'Autoimmune & Immune': 'Immune System',
  'Prostate': 'Prostate Health',
  'Urinalysis': 'Urinalysis',
  'Toxicology & Metals': 'Heavy Metals',
  'Blood Type': 'Blood Type',
  'Coagulation': 'Blood Clotting',
  'Other': 'Other',
};

const ACTION_ICON: Record<FocusAction['type'], string> = {
  lifestyle: '🏃',
  followup: '📋',
};

const ACTION_LABEL: Record<FocusAction['type'], string> = {
  lifestyle: 'Lifestyle',
  followup: 'Follow-up',
};

// ── Sparkline Component ────────────────────────────────────────────────

function SparkLine({ values, status }: { values: (number | null)[]; status: string }) {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length < 2) return null;

  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const range = max - min || 1;
  const h = 28;
  const w = 72;
  const padding = 2;

  const points = values.map((v, i) => {
    if (v === null) return null;
    const x = padding + (i / Math.max(values.length - 1, 1)) * (w - padding * 2);
    const y = h - padding - ((v - min) / range) * (h - padding * 2);
    return { x, y };
  }).filter(Boolean) as { x: number; y: number }[];

  if (points.length < 2) return null;

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const strokeColor = status === 'normal' ? '#059669' : status === 'critical' ? '#dc2626' : status === 'high' ? '#d97706' : '#2563eb';

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="flex-shrink-0">
      <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
      {points.length > 0 && (
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="2.5" fill={strokeColor} />
      )}
    </svg>
  );
}

// ── Score Ring (circular gauge) ────────────────────────────────────────

function ScoreRing({ score, grade, size = 140, strokeWidth = 10 }: {
  score: number; grade: string; size?: number; strokeWidth?: number;
}) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score)) / 100;
  const offset = circ * (1 - pct);
  const center = size / 2;

  // Color based on score
  const color = score >= 90 ? '#059669' : score >= 80 ? '#0d9488' : score >= 70 ? '#d97706' : score >= 60 ? '#ea580c' : '#dc2626';
  const bgColor = score >= 90 ? '#d1fae5' : score >= 80 ? '#ccfbf1' : score >= 70 ? '#fef3c7' : score >= 60 ? '#ffedd5' : '#fee2e2';

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {/* Background track */}
        <circle cx={center} cy={center} r={r} fill="none" stroke={bgColor} strokeWidth={strokeWidth} />
        {/* Score arc */}
        <circle
          cx={center} cy={center} r={r} fill="none"
          stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color }}>{score}</span>
        <span className="text-sm font-semibold text-[#054700] -mt-0.5">{grade}</span>
      </div>
    </div>
  );
}

// ── Panel Score Bar ────────────────────────────────────────────────────

function PanelScoreBar({ panel }: { panel: PanelScore }) {
  const color = panel.score >= 90 ? 'bg-emerald-500' : panel.score >= 80 ? 'bg-teal-500' : panel.score >= 70 ? 'bg-amber-500' : panel.score >= 60 ? 'bg-orange-500' : 'bg-red-500';
  const textColor = panel.score >= 90 ? 'text-emerald-700' : panel.score >= 80 ? 'text-teal-700' : panel.score >= 70 ? 'text-amber-700' : panel.score >= 60 ? 'text-orange-700' : 'text-red-700';
  const icon = CATEGORY_ICONS[panel.category] || '📋';

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm flex-shrink-0 w-5 text-center">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-[#054700] truncate">{panel.category}</span>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className={`text-xs font-bold ${textColor}`}>{panel.score}</span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${panel.score >= 90 ? 'bg-emerald-100 text-emerald-700' : panel.score >= 80 ? 'bg-teal-100 text-teal-700' : panel.score >= 70 ? 'bg-amber-100 text-amber-700' : panel.score >= 60 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>{panel.grade}</span>
          </div>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color} transition-all duration-700 ease-out`} style={{ width: `${panel.score}%` }} />
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-[#5a6623]">{panel.inRange}/{panel.markerCount} in range</span>
          {panel.critical > 0 && <span className="text-[10px] text-red-600 font-medium">{panel.critical} critical</span>}
        </div>
      </div>
    </div>
  );
}

// ── Summary Stat Card ──────────────────────────────────────────────────

function SummaryCard({ label, value, icon: Icon, iconBg, iconColor, sub }: {
  label: string; value: number | string; icon: any; iconBg: string; iconColor: string; sub?: string;
}) {
  return (
    <div className="glass-card rounded-2xl border border-[#5a6623]/10 shadow-2xl shadow-lg shadow-[#054700]/5 p-4 flex flex-col gap-2 shadow-sm">
      <div className="flex items-center justify-between">
        <div className={`h-9 w-9 rounded-full ${iconBg} flex items-center justify-center`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <span className="text-xs font-medium text-[#5a6623]">{label}</span>
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-[#054700] leading-tight">{value}</p>
      {sub && <p className="text-xs text-[#5a6623]">{sub}</p>}
    </div>
  );
}

// ── Focus Area Card ────────────────────────────────────────────────────

function FocusAreaCard({ area }: { area: FocusArea }) {
  const friendlyName = PANEL_FRIENDLY_NAMES[area.panel] || area.panel;
  const gradeColor = area.score >= 80 ? 'bg-teal-100 text-teal-700' : area.score >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
  const barColor = area.score >= 80 ? 'bg-teal-500' : area.score >= 60 ? 'bg-amber-500' : 'bg-red-500';

  const lifestyleActions = area.actions.filter(a => a.type === 'lifestyle');
  const followupActions = area.actions.filter(a => a.type === 'followup');

  return (
    <div className="glass-card rounded-2xl border border-[#5a6623]/10 shadow-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{area.emoji}</span>
            <h3 className="text-base font-bold text-[#054700]">{friendlyName}</h3>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${gradeColor}`}>{area.grade}</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${barColor} transition-all duration-700 ease-out`} style={{ width: `${area.score}%` }} />
        </div>
      </div>

      {/* Abnormal markers */}
      <div className="px-5 py-3 bg-gray-50/50 border-y border-[#5a6623]/8">
        <div className="space-y-2">
          {area.markers.map((m, i) => {
            const isHigh = m.status === 'high' || m.status === 'critical';
            return (
              <div key={i} className="flex items-baseline justify-between gap-2">
                <span className="text-sm text-[#054700] font-medium truncate">{m.name}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-sm font-bold ${m.status === 'critical' ? 'text-red-600' : isHigh ? 'text-amber-600' : 'text-blue-600'}`}>
                    {m.value}{m.unit ? ` ${m.unit}` : ''}
                  </span>
                  <span className={`text-[10px] font-semibold ${m.status === 'critical' ? 'text-red-500' : isHigh ? 'text-amber-500' : 'text-blue-500'}`}>
                    {isHigh ? '▲' : '▼'} {m.status.toUpperCase()}
                  </span>
                </div>
              </div>
            );
          })}
          {area.markers.length > 0 && area.markers[0].refRange && (
            <p className="text-[11px] text-[#5a6623]/70">ref: {area.markers[0].refRange}</p>
          )}
        </div>
      </div>

      {/* Insight */}
      <div className="px-5 py-3">
        <p className="text-sm text-[#054700]/80 leading-relaxed">{area.insight}</p>
      </div>

      {/* Actions */}
      <div className="px-5 pb-4 space-y-2.5">
        {lifestyleActions.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wide mb-1">🏃 Lifestyle</p>
            {lifestyleActions.map((a, i) => (
              <p key={i} className="text-sm text-[#054700] pl-5 py-0.5 leading-snug">→ {a.text}</p>
            ))}
          </div>
        )}
        {followupActions.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-[#5a6623] uppercase tracking-wide mb-1">📋 Follow-up</p>
            {followupActions.map((a, i) => (
              <p key={i} className="text-sm text-[#054700] pl-5 py-0.5 leading-snug">→ {a.text}</p>
            ))}
          </div>
        )}
        {/* CTA to discuss supplements via AI chat */}
        <a
          href="/chat"
          className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-[#054700]/5 hover:bg-[#054700]/10 transition-colors group"
        >
          <span className="text-base">💬</span>
          <span className="text-sm font-medium text-[#054700] group-hover:underline">Discuss this with your AI practitioner</span>
          <span className="ml-auto text-[#5a6623] text-xs">→</span>
        </a>
      </div>
    </div>
  );
}

// ── Marker Insight Panel (AI-powered per-marker detail) ───────────────

interface MarkerInsightData {
  whyItMatters: string | null;
  yourResult: string | null;
  foodsToEat: string[];
  foodsToLimit: string[];
  activity: string | null;
}

interface MarkerContext {
  name: string;
  value: string;
  unit: string;
  status: string;
  referenceRange: string;
}

function MarkerInsightPanel({ insight, marker }: { insight?: MarkerInsightData | null; marker?: MarkerContext }) {
  const [, navigate] = useLocation();

  const handleDiscuss = () => {
    const name = marker?.name || 'this marker';
    const value = marker?.value || '';
    const unit = marker?.unit || '';
    const status = marker?.status || '';
    const ref = marker?.referenceRange || '';

    let message = `I'd like to discuss my ${name} result.`;
    if (value) {
      message += ` My latest value is ${value}${unit ? ' ' + unit : ''}`;
      if (ref) message += ` (reference range: ${ref})`;
      message += '.';
    }
    if (status && status !== 'normal') {
      message += ` It's flagged as ${status}.`;
    }
    message += ' What does this mean for my health, and what steps should I take?';

    localStorage.setItem('labMarkerDiscuss', message);
    navigate('/dashboard/chat?new=true');
  };

  if (!insight) return null;

  return (
    <div className="space-y-3">
      {/* Why It Matters */}
      {insight.whyItMatters && (
        <div>
          <h5 className="text-[11px] font-semibold text-[#5a6623] uppercase tracking-wide mb-1 flex items-center gap-1.5">
            <Info className="h-3 w-3" />
            Why It Matters
          </h5>
          <p className="text-sm text-[#054700] leading-relaxed">{insight.whyItMatters}</p>
        </div>
      )}

      {/* Your Result */}
      {insight.yourResult && (
        <div className="bg-[#ede8e2] rounded-lg p-3 border border-[#5a6623]/10">
          <h5 className="text-[11px] font-semibold text-[#5a6623] uppercase tracking-wide mb-1">Your Result</h5>
          <p className="text-sm text-[#054700] leading-relaxed">{insight.yourResult}</p>
        </div>
      )}

      {/* Foods: Eat + Limit side by side */}
      {(insight.foodsToEat.length > 0 || insight.foodsToLimit.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {insight.foodsToEat.length > 0 && (
            <div className="bg-emerald-50/60 rounded-lg p-3 border border-emerald-200/40">
              <h5 className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <UtensilsCrossed className="h-3 w-3" />
                Eat More
              </h5>
              <ul className="space-y-1">
                {insight.foodsToEat.map((food, i) => (
                  <li key={i} className="text-xs text-[#054700] flex items-start gap-1.5">
                    <span className="text-emerald-500 mt-0.5">•</span>
                    {food}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {insight.foodsToLimit.length > 0 && (
            <div className="bg-red-50/50 rounded-lg p-3 border border-red-200/30">
              <h5 className="text-[11px] font-semibold text-red-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Ban className="h-3 w-3" />
                Limit
              </h5>
              <ul className="space-y-1">
                {insight.foodsToLimit.map((food, i) => (
                  <li key={i} className="text-xs text-[#054700] flex items-start gap-1.5">
                    <span className="text-red-400 mt-0.5">•</span>
                    {food}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Activity & Lifestyle */}
      {insight.activity && (
        <div>
          <h5 className="text-[11px] font-semibold text-blue-600 uppercase tracking-wide mb-1 flex items-center gap-1.5">
            <Dumbbell className="h-3 w-3" />
            Activity & Lifestyle
          </h5>
          <p className="text-sm text-[#054700] leading-relaxed">{insight.activity}</p>
        </div>
      )}

      {/* Discuss link */}
      <button
        onClick={handleDiscuss}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#054700]/5 hover:bg-[#054700]/10 transition-colors group cursor-pointer"
      >
        <MessageCircle className="h-4 w-4 text-[#054700]" />
        <span className="text-sm font-medium text-[#054700] group-hover:underline">Discuss with your AI practitioner</span>
        <span className="ml-auto text-[#5a6623] text-xs">→</span>
      </button>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────

function deriveFallbackLabSummary(labReports?: FileUpload[]): string | null {
  if (!labReports || labReports.length === 0) return null;

  const latestCompleted = [...labReports]
    .filter((report: any) => report?.labReportData?.analysisStatus === 'completed')
    .sort((a, b) => new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime())[0];

  if (!latestCompleted) {
    return `${labReports.length} lab report${labReports.length > 1 ? 's are' : ' is'} uploaded. Analysis is still processing.`;
  }

  const extracted = Array.isArray((latestCompleted as any)?.labReportData?.extractedData)
    ? ((latestCompleted as any).labReportData.extractedData as any[]) : [];

  if (extracted.length === 0) {
    return 'Latest report is uploaded and being interpreted. Marker-level extraction will appear shortly.';
  }

  const abnormal = extracted.filter((m: any) => ['high', 'low', 'critical'].includes(String(m?.status || '').toLowerCase()));
  if (abnormal.length === 0) return 'Latest uploaded markers appear within normal ranges based on extracted data.';

  const names = abnormal.map((m: any) => m?.testName || m?.name).filter(Boolean).slice(0, 4).join(', ');
  return `Found ${abnormal.length} out-of-range marker${abnormal.length > 1 ? 's' : ''}${names ? `: ${names}` : ''}.`;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  // If already contains time info (ISO datetime), parse directly
  const dateObj = d.includes('T') ? new Date(d) : new Date(d + 'T12:00:00');
  if (isNaN(dateObj.getTime())) return '—';
  return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Module-level upload tracker (survives component unmounts) ──────────
type UploadEntry = { fileName: string; startedAt: number; promise: Promise<void> };
const activeUploads = new Map<string, UploadEntry>();
const uploadListeners = new Set<() => void>();
function notifyUploadListeners() { uploadListeners.forEach(fn => fn()); }
function useActiveUploads() {
  const [, rerender] = useState(0);
  useEffect(() => {
    const listener = () => rerender(n => n + 1);
    uploadListeners.add(listener);
    return () => { uploadListeners.delete(listener); };
  }, []);
  return activeUploads;
}

export default function LabReportsPage() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── UI state ─────────────────────────────────────────────────────────
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const uploads = useActiveUploads();
  const isUploading = uploads.size > 0;
  const uploadingFileName = uploads.size > 0 ? Array.from(uploads.values())[0]?.fileName : null;
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [showManualEntryDialog, setShowManualEntryDialog] = useState(false);
  const [manualEntryText, setManualEntryText] = useState('');
  const [selectedTestType, setSelectedTestType] = useState<'blood_test'>('blood_test');
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [loadingFiles, setLoadingFiles] = useState<Set<string>>(new Set());
  const [editingFiles, setEditingFiles] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedMarker, setExpandedMarker] = useState<string | null>(null);
  const [showReports, setShowReports] = useState(false);
  const [showAllMarkers, setShowAllMarkers] = useState(false);

  // ── Queries ──────────────────────────────────────────────────────────

  const { data: consents, error: consentsError } = useQuery<UserConsent[]>({
    queryKey: ['/api/consents'],
    enabled: isAuthenticated && !!user?.id,
    retry: 1,
  });

  const { data: labReports, isLoading: labReportsLoading } = useQuery<FileUpload[]>({
    queryKey: ['/api/files', 'user', user?.id, 'lab-reports'],
    enabled: isAuthenticated && !!user?.id,
    refetchInterval: (query) => {
      const reports = query.state.data as FileUpload[] | undefined;
      const hasProcessing = Array.isArray(reports) && reports.some((report: any) => {
        const status = String(report?.labReportData?.analysisStatus || '').toLowerCase();
        const mimeType = report.mimeType || '';
        const isPdf = mimeType === 'application/pdf' || mimeType.startsWith('image/');
        return status === 'processing' || status === 'pending' || (isPdf && status === '');
      });
      return hasProcessing ? 5000 : false;
    },
  });

  const { data: labSummary } = useQuery<LabSummaryPayload>({
    queryKey: ['/api/wearables/health-pulse'],
    enabled: isAuthenticated && !!user?.id,
    staleTime: 60 * 1000,
  });

  // Also preload the new intelligence endpoint so it's cached when user returns to dashboard
  useQuery({
    queryKey: ['/api/wearables/health-pulse-intelligence'],
    enabled: isAuthenticated && !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Track whether any report was recently processing so we can refetch biomarkers on completion
  const wasProcessingRef = useRef(false);

  const { data: dashboard, isLoading: dashboardLoading } = useQuery<BiomarkersDashboard>({
    queryKey: ['/api/labs/biomarkers'],
    queryFn: () => apiRequest('GET', '/api/labs/biomarkers').then(r => r.json()),
    enabled: isAuthenticated && !!user?.id,
    staleTime: 30 * 1000,
  });

  const hasLabDataConsent = consentsError ? false : (consents?.some(
    consent => consent.consentType === 'lab_data_processing' && !consent.revokedAt
  ) ?? false);

  const effectiveLabSummary = labSummary?.labSummary || deriveFallbackLabSummary(labReports);

  // ── Derived biomarker data ───────────────────────────────────────────

  const categories = useMemo(() => {
    if (!dashboard?.markers) return [];
    const cats = new Set(dashboard.markers.map(m => m.category));
    return Array.from(cats).sort();
  }, [dashboard?.markers]);

  const filteredMarkers = useMemo(() => {
    if (!dashboard?.markers) return [];
    return dashboard.markers.filter(m => {
      if (categoryFilter !== 'all' && m.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && m.latest.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q);
      }
      return true;
    });
  }, [dashboard?.markers, categoryFilter, statusFilter, searchQuery]);

  // ── Mutations ────────────────────────────────────────────────────────

  const grantConsentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/consents/grant', {
        consentType: 'lab_data_processing',
        granted: true,
        consentVersion: '1.0',
        consentText: 'User consents to lab data processing for personalized supplement recommendations'
      });
      return await response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/consents'] });
      setShowConsentDialog(false);
      if (pendingFile) {
        await new Promise(resolve => setTimeout(resolve, 500));
        await uploadFile(pendingFile);
        setPendingFile(null);
      }
    },
    onError: (error: Error) => {
      toast({ title: "Consent failed", description: error.message, variant: "destructive" });
    }
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const response = await apiRequest('DELETE', `/api/files/${fileId}`, null);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files', 'user', user?.id, 'lab-reports'] });
      queryClient.invalidateQueries({ queryKey: ['/api/labs/biomarkers'] });
      toast({ title: "File deleted", description: "Lab report has been permanently deleted." });
      setFileToDelete(null);
    },
    onError: (error: Error) => {
      toast({ title: "Delete failed", description: error.message || "Failed to delete file", variant: "destructive" });
    }
  });

  const reanalyzeMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const response = await apiRequest('POST', `/api/files/${fileId}/reanalyze`);
      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/files', 'user', user?.id, 'lab-reports'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/wearables/health-pulse'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/wearables/health-pulse-intelligence'] }),
      ]);
      toast({ title: 'Re-analysis started', description: 'Running in background now. You can leave this page and come back.' });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/files', 'user', user?.id, 'lab-reports'] });
        queryClient.invalidateQueries({ queryKey: ['/api/labs/biomarkers'] });
        queryClient.invalidateQueries({ queryKey: ['/api/wearables/health-pulse'] });
        queryClient.invalidateQueries({ queryKey: ['/api/wearables/health-pulse-intelligence'] });
      }, 5000);
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/files', 'user', user?.id, 'lab-reports'] });
        queryClient.invalidateQueries({ queryKey: ['/api/labs/biomarkers'] });
        queryClient.invalidateQueries({ queryKey: ['/api/wearables/health-pulse'] });
        queryClient.invalidateQueries({ queryKey: ['/api/wearables/health-pulse-intelligence'] });
      }, 15000);
    },
    onError: (error: Error) => {
      toast({ title: 'Re-analysis failed', description: error.message || 'Could not re-analyze this report.', variant: 'destructive' });
    },
  });

  // Auto-trigger reanalysis for unanalyzed lab files
  const autoReanalyzedRef = useRef(false);
  useEffect(() => {
    if (autoReanalyzedRef.current || !labReports || labReports.length === 0) return;
    const unanalyzed = labReports.filter((report: any) => {
      const mimeType = report.mimeType || '';
      const isPdf = mimeType === 'application/pdf' || mimeType.startsWith('image/');
      if (!isPdf) return false;
      const status = String(report?.labReportData?.analysisStatus || '').toLowerCase();
      return status === '' || status === 'error';
    });
    if (unanalyzed.length === 0) return;
    autoReanalyzedRef.current = true;
    unanalyzed.forEach(async (report: any) => {
      try { await apiRequest('POST', `/api/files/${report.id}/reanalyze`); } catch {}
    });
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['/api/files', 'user', user?.id, 'lab-reports'] });
    }, 8000);
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['/api/files', 'user', user?.id, 'lab-reports'] });
      queryClient.invalidateQueries({ queryKey: ['/api/labs/biomarkers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wearables/health-pulse'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wearables/health-pulse-intelligence'] });
    }, 20000);
  }, [labReports]);

  // ── File handlers ────────────────────────────────────────────────────

  const uploadFile = async (file: File) => {
    const uploadId = `${file.name}-${Date.now()}`;
    toast({ title: "Uploading lab report", description: `${file.name} is uploading. You can navigate away safely.` });

    const uploadPromise = (async () => {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'lab-report');
        formData.append('metadata', JSON.stringify({ uploadSource: 'lab-reports-page', originalName: file.name }));
        const response = await fetch(buildApiUrl('/api/files/upload'), {
          method: 'POST', headers: getAuthHeaders(), body: formData, credentials: 'include'
        });
        if (!response.ok) {
          const error = await response.json();
          if (response.status === 403) {
            setPendingFile(file);
            setShowConsentDialog(true);
            toast({ title: "Consent Required", description: "Please grant consent to process your health data before uploading." });
            return;
          }
          throw new Error(error.error || 'Upload failed');
        }
        await queryClient.invalidateQueries({ queryKey: ['/api/files', 'user', user?.id, 'lab-reports'] });
        queryClient.invalidateQueries({ queryKey: ['/api/labs/biomarkers'] });
        toast({ title: "Upload complete", description: `${file.name} was uploaded and is being analyzed.` });
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (error: any) {
        toast({ title: "Upload failed", description: error.message || "Please try again.", variant: "destructive" });
      } finally {
        activeUploads.delete(uploadId);
        notifyUploadListeners();
      }
    })();

    activeUploads.set(uploadId, { fileName: file.name, startedAt: Date.now(), promise: uploadPromise });
    notifyUploadListeners();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload a PDF, JPG, or PNG file.", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload a file smaller than 10MB.", variant: "destructive" });
      return;
    }
    if (hasLabDataConsent) { await uploadFile(file); }
    else { setPendingFile(file); setShowConsentDialog(true); }
  };

  const handleManualEntry = async () => {
    if (!manualEntryText.trim()) {
      toast({ title: "No data entered", description: "Please paste or type your lab results.", variant: "destructive" });
      return;
    }
    if (!hasLabDataConsent && !editingFileId) {
      setShowManualEntryDialog(false);
      const blob = new Blob([manualEntryText], { type: 'text/plain' });
      const fileName = `${selectedTestType}_manual_entry_${new Date().toISOString().split('T')[0]}.txt`;
      const file = new File([blob], fileName, { type: 'text/plain' });
      setPendingFile(file);
      setShowConsentDialog(true);
      return;
    }
    const manualUploadId = `manual-${Date.now()}`;
    const manualFileName = editingFileId ? 'Updating lab results...' : 'Saving lab results...';
    activeUploads.set(manualUploadId, { fileName: manualFileName, startedAt: Date.now(), promise: Promise.resolve() });
    notifyUploadListeners();
    setShowManualEntryDialog(false);
    try {
      const blob = new Blob([manualEntryText], { type: 'text/plain' });
      const fileName = `${selectedTestType}_manual_entry_${new Date().toISOString().split('T')[0]}.txt`;
      const file = new File([blob], fileName, { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', file);
      if (!editingFileId) {
        formData.append('type', 'lab_report');
        formData.append('testType', selectedTestType);
        formData.append('metadata', JSON.stringify({ uploadSource: 'manual-entry', testType: selectedTestType, originalName: fileName, manualEntry: true }));
      }
      const url = editingFileId ? buildApiUrl(`/api/files/${editingFileId}`) : buildApiUrl('/api/files/upload');
      const response = await fetch(url, { method: editingFileId ? 'PUT' : 'POST', headers: getAuthHeaders(), body: formData, credentials: 'include' });
      if (!response.ok) {
        const error = await response.json();
        if (response.status === 403 && !editingFileId) {
          activeUploads.delete(manualUploadId);
          notifyUploadListeners();
          setPendingFile(file);
          setShowConsentDialog(true);
          toast({ title: "Consent Required", description: "Please grant consent to process your health data." });
          return;
        }
        throw new Error(error.error || 'Save failed');
      }
      await queryClient.invalidateQueries({ queryKey: ['/api/files', 'user', user?.id, 'lab-reports'] });
      queryClient.invalidateQueries({ queryKey: ['/api/labs/biomarkers'] });
      toast({
        title: editingFileId ? "Lab results updated" : "Lab results saved",
        description: editingFileId ? "Your changes have been saved successfully." : "Your manually entered results have been saved successfully.",
      });
      setManualEntryText('');
      setEditingFileId(null);
    } catch (error: any) {
      toast({ title: "Save failed", description: error.message || "Please try again.", variant: "destructive" });
    } finally {
      activeUploads.delete(manualUploadId);
      notifyUploadListeners();
    }
  };

  const handleEditReport = async (report: FileUpload) => {
    if (report.mimeType === 'text/plain') {
      setEditingFiles(prev => new Set(prev).add(report.id));
      try {
        const response = await fetch(buildApiUrl(`/api/files/${report.id}/download?t=${Date.now()}`), {
          headers: getAuthHeaders(), credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to fetch file content');
        const text = await response.text();
        setManualEntryText(text);
        setEditingFileId(report.id);
        setShowManualEntryDialog(true);
      } catch {
        toast({ title: "Error", description: "Could not load report content for editing.", variant: "destructive" });
      } finally {
        setEditingFiles(prev => { const next = new Set(prev); next.delete(report.id); return next; });
      }
    }
  };

  const handleViewFile = async (fileId: string) => {
    setLoadingFiles(prev => new Set(prev).add(fileId));
    try {
      const response = await fetch(buildApiUrl(`/api/files/${fileId}/download?t=${Date.now()}`), {
        headers: getAuthHeaders(), credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch file');
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, '_blank');
    } catch {
      toast({ title: "Error", description: "Could not open the report. Please try again.", variant: "destructive" });
    } finally {
      setLoadingFiles(prev => { const next = new Set(prev); next.delete(fileId); return next; });
    }
  };

  const latestReportId = labReports?.[0]?.id;
  const summary = dashboard?.summary;
  const comparison = dashboard?.comparison;
  const hasDashboard = dashboard && dashboard.markers.length > 0;

  // Detect reports still being analyzed (server-side processing)
  const processingReports = useMemo(() => {
    if (!labReports) return [];
    return labReports.filter((r: any) => {
      const status = String(r?.labReportData?.analysisStatus || '').toLowerCase();
      return status === 'processing' || status === 'pending';
    });
  }, [labReports]);

  // When analysis finishes (processing → completed), refetch biomarkers dashboard
  useEffect(() => {
    const isProcessing = processingReports.length > 0;
    if (wasProcessingRef.current && !isProcessing) {
      // Reports just finished processing — refresh dashboard data
      queryClient.invalidateQueries({ queryKey: ['/api/labs/biomarkers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wearables/health-pulse'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wearables/health-pulse-intelligence'] });
    }
    wasProcessingRef.current = isProcessing;
  }, [processingReports]);

  // Corrective refetch: if completed reports exist but dashboard has no markers,
  // the cache is stale — refetch to catch up
  const correctedAtRef = useRef(0); // timestamp of last correction
  useEffect(() => {
    if (dashboardLoading || labReportsLoading) return;
    if (!labReports || labReports.length === 0) return;

    const hasCompleted = labReports.some((r: any) => {
      const ld = r?.labReportData;
      return ld?.analysisStatus === 'completed' && Array.isArray(ld?.extractedData) && ld.extractedData.length > 0;
    });

    // Debounce: only retry if >5s since last correction
    if (hasCompleted && !hasDashboard && Date.now() - correctedAtRef.current > 5000) {
      correctedAtRef.current = Date.now();
      queryClient.invalidateQueries({ queryKey: ['/api/labs/biomarkers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wearables/health-pulse'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wearables/health-pulse-intelligence'] });
    }
  }, [labReports, hasDashboard, dashboardLoading, labReportsLoading]);

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 px-1 sm:px-0" data-testid="page-lab-reports">

      {/* ── Page Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#054700]">Lab Reports</h1>
          <p className="text-sm sm:text-base text-[#5a6623] mt-1">
            Upload blood work and track your biomarkers over time
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setEditingFileId(null); setManualEntryText(''); setShowManualEntryDialog(true); }}
            disabled={isUploading}
            className="border-[#054700] text-[#054700] hover:bg-[#054700] hover:text-white"
          >
            <ClipboardPaste className="h-3.5 w-3.5 mr-1.5" />
            <span className="hidden sm:inline">Paste</span>
          </Button>
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="bg-[#054700] hover:bg-[#054700]/90"
          >
            {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
            Upload Report
          </Button>
        </div>
      </div>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileUpload} className="hidden" data-testid="input-file" />

      {/* ── Upload in Progress Banner ── */}
      {isUploading && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <Loader2 className="h-4 w-4 animate-spin text-amber-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800">
              Uploading &amp; analyzing: <span className="font-semibold">{uploadingFileName}</span>
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              This may take a moment. Your report will appear below when ready.
            </p>
          </div>
        </div>
      )}
      {!isUploading && processingReports.length > 0 && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-blue-800">
              Analyzing {processingReports.length === 1
                ? processingReports[0].originalFileName
                : `${processingReports.length} reports`}...
            </p>
            <p className="text-xs text-blue-600 mt-0.5">
              {(() => {
                const detail = (processingReports[0]?.labReportData as any)?.progressDetail;
                if (detail) return detail;
                return 'AI is extracting biomarkers and generating insights. Results will appear automatically.';
              })()}
            </p>
          </div>
        </div>
      )}

      {/* ── AI Insights ── */}
      {(effectiveLabSummary || hasDashboard) && (
        <Card className="border-[#5a6623]/10 shadow-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-[#5a6623]/10">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-[#054700] text-lg flex items-center gap-2">
                <img src="/ones-logo-icon.svg" alt="" className="h-5 w-5" />
                ONES AI Lab Analysis
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                className="border-[#054700] text-[#054700] hover:bg-[#054700] hover:text-white"
                disabled={!latestReportId || reanalyzeMutation.isPending}
                onClick={() => latestReportId && reanalyzeMutation.mutate(latestReportId)}
              >
                {reanalyzeMutation.isPending ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Re-analyzing...</>
                ) : (
                  <><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Re-analyze</>
                )}
              </Button>
            </div>
            {labSummary?.labReportDate && (
              <CardDescription className="text-[#5a6623]">
                Based on report dated {labSummary.labReportDate}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-5">

            {/* ── Health Score Hero ── */}
            {dashboard?.healthScore && dashboard.healthScore.overall > 0 && (
              <div className="glass-card rounded-2xl border border-[#5a6623]/10 shadow-2xl shadow-lg shadow-[#054700]/5 p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-8">
                  {/* Score Ring */}
                  <div className="flex flex-col items-center gap-1">
                    <ScoreRing score={dashboard.healthScore.overall} grade={dashboard.healthScore.grade} />
                    <span className="text-xs font-medium text-[#5a6623] mt-1">Lab Health Score</span>
                  </div>

                  {/* Right side — label + panels */}
                  <div className="flex-1 w-full space-y-4">
                    {/* Score headline */}
                    <div>
                      <h3 className="text-lg font-bold text-[#054700]">
                        {dashboard.healthScore.label}
                      </h3>
                      <p className="text-sm text-[#5a6623] mt-0.5 flex items-center gap-1.5">
                        {dashboard.healthScore.momentum === 'improving' && <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />}
                        {dashboard.healthScore.momentum === 'declining' && <TrendingDown className="h-3.5 w-3.5 text-red-600" />}
                        {dashboard.healthScore.momentum === 'steady' && <Minus className="h-3.5 w-3.5 text-[#5a6623]" />}
                        {dashboard.healthScore.momentumLabel}
                      </p>
                    </div>

                    {/* Panel breakdown */}
                    {dashboard.healthScore.panels.length > 0 && (
                      <div className="space-y-2.5">
                        <h4 className="text-xs font-semibold text-[#5a6623] uppercase tracking-wide">Panel Breakdown</h4>
                        <div className="grid gap-2.5 sm:grid-cols-2">
                          {dashboard.healthScore.panels.map(panel => (
                            <PanelScoreBar key={panel.category} panel={panel} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Summary + Changes ── */}
            {dashboard?.analysisSummary && dashboard.analysisSummary.headline && (
              <div className="space-y-4">
                {/* Headline + one-line narrative */}
                <div>
                  <h3 className="text-base font-bold text-[#054700] mb-1">{dashboard.analysisSummary.headline}</h3>
                  <p className="text-sm text-[#5a6623]">{dashboard.analysisSummary.narrative}</p>
                </div>

                {/* Comparison changes — keep if user has multiple reports */}
                {comparison?.hasMultipleReports && comparison.changes.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-[#5a6623] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      Changes Since Last Report
                    </h4>
                    <div className="space-y-1.5">
                      {comparison.changes.slice(0, 6).map((change, i) => {
                        const trendCfg = TREND_CONFIG[change.trend];
                        const TrendIcon = trendCfg.icon;
                        return (
                          <div key={i} className="flex items-center gap-3 bg-white rounded-lg border border-[#5a6623]/10 px-3 py-2">
                            <TrendIcon className={`h-4 w-4 flex-shrink-0 ${trendCfg.color}`} />
                            <span className="text-sm font-medium text-[#054700] flex-1">{change.name}</span>
                            <span className="text-xs text-[#5a6623]">{change.from}</span>
                            <span className="text-xs text-[#5a6623]">→</span>
                            <span className={`text-xs font-semibold ${trendCfg.color}`}>{change.to}</span>
                            {change.percentChange != null && (
                              <span className={`text-xs ${trendCfg.color}`}>
                                ({change.percentChange > 0 ? '+' : ''}{change.percentChange.toFixed(1)}%)
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Fallback when analysisSummary is not yet computed */}
            {(!dashboard?.analysisSummary || !dashboard.analysisSummary.headline) && effectiveLabSummary && (
              <p className="text-sm text-[#054700] leading-relaxed">{effectiveLabSummary}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Biomarker Table (collapsed by default) ── */}
      {hasDashboard && (
        <div>
          <button
            onClick={() => setShowAllMarkers(!showAllMarkers)}
            className="w-full flex items-center justify-between bg-[#ede8e2] border border-[#5a6623]/20 rounded-2xl px-5 py-3.5 hover:bg-[#ede8e2]/80 transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <Beaker className="h-5 w-5 text-[#054700]" />
              <span className="text-base font-semibold text-[#054700]">All Biomarkers</span>
              <span className="text-xs text-[#5a6623] bg-white rounded-full px-2.5 py-0.5 border border-[#5a6623]/15">
                {dashboard.markers.length} markers
              </span>
            </div>
            {showAllMarkers ? (
              <ChevronUp className="h-5 w-5 text-[#5a6623] group-hover:text-[#054700] transition-colors" />
            ) : (
              <ChevronDown className="h-5 w-5 text-[#5a6623] group-hover:text-[#054700] transition-colors" />
            )}
          </button>

          {showAllMarkers && (
        <Card className="border-[#5a6623]/10 shadow-2xl overflow-hidden rounded-t-none border-t-0 -mt-1">
          <CardHeader className="pb-3 border-b border-[#5a6623]/10">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 text-xs text-[#5a6623]">
                {filteredMarkers.length} of {dashboard.markers.length} markers shown
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 mt-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#5a6623]" />
                <input
                  type="text"
                  placeholder="Search markers..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-[#5a6623]/20 bg-white text-[#054700] placeholder:text-[#5a6623]/50 focus:outline-none focus:ring-1 focus:ring-[#054700]/30"
                />
              </div>

              {/* Category filter */}
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 text-sm rounded-lg border border-[#5a6623]/20 bg-white text-[#054700] focus:outline-none focus:ring-1 focus:ring-[#054700]/30"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Status filter */}
              <div className="flex items-center gap-1 bg-white border border-[#5a6623]/20 rounded-lg p-1">
                {(['all', 'normal', 'high', 'low', 'critical'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                      statusFilter === s
                        ? 'bg-[#054700] text-white shadow-sm'
                        : 'text-[#5a6623] hover:text-[#054700]'
                    }`}
                  >
                    {s === 'all' ? 'All' : STATUS_CONFIG[s].label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* Table header (hidden on mobile) */}
            <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_80px] gap-2 px-4 sm:px-6 py-2.5 bg-[#ede8e2] border-b border-[#5a6623]/10 text-xs font-semibold text-[#5a6623] uppercase tracking-wide">
              <span>Marker</span>
              <span>Value</span>
              <span>Reference</span>
              <span>Status</span>
              <span>Trend</span>
            </div>

            {/* Marker rows */}
            <div className="divide-y divide-[#5a6623]/10">
              {filteredMarkers.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <Search className="h-8 w-8 mx-auto text-[#5a6623]/40 mb-2" />
                  <p className="text-sm text-[#5a6623]">No markers match your filters</p>
                </div>
              ) : (
                filteredMarkers.map(marker => {
                  const statusCfg = STATUS_CONFIG[marker.latest.status];
                  const trendCfg = TREND_CONFIG[marker.trend];
                  const TrendIcon = trendCfg.icon;
                  const isExpanded = expandedMarker === marker.key;

                  return (
                    <div key={marker.key}>
                      <button
                        onClick={() => setExpandedMarker(isExpanded ? null : marker.key)}
                        className="w-full text-left hover:bg-white/60 transition-colors"
                      >
                        {/* Desktop row */}
                        <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_80px] gap-2 items-center px-4 sm:px-6 py-3">
                          {/* Marker name + category */}
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-base flex-shrink-0">{CATEGORY_ICONS[marker.category] || '📋'}</span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[#054700] truncate">{marker.name}</p>
                              <p className="text-xs text-[#5a6623] truncate">{marker.category}</p>
                            </div>
                          </div>

                          {/* Value */}
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold ${marker.latest.status !== 'normal' ? statusCfg.color : 'text-[#054700]'}`}>
                              {marker.latest.rawValue}
                            </span>
                            {marker.latest.unit && (
                              <span className="text-xs text-[#5a6623]">{marker.latest.unit}</span>
                            )}
                          </div>

                          {/* Reference range */}
                          <span className="text-xs text-[#5a6623]">{marker.latest.referenceRange || '—'}</span>

                          {/* Status badge */}
                          <div>
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border} border`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
                              {statusCfg.label}
                            </span>
                          </div>

                          {/* Trend */}
                          <div className="flex items-center gap-1.5">
                            {marker.history.length >= 2 && (
                              <SparkLine values={marker.history.map(h => h.value)} status={marker.latest.status} />
                            )}
                            <TrendIcon className={`h-3.5 w-3.5 flex-shrink-0 ${trendCfg.color}`} />
                          </div>
                        </div>

                        {/* Mobile row */}
                        <div className="sm:hidden px-4 py-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-base flex-shrink-0">{CATEGORY_ICONS[marker.category] || '📋'}</span>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-[#054700] truncate">{marker.name}</p>
                                <p className="text-xs text-[#5a6623]">{marker.category}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border} border`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
                                {statusCfg.label}
                              </span>
                              {isExpanded ? <ChevronUp className="h-4 w-4 text-[#5a6623]" /> : <ChevronDown className="h-4 w-4 text-[#5a6623]" />}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 ml-8">
                            <span className={`text-sm font-semibold ${marker.latest.status !== 'normal' ? statusCfg.color : 'text-[#054700]'}`}>
                              {marker.latest.rawValue} {marker.latest.unit}
                            </span>
                            <span className="text-xs text-[#5a6623]">{marker.latest.referenceRange || ''}</span>
                            <TrendIcon className={`h-3.5 w-3.5 ml-auto ${trendCfg.color}`} />
                          </div>
                        </div>
                      </button>

                      {/* Expanded detail panel */}
                      {isExpanded && (
                        <div className="glass-card border-t border-[#5a6623]/10 px-4 sm:px-6 py-4 space-y-4" onClick={e => e.stopPropagation()}>
                          {/* Delta info */}
                          {marker.previous && (
                            <div className="flex items-center gap-4 flex-wrap">
                              <div className="text-xs text-[#5a6623]">
                                Previous: <span className="font-medium text-[#054700]">{marker.previous.rawValue}</span>
                                <span className="ml-1">({fmtDate(marker.previous.date)})</span>
                              </div>
                              {marker.delta != null && (
                                <span className={`text-xs font-semibold ${trendCfg.color}`}>
                                  {marker.delta > 0 ? '+' : ''}{marker.delta.toFixed(1)}% change
                                </span>
                              )}
                              <span className={`text-xs font-medium ${trendCfg.color} flex items-center gap-1`}>
                                <TrendIcon className="h-3 w-3" />
                                {trendCfg.label}
                              </span>
                            </div>
                          )}

                          {/* AI-powered marker insight */}
                          <MarkerInsightPanel
                            insight={marker.insight}
                            marker={{
                              name: marker.name,
                              value: marker.latest.rawValue,
                              unit: marker.latest.unit,
                              status: marker.latest.status,
                              referenceRange: marker.latest.referenceRange,
                            }}
                          />

                          {/* Sparkline + history table */}
                          {marker.history.length >= 2 && (
                            <div>
                              <h5 className="text-[11px] font-semibold text-[#5a6623] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                <TrendingUp className="h-3 w-3" />
                                Trend History
                              </h5>
                              <div className="flex items-center gap-4 mb-3">
                                <SparkLine values={marker.history.map(h => h.value)} status={marker.latest.status} />
                              </div>
                              <div className="space-y-1">
                                {[...marker.history].reverse().slice(0, 6).map((h, i) => (
                                  <div key={i} className="flex items-center justify-between text-xs">
                                    <span className="text-[#5a6623]">{fmtDate(h.date)}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-[#054700]">{h.rawValue} {h.unit}</span>
                                      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_CONFIG[h.status].dot}`} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Single report — prompt to upload more */}
                          {marker.history.length < 2 && (
                            <p className="text-xs text-[#5a6623] italic">Upload another report to see trends for this marker.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
          )}
        </div>
      )}

      {/* Empty state — only show when no reports exist at all */}
      {!hasDashboard && !dashboardLoading && !labReportsLoading && (!labReports || labReports.length === 0) && (
        <Card className="border-dashed bg-white border-[#5a6623]/30">
          <CardContent className="flex flex-col items-center justify-center py-12 px-4">
            <div className="h-14 w-14 rounded-full bg-[#054700]/10 flex items-center justify-center mb-4">
              <Beaker className="h-7 w-7 text-[#054700]" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-[#054700]">No lab data yet</h3>
            <p className="text-[#5a6623] text-center text-sm max-w-md mb-5">
              Upload your blood work to see a full breakdown of every biomarker with trends, reference ranges, and AI-powered insights.
            </p>
            <div className="flex gap-3">
              <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="bg-[#054700] hover:bg-[#054700]/90">
                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Upload Report
              </Button>
              <Button
                variant="outline"
                onClick={() => { setEditingFileId(null); setManualEntryText(''); setShowManualEntryDialog(true); }}
                className="border-[#054700] text-[#054700] hover:bg-[#054700] hover:text-white"
              >
                <ClipboardPaste className="mr-2 h-4 w-4" />
                Paste Results
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Reports List (collapsible) ── */}
      {labReports && labReports.length > 0 && (
        <Card className="border-[#5a6623]/10 shadow-2xl">
          <CardHeader className="pb-2">
            <button
              onClick={() => setShowReports(!showReports)}
              className="flex items-center justify-between w-full text-left"
            >
              <CardTitle className="text-[#054700] text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Uploaded Reports
                <span className="text-sm font-normal text-[#5a6623]">({labReports.length})</span>
              </CardTitle>
              {showReports ? <ChevronUp className="h-4 w-4 text-[#5a6623]" /> : <ChevronDown className="h-4 w-4 text-[#5a6623]" />}
            </button>
          </CardHeader>
          {showReports && (
            <CardContent className="pt-2 space-y-2">
              {labReports.map(report => {
                const ld = report.labReportData as any;
                const markerCount = Array.isArray(ld?.extractedData) ? ld.extractedData.length : 0;
                const status = ld?.analysisStatus || 'unknown';
                const testDate = ld?.testDate;
                const labName = ld?.labName;

                return (
                  <div key={report.id} className="flex items-center gap-3 bg-white rounded-xl border border-[#5a6623]/10 px-4 py-3" data-testid={`report-${report.id}`}>
                    <div className="h-9 w-9 rounded-full bg-[#054700]/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-4 w-4 text-[#054700]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#054700] truncate">{report.originalFileName}</p>
                      <div className="flex items-center gap-2 text-xs text-[#5a6623]">
                        <span>{new Date(report.uploadedAt).toLocaleDateString()}</span>
                        {testDate && <span>• Test: {fmtDate(testDate)}</span>}
                        {labName && <span>• {labName}</span>}
                        {markerCount > 0 && <span>• {markerCount} markers</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {status === 'processing' || status === 'pending' ? (
                        <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 bg-amber-50">
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing
                        </Badge>
                      ) : status === 'completed' ? (
                        <Badge variant="outline" className="text-xs border-emerald-300 text-emerald-700 bg-emerald-50">
                          <CheckCircle2 className="h-3 w-3 mr-1" />Analyzed
                        </Badge>
                      ) : status === 'error' ? (
                        <Badge variant="outline" className="text-xs border-red-300 text-red-700 bg-red-50">
                          <AlertTriangle className="h-3 w-3 mr-1" />Error
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Uploaded</Badge>
                      )}

                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleViewFile(report.id)} disabled={loadingFiles.has(report.id)} title="View">
                        {loadingFiles.has(report.id) ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#054700]" /> : <Eye className="h-3.5 w-3.5 text-[#054700]" />}
                      </Button>
                      {report.mimeType === 'text/plain' && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditReport(report)} disabled={editingFiles.has(report.id)} title="Edit">
                          {editingFiles.has(report.id) ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#054700]" /> : <Edit2 className="h-3.5 w-3.5 text-[#054700]" />}
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFileToDelete(report.id)} title="Delete">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          )}
        </Card>
      )}

      {/* ── Consent Dialog ── */}
      <Dialog open={showConsentDialog} onOpenChange={setShowConsentDialog}>
        <DialogContent data-testid="dialog-consent">
          <DialogHeader>
            <DialogTitle>Consent to Process Health Data</DialogTitle>
            <DialogDescription>
              To upload and analyze your lab results, we need your consent to process your health information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm">By providing consent, you agree to allow Ones AI to:</p>
            <ul className="text-sm space-y-2 ml-4 list-disc">
              <li>Process and analyze your uploaded lab results</li>
              <li>Use this data to create personalized supplement recommendations</li>
              <li>Store your health information securely</li>
              <li>Use this data to optimize your formula over time</li>
            </ul>
            <p className="text-sm text-muted-foreground">
              Your data is stored with encryption and not shared with third parties. You can revoke this consent at any time from your privacy settings.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowConsentDialog(false); setPendingFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} data-testid="button-consent-cancel">
              Cancel
            </Button>
            <Button onClick={() => grantConsentMutation.mutate()} disabled={grantConsentMutation.isPending} data-testid="button-consent-agree">
              {grantConsentMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              I Consent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Manual Entry Dialog ── */}
      <Dialog open={showManualEntryDialog} onOpenChange={setShowManualEntryDialog}>
        <DialogContent className="max-w-2xl" data-testid="dialog-manual-entry">
          <DialogHeader>
            <DialogTitle>{editingFileId ? 'Edit Lab Results' : 'Paste Lab Results'}</DialogTitle>
            <DialogDescription>
              {editingFileId ? 'Update your lab results. Our AI will re-analyze the data.' : 'Copy and paste your lab results directly from your test report or doctor\'s portal.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="test-type">Test Type</Label>
              <Select value={selectedTestType} onValueChange={(value: any) => setSelectedTestType(value)}>
                <SelectTrigger id="test-type" data-testid="select-test-type"><SelectValue placeholder="Select test type" /></SelectTrigger>
                <SelectContent><SelectItem value="blood_test">Blood Test</SelectItem></SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">More test types coming soon.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lab-results">Lab Results</Label>
              <Textarea
                id="lab-results"
                placeholder="Paste your lab results here. Include test names, values, reference ranges, and units.&#10;&#10;Example:&#10;Vitamin D: 32 ng/mL (30-100 ng/mL)&#10;B12: 450 pg/mL (200-900 pg/mL)"
                value={manualEntryText}
                onChange={(e) => setManualEntryText(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
                data-testid="textarea-lab-results"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowManualEntryDialog(false); setManualEntryText(''); setEditingFileId(null); }} data-testid="button-manual-entry-cancel">
              Cancel
            </Button>
            <Button onClick={handleManualEntry} disabled={isUploading || !manualEntryText.trim()} data-testid="button-manual-entry-save">
              {isUploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Results
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={!!fileToDelete} onOpenChange={() => setFileToDelete(null)}>
        <AlertDialogContent data-testid="dialog-delete-file">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lab Report?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this lab report from your account. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-delete-cancel">No, Keep It</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => fileToDelete && deleteFileMutation.mutate(fileToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-delete-confirm"
            >
              {deleteFileMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
