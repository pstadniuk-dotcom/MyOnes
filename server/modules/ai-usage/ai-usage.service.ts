import { db } from '../../infra/db/db';
import { aiUsageLogs } from '@shared/schema';
import { eq, sql, and, gte, lte, desc } from 'drizzle-orm';
import logger from '../../infra/logging/logger';

// ─── MODEL PRICING (per 1M tokens, in USD) ─────────────────────────────────
// Source: OpenAI & Anthropic public pricing pages (March 2026)
// Update these when pricing changes.

interface ModelPricing {
  inputPer1M: number;   // USD per 1M input tokens
  outputPer1M: number;  // USD per 1M output tokens
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  // ── OpenAI ──
  'gpt-5.2':       { inputPer1M: 3.00,  outputPer1M: 15.00  },
  'gpt-5.2-pro':   { inputPer1M: 15.00, outputPer1M: 60.00  },
  'gpt-5':         { inputPer1M: 2.50,  outputPer1M: 10.00  },
  'gpt-5-mini':    { inputPer1M: 0.40,  outputPer1M: 1.60   },
  'gpt-5-nano':    { inputPer1M: 0.10,  outputPer1M: 0.40   },
  'gpt-5-pro':     { inputPer1M: 15.00, outputPer1M: 60.00  },
  'gpt-4.1':       { inputPer1M: 2.00,  outputPer1M: 8.00   },
  'gpt-4.1-mini':  { inputPer1M: 0.40,  outputPer1M: 1.60   },
  'gpt-4.1-nano':  { inputPer1M: 0.10,  outputPer1M: 0.40   },
  'gpt-4o':        { inputPer1M: 2.50,  outputPer1M: 10.00  },
  'gpt-4o-mini':   { inputPer1M: 0.15,  outputPer1M: 0.60   },
  'o3':            { inputPer1M: 10.00, outputPer1M: 40.00  },
  'o3-mini':       { inputPer1M: 1.10,  outputPer1M: 4.40   },
  'o3-pro':        { inputPer1M: 20.00, outputPer1M: 80.00  },
  'o4-mini':       { inputPer1M: 1.10,  outputPer1M: 4.40   },

  // ── Anthropic ──
  'claude-opus-4-6':    { inputPer1M: 15.00, outputPer1M: 75.00 },
  'claude-sonnet-4-6':  { inputPer1M: 3.00,  outputPer1M: 15.00 },
  'claude-haiku-4-6':   { inputPer1M: 0.80,  outputPer1M: 4.00  },
  'claude-opus-4-5':    { inputPer1M: 15.00, outputPer1M: 75.00 },
  'claude-sonnet-4-5':  { inputPer1M: 3.00,  outputPer1M: 15.00 },
  'claude-haiku-4-5':   { inputPer1M: 0.80,  outputPer1M: 4.00  },
  'claude-opus-4-1':    { inputPer1M: 15.00, outputPer1M: 75.00 },
  'claude-3-5-sonnet-20241022': { inputPer1M: 3.00, outputPer1M: 15.00 },
  'claude-3-5-haiku-20241022':  { inputPer1M: 0.80, outputPer1M: 4.00  },

  // Dated model variants map to same pricing
  'claude-opus-4-6-20260115':   { inputPer1M: 15.00, outputPer1M: 75.00 },
  'claude-sonnet-4-6-20260201': { inputPer1M: 3.00,  outputPer1M: 15.00 },
  'claude-haiku-4-6-20260115':  { inputPer1M: 0.80,  outputPer1M: 4.00  },
  'claude-opus-4-5-20251101':   { inputPer1M: 15.00, outputPer1M: 75.00 },
  'claude-sonnet-4-5-20250929': { inputPer1M: 3.00,  outputPer1M: 15.00 },
  'claude-haiku-4-5-20251001':  { inputPer1M: 0.80,  outputPer1M: 4.00  },
  'claude-opus-4-1-20250805':   { inputPer1M: 15.00, outputPer1M: 75.00 },
};

