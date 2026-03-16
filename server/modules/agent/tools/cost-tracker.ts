/**
 * Cost Tracker — Track OpenAI token usage and cost per agent run
 *
 * Populates the previously unused `tokensUsed` and `costUsd` columns
 * in the agent_runs table. Provides budget monitoring and alerts.
 */
import logger from '../../../infra/logging/logger';
import { agentRepository } from '../agent.repository';
import { getPrAgentConfig } from '../agent-config';

// Approximate pricing per 1M tokens (as of 2026)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
};

export interface TokenUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  operation: string; // e.g., 'web_search', 'score_prospect', 'draft_pitch'
}

// Per-run accumulator
const runUsage = new Map<string, TokenUsage[]>();

/**
 * Track token usage for an API call
 */
export function trackTokens(
  runId: string | null,
  model: string,
  inputTokens: number,
  outputTokens: number,
  operation: string,
): TokenUsage {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['gpt-4o'];
  const costUsd = (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;

  const usage: TokenUsage = {
    model,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    costUsd,
    operation,
  };

  if (runId) {
    if (!runUsage.has(runId)) {
      runUsage.set(runId, []);
    }
    runUsage.get(runId)!.push(usage);
  }

  return usage;
}

/**
 * Get total usage for a run and persist to database
 */
export async function finalizeRunCost(runId: string): Promise<{
  totalTokens: number;
  totalCostUsd: number;
  breakdown: Record<string, { tokens: number; cost: number }>;
}> {
  const usages = runUsage.get(runId) || [];

  const totalTokens = usages.reduce((sum, u) => sum + u.totalTokens, 0);
  const totalCostUsd = usages.reduce((sum, u) => sum + u.costUsd, 0);

  // Breakdown by operation
  const breakdown: Record<string, { tokens: number; cost: number }> = {};
  for (const u of usages) {
    if (!breakdown[u.operation]) {
      breakdown[u.operation] = { tokens: 0, cost: 0 };
    }
    breakdown[u.operation].tokens += u.totalTokens;
    breakdown[u.operation].cost += u.costUsd;
  }

  // Update agent run with cost data
  await agentRepository.updateRun(runId, {
    tokensUsed: totalTokens,
    costUsd: totalCostUsd.toFixed(4),
  });

  // Clean up memory
  runUsage.delete(runId);

  logger.info(`[cost-tracker] Run ${runId}: ${totalTokens} tokens, $${totalCostUsd.toFixed(4)}`);
  return { totalTokens, totalCostUsd, breakdown };
}

/**
 * Get current month's spending across all runs
 */
export async function getMonthlySpend(): Promise<{
  totalCostUsd: number;
  totalTokens: number;
  runCount: number;
  budgetUsd: number;
  budgetUsedPercent: number;
  overBudget: boolean;
}> {
  const config = await getPrAgentConfig();
  const runs = await agentRepository.getLatestRuns(undefined, 100);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const monthlyRuns = runs.filter(r =>
    r.startedAt && new Date(r.startedAt) >= startOfMonth
  );

  const totalCostUsd = monthlyRuns.reduce((sum, r) => sum + parseFloat(String(r.costUsd || '0')), 0);
  const totalTokens = monthlyRuns.reduce((sum, r) => sum + (r.tokensUsed || 0), 0);

  const budgetUsd = config.monthlyBudgetUsd || 500;
  const budgetUsedPercent = budgetUsd > 0 ? totalCostUsd / budgetUsd : 0;

  return {
    totalCostUsd,
    totalTokens,
    runCount: monthlyRuns.length,
    budgetUsd,
    budgetUsedPercent,
    overBudget: budgetUsedPercent >= 1,
  };
}

/**
 * Check if budget alert threshold is exceeded
 */
export async function checkBudgetAlert(): Promise<{
  alert: boolean;
  message: string;
}> {
  const config = await getPrAgentConfig();
  const spend = await getMonthlySpend();

  if (spend.budgetUsedPercent >= 1) {
    return {
      alert: true,
      message: `Monthly AI budget exceeded: $${spend.totalCostUsd.toFixed(2)} / $${spend.budgetUsd} (${(spend.budgetUsedPercent * 100).toFixed(0)}%)`,
    };
  }

  if (spend.budgetUsedPercent >= (config.budgetAlertThreshold || 0.8)) {
    return {
      alert: true,
      message: `Monthly AI spend approaching budget: $${spend.totalCostUsd.toFixed(2)} / $${spend.budgetUsd} (${(spend.budgetUsedPercent * 100).toFixed(0)}%)`,
    };
  }

  return { alert: false, message: '' };
}
