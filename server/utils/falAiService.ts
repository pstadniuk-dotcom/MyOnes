/**
 * Centralized fal.ai Service
 * Unified interface for all fal.ai model interactions across the platform.
 * Used by: Social Studio, Blog, Meta Ads, UGC Studio, Brand Studio
 */

import { fal } from '@fal-ai/client';
import { logger } from '../infra/logging/logger';
import { logFalAiUsage } from '../modules/ai-usage/ai-usage.service';

// ── Configuration ───────────────────────────────────────────────────────────

let configured = false;

export function ensureFalConfigured() {
  if (configured) return;
  if (!process.env.FAL_KEY) throw new Error('FAL_KEY environment variable is required for AI image/video generation');
  fal.config({ credentials: process.env.FAL_KEY });
  configured = true;
}

// ── Model Catalog ───────────────────────────────────────────────────────────

export type ImageModelId =
  | 'fal-ai/flux/dev'
  | 'fal-ai/flux-pro/v1.1'
  | 'fal-ai/flux-pro/v1.1-ultra'
  | 'fal-ai/flux-pro/kontext'
  | 'fal-ai/nano-banana-2'
  | 'fal-ai/nano-banana-2/edit'
  | 'fal-ai/ideogram/v3'
  | 'fal-ai/recraft-v3'
  | 'fal-ai/seedream-3'
  | 'fal-ai/seedream-4'
  | 'fal-ai/pulid'
  | 'fal-ai/gpt-image-1';

export type VideoModelId =
  | 'fal-ai/kling-video/v2.1/master/image-to-video'
  | 'fal-ai/kling-video/v3/pro/image-to-video'
  | 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video'
  | 'fal-ai/minimax-video/image-to-video'
  | 'fal-ai/wan/v2.1/image-to-video'
  | 'fal-ai/seedance/video'
  | 'fal-ai/veo3.1/image-to-video'
  | 'fal-ai/veo3.1/fast/image-to-video'
  | 'fal-ai/sora-2/image-to-video';

export type UpscaleModelId =
  | 'fal-ai/creative-upscaler';

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  category: 'image' | 'video' | 'upscale' | 'utility';
  bestFor: string[];
  costTier: 'low' | 'medium' | 'high';
  supportsReferenceImages: boolean;
  supportsNegativePrompt: boolean;
}

