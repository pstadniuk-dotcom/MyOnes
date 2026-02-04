import { Router } from 'express';
import { ingredientsController } from '../controller/ingredients.controller';
import { requireAuth } from '../middleware/middleware';

const router = Router();

// Ingredient Catalog & Details
router.get('/catalog', requireAuth, ingredientsController.getCatalog);
router.get('/base-details', requireAuth, ingredientsController.getBaseDetails);
router.get('/:ingredientName', requireAuth, ingredientsController.getIngredientDetails);
router.get('/:ingredientName/research', requireAuth, ingredientsController.getIngredientResearch);

export default router;
