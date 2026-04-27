/**
 * Admin Agents controller — powers the unified Agents dashboard.
 *
 * Endpoints:
 *   GET    /api/admin/agents              → list all registered agents + last-run state
 *   GET    /api/admin/agents/:name        → detail (settings + last 50 runs)
 *   PATCH  /api/admin/agents/:name/settings  → update settings (e.g. enabled)
 *   POST   /api/admin/agents/:name/run    → trigger manual run
 */
import { Request, Response } from 'express';
import { logger } from '../../infra/logging/logger';
import { AGENT_REGISTRY, getAgent } from '../../modules/admin-agents/registry';
import { getLatestRun, getRecentRuns, runScheduledJob } from '../../utils/schedulerRunner';

/** GET /api/admin/agents */
export async function listAgents(_req: Request, res: Response) {
  try {
    const items = await Promise.all(
      AGENT_REGISTRY.map(async (agent) => {
        const lastRun = await getLatestRun(agent.name).catch(() => null);
        let settings: Record<string, any> | null = null;
        if (agent.getSettings) {
          settings = await agent.getSettings().catch(() => null);
        }

        return {
          name: agent.name,
          label: agent.label,
          description: agent.description,
          schedule: agent.schedule,
          category: agent.category,
          hasEnabledToggle: agent.hasEnabledToggle,
          enabled: settings?.enabled ?? null,
          canRunManually: typeof agent.runNow === 'function',
          lastRun: lastRun
            ? {
                id: lastRun.id,
                status: lastRun.status,
                startedAt: lastRun.startedAt,
                completedAt: lastRun.completedAt,
                durationMs: lastRun.durationMs,
                summary: lastRun.summary,
                errorMessage: lastRun.errorMessage,
              }
            : null,
        };
      }),
    );

    return res.json({ items });
  } catch (err: any) {
    logger.error('[admin-agents] listAgents error', { error: err?.message });
    return res.status(500).json({ error: 'Failed to load agents' });
  }
}

/** GET /api/admin/agents/:name */
export async function getAgentDetail(req: Request, res: Response) {
  const agent = getAgent(req.params.name);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  try {
    const [settings, recentRuns] = await Promise.all([
      agent.getSettings ? agent.getSettings().catch(() => null) : Promise.resolve(null),
      getRecentRuns(agent.name, 50).catch(() => []),
    ]);

    return res.json({
      name: agent.name,
      label: agent.label,
      description: agent.description,
      schedule: agent.schedule,
      category: agent.category,
      hasEnabledToggle: agent.hasEnabledToggle,
      canRunManually: typeof agent.runNow === 'function',
      settingsFields: agent.settingsFields ?? [],
      settings,
      recentRuns,
    });
  } catch (err: any) {
    logger.error('[admin-agents] getAgentDetail error', { name: req.params.name, error: err?.message });
    return res.status(500).json({ error: 'Failed to load agent detail' });
  }
}

/** PATCH /api/admin/agents/:name/settings */
export async function updateAgentSettings(req: Request, res: Response) {
  const agent = getAgent(req.params.name);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  if (!agent.saveSettings) return res.status(400).json({ error: 'Agent has no editable settings' });

  try {
    // Validate keys against the registered settings schema. Anything the agent
    // doesn't expose is rejected — prevents writing arbitrary config blobs.
    const allowedKeys = new Set((agent.settingsFields ?? []).map((f) => f.key));
    const patch: Record<string, any> = {};
    for (const [key, value] of Object.entries(req.body || {})) {
      if (allowedKeys.has(key)) patch[key] = value;
    }

    const merged = await agent.saveSettings(patch);
    logger.info('[admin-agents] settings updated', { agent: agent.name, keys: Object.keys(patch) });
    return res.json({ settings: merged });
  } catch (err: any) {
    logger.error('[admin-agents] updateAgentSettings error', { name: req.params.name, error: err?.message });
    return res.status(500).json({ error: err?.message || 'Failed to update settings' });
  }
}

/** POST /api/admin/agents/:name/run — fire-and-track manual run */
export async function triggerAgentRun(req: Request, res: Response) {
  const agent = getAgent(req.params.name);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  if (!agent.runNow) return res.status(400).json({ error: 'Agent does not support manual runs' });

  // Don't await — these jobs can take minutes (blog generation = 20+ articles).
  // Return immediately with the run ID so the UI can poll.
  const runPromise = runScheduledJob(
    agent.name,
    async () => {
      const result = await agent.runNow!();
      return (result && typeof result === 'object') ? result : { triggered: true };
    },
    'manual',
  );

  // Attach a noop handler so unhandled rejection isn't logged twice.
  runPromise.catch(() => {});

  logger.info('[admin-agents] manual run triggered', { agent: agent.name, by: (req as any).user?.id });
  return res.status(202).json({ status: 'running', message: `Manual run triggered for ${agent.label}` });
}
