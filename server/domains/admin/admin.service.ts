
import { AdminRepository } from "./admin.repository";

export class AdminService {
    constructor(private repository: AdminRepository) { }

    async getUserGrowthData(days: number) {
        return this.repository.getUserGrowthData(days);
    }

    async getRevenueData(days: number) {
        return this.repository.getRevenueData(days);
    }

    async getPendingActions() {
        return this.repository.getPendingActions();
    }

    async getActivityFeed(limit: number) {
        return this.repository.getActivityFeed(limit);
    }

    async getConversionFunnel() {
        return this.repository.getConversionFunnel();
    }

    async getCohortRetention(months: number) {
        return this.repository.getCohortRetention(months);
    }

    async getReorderHealth() {
        return this.repository.getReorderHealth();
    }

    async getUserTimeline(userId: string) {
        return this.repository.getUserTimeline(userId);
    }

    async exportUsers(filter: string) {
        return this.repository.exportUsers(filter);
    }
}
