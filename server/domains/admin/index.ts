
import { db } from "../../infrastructure/database/db";
import { AdminRepository } from "./admin.repository";
import { AdminService } from "./admin.service";

export const adminRepository = new AdminRepository(db);
export const adminService = new AdminService(adminRepository);

export * from "./admin.repository";
export * from "./admin.service";
