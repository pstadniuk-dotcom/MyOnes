
import { db } from "../../infrastructure/database/db";
import { GamificationRepository } from "./gamification.repository";
import { GamificationService } from "./gamification.service";

export const gamificationRepository = new GamificationRepository(db);
export const gamificationService = new GamificationService(gamificationRepository);

export * from "./gamification.repository";
export * from "./gamification.service";
