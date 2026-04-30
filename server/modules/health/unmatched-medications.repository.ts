/**
 * Repository for the `unmatched_medications` log.
 *
 * Every time the safety validator runs, any user-typed medication that
 * didn't match ANY keyword in ANY interaction category gets appended
 * here. The data is reviewed periodically (manually or by the future
 * platform-insights agent) to grow the keyword alias arrays in
 * safety-validator.ts. This is the feedback loop that keeps the
 * deterministic safety gate from silently degrading as new drugs launch
 * or users enter brand/compound/international names not yet covered.
 *
 * Writes are intentionally fire-and-forget from the caller's perspective —
 * a slow log insert must NEVER block formula generation or saving.
 */

import { db } from '../../infra/db/db';
import { unmatchedMedications, type UnmatchedMedication } from '@shared/schema';
import type { NormalizedMedication } from './medication-normalizer';
import { eq, desc, sql, isNull } from 'drizzle-orm';
import { logger } from '../../infra/logging/logger';

export interface LogUnmatchedInput {
  userId: string;
  rawInput: string;
  normalized?: NormalizedMedication | null;
  contextEvent?: string; // defaults to 'safety_validator'
}

class UnmatchedMedicationsRepository {
  /**
   * Log a single unmatched medication. Errors are caught and logged — this
   * function never throws, because the safety pipeline must keep running
   * even if the audit table is unavailable.
   */
  async log(input: LogUnmatchedInput): Promise<void> {
    try {
      await db.insert(unmatchedMedications).values({
        userId: input.userId,
        rawInput: input.rawInput,
        normalizedGeneric: input.normalized?.generic ?? null,
        normalizedClass: input.normalized?.drugClass ?? null,
        normalizedBrandFamily: input.normalized?.brandFamily ?? null,
        normalizationConfidence: input.normalized
          ? Math.round(input.normalized.confidence * 100)
          : null,
        contextEvent: input.contextEvent || 'safety_validator',
      });
    } catch (err) {
      logger.error('[unmatched-medications-repo] insert failed', { error: err, rawInput: input.rawInput });
    }
  }

  /** Bulk log helper — all rows logged in a single insert when possible. */
  async logMany(inputs: LogUnmatchedInput[]): Promise<void> {
    if (inputs.length === 0) return;
    try {
      await db.insert(unmatchedMedications).values(
        inputs.map(input => ({
          userId: input.userId,
          rawInput: input.rawInput,
          normalizedGeneric: input.normalized?.generic ?? null,
          normalizedClass: input.normalized?.drugClass ?? null,
          normalizedBrandFamily: input.normalized?.brandFamily ?? null,
          normalizationConfidence: input.normalized
            ? Math.round(input.normalized.confidence * 100)
            : null,
          contextEvent: input.contextEvent || 'safety_validator',
        }))
      );
    } catch (err) {
      logger.error('[unmatched-medications-repo] bulk insert failed', { error: err, count: inputs.length });
    }
  }

  /**
   * Fetch the most recent untriaged unmatched medications for admin review.
   * Grouped by raw input (case-insensitive) so the same medication typed by
   * many users appears once with a count.
   */
  async listUntriagedGrouped(limit = 100): Promise<Array<{
    rawInput: string;
    occurrences: number;
    distinctUsers: number;
    sampleNormalizedGeneric: string | null;
    sampleNormalizedClass: string | null;
    firstSeenAt: Date;
    lastSeenAt: Date;
  }>> {
    const rows = await db
      .select({
        rawInput: sql<string>`lower(${unmatchedMedications.rawInput})`,
        occurrences: sql<number>`count(*)::int`,
        distinctUsers: sql<number>`count(distinct ${unmatchedMedications.userId})::int`,
        sampleNormalizedGeneric: sql<string | null>`max(${unmatchedMedications.normalizedGeneric})`,
        sampleNormalizedClass: sql<string | null>`max(${unmatchedMedications.normalizedClass})`,
        firstSeenAt: sql<Date>`min(${unmatchedMedications.createdAt})`,
        lastSeenAt: sql<Date>`max(${unmatchedMedications.createdAt})`,
      })
      .from(unmatchedMedications)
      .where(isNull(unmatchedMedications.triagedAt))
      .groupBy(sql`lower(${unmatchedMedications.rawInput})`)
      .orderBy(desc(sql`count(*)`))
      .limit(limit);
    return rows;
  }

  /** Mark all rows matching a raw input (case-insensitive) as triaged. */
  async markTriaged(rawInputLower: string, note: string): Promise<number> {
    const result = await db
      .update(unmatchedMedications)
      .set({ triagedAt: new Date(), triageNote: note })
      .where(sql`lower(${unmatchedMedications.rawInput}) = ${rawInputLower}`);
    // pg driver returns rowCount on the result wrapper
    return (result as unknown as { rowCount?: number }).rowCount ?? 0;
  }

  /** Per-user history. Used for individual-account audits. */
  async listForUser(userId: string, limit = 50): Promise<UnmatchedMedication[]> {
    return await db
      .select()
      .from(unmatchedMedications)
      .where(eq(unmatchedMedications.userId, userId))
      .orderBy(desc(unmatchedMedications.createdAt))
      .limit(limit);
  }
}

export const unmatchedMedicationsRepository = new UnmatchedMedicationsRepository();