export const IMAGE_MODELS: Record<ImageModelId, ModelInfo> = {
  'fal-ai/flux/dev': {
    id: 'fal-ai/flux/dev',
    name: 'FLUX.1 Dev',
    description: 'Open-weight image generation with strong prompt adherence',
    category: 'image',
    bestFor: ['general', 'product-photos', 'lifestyle'],
    costTier: 'low',
    supportsReferenceImages: false,
    supportsNegativePrompt: true,
  },
  'fal-ai/flux-pro/v1.1': {
    id: 'fal-ai/flux-pro/v1.1',
    name: 'FLUX Pro 1.1',
    description: 'Enhanced composition and artistic fidelity for premium images',
    category: 'image',
    bestFor: ['hero-images', 'product-photos', 'lifestyle', 'editorial'],
    costTier: 'medium',
    supportsReferenceImages: false,
    supportsNegativePrompt: true,
  },
  'fal-ai/flux-pro/v1.1-ultra': {
    id: 'fal-ai/flux-pro/v1.1-ultra',
    name: 'FLUX Pro 1.1 Ultra',
    description: 'Highest quality FLUX — 2K resolution, photorealistic, premium hero shots',
    category: 'image',
    bestFor: ['hero-images', 'editorial', 'premium-product-photos'],
    costTier: 'high',
    supportsReferenceImages: false,
    supportsNegativePrompt: true,
  },
  'fal-ai/flux-pro/kontext': {
    id: 'fal-ai/flux-pro/kontext',
    name: 'FLUX Kontext',
    description: 'Image editing with reference images — targeted edits without full regeneration',
    category: 'image',
    bestFor: ['brand-consistency', 'iterative-editing', 'product-mockups'],
    costTier: 'medium',
    supportsReferenceImages: true,
    supportsNegativePrompt: false,
  },
  'fal-ai/nano-banana-2': {
    id: 'fal-ai/nano-banana-2',
    name: 'Nano Banana 2',
    description: 'Fast, affordable generation with good text rendering',
    category: 'image',
    bestFor: ['social-media', 'blog-images', 'quick-drafts'],
    costTier: 'low',
    supportsReferenceImages: false,
    supportsNegativePrompt: true,
  },
  'fal-ai/nano-banana-2/edit': {
    id: 'fal-ai/nano-banana-2/edit',
    name: 'Nano Banana 2 Edit',
    description: 'Image editing conditioned on reference images for brand style matching',
    category: 'image',
    bestFor: ['brand-consistency', 'style-transfer'],
    costTier: 'low',
    supportsReferenceImages: true,
    supportsNegativePrompt: false,
  },
  'fal-ai/ideogram/v3': {
    id: 'fal-ai/ideogram/v3',
    name: 'Ideogram v3',
    description: 'Best-in-class text rendering in images — perfect for logos, quotes, branded graphics',
    category: 'image',
    bestFor: ['logos', 'text-overlays', 'branded-graphics', 'infographics'],
    costTier: 'medium',
    supportsReferenceImages: false,
    supportsNegativePrompt: true,
  },
  'fal-ai/recraft-v3': {
    id: 'fal-ai/recraft-v3',
    name: 'Recraft v3',
    description: 'Illustration and vector-style art — great for icons, illustrations, ingredient art',
    category: 'image',
    bestFor: ['illustrations', 'icons', 'ingredient-art', 'infographics'],
    costTier: 'medium',
    supportsReferenceImages: false,
    supportsNegativePrompt: true,
  },
  'fal-ai/seedream-3': {
    id: 'fal-ai/seedream-3',
    name: 'Seedream 3',
    description: 'Stylized and editorial imagery with strong artistic fidelity',
    category: 'image',
    bestFor: ['editorial', 'stylized', 'hero-images'],
    costTier: 'medium',
    supportsReferenceImages: false,
    supportsNegativePrompt: true,
  },
  'fal-ai/seedream-4': {
    id: 'fal-ai/seedream-4',
    name: 'Seedream 4',
    description: 'ByteDance latest — superior text rendering, photorealism, and reference image support',
    category: 'image',
    bestFor: ['editorial', 'hero-images', 'product-photos', 'text-overlays'],
    costTier: 'medium',
    supportsReferenceImages: true,
    supportsNegativePrompt: true,
  },
  'fal-ai/pulid': {
    id: 'fal-ai/pulid',
    name: 'PuLID',
    description: 'Face-consistent generation — preserves facial identity across images',
    category: 'image',
    bestFor: ['ugc-characters', 'face-consistency'],
    costTier: 'medium',
    supportsReferenceImages: true,
    supportsNegativePrompt: true,
  },
  'fal-ai/gpt-image-1': {
    id: 'fal-ai/gpt-image-1',
    name: 'GPT Image 1',
    description: 'OpenAI image generation with strong prompt adherence and photorealism',
    category: 'image',
    bestFor: ['general', 'product-photos', 'hero-images'],
    costTier: 'high',
    supportsReferenceImages: false,
    supportsNegativePrompt: false,
  },
};

