/**
 * Conversational Prospector Agent — Anthropic Claude with native tool-use,
 * streamed via SSE to the admin Prospector chat UI.
 *
 * The user types natural-language requests like:
 *   "Find every VC accelerator cohort accepting applications right now"
 *   "Find longevity podcasts with 10k+ downloads booking guests for Q3"
 *
 * Claude decides when to web_search, save_prospects, list_existing,
 * enrich, etc. Results land in the same `outreach_prospects` table the
 * existing PR/Outreach pipeline already reads from, so pitches/CRM keep
 * working unchanged.
 */
import Anthropic from '@anthropic-ai/sdk';
import Firecrawl from '@mendable/firecrawl-js';
import logger from '../../infra/logging/logger';
import { agentRepository } from './agent.repository';
import { enrichProspect } from './tools/prospect-enrichment';
import { draftPitch } from './engines/draft-pitch';
import { sendPitchEmail } from './engines/gmail-sender';
import { ALL_TEMPLATES, getTemplateById } from './templates/pitch-templates';
import { getFounderProfile } from './founder-context';
import type { InsertOutreachProspect } from '@shared/schema';

const ANTHROPIC_MODEL = 'claude-sonnet-4-5-20250929';
const MAX_ITERATIONS = 12;

// Firecrawl client (lazy)
let _firecrawl: Firecrawl | null = null;
function firecrawl(): Firecrawl {
  if (!_firecrawl) {
    if (!process.env.FIRECRAWL_API_KEY) {
      throw new Error('FIRECRAWL_API_KEY is not configured on the server.');
    }
    _firecrawl = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY });
  }
  return _firecrawl;
}

// ── Event types streamed to the UI ───────────────────────────────────────────

