/**
 * Score Prospect Tool — AI-powered relevance re-scoring
 *
 * After web search finds raw prospects, this tool uses AI to re-evaluate
 * each prospect with more detailed criteria specific to Ones.
 */
import OpenAI from 'openai';
import logger from '../../../infra/logging/logger';
import type { AgentTool } from '../agent-runner';

export interface ScoreResult {
  relevanceScore: number;
  scoreBreakdown: {
    topicRelevance: number;   // 0-25: How related to supplements/health/nutrition
    audienceSize: number;     // 0-20: Estimated audience reach
    recency: number;          // 0-15: How active/recent the show/pub is
    accessibility: number;    // 0-20: How easy to pitch (has form, email, etc.)
    brandAlignment: number;   // 0-20: How well audience matches Ones target market
  };
  recommendation: 'high_priority' | 'worth_pitching' | 'low_priority' | 'skip';
  reasoning: string;
}

const SCORING_PROMPT = `You are evaluating a PR/outreach prospect for Ones (ones.health), a personalized supplement platform that uses AI and blood work to create custom daily supplements.

Score this prospect on these criteria (total max 100):

1. **Topic Relevance** (0-25): How related is this to supplements, personalized health, nutrition, biohacking, health tech, AI health, wellness optimization?
   - 20-25: Directly covers supplements, personalized nutrition, health tech
   - 15-19: Covers broader health/wellness, biohacking, longevity
   - 10-14: General business/tech that sometimes covers health
   - 0-9: Barely related

2. **Audience Size** (0-20): Based on any available signals (social followers, ratings, monthly readers)
   - 17-20: Very large audience (500K+ reach)
   - 13-16: Large audience (100K-500K)
   - 9-12: Medium audience (10K-100K)
   - 5-8: Small niche (5K-10K) — only worth it if topic relevance is very high
   - 0-4: Tiny or unknown audience — score low, we do not want low-reach leads

3. **Recency** (0-15): How active is this outlet?
   - 12-15: Very active (weekly content, recent episodes)
   - 8-11: Moderately active (monthly)
   - 4-7: Sporadic or unclear
   - 0-3: Possibly inactive or stale

4. **Accessibility** (0-20): How easy is it to pitch?
   - 16-20: Has guest application form or clear submission email
   - 11-15: Has contact page or general email
   - 6-10: Social media DMs or generic contact
   - 0-5: No clear way to reach them

5. **Brand Alignment** (0-20): Does their audience match Ones target market?
   - 16-20: Health-conscious professionals, biohackers, self-optimizers
   - 11-15: General wellness audience
   - 6-10: Broad audience with some health interest
   - 0-5: Audience unlikely to want personalized supplements

Return ONLY a JSON object with these exact keys:
{
  "relevanceScore": <total 0-100>,
  "scoreBreakdown": {
    "topicRelevance": <0-25>,
    "audienceSize": <0-20>,
    "recency": <0-15>,
    "accessibility": <0-20>,
    "brandAlignment": <0-20>
  },
  "recommendation": "<high_priority|worth_pitching|low_priority|skip>",
  "reasoning": "<1-2 sentences explaining your score>"
}

Recommendation thresholds:
- 75+: high_priority
- 60-74: worth_pitching
- 45-59: low_priority — only recommend if topic relevance is 18+ and audience is 5K+
- <45: skip — not worth our time`;

/**
 * Create the score prospect tool for the agent runner
 */
export function createScoreProspectTool(): AgentTool {
  return {
    name: 'score_prospect',
    description: 'Re-score a prospect with detailed criteria to determine priority. Provide the prospect name, URL, and any known details.',
    parameters: {
      type: 'object',
      properties: {
        prospectName: {
          type: 'string',
          description: 'Name of the prospect (podcast or publication)',
        },
        url: {
          type: 'string',
          description: 'URL of the prospect',
        },
        category: {
          type: 'string',
          enum: ['podcast', 'press'],
        },
        details: {
          type: 'string',
          description: 'Any additional details about the prospect (topics, host, audience, etc.)',
        },
      },
      required: ['prospectName', 'url', 'category'],
    },
    execute: async (args: { prospectName: string; url: string; category: string; details?: string }) => {
      return scoreProspect(args.prospectName, args.url, args.category, args.details);
    },
  };
}

/**
 * Score a prospect using AI
 */
export async function scoreProspect(
  prospectName: string,
  url: string,
  category: string,
  details?: string,
): Promise<ScoreResult> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Use mini for cost-efficient scoring
      messages: [
        { role: 'system', content: SCORING_PROMPT },
        {
          role: 'user',
          content: `Score this ${category} prospect:
Name: ${prospectName}
URL: ${url}
${details ? `Additional details: ${details}` : ''}`,
        },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content || '{}';
    const score = JSON.parse(content) as ScoreResult;

    // Validate and clamp scores
    score.relevanceScore = Math.min(100, Math.max(0, score.relevanceScore || 0));
    if (score.scoreBreakdown) {
      score.scoreBreakdown.topicRelevance = Math.min(25, Math.max(0, score.scoreBreakdown.topicRelevance || 0));
      score.scoreBreakdown.audienceSize = Math.min(20, Math.max(0, score.scoreBreakdown.audienceSize || 0));
      score.scoreBreakdown.recency = Math.min(15, Math.max(0, score.scoreBreakdown.recency || 0));
      score.scoreBreakdown.accessibility = Math.min(20, Math.max(0, score.scoreBreakdown.accessibility || 0));
      score.scoreBreakdown.brandAlignment = Math.min(20, Math.max(0, score.scoreBreakdown.brandAlignment || 0));
    }

    return score;
  } catch (err: any) {
    logger.error(`[score-prospect] Failed to score ${prospectName}: ${err.message}`);
    return {
      relevanceScore: 50,
      scoreBreakdown: {
        topicRelevance: 12,
        audienceSize: 10,
        recency: 8,
        accessibility: 10,
        brandAlignment: 10,
      },
      recommendation: 'low_priority',
      reasoning: `Scoring failed (${err.message}), assigned default score.`,
    };
  }
}
