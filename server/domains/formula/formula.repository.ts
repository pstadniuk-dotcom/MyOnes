
import { eq, desc, and, isNull, isNotNull } from "drizzle-orm";
import { db } from "../../infrastructure/database/db";
import {
    formulas, formulaVersionChanges,
    type Formula, type InsertFormula,
    type FormulaVersionChange, type InsertFormulaVersionChange
} from "@shared/schema";
import { BaseRepository } from "../../infrastructure/database/base.repository";
import { logger } from "../../infrastructure/logging/logger";

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

export class FormulaRepository extends BaseRepository<typeof formulas, Formula, InsertFormula> {
    constructor(db: any) {
        super(db, formulas, "FormulaRepository");
    }

    async getCurrentFormulaByUser(userId: string): Promise<Formula | undefined> {
        try {
            const [formula] = await this.db
                .select()
                .from(formulas)
                .where(and(eq(formulas.userId, userId), isNull(formulas.archivedAt)))
                .orderBy(desc(formulas.createdAt))
                .limit(1);
            return formula || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting current formula by user:`, error);
            throw error;
        }
    }

    async getActiveFormulasByUser(userId: string): Promise<Formula[]> {
        try {
            return await this.db
                .select()
                .from(formulas)
                .where(and(eq(formulas.userId, userId), isNull(formulas.archivedAt)))
                .orderBy(desc(formulas.createdAt));
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting active formulas by user:`, error);
            throw error;
        }
    }

    async getFormulaHistory(userId: string, includeArchived: boolean = false): Promise<Formula[]> {
        try {
            const whereClause = includeArchived
                ? eq(formulas.userId, userId)
                : and(eq(formulas.userId, userId), isNull(formulas.archivedAt));
            return await this.db
                .select()
                .from(formulas)
                .where(whereClause)
                .orderBy(desc(formulas.createdAt));
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting formula history:`, error);
            throw error;
        }
    }

    async getArchivedFormulas(userId: string): Promise<Formula[]> {
        try {
            return await this.db
                .select()
                .from(formulas)
                .where(and(eq(formulas.userId, userId), isNotNull(formulas.archivedAt)))
                .orderBy(desc(formulas.archivedAt));
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting archived formulas:`, error);
            throw error;
        }
    }

    async getFormulaByUserAndVersion(userId: string, version: number): Promise<Formula | undefined> {
        try {
            const [formula] = await this.db
                .select()
                .from(formulas)
                .where(and(eq(formulas.userId, userId), eq(formulas.version, version)))
                .limit(1);
            return formula || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting formula by user and version:`, error);
            throw error;
        }
    }

    async createFormula(insertFormula: InsertFormula): Promise<Formula> {
        try {
            const normalizedFormula = this.normalizeFormulaInsertPayload(insertFormula);
            const [formula] = await this.db.insert(formulas).values(normalizedFormula as any).returning();
            return formula;
        } catch (error) {
            logger.error(`[${this.domainName}] Error creating formula:`, error);
            throw error;
        }
    }

    async archiveFormula(formulaId: string): Promise<Formula> {
        try {
            const [formula] = await this.db
                .update(formulas)
                .set({ archivedAt: new Date() })
                .where(eq(formulas.id, formulaId))
                .returning();
            if (!formula) throw new Error('Formula not found');
            return formula;
        } catch (error) {
            logger.error(`[${this.domainName}] Error archiving formula:`, error);
            throw error;
        }
    }

    async restoreFormula(formulaId: string): Promise<Formula> {
        try {
            const [formula] = await this.db
                .update(formulas)
                .set({ archivedAt: null })
                .where(eq(formulas.id, formulaId))
                .returning();
            if (!formula) throw new Error('Formula not found');
            return formula;
        } catch (error) {
            logger.error(`[${this.domainName}] Error restoring formula:`, error);
            throw error;
        }
    }

    // --- Version Change Operations ---

    async createFormulaVersionChange(insertChange: InsertFormulaVersionChange): Promise<FormulaVersionChange> {
        try {
            const [change] = await this.db.insert(formulaVersionChanges).values(insertChange).returning();
            return change;
        } catch (error) {
            logger.error(`[${this.domainName}] Error creating formula version change:`, error);
            throw error;
        }
    }

    async listFormulaVersionChanges(formulaId: string): Promise<FormulaVersionChange[]> {
        try {
            return await this.db
                .select()
                .from(formulaVersionChanges)
                .where(eq(formulaVersionChanges.formulaId, formulaId))
                .orderBy(desc(formulaVersionChanges.createdAt));
        } catch (error) {
            logger.error(`[${this.domainName}] Error listing formula version changes:`, error);
            throw error;
        }
    }

    // --- Normalization Helpers ---

    private normalizeFormulaInsertPayload(formula: InsertFormula): InsertFormula {
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
        const normalizedCustomizations = formula.userCustomizations ? this.normalizeFormulaCustomizations(formula.userCustomizations as any) : undefined;

        return {
            ...formula,
            bases: normalizedBases as InsertFormula['bases'],
            additions: normalizedAdditions as InsertFormula['additions'],
            userCustomizations: (normalizedCustomizations ?? undefined) as InsertFormula['userCustomizations']
        };
    }

    private normalizeFormulaCustomizations(customizations?: { addedBases?: any[]; addedIndividuals?: any[] }): FormulaCustomizationPayload | undefined {
        const normalizeItem = (item: any): FormulaCustomizationItemPayload => ({
            ingredient: typeof item?.ingredient === 'string' ? item.ingredient : 'unknown',
            amount: typeof item?.amount === 'number' ? item.amount : Number(item?.amount) || 0,
            unit: typeof item?.unit === 'string' ? item.unit : 'mg'
        });

        const result: FormulaCustomizationPayload = {};

        const mapItems = (items?: any[]): FormulaCustomizationItemPayload[] | undefined => {
            if (!Array.isArray(items) || items.length === 0) return undefined;
            return items.map(item => normalizeItem(item));
        };

        const addedBases = mapItems(customizations?.addedBases);
        if (addedBases) result.addedBases = addedBases;

        const addedIndividuals = mapItems(customizations?.addedIndividuals);
        if (addedIndividuals) result.addedIndividuals = addedIndividuals;

        return Object.keys(result).length > 0 ? result : undefined;
    }
}
