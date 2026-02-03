import { db } from "server/infrastructure/database/db";
import { FilesRepository } from "./files.repository";
import { FilesService } from "./files.service";

const fileRepository = new FilesRepository(db);
export const filesService = new FilesService(fileRepository);

export * from "./files.repository";
export * from "./files.service";

