import { logger } from '../../infra/logging/logger';
import { db } from '../../infra/db/db';
import {
  discountCodes,
  discountCodeRedemptions,
  orders,
  type DiscountCode,
  type InsertDiscountCode,
  type DiscountCodeRedemption,
} from '@shared/schema';
import { and, count, eq, isNull, sql } from 'drizzle-orm';

export class DiscountCodesRepository {
  async findActiveByCode(code: string): Promise<DiscountCode | undefined> {
    try {
      const [row] = await db
        .select()
        .from(discountCodes)
        .where(and(
          sql`upper(${discountCodes.code}) = ${code.toUpperCase()}`,
          eq(discountCodes.isActive, true),
        ));
      return row || undefined;
    } catch (error) {
      logger.error('Error finding discount code', { error, code });
      return undefined;
    }
  }

  async findById(id: string): Promise<DiscountCode | undefined> {
    try {
      const [row] = await db.select().from(discountCodes).where(eq(discountCodes.id, id));
      return row || undefined;
    } catch (error) {
      logger.error('Error finding discount code by id', { error, id });
      return undefined;
    }
  }

  async listAll(): Promise<DiscountCode[]> {
    try {
      return await db.select().from(discountCodes).orderBy(sql`${discountCodes.createdAt} desc`);
    } catch (error) {
      logger.error('Error listing discount codes', { error });
      return [];
    }
  }

  async create(payload: InsertDiscountCode): Promise<DiscountCode> {
    const [row] = await db.insert(discountCodes).values({
      ...payload,
      code: payload.code.toUpperCase(),
    }).returning();
    return row;
  }

  async update(id: string, updates: Partial<InsertDiscountCode>): Promise<DiscountCode | undefined> {
    try {
      const next: any = { ...updates, updatedAt: new Date() };
      if (typeof next.code === 'string') next.code = next.code.toUpperCase();
      const [row] = await db.update(discountCodes).set(next).where(eq(discountCodes.id, id)).returning();
      return row || undefined;
    } catch (error) {
      logger.error('Error updating discount code', { error, id });
      return undefined;
    }
  }

  async deactivate(id: string): Promise<DiscountCode | undefined> {
    try {
      const [row] = await db
        .update(discountCodes)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(discountCodes.id, id))
        .returning();
      return row || undefined;
    } catch (error) {
      logger.error('Error deactivating discount code', { error, id });
      return undefined;
    }
  }

  async countRedemptionsByUser(discountCodeId: string, userId: string): Promise<number> {
    try {
      const [row] = await db
        .select({ n: count() })
        .from(discountCodeRedemptions)
        .where(and(
          eq(discountCodeRedemptions.discountCodeId, discountCodeId),
          eq(discountCodeRedemptions.userId, userId),
        ));
      return row?.n ?? 0;
    } catch (error) {
      logger.error('Error counting redemptions by user', { error, discountCodeId, userId });
      return 0;
    }
  }

  async countCompletedOrdersByUser(userId: string): Promise<number> {
    try {
      const [row] = await db
        .select({ n: count() })
        .from(orders)
        .where(eq(orders.userId, userId));
      return row?.n ?? 0;
    } catch (error) {
      logger.error('Error counting completed orders by user', { error, userId });
      return 0;
    }
  }

  /**
   * Reserve a redemption: increments usedCount and inserts a pending row (orderId=null)
   * in a single transaction. If maxUses is exceeded the increment fails and the whole
   * transaction rolls back, preventing oversell.
   */
  async reserveRedemption(input: {
    discountCodeId: string;
    userId: string;
    amountAppliedCents: number;
  }): Promise<DiscountCodeRedemption | undefined> {
    try {
      return await db.transaction(async (tx) => {
        const [updated] = await tx
          .update(discountCodes)
          .set({ usedCount: sql`${discountCodes.usedCount} + 1`, updatedAt: new Date() })
          .where(and(
            eq(discountCodes.id, input.discountCodeId),
            sql`(${discountCodes.maxUses} IS NULL OR ${discountCodes.usedCount} < ${discountCodes.maxUses})`,
          ))
          .returning();
        if (!updated) throw new Error('CODE_EXHAUSTED');

        const [row] = await tx.insert(discountCodeRedemptions).values({
          discountCodeId: input.discountCodeId,
          userId: input.userId,
          amountAppliedCents: input.amountAppliedCents,
          orderId: null,
        }).returning();
        return row;
      });
    } catch (error: any) {
      if (error?.message === 'CODE_EXHAUSTED') return undefined;
      logger.error('Error reserving discount redemption', { error, input });
      return undefined;
    }
  }

  async attachOrderToRedemption(redemptionId: string, orderId: string): Promise<void> {
    try {
      await db
        .update(discountCodeRedemptions)
        .set({ orderId })
        .where(eq(discountCodeRedemptions.id, redemptionId));
    } catch (error) {
      logger.error('Error attaching order to redemption', { error, redemptionId, orderId });
    }
  }

  /**
   * Release a reserved redemption (call when EPD declines): deletes the pending row
   * and decrements usedCount in a transaction so the next user isn't blocked.
   */
  async releaseRedemption(redemptionId: string): Promise<void> {
    try {
      await db.transaction(async (tx) => {
        const [row] = await tx
          .select()
          .from(discountCodeRedemptions)
          .where(and(
            eq(discountCodeRedemptions.id, redemptionId),
            isNull(discountCodeRedemptions.orderId),
          ));
        if (!row) return; // already attached or already released

        await tx.delete(discountCodeRedemptions).where(eq(discountCodeRedemptions.id, redemptionId));
        await tx
          .update(discountCodes)
          .set({ usedCount: sql`GREATEST(${discountCodes.usedCount} - 1, 0)`, updatedAt: new Date() })
          .where(eq(discountCodes.id, row.discountCodeId));
      });
    } catch (error) {
      logger.error('Error releasing discount redemption', { error, redemptionId });
    }
  }

  async getStats(): Promise<{
    totalActive: number;
    redemptionsLast30Days: number;
    discountCentsLast30Days: number;
  }> {
    try {
      const [active] = await db
        .select({ n: count() })
        .from(discountCodes)
        .where(eq(discountCodes.isActive, true));

      const [recent] = await db
        .select({
          n: count(),
          total: sql<number>`coalesce(sum(${discountCodeRedemptions.amountAppliedCents}), 0)::int`,
        })
        .from(discountCodeRedemptions)
        .where(sql`${discountCodeRedemptions.redeemedAt} > now() - interval '30 days'`);

      return {
        totalActive: active?.n ?? 0,
        redemptionsLast30Days: recent?.n ?? 0,
        discountCentsLast30Days: recent?.total ?? 0,
      };
    } catch (error) {
      logger.error('Error getting discount stats', { error });
      return { totalActive: 0, redemptionsLast30Days: 0, discountCentsLast30Days: 0 };
    }
  }
}

export const discountCodesRepository = new DiscountCodesRepository();
