/**
 * Notification Gate Service
 *
 * Central dedup layer that ALL schedulers must call before sending
 * any renewal-related notification. Prevents users from being spammed
 * by multiple independent schedulers.
 *
 * Rules:
 *  - Per-channel cooldowns: only 1 email, 1 SMS, and 1 in-app per
 *    renewal topic within the cooldown window (default 4 days).
 *  - Cross-topic daily cap: max 2 renewal-related notifications per
 *    user per day across all channels.
 *  - Persistent (DB-backed) — survives server restarts.
 */

import { db } from '../../infra/db/db';
import { notificationLog, type InsertNotificationLogEntry } from '@shared/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import logger from '../../infra/logging/logger';

/** Renewal-related topics that schedulers use */
export type NotificationTopic =
    | 'formula_drift'       // autoOptimizeScheduler (formula review)
    | 'reorder_review'      // smartReorderScheduler (AI reorder nudge)
    | 'renewal_reminder';   // smsReminderScheduler (generic renewal SMS)

export type NotificationChannel = 'email' | 'sms' | 'in_app';

/** How many days to look back when checking for duplicates */
const CHANNEL_COOLDOWN_DAYS: Record<NotificationTopic, number> = {
    formula_drift:    4, // only 1 drift notification per 4 days
    reorder_review:   6, // only 1 reorder review per 6 days (8-week cycle)
    renewal_reminder: 5, // only 1 generic renewal SMS per 5 days
};

/** Max renewal-related notifications per user per calendar day (all channels) */
const DAILY_CAP = 2;

class NotificationGateService {
    /**
     * Check whether a notification is allowed for a given user/topic/channel.
     * Returns true if sending is allowed, false if it should be suppressed.
     */
    async canSend(
        userId: string,
        topic: NotificationTopic,
        channel: NotificationChannel,
    ): Promise<boolean> {
        const cooldownDays = CHANNEL_COOLDOWN_DAYS[topic] ?? 4;
        const cutoff = new Date(Date.now() - cooldownDays * 24 * 60 * 60 * 1000);

        try {
            // 1. Per-topic per-channel cooldown
            const [existing] = await db
                .select({ count: sql<number>`count(*)::int` })
                .from(notificationLog)
                .where(and(
                    eq(notificationLog.userId, userId),
                    eq(notificationLog.topic, topic),
                    eq(notificationLog.channel, channel),
                    gte(notificationLog.sentAt, cutoff),
                ));

            if ((existing?.count ?? 0) > 0) {
                logger.info('[NotificationGate] Suppressed (channel cooldown)', {
                    userId, topic, channel, cooldownDays,
                });
                return false;
            }

            // 2. Cross-topic daily cap
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            const [dailyCount] = await db
                .select({ count: sql<number>`count(*)::int` })
                .from(notificationLog)
                .where(and(
                    eq(notificationLog.userId, userId),
                    gte(notificationLog.sentAt, todayStart),
                ));

            if ((dailyCount?.count ?? 0) >= DAILY_CAP) {
                logger.info('[NotificationGate] Suppressed (daily cap reached)', {
                    userId, topic, channel, dailyCap: DAILY_CAP,
                });
                return false;
            }

            return true;
        } catch (err) {
            // If the gate fails, allow the notification (fail-open)
            logger.warn('[NotificationGate] Gate check failed, allowing send', { userId, topic, channel, err });
            return true;
        }
    }

    /**
     * Record that a notification was sent. Call this AFTER successful send.
     */
    async record(
        userId: string,
        source: string,
        topic: NotificationTopic,
        channel: NotificationChannel,
        metadata?: Record<string, any>,
    ): Promise<void> {
        try {
            await db.insert(notificationLog).values({
                userId,
                source,
                topic,
                channel,
                metadata: metadata ?? null,
            } as InsertNotificationLogEntry);
        } catch (err) {
            logger.error('[NotificationGate] Failed to record notification', { userId, source, topic, channel, err });
        }
    }

    /**
     * Convenience: check + record in one call. Returns true if allowed (and records it).
     * If suppressed, returns false and does NOT record.
     */
    async tryAcquire(
        userId: string,
        source: string,
        topic: NotificationTopic,
        channel: NotificationChannel,
        metadata?: Record<string, any>,
    ): Promise<boolean> {
        const allowed = await this.canSend(userId, topic, channel);
        if (allowed) {
            await this.record(userId, source, topic, channel, metadata);
        }
        return allowed;
    }
}

export const notificationGate = new NotificationGateService();
