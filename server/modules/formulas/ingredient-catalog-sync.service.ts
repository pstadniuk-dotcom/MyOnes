import logger from "../../infra/logging/logger";
import { ingredientCatalogRepository } from "./ingredient-catalog.repository";
import { manufacturerPricingService } from "./manufacturer-pricing.service";
import { formulasRepository } from "./formulas.repository";
import type { ManufacturerIngredient } from "@shared/schema";

export interface CatalogSyncResult {
  totalFromApi: number;
  newIngredients: number;
  discontinuedIngredients: number;
  reactivatedIngredients: number;
  addedNames: string[];
  removedNames: string[];
  reactivatedNames: string[];
  affectedFormulaCount: number;
}

class IngredientCatalogSyncService {
  /**
   * Fetch the latest catalog from Alive Innovations, compare against the DB,
   * and persist changes. Returns a summary of what changed.
   */
  async syncCatalog(): Promise<CatalogSyncResult> {
    logger.info('Ingredient catalog sync: starting');

    // 1. Fetch fresh catalog from Alive API
    const apiIngredients = await manufacturerPricingService.fetchIngredientsCatalogPublic();

    if (!apiIngredients || apiIngredients.length === 0) {
      logger.warn('Ingredient catalog sync: API returned empty catalog — skipping sync to avoid mass discontinuation');
      return {
        totalFromApi: 0,
        newIngredients: 0,
        discontinuedIngredients: 0,
        reactivatedIngredients: 0,
        addedNames: [],
        removedNames: [],
        reactivatedNames: [],
        affectedFormulaCount: 0,
      };
    }

    // 2. Get current DB state
    const dbIngredients = await ingredientCatalogRepository.getAll();
    const dbByName = new Map<string, ManufacturerIngredient>();
    for (const item of dbIngredients) {
      dbByName.set(item.name, item);
    }

    // 3. Track changes
    const addedNames: string[] = [];
    const reactivatedNames: string[] = [];
    const apiNames = new Set<string>();

    // 4. Upsert all ingredients from API
    for (const apiItem of apiIngredients) {
      apiNames.add(apiItem.name);

      const existing = dbByName.get(apiItem.name);
      if (!existing) {
        addedNames.push(apiItem.name);
      } else if (existing.status === 'discontinued') {
        reactivatedNames.push(apiItem.name);
      }

      await ingredientCatalogRepository.upsertIngredient(apiItem.name);
    }

    // 5. Mark ingredients NOT in API response as discontinued
    const removedNames: string[] = [];
    for (const dbItem of dbIngredients) {
      if (dbItem.status === 'active' && !apiNames.has(dbItem.name)) {
        removedNames.push(dbItem.name);
      }
    }
    await ingredientCatalogRepository.markDiscontinued(removedNames);

    // 6. Flag affected formulas + notify users
    let affectedFormulaCount = 0;
    if (removedNames.length > 0) {
      affectedFormulaCount = await this.flagAffectedFormulas(removedNames);
    }

    // 6b. Clear flags for reactivated ingredients
    if (reactivatedNames.length > 0) {
      await this.clearReactivatedFlags(reactivatedNames);
    }

    // 7. Log sync result
    const result: CatalogSyncResult = {
      totalFromApi: apiIngredients.length,
      newIngredients: addedNames.length,
      discontinuedIngredients: removedNames.length,
      reactivatedIngredients: reactivatedNames.length,
      addedNames,
      removedNames,
      reactivatedNames,
      affectedFormulaCount,
    };

    await ingredientCatalogRepository.createSyncLog({
      totalFromApi: result.totalFromApi,
      newIngredients: result.newIngredients,
      discontinuedIngredients: result.discontinuedIngredients,
      reactivatedIngredients: result.reactivatedIngredients,
      addedNames: result.addedNames,
      removedNames: result.removedNames,
      reactivatedNames: result.reactivatedNames,
    });

    if (removedNames.length > 0) {
      logger.warn('Ingredient catalog sync: ingredients discontinued', {
        removedNames,
        affectedFormulaCount,
      });
    }

    if (addedNames.length > 0) {
      logger.info('Ingredient catalog sync: new ingredients available', {
        addedNames,
      });
    }

    logger.info('Ingredient catalog sync: complete', {
      totalFromApi: result.totalFromApi,
      new: result.newIngredients,
      discontinued: result.discontinuedIngredients,
      reactivated: result.reactivatedIngredients,
      affectedFormulas: result.affectedFormulaCount,
    });

    return result;
  }

