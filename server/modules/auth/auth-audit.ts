/**
 * Authentication Audit Logging
 * 
 * Logs all login attempts (success and failure) for security compliance.
 * HIPAA requires tracking access to systems containing PHI.
 */
import { db } from '../../infra/db/db';
import { authAuditLogs } from '@shared/schema';
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
