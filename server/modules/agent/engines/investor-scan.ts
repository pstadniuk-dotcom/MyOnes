/**
 * Investor Scan Engine — Discovers angel investors and VC firms
 *
 * Uses web search to find investors in health/wellness/DTC/supplement space,
 * then enriches with contact info via Hunter.io, scores, and saves to the
 * outreach_prospects table with category='investor'.
 */
import { agentRepository } from '../agent.repository';
import { getPrAgentConfig } from '../agent-config';
import { getSearchQueries } from '../queries/search-queries';
import { isHunterConfigured, findBestEmail, verifyEmail, domainSearch } from '../tools/hunter';
import logger from '../../../infra/logging/logger';
import type { InsertOutreachProspect } from '@shared/schema';
import OpenAI from 'openai';

/** Valid investor sub-types that match the DB enum */
const VALID_INVESTOR_SUB_TYPES = new Set([
  'angel', 'seed_vc', 'series_a', 'growth_vc', 'family_office',
]);

function sanitizeInvestorSubType(subType: string | undefined | null): string | null {
  if (!subType) return null;
  const normalized = subType.toLowerCase().trim().replace(/[\s-]+/g, '_');
  if (VALID_INVESTOR_SUB_TYPES.has(normalized)) return normalized;
  if (normalized.includes('angel')) return 'angel';
  if (normalized.includes('seed')) return 'seed_vc';
  if (normalized.includes('series_a') || normalized.includes('early')) return 'series_a';
  if (normalized.includes('growth') || normalized.includes('series_b')) return 'growth_vc';
  if (normalized.includes('family')) return 'family_office';
  return 'seed_vc'; // default fallback
}

interface InvestorSearchResult {
  name: string;
  subType: string;
  url: string;
  contactEmail: string | null;
  hostName: string | null; // partner/GP name
  publicationName: string | null; // firm name
  audienceEstimate: string | null; // fund size
  topics: string[];
  relevanceScore: number;
  whyRelevant: string;
  checkSize?: string;
  portfolio?: string[];
}

const INVESTOR_SEARCH_PROMPT = `You are an investor research agent for Ones (ones.health), a personalized supplement platform that uses AI and blood work to create custom daily supplements.

Your job is to find REAL investors (angel investors, VCs, family offices) who invest in:
- Consumer health / wellness / supplement brands
- DTC (direct-to-consumer) health products
- Health tech / personalized medicine / nutrition tech
- CPG (consumer packaged goods) health brands

For each investor/firm, extract:
1. Name of the firm or individual investor
2. Sub-type: "angel", "seed_vc", "series_a", "growth_vc", or "family_office"
3. URL — their website or AngelList/Crunchbase profile
4. Contact email — if visible (null if not found)
5. Key partner name — the GP or partner most relevant to health investments
6. Firm name
7. Fund size or AUM estimate (e.g. "$50M", "$200M fund")
8. Investment themes/sectors (array of keywords)
9. Relevance score (0-100): How relevant to a health/supplement/AI company
10. Why relevant (1-2 sentences about their health/wellness portfolio or thesis)
11. Typical check size if known (e.g. "$250K-$1M")
12. Notable portfolio companies in health/wellness space

CRITICAL RULES:
- Only return REAL investors found in search results
- DO NOT fabricate names, URLs, or emails
- Focus on firms that have actually invested in health/wellness/supplement companies
- Prefer investors who have publicly stated interest in consumer health or personalized medicine
- Score higher for investors with existing health/supplement portfolio companies
- Skip pure biotech/pharma VCs unless they also do consumer health

Return results as a JSON array of objects with these exact keys:
name, subType, url, contactEmail, hostName, publicationName, audienceEstimate, topics, relevanceScore, whyRelevant, checkSize, portfolio`;

export interface InvestorScanResult {
  runId: string;
  prospectsFound: number;
  prospectsNew: number;
  prospectsDuplicate: number;
  topProspects: Array<{ name: string; score: number; url: string }>;
  errors: string[];
}

/**
 * Run an investor discovery scan
 */
