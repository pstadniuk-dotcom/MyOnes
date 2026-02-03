
import { eq, desc, and } from "drizzle-orm";
import { db } from "../../infrastructure/database/db";
import {
    users, passwordResetTokens,
    type User, type InsertUser
} from "@shared/schema";
import { BaseRepository } from "../../infrastructure/database/base.repository";
import { logger } from "../../infrastructure/logging/logger";

export class UserRepository extends BaseRepository<typeof users, User, InsertUser> {
    constructor(db: any) {
        super(db, users, "UserRepository");
    }

    async getUserByEmail(email: string): Promise<User | undefined> {
        try {
            const [user] = await this.db.select().from(users).where(eq(users.email, email));
            return user || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting user by email:`, error);
            throw error;
        }
    }

    async getUserByPhone(phone: string): Promise<User | undefined> {
        try {
            const [user] = await this.db
                .select()
                .from(users)
                .where(eq(users.phone, phone));
            return user || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting user by phone:`, error);
            throw error;
        }
    }

    async listAllUsers(): Promise<User[]> {
        try {
            return await this.db.select().from(users);
        } catch (error) {
            logger.error(`[${this.domainName}] Error listing all users:`, error);
            throw error;
        }
    }

    async updateUserPassword(userId: string, hashedPassword: string): Promise<void> {
        try {
            await this.db
                .update(users)
                .set({ password: hashedPassword })
                .where(eq(users.id, userId));
        } catch (error) {
            logger.error(`[${this.domainName}] Error updating user password:`, error);
            throw error;
        }
    }

    // --- Password Reset Operations ---

    async createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
        try {
            await this.db.insert(passwordResetTokens).values({
                userId,
                token,
                expiresAt,
            });
        } catch (error) {
            logger.error(`[${this.domainName}] Error creating password reset token:`, error);
            throw error;
        }
    }

    async getPasswordResetToken(token: string): Promise<{ userId: string; expiresAt: Date; used: boolean } | undefined> {
        try {
            const [result] = await this.db
                .select()
                .from(passwordResetTokens)
                .where(eq(passwordResetTokens.token, token));
            if (!result) return undefined;
            return {
                userId: result.userId,
                expiresAt: result.expiresAt,
                used: result.used,
            };
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting password reset token:`, error);
            throw error;
        }
    }

    async markPasswordResetTokenUsed(token: string): Promise<void> {
        try {
            await this.db
                .update(passwordResetTokens)
                .set({ used: true })
                .where(eq(passwordResetTokens.token, token));
        } catch (error) {
            logger.error(`[${this.domainName}] Error marking password reset token used:`, error);
            throw error;
        }
    }
}
