
import { db } from "../../infrastructure/database/db";
import { HealthRepository } from "./health.repository";
import { HealthService } from "./health.service";

const healthRepository = new HealthRepository(db);
export const healthService = new HealthService(healthRepository);

export { healthRepository };
export * from "./health.repository";
export * from "./health.service";
