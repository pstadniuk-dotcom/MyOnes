/**
 * Web Search Tool — Uses OpenAI Responses API with web_search_preview
 *
 * Searches the internet for PR/outreach opportunities and returns
 * structured prospect data. This is the core discovery mechanism.
 */
import OpenAI from 'openai';
import logger from '../../../infra/logging/logger';
import type { AgentTool } from '../agent-runner';

export interface WebSearchResult {
  name: string;
  category: 'podcast' | 'press';
  subType?: string;
  url: string;
  contactEmail: string | null;
  contactFormUrl: string | null;
  hostName: string | null;
  publicationName: string | null;
  audienceEstimate: string | null;
  topics: string[];
  relevanceScore: number;
  whyRelevant: string;
}

const SYSTEM_PROMPT = `You are a PR research agent for Ones (ones.health), a personalized supplement platform that uses AI and blood work to create custom daily capsule formulas.

Your job is to find REAL, ACTIONABLE outreach opportunities. For each opportunity, extract:
1. Name of the publication/podcast
2. Category: "podcast" or "press"
3. Sub-type: "interview", "panel", "solo_feature" (podcast) or "product_review", "guest_article", "founder_feature", "expert_source" (press)
4. URL — the actual page where you can submit/apply/pitch
5. Contact email — if visible on the page (null if not found)
6. Contact form URL — if they have a submission form
7. Host/editor name
8. Publication/show name
9. Audience size estimate (social followers, ratings, etc.)
10. Topics they cover (array of keywords)
11. Relevance score (0-100): How relevant to a personalized supplement / health tech company
12. Why it's relevant (1-2 sentences)

CRITICAL RULES:
- Only return REAL opportunities found in search results
- DO NOT fabricate URLs, emails, or names
- If something looks like a generic directory listing with no real contact info, skip it
- Prefer opportunities that specifically invite applications/pitches
- Prioritize health, wellness, biohacking, nutrition, supplements, health tech topics
- Score higher for opportunities that mention supplements, personalized health, or AI health

Return results as a JSON array of objects with these exact keys:
name, category, subType, url, contactEmail, contactFormUrl, hostName, publicationName, audienceEstimate, topics, relevanceScore, whyRelevant`;

/**
 * Create the web search tool for the agent runner
 */
export function createWebSearchTool(): AgentTool {
  return {
    name: 'web_search',
    description: 'Search the internet for PR and outreach opportunities. Provide a search query targeting podcasts, press, or media outlets that accept guest pitches in health/supplements/wellness space.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to find outreach opportunities',
        },
        category: {
          type: 'string',
          enum: ['podcast', 'press'],
          description: 'Whether to search for podcast or press opportunities',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of results to return (default: 5)',
        },
      },
      required: ['query', 'category'],
    },
    execute: async (args: { query: string; category: 'podcast' | 'press'; maxResults?: number }) => {
      return executeWebSearch(args.query, args.category, args.maxResults || 5);
    },
  };
}

/**
 * Execute a web search using OpenAI Responses API with web_search_preview
 */
export async function executeWebSearch(
  query: string,
  category: 'podcast' | 'press',
  maxResults: number = 5,
): Promise<{ results: WebSearchResult[]; searchQuery: string; prospectsFound: number }> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  logger.info(`[web-search] Searching: "${query.substring(0, 80)}..." (${category})`);

  try {
    const response = await openai.responses.create({
      model: 'gpt-4o',
      tools: [{ type: 'web_search_preview' }],
      input: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Search the web for this query and find ${category} outreach opportunities for a personalized supplement company:\n\n${query}\n\nReturn the top ${maxResults} most actionable results as a JSON array. Only include results with a relevance score of 40 or higher.`,
        },
      ],
    });

    // Extract text output
    let textOutput = '';
    for (const item of response.output) {
      if (item.type === 'message') {
        for (const c of item.content) {
          if ((c as any).type === 'text') textOutput += (c as any).text;
        }
      }
    }

    if (!textOutput && (response as any).output_text) {
      textOutput = (response as any).output_text;
    }

    // Parse JSON from response (may be wrapped in markdown code fence)
    const jsonMatch = textOutput.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, textOutput];
    const jsonStr = jsonMatch[1]?.trim() || '[]';

    let results: WebSearchResult[];
    try {
      const parsed = JSON.parse(jsonStr);
      results = (Array.isArray(parsed) ? parsed : [parsed]).map((r: any) => ({
        name: r.name || r.publicationName || 'Unknown',
        category,
        subType: r.subType || r.sub_type || null,
        url: r.url || '',
        contactEmail: r.contactEmail || r.contact_email || null,
        contactFormUrl: r.contactFormUrl || r.contact_form_url || null,
        hostName: r.hostName || r.host_name || null,
        publicationName: r.publicationName || r.publication_name || r.name || null,
        audienceEstimate: r.audienceEstimate || r.audience_estimate || null,
        topics: r.topics || [],
        relevanceScore: r.relevanceScore || r.relevance_score || 50,
        whyRelevant: r.whyRelevant || r.why_relevant || '',
      }));
    } catch {
      logger.warn(`[web-search] Failed to parse JSON from response, raw: ${textOutput.substring(0, 200)}`);
      results = [];
    }

    // Filter invalid entries
    results = results.filter(r => r.url && r.url.startsWith('http') && r.name !== 'Unknown');

    logger.info(`[web-search] Found ${results.length} valid prospects for "${query.substring(0, 40)}..."`);
    return { results, searchQuery: query, prospectsFound: results.length };
  } catch (err: any) {
    logger.error(`[web-search] Search failed: ${err.message}`);
    throw err;
  }
}