export type AgentEvent =
  | { type: 'text_delta'; delta: string }
  | { type: 'thinking_start' }
  | { type: 'thinking_stop' }
  | { type: 'tool_use'; id: string; name: string; input: any }
  | { type: 'tool_result'; id: string; name: string; ok: boolean; summary: string; data?: any }
  | { type: 'message_start' }
  | { type: 'message_stop' }
  | { type: 'done'; prospectsSaved: number; iterations: number }
  | { type: 'error'; message: string };

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ── Tool definitions for Claude ──────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'web_search',
    description:
      'Search the live web via Firecrawl. Returns the top result URLs with the actual page content as markdown (not just snippets). Use this whenever the operator asks you to find, discover, or hunt for outreach prospects — VC firms, accelerators, podcasts, journalists, publications, conferences. After searching, READ the markdown to determine which results are real, then call save_prospects to persist the keepers. If a result page is too sparse, call scrape_page to fetch it in full or map_site to find a better URL on the same domain.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'A focused search query, e.g. "Y Combinator W2026 batch application deadline" or "longevity podcasts booking guests 2026".',
        },
        category: {
          type: 'string',
          enum: ['podcast', 'press', 'investor'],
          description: 'Which prospect bucket these results belong to (used for tracking only — Firecrawl returns whatever the web returns).',
        },
        max_results: {
          type: 'number',
          description: 'Max results to return (1-10). Default 6. Higher = more tokens.',
        },
      },
      required: ['query', 'category'],
    },
  },
  {
    name: 'scrape_page',
    description: 'Fetch the full markdown of a single URL via Firecrawl. Use when web_search returned a promising URL but with too little content, or when you need to verify contact info / application deadline / partner list on a specific page.',
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The full URL to scrape (must start with http/https).' },
      },
      required: ['url'],
    },
  },
  {
    name: 'map_site',
    description: 'Discover URLs on a domain via Firecrawl. Use to find the right page on a large site, e.g. "find the partners page on a16z.com" or "find the contact form on techcrunch.com". Returns a list of URLs (and titles where available). Optionally filter with a search term.',
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Root domain or URL to map.' },
        search: { type: 'string', description: 'Optional keyword filter (e.g. "team", "contact", "apply").' },
        limit: { type: 'number', description: 'Max URLs to return (1-50). Default 20.' },
      },
      required: ['url'],
    },
  },
  {
    name: 'save_prospects',
    description:
      'Persist one or more discovered prospects to the database. Always call this after web_search if the user wants results saved. Duplicates (same normalized URL) are silently skipped server-side.',
    input_schema: {
      type: 'object',
      properties: {
        prospects: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              category: { type: 'string', enum: ['podcast', 'press', 'investor'] },
              sub_type: { type: 'string', description: 'Optional subtype matching the category.' },
              url: { type: 'string' },
              contact_email: { type: 'string' },
              contact_form_url: { type: 'string' },
              host_name: { type: 'string' },
              publication_name: { type: 'string' },
              audience_estimate: { type: 'string' },
              relevance_score: { type: 'number', description: '0-100' },
              topics: { type: 'array', items: { type: 'string' } },
              notes: { type: 'string', description: 'Why this is relevant — shows up in the prospect detail view.' },
            },
            required: ['name', 'category', 'url'],
          },
        },
      },
      required: ['prospects'],
    },
  },
  {
    name: 'list_existing_prospects',
    description:
      'Look up prospects already saved in the database. Use this when the user asks "what do we have", "show me current investors", "any podcasts already saved", or to avoid re-searching for things we already found.',
    input_schema: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: ['podcast', 'press', 'investor'] },
        min_score: { type: 'number' },
        limit: { type: 'number', description: 'Default 25, max 100.' },
      },
    },
  },
  {
    name: 'enrich_prospect',
    description:
      'Pull deeper data on a saved prospect (RSS recency, journalist contacts, social links). Use when the user asks for more detail on a specific entity by id.',
    input_schema: {
      type: 'object',
      properties: {
        prospect_id: { type: 'string' },
      },
      required: ['prospect_id'],
    },
  },
  {
    name: 'list_pitch_templates',
    description:
      'List the available pitch templates (podcast guest, founder feature, investor angel, etc.) so the operator can pick one. Returns id, name, category, and a one-line description.',
    input_schema: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: ['podcast', 'press', 'investor'], description: 'Optional filter.' },
      },
    },
  },
  {
    name: 'draft_pitch',
    description:
      'Generate a personalized cold-email pitch for a saved prospect. Uses the founder profile (Pete @ Ones) and pitch templates. Returns subject + body and saves it as a pending_review pitch in the database. The operator can then approve and send it. If the operator typed their own draft or wants tweaks, prefer polish_text instead.',
    input_schema: {
      type: 'object',
      properties: {
        prospect_id: { type: 'string', description: 'The prospect to pitch.' },
        template_id: { type: 'string', description: 'Optional template id from list_pitch_templates. If omitted, the best template for the prospect category/sub_type is auto-selected.' },
        custom_instructions: { type: 'string', description: 'Optional extra guidance from the operator (e.g. "open with a question about their last episode", "keep it under 60 words").' },
      },
      required: ['prospect_id'],
    },
  },
  {
    name: 'polish_text',
    description:
      'Take text the operator wrote (or pasted) and polish it as an outreach email — fix grammar, tighten, match the Ones brand voice (warm, no buzzwords, no emojis, no em-dashes), and shape it into a real email with subject + body. ALSO use this when the operator asks for an "elevator pitch" or "10-second pitch" — set mode="elevator". If a prospect_id is provided, personalize for that prospect.',
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'The raw text to polish, or a description of what the operator wants to say.' },
        mode: { type: 'string', enum: ['email', 'elevator', 'rewrite'], description: 'email = full subject+body cold pitch. elevator = a single 30-50 word elevator pitch paragraph. rewrite = clean up grammar/tone only, return same shape.' },
        prospect_id: { type: 'string', description: 'Optional. If provided, personalize for this prospect.' },
        save_as_pitch: { type: 'boolean', description: 'If true AND mode=email AND prospect_id is provided, save the result as a pending_review pitch.' },
      },
      required: ['text'],
    },
  },
  {
    name: 'send_pitch',
    description:
      'Send an already-drafted pitch by id. Only call this when the operator EXPLICITLY says "send it" / "send the email" / "send to <name>". This actually emails the prospect via Gmail (or SendGrid fallback). Will auto-flip the pitch status from pending_review to approved before sending.',
    input_schema: {
      type: 'object',
      properties: {
        pitch_id: { type: 'string' },
      },
      required: ['pitch_id'],
    },
  },
];

// ── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the Prospector — an autonomous outreach research and pitch agent for Ones (ones.health), a personalized supplement company that uses AI + blood work to formulate custom daily supplements.

