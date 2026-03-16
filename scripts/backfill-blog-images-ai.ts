/**
 * Backfill Blog Images (fal.ai Nano Banana 2)
 *
 * Generates photorealistic images via fal.ai nano-banana-2 for every published blog article,
 * uploads to Supabase Storage, and updates the DB record.
 *
 * Uses GPT-4o-mini to extract visual keywords from article titles for
 * more relevant image generation.
 *
 * Cost: ~$0.01 per image (fal.ai nano-banana-2)
 *
 * Usage:
 *   npx tsx scripts/backfill-blog-images-ai.ts          # all articles
 *   npx tsx scripts/backfill-blog-images-ai.ts --missing # only articles without images
 *
 * Requires: FAL_KEY, OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL in server/.env
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', 'server', '.env') });

import OpenAI from 'openai';
import { fal } from '@fal-ai/client';
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL!;
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = 'blog-images';

const pool = new Pool({ connectionString: DATABASE_URL });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Configure fal.ai
if (!process.env.FAL_KEY) {
  console.error('FAL_KEY environment variable is required');
  process.exit(1);
}
fal.config({ credentials: process.env.FAL_KEY });

/**
 * Extract 1-3 visual keywords from an article title using GPT-4o-mini.
 */
async function extractVisualKeywords(title: string): Promise<string> {
  try {
    const resp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      max_tokens: 30,
      messages: [
        {
          role: 'system',
          content:
            'Extract 1-3 visual keywords from the given article title that would make a good photograph. ' +
            'Focus on the main subject that can be visually depicted. Return ONLY the keywords, nothing else. ' +
            'Examples:\n' +
            '"Niacin Flush: Why It Happens and Is It Dangerous?" → niacin supplement capsules\n' +
            '"Top 5 Benefits of Ashwagandha for Stress" → ashwagandha root powder\n' +
            '"Understanding Your Blood Test Results" → blood test laboratory\n' +
            '"Omega-3 vs Omega-6: Finding the Right Balance" → omega fish oil capsules\n' +
            '"How Sleep Quality Affects Recovery" → peaceful sleep rest',
        },
        { role: 'user', content: title },
      ],
    });
    const keywords = resp.choices[0]?.message?.content?.trim();
    if (keywords && keywords.length > 0 && keywords.length < 60) return keywords;
  } catch (err: any) {
    console.warn(`  ⚠ Keyword extraction failed: ${err.message}`);
  }

  // Fallback
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !['the', 'and', 'for', 'with', 'that', 'this', 'from', 'your', 'what', 'how', 'does', 'every', 'should', 'know', 'before', 'right', 'which', 'based', 'early', 'signs', 'about'].includes(w))
    .slice(0, 3)
    .join(' ');
}

/**
 * Generate a photorealistic image via fal.ai Nano Banana 2 and upload to Supabase.
 */
async function generateAndUpload(title: string, slug: string): Promise<string> {
  const keywords = await extractVisualKeywords(title);
  console.log(`  Keywords: "${keywords}"`);

  const prompt =
    `Professional editorial photograph for a health and wellness magazine. ` +
    `Subject: ${keywords}. ` +
    `Shot on Canon EOS R5, 85mm f/1.4 lens, natural window lighting, shallow depth of field. ` +
    `Real photograph with authentic textures, genuine materials, realistic shadows. ` +
    `Warm natural color tones, clean composition, landscape orientation, magazine quality.`;

  const result = await fal.subscribe('fal-ai/nano-banana-2', {
    input: {
      prompt,
      negative_prompt: 'illustration, cartoon, drawing, 3d render, digital art, painting, sketch, anime, text, watermark, logo, blurry, low quality',
      image_size: 'landscape_16_9',
      num_images: 1,
      num_inference_steps: 28,
      guidance_scale: 7,
    },
  });

  const falImageUrl = (result.data as any)?.images?.[0]?.url;
  if (!falImageUrl) throw new Error('Nano Banana 2 returned no image URL');

  // Download from fal.ai CDN
  const imgResp = await fetch(falImageUrl);
  if (!imgResp.ok) throw new Error(`Failed to download fal.ai image: ${imgResp.status}`);
  const imgBuffer = Buffer.from(await imgResp.arrayBuffer());
  console.log(`  Generated ${(imgBuffer.length / 1024).toFixed(0)}KB image`);

  // Upload to Supabase Storage
  const filename = `${slug}.jpg`;
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
  const missingOnly = process.argv.includes('--missing');
  console.log(`=== Blog Image Backfill (fal.ai Nano Banana 2) ===${missingOnly ? ' [missing only]' : ''}\n`);

  const query = missingOnly
    ? `SELECT id, title, slug, featured_image FROM blog_posts WHERE is_published = true AND (featured_image IS NULL OR featured_image = '' OR featured_image NOT LIKE '%.jpg') ORDER BY published_at DESC`
    : `SELECT id, title, slug, featured_image FROM blog_posts WHERE is_published = true ORDER BY published_at DESC`;

  const { rows: articles } = await pool.query(query);
  console.log(`Found ${articles.length} articles to process.\n`);

  let success = 0;
  let failed = 0;
  const costPerImage = 0.01;

  for (let i = 0; i < articles.length; i++) {
    const art = articles[i];
    console.log(`[${i + 1}/${articles.length}] "${art.title}"`);

    try {
      const imageUrl = await generateAndUpload(art.title, art.slug);

      await pool.query(
        `UPDATE blog_posts SET featured_image = $1, updated_at = NOW() WHERE id = $2`,
        [imageUrl, art.id]
      );

      console.log(`  ✓ ${imageUrl}\n`);
      success++;

      // Small delay to avoid rate limits
      if (i < articles.length - 1) {
        await new Promise(r => setTimeout(r, 1500));
      }
    } catch (err: any) {
      console.error(`  ✗ FAILED: ${err.message}\n`);
      failed++;
    }
  }

  const totalCost = success * costPerImage;
  console.log(`\n=== Done: ${success} succeeded, ${failed} failed (~$${totalCost.toFixed(2)} estimated cost) ===`);
  await pool.end();
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
