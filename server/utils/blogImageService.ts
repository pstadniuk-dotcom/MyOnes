/**
 * Blog Image Service
 * Generates photorealistic blog images using fal.ai Nano Banana 2 model.
 * Uses GPT-4o-mini to extract 1-2 visual keywords from article titles
 * for more relevant image generation, then uploads to Supabase Storage.
 *
 * Cost: ~$0.01 per image (fal.ai nano-banana-2)
 * Requires: FAL_KEY env var
 */

import OpenAI from 'openai';
import { fal } from '@fal-ai/client';
import logger from '../infra/logging/logger';
import { generateImage as falGenerateImage, type ImageModelId, uploadGeneratedAsset } from './falAiService';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = 'blog-images';

let openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai;
}

// Configure fal.ai client
function ensureFalConfigured() {
  if (!process.env.FAL_KEY) throw new Error('FAL_KEY environment variable is required');
  fal.config({ credentials: process.env.FAL_KEY });
}

/**
 * Use GPT-4o-mini to extract 1-2 visual keywords from an article title.
 * These keywords become the core of the image prompt.
 * Examples:
 *   "Niacin Flush: Why It Happens" → "niacin flush"
 *   "Top 5 Benefits of Ashwagandha" → "ashwagandha root"
 *   "How Vitamin D Affects Your Mood" → "vitamin D sunshine"
 */
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
    if (keywords && keywords.length > 0 && keywords.length < 60) {
      return keywords;
    }
  } catch (err: any) {
    logger.warn(`[blogImage] Keyword extraction failed: ${err.message}, using title fallback`);
  }

  // Fallback: strip filler words from title
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !['the', 'and', 'for', 'with', 'that', 'this', 'from', 'your', 'what', 'how', 'does', 'every', 'should', 'know', 'before', 'right', 'which', 'based', 'early', 'signs', 'about', 'into', 'there', 'when', 'between', 'finding'].includes(w))
    .slice(0, 3)
    .join(' ');
}

/**
 * Build a photorealistic prompt for fal.ai Nano Banana 2.
 */
function buildPrompt(keywords: string): string {
  return (
    `Professional editorial photograph for a health and wellness magazine. ` +
    `Subject: ${keywords}. ` +
    `Shot on Canon EOS R5, 85mm f/1.4 lens, natural window lighting, shallow depth of field. ` +
    `Real photograph with authentic textures, genuine materials, realistic shadows. ` +
    `Warm natural color tones, clean composition, landscape orientation, magazine quality.`
  );
}

/**
 * Generate a photorealistic image with fal.ai Nano Banana 2.
 * Returns the image URL from fal.ai CDN.
 */
async function generateImage(keywords: string): Promise<string> {
  ensureFalConfigured();

  const prompt = buildPrompt(keywords);
  logger.info(`[blogImage] Prompt: "${prompt.substring(0, 120)}…"`);

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

  const imageUrl = (result.data as any)?.images?.[0]?.url;
  if (!imageUrl) throw new Error('Nano Banana 2 returned no image URL');
  return imageUrl;
}

/**
 * Download an image from a URL and return as Buffer.
 */
async function downloadImage(url: string): Promise<Buffer> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to download image: ${resp.status}`);
  const arrayBuf = await resp.arrayBuffer();
  return Buffer.from(arrayBuf);
}

/**
 * Generate a unique AI image for a blog article and host it on Supabase Storage.
 * Returns the permanent public URL.
 */
export async function generateBlogImage(title: string, slug: string, modelId?: string): Promise<string> {
  logger.info(`[blogImage] Generating image for "${title}" …`);

  // 1) Extract visual keywords from the title
  const keywords = await extractVisualKeywords(title);
  logger.info(`[blogImage] Keywords: "${keywords}"`);

  // Model override: use centralized service when a non-default model is requested
  if (modelId && modelId !== 'fal-ai/nano-banana-2') {
    const prompt = buildPrompt(keywords);
    logger.info(`[blogImage] Using model ${modelId} for "${title}"`);

    const result = await falGenerateImage({
      modelId: modelId as ImageModelId,
      prompt,
      negativePrompt: 'illustration, cartoon, drawing, 3d render, digital art, painting, sketch, anime, text, watermark, logo, blurry, low quality',
      imageSize: 'landscape_16_9',
    });

    // Upload to Supabase
    const publicUrl = await uploadGeneratedAsset(result.url, BUCKET, slug, 'image/jpeg');
    logger.info(`[blogImage] Generated with ${modelId}`, { publicUrl });
    return publicUrl;
  }

  // 2) Generate photorealistic image with fal.ai Nano Banana 2 (default)
  const falImageUrl = await generateImage(keywords);
  logger.info(`[blogImage] Got fal.ai image URL`);

  // 3) Download the image from fal.ai CDN
  const imageBuffer = await downloadImage(falImageUrl);
  logger.info(`[blogImage] Downloaded ${(imageBuffer.length / 1024).toFixed(0)}KB image`);

  // 4) Upload to Supabase Storage (JPEG for photos)
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
    body: new Uint8Array(imageBuffer),
  });

  if (!uploadRes.ok) {
    const errBody = await uploadRes.text();
    throw new Error(`Supabase upload failed (${uploadRes.status}): ${errBody}`);
  }

  // 5) Return the permanent public URL
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`;
  logger.info(`[blogImage] Uploaded`, { publicUrl });
  return publicUrl;
}