THE BUSINESS (use this whenever you draft anything):
  Ones solves a two-sided supplement problem. People are either (a) buying 10+ different bottles, guessing at what they need, overdosing on some things, underdosing on others, getting lower-quality ingredients, OR (b) settling for a generic AG1/multivitamin with zero customization. Ones uses AI to analyze your blood work, health data, and wearable metrics (Oura, Whoop, Fitbit) and designs ONE custom supplement from 150+ ingredients at research-backed doses, built specifically for you. The AI keeps adapting the formula as your data changes. Founder: Pete (pete@ones.health).

Two things you do for the operator:

A) DISCOVERY — find prospects in three buckets:
  • investor — angel investors, VCs, accelerators (YC, a16z Speedrun, Techstars), family offices investing in consumer health / DTC / health tech
  • podcast — health, longevity, biohacking, nutrition, founder/business podcasts that book guests
  • press — magazines, newsletters, journalists covering health/wellness/supplements/tech

B) PITCHING — draft, polish, and (on explicit request) send outreach emails.

Your tools (in priority order):
  1. web_search — Firecrawl search. Returns top URLs WITH the actual page markdown. This is your primary discovery tool.
  2. scrape_page — full markdown for one URL. Use to verify contact info, deadlines, partner names.
  3. map_site — find the right URL on a domain (partners page, contact page, application page).
  4. list_existing_prospects — check what's already in the DB before re-discovering.
  5. enrich_prospect — pull deeper data (RSS, social) on a saved prospect by id.
  6. save_prospects — persist your keepers to the database. Duplicates auto-skip server-side.
  7. list_pitch_templates — show available pitch templates.
  8. draft_pitch — generate a personalized cold-email pitch for a saved prospect (uses founder profile + template).
  9. polish_text — clean up text the operator wrote, OR generate an elevator pitch (mode="elevator").
  10. send_pitch — actually email a saved pitch. ONLY call when operator explicitly says "send".

How to behave:
1. Read the request carefully. If genuinely ambiguous, ask ONE clarifying question. Otherwise just go.
2. Plan briefly out loud (1-3 sentences) what queries/sites you'll hit.
3. For broad discovery asks ("every VC cohort accepting apps"), run multiple parallel web_search calls (YC, a16z Speedrun, Techstars, Antler, EF, etc.).
4. READ the markdown that Firecrawl returns. Don't blindly save — verify the page is real, the entity exists, and there's a contact path.
5. If a search result is too thin, scrape_page the URL to read the full page. If you need to find the contact/apply/partners page on a domain, use map_site first.
6. Extract real data: name, exact URL, contact_email if visible, contact_form_url, host_name (podcast)/publication_name (press), application deadline (accelerators) into notes.
7. Call save_prospects with the keepers. Score 0-100 honestly; 80+ should be rare and reserved for perfect fits.
8. Summarize what you saved in 2-4 bullets, with names + 1-line "why" each. Mention duplicates skipped.

Pitching workflow:
- "Draft me a pitch to <prospect>" → look up the prospect (list_existing_prospects if needed for the id), then draft_pitch. Show the subject + body in your reply so the operator can read it.
- "Clean this up: <text>" / "Polish this email: <text>" → polish_text with mode="email" (or "rewrite" if they just want grammar/tone).
- "Give me an elevator pitch" / "10-second pitch" → polish_text with mode="elevator". Return ONE warm 30-50 word paragraph in Pete's voice. NO subject line.
- "Send it" / "Send to <name>" → send_pitch with the most recent draft's id. Confirm delivery in your reply.

