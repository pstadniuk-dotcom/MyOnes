import { db } from '../../infra/db/db';
import {
  autoShipSubscriptions,
  type AutoShipSubscription,
  type InsertAutoShipSubscription,
} from '@shared/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

export class AutoShipRepository {
  async getByUserId(userId: string): Promise<AutoShipSubscription | undefined> {
    const [row] = await db
      .select()
      .from(autoShipSubscriptions)
      .where(eq(autoShipSubscriptions.userId, userId));
    return row || undefined;
  }

  async getByStripeSubscriptionId(stripeSubscriptionId: string): Promise<AutoShipSubscription | undefined> {
    const [row] = await db
      .select()
      .from(autoShipSubscriptions)
      .where(eq(autoShipSubscriptions.stripeSubscriptionId, stripeSubscriptionId));
    return row || undefined;
  }

  async getById(id: string): Promise<AutoShipSubscription | undefined> {
    const [row] = await db
      .select()
      .from(autoShipSubscriptions)
      .where(eq(autoShipSubscriptions.id, id));
    return row || undefined;
  }

  async create(data: InsertAutoShipSubscription): Promise<AutoShipSubscription> {
    const [row] = await db
      .insert(autoShipSubscriptions)
      .values(data)
      .returning();
    return row;
  }

  async update(id: string, updates: Partial<InsertAutoShipSubscription>): Promise<AutoShipSubscription | undefined> {
    const [row] = await db
      .update(autoShipSubscriptions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(autoShipSubscriptions.id, id))
      .returning();
    return row || undefined;
  }

  async updateByUserId(userId: string, updates: Partial<InsertAutoShipSubscription>): Promise<AutoShipSubscription | undefined> {
    const [row] = await db
      .update(autoShipSubscriptions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(autoShipSubscriptions.userId, userId))
      .returning();
    return row || undefined;
  }

  /** Find active auto-ships renewing within `daysAhead` days from now */
  async getUpcomingShipments(daysAhead: number): Promise<AutoShipSubscription[]> {
    const now = new Date();
    const target = new Date(now);
    target.setDate(target.getDate() + daysAhead);
    target.setHours(23, 59, 59, 999);

    return db
      .select()
      .from(autoShipSubscriptions)
      .where(
        and(
          eq(autoShipSubscriptions.status, 'active'),
          gte(autoShipSubscriptions.nextShipmentDate, now),
          lte(autoShipSubscriptions.nextShipmentDate, target),
        ),
      );
  }

  /** Get all active auto-ships (for scheduler scans) */
  async getAllActive(): Promise<AutoShipSubscription[]> {
    return db
      .select()
      .from(autoShipSubscriptions)
      .where(eq(autoShipSubscriptions.status, 'active'));
  }
}

export const autoShipRepository = new AutoShipRepository();
