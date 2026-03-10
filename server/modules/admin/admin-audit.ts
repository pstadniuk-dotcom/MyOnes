/**
 * Admin Audit Logging Utility
 * 
 * Logs all admin write operations to admin_audit_logs table for compliance
 * and accountability tracking.
 */
import { db } from '../../infra/db/db';
import { adminAuditLogs, type InsertAdminAuditLog } from '@shared/schema';
import { desc, eq, and, gte, lte, sql, count } from 'drizzle-orm';
import { Request } from 'express';
import { logger } from '../../infra/logging/logger';

type AdminAction = InsertAdminAuditLog['action'];

export async function logAdminAction(
  req: Request,
  action: AdminAction,
  targetType: string,
  targetId: string | null,
  details?: Record<string, any>
): Promise<void> {
  try {
    const adminId = (req as any).userId;
    if (!adminId) return;

    await db.insert(adminAuditLogs).values({
      adminId,
      action,
      targetType,
      targetId,
      details: details || null,
      ipAddress: req.ip || req.headers['x-forwarded-for']?.toString() || null,
      userAgent: req.headers['user-agent'] || null,
    });
  } catch (error) {
    // Non-fatal — don't break the admin action
    logger.error('Failed to log admin action', { error, action, targetType, targetId });
  }
}

export async function listAdminAuditLogs(options: {
  page?: number;
  limit?: number;
  adminId?: string;
  action?: string;
  targetType?: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<{ data: any[]; total: number }> {
  const { page = 1, limit = 50, adminId, action, targetType, startDate, endDate } = options;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (adminId) conditions.push(eq(adminAuditLogs.adminId, adminId));
  if (action) conditions.push(eq(adminAuditLogs.action, action as any));
  if (targetType) conditions.push(eq(adminAuditLogs.targetType, targetType));
  if (startDate) conditions.push(gte(adminAuditLogs.createdAt, startDate));
  if (endDate) conditions.push(lte(adminAuditLogs.createdAt, endDate));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db
    .select({ count: count() })
    .from(adminAuditLogs)
    .where(whereClause);

  const data = await db
    .select()
    .from(adminAuditLogs)
    .where(whereClause)
    .orderBy(desc(adminAuditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    data,
    total: Number(countResult?.count || 0),
  };
}