Hard rules:
- NEVER invent a URL, email, name, fund size, or deadline. If it's not in the markdown you read, don't claim it.
- Skip defunct sites, content farms, and entities with zero contact path.
- For accelerators: include batch name + application deadline in notes when visible on the page.
- Voice rules for ALL drafted/polished text: warm and human, NO buzzwords ("disrupt", "revolutionize", "cutting-edge", "world's first"), NO emojis, NO em-dashes (use commas/periods), NO market-size claims.
- NEVER call send_pitch unless the operator's last message explicitly says to send.
- Be concise. The operator is technical and busy.`;

// ── Tool executors ───────────────────────────────────────────────────────────

const MAX_MARKDOWN_PER_RESULT = 1800; // chars — keeps token usage sane

function truncate(s: string | undefined | null, n: number): string {
  if (!s) return '';
  if (s.length <= n) return s;
  return s.slice(0, n) + '\n…[truncated]';
}

async function executeWebSearch(args: { query: string; category: string; max_results?: number }) {
  const limit = Math.min(Math.max(args.max_results || 6, 1), 10);
  const fc = firecrawl();
  const data = await fc.search(args.query, {
    limit,
    sources: ['web'],
    scrapeOptions: {
      formats: ['markdown'],
      onlyMainContent: true,
      blockAds: true,
      timeout: 25_000,
    },
  });

  const web = (data.web || []) as any[];
  const results = web.map((r) => ({
    title: r.title || r.metadata?.title || null,
    url: r.url || r.metadata?.sourceURL || null,
    description: r.description || r.metadata?.description || null,
    markdown: truncate(r.markdown, MAX_MARKDOWN_PER_RESULT),
  })).filter((r) => r.url);

  return {
    query: args.query,
    category: args.category,
    found: results.length,
    results,
  };
}

async function executeScrapePage(args: { url: string }) {
  if (!args.url || !/^https?:\/\//i.test(args.url)) {
    return { ok: false, error: 'invalid url' };
  }
  const fc = firecrawl();
  const doc = await fc.scrape(args.url, {
    formats: ['markdown'],
    onlyMainContent: true,
    blockAds: true,
    timeout: 30_000,
  });
  return {
    ok: true,
    url: args.url,
    title: (doc as any).metadata?.title || null,
    markdown: truncate((doc as any).markdown, 8000),
  };
}

async function executeMapSite(args: { url: string; search?: string; limit?: number }) {
  if (!args.url || !/^https?:\/\//i.test(args.url)) {
    return { ok: false, error: 'invalid url' };
  }
  const fc = firecrawl();
  const data = await fc.map(args.url, {
    search: args.search,
    limit: Math.min(Math.max(args.limit || 20, 1), 50),
  });
  const links = (data.links || []).slice(0, args.limit || 20).map((l: any) => ({
    url: l.url || l,
    title: l.title || null,
    description: l.description || null,
  }));
  return { ok: true, url: args.url, found: links.length, links };
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname.replace(/^www\./, '')}${u.pathname.replace(/\/$/, '')}`.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function executeSaveProspects(args: { prospects: any[] }) {
  const inputs = (args.prospects || []).filter((p) => p?.name && p?.url && p?.category);
  if (inputs.length === 0) return { saved: 0, duplicates: 0, ids: [] };

  // Dedup against existing
  const normalizedUrls = inputs.map((p) => normalizeUrl(p.url));
  const normalizedNames = inputs.map((p) => normalizeName(p.name));
  const { existingUrls, existingNames } = await agentRepository.getExistingProspects(
    normalizedUrls,
    normalizedNames,
  );

  const fresh: InsertOutreachProspect[] = [];
  const dupes: string[] = [];
  for (const p of inputs) {
    const nu = normalizeUrl(p.url);
    const nn = normalizeName(p.name);
    if (existingUrls.has(nu) || existingNames.has(nn)) {
      dupes.push(p.name);
      continue;
    }
    fresh.push({
      name: String(p.name).slice(0, 200),
      normalizedName: nn,
      category: p.category,
      subType: p.sub_type || null,
      url: String(p.url),
      normalizedUrl: nu,
      contactEmail: p.contact_email || null,
      contactFormUrl: p.contact_form_url || null,
      hostName: p.host_name || null,
      publicationName: p.publication_name || null,
      audienceEstimate: p.audience_estimate || null,
      relevanceScore: typeof p.relevance_score === 'number' ? Math.round(p.relevance_score) : null,
      topics: Array.isArray(p.topics) ? p.topics : [],
      contactMethod: p.contact_email ? 'email' : (p.contact_form_url ? 'form' : 'unknown'),
      notes: p.notes || null,
      source: 'prospector_chat',
    } as InsertOutreachProspect);
  }

  const created = await agentRepository.createProspects(fresh);
  return {
    saved: created.length,
    duplicates: dupes.length,
    duplicate_names: dupes,
    ids: created.map((p) => p.id),
    prospects: created.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      url: p.url,
      relevanceScore: p.relevanceScore,
    })),
  };
}

