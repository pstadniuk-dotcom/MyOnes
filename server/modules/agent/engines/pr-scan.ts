/**
 * PR Scan Engine — Orchestrates prospect discovery
 *
 * This is the main entry point for the scanning pipeline:
 * 1. Get search queries from config
 * 2. Run web searches (OpenAI Responses API)
 * 3. Deduplicate against existing prospects
 * 4. Deep scrape for contact info
 * 5. Score & rank prospects
 * 6. Save to database
 */
import { agentRepository } from '../agent.repository';
import { getPrAgentConfig } from '../agent-config';
import { executeWebSearch, type WebSearchResult } from '../tools/web-search';
import { executeDeepScrape, closeBrowser, type DeepScrapeResult } from '../tools/deep-scrape';
import { scoreProspect, type ScoreResult } from '../tools/score-prospect';
import { getSearchQueries } from '../queries/search-queries';
import logger from '../../../infra/logging/logger';
import type { InsertOutreachProspect } from '@shared/schema';
import OpenAI from 'openai';
import { isHunterConfigured, findBestEmail, verifyEmail } from '../tools/hunter';

/** Valid sub-type enum values — must match the outreach_sub_type PG enum */
const VALID_SUB_TYPES = new Set([
  'interview', 'panel', 'solo_feature',
  'product_review', 'guest_article', 'founder_feature', 'expert_source',
]);

/** Sanitize AI-returned subType to a valid enum value or null */
function sanitizeSubType(subType: string | undefined | null): string | null {
  if (!subType) return null;
  const normalized = subType.toLowerCase().trim();
  if (VALID_SUB_TYPES.has(normalized)) return normalized;
  // Map common AI hallucinations to valid values
  if (normalized.includes('press') || normalized === 'press_release') return 'product_review';
  if (normalized.includes('interview') || normalized === 'podcast_guest') return 'interview';
  if (normalized.includes('feature')) return 'founder_feature';
  if (normalized.includes('article') || normalized === 'editorial') return 'guest_article';
  if (normalized.includes('expert') || normalized === 'source') return 'expert_source';
  logger.warn(`[pr-scan] Unknown subType "${subType}", defaulting to null`);
  return null;
}

/**
 * Parse an audience estimate string into a numeric value.
 * Handles formats like "50K", "1.2M", "10,000 followers", "~25K listeners", etc.
 * Returns 0 if unparseable.
 */
function parseAudienceSize(estimate: string | null | undefined): number {
  if (!estimate) return 0;
  const cleaned = estimate.replace(/[,\s]/g, '').toLowerCase();
  const match = cleaned.match(/([\d.]+)\s*(k|m|b|thousand|million|billion)?/);
  if (!match) return 0;
  let num = parseFloat(match[1]);
  const suffix = match[2];
  if (suffix === 'k' || suffix === 'thousand') num *= 1_000;
  else if (suffix === 'm' || suffix === 'million') num *= 1_000_000;
  else if (suffix === 'b' || suffix === 'billion') num *= 1_000_000_000;
  return Math.round(num);
}

/**
 * Contact enrichment — find a real, verified email for a prospect.
 *
 * Strategy:
 * 1. Hunter.io domain search (reliable, verified emails from their database)
 * 2. OpenAI web search fallback (scrapes web for emails if Hunter has nothing)
 * 3. Hunter.io email verification on whatever we find
 *
 * Only returns emails that pass verification.
 */
