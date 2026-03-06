/**
 * Sitemap Ping Utility
 *
 * Pings Google and Bing to notify them that the sitemap has been updated.
 * Called after new articles are published so search engines discover them faster.
 */

import logger from '../infra/logging/logger';

const SITEMAP_URL = encodeURIComponent('https://ones.health/sitemap.xml');

const PING_TARGETS = [
  `https://www.google.com/ping?sitemap=${SITEMAP_URL}`,
  `https://www.bing.com/ping?sitemap=${SITEMAP_URL}`,
];

/**
 * Ping Google and Bing with the sitemap URL.
 * Failures are logged but never thrown — this is a best-effort notification.
 */
export async function pingSitemapIndexers(): Promise<void> {
  const results = await Promise.allSettled(
    PING_TARGETS.map(url => fetch(url, { method: 'GET', signal: AbortSignal.timeout(5000) }))
  );

  results.forEach((result, i) => {
    const target = i === 0 ? 'Google' : 'Bing';
    if (result.status === 'fulfilled') {
      logger.info(`[sitemap-ping] ${target} ✓ (${result.value.status})`);
    } else {
      logger.warn(`[sitemap-ping] ${target} ✗ — ${result.reason?.message ?? 'unknown error'}`);
    }
  });
}