export const VIDEO_MODELS: Record<VideoModelId, ModelInfo> = {
  'fal-ai/kling-video/v2.1/master/image-to-video': {
    id: 'fal-ai/kling-video/v2.1/master/image-to-video',
    name: 'Kling 2.1 Master',
    description: 'Proven image-to-video with fluid motion (current default)',
    category: 'video',
    bestFor: ['ugc-scenes', 'product-demos'],
    costTier: 'medium',
    supportsReferenceImages: false,
    supportsNegativePrompt: true,
  },
  'fal-ai/kling-video/v3/pro/image-to-video': {
    id: 'fal-ai/kling-video/v3/pro/image-to-video',
    name: 'Kling 3.0 Pro',
    description: 'Latest Kling with native audio support and camera control',
    category: 'video',
    bestFor: ['ugc-scenes', 'ads', 'product-demos', 'cinematic'],
    costTier: 'high',
    supportsReferenceImages: false,
    supportsNegativePrompt: true,
  },
  'fal-ai/minimax-video/image-to-video': {
    id: 'fal-ai/minimax-video/image-to-video',
    name: 'MiniMax Hailuo',
    description: 'High quality image-to-video with smooth motion',
    category: 'video',
    bestFor: ['product-animations', 'social-clips'],
    costTier: 'medium',
    supportsReferenceImages: false,
    supportsNegativePrompt: false,
  },
  'fal-ai/wan/v2.1/image-to-video': {
    id: 'fal-ai/wan/v2.1/image-to-video',
    name: 'WAN 2.1',
    description: 'Enhanced motion smoothness and scene fidelity',
    category: 'video',
    bestFor: ['product-animations', 'lifestyle-clips'],
    costTier: 'medium',
    supportsReferenceImages: false,
    supportsNegativePrompt: true,
  },
  'fal-ai/seedance/video': {
    id: 'fal-ai/seedance/video',
    name: 'Seed Dance 2.0',
    description: 'ByteDance — cinematic motion, superior human movement and expressions',
    category: 'video',
    bestFor: ['ugc-scenes', 'ads', 'product-demos', 'cinematic', 'human-motion'],
    costTier: 'high',
    supportsReferenceImages: false,
    supportsNegativePrompt: true,
  },
  'fal-ai/kling-video/v2.5-turbo/pro/image-to-video': {
    id: 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video',
    name: 'Kling 2.5 Turbo Pro',
    description: 'Latest Kling — faster, sharper, better prompt adherence than 2.1 Master',
    category: 'video',
    bestFor: ['ugc-scenes', 'ads', 'product-demos', 'cinematic'],
    costTier: 'high',
    supportsReferenceImages: false,
    supportsNegativePrompt: true,
  },
  'fal-ai/veo3.1/image-to-video': {
    id: 'fal-ai/veo3.1/image-to-video',
    name: 'Veo 3.1',
    description: 'Google DeepMind state-of-the-art — native audio, cinematic quality, best-in-class',
    category: 'video',
    bestFor: ['ugc-scenes', 'ads', 'cinematic', 'human-motion', 'product-demos'],
    costTier: 'high',
    supportsReferenceImages: false,
    supportsNegativePrompt: true,
  },
  'fal-ai/veo3.1/fast/image-to-video': {
    id: 'fal-ai/veo3.1/fast/image-to-video',
    name: 'Veo 3.1 Fast',
    description: 'Faster, more affordable Veo 3.1 — same quality tier, lower cost',
    category: 'video',
    bestFor: ['ugc-scenes', 'ads', 'social-clips', 'product-demos'],
    costTier: 'medium',
    supportsReferenceImages: false,
    supportsNegativePrompt: true,
  },
  'fal-ai/sora-2/image-to-video': {
    id: 'fal-ai/sora-2/image-to-video',
    name: 'Sora 2',
    description: 'OpenAI Sora 2 — cinematic, narrative-rich video with strong physics',
    category: 'video',
    bestFor: ['ugc-scenes', 'cinematic', 'ads', 'storytelling'],
    costTier: 'high',
    supportsReferenceImages: false,
    supportsNegativePrompt: false,
  },
};

// ── Image Size Mappings ─────────────────────────────────────────────────────

export const IMAGE_SIZES = {
  square: 'square',
  landscape: 'landscape_16_9',
  portrait: 'portrait_9_16',
  landscape_4_3: 'landscape_4_3',
} as const;

export const ASPECT_RATIOS = {
  square: '1:1',
  landscape: '16:9',
  portrait: '9:16',
  landscape_4_3: '4:3',
} as const;

// ── Unified Image Generation ────────────────────────────────────────────────

