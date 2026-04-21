/**
 * Brand Asset Service
 * Upload brand reference images (existing posts, ads, logos, product photos)
 * and use GPT-4o vision to analyze them into a brand style profile that
 * gets injected into every social image generation prompt.
 *
 * Storage: Supabase "brand-assets" bucket
 * Metadata: app_settings table (keys: "brand_assets", "brand_style_profile")
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../infra/logging/logger';
import { SystemRepository } from '../modules/system/system.repository';
import { aiRuntimeSettings } from '../infra/ai/ai-config';

const systemRepo = new SystemRepository();

// ── Types ────────────────────────────────────────────────────────────────────

export interface BrandAsset {
  id: string;
  url: string;
  filename: string;
  category: 'social_post' | 'ad' | 'logo' | 'product' | 'lifestyle' | 'other';
  description?: string;
  uploadedAt: string;
}

export interface BrandStyleProfile {
  profile: string;          // The full style description text injected into prompts
  summary: string;          // Short human-readable summary
  colorPalette: string[];   // Extracted brand colors (hex)
  analyzedAt: string;
  assetCount: number;
}

const SETTINGS_KEY_ASSETS = 'brand_assets';
const SETTINGS_KEY_PROFILE = 'brand_style_profile';

// ── Supabase Storage ─────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = 'brand-assets';

async function ensureBucket() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
    });
  } catch { /* bucket likely exists */ }
}

// ── Asset CRUD ───────────────────────────────────────────────────────────────

async function loadAssets(): Promise<BrandAsset[]> {
  const setting = await systemRepo.getAppSetting(SETTINGS_KEY_ASSETS);
  return (setting?.value as any)?.assets ?? [];
}

async function saveAssets(assets: BrandAsset[]): Promise<void> {
  await systemRepo.upsertAppSetting(SETTINGS_KEY_ASSETS, { assets } as any);
}

export async function listBrandAssets(): Promise<BrandAsset[]> {
  return loadAssets();
}

export async function uploadBrandAsset(
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string,
  category: BrandAsset['category'],
  description?: string,
): Promise<BrandAsset> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('Supabase not configured — SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
  }

  await ensureBucket();

  // Upload file
  const ext = originalName.split('.').pop() || 'jpg';
  const filename = `brand-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filename}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      apikey: SUPABASE_SERVICE_KEY,
      'Content-Type': mimeType,
      'x-upsert': 'true',
    },
    body: new Uint8Array(fileBuffer),
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Upload failed (${uploadRes.status}): ${errText}`);
  }

  const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`;

  const asset: BrandAsset = {
    id: `asset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    url,
    filename: originalName,
    category,
    description,
    uploadedAt: new Date().toISOString(),
  };

  // Append to stored list
  const assets = await loadAssets();
  assets.push(asset);
  await saveAssets(assets);

  logger.info(`[brand-assets] Uploaded ${category}: ${originalName} → ${url}`);
  return asset;
}

export async function deleteBrandAsset(assetId: string): Promise<boolean> {
  const assets = await loadAssets();
  const idx = assets.findIndex(a => a.id === assetId);
  if (idx === -1) return false;

  const asset = assets[idx];

  // Delete from Supabase bucket
  if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    try {
      const storagePath = asset.url.split(`/public/${BUCKET}/`)[1];
      if (storagePath) {
        await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${storagePath}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
            apikey: SUPABASE_SERVICE_KEY,
          },
        });
      }
    } catch (err: any) {
      logger.warn(`[brand-assets] Failed to delete from storage: ${err.message}`);
    }
  }

  assets.splice(idx, 1);
  await saveAssets(assets);
  logger.info(`[brand-assets] Deleted ${assetId}`);
  return true;
}

// ── Brand Style Analysis (Vision — Anthropic or OpenAI) ──────────────────────

const ANALYSIS_PROMPT = `You are a brand identity expert and creative director. Analyze these brand reference images for "Ones" — a personalized supplement platform.

For each image, study: color palette, typography style (if visible), photography/illustration style, composition, lighting, mood, visual elements, and overall brand aesthetic.

Then synthesize everything into a UNIFIED BRAND STYLE PROFILE that will guide AI image generation to match this style.

Return a JSON object with:
{
  "profile": "A detailed 3-4 sentence description of the brand's visual style, written as image generation prompt instructions. Include specific color mentions, photography style, lighting preferences, composition rules, and mood. This text will be prepended to image generation prompts.",
  "summary": "A 1-sentence human-readable summary of the brand style",
  "colorPalette": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
  "photographyStyle": "How photos are styled (lighting, angles, depth of field)",
  "moodKeywords": ["keyword1", "keyword2", "keyword3"]
}

The "profile" field is CRITICAL — it should be specific enough to guide Stable Diffusion / text-to-image models to produce consistent brand imagery. Include phrases like "soft natural lighting" or "bold saturated colors" etc.

Return ONLY the JSON object.`;

