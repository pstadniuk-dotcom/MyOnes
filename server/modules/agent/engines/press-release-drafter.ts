/**
 * Press Release Drafter — Generate press releases for milestone events
 *
 * Triggers:
 * - User count milestones (1k, 5k, 10k, etc.)
 * - New feature launches
 * - Partnership announcements
 * - Funding rounds
 * - Product milestones (formula count, ingredient library)
 */
import OpenAI from 'openai';
import logger from '../../../infra/logging/logger';
import { getFounderProfile } from '../founder-context';
import { getPrAgentConfig } from '../agent-config';

export interface PressRelease {
  headline: string;
  subHeadline: string;
  body: string;
  boilerplate: string;
  mediaContact: string;
  milestone: string;
}

export type MilestoneType =
  | 'user_count'
  | 'feature_launch'
  | 'partnership'
  | 'funding'
  | 'product_milestone';

/**
 * Draft a press release for a milestone event
 */
export async function draftPressRelease(
  milestone: MilestoneType,
  details: {
    title: string;
    description: string;
    metrics?: Record<string, string | number>;
    quotes?: string[];
  },
): Promise<PressRelease> {
  const config = await getPrAgentConfig();
  const profile = await getFounderProfile();
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const metricsBlock = details.metrics
    ? Object.entries(details.metrics).map(([k, v]) => `- ${k}: ${v}`).join('\n')
    : 'No specific metrics provided';

  const response = await openai.chat.completions.create({
    model: config.model,
    messages: [
      {
        role: 'system',
        content: `You are a PR professional drafting a press release for ${profile.company}, a personalized supplement company using AI to create custom supplements.

COMPANY: ${profile.company} (${profile.companyUrl})
FOUNDER: ${profile.name}, ${profile.title}
BIO: ${profile.bioShort}

PRESS RELEASE FORMAT:
1. Headline (attention-grabbing, factual)
2. Sub-headline (one sentence expanding on headline)
3. Body (3-4 paragraphs: announcement, context, quote, details)
4. Boilerplate (standard company description paragraph)
5. Media contact info

TONE: Professional, factual, newsworthy. Avoid hype.

OUTPUT: JSON with keys: headline, subHeadline, body, boilerplate, mediaContact`,
      },
      {
        role: 'user',
        content: `Draft a press release for this ${milestone} milestone:

TITLE: ${details.title}
DESCRIPTION: ${details.description}

METRICS:
${metricsBlock}

${details.quotes ? `FOUNDER QUOTES TO INCLUDE:\n${details.quotes.join('\n')}` : ''}`,
      },
    ],
    temperature: 0.4,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content || '{}';
  const parsed = JSON.parse(content);

  logger.info(`[press-release] Drafted release for "${details.title}"`);

  return {
    headline: parsed.headline || details.title,
    subHeadline: parsed.subHeadline || '',
    body: parsed.body || '',
    boilerplate: parsed.boilerplate || `About ${profile.company}: ${profile.bioShort}`,
    mediaContact: parsed.mediaContact || `${profile.name}, ${profile.email}`,
    milestone,
  };
}
