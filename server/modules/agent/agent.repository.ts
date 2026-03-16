/**
 * Agent Repository — CRUD for outreach prospects, pitches, and agent runs
 */
import { db } from '../../infra/db/db';
import {
  outreachProspects, outreachPitches, agentRuns, appSettings,
  type InsertOutreachProspect, type InsertOutreachPitch,
  type OutreachProspect, type OutreachPitch, type AgentRun,
} from '@shared/schema';
import { eq, desc, and, or, inArray, sql, count, isNull, gte, lte } from 'drizzle-orm';
import logger from '../../infra/logging/logger';

class AgentRepository {

  // ── Prospects ────────────────────────────────────────────────────────

  async createProspect(data: InsertOutreachProspect): Promise<OutreachProspect> {
    const values = { ...data, topics: data.topics ? [...data.topics] : undefined };
    const [prospect] = await db.insert(outreachProspects).values(values as any).returning();
    return prospect;
  }

  async createProspects(data: InsertOutreachProspect[]): Promise<OutreachProspect[]> {
    if (data.length === 0) return [];
    const values = data.map(d => ({ ...d, topics: d.topics ? [...d.topics] : undefined }));
    // Use onConflictDoNothing on normalizedUrl unique constraint as a DB-level safety net
    const prospects = await db.insert(outreachProspects)
      .values(values as any)
      .onConflictDoNothing({ target: outreachProspects.normalizedUrl })
      .returning();
    return prospects;
  }

  async getProspectByUrl(url: string): Promise<OutreachProspect | null> {
    const [prospect] = await db.select().from(outreachProspects).where(eq(outreachProspects.url, url)).limit(1);
    return prospect || null;
  }

  async getProspectById(id: string): Promise<OutreachProspect | null> {
    const [prospect] = await db.select().from(outreachProspects).where(eq(outreachProspects.id, id)).limit(1);
    return prospect || null;
  }

