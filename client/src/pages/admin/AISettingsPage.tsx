import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Settings2,
  Loader2,
  RefreshCw,
  Calendar,
  Cpu,
  TestTube,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Label } from '@/shared/components/ui/label';
import { Skeleton } from '@/shared/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/components/ui/select';
import { apiRequest } from '@/shared/lib/queryClient';
import { useToast } from '@/shared/hooks/use-toast';

const MODEL_OPTIONS: Record<'openai' | 'anthropic', { value: string; label: string }[]> = {
  openai: [
    { value: 'gpt-5.2', label: 'GPT-5.2 (latest) 🔥' },
    { value: 'gpt-5.2-pro', label: 'GPT-5.2 Pro' },
    { value: 'gpt-5', label: 'GPT-5' },
    { value: 'gpt-5-mini', label: 'GPT-5 Mini' },
    { value: 'gpt-5-nano', label: 'GPT-5 Nano (fastest)' },
    { value: 'gpt-4.1', label: 'GPT-4.1' },
    { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'o3', label: 'o3 (reasoning)' },
    { value: 'o3-mini', label: 'o3 Mini' },
    { value: 'o4-mini', label: 'o4 Mini' },
  ],
  anthropic: [
    { value: 'claude-opus-4-6', label: 'Claude Opus 4.6 (most intelligent) 🔥' },
    { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (fast + smart)' },
    { value: 'claude-haiku-4-6', label: 'Claude Haiku 4.6 (fastest)' },
    { value: 'claude-opus-4-5', label: 'Claude Opus 4.5' },
    { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
    { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
    { value: 'claude-opus-4-1', label: 'Claude Opus 4.1 (legacy)' },
  ],
};

// ── Formula Review Trigger ─────────────────────────────────────────────
function FormulaReviewTrigger() {
  const { toast } = useToast();
  const [result, setResult] = useState<any>(null);

  const triggerMutation = useMutation({
    mutationFn: () =>
      apiRequest('POST', '/api/admin/formula-review/trigger').then(r => r.json()),
    onSuccess: (data) => {
      setResult(data.results ?? data);
      toast({ title: 'Formula review check complete' });
    },
    onError: (err: any) => {
      toast({ title: err.message || 'Trigger failed', variant: 'destructive' });
    },
  });

  return (
    <Card className="border-amber-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4 text-amber-600" />
          Formula Review Scheduler
        </CardTitle>
        <CardDescription>
          Manually trigger the daily formula review check. Normally runs at 9am UTC — notifies
          users with formula drift whose subscription renews in 7 or 3 days.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="border-amber-300 text-amber-700 hover:bg-amber-50 gap-2"
            disabled={triggerMutation.isPending}
            onClick={() => triggerMutation.mutate()}
          >
            {triggerMutation.isPending ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Running...</>
            ) : (
              <><RefreshCw className="w-3.5 h-3.5" /> Trigger Now</>
            )}
          </Button>
          {result && (
            <div className="text-sm text-gray-600 bg-gray-50 rounded-md px-3 py-2 font-mono">
              7-day: checked {result.day7?.checked ?? 0}, notified {result.day7?.notified ?? 0} &nbsp;|&nbsp;
              3-day: checked {result.day3?.checked ?? 0}, notified {result.day3?.notified ?? 0} &nbsp;|&nbsp;
              <strong>Total notified: {result.totalNotified ?? 0}</strong>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── AI Settings Card ───────────────────────────────────────────────────
function AISettingsCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: aiSettings, isLoading } = useQuery<{
    provider: 'openai' | 'anthropic';
    model: string;
    source: 'override' | 'env';
    updatedAt: string | null;
  }>({
    queryKey: ['/api/admin/ai-settings'],
  });

  const [provider, setProvider] = useState<'openai' | 'anthropic'>(aiSettings?.provider || 'openai');
  const [model, setModel] = useState<string>(aiSettings?.model || '');

  useEffect(() => {
    if (aiSettings) {
      setProvider(aiSettings.provider);
      setModel(aiSettings.model || '');
    }
  }, [aiSettings]);

  useEffect(() => {
    const options = MODEL_OPTIONS[provider];
    if (!options.find(o => o.value === model)) {
      setModel(options[0]?.value || '');
    }
  }, [provider]);

  const mutation = useMutation({
    mutationFn: async (body: any) => {
      const res = await apiRequest('POST', '/api/admin/ai-settings', body);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'AI settings updated' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ai-settings'] });
    },
    onError: (e: any) => {
      toast({
        title: 'Failed to update AI settings',
        description: e?.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/ai-settings/test');
      const text = await res.text();
      let data: any = null;
      try { data = JSON.parse(text); } catch { return { _raw: text, _status: res.status, ok: false } as any; }
      return data as { ok: boolean; provider: string; model: string; sample?: string; error?: string };
    },
    onSuccess: (data: any) => {
      if (data && typeof data.ok === 'boolean') {
        if (data.ok) {
          toast({ title: 'AI test succeeded', description: `Using ${data.provider} / ${data.model}` });
        } else {
          toast({ title: 'AI test failed', description: data.error || 'Unknown error', variant: 'destructive' });
        }
      } else {
        const snippet = (data?._raw || '').slice(0, 160) || '(empty body)';
        const status = data?._status ? `HTTP ${data._status}` : 'Unknown status';
        toast({ title: 'Response was not JSON', description: `${status}: ${snippet}`, variant: 'destructive' });
      }
    },
    onError: (e: any) => {
      toast({ title: 'AI test failed', description: e?.message || 'Unknown error', variant: 'destructive' });
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Cpu className="h-4 w-4" /> AI Provider & Model
            </CardTitle>
            <CardDescription>
              Control which AI provider and model power consultations.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
              {aiSettings?.provider || 'openai'} / {aiSettings?.model || 'gpt-4o'}
            </div>
            <Badge variant={aiSettings?.source === 'override' ? 'default' : 'secondary'}>
              {aiSettings?.source || 'env'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-9" /><Skeleton className="h-9" /><Skeleton className="h-9" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3 items-end">
            <div className="space-y-1">
              <Label>Provider</Label>
              <Select value={provider} onValueChange={(v: 'openai' | 'anthropic') => setProvider(v)}>
                <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Model</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger>
                  <SelectValue placeholder={provider === 'anthropic' ? 'Select Claude model' : 'Select GPT model'} />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_OPTIONS[provider].map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => mutation.mutate({ reset: true })} disabled={mutation.isPending}>
                Reset to Defaults
              </Button>
              <Button variant="outline" size="sm" onClick={() => testMutation.mutate()} disabled={testMutation.isPending}>
                <TestTube className="h-3.5 w-3.5 mr-1" /> Test
              </Button>
              <Button size="sm" onClick={() => mutation.mutate({ provider, model })} disabled={mutation.isPending}
                className="bg-[#054700] hover:bg-[#043d00]">
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────
export default function AISettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Settings2 className="h-5 w-5" /> AI Configuration
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage the AI provider, model selection, and formula review scheduler.
        </p>
      </div>

      <AISettingsCard />
      <FormulaReviewTrigger />
    </div>
  );
}
