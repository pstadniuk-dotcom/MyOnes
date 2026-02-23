/**
 * Formula Review Service
 *
 * Detects whether a user's formula needs review based on:
 *  - Age of the formula since last update
 *  - New lab reports uploaded after the formula was created
 *  - Wearable trend drift (HRV, sleep, steps declining)
 *
 * Returns a structured review status. When autoOptimizeFormula = true,
 * the scheduler can call this and trigger AI re-optimization + notification.
 */

import { usersRepository } from '../users/users.repository';
import { filesRepository } from '../files/files.repository';
import { formulasRepository } from './formulas.repository';
import { type LabAnalysis } from '@shared/schema';
import { wearablesRepository } from '../wearables/wearables.repository';
import {
    getSleepData,
    getBodyData,
    getActivityData,
} from '../../junction';
import logger from '../../infra/logging/logger';
import { sendNotificationEmail } from '../../utils/emailService';
import { sendNotificationSms } from '../../utils/smsService';
import { consentsRepository } from '../consents/consents.repository';

const FORMULA_REVIEW_DAYS = 30;          // Review if formula is older than 30 days
const HRV_DECLINE_THRESHOLD = 0.12;     // 12% decline triggers review
const SLEEP_DECLINE_THRESHOLD = 0.10;   // 10% decline triggers review
const STEPS_DECLINE_THRESHOLD = 0.15;   // 15% decline triggers review

export interface FormulaReviewStatus {
    needsReview: boolean;
    autoOptimizeEnabled: boolean;
    reasons: string[];
    driftScore: number;          // 0-100  (> 40 = review recommended)
    formulaAgeDays: number | null;
    newLabSinceFormula: boolean;
    wearableDrift: {
        hrv: 'declining' | 'stable' | 'improving' | null;
        sleep: 'declining' | 'stable' | 'improving' | null;
        steps: 'declining' | 'stable' | 'improving' | null;
    };
    lastChecked: string;
}

function trendDirection(values: (number | null)[]): 'declining' | 'stable' | 'improving' | null {
    const valid = values.filter((v): v is number => v !== null);
    if (valid.length < 4) return null;
    const half = Math.floor(valid.length / 2);
    const earlier = valid.slice(0, half).reduce((a, b) => a + b, 0) / half;
    const recent = valid.slice(-half).reduce((a, b) => a + b, 0) / half;
    if (earlier === 0) return null;
    const change = (recent - earlier) / earlier;
    if (change <= -0.05) return 'declining';
    if (change >= 0.05) return 'improving';
    return 'stable';
}

export class FormulaReviewService {
    async getReviewStatus(userId: string): Promise<FormulaReviewStatus> {
        const reasons: string[] = [];
        let driftScore = 0;

        // 1. Get user + formula + lab data in parallel
        const [user, formula, labAnalyses] = await Promise.all([
            usersRepository.getUser(userId),
            formulasRepository.getCurrentFormulaByUser(userId).catch(() => undefined),
            filesRepository.listLabAnalysesByUser(userId).catch((): LabAnalysis[] => []),
        ]);

        const autoOptimizeEnabled = user?.autoOptimizeFormula ?? false;

        if (!formula) {
            return {
                needsReview: false,
                autoOptimizeEnabled,
                reasons: [],
                driftScore: 0,
                formulaAgeDays: null,
                newLabSinceFormula: false,
                wearableDrift: { hrv: null, sleep: null, steps: null },
                lastChecked: new Date().toISOString(),
            };
        }

        // 2. Formula age
        const formulaUpdatedAt = formula.createdAt;
        const formulaAgeDays = formulaUpdatedAt
            ? Math.floor((Date.now() - new Date(formulaUpdatedAt).getTime()) / (1000 * 60 * 60 * 24))
            : null;

        if (formulaAgeDays !== null && formulaAgeDays >= FORMULA_REVIEW_DAYS) {
            reasons.push(`Formula is ${formulaAgeDays} days old`);
            driftScore += Math.min(30, Math.floor((formulaAgeDays - FORMULA_REVIEW_DAYS) / 5) * 5 + 15);
        }

        // 3. New lab report since formula was last updated
        const newLabSinceFormula = formulaUpdatedAt
            ? labAnalyses.some((l: LabAnalysis) => l.processedAt && new Date(l.processedAt) > new Date(formulaUpdatedAt))
            : false;

        if (newLabSinceFormula) {
            reasons.push('New blood test results uploaded since your last formula update');
            driftScore += 35;
        }

        // 4. Wearable drift (last 14 days vs previous 14 days)
        const wearableDrift: FormulaReviewStatus['wearableDrift'] = { hrv: null, sleep: null, steps: null };

        try {
            const junctionUserId = await wearablesRepository.getJunctionUserId(userId);
            if (junctionUserId) {
                const endDate = new Date().toISOString().split('T')[0];
                const startDate = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

                const [sleepData, bodyData, activityData] = await Promise.all([
                    getSleepData(junctionUserId, startDate, endDate).catch(() => []),
                    getBodyData(junctionUserId, startDate, endDate).catch(() => []),
                    getActivityData(junctionUserId, startDate, endDate).catch(() => []),
                ]);

                const sleepMinutes = sleepData
                    .sort((a: any, b: any) => (a.calendar_date || a.date || '').localeCompare(b.calendar_date || b.date || ''))
                    .map((s: any) => s.duration_total_seconds ? s.duration_total_seconds / 60 : null);

                const hrvValues = bodyData
                    .sort((a: any, b: any) => (a.calendar_date || a.date || '').localeCompare(b.calendar_date || b.date || ''))
                    .map((b: any) => b.hrv?.avgHrv ?? b.hrvAvg ?? null);

                const stepsValues = activityData
                    .sort((a: any, b: any) => (a.calendar_date || a.date || '').localeCompare(b.calendar_date || b.date || ''))
                    .map((a: any) => a.steps ?? null);

                wearableDrift.sleep = trendDirection(sleepMinutes);
                wearableDrift.hrv = trendDirection(hrvValues);
                wearableDrift.steps = trendDirection(stepsValues);

                if (wearableDrift.hrv === 'declining') {
                    reasons.push('HRV trending down over the last 4 weeks');
                    driftScore += 20;
                }
                if (wearableDrift.sleep === 'declining') {
                    reasons.push('Sleep quality trending down over the last 4 weeks');
                    driftScore += 15;
                }
                if (wearableDrift.steps === 'declining') {
                    reasons.push('Activity (steps) trending down over the last 4 weeks');
                    driftScore += 10;
                }
            }
        } catch (err) {
            logger.warn('Formula review: wearable check failed', { userId, err });
        }

        const needsReview = driftScore >= 40;

        return {
            needsReview,
            autoOptimizeEnabled,
            reasons,
            driftScore: Math.min(100, driftScore),
            formulaAgeDays,
            newLabSinceFormula,
            wearableDrift,
            lastChecked: new Date().toISOString(),
        };
    }

