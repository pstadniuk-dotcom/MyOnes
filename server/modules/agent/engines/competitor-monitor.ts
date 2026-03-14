/**
 * Competitor Media Monitor — Track where competitors appear in media
 *
 * Searches for competitor press/podcast appearances and flags those
 * outlets as high-priority prospects (if they cover competitors, they'll cover us).
 */
import OpenAI from 'openai';
import logger from '../../../infra/logging/logger';
import { agentRepository } from '../agent.repository';
import { executeWebSearch } from '../tools/web-search';
import type { InsertOutreachProspect } from '@shared/schema';

// Competitors in the personalized supplement / health-tech space
const DEFAULT_COMPETITORS = [
  'AG1',
  'Athletic Greens',
  'Ritual',
  'Care/of',
  'Huel',
  'Rootine',
  'Baze',
  'Persona Nutrition',
  'Gainful',
  'Elo Health',
];

interface CompetitorAppearance {
  competitorName: string;
  outletName: string;
  outletUrl: string;
  category: 'podcast' | 'press';
  foundAt: string;
}

/**
 * Scan for competitor media appearances
 */
export async function runCompetitorScan(options?: {
  competitors?: string[];
  maxPerCompetitor?: number;
}): Promise<{
  runId: string;
  appearances: CompetitorAppearance[];
  prospectsCreated: number;
  errors: string[];
}> {
  const competitors = options?.competitors || DEFAULT_COMPETITORS;
  const maxPerCompetitor = options?.maxPerCompetitor || 3;
  const errors: string[] = [];
  const appearances: CompetitorAppearance[] = [];

  // Create run record
  const runId = await agentRepository.createRun({
    agentName: 'competitor_scan',
    status: 'running',
  });

  try {
    for (const competitor of competitors) {
      try {
        // Search for podcast appearances
        const podcastQuery = `"${competitor}" podcast interview guest appearance health supplement ${new Date().getFullYear()}`;
        const podcastResults = await executeWebSearch(podcastQuery, 'podcast', maxPerCompetitor);

        for (const result of podcastResults.results) {
          appearances.push({
            competitorName: competitor,
            outletName: result.name,
            outletUrl: result.url,
            category: 'podcast',
            foundAt: new Date().toISOString(),
          });
        }

        // Search for press coverage
        const pressQuery = `"${competitor}" review feature article health supplement ${new Date().getFullYear()}`;
        const pressResults = await executeWebSearch(pressQuery, 'press', maxPerCompetitor);

        for (const result of pressResults.results) {
          appearances.push({
            competitorName: competitor,
            outletName: result.name,
            outletUrl: result.url,
            category: 'press',
            foundAt: new Date().toISOString(),
          });
        }

        // Rate limit between competitors
        await new Promise(r => setTimeout(r, 2000));
      } catch (err: any) {
        errors.push(`${competitor}: ${err.message}`);
      }
    }

    // Deduplicate and create prospect records
    const seenUrls = new Set<string>();
    const newProspects: InsertOutreachProspect[] = [];

    for (const appearance of appearances) {
      const normUrl = appearance.outletUrl.toLowerCase().replace(/\/$/, '');
      if (seenUrls.has(normUrl)) continue;
      seenUrls.add(normUrl);

      newProspects.push({
        name: appearance.outletName,
        normalizedName: appearance.outletName.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim(),
        category: appearance.category,
        url: appearance.outletUrl,
        normalizedUrl: normUrl,
        status: 'new',
        contactMethod: 'unknown',
        source: 'competitor_coverage',
        notes: `Competitor coverage: ${appearance.competitorName} appeared here. High-priority — if they cover competitors, they'll cover us.`,
        relevanceScore: 80, // Boost score for competitor coverage
      });
    }

    // Save to database (dedup via normalizedUrl unique constraint)
    let prospectsCreated = 0;
    if (newProspects.length > 0) {
      const created = await agentRepository.createProspects(newProspects);
      prospectsCreated = created.length;
    }

    // Update run record
    await agentRepository.updateRun(runId, {
      status: 'completed',
      completedAt: new Date(),
      prospectsFound: prospectsCreated,
      runLog: [{
        timestamp: new Date().toISOString(),
        action: 'competitor_scan_complete',
        result: `Found ${appearances.length} appearances, created ${prospectsCreated} new prospects`,
      }],
    });

    logger.info(`[competitor-monitor] Scan complete: ${appearances.length} appearances, ${prospectsCreated} new prospects`);
    return { runId, appearances, prospectsCreated, errors };

  } catch (err: any) {
    await agentRepository.updateRun(runId, {
      status: 'failed',
      completedAt: new Date(),
      errorMessage: err.message,
    });
    throw err;
  }
}
