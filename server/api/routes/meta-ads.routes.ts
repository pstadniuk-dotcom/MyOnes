/**
 * Meta Ads Routes
 * All endpoints prefixed with /api/admin/meta-ads/
 */

import { Router } from 'express';
import { metaAdsController } from '../controller/meta-ads.controller';
import { requireAdmin } from '../middleware/middleware';
import { generateImage, uploadGeneratedAsset, type ImageModelId } from '../../utils/falAiService';
import { logger } from '../../infra/logging/logger';

const router = Router();

// Ad copy generation from image
router.post('/generate-copy', requireAdmin, (req, res) => metaAdsController.generateCopy(req, res));

// AI creative image generation
router.post('/generate-creative', requireAdmin, async (req, res) => {
  try {
    const { prompt, modelId, aspectRatio } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'prompt is required' });
    }

    const selectedModel = modelId || 'fal-ai/flux-pro/v1.1';

    const fullPrompt = `Professional advertising creative for a health supplement brand. ${prompt}. Clean, modern design, high production value, ad-ready composition, premium feel.`;

    const result = await generateImage({
      modelId: selectedModel as ImageModelId,
      prompt: fullPrompt,
      negativePrompt: 'text, words, letters, watermark, logo, blurry, low quality, amateur, pixelated',
      imageSize: aspectRatio === '9:16' ? 'portrait_9_16' : aspectRatio === '1:1' ? 'square' : 'landscape_16_9',
      aspectRatio: aspectRatio || '1:1',
    });

    // Upload to Supabase for permanent hosting
    const permanentUrl = await uploadGeneratedAsset(result.url, 'ad-creatives', 'meta-ad', 'image/jpeg');

    return res.json({
      success: true,
      imageUrl: permanentUrl,
      modelUsed: result.modelUsed,
    });
  } catch (err: any) {
    logger.error('[meta-ads] generate-creative error', { error: err.message });
    return res.status(500).json({ error: err.message || 'Failed to generate creative' });
  }
});

// Draft management
router.get('/drafts', requireAdmin, (req, res) => metaAdsController.listDrafts(req, res));
router.get('/drafts/:id', requireAdmin, (req, res) => metaAdsController.getDraft(req, res));
router.patch('/drafts/:id', requireAdmin, (req, res) => metaAdsController.updateDraft(req, res));
router.delete('/drafts/:id', requireAdmin, (req, res) => metaAdsController.deleteDraft(req, res));

// Publishing
router.post('/publish', requireAdmin, (req, res) => metaAdsController.publish(req, res));

// Meta connection
router.get('/connection', requireAdmin, (req, res) => metaAdsController.checkConnection(req, res));
router.get('/campaigns', requireAdmin, (req, res) => metaAdsController.listCampaigns(req, res));

export default router;
