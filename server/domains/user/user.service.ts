
import { UserRepository } from "./user.repository";
import { type User, type InsertUser } from "@shared/schema";
import { logger } from "../../infrastructure/logging/logger";

export class UserService {
    constructor(private userRepository: UserRepository) { }

    async getUser(id: string): Promise<User | undefined> {
        return this.userRepository.findById(id);
    }

    async getUserByEmail(email: string): Promise<User | undefined> {
        return this.userRepository.getUserByEmail(email);
    }

    async getUserByPhone(phone: string): Promise<User | undefined> {
        return this.userRepository.getUserByPhone(phone);
    }

    async createUser(insertUser: InsertUser): Promise<User> {
        return this.userRepository.create(insertUser);
    }

    async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
        return this.userRepository.update(id, updates);
    }

    async deleteUser(id: string): Promise<boolean> {
        return this.userRepository.delete(id);
    }

    async listAllUsers(): Promise<User[]> {
        return this.userRepository.listAllUsers();
    }

    async updatePassword(userId: string, hashedPassword: string): Promise<void> {
        return this.userRepository.updateUserPassword(userId, hashedPassword);
    }

    // Password Reset logic could also be here or in an AuthService
    async createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
        return this.userRepository.createPasswordResetToken(userId, token, expiresAt);
    }

    async getPasswordResetToken(token: string) {
        return this.userRepository.getPasswordResetToken(token);
    }

    async markPasswordResetTokenUsed(token: string): Promise<void> {
        return this.userRepository.markPasswordResetTokenUsed(token);
    }

    // Example of a service-level method
    async getProfileCompleteness(userId: string): Promise<number> {
        // This could be moved here from routes.ts dashboard logic
        // For now just a placeholder
        return 0;
    }
}
