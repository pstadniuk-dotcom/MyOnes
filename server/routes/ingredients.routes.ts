/**
 * Ingredients Routes Module
 * 
 * Handles all /api/ingredients/* endpoints:
 * - Ingredient catalog
 * - System support details
 * - Individual ingredient info and research
 */

import { Router } from 'express';
import { requireAuth } from './middleware';
import { SYSTEM_SUPPORTS, INDIVIDUAL_INGREDIENTS, SYSTEM_SUPPORT_DETAILS, findIngredientByName } from '@shared/ingredients';
import { getIngredientResearch } from '@shared/ingredient-research';
import logger from '../logger';

const router = Router();

// Get ingredient catalog for customization UI
router.get('/catalog', requireAuth, async (req, res) => {
  try {
    res.json({
      systemSupports: SYSTEM_SUPPORTS,
      individualIngredients: INDIVIDUAL_INGREDIENTS
    });
  } catch (error) {
    logger.error('Error fetching ingredient catalog:', error);
    res.status(500).json({ error: 'Failed to fetch ingredient catalog' });
  }
});

// Get detailed system support breakdowns (ingredient compositions)
router.get('/base-details', requireAuth, async (req, res) => {
  try {
    res.json({
      systemSupportDetails: SYSTEM_SUPPORT_DETAILS
    });
  } catch (error) {
    logger.error('Error fetching system support details:', error);
    res.status(500).json({ error: 'Failed to fetch system support details' });
  }
});

// Get individual ingredient details
router.get('/:ingredientName', requireAuth, async (req, res) => {
  try {
    const { ingredientName } = req.params;
    const decodedName = decodeURIComponent(ingredientName);
    
    // Search in individual ingredients
    const ingredient = findIngredientByName(decodedName);
    
    if (!ingredient) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }
    
    res.json({ ingredient });
  } catch (error) {
    logger.error('Error fetching ingredient details:', error);
    res.status(500).json({ error: 'Failed to fetch ingredient details' });
  }
});

// Get ingredient research/citations
router.get('/:ingredientName/research', requireAuth, async (req, res) => {
  try {
    const { ingredientName } = req.params;
    const decodedName = decodeURIComponent(ingredientName);
    
    // Search for ingredient
    const ingredient = findIngredientByName(decodedName);
    
    if (!ingredient) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }
    
    // Get pre-built research data from ingredient-research.ts
    const researchData = getIngredientResearch(decodedName);
    
    // Convert research studies to citations format expected by frontend
    const citations = researchData?.studies?.map((study, idx) => ({
      id: `${decodedName}-study-${idx}`,
      citationTitle: study.title,
      journal: study.journal,
      publicationYear: study.year,
      authors: study.authors,
      findings: study.findings,
      sampleSize: study.sampleSize || null,
      pubmedUrl: study.pubmedUrl || null,
      evidenceLevel: study.evidenceLevel,
      studyType: study.studyType
    })) || [];
    
    // Return research data with summary, benefits, and citations
    const response = {
      ingredientName: ingredient.name,
      summary: researchData?.summary || null,
      keyBenefits: researchData?.keyBenefits || ingredient.benefits || [],
      safetyProfile: researchData?.safetyProfile || null,
      recommendedFor: researchData?.recommendedFor || [],
      citations,
      totalCitations: citations.length,
      // Also include basic ingredient info
      type: ingredient.type || '',
      doseMg: ingredient.doseMg,
      doseRangeMin: ingredient.doseRangeMin,
      doseRangeMax: ingredient.doseRangeMax,
      description: ingredient.description
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Error fetching ingredient research:', error);
    res.status(500).json({ error: 'Failed to fetch ingredient research' });
  }
});

export default router;
