import { db } from '../../infra/db/db';
import {
    wearableConnections,
    biometricData,
    biometricTrends,
    users,
    type WearableConnection,
    type InsertWearableConnection,
    type User
} from '@shared/schema';
import { eq, and, desc, lt, gte, lte } from 'drizzle-orm';
import { encryptToken, decryptToken } from '../../utils/tokenEncryption';
import { encryptField, decryptField } from '../../infra/security/fieldEncryption';

export class WearablesRepository {
    async getWearableConnections(userId: string): Promise<WearableConnection[]> {
        try {
            const connections = await db
                .select()
                .from(wearableConnections)
                .where(eq(wearableConnections.userId, userId))
                .orderBy(desc(wearableConnections.connectedAt));

            // Decrypt tokens for active connections
            return connections.map(conn => {
                if (conn.status === 'connected' && conn.accessToken) {
                    try {
                        return {
                            ...conn,
                            accessToken: decryptToken(conn.accessToken),
                            refreshToken: conn.refreshToken ? decryptToken(conn.refreshToken) : null
                        };
                    } catch (error) {
                        console.error('Error decrypting tokens for connection:', conn.id, error);
                        return conn;
                    }
                }
                return conn;
            });
        } catch (error) {
            console.error('Error getting wearable connections:', error);
            return [];
        }
    }

    async getAllWearableConnections(): Promise<WearableConnection[]> {
        try {
            const connections = await db
                .select()
                .from(wearableConnections)
                .where(eq(wearableConnections.status, 'connected'))
                .orderBy(desc(wearableConnections.connectedAt));

            // Decrypt tokens for active connections
            return connections.map(conn => {
                if (conn.accessToken) {
                    try {
                        return {
                            ...conn,
                            accessToken: decryptToken(conn.accessToken),
                            refreshToken: conn.refreshToken ? decryptToken(conn.refreshToken) : null
                        };
                    } catch (error) {
                        console.error('Error decrypting tokens for connection:', conn.id, error);
                        return conn;
                    }
                }
                return conn;
            });
        } catch (error) {
            console.error('Error getting all wearable connections:', error);
            return [];
        }
    }

    async getAllWearableConnectionsNearingExpiry(expiryThreshold: Date): Promise<WearableConnection[]> {
        try {
            const connections = await db
                .select()
                .from(wearableConnections)
                .where(
                    and(
                        eq(wearableConnections.status, 'connected'),
                        lt(wearableConnections.tokenExpiresAt, expiryThreshold)
                    )
                );

            // Decrypt tokens for connections
            return connections.map(conn => {
                if (conn.accessToken) {
                    try {
                        return {
                            ...conn,
                            accessToken: decryptToken(conn.accessToken),
                            refreshToken: conn.refreshToken ? decryptToken(conn.refreshToken) : null
                        };
                    } catch (error) {
                        console.error('Error decrypting tokens for connection:', conn.id, error);
                        return conn;
                    }
                }
                return conn;
            });
        } catch (error) {
            console.error('Error getting connections nearing expiry:', error);
            return [];
        }
    }

    async createWearableConnection(connection: InsertWearableConnection): Promise<WearableConnection> {
        try {
            if (!connection.accessToken) {
                throw new Error('accessToken is required to create a wearable connection');
            }
            // Encrypt tokens before storing
            const encryptedConnection = {
                ...connection,
                accessToken: encryptToken(connection.accessToken),
                refreshToken: connection.refreshToken ? encryptToken(connection.refreshToken) : null,
                scopes: Array.isArray(connection.scopes) ? [...connection.scopes] : connection.scopes ?? []
            };

            const [newConnection] = await db
                .insert(wearableConnections)
                .values(encryptedConnection)
                .returning();

            // Return connection with decrypted tokens
            return {
                ...newConnection,
                accessToken: connection.accessToken,
                refreshToken: connection.refreshToken ?? null
            };
        } catch (error) {
            console.error('Error creating wearable connection:', error);
            throw new Error('Failed to create wearable connection');
        }
    }

