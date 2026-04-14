import { db } from '../../infra/db/db';
import { keywordData, blogPosts, appSettings } from '../../../shared/schema';
import { eq, ilike, sql, desc, asc } from 'drizzle-orm';
import { TOPIC_CLUSTERS, getUnusedTopics, type TopicCluster } from '../../../shared/topic-clusters';
import { getKwMap, enrichCluster, type KwData } from '../../utils/blogGenerationScheduler';

// ── Strategy types ──────────────────────────────────────────────────────────

export interface SeoContentStrategy {
  tierWeights: Record<string, number>;
  pinnedKeywords: string[];
  skippedKeywords: string[];
  minVolume: number;
  maxKd: number;
}

const DEFAULT_STRATEGY: SeoContentStrategy = {
  tierWeights: { pillar: 1, system: 1, ingredient: 1, comparison: 1, symptom: 1, lab: 1, lifestyle: 1 },
  pinnedKeywords: [],
  skippedKeywords: [],
  minVolume: 0,
  maxKd: 100,
};

const STRATEGY_KEY = 'seo_content_strategy';

// ── Repository ──────────────────────────────────────────────────────────────

export const seoRepository = {
  // ── Keywords ────────────────────────────────────────────────────────────

  async getKeywords(opts: {
    search?: string;
    competition?: string;
    sort?: string;
    order?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }) {
    const { search, competition, sort = 'volume', order = 'desc', limit = 50, offset = 0 } = opts;

    // Build WHERE conditions
    const conditions: any[] = [];
    if (search) conditions.push(ilike(keywordData.keyword, `%${search}%`));
    if (competition) conditions.push(eq(keywordData.competition, competition.toUpperCase()));

    const where = conditions.length > 0
      ? conditions.length === 1 ? conditions[0] : sql`${conditions[0]} AND ${conditions[1]}`
      : undefined;

    // Sort mapping
    const sortCol = sort === 'kd' ? keywordData.kd
      : sort === 'cpc' ? keywordData.cpc
      : sort === 'keyword' ? keywordData.keyword
      : keywordData.volume;
    const orderFn = order === 'asc' ? asc(sortCol) : desc(sortCol);

    const [keywords, countResult] = await Promise.all([
      db.select().from(keywordData).where(where).orderBy(orderFn).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(keywordData).where(where),
    ]);

    // Check which keywords have articles
    const allArticles = await db
      .select({ primaryKeyword: blogPosts.primaryKeyword, slug: blogPosts.slug })
      .from(blogPosts)
      .where(sql`${blogPosts.primaryKeyword} IS NOT NULL`);

    const articleMap = new Map<string, string>();
    for (const a of allArticles) {
      if (a.primaryKeyword) articleMap.set(a.primaryKeyword.toLowerCase(), a.slug);
    }

    const enriched = keywords.map(kw => ({
      ...kw,
      cpc: Number(kw.cpc),
      hasArticle: articleMap.has(kw.keyword.toLowerCase()),
      articleSlug: articleMap.get(kw.keyword.toLowerCase()) ?? null,
    }));

    return { keywords: enriched, total: countResult[0]?.count ?? 0 };
  },

  async getKeywordStats() {
    const [stats] = await db.select({
      total: sql<number>`count(*)::int`,
      avgVolume: sql<number>`round(avg(${keywordData.volume}))::int`,
      avgKd: sql<number>`round(avg(${keywordData.kd}))::int`,
      avgCpc: sql<number>`round(avg(${keywordData.cpc}::float)::numeric, 2)::float`,
      lowComp: sql<number>`count(*) FILTER (WHERE ${keywordData.competition} = 'LOW')::int`,
      medComp: sql<number>`count(*) FILTER (WHERE ${keywordData.competition} = 'MEDIUM')::int`,
      highComp: sql<number>`count(*) FILTER (WHERE ${keywordData.competition} = 'HIGH')::int`,
      lastUpdated: sql<string>`max(${keywordData.updatedAt})`,
    }).from(keywordData);

    // How many keywords have a matching article
    const [withArticles] = await db.select({
      count: sql<number>`count(DISTINCT lower(kd.keyword))::int`,
    }).from(sql`keyword_data kd INNER JOIN blog_posts bp ON lower(kd.keyword) = lower(bp.primary_keyword)`);

    return { ...stats, withArticles: withArticles?.count ?? 0 };
  },

  // ── Topic Pipeline ──────────────────────────────────────────────────────

  async getTopicPipeline(opts: {
    tier?: string;
    status?: string; // 'all' | 'written' | 'pending' | 'pinned' | 'skipped'
    search?: string;
  }) {
    const { tier, status = 'all', search } = opts;

    const kwMap = await getKwMap();
    const strategy = await this.getStrategy();

    // Get existing article titles + primary keywords
    const existingPosts = await db
      .select({ title: blogPosts.title, primaryKeyword: blogPosts.primaryKeyword, slug: blogPosts.slug })
      .from(blogPosts);
    const writtenTitles = new Set(existingPosts.map(p => p.title.toLowerCase()));
    const writtenKeywords = new Map<string, string>();
    for (const p of existingPosts) {
      if (p.primaryKeyword) writtenKeywords.set(p.primaryKeyword.toLowerCase(), p.slug);
    }

    const pinnedSet = new Set(strategy.pinnedKeywords.map(k => k.toLowerCase()));
    const skippedSet = new Set(strategy.skippedKeywords.map(k => k.toLowerCase()));

    let topics = TOPIC_CLUSTERS.map(tc => {
      const enriched = enrichCluster(tc, kwMap);
      const pkLower = tc.primaryKeyword.toLowerCase();
      const isWritten = writtenTitles.has(tc.title.toLowerCase()) || writtenKeywords.has(pkLower);
      const isPinned = pinnedSet.has(pkLower);
      const isSkipped = skippedSet.has(pkLower);

      let topicStatus: 'written' | 'pinned' | 'skipped' | 'pending';
      if (isWritten) topicStatus = 'written';
      else if (isPinned) topicStatus = 'pinned';
      else if (isSkipped) topicStatus = 'skipped';
      else topicStatus = 'pending';

      return {
        title: tc.title,
        category: tc.category,
        tier: tc.tier,
        primaryKeyword: tc.primaryKeyword,
        secondaryKeywords: tc.secondaryKeywords,
        volume: enriched.volume ?? 0,
        kd: enriched.kd ?? 50,
        cpc: enriched.cpc ?? 0,
        priorityScore: enriched.priorityScore,
        status: topicStatus,
        articleSlug: writtenKeywords.get(pkLower) ?? null,
      };
    });

    // Filters
    if (tier && tier !== 'all') topics = topics.filter(t => t.tier === tier);
    if (status !== 'all') topics = topics.filter(t => t.status === status);
    if (search) {
      const q = search.toLowerCase();
      topics = topics.filter(t =>
        t.title.toLowerCase().includes(q) || t.primaryKeyword.toLowerCase().includes(q)
      );
    }

    // Sort by priority score descending
    topics.sort((a, b) => b.priorityScore - a.priorityScore);

    // Summary counts (over unfiltered set)
    const allTopics = TOPIC_CLUSTERS.length;
    const written = TOPIC_CLUSTERS.filter(tc =>
      writtenTitles.has(tc.title.toLowerCase()) || writtenKeywords.has(tc.primaryKeyword.toLowerCase())
    ).length;

    return {
      topics,
      summary: {
        total: allTopics,
        written,
        pending: allTopics - written - strategy.pinnedKeywords.length - strategy.skippedKeywords.length,
        pinned: strategy.pinnedKeywords.length,
        skipped: strategy.skippedKeywords.length,
      },
    };
  },

  async getGenerationQueue(limit = 20) {
    const kwMap = await getKwMap();
    const strategy = await this.getStrategy();

    const allPosts = await db
      .select({ title: blogPosts.title })
      .from(blogPosts);
    const existingTitles = allPosts.map(p => p.title);

    const skippedSet = new Set(strategy.skippedKeywords.map(k => k.toLowerCase()));
    const pinnedSet = new Set(strategy.pinnedKeywords.map(k => k.toLowerCase()));

    const candidates = getUnusedTopics(existingTitles)
      .filter(tc => !skippedSet.has(tc.primaryKeyword.toLowerCase()))
      .map(tc => {
        const enriched = enrichCluster(tc, kwMap);
        const tierWeight = strategy.tierWeights[tc.tier] ?? 1;
        const isPinned = pinnedSet.has(tc.primaryKeyword.toLowerCase());
        const adjustedScore = isPinned
          ? Number.MAX_SAFE_INTEGER
          : Math.round(enriched.priorityScore * tierWeight);

        if (strategy.minVolume && (enriched.volume ?? 0) < strategy.minVolume && !isPinned) return null;
        if (strategy.maxKd && (enriched.kd ?? 100) > strategy.maxKd && !isPinned) return null;

        return {
          title: tc.title,
          tier: tc.tier,
          primaryKeyword: tc.primaryKeyword,
          volume: enriched.volume ?? 0,
          kd: enriched.kd ?? 50,
          cpc: enriched.cpc ?? 0,
          priorityScore: adjustedScore,
          isPinned,
        };
      })
      .filter(Boolean) as Array<{
        title: string; tier: string; primaryKeyword: string;
        volume: number; kd: number; cpc: number; priorityScore: number; isPinned: boolean;
      }>;

    candidates.sort((a, b) => b.priorityScore - a.priorityScore);

    return { queue: candidates.slice(0, limit), totalCandidates: candidates.length };
  },

  // ── Strategy ────────────────────────────────────────────────────────────

  async getStrategy(): Promise<SeoContentStrategy> {
    try {
      const rows = await db
        .select()
        .from(appSettings)
        .where(eq(appSettings.key, STRATEGY_KEY))
        .limit(1);

      if (!rows.length || !rows[0].value) return DEFAULT_STRATEGY;
      return { ...DEFAULT_STRATEGY, ...(rows[0].value as object) } as SeoContentStrategy;
    } catch {
      return DEFAULT_STRATEGY;
    }
  },

  async saveStrategy(partial: Partial<SeoContentStrategy>): Promise<SeoContentStrategy> {
    const current = await this.getStrategy();
    const merged = { ...current, ...partial };

    await db
      .insert(appSettings)
      .values({ key: STRATEGY_KEY, value: merged as any })
      .onConflictDoUpdate({ target: appSettings.key, set: { value: merged as any, updatedAt: new Date() } });

    return merged;
  },

  async pinKeyword(keyword: string): Promise<SeoContentStrategy> {
    const strategy = await this.getStrategy();
    const lower = keyword.toLowerCase();
    if (!strategy.pinnedKeywords.some(k => k.toLowerCase() === lower)) {
      strategy.pinnedKeywords.push(keyword);
    }
    // Remove from skipped if it was there
    strategy.skippedKeywords = strategy.skippedKeywords.filter(k => k.toLowerCase() !== lower);
    return this.saveStrategy(strategy);
  },

  async unpinKeyword(keyword: string): Promise<SeoContentStrategy> {
    const strategy = await this.getStrategy();
    strategy.pinnedKeywords = strategy.pinnedKeywords.filter(k => k.toLowerCase() !== keyword.toLowerCase());
    return this.saveStrategy(strategy);
  },

  async skipKeyword(keyword: string): Promise<SeoContentStrategy> {
    const strategy = await this.getStrategy();
    const lower = keyword.toLowerCase();
    if (!strategy.skippedKeywords.some(k => k.toLowerCase() === lower)) {
      strategy.skippedKeywords.push(keyword);
    }
    // Remove from pinned if it was there
    strategy.pinnedKeywords = strategy.pinnedKeywords.filter(k => k.toLowerCase() !== lower);
    return this.saveStrategy(strategy);
  },

  async unskipKeyword(keyword: string): Promise<SeoContentStrategy> {
    const strategy = await this.getStrategy();
    strategy.skippedKeywords = strategy.skippedKeywords.filter(k => k.toLowerCase() !== keyword.toLowerCase());
    return this.saveStrategy(strategy);
  },
};
