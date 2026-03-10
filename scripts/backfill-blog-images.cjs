/**
 * Backfill featured images for all blog posts that don't have one.
 * Uses the same keyword→Unsplash mapping as the blog generation service.
 *
 * Usage: node scripts/backfill-blog-images.cjs [--dry-run]
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', 'server', '.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

// ── Same mapping as server/utils/blogGenerationService.ts ──────────────────
const topicPhotos = [
  { terms: ['vitamin', 'multivitamin'],
    photos: ['photo-1584308666744-24d5c474f2ae', 'photo-1556228578-0d85b1a4d571', 'photo-1631549916768-4ab6fec8c5d5'] },
  { terms: ['magnesium', 'mineral'],
    photos: ['photo-1505576399279-0d754c0fda8b', 'photo-1498837167922-ddd27525d352'] },
  { terms: ['ashwagandha', 'adaptogen', 'rhodiola', 'herbal'],
    photos: ['photo-1515377905703-c4788e51af15', 'photo-1471193945509-9ad0617afabf'] },
  { terms: ['omega', 'fish oil', 'epa', 'dha'],
    photos: ['photo-1544551763-46a013bb70d5', 'photo-1615141982883-c7ad0e69fd62'] },
  { terms: ['iron', 'ferritin', 'anemia'],
    photos: ['photo-1490645935967-10de6ba17061', 'photo-1512621776951-a57141f2eefd'] },
  { terms: ['sleep', 'melatonin', 'insomnia'],
    photos: ['photo-1541781774459-bb2af2f05b55', 'photo-1531353826977-0941b4779a1c'] },
  { terms: ['stress', 'cortisol', 'anxiety', 'calm'],
    photos: ['photo-1506126613408-eca07ce68773', 'photo-1545205597-3d9d02c29597'] },
  { terms: ['energy', 'fatigue', 'mitochondri'],
    photos: ['photo-1571019614242-c5c5dee9f50e', 'photo-1552674605-db6ffd4facb5'] },
  { terms: ['thyroid', 'hashimoto', 'iodine'],
    photos: ['photo-1579684385127-1ef15d508118', 'photo-1532938911079-1b06ac7ceec7'] },
  { terms: ['gut', 'probiotic', 'microbiome', 'digestiv'],
    photos: ['photo-1498837167922-ddd27525d352', 'photo-1505576399279-0d754c0fda8b'] },
  { terms: ['immune', 'immunity', 'cold', 'flu'],
    photos: ['photo-1584308666744-24d5c474f2ae', 'photo-1576091160550-2173dba999ef'] },
  { terms: ['heart', 'cardiovascular', 'cholesterol', 'blood pressure'],
    photos: ['photo-1559757175-5700dde675bc', 'photo-1505576399279-0d754c0fda8b'] },
  { terms: ['brain', 'cognitive', 'focus', 'memory', 'nootropic'],
    photos: ['photo-1559757148-5c350d0d3c56', 'photo-1617791160505-6f00504e3519'] },
  { terms: ['liver', 'detox'],
    photos: ['photo-1512621776951-a57141f2eefd', 'photo-1490645935967-10de6ba17061'] },
  { terms: ['muscle', 'protein', 'creatine', 'exercise'],
    photos: ['photo-1534438327276-14e5300c3a48', 'photo-1571019614242-c5c5dee9f50e'] },
  { terms: ['bone', 'calcium', 'osteo'],
    photos: ['photo-1571019614242-c5c5dee9f50e', 'photo-1505576399279-0d754c0fda8b'] },
  { terms: ['skin', 'collagen', 'beauty'],
    photos: ['photo-1596755389378-c31d21fd1273', 'photo-1570172619644-dfd03ed5d881'] },
  { terms: ['hair', 'biotin'],
    photos: ['photo-1522337360788-8b13dee7a37e', 'photo-1596755389378-c31d21fd1273'] },
  { terms: ['weight', 'metaboli', 'fat loss'],
    photos: ['photo-1490645935967-10de6ba17061', 'photo-1552674605-db6ffd4facb5'] },
  { terms: ['inflammation', 'anti-inflammatory', 'turmeric', 'curcumin'],
    photos: ['photo-1615485500704-8e990f9900f7', 'photo-1505576399279-0d754c0fda8b'] },
  { terms: ['coq10', 'ubiquinol'],
    photos: ['photo-1584308666744-24d5c474f2ae', 'photo-1576091160550-2173dba999ef'] },
  { terms: ['nmn', 'nad', 'longevity', 'aging', 'anti-aging'],
    photos: ['photo-1532938911079-1b06ac7ceec7', 'photo-1579684385127-1ef15d508118'] },
  { terms: ['selenium', 'zinc'],
    photos: ['photo-1505576399279-0d754c0fda8b', 'photo-1584308666744-24d5c474f2ae'] },
  { terms: ['theanine', 'caffeine', 'green tea', 'tea'],
    photos: ['photo-1556679343-c7306c1976bc', 'photo-1544787219-7f47ccb76574'] },
  { terms: ['lab', 'blood test', 'biomarker'],
    photos: ['photo-1579684385127-1ef15d508118', 'photo-1532938911079-1b06ac7ceec7'] },
  { terms: ['wearable', 'biometric', 'tracking'],
    photos: ['photo-1576091160399-112ba8d25d1d', 'photo-1510017803350-71a7781e76b7'] },
];

const defaultPhotos = [
  'photo-1505751172876-fa1923c5c528',
  'photo-1584308666744-24d5c474f2ae',
  'photo-1576091160550-2173dba999ef',
  'photo-1556228578-0d85b1a4d571',
  'photo-1505576399279-0d754c0fda8b',
];

function buildFeaturedImageUrl(keyword) {
  const lowerKw = keyword.toLowerCase();
  let matchedPhotos = defaultPhotos;

  for (const topic of topicPhotos) {
    if (topic.terms.some(t => lowerKw.includes(t))) {
      matchedPhotos = topic.photos;
      break;
    }
  }

  let hash = 0;
  for (let i = 0; i < keyword.length; i++) {
    hash = ((hash << 5) - hash + keyword.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % matchedPhotos.length;
  const photoId = matchedPhotos[idx];

  return `https://images.unsplash.com/${photoId}?w=1200&h=630&fit=crop&q=80&auto=format`;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  console.log(dryRun ? '🔍 DRY RUN — no changes will be made\n' : '🖼️  Backfilling blog featured images...\n');

  const { rows } = await pool.query(
    `SELECT id, slug, title, primary_keyword FROM blog_posts WHERE featured_image IS NULL ORDER BY published_at DESC`
  );

  console.log(`Found ${rows.length} posts without featured images.\n`);

  let updated = 0;
  for (const post of rows) {
    const keyword = post.primary_keyword || post.title;
    const imageUrl = buildFeaturedImageUrl(keyword);

    console.log(`  ${post.slug}`);
    console.log(`    keyword: "${keyword}"`);
    console.log(`    image:   ${imageUrl}`);

    if (!dryRun) {
      await pool.query(
        `UPDATE blog_posts SET featured_image = $1, updated_at = NOW() WHERE id = $2`,
        [imageUrl, post.id]
      );
      updated++;
    }
  }

  console.log(`\n✅ ${dryRun ? 'Would update' : 'Updated'} ${dryRun ? rows.length : updated} posts.`);
  await pool.end();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
