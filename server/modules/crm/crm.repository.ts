/**
 * CRM Repository — CRUD for contacts, deals, activities, and saved views
 */
import { db } from '../../infra/db/db';
import {
  crmContacts, crmDeals, crmActivities, crmSavedViews,
  type InsertCrmContact, type InsertCrmDeal, type InsertCrmActivity, type InsertCrmSavedView,
  type CrmContact, type CrmDeal, type CrmActivity, type CrmSavedView,
} from '@shared/schema';
import { eq, desc, and, or, inArray, sql, count, ilike, gte, lte, isNull, isNotNull, asc } from 'drizzle-orm';
import logger from '../../infra/logging/logger';

class CrmRepository {

  // ── Contacts ─────────────────────────────────────────────────────────

  async createContact(data: InsertCrmContact): Promise<CrmContact> {
    const [contact] = await db.insert(crmContacts).values(data as any).returning();
    return contact;
  }

  async getContactById(id: string): Promise<CrmContact | null> {
    const [contact] = await db.select().from(crmContacts).where(eq(crmContacts.id, id)).limit(1);
    return contact || null;
  }

  async getContactByEmail(email: string): Promise<CrmContact | null> {
    const [contact] = await db.select().from(crmContacts).where(eq(crmContacts.email, email)).limit(1);
    return contact || null;
  }

  async getContactByOutreachProspectId(prospectId: string): Promise<CrmContact | null> {
    const [contact] = await db.select().from(crmContacts)
      .where(eq(crmContacts.outreachProspectId, prospectId)).limit(1);
    return contact || null;
  }

