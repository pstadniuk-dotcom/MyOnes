
import { HealthRepository } from "./health.repository";
import { type HealthProfile, type InsertHealthProfile, type WearableConnection } from "@shared/schema";

export class HealthService {
    constructor(private healthRepository: HealthRepository) { }

    async getHealthProfile(userId: string): Promise<HealthProfile | undefined> {
        return this.healthRepository.getHealthProfile(userId);
    }

    async createHealthProfile(profile: InsertHealthProfile): Promise<HealthProfile> {
        return this.healthRepository.createHealthProfile(profile);
    }

    async updateHealthProfile(userId: string, updates: Partial<InsertHealthProfile>): Promise<HealthProfile | undefined> {
        return this.healthRepository.updateHealthProfile(userId, updates);
    }

    async getWearableConnections(userId: string): Promise<WearableConnection[]> {
        return this.healthRepository.getWearableConnections(userId);
    }

    async listLabAnalysesByUser(userId: string) {
        return this.healthRepository.listLabAnalysesByUser(userId);
    }
}