    async updateWearableConnection(id: string, updates: Partial<InsertWearableConnection>): Promise<WearableConnection | undefined> {
        try {
            // Encrypt tokens if present in updates
            const encryptedUpdates: any = {
                ...updates,
                accessToken: updates.accessToken ? encryptToken(updates.accessToken) : updates.accessToken,
                refreshToken: updates.refreshToken ? encryptToken(updates.refreshToken) : updates.refreshToken,
                scopes: Array.isArray(updates.scopes) ? [...updates.scopes] : updates.scopes
            };

            const [updatedConnection] = await db
                .update(wearableConnections)
                .set(encryptedUpdates)
                .where(eq(wearableConnections.id, id))
                .returning();

            if (!updatedConnection) return undefined;

            // Decrypt tokens before returning
            if (updatedConnection.accessToken) {
                try {
                    return {
                        ...updatedConnection,
                        accessToken: decryptToken(updatedConnection.accessToken),
                        refreshToken: updatedConnection.refreshToken ? decryptToken(updatedConnection.refreshToken) : null
                    };
                } catch (error) {
                    console.error('Error decrypting tokens after update:', error);
                    return updatedConnection;
                }
            }

            return updatedConnection;
        } catch (error) {
            console.error('Error updating wearable connection:', error);
            return undefined;
        }
    }

    async disconnectWearableDevice(id: string, userId: string): Promise<boolean> {
        try {
            const revokedToken = encryptToken('revoked');
            // Null out tokens to prevent credential reuse
            const [connection] = await db
                .update(wearableConnections)
                .set({
                    status: 'disconnected',
                    disconnectedAt: new Date(),
                    accessToken: revokedToken,
                    refreshToken: null,
                    tokenExpiresAt: null
                })
                .where(
                    and(
                        eq(wearableConnections.id, id),
                        eq(wearableConnections.userId, userId)
                    )
                )
                .returning();
            return !!connection;
        } catch (error) {
            console.error('Error disconnecting wearable device:', error);
            return false;
        }
    }

    async saveBiometricData(data: {
        userId: string;
        connectionId: string;
        provider: 'fitbit' | 'oura' | 'whoop';
        dataDate: Date;
        sleepScore?: number | null;
        sleepHours?: number | null;
        deepSleepMinutes?: number | null;
        remSleepMinutes?: number | null;
        lightSleepMinutes?: number | null;
        hrvMs?: number | null;
        restingHeartRate?: number | null;
        averageHeartRate?: number | null;
        maxHeartRate?: number | null;
        recoveryScore?: number | null;
        readinessScore?: number | null;
        strainScore?: number | null;
        steps?: number | null;
        caloriesBurned?: number | null;
        activeMinutes?: number | null;
        spo2Percentage?: number | null;
        skinTempCelsius?: number | null;
        respiratoryRate?: number | null;
        rawData?: Record<string, any>;
    }): Promise<void> {
        try {
            // Upsert - update if exists, insert if not
            await db.insert(biometricData).values({
                userId: data.userId,
                connectionId: data.connectionId,
                provider: data.provider,
                dataDate: data.dataDate,
                sleepScore: data.sleepScore,
                sleepHours: data.sleepHours,
                deepSleepMinutes: data.deepSleepMinutes,
                remSleepMinutes: data.remSleepMinutes,
                lightSleepMinutes: data.lightSleepMinutes,
                hrvMs: data.hrvMs,
                restingHeartRate: data.restingHeartRate,
                averageHeartRate: data.averageHeartRate,
                maxHeartRate: data.maxHeartRate,
                recoveryScore: data.recoveryScore,
                readinessScore: data.readinessScore,
                strainScore: data.strainScore,
                steps: data.steps,
                caloriesBurned: data.caloriesBurned,
                activeMinutes: data.activeMinutes,
                spo2Percentage: data.spo2Percentage,
                skinTempCelsius: data.skinTempCelsius,
                respiratoryRate: data.respiratoryRate,
                rawData: data.rawData ? encryptField(JSON.stringify(data.rawData)) as any : null,
            }).onConflictDoUpdate({
                target: [biometricData.userId, biometricData.dataDate, biometricData.provider],
                set: {
                    sleepScore: data.sleepScore,
                    sleepHours: data.sleepHours,
                    deepSleepMinutes: data.deepSleepMinutes,
                    remSleepMinutes: data.remSleepMinutes,
                    lightSleepMinutes: data.lightSleepMinutes,
                    hrvMs: data.hrvMs,
                    restingHeartRate: data.restingHeartRate,
                    averageHeartRate: data.averageHeartRate,
                    maxHeartRate: data.maxHeartRate,
                    recoveryScore: data.recoveryScore,
                    readinessScore: data.readinessScore,
                    strainScore: data.strainScore,
                    steps: data.steps,
                    caloriesBurned: data.caloriesBurned,
                    activeMinutes: data.activeMinutes,
                    spo2Percentage: data.spo2Percentage,
                    skinTempCelsius: data.skinTempCelsius,
                    respiratoryRate: data.respiratoryRate,
                    rawData: data.rawData ? encryptField(JSON.stringify(data.rawData)) as any : null,
                    syncedAt: new Date(),
                },
            });
        } catch (error) {
            console.error('Error saving biometric data:', error);
            throw new Error('Failed to save biometric data');
        }
    }