  /**
   * Flag active formulas that contain any of the given discontinued ingredient names.
   * Also triggers user notifications (email/SMS) via the notification gate.
   */
  private async flagAffectedFormulas(discontinuedNames: string[]): Promise<number> {
    try {
      const normalizedNames = new Set(discontinuedNames.map(n => n.toLowerCase().trim()));
      const allFormulas = await formulasRepository.getAllActiveFormulas();
      let count = 0;
      const affectedUserIds = new Set<string>();

      for (const formula of allFormulas) {
        const bases = Array.isArray(formula.bases) ? formula.bases as any[] : [];
        const additions = Array.isArray(formula.additions) ? formula.additions as any[] : [];
        const allIngredients = [...bases, ...additions];

        const matched = allIngredients
          .filter(item => normalizedNames.has((item?.ingredient || '').toLowerCase().trim()))
          .map(item => item?.ingredient as string);

        if (matched.length > 0) {
          await formulasRepository.flagFormulaDiscontinued(formula.id, matched);
          affectedUserIds.add(formula.userId);
          count++;
        }
      }

      // Notify affected users (fire-and-forget, errors are logged but don't fail the sync)
      if (affectedUserIds.size > 0) {
        this.notifyAffectedUsers([...affectedUserIds], discontinuedNames).catch(err => {
          logger.error('Failed to send discontinued ingredient notifications', {
            error: err instanceof Error ? err.message : err,
          });
        });
      }

      return count;
    } catch (err) {
      logger.error('Failed to flag affected formulas', { error: err instanceof Error ? err.message : err });
      return 0;
    }
  }

  /**
   * When ingredients are reactivated, clear the needsReformulation flag on formulas
   * whose ONLY discontinued ingredients were the reactivated ones.
   */
  private async clearReactivatedFlags(reactivatedNames: string[]): Promise<void> {
    try {
      const reactivatedSet = new Set(reactivatedNames.map(n => n.toLowerCase().trim()));
      const allFormulas = await formulasRepository.getAllActiveFormulas();

      for (const formula of allFormulas) {
        if (!formula.needsReformulation) continue;
        const disc = (formula.discontinuedIngredients as string[]) || [];
        const remaining = disc.filter(n => !reactivatedSet.has(n.toLowerCase().trim()));
        if (remaining.length === 0) {
          await formulasRepository.clearFormulaDiscontinuedFlag(formula.id);
          logger.info('Cleared reformulation flag (ingredients reactivated)', {
            formulaId: formula.id,
            userId: formula.userId,
          });
        }
      }
    } catch (err) {
      logger.error('Failed to clear reactivated formula flags', { error: err instanceof Error ? err.message : err });
    }
  }

  /**
   * Send email + SMS notifications to affected users, respecting the notification gate.
   */
  private async notifyAffectedUsers(userIds: string[], discontinuedNames: string[]): Promise<void> {
    // Lazy imports to avoid circular dependencies
    const { notificationGate } = await import('../notifications/notification-gate.service');
    const { sendNotificationEmail } = await import('../../utils/emailService');
    const { sendNotificationSms } = await import('../../utils/smsService');
    const { db } = await import('../../infra/db/db');
    const { users } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');

    const frontendUrl = process.env.FRONTEND_URL || process.env.VITE_APP_URL || 'https://ones-ai.com';
    const ingredientList = discontinuedNames.slice(0, 3).join(', ');
    const moreCount = discontinuedNames.length > 3 ? ` and ${discontinuedNames.length - 3} more` : '';

    for (const userId of userIds) {
      try {
        // Fetch user for contact info
        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!user) continue;

        const firstName = user.name?.split(' ')[0] || 'there';

        // Email notification (gated)
        if (user.email) {
          const emailAllowed = await notificationGate.tryAcquire(
            userId, 'ingredient_catalog_sync', 'ingredient_discontinued', 'email',
            { discontinuedNames },
          );
          if (emailAllowed) {
            await sendNotificationEmail({
              to: user.email,
              subject: 'Action needed: Your ONES formula needs an update',
              title: 'Ingredient Update Required',
              type: 'formula_update',
              content: `<p>Hi ${firstName},</p><p>One or more ingredients in your current formula (${ingredientList}${moreCount}) are no longer available from our manufacturer.</p><p>Your formula is on hold until you chat with your AI practitioner to find the best replacement. This usually takes just a couple of minutes.</p>`,
              actionUrl: `${frontendUrl}/dashboard/formula`,
              actionText: 'Update My Formula',
            });
          }
        }

        // SMS notification (gated)
        if (user.phone) {
          const smsAllowed = await notificationGate.tryAcquire(
            userId, 'ingredient_catalog_sync', 'ingredient_discontinued', 'sms',
            { discontinuedNames },
          );
          if (smsAllowed) {
            await sendNotificationSms({
              to: user.phone,
              type: 'formula_update',
              message: `Hi ${firstName}, an ingredient in your ONES formula is no longer available. Please visit your dashboard to update your formula: ${frontendUrl}/dashboard/formula`,
            });
          }
        }
      } catch (err) {
        logger.error('Failed to notify user about discontinued ingredients', {
          userId,
          error: err instanceof Error ? err.message : err,
        });
      }
    }
  }
}

export const ingredientCatalogSyncService = new IngredientCatalogSyncService();
