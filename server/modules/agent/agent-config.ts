/**
 * Agent Config — Runtime configuration reader for PR Agent
 *
 * Reads/writes agent settings from the `app_settings` table
 * (key: 'pr_agent_config'). Admin can tune these from the UI.
 * Includes Zod validation to prevent invalid config values.
 */
import { z } from 'zod';
import { agentRepository } from './agent.repository';

const CONFIG_KEY = 'pr_agent_config';

/** Zod schema for validating PR Agent config updates */
export const prAgentConfigSchema = z.object({
  enabled: z.boolean().optional(),

  // Schedule
  scanCron: z.string().min(1).optional(),
  pitchCron: z.string().min(1).optional(),

  // Search tuning
  maxProspectsPerRun: z.number().int().min(1).max(100).optional(),
  minRelevanceScore: z.number().int().min(0).max(100).optional(),
  searchQueries: z.object({
    podcast: z.array(z.string()).optional(),
    press: z.array(z.string()).optional(),
  }).optional(),

  // Pitch settings
  maxPitchesPerRun: z.number().int().min(1).max(50).optional(),
  followUpDays: z.number().int().min(1).max(90).optional(),
  maxFollowUps: z.number().int().min(0).max(5).optional(),

  // AI model
  model: z.string().min(1).optional(),
  temperature: z.number().min(0).max(2).optional(),

  // Gmail
  gmailEnabled: z.boolean().optional(),
  gmailFrom: z.string().email().optional(),

  // Budget
  monthlyBudgetUsd: z.number().min(0).max(10000).optional(),
  budgetAlertThreshold: z.number().min(0).max(1).optional(),
}).strict();

export interface PrAgentConfig {
  enabled: boolean;

  // Schedule
  scanCron: string;               // cron expression for prospect scanning
  pitchCron: string;              // cron expression for pitch draft batches

  // Search tuning
  maxProspectsPerRun: number;     // how many prospects to find per scan
  minRelevanceScore: number;      // 0-100, discard below this
  searchQueries: {
    podcast: string[];
    press: string[];
  };

  // Pitch settings
  maxPitchesPerRun: number;       // how many pitches to draft per batch
  followUpDays: number;           // days after send before follow-up
  maxFollowUps: number;           // max follow-up emails per prospect

  // AI model
  model: string;                  // e.g. 'gpt-4o'
  temperature: number;            // for pitch generation

  // Gmail
  gmailEnabled: boolean;
  gmailFrom: string;

  // Budget tracking
  monthlyBudgetUsd: number;       // max monthly AI spend
  budgetAlertThreshold: number;   // 0-1, alert when spend exceeds this fraction
}

const DEFAULT_CONFIG: PrAgentConfig = {
  enabled: false, // must be explicitly enabled by admin

  scanCron: '0 6 * * 1,4',      // Monday + Thursday at 6 AM
  pitchCron: '0 7 * * 1,4',     // 1 hour after scan

  maxProspectsPerRun: 20,
  minRelevanceScore: 50,
  searchQueries: {
    podcast: [
      'health supplement founder podcast guest application',
      'biohacking wellness podcast looking for guests',
      'personalized nutrition supplement podcast interview',
      'health tech startup founder podcast',
      'functional medicine supplement podcast guest',
    ],
    press: [
      'personalized supplement startup press feature',
      'health wellness startup magazine editorial',
      'supplement industry expert source journalist',
      'custom supplement AI technology press',
      'biohacking personalized nutrition press coverage',
    ],
  },

  maxPitchesPerRun: 10,
  followUpDays: 7,
  maxFollowUps: 2,

  model: 'gpt-4o',
  temperature: 0.7,

  gmailEnabled: false,
  gmailFrom: 'pete@ones.health',

  monthlyBudgetUsd: 500,
  budgetAlertThreshold: 0.8,
};

/**
 * Get the current PR agent configuration.
 * Falls back to defaults if nothing saved yet.
 */
export async function getPrAgentConfig(): Promise<PrAgentConfig> {
  const saved = await agentRepository.getAgentConfig(CONFIG_KEY);
  if (!saved) return { ...DEFAULT_CONFIG };
  return { ...DEFAULT_CONFIG, ...saved } as PrAgentConfig;
}

/**
 * Save updated PR agent configuration.
 * Validates input with Zod before saving.
 */
export async function savePrAgentConfig(
  config: Partial<PrAgentConfig>,
  updatedBy?: string,
): Promise<PrAgentConfig> {
  // Validate incoming config
  const validated = prAgentConfigSchema.parse(config);
  const current = await getPrAgentConfig();
  const merged = { ...current, ...validated };
  await agentRepository.saveAgentConfig(CONFIG_KEY, merged, updatedBy);
  return merged;
}

/**
 * Get default config (for reset / reference).
 */
export function getDefaultConfig(): PrAgentConfig {
  return { ...DEFAULT_CONFIG };
}
