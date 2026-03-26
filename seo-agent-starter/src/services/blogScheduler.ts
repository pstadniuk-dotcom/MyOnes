/**
 * Blog Generation Scheduler — Automated Daily Article Pipeline
 *
 * When enabled by the admin, runs on a cron schedule and generates N articles per day.
 *
 * Pipeline:
 *   1. Load unused topics from topic-clusters.ts
 *   2. Enrich with keyword data (volume, KD) from DB or JSON fallback
 *   3. Calculate priority score = volume / max(kd, 1)
 *   4. Pick top candidates (with shuffle for variety)
 *   5. Generate each article via AI
 *   6. Generate featured image for each
 *   7. Save to database
 *   8. Ping Google + Bing sitemaps
 *
 * Safety:
 *   - Slug collision check (skip if already exists)
 *   - 3 consecutive failures → abort run
 *   - 3-second throttle between API calls
 *   - Off by default — admin must enable
 */

import cron from 'node-cron';
import { generateArticle } from './blogGenerationService';
import { generateBlogImage } from './blogImageService';
import { blogRepository } from '../blog/blog.repository';
import { TOPIC_CLUSTERS, getUnusedTopics, type TopicCluster } from '../../shared/topic-clusters';
import { db } from '../db';
import { appSettings } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { pingSitemapIndexers } from './sitemapService';
import fs from 'fs';
import path from 'path';

// ── Keyword enrichment cache ─────────────────────────────────────────────────

type KwData = { volume: number; kd: number; cpc: number };
let _kwMap: Record<string, KwData> | null = null;

async function getKwMap(): Promise<Record<string, KwData>> {
  if (_kwMap) return _kwMap;

  // Try loading from DB first (populated by scripts/keyword-research.cjs)
  try {
    const { rows } = await (db as any).$client.query(
      'SELECT keyword, volume, kd, cpc::float FROM keyword_data',
    );
    _kwMap = {};
    for (const r of rows) {
      _kwMap[r.keyword.toLowerCase()] = { volume: r.volume, kd: r.kd, cpc: r.cpc };
    }
    console.log(`[scheduler] Loaded ${rows.length} keyword rows from DB`);
  } catch {
    // Fallback: load from JSON file
    const jsonPath = path.join(__dirname, '../../data/keyword-enrichment.json');
    if (fs.existsSync(jsonPath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        _kwMap = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k.toLowerCase(), v as KwData]));
        console.log(`[scheduler] Loaded ${Object.keys(_kwMap).length} keywords from JSON fallback`);
      } catch {
        _kwMap = {};
      }
    } else {
      _kwMap = {};
    }
  }
  return _kwMap!;
}

function enrichCluster(
  tc: TopicCluster,
  kwMap: Record<string, KwData>,
): TopicCluster & { priorityScore: number } {
  const data = kwMap[tc.primaryKeyword.toLowerCase()];
  const volume = data?.volume ?? tc.volume ?? 0;
  const kd = data?.kd ?? tc.kd ?? 50;
  return { ...tc, volume, kd, priorityScore: Math.round(volume / Math.max(kd, 1)) };
}

// ── Settings ─────────────────────────────────────────────────────────────────

export interface BlogAutoGenSettings {
  enabled: boolean;
  articlesPerDay: number;
  autoPublish: boolean;
  tiers: string[];
  cronSchedule: string;
}

const DEFAULT_SETTINGS: BlogAutoGenSettings = {
  enabled: false,
  articlesPerDay: 20,
  autoPublish: true,
  tiers: ['ingredient', 'symptom', 'lab', 'lifestyle', 'comparison', 'product', 'pillar'],
  cronSchedule: '0 2 * * *',
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

export async function saveBlogAutoGenSettings(
  settings: Partial<BlogAutoGenSettings>,
): Promise<BlogAutoGenSettings> {
  const current = await getBlogAutoGenSettings();
  const merged: BlogAutoGenSettings = { ...current, ...settings };
  await db
    .insert(appSettings)
    .values({ key: 'blog_auto_generate', value: merged as any })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: merged as any, updatedAt: new Date() } });
  return merged;
}

// ── Core generation run ──────────────────────────────────────────────────────