export interface GenerateImageOptions {
  modelId?: ImageModelId;
  prompt: string;
  negativePrompt?: string;
  imageSize?: string;      // for models using named sizes (square, landscape_16_9, portrait_9_16)
  aspectRatio?: string;    // for models using aspect ratios (1:1, 16:9, 9:16)
  referenceImageUrls?: string[];  // for edit/kontext/pulid models
  numImages?: number;
  guidanceScale?: number;
  numInferenceSteps?: number;
  outputFormat?: 'jpeg' | 'png';
  resolution?: string;    // for some models: 1K, 2K
  style?: string;         // for recraft: realistic_image, digital_illustration, vector_illustration
  feature?: string;       // for cost tracking: 'social_image' | 'blog_image' | 'ad_creative' | 'ugc_image' | 'brand_studio'
}

export interface GeneratedImage {
  url: string;
  modelUsed: string;
  width?: number;
  height?: number;
}

export async function generateImage(options: GenerateImageOptions): Promise<GeneratedImage> {
  ensureFalConfigured();

  const modelId = options.modelId || 'fal-ai/flux-pro/v1.1';
  const model = IMAGE_MODELS[modelId as ImageModelId];

  logger.info(`[fal-ai] Generating image with ${model?.name || modelId}: "${options.prompt.substring(0, 80)}..."`);

  let result: any;

  switch (modelId) {
    case 'fal-ai/ideogram/v3': {
      result = await fal.subscribe(modelId, {
        input: {
          prompt: options.prompt,
          image_size: (options.imageSize || 'square_hd') as any,
          style: 'AUTO',
          rendering_speed: 'BALANCED',
        },
      });
      break;
    }

    case 'fal-ai/recraft-v3': {
      result = await fal.subscribe(modelId, {
        input: {
          prompt: options.prompt,
          image_size: options.imageSize || 'square',
          style: options.style || 'realistic_image',
        },
      });
      break;
    }

    case 'fal-ai/gpt-image-1': {
      result = await fal.subscribe(modelId, {
        input: {
          prompt: options.prompt,
          image_size: options.imageSize || 'landscape_16_9',
          quality: 'high',
        },
      });
      break;
    }

    case 'fal-ai/flux-pro/kontext': {
      if (!options.referenceImageUrls?.length) {
        throw new Error('FLUX Kontext requires at least one reference image');
      }
      result = await fal.subscribe(modelId, {
        input: {
          prompt: options.prompt,
          image_url: options.referenceImageUrls[0],
          output_format: options.outputFormat || 'jpeg',
          guidance_scale: options.guidanceScale || 3.5,
        },
      });
      break;
    }

    case 'fal-ai/nano-banana-2/edit': {
      result = await fal.subscribe(modelId, {
        input: {
          prompt: options.prompt,
          image_urls: options.referenceImageUrls || [],
          aspect_ratio: options.aspectRatio || '1:1',
          num_images: options.numImages || 1,
          output_format: options.outputFormat || 'jpeg',
          resolution: options.resolution || '1K',
        },
      });
      break;
    }

    case 'fal-ai/pulid': {
      if (!options.referenceImageUrls?.length) {
        throw new Error('PuLID requires a reference image for face consistency');
      }
      result = await fal.subscribe(modelId, {
        input: {
          prompt: options.prompt,
          reference_images: options.referenceImageUrls.map(url => ({ image_url: url })),
          num_images: options.numImages || 1,
          negative_prompt: options.negativePrompt,
          guidance_scale: options.guidanceScale || 1.2,
          id_scale: 0.8,
          mode: 'fidelity',
          num_inference_steps: options.numInferenceSteps || 12,
        },
      });
      break;
    }

    case 'fal-ai/seedream-3':
    case 'fal-ai/seedream-4': {
      result = await fal.subscribe(modelId, {
        input: {
          prompt: options.prompt,
          negative_prompt: options.negativePrompt,
          image_size: options.imageSize || 'landscape_16_9',
          num_images: options.numImages || 1,
          ...(modelId === 'fal-ai/seedream-4' && options.referenceImageUrls?.length
            ? { image_urls: options.referenceImageUrls.slice(0, 5) }
            : {}),
        },
      });
      break;
    }

    // Default: FLUX family and Nano Banana 2
    default: {
      result = await fal.subscribe(modelId, {
        input: {
          prompt: options.prompt,
          negative_prompt: options.negativePrompt,
          image_size: options.imageSize || 'landscape_16_9',
          num_images: options.numImages || 1,
          num_inference_steps: options.numInferenceSteps || 28,
          guidance_scale: options.guidanceScale || 7,
        },
      });
    }
  }

  const imageUrl = (result.data as any)?.images?.[0]?.url;
  if (!imageUrl) throw new Error(`${model?.name || modelId} returned no image URL`);

  logger.info(`[fal-ai] Image generated successfully with ${model?.name || modelId}`);

  // Log cost for tracking
  logFalAiUsage({ model: modelId, feature: options.feature || 'image_gen' }).catch(() => {});

  return {
    url: imageUrl,
    modelUsed: modelId,
    width: (result.data as any)?.images?.[0]?.width,
    height: (result.data as any)?.images?.[0]?.height,
  };
}