async function executeListExisting(args: { category?: string; min_score?: number; limit?: number }) {
  const { prospects, total } = await agentRepository.listProspects({
    category: args.category as any,
    minScore: args.min_score,
    limit: Math.min(args.limit || 25, 100),
  });
  return {
    total,
    returned: prospects.length,
    prospects: prospects.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      sub_type: p.subType,
      url: p.url,
      contact_email: p.contactEmail,
      relevance_score: p.relevanceScore,
      status: p.status,
      audience_estimate: p.audienceEstimate,
    })),
  };
}

async function executeEnrich(args: { prospect_id: string }) {
  const p = await agentRepository.getProspectById(args.prospect_id);
  if (!p) return { ok: false, error: 'prospect not found' };
  const data = await enrichProspect(p);
  return { ok: true, enrichment: data };
}

async function executeListTemplates(args: { category?: string }) {
  const filtered = args.category
    ? ALL_TEMPLATES.filter((t) => t.category === args.category)
    : ALL_TEMPLATES;
  return {
    count: filtered.length,
    templates: filtered.map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      tone: t.toneGuidance?.slice(0, 120) || null,
      max_length_words: t.maxLength,
    })),
  };
}

async function executeDraftPitch(args: {
  prospect_id: string;
  template_id?: string;
  custom_instructions?: string;
}) {
  const prospect = await agentRepository.getProspectById(args.prospect_id);
  if (!prospect) return { ok: false, error: 'prospect not found' };

  const template = args.template_id ? getTemplateById(args.template_id) : undefined;
  if (args.template_id && !template) {
    return { ok: false, error: `template not found: ${args.template_id}` };
  }

  // If custom instructions, append them to the prospect notes for this draft only
  // (draft-pitch reads prospect.notes in its context block).
  let prospectForDraft = prospect;
  if (args.custom_instructions) {
    prospectForDraft = {
      ...prospect,
      notes: `${prospect.notes || ''}\n\nOPERATOR INSTRUCTIONS: ${args.custom_instructions}`.trim(),
    } as typeof prospect;
  }

  try {
    const result = await draftPitch(prospectForDraft, template);
    return {
      ok: true,
      pitch_id: result.pitchId,
      prospect_id: result.prospectId,
      prospect_name: prospect.name,
      subject: result.subject,
      body: result.body,
      template_used: result.templateUsed,
      category: result.category,
    };
  } catch (err: any) {
    return { ok: false, error: err.message || 'draft failed' };
  }
}

