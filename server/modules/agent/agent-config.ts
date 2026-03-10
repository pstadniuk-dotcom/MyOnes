/**
 * Agent Config — Runtime configuration reader for PR Agent
 *
 * Reads/writes agent settings from the `app_settings` table
 * (key: 'pr_agent_config'). Admin can tune these from the UI.
 */
import { agentRepository } from './agent.repository';

const CONFIG_KEY = 'pr_agent_config';

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
 */
export async function savePrAgentConfig(
  config: Partial<PrAgentConfig>,
  updatedBy?: string,
): Promise<PrAgentConfig> {
  const current = await getPrAgentConfig();
  const merged = { ...current, ...config };
  await agentRepository.saveAgentConfig(CONFIG_KEY, merged, updatedBy);
  return merged;
}

/**
 * Get default config (for reset / reference).
 */
export function getDefaultConfig(): PrAgentConfig {
  return { ...DEFAULT_CONFIG };
}
