import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/shared/lib/queryClient';
import { useToast } from '@/shared/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Bot,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Settings,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { Switch } from '@/shared/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/components/ui/sheet';

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

interface AgentRun {
  id: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  summary: Record<string, any> | null;
  errorMessage: string | null;
}

interface AgentSummary {
  name: string;
  label: string;
  description: string;
  schedule: string;
  category: string;
  hasEnabledToggle: boolean;
  enabled: boolean | null;
  canRunManually: boolean;
  lastRun: AgentRun | null;
}

interface SettingsField {
  key: string;
  label: string;
  type: 'boolean' | 'number' | 'text' | 'string-list';
  description?: string;
}

interface AgentDetail extends Omit<AgentSummary, 'lastRun' | 'enabled'> {
  settingsFields: SettingsField[];
  settings: Record<string, any> | null;
  recentRuns: AgentRun[];
}

// ──────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────

export default function AdminAgentsPage() {
  const [openAgent, setOpenAgent] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<{ items: AgentSummary[] }>({
    queryKey: ['admin-agents'],
    queryFn: () => apiRequest('GET', '/api/admin/agents').then((r) => r.json()),
    refetchInterval: 15_000, // refresh every 15s so the dashboard reflects new runs
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-[#054700]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6 text-red-600">
            Failed to load agents: {(error as Error).message}
          </CardContent>
        </Card>
      </div>
    );
  }

  const agents = data?.items ?? [];

  // Group by category for display
  const grouped = agents.reduce<Record<string, AgentSummary[]>>((acc, a) => {
    (acc[a.category] ??= []).push(a);
    return acc;
  }, {});
  const categoryOrder = ['AI Agents', 'Content', 'Operations'];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Bot className="h-7 w-7 text-[#054700]" />
        <h1 className="text-2xl font-semibold text-[#054700]">Agents</h1>
      </div>
      <p className="text-sm text-[#6b7280] mb-8">
        Every background scheduler running on this server. Toggle agents on or off, watch their last
        run, or trigger a manual run. Failures email admins automatically.
      </p>

      {categoryOrder.map((cat) => {
        const items = grouped[cat];
        if (!items || items.length === 0) return null;
        return (
          <section key={cat} className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#6b7280] mb-3">
              {cat}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((agent) => (
                <AgentCard key={agent.name} agent={agent} onOpen={() => setOpenAgent(agent.name)} />
              ))}
            </div>
          </section>
        );
      })}

      {openAgent && (
        <AgentDetailSheet name={openAgent} onClose={() => setOpenAgent(null)} />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Agent card
// ──────────────────────────────────────────────────────────────

function AgentCard({ agent, onOpen }: { agent: AgentSummary; onOpen: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const toggleMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      apiRequest('PATCH', `/api/admin/agents/${agent.name}/settings`, { enabled }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-agents'] });
      toast({ title: 'Settings updated', description: agent.label });
    },
    onError: (err: any) => {
      toast({ title: 'Failed to update', description: err?.message, variant: 'destructive' });
    },
  });

  const runMutation = useMutation({
    mutationFn: () =>
      apiRequest('POST', `/api/admin/agents/${agent.name}/run`).then((r) => r.json()),
    onSuccess: () => {
      toast({ title: 'Manual run triggered', description: agent.label });
      // Optimistically refetch after a short delay
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['admin-agents'] }), 1500);
    },
    onError: (err: any) => {
      toast({ title: 'Failed to trigger', description: err?.message, variant: 'destructive' });
    },
  });

  return (
    <Card className="hover:border-[#054700]/30 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold">{agent.label}</CardTitle>
            <CardDescription className="text-xs mt-1">{agent.schedule}</CardDescription>
          </div>
          {agent.hasEnabledToggle && agent.enabled !== null && (
            <div className="flex items-center gap-2 shrink-0">
              <Switch
                checked={!!agent.enabled}
                onCheckedChange={(v) => toggleMutation.mutate(v)}
                disabled={toggleMutation.isPending}
              />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-[#6b7280] line-clamp-2 mb-3">{agent.description}</p>

        <RunStatusRow run={agent.lastRun} />

        <div className="flex gap-2 mt-3">
          <Button variant="outline" size="sm" className="flex-1" onClick={onOpen}>
            <Settings className="h-3.5 w-3.5 mr-1.5" />
            Details
          </Button>
          {agent.canRunManually && (
            <Button
              size="sm"
              className="flex-1"
              onClick={() => runMutation.mutate()}
              disabled={runMutation.isPending}
            >
              {runMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5 mr-1.5" />
              )}
              Run now
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────
// Run status row
// ──────────────────────────────────────────────────────────────

function RunStatusRow({ run }: { run: AgentRun | null }) {
  if (!run) {
    return (
      <div className="flex items-center gap-2 text-xs text-[#9ca3af]">
        <Clock className="h-3.5 w-3.5" />
        Never run
      </div>
    );
  }

  const StatusIcon =
    run.status === 'completed' ? CheckCircle2
    : run.status === 'failed' ? XCircle
    : run.status === 'running' ? Loader2
    : AlertCircle;

  const statusColor =
    run.status === 'completed' ? 'text-green-600'
    : run.status === 'failed' ? 'text-red-600'
    : run.status === 'running' ? 'text-blue-600'
    : 'text-amber-600';

  const startedAgo = formatDistanceToNow(new Date(run.startedAt), { addSuffix: true });

  return (
    <div className="flex items-center gap-2 text-xs">
      <StatusIcon className={`h-3.5 w-3.5 ${statusColor} ${run.status === 'running' ? 'animate-spin' : ''}`} />
      <span className="text-[#374151] capitalize">{run.status}</span>
      <span className="text-[#9ca3af]">·</span>
      <span className="text-[#6b7280]">{startedAgo}</span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Detail sheet
// ──────────────────────────────────────────────────────────────

function AgentDetailSheet({ name, onClose }: { name: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: detail, isLoading } = useQuery<AgentDetail>({
    queryKey: ['admin-agent', name],
    queryFn: () => apiRequest('GET', `/api/admin/agents/${name}`).then((r) => r.json()),
    refetchInterval: 10_000,
  });

  const [draft, setDraft] = useState<Record<string, any> | null>(null);
  const settingsToShow = draft ?? detail?.settings ?? null;

  const saveMutation = useMutation({
    mutationFn: (patch: Record<string, any>) =>
      apiRequest('PATCH', `/api/admin/agents/${name}/settings`, patch).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-agent', name] });
      queryClient.invalidateQueries({ queryKey: ['admin-agents'] });
      setDraft(null);
      toast({ title: 'Settings saved' });
    },
    onError: (err: any) => {
      toast({ title: 'Save failed', description: err?.message, variant: 'destructive' });
    },
  });

  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="overflow-y-auto sm:max-w-xl">
        {isLoading || !detail ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-[#054700]" />
          </div>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle className="text-[#054700]">{detail.label}</SheetTitle>
              <SheetDescription>{detail.description}</SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* Settings */}
              {detail.settingsFields.length > 0 && settingsToShow && (
                <section>
                  <h3 className="text-sm font-semibold mb-3">Settings</h3>
                  <div className="space-y-4">
                    {detail.settingsFields.map((field) => (
                      <SettingsFieldInput
                        key={field.key}
                        field={field}
                        value={settingsToShow[field.key]}
                        onChange={(v) => setDraft({ ...(draft ?? detail.settings ?? {}), [field.key]: v })}
                      />
                    ))}
                  </div>
                  {draft && (
                    <div className="flex gap-2 mt-4">
                      <Button
                        size="sm"
                        onClick={() => saveMutation.mutate(draft)}
                        disabled={saveMutation.isPending}
                      >
                        {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                        Save changes
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setDraft(null)}>
                        Discard
                      </Button>
                    </div>
                  )}
                </section>
              )}

              {/* Recent runs */}
              <section>
                <h3 className="text-sm font-semibold mb-3">Recent runs ({detail.recentRuns.length})</h3>
                {detail.recentRuns.length === 0 ? (
                  <p className="text-xs text-[#6b7280]">No runs recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {detail.recentRuns.map((run) => (
                      <RunRow key={run.id} run={run} />
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function SettingsFieldInput({
  field,
  value,
  onChange,
}: {
  field: SettingsField;
  value: any;
  onChange: (v: any) => void;
}) {
  if (field.type === 'boolean') {
    return (
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <Label className="text-sm">{field.label}</Label>
          {field.description && (
            <p className="text-xs text-[#6b7280] mt-0.5">{field.description}</p>
          )}
        </div>
        <Switch checked={!!value} onCheckedChange={onChange} />
      </div>
    );
  }

  if (field.type === 'number') {
    return (
      <div>
        <Label className="text-sm">{field.label}</Label>
        {field.description && (
          <p className="text-xs text-[#6b7280] mt-0.5 mb-1.5">{field.description}</p>
        )}
        <Input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        />
      </div>
    );
  }

  if (field.type === 'string-list') {
    const arr: string[] = Array.isArray(value) ? value : [];
    return (
      <div>
        <Label className="text-sm">{field.label}</Label>
        {field.description && (
          <p className="text-xs text-[#6b7280] mt-0.5 mb-1.5">{field.description}</p>
        )}
        <Input
          placeholder="comma,separated,values"
          value={arr.join(',')}
          onChange={(e) =>
            onChange(
              e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
        />
      </div>
    );
  }

  return (
    <div>
      <Label className="text-sm">{field.label}</Label>
      {field.description && (
        <p className="text-xs text-[#6b7280] mt-0.5 mb-1.5">{field.description}</p>
      )}
      <Input value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function RunRow({ run }: { run: AgentRun }) {
  const StatusIcon =
    run.status === 'completed' ? CheckCircle2
    : run.status === 'failed' ? XCircle
    : run.status === 'running' ? Loader2
    : AlertCircle;

  const statusColor =
    run.status === 'completed' ? 'text-green-600'
    : run.status === 'failed' ? 'text-red-600'
    : run.status === 'running' ? 'text-blue-600'
    : 'text-amber-600';

  const duration = run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : '—';

  return (
    <div className="border rounded-md p-3 bg-white">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs">
          <StatusIcon
            className={`h-3.5 w-3.5 ${statusColor} ${run.status === 'running' ? 'animate-spin' : ''}`}
          />
          <span className="font-medium capitalize text-[#374151]">{run.status}</span>
          <Badge variant="outline" className="text-[10px]">
            {duration}
          </Badge>
        </div>
        <span className="text-xs text-[#9ca3af]">
          {format(new Date(run.startedAt), 'MMM d, HH:mm:ss')}
        </span>
      </div>
      {run.summary && Object.keys(run.summary).length > 0 && (
        <pre className="mt-2 text-[11px] bg-[#f8fafc] rounded px-2 py-1.5 overflow-x-auto text-[#475569]">
          {JSON.stringify(run.summary, null, 2)}
        </pre>
      )}
      {run.errorMessage && (
        <pre className="mt-2 text-[11px] bg-red-50 text-red-700 rounded px-2 py-1.5 overflow-x-auto whitespace-pre-wrap">
          {run.errorMessage}
        </pre>
      )}
    </div>
  );
}
