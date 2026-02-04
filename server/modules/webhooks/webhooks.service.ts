import crypto from 'crypto';
import logger from '../../infra/logging/logger';
import { usersRepository } from '../users/users.repository';
import { optimizeRepository } from '../optimize/optimize.repository';
import { sendRawSms } from '../../utils/smsService';

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
                break;

            default:
                logger.info('Unhandled webhook event type', { eventType: event.event_type });
        }
    }

    private async handleSleepData(event: any) {
        const { user_id: junctionUserId, data } = event;
        const user = await this.findUserByJunctionId(junctionUserId);
        if (!user) return;

        logger.info('Processing sleep data webhook', {
            userId: user.id,
            date: data?.calendar_date,
            score: data?.sleep_score,
        });
    }

    private async handleActivityData(event: any) {
        const { user_id: junctionUserId, data } = event;
        const user = await this.findUserByJunctionId(junctionUserId);
        if (!user) return;

        logger.info('Processing activity data webhook', {
            userId: user.id,
            date: data?.calendar_date,
            steps: data?.steps,
        });
    }

    private async handleBodyData(event: any) {
        const { user_id: junctionUserId, data } = event;
        const user = await this.findUserByJunctionId(junctionUserId);
        if (!user) return;

        logger.info('Processing body data webhook', {
            userId: user.id,
            date: data?.calendar_date,
            hrv: data?.hrv?.avg_hrv,
        });
    }

    private async handleWorkoutData(event: any) {
        const { user_id: junctionUserId, data } = event;
        const user = await this.findUserByJunctionId(junctionUserId);
        if (!user) return;

        logger.info('Processing workout data webhook', {
            userId: user.id,
            date: data?.calendar_date,
            sport: data?.sport?.name,
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
            const users = await usersRepository.listAllUsers();
            return users.find((u: any) => u.junctionUserId === junctionUserId) || null;
        } catch (error) {
            logger.error('Error finding user by Junction ID:', error);
            return null;
        }
    }
}

export const webhooksService = new WebhooksService();
