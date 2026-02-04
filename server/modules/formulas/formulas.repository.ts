import { eq, desc, and, isNull, isNotNull, gte, lte } from "drizzle-orm";
import { db } from "../../infra/db/db";
import {
    formulas,
    formulaVersionChanges,
    reviewSchedules,
    users,
    type Formula,
    type InsertFormula,
    type FormulaVersionChange,
    type InsertFormulaVersionChange,
    type ReviewSchedule,
    type InsertReviewSchedule,
    type User
} from "@shared/schema";

type FormulaIngredientPayload = {
    ingredient: string;
    amount: number;
    unit: string;
    purpose?: string;
};

type FormulaCustomizationItemPayload = {
    ingredient: string;
    amount: number;
    unit: string;
};

type FormulaCustomizationPayload = {
    addedBases?: FormulaCustomizationItemPayload[];
    addedIndividuals?: FormulaCustomizationItemPayload[];
};

type DbInsertFormula = typeof formulas.$inferInsert;

function normalizeFormulaCustomizations(customizations?: { addedBases?: any[]; addedIndividuals?: any[] }): FormulaCustomizationPayload | undefined {
    const normalizeItem = (item: any): FormulaCustomizationItemPayload => ({
        ingredient: typeof item?.ingredient === 'string' ? item.ingredient : 'unknown',
        amount: typeof item?.amount === 'number' ? item.amount : Number(item?.amount) || 0,
        unit: typeof item?.unit === 'string' ? item.unit : 'mg'
    });

    const result: FormulaCustomizationPayload = {};

    const mapItems = (items?: any[]): FormulaCustomizationItemPayload[] | undefined => {
        if (!Array.isArray(items) || items.length === 0) {
            return undefined;
        }
        const normalized: FormulaCustomizationItemPayload[] = items.map(item => normalizeItem(item));
        return normalized;
    };

    const addedBases = mapItems(customizations?.addedBases);
    if (addedBases) {
        result.addedBases = addedBases;
    }

    const addedIndividuals = mapItems(customizations?.addedIndividuals);
    if (addedIndividuals) {
        result.addedIndividuals = addedIndividuals;
    }

    return Object.keys(result).length > 0 ? result : undefined;
}

function normalizeFormulaInsertPayload(formula: InsertFormula): InsertFormula {
    const normalizeIngredient = (item: any): FormulaIngredientPayload => ({
        ingredient: typeof item?.ingredient === 'string' ? item.ingredient : 'unknown',
        amount: typeof item?.amount === 'number' ? item.amount : Number(item?.amount) || 0,
        unit: typeof item?.unit === 'string' ? item.unit : 'mg',
        purpose: typeof item?.purpose === 'string' ? item.purpose : undefined
    });

    const normalizedBases = Array.isArray(formula.bases)
        ? formula.bases.map<FormulaIngredientPayload>(normalizeIngredient)
        : [];
    const normalizedAdditions = Array.isArray(formula.additions)
        ? formula.additions.map<FormulaIngredientPayload>(normalizeIngredient)
        : [];
    const normalizedCustomizations = formula.userCustomizations ? normalizeFormulaCustomizations(formula.userCustomizations as any) : undefined;

    return {
        ...formula,
        bases: normalizedBases as InsertFormula['bases'],
        additions: normalizedAdditions as InsertFormula['additions'],
        userCustomizations: (normalizedCustomizations ?? undefined) as InsertFormula['userCustomizations']
    };
}

function normalizeFormulaIngredients(list?: any[]): FormulaIngredientPayload[] | undefined {
    if (!Array.isArray(list)) {
        return undefined;
    }

    return list.map<FormulaIngredientPayload>(item => ({
        ingredient: typeof item?.ingredient === 'string' ? item.ingredient : 'unknown',
        amount: typeof item?.amount === 'number' ? item.amount : Number(item?.amount) || 0,
        unit: typeof item?.unit === 'string' ? item.unit : 'mg',
        purpose: typeof item?.purpose === 'string' ? item.purpose : undefined
    }));
}

export class FormulasRepository {
    async getFormula(id: string): Promise<Formula | undefined> {
        try {
            const [formula] = await db.select().from(formulas).where(eq(formulas.id, id));
            return formula || undefined;
        } catch (error) {
            console.error('Error getting formula:', error);
            return undefined;
        }
    }

    async createFormula(insertFormula: InsertFormula): Promise<Formula> {
        try {
            const normalizedFormula = normalizeFormulaInsertPayload(insertFormula);
            const [formula] = await db.insert(formulas).values(normalizedFormula as DbInsertFormula).returning();
            return formula;
        } catch (error) {
            console.error('Error creating formula:', error);
            throw new Error('Failed to create formula');
        }
    }

