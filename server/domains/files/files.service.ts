
import { InsertFileUpload } from "@shared/schema";
import { FilesRepository } from "./files.repository";

export class FilesService {
    constructor(private readonly repository: FilesRepository) { }

    // --- File Management ---

    async getFileUpload(fileId: string) {
        return this.repository.getFile(fileId);
    }

    async listFileUploadsByUser(userId: string, type?: 'lab_report' | 'medical_document' | 'prescription' | 'other', includeDeleted?: boolean) {
        return this.repository.listFileUploadsByUser(userId, type, includeDeleted);
    }

    async deleteFileUpload(fileId: string, userId: string) {
        return this.repository.deleteFile(fileId, userId);
    }

    async createFileUpload(insertFile: InsertFileUpload) {
        return this.repository.createFile(insertFile);
    }

    async updateFileUpload(fileId: string, updateFile: Partial<InsertFileUpload>) {
        return this.repository.updateFile(fileId, updateFile);
    }

    async softDeleteFileUpload(fileId: string, userId: string) {
        return this.repository.softDeleteFile(fileId, userId);
    }

}
