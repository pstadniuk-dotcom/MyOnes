import crypto from 'crypto';
import logger from '../../infra/logging/logger';
import { usersRepository } from '../users/users.repository';
import { optimizeRepository } from '../optimize/optimize.repository';
import { wearablesRepository } from '../wearables/wearables.repository';
import { sendRawSms } from '../../utils/smsService';
import { reorderRepository } from '../reorder/reorder.repository';
import { reorderService } from '../reorder/reorder.service';

export class WebhooksService {
    /**
     * Handle Twilio SMS reply
     */
    async handleTwilioSms(phoneNumber: string, body: string) {
        logger.info(`📩 Received SMS from ${phoneNumber}: ${body}`);

        const user = await usersRepository.getUserByPhone(phoneNumber);
        if (!user) {
            logger.warn(`❌ User not found for phone ${phoneNumber}`);
            throw new Error('User not found');
        }

        const response = body.trim().toUpperCase();

        // ── Smart Re-Order replies (APPROVE / KEEP / DELAY) ─────────────
        if (response === 'APPROVE' || response === 'KEEP' || response === 'DELAY') {
            return this.handleReorderSmsReply(user.id, phoneNumber, response);
        }

        const today = new Date();

        let nutritionCompleted = false;
        let workoutCompleted = false;

        if (response === 'YES' || response === 'DONE') {
            nutritionCompleted = true;
            workoutCompleted = true;
        } else if (response === 'NUTRITION') {
            nutritionCompleted = true;
        } else if (response === 'WORKOUT') {
            workoutCompleted = true;
        } else if (response === 'SKIP') {
            // Log nothing, just acknowledge
        } else {
            // Unknown command
            return;
        }

        if (nutritionCompleted || workoutCompleted) {
            // Get today's start and end for log lookup
            const startDate = new Date(today);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(today);
            endDate.setHours(23, 59, 59, 999);

            const existingLog = await optimizeRepository.getDailyLog(user.id, startDate, endDate);

            if (existingLog) {
                await optimizeRepository.updateDailyLog(existingLog.id, {
                    nutritionCompleted: nutritionCompleted || existingLog.nutritionCompleted,
                    workoutCompleted: workoutCompleted || existingLog.workoutCompleted,
                    notes: existingLog.notes ? `${existingLog.notes}\nAuto-logged via SMS: ${response}` : `Auto-logged via SMS: ${response}`
                });
            } else {
                await optimizeRepository.createDailyLog({
                    userId: user.id,
                    logDate: today,
                    nutritionCompleted,
                    workoutCompleted,
                    supplementsTaken: false,
                    waterIntakeOz: null,
                    energyLevel: null,
                    moodLevel: null,
                    sleepQuality: null,
                    notes: `Auto-logged via SMS reply: ${response}`
                });
            }
        }

        const confirmMessage = response === 'SKIP'
            ? `No worries! Tomorrow's a fresh start 💪`
            : `✅ Logged! Keep up the great work 🔥`;

        await sendRawSms(phoneNumber, confirmMessage);
    }

    /**
     * Handle Smart Re-Order SMS replies: APPROVE, KEEP, DELAY
     */
    private async handleReorderSmsReply(userId: string, phoneNumber: string, reply: string) {
        const recommendation = await reorderRepository.getLatestSentRecommendationByUser(userId);

        if (!recommendation) {
            logger.warn(`[SmartReorder] No pending recommendation for user ${userId}, ignoring ${reply}`);
            await sendRawSms(phoneNumber, `ONES: We don't have a pending reorder for you right now. Visit your dashboard for details.`);
            return;
        }

        switch (reply) {
            case 'APPROVE': {
                await reorderService.handleApprove(recommendation);
                await sendRawSms(phoneNumber,
                    `✅ Reorder approved! We'll charge your card and ship your formula shortly.`
                );
                logger.info(`[SmartReorder] User ${userId} APPROVED reorder for schedule ${recommendation.scheduleId}`);
                break;
            }
            case 'KEEP': {
                await reorderService.handleKeep(recommendation);
                await sendRawSms(phoneNumber,
                    `✅ Got it — keeping your current formula. We'll charge and ship shortly.`
                );
                logger.info(`[SmartReorder] User ${userId} chose KEEP for schedule ${recommendation.scheduleId}`);
                break;
            }
            case 'DELAY': {
                const result = await reorderService.handleDelay(recommendation);
                if (result.success) {
                    await sendRawSms(phoneNumber,
                        `⏸️ ${result.message}`
                    );
                } else {
                    await sendRawSms(phoneNumber,
                        `${result.message}`
                    );
                }
                logger.info(`[SmartReorder] User ${userId} DELAY result: ${JSON.stringify(result)}`);
                break;
            }
        }
    }

