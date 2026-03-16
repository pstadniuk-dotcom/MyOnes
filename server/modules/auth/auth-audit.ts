/**
 * Authentication Audit Logging
 * 
 * Logs all login attempts (success and failure) for security compliance.
 * HIPAA requires tracking access to systems containing PHI.
 */
import { db } from '../../infra/db/db';
import { authAuditLogs } from '@shared/schema';
import { desc, eq, and, sql, count } from 'drizzle-orm';
import { logger } from '../../infra/logging/logger';
import { Request } from 'express';

export async function logAuthEvent(
  req: Request,
  params: {
    userId?: string | null;
    email: string;
    action: 'login_success' | 'login_failed' | 'signup' | 'google_login' | 'facebook_login' | 'password_reset' | 'logout';
    provider: 'email' | 'google' | 'facebook';
    success: boolean;
    failureReason?: string | null;
  }
): Promise<void> {
  try {
    await db.insert(authAuditLogs).values({
      userId: params.userId || null,
      email: params.email,
      action: params.action,
      provider: params.provider,
      success: params.success,
      failureReason: params.failureReason || null,
      ipAddress: req.ip || req.headers['x-forwarded-for']?.toString() || null,
      userAgent: req.headers['user-agent'] || null,
    });
  } catch (error) {
    // Non-fatal — never break auth flow for audit logging
    logger.error('Failed to log auth event', { error, action: params.action, email: params.email });
  }
}

export async function listAuthAuditLogs(options: {
  page?: number;
  limit?: number;
  action?: string;
  email?: string;
}): Promise<{ data: any[]; total: number }> {
  const { page = 1, limit = 50, action, email } = options;
  const offset = (page - 1) * limit;

  const conditions: any[] = [];
  if (action) conditions.push(eq(authAuditLogs.action, action));
  if (email) conditions.push(eq(authAuditLogs.email, email));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, [{ total: totalCount }]] = await Promise.all([
    db.select().from(authAuditLogs)
      .where(whereClause)
      .orderBy(desc(authAuditLogs.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(authAuditLogs).where(whereClause),
  ]);

  return { data, total: Number(totalCount) };
}