    async getBiometricData(userId: string, startDate: Date, endDate: Date): Promise<any[]> {
        try {
            const rows = await db
                .select()
                .from(biometricData)
                .where(and(
                    eq(biometricData.userId, userId),
                    gte(biometricData.dataDate, startDate),
                    lte(biometricData.dataDate, endDate)
                ))
                .orderBy(desc(biometricData.dataDate));
            // Decrypt rawData for each row
            return rows.map(row => {
                if (row.rawData && typeof row.rawData === 'string') {
                    try {
                        return { ...row, rawData: JSON.parse(decryptField(row.rawData)) };
                    } catch {
                        return row; // Legacy unencrypted data
                    }
                }
                return row;
            });
        } catch (error) {
            console.error('Error getting biometric data:', error);
            return [];
        }
    }

    async getBiometricTrends(userId: string, periodType: 'week' | 'month'): Promise<any | null> {
        try {
            const [trend] = await db
                .select()
                .from(biometricTrends)
                .where(and(
                    eq(biometricTrends.userId, userId),
                    eq(biometricTrends.periodType, periodType)
                ))
                .orderBy(desc(biometricTrends.periodEnd))
                .limit(1);

            return trend || null;
        } catch (error) {
            console.error('Error getting biometric trends:', error);
            return null;
        }
    }

    async getJunctionUserId(userId: string): Promise<string | null> {
        const [user] = await db.select({ junctionUserId: users.junctionUserId }).from(users).where(eq(users.id, userId));
        return user?.junctionUserId || null;
    }

    async updateJunctionUserId(userId: string, junctionUserId: string): Promise<void> {
        await db.update(users).set({ junctionUserId }).where(eq(users.id, userId));
    }

    async getUserByJunctionId(junctionUserId: string): Promise<User | null> {
        const [user] = await db.select().from(users).where(eq(users.junctionUserId, junctionUserId));
        return user || null;
    }

