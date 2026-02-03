
import { eq, desc, and, isNull, isNotNull, or, ilike, sql, count, inArray, gte, lte } from "drizzle-orm";
import { formulas, formulaVersionChanges, reviewSchedules, type Formula, type InsertFormula, type FormulaVersionChange, type InsertFormulaVersionChange, type ReviewSchedule, type InsertReviewSchedule } from "@shared/schema";
import { BaseRepository } from "../../infrastructure/database/base.repository";
import { logger } from "../../infrastructure/logging/logger";
import { normalizeFormulaInsertPayload } from "../../optimize-normalizer";

// Define a type for DB insertion that matches Drizzle's expectations
type DbInsertFormula = typeof formulas.$inferInsert;

export class FormulaRepository extends BaseRepository<typeof formulas, Formula, InsertFormula> {
    constructor(db: any) {
        super(db, formulas, "FormulaRepository");
    }

    /**
     * Get current active formula for a user
     */
    async getCurrentFormulaByUser(userId: string): Promise<Formula | undefined> {
        try {
            const [formula] = await this.db
                .select()
                .from(this.table)
                .where(and(eq(this.table.userId, userId), isNull(this.table.archivedAt)))
                .orderBy(desc(this.table.createdAt))
                .limit(1);
            return formula || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting current formula by user:`, error);
            return undefined;
        }
    }

    /**
     * Get all active formulas for a user
     */
    async getActiveFormulasByUser(userId: string): Promise<Formula[]> {
        try {
            return await this.db
                .select()
                .from(this.table)
                .where(and(eq(this.table.userId, userId), isNull(this.table.archivedAt)))
                .orderBy(desc(this.table.createdAt));
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting active formulas by user:`, error);
            return [];
        }
    }

    /**
     * Get formula history for a user
     */
    async getFormulaHistory(userId: string, includeArchived: boolean = false): Promise<Formula[]> {
        try {
            const whereClause = includeArchived
                ? eq(this.table.userId, userId)
                : and(eq(this.table.userId, userId), isNull(this.table.archivedAt));
            return await this.db
                .select()
                .from(this.table)
                .where(whereClause)
                .orderBy(desc(this.table.createdAt));
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting formula history:`, error);
            return [];
        }
    }

    /**
     * Get archived formulas for a user
     */
    async getArchivedFormulas(userId: string): Promise<Formula[]> {
        try {
            return await this.db
                .select()
                .from(this.table)
                .where(and(eq(this.table.userId, userId), isNotNull(this.table.archivedAt)))
                .orderBy(desc(this.table.archivedAt));
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting archived formulas:`, error);
            return [];
        }
    }

    /**
     * Create a new formula
     * Overrides base create to handle specific normalization logic
     */
    async create(data: InsertFormula): Promise<Formula> {
        try {
            // Data is now pre-validated by Zod schemas at the API route level
            const normalizedFormula = normalizeFormulaInsertPayload(data);
            // @ts-ignore - Drizzle types can be tricky
            const dbPayload = normalizedFormula as DbInsertFormula;

            const [formula] = await this.db.insert(this.table).values(dbPayload).returning();
            return formula;
        } catch (error) {
            logger.error(`[${this.domainName}] Error creating formula:`, error);
            throw error;
        }
    }

    /**
     * Archive a formula
     */
    async archive(id: string): Promise<Formula> {
        try {
            // @ts-ignore
            const [formula] = await this.db
                .update(this.table)
                .set({ archivedAt: new Date() })
                .where(eq(this.table.id, id))
                .returning();

            if (!formula) {
                throw new Error('Formula not found');
            }
            return formula;
        } catch (error) {
            logger.error(`[${this.domainName}] Error archiving formula:`, error);
            throw error;
        }
    }

    /**
     * Restore an archived formula
     */
    async restore(id: string): Promise<Formula> {
        try {
            // @ts-ignore
            const [formula] = await this.db
                .update(this.table)
                .set({ archivedAt: null })
                .where(eq(this.table.id, id))
                .returning();

            if (!formula) {
                throw new Error('Formula not found');
            }
            return formula;
        } catch (error) {
            logger.error(`[${this.domainName}] Error restoring formula:`, error);
            throw error;
        }
    }

    /**
     * Get formula by user and version
     */
    async getFormulaByUserAndVersion(userId: string, version: number): Promise<Formula | undefined> {
        try {
            const [formula] = await this.db
                .select()
                .from(this.table)
                .where(and(eq(this.table.userId, userId), eq(this.table.version, version)))
                .limit(1);
            return formula || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting formula by user and version:`, error);
            return undefined;
        }
    }

    /**
     * Create formula version change record
     */
    async createVersionChange(insertChange: InsertFormulaVersionChange): Promise<FormulaVersionChange> {
        try {
            const [change] = await this.db.insert(formulaVersionChanges).values(insertChange).returning();
            return change;
        } catch (error) {
            logger.error(`[${this.domainName}] Error creating formula version change:`, error);
            throw error;
        }
    }

    /**
     * List version changes for a formula
     */
    async listVersionChanges(formulaId: string): Promise<FormulaVersionChange[]> {
        try {
            return await this.db
                .select()
                .from(formulaVersionChanges)
                .where(eq(formulaVersionChanges.formulaId, formulaId))
                .orderBy(desc(formulaVersionChanges.createdAt));
        } catch (error) {
            logger.error(`[${this.domainName}] Error listing formula version changes:`, error);
            return [];
        }
    }

    /**
     * Update formula name
     */
    async updateName(id: string, name: string): Promise<Formula> {
        try {
            const [formula] = await this.db
                .update(this.table)
                .set({ name })
                .where(eq(this.table.id, id))
                .returning();

            if (!formula) throw new Error('Formula not found');
            return formula;
        } catch (error) {
            logger.error(`[${this.domainName}] Error updating formula name:`, error);
            throw error;
        }
    }

    /**
     * Update formula customizations
     */
    async updateCustomizations(id: string, customizations: any, newTotalMg: number): Promise<Formula> {
        try {
            const [formula] = await this.db
                .update(this.table)
                .set({
                    userCustomizations: customizations,
                    totalMg: newTotalMg,
                    version: sql`${this.table.version} + 1`
                })
                .where(eq(this.table.id, id))
                .returning();

            if (!formula) throw new Error('Formula not found');
            return formula;
        } catch (error) {
            logger.error(`[${this.domainName}] Error updating formula customizations:`, error);
            throw error;
        }
    }

    /**
     * Get formula insights (Admin)
     */
    async getInsights(): Promise<{ totalFormulas: number; activeFormulas: number; avgMgPerFormula: number }> {
        try {
            const [stats] = await this.db
                .select({
                    count: count(),
                    activeCount: sql<number>`sum(case when ${this.table.archivedAt} is null then 1 else 0 end)`,
                    avgMg: sql<number>`avg(${this.table.totalMg})`
                })
                .from(this.table);

            return {
                totalFormulas: Number(stats?.count || 0),
                activeFormulas: Number(stats?.activeCount || 0),
                avgMgPerFormula: Number(stats?.avgMg || 0)
            };
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting formula insights:`, error);
            return { totalFormulas: 0, activeFormulas: 0, avgMgPerFormula: 0 };
        }
    }

    // Review Schedule Operations

    async getReviewSchedule(userId: string, formulaId: string): Promise<ReviewSchedule | undefined> {
        try {
            const [schedule] = await this.db
                .select()
                .from(reviewSchedules)
                .where(and(
                    eq(reviewSchedules.userId, userId),
                    eq(reviewSchedules.formulaId, formulaId),
                    eq(reviewSchedules.isActive, true)
                ))
                .limit(1);
            return schedule || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error fetching review schedule:`, error);
            return undefined;
        }
    }

    async createReviewSchedule(schedule: InsertReviewSchedule): Promise<ReviewSchedule> {
        try {
            const [created] = await this.db.insert(reviewSchedules).values(schedule).returning();
            return created;
        } catch (error) {
            logger.error(`[${this.domainName}] Error creating review schedule:`, error);
            throw error;
        }
    }

    async updateReviewSchedule(id: string, updates: Partial<InsertReviewSchedule>): Promise<ReviewSchedule | undefined> {
        try {
            const [updated] = await this.db
                .update(reviewSchedules)
                .set({
                    ...updates,
                    updatedAt: new Date()
                })
                .where(eq(reviewSchedules.id, id))
                .returning();
            return updated || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error updating review schedule:`, error);
            return undefined;
        }
    }

    async deleteReviewSchedule(id: string): Promise<boolean> {
        try {
            const result = await this.db
                .update(reviewSchedules)
                .set({ isActive: false, updatedAt: new Date() })
                .where(eq(reviewSchedules.id, id));
            return (result.rowCount ?? 0) > 0;
        } catch (error) {
            logger.error(`[${this.domainName}] Error deleting review schedule:`, error);
            return false;
        }
    }

    async getUpcomingReviews(userId: string, daysAhead: number): Promise<ReviewSchedule[]> {
        try {
            const now = new Date();
            const future = new Date();
            future.setDate(now.getDate() + daysAhead);

            return await this.db
                .select()
                .from(reviewSchedules)
                .where(and(
                    eq(reviewSchedules.userId, userId),
                    gte(reviewSchedules.nextReviewDate, now),
                    lte(reviewSchedules.nextReviewDate, future),
                    eq(reviewSchedules.isActive, true)
                ))
                .orderBy(reviewSchedules.nextReviewDate);
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting upcoming reviews:`, error);
            return [];
        }
    }
}
