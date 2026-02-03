
import { eq, and, desc, count, isNull } from "drizzle-orm";
import { fileUploads, type FileUpload, type InsertFileUpload } from "@shared/schema";
import { BaseRepository } from "../../infrastructure/database/base.repository";
import { logger } from "../../infrastructure/logging/logger";


export class FilesRepository extends BaseRepository<typeof fileUploads, FileUpload, InsertFileUpload> {
    constructor(db: any) {
        super(db, fileUploads, "FilesRepository");
    }

    async createFile(insertFile: InsertFileUpload): Promise<FileUpload> {
        try {
            const [file] = await this.db.insert(fileUploads).values(insertFile).returning();
            return file;
        } catch (error) {
            logger.error(`[${this.domainName}] Error creating file:`, error);
            throw error;
        }
    }

    async getFile(id: string): Promise<FileUpload | undefined> {
        try {
            const [file] = await this.db.select().from(fileUploads).where(eq(fileUploads.id, id));
            return file || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting file:`, error);
            return undefined;
        }
    }

    async listFileUploadsByUser(userId: string, type?: 'lab_report' | 'medical_document' | 'prescription' | 'other', includeDeleted?: boolean): Promise<FileUpload[]> {
        try {
            let whereClause: any = eq(fileUploads.userId, userId);

            if (type) {
                whereClause = and(whereClause, eq(fileUploads.type, type));
            }

            if (!includeDeleted) {
                whereClause = and(whereClause, isNull(fileUploads.deletedAt));
            }

            return await this.db.select().from(fileUploads).where(whereClause).orderBy(desc(fileUploads.uploadedAt));
        } catch (error) {
            logger.error(`[${this.domainName}] Error listing files:`, error);
            return [];
        }
    }

    async deleteFile(id: string, userId: string): Promise<boolean> {
        try {
            const result = await this.db.delete(fileUploads).where(and(eq(fileUploads.id, id), eq(fileUploads.userId, userId)));
            return (result.rowCount ?? 0) > 0;
        } catch (error) {
            logger.error(`[${this.domainName}] Error deleting file:`, error);
            return false;
        }
    }

    async updateFile(id: string, updateFile: Partial<InsertFileUpload>): Promise<FileUpload | undefined> {
        try {
            const [file] = await this.db.update(fileUploads).set(updateFile).where(eq(fileUploads.id, id)).returning();
            return file || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error updating file:`, error);
            return undefined;
        }
    }

    async softDeleteFile(id: string, userId: string): Promise<boolean> {
        try {
            const result = await this.db.update(fileUploads).set({ deletedAt: new Date() }).where(and(eq(fileUploads.id, id), eq(fileUploads.userId, userId)));
            return (result.rowCount ?? 0) > 0;
        } catch (error) {
            logger.error(`[${this.domainName}] Error soft deleting file:`, error);
            return false;
        }
    }


}
