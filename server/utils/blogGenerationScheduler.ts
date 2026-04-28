/**
 * Automated Blog Generation Scheduler
 *
 * When enabled, runs daily at 02:00 UTC and generates N articles from the
 * pre-planned topic cluster list (shared/topic-clusters.ts), publishing each
 * one immediately after generation.
 *
 * Configuration (stored in app_settings table, key: 'blog_auto_generate'):
 *   enabled:           boolean   — master on/off switch
 *   articlesPerDay:    number    — how many to generate each run (default 20)
 *   autoPublish:       boolean   — publish on save or save as draft (default true)
 *   tier:              string[]  — which cluster tiers to draw from (default all)
 *   cronSchedule:      string    — cron expression (default '0 2 * * *')
 *
 * Safety rails:
 *   - Skips any title already in the database (slug collision check)
 *   - 3-second gap between each API call to avoid rate limits
 *   - Logs every result to console; failed articles are skipped, not retried
 *   - Stops the day's run if 3 consecutive failures occur
 */

import cron from 'node-cron';
import logger from '../infra/logging/logger';
import { generateArticle } from './blogGenerationService';
import { generateBlogImage } from './blogImageService';
import { blogRepository } from '../modules/blog/blog.repository';
import { TOPIC_CLUSTERS, getUnusedTopics, type TopicCluster } from '../../shared/topic-clusters';
import { discoverDynamicTopics } from './dynamicTopicDiscovery';
import { db } from '../infra/db/db';
import { appSettings } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { pingSitemapIndexers } from './sitemapPing';
import { runScheduledJob } from './schedulerRunner';
import fs from 'fs';
import path from 'path';

// ── Keyword enrichment — read from DB (populated by scripts/seed-keywords.cjs) ──
export type KwData = { volume: number; kd: number; cpc: number };
let _kwMap: Record<string, KwData> | null = null;

export async function getKwMap(): Promise<Record<string, KwData>> {
  if (_kwMap) return _kwMap;
  try {
    const { rows } = await (db as any).$client.query(
      'SELECT keyword, volume, kd, cpc::float FROM keyword_data'
    );
    _kwMap = {};
    for (const r of rows) {
      _kwMap[r.keyword.toLowerCase()] = { volume: r.volume, kd: r.kd, cpc: r.cpc };
    }
    logger.info(`[blog-scheduler] Loaded ${rows.length} keyword rows from DB`);
  } catch {
    // Table not yet created — fall back to JSON file for backwards compatibility
    const jsonPath = path.join(__dirname, '../../server/data/keyword-enrichment.json');
    if (fs.existsSync(jsonPath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as Record<string, KwData>;
        _kwMap = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k.toLowerCase(), v]));
        logger.info(`[blog-scheduler] Loaded ${Object.keys(_kwMap).length} keywords from JSON fallback`);
      } catch { _kwMap = {}; }
    } else {
      _kwMap = {};
    }
  }
  return _kwMap!;
}

export function enrichCluster(tc: TopicCluster, kwMap: Record<string, KwData>): TopicCluster & { priorityScore: number } {
  const data   = kwMap[tc.primaryKeyword] ?? kwMap[tc.primaryKeyword.toLowerCase()];
  const volume = data?.volume ?? tc.volume ?? 0;
  const kd     = data?.kd     ?? tc.kd     ?? 50;
  const cpc    = data?.cpc    ?? tc.cpc    ?? 0;
  return { ...tc, volume, kd, cpc, priorityScore: Math.round(volume / Math.max(kd, 1)) };
}

// ─── Settings helpers ────────────────────────────────────────────────────────

export interface BlogAutoGenSettings {
  enabled: boolean;
  articlesPerDay: number;
  autoPublish: boolean;
  tiers: string[];
  cronSchedule: string;
}

const DEFAULT_SETTINGS: BlogAutoGenSettings = {
  enabled: false,              // OFF by default — admin must explicitly enable
  articlesPerDay: 20,
  autoPublish: true,
  tiers: ['ingredient', 'symptom', 'lab', 'lifestyle', 'comparison', 'system', 'pillar'],
  cronSchedule: '0 2 * * *',  // 02:00 UTC daily
};

export async function getBlogAutoGenSettings(): Promise<BlogAutoGenSettings> {
  try {
    const rows = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, 'blog_auto_generate'))
      .limit(1);

    if (!rows.length || !rows[0].value) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(rows[0].value as object) } as BlogAutoGenSettings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveBlogAutoGenSettings(settings: Partial<BlogAutoGenSettings>): Promise<BlogAutoGenSettings> {
  const current = await getBlogAutoGenSettings();
  const merged: BlogAutoGenSettings = { ...current, ...settings };

  await db
    .insert(appSettings)
    .values({ key: 'blog_auto_generate', value: merged as any })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: merged as any, updatedAt: new Date() } });

  return merged;
}

// ─── Core generation run ─────────────────────────────────────────────────────