    async getCurrentFormulaByUser(userId: string): Promise<Formula | undefined> {
        try {
            const [formula] = await db
                .select()
                .from(formulas)
                .where(and(eq(formulas.userId, userId), isNull(formulas.archivedAt)))
                .orderBy(desc(formulas.createdAt))
                .limit(1);
            return formula || undefined;
        } catch (error) {
            console.error('Error getting current formula by user:', error);
            return undefined;
        }
    }

    async getActiveFormulasByUser(userId: string): Promise<Formula[]> {
        try {
            return await db
                .select()
                .from(formulas)
                .where(and(eq(formulas.userId, userId), isNull(formulas.archivedAt)))
                .orderBy(desc(formulas.createdAt));
        } catch (error) {
            console.error('Error getting active formulas by user:', error);
            return [];
        }
    }

    async getFormulaHistory(userId: string, includeArchived: boolean = false): Promise<Formula[]> {
        try {
            const whereClause = includeArchived
                ? eq(formulas.userId, userId)
                : and(eq(formulas.userId, userId), isNull(formulas.archivedAt));
            return await db
                .select()
                .from(formulas)
                .where(whereClause)
                .orderBy(desc(formulas.createdAt));
        } catch (error) {
            console.error('Error getting formula history:', error);
            return [];
        }
    }

    async getArchivedFormulas(userId: string): Promise<Formula[]> {
        try {
            return await db
                .select()
                .from(formulas)
                .where(and(eq(formulas.userId, userId), isNotNull(formulas.archivedAt)))
                .orderBy(desc(formulas.archivedAt));
        } catch (error) {
            console.error('Error getting archived formulas:', error);
            return [];
        }
    }

    async archiveFormula(formulaId: string): Promise<Formula> {
        try {
            const [formula] = await db
                .update(formulas)
                .set({ archivedAt: new Date() })
                .where(eq(formulas.id, formulaId))
                .returning();
            if (!formula) {
                throw new Error('Formula not found');
            }
            return formula;
        } catch (error) {
            console.error('Error archiving formula:', error);
            throw new Error('Failed to archive formula');
        }
    }

    async restoreFormula(formulaId: string): Promise<Formula> {
        try {
            const [formula] = await db
                .update(formulas)
                .set({ archivedAt: null })
                .where(eq(formulas.id, formulaId))
                .returning();
            if (!formula) {
                throw new Error('Formula not found');
            }
            return formula;
        } catch (error) {
            console.error('Error restoring formula:', error);
            throw new Error('Failed to restore formula');
        }
    }

    async getFormulaByUserAndVersion(userId: string, version: number): Promise<Formula | undefined> {
        try {
            const [formula] = await db
                .select()
                .from(formulas)
                .where(and(eq(formulas.userId, userId), eq(formulas.version, version)))
                .limit(1);
            return formula || undefined;
        } catch (error) {
            console.error('Error getting formula by user and version:', error);
            return undefined;
        }
    }

    async updateFormulaVersion(userId: string, updates: Partial<InsertFormula>): Promise<Formula> {
        try {
            const [current] = await db
                .select({ id: formulas.id })
                .from(formulas)
                .where(eq(formulas.userId, userId))
                .orderBy(desc(formulas.createdAt))
                .limit(1);

            if (!current) {
                throw new Error('No formula found for user');
            }

            const sanitizedUpdates: Partial<InsertFormula> = { ...updates };
            const normalizedBases = normalizeFormulaIngredients(updates.bases as any);
            const normalizedAdditions = normalizeFormulaIngredients(updates.additions as any);
            if (normalizedBases) {
                sanitizedUpdates.bases = normalizedBases as InsertFormula['bases'];
            }
            if (normalizedAdditions) {
                sanitizedUpdates.additions = normalizedAdditions as InsertFormula['additions'];
            }
            if (updates.userCustomizations) {
                sanitizedUpdates.userCustomizations = normalizeFormulaCustomizations(updates.userCustomizations as any) as InsertFormula['userCustomizations'];
            }

            const [updated] = await db
                .update(formulas)
                .set(sanitizedUpdates as any)
                .where(eq(formulas.id, current.id))
                .returning();

            if (!updated) {
                throw new Error('Failed to update formula');
            }

            return updated;
        } catch (error) {
            console.error('Error updating formula version:', error);
            throw new Error('Failed to update formula');
        }
    }

