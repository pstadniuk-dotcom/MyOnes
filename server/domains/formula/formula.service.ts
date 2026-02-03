
import { FormulaRepository } from "./formula.repository";
import { type Formula, type InsertFormula, type FormulaVersionChange, type InsertFormulaVersionChange } from "@shared/schema";

export class FormulaService {
    constructor(private formulaRepository: FormulaRepository) { }

    async getFormula(id: string): Promise<Formula | undefined> {
        return this.formulaRepository.findById(id);
    }

    async createFormula(insertFormula: InsertFormula): Promise<Formula> {
        return this.formulaRepository.createFormula(insertFormula);
    }

    async getCurrentFormulaByUser(userId: string): Promise<Formula | undefined> {
        return this.formulaRepository.getCurrentFormulaByUser(userId);
    }

    async getActiveFormulasByUser(userId: string): Promise<Formula[]> {
        return this.formulaRepository.getActiveFormulasByUser(userId);
    }

    async getFormulaHistory(userId: string, includeArchived?: boolean): Promise<Formula[]> {
        return this.formulaRepository.getFormulaHistory(userId, includeArchived);
    }

    async getArchivedFormulas(userId: string): Promise<Formula[]> {
        return this.formulaRepository.getArchivedFormulas(userId);
    }

    async getFormulaByUserAndVersion(userId: string, version: number): Promise<Formula | undefined> {
        return this.formulaRepository.getFormulaByUserAndVersion(userId, version);
    }

    async archiveFormula(formulaId: string): Promise<Formula> {
        return this.formulaRepository.archiveFormula(formulaId);
    }

    async restoreFormula(formulaId: string): Promise<Formula> {
        return this.formulaRepository.restoreFormula(formulaId);
    }

    // Version Changes
    async createFormulaVersionChange(change: InsertFormulaVersionChange): Promise<FormulaVersionChange> {
        return this.formulaRepository.createFormulaVersionChange(change);
    }

    async listFormulaVersionChanges(formulaId: string): Promise<FormulaVersionChange[]> {
        return this.formulaRepository.listFormulaVersionChanges(formulaId);
    }
}
