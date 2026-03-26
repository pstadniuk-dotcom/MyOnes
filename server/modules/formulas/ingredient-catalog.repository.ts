import { eq, and, inArray, sql } from "drizzle-orm";
import { db } from "../../infra/db/db";
import {
  manufacturerIngredients,
  manufacturerCatalogSyncLogs,
  type ManufacturerIngredient,
  type ManufacturerCatalogSyncLog,
} from "@shared/schema";

class IngredientCatalogRepository {
  async getAllActive(): Promise<ManufacturerIngredient[]> {
    return db
      .select()
      .from(manufacturerIngredients)
      .where(eq(manufacturerIngredients.status, 'active'));
  }

  async getAll(): Promise<ManufacturerIngredient[]> {
    return db.select().from(manufacturerIngredients);
  }

  async upsertIngredient(name: string): Promise<ManufacturerIngredient> {
    const [result] = await db
      .insert(manufacturerIngredients)
      .values({
        name,
        status: 'active',
      })
      .onConflictDoUpdate({
        target: manufacturerIngredients.name,
        set: {
          status: 'active',
          lastSeenAt: new Date(),
          discontinuedAt: null,
        },
      })
      .returning();
    return result;
  }

  async markDiscontinued(names: string[]): Promise<number> {
    if (names.length === 0) return 0;
    const result = await db
      .update(manufacturerIngredients)
      .set({
        status: 'discontinued',
        discontinuedAt: new Date(),
      })
      .where(
        and(
          inArray(manufacturerIngredients.name, names),
          eq(manufacturerIngredients.status, 'active'),
        )
      );
    return result.rowCount ?? 0;
  }

  async createSyncLog(log: {
    totalFromApi: number;
    newIngredients: number;
    discontinuedIngredients: number;
    reactivatedIngredients: number;
    addedNames: string[];
    removedNames: string[];
    reactivatedNames: string[];
  }): Promise<ManufacturerCatalogSyncLog> {
    const [result] = await db
      .insert(manufacturerCatalogSyncLogs)
      .values(log)
      .returning();
    return result;
  }

  async getRecentSyncLogs(limit = 20): Promise<ManufacturerCatalogSyncLog[]> {
    return db
      .select()
      .from(manufacturerCatalogSyncLogs)
      .orderBy(sql`${manufacturerCatalogSyncLogs.syncedAt} DESC`)
      .limit(limit);
  }

  async getLastSyncLog(): Promise<ManufacturerCatalogSyncLog | undefined> {
    const [result] = await db
      .select()
      .from(manufacturerCatalogSyncLogs)
      .orderBy(sql`${manufacturerCatalogSyncLogs.syncedAt} DESC`)
      .limit(1);
    return result;
  }
}

export const ingredientCatalogRepository = new IngredientCatalogRepository();