// ── Unified Video Generation ────────────────────────────────────────────────

export interface GenerateVideoOptions {
  modelId?: VideoModelId;
  startFrameImageUrl: string;
  prompt: string;
  negativePrompt?: string;
  durationSeconds?: number;
  cfgScale?: number;
  aspectRatio?: string;
}

export interface GeneratedVideo {
  url: string;
  modelUsed: string;
}

export async function generateVideo(options: GenerateVideoOptions): Promise<GeneratedVideo> {
  ensureFalConfigured();

  const modelId = options.modelId || 'fal-ai/kling-video/v2.1/master/image-to-video';
  const model = VIDEO_MODELS[modelId as VideoModelId];

  logger.info(`[fal-ai] Generating video with ${model?.name || modelId}: "${options.prompt.substring(0, 80)}..."`);

  let result: any;

  if (modelId === 'fal-ai/seedance/video') {
    // Seed Dance 2.0 uses slightly different parameters
    result = await fal.subscribe(modelId, {
      input: {
        prompt: options.prompt,
        image_url: options.startFrameImageUrl,
        negative_prompt: options.negativePrompt || 'phone in hand, holding phone, blurry, out of focus, motion blur, low quality, deformed',
        duration: options.durationSeconds === 10 ? '10' : '5',
        aspect_ratio: options.aspectRatio || '16:9',
      },
    });
  } else if (modelId === 'fal-ai/veo3.1/image-to-video' || modelId === 'fal-ai/veo3.1/fast/image-to-video') {
    // Veo 3.1 — supports native audio + 8s clips
    result = await fal.subscribe(modelId, {
      input: {
        prompt: options.prompt,
        image_url: options.startFrameImageUrl,
        aspect_ratio: (options.aspectRatio || '16:9') as any,
        duration: '8s',
        generate_audio: true,
        resolution: '1080p',
      } as any,
    });
  } else if (modelId === 'fal-ai/sora-2/image-to-video') {
    // OpenAI Sora 2 — cinematic, no negative prompt
    result = await fal.subscribe(modelId, {
      input: {
        prompt: options.prompt,
        image_url: options.startFrameImageUrl,
        aspect_ratio: (options.aspectRatio || '16:9') as any,
        duration: (options.durationSeconds === 10 ? '10s' : '5s') as any,
      } as any,
    });
  } else if (modelId === 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video') {
    // Kling 2.5 Turbo Pro — same shape as 2.1 Master but newer/faster
    result = await fal.subscribe(modelId, {
      input: {
        prompt: options.prompt,
        image_url: options.startFrameImageUrl,
        negative_prompt: options.negativePrompt || 'phone in hand, holding phone, blurry, out of focus, motion blur, low quality, deformed',
        duration: options.durationSeconds === 10 ? '10' : '5',
        cfg_scale: Math.min(options.cfgScale || 0.7, 1),
      },
    });
  } else {
    result = await fal.subscribe(modelId, {
      input: {
        prompt: options.prompt,
        image_url: options.startFrameImageUrl,
        negative_prompt: options.negativePrompt || 'phone in hand, holding phone, blurry, out of focus, motion blur, low quality, deformed',
        duration: options.durationSeconds === 10 ? '10' : '5',
        cfg_scale: Math.min(options.cfgScale || 0.7, 1),
      },
    });
  }

  // Veo / Sora return video at .video.url, but some shapes return .video as string
  const videoUrl =
    (result.data as any)?.video?.url ||
    (typeof (result.data as any)?.video === 'string' ? (result.data as any).video : undefined);
  if (!videoUrl) throw new Error(`${model?.name || modelId} returned no video URL`);

  logger.info(`[fal-ai] Video generated successfully with ${model?.name || modelId}`);

  // Log cost for tracking
  logFalAiUsage({ model: modelId, feature: 'video_gen' }).catch(() => {});

  return {
    url: videoUrl,
    modelUsed: modelId,
  };
}

