/**
 * Prospector — Conversational outreach research.
 *
 * Replaces the legacy PR Agent dashboard. The operator chats with Claude;
 * Claude runs web_search + save_prospects tools and streams back what it's
 * doing. Everything saved here lands in the same outreach_prospects table
 * so the existing pitch / CRM flow keeps working.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'wouter';
import { buildApiUrl } from '@/shared/lib/api';
import { getAuthHeaders } from '@/shared/lib/queryClient';
import { useToast } from '@/shared/hooks/use-toast';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { Badge } from '@/shared/components/ui/badge';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/components/ui/collapsible';
import {
  Sparkles,
  Send,
  Square,
  Search,
  Save,
  Database,
  Wand2,
  Globe,
  Map as MapIcon,
  Mail,
  PenLine,
  FileText,
  Paperclip,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Loader2,
  History,
  Briefcase,
  Mic,
  Newspaper,
  Radio,
} from 'lucide-react';

// ── Types mirroring server AgentEvent ────────────────────────────────────────

type AgentEvent =
  | { type: 'text_delta'; delta: string }
  | { type: 'tool_use'; id: string; name: string; input: any }
  | { type: 'tool_result'; id: string; name: string; ok: boolean; summary: string; data?: any }
  | { type: 'message_start' }
  | { type: 'message_stop' }
  | { type: 'done'; prospectsSaved: number; iterations: number }
  | { type: 'error'; message: string };

interface ToolCall {
  id: string;
  name: string;
  input: any;
  status: 'running' | 'ok' | 'error';
  summary?: string;
  data?: any;
}

interface AssistantTurn {
  id: string;
  role: 'assistant';
  text: string;
  tools: ToolCall[];
  streaming: boolean;
}

interface UserTurn {
  id: string;
  role: 'user';
  text: string;
}

type Turn = AssistantTurn | UserTurn;

interface SavedProspectLite {
  id: string;
  name: string;
  category: 'podcast' | 'press' | 'investor';
  url: string;
  relevanceScore: number | null;
}

// ── Suggestion chips ─────────────────────────────────────────────────────────

const SUGGESTIONS: { label: string; icon: typeof Briefcase; prompt: string }[] = [
  {
    label: 'VC cohorts accepting apps',
    icon: Briefcase,
    prompt:
      'Find every VC accelerator cohort currently accepting applications — Y Combinator, a16z Speedrun, Techstars, Antler, EF, etc. For each, include the batch name, application deadline, and stated focus on consumer health or DTC if any. Save the ones with open apps.',
  },
  {
    label: 'Longevity podcasts booking guests',
    icon: Mic,
    prompt:
      'Find longevity, biohacking, and personalized health podcasts with 10k+ downloads/episode that are actively booking guests for the next quarter. Save the top 10.',
  },
  {
    label: 'Health journalists at major outlets',
    icon: Newspaper,
    prompt:
      'Find health & wellness journalists at major outlets (NYT, WSJ, Bloomberg, WaPo, The Atlantic, Wired, Vox, Fast Company) who have covered supplements, GLP-1, or longevity in the last 6 months. Include their email or pitch form when possible.',
  },
  {
    label: 'Health-focused angels',
    icon: Radio,
    prompt:
      'Find solo angel investors known for backing consumer health, supplement, or DTC wellness companies. Include their thesis or portfolio companies in the notes.',
  },
  {
    label: 'Draft elevator pitch',
    icon: PenLine,
    prompt:
      'Give me a 10-second elevator pitch for Ones I can say out loud. ~40 words, warm, leads with the two-sided supplement problem.',
  },
  {
    label: 'Polish my draft',
    icon: Wand2,
    prompt:
      "Clean up this rough pitch and make it sound like me:\n\n\"\"\"\nPaste your draft here. Tell the agent who it's going to and what tone you want.\n\"\"\"",
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const TOOL_META: Record<string, { icon: typeof Search; label: string; tone: string }> = {
  web_search: { icon: Search, label: 'Web search', tone: 'text-blue-700 bg-blue-50 border-blue-100' },
  scrape_page: { icon: Globe, label: 'Read page', tone: 'text-sky-700 bg-sky-50 border-sky-100' },
  map_site: { icon: MapIcon, label: 'Map site', tone: 'text-indigo-700 bg-indigo-50 border-indigo-100' },
  save_prospects: { icon: Save, label: 'Save prospects', tone: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
  list_existing_prospects: { icon: Database, label: 'Read database', tone: 'text-violet-700 bg-violet-50 border-violet-100' },
  enrich_prospect: { icon: Wand2, label: 'Enrich', tone: 'text-amber-700 bg-amber-50 border-amber-100' },
  list_pitch_templates: { icon: FileText, label: 'Templates', tone: 'text-slate-700 bg-slate-50 border-slate-200' },
  draft_pitch: { icon: PenLine, label: 'Draft pitch', tone: 'text-rose-700 bg-rose-50 border-rose-100' },
  polish_text: { icon: Wand2, label: 'Polish', tone: 'text-fuchsia-700 bg-fuchsia-50 border-fuchsia-100' },
  send_pitch: { icon: Mail, label: 'Send email', tone: 'text-emerald-800 bg-emerald-100 border-emerald-200' },
};

const CATEGORY_TONE: Record<string, string> = {
  podcast: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100',
  press: 'bg-blue-50 text-blue-700 border-blue-100',
  investor: 'bg-emerald-50 text-emerald-700 border-emerald-100',
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ProspectorPage() {
  const { toast } = useToast();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [savedProspects, setSavedProspects] = useState<SavedProspectLite[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-scroll on new content
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [turns]);

  const sendPrompt = useCallback(
    async (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed || streaming) return;

      // Build new history: existing + user
      const userTurn: UserTurn = { id: uid(), role: 'user', text: trimmed };
      const assistantTurn: AssistantTurn = {
        id: uid(),
        role: 'assistant',
        text: '',
        tools: [],
        streaming: true,
      };

      const nextTurns = [...turns, userTurn, assistantTurn];
      setTurns(nextTurns);
      setInput('');
      setStreaming(true);

      // History sent to server: alternate user/assistant pairs from current state
      const history = nextTurns
        .filter((t) => t.role === 'user' || (t.role === 'assistant' && t.text.trim().length > 0))
        .map((t) => ({
          role: t.role,
          content: t.role === 'user' ? t.text : (t as AssistantTurn).text || '...',
        }));

      // Drop the last assistant placeholder (it's empty)
      while (history.length > 0 && history[history.length - 1].role === 'assistant') history.pop();

      const ac = new AbortController();
      abortRef.current = ac;

      try {
        const res = await fetch(buildApiUrl('/api/agent/chat'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ messages: history }),
          credentials: 'include',
          signal: ac.signal,
        });

        if (!res.ok || !res.body) {
          const errTxt = (await res.text().catch(() => '')) || `HTTP ${res.status}`;
          throw new Error(errTxt);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Parse complete SSE events (delimited by \n\n)
          let idx;
          while ((idx = buffer.indexOf('\n\n')) !== -1) {
            const raw = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            const lines = raw.split('\n').filter((l) => !l.startsWith(':'));
            const dataLine = lines.find((l) => l.startsWith('data:'));
            if (!dataLine) continue;
            try {
              const payload = JSON.parse(dataLine.slice(5).trim()) as AgentEvent;
              applyEvent(payload, assistantTurn.id);
            } catch {
              /* skip malformed event */
            }
          }
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          // user stopped
        } else {
          toast({
            title: 'Prospector error',
            description: err?.message || 'Request failed',
            variant: 'destructive',
          });
          setTurns((prev) =>
            prev.map((t) =>
              t.id === assistantTurn.id && t.role === 'assistant'
                ? { ...t, text: t.text || '_(request failed)_', streaming: false }
                : t,
            ),
          );
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
        setTurns((prev) =>
          prev.map((t) =>
            t.id === assistantTurn.id && t.role === 'assistant' ? { ...t, streaming: false } : t,
          ),
        );
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    },
    [turns, streaming, toast],
  );

  const applyEvent = useCallback((evt: AgentEvent, assistantId: string) => {
    setTurns((prev) =>
      prev.map((t) => {
        if (t.id !== assistantId || t.role !== 'assistant') return t;
        const a = t as AssistantTurn;
        switch (evt.type) {
          case 'text_delta':
            return { ...a, text: a.text + evt.delta };
          case 'tool_use':
            return {
              ...a,
              tools: [
                ...a.tools,
                { id: evt.id, name: evt.name, input: evt.input, status: 'running' },
              ],
            };
          case 'tool_result':
            return {
              ...a,
              tools: a.tools.map((tc) =>
                tc.id === evt.id
                  ? {
                      ...tc,
                      status: evt.ok ? 'ok' : 'error',
                      summary: evt.summary,
                      data: evt.data,
                    }
                  : tc,
              ),
            };
          default:
            return a;
        }
      }),
    );

    // Track newly saved prospects in the side rail
    if (evt.type === 'tool_result' && evt.name === 'save_prospects' && evt.ok && evt.data?.prospects) {
      setSavedProspects((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const incoming: SavedProspectLite[] = (evt.data.prospects as any[])
          .filter((p) => !seen.has(p.id))
          .map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category,
            url: p.url,
            relevanceScore: p.relevanceScore ?? null,
          }));
        return [...incoming, ...prev].slice(0, 100);
      });
    }
    if (evt.type === 'done' && evt.prospectsSaved > 0) {
      toast({
        title: `Saved ${evt.prospectsSaved} prospect${evt.prospectsSaved === 1 ? '' : 's'}`,
        description: 'Visible in the right rail and in Outreach Prospects.',
      });
    }
    if (evt.type === 'error') {
      toast({ title: 'Agent error', description: evt.message, variant: 'destructive' });
    }
  }, [toast]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      sendPrompt(input);
    } else if (e.key === 'Enter' && !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey) {
      // Shift+Enter for newline; bare Enter sends (matches Claude.ai)
      e.preventDefault();
      sendPrompt(input);
    }
  };

  const isEmpty = turns.length === 0;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-gradient-to-b from-white to-zinc-50">
      {/* Header */}
      <header className="shrink-0 border-b border-zinc-200/70 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[hsl(var(--primary))] text-white shadow-sm">
              <Sparkles className="h-4.5 w-4.5" strokeWidth={2.25} />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-zinc-900">Prospector</h1>
              <p className="text-xs text-zinc-500">
                Conversational outreach research · powered by Claude
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/pr-agent/legacy">
              <Button variant="ghost" size="sm" className="gap-2 text-zinc-600">
                <History className="h-4 w-4" /> Legacy dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Body: chat + saved rail */}
      <div className="flex min-h-0 flex-1">
        {/* Chat column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <ScrollArea className="flex-1">
            <div ref={scrollRef as any} className="mx-auto w-full max-w-3xl px-6 py-8">
              {isEmpty ? (
                <EmptyState onPick={(p) => sendPrompt(p)} />
              ) : (
                <div className="space-y-8">
                  {turns.map((t) =>
                    t.role === 'user' ? (
                      <UserBubble key={t.id} text={t.text} />
                    ) : (
                      <AssistantBubble key={t.id} turn={t} />
                    ),
                  )}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Composer */}
          <div className="shrink-0 border-t border-zinc-200/70 bg-white/95 backdrop-blur">
            <div className="mx-auto w-full max-w-3xl px-6 py-4">
              <div className="group flex items-end gap-2 rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm transition focus-within:border-zinc-400 focus-within:shadow-md">
                <Textarea
                  ref={inputRef as any}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Tell the agent what to find — e.g. 'Find every VC cohort accepting applications right now'"
                  rows={1}
                  className="min-h-[44px] flex-1 resize-none border-0 bg-transparent px-2 py-2.5 text-[15px] leading-snug shadow-none focus-visible:ring-0"
                  disabled={streaming}
                  data-testid="prospector-input"
                />
                {streaming ? (
                  <Button
                    onClick={stop}
                    size="icon"
                    variant="outline"
                    className="h-10 w-10 shrink-0 rounded-xl border-zinc-300"
                    aria-label="Stop"
                    data-testid="prospector-stop"
                  >
                    <Square className="h-4 w-4 fill-current" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => sendPrompt(input)}
                    size="icon"
                    className="h-10 w-10 shrink-0 rounded-xl bg-[hsl(var(--primary))] text-white hover:bg-[hsl(var(--primary))]/90 disabled:opacity-40"
                    aria-label="Send"
                    disabled={!input.trim()}
                    data-testid="prospector-send"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="mt-2 px-1 text-[11px] text-zinc-400">
                Enter to send · Shift+Enter for newline · the agent runs real web searches and saves
                what you approve to Outreach Prospects.
              </p>
            </div>
          </div>
        </div>

        {/* Saved rail (desktop only) */}
        <aside className="hidden w-[340px] shrink-0 border-l border-zinc-200/70 bg-white/60 lg:block">
          <SavedRail saved={savedProspects} />
        </aside>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function EmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="pt-6">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
          What should we find today?
        </h2>
        <p className="mt-2 text-sm text-zinc-500">
          Ask the agent to discover investors, podcasts, or press in plain English. It will run
          live web searches, score results, and save the keepers to your Outreach Prospects.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.label}
              onClick={() => onPick(s.prompt)}
              className="group rounded-xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition hover:border-zinc-300 hover:shadow-md"
              data-testid={`suggestion-${s.label.replace(/\s+/g, '-').toLowerCase()}`}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-zinc-100 text-zinc-700 group-hover:bg-[hsl(var(--primary))] group-hover:text-white">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm font-medium text-zinc-900">{s.label}</span>
              </div>
              <p className="line-clamp-3 text-xs leading-relaxed text-zinc-500">{s.prompt}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-[hsl(var(--primary))] px-4 py-2.5 text-[15px] leading-relaxed text-white shadow-sm">
        <div className="whitespace-pre-wrap">{text}</div>
      </div>
    </div>
  );
}

