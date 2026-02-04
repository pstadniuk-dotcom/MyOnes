import { db } from '../../infra/db/db';
import { researchCitations, type ResearchCitation, type InsertResearchCitation } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';

export class IngredientsRepository {
    async getResearchCitationsForIngredient(ingredientName: string): Promise<ResearchCitation[]> {
        // Normalize ingredient name for case-insensitive matching
        const normalizedName = ingredientName.trim();
        const citations = await db
            .select()
            .from(researchCitations)
            .where(and(
                eq(researchCitations.ingredientName, normalizedName),
                eq(researchCitations.isActive, true)
            ))
            .orderBy(desc(researchCitations.publicationYear));
        return citations;
    }

    async createResearchCitation(citation: InsertResearchCitation): Promise<ResearchCitation> {
        const [newCitation] = await db
            .insert(researchCitations)
            .values(citation)
            .returning();
        return newCitation;
    }
}

export const ingredientsRepository = new IngredientsRepository();