// ── Image Upscaling ─────────────────────────────────────────────────────────

export interface UpscaleOptions {
  imageUrl: string;
  scale?: number;        // 2x or 4x
  creativity?: number;   // 0-1, higher = more creative enhancement
}

export async function upscaleImage(options: UpscaleOptions): Promise<GeneratedImage> {
  ensureFalConfigured();

  const modelId = 'fal-ai/creative-upscaler';
  logger.info(`[fal-ai] Upscaling image with creative upscaler`);

  const result = await fal.subscribe(modelId, {
    input: {
      image_url: options.imageUrl,
      scale: options.scale || 2,
      creativity: options.creativity || 0.3,
    },
  });

  const imageUrl = (result.data as any)?.image?.url;
  if (!imageUrl) throw new Error('Upscaler returned no image URL');

  logFalAiUsage({ model: modelId, feature: 'upscale' }).catch(() => {});

  return {
    url: imageUrl,
    modelUsed: modelId,
  };
}

// ── Background Removal ──────────────────────────────────────────────────────

export async function removeBackground(imageUrl: string): Promise<GeneratedImage> {
  ensureFalConfigured();

  const modelId = 'fal-ai/bria/background/remove';
  logger.info(`[fal-ai] Removing background from image`);

  const result = await fal.subscribe(modelId, {
    input: {
      image_url: imageUrl,
    },
  });

  const outputUrl = (result.data as any)?.image?.url;
  if (!outputUrl) throw new Error('Background removal returned no image URL');

  logFalAiUsage({ model: modelId, feature: 'bg_removal' }).catch(() => {});

  return {
    url: outputUrl,
    modelUsed: modelId,
  };
}

// ── Supabase Upload Utility ─────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function ensureBucket(bucket: string) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: bucket, name: bucket, public: true }),
    });
  } catch { /* bucket likely exists */ }
}

export async function uploadGeneratedAsset(
  sourceUrl: string,
  bucket: string,
  prefix: string,
  contentType: string = 'image/jpeg',
): Promise<string> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    logger.warn(`[fal-ai] No Supabase configured, returning source URL`);
    return sourceUrl;
  }

  try {
    await ensureBucket(bucket);

    const resp = await fetch(sourceUrl);
    if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
    const buf = Buffer.from(await resp.arrayBuffer());

    const ext = contentType.includes('png') ? 'png' : contentType.includes('mp4') ? 'mp4' : 'jpg';
    const filename = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${filename}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body: new Uint8Array(buf),
    });

    if (uploadRes.ok) {
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${filename}`;
      logger.info(`[fal-ai] Uploaded to Supabase: ${publicUrl}`);
      return publicUrl;
    }
    logger.warn(`[fal-ai] Supabase upload failed (${uploadRes.status}), returning source URL`);
  } catch (err: any) {
    logger.warn(`[fal-ai] Supabase upload error: ${err.message}, returning source URL`);
  }

  return sourceUrl;
}

// ── Model Catalog API ───────────────────────────────────────────────────────

export function getModelCatalog() {
  return {
    imageModels: Object.values(IMAGE_MODELS),
    videoModels: Object.values(VIDEO_MODELS),
  };
}

export function getRecommendedModels(useCase: string): ModelInfo[] {
  const all = [...Object.values(IMAGE_MODELS), ...Object.values(VIDEO_MODELS)];
  return all.filter(m => m.bestFor.includes(useCase));
}
