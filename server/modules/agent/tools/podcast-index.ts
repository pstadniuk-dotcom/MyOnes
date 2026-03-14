/**
 * Podcast Index API — Structured podcast discovery
 *
 * Uses the free Podcast Index API (podcastindex.org) to find real podcasts
 * with validated RSS feeds, episode counts, and last publish dates.
 * This provides more reliable data than AI web search for podcast discovery.
 */
import crypto from 'crypto';
import logger from '../../../infra/logging/logger';

export interface PodcastIndexResult {
  id: number;
  title: string;
  url: string;           // podcast website URL
  feedUrl: string;        // RSS feed URL
  author: string;
  description: string;
  categories: Record<string, string>;
  episodeCount: number;
  lastPublishDate: number; // unix timestamp
  language: string;
  image: string;
  itunesId?: number;
}

export interface PodcastSearchResponse {
  results: PodcastIndexResult[];
  query: string;
  count: number;
}

const API_BASE = 'https://api.podcastindex.org/api/1.0';

/**
 * Generate auth headers for Podcast Index API
 */
function getAuthHeaders(): Record<string, string> {
  const apiKey = process.env.PODCAST_INDEX_API_KEY;
  const apiSecret = process.env.PODCAST_INDEX_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error('PODCAST_INDEX_API_KEY and PODCAST_INDEX_API_SECRET must be set');
  }

  const now = Math.floor(Date.now() / 1000);
  const hash = crypto
    .createHash('sha1')
    .update(apiKey + apiSecret + now.toString())
    .digest('hex');

  return {
    'X-Auth-Date': now.toString(),
    'X-Auth-Key': apiKey,
    'Authorization': hash,
    'User-Agent': 'OnesPRAgent/1.0',
  };
}

/**
 * Search podcasts by keyword
 */
export async function searchPodcasts(
  query: string,
  maxResults: number = 10,
): Promise<PodcastSearchResponse> {
  try {
    const headers = getAuthHeaders();
    const url = `${API_BASE}/search/byterm?q=${encodeURIComponent(query)}&max=${maxResults}`;

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Podcast Index API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const feeds = data.feeds || [];

    const results: PodcastIndexResult[] = feeds.map((feed: any) => ({
      id: feed.id,
      title: feed.title || '',
      url: feed.link || feed.url || '',
      feedUrl: feed.url || '',
      author: feed.author || feed.ownerName || '',
      description: feed.description || '',
      categories: feed.categories || {},
      episodeCount: feed.episodeCount || 0,
      lastPublishDate: feed.newestItemPubdate || feed.lastUpdateTime || 0,
      language: feed.language || 'en',
      image: feed.image || feed.artwork || '',
      itunesId: feed.itunesId || undefined,
    }));

    logger.info(`[podcast-index] Search "${query}" returned ${results.length} results`);
    return { results, query, count: results.length };
  } catch (err: any) {
    logger.error(`[podcast-index] Search failed: ${err.message}`);
    throw err;
  }
}

/**
 * Search podcasts by category
 */
export async function searchByCategory(
  category: string,
  maxResults: number = 20,
): Promise<PodcastSearchResponse> {
  // Podcast Index doesn't have direct category search,
  // so we use keyword search with category-specific terms
  const categoryQueries: Record<string, string> = {
    'health': 'health wellness supplements nutrition',
    'fitness': 'fitness exercise workout health',
    'biohacking': 'biohacking optimization longevity',
    'nutrition': 'nutrition diet supplements vitamins',
    'technology': 'health technology AI digital health',
    'business': 'health business startup wellness entrepreneur',
    'science': 'science health research nutrition',
  };

  const query = categoryQueries[category.toLowerCase()] || category;
  return searchPodcasts(query, maxResults);
}

/**
 * Get podcast details by feed ID
 */
export async function getPodcastById(feedId: number): Promise<PodcastIndexResult | null> {
  try {
    const headers = getAuthHeaders();
    const url = `${API_BASE}/podcasts/byfeedid?id=${feedId}`;

    const response = await fetch(url, { headers });
    if (!response.ok) return null;

    const data = await response.json();
    const feed = data.feed;
    if (!feed) return null;

    return {
      id: feed.id,
      title: feed.title || '',
      url: feed.link || feed.url || '',
      feedUrl: feed.url || '',
      author: feed.author || feed.ownerName || '',
      description: feed.description || '',
      categories: feed.categories || {},
      episodeCount: feed.episodeCount || 0,
      lastPublishDate: feed.newestItemPubdate || feed.lastUpdateTime || 0,
      language: feed.language || 'en',
      image: feed.image || feed.artwork || '',
      itunesId: feed.itunesId || undefined,
    };
  } catch (err: any) {
    logger.error(`[podcast-index] Get by ID failed: ${err.message}`);
    return null;
  }
}

/**
 * Get recent episodes for a podcast
 */
export async function getRecentEpisodes(
  feedId: number,
  maxResults: number = 5,
): Promise<Array<{ title: string; description: string; datePublished: number; duration: number; url: string }>> {
  try {
    const headers = getAuthHeaders();
    const url = `${API_BASE}/episodes/byfeedid?id=${feedId}&max=${maxResults}`;

    const response = await fetch(url, { headers });
    if (!response.ok) return [];

    const data = await response.json();
    return (data.items || []).map((ep: any) => ({
      title: ep.title || '',
      description: ep.description || '',
      datePublished: ep.datePublished || 0,
      duration: ep.duration || 0,
      url: ep.link || ep.enclosureUrl || '',
    }));
  } catch {
    return [];
  }
}

/**
 * Check if Podcast Index API is configured
 */
export function isPodcastIndexConfigured(): boolean {
  return !!(process.env.PODCAST_INDEX_API_KEY && process.env.PODCAST_INDEX_API_SECRET);
}
