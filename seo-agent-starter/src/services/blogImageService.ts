/**
 * Blog Image Service — AI-Powered Featured Images
 *
 * Pipeline:
 *   1. GPT-4o-mini extracts 1-3 visual keywords from the article title
 *   2. Builds a photorealistic camera prompt for image generation
 *   3. fal.ai Nano Banana 2 generates the image (~$0.01/image)
 *   4. Image is downloaded and uploaded to your storage bucket
 *   5. Returns the permanent public URL
 *
 * Requires: FAL_KEY, OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import OpenAI from 'openai';
import { fal } from '@fal-ai/client';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = 'blog-images';

let openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai;
}

function ensureFalConfigured() {
  if (!process.env.FAL_KEY) throw new Error('FAL_KEY environment variable is required');
  fal.config({ credentials: process.env.FAL_KEY });
}

// ── Step 1: Extract visual keywords from article title ───────────────────────

async function extractVisualKeywords(title: string): Promise<string> {
  try {
    const ai = getOpenAI();
    const resp = await ai.chat.completions.create({
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
            '"Top 5 Benefits of Ashwagandha for Stress" → ashwagandha root powder\n' +
            '"Understanding Your Blood Test Results" → blood test laboratory\n' +
            '"How Sleep Quality Affects Recovery" → peaceful sleep rest',
        },
        { role: 'user', content: title },
      ],
    });
    const keywords = resp.choices[0]?.message?.content?.trim();
    if (keywords && keywords.length > 0 && keywords.length < 60) return keywords;
  } catch (err: any) {
    console.warn(`[blogImage] Keyword extraction failed: ${err.message}, using title fallback`);
  }

  // Fallback: strip filler words from title
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !['the', 'and', 'for', 'with', 'that', 'this', 'from', 'your', 'what', 'how', 'does', 'every', 'should', 'know'].includes(w))
    .slice(0, 3)
    .join(' ');
}

// ── Step 2: Build photorealistic prompt ──────────────────────────────────────

function buildPrompt(keywords: string): string {
  return (
    `Professional editorial photograph for a health and wellness magazine. ` +
    `Subject: ${keywords}. ` +
    `Shot on Canon EOS R5, 85mm f/1.4 lens, natural window lighting, shallow depth of field. ` +
    `Real photograph with authentic textures, genuine materials, realistic shadows. ` +
    `Warm natural color tones, clean composition, landscape orientation, magazine quality.`
  );
}

// ── Step 3: Generate with fal.ai ─────────────────────────────────────────────

async function generateImage(keywords: string): Promise<string> {
  ensureFalConfigured();

  const result = await fal.subscribe('fal-ai/nano-banana-2', {
    input: {
      prompt: buildPrompt(keywords),
      negative_prompt:
        'illustration, cartoon, drawing, 3d render, digital art, painting, sketch, anime, text, watermark, logo, blurry, low quality',
      image_size: 'landscape_16_9',
      num_images: 1,
      num_inference_steps: 28,
      guidance_scale: 7,
    },
  });

  const imageUrl = (result.data as any)?.images?.[0]?.url;
  if (!imageUrl) throw new Error('Nano Banana 2 returned no image URL');
  return imageUrl;
}

// ── Step 4: Download image ───────────────────────────────────────────────────

async function downloadImage(url: string): Promise<Buffer> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to download image: ${resp.status}`);
  return Buffer.from(await resp.arrayBuffer());
}

// ── Step 5: Upload to Supabase Storage ───────────────────────────────────────
// Replace this function if you use S3, Cloudflare R2, or another provider.

async function uploadToStorage(imageBuffer: Buffer, filename: string): Promise<string> {
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filename}`;

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      apikey: SUPABASE_SERVICE_KEY,
      'Content-Type': 'image/jpeg',
      'x-upsert': 'true',
    },
    body: new Uint8Array(imageBuffer),
  });

  if (!uploadRes.ok) {
    const errBody = await uploadRes.text();
    throw new Error(`Upload failed (${uploadRes.status}): ${errBody}`);
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a unique AI featured image for a blog article.
 * Returns the permanent public URL of the hosted image.
 */
export async function generateBlogImage(title: string, slug: string): Promise<string> {
  console.log(`[blogImage] Generating image for "${title}"...`);

  const keywords    = await extractVisualKeywords(title);
  console.log(`[blogImage] Keywords: "${keywords}"`);

  const falImageUrl = await generateImage(keywords);
  const imageBuffer = await downloadImage(falImageUrl);
  console.log(`[blogImage] Downloaded ${(imageBuffer.length / 1024).toFixed(0)}KB image`);

  const filename  = `${slug}.jpg`;
  const publicUrl = await uploadToStorage(imageBuffer, filename);
  console.log(`[blogImage] Uploaded → ${publicUrl}`);

  return publicUrl;
}