// ── fal.ai (per-call pricing, stored as cents in estimatedCostCents) ──
// fal.ai charges per generation, not per token. We store the cost in cents directly.
// These are approximate costs per generation call.
const FAL_PRICING_CENTS: Record<string, number> = {
  'fal-ai/nano-banana-2':              1,    // ~$0.01
  'fal-ai/nano-banana-2/edit':         2,    // ~$0.02
  'fal-ai/flux/dev':                   3,    // ~$0.03
  'fal-ai/flux-pro/v1.1':             5,    // ~$0.05
  'fal-ai/flux-pro/v1.1-ultra':       6,    // ~$0.06
  'fal-ai/flux-pro/kontext':          5,    // ~$0.05
  'fal-ai/ideogram/v3':               8,    // ~$0.08
  'fal-ai/recraft-v3':                5,    // ~$0.05
  'fal-ai/seedream-3':                4,    // ~$0.04
  'fal-ai/seedream-4':                5,    // ~$0.05
  'fal-ai/gpt-image-1':              10,    // ~$0.10
  'fal-ai/pulid':                      4,    // ~$0.04
  'fal-ai/kling-video/v2.1/master/image-to-video': 50, // ~$0.50
  'fal-ai/kling-video/v2.5-turbo/pro/image-to-video': 35, // ~$0.35 (turbo — cheaper)
  'fal-ai/kling-video/v3/pro/image-to-video':      75, // ~$0.75
  'fal-ai/minimax-video/image-to-video':            40, // ~$0.40
  'fal-ai/wan/v2.1/image-to-video':                 30, // ~$0.30
  'fal-ai/seedance/video':                          60, // ~$0.60
  'fal-ai/veo3.1/image-to-video':                  300, // ~$3.00 (premium, 8s w/ audio)
  'fal-ai/veo3.1/fast/image-to-video':              80, // ~$0.80
  'fal-ai/sora-2/image-to-video':                  150, // ~$1.50
  'fal-ai/sync-lipsync':             20,    // ~$0.20
  'fal-ai/creative-upscaler':         5,    // ~$0.05
  'fal-ai/bria/background/remove':     2,    // ~$0.02
};

// Fallback pricing for unknown models
const DEFAULT_PRICING: ModelPricing = { inputPer1M: 3.00, outputPer1M: 15.00 };

/**
 * Calculate estimated cost in cents from token counts
 */
