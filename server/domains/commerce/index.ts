
import { db } from "../../infrastructure/database/db";
import { CommerceRepository } from "./commerce.repository";
import { CommerceService } from "./commerce.service";

// Initialize repository and service
export const commerceRepository = new CommerceRepository(db);
export const commerceService = new CommerceService(commerceRepository);

// Export types
export * from "./commerce.repository";
export * from "./commerce.service";
