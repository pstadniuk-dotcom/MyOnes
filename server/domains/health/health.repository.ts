
import { eq } from "drizzle-orm";
import { db } from "../../infrastructure/database/db";
import {
    healthProfiles, wearableConnections,
    type HealthProfile, type InsertHealthProfile, type WearableConnection
} from "@shared/schema";
import { BaseRepository } from "../../infrastructure/database/base.repository";
import { logger } from "../../infrastructure/logging/logger";
import { encryptField, decryptField } from "../../infrastructure/security/field-encryption";

export class HealthRepository extends BaseRepository<typeof healthProfiles, HealthProfile, InsertHealthProfile> {
    constructor(db: any) {
        super(db, healthProfiles, "HealthRepository");
    }

    async getHealthProfile(userId: string): Promise<HealthProfile | undefined> {
        try {
            const [profile] = await this.db.select().from(healthProfiles).where(eq(healthProfiles.userId, userId));
            if (!profile) return undefined;

            return this.decryptProfile(profile);
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting health profile:`, error);
            throw error;
        }
    }

    async createHealthProfile(insertProfile: InsertHealthProfile): Promise<HealthProfile> {
        try {
            const encryptedProfile = {
                ...insertProfile,
                conditions: insertProfile.conditions && insertProfile.conditions.length > 0
                    ? encryptField(JSON.stringify(insertProfile.conditions))
                    : null,
                medications: insertProfile.medications && insertProfile.medications.length > 0
                    ? encryptField(JSON.stringify(insertProfile.medications))
                    : null,
                allergies: insertProfile.allergies && insertProfile.allergies.length > 0
                    ? encryptField(JSON.stringify(insertProfile.allergies))
                    : null
            };

            const [profile] = await this.db.insert(healthProfiles).values(encryptedProfile as any).returning();
            return this.decryptProfile(profile);
        } catch (error) {
            logger.error(`[${this.domainName}] Error creating health profile:`, error);
            throw error;
        }
    }

    async updateHealthProfile(userId: string, updates: Partial<InsertHealthProfile>): Promise<HealthProfile | undefined> {
        try {
            const encryptedUpdates: any = {
                ...updates,
                conditions: updates.conditions !== undefined
                    ? (updates.conditions && updates.conditions.length > 0
                        ? encryptField(JSON.stringify(updates.conditions))
                        : null)
                    : undefined,
                medications: updates.medications !== undefined
                    ? (updates.medications && updates.medications.length > 0
                        ? encryptField(JSON.stringify(updates.medications))
                        : null)
                    : undefined,
                allergies: updates.allergies !== undefined
                    ? (updates.allergies && updates.allergies.length > 0
                        ? encryptField(JSON.stringify(updates.allergies))
                        : null)
                    : undefined,
                updatedAt: new Date()
            };

            const cleanUpdates = Object.fromEntries(
                Object.entries(encryptedUpdates).filter(([_, v]) => v !== undefined)
            );

            const [profile] = await this.db
                .update(healthProfiles)
                .set(cleanUpdates)
                .where(eq(healthProfiles.userId, userId))
                .returning();

            if (!profile) return undefined;
            return this.decryptProfile(profile);
        } catch (error) {
            logger.error(`[${this.domainName}] Error updating health profile:`, error);
            throw error;
        }
    }

    private decryptProfile(profile: any): HealthProfile {
        let conditions: string[] = [];
        let medications: string[] = [];
        let allergies: string[] = [];

        try {
            if (profile.conditions) {
                if (Array.isArray(profile.conditions)) {
                    conditions = profile.conditions;
                } else if (typeof profile.conditions === 'string') {
                    conditions = JSON.parse(decryptField(profile.conditions));
                }
            }
        } catch (e) { logger.warn(`[${this.domainName}] Error decrypting conditions`); }

        try {
            if (profile.medications) {
                if (Array.isArray(profile.medications)) {
                    medications = profile.medications;
                } else if (typeof profile.medications === 'string') {
                    medications = JSON.parse(decryptField(profile.medications));
                }
            }
        } catch (e) { logger.warn(`[${this.domainName}] Error decrypting medications`); }

        try {
            if (profile.allergies) {
                if (Array.isArray(profile.allergies)) {
                    allergies = profile.allergies;
                } else if (typeof profile.allergies === 'string') {
                    allergies = JSON.parse(decryptField(profile.allergies));
                }
            }
        } catch (e) { logger.warn(`[${this.domainName}] Error decrypting allergies`); }

        return {
            ...profile,
            conditions,
            medications,
            allergies
        };
    }

    async getWearableConnections(userId: string): Promise<WearableConnection[]> {
        try {
            return await this.db.select().from(wearableConnections).where(eq(wearableConnections.userId, userId));
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting wearable connections:`, error);
            return [];
        }
    }

    async listLabAnalysesByUser(userId: string) {
        try {
            // Import labAnalyses from schema
            const { labAnalyses } = await import('@shared/schema');
            return await this.db.select().from(labAnalyses).where(eq(labAnalyses.userId, userId));
        } catch (error) {
            logger.error(`[${this.domainName}] Error listing lab analyses:`, error);
            return [];
        }
    }
}
