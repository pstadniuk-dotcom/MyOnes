/**
 * UGC Ad Studio Controller
 * Handles all CRUD + AI generation endpoints for the UGC pipeline.
 */

import { Request, Response } from 'express';
import { db } from '../../infra/db/db';
import { eq, desc, and, sql, ilike, or, isNull } from 'drizzle-orm';
import {
  ugcCampaigns, ugcResearch, ugcHooks, ugcScripts,
  ugcCharacters, ugcGeneratedImages, ugcVideoScenes, ugcBrandAssets,
} from '@shared/schema';
import {
  generateProductResearch,
  generateMarketResearch,
  generateViralHooks,
  generateScripts,
  generateCharacterImage,
  generateVideoPrompts,
  generateKlingVideo,
  getOnesProductContext,
  getOnesScriptAngles,
  uploadToSupabase,
  suggestCharacters,
} from '../../utils/ugcService';
import { generateVoiceoverAndMerge, isValidVoice, getAvailableVoices, fetchElevenLabsVoices } from '../../utils/ugcAudioService';
import {
  assembleVideo,
  extractLastFrame,
  uploadFrame,
  estimateTTSDuration,
  type SceneInput,
} from '../../utils/ugcVideoAssemblyService';
import { logger } from '../../infra/logging/logger';

export class UgcController {

  // ── Campaigns ────────────────────────────────────────────────────────────

  async listCampaigns(req: Request, res: Response) {
    try {
      const { status, search } = req.query;
      let query = db.select().from(ugcCampaigns).orderBy(desc(ugcCampaigns.createdAt));

      const conditions: any[] = [];
      // Hide archived (soft-deleted) campaigns unless explicitly requested
      if (status === 'archived') {
        conditions.push(eq(ugcCampaigns.status, 'archived'));
      } else if (status && status !== 'all') {
        conditions.push(eq(ugcCampaigns.status, status as string));
      } else {
        conditions.push(sql`${ugcCampaigns.status} != 'archived'`);
      }
      if (search) conditions.push(ilike(ugcCampaigns.name, `%${search}%`));

      if (conditions.length) {
        query = query.where(and(...conditions)) as any;
      }
      const campaigns = await query;

      // Attach counts for each campaign
      const enriched = await Promise.all(campaigns.map(async (c: any) => {
        const [scripts, chars, images, videos, hooks] = await Promise.all([
          db.select({ count: sql<number>`count(*)` }).from(ugcScripts).where(eq(ugcScripts.campaignId, c.id)),
          db.select({ count: sql<number>`count(*)` }).from(ugcCharacters).where(eq(ugcCharacters.campaignId, c.id)),
          db.select({ count: sql<number>`count(*)` }).from(ugcGeneratedImages).where(eq(ugcGeneratedImages.campaignId, c.id)),
          db.select({ count: sql<number>`count(*)` }).from(ugcVideoScenes).where(eq(ugcVideoScenes.campaignId, c.id)),
          db.select({ count: sql<number>`count(*)` }).from(ugcHooks).where(eq(ugcHooks.campaignId, c.id)),
        ]);
        return {
          ...c,
          _counts: {
            scripts: Number(scripts[0]?.count ?? 0),
            characters: Number(chars[0]?.count ?? 0),
            images: Number(images[0]?.count ?? 0),
            videos: Number(videos[0]?.count ?? 0),
            hooks: Number(hooks[0]?.count ?? 0),
          },
        };
      }));

      res.json(enriched);
    } catch (error) {
      logger.error('Error listing UGC campaigns', { error });
      res.status(500).json({ error: 'Failed to list campaigns' });
    }
  }

  async getCampaign(req: Request, res: Response) {
    try {
      const [campaign] = await db.select().from(ugcCampaigns).where(eq(ugcCampaigns.id, req.params.id));
      if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

      // Fetch all related data
      const [research, hooks, scripts, characters, images, videos, assets] = await Promise.all([
        db.select().from(ugcResearch).where(eq(ugcResearch.campaignId, campaign.id)).orderBy(desc(ugcResearch.createdAt)),
        db.select().from(ugcHooks).where(eq(ugcHooks.campaignId, campaign.id)).orderBy(desc(ugcHooks.createdAt)),
        db.select().from(ugcScripts).where(eq(ugcScripts.campaignId, campaign.id)).orderBy(desc(ugcScripts.createdAt)),
        db.select().from(ugcCharacters).where(eq(ugcCharacters.campaignId, campaign.id)).orderBy(desc(ugcCharacters.createdAt)),
        db.select().from(ugcGeneratedImages).where(eq(ugcGeneratedImages.campaignId, campaign.id)).orderBy(desc(ugcGeneratedImages.createdAt)),
        db.select().from(ugcVideoScenes).where(eq(ugcVideoScenes.campaignId, campaign.id)).orderBy(ugcVideoScenes.batchNumber, ugcVideoScenes.sceneNumber),
        db.select().from(ugcBrandAssets).where(or(eq(ugcBrandAssets.campaignId, campaign.id), isNull(ugcBrandAssets.campaignId))).orderBy(desc(ugcBrandAssets.createdAt)),
      ]);

      // Attach images to characters
      const enrichedChars = await Promise.all(characters.map(async (c: any) => {
        const charImages = images.filter((img: any) => img.characterId === c.id);
        return { ...c, images: charImages };
      }));

      res.json({
        ...campaign,
        research,
        hooks,
        scripts,
        characters: enrichedChars,
        images,
        videos,
        assets,
        _counts: {
          research: research.length,
          hooks: hooks.length,
          scripts: scripts.length,
          characters: characters.length,
          images: images.length,
          videos: videos.length,
        },
      });
    } catch (error) {
      logger.error('Error getting UGC campaign', { error });
      res.status(500).json({ error: 'Failed to get campaign' });
    }
  }

  async createCampaign(req: Request, res: Response) {
    try {
      const { name, adGoal, notes, targetAudience } = req.body;
      if (!name) return res.status(400).json({ error: 'Campaign name is required' });

      // Auto-fill ONES product data — no manual entry needed
      const [campaign] = await db.insert(ugcCampaigns).values({
        name,
        productName: 'ONES Custom Supplement',
        productDescription: 'AI-personalized supplement formula — one capsule with all your ingredients blended together, based on blood work, health profile, and wearable data.',
        productBenefits: [
          'Replaces 10-15 supplement bottles with one custom formula',
          'AI analyzes blood work for personalized ingredient selection',
          'Formula evolves with each refill as health data updates',
          'Custom manufactured per person — not mass-produced',
          'Connects with Fitbit, Oura, Whoop for biometric optimization',
        ],
        targetAudience: targetAudience || 'Health-conscious professionals 28-45, biohackers, quantified-self enthusiasts, $85K-$200K+ income',
        adGoal: adGoal || 'awareness',
        notes,
        createdBy: (req as any).userId,
        status: 'research',
      }).returning();

      res.json(campaign);
    } catch (error) {
      logger.error('Error creating UGC campaign', { error });
      res.status(500).json({ error: 'Failed to create campaign' });
    }
  }

