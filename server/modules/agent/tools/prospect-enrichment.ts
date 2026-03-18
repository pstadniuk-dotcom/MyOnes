/**
 * Prospect Enrichment — Post-discovery enrichment pipeline
 *
 * After discovery, enriches prospects with real engagement metrics:
 * - RSS feed analysis for podcast activity
 * - Social media presence detection
 * - Domain authority estimation
 * - Content recency verification
 * - **Journalist/writer discovery** for press/magazine prospects
 */
import logger from '../../../infra/logging/logger';
import { agentRepository } from '../agent.repository';
import { getRecentEpisodes, searchPodcasts, isPodcastIndexConfigured } from './podcast-index';
import { discoverJournalists, type DiscoveredJournalist } from './journalist-discovery';
import type { OutreachProspect, InsertProspectContact } from '@shared/schema';

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

  // Journalist discovery
  journalistsFound?: number;

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

    // Journalist/writer discovery for press prospects
    if (prospect.category === 'press' && prospect.url) {
      await enrichWithJournalists(prospect, enrichment);
    }

    // Calculate enrichment quality score
    enrichment.enrichmentScore = calculateEnrichmentScore(enrichment);

    // Persist enrichment data to the prospect record
    await agentRepository.updateProspect(prospect.id, {
      enrichmentData: {
        ...(prospect.enrichmentData as any || {}),
        enrichmentScore: enrichment.enrichmentScore,
        enrichedAt: enrichment.enrichedAt,
        journalistsFound: enrichment.journalistsFound,
      },
    });

    logger.info(`[enrichment] Enriched "${prospect.name}": score=${enrichment.enrichmentScore}, journalists=${enrichment.journalistsFound || 0}`);
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
  if (enrichment.journalistsFound && enrichment.journalistsFound > 0) score += 25;

  return Math.min(100, score);
}

/**
 * Discover journalists/writers at a press prospect and save them as contacts
 */
async function enrichWithJournalists(
  prospect: OutreachProspect,
  enrichment: EnrichmentData,
): Promise<void> {
  try {
    const { journalists } = await discoverJournalists(
      prospect.publicationName || prospect.name,
      prospect.url,
      (prospect.topics as string[]) || [],
    );

    if (journalists.length === 0) {
      logger.info(`[enrichment] No journalists found at "${prospect.name}"`);
      enrichment.journalistsFound = 0;
      return;
    }

    // Get existing contacts for this prospect to avoid duplicates
    const existingContacts = await agentRepository.getContactsByProspectId(prospect.id);
    const existingNames = new Set(existingContacts.map(c => c.name.toLowerCase().trim()));

    // Filter out duplicates and prepare inserts
    const newJournalists = journalists.filter(
      j => !existingNames.has(j.name.toLowerCase().trim())
    );

    if (newJournalists.length === 0) {
      logger.info(`[enrichment] All ${journalists.length} journalists at "${prospect.name}" already exist`);
      enrichment.journalistsFound = existingContacts.length;
      return;
    }

    const contactInserts: InsertProspectContact[] = newJournalists.map((j, i) => ({
      prospectId: prospect.id,
      name: j.name,
      role: j.role,
      email: j.email,
      linkedinUrl: j.linkedinUrl,
      twitterHandle: j.twitterHandle,
      beat: j.beat,
      recentArticles: j.recentArticles,
      confidenceScore: j.confidenceScore,
      isPrimary: i === 0 && existingContacts.length === 0, // First journalist = primary if none exist
    }));

    await agentRepository.createContacts(contactInserts);

    // If we found an email for the top journalist and prospect has no email, update it
    const bestContact = newJournalists.find(j => j.email);
    if (bestContact?.email && !prospect.contactEmail) {
      await agentRepository.updateProspect(prospect.id, {
        contactEmail: bestContact.email,
        contactMethod: 'email',
      });
      logger.info(`[enrichment] Updated prospect "${prospect.name}" with journalist email: ${bestContact.email}`);
    }

    enrichment.journalistsFound = existingContacts.length + newJournalists.length;
    logger.info(`[enrichment] Saved ${newJournalists.length} new journalists at "${prospect.name}"`);
  } catch (err: any) {
    logger.warn(`[enrichment] Journalist discovery failed for "${prospect.name}": ${err.message}`);
    enrichment.journalistsFound = 0;
  }
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