async function analyzeWithAnthropic(imageAssets: BrandAsset[]): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = (aiRuntimeSettings.provider === 'anthropic' && aiRuntimeSettings.model)
    ? aiRuntimeSettings.model : 'claude-sonnet-4-6';

  const content: Anthropic.Messages.ContentBlockParam[] = [
    { type: 'text', text: `${ANALYSIS_PROMPT}\n\nI am providing ${imageAssets.length} brand reference images:` },
  ];
  for (const asset of imageAssets) {
    content.push({
      type: 'image',
      source: { type: 'url', url: asset.url },
    });
    content.push({
      type: 'text',
      text: `[Category: ${asset.category}${asset.description ? ' — ' + asset.description : ''}]`,
    });
  }

  logger.info(`[brand-assets] Analyzing ${imageAssets.length} assets with Anthropic ${model}...`);
  const response = await anthropic.messages.create({
    model,
    max_tokens: 1500,
    messages: [{ role: 'user', content }],
  });
  return response.content.find(c => c.type === 'text')?.text ?? '{}';
}

async function analyzeWithOpenAI(imageAssets: BrandAsset[]): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = (aiRuntimeSettings.provider === 'openai' && aiRuntimeSettings.model)
    ? aiRuntimeSettings.model : 'gpt-4o';

  const imageContent: OpenAI.Chat.ChatCompletionContentPart[] = [
    { type: 'text', text: ANALYSIS_PROMPT },
  ];
  for (const asset of imageAssets) {
    imageContent.push({
      type: 'image_url',
      image_url: { url: asset.url, detail: 'low' },
    });
    imageContent.push({
      type: 'text',
      text: `[Category: ${asset.category}${asset.description ? ' — ' + asset.description : ''}]`,
    });
  }

  logger.info(`[brand-assets] Analyzing ${imageAssets.length} assets with OpenAI ${model}...`);
  const response = await openai.chat.completions.create({
    model,
    messages: [{ role: 'user', content: imageContent }],
    max_tokens: 1500,
    response_format: { type: 'json_object' },
  });
  return response.choices[0]?.message?.content ?? '{}';
}

export async function analyzeBrandStyle(): Promise<BrandStyleProfile> {
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  if (!hasAnthropic && !hasOpenAI) {
    throw new Error('Set ANTHROPIC_API_KEY or OPENAI_API_KEY — at least one is required for brand analysis');
  }

  const assets = await loadAssets();
  if (assets.length === 0) {
    throw new Error('Upload at least one brand asset before analyzing');
  }

  const imageAssets = assets.slice(-10); // Most recent 10

  // Try preferred provider first, fall back to the other
  let raw: string;
  const preferAnthropic = aiRuntimeSettings.provider === 'anthropic' || (!aiRuntimeSettings.provider && hasAnthropic);

  if (preferAnthropic && hasAnthropic) {
    try {
      raw = await analyzeWithAnthropic(imageAssets);
    } catch (err: any) {
      logger.warn(`[brand-assets] Anthropic analysis failed: ${err.message}`);
      if (!hasOpenAI) throw err;
      logger.info('[brand-assets] Falling back to OpenAI...');
      raw = await analyzeWithOpenAI(imageAssets);
    }
  } else if (hasOpenAI) {
    try {
      raw = await analyzeWithOpenAI(imageAssets);
    } catch (err: any) {
      logger.warn(`[brand-assets] OpenAI analysis failed: ${err.message}`);
      if (!hasAnthropic) throw err;
      logger.info('[brand-assets] Falling back to Anthropic...');
      raw = await analyzeWithAnthropic(imageAssets);
    }
  } else {
    throw new Error('No AI provider available for brand analysis');
  }

  // Parse the JSON response
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  let parsed: any;
  try {
    parsed = JSON.parse(jsonMatch?.[0] ?? raw);
  } catch {
    throw new Error('Failed to parse brand analysis response');
  }

  const styleProfile: BrandStyleProfile = {
    profile: parsed.profile || 'Premium health and wellness brand with clean, modern aesthetic.',
    summary: parsed.summary || 'Clean, modern health brand aesthetic',
    colorPalette: Array.isArray(parsed.colorPalette) ? parsed.colorPalette : [],
    analyzedAt: new Date().toISOString(),
    assetCount: imageAssets.length,
  };

  // Persist
  await systemRepo.upsertAppSetting(SETTINGS_KEY_PROFILE, styleProfile as any);
  logger.info(`[brand-assets] Brand style profile saved (${styleProfile.colorPalette.length} colors extracted)`);

  return styleProfile;
}

export async function getBrandStyleProfile(): Promise<BrandStyleProfile | null> {
  const setting = await systemRepo.getAppSetting(SETTINGS_KEY_PROFILE);
  if (!setting?.value) return null;
  return setting.value as unknown as BrandStyleProfile;
}

/**
 * Get the brand style prompt prefix for image generation.
 * Returns empty string if no profile exists.
 */
export async function getBrandPromptPrefix(): Promise<string> {
  const profile = await getBrandStyleProfile();
  if (!profile?.profile) return '';
  return profile.profile + ' ';
}
