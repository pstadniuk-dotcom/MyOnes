/**
 * Brand Studio Routes
 * AI-powered brand asset generation, upscaling, and background removal.
 * Leverages the centralized fal.ai service for model selection.
 */
import { Router } from 'express';
import { requireAdmin } from '../middleware/middleware';
import {
  generateImage,
  upscaleImage,
  removeBackground,
  uploadGeneratedAsset,
  getModelCatalog,
  type ImageModelId,
} from '../../utils/falAiService';
import { getBrandPromptPrefix } from '../../utils/brandAssetService';
import { logger } from '../../infra/logging/logger';

const router = Router();

// ── Generate Image ──────────────────────────────────────────────────────────

router.post('/generate', requireAdmin, async (req, res) => {
  try {
    const { prompt, modelId, imageSize } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'prompt is required' });
    }

    // Inject brand style if available
    let brandPrefix = '';
    try {
      brandPrefix = await getBrandPromptPrefix();
    } catch { /* no brand profile yet */ }

    const fullPrompt = `${brandPrefix}${prompt}`;
    const selectedModel = modelId || 'fal-ai/flux-pro/v1.1';

    const result = await generateImage({
      modelId: selectedModel as ImageModelId,
      prompt: fullPrompt,
      negativePrompt: 'blurry, low quality, deformed, pixelated, watermark, text overlay, amateur',
      imageSize: imageSize || 'landscape_16_9',
      aspectRatio: imageSize === 'square' ? '1:1'
        : imageSize === 'portrait_9_16' ? '9:16'
        : imageSize === 'landscape_4_3' ? '4:3'
        : '16:9',
    });

    // Upload to permanent storage
    const permanentUrl = await uploadGeneratedAsset(
      result.url,
      'brand-assets',
      'brand-gen',
      'image/jpeg',
    );

    return res.json({
      success: true,
      imageUrl: permanentUrl,
      modelUsed: result.modelUsed,
    });
  } catch (err: any) {
    logger.error('[brand-studio] generate error', { error: err.message });
    return res.status(500).json({ error: err.message || 'Failed to generate image' });
  }
});

// ── Save Generated Asset to Brand Library ───────────────────────────────────

router.post('/save-generated', requireAdmin, async (req, res) => {
  try {
    const { imageUrl, category, description } = req.body;
    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({ error: 'imageUrl is required' });
    }

    // Download the image and re-upload as a brand asset
    const resp = await fetch(imageUrl);
    if (!resp.ok) throw new Error(`Failed to download image: ${resp.status}`);
    const buf = Buffer.from(await resp.arrayBuffer());

    // Use the brand asset service to properly register the asset
    const { uploadBrandAsset } = await import('../../utils/brandAssetService');
    const asset = await uploadBrandAsset(
      buf,
      `generated-${Date.now()}.jpg`,
      'image/jpeg',
      category || 'other',
      description,
    );

    return res.json({ success: true, asset });
  } catch (err: any) {
    logger.error('[brand-studio] save-generated error', { error: err.message });
    return res.status(500).json({ error: err.message || 'Failed to save asset' });
  }
});

// ── Upscale Image ───────────────────────────────────────────────────────────

router.post('/upscale', requireAdmin, async (req, res) => {
  try {
    const { imageUrl, scale } = req.body;
    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({ error: 'imageUrl is required' });
    }

    const result = await upscaleImage({
      imageUrl,
      scale: scale || 2,
      creativity: 0.3,
    });

    const permanentUrl = await uploadGeneratedAsset(
      result.url,
      'brand-assets',
      'upscaled',
      'image/jpeg',
    );

    return res.json({ success: true, imageUrl: permanentUrl, modelUsed: result.modelUsed });
  } catch (err: any) {
    logger.error('[brand-studio] upscale error', { error: err.message });
    return res.status(500).json({ error: err.message || 'Failed to upscale image' });
  }
});

// ── Remove Background ───────────────────────────────────────────────────────

router.post('/remove-background', requireAdmin, async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({ error: 'imageUrl is required' });
    }

    const result = await removeBackground(imageUrl);

    const permanentUrl = await uploadGeneratedAsset(
      result.url,
      'brand-assets',
      'nobg',
      'image/png',
    );

    return res.json({ success: true, imageUrl: permanentUrl, modelUsed: result.modelUsed });
  } catch (err: any) {
    logger.error('[brand-studio] remove-background error', { error: err.message });
    return res.status(500).json({ error: err.message || 'Failed to remove background' });
  }
});

// ── Model Catalog ───────────────────────────────────────────────────────────

router.get('/models', requireAdmin, async (_req, res) => {
  try {
    const catalog = getModelCatalog();
    return res.json({ success: true, ...catalog });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