export async function runDailyBlogGeneration(
  overrideSettings?: Partial<BlogAutoGenSettings>,
): Promise<{ generated: number; failed: number; skipped: number; log: string[] }> {
  const settings = overrideSettings
    ? { ...(await getBlogAutoGenSettings()), ...overrideSettings }
    : await getBlogAutoGenSettings();

  const runLog: string[] = [];
  const log = (msg: string) => {
    console.log(`[scheduler] ${msg}`);
    runLog.push(msg);
  };

  log(`Starting run — target: ${settings.articlesPerDay} articles`);

  // Get existing titles to avoid duplicates
  const allPublished = await blogRepository.getPublished(10000, 0);
  const existingTitles = allPublished.map(p => p.title);

  // Filter by tier and exclude already-written topics
  const candidatePool = getUnusedTopics(existingTitles).filter(tc =>
    settings.tiers.includes(tc.tier),
  );

  log(`${candidatePool.length} unused topics across tiers: ${settings.tiers.join(', ')}`);
  if (!candidatePool.length) {
    log('No unused topics — run complete');
    return { generated: 0, failed: 0, skipped: 0, log: runLog };
  }

  // Enrich with keyword data and sort by priority
  const kwMap = await getKwMap();
  const enriched = candidatePool
    .map(tc => enrichCluster(tc, kwMap))
    .sort((a, b) => b.priorityScore - a.priorityScore);

  // Take top 3x needed, shuffle for variety, pick N
  const window = enriched.slice(0, Math.max(settings.articlesPerDay * 3, 15));
  const batch = shuffleArray(window).slice(0, settings.articlesPerDay);

  log(`Generating ${batch.length} articles...`);

  let generated = 0;
  let failed = 0;
  let skipped = 0;
  let consecutiveFailures = 0;

  for (const topic of batch) {
    if (consecutiveFailures >= 3) {
      log('3 consecutive failures — aborting to avoid wasted API calls');
      break;
    }

    const candidateSlug = slugify(topic.title);
    const existing = await blogRepository.getBySlug(candidateSlug).catch(() => null);
    if (existing) {
      log(`SKIP: slug exists — ${candidateSlug}`);
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

      await blogRepository.create({
        title: article.title,
        slug: article.slug || candidateSlug,
        excerpt: article.excerpt ?? undefined,
        content: article.content,
        category: article.category,
        tags: article.tags,
        tier: topic.tier,
        primaryKeyword: article.primaryKeyword ?? undefined,
        secondaryKeywords: article.secondaryKeywords,
        metaTitle: article.metaTitle ?? undefined,
        metaDescription: article.metaDescription ?? undefined,
        authorName: article.authorName,
        isPublished: settings.autoPublish,
        publishedAt: new Date(),
        wordCount: article.wordCount,
        readTimeMinutes: article.readTimeMinutes,
        internalLinks: article.internalLinks,
        schemaJson: article.schemaJson ?? undefined,
        featuredImage: article.featuredImage ?? undefined,
      });

      // Generate featured image (non-blocking on failure)
      try {
        const imgUrl = await generateBlogImage(article.title, article.slug);
        await blogRepository.update(article.slug, { featuredImage: imgUrl });
        log(`✓ Image: "${article.title}"`);
      } catch (imgErr: any) {
        log(`⚠ Image failed: "${article.title}" — ${imgErr.message}`);
      }

      generated++;
      consecutiveFailures = 0;
      log(`✓ Saved: "${article.title}" (${article.wordCount} words)`);

      // Throttle between API calls
      await sleep(3000);
    } catch (err: any) {
      failed++;
      consecutiveFailures++;
      log(`✗ Failed: "${topic.title}" — ${err.message}`);
    }
  }

  log(`Run complete — generated: ${generated}, failed: ${failed}, skipped: ${skipped}`);

  if (generated > 0) {
    pingSitemapIndexers().catch(() => {});
  }

  return { generated, failed, skipped, log: runLog };
}

// ── Cron scheduler ───────────────────────────────────────────────────────────

let activeTask: ReturnType<typeof cron.schedule> | null = null;

export function startBlogGenerationScheduler() {
  console.log('[scheduler] Registering daily blog generation cron (02:00 UTC)');

  activeTask = cron.schedule('0 2 * * *', async () => {
    const settings = await getBlogAutoGenSettings();
    if (!settings.enabled) {
      console.log('[scheduler] Skipping — auto-generation is disabled');
      return;
    }

    try {
      const result = await runDailyBlogGeneration(settings);
      console.log('[scheduler] Run complete', result);
    } catch (err: any) {
      console.error('[scheduler] Unhandled error', err.message);
    }
  });

  return activeTask;
}

export function stopBlogGenerationScheduler() {
  if (activeTask) {
    activeTask.stop();
    activeTask = null;
    console.log('[scheduler] Stopped');
  }
}

// ── Utilities ────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
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
