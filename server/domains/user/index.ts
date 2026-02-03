
import { db } from "../../infrastructure/database/db";
import { UserRepository } from "./user.repository";
import { UserService } from "./user.service";

export const userRepository = new UserRepository(db);
export const userService = new UserService(userRepository);

export * from "./user.repository";
export * from "./user.service";
