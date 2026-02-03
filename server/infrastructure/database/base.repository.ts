
import { type PgTable } from "drizzle-orm/pg-core";
import { type NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, InferSelectModel, InferInsertModel } from "drizzle-orm";
import { logger } from "../logging/logger";

/**
 * Abstract base repository providing common CRUD operations
 * T: The Drizzle table schema
 * SelectType: The inferred select type (entity)
 * InsertType: The inferred insert type
 */
export abstract class BaseRepository<
    T extends PgTable,
    SelectType = InferSelectModel<T>,
    InsertType = InferInsertModel<T>
> {
    constructor(
        protected readonly db: NodePgDatabase<any>,
        protected readonly table: T,
        protected readonly domainName: string
    ) { }

    /**
     * Find an entity by its ID
     */
    async findById(id: string): Promise<SelectType | undefined> {
        try {
            // @ts-ignore - Assuming 'id' column exists on standard tables
            const [result] = await this.db.select().from(this.table).where(eq(this.table.id, id));
            return result as SelectType | undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error finding by ID:`, error);
            throw error;
        }
    }

    /**
     * List all entities
     */
    async findAll(): Promise<SelectType[]> {
        try {
            // @ts-ignore
            const results = await this.db.select().from(this.table);
            return results as SelectType[];
        } catch (error) {
            logger.error(`[${this.domainName}] Error finding all:`, error);
            throw error;
        }
    }

    /**
     * Create a new entity
     */
    async create(data: InsertType): Promise<SelectType> {
        try {
            // @ts-ignore - Drizzle types can be tricky with generics
            const [result] = await this.db.insert(this.table).values(data as any).returning();
            return result as SelectType;
        } catch (error) {
            logger.error(`[${this.domainName}] Error creating entity:`, error);
            throw error;
        }
    }

    /**
     * Update an entity by ID
     */
    async update(id: string, data: Partial<InsertType>): Promise<SelectType | undefined> {
        try {
            // @ts-ignore
            const [result] = await this.db
                .update(this.table)
                .set(data as any)
                // @ts-ignore
                .where(eq(this.table.id, id))
                .returning();
            return result as SelectType | undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error updating entity:`, error);
            throw error;
        }
    }

    /**
     * Delete an entity by ID
     */
    async delete(id: string): Promise<boolean> {
        try {
            // @ts-ignore
            const result = await this.db.delete(this.table).where(eq(this.table.id, id)).returning();
            return result.length > 0;
        } catch (error) {
            logger.error(`[${this.domainName}] Error deleting entity:`, error);
            throw error;
        }
    }
}