async function executePolishText(args: {
  text: string;
  mode?: 'email' | 'elevator' | 'rewrite';
  prospect_id?: string;
  save_as_pitch?: boolean;
}) {
  const mode = args.mode || 'email';
  const profile = await getFounderProfile();

  let prospect = null as Awaited<ReturnType<typeof agentRepository.getProspectById>>;
  if (args.prospect_id) {
    prospect = await agentRepository.getProspectById(args.prospect_id);
    if (!prospect) return { ok: false, error: 'prospect not found' };
  }

  const VOICE_RULES = `Brand voice rules (HARD):
- Warm, human, understated. Like one founder talking to another.
- NO buzzwords: disrupt, revolutionize, game-changing, cutting-edge, world's first, $XB industry.
- NO emojis. NO em-dashes (— ). Use commas/periods/new sentences instead.
- NO "Hey!" / "Hey there!" — start with "Hi <Name>," or just "<Name>,".
- Short sentences. It's OK to be brief. Less is more.
- Frame the value prop personally ("something I struggled with"), not as a market opportunity.`;

  const FOUNDER_BLOCK = `FOUNDER / COMPANY:
${profile.bioShort}

Talking points to draw from:
${profile.talkingPoints.slice(0, 5).map((t) => '- ' + t).join('\n')}

Unique angles:
${profile.uniqueAngles.slice(0, 3).map((t) => '- ' + t).join('\n')}`;

  const PROSPECT_BLOCK = prospect
    ? `\n\nPROSPECT:
- Name: ${prospect.name}
- Category: ${prospect.category}
- ${prospect.hostName ? `Host: ${prospect.hostName}` : prospect.publicationName ? `Publication: ${prospect.publicationName}` : ''}
- Topics: ${(prospect.topics || []).join(', ') || 'health, wellness'}
- Notes: ${prospect.notes || 'none'}`
    : '';

  let task = '';
  let outputShape = '';
  if (mode === 'elevator') {
    task = `Write a single 30-50 word elevator pitch in Pete's first-person voice that he could say out loud in ~10 seconds. ONE paragraph. Hook with the two-sided supplement problem, then the Ones solution. No subject line. No greeting. No sign-off.`;
    outputShape = `Return JSON: {"elevator": "the 30-50 word paragraph"}`;
  } else if (mode === 'rewrite') {
    task = `Take the operator's text below and clean it up: fix grammar, tighten, remove filler, apply the brand voice rules. Keep the original intent and structure. Do NOT add new claims.`;
    outputShape = `Return JSON: {"rewritten": "the cleaned-up text"}`;
  } else {
    task = `Take the operator's input below (which may be a rough draft, a few bullet points, or just a description of what they want to say) and turn it into a complete cold-email outreach pitch ${prospect ? `to "${prospect.name}"` : ''}. Use the brand voice. Personalize where possible.`;
    outputShape = `Return JSON: {"subject": "the subject line", "body": "the email body (plain text, no HTML)"}`;
  }

  const system = `You are Pete's writing assistant for outreach emails.\n\n${VOICE_RULES}\n\n${FOUNDER_BLOCK}${PROSPECT_BLOCK}\n\nTASK: ${task}\n\n${outputShape}\nReturn ONLY the JSON object. No prose. No code fences.`;

  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: 'ANTHROPIC_API_KEY not configured' };
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const resp = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 1500,
    temperature: 0.6,
    system,
    messages: [{ role: 'user', content: `OPERATOR INPUT:\n"""\n${args.text}\n"""` }],
  });
  const raw = resp.content.find((b) => b.type === 'text')?.type === 'text'
    ? (resp.content.find((b) => b.type === 'text') as any).text
    : '';
  const m = raw.match(/\{[\s\S]*\}/);
  let parsed: any = {};
  try { parsed = m ? JSON.parse(m[0]) : {}; } catch { parsed = {}; }

  if (mode === 'elevator') {
    return { ok: true, mode, elevator: parsed.elevator || raw.trim() };
  }
  if (mode === 'rewrite') {
    return { ok: true, mode, rewritten: parsed.rewritten || raw.trim() };
  }

  // mode === 'email'
  const subject = parsed.subject || `Quick note from Pete at Ones`;
  const body = parsed.body || raw.trim();

  let pitchId: string | null = null;
  if (args.save_as_pitch && prospect) {
    const created = await agentRepository.createPitch({
      prospectId: prospect.id,
      category: prospect.category,
      pitchType: 'initial',
      templateUsed: 'polish_text',
      subject,
      body,
      status: 'pending_review',
    });
    pitchId = created.id;
    await agentRepository.updateProspectStatus(prospect.id, 'pitched');
  }

  return {
    ok: true,
    mode,
    subject,
    body,
    pitch_id: pitchId,
    prospect_id: prospect?.id || null,
    prospect_name: prospect?.name || null,
  };
}

async function executeSendPitch(args: { pitch_id: string }) {
  const pitch = await agentRepository.getPitchById(args.pitch_id);
  if (!pitch) return { ok: false, error: 'pitch not found' };
  const prospect = await agentRepository.getProspectById(pitch.prospectId);
  if (!prospect) return { ok: false, error: 'prospect not found' };

  // Auto-approve if it's still a draft (operator's natural-language "send it" implies approval).
  if (pitch.status !== 'sent' && pitch.status !== 'approved') {
    await agentRepository.updatePitch(pitch.id, { status: 'approved' });
    pitch.status = 'approved';
  }

  const result = await sendPitchEmail(pitch, prospect);
  if (!result.success) return { ok: false, error: result.error };
  return {
    ok: true,
    pitch_id: pitch.id,
    prospect_name: prospect.name,
    to: prospect.contactEmail,
    subject: pitch.subject,
    message_id: result.messageId,
  };
}

async function runTool(name: string, input: any) {
  switch (name) {
    case 'web_search':
      return executeWebSearch(input);
    case 'scrape_page':
      return executeScrapePage(input);
    case 'map_site':
      return executeMapSite(input);
    case 'save_prospects':
      return executeSaveProspects(input);
    case 'list_existing_prospects':
      return executeListExisting(input);
    case 'enrich_prospect':
      return executeEnrich(input);
    case 'list_pitch_templates':
      return executeListTemplates(input);
    case 'draft_pitch':
      return executeDraftPitch(input);
    case 'polish_text':
      return executePolishText(input);
    case 'send_pitch':
      return executeSendPitch(input);
    default:
      throw new Error(`unknown tool: ${name}`);
  }
}