    /**
     * Send formula review notifications (email + SMS if phone available).
     * Called by the scheduler when autoOptimizeFormula = false and review is needed,
     * or when the system auto-applies a formula update.
     */
    async sendReviewNotification(
        userId: string,
        mode: 'manual_review_needed' | 'auto_updated',
        reasons: string[],
        formulaName?: string,
    ): Promise<void> {
        const user = await usersRepository.getUser(userId);
        if (!user) return;

        const frontendUrl = process.env.FRONTEND_URL || 'https://myones.ai';
        const reviewUrl = `${frontendUrl}/dashboard`;

        if (mode === 'auto_updated') {
            // Email
            await sendNotificationEmail({
                to: user.email,
                subject: 'Your ONES formula has been updated',
                title: 'Formula Updated',
                content: `
                    <p>Hi ${user.name?.split(' ')[0] || 'there'},</p>
                    <p>Your personalized formula${formulaName ? ` <strong>${formulaName}</strong>` : ''} has been automatically updated based on your latest health data.</p>
                    <p><strong>What triggered the update:</strong></p>
                    <ul>${reasons.map(r => `<li>${r}</li>`).join('')}</ul>
                    <p>Your next shipment will include the updated formula. You can review the changes and approve or roll back at any time.</p>
                    <p style="margin-top:16px;font-size:13px;color:#6b7280;">
                      To turn off automatic updates, visit Settings → Formula Preferences.
                    </p>
                `,
                actionUrl: reviewUrl,
                actionText: 'Review Changes',
                type: 'formula_update',
            });

            // SMS
            if (user.phone) {
                if (await consentsRepository.getUserConsent(user.id, 'sms_accountability')) {
                    await sendNotificationSms({
                        to: user.phone,
                        message: `Your formula has been updated based on your latest health data. Review before your next shipment: ${reviewUrl}`,
                        type: 'formula_update',
                    });
                }
            }
        } else {
            // Manual review needed
            await sendNotificationEmail({
                to: user.email,
                subject: 'Your ONES formula may need a review',
                title: 'Formula Review Recommended',
                content: `
                    <p>Hi ${user.name?.split(' ')[0] || 'there'},</p>
                    <p>Based on changes in your health data, we recommend reviewing your personalized formula.</p>
                    <p><strong>What we noticed:</strong></p>
                    <ul>${reasons.map(r => `<li>${r}</li>`).join('')}</ul>
                    <p>Log in to review your Health Pulse data, upload any new blood tests, and approve any updates before your next order.</p>
                `,
                actionUrl: reviewUrl,
                actionText: 'Review Your Formula',
                type: 'formula_update',
            });

            if (user.phone) {
                if (await consentsRepository.getUserConsent(user.id, 'sms_accountability')) {
                    await sendNotificationSms({
                        to: user.phone,
                        message: `Your health data suggests your formula may need updating. Log in to review: ${reviewUrl}`,
                        type: 'formula_update',
                    });
                }
            }
        }

        logger.info('Formula review notification sent', { userId, mode, reasons });
    }
}

export const formulaReviewService = new FormulaReviewService();
