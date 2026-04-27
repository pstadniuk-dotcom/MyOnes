import { PostHog } from 'posthog-node';
import { db } from './db/db';
import { users, orders, formulas, subscriptions, autoShipSubscriptions, fileUploads } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import logger from './logging/logger';

// Tolerate a missing API key in dev/CI/preview environments — PostHog is
// purely observational, it must never block server boot. When the key is
// missing we install a no-op stub with the same shape the rest of the app
// expects (capture, identify, shutdown).
const POSTHOG_KEY = process.env.POSTHOG_API_KEY;

type PostHogLike = Pick<PostHog, 'capture' | 'identify' | 'shutdown'>;

const noopPostHog: PostHogLike = {
  capture: () => {},
  identify: () => {},
  shutdown: async () => {},
};

const posthog: PostHogLike = POSTHOG_KEY
  ? new PostHog(POSTHOG_KEY, {
      host: process.env.POSTHOG_HOST,
      flushAt: 20,
      flushInterval: 10000,
    })
  : noopPostHog;

if (!POSTHOG_KEY) {
  logger.warn('[posthog] POSTHOG_API_KEY not set — analytics disabled (no-op stub installed)');
}

/**
 * Compute and attach a fresh snapshot of user properties to the next event for
 * this distinctId. Use `$set` for current-state properties (plan, lifetime
 * counts) and `$set_once` for properties that should only be written the first
 * time we see them (signup_at).
 *
 * This is fire-and-forget — never throws back to the caller. Runs a few cheap
 * COUNT(*) queries in parallel; safe to call from any hot path.
 */
export async function syncUserProperties(userId: string): Promise<void> {
  try {
    const [user, sub, autoShip, formulaCount, orderAgg, labCount] = await Promise.all([
      db.select().from(users).where(eq(users.id, userId)).limit(1).then(r => r[0]),
      db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1).then(r => r[0]),
      db.select().from(autoShipSubscriptions).where(eq(autoShipSubscriptions.userId, userId)).limit(1).then(r => r[0]),
      db.select({ c: sql<number>`count(*)::int` }).from(formulas).where(eq(formulas.userId, userId)).then(r => r[0]?.c ?? 0),
      db
        .select({
          count: sql<number>`count(*)::int`,
          total: sql<number>`coalesce(sum(${orders.amountCents}), 0)::int`,
        })
        .from(orders)
        .where(and(
          eq(orders.userId, userId),
          eq(orders.status, 'completed'),
          eq(orders.isTestOrder, false),
        ))
        .then(r => r[0] ?? { count: 0, total: 0 }),
      db.select({ c: sql<number>`count(*)::int` }).from(fileUploads).where(and(eq(fileUploads.userId, userId), eq(fileUploads.type, 'lab_report'))).then(r => r[0]?.c ?? 0),
    ]);

    if (!user) return;

    const hasActiveMembership = !!(user.membershipTier && !user.membershipCancelledAt && sub?.status === 'active');

    posthog.capture({
      distinctId: userId,
      event: '$set',
      properties: {
        $set: {
          email: user.email,
          name: user.name,
          is_admin: user.isAdmin ?? false,
          email_verified: user.emailVerified ?? false,
          membership_tier: user.membershipTier ?? null,
          membership_active: hasActiveMembership,
          membership_cancelled_at: user.membershipCancelledAt?.toISOString() ?? null,
          subscription_status: sub?.status ?? null,
          auto_ship_status: autoShip?.status ?? null,
          lifetime_orders: orderAgg.count,
          lifetime_revenue_cents: orderAgg.total,
          total_formulas: formulaCount,
          total_lab_reports: labCount,
          last_active_at: new Date().toISOString(),
        },
        $set_once: {
          signed_up_at: user.createdAt?.toISOString(),
        },
      },
    });
  } catch (err) {
    // Analytics must never break product paths
    logger.warn('PostHog syncUserProperties failed', { userId, error: err instanceof Error ? err.message : String(err) });
  }
}

export default posthog;

