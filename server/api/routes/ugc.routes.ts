/**
 * UGC Ad Studio Routes
 * All endpoints prefixed with /api/admin/ugc/
 */

import { Router } from 'express';
import { ugcController } from '../controller/ugc.controller';
import { requireAdmin } from '../middleware/middleware';

const router = Router();

// ONES Product Context & Script Angles (baked-in data)
router.get('/product-context', requireAdmin, ugcController.getProductContext);
router.get('/script-angles', requireAdmin, ugcController.getScriptAngles);
router.get('/voices', requireAdmin, ugcController.listVoices);

// Campaigns
router.get('/campaigns', requireAdmin, ugcController.listCampaigns);
router.get('/campaigns/:id', requireAdmin, ugcController.getCampaign);
router.post('/campaigns', requireAdmin, ugcController.createCampaign);
router.patch('/campaigns/:id', requireAdmin, ugcController.updateCampaign);
router.delete('/campaigns/:id', requireAdmin, ugcController.deleteCampaign);

// Research
router.post('/research/generate', requireAdmin, ugcController.generateResearch);

// Hooks
router.get('/hooks', requireAdmin, ugcController.listHooks);
router.post('/hooks', requireAdmin, ugcController.createHook);
router.patch('/hooks/:id', requireAdmin, ugcController.updateHook);
router.delete('/hooks/:id', requireAdmin, ugcController.deleteHook);
router.post('/hooks/scan', requireAdmin, ugcController.scanViralHooks);

// Scripts
router.get('/scripts', requireAdmin, ugcController.listScripts);
router.post('/scripts/generate', requireAdmin, ugcController.generateScript);
router.patch('/scripts/:id', requireAdmin, ugcController.updateScript);
router.delete('/scripts/:id', requireAdmin, ugcController.deleteScript);

// Characters
router.get('/characters', requireAdmin, ugcController.listCharacters);
router.post('/characters/suggest', requireAdmin, ugcController.suggestCharacters);
router.post('/characters', requireAdmin, ugcController.createCharacter);
router.patch('/characters/:id', requireAdmin, ugcController.updateCharacter);
router.delete('/characters/:id', requireAdmin, ugcController.deleteCharacter);
router.post('/characters/:id/reference', requireAdmin, ugcController.setCharacterReference);
router.delete('/characters/:id/reference', requireAdmin, ugcController.clearCharacterReference);

// Image Generation
router.post('/images/generate', requireAdmin, ugcController.generateImage);
router.patch('/images/:id/status', requireAdmin, ugcController.updateImageStatus);
router.post('/images/:id/regenerate', requireAdmin, ugcController.regenerateImage);

// Video Scenes
router.post('/video/generate-prompts', requireAdmin, ugcController.generateVideoPrompts);
router.post('/video/:id/generate', requireAdmin, ugcController.generateVideo);
router.post('/video/:id/voiceover', requireAdmin, ugcController.generateVoiceover);
router.patch('/video/:id', requireAdmin, ugcController.updateVideoScene);
router.delete('/video/:id', requireAdmin, ugcController.deleteVideoScene);

// Full Pipeline (sequential generation + lip-sync + assembly)
router.post('/pipeline/generate-all', requireAdmin, ugcController.generateAllVideos);
router.post('/pipeline/lipsync-all', requireAdmin, ugcController.lipSyncAll);
router.post('/pipeline/assemble', requireAdmin, ugcController.assembleFullVideo);
router.post('/pipeline/full', requireAdmin, ugcController.runFullPipeline);
router.get('/pipeline/preview-durations', requireAdmin, ugcController.previewDurations);

// Brand Assets
router.get('/brand-assets', requireAdmin, ugcController.listBrandAssets);
router.post('/brand-assets', requireAdmin, ugcController.createBrandAsset);
router.post('/brand-assets/upload', requireAdmin, ugcController.uploadBrandAsset);
router.delete('/brand-assets/:id', requireAdmin, ugcController.deleteBrandAsset);

export default router;
