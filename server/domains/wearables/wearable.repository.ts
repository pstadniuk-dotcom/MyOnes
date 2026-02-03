/**
 * Wearable Repository
 * 
 * Encapsulates all interactions with the Junction (Vital) API.
 * This handles raw API calls and data normalization.
 */

import { VitalClient, VitalEnvironment, Vital } from '@tryvital/vital-node';
import { logger } from '../../infrastructure/logging/logger';

export class WearableRepository {
    private _client: VitalClient | null = null;
    private domainName = "WearableRepository";

    private get client(): VitalClient {
        if (!this._client) {
            const apiKey = process.env.JUNCTION_API_KEY;
            const region = process.env.JUNCTION_REGION || 'us';
            const env = process.env.JUNCTION_ENV || 'sandbox';

            if (!apiKey) {
                throw new Error('JUNCTION_API_KEY is not configured');
            }

            // Map environment string to VitalEnvironment enum
            const environment = env === 'production'
                ? (region === 'eu' ? VitalEnvironment.ProductionEu : VitalEnvironment.Production)
                : (region === 'eu' ? VitalEnvironment.SandboxEu : VitalEnvironment.Sandbox);

            this._client = new VitalClient({
                apiKey,
                environment,
            });
        }
        return this._client;
    }

    /**
     * Create a Junction user linked to a ONES user
     */
    async createJunctionUser(onesUserId: string): Promise<string> {
        try {
            // Use ONES user ID as the client_user_id (external reference)
            const response = await this.client.user.create({
                clientUserId: onesUserId,
            });

            logger.info(`[${this.domainName}] Created Junction user`, { onesUserId, junctionUserId: response.userId });
            return response.userId;
        } catch (error: any) {
            // If user already exists, get them instead
            if (error?.body?.error?.includes('already exists')) {
                logger.info(`[${this.domainName}] Junction user already exists, fetching...`, { onesUserId });
                const users = await this.client.user.getAll();
                const existing = users.users.find((u: any) => u.clientUserId === onesUserId);
                if (existing) {
                    return existing.userId;
                }
            }
            logger.error(`[${this.domainName}] Failed to create Junction user`, { error });
            throw error;
        }
    }

    /**
     * Generate a Link token for the Junction Link widget
     */
    async generateLinkToken(junctionUserId: string): Promise<{ linkToken: string; linkWebUrl: string }> {
        try {
            const response = await this.client.link.token({
                userId: junctionUserId,
            });

            return {
                linkToken: response.linkToken,
                linkWebUrl: response.linkWebUrl || '',
            };
        } catch (error) {
            logger.error(`[${this.domainName}] Failed to generate Junction link token`, { error });
            throw error;
        }
    }

    /**
     * Get all connected providers for a Junction user
     */
    async getConnectedProviders(junctionUserId: string): Promise<any[]> {
        try {
            const response = await this.client.user.getConnectedProviders(junctionUserId);
            const providers: any[] = [];
            for (const [slug, providerArray] of Object.entries(response)) {
                for (const provider of providerArray) {
                    providers.push({ ...provider, slug });
                }
            }
            return providers;
        } catch (error) {
            logger.error(`[${this.domainName}] Failed to get connected providers`, { error, junctionUserId });
            throw error;
        }
    }

    /**
     * Disconnect a provider from a Junction user
     */
    async disconnectProvider(junctionUserId: string, provider: string): Promise<void> {
        try {
            await this.client.user.deregisterProvider(junctionUserId, provider as Vital.Providers);
            logger.info(`[${this.domainName}] Disconnected provider`, { junctionUserId, provider });
        } catch (error) {
            logger.error(`[${this.domainName}] Failed to disconnect provider`, { error, junctionUserId, provider });
            throw error;
        }
    }

    /**
     * Get sleep data from Junction
     */
    async getSleepData(junctionUserId: string, startDate: string, endDate: string): Promise<any[]> {
        try {
            const response = await this.client.sleep.get(junctionUserId, {
                startDate,
                endDate,
            });
            return response.sleep || [];
        } catch (error) {
            logger.error(`[${this.domainName}] Failed to get sleep data`, { error, junctionUserId });
            throw error;
        }
    }

    /**
     * Get activity data from Junction
     */
    async getActivityData(junctionUserId: string, startDate: string, endDate: string): Promise<any[]> {
        try {
            const response = await this.client.activity.get(junctionUserId, {
                startDate,
                endDate,
            });
            return response.activity || [];
        } catch (error) {
            logger.error(`[${this.domainName}] Failed to get activity data`, { error, junctionUserId });
            throw error;
        }
    }

    /**
     * Get body data from Junction
     */
    async getBodyData(junctionUserId: string, startDate: string, endDate: string): Promise<any[]> {
        try {
            const response = await this.client.body.get(junctionUserId, {
                startDate,
                endDate,
            });
            return response.body || [];
        } catch (error) {
            logger.error(`[${this.domainName}] Failed to get body data`, { error, junctionUserId });
            throw error;
        }
    }

    /**
     * Get workout data from Junction
     */
    async getWorkoutData(junctionUserId: string, startDate: string, endDate: string): Promise<any[]> {
        try {
            const response = await this.client.workouts.get(junctionUserId, {
                startDate,
                endDate,
            });
            return response.workouts || [];
        } catch (error) {
            logger.error(`[${this.domainName}] Failed to get workout data`, { error, junctionUserId });
            throw error;
        }
    }
}
