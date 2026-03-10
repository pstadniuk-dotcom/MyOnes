/**
 * Smart Re-Order Repository
 * CRUD operations for reorder_schedules and reorder_recommendations tables.
 */
import { db } from '../../infra/db/db';
import { reorderSchedules, reorderRecommendations } from '@shared/schema';
import type { InsertReorderSchedule, ReorderSchedule, InsertReorderRecommendation, ReorderRecommendation } from '@shared/schema';
import { eq, and, desc, inArray, isNull, lte, gte } from 'drizzle-orm';

export const reorderRepository = {
  // ── Schedules ──────────────────────────────────────────────────────────

  async createSchedule(data: InsertReorderSchedule): Promise<ReorderSchedule> {
    const [schedule] = await db.insert(reorderSchedules).values(data).returning();
    return schedule;
  },

  async getScheduleById(id: string): Promise<ReorderSchedule | null> {
    const [schedule] = await db.select().from(reorderSchedules).where(eq(reorderSchedules.id, id));
    return schedule ?? null;
  },

  async getActiveScheduleByUser(userId: string): Promise<ReorderSchedule | null> {
    const [schedule] = await db
      .select()
      .from(reorderSchedules)
      .where(and(
        eq(reorderSchedules.userId, userId),
        eq(reorderSchedules.status, 'active'),
      ))
      .orderBy(desc(reorderSchedules.createdAt))
      .limit(1);
    return schedule ?? null;
  },

  async getSchedulesByUser(userId: string): Promise<ReorderSchedule[]> {
    return db
      .select()
      .from(reorderSchedules)
      .where(eq(reorderSchedules.userId, userId))
      .orderBy(desc(reorderSchedules.createdAt));
  },

  /**
   * Find all schedules that are ready for AI review (5 days before supply end).
   * Status must be 'active' and supplyEndDate within the review window.
   */
  async getSchedulesDueForReview(reviewWindowDate: Date): Promise<ReorderSchedule[]> {
    return db
      .select()
      .from(reorderSchedules)
      .where(and(
        eq(reorderSchedules.status, 'active'),
        lte(reorderSchedules.supplyEndDate, reviewWindowDate),
      ));
  },

  /**
   * Find schedules in 'awaiting_approval' status where the auto-approve deadline has passed.
   */
  async getSchedulesPastAutoApproveDeadline(): Promise<ReorderSchedule[]> {
    return db
      .select()
      .from(reorderSchedules)
      .where(and(
        eq(reorderSchedules.status, 'awaiting_approval'),
      ));
  },

  /**
   * Find schedules in 'approved' status ready to be charged.
   */
  async getApprovedSchedulesReadyToCharge(): Promise<ReorderSchedule[]> {
    return db
      .select()
      .from(reorderSchedules)
      .where(eq(reorderSchedules.status, 'approved'));
  },

  async updateSchedule(id: string, data: Partial<ReorderSchedule>): Promise<ReorderSchedule | null> {
    const [updated] = await db
      .update(reorderSchedules)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(reorderSchedules.id, id))
      .returning();
    return updated ?? null;
  },

  async cancelAllActiveSchedules(userId: string): Promise<void> {
    await db
      .update(reorderSchedules)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(and(
        eq(reorderSchedules.userId, userId),
        inArray(reorderSchedules.status, ['active', 'awaiting_review', 'awaiting_approval']),
      ));
  },

  // ── Recommendations ────────────────────────────────────────────────────

  async createRecommendation(data: InsertReorderRecommendation): Promise<ReorderRecommendation> {
    const [rec] = await db.insert(reorderRecommendations).values(data as any).returning();
    return rec;
  },

  async getRecommendationByScheduleId(scheduleId: string): Promise<ReorderRecommendation | null> {
    const [rec] = await db
      .select()
      .from(reorderRecommendations)
      .where(eq(reorderRecommendations.scheduleId, scheduleId))
      .orderBy(desc(reorderRecommendations.createdAt))
      .limit(1);
    return rec ?? null;
  },

  async getRecommendationById(id: string): Promise<ReorderRecommendation | null> {
    const [rec] = await db
      .select()
      .from(reorderRecommendations)
      .where(eq(reorderRecommendations.id, id));
    return rec ?? null;
  },

  /**
   * Find recommendations that are awaiting auto-approve (sent but no reply, past deadline).
   */
  async getRecommendationsPastDeadline(now: Date): Promise<ReorderRecommendation[]> {
    return db
      .select()
      .from(reorderRecommendations)
      .where(and(
        eq(reorderRecommendations.status, 'sent'),
        lte(reorderRecommendations.autoApproveAt, now),
      ));
  },

  /**
   * Find a recommendation by Twilio SMS SID (for webhook reply matching).
   */
  async getRecommendationBySmsSid(messageSid: string): Promise<ReorderRecommendation | null> {
    const [rec] = await db
      .select()
      .from(reorderRecommendations)
      .where(eq(reorderRecommendations.smsMessageSid, messageSid));
    return rec ?? null;
  },

  /**
   * Find the most recent 'sent' recommendation for a user (for SMS reply matching by phone number).
   */
  async getLatestSentRecommendationByUser(userId: string): Promise<ReorderRecommendation | null> {
    const [rec] = await db
      .select()
      .from(reorderRecommendations)
      .where(and(
        eq(reorderRecommendations.userId, userId),
        eq(reorderRecommendations.status, 'sent'),
      ))
      .orderBy(desc(reorderRecommendations.createdAt))
      .limit(1);
    return rec ?? null;
  },

  async updateRecommendation(id: string, data: Partial<ReorderRecommendation>): Promise<ReorderRecommendation | null> {
    const [updated] = await db
      .update(reorderRecommendations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(reorderRecommendations.id, id))
      .returning();
    return updated ?? null;
  },
};
