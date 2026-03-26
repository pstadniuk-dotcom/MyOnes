/**
 * Journalist Discovery Tool — Find individual writers, editors, and reporters
 * at a publication who cover health/supplements/wellness topics.
 *
 * Uses OpenAI Responses API with web_search_preview to:
 * 1. Search for recent articles on the publication about relevant topics
 * 2. Extract bylines (author names)
 * 3. Find their contact info (email, Twitter/X, LinkedIn)
 *
 * This fills the gap between "we found a magazine" and "we know who to pitch."
 */
import OpenAI from 'openai';
import logger from '../../../infra/logging/logger';
import { isHunterConfigured, findAndVerifyPersonEmail, domainSearch } from './hunter';

export interface DiscoveredJournalist {
  name: string;
  role: string | null;              // "Staff Writer", "Editor", "Contributor", etc.
  email: string | null;
  linkedinUrl: string | null;
  twitterHandle: string | null;
  recentArticles: string[];         // Titles of recent relevant articles
  beat: string | null;              // "supplements", "health tech", "nutrition", etc.
  confidenceScore: number;          // 0–100 how confident we are this is a real person
}

const JOURNALIST_SEARCH_PROMPT = `You are a media research specialist helping a health-tech startup find the right journalists to pitch.

Given a publication name and URL, your job is to find REAL individual journalists, editors, reporters, or contributors at that publication who write about health, wellness, supplements, nutrition, personalized medicine, biohacking, or health technology.

For each journalist found, extract:
1. Full name
2. Role/title at the publication (Staff Writer, Editor, Senior Reporter, Contributor, etc.)
3. Email address (if publicly available — check their author page, social bio, personal site)
4. LinkedIn URL (search for "[name] [publication] linkedin")
5. Twitter/X handle (often in their author bio or articles)
6. 1–3 titles of their recent relevant articles
7. Their beat/focus area (e.g., "supplements & nutrition", "health tech", "wellness trends")
8. Confidence score (0–100) — how confident you are that this is a real, active journalist at this publication

CRITICAL RULES:
- Only return REAL journalists you found evidence of in search results
- DO NOT fabricate names, emails, handles, or article titles
- Check author bios, bylines, staff pages, and "About" or "Team" pages
- Prioritize journalists who have RECENTLY written about supplements, health, or wellness
- Skip editors-in-chief or managing editors unless they also write relevant articles
- If you find a personal website or portfolio, check it for contact info
- Return up to 5 journalists maximum
- Confidence should be lower if you only found a name but no contact info

Return results as a JSON array of objects with these exact keys:
name, role, email, linkedinUrl, twitterHandle, recentArticles, beat, confidenceScore`;

/**
 * Discover journalists at a specific publication who cover relevant topics
 */
export async function discoverJournalists(
  publicationName: string,
  publicationUrl: string,
  topics: string[] = [],
): Promise<{ journalists: DiscoveredJournalist[]; searchQuery: string }> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const topicHints = topics.length > 0
    ? `The publication covers these topics: ${topics.join(', ')}.`
    : '';

  const domain = (() => {
    try { return new URL(publicationUrl).hostname; } catch { return ''; }
  })();

  // Build a focused search query
  const searchQuery = `site:${domain} supplements OR "personalized health" OR wellness OR nutrition writer author`;

  logger.info(`[journalist-discovery] Searching for writers at "${publicationName}" (${domain})`);

  try {
    const response = await openai.responses.create({
      model: 'gpt-4o',
      tools: [{ type: 'web_search_preview' as any }],
      input: [
        { role: 'system', content: JOURNALIST_SEARCH_PROMPT },
        {
          role: 'user',
          content: `Find journalists at this publication who cover health, supplements, wellness, or nutrition topics:

Publication: ${publicationName}
URL: ${publicationUrl}
Domain: ${domain}
${topicHints}

Search strategies to try:
1. "${publicationName}" health supplements writer OR editor OR reporter
2. site:${domain} author bio supplements OR wellness OR nutrition
3. "${publicationName}" staff writers health wellness
4. Look at ${publicationUrl} for a staff/team/about page listing writers

Return up to 5 journalists as a JSON array. Only include people you found real evidence for.`,
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

    let journalists: DiscoveredJournalist[];
    try {
      const parsed = JSON.parse(jsonStr);
      journalists = (Array.isArray(parsed) ? parsed : [parsed]).map((j: any) => ({
        name: j.name || 'Unknown',
        role: j.role || j.title || null,
        email: j.email || null,
        linkedinUrl: j.linkedinUrl || j.linkedin_url || j.linkedin || null,
        twitterHandle: normalizeTwitterHandle(j.twitterHandle || j.twitter_handle || j.twitter || null),
        recentArticles: Array.isArray(j.recentArticles || j.recent_articles)
          ? (j.recentArticles || j.recent_articles).slice(0, 3)
          : [],
        beat: j.beat || j.focus || null,
        confidenceScore: j.confidenceScore || j.confidence_score || 50,
      }));
    } catch {
      logger.warn(`[journalist-discovery] Failed to parse JSON: ${textOutput.substring(0, 200)}`);
      journalists = [];
    }

    // Filter out junk entries
    journalists = journalists.filter(j =>
      j.name && j.name !== 'Unknown' && j.name.length > 2 &&
      j.confidenceScore >= 30
    );

    // Use Hunter.io to find/verify emails for discovered journalists
    if (isHunterConfigured() && journalists.length > 0) {
      logger.info(`[journalist-discovery] Running Hunter.io email lookup for ${journalists.length} journalists at ${domain}`);
      for (const journalist of journalists) {
        const nameParts = journalist.name.trim().split(/\s+/);
        if (nameParts.length < 2) continue;
        const firstName = nameParts[0];
        const lastName = nameParts[nameParts.length - 1];

        try {
          const result = await findAndVerifyPersonEmail(domain, firstName, lastName);
          if (result) {
            journalist.email = result.email;
            journalist.confidenceScore = Math.max(journalist.confidenceScore, result.confidence);
            logger.info(`[journalist-discovery] Hunter found email for ${journalist.name}: ${result.email} (verified: ${result.verified})`);
          }
        } catch (err: any) {
          logger.debug(`[journalist-discovery] Hunter lookup failed for ${journalist.name}: ${err.message}`);
        }
      }
    }

    logger.info(`[journalist-discovery] Found ${journalists.length} journalists at "${publicationName}"`);
    return { journalists, searchQuery };
  } catch (err: any) {
    logger.error(`[journalist-discovery] Failed: ${err.message}`);
    return { journalists: [], searchQuery };
  }
}

/**
 * Normalize a Twitter/X handle — ensure it starts with @ and strip URLs
 */
function normalizeTwitterHandle(handle: string | null): string | null {
  if (!handle) return null;
  // Strip twitter.com/x.com URLs down to just the handle
  const urlMatch = handle.match(/(?:twitter\.com|x\.com)\/(@?[\w]+)/i);
  if (urlMatch) return urlMatch[1].startsWith('@') ? urlMatch[1] : `@${urlMatch[1]}`;
  // Ensure @ prefix
  const cleaned = handle.trim().replace(/^@/, '');
  return cleaned ? `@${cleaned}` : null;
}