    async updateFormulaCustomizations(formulaId: string, customizations: { addedBases?: any[]; addedIndividuals?: any[] }, newTotalMg: number): Promise<Formula> {
        try {
            const formulaUpdates: Partial<InsertFormula> = {
                userCustomizations: normalizeFormulaCustomizations(customizations) as InsertFormula['userCustomizations'],
                totalMg: newTotalMg
            };

            const [updated] = await db
                .update(formulas)
                .set(formulaUpdates as any)
                .where(eq(formulas.id, formulaId))
                .returning();

            if (!updated) {
                throw new Error('Formula not found');
            }

            return updated;
        } catch (error) {
            console.error('Error updating formula customizations:', error);
            throw new Error('Failed to update formula customizations');
        }
    }

    async updateFormulaName(formulaId: string, name: string): Promise<Formula> {
        try {
            const [updated] = await db
                .update(formulas)
                .set({ name: name.trim() })
                .where(eq(formulas.id, formulaId))
                .returning();

            if (!updated) {
                throw new Error('Formula not found');
            }

            return updated;
        } catch (error) {
            console.error('Error updating formula name:', error);
            throw new Error('Failed to update formula name');
        }
    }

    // Formula Version Change operations
    async createFormulaVersionChange(insertChange: InsertFormulaVersionChange): Promise<FormulaVersionChange> {
        try {
            const [change] = await db.insert(formulaVersionChanges).values(insertChange).returning();
            return change;
        } catch (error) {
            console.error('Error creating formula version change:', error);
            throw new Error('Failed to create formula version change');
        }
    }

    async listFormulaVersionChanges(formulaId: string): Promise<FormulaVersionChange[]> {
        try {
            return await db
                .select()
                .from(formulaVersionChanges)
                .where(eq(formulaVersionChanges.formulaId, formulaId))
                .orderBy(desc(formulaVersionChanges.createdAt));
        } catch (error) {
            console.error('Error listing formula version changes:', error);
            return [];
        }
    }

    // Review schedule operations
    async getReviewSchedule(userId: string, formulaId: string): Promise<ReviewSchedule | undefined> {
        try {
            const [schedule] = await db
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
            console.error('Error fetching review schedule:', error);
            return undefined;
        }
    }

    async createReviewSchedule(schedule: InsertReviewSchedule): Promise<ReviewSchedule> {
        try {
            const [created] = await db.insert(reviewSchedules).values(schedule).returning();
            return created;
        } catch (error) {
            console.error('Error creating review schedule:', error);
            throw new Error('Failed to create review schedule');
        }
    }

    async updateReviewSchedule(id: string, updates: Partial<InsertReviewSchedule>): Promise<ReviewSchedule | undefined> {
        try {
            const [updated] = await db
                .update(reviewSchedules)
                .set({
                    ...updates,
                    updatedAt: new Date()
                })
                .where(eq(reviewSchedules.id, id))
                .returning();
            return updated || undefined;
        } catch (error) {
            console.error('Error updating review schedule:', error);
            return undefined;
        }
    }

    async deleteReviewSchedule(id: string): Promise<boolean> {
        try {
            const result = await db
                .update(reviewSchedules)
                .set({ isActive: false, updatedAt: new Date() })
                .where(eq(reviewSchedules.id, id));
            return (result.rowCount ?? 0) > 0;
        } catch (error) {
            console.error('Error deleting review schedule:', error);
            return false;
        }
    }

    async getActiveReviewSchedules(): Promise<ReviewSchedule[]> {
        try {
            return await db
                .select()
                .from(reviewSchedules)
                .where(eq(reviewSchedules.isActive, true))
                .orderBy(reviewSchedules.nextReviewDate);
        } catch (error) {
            console.error('Error fetching active review schedules:', error);
            return [];
        }
    }

    async getUpcomingReviews(daysAhead: number): Promise<ReviewSchedule[]> {
        try {
            const now = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + daysAhead);

            return await db
                .select()
                .from(reviewSchedules)
                .where(and(
                    eq(reviewSchedules.isActive, true),
                    gte(reviewSchedules.nextReviewDate, now),
                    lte(reviewSchedules.nextReviewDate, endDate)
                ))
                .orderBy(reviewSchedules.nextReviewDate);
        } catch (error) {
            console.error('Error fetching upcoming review schedules:', error);
            return [];
        }
    }

    // User related helper (moved to repository to maintain clean separation if needed)
    async getUserById(id: string): Promise<User | undefined> {
        try {
            const [user] = await db.select().from(users).where(eq(users.id, id));
            return user || undefined;
        } catch (error) {
            console.error('Error getting user:', error);
            return undefined;
        }
    }
}

export const formulasRepository = new FormulasRepository();
