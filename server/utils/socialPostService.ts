/**
 * Social Post Generation Service
 * AI-powered social media content + image generation for Ones.
 * Uses GPT/Anthropic for copy, fal.ai Nano Banana 2 for images.
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { fal } from '@fal-ai/client';
import { jsonrepair } from 'jsonrepair';
import { logger } from '../infra/logging/logger';
import { getBrandPromptPrefix, listBrandAssets, type BrandAsset } from './brandAssetService';
import { aiRuntimeSettings } from '../infra/ai/ai-config';

// ── Types ────────────────────────────────────────────────────────────────────

export interface GeneratePostsInput {
  platform: 'instagram' | 'twitter' | 'linkedin' | 'facebook' | 'tiktok' | 'threads';
  topic?: string;
  tone?: string;
  count?: number;
  includeHashtags?: boolean;
  contentType?: 'educational' | 'promotional' | 'engagement' | 'trending' | 'testimonial' | 'behind-the-scenes';
}

export interface GeneratedPost {
  platform: string;
  contentType: string;
  caption: string;
  hashtags: string[];
  hookLine: string;
  callToAction: string;
  bestPostTime: string;
  engagementTip: string;
  // Image creative brief
  imageOverlay: {
    headline: string;
    subheadline: string;
    ctaText: string;
    colorScheme: string;
    visualConcept: string;
  };
  imageUrl?: string;
}

export interface GenerateImageInput {
  visualConcept: string;
  platform: 'instagram' | 'twitter' | 'linkedin' | 'facebook' | 'tiktok' | 'threads';
}

export interface IdeaBatch {
  weekTheme: string;
  ideas: ContentIdea[];
}

export interface ContentIdea {
  day: string;
  platform: string;
  contentType: string;
  title: string;
  description: string;
  angle: string;
  targetAudience: string;
  suggestedVisual: string;
}

// ── Supabase Storage ─────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = 'social-images';

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
  } catch { /* bucket likely exists already */ }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

let openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai;
}

function ensureFalConfigured() {
  if (!process.env.FAL_KEY) throw new Error('FAL_KEY environment variable is required for image generation');
  fal.config({ credentials: process.env.FAL_KEY });
}

function parseAiJson(raw: string): any {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI returned unexpected format');
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    try {
      return JSON.parse(jsonrepair(jsonMatch[0]));
    } catch (e: any) {
      throw new Error(`Failed to parse AI response: ${e.message}`);
    }
  }
}

async function callAi(system: string, user: string, maxTokens = 4000): Promise<string> {
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const preferAnthropic = aiRuntimeSettings.provider === 'anthropic' || (!aiRuntimeSettings.provider && hasAnthropic);
  const anthropicModel = (aiRuntimeSettings.provider === 'anthropic' && aiRuntimeSettings.model) || 'claude-sonnet-4-5';
  const openaiModel = (aiRuntimeSettings.provider === 'openai' && aiRuntimeSettings.model) || 'gpt-4o';

  async function tryAnthropic(): Promise<string> {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: anthropicModel,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    });
    return response.content.find(c => c.type === 'text')?.text ?? '';
  }

  async function tryOpenAI(): Promise<string> {
    const ai = getOpenAI();
    const response = await ai.chat.completions.create({
      model: openaiModel,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    });
    return response.choices[0]?.message?.content ?? '{}';
  }

  // Try preferred provider, fall back
  if (preferAnthropic && hasAnthropic) {
    try {
      return await tryAnthropic();
    } catch (err: any) {
      logger.warn(`[social-gen] Anthropic failed: ${err.message}`);
      if (hasOpenAI) {
        logger.info('[social-gen] Falling back to OpenAI...');
        return await tryOpenAI();
      }
      throw err;
    }
  }
  if (hasOpenAI) {
    try {
      return await tryOpenAI();
    } catch (err: any) {
      logger.warn(`[social-gen] OpenAI failed: ${err.message}`);
      if (hasAnthropic) {
        logger.info('[social-gen] Falling back to Anthropic...');
        return await tryAnthropic();
      }
      throw err;
    }
  }
  throw new Error('No AI provider configured (set ANTHROPIC_API_KEY or OPENAI_API_KEY)');
}

// ── System Prompt ────────────────────────────────────────────────────────────

