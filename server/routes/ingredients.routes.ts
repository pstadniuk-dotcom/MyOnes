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
    
    // Return research data if available
    const research = {
      ingredientName: ingredient.name,
      benefits: ingredient.benefits || [],
      type: ingredient.type || '',
      doseMg: ingredient.doseMg,
      doseRangeMin: ingredient.doseRangeMin,
      doseRangeMax: ingredient.doseRangeMax,
      description: ingredient.description,
      // Note: Full research citations would need to be added to ingredients.ts
      citations: [],
      studies: []
    };
    
    res.json({ research });
  } catch (error) {
    logger.error('Error fetching ingredient research:', error);
    res.status(500).json({ error: 'Failed to fetch ingredient research' });
  }
});

export default router;
