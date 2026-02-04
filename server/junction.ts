/**
 * Junction (Vital) Wearables Service
 * 
 * Centralized service for interacting with the Junction/Vital API.
 * This replaces direct OAuth integrations with Fitbit, Oura, WHOOP.
 * 
 * Junction handles:
 * - OAuth flows with all providers
 * - Token refresh
 * - Data normalization across providers
 * - Webhooks for real-time data
 */

import { VitalClient, VitalEnvironment, Vital } from '@tryvital/vital-node';
import logger from './infra/logging/logger';

// Initialize Junction client
const getJunctionClient = () => {
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

  return new VitalClient({
    apiKey,
    environment,
  });
};

// Lazy-loaded singleton
let _client: VitalClient | null = null;
export const junctionClient = () => {
  if (!_client) {
    _client = getJunctionClient();
  }
  return _client;
};

/**
 * Create a Junction user linked to a ONES user
 * This should be called when a user first tries to connect a wearable
 */
export async function createJunctionUser(onesUserId: string): Promise<string> {
  try {
    const client = junctionClient();

    // Use ONES user ID as the client_user_id (external reference)
    const response = await client.user.create({
      clientUserId: onesUserId,
    });

    logger.info('Created Junction user', { onesUserId, junctionUserId: response.userId });
    return response.userId;
  } catch (error: any) {
    // If user already exists, get them instead
    if (error?.body?.error?.includes('already exists')) {
      logger.info('Junction user already exists, fetching...', { onesUserId });
      const users = await junctionClient().user.getAll();
      const existing = users.users.find((u: any) => u.clientUserId === onesUserId);
      if (existing) {
        return existing.userId;
      }
    }
    logger.error('Failed to create Junction user', { error });
    throw error;
  }
}

/**
 * Get or create a Junction user for a ONES user
 */
export async function getOrCreateJunctionUser(onesUserId: string, existingJunctionUserId?: string | null): Promise<string> {
  if (existingJunctionUserId) {
    return existingJunctionUserId;
  }
  return createJunctionUser(onesUserId);
}

/**
 * Generate a Link token for the Junction Link widget
 * This is used to initiate the connection flow
 */
export async function generateLinkToken(junctionUserId: string): Promise<{ linkToken: string; linkWebUrl: string }> {
  try {
    const client = junctionClient();

    const response = await client.link.token({
      userId: junctionUserId,
    });

    return {
      linkToken: response.linkToken,
      linkWebUrl: response.linkWebUrl || '',
    };
  } catch (error) {
    logger.error('Failed to generate Junction link token', { error });
    throw error;
  }
}

/**
 * Get all connected providers for a Junction user
 */
export async function getConnectedProviders(junctionUserId: string): Promise<any[]> {
  try {
    const client = junctionClient();
    const response = await client.user.getConnectedProviders(junctionUserId);
    // The response is a record of provider slug -> array of provider info
    // Flatten it into an array
    const providers: any[] = [];
    for (const [slug, providerArray] of Object.entries(response)) {
      for (const provider of providerArray) {
        providers.push({ ...provider, slug });
      }
    }
    return providers;
  } catch (error) {
    logger.error('Failed to get connected providers', { error, junctionUserId });
    throw error;
  }
}

/**
 * Disconnect a provider from a Junction user
 */
export async function disconnectProvider(junctionUserId: string, provider: string): Promise<void> {
  try {
    const client = junctionClient();
    // Cast to the Providers enum type
    await client.user.deregisterProvider(junctionUserId, provider as Vital.Providers);
    logger.info('Disconnected provider', { junctionUserId, provider });
  } catch (error) {
    logger.error('Failed to disconnect provider', { error, junctionUserId, provider });
    throw error;
  }
}

/**
 * Get sleep data from Junction
 */
export async function getSleepData(junctionUserId: string, startDate: string, endDate: string): Promise<any[]> {
  try {
    const client = junctionClient();
    const response = await client.sleep.get(junctionUserId, {
      startDate,
      endDate,
    });
    return response.sleep || [];
  } catch (error) {
    logger.error('Failed to get sleep data', { error, junctionUserId });
    throw error;
  }
}

/**
 * Get activity data from Junction
 */
export async function getActivityData(junctionUserId: string, startDate: string, endDate: string): Promise<any[]> {
  try {
    const client = junctionClient();
    const response = await client.activity.get(junctionUserId, {
      startDate,
      endDate,
    });
    return response.activity || [];
  } catch (error) {
    logger.error('Failed to get activity data', { error, junctionUserId });
    throw error;
  }
}

/**
 * Get body data (HRV, resting HR, etc.) from Junction
 */
export async function getBodyData(junctionUserId: string, startDate: string, endDate: string): Promise<any[]> {
  try {
    const client = junctionClient();
    const response = await client.body.get(junctionUserId, {
      startDate,
      endDate,
    });
    return response.body || [];
  } catch (error) {
    logger.error('Failed to get body data', { error, junctionUserId });
    throw error;
  }
}

/**
 * Get workout data from Junction
 */
export async function getWorkoutData(junctionUserId: string, startDate: string, endDate: string): Promise<any[]> {
  try {
    const client = junctionClient();
    const response = await client.workouts.get(junctionUserId, {
      startDate,
      endDate,
    });
    return response.workouts || [];
  } catch (error) {
    logger.error('Failed to get workout data', { error, junctionUserId });
    throw error;
  }
}

/**
 * Map Junction provider names to our internal names
 */
export const PROVIDER_MAP: Record<string, string> = {
  'fitbit': 'fitbit',
  'oura': 'oura',
  'whoop': 'whoop',
  'garmin': 'garmin',
  'apple_health_kit': 'apple',
  'google_fit': 'google',
  'strava': 'strava',
  'withings': 'withings',
  'polar': 'polar',
  'eight_sleep': 'eight_sleep',
  'cronometer': 'cronometer',
  'libre': 'libre',
  'dexcom': 'dexcom',
};

/**
 * Get display name for a provider
 */
export const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  'fitbit': 'Fitbit',
  'oura': 'Oura Ring',
  'whoop': 'WHOOP',
  'garmin': 'Garmin',
  'apple': 'Apple Health',
  'google': 'Google Fit',
  'strava': 'Strava',
  'withings': 'Withings',
  'polar': 'Polar',
  'eight_sleep': 'Eight Sleep',
  'cronometer': 'Cronometer',
  'libre': 'Freestyle Libre',
  'dexcom': 'Dexcom',
};
