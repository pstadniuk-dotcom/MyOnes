/**
 * Blog Image Service
 * Finds unique, high-quality stock photos from Pexels for blog articles,
 * downloads them to Supabase Storage for permanent hosting.
 */

const PEXELS_API_KEY = process.env.PEXELS_API_KEY || '2IqQkGKccTnSbO7X9uk7WIN7sW1fubg3L8hGgzmwTNCBm1CX3IJvdeMg';
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = 'blog-images';

// Track used photo IDs across the lifetime of the process to avoid duplicates
const usedPhotoIds = new Set<number>();

interface PexelsPhoto {
  id: number;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
  };
  photographer: string;
}

interface PexelsResponse {
  photos: PexelsPhoto[];
  total_results: number;
}

/**
 * Extract smart search terms from an article title.
 * Returns multiple queries ordered by specificity so Pexels returns relevant results.
 */
function extractSearchQueries(title: string): string[] {
  const queries: string[] = [];

  // Map of article topics → ideal Pexels search terms (real photography keywords)
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

  // Also try the raw title keywords (stripped of filler words)
  const stripped = lowerTitle
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !['the', 'and', 'for', 'with', 'that', 'this', 'from', 'your', 'what', 'how', 'does', 'form', 'case', 'every', 'should', 'know', 'matter', 'before', 'right', 'which', 'based', 'early', 'signs'].includes(w))
    .slice(0, 4)
    .join(' ');
  if (stripped) queries.push(stripped + ' health');

  // Always have a fallback
  if (queries.length === 0) queries.push('health wellness supplement');

  return queries;
}

/**
 * Search Pexels for a unique photo matching the article topic.
 * Avoids returning photos already used by other articles.
 */
async function findPexelsPhoto(title: string): Promise<PexelsPhoto> {
  const queries = extractSearchQueries(title);

  for (const query of queries) {
    // Search multiple pages to find unused photos
    for (let page = 1; page <= 3; page++) {
      const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=15&page=${page}&orientation=landscape`;

      const res = await fetch(url, {
        headers: { Authorization: PEXELS_API_KEY },
      });

      if (!res.ok) {
        console.error(`[blogImage] Pexels search failed (${res.status}) for query: "${query}"`);
        continue;
      }

      const data = (await res.json()) as PexelsResponse;

      // Find a photo we haven't used yet
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

/**
 * Find a unique stock photo for a blog article and host it on Supabase Storage.
 * Returns the permanent public URL.
 */
export async function generateBlogImage(title: string, slug: string): Promise<string> {
  console.log(`[blogImage] Finding photo for "${title}" …`);

  // 1) Find a unique photo from Pexels
  const photo = await findPexelsPhoto(title);

  // Use large2x (high-res, ~1200px wide) — perfect for blog cards + OG
  const photoUrl = photo.src.large2x;

  // 2) Download the photo
  const imgRes = await fetch(photoUrl);
  if (!imgRes.ok) throw new Error(`Failed to download Pexels photo: ${imgRes.status}`);
  const imgArrayBuffer = await imgRes.arrayBuffer();
  const imgUint8 = new Uint8Array(imgArrayBuffer);

  // 3) Upload to Supabase Storage
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
    body: imgUint8,
  });

  if (!uploadRes.ok) {
    const errBody = await uploadRes.text();
    throw new Error(`Supabase upload failed (${uploadRes.status}): ${errBody}`);
  }

  // 4) Return the permanent public URL
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`;
  console.log(`[blogImage] ✓ ${publicUrl} (by ${photo.photographer})`);
  return publicUrl;
}

/**
 * Mark a Pexels photo ID as used (for backfill scripts that need to pre-seed the set).
 */
export function markPhotoUsed(id: number): void {
  usedPhotoIds.add(id);
}
