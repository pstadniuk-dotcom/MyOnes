/**
 * Registry of every background scheduler the admin Agents dashboard knows about.
 * Each entry is the source of truth for: display name, description, cron schedule,
 * settings shape (if any), and a `runNow()` hook so admins can trigger a manual run.
 *
 * Adding a new scheduler? Append an entry here, and make sure your scheduler's
 * cron callback uses `runScheduledJob(name, fn)` so it shows up in the dashboard.
 */
import { db } from '../../infra/db/db';
import { appSettings } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

import {
  getBlogAutoGenSettings,
  saveBlogAutoGenSettings,
  runDailyBlogGeneration,
  type BlogAutoGenSettings,
} from '../../utils/blogGenerationScheduler';

export interface AgentSettingsField {
  key: string;
  label: string;
  type: 'boolean' | 'number' | 'text' | 'string-list';
  description?: string;
}

export interface AgentDescriptor {
  /** Stable identifier — used as `scheduler_runs.scheduler_name` */
  name: string;
  label: string;
  description: string;
  /** Human-readable cron summary — purely for display */
  schedule: string;
  /** Category shown as a header on the dashboard */
  category: 'AI Agents' | 'Operations' | 'Content';
  /** True if this scheduler has an enabled toggle stored in app_settings */
  hasEnabledToggle: boolean;
  /** Returns current settings as a plain object (for the Agents page) */
  getSettings?: () => Promise<Record<string, any>>;
  /** Persists a partial settings update; returns the merged settings */
  saveSettings?: (patch: Record<string, any>) => Promise<Record<string, any>>;
  /** Visible-in-UI fields. Drives the settings form on the agent detail panel. */
  settingsFields?: AgentSettingsField[];
  /** Optional manual-run hook. If absent, the dashboard hides the "Run now" button. */
  runNow?: () => Promise<Record<string, any> | void>;
}

// ─── Generic app_settings helpers used by agents that store their config there ──

async function getJsonSetting<T extends Record<string, any>>(key: string, defaults: T): Promise<T> {
  try {
    const rows = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
    if (!rows.length || !rows[0].value) return defaults;
    return { ...defaults, ...(rows[0].value as object) } as T;
  } catch {
    return defaults;
  }
}

async function saveJsonSetting<T extends Record<string, any>>(key: string, defaults: T, patch: Partial<T>): Promise<T> {
  const current = await getJsonSetting(key, defaults);
  const merged = { ...current, ...patch } as T;
  await db
    .insert(appSettings)
    .values({ key, value: merged as any })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: merged as any, updatedAt: new Date() } });
  return merged;
}

// ─── PR Agent settings (lazy-imported to avoid circular deps with cron module) ──

async function getPrAgentSettings() {
  const { getPrAgentConfig } = await import('../agent/agent-config');
  return getPrAgentConfig();
}

async function savePrAgentSettings(patch: Record<string, any>) {
  const { savePrAgentConfig } = await import('../agent/agent-config');
  return savePrAgentConfig(patch);
}

// ─── Registry ───────────────────────────────────────────────────────────────

export const AGENT_REGISTRY: AgentDescriptor[] = [
  // ─── AI Agents ─────────────────────────────────────────────────────────
  {
    name: 'blog_generation',
    label: 'SEO Blog Generation',
    description:
      'Generates SEO-optimized articles daily from the topic-cluster pipeline. Picks topics by volume/KD, writes full articles + meta + hero image, and publishes immediately when auto-publish is on.',
    schedule: 'Daily at 02:00 UTC',
    category: 'AI Agents',
    hasEnabledToggle: true,
    getSettings: () => getBlogAutoGenSettings() as Promise<Record<string, any>>,
    saveSettings: (patch) => saveBlogAutoGenSettings(patch as Partial<BlogAutoGenSettings>) as Promise<Record<string, any>>,
    settingsFields: [
      { key: 'enabled', label: 'Enabled', type: 'boolean', description: 'Master on/off switch — must be true for daily runs to fire.' },
      { key: 'articlesPerDay', label: 'Articles per day', type: 'number', description: 'Target number of articles each run will generate.' },
      { key: 'autoPublish', label: 'Auto-publish', type: 'boolean', description: 'When off, articles save as drafts.' },
      { key: 'tiers', label: 'Tiers', type: 'string-list', description: 'Which topic-cluster tiers to draw from.' },
    ],
    runNow: async () => {
      const result = await runDailyBlogGeneration();
      return { generated: result.generated, failed: result.failed, skipped: result.skipped };
    },
  },
  {
    name: 'pr_agent',
    label: 'PR & Outreach Agent',
    description:
      'Multi-step agent that scans the web for podcasts, press, and investor prospects, drafts pitches, sends follow-ups, and detects email replies. Has its own dedicated admin page for prospect management.',
    schedule: 'Multiple cron ticks throughout the day',
    category: 'AI Agents',
    hasEnabledToggle: true,
    getSettings: getPrAgentSettings,
    saveSettings: savePrAgentSettings,
    settingsFields: [
      { key: 'enabled', label: 'Enabled', type: 'boolean', description: 'Master on/off switch for all PR Agent cron jobs.' },
    ],
    // No runNow exposed here — manual triggers live on the existing PR Agent admin page.
  },
  // ─── Content / Sync ────────────────────────────────────────────────────
  {
    name: 'ingredient_catalog_sync',
    label: 'Ingredient Catalog Sync',
    description: 'Pulls the latest ingredient data from the Alive Innovations API into the local catalog.',
    schedule: 'Daily at 03:00 UTC',
    category: 'Content',
    hasEnabledToggle: false,
  },

  // ─── Operations ────────────────────────────────────────────────────────
  {
    name: 'auto_ship',
    label: 'Auto-Ship',
    description: 'Charges the next month of supplements for users on auto-ship and queues manufacturer orders.',
    schedule: 'Daily at 08:00 UTC',
    category: 'Operations',
    hasEnabledToggle: false,
  },
  {
    name: 'renewal',
    label: 'Membership Renewal',
    description: 'Renews active memberships and applies any pending plan changes.',
    schedule: 'Daily at 09:00 UTC + 11:00 UTC',
    category: 'Operations',
    hasEnabledToggle: false,
  },
  {
    name: 'auto_optimize',
    label: 'Formula Auto-Optimize',
    description: 'Detects wearable-data drift (HRV, sleep, steps) and surfaces formula adjustment recommendations.',
    schedule: 'Daily at 09:00 UTC',
    category: 'Operations',
    hasEnabledToggle: false,
  },
  {
    name: 'smart_reorder',
    label: 'Smart Reorder',
    description: 'Predicts when each user will run out and emails reorder reminders.',
    schedule: 'Multiple ticks daily (07:00, 10:00, every 4h)',
    category: 'Operations',
    hasEnabledToggle: false,
  },
  {
    name: 'sms_reminder',
    label: 'SMS Reminders',
    description: 'Sends the daily-take, accountability, and supply-running-low SMS messages.',
    schedule: 'Every minute (delivery loop) + scheduled daily windows',
    category: 'Operations',
    hasEnabledToggle: false,
  },
  {
    name: 'order_settlement',
    label: 'Order Settlement',
    description: 'Reconciles pending Stripe charges and finalizes orders that are stuck in processing.',
    schedule: 'Every 15 minutes + every 30 minutes',
    category: 'Operations',
    hasEnabledToggle: false,
  },
];

export function getAgent(name: string): AgentDescriptor | undefined {
  return AGENT_REGISTRY.find((a) => a.name === name);
}