export async function runInvestorScan(options: {
  queriesCount?: number;
  maxProspects?: number;
  runId?: string;
} = {}): Promise<InvestorScanResult> {
  const config = await getPrAgentConfig();
  const queriesCount = options.queriesCount || 3;
  const maxProspects = options.maxProspects || config.maxProspectsPerRun;

  // Use pre-created run record or create one
  const runId = options.runId || await agentRepository.createRun({
    agentName: 'investor_scan',
    status: 'running',
  });

  const errors: string[] = [];
  let allResults: InvestorSearchResult[] = [];

  logger.info(`[investor-scan] Starting scan: queries=${queriesCount}, maxProspects=${maxProspects}`);
  const logStep = (action: string, result: string) =>
    agentRepository.appendRunLog(runId, { timestamp: new Date().toISOString(), action, result }).catch(() => {});

  await logStep('scan_started', `Starting investor discovery — ${queriesCount} search queries`);

  try {
    // ── Step 1: Web Search ──
    const queries = getSearchQueries('investor', queriesCount, config.searchQueries?.investor);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 90_000 });

    for (const query of queries) {
      await logStep('web_search', `Searching: "${query.substring(0, 80)}"`);
      try {
        const controller = new AbortController();
        const queryTimeout = setTimeout(() => controller.abort(), 90_000); // 90s per query

        const response = await openai.responses.create({
          model: 'gpt-4o',
          tools: [{ type: 'web_search_preview' as any }],
          input: [
            { role: 'system', content: INVESTOR_SEARCH_PROMPT },
            { role: 'user', content: `Search for investors: ${query}\n\nReturn up to 10 results as a JSON array. Be thorough — find as many relevant investors as possible from the search results.` },
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

        // Parse JSON from response
        const jsonMatch = textOutput.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, textOutput];
        const rawText = jsonMatch[1]?.trim() || '[]';
        const parsed = JSON.parse(rawText);
        const results: InvestorSearchResult[] = Array.isArray(parsed) ? parsed : [parsed];

        for (const r of results) {
          if (r.name && r.url) {
            allResults.push({
              name: r.name,
              subType: r.subType || 'seed_vc',
              url: r.url,
              contactEmail: r.contactEmail || null,
              hostName: r.hostName || null,
              publicationName: r.publicationName || r.name,
              audienceEstimate: r.audienceEstimate || r.checkSize || null,
              topics: Array.isArray(r.topics) ? r.topics : [],
              relevanceScore: typeof r.relevanceScore === 'number' ? r.relevanceScore : 50,
              whyRelevant: r.whyRelevant || '',
              checkSize: r.checkSize,
              portfolio: r.portfolio,
            });
          }
        }

        logger.info(`[investor-scan] Query "${query.substring(0, 60)}..." → ${results.length} results`);
        await logStep('search_results', `Found ${results.length} investor leads`);
      } catch (err: any) {
        const msg = `Search failed for "${query.substring(0, 50)}...": ${err.message}`;
        errors.push(msg);
        logger.warn(`[investor-scan] ${msg}`);
        await logStep('search_error', msg);
      }

      await sleep(1500);
    }

    logger.info(`[investor-scan] Raw search results: ${allResults.length}`);
    await logStep('search_complete', `Web search complete — ${allResults.length} raw investor results`);

    // ── Step 2: Deduplicate ──
    const seenByUrl = new Map<string, InvestorSearchResult>();
    for (const r of allResults) {
      const normUrl = normalizeUrl(r.url);
      if (!seenByUrl.has(normUrl) || r.relevanceScore > (seenByUrl.get(normUrl)?.relevanceScore || 0)) {
        seenByUrl.set(normUrl, r);
      }
    }
    const seenByName = new Map<string, InvestorSearchResult>();
    for (const r of seenByUrl.values()) {
      const normName = r.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!seenByName.has(normName) || r.relevanceScore > (seenByName.get(normName)?.relevanceScore || 0)) {
        seenByName.set(normName, r);
      }
    }
    allResults = Array.from(seenByName.values());

    // Check DB for existing
    const normalizedUrls = allResults.map(r => normalizeUrl(r.url));
    const normalizedNames = allResults.map(r => r.name.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const { existingUrls, existingNames } = await agentRepository.getExistingProspects(normalizedUrls, normalizedNames);
    const newResults = allResults.filter(r => {
      const normUrl = normalizeUrl(r.url);
      const normName = r.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      return !existingUrls.has(normUrl) && !existingNames.has(normName);
    });
    const duplicateCount = allResults.length - newResults.length;

    logger.info(`[investor-scan] After dedup: ${newResults.length} new, ${duplicateCount} existing`);
    await logStep('dedup_complete', `After dedup: ${newResults.length} new investors, ${duplicateCount} already in database`);

    const toProcess = newResults.slice(0, maxProspects);
    await logStep('processing_start', `Enriching ${toProcess.length} investors with contact info`);

    // ── Step 3: Enrich + Save ──
    const prospects: InsertOutreachProspect[] = [];

    for (let i = 0; i < toProcess.length; i++) {
      const result = toProcess[i];
      await logStep('processing_prospect', `[${i + 1}/${toProcess.length}] Enriching: ${result.name}`);
      try {
        let contactEmail = result.contactEmail;

        // Hunter.io enrichment
        if (!contactEmail && isHunterConfigured()) {
          try {
            const domain = new URL(result.url).hostname.replace(/^www\./, '');
            const hunterResult = await findBestEmail(domain, ['partner', 'principal', 'managing', 'general partner', 'investor', 'founder', 'ceo']);
            if (hunterResult) {
              contactEmail = hunterResult.email;
              logger.info(`[investor-scan] Hunter found email for "${result.name}": ${hunterResult.email}`);
            }
          } catch (err: any) {
            logger.warn(`[investor-scan] Hunter failed for "${result.name}": ${err.message}`);
          }
        }

        // Verify email
        if (contactEmail && isHunterConfigured()) {
          try {
            const verification = await verifyEmail(contactEmail);
            if (verification && verification.result === 'undeliverable') {
              logger.info(`[investor-scan] Rejecting undeliverable email for "${result.name}": ${contactEmail}`);
              contactEmail = null;
            }
          } catch { /* keep unverified */ }
        }

        // Skip without email
        if (!contactEmail) {
          logger.info(`[investor-scan] Skipping "${result.name}" — no verified email found`);
          await logStep('prospect_skipped', `Skipped "${result.name}" — no verified email`);
          continue;
        }

        prospects.push({
          name: result.name,
          normalizedName: result.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
          category: 'investor',
          subType: sanitizeInvestorSubType(result.subType) as any,
          url: result.url,
          normalizedUrl: normalizeUrl(result.url),
          contactEmail,
          contactFormUrl: null,
          hostName: result.hostName, // key partner name
          publicationName: result.publicationName, // firm name
          audienceEstimate: result.audienceEstimate, // fund size
          relevanceScore: result.relevanceScore,
          topics: result.topics,
          status: 'new',
          contactMethod: 'email',
          notes: result.whyRelevant,
          source: 'web_search',
          enrichmentData: {
            enrichedAt: new Date().toISOString(),
            socialLinks: result.portfolio || [],
          },
        });
      } catch (err: any) {
        const msg = `Processing failed for "${result.name}": ${err.message}`;
        errors.push(msg);
        logger.warn(`[investor-scan] ${msg}`);
      }
    }

    // Save
    let savedProspects: any[] = [];
    if (prospects.length > 0) {
      await logStep('saving', `Saving ${prospects.length} qualified investors to database...`);
      savedProspects = await agentRepository.createProspects(prospects);
      logger.info(`[investor-scan] Saved ${savedProspects.length} new investor prospects`);
    }
    await logStep('scan_complete', `Done! Found ${savedProspects.length} new investors (${duplicateCount} duplicates skipped)`);

    const scanResult: InvestorScanResult = {
      runId,
      prospectsFound: allResults.length,
      prospectsNew: savedProspects.length,
      prospectsDuplicate: duplicateCount,
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
        { timestamp: new Date().toISOString(), action: 'investor_scan_complete', result: JSON.stringify(scanResult) },
      ],
    });

    return scanResult;
  } catch (err: any) {
    logger.error(`[investor-scan] Fatal error: ${err.message}`, { error: err });
    await agentRepository.updateRun(runId, {
      status: 'failed',
      completedAt: new Date(),
      errorMessage: err.message,
    });
    throw err;
  }
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return (u.hostname.replace(/^www\./, '') + u.pathname.replace(/\/$/, '')).toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