const SOCIAL_SYSTEM_PROMPT = `You are a senior social media strategist and creative director for Ones — a personalized supplement platform that builds custom capsule formulas from lab results, wearable data, and health goals.

Brand name rule: Always call the brand "Ones" (not "ONES AI", not "ONES").

Brand voice:
- Science-backed but approachable — cite real studies/mechanisms when relevant
- Empowering, not preachy — "optimize" not "fix", "personalized" not "one-size-fits-all"
- American English spelling throughout
- Never make FDA-prohibited disease claims; frame as "supporting" or "optimizing" health
- Subtle product mentions — weave Ones naturally, never hard-sell

Key product facts to reference naturally:
- AI health practitioner analyzes blood work, wearable data, and health history
- Custom capsule formulas from 200+ clinically validated ingredients
- System Blends: Adrenal Support, Liver Support, Heart Support, Thyroid Support, etc.
- Popular ingredients: Ashwagandha (KSM-66 600mg), Omega-3, Vitamin D3+K2, Magnesium Glycinate, CoQ10, NAC, NMN
- Available in 6, 9, or 12-capsule daily plans
- Competitors to compare against: Viome, Thorne, Ritual, Function Health (never mention Care/Of — shut down 2023)

Platform-specific rules:
- Instagram: Visual-first, 2200 char max, 20-30 hashtags, carousel/reel CTA
- Twitter/X: 280 char max, punchy, thread-friendly, 3-5 hashtags
- LinkedIn: Professional tone, data-driven, 3000 char max, 3-5 hashtags
- Facebook: Conversational, question-driven engagement, shareable
- TikTok: Trend-aware, hook in first 2 seconds, script-style format
- Threads: Casual, text-forward, conversation-starter format`;

// ── Image size per platform ──────────────────────────────────────────────────

const PLATFORM_IMAGE_SIZES: Record<string, string> = {
  instagram: 'square',
  twitter: 'landscape_16_9',
  linkedin: 'landscape_16_9',
  facebook: 'landscape_16_9',
  tiktok: 'portrait_9_16',
  threads: 'square',
};

// Aspect ratios for the nano-banana-2/edit endpoint (reference-image mode)
const PLATFORM_ASPECT_RATIOS: Record<string, string> = {
  instagram: '1:1',
  twitter: '16:9',
  linkedin: '16:9',
  facebook: '16:9',
  tiktok: '9:16',
  threads: '1:1',
};

// ── Post Generation ──────────────────────────────────────────────────────────

export async function generateSocialPosts(input: GeneratePostsInput): Promise<GeneratedPost[]> {
  const {
    platform,
    topic = 'health optimization',
    tone = 'informative and engaging',
    count = 3,
    includeHashtags = true,
    contentType = 'educational',
  } = input;

  const safeCount = Math.min(Math.max(count, 1), 7);

  const userMessage = `Generate ${safeCount} ${contentType} social media posts for ${platform}.

Topic/Theme: ${topic}
Tone: ${tone}
Include hashtags: ${includeHashtags ? 'yes' : 'no'}

For EVERY post, you must also design the visual creative. Think like a graphic designer. 
For each post decide: what headline text appears on the image, a supporting subheadline, a CTA button/badge text, a color scheme that fits the mood, and a visual concept describing the background photo or graphic.

Return a JSON object:
{
  "posts": [
    {
      "platform": "${platform}",
      "contentType": "${contentType}",
      "caption": "Full post text (respect platform character limits). Use line breaks for readability.",
      "hashtags": ["hashtag1", "hashtag2"],
      "hookLine": "The opening attention-grabbing line (this is the first thing people read)",
      "callToAction": "What you want the reader to do next",
      "bestPostTime": "Best day+time to post (e.g. 'Tuesday 11am EST')",
      "engagementTip": "One specific strategy to boost this post's reach",
      "imageOverlay": {
        "headline": "Bold 3-6 word headline for the image (punchy, large text)",
        "subheadline": "Supporting line, 8-15 words that adds context",
        "ctaText": "Short CTA badge text like 'Learn More' or 'Try Free' or 'Build Your Formula'",
        "colorScheme": "2-3 colors that set the mood, e.g. 'deep green + warm gold + white' or 'soft blue + white + coral accent'",
        "visualConcept": "Describe the background image: a real photograph concept. E.g. 'Close-up of ashwagandha root on a wooden cutting board with soft morning light' or 'Aerial view of a person doing yoga at sunrise on a cliff'"
      }
    }
  ]
}

IMPORTANT: Return only the JSON object. No preamble, no markdown fences.`;

  const raw = await callAi(SOCIAL_SYSTEM_PROMPT, userMessage, 6000);
  const parsed = parseAiJson(raw);
  return parsed.posts || [];
}

// ── Image Generation (Nano Banana 2 — with brand reference images) ──────────