    /**
     * Verify Junction webhook signature
     */
    verifyJunctionSignature(payload: string, signature: string, secret: string | undefined): boolean {
        if (!secret) {
            logger.warn('JUNCTION_WEBHOOK_SECRET not configured, skipping signature verification');
            return true;
        }

        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');

        try {
            return crypto.timingSafeEqual(
                Buffer.from(signature || ''),
                Buffer.from(expectedSignature)
            );
        } catch (e) {
            return false;
        }
    }

    /**
     * Handle Junction Webhook Event
     */
    async handleJunctionEvent(event: any) {
        logger.info('Received Junction webhook', {
            eventType: event.event_type,
            userId: event.user_id,
        });

        // Handle different event types
        switch (event.event_type) {
            case 'daily.data.sleep.created':
            case 'daily.data.sleep.updated':
                await this.handleSleepData(event);
                break;

            case 'daily.data.activity.created':
            case 'daily.data.activity.updated':
                await this.handleActivityData(event);
                break;

            case 'daily.data.body.created':
            case 'daily.data.body.updated':
                await this.handleBodyData(event);
                break;

            case 'daily.data.workout.created':
            case 'daily.data.workout.updated':
                await this.handleWorkoutData(event);
                break;

            case 'provider.connection.created':
                await this.handleProviderConnected(event);
                break;

            case 'provider.connection.error':
            case 'provider.connection.deleted':
                await this.handleProviderDisconnected(event);
                break;

            case 'historical.data.sleep.created':
            case 'historical.data.activity.created':
            case 'historical.data.body.created':
                logger.info('Historical data backfill received', { eventType: event.event_type });
                // Process historical data using the same handlers as daily data
                if (event.event_type.includes('sleep')) {
                    await this.handleSleepData(event);
                } else if (event.event_type.includes('activity')) {
                    await this.handleActivityData(event);
                } else if (event.event_type.includes('body')) {
                    await this.handleBodyData(event);
                }
                break;

            default:
                logger.info('Unhandled webhook event type', { eventType: event.event_type });
        }
    }

    private async handleSleepData(event: any) {
        const { user_id: junctionUserId, data } = event;
        const user = await this.findUserByJunctionId(junctionUserId);
        if (!user) return;

        const dataDate = data?.calendar_date ? new Date(data.calendar_date) : new Date();
        const provider = data?.source?.slug || 'junction';

        logger.info('Processing sleep data webhook', {
            userId: user.id,
            date: data?.calendar_date,
            score: data?.sleep_score,
        });

        await wearablesRepository.saveJunctionBiometricData({
            userId: user.id,
            provider,
            dataDate,
            sleepScore: data?.sleep_score || data?.score || data?.sleep_efficiency || null,
            sleepHours: data?.duration_total_seconds
                ? Math.round(data.duration_total_seconds / 60)
                : (data?.total ? Math.round(data.total / 60) : null),
            deepSleepMinutes: data?.duration_deep_sleep_seconds
                ? Math.round(data.duration_deep_sleep_seconds / 60)
                : (data?.deep ? Math.round(data.deep / 60) : null),
            remSleepMinutes: data?.duration_rem_sleep_seconds
                ? Math.round(data.duration_rem_sleep_seconds / 60)
                : (data?.rem ? Math.round(data.rem / 60) : null),
            lightSleepMinutes: data?.duration_light_sleep_seconds
                ? Math.round(data.duration_light_sleep_seconds / 60)
                : (data?.light ? Math.round(data.light / 60) : null),
            hrvMs: data?.average_hrv || data?.hrv?.avg_hrv || null,
            restingHeartRate: data?.resting_heart_rate || data?.heart_rate?.resting_hr || null,
            respiratoryRate: data?.respiratory_rate || null,
            readinessScore: data?.readiness_score || null,
            rawData: data,
        });
    }

