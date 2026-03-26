/**
 * Sitemap + Search Engine Ping
 *
 * - getSitemap():          Dynamically generates XML sitemap from published posts
 * - getBlogSitemap():      Blog-only sitemap with image:image entries
 * - pingSitemapIndexers(): Notifies Google + Bing that the sitemap has been updated
 */

import { blogRepository } from '../blog/blog.repository';

const SITE = process.env.SITE_URL || 'https://yourdomain.com';

// ── XML Sitemap Generation ───────────────────────────────────────────────────

export async function buildSitemapXml(): Promise<string> {
  const posts = await blogRepository.getPublished(1000, 0);

  // Add your static pages here
  const staticUrls = [
    { loc: SITE, priority: '1.0', changefreq: 'weekly' },
    { loc: `${SITE}/blog`, priority: '0.9', changefreq: 'daily' },
    { loc: `${SITE}/about`, priority: '0.6', changefreq: 'monthly' },
  ];

  const urlEntries = [
    ...staticUrls.map(
      u =>
        `  <url>\n    <loc>${u.loc}</loc>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`,
    ),
    ...posts.map(p => {
      const lastmod = p.updatedAt
        ? new Date(p.updatedAt).toISOString().split('T')[0]
        : new Date(p.publishedAt).toISOString().split('T')[0];
      return `  <url>\n    <loc>${SITE}/blog/${p.slug}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>`;
    }),
  ].join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>`;
}

export async function buildBlogSitemapXml(): Promise<string> {
  const posts = await blogRepository.getPublished(1000, 0);

  const urlEntries = posts
    .map(p => {
      const lastmod = p.updatedAt
        ? new Date(p.updatedAt).toISOString().split('T')[0]
        : new Date(p.publishedAt).toISOString().split('T')[0];
      const imageEntry = p.featuredImage
        ? `\n    <image:image>\n      <image:loc>${p.featuredImage}</image:loc>\n      <image:title>${p.title.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</image:title>\n    </image:image>`
        : '';
      return `  <url>\n    <loc>${SITE}/blog/${p.slug}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>${imageEntry}\n  </url>`;
    })
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    urlEntries,
    '</urlset>',
  ].join('\n');
}

// ── Search Engine Ping ───────────────────────────────────────────────────────
// Fire-and-forget after publishing new articles. Failures are logged, never thrown.

export async function pingSitemapIndexers(): Promise<void> {
  const sitemapUrl = encodeURIComponent(`${SITE}/sitemap.xml`);

  const targets = [
    `https://www.google.com/ping?sitemap=${sitemapUrl}`,
    `https://www.bing.com/ping?sitemap=${sitemapUrl}`,
  ];

  const results = await Promise.allSettled(
    targets.map(url => fetch(url, { method: 'GET', signal: AbortSignal.timeout(5000) })),
  );

  results.forEach((result, i) => {
    const engine = i === 0 ? 'Google' : 'Bing';
    if (result.status === 'fulfilled') {
      console.log(`[sitemap-ping] ${engine} ✓ (${result.value.status})`);
    } else {
      console.warn(`[sitemap-ping] ${engine} ✗ — ${result.reason?.message ?? 'unknown'}`);
    }
  });
}
