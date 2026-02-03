
import { UserRepository } from "./user.repository";
import { User, InsertUser } from "@shared/schema";
import { db } from "../../infrastructure/database/db";

export class UserService {
    private repository: UserRepository;

    constructor() {
        this.repository = new UserRepository(db);
    }

    async getUser(id: string): Promise<User | undefined> {
        return this.repository.findById(id);
    }

    async listUsers(): Promise<User[]> {
        return this.repository.findAll();
    }

    async getUserByEmail(email: string): Promise<User | undefined> {
        return this.repository.findByEmail(email);
    }

    async getUserByPhone(phone: string): Promise<User | undefined> {
        return this.repository.findByPhone(phone);
    }

    async getUserByJunctionId(junctionUserId: string): Promise<User | undefined> {
        return this.repository.findByJunctionId(junctionUserId);
    }

    async createUser(user: InsertUser): Promise<User> {
        return this.repository.create(user);
    }

    async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
        return this.repository.update(id, updates);
    }

    async deleteUser(id: string): Promise<boolean> {
        return this.repository.delete(id);
    }

    async updatePassword(userId: string, hashedPassword: string): Promise<void> {
        return this.repository.updatePassword(userId, hashedPassword);
    }

    // Password Reset Methods
    async createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
        return this.repository.createPasswordResetToken(userId, token, expiresAt);
    }

    async getPasswordResetToken(token: string): Promise<{ userId: string; expiresAt: Date; used: boolean } | undefined> {
        return this.repository.getPasswordResetToken(token);
    }

    async markPasswordResetTokenUsed(token: string): Promise<void> {
        return this.repository.markPasswordResetTokenUsed(token);
    }

    // Admin Methods
    async searchUsers(query: string, limit: number, offset: number, filter: string = 'all') {
        return this.repository.searchUsers(query, limit, offset, filter);
    }

    async getAdminStats() {
        return this.repository.getAdminStats();
    }

    async getUserAdminNotes(userId: string) {
        return this.repository.getUserAdminNotes(userId);
    }

    async addUserAdminNote(userId: string, adminId: string, content: string) {
        return this.repository.addUserAdminNote(userId, adminId, content);
    }
}


export const userService = new UserService();