export function estimateCostCents(model: string, promptTokens: number, completionTokens: number): number {
  const pricing = MODEL_PRICING[model] || DEFAULT_PRICING;
  const inputCost = (promptTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (completionTokens / 1_000_000) * pricing.outputPer1M;
  const totalUsd = inputCost + outputCost;
  return Math.round(totalUsd * 100); // Convert to cents
}

/**
 * Estimate token count from text (rough: ~4 chars per token for English)
 * Used as fallback when API doesn't return actual token counts.
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Log an AI API usage event
 */
export async function logAiUsage(params: {
  userId?: string | null;
  provider: string;
  model: string;
  feature: string;
  promptTokens: number;
  completionTokens: number;
  durationMs?: number;
  sessionId?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    const totalTokens = params.promptTokens + params.completionTokens;
    const costCents = estimateCostCents(params.model, params.promptTokens, params.completionTokens);

    await db.insert(aiUsageLogs).values({
      userId: params.userId || null,
      provider: params.provider,
      model: params.model,
      feature: params.feature,
      promptTokens: params.promptTokens,
      completionTokens: params.completionTokens,
      totalTokens,
      estimatedCostCents: costCents,
      durationMs: params.durationMs || null,
      sessionId: params.sessionId || null,
      metadata: params.metadata || null,
    });
  } catch (err) {
    // Never let usage logging break the main flow
    logger.error('Failed to log AI usage', { error: err, params });
  }
}

/**
 * Log a fal.ai generation event (image, video, upscale, etc.)
 * fal.ai doesn't use tokens — we log a fixed cost per model per call.
 */
export async function logFalAiUsage(params: {
  model: string;
  feature: string;       // 'social_image' | 'blog_image' | 'ad_creative' | 'ugc_image' | 'ugc_video' | 'brand_studio' | 'ugc_lipsync' | 'upscale' | 'bg_removal'
  durationMs?: number;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    const costCents = FAL_PRICING_CENTS[params.model] || 5; // default 5 cents

    await db.insert(aiUsageLogs).values({
      userId: null,
      provider: 'fal.ai',
      model: params.model,
      feature: params.feature,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCostCents: costCents,
      durationMs: params.durationMs || null,
      sessionId: null,
      metadata: params.metadata || null,
    });
  } catch (err) {
    logger.error('Failed to log fal.ai usage', { error: err, params });
  }
}

// ─── ADMIN QUERY METHODS ────────────────────────────────────────────────────

export interface AiUsageSummary {
  totalCostCents: number;
  totalTokens: number;
  totalCalls: number;
  byUser: Array<{
    userId: string;
    userName: string | null;
    userEmail: string;
    totalCostCents: number;
    totalTokens: number;
    callCount: number;
  }>;
  byModel: Array<{
    model: string;
    provider: string;
    totalCostCents: number;
    totalTokens: number;
    callCount: number;
  }>;
  byFeature: Array<{
    feature: string;
    totalCostCents: number;
    totalTokens: number;
    callCount: number;
  }>;
  dailyCosts: Array<{
    date: string;
    totalCostCents: number;
    callCount: number;
  }>;
}

export async function getUsageSummary(days: number = 30): Promise<AiUsageSummary> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  // Total aggregates
  const totals = await db.select({
    totalCostCents: sql<number>`COALESCE(SUM(${aiUsageLogs.estimatedCostCents}), 0)`,
    totalTokens: sql<number>`COALESCE(SUM(${aiUsageLogs.totalTokens}), 0)`,
    totalCalls: sql<number>`COUNT(*)`,
  })
    .from(aiUsageLogs)
    .where(gte(aiUsageLogs.createdAt, since));

  // By user (join users table for name/email)
  const byUser = await db.execute(sql`
    SELECT 
      a.user_id AS "userId",
      u.name AS "userName",
      u.email AS "userEmail",
      COALESCE(SUM(a.estimated_cost_cents), 0)::int AS "totalCostCents",
      COALESCE(SUM(a.total_tokens), 0)::int AS "totalTokens",
      COUNT(*)::int AS "callCount"
    FROM ai_usage_logs a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE a.created_at >= ${since}
      AND a.user_id IS NOT NULL
    GROUP BY a.user_id, u.name, u.email
    ORDER BY SUM(a.estimated_cost_cents) DESC
    LIMIT 100
  `);

  // By model
  const byModel = await db.select({
    model: aiUsageLogs.model,
    provider: aiUsageLogs.provider,
    totalCostCents: sql<number>`COALESCE(SUM(${aiUsageLogs.estimatedCostCents}), 0)`,
    totalTokens: sql<number>`COALESCE(SUM(${aiUsageLogs.totalTokens}), 0)`,
    callCount: sql<number>`COUNT(*)`,
  })
    .from(aiUsageLogs)
    .where(gte(aiUsageLogs.createdAt, since))
    .groupBy(aiUsageLogs.model, aiUsageLogs.provider)
    .orderBy(sql`SUM(${aiUsageLogs.estimatedCostCents}) DESC`);

  // By feature
  const byFeature = await db.select({
    feature: aiUsageLogs.feature,
    totalCostCents: sql<number>`COALESCE(SUM(${aiUsageLogs.estimatedCostCents}), 0)`,
    totalTokens: sql<number>`COALESCE(SUM(${aiUsageLogs.totalTokens}), 0)`,
    callCount: sql<number>`COUNT(*)`,
  })
    .from(aiUsageLogs)
    .where(gte(aiUsageLogs.createdAt, since))
    .groupBy(aiUsageLogs.feature)
    .orderBy(sql`SUM(${aiUsageLogs.estimatedCostCents}) DESC`);

  // Daily costs
  const dailyCosts = await db.execute(sql`
    SELECT 
      TO_CHAR(created_at, 'YYYY-MM-DD') AS "date",
      COALESCE(SUM(estimated_cost_cents), 0)::int AS "totalCostCents",
      COUNT(*)::int AS "callCount"
    FROM ai_usage_logs
    WHERE created_at >= ${since}
    GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
    ORDER BY "date" ASC
  `);

  return {
    totalCostCents: Number(totals[0]?.totalCostCents) || 0,
    totalTokens: Number(totals[0]?.totalTokens) || 0,
    totalCalls: Number(totals[0]?.totalCalls) || 0,
    byUser: (byUser.rows || []) as any[],
    byModel: byModel.map(r => ({
      model: r.model,
      provider: r.provider,
      totalCostCents: Number(r.totalCostCents),
      totalTokens: Number(r.totalTokens),
      callCount: Number(r.callCount),
    })),
    byFeature: byFeature.map(r => ({
      feature: r.feature,
      totalCostCents: Number(r.totalCostCents),
      totalTokens: Number(r.totalTokens),
      callCount: Number(r.callCount),
    })),
    dailyCosts: (dailyCosts.rows || []) as any[],
  };
}

