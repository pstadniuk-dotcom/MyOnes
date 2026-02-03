
import { FormulaRepository } from "./formula.repository";
import { Formula, InsertFormula, FormulaVersionChange, InsertFormulaVersionChange, ReviewSchedule, InsertReviewSchedule } from "@shared/schema";
import { db } from "../../infrastructure/database/db";

export class FormulaService {
    private repository: FormulaRepository;

    constructor() {
        this.repository = new FormulaRepository(db);
    }

    async getFormula(id: string): Promise<Formula | undefined> {
        return this.repository.findById(id);
    }

    async createFormula(data: InsertFormula): Promise<Formula> {
        return this.repository.create(data);
    }

    async getCurrentFormulaByUser(userId: string): Promise<Formula | undefined> {
        return this.repository.getCurrentFormulaByUser(userId);
    }

    async getActiveFormulasByUser(userId: string): Promise<Formula[]> {
        return this.repository.getActiveFormulasByUser(userId);
    }

    async getFormulaHistory(userId: string, includeArchived: boolean = false): Promise<Formula[]> {
        return this.repository.getFormulaHistory(userId, includeArchived);
    }

    async getArchivedFormulas(userId: string): Promise<Formula[]> {
        return this.repository.getArchivedFormulas(userId);
    }

    async archiveFormula(id: string): Promise<Formula> {
        return this.repository.archive(id);
    }

    async restoreFormula(id: string): Promise<Formula> {
        return this.repository.restore(id);
    }

    async getFormulaByUserAndVersion(userId: string, version: number): Promise<Formula | undefined> {
        return this.repository.getFormulaByUserAndVersion(userId, version);
    }

    async createFormulaVersionChange(data: InsertFormulaVersionChange): Promise<FormulaVersionChange> {
        return this.repository.createVersionChange(data);
    }

    async listFormulaVersionChanges(formulaId: string): Promise<FormulaVersionChange[]> {
        return this.repository.listVersionChanges(formulaId);
    }

    async updateFormulaName(id: string, name: string): Promise<Formula> {
        return this.repository.updateName(id, name);
    }

    async updateFormulaCustomizations(id: string, customizations: any, newTotalMg: number): Promise<Formula> {
        return this.repository.updateCustomizations(id, customizations, newTotalMg);
    }

    async getFormulaInsights(): Promise<{ totalFormulas: number; activeFormulas: number; avgMgPerFormula: number }> {
        return this.repository.getInsights();
    }

    async getReviewSchedule(userId: string, formulaId: string): Promise<ReviewSchedule | undefined> {
        return this.repository.getReviewSchedule(userId, formulaId);
    }

    async createReviewSchedule(schedule: InsertReviewSchedule): Promise<ReviewSchedule> {
        return this.repository.createReviewSchedule(schedule);
    }

    async updateReviewSchedule(id: string, updates: Partial<InsertReviewSchedule>): Promise<ReviewSchedule | undefined> {
        return this.repository.updateReviewSchedule(id, updates);
    }

    async deleteReviewSchedule(id: string): Promise<boolean> {
        return this.repository.deleteReviewSchedule(id);
    }

    async getUpcomingReviews(userId: string, daysAhead: number): Promise<ReviewSchedule[]> {
        return this.repository.getUpcomingReviews(userId, daysAhead);
    }
}

export const formulaService = new FormulaService();