    /**
     * Save biometric data from Junction webhook events.
     * Does not require a wearable_connections entry (connectionId is optional).
     */
    async saveJunctionBiometricData(data: {
        userId: string;
        provider: string;
        dataDate: Date;
        sleepScore?: number | null;
        sleepHours?: number | null;
        deepSleepMinutes?: number | null;
        remSleepMinutes?: number | null;
        lightSleepMinutes?: number | null;
        hrvMs?: number | null;
        restingHeartRate?: number | null;
        averageHeartRate?: number | null;
        maxHeartRate?: number | null;
        recoveryScore?: number | null;
        readinessScore?: number | null;
        strainScore?: number | null;
        steps?: number | null;
        caloriesBurned?: number | null;
        activeMinutes?: number | null;
        spo2Percentage?: number | null;
        skinTempCelsius?: number | null;
        respiratoryRate?: number | null;
        rawData?: Record<string, any>;
    }): Promise<void> {
        try {
            // Map Junction provider slugs to our enum values
            const providerMap: Record<string, string> = {
                'oura': 'oura', 'fitbit': 'fitbit', 'fitbit_web': 'fitbit',
                'whoop': 'whoop', 'whoop_v2': 'whoop',
                'garmin': 'garmin', 'garmin_connect': 'garmin',
                'apple_health_kit': 'apple_health', 'apple_health': 'apple_health',
                'google_fit': 'google_fit', 'samsung_health': 'samsung',
                'polar': 'polar', 'withings': 'withings',
                'eight_sleep': 'eight_sleep', 'strava': 'strava',
                'peloton': 'peloton', 'ultrahuman': 'ultrahuman',
                'dexcom': 'dexcom', 'freestyle_libre': 'freestyle_libre',
                'cronometer': 'cronometer', 'omron': 'omron', 'kardia': 'kardia',
            };
            const mappedProvider = providerMap[data.provider.toLowerCase()] || 'junction';

            await db.insert(biometricData).values({
                userId: data.userId,
                connectionId: null,
                provider: mappedProvider as any,
                dataDate: data.dataDate,
                sleepScore: data.sleepScore,
                sleepHours: data.sleepHours,
                deepSleepMinutes: data.deepSleepMinutes,
                remSleepMinutes: data.remSleepMinutes,
                lightSleepMinutes: data.lightSleepMinutes,
                hrvMs: data.hrvMs,
                restingHeartRate: data.restingHeartRate,
                averageHeartRate: data.averageHeartRate,
                maxHeartRate: data.maxHeartRate,
                recoveryScore: data.recoveryScore,
                readinessScore: data.readinessScore,
                strainScore: data.strainScore,
                steps: data.steps,
                caloriesBurned: data.caloriesBurned,
                activeMinutes: data.activeMinutes,
                spo2Percentage: data.spo2Percentage,
                skinTempCelsius: data.skinTempCelsius,
                respiratoryRate: data.respiratoryRate,
                rawData: data.rawData ? encryptField(JSON.stringify(data.rawData)) as any : null,
            }).onConflictDoUpdate({
                target: [biometricData.userId, biometricData.dataDate, biometricData.provider],
                set: {
                    sleepScore: data.sleepScore ?? undefined,
                    sleepHours: data.sleepHours ?? undefined,
                    deepSleepMinutes: data.deepSleepMinutes ?? undefined,
                    remSleepMinutes: data.remSleepMinutes ?? undefined,
                    lightSleepMinutes: data.lightSleepMinutes ?? undefined,
                    hrvMs: data.hrvMs ?? undefined,
                    restingHeartRate: data.restingHeartRate ?? undefined,
                    averageHeartRate: data.averageHeartRate ?? undefined,
                    maxHeartRate: data.maxHeartRate ?? undefined,
                    recoveryScore: data.recoveryScore ?? undefined,
                    readinessScore: data.readinessScore ?? undefined,
                    strainScore: data.strainScore ?? undefined,
                    steps: data.steps ?? undefined,
                    caloriesBurned: data.caloriesBurned ?? undefined,
                    activeMinutes: data.activeMinutes ?? undefined,
                    spo2Percentage: data.spo2Percentage ?? undefined,
                    skinTempCelsius: data.skinTempCelsius ?? undefined,
                    respiratoryRate: data.respiratoryRate ?? undefined,
                    rawData: data.rawData ? encryptField(JSON.stringify(data.rawData)) as any : undefined,
                    syncedAt: new Date(),
                },
            });
        } catch (error) {
            console.error('Error saving Junction biometric data:', error);
            // Don't throw — webhook handlers should not crash on DB errors
        }
    }
}

export const wearablesRepository = new WearablesRepository();