/**
 * Get detailed usage for a specific user, grouped by chat session
 */
export async function getUserUsageDetails(userId: string, days: number = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const logs = await db.select()
    .from(aiUsageLogs)
    .where(and(
      eq(aiUsageLogs.userId, userId),
      gte(aiUsageLogs.createdAt, since),
    ))
    .orderBy(desc(aiUsageLogs.createdAt))
    .limit(200);

  const totals = await db.select({
    totalCostCents: sql<number>`COALESCE(SUM(${aiUsageLogs.estimatedCostCents}), 0)`,
    totalTokens: sql<number>`COALESCE(SUM(${aiUsageLogs.totalTokens}), 0)`,
    totalCalls: sql<number>`COUNT(*)`,
  })
    .from(aiUsageLogs)
    .where(and(
      eq(aiUsageLogs.userId, userId),
      gte(aiUsageLogs.createdAt, since),
    ));

  // Group by session for cost-per-conversation view
  const bySession = await db.execute(sql`
    SELECT
      a.session_id AS "sessionId",
      cs.title AS "sessionTitle",
      cs.created_at AS "sessionCreatedAt",
      cs.status AS "sessionStatus",
      COALESCE(SUM(a.estimated_cost_cents), 0)::int AS "totalCostCents",
      COALESCE(SUM(a.total_tokens), 0)::int AS "totalTokens",
      COUNT(*)::int AS "callCount",
      MIN(a.created_at) AS "firstCall",
      MAX(a.created_at) AS "lastCall"
    FROM ai_usage_logs a
    LEFT JOIN chat_sessions cs ON a.session_id = cs.id
    WHERE a.user_id = ${userId}
      AND a.created_at >= ${since}
      AND a.session_id IS NOT NULL
    GROUP BY a.session_id, cs.title, cs.created_at, cs.status
    ORDER BY SUM(a.estimated_cost_cents) DESC
  `);

  // By feature breakdown
  const byFeature = await db.execute(sql`
    SELECT
      feature,
      COALESCE(SUM(estimated_cost_cents), 0)::int AS "totalCostCents",
      COALESCE(SUM(total_tokens), 0)::int AS "totalTokens",
      COUNT(*)::int AS "callCount"
    FROM ai_usage_logs
    WHERE user_id = ${userId} AND created_at >= ${since}
    GROUP BY feature
    ORDER BY SUM(estimated_cost_cents) DESC
  `);

  // Daily usage trend
  const dailyCosts = await db.execute(sql`
    SELECT
      TO_CHAR(created_at, 'YYYY-MM-DD') AS "date",
      COALESCE(SUM(estimated_cost_cents), 0)::int AS "totalCostCents",
      COUNT(*)::int AS "callCount"
    FROM ai_usage_logs
    WHERE user_id = ${userId} AND created_at >= ${since}
    GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
    ORDER BY "date" ASC
  `);

  return {
    logs,
    totalCostCents: Number(totals[0]?.totalCostCents) || 0,
    totalTokens: Number(totals[0]?.totalTokens) || 0,
    totalCalls: Number(totals[0]?.totalCalls) || 0,
    bySession: (bySession.rows || []) as any[],
    byFeature: (byFeature.rows || []) as any[],
    dailyCosts: (dailyCosts.rows || []) as any[],
  };
}

/**
 * Get AI cost per user for the user management list (lightweight, returns all users with cost > 0)
 */
export async function getAllUserCosts(days: number = 30): Promise<Record<string, { costCents: number; calls: number }>> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const rows = await db.execute(sql`
    SELECT
      user_id AS "userId",
      COALESCE(SUM(estimated_cost_cents), 0)::int AS "costCents",
      COUNT(*)::int AS "calls"
    FROM ai_usage_logs
    WHERE created_at >= ${since} AND user_id IS NOT NULL
    GROUP BY user_id
  `);

  const map: Record<string, { costCents: number; calls: number }> = {};
  for (const row of (rows.rows || []) as any[]) {
    map[row.userId] = { costCents: row.costCents, calls: row.calls };
  }
  return map;
}