async function enrichContact(prospectName: string, prospectUrl: string, category: string): Promise<{
  email: string | null;
  formUrl: string | null;
}> {
  const domain = new URL(prospectUrl).hostname.replace(/^www\./, '');

  // ── Pass 1: Hunter.io domain search (fast, reliable) ──
  if (isHunterConfigured()) {
    try {
      const preferredRoles = category === 'podcast'
        ? ['host', 'producer', 'booking']
        : ['editor', 'writer', 'reporter', 'journalist', 'health', 'supplements', 'wellness'];

      const hunterResult = await findBestEmail(domain, preferredRoles);
      if (hunterResult) {
        logger.info(`[contact-enrich] Hunter.io found verified email for "${prospectName}": ${hunterResult.email} (${hunterResult.position || 'unknown role'}, confidence: ${hunterResult.confidence})`);
        return { email: hunterResult.email, formUrl: null };
      }
      logger.info(`[contact-enrich] Hunter.io has no emails for ${domain} — trying web search fallback`);
    } catch (err: any) {
      logger.warn(`[contact-enrich] Hunter.io failed for ${domain}: ${err.message}`);
    }
  }

  // ── Pass 2: OpenAI web search fallback ──
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 90_000 });

    const emailQuery = category === 'podcast'
      ? `"${prospectName}" site:${domain} email contact "@" pitch booking guest`
      : `"${prospectName}" site:${domain} email contact "@" editorial submissions press`;

    logger.info(`[contact-enrich] OpenAI web search: "${emailQuery.substring(0, 60)}..."`);

    const controller = new AbortController();
    const queryTimeout = setTimeout(() => controller.abort(), 90_000);

    const response = await openai.responses.create({
      model: 'gpt-4o',
      tools: [{ type: 'web_search_preview' as any }],
      input: [
        {
          role: 'system',
          content: `You are finding an email address for "${prospectName}". Your PRIMARY goal is to find a real email address. Look at their contact page, about page, footer, social bios, LinkedIn, and any directories. Return ONLY a JSON object: {"email": "found@email.com", "formUrl": "https://..."} — use null for any you can't find. Only return REAL emails you find in search results. Do NOT make up emails. Do NOT return generic noreply@ addresses.`,
        },
        {
          role: 'user',
          content: `Find the email address for: ${prospectName} (${prospectUrl}). Check their contact page, about page, social media bios, and any podcast/press directories they're listed on. An email is STRONGLY preferred over a form URL.\n\nSearch: ${emailQuery}`,
        },
      ],
    }, { signal: controller.signal });

    clearTimeout(queryTimeout);

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

    const jsonMatch = textOutput.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, textOutput];
    const parsed = JSON.parse(jsonMatch[1]?.trim() || '{}');

    let email = parsed.email && parsed.email.includes('@') && !parsed.email.includes('noreply') ? parsed.email : null;
    const formUrl = parsed.formUrl && parsed.formUrl.startsWith('http') ? parsed.formUrl : null;

    // ── Pass 3: Verify any email we found (Hunter or web search) ──
    if (email && isHunterConfigured()) {
      const verification = await verifyEmail(email);
      if (verification && verification.result === 'undeliverable') {
        logger.info(`[contact-enrich] Rejecting undeliverable email for "${prospectName}": ${email}`);
        email = null;
      } else if (verification) {
        logger.info(`[contact-enrich] Verified email for "${prospectName}": ${email} (${verification.result}, score: ${verification.score})`);
      }
    }

    if (email) {
      logger.info(`[contact-enrich] Found email for "${prospectName}": ${email}`);
    } else if (formUrl) {
      logger.info(`[contact-enrich] Only found form for "${prospectName}" (no email) — form-only prospects will be skipped`);
    } else {
      logger.info(`[contact-enrich] No contact info found for "${prospectName}"`);
    }

    return { email, formUrl };
  } catch (err: any) {
    logger.warn(`[contact-enrich] Enrichment failed for "${prospectName}": ${err.message}`);
    return { email: null, formUrl: null };
  }
}

export interface ScanResult {
  runId: string;
  prospectsFound: number;
  prospectsNew: number;
  prospectsDuplicate: number;
  categories: { podcast: number; press: number };
  topProspects: Array<{ name: string; score: number; url: string }>;
  errors: string[];
}

/**
 * Run a full scan cycle — search, scrape, score, and save
 */