export async function generateSocialImage(input: GenerateImageInput): Promise<string> {
  ensureFalConfigured();

  const { visualConcept, platform } = input;
  const imageSize = PLATFORM_IMAGE_SIZES[platform] || 'square';
  const aspectRatio = PLATFORM_ASPECT_RATIOS[platform] || '1:1';

  // Load brand assets for reference images
  let brandAssets: BrandAsset[] = [];
  try {
    brandAssets = await listBrandAssets();
  } catch (err: any) {
    logger.warn(`[social-img] Could not load brand assets: ${err.message}`);
  }

  // Retrieve brand style profile text (non-blocking)
  let brandPrefix = '';
  try {
    brandPrefix = await getBrandPromptPrefix();
  } catch (err: any) {
    logger.warn(`[social-img] Could not load brand profile: ${err.message}`);
  }

  let falUrl: string;

  if (brandAssets.length > 0) {
    // ── Use nano-banana-2/edit with brand reference images ──────────
    // Prioritize: logos first, then social posts/ads for style, then others
    const prioritized = [
      ...brandAssets.filter(a => a.category === 'logo'),
      ...brandAssets.filter(a => a.category === 'social_post'),
      ...brandAssets.filter(a => a.category === 'ad'),
      ...brandAssets.filter(a => !['logo', 'social_post', 'ad'].includes(a.category)),
    ];
    const referenceUrls = prioritized.slice(0, 5).map(a => a.url);

    const prompt =
      `Create a new professional social media image for a premium health & wellness brand called "Ones". ` +
      `Use the visual style, colors, branding elements, and aesthetic from the provided reference images. ` +
      `${brandPrefix}` +
      `The scene: ${visualConcept}. ` +
      `Magazine quality, vibrant but natural colors, clean modern design. ` +
      `Incorporate the brand's logo and visual identity from the reference images.`;

    logger.info(`[social-img] Generating ${aspectRatio} image for ${platform} with ${referenceUrls.length} brand ref(s): "${visualConcept.substring(0, 80)}..."`);

    const result = await fal.subscribe('fal-ai/nano-banana-2/edit', {
      input: {
        prompt,
        image_urls: referenceUrls,
        aspect_ratio: aspectRatio,
        num_images: 1,
        output_format: 'jpeg',
        resolution: '1K',
      },
    });

    falUrl = (result.data as any)?.images?.[0]?.url;
    if (!falUrl) throw new Error('Nano Banana 2 Edit returned no image URL');
  } else {
    // ── Fallback: text-to-image without reference images ──────────
    const prompt =
      `${brandPrefix}Professional social media photography for a premium health & wellness brand. ` +
      `${visualConcept}. ` +
      `Shot on mirrorless camera, natural lighting, magazine quality, vibrant but natural colors, ` +
      `clean modern aesthetic. No text, no watermarks, no logos in the image.`;

    logger.info(`[social-img] Generating ${imageSize} image for ${platform} (no brand refs): "${visualConcept.substring(0, 80)}..."`);

    const result = await fal.subscribe('fal-ai/nano-banana-2', {
      input: {
        prompt,
        negative_prompt: 'text, words, letters, watermark, logo, banner, overlay, illustration, cartoon, drawing, 3d render, digital art, painting, sketch, anime, blurry, low quality, deformed',
        image_size: imageSize,
        num_images: 1,
        num_inference_steps: 28,
        guidance_scale: 7,
      },
    });

    falUrl = (result.data as any)?.images?.[0]?.url;
    if (!falUrl) throw new Error('Nano Banana 2 returned no image URL');
  }

  // Upload to Supabase for permanent hosting
  if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    try {
      await ensureBucket();
      const resp = await fetch(falUrl);
      if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
      const buf = Buffer.from(await resp.arrayBuffer());

      const filename = `social-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filename}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          apikey: SUPABASE_SERVICE_KEY,
          'Content-Type': 'image/jpeg',
          'x-upsert': 'true',
        },
        body: new Uint8Array(buf),
      });

      if (uploadRes.ok) {
        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`;
        logger.info(`[social-img] Uploaded to Supabase: ${publicUrl}`);
        return publicUrl;
      }
      logger.warn(`[social-img] Supabase upload failed, returning fal.ai CDN URL`);
    } catch (err: any) {
      logger.warn(`[social-img] Supabase upload error: ${err.message}, using fal.ai CDN URL`);
    }
  }

  return falUrl;
}

// ── Content Calendar Ideas ──────────────────────────────────────────────────

export async function generateContentIdeas(daysAhead: number = 7): Promise<IdeaBatch> {
  const safeDays = Math.min(Math.max(daysAhead, 1), 14);

  const userMessage = `Create a ${safeDays}-day social media content calendar for Ones.

For each day, suggest one content idea across rotating platforms (Instagram, Twitter, LinkedIn, TikTok, Threads, Facebook).

Return a JSON object:
{
  "weekTheme": "Overarching theme for the week (compelling, strategic)",
  "ideas": [
    {
      "day": "Day 1 - Monday",
      "platform": "instagram",
      "contentType": "educational | promotional | engagement | trending | testimonial | behind-the-scenes",
      "title": "Short 5-7 word title",
      "description": "2-3 sentence description of what the post should cover",
      "angle": "The specific hook or angle to take",
      "targetAudience": "Who this resonates with most (e.g. 'busy professionals 30-45')",
      "suggestedVisual": "Brief description of the ideal image or video concept"
    }
  ]
}

Mix content types throughout the week. Include at least one each of: educational, engagement, and promotional. Each idea should have a distinct visual concept.
IMPORTANT: Return only the JSON object. No preamble, no markdown fences.`;

  const raw = await callAi(SOCIAL_SYSTEM_PROMPT, userMessage);
  const parsed = parseAiJson(raw);

  return {
    weekTheme: parsed.weekTheme || 'Weekly Content Plan',
    ideas: parsed.ideas || [],
  };
}
