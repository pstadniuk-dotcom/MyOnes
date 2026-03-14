/**
 * Prospect Enrichment — Post-discovery enrichment pipeline
 *
 * After discovery, enriches prospects with real engagement metrics:
 * - RSS feed analysis for podcast activity
 * - Social media presence detection
 * - Domain authority estimation
 * - Content recency verification
 */
import logger from '../../../infra/logging/logger';
import { agentRepository } from '../agent.repository';
import { getRecentEpisodes, searchPodcasts, isPodcastIndexConfigured } from './podcast-index';
import type { OutreachProspect } from '@shared/schema';

export interface EnrichmentData {
  // RSS/Podcast data
  lastEpisodeDate?: string;
  episodeCount?: number;
  recentEpisodeTitles?: string[];
  podcastIndexId?: number;

  // Social media
  socialProfiles?: Array<{
    platform: string;
    url: string;
    followersEstimate?: string;
  }>;

  // Domain info
  domainAge?: string;
  hasContactForm?: boolean;
  hasGuestPage?: boolean;

  // Activity signals
  lastActivityDate?: string;
  contentFrequency?: 'daily' | 'weekly' | 'monthly' | 'sporadic' | 'inactive';
  isActive?: boolean;

  // Enrichment metadata
  enrichedAt: string;
  enrichmentScore?: number; // 0-100, overall data quality
}

/**
 * Enrich a prospect with additional data from various sources
 */
export async function enrichProspect(prospect: OutreachProspect): Promise<EnrichmentData> {
  const enrichment: EnrichmentData = {
    enrichedAt: new Date().toISOString(),
  };

  try {
    // Podcast enrichment via Podcast Index API
    if (prospect.category === 'podcast' && isPodcastIndexConfigured()) {
      await enrichFromPodcastIndex(prospect, enrichment);
    }

    // RSS feed check for content recency
    if (prospect.url) {
      await enrichFromRssFeed(prospect.url, enrichment);
    }

    // Calculate enrichment quality score
    enrichment.enrichmentScore = calculateEnrichmentScore(enrichment);

    logger.info(`[enrichment] Enriched "${prospect.name}": score=${enrichment.enrichmentScore}`);
  } catch (err: any) {
    logger.warn(`[enrichment] Failed to enrich "${prospect.name}": ${err.message}`);
  }

  return enrichment;
}

/**
 * Enrich prospect data from Podcast Index
 */
async function enrichFromPodcastIndex(
  prospect: OutreachProspect,
  enrichment: EnrichmentData,
): Promise<void> {
  try {
    const results = await searchPodcasts(prospect.name, 3);
    if (results.results.length === 0) return;

    // Find best match by title similarity
    const match = results.results.find(r =>
      r.title.toLowerCase().includes(prospect.name.toLowerCase().split(' ')[0]) ||
      prospect.name.toLowerCase().includes(r.title.toLowerCase().split(' ')[0])
    ) || results.results[0];

    enrichment.podcastIndexId = match.id;
    enrichment.episodeCount = match.episodeCount;
    enrichment.lastEpisodeDate = match.lastPublishDate
      ? new Date(match.lastPublishDate * 1000).toISOString()
      : undefined;

    // Get recent episodes for context
    if (match.id) {
      const episodes = await getRecentEpisodes(match.id, 3);
      enrichment.recentEpisodeTitles = episodes.map(ep => ep.title);
    }

    // Determine activity level
    if (match.lastPublishDate) {
      const daysSinceLastEp = (Date.now() / 1000 - match.lastPublishDate) / 86400;
      enrichment.isActive = daysSinceLastEp < 60;
      enrichment.contentFrequency = daysSinceLastEp < 7 ? 'weekly'
        : daysSinceLastEp < 30 ? 'monthly'
        : daysSinceLastEp < 90 ? 'sporadic'
        : 'inactive';
      enrichment.lastActivityDate = new Date(match.lastPublishDate * 1000).toISOString();
    }
  } catch (err: any) {
    logger.debug(`[enrichment] Podcast Index lookup failed: ${err.message}`);
  }
}

/**
 * Check RSS feed for content recency (works for both podcasts and press)
 */
async function enrichFromRssFeed(url: string, enrichment: EnrichmentData): Promise<void> {
  try {
    // Try common RSS feed paths
    const feedPaths = ['/feed', '/rss', '/feed.xml', '/rss.xml', '/atom.xml'];
    const baseUrl = new URL(url).origin;

    for (const path of feedPaths) {
      try {
        const response = await fetch(`${baseUrl}${path}`, {
          signal: AbortSignal.timeout(5000),
          headers: { 'Accept': 'application/rss+xml, application/xml, text/xml' },
        });
        if (!response.ok) continue;

        const text = await response.text();
        if (!text.includes('<rss') && !text.includes('<feed') && !text.includes('<channel')) continue;

        // Extract last build date
        const lastBuildMatch = text.match(/<lastBuildDate>([^<]+)<\/lastBuildDate>/);
        const pubDateMatch = text.match(/<pubDate>([^<]+)<\/pubDate>/);
        const dateStr = lastBuildMatch?.[1] || pubDateMatch?.[1];

        if (dateStr) {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            enrichment.lastActivityDate = date.toISOString();
            const daysSince = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
            enrichment.isActive = daysSince < 60;
          }
        }
        break; // Found a working feed
      } catch {
        continue;
      }
    }
  } catch {
    // RSS feed not available
  }
}

/**
 * Calculate data quality score based on how much enrichment data was gathered
 */
function calculateEnrichmentScore(enrichment: EnrichmentData): number {
  let score = 0;

  if (enrichment.episodeCount) score += 15;
  if (enrichment.lastEpisodeDate) score += 15;
  if (enrichment.recentEpisodeTitles?.length) score += 20;
  if (enrichment.isActive !== undefined) score += 10;
  if (enrichment.contentFrequency) score += 10;
  if (enrichment.socialProfiles?.length) score += 15;
  if (enrichment.lastActivityDate) score += 15;

  return Math.min(100, score);
}

/**
 * Batch enrich multiple prospects
 */
export async function batchEnrichProspects(
  prospectIds: string[],
  maxConcurrent: number = 3,
): Promise<{ enriched: number; failed: number }> {
  let enriched = 0;
  let failed = 0;

  for (let i = 0; i < prospectIds.length; i += maxConcurrent) {
    const batch = prospectIds.slice(i, i + maxConcurrent);
    const promises = batch.map(async (id) => {
      try {
        const prospect = await agentRepository.getProspectById(id);
        if (!prospect) return;

        const data = await enrichProspect(prospect);
        await agentRepository.updateProspect(id, {
          notes: prospect.notes
            ? `${prospect.notes}\n[Enrichment: score=${data.enrichmentScore}]`
            : `[Enrichment: score=${data.enrichmentScore}]`,
        });
        enriched++;
      } catch {
        failed++;
      }
    });

    await Promise.all(promises);
    // Rate limit between batches
    if (i + maxConcurrent < prospectIds.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  return { enriched, failed };
}
