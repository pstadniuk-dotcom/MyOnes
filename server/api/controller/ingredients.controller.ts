import { Request, Response } from 'express';
import { ingredientsService } from '../../modules/ingredients/ingredients.service';
import logger from '../../infra/logging/logger';

export class IngredientsController {
    async getCatalog(req: Request, res: Response) {
        try {
            const catalog = await ingredientsService.getCatalog();
            res.json(catalog);
        } catch (error) {
            logger.error('Error in getCatalog controller:', error);
            res.status(500).json({ error: 'Failed to fetch ingredient catalog' });
        }
    }

    async getBaseDetails(req: Request, res: Response) {
        try {
            const details = await ingredientsService.getBaseDetails();
            res.json(details);
        } catch (error) {
            logger.error('Error in getBaseDetails controller:', error);
            res.status(500).json({ error: 'Failed to fetch system support details' });
        }
    }

    async getIngredientDetails(req: Request, res: Response) {
        try {
            const { ingredientName } = req.params;
            const result = await ingredientsService.getIngredientDetails(ingredientName);

            if (!result) {
                return res.status(404).json({ error: 'Ingredient not found' });
            }

            res.json(result);
        } catch (error) {
            logger.error('Error in getIngredientDetails controller:', error);
            res.status(500).json({ error: 'Failed to fetch ingredient details' });
        }
    }

    async getIngredientResearch(req: Request, res: Response) {
        try {
            const { ingredientName } = req.params;
            const result = await ingredientsService.getIngredientResearch(ingredientName);

            if (!result) {
                return res.status(404).json({ error: 'Ingredient not found' });
            }

            res.json(result);
        } catch (error) {
            logger.error('Error in getIngredientResearch controller:', error);
            res.status(500).json({ error: 'Failed to fetch ingredient research' });
        }
    }
}

export const ingredientsController = new IngredientsController();
