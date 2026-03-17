import { Request, Response } from 'express';
import { logger } from '../../infra/logging/logger';
import {
  generateAdCopy,
  verifyMetaConnection,
  uploadImageToMeta,
  publishCampaign,
  listMetaCampaigns,
  type AdCopyVariant,
  type MetaCampaignConfig,
} from '../../modules/meta-ads/meta-ads.service';

// In-memory store for drafts (replace with DB table if persistence needed)
const adDrafts = new Map<string, {
  id: string;
  imageBase64: string;
  mimeType: string;
  variants: AdCopyVariant[];
  selectedVariant: number;
  status: 'draft' | 'ready' | 'published' | 'error';
  metaResult?: { campaignId: string; adSetId: string; adCreativeId: string; adId: string };
  errorMessage?: string;
  createdAt: Date;
}>();

let draftCounter = 0;

export class MetaAdsController {
  /**
   * POST /admin/meta-ads/generate-copy
   * Upload a creative image (base64) and get AI-generated ad copy variants.
   */
  async generateCopy(req: Request, res: Response) {
    try {
      const { imageBase64, mimeType, brandContext } = req.body;
      if (!imageBase64 || !mimeType) {
        return res.status(400).json({ error: 'imageBase64 and mimeType are required' });
      }

      // Validate mimeType
      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedMimes.includes(mimeType)) {
        return res.status(400).json({ error: 'Invalid image type. Allowed: JPEG, PNG, WebP, GIF' });
      }

      // Limit image size (10MB base64 ≈ ~7.5MB file)
      if (imageBase64.length > 10 * 1024 * 1024) {
        return res.status(400).json({ error: 'Image too large. Maximum 10MB.' });
      }

      const variants = await generateAdCopy(imageBase64, mimeType, brandContext);

      // Save as draft
      draftCounter++;
      const draftId = `draft_${Date.now()}_${draftCounter}`;
      adDrafts.set(draftId, {
        id: draftId,
        imageBase64,
        mimeType,
        variants,
        selectedVariant: 0,
        status: 'draft',
        createdAt: new Date(),
      });

      res.json({ draftId, variants });
    } catch (error: any) {
      logger.error('[meta-ads] Generate copy failed', { error: error.message });
      res.status(500).json({ error: error.message || 'Failed to generate ad copy' });
    }
  }

  /**
   * GET /admin/meta-ads/drafts
   * List all ad drafts.
   */
  async listDrafts(_req: Request, res: Response) {
    try {
      const drafts = Array.from(adDrafts.values())
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map(({ imageBase64: _img, ...rest }) => rest); // Exclude base64 from listing

      res.json(drafts);
    } catch (error: any) {
      logger.error('[meta-ads] List drafts failed', { error: error.message });
      res.status(500).json({ error: 'Failed to list drafts' });
    }
  }

  /**
   * GET /admin/meta-ads/drafts/:id
   * Get a specific draft with full data.
   */
  async getDraft(req: Request, res: Response) {
    try {
      const draft = adDrafts.get(req.params.id);
      if (!draft) return res.status(404).json({ error: 'Draft not found' });

      // Return without base64 for bandwidth
      const { imageBase64: _img, ...rest } = draft;
      res.json(rest);
    } catch (error: any) {
      logger.error('[meta-ads] Get draft failed', { error: error.message });
      res.status(500).json({ error: 'Failed to get draft' });
    }
  }

  /**
   * PATCH /admin/meta-ads/drafts/:id
   * Update draft — edit copy variants or select variant.
   */
  async updateDraft(req: Request, res: Response) {
    try {
      const draft = adDrafts.get(req.params.id);
      if (!draft) return res.status(404).json({ error: 'Draft not found' });

      const { variants, selectedVariant } = req.body;

      if (variants && Array.isArray(variants)) {
        draft.variants = variants;
      }
      if (typeof selectedVariant === 'number' && selectedVariant >= 0 && selectedVariant < draft.variants.length) {
        draft.selectedVariant = selectedVariant;
      }
      draft.status = 'ready';

      res.json({ success: true });
    } catch (error: any) {
      logger.error('[meta-ads] Update draft failed', { error: error.message });
      res.status(500).json({ error: 'Failed to update draft' });
    }
  }

  /**
   * DELETE /admin/meta-ads/drafts/:id
   * Delete a draft.
   */
  async deleteDraft(req: Request, res: Response) {
    try {
      const deleted = adDrafts.delete(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'Draft not found' });
      res.json({ success: true });
    } catch (error: any) {
      logger.error('[meta-ads] Delete draft failed', { error: error.message });
      res.status(500).json({ error: 'Failed to delete draft' });
    }
  }

  /**
   * POST /admin/meta-ads/publish
   * Publish a draft to Meta — creates campaign, ad set, creative, and ad.
   */
  async publish(req: Request, res: Response) {
    try {
      const { draftId, adAccountId, campaignConfig } = req.body as {
        draftId: string;
        adAccountId: string;
        campaignConfig: MetaCampaignConfig;
      };

      if (!draftId || !adAccountId || !campaignConfig) {
        return res.status(400).json({ error: 'draftId, adAccountId, and campaignConfig are required' });
      }

      const draft = adDrafts.get(draftId);
      if (!draft) return res.status(404).json({ error: 'Draft not found' });

      // Validate required campaign fields
      if (!campaignConfig.name || !campaignConfig.targetUrl || !campaignConfig.pageId) {
        return res.status(400).json({ error: 'Campaign name, target URL, and page ID are required' });
      }

      const selectedCopy = draft.variants[draft.selectedVariant];
      if (!selectedCopy) {
        return res.status(400).json({ error: 'No ad copy variant selected' });
      }

      // Step 1: Upload image to Meta
      logger.info('[meta-ads] Uploading image to Meta', { draftId, adAccountId });
      const imageHash = await uploadImageToMeta(adAccountId, draft.imageBase64);

      // Step 2: Create campaign with ad
      const result = await publishCampaign(adAccountId, campaignConfig, imageHash, selectedCopy);

      // Update draft status
      draft.status = 'published';
      draft.metaResult = result;

      logger.info('[meta-ads] Campaign published successfully', {
        draftId,
        campaignId: result.campaignId,
      });

      res.json({
        success: true,
        ...result,
        message: 'Campaign created in PAUSED state. Review and activate in Meta Ads Manager.',
      });
    } catch (error: any) {
      logger.error('[meta-ads] Publish failed', { error: error.message });

      // Update draft with error
      const draft = adDrafts.get(req.body?.draftId);
      if (draft) {
        draft.status = 'error';
        draft.errorMessage = error.message;
      }

      res.status(500).json({ error: error.message || 'Failed to publish campaign' });
    }
  }

  /**
   * GET /admin/meta-ads/connection
   * Check Meta API connection and list ad accounts.
   */
  async checkConnection(_req: Request, res: Response) {
    try {
      const connectionInfo = await verifyMetaConnection();
      res.json(connectionInfo);
    } catch (error: any) {
      logger.error('[meta-ads] Connection check failed', { error: error.message });
      res.status(500).json({ error: 'Failed to check Meta connection' });
    }
  }

  /**
   * GET /admin/meta-ads/campaigns
   * List campaigns from Meta for the given ad account.
   */
  async listCampaigns(req: Request, res: Response) {
    try {
      const adAccountId = req.query.adAccountId as string;
      if (!adAccountId) {
        return res.status(400).json({ error: 'adAccountId query param is required' });
      }
      const campaigns = await listMetaCampaigns(adAccountId);
      res.json(campaigns);
    } catch (error: any) {
      logger.error('[meta-ads] List campaigns failed', { error: error.message });
      res.status(500).json({ error: 'Failed to list campaigns' });
    }
  }
}

export const metaAdsController = new MetaAdsController();
