/**
 * Backfill Blog Images (Pexels)
 *
 * Finds a unique, high-quality stock photo from Pexels for every published
 * blog article, downloads it to Supabase Storage, and updates the DB record.
 *
 * Usage:
 *   npx tsx scripts/backfill-blog-images-ai.ts
 *
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL in server/.env
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', 'server', '.env') });

import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL!;
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PEXELS_API_KEY = '2IqQkGKccTnSbO7X9uk7WIN7sW1fubg3L8hGgzmwTNCBm1CX3IJvdeMg';
const BUCKET = 'blog-images';

const pool = new Pool({ connectionString: DATABASE_URL });
const usedPhotoIds = new Set<number>();

interface PexelsPhoto {
  id: number;
  src: { large2x: string; large: string };
  photographer: string;
}

/**
 * Smart search queries based on article title → real photography keywords
 */
function extractSearchQueries(title: string): string[] {
  const queries: string[] = [];
  const topicMap: Array<{ terms: string[]; queries: string[] }> = [
    { terms: ['vitamin c', 'ascorbic acid'], queries: ['fresh citrus fruits', 'orange lemon vitamin'] },
    { terms: ['vitamin d', 'k2'], queries: ['sunlight morning wellness', 'sunshine nature health'] },
    { terms: ['vitamin b', 'b-complex', 'methylated'], queries: ['energy vitality healthy food', 'whole grains nutrition'] },
    { terms: ['magnesium glycinate', 'magnesium citrate', 'types of magnesium'], queries: ['calm relaxation wellness', 'mineral supplement capsules'] },
    { terms: ['magnesium malate'], queries: ['muscle recovery fitness', 'exercise recovery wellness'] },
    { terms: ['ashwagandha'], queries: ['herbal adaptogen powder', 'ayurvedic herbs wellness'] },
    { terms: ['omega-3', 'fish oil', 'epa', 'dha'], queries: ['salmon fish oil healthy', 'omega fatty acid seafood'] },
    { terms: ['iron', 'ferritin', 'anemia'], queries: ['iron rich foods spinach', 'blood test laboratory'] },
    { terms: ['sleep', 'melatonin', 'insomnia'], queries: ['peaceful sleep bedroom', 'restful night wellness'] },
    { terms: ['stress', 'cortisol', 'adrenal'], queries: ['calm meditation nature', 'stress relief mindfulness'] },
    { terms: ['energy', 'fatigue', 'mitochondri'], queries: ['morning energy vitality', 'active lifestyle wellness'] },
    { terms: ['thyroid', 'hashimoto', 'iodine'], queries: ['thyroid health wellness', 'seaweed iodine nutrition'] },
    { terms: ['gut', 'probiotic', 'microbiome', 'digestiv'], queries: ['fermented food probiotics', 'gut health nutrition'] },
    { terms: ['immune', 'immunity'], queries: ['immune health citrus', 'healthy lifestyle protection'] },
    { terms: ['heart', 'cardiovascular', 'cholesterol', 'coq10', 'ubiquinol'], queries: ['heart health cardiovascular', 'healthy heart lifestyle'] },
    { terms: ['brain', 'cognitive', 'focus', 'memory', 'nootropic', 'lion.*mane'], queries: ['brain health cognitive', 'focus concentration study'] },
    { terms: ['liver', 'detox', 'nac', 'glutathione'], queries: ['detox cleanse green', 'liver health nutrition'] },
    { terms: ['muscle', 'protein', 'creatine'], queries: ['fitness muscle workout', 'protein nutrition exercise'] },
    { terms: ['collagen', 'skin', 'beauty'], queries: ['healthy glowing skin', 'skincare beauty natural'] },
    { terms: ['inflammation', 'anti-inflammatory', 'turmeric', 'curcumin'], queries: ['turmeric spice golden', 'anti inflammatory herbs'] },
    { terms: ['nmn', 'nad', 'longevity', 'aging'], queries: ['longevity healthy aging', 'wellness anti aging lifestyle'] },
    { terms: ['selenium', 'zinc'], queries: ['brazil nuts selenium', 'mineral nutrition healthy'] },
    { terms: ['theanine', 'caffeine', 'tea'], queries: ['green tea ceremony calm', 'tea cup relaxation'] },
    { terms: ['lab', 'blood test', 'biomarker', 'hs-crp', 'crp'], queries: ['blood test laboratory', 'medical lab analysis'] },
    { terms: ['wearable', 'biometric'], queries: ['fitness tracker wearable', 'health technology smartwatch'] },
    { terms: ['personalized', 'custom', 'vs generic'], queries: ['personalized medicine health', 'custom supplement capsules'] },
    { terms: ['compare', 'vs viome', 'vs thorne', 'vs ritual'], queries: ['supplement comparison choices', 'health supplement bottles'] },
  ];

  const lowerTitle = title.toLowerCase();
  for (const topic of topicMap) {
    if (topic.terms.some(t => new RegExp(t, 'i').test(lowerTitle))) {
      queries.push(...topic.queries);
      break;
    }
  }

  // Stripped title keywords as fallback
  const stripped = lowerTitle
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !['the', 'and', 'for', 'with', 'that', 'this', 'from', 'your', 'what', 'how', 'does', 'form', 'case', 'every', 'should', 'know', 'matter', 'before', 'right', 'which', 'based', 'early', 'signs'].includes(w))
    .slice(0, 4)
    .join(' ');
  if (stripped) queries.push(stripped + ' health');
  if (queries.length === 0) queries.push('health wellness supplement');
  return queries;
}