  async updateCampaign(req: Request, res: Response) {
    try {
      const [updated] = await db.update(ugcCampaigns)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(ugcCampaigns.id, req.params.id))
        .returning();
      if (!updated) return res.status(404).json({ error: 'Campaign not found' });
      res.json(updated);
    } catch (error) {
      logger.error('Error updating UGC campaign', { error });
      res.status(500).json({ error: 'Failed to update campaign' });
    }
  }

  async deleteCampaign(req: Request, res: Response) {
    try {
      // Soft-delete: archive instead of destroying. Data can be recovered.
      const [updated] = await db.update(ugcCampaigns)
        .set({ status: 'archived', updatedAt: new Date() })
        .where(eq(ugcCampaigns.id, req.params.id))
        .returning();
      if (!updated) return res.status(404).json({ error: 'Campaign not found' });

      logger.info(`[ugc] Campaign archived (soft-delete): ${req.params.id}`);
      res.json({ success: true, archived: true });
    } catch (error) {
      logger.error('Error archiving UGC campaign', { error });
      res.status(500).json({ error: 'Failed to delete campaign' });
    }
  }

  // ── Research ─────────────────────────────────────────────────────────────

  async generateResearch(req: Request, res: Response) {
    try {
      const { campaignId, researchType } = req.body;
      if (!campaignId || !researchType) return res.status(400).json({ error: 'campaignId and researchType required' });

      const [campaign] = await db.select().from(ugcCampaigns).where(eq(ugcCampaigns.id, campaignId));
      if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

      let title: string;
      if (researchType === 'product_analysis') {
        title = `Product Analysis: ONES Custom Supplement`;
      } else if (researchType === 'market_research') {
        title = `Market Research: ONES Custom Supplement`;
      } else {
        return res.status(400).json({ error: 'Invalid research type' });
      }

      // Insert placeholder immediately so the UI can show "generating" state
      const [placeholder] = await db.insert(ugcResearch).values({
        campaignId,
        researchType,
        title,
        status: 'generating',
        content: {},
      }).returning();

      // Return immediately — client sees the generating card
      res.json(placeholder);

      // Process AI in background — update the row when done
      (async () => {
        try {
          let result: any;
          if (researchType === 'product_analysis') {
            result = await generateProductResearch({
              adGoal: campaign.adGoal ?? undefined,
              productUrls: campaign.productUrls ?? undefined,
            });
          } else {
            result = await generateMarketResearch({
              adGoal: campaign.adGoal ?? undefined,
              targetAudience: campaign.targetAudience ?? undefined,
            });
          }

          await db.update(ugcResearch)
            .set({ content: result, status: 'complete' })
            .where(eq(ugcResearch.id, placeholder.id));

          logger.info(`[ugc] Research ${placeholder.id} complete (${researchType})`);
        } catch (err: any) {
          logger.error(`[ugc] Research ${placeholder.id} failed`, { error: err?.message || err });
          await db.update(ugcResearch)
            .set({ status: 'failed', errorMessage: err?.message || 'Unknown error' })
            .where(eq(ugcResearch.id, placeholder.id));
        }
      })();
    } catch (error) {
      logger.error('Error generating UGC research', { error });
      res.status(500).json({ error: 'Failed to generate research' });
    }
  }

  // ── Hooks ────────────────────────────────────────────────────────────────

  async listHooks(req: Request, res: Response) {
    try {
      const { campaignId, style, favoriteOnly, search } = req.query;
      const conditions: any[] = [];

      if (campaignId) {
        conditions.push(or(eq(ugcHooks.campaignId, campaignId as string), isNull(ugcHooks.campaignId)));
      }
      if (style && style !== 'all') conditions.push(eq(ugcHooks.style, style as string));
      if (favoriteOnly === 'true') conditions.push(eq(ugcHooks.isFavorite, true));
      if (search) conditions.push(ilike(ugcHooks.hookText, `%${search}%`));
      conditions.push(eq(ugcHooks.isArchived, false));

      const hooks = conditions.length
        ? await db.select().from(ugcHooks).where(and(...conditions)).orderBy(desc(ugcHooks.createdAt))
        : await db.select().from(ugcHooks).where(eq(ugcHooks.isArchived, false)).orderBy(desc(ugcHooks.createdAt));

      res.json(hooks);
    } catch (error) {
      logger.error('Error listing hooks', { error });
      res.status(500).json({ error: 'Failed to list hooks' });
    }
  }

  async createHook(req: Request, res: Response) {
    try {
      const [hook] = await db.insert(ugcHooks).values(req.body).returning();
      res.json(hook);
    } catch (error) {
      logger.error('Error creating hook', { error });
      res.status(500).json({ error: 'Failed to create hook' });
    }
  }

  async updateHook(req: Request, res: Response) {
    try {
      const [updated] = await db.update(ugcHooks).set(req.body).where(eq(ugcHooks.id, req.params.id)).returning();
      if (!updated) return res.status(404).json({ error: 'Hook not found' });
      res.json(updated);
    } catch (error) {
      logger.error('Error updating hook', { error });
      res.status(500).json({ error: 'Failed to update hook' });
    }
  }

  async deleteHook(req: Request, res: Response) {
    try {
      await db.delete(ugcHooks).where(eq(ugcHooks.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      logger.error('Error deleting hook', { error });
      res.status(500).json({ error: 'Failed to delete hook' });
    }
  }

  async scanViralHooks(req: Request, res: Response) {
    try {
      const { campaignId, productCategory, targetPlatform, count } = req.body;

      // Get campaign for ad goal context
      let adGoal: string | undefined;
      if (campaignId) {
        const [campaign] = await db.select().from(ugcCampaigns).where(eq(ugcCampaigns.id, campaignId));
        adGoal = campaign?.adGoal ?? undefined;
      }

      // Insert a placeholder hook so the UI immediately shows "generating" state
      const [placeholder] = await db.insert(ugcHooks).values({
        campaignId: campaignId || null,
        hookText: 'Generating hooks...',
        source: 'ai_generating',
        style: 'general',
      }).returning();

      // Return immediately
      res.json({ status: 'generating', placeholderId: placeholder.id });

      // Process AI in background
      (async () => {
        try {
          const hooks = await generateViralHooks({ productCategory, targetPlatform, count, adGoal });

          // Delete the placeholder
          await db.delete(ugcHooks).where(eq(ugcHooks.id, placeholder.id));

          // Save real hooks
          for (const h of hooks) {
            await db.insert(ugcHooks).values({
              campaignId: campaignId || null,
              hookText: h.hookText,
              source: 'ai_generated',
              style: h.style,
              speakingTone: h.speakingTone,
              structureNotes: h.exampleStructure,
              category: h.bestFor,
              tags: [h.style, h.speakingTone],
            });
          }

          logger.info(`[ugc] Hook scan complete: ${hooks.length} hooks generated`);
        } catch (err: any) {
          logger.error(`[ugc] Hook scan failed`, { error: err?.message || err });
          // Update placeholder to show failure
          await db.update(ugcHooks)
            .set({ hookText: `Hook generation failed: ${err?.message || 'Unknown error'}`, source: 'ai_failed' })
            .where(eq(ugcHooks.id, placeholder.id));
        }
      })();
    } catch (error) {
      logger.error('Error scanning viral hooks', { error });
      res.status(500).json({ error: 'Failed to scan viral hooks' });
    }
  }

  // ── Scripts ──────────────────────────────────────────────────────────────

  async listScripts(req: Request, res: Response) {
    try {
      const { campaignId, status } = req.query;
      const conditions: any[] = [];
      if (campaignId) conditions.push(eq(ugcScripts.campaignId, campaignId as string));
      if (status && status !== 'all') conditions.push(eq(ugcScripts.status, status as string));

      const scripts = conditions.length
        ? await db.select().from(ugcScripts).where(and(...conditions)).orderBy(desc(ugcScripts.createdAt))
        : await db.select().from(ugcScripts).orderBy(desc(ugcScripts.createdAt));

      res.json(scripts);
    } catch (error) {
      logger.error('Error listing scripts', { error });
      res.status(500).json({ error: 'Failed to list scripts' });
    }
  }

  async generateScript(req: Request, res: Response) {
    try {
      const { campaignId, selectedHookIds, scriptType, count, additionalDirection, angleId } = req.body;
      if (!campaignId) return res.status(400).json({ error: 'campaignId required' });

      const [campaign] = await db.select().from(ugcCampaigns).where(eq(ugcCampaigns.id, campaignId));
      if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

      const numScripts = count || 1;

      // Insert placeholder scripts immediately so the UI shows "generating" state
      const placeholders = [];
      for (let i = 0; i < numScripts; i++) {
        const [placeholder] = await db.insert(ugcScripts).values({
          campaignId,
          title: `Generating script ${i + 1}...`,
          scriptType: scriptType || 'testimonial',
          scenes: [],
          hookInspirationIds: selectedHookIds || [],
          status: 'generating',
        }).returning();
        placeholders.push(placeholder);
      }

      // Return immediately
      res.json({ status: 'generating', saved: placeholders });

      // Process AI in background
      (async () => {
        try {
          // Gather research & hooks
          const research = await db.select().from(ugcResearch).where(eq(ugcResearch.campaignId, campaignId));
          let selectedHooks: any[] = [];
          if (selectedHookIds?.length) {
            const allHooks = await db.select().from(ugcHooks).where(eq(ugcHooks.campaignId, campaignId));
            selectedHooks = allHooks.filter((h: any) => selectedHookIds.includes(h.id));
          }

          const result = await generateScripts({
            campaignId,
            research: research.length ? research.map((r: any) => r.content) : undefined,
            selectedHooks: selectedHooks.map(h => ({
              hookText: h.hookText,
              style: h.style || 'general',
              speakingTone: h.speakingTone || 'casual',
            })),
            scriptType,
            count: numScripts,
            additionalDirection,
            adGoal: campaign.adGoal ?? undefined,
            angleId,
          });

          // Update placeholder scripts with real data
          for (let i = 0; i < result.scripts.length; i++) {
            const s = result.scripts[i];
            if (placeholders[i]) {
              await db.update(ugcScripts)
                .set({
                  title: s.title,
                  scriptType: s.scriptType,
                  scenes: s.scenes,
                  totalDurationSeconds: s.totalDurationSeconds,
                  totalScenes: s.totalScenes,
                  rationale: s.rationale,
                  toneNotes: s.toneNotes,
                  status: 'draft',
                  updatedAt: new Date(),
                })
                .where(eq(ugcScripts.id, placeholders[i].id));
            }
          }

          // If AI returned fewer scripts than requested, clean up extra placeholders
          for (let i = result.scripts.length; i < placeholders.length; i++) {
            await db.delete(ugcScripts).where(eq(ugcScripts.id, placeholders[i].id));
          }

          logger.info(`[ugc] Script generation complete: ${result.scripts.length} scripts`);
        } catch (err: any) {
          logger.error(`[ugc] Script generation failed`, { error: err?.message || err });
          for (const p of placeholders) {
            await db.update(ugcScripts)
              .set({ title: `Generation failed: ${err?.message || 'Unknown error'}`, status: 'failed', updatedAt: new Date() })
              .where(eq(ugcScripts.id, p.id));
          }
        }
      })();
    } catch (error) {
      logger.error('Error generating scripts', { error });
      res.status(500).json({ error: 'Failed to generate scripts' });
    }
  }

  async updateScript(req: Request, res: Response) {
    try {
      const [updated] = await db.update(ugcScripts)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(ugcScripts.id, req.params.id))
        .returning();
      if (!updated) return res.status(404).json({ error: 'Script not found' });
      res.json(updated);
    } catch (error) {
      logger.error('Error updating script', { error });
      res.status(500).json({ error: 'Failed to update script' });
    }
  }

  async deleteScript(req: Request, res: Response) {
    try {
      await db.delete(ugcScripts).where(eq(ugcScripts.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      logger.error('Error deleting script', { error });
      res.status(500).json({ error: 'Failed to delete script' });
    }
  }

  // ── Characters ───────────────────────────────────────────────────────────

  async listCharacters(req: Request, res: Response) {
    try {
      const { campaignId } = req.query;
      const conditions: any[] = [];
      if (campaignId) {
        conditions.push(or(eq(ugcCharacters.campaignId, campaignId as string), isNull(ugcCharacters.campaignId)));
      }

      const characters = conditions.length
        ? await db.select().from(ugcCharacters).where(and(...conditions)).orderBy(desc(ugcCharacters.createdAt))
        : await db.select().from(ugcCharacters).orderBy(desc(ugcCharacters.createdAt));

      // Attach images for each character
      const enriched = await Promise.all(characters.map(async (c: any) => {
        const images = await db.select().from(ugcGeneratedImages)
          .where(eq(ugcGeneratedImages.characterId, c.id))
          .orderBy(desc(ugcGeneratedImages.createdAt));
        return { ...c, images };
      }));

      res.json(enriched);
    } catch (error) {
      logger.error('Error listing characters', { error });
      res.status(500).json({ error: 'Failed to list characters' });
    }
  }

  /**
   * AI-powered character suggestions based on campaign research, hooks, scripts, and audience.
   */
  async suggestCharacters(req: Request, res: Response) {
    try {
      const { campaignId, count } = req.body;
      if (!campaignId) return res.status(400).json({ error: 'campaignId required' });

      const [campaign] = await db.select().from(ugcCampaigns).where(eq(ugcCampaigns.id, campaignId));
      if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

      // Gather all campaign context
      const [research, hooks, scripts, characters] = await Promise.all([
        db.select().from(ugcResearch).where(eq(ugcResearch.campaignId, campaignId)),
        db.select().from(ugcHooks).where(eq(ugcHooks.campaignId, campaignId)),
        db.select().from(ugcScripts).where(eq(ugcScripts.campaignId, campaignId)),
        db.select().from(ugcCharacters).where(eq(ugcCharacters.campaignId, campaignId)),
      ]);

      const result = await suggestCharacters({
        research: research.filter((r: any) => r.status === 'complete' || !r.status).map((r: any) => r.content),
        hooks: hooks.filter((h: any) => h.source !== 'ai_generating' && h.source !== 'ai_failed').map(h => ({
          hookText: h.hookText,
          style: h.style || 'general',
          speakingTone: h.speakingTone || undefined,
        })),
        scripts: scripts.filter(s => s.status !== 'generating' && s.status !== 'failed').map(s => ({
          scriptType: s.scriptType,
          toneNotes: s.toneNotes || undefined,
          title: s.title || undefined,
        })),
        targetAudience: campaign.targetAudience ?? undefined,
        adGoal: campaign.adGoal ?? undefined,
        existingCharacters: characters.map(c => ({
          name: c.name,
          demographics: c.demographics || '',
        })),
        count: count || 3,
      });

      res.json(result);
    } catch (error: any) {
      logger.error('Error suggesting characters', { error: error?.message || error });
      res.status(500).json({ error: error?.message || 'Failed to suggest characters' });
    }
  }

  async createCharacter(req: Request, res: Response) {
    try {
      const [character] = await db.insert(ugcCharacters).values(req.body).returning();
      res.json(character);
    } catch (error) {
      logger.error('Error creating character', { error });
      res.status(500).json({ error: 'Failed to create character' });
    }
  }

  async updateCharacter(req: Request, res: Response) {
    try {
      const [updated] = await db.update(ugcCharacters)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(ugcCharacters.id, req.params.id))
        .returning();
      if (!updated) return res.status(404).json({ error: 'Character not found' });
      res.json(updated);
    } catch (error) {
      logger.error('Error updating character', { error });
      res.status(500).json({ error: 'Failed to update character' });
    }
  }

  async deleteCharacter(req: Request, res: Response) {
    try {
      await db.delete(ugcCharacters).where(eq(ugcCharacters.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      logger.error('Error deleting character', { error });
      res.status(500).json({ error: 'Failed to delete character' });
    }
  }

  // Set an approved image as the face reference for identity-consistent generation
  async setCharacterReference(req: Request, res: Response) {
    try {
      const { imageId } = req.body;
      if (!imageId) return res.status(400).json({ error: 'imageId required' });

      const [image] = await db.select().from(ugcGeneratedImages).where(eq(ugcGeneratedImages.id, imageId));
      if (!image) return res.status(404).json({ error: 'Image not found' });

      const characterId = req.params.id;
      const [character] = await db.select().from(ugcCharacters).where(eq(ugcCharacters.id, characterId));
      if (!character) return res.status(404).json({ error: 'Character not found' });

      const [updated] = await db.update(ugcCharacters)
        .set({
          referenceImageUrl: image.imageUrl,
          referenceImageId: image.id,
          updatedAt: new Date(),
        } as any)
        .where(eq(ugcCharacters.id, characterId))
        .returning();

      logger.info(`[ugc] Set reference image for character ${characterId}: ${image.id}`);
      res.json(updated);
    } catch (error) {
      logger.error('Error setting character reference', { error });
      res.status(500).json({ error: 'Failed to set character reference image' });
    }
  }

  // Clear the face reference so next generation creates a fresh identity
  async clearCharacterReference(req: Request, res: Response) {
    try {
      const [updated] = await db.update(ugcCharacters)
        .set({
          referenceImageUrl: null,
          referenceImageId: null,
          updatedAt: new Date(),
        } as any)
        .where(eq(ugcCharacters.id, req.params.id))
        .returning();
      if (!updated) return res.status(404).json({ error: 'Character not found' });
      res.json(updated);
    } catch (error) {
      logger.error('Error clearing character reference', { error });
      res.status(500).json({ error: 'Failed to clear character reference' });
    }
  }

  // ── Image Generation ─────────────────────────────────────────────────────

  async generateImage(req: Request, res: Response) {
    try {
      const { characterId, campaignId, imageType, customPromptOverride, imageModelId } = req.body;
      if (!characterId) return res.status(400).json({ error: 'characterId required' });

      const [character] = await db.select().from(ugcCharacters).where(eq(ugcCharacters.id, characterId));
      if (!character) return res.status(404).json({ error: 'Character not found' });

      // Get campaign for product info
      let productDescription: string | undefined;
      if (character.campaignId) {
        const [campaign] = await db.select().from(ugcCampaigns).where(eq(ugcCampaigns.id, character.campaignId));
        productDescription = campaign?.productDescription ?? undefined;
      }

      // Get brand asset URLs
      const brandAssets = await db.select().from(ugcBrandAssets)
        .where(or(
          character.campaignId ? eq(ugcBrandAssets.campaignId, character.campaignId) : isNull(ugcBrandAssets.campaignId),
          isNull(ugcBrandAssets.campaignId),
        ));

      const result = await generateCharacterImage({
        characterName: character.name,
        demographics: character.demographics || '',
        styleDescription: character.styleDescription || '',
        settingDescription: character.settingDescription || '',
        imageType: imageType || 'front_view',
        productDescription,
        brandAssetUrls: brandAssets.map((a: any) => a.url),
        customPromptOverride,
        referenceImageUrl: (character as any).referenceImageUrl || undefined,
        imageModelId,
      });

      const [saved] = await db.insert(ugcGeneratedImages).values({
        characterId,
        campaignId: campaignId || character.campaignId,
        imageUrl: result.imageUrl,
        promptUsed: result.promptUsed,
        modelUsed: result.modelUsed,
        imageType: imageType || 'front_view',
        status: 'pending',
      }).returning();

      res.json(saved);
    } catch (error: any) {
      logger.error('Error generating UGC image', { error: error?.message || error, stack: error?.stack });
      res.status(500).json({ error: error?.message || 'Failed to generate image' });
    }
  }

  async updateImageStatus(req: Request, res: Response) {
    try {
      const { status, revisionNotes } = req.body;
      if (!['pending', 'approved', 'rejected', 'revision_requested'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      const [updated] = await db.update(ugcGeneratedImages)
        .set({ status, revisionNotes })
        .where(eq(ugcGeneratedImages.id, req.params.id))
        .returning();
      if (!updated) return res.status(404).json({ error: 'Image not found' });
      res.json(updated);
    } catch (error) {
      logger.error('Error updating image status', { error });
      res.status(500).json({ error: 'Failed to update image status' });
    }
  }

  async regenerateImage(req: Request, res: Response) {
    try {
      // Get original image to copy settings
      const [original] = await db.select().from(ugcGeneratedImages).where(eq(ugcGeneratedImages.id, req.params.id));
      if (!original) return res.status(404).json({ error: 'Image not found' });

      const [character] = original.characterId
        ? await db.select().from(ugcCharacters).where(eq(ugcCharacters.id, original.characterId))
        : [null];

      const { customPromptOverride, imageModelId } = req.body;

      let productDescription: string | undefined;
      if (original.campaignId) {
        const [campaign] = await db.select().from(ugcCampaigns).where(eq(ugcCampaigns.id, original.campaignId));
        productDescription = campaign?.productDescription ?? undefined;
      }

      const brandAssets = await db.select().from(ugcBrandAssets).where(
        original.campaignId ? or(eq(ugcBrandAssets.campaignId, original.campaignId), isNull(ugcBrandAssets.campaignId)) : isNull(ugcBrandAssets.campaignId)
      );

      const result = await generateCharacterImage({
        characterName: character?.name || 'Character',
        demographics: character?.demographics || '',
        styleDescription: character?.styleDescription || '',
        settingDescription: character?.settingDescription || '',
        imageType: original.imageType as any || 'front_view',
        productDescription,
        brandAssetUrls: brandAssets.map((a: any) => a.url),
        customPromptOverride,
        referenceImageUrl: (character as any)?.referenceImageUrl || undefined,
        imageModelId,
      });

      const [saved] = await db.insert(ugcGeneratedImages).values({
        characterId: original.characterId,
        campaignId: original.campaignId,
        imageUrl: result.imageUrl,
        promptUsed: result.promptUsed,
        modelUsed: result.modelUsed,
        imageType: original.imageType,
        status: 'pending',
      }).returning();

      // Mark original as rejected
      await db.update(ugcGeneratedImages).set({ status: 'rejected' }).where(eq(ugcGeneratedImages.id, req.params.id));

      res.json(saved);
    } catch (error) {
      logger.error('Error regenerating image', { error });
      res.status(500).json({ error: 'Failed to regenerate image' });
    }
  }

  // ── Video Scenes ─────────────────────────────────────────────────────────

  async generateVideoPrompts(req: Request, res: Response) {
    try {
      const { campaignId, scriptId, characterId } = req.body;
      if (!campaignId || !scriptId) return res.status(400).json({ error: 'campaignId and scriptId required' });

      const [script] = await db.select().from(ugcScripts).where(eq(ugcScripts.id, scriptId));
      if (!script || !script.scenes) return res.status(404).json({ error: 'Script not found or has no scenes' });

      // Remove existing draft scenes for this campaign+script to prevent duplicates
      await db.delete(ugcVideoScenes).where(
        and(
          eq(ugcVideoScenes.campaignId, campaignId),
          eq(ugcVideoScenes.scriptId, scriptId),
          eq(ugcVideoScenes.status, 'draft'),
        )
      );

      const result = await generateVideoPrompts({
        script: { scenes: script.scenes as any },
      });

      // Save video scenes
      const saved = [];
      for (const batch of result.batches) {
        for (const scene of batch.scenes) {
          const [vs] = await db.insert(ugcVideoScenes).values({
            campaignId,
            scriptId,
            characterId: characterId || null,
            batchNumber: batch.batchNumber,
            sceneNumber: scene.sceneNumber,
            sceneType: 'dialogue',
            prompt: scene.prompt,
            negativePrompt: result.negativePrompt,
            dialogue: scene.dialogue,
            shotType: scene.shotType,
            cameraMotion: scene.cameraMotion,
            cameraMotionScale: scene.cameraMotionScale,
            durationSeconds: scene.durationSeconds,
            generationParams: { cfg_scale: Math.min(result.cfgScale || 0.5, 1), resolution: result.resolution, aspect_ratio: '9:16' },
            status: 'draft',
          }).returning();
          saved.push(vs);
        }
      }

      res.json({ prompts: result, saved });
    } catch (error) {
      logger.error('Error generating video prompts', { error });
      res.status(500).json({ error: 'Failed to generate video prompts' });
    }
  }

  async generateVideo(req: Request, res: Response) {
    try {
      const sceneId = req.params.id;
      const { videoModelId } = req.body || {};
      const [scene] = await db.select().from(ugcVideoScenes).where(eq(ugcVideoScenes.id, sceneId));
      if (!scene) return res.status(404).json({ error: 'Video scene not found' });

      // Get start frame image
      let startFrameUrl: string | undefined;
      if (scene.startFrameImageId) {
        const [img] = await db.select().from(ugcGeneratedImages).where(eq(ugcGeneratedImages.id, scene.startFrameImageId));
        startFrameUrl = img?.imageUrl;
      }

      if (!startFrameUrl && scene.characterId) {
        // Priority 1: Use the character's reference image (ensures face consistency across all video scenes)
        const [character] = await db.select().from(ugcCharacters).where(eq(ugcCharacters.id, scene.characterId));
        if ((character as any)?.referenceImageUrl) {
          startFrameUrl = (character as any).referenceImageUrl;
        }

        // Priority 2: Fall back to most recent approved image (prefer front_view, then any type)
        if (!startFrameUrl) {
          const [img] = await db.select().from(ugcGeneratedImages)
            .where(and(
              eq(ugcGeneratedImages.characterId, scene.characterId),
              eq(ugcGeneratedImages.status, 'approved'),
              eq(ugcGeneratedImages.imageType, 'front_view'),
            ))
            .orderBy(desc(ugcGeneratedImages.createdAt))
            .limit(1);
          startFrameUrl = img?.imageUrl;
        }

        // Priority 3: Any approved image (side_view, lifestyle, etc.)
        if (!startFrameUrl) {
          const [img] = await db.select().from(ugcGeneratedImages)
            .where(and(
              eq(ugcGeneratedImages.characterId, scene.characterId),
              eq(ugcGeneratedImages.status, 'approved'),
            ))
            .orderBy(desc(ugcGeneratedImages.createdAt))
            .limit(1);
          startFrameUrl = img?.imageUrl;
        }
      }

      if (!startFrameUrl) {
        return res.status(400).json({ error: 'No start frame image available. Approve a character image first.' });
      }

      // Mark as generating
      await db.update(ugcVideoScenes).set({ status: 'generating', updatedAt: new Date() }).where(eq(ugcVideoScenes.id, sceneId));

      try {
        const result = await generateKlingVideo({
          startFrameImageUrl: startFrameUrl,
          prompt: scene.prompt,
          negativePrompt: scene.negativePrompt ?? undefined,
          durationSeconds: scene.durationSeconds,
          cfgScale: (scene.generationParams as any)?.cfg_scale,
          aspectRatio: (scene.generationParams as any)?.aspect_ratio || '9:16',
          videoModelId,
        });

        const [updated] = await db.update(ugcVideoScenes)
          .set({ videoUrl: result.videoUrl, status: 'generated', updatedAt: new Date() })
          .where(eq(ugcVideoScenes.id, sceneId))
          .returning();

        res.json(updated);
      } catch (genError: any) {
        await db.update(ugcVideoScenes)
          .set({ status: 'failed', errorMessage: genError.message, updatedAt: new Date() })
          .where(eq(ugcVideoScenes.id, sceneId));
        throw genError;
      }
    } catch (error) {
      logger.error('Error generating video', { error });
      res.status(500).json({ error: 'Failed to generate video' });
    }
  }

  async updateVideoScene(req: Request, res: Response) {
    try {
      const [updated] = await db.update(ugcVideoScenes)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(ugcVideoScenes.id, req.params.id))
        .returning();
      if (!updated) return res.status(404).json({ error: 'Video scene not found' });
      res.json(updated);
    } catch (error) {
      logger.error('Error updating video scene', { error });
      res.status(500).json({ error: 'Failed to update video scene' });
    }
  }

  async deleteVideoScene(req: Request, res: Response) {
    try {
      await db.delete(ugcVideoScenes).where(eq(ugcVideoScenes.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      logger.error('Error deleting video scene', { error });
      res.status(500).json({ error: 'Failed to delete video scene' });
    }
  }

  // ── Brand Assets ─────────────────────────────────────────────────────────

  async listBrandAssets(req: Request, res: Response) {
    try {
      const { campaignId } = req.query;
      const conditions: any[] = [];
      if (campaignId) {
        conditions.push(or(eq(ugcBrandAssets.campaignId, campaignId as string), isNull(ugcBrandAssets.campaignId)));
      }
      const assets = conditions.length
        ? await db.select().from(ugcBrandAssets).where(and(...conditions)).orderBy(desc(ugcBrandAssets.createdAt))
        : await db.select().from(ugcBrandAssets).orderBy(desc(ugcBrandAssets.createdAt));
      res.json(assets);
    } catch (error) {
      logger.error('Error listing brand assets', { error });
      res.status(500).json({ error: 'Failed to list brand assets' });
    }
  }

  async createBrandAsset(req: Request, res: Response) {
    try {
      const [asset] = await db.insert(ugcBrandAssets).values(req.body).returning();
      res.json(asset);
    } catch (error) {
      logger.error('Error creating brand asset', { error });
      res.status(500).json({ error: 'Failed to create brand asset' });
    }
  }

  /** Upload a brand asset file (image) to Supabase and save the record */
  async uploadBrandAsset(req: Request, res: Response) {
    try {
      const { campaignId, assetType, name } = req.body;

      // req.files is set by express-fileupload middleware (global)
      if (!req.files || !req.files.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      const file = req.files.file as import('express-fileupload').UploadedFile;

      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedMimes.includes(file.mimetype)) {
        return res.status(400).json({ error: 'Only image files are allowed (jpg, png, webp, gif)' });
      }

      // Upload buffer to Supabase
      const { uploadBufferToSupabase: uploadBuf } = await import('../../utils/ugcService');
      const permanentUrl = await uploadBuf(file.data, 'brand-asset', file.mimetype);

      const [asset] = await db.insert(ugcBrandAssets).values({
        campaignId: campaignId || null,
        assetType: assetType || 'product_photo',
        name: name || file.name,
        url: permanentUrl,
      }).returning();

      res.json(asset);
    } catch (error) {
      logger.error('Error uploading brand asset', { error });
      res.status(500).json({ error: 'Failed to upload brand asset' });
    }
  }

  /** Get available ONES-specific script angle suggestions */
  async getScriptAngles(_req: Request, res: Response) {
    try {
      res.json(getOnesScriptAngles());
    } catch (error) {
      logger.error('Error getting script angles', { error });
      res.status(500).json({ error: 'Failed to get script angles' });
    }
  }

  /** Get baked-in ONES product context for display */
  async getProductContext(_req: Request, res: Response) {
    try {
      res.json({ context: getOnesProductContext() });
    } catch (error) {
      logger.error('Error getting product context', { error });
      res.status(500).json({ error: 'Failed to get product context' });
    }
  }

  /** List all available TTS voices (ElevenLabs + OpenAI) */
  async listVoices(_req: Request, res: Response) {
    try {
      // Get curated preset voices
      const presets = getAvailableVoices();

      // Also fetch full ElevenLabs library (includes cloned voices)
      const elevenLabsVoices = await fetchElevenLabsVoices();

      res.json({
        presets,
        elevenLabs: elevenLabsVoices,
        hasElevenLabs: !!process.env.ELEVENLABS_API_KEY,
      });
    } catch (error) {
      logger.error('Error listing voices', { error });
      res.status(500).json({ error: 'Failed to list voices' });
    }
  }

  async deleteBrandAsset(req: Request, res: Response) {
    try {
      await db.delete(ugcBrandAssets).where(eq(ugcBrandAssets.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      logger.error('Error deleting brand asset', { error });
      res.status(500).json({ error: 'Failed to delete brand asset' });
    }
  }

  // ── Full Pipeline Endpoints ──────────────────────────────────────────

  /**
   * Generate ALL draft video scenes sequentially (with rate limiting).
   * Uses end-frame chaining: extracts the last frame of scene N to use as
   * start frame for scene N+1, creating visual continuity between clips.
   */
  async generateAllVideos(req: Request, res: Response) {
    try {
      const { campaignId, characterId, videoModelId } = req.body;
      if (!campaignId) return res.status(400).json({ error: 'campaignId required' });

      const drafts = await db.select().from(ugcVideoScenes)
        .where(and(
          eq(ugcVideoScenes.campaignId, campaignId),
          eq(ugcVideoScenes.status, 'draft'),
        ))
        .orderBy(ugcVideoScenes.batchNumber, ugcVideoScenes.sceneNumber);

      if (drafts.length === 0) {
        return res.status(400).json({ error: 'No draft scenes to generate' });
      }

      // Resolve the initial start frame (reference image or approved front_view)
      let currentStartFrameUrl: string | undefined;
      const resolvedCharId = characterId || drafts[0].characterId;

      if (resolvedCharId) {
        const [character] = await db.select().from(ugcCharacters).where(eq(ugcCharacters.id, resolvedCharId));
        if ((character as any)?.referenceImageUrl) {
          currentStartFrameUrl = (character as any).referenceImageUrl;
        }
        if (!currentStartFrameUrl) {
          const [img] = await db.select().from(ugcGeneratedImages)
            .where(and(
              eq(ugcGeneratedImages.characterId, resolvedCharId),
              eq(ugcGeneratedImages.status, 'approved'),
              eq(ugcGeneratedImages.imageType, 'front_view'),
            ))
            .orderBy(desc(ugcGeneratedImages.createdAt))
            .limit(1);
          currentStartFrameUrl = img?.imageUrl;
        }

        // Fallback: any approved image type
        if (!currentStartFrameUrl) {
          const [img] = await db.select().from(ugcGeneratedImages)
            .where(and(
              eq(ugcGeneratedImages.characterId, resolvedCharId),
              eq(ugcGeneratedImages.status, 'approved'),
            ))
            .orderBy(desc(ugcGeneratedImages.createdAt))
            .limit(1);
          currentStartFrameUrl = img?.imageUrl;
        }
      }

      if (!currentStartFrameUrl) {
        return res.status(400).json({ error: 'No start frame image available. Approve a character image first.' });
      }

      // Start streaming progress via Server-Sent Events
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      const sendProgress = (data: any) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      const results: Array<{ sceneId: string; status: string; videoUrl?: string; error?: string }> = [];

      for (let i = 0; i < drafts.length; i++) {
        const scene = drafts[i];
        sendProgress({ type: 'scene_start', sceneNumber: scene.sceneNumber, current: i + 1, total: drafts.length });

        try {
          // Mark as generating
          await db.update(ugcVideoScenes)
            .set({ status: 'generating', startFrameImageId: null, updatedAt: new Date() })
            .where(eq(ugcVideoScenes.id, scene.id));

          const result = await generateKlingVideo({
            startFrameImageUrl: currentStartFrameUrl,
            prompt: scene.prompt,
            negativePrompt: scene.negativePrompt ?? undefined,
            durationSeconds: scene.durationSeconds,
            cfgScale: (scene.generationParams as any)?.cfg_scale,
            aspectRatio: (scene.generationParams as any)?.aspect_ratio || '9:16',
            videoModelId,
          });

          await db.update(ugcVideoScenes)
            .set({ videoUrl: result.videoUrl, status: 'generated', updatedAt: new Date() })
            .where(eq(ugcVideoScenes.id, scene.id));

          results.push({ sceneId: scene.id, status: 'generated', videoUrl: result.videoUrl });
          sendProgress({ type: 'scene_done', sceneNumber: scene.sceneNumber, current: i + 1, total: drafts.length, videoUrl: result.videoUrl });

          // End-frame chaining: extract last frame for next scene's start frame
          if (i < drafts.length - 1) {
            try {
              const framePath = await extractLastFrame(result.videoUrl);
              currentStartFrameUrl = await uploadFrame(framePath);
              logger.info(`[ugc] End-frame chained: scene ${scene.sceneNumber} -> scene ${drafts[i + 1].sceneNumber}`);
            } catch (frameErr: any) {
              logger.warn(`[ugc] End-frame extraction failed, keeping previous start frame: ${frameErr.message}`);
              // Continue with the same start frame if extraction fails
            }
          }
        } catch (genError: any) {
          await db.update(ugcVideoScenes)
            .set({ status: 'failed', errorMessage: genError.message, updatedAt: new Date() })
            .where(eq(ugcVideoScenes.id, scene.id));

          results.push({ sceneId: scene.id, status: 'failed', error: genError.message });
          sendProgress({ type: 'scene_failed', sceneNumber: scene.sceneNumber, current: i + 1, total: drafts.length, error: genError.message });
        }

        // Rate limiting: brief pause between scenes to avoid hitting fal.ai limits
        if (i < drafts.length - 1) {
          await new Promise(r => setTimeout(r, 2000));
        }
      }

      sendProgress({ type: 'complete', results });
      res.end();
    } catch (error) {
      logger.error('Error in generate-all-videos', { error });
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to generate videos' });
      } else {
        res.write(`data: ${JSON.stringify({ type: 'error', error: 'Pipeline failed' })}\n\n`);
        res.end();
      }
    }
  }

  /**
   * Apply lip-sync voiceover to ALL generated scenes that have dialogue but no mergedVideoUrl.
   * Processes sequentially with TTS speed auto-adjustment to fit scene duration.
   */
  async lipSyncAll(req: Request, res: Response) {
    try {
      const { campaignId, voice } = req.body;
      if (!campaignId) return res.status(400).json({ error: 'campaignId required' });

      // Find all scenes that have video + dialogue but no lip-synced version yet
      const scenes = await db.select().from(ugcVideoScenes)
        .where(and(
          eq(ugcVideoScenes.campaignId, campaignId),
          eq(ugcVideoScenes.status, 'generated'),
        ))
        .orderBy(ugcVideoScenes.batchNumber, ugcVideoScenes.sceneNumber);

      const eligible = scenes.filter(s => s.videoUrl && s.dialogue && !s.mergedVideoUrl);

      if (eligible.length === 0) {
        return res.status(400).json({ error: 'No scenes need lip-sync. Scenes must have video + dialogue and no existing lip-sync.' });
      }

      // Stream progress
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      const sendProgress = (data: any) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      const results: Array<{ sceneId: string; status: string; mergedVideoUrl?: string; error?: string }> = [];

      for (let i = 0; i < eligible.length; i++) {
        const scene = eligible[i];
        sendProgress({ type: 'lipsync_start', sceneNumber: scene.sceneNumber, current: i + 1, total: eligible.length });

        try {
          await db.update(ugcVideoScenes)
            .set({ status: 'generating', updatedAt: new Date() })
            .where(eq(ugcVideoScenes.id, scene.id));

          const result = await generateVoiceoverAndMerge({
            dialogue: scene.dialogue!,
            videoUrl: scene.videoUrl!,
            voice: (voice && isValidVoice(voice) ? voice : scene.voiceId || 'nova') as any,
            targetDurationSeconds: scene.durationSeconds,
          });

          await db.update(ugcVideoScenes)
            .set({
              audioUrl: result.audioUrl,
              mergedVideoUrl: result.mergedVideoUrl,
              voiceId: result.voice,
              status: 'generated',
              updatedAt: new Date(),
            })
            .where(eq(ugcVideoScenes.id, scene.id));

          results.push({ sceneId: scene.id, status: 'done', mergedVideoUrl: result.mergedVideoUrl });
          sendProgress({ type: 'lipsync_done', sceneNumber: scene.sceneNumber, current: i + 1, total: eligible.length });
        } catch (err: any) {
          await db.update(ugcVideoScenes)
            .set({ status: 'failed', errorMessage: err.message, updatedAt: new Date() })
            .where(eq(ugcVideoScenes.id, scene.id));

          results.push({ sceneId: scene.id, status: 'failed', error: err.message });
          sendProgress({ type: 'lipsync_failed', sceneNumber: scene.sceneNumber, current: i + 1, total: eligible.length, error: err.message });
        }

        // Brief pause between lip-sync jobs
        if (i < eligible.length - 1) {
          await new Promise(r => setTimeout(r, 1500));
        }
      }

      sendProgress({ type: 'complete', results });
      res.end();
    } catch (error) {
      logger.error('Error in lip-sync-all', { error });
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to lip-sync videos' });
      } else {
        res.write(`data: ${JSON.stringify({ type: 'error', error: 'Lip-sync pipeline failed' })}\n\n`);
        res.end();
      }
    }
  }

  /**
   * Assemble all lip-synced scene clips into a single final video.
   * Concatenates in scene order, optionally adds background music.
   */
  async assembleFullVideo(req: Request, res: Response) {
    try {
      const { campaignId, backgroundMusicUrl, musicVolume, crossfadeDuration } = req.body;
      if (!campaignId) return res.status(400).json({ error: 'campaignId required' });

      // Get all scenes for this campaign, prefer mergedVideoUrl (lip-synced) over videoUrl (silent)
      const scenes = await db.select().from(ugcVideoScenes)
        .where(eq(ugcVideoScenes.campaignId, campaignId))
        .orderBy(ugcVideoScenes.batchNumber, ugcVideoScenes.sceneNumber);

      const readyScenes = scenes.filter(s => s.mergedVideoUrl || s.videoUrl);
      if (readyScenes.length === 0) {
        return res.status(400).json({ error: 'No generated video scenes to assemble. Generate and lip-sync videos first.' });
      }

      const lipSyncedCount = readyScenes.filter(s => s.mergedVideoUrl).length;
      const silentCount = readyScenes.length - lipSyncedCount;

      if (silentCount > 0) {
        logger.warn(`[ugc] Assembling with ${silentCount} silent scene(s) — consider running lip-sync first`);
      }

      const sceneInputs: SceneInput[] = readyScenes.map(s => ({
        sceneNumber: s.sceneNumber,
        videoUrl: s.mergedVideoUrl || s.videoUrl!,
        durationSeconds: s.durationSeconds,
      }));

      logger.info(`[ugc] Assembling ${sceneInputs.length} scenes (${lipSyncedCount} lip-synced, ${silentCount} silent)`);

      const result = await assembleVideo({
        scenes: sceneInputs,
        backgroundMusicUrl,
        musicVolume: musicVolume || 0.15,
        crossfadeDuration: crossfadeDuration || 0,
      });

      // Save the assembled video URL to the campaign
      await db.update(ugcCampaigns)
        .set({
          assembledVideoUrl: result.videoUrl,
          assembledAt: new Date(),
          updatedAt: new Date(),
        } as any)
        .where(eq(ugcCampaigns.id, campaignId));

      res.json({
        videoUrl: result.videoUrl,
        totalDuration: result.totalDuration,
        sceneCount: result.sceneCount,
        lipSyncedCount,
        silentCount,
      });
    } catch (error: any) {
      logger.error('Error assembling video', { error: error?.message || error });
      res.status(500).json({ error: error?.message || 'Failed to assemble video' });
    }
  }

  /**
   * Full pipeline: Generate All Videos → Lip-Sync All → Assemble Final Video.
   * One-click endpoint that runs the entire pipeline in sequence.
   * Returns progress via Server-Sent Events.
   */
  async runFullPipeline(req: Request, res: Response) {
    try {
      const { campaignId, characterId, voice, backgroundMusicUrl, musicVolume, videoModelId } = req.body;
      if (!campaignId) return res.status(400).json({ error: 'campaignId required' });

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      const send = (data: any) => res.write(`data: ${JSON.stringify(data)}\n\n`);

      // === PHASE 1: Generate all draft videos ===
      send({ type: 'phase', phase: 'video_generation', message: 'Generating video clips...' });

      const drafts = await db.select().from(ugcVideoScenes)
        .where(and(
          eq(ugcVideoScenes.campaignId, campaignId),
          eq(ugcVideoScenes.status, 'draft'),
        ))
        .orderBy(ugcVideoScenes.batchNumber, ugcVideoScenes.sceneNumber);

      if (drafts.length > 0) {
        // Resolve start frame
        let startFrameUrl: string | undefined;
        const resolvedCharId = characterId || drafts[0].characterId;

        if (resolvedCharId) {
          const [character] = await db.select().from(ugcCharacters).where(eq(ugcCharacters.id, resolvedCharId));
          startFrameUrl = (character as any)?.referenceImageUrl;
          if (!startFrameUrl) {
            const [img] = await db.select().from(ugcGeneratedImages)
              .where(and(
                eq(ugcGeneratedImages.characterId, resolvedCharId),
                eq(ugcGeneratedImages.status, 'approved'),
                eq(ugcGeneratedImages.imageType, 'front_view'),
              ))
              .orderBy(desc(ugcGeneratedImages.createdAt))
              .limit(1);
            startFrameUrl = img?.imageUrl;
          }

          // Fallback: any approved image type
          if (!startFrameUrl) {
            const [img] = await db.select().from(ugcGeneratedImages)
              .where(and(
                eq(ugcGeneratedImages.characterId, resolvedCharId),
                eq(ugcGeneratedImages.status, 'approved'),
              ))
              .orderBy(desc(ugcGeneratedImages.createdAt))
              .limit(1);
            startFrameUrl = img?.imageUrl;
          }
        }

        if (!startFrameUrl) {
          send({ type: 'error', error: 'No start frame. Approve a character image first.' });
          return res.end();
        }

        for (let i = 0; i < drafts.length; i++) {
          const scene = drafts[i];
          send({ type: 'progress', phase: 'video_generation', current: i + 1, total: drafts.length, sceneNumber: scene.sceneNumber });

          try {
            await db.update(ugcVideoScenes).set({ status: 'generating', updatedAt: new Date() }).where(eq(ugcVideoScenes.id, scene.id));

            const result = await generateKlingVideo({
              startFrameImageUrl: startFrameUrl,
              prompt: scene.prompt,
              negativePrompt: scene.negativePrompt ?? undefined,
              durationSeconds: scene.durationSeconds,
              cfgScale: (scene.generationParams as any)?.cfg_scale,
              videoModelId,
            });

            await db.update(ugcVideoScenes).set({ videoUrl: result.videoUrl, status: 'generated', updatedAt: new Date() }).where(eq(ugcVideoScenes.id, scene.id));

            // End-frame chaining
            if (i < drafts.length - 1) {
              try {
                const framePath = await extractLastFrame(result.videoUrl);
                startFrameUrl = await uploadFrame(framePath);
              } catch { /* keep previous frame */ }
            }
          } catch (err: any) {
            await db.update(ugcVideoScenes).set({ status: 'failed', errorMessage: err.message, updatedAt: new Date() }).where(eq(ugcVideoScenes.id, scene.id));
            send({ type: 'scene_failed', sceneNumber: scene.sceneNumber, error: err.message });
          }

          if (i < drafts.length - 1) await new Promise(r => setTimeout(r, 2000));
        }
      }

      // === PHASE 2: Lip-sync all generated scenes ===
      send({ type: 'phase', phase: 'lip_sync', message: 'Applying lip-sync voiceover...' });

      const generatedScenes = await db.select().from(ugcVideoScenes)
        .where(and(
          eq(ugcVideoScenes.campaignId, campaignId),
          eq(ugcVideoScenes.status, 'generated'),
        ))
        .orderBy(ugcVideoScenes.batchNumber, ugcVideoScenes.sceneNumber);

      const needsLipSync = generatedScenes.filter(s => s.videoUrl && s.dialogue && !s.mergedVideoUrl);

      for (let i = 0; i < needsLipSync.length; i++) {
        const scene = needsLipSync[i];
        send({ type: 'progress', phase: 'lip_sync', current: i + 1, total: needsLipSync.length, sceneNumber: scene.sceneNumber });

        try {
          await db.update(ugcVideoScenes).set({ status: 'generating', updatedAt: new Date() }).where(eq(ugcVideoScenes.id, scene.id));

          const result = await generateVoiceoverAndMerge({
            dialogue: scene.dialogue!,
            videoUrl: scene.videoUrl!,
            voice: (voice && isValidVoice(voice) ? voice : scene.voiceId || 'nova') as any,
            targetDurationSeconds: scene.durationSeconds,
          });

          await db.update(ugcVideoScenes).set({
            audioUrl: result.audioUrl,
            mergedVideoUrl: result.mergedVideoUrl,
            voiceId: result.voice,
            status: 'generated',
            updatedAt: new Date(),
          }).where(eq(ugcVideoScenes.id, scene.id));
        } catch (err: any) {
          await db.update(ugcVideoScenes).set({ status: 'failed', errorMessage: err.message, updatedAt: new Date() }).where(eq(ugcVideoScenes.id, scene.id));
          send({ type: 'lipsync_failed', sceneNumber: scene.sceneNumber, error: err.message });
        }

        if (i < needsLipSync.length - 1) await new Promise(r => setTimeout(r, 1500));
      }

      // === PHASE 3: Assemble final video ===
      send({ type: 'phase', phase: 'assembly', message: 'Assembling final video...' });

      const allScenes = await db.select().from(ugcVideoScenes)
        .where(eq(ugcVideoScenes.campaignId, campaignId))
        .orderBy(ugcVideoScenes.batchNumber, ugcVideoScenes.sceneNumber);

      const readyScenes = allScenes.filter(s => s.mergedVideoUrl || s.videoUrl);

      if (readyScenes.length > 0) {
        try {
          const assemblyResult = await assembleVideo({
            scenes: readyScenes.map(s => ({
              sceneNumber: s.sceneNumber,
              videoUrl: s.mergedVideoUrl || s.videoUrl!,
              durationSeconds: s.durationSeconds,
            })),
            backgroundMusicUrl,
            musicVolume: musicVolume || 0.15,
          });

          await db.update(ugcCampaigns)
            .set({
              assembledVideoUrl: assemblyResult.videoUrl,
              assembledAt: new Date(),
              updatedAt: new Date(),
            } as any)
            .where(eq(ugcCampaigns.id, campaignId));

          send({ type: 'assembled', videoUrl: assemblyResult.videoUrl, totalDuration: assemblyResult.totalDuration, sceneCount: assemblyResult.sceneCount });
        } catch (err: any) {
          send({ type: 'assembly_failed', error: err.message });
        }
      } else {
        send({ type: 'assembly_failed', error: 'No generated scenes available for assembly' });
      }

      send({ type: 'complete' });
      res.end();
    } catch (error: any) {
      logger.error('Error in full pipeline', { error: error?.message || error });
      if (!res.headersSent) {
        res.status(500).json({ error: 'Pipeline failed' });
      } else {
        res.write(`data: ${JSON.stringify({ type: 'error', error: 'Pipeline failed' })}\n\n`);
        res.end();
      }
    }
  }

  /**
   * Preview TTS duration estimates for all scenes in a campaign.
   * Helps the user see which dialogues are too long before generating.
   */
  async previewDurations(req: Request, res: Response) {
    try {
      const { campaignId } = req.query;
      if (!campaignId) return res.status(400).json({ error: 'campaignId required' });

      const scenes = await db.select().from(ugcVideoScenes)
        .where(eq(ugcVideoScenes.campaignId, campaignId as string))
        .orderBy(ugcVideoScenes.batchNumber, ugcVideoScenes.sceneNumber);

      const previews = scenes.map(s => {
        if (!s.dialogue) {
          return {
            sceneNumber: s.sceneNumber,
            batchNumber: s.batchNumber,
            dialogue: null,
            videoDuration: s.durationSeconds,
            estimatedTTSDuration: 0,
            fits: true,
            suggestedSpeed: 1.0,
          };
        }

        const estimate = estimateTTSDuration(s.dialogue, 1.0);
        const neededSpeed = estimate > s.durationSeconds ? Math.min(estimate / s.durationSeconds, 1.5) : 1.0;
        const fits = estimateTTSDuration(s.dialogue, neededSpeed) <= s.durationSeconds + 0.5;

        return {
          sceneNumber: s.sceneNumber,
          batchNumber: s.batchNumber,
          dialogue: s.dialogue,
          videoDuration: s.durationSeconds,
          estimatedTTSDuration: Math.round(estimate * 10) / 10,
          fits,
          suggestedSpeed: Math.round(neededSpeed * 100) / 100,
          wordCount: s.dialogue.trim().split(/\s+/).length,
        };
      });

      const issues = previews.filter(p => !p.fits);

      res.json({
        scenes: previews,
        totalScenes: scenes.length,
        issueCount: issues.length,
        issues: issues.map(p => `Scene ${p.sceneNumber}: "${p.dialogue?.substring(0, 40)}..." needs ${p.estimatedTTSDuration}s but video is ${p.videoDuration}s`),
      });
    } catch (error) {
      logger.error('Error previewing durations', { error });
      res.status(500).json({ error: 'Failed to preview durations' });
    }
  }

  async generateVoiceover(req: Request, res: Response) {
    try {
      const sceneId = req.params.id;
      const { voice, speed } = req.body || {};

      const [scene] = await db.select().from(ugcVideoScenes).where(eq(ugcVideoScenes.id, sceneId));
      if (!scene) return res.status(404).json({ error: 'Video scene not found' });

      if (!scene.dialogue) {
        return res.status(400).json({ error: 'Scene has no dialogue text for voiceover' });
      }
      if (!scene.videoUrl) {
        return res.status(400).json({ error: 'Scene has no video yet. Generate video first.' });
      }

      if (voice && !isValidVoice(voice)) {
        return res.status(400).json({ error: `Invalid voice. Must be one of: alloy, echo, fable, onyx, nova, shimmer` });
      }

      // Update status to generating
      await db.update(ugcVideoScenes)
        .set({ status: 'generating', updatedAt: new Date() })
        .where(eq(ugcVideoScenes.id, sceneId));

      try {
        const result = await generateVoiceoverAndMerge({
          dialogue: scene.dialogue,
          videoUrl: scene.videoUrl,
          voice: voice || scene.voiceId || 'nova',
          speed: speed || undefined, // let auto-adjustment kick in if no explicit speed
          targetDurationSeconds: scene.durationSeconds,
        });

        const [updated] = await db.update(ugcVideoScenes)
          .set({
            audioUrl: result.audioUrl,
            mergedVideoUrl: result.mergedVideoUrl,
            voiceId: result.voice,
            status: 'generated',
            updatedAt: new Date(),
          })
          .where(eq(ugcVideoScenes.id, sceneId))
          .returning();

        res.json(updated);
      } catch (genError: any) {
        await db.update(ugcVideoScenes)
          .set({ status: 'failed', errorMessage: genError.message, updatedAt: new Date() })
          .where(eq(ugcVideoScenes.id, sceneId));
        throw genError;
      }
    } catch (error) {
      logger.error('Error generating voiceover', { error });
      res.status(500).json({ error: 'Failed to generate voiceover' });
    }
  }
}

export const ugcController = new UgcController();