  async listContacts(filters: {
    search?: string;
    type?: 'person' | 'company';
    source?: string;
    tags?: string[];
    minScore?: number;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
  } = {}): Promise<{ contacts: CrmContact[]; total: number }> {
    const conditions = [];
    if (filters.type) conditions.push(eq(crmContacts.type, filters.type));
    if (filters.source) conditions.push(eq(crmContacts.source, filters.source));
    if (filters.minScore) conditions.push(sql`${crmContacts.leadScore} >= ${filters.minScore}`);
    if (filters.search) {
      conditions.push(or(
        ilike(crmContacts.name, `%${filters.search}%`),
        ilike(crmContacts.email, `%${filters.search}%`),
        ilike(crmContacts.company, `%${filters.search}%`),
      ));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db.select({ count: count() }).from(crmContacts).where(where);

    const orderBy = filters.sortBy === 'name' ? (filters.sortDir === 'asc' ? asc(crmContacts.name) : desc(crmContacts.name))
      : filters.sortBy === 'leadScore' ? (filters.sortDir === 'asc' ? asc(crmContacts.leadScore) : desc(crmContacts.leadScore))
      : desc(crmContacts.updatedAt);

    const contacts = await db.select().from(crmContacts)
      .where(where)
      .orderBy(orderBy)
      .limit(filters.limit || 50)
      .offset(filters.offset || 0);

    return { contacts, total: totalResult.count };
  }

  async updateContact(id: string, data: Partial<CrmContact>): Promise<void> {
    await db.update(crmContacts).set({ ...data, updatedAt: new Date() }).where(eq(crmContacts.id, id));
  }

  async deleteContact(id: string): Promise<void> {
    await db.delete(crmContacts).where(eq(crmContacts.id, id));
  }

  async searchContacts(query: string, limit = 20): Promise<CrmContact[]> {
    return db.select().from(crmContacts)
      .where(or(
        ilike(crmContacts.name, `%${query}%`),
        ilike(crmContacts.email, `%${query}%`),
        ilike(crmContacts.company, `%${query}%`),
      ))
      .orderBy(desc(crmContacts.updatedAt))
      .limit(limit);
  }

  // ── Deals ────────────────────────────────────────────────────────────

  async createDeal(data: InsertCrmDeal): Promise<CrmDeal> {
    const [deal] = await db.insert(crmDeals).values(data as any).returning();
    return deal;
  }

  async getDealById(id: string): Promise<CrmDeal | null> {
    const [deal] = await db.select().from(crmDeals).where(eq(crmDeals.id, id)).limit(1);
    return deal || null;
  }

  async getDealByOutreachProspectId(prospectId: string): Promise<CrmDeal | null> {
    const [deal] = await db.select().from(crmDeals)
      .where(eq(crmDeals.outreachProspectId, prospectId)).limit(1);
    return deal || null;
  }

  async listDeals(filters: {
    stage?: string;
    category?: string;
    contactId?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
  } = {}): Promise<{ deals: CrmDeal[]; total: number }> {
    const conditions = [];
    if (filters.stage) conditions.push(eq(crmDeals.stage, filters.stage as any));
    if (filters.category) conditions.push(eq(crmDeals.category, filters.category as any));
    if (filters.contactId) conditions.push(eq(crmDeals.contactId, filters.contactId));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db.select({ count: count() }).from(crmDeals).where(where);

    const deals = await db.select().from(crmDeals)
      .where(where)
      .orderBy(desc(crmDeals.updatedAt))
      .limit(filters.limit || 50)
      .offset(filters.offset || 0);

    return { deals, total: totalResult.count };
  }

  /** Get deals grouped by stage for pipeline view */
  async getDealsPipeline(filters: {
    category?: string;
  } = {}): Promise<Record<string, (CrmDeal & { contact: CrmContact })[]>> {
    const conditions = [];
    if (filters.category) conditions.push(eq(crmDeals.category, filters.category as any));
    // Exclude closed deals from pipeline by default
    conditions.push(
      and(
        sql`${crmDeals.stage} != 'closed_won'`,
        sql`${crmDeals.stage} != 'closed_lost'`,
      )!
    );

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db.select({
      deal: crmDeals,
      contact: crmContacts,
    })
      .from(crmDeals)
      .innerJoin(crmContacts, eq(crmDeals.contactId, crmContacts.id))
      .where(where)
      .orderBy(desc(crmDeals.updatedAt));

    const pipeline: Record<string, (CrmDeal & { contact: CrmContact })[]> = {
      lead: [],
      contacted: [],
      responded: [],
      meeting: [],
      negotiation: [],
    };

    for (const { deal, contact } of results) {
      const stage = deal.stage;
      if (pipeline[stage]) {
        pipeline[stage].push({ ...deal, contact });
      }
    }

    return pipeline;
  }

  async updateDeal(id: string, data: Partial<CrmDeal>): Promise<void> {
    await db.update(crmDeals).set({ ...data, updatedAt: new Date() }).where(eq(crmDeals.id, id));
  }

  async deleteDeal(id: string): Promise<void> {
    await db.delete(crmDeals).where(eq(crmDeals.id, id));
  }

  /** Get deal counts by stage for funnel metrics */
  async getDealCountsByStage(): Promise<{ stage: string; count: number }[]> {
    const results = await db.select({
      stage: crmDeals.stage,
      count: count(),
    }).from(crmDeals).groupBy(crmDeals.stage);
    return results.map(r => ({ stage: r.stage, count: r.count }));
  }

  /** Get total pipeline value by stage */
  async getPipelineValue(): Promise<{ stage: string; totalCents: number; dealCount: number }[]> {
    const results = await db.select({
      stage: crmDeals.stage,
      totalCents: sql<number>`COALESCE(SUM(${crmDeals.valueCents}), 0)::int`,
      dealCount: count(),
    }).from(crmDeals).groupBy(crmDeals.stage);
    return results.map(r => ({ stage: r.stage, totalCents: r.totalCents, dealCount: r.dealCount }));
  }

  // ── Activities ───────────────────────────────────────────────────────

  async createActivity(data: InsertCrmActivity): Promise<CrmActivity> {
    const [activity] = await db.insert(crmActivities).values(data as any).returning();
    // Update contact's lastActivityAt
    await db.update(crmContacts)
      .set({ lastActivityAt: new Date(), updatedAt: new Date() })
      .where(eq(crmContacts.id, data.contactId));
    return activity;
  }

  async getActivitiesByContact(contactId: string, limit = 50): Promise<CrmActivity[]> {
    return db.select().from(crmActivities)
      .where(eq(crmActivities.contactId, contactId))
      .orderBy(desc(crmActivities.createdAt))
      .limit(limit);
  }

  async getActivitiesByDeal(dealId: string, limit = 50): Promise<CrmActivity[]> {
    return db.select().from(crmActivities)
      .where(eq(crmActivities.dealId, dealId))
      .orderBy(desc(crmActivities.createdAt))
      .limit(limit);
  }

  async getUpcomingTasks(limit = 20): Promise<CrmActivity[]> {
    return db.select().from(crmActivities)
      .where(and(
        eq(crmActivities.type, 'task'),
        isNull(crmActivities.completedAt),
        isNotNull(crmActivities.dueAt),
      ))
      .orderBy(asc(crmActivities.dueAt))
      .limit(limit);
  }

  async getOverdueTasks(): Promise<CrmActivity[]> {
    return db.select().from(crmActivities)
      .where(and(
        eq(crmActivities.type, 'task'),
        isNull(crmActivities.completedAt),
        lte(crmActivities.dueAt, new Date()),
      ))
      .orderBy(asc(crmActivities.dueAt));
  }

  async completeTask(id: string): Promise<void> {
    await db.update(crmActivities)
      .set({ completedAt: new Date() })
      .where(eq(crmActivities.id, id));
  }

  async updateActivity(id: string, data: Partial<CrmActivity>): Promise<void> {
    await db.update(crmActivities).set(data).where(eq(crmActivities.id, id));
  }

  async deleteActivity(id: string): Promise<void> {
    await db.delete(crmActivities).where(eq(crmActivities.id, id));
  }

  async getRecentActivities(limit = 30): Promise<(CrmActivity & { contactName?: string })[]> {
    const results = await db.select({
      activity: crmActivities,
      contactName: crmContacts.name,
    })
      .from(crmActivities)
      .innerJoin(crmContacts, eq(crmActivities.contactId, crmContacts.id))
      .orderBy(desc(crmActivities.createdAt))
      .limit(limit);

    return results.map(r => ({ ...r.activity, contactName: r.contactName }));
  }

  // ── Saved Views ──────────────────────────────────────────────────────

  async createSavedView(data: InsertCrmSavedView): Promise<CrmSavedView> {
    const [view] = await db.insert(crmSavedViews).values(data as any).returning();
    return view;
  }

  async listSavedViews(entity?: string): Promise<CrmSavedView[]> {
    const conditions = entity ? eq(crmSavedViews.entity, entity) : undefined;
    return db.select().from(crmSavedViews).where(conditions).orderBy(crmSavedViews.name);
  }

  async deleteSavedView(id: string): Promise<void> {
    await db.delete(crmSavedViews).where(eq(crmSavedViews.id, id));
  }

  // ── Stats ────────────────────────────────────────────────────────────

  async getStats(): Promise<{
    totalContacts: number;
    totalDeals: number;
    openDeals: number;
    wonDeals: number;
    lostDeals: number;
    totalPipelineValueCents: number;
    overdueTasks: number;
    activitiesThisWeek: number;
  }> {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [totalContacts] = await db.select({ count: count() }).from(crmContacts);
    const [totalDeals] = await db.select({ count: count() }).from(crmDeals);
    const [openDeals] = await db.select({ count: count() }).from(crmDeals)
      .where(and(
        sql`${crmDeals.stage} != 'closed_won'`,
        sql`${crmDeals.stage} != 'closed_lost'`,
      ));
    const [wonDeals] = await db.select({ count: count() }).from(crmDeals)
      .where(eq(crmDeals.stage, 'closed_won'));
    const [lostDeals] = await db.select({ count: count() }).from(crmDeals)
      .where(eq(crmDeals.stage, 'closed_lost'));
    const [pipelineValue] = await db.select({
      total: sql<number>`COALESCE(SUM(${crmDeals.valueCents}), 0)::int`,
    }).from(crmDeals)
      .where(and(
        sql`${crmDeals.stage} != 'closed_won'`,
        sql`${crmDeals.stage} != 'closed_lost'`,
      ));
    const overdueTasks = await this.getOverdueTasks();
    const [activitiesThisWeek] = await db.select({ count: count() }).from(crmActivities)
      .where(gte(crmActivities.createdAt, weekAgo));

    return {
      totalContacts: totalContacts.count,
      totalDeals: totalDeals.count,
      openDeals: openDeals.count,
      wonDeals: wonDeals.count,
      lostDeals: lostDeals.count,
      totalPipelineValueCents: pipelineValue.total,
      overdueTasks: overdueTasks.length,
      activitiesThisWeek: activitiesThisWeek.count,
    };
  }
}

export const crmRepository = new CrmRepository();