function AssistantBubble({ turn }: { turn: AssistantTurn }) {
  return (
    <div className="flex gap-3">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-zinc-900 text-white">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        {turn.tools.map((tc) => (
          <ToolCard key={tc.id} call={tc} />
        ))}
        {(turn.text || turn.streaming) && (
          <div className="rounded-2xl rounded-tl-sm border border-zinc-200/70 bg-white px-4 py-3 text-[15px] leading-relaxed text-zinc-800 shadow-sm">
            <Markdown text={turn.text} />
            {turn.streaming && !turn.text && (
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> thinking…
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ToolCard({ call }: { call: ToolCall }) {
  const meta = TOOL_META[call.name] || {
    icon: Search,
    label: call.name,
    tone: 'text-zinc-700 bg-zinc-50 border-zinc-200',
  };
  const Icon = meta.icon;
  const [open, setOpen] = useState(call.status === 'running');

  // Friendly inline summary
  const inline = useMemo(() => {
    if (call.name === 'web_search') {
      const q = call.input?.query;
      const cat = call.input?.category;
      return q ? `${cat ? `[${cat}] ` : ''}${String(q).slice(0, 80)}${String(q).length > 80 ? '…' : ''}` : '';
    }
    if (call.name === 'scrape_page') {
      try {
        const u = new URL(call.input?.url || '');
        return u.hostname + u.pathname;
      } catch {
        return call.input?.url || '';
      }
    }
    if (call.name === 'map_site') {
      try {
        const u = new URL(call.input?.url || '');
        return call.input?.search ? `${u.hostname} · “${call.input.search}”` : u.hostname;
      } catch {
        return call.input?.url || '';
      }
    }
    if (call.name === 'save_prospects') {
      const n = Array.isArray(call.input?.prospects) ? call.input.prospects.length : 0;
      return n ? `${n} candidate${n === 1 ? '' : 's'}` : '';
    }
    if (call.name === 'list_existing_prospects') {
      return call.input?.category ? `category: ${call.input.category}` : 'all categories';
    }
    if (call.name === 'list_pitch_templates') {
      return call.input?.category ? `category: ${call.input.category}` : 'all';
    }
    if (call.name === 'draft_pitch') {
      return call.input?.template_id ? `template: ${call.input.template_id}` : 'auto-template';
    }
    if (call.name === 'polish_text') {
      return call.input?.mode || 'email';
    }
    if (call.name === 'send_pitch') {
      return call.input?.pitch_id ? String(call.input.pitch_id).slice(0, 8) : '';
    }
    return '';
  }, [call.input, call.name]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className={`rounded-xl border ${meta.tone}`}>
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center gap-2.5 px-3 py-2 text-left">
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs font-semibold tracking-tight">{meta.label}</span>
            {inline && (
              <span className="truncate text-xs font-normal opacity-70">· {inline}</span>
            )}
            <span className="ml-auto flex items-center gap-2">
              {call.status === 'running' && (
                <Loader2 className="h-3.5 w-3.5 animate-spin opacity-70" />
              )}
              {call.status === 'ok' && <CheckCircle2 className="h-3.5 w-3.5 opacity-70" />}
              {call.status === 'error' && <AlertCircle className="h-3.5 w-3.5 opacity-70" />}
              {call.summary && (
                <span className="text-xs font-medium opacity-90">{call.summary}</span>
              )}
              {open ? (
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 opacity-50" />
              )}
            </span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-current/10 px-3 py-2.5 text-xs">
            <ToolBody call={call} />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function ToolBody({ call }: { call: ToolCall }) {
  if (call.name === 'web_search' && call.data?.results) {
    const rows = call.data.results as any[];
    if (rows.length === 0) return <span className="text-zinc-500">No results.</span>;
    return (
      <ul className="space-y-2">
        {rows.slice(0, 10).map((r, i) => (
          <li key={i} className="space-y-0.5">
            <div className="flex items-start gap-2">
              <a
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="truncate font-medium text-zinc-900 hover:underline"
                title={r.url}
              >
                {r.title || r.url}
              </a>
              <ExternalLink className="h-3 w-3 shrink-0 text-zinc-400" />
            </div>
            {r.description && (
              <div className="line-clamp-2 text-[11px] text-zinc-500">{r.description}</div>
            )}
          </li>
        ))}
      </ul>
    );
  }
  if (call.name === 'scrape_page' && call.data?.ok) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <a
            href={call.data.url}
            target="_blank"
            rel="noreferrer"
            className="truncate font-medium text-zinc-900 hover:underline"
          >
            {call.data.title || call.data.url}
          </a>
          <ExternalLink className="h-3 w-3 shrink-0 text-zinc-400" />
        </div>
        {call.data.markdown && (
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded bg-white/60 p-2 text-[11px] leading-snug text-zinc-700">
            {String(call.data.markdown).slice(0, 1200)}
            {String(call.data.markdown).length > 1200 ? '…' : ''}
          </pre>
        )}
      </div>
    );
  }
  if (call.name === 'map_site' && call.data?.links) {
    const links = call.data.links as any[];
    if (links.length === 0) return <span className="text-zinc-500">No URLs found.</span>;
    return (
      <ul className="space-y-1">
        {links.slice(0, 20).map((l, i) => (
          <li key={i} className="flex items-center gap-2">
            <a
              href={l.url}
              target="_blank"
              rel="noreferrer"
              className="truncate text-[11px] text-zinc-700 hover:underline"
            >
              {l.title || l.url}
            </a>
          </li>
        ))}
      </ul>
    );
  }
  if (call.name === 'save_prospects' && call.data?.prospects) {
    const rows = call.data.prospects as any[];
    return (
      <div className="space-y-1.5">
        {rows.length === 0 && <div className="text-zinc-500">Nothing new to save.</div>}
        {rows.map((p) => (
          <div key={p.id} className="flex items-center gap-2">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            <span className="font-medium text-zinc-900">{p.name}</span>
            <Badge variant="outline" className="text-[10px]">
              {p.category}
            </Badge>
            {p.relevanceScore != null && (
              <span className="text-zinc-500">score {p.relevanceScore}</span>
            )}
          </div>
        ))}
        {call.data.duplicate_names?.length > 0 && (
          <div className="pt-1 text-zinc-500">
            Skipped {call.data.duplicate_names.length} duplicate
            {call.data.duplicate_names.length === 1 ? '' : 's'}: {call.data.duplicate_names.join(', ')}
          </div>
        )}
      </div>
    );
  }
  if (call.name === 'list_existing_prospects' && call.data?.prospects) {
    return (
      <div className="space-y-1">
        {(call.data.prospects as any[]).slice(0, 15).map((p) => (
          <div key={p.id} className="flex items-center gap-2">
            <span className="font-medium text-zinc-900">{p.name}</span>
            <Badge variant="outline" className="text-[10px]">
              {p.category}
            </Badge>
            <span className="text-zinc-500">{p.status}</span>
          </div>
        ))}
      </div>
    );
  }
  if (call.name === 'list_pitch_templates' && call.data?.templates) {
    return (
      <div className="space-y-1">
        {(call.data.templates as any[]).map((t) => (
          <div key={t.id} className="flex items-baseline gap-2">
            <code className="rounded bg-white/60 px-1 py-0.5 text-[10px] text-zinc-700">{t.id}</code>
            <span className="font-medium text-zinc-900">{t.name}</span>
            <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
          </div>
        ))}
      </div>
    );
  }
  if ((call.name === 'draft_pitch' || (call.name === 'polish_text' && call.data?.mode === 'email')) && call.data?.ok) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[11px] text-zinc-500">
          <span>To:</span>
          <span className="font-medium text-zinc-700">{call.data.prospect_name || '—'}</span>
          {call.data.template_used && (
            <Badge variant="outline" className="text-[10px]">{call.data.template_used}</Badge>
          )}
        </div>
        <div className="rounded-md border border-zinc-200 bg-white p-2.5">
          <div className="text-[11px] uppercase tracking-wide text-zinc-400">Subject</div>
          <div className="text-sm font-semibold text-zinc-900">{call.data.subject}</div>
        </div>
        <div className="rounded-md border border-zinc-200 bg-white p-2.5">
          <div className="text-[11px] uppercase tracking-wide text-zinc-400 mb-1">Body</div>
          <pre className="whitespace-pre-wrap break-words text-[12px] leading-snug text-zinc-800 font-sans">{call.data.body}</pre>
        </div>
        {call.data.pitch_id && (
          <div className="text-[11px] text-zinc-500">
            Saved as draft · <code className="text-zinc-700">{String(call.data.pitch_id).slice(0, 8)}</code>
          </div>
        )}
      </div>
    );
  }
  if (call.name === 'polish_text' && call.data?.ok) {
    if (call.data.mode === 'elevator') {
      return (
        <div className="rounded-md border border-fuchsia-200 bg-white p-3">
          <div className="text-[11px] uppercase tracking-wide text-fuchsia-500 mb-1">Elevator pitch</div>
          <p className="text-sm leading-relaxed text-zinc-800">{call.data.elevator}</p>
        </div>
      );
    }
    if (call.data.mode === 'rewrite') {
      return (
        <div className="rounded-md border border-zinc-200 bg-white p-3">
          <pre className="whitespace-pre-wrap break-words text-sm text-zinc-800 font-sans">{call.data.rewritten}</pre>
        </div>
      );
    }
  }
  if (call.name === 'send_pitch' && call.data?.ok) {
    return (
      <div className="space-y-1 text-[12px]">
        <div className="flex items-center gap-1.5 text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span className="font-semibold">Sent</span>
        </div>
        <div className="text-zinc-700"><span className="text-zinc-500">To:</span> {call.data.to}</div>
        <div className="text-zinc-700"><span className="text-zinc-500">Subject:</span> {call.data.subject}</div>
        {call.data.message_id && (
          <div className="text-zinc-500">message-id: <code>{call.data.message_id}</code></div>
        )}
      </div>
    );
  }
  return (
    <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-zinc-600">
      {JSON.stringify(call.data ?? call.input, null, 2)}
    </pre>
  );
}

function SavedRail({ saved }: { saved: SavedProspectLite[] }) {
  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-zinc-200/70 px-5 py-4">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-zinc-900">Saved this session</h3>
          <Link href="/admin/pr-agent/legacy">
            <span className="text-xs text-zinc-500 hover:text-zinc-900">View all →</span>
          </Link>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          {saved.length === 0 ? 'Nothing saved yet.' : `${saved.length} prospect${saved.length === 1 ? '' : 's'} added.`}
        </p>
      </div>
      <ScrollArea className="flex-1 px-3 py-3">
        <div className="space-y-2">
          {saved.map((p) => (
            <div
              key={p.id}
              className="group rounded-lg border border-zinc-200 bg-white p-3 shadow-sm transition hover:border-zinc-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-zinc-900">{p.name}</div>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-zinc-500 hover:text-zinc-900"
                  >
                    {p.url.replace(/^https?:\/\//, '').replace(/^www\./, '')}
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
                {p.relevanceScore != null && (
                  <span className="shrink-0 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-zinc-700">
                    {p.relevanceScore}
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium capitalize ${CATEGORY_TONE[p.category] || ''}`}
                >
                  {p.category}
                </span>
              </div>
            </div>
          ))}
          {saved.length === 0 && (
            <div className="rounded-lg border border-dashed border-zinc-200 px-4 py-10 text-center text-xs text-zinc-400">
              Prospects you save in this conversation appear here.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// Tiny markdown renderer — bullet lists + bold + line breaks. Keeps page fast
// without pulling in a full markdown lib.
function Markdown({ text }: { text: string }) {
  if (!text) return null;
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let listBuf: string[] = [];

  const flushList = (key: string) => {
    if (listBuf.length === 0) return;
    blocks.push(
      <ul key={key} className="my-2 list-disc space-y-1 pl-5">
        {listBuf.map((l, i) => (
          <li key={i}>{inline(l)}</li>
        ))}
      </ul>,
    );
    listBuf = [];
  };

  lines.forEach((raw, i) => {
    const m = raw.match(/^\s*[-*•]\s+(.*)$/);
    if (m) {
      listBuf.push(m[1]);
    } else {
      flushList(`l${i}`);
      if (raw.trim()) {
        blocks.push(
          <p key={`p${i}`} className="my-1.5 first:mt-0 last:mb-0">
            {inline(raw)}
          </p>,
        );
      }
    }
  });
  flushList('end');
  return <>{blocks}</>;
}

function inline(s: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) parts.push(s.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) {
      parts.push(
        <strong key={key++} className="font-semibold text-zinc-900">
          {tok.slice(2, -2)}
        </strong>,
      );
    } else if (tok.startsWith('`')) {
      parts.push(
        <code key={key++} className="rounded bg-zinc-100 px-1 py-0.5 text-[0.85em] text-zinc-800">
          {tok.slice(1, -1)}
        </code>,
      );
    }
    last = m.index + tok.length;
  }
  if (last < s.length) parts.push(s.slice(last));
  return parts;
}