async function findPexelsPhoto(title: string): Promise<PexelsPhoto> {
  const queries = extractSearchQueries(title);
  for (const query of queries) {
    for (let page = 1; page <= 3; page++) {
      const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=15&page=${page}&orientation=landscape`;
      const res = await fetch(url, { headers: { Authorization: PEXELS_API_KEY } });
      if (!res.ok) continue;
      const data = await res.json() as { photos: PexelsPhoto[] };
      for (const photo of data.photos) {
        if (!usedPhotoIds.has(photo.id)) {
          usedPhotoIds.add(photo.id);
          return photo;
        }
      }
    }
  }
  throw new Error(`No unique Pexels photo found for: "${title}"`);
}

async function downloadAndUpload(photo: PexelsPhoto, slug: string): Promise<string> {
  // Download high-res photo
  const imgRes = await fetch(photo.src.large2x);
  if (!imgRes.ok) throw new Error(`Download failed: ${imgRes.status}`);
  const imgBuffer = Buffer.from(await imgRes.arrayBuffer());

  // Upload to Supabase Storage
  const filename = `${slug}.jpeg`;
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filename}`;
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'apikey': SUPABASE_SERVICE_KEY,
      'Content-Type': 'image/jpeg',
      'x-upsert': 'true',
    },
    body: imgBuffer,
  });
  if (!uploadRes.ok) {
    const errBody = await uploadRes.text();
    throw new Error(`Upload failed (${uploadRes.status}): ${errBody}`);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`;
}

async function main() {
  console.log('=== Blog Image Backfill (Pexels Stock Photos) ===\n');

  // Get ALL published articles — replace everything with real stock photos
  const { rows: articles } = await pool.query(
    `SELECT id, title, slug, featured_image FROM blog_posts WHERE is_published = true ORDER BY published_at DESC`
  );

  console.log(`Found ${articles.length} published articles. Replacing all images.\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < articles.length; i++) {
    const art = articles[i];
    console.log(`[${i + 1}/${articles.length}] "${art.title}"`);

    try {
      const photo = await findPexelsPhoto(art.title);
      const imageUrl = await downloadAndUpload(photo, art.slug);

      await pool.query(
        `UPDATE blog_posts SET featured_image = $1, updated_at = NOW() WHERE id = $2`,
        [imageUrl, art.id]
      );

      console.log(`  ✓ ${imageUrl} (by ${photo.photographer})\n`);
      success++;

      // Small delay to respect Pexels rate limits (200 req/hour)
      if (i < articles.length - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (err: any) {
      console.error(`  ✗ FAILED: ${err.message}\n`);
      failed++;
    }
  }

  console.log(`\n=== Done: ${success} succeeded, ${failed} failed ===`);
  await pool.end();
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