  async listProspects(filters: {
    category?: 'podcast' | 'press';
    status?: string;
    minScore?: number;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ prospects: OutreachProspect[]; total: number }> {
    const conditions = [];
    if (filters.category) conditions.push(eq(outreachProspects.category, filters.category));
    if (filters.status) conditions.push(eq(outreachProspects.status, filters.status as any));
    if (filters.minScore) conditions.push(sql`${outreachProspects.relevanceScore} >= ${filters.minScore}`);

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db.select({ count: count() }).from(outreachProspects).where(where);
    const prospects = await db.select().from(outreachProspects)
      .where(where)
      .orderBy(desc(outreachProspects.relevanceScore))
      .limit(filters.limit || 50)
      .offset(filters.offset || 0);

    return { prospects, total: totalResult.count };
  }

  async updateProspectStatus(id: string, status: OutreachProspect['status']): Promise<void> {
    await db.update(outreachProspects).set({ status }).where(eq(outreachProspects.id, id));
  }

  async updateProspect(id: string, data: Partial<OutreachProspect>): Promise<void> {
    await db.update(outreachProspects).set(data).where(eq(outreachProspects.id, id));
  }

  async deleteProspect(id: string): Promise<void> {
    // Pitches cascade-delete via FK onDelete: 'cascade'
    await db.delete(outreachProspects).where(eq(outreachProspects.id, id));
  }

  /**
   * Check for existing prospects by normalized URL or normalized name.
   * Returns sets of both existing normalized URLs and names for comprehensive dedup.
   */
  async getExistingProspects(normalizedUrls: string[], normalizedNames: string[]): Promise<{
    existingUrls: Set<string>;
    existingNames: Set<string>;
  }> {
    const conditions = [];
    if (normalizedUrls.length > 0) {
      conditions.push(inArray(outreachProspects.normalizedUrl, normalizedUrls));
    }
    if (normalizedNames.length > 0) {
      conditions.push(inArray(outreachProspects.normalizedName, normalizedNames));
    }
    if (conditions.length === 0) return { existingUrls: new Set(), existingNames: new Set() };

    const existing = await db.select({
      normalizedUrl: outreachProspects.normalizedUrl,
      normalizedName: outreachProspects.normalizedName,
    })
      .from(outreachProspects)
      .where(or(...conditions));

    return {
      existingUrls: new Set(existing.map(e => e.normalizedUrl).filter(Boolean) as string[]),
      existingNames: new Set(existing.map(e => e.normalizedName).filter(Boolean) as string[]),
    };
  }

  /** @deprecated Use getExistingProspects instead */
  async getExistingUrls(urls: string[]): Promise<Set<string>> {
    if (urls.length === 0) return new Set();
    const existing = await db.select({ url: outreachProspects.url })
      .from(outreachProspects)
      .where(inArray(outreachProspects.url, urls));
    return new Set(existing.map(e => e.url));
  }

  // ── Pitches ──────────────────────────────────────────────────────────

  async createPitch(data: InsertOutreachPitch): Promise<OutreachPitch> {
    const values = {
      ...data,
      qualityFlags: data.qualityFlags ? (data.qualityFlags as string[]) : undefined,
    };
    const [pitch] = await db.insert(outreachPitches).values(values).returning();
    return pitch;
  }

  async getPitchById(id: string): Promise<OutreachPitch | null> {
    const [pitch] = await db.select().from(outreachPitches).where(eq(outreachPitches.id, id)).limit(1);
    return pitch || null;
  }

  async listPitches(filters: {
    category?: 'podcast' | 'press';
    status?: string;
    prospectId?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ pitches: OutreachPitch[]; total: number }> {
    const conditions = [];
    if (filters.category) conditions.push(eq(outreachPitches.category, filters.category));
    if (filters.status) conditions.push(eq(outreachPitches.status, filters.status as any));
    if (filters.prospectId) conditions.push(eq(outreachPitches.prospectId, filters.prospectId));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db.select({ count: count() }).from(outreachPitches).where(where);
    const pitches = await db.select().from(outreachPitches)
      .where(where)
      .orderBy(desc(outreachPitches.createdAt))
      .limit(filters.limit || 50)
      .offset(filters.offset || 0);

    return { pitches, total: totalResult.count };
  }

  async updatePitch(id: string, data: Partial<OutreachPitch>): Promise<void> {
    await db.update(outreachPitches).set(data).where(eq(outreachPitches.id, id));
  }

  async deletePitch(id: string): Promise<void> {
    await db.delete(outreachPitches).where(eq(outreachPitches.id, id));
  }

  async markPitchResponded(id: string): Promise<void> {
    await db.update(outreachPitches).set({
      responseReceived: true,
      responseAt: new Date(),
    }).where(eq(outreachPitches.id, id));
  }

  async getPitchesWithProspects(filters: {
    category?: 'podcast' | 'press';
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ pitch: OutreachPitch; prospect: OutreachProspect }[]> {
    const conditions = [];
    if (filters.category) conditions.push(eq(outreachPitches.category, filters.category));
    if (filters.status) conditions.push(eq(outreachPitches.status, filters.status as any));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db.select({
      pitch: outreachPitches,
      prospect: outreachProspects,
    })
      .from(outreachPitches)
      .innerJoin(outreachProspects, eq(outreachPitches.prospectId, outreachProspects.id))
      .where(where)
      .orderBy(desc(outreachPitches.createdAt))
      .limit(filters.limit || 50)
      .offset(filters.offset || 0);

    return results;
  }

  async getPendingFollowUps(): Promise<{ pitch: OutreachPitch; prospect: OutreachProspect }[]> {
    const now = new Date();
    const results = await db.select({
      pitch: outreachPitches,
      prospect: outreachProspects,
    })
      .from(outreachPitches)
      .innerJoin(outreachProspects, eq(outreachPitches.prospectId, outreachProspects.id))
      .where(and(
        eq(outreachPitches.status, 'sent'),
        eq(outreachPitches.responseReceived, false),
        lte(outreachPitches.followUpDueAt, now),
      ))
      .orderBy(outreachPitches.followUpDueAt);

    return results;
  }

  // ── Agent Runs ───────────────────────────────────────────────────────

  async createRun(data: { agentName: string; status: 'running'; runLog?: any[] }): Promise<string> {
    const [run] = await db.insert(agentRuns).values({
      agentName: data.agentName,
      status: data.status,
      runLog: data.runLog || [],
    }).returning({ id: agentRuns.id });
    return run.id;
  }

  async updateRun(id: string, data: Partial<AgentRun>): Promise<void> {
    await db.update(agentRuns).set(data).where(eq(agentRuns.id, id));
  }

  async getLatestRuns(agentName?: string, limit = 20): Promise<AgentRun[]> {
    const conditions = agentName ? eq(agentRuns.agentName, agentName) : undefined;
    return db.select().from(agentRuns)
      .where(conditions)
      .orderBy(desc(agentRuns.startedAt))
      .limit(limit);
  }

  async getRunById(id: string): Promise<AgentRun | null> {
    const [run] = await db.select().from(agentRuns).where(eq(agentRuns.id, id)).limit(1);
    return run || null;
  }

  // ── Config (app_settings) ────────────────────────────────────────────

  async getAgentConfig(key: string): Promise<Record<string, any> | null> {
    const [setting] = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
    return setting?.value || null;
  }

  async saveAgentConfig(key: string, value: Record<string, any>, updatedBy?: string): Promise<void> {
    await db.insert(appSettings)
      .values({ key, value, updatedAt: new Date(), updatedBy })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value, updatedAt: new Date(), updatedBy },
      });
  }

  // ── Stats ────────────────────────────────────────────────────────────

  async getStats(): Promise<{
    totalProspects: number;
    podcastProspects: number;
    pressProspects: number;
    pendingPitches: number;
    sentPitches: number;
    responses: number;
    booked: number;
    followUpsDue: number;
  }> {
    const [totalP] = await db.select({ count: count() }).from(outreachProspects);
    const [podcastP] = await db.select({ count: count() }).from(outreachProspects).where(eq(outreachProspects.category, 'podcast'));
    const [pressP] = await db.select({ count: count() }).from(outreachProspects).where(eq(outreachProspects.category, 'press'));
    const [pendingPitches] = await db.select({ count: count() }).from(outreachPitches).where(eq(outreachPitches.status, 'pending_review'));
    const [sentPitches] = await db.select({ count: count() }).from(outreachPitches).where(eq(outreachPitches.status, 'sent'));
    const [responses] = await db.select({ count: count() }).from(outreachPitches).where(eq(outreachPitches.responseReceived, true));
    const [booked] = await db.select({ count: count() }).from(outreachProspects).where(
      inArray(outreachProspects.status, ['booked', 'published'])
    );

    return {
      totalProspects: totalP.count,
      podcastProspects: podcastP.count,
      pressProspects: pressP.count,
      pendingPitches: pendingPitches.count,
      sentPitches: sentPitches.count,
      responses: responses.count,
      booked: booked.count,
      followUpsDue: 0, // Populated from getPendingFollowUps().length when needed
    };
  }

  async getStatsWithFollowUps() {
    const base = await this.getStats();
    const followUps = await this.getPendingFollowUps();
    return { ...base, followUpsDue: followUps.length };
  }
}

export const agentRepository = new AgentRepository();