export async function runDailyBlogGeneration(overrideSettings?: Partial<BlogAutoGenSettings>): Promise<{
  generated: number;
  failed: number;
  skipped: number;
  log: string[];
}> {
  const settings = overrideSettings
    ? { ...await getBlogAutoGenSettings(), ...overrideSettings }
    : await getBlogAutoGenSettings();

  const runLog: string[] = [];
  const log = (msg: string) => {
    logger.info(`[blog-scheduler] ${msg}`);
    runLog.push(msg);
  };

  log(`Starting daily blog generation run — target: ${settings.articlesPerDay} articles`);

  // Get existing titles to avoid duplicates
  const allPublished = await blogRepository.getPublished(10000, 0);
  const existingTitles = allPublished.map(p => p.title);

  // Filter topic clusters by tier and exclude already-written topics
  const candidatePool = getUnusedTopics(existingTitles)
    .filter(tc => settings.tiers.includes(tc.tier));

  // Load SEO strategy for priority tweaks (pinned/skipped/weights)
  let seoStrategy: { tierWeights?: Record<string, number>; pinnedKeywords?: string[]; skippedKeywords?: string[]; minVolume?: number; maxKd?: number } = {};
  try {
    const stratRows = await db.select().from(appSettings).where(eq(appSettings.key, 'seo_content_strategy')).limit(1);
    if (stratRows.length && stratRows[0].value) seoStrategy = stratRows[0].value as any;
  } catch { /* no strategy saved yet — use defaults */ }

  const skippedSet = new Set((seoStrategy.skippedKeywords ?? []).map(k => k.toLowerCase()));
  const pinnedSet = new Set((seoStrategy.pinnedKeywords ?? []).map(k => k.toLowerCase()));

  log(`${candidatePool.length} unused topics available across tiers: ${settings.tiers.join(', ')}`);
  if (skippedSet.size > 0) log(`SEO strategy: ${skippedSet.size} keywords skipped, ${pinnedSet.size} keywords pinned`);

  // ── Top up with dynamically discovered topics ────────────────────────────
  // The static cluster list (~198 entries) is finite and gets exhausted.
  // Once we approach that ceiling, mine `keyword_data` for opportunities
  // (high volume × low KD) not yet covered by published articles.
  // We always blend dynamic topics in so the pool keeps growing — even when
  // a few static entries remain — but never duplicate an existing keyword.
  const minDesiredPool = Math.max(settings.articlesPerDay * 5, 50);
  if (candidatePool.length < minDesiredPool) {
    try {
      const dynamicTopics = await discoverDynamicTopics({
        minVolume: seoStrategy.minVolume && seoStrategy.minVolume > 0 ? seoStrategy.minVolume : 100,
        maxKd: seoStrategy.maxKd && seoStrategy.maxKd > 0 ? seoStrategy.maxKd : 70,
        limit: minDesiredPool * 2,
        tiers: settings.tiers as TopicCluster['tier'][],
      });
      if (dynamicTopics.length) {
        // Avoid double-adding any keyword already in the static pool.
        const staticKeywords = new Set(candidatePool.map(c => c.primaryKeyword.toLowerCase()));
        const fresh = dynamicTopics.filter(d => !staticKeywords.has(d.primaryKeyword.toLowerCase()));
        candidatePool.push(...fresh);
        log(`Topped up with ${fresh.length} dynamically discovered topics from keyword_data (top: "${fresh[0]?.primaryKeyword}" vol ${fresh[0]?.volume} kd ${fresh[0]?.kd})`);
      } else {
        log('Dynamic discovery returned 0 topics — keyword_data may need refresh');
      }
    } catch (err: any) {
      log(`⚠ Dynamic topic discovery failed (continuing with static pool only): ${err.message}`);
    }
  }

  if (!candidatePool.length) {
    log('No unused topics remaining — run complete (no-op)');
    return { generated: 0, failed: 0, skipped: 0, log: runLog };
  }

  // Enrich with keyword data and sort by priority score (volume / KD).
  // Apply SEO strategy: tier weights, min volume, max KD, pinned/skipped.
  const kwMap = await getKwMap();
  const enriched = candidatePool
    .filter(tc => !skippedSet.has(tc.primaryKeyword.toLowerCase()))
    .map(tc => {
      const base = enrichCluster(tc, kwMap);
      const tierWeight = seoStrategy.tierWeights?.[tc.tier] ?? 1;
      const isPinned = pinnedSet.has(tc.primaryKeyword.toLowerCase());

      // Apply strategy filters (pinned topics bypass filters)
      if (!isPinned && seoStrategy.minVolume && (base.volume ?? 0) < seoStrategy.minVolume) return null;
      if (!isPinned && seoStrategy.maxKd && (base.kd ?? 100) > seoStrategy.maxKd) return null;

      const adjustedScore = isPinned
        ? Number.MAX_SAFE_INTEGER
        : Math.round(base.priorityScore * tierWeight);

      return { ...base, priorityScore: adjustedScore };
    })
    .filter(Boolean) as Array<TopicCluster & { priorityScore: number }>
    ;
  enriched.sort((a, b) => b.priorityScore - a.priorityScore);

  const hasKwData = enriched.some(e => e.priorityScore > 0);
  if (!hasKwData) {
    log('No keyword enrichment data found — falling back to random selection. Run scripts/keyword-research.cjs to enable priority scheduling.');
  } else {
    log(`Priority mode active — top keyword: "${enriched[0]?.primaryKeyword}" (score ${enriched[0]?.priorityScore}, vol ${enriched[0]?.volume}, KD ${enriched[0]?.kd})`);
  }

  const window = enriched.slice(0, Math.max(settings.articlesPerDay * 3, 15));
  const batch  = shuffleArray(window).slice(0, settings.articlesPerDay);

  log(`Generating ${batch.length} articles...`);

  let generated = 0;
  let failed = 0;
  let skipped = 0;
  let consecutiveFailures = 0;

  for (const topic of batch) {
    // Abort if too many consecutive failures (likely API issue)
    if (consecutiveFailures >= 3) {
      log('3 consecutive failures — aborting run to avoid wasted API calls');
      break;
    }

    // Double-check slug doesn't already exist (in case of concurrent runs)
    const candidateSlug = slugify(topic.title);
    const existing = await blogRepository.getBySlug(candidateSlug).catch(() => null);
    if (existing) {
      log(`SKIP: slug already exists — ${candidateSlug}`);
      skipped++;
      continue;
    }

    log(`Generating: "${topic.title}"`);

    try {
      const article = await generateArticle({
        title: topic.title,
        category: topic.category,
        tone: 'informative',
        primaryKeyword: topic.primaryKeyword,
        secondaryKeywords: topic.secondaryKeywords,
      });

      // Persist to database
      await blogRepository.create({
        title:             article.title,
        slug:              article.slug || candidateSlug,
        excerpt:           article.excerpt ?? undefined,
        content:           article.content,
        category:          article.category,
        tags:              article.tags,
        tier:              topic.tier,
        primaryKeyword:    article.primaryKeyword ?? undefined,
        secondaryKeywords: article.secondaryKeywords,
        metaTitle:         article.metaTitle ?? undefined,
        metaDescription:   article.metaDescription ?? undefined,
        authorName:        'Ones Editorial Team',
        isPublished:       settings.autoPublish,
        publishedAt:       new Date(),
        wordCount:         article.wordCount,
        readTimeMinutes:   article.readTimeMinutes,
        internalLinks:     article.internalLinks,
        schemaJson:        article.schemaJson ?? undefined,
        featuredImage:     article.featuredImage ?? undefined,
      });

      // Generate unique AI image after article is saved
      try {
        const imgUrl = await generateBlogImage(article.title, article.slug);
        await blogRepository.update(article.slug, { featuredImage: imgUrl });
        log(`✓ Image generated for "${article.title}"`);
      } catch (imgErr: any) {
        log(`⚠ Image generation failed for "${article.title}": ${imgErr.message}`);
      }

      generated++;
      consecutiveFailures = 0;
      log(`✓ Saved: "${article.title}" (${article.wordCount} words, ${settings.autoPublish ? 'published' : 'draft'})`);

      // Throttle to avoid API rate limits
      await sleep(3000);
    } catch (err: any) {
      failed++;
      consecutiveFailures++;
      log(`✗ Failed: "${topic.title}" — ${err.message}`);
    }
  }

  log(`Run complete — generated: ${generated}, failed: ${failed}, skipped: ${skipped}`);

  // Ping search engines if any articles were published
  if (generated > 0) {
    pingSitemapIndexers().catch(() => {});
  }

  return { generated, failed, skipped, log: runLog };
}

// ─── Scheduler ───────────────────────────────────────────────────────────────

let activeTask: ReturnType<typeof cron.schedule> | null = null;

export function startBlogGenerationScheduler() {
  // Kick off with default schedule; the actual cron will re-read settings each run
  // so changing articlesPerDay in the admin takes effect the next day without restart.
  const schedule = '0 2 * * *'; // Always use this as the outer cron; inner logic reads DB

  logger.info('[blog-scheduler] Registering daily blog generation cron (02:00 UTC)');

  activeTask = cron.schedule(schedule, async () => {
    const settings = await getBlogAutoGenSettings();

    if (!settings.enabled) {
      logger.info('[blog-scheduler] Skipping — auto-generation is disabled');
      return;
    }

    await runScheduledJob('blog_generation', async () => {
      logger.info('[blog-scheduler] Starting scheduled blog generation run');
      const result = await runDailyBlogGeneration(settings);
      logger.info('[blog-scheduler] Run complete', { result });
      return { generated: result.generated, failed: result.failed, skipped: result.skipped };
    });
  });

  return activeTask;
}

export function stopBlogGenerationScheduler() {
  if (activeTask) {
    activeTask.stop();
    activeTask = null;
    logger.info('[blog-scheduler] Stopped');
  }
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}
