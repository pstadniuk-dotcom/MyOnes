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
} = {}): Promise<ScanResult> {
  const config = await getPrAgentConfig();
  const categories = options.categories || ['podcast', 'press'];
  const queriesPerCategory = options.queriesPerCategory || 3;
  const maxProspects = options.maxProspects || config.maxProspectsPerRun;

  // Create run record
  const runId = await agentRepository.createRun({
    agentName: 'pr_scan',
    status: 'running',
  });

  const errors: string[] = [];
  let allResults: WebSearchResult[] = [];

  logger.info(`[pr-scan] Starting scan: categories=${categories.join(',')}, queries=${queriesPerCategory}`);

  try {
    // ── Step 1: Web Search ──────────────────────────────────────────────
    for (const category of categories) {
      const queries = getSearchQueries(
        category,
        queriesPerCategory,
        config.searchQueries?.[category],
      );

      for (const query of queries) {
        try {
          const { results } = await executeWebSearch(query, category, 5);
          allResults.push(...results);
        } catch (err: any) {
          const msg = `Search failed for "${query.substring(0, 50)}...": ${err.message}`;
          errors.push(msg);
          logger.warn(`[pr-scan] ${msg}`);
        }

        // Brief pause between searches to avoid rate limits
        await sleep(1500);
      }
    }

    logger.info(`[pr-scan] Raw search results: ${allResults.length}`);

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

    // Limit to maxProspects
    const toProcess = newResults.slice(0, maxProspects);

    // ── Step 3: Deep Scrape + Score ──────────────────────────────────────
    const prospects: InsertOutreachProspect[] = [];

    for (const result of toProcess) {
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
          continue;
        }

        // Merge contact info
        const contactEmail = scrapeResult?.emails?.[0] || result.contactEmail || null;
        const contactFormUrl = scrapeResult?.formUrl || result.contactFormUrl || null;

        // Determine contact method
        let contactMethod: 'email' | 'form' | 'dm' | 'unknown' = 'unknown';
        if (contactEmail) contactMethod = 'email';
        else if (contactFormUrl || scrapeResult?.hasGuestForm) contactMethod = 'form';

        // Skip prospects with no actionable contact method —
        // no point saving a lead we can't actually reach
        if (contactMethod === 'unknown') {
          logger.info(`[pr-scan] Skipping "${result.name}" — no email or submission form found`);
          continue;
        }

        // For "form" contacts, ensure we actually found interactive form fields
        // (not just a guidelines/instructions page with no submission mechanism)
        if (contactMethod === 'form' && !contactEmail) {
          const hasRealForm = scrapeResult?.formFields && scrapeResult.formFields.length > 0;
          if (!hasRealForm) {
            logger.info(`[pr-scan] Skipping "${result.name}" — form URL found but no actual submission fields detected (likely a guidelines page)`);
            continue;
          }
        }

        prospects.push({
          name: result.name,
          normalizedName: normalizeName(result.name),
          category: result.category,
          subType: result.subType as any,
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
      savedProspects = await agentRepository.createProspects(prospects);
      logger.info(`[pr-scan] Saved ${savedProspects.length} new prospects`);
    }

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
