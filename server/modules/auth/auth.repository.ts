import { db } from '../../infra/db/db';
import { passwordResetTokens } from '@shared/schema';
import { eq } from 'drizzle-orm';

export class AuthRepository {
    async createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
        await db.insert(passwordResetTokens).values({
            userId,
            token,
            expiresAt,
        });
    }

    async getPasswordResetToken(token: string): Promise<{ userId: string; expiresAt: Date; used: boolean } | undefined> {
        const [result] = await db
            .select()
            .from(passwordResetTokens)
            .where(eq(passwordResetTokens.token, token));
        if (!result) return undefined;
        return {
            userId: result.userId,
            expiresAt: result.expiresAt,
            used: result.used,
        };
    }

    async markPasswordResetTokenUsed(token: string): Promise<void> {
        await db
            .update(passwordResetTokens)
            .set({ used: true })
            .where(eq(passwordResetTokens.token, token));
    }
}

export const authRepository = new AuthRepository();