    private async handleActivityData(event: any) {
        const { user_id: junctionUserId, data } = event;
        const user = await this.findUserByJunctionId(junctionUserId);
        if (!user) return;

        const dataDate = data?.calendar_date ? new Date(data.calendar_date) : new Date();
        const provider = data?.source?.slug || 'junction';

        logger.info('Processing activity data webhook', {
            userId: user.id,
            date: data?.calendar_date,
            steps: data?.steps,
        });

        await wearablesRepository.saveJunctionBiometricData({
            userId: user.id,
            provider,
            dataDate,
            steps: data?.steps || null,
            caloriesBurned: data?.calories_active || data?.calories_total || null,
            activeMinutes: data?.active_duration_seconds
                ? Math.round(data.active_duration_seconds / 60)
                : (data?.active_minutes || null),
            averageHeartRate: data?.heart_rate?.avg_hr || null,
            maxHeartRate: data?.heart_rate?.max_hr || null,
            rawData: data,
        });
    }

    private async handleBodyData(event: any) {
        const { user_id: junctionUserId, data } = event;
        const user = await this.findUserByJunctionId(junctionUserId);
        if (!user) return;

        const dataDate = data?.calendar_date ? new Date(data.calendar_date) : new Date();
        const provider = data?.source?.slug || 'junction';

        logger.info('Processing body data webhook', {
            userId: user.id,
            date: data?.calendar_date,
            hrv: data?.hrv?.avg_hrv,
        });

        await wearablesRepository.saveJunctionBiometricData({
            userId: user.id,
            provider,
            dataDate,
            hrvMs: data?.hrv?.avg_hrv || data?.hrv_avg || null,
            restingHeartRate: data?.heart_rate?.resting_hr || data?.resting_heart_rate || null,
            averageHeartRate: data?.heart_rate?.avg_hr || null,
            maxHeartRate: data?.heart_rate?.max_hr || null,
            spo2Percentage: data?.oxygen_saturation ? Math.round(data.oxygen_saturation) : null,
            skinTempCelsius: data?.temperature ? Math.round(data.temperature * 10) : null,
            respiratoryRate: data?.respiratory_rate ? Math.round(data.respiratory_rate) : null,
            recoveryScore: data?.recovery_score || null,
            rawData: data,
        });
    }

    private async handleWorkoutData(event: any) {
        const { user_id: junctionUserId, data } = event;
        const user = await this.findUserByJunctionId(junctionUserId);
        if (!user) return;

        const dataDate = data?.calendar_date
            ? new Date(data.calendar_date)
            : (data?.timestamp ? new Date(data.timestamp) : new Date());
        const provider = data?.source?.slug || 'junction';

        logger.info('Processing workout data webhook', {
            userId: user.id,
            date: data?.calendar_date,
            sport: data?.sport?.name || data?.sport_name,
        });

        await wearablesRepository.saveJunctionBiometricData({
            userId: user.id,
            provider,
            dataDate,
            caloriesBurned: data?.calories || null,
            averageHeartRate: data?.average_hr || data?.heart_rate?.avg_hr || null,
            maxHeartRate: data?.max_hr || data?.heart_rate?.max_hr || null,
            activeMinutes: data?.duration_seconds ? Math.round(data.duration_seconds / 60) : null,
            rawData: data,
        });
    }

    private async handleProviderConnected(event: any) {
        const { user_id: junctionUserId, data } = event;
        const user = await this.findUserByJunctionId(junctionUserId);
        if (!user) return;

        logger.info('Provider connected', {
            userId: user.id,
            provider: data?.provider,
        });
    }

    private async handleProviderDisconnected(event: any) {
        const { user_id: junctionUserId, data } = event;
        const user = await this.findUserByJunctionId(junctionUserId);
        if (!user) return;

        logger.info('Provider disconnected or error', {
            userId: user.id,
            provider: data?.provider,
            error: data?.error,
        });
    }

    private async findUserByJunctionId(junctionUserId: string) {
        try {
            return await wearablesRepository.getUserByJunctionId(junctionUserId);
        } catch (error) {
            logger.error('Error finding user by Junction ID:', error);
            return null;
        }
    }
}

export const webhooksService = new WebhooksService();
