import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { db } from '../../infra/db/db';
import { refreshTokens } from '@shared/schema';
import { eq, and, isNull, lt } from 'drizzle-orm';
import { generateToken, JWT_SECRET, REFRESH_TOKEN_EXPIRES_DAYS } from '../../api/middleware/middleware';
import { logger } from '../../infra/logging/logger';

const SALT_ROUNDS = 10;

export class RefreshTokenService {
  /**
   * Generate a new refresh token and store its hash in the database.
   * Returns the raw refresh token (to be sent to client) and the access token.
   */
  async createTokenPair(userId: string, isAdmin: boolean): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = generateToken(userId, isAdmin);
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const family = crypto.randomUUID();
    const tokenHash = await bcrypt.hash(rawRefreshToken, SALT_ROUNDS);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

    await db.insert(refreshTokens).values({
      userId,
      tokenHash,
      family,
      expiresAt,
    });

    return { accessToken, refreshToken: `${family}:${rawRefreshToken}` };
  }

  /**
   * Rotate a refresh token: validate old token, revoke it, issue new pair.
   * If a revoked token is reused, revoke the entire family (compromise detected).
   */
  async rotateToken(rawToken: string, isAdmin: boolean): Promise<{ accessToken: string; refreshToken: string; userId: string } | null> {
    const colonIdx = rawToken.indexOf(':');
    if (colonIdx === -1) return null;

    const family = rawToken.substring(0, colonIdx);
    const tokenValue = rawToken.substring(colonIdx + 1);

    // Find the latest non-revoked token in this family
    const tokens = await db.select()
      .from(refreshTokens)
      .where(and(
        eq(refreshTokens.family, family),
      ))
      .orderBy(refreshTokens.createdAt);

    if (tokens.length === 0) return null;

    // Find the token that matches
    for (const storedToken of tokens) {
      const matches = await bcrypt.compare(tokenValue, storedToken.tokenHash);
      if (!matches) continue;

      // If this token was already revoked, it's a reuse attack — revoke entire family
      if (storedToken.revokedAt) {
        logger.warn('Refresh token reuse detected — revoking family', { family, userId: storedToken.userId });
        await this.revokeFamilyTokens(family);
        return null;
      }

      // If expired, reject
      if (new Date() > storedToken.expiresAt) {
        await db.update(refreshTokens)
          .set({ revokedAt: new Date() })
          .where(eq(refreshTokens.id, storedToken.id));
        return null;
      }

      // Valid token — revoke it and issue new pair
      await db.update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.id, storedToken.id));

      // Issue new token in same family
      const newRawToken = crypto.randomBytes(40).toString('hex');
      const newTokenHash = await bcrypt.hash(newRawToken, SALT_ROUNDS);
      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

      await db.insert(refreshTokens).values({
        userId: storedToken.userId,
        tokenHash: newTokenHash,
        family,
        expiresAt,
      });

      const accessToken = generateToken(storedToken.userId, isAdmin);
      return {
        accessToken,
        refreshToken: `${family}:${newRawToken}`,
        userId: storedToken.userId,
      };
    }

    return null;
  }

  /**
   * Revoke all tokens in a family (on logout or compromise detection).
   */
  async revokeFamilyTokens(family: string): Promise<void> {
    await db.update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(
        eq(refreshTokens.family, family),
        isNull(refreshTokens.revokedAt),
      ));
  }

  /**
   * Revoke all refresh tokens for a user (e.g., on password change).
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await db.update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(
        eq(refreshTokens.userId, userId),
        isNull(refreshTokens.revokedAt),
      ));
  }

  /**
   * Clean up expired tokens older than 30 days.
   */
  async cleanupExpiredTokens(): Promise<number> {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await db.delete(refreshTokens)
      .where(lt(refreshTokens.expiresAt, cutoff));
    return result.rowCount ?? 0;
  }
}

export const refreshTokenService = new RefreshTokenService();