function summarizeToolResult(name: string, result: any): string {
  if (name === 'web_search') return `Found ${result?.found ?? 0} results`;
  if (name === 'scrape_page') return result?.ok ? `Scraped ${result.url}` : `Scrape failed: ${result?.error}`;
  if (name === 'map_site') return result?.ok ? `Mapped ${result.found} URLs` : `Map failed: ${result?.error}`;
  if (name === 'save_prospects') {
    const s = result?.saved ?? 0;
    const d = result?.duplicates ?? 0;
    return `Saved ${s}${d ? ` · ${d} duplicate${d === 1 ? '' : 's'} skipped` : ''}`;
  }
  if (name === 'list_existing_prospects')
    return `${result?.returned ?? 0} of ${result?.total ?? 0} existing prospects`;
  if (name === 'enrich_prospect') return result?.ok ? 'Enriched' : 'Enrich failed';
  if (name === 'list_pitch_templates') return `${result?.count ?? 0} templates`;
  if (name === 'draft_pitch') return result?.ok ? `Drafted: "${result.subject}"` : `Draft failed: ${result?.error}`;
  if (name === 'polish_text') return result?.ok ? `Polished (${result.mode})` : `Polish failed: ${result?.error}`;
  if (name === 'send_pitch') return result?.ok ? `Sent to ${result.to}` : `Send failed: ${result?.error}`;
  return 'ok';
}

// ── Main streaming runner ────────────────────────────────────────────────────

export async function runConversationalAgent(
  history: ChatMessage[],
  emit: (e: AgentEvent) => void,
  abortSignal?: AbortSignal,
): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    emit({ type: 'error', message: 'ANTHROPIC_API_KEY is not configured on the server.' });
    return;
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Convert simple history into Anthropic message format
  const messages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let prospectsSaved = 0;
  let iterations = 0;

  try {
    emit({ type: 'message_start' });

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      if (abortSignal?.aborted) break;
      iterations = i + 1;

      const stream = client.messages.stream({
        model: ANTHROPIC_MODEL,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages,
      });

      // Stream text deltas to the client as they arrive
      stream.on('text', (delta: string) => {
        emit({ type: 'text_delta', delta });
      });

      // Wait for the full message
      const final = await stream.finalMessage();

      // Push assistant turn into history
      messages.push({ role: 'assistant', content: final.content });

      // Find tool uses in this turn
      const toolUses = final.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
      );

      if (toolUses.length === 0 || final.stop_reason === 'end_turn') {
        // Conversation complete — assistant finished without tools
        break;
      }

      // Execute tools and feed results back in next iteration
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const tu of toolUses) {
        emit({ type: 'tool_use', id: tu.id, name: tu.name, input: tu.input });
        try {
          const result: any = await runTool(tu.name, tu.input as any);
          if (tu.name === 'save_prospects' && result?.saved) {
            prospectsSaved += result.saved;
          }
          emit({
            type: 'tool_result',
            id: tu.id,
            name: tu.name,
            ok: true,
            summary: summarizeToolResult(tu.name, result),
            data: result,
          });
          toolResults.push({
            type: 'tool_result',
            tool_use_id: tu.id,
            content: JSON.stringify(result).slice(0, 12_000),
          });
        } catch (err: any) {
          logger.error(`[prospector-agent] tool ${tu.name} failed`, { error: err.message });
          emit({
            type: 'tool_result',
            id: tu.id,
            name: tu.name,
            ok: false,
            summary: err.message || 'tool failed',
          });
          toolResults.push({
            type: 'tool_result',
            tool_use_id: tu.id,
            content: `Error: ${err.message || 'tool failed'}`,
            is_error: true,
          });
        }
      }

      messages.push({ role: 'user', content: toolResults });
    }

    emit({ type: 'message_stop' });
    emit({ type: 'done', prospectsSaved, iterations });
  } catch (err: any) {
    logger.error('[prospector-agent] fatal', { error: err.message, stack: err.stack });
    emit({ type: 'error', message: err.message || 'agent failed' });
  }
}