export async function runPrScan(options: {
  categories?: ('podcast' | 'press')[];
  queriesPerCategory?: number;
  maxProspects?: number;
  runId?: string;
} = {}): Promise<ScanResult> {
  const config = await getPrAgentConfig();
  const categories = options.categories || ['podcast', 'press'];
  const queriesPerCategory = options.queriesPerCategory || 3;
  const maxProspects = options.maxProspects || config.maxProspectsPerRun;

  // Use pre-created run record or create one
  const runId = options.runId || await agentRepository.createRun({
    agentName: 'pr_scan',
    status: 'running',
  });

  const errors: string[] = [];
  let allResults: WebSearchResult[] = [];

  logger.info(`[pr-scan] Starting scan: categories=${categories.join(',')}, queries=${queriesPerCategory}`);
  const logStep = (action: string, result: string) =>
    agentRepository.appendRunLog(runId, { timestamp: new Date().toISOString(), action, result }).catch(() => {});

  await logStep('scan_started', `Searching ${categories.join(' & ')} with ${queriesPerCategory} queries each`);

  try {
    // ── Step 1: Web Search ──────────────────────────────────────────────
    for (const category of categories) {
      const queries = getSearchQueries(
        category,
        queriesPerCategory,
        config.searchQueries?.[category],
      );

      for (const query of queries) {
        await logStep('web_search', `Searching: "${query.substring(0, 80)}"`);
        try {
          const { results } = await executeWebSearch(query, category, 10);
          allResults.push(...results);
          await logStep('search_results', `Found ${results.length} results for ${category}`);
        } catch (err: any) {
          const msg = `Search failed for "${query.substring(0, 50)}...": ${err.message}`;
          errors.push(msg);
          logger.warn(`[pr-scan] ${msg}`);
          await logStep('search_error', msg);
        }

        // Brief pause between searches to avoid rate limits
        await sleep(1500);
      }
    }

    logger.info(`[pr-scan] Raw search results: ${allResults.length}`);
    await logStep('search_complete', `Web search complete — ${allResults.length} raw results`);

    // ── Step 2: Deduplicate ─────────────────────────────────────────────
    // Deduplicate by normalized URL within this batch
    const seenByUrl = new Map<string, WebSearchResult>();
    for (const r of allResults) {
      const normUrl = normalizeUrl(r.url);
      if (!seenByUrl.has(normUrl) || (r.relevanceScore > (seenByUrl.get(normUrl)?.relevanceScore || 0))) {
        seenByUrl.set(normUrl, r);
      }
    }
    // Also deduplicate by normalized name (catches same podcast from Apple Podcasts vs website)
    const seenByName = new Map<string, WebSearchResult>();
    for (const r of seenByUrl.values()) {
      const normName = normalizeName(r.name);
      if (!seenByName.has(normName) || (r.relevanceScore > (seenByName.get(normName)?.relevanceScore || 0))) {
        seenByName.set(normName, r);
      }
    }
    allResults = Array.from(seenByName.values());

    // Check against existing database prospects (by normalized URL and name)
    const normalizedUrls = allResults.map(r => normalizeUrl(r.url));
    const normalizedNames = allResults.map(r => normalizeName(r.name));
    const { existingUrls, existingNames } = await agentRepository.getExistingProspects(
      normalizedUrls, normalizedNames,
    );
    const newResults = allResults.filter(r => {
      const normUrl = normalizeUrl(r.url);
      const normName = normalizeName(r.name);
      return !existingUrls.has(normUrl) && !existingNames.has(normName);
    });
    const duplicateCount = allResults.length - newResults.length;

    logger.info(`[pr-scan] After dedup: ${newResults.length} new, ${duplicateCount} duplicates`);
    await logStep('dedup_complete', `After dedup: ${newResults.length} new prospects, ${duplicateCount} duplicates removed`);

    // Limit to maxProspects
    const toProcess = newResults.slice(0, maxProspects);
    await logStep('processing_start', `Processing ${toProcess.length} prospects (scoring, scraping, contact enrichment)`);

    // ── Step 3: Deep Scrape + Score ──────────────────────────────────────
    const prospects: InsertOutreachProspect[] = [];

    for (let i = 0; i < toProcess.length; i++) {
      const result = toProcess[i];
      await logStep('processing_prospect', `[${i + 1}/${toProcess.length}] Processing: ${result.name}`);
      try {
        // Deep scrape for additional contact info
        let scrapeResult: DeepScrapeResult | null = null;
        try {
          scrapeResult = await executeDeepScrape(result.url);
        } catch (err: any) {
          logger.warn(`[pr-scan] Deep scrape failed for ${result.url}: ${err.message}`);
        }

        // Score the prospect
        let scoreResult: ScoreResult | null = null;
        try {
          scoreResult = await scoreProspect(
            result.name,
            result.url,
            result.category,
            `Topics: ${result.topics.join(', ')}. Host: ${result.hostName || 'unknown'}. Audience: ${result.audienceEstimate || 'unknown'}. ${result.whyRelevant}`,
          );
        } catch (err: any) {
          logger.warn(`[pr-scan] Scoring failed for ${result.name}: ${err.message}`);
        }

        // Skip if below minimum score
        const finalScore = scoreResult?.relevanceScore ?? result.relevanceScore;
        if (finalScore < config.minRelevanceScore) {
          logger.info(`[pr-scan] Skipping "${result.name}" (score ${finalScore} < ${config.minRelevanceScore})`);
          await logStep('prospect_skipped', `Skipped "${result.name}" — score ${finalScore} below threshold`);
          continue;
        }

        // Skip if below minimum audience size
        const audienceNum = parseAudienceSize(result.audienceEstimate);
        if (config.minAudienceSize > 0 && audienceNum > 0 && audienceNum < config.minAudienceSize) {
          logger.info(`[pr-scan] Skipping "${result.name}" — audience too small (${audienceNum.toLocaleString()} < ${config.minAudienceSize.toLocaleString()})`);
          continue;
        }

        // Merge contact info
        let contactEmail = scrapeResult?.emails?.[0] || result.contactEmail || null;
        let contactFormUrl = scrapeResult?.formUrl || result.contactFormUrl || null;

        // Determine contact method
        let contactMethod: 'email' | 'form' | 'dm' | 'unknown' = 'unknown';
        if (contactEmail) contactMethod = 'email';
        else if (contactFormUrl || scrapeResult?.hasGuestForm) contactMethod = 'form';

        // ── Contact Enrichment ── If no email found, try a targeted search
        if (!contactEmail) {
          logger.info(`[pr-scan] No email for "${result.name}" — running enrichment search...`);
          await logStep('email_search', `Finding email for "${result.name}"...`);
          const enriched = await enrichContact(result.name, result.url, result.category);
          if (enriched.email) {
            contactEmail = enriched.email;
            contactMethod = 'email';
          }
          await sleep(1000); // rate limit
        }

        // Verify emails scraped from websites (not Hunter-verified yet)
        if (contactEmail && isHunterConfigured() && !contactEmail.includes('hunter-verified')) {
          try {
            const verification = await verifyEmail(contactEmail);
            if (verification && verification.result === 'undeliverable') {
              logger.info(`[pr-scan] Rejecting undeliverable email for "${result.name}": ${contactEmail}`);
              contactEmail = null;
              contactMethod = 'unknown';
            }
          } catch {
            // Verification failed — keep the email but it's unverified
          }
        }

        // Skip prospects without an email address.
        // Form-only and DM-only prospects are not actionable for automated outreach.
        // The agent needs a real email to send pitches.
        if (!contactEmail) {
          logger.info(`[pr-scan] Skipping "${result.name}" — no email found (contactMethod: ${contactMethod}). Only prospects with email addresses are saved.`);
          await logStep('prospect_skipped', `Skipped "${result.name}" — no email found`);
          continue;
        }
        await logStep('prospect_ready', `"${result.name}" scored ${finalScore} — email found`);
        contactMethod = 'email';

        prospects.push({
          name: result.name,
          normalizedName: normalizeName(result.name),
          category: result.category,
          subType: sanitizeSubType(result.subType) as any,
          url: result.url,
          normalizedUrl: normalizeUrl(result.url),
          contactEmail,
          contactFormUrl,
          hostName: scrapeResult?.hostName || result.hostName,
          publicationName: result.publicationName,
          audienceEstimate: result.audienceEstimate,
          relevanceScore: finalScore,
          scoreBreakdown: scoreResult?.scoreBreakdown,
          topics: result.topics,
          status: 'new',
          contactMethod,
          formFields: scrapeResult?.formFields?.length ? scrapeResult.formFields : undefined,
          notes: scoreResult?.reasoning,
          source: 'web_search',
        });

      } catch (err: any) {
        const msg = `Processing failed for "${result.name}": ${err.message}`;
        errors.push(msg);
        logger.warn(`[pr-scan] ${msg}`);
      }
    }

    // ── Step 4: Save to Database ─────────────────────────────────────────
    let savedProspects: any[] = [];
    if (prospects.length > 0) {
      await logStep('saving', `Saving ${prospects.length} qualified prospects to database...`);
      savedProspects = await agentRepository.createProspects(prospects);
      logger.info(`[pr-scan] Saved ${savedProspects.length} new prospects`);
    }
    await logStep('scan_complete', `Done! Found ${savedProspects.length} new prospects (${duplicateCount} duplicates skipped)`);

    // Clean up browser
    await closeBrowser();

    // ── Step 5: Update Run Record ────────────────────────────────────────
    const scanResult: ScanResult = {
      runId,
      prospectsFound: allResults.length,
      prospectsNew: savedProspects.length,
      prospectsDuplicate: duplicateCount,
      categories: {
        podcast: savedProspects.filter((p: any) => p.category === 'podcast').length,
        press: savedProspects.filter((p: any) => p.category === 'press').length,
      },
      topProspects: savedProspects
        .sort((a: any, b: any) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
        .slice(0, 5)
        .map((p: any) => ({ name: p.name, score: p.relevanceScore || 0, url: p.url })),
      errors,
    };

    await agentRepository.updateRun(runId, {
      status: 'completed',
      completedAt: new Date(),
      prospectsFound: savedProspects.length,
      runLog: [
        { timestamp: new Date().toISOString(), action: 'scan_complete', result: JSON.stringify(scanResult) },
      ],
    });

    return scanResult;

  } catch (err: any) {
    logger.error(`[pr-scan] Fatal error: ${err.message}`, { error: err });
    await closeBrowser();
    await agentRepository.updateRun(runId, {
      status: 'failed',
      completedAt: new Date(),
      errorMessage: err.message,
    });
    throw err;
  }
}

/**
 * Normalize a URL for dedup comparison
 */
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    // Remove trailing slash, www prefix, and query params for dedup
    return (u.hostname.replace(/^www\./, '') + u.pathname.replace(/\/$/, '')).toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Normalize a prospect name for dedup comparison.
 * Strips common suffixes like "Podcast", "Show", "Magazine", "The", punctuation, etc.
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[''"\-–—:!?,.|()\[\]{}]/g, '')
    .replace(/\b(the|a|an|podcast|show|magazine|journal|blog|newsletter|media|online|digital)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
