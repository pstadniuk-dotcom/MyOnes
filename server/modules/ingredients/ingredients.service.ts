import { SYSTEM_SUPPORTS, INDIVIDUAL_INGREDIENTS, SYSTEM_SUPPORT_DETAILS, findIngredientByName } from '@shared/ingredients';
import { getIngredientResearch } from '@shared/ingredient-research';
import { ingredientsRepository } from './ingredients.repository';
import logger from '../../infra/logging/logger';

export class IngredientsService {
    async getCatalog() {
        return {
            systemSupports: SYSTEM_SUPPORTS,
            individualIngredients: INDIVIDUAL_INGREDIENTS
        };
    }

    async getBaseDetails() {
        return {
            systemSupportDetails: SYSTEM_SUPPORT_DETAILS
        };
    }

    async getIngredientDetails(ingredientName: string) {
        const decodedName = this.safeDecodeURIComponent(ingredientName);
        const ingredient = findIngredientByName(decodedName);

        if (!ingredient) {
            return null;
        }

        return { ingredient };
    }

    async getIngredientResearch(ingredientName: string) {
        const decodedName = this.safeDecodeURIComponent(ingredientName);
        const ingredient = findIngredientByName(decodedName);

        if (!ingredient) {
            return null;
        }

        // Get pre-built research data from ingredient-research.ts
        const researchData = getIngredientResearch(decodedName);

        // Get custom citations from database
        const dbCitations = await ingredientsRepository.getResearchCitationsForIngredient(decodedName);

        // Convert static research studies to citations format
        const staticCitations = researchData?.studies?.map((study, idx) => ({
            id: `${decodedName}-study-${idx}`,
            citationTitle: study.title,
            journal: study.journal,
            publicationYear: study.year,
            authors: study.authors,
            findings: study.findings,
            sampleSize: study.sampleSize || null,
            pubmedUrl: study.pubmedUrl || null,
            evidenceLevel: study.evidenceLevel,
            studyType: study.studyType
        })) || [];

        // Map DB citations to common format
        const databaseCitations = dbCitations.map(c => ({
            id: c.id,
            citationTitle: c.citationTitle,
            journal: c.journal,
            publicationYear: c.publicationYear,
            authors: c.authors,
            findings: c.findings,
            sampleSize: c.sampleSize,
            pubmedUrl: c.pubmedUrl,
            evidenceLevel: c.evidenceLevel,
            studyType: c.studyType
        }));

        // Combine all citations
        const allCitations = [...staticCitations, ...databaseCitations];

        return {
            ingredientName: ingredient.name,
            summary: researchData?.summary || null,
            keyBenefits: researchData?.keyBenefits || ingredient.benefits || [],
            safetyProfile: researchData?.safetyProfile || null,
            recommendedFor: researchData?.recommendedFor || [],
            citations: allCitations,
            totalCitations: allCitations.length,
            // Basic ingredient info
            type: ingredient.type || '',
            doseMg: ingredient.doseMg,
            doseRangeMin: ingredient.doseRangeMin,
            doseRangeMax: ingredient.doseRangeMax,
            description: ingredient.description
        };
    }

    private safeDecodeURIComponent(str: string): string {
        try {
            return decodeURIComponent(str);
        } catch (e) {
            try {
                return decodeURIComponent(decodeURIComponent(str));
            } catch (e2) {
                return str;
            }
        }
    }
}

export const ingredientsService = new IngredientsService();
