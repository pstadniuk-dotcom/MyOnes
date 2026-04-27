/**
 * Ingredient Catalog Sync Scheduler
 *
 * Runs daily at 3am UTC.
 * Fetches the Alive Innovations ingredient catalog, compares against the DB,
 * and persists additions/removals. Logs a warning when ingredients are
 * discontinued so affected formulas can be flagged.
 */

import cron from 'node-cron';
import { ingredientCatalogSyncService } from '../modules/formulas/ingredient-catalog-sync.service';
import logger from '../infra/logging/logger';
import { runScheduledJob } from './schedulerRunner';

async function runCatalogSync(): Promise<Record<string, any>> {
  logger.info('Ingredient catalog sync scheduler: starting daily sync');
  const result = await ingredientCatalogSyncService.syncCatalog();
  logger.info('Ingredient catalog sync scheduler: complete', result);
  return result as Record<string, any>;
}

export function startIngredientCatalogSyncScheduler() {
  logger.info('Ingredient catalog sync scheduler: starting...');

  // Daily at 3am UTC
  cron.schedule('0 3 * * *', async () => {
    await runScheduledJob('ingredient_catalog_sync', runCatalogSync);
  });

  // Also run once on startup (after a short delay) to seed the DB if empty
  setTimeout(async () => {
    try {
      const { ingredientCatalogRepository } = await import('../modules/formulas/ingredient-catalog.repository');
      const existing = await ingredientCatalogRepository.getAll();
      if (existing.length === 0) {
        logger.info('Ingredient catalog sync: DB empty — running initial seed sync');
        await runCatalogSync();
      }
    } catch (err) {
      logger.error('Ingredient catalog sync: startup seed check failed', {
        error: err instanceof Error ? err.message : err,
      });
    }
  }, 10_000); // 10 second delay to let DB connections settle

  logger.info('Ingredient catalog sync scheduler: started — runs daily at 03:00 UTC');
}
