
import { db } from "../../infrastructure/database/db";
import { SupportRepository } from "./support.repository";
import { SupportService } from "./support.service";

export const supportRepository = new SupportRepository(db);
export const supportService = new SupportService(supportRepository);

export * from "./support.repository";
export * from "./support.service";
