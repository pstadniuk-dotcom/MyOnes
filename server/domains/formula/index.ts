
import { db } from "../../infrastructure/database/db";
import { FormulaRepository } from "./formula.repository";
import { FormulaService } from "./formula.service";

export const formulaRepository = new FormulaRepository(db);
export const formulaService = new FormulaService(formulaRepository);

export * from "./formula.repository";
export * from "./formula.service";
