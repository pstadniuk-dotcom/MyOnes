/**
 * Formula Review Service
 *
 * Detects whether a user's formula needs review based on:
 *  - Age of the formula since last update
 *  - New lab reports uploaded after the formula was created
 *  - Wearable trend drift (HRV, sleep, steps declining)
 *
 * Returns a structured review status. The scheduler checks users
 * approaching their subscription renewal date and sends a single
 * "review recommended" notification when drift is detected.
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
import { getFrontendUrl } from '../../utils/urlHelper';

const FORMULA_REVIEW_DAYS = 30;          // Review if formula is older than 30 days
const HRV_DECLINE_THRESHOLD = 0.12;     // 12% decline triggers review
const SLEEP_DECLINE_THRESHOLD = 0.10;   // 10% decline triggers review
const STEPS_DECLINE_THRESHOLD = 0.15;   // 15% decline triggers review

export interface FormulaReviewStatus {
    needsReview: boolean;
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

function trendDirection(values: (number | null)[], threshold = 0.05): 'declining' | 'stable' | 'improving' | null {
    const valid = values.filter((v): v is number => v !== null);
    if (valid.length < 4) return null;
    const half = Math.floor(valid.length / 2);
    const earlier = valid.slice(0, half).reduce((a, b) => a + b, 0) / half;
    const recent = valid.slice(-half).reduce((a, b) => a + b, 0) / half;
    if (earlier === 0) return null;
    const change = (recent - earlier) / earlier;
    if (change <= -threshold) return 'declining';
    if (change >= threshold) return 'improving';
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

        if (!formula) {
            return {
                needsReview: false,
                reasons: [],
                driftScore: 0,
                formulaAgeDays: null,
                newLabSinceFormula: false,
                wearableDrift: { hrv: null, sleep: null, steps: null },
                lastChecked: new Date().toISOString(),
            };
        }

        // 2. Formula age (use createdAt — each version is a new row)
        const formulaDate = formula.createdAt;
        const formulaAgeDays = formulaDate
            ? Math.floor((Date.now() - new Date(formulaDate).getTime()) / (1000 * 60 * 60 * 24))
            : null;

        if (formulaAgeDays !== null && formulaAgeDays >= FORMULA_REVIEW_DAYS) {
            reasons.push(`Formula is ${formulaAgeDays} days old`);
            driftScore += Math.min(30, Math.floor((formulaAgeDays - FORMULA_REVIEW_DAYS) / 5) * 5 + 15);
        }

        // 3. New lab report since formula was last updated
        const newLabSinceFormula = formulaDate
            ? labAnalyses.some((l: LabAnalysis) => l.processedAt && new Date(l.processedAt) > new Date(formulaDate))
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

                wearableDrift.sleep = trendDirection(sleepMinutes, SLEEP_DECLINE_THRESHOLD);
                wearableDrift.hrv = trendDirection(hrvValues, HRV_DECLINE_THRESHOLD);
                wearableDrift.steps = trendDirection(stepsValues, STEPS_DECLINE_THRESHOLD);

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
            reasons,
            driftScore: Math.min(100, driftScore),
            formulaAgeDays,
            newLabSinceFormula,
            wearableDrift,
            lastChecked: new Date().toISOString(),
        };
    }

    /**
     * Send formula review notification (email + SMS if phone available).
     * Called by the scheduler when a user's subscription renewal is approaching
     * and their formula drift score indicates a review is recommended.
     */
    async sendReviewNotification(
        userId: string,
        reasons: string[],
        daysUntilRenewal?: number,
    ): Promise<void> {
        const user = await usersRepository.getUser(userId);
        if (!user) return;

        const frontendUrl = getFrontendUrl();
        const reviewUrl = `${frontendUrl}/dashboard`;

        const renewalNote = daysUntilRenewal !== undefined
            ? `<p>Your next subscription renewal is in <strong>${daysUntilRenewal} day${daysUntilRenewal === 1 ? '' : 's'}</strong> — now is a great time to make sure your formula is up to date.</p>`
            : '';

        await sendNotificationEmail({
            to: user.email,
            subject: 'Your ONES formula may need a review',
            title: 'Formula Review Recommended',
            content: `
                <p>Hi ${user.name?.split(' ')[0] || 'there'},</p>
                <p>Based on changes in your health data, we recommend reviewing your personalized formula.</p>
                <p><strong>What we noticed:</strong></p>
                <ul>${reasons.map(r => `<li>${r}</li>`).join('')}</ul>
                ${renewalNote}
                <p>Log in to review your Health Pulse data, upload any new blood tests, and chat with your AI practitioner to fine-tune your formula.</p>
            `,
            actionUrl: reviewUrl,
            actionText: 'Review Your Formula',
            type: 'formula_update',
        });

        if (user.phone) {
            if (await consentsRepository.getUserConsent(user.id, 'sms_accountability')) {
                await sendNotificationSms({
                    to: user.phone,
                    message: `Your health data suggests your ONES formula may need updating${daysUntilRenewal ? ` — your next renewal is in ${daysUntilRenewal} days` : ''}. Review: ${reviewUrl}`,
                    type: 'formula_update',
                });
            }
        }

        logger.info('Formula review notification sent', { userId, reasons, daysUntilRenewal });
    }
}

export const formulaReviewService = new FormulaReviewService();
