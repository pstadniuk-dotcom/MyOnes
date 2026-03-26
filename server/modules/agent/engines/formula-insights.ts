/**
 * Formula Insights — Extract product stories from user formula data
 *
 * Pulls anonymized aggregate data about supplement formulations
 * to generate compelling product stories for PR pitches.
 *
 * NOTE: The schema stores ingredients as JSON arrays (`bases` and `additions`)
 * inside the `formulas` table rather than in a separate `formulaIngredients`
 * table. Ingredient-level aggregation is done by unnesting those JSON arrays
 * in SQL so we can count popularity across all formulas.
 */
import { db } from '../../../infra/db/db';
import { formulas } from '@shared/schema';
import { sql, desc } from 'drizzle-orm';
import logger from '../../../infra/logging/logger';

export interface FormulaInsight {
  ingredientName: string;
  usageCount: number;
  avgDosage: string | null;
  category: string;
  storyAngle: string;
}

/**
 * Get the most popular ingredients across all user formulas
 * Returns anonymized aggregate data (no user-specific info)
 *
 * Ingredients are stored as JSON arrays in `formulas.bases` and
 * `formulas.additions`. We unnest them via jsonb_array_elements to
 * aggregate across all formulas.
 */
export async function getPopularIngredients(limit: number = 15): Promise<FormulaInsight[]> {
  try {
    // Unnest the bases and additions JSON arrays and count ingredient usage
    const results = await db.execute(sql`
      SELECT ingredient_name, count(*)::int AS count
      FROM (
        SELECT elem->>'ingredient' AS ingredient_name
        FROM ${formulas}, jsonb_array_elements(bases::jsonb) AS elem
        UNION ALL
        SELECT elem->>'ingredient' AS ingredient_name
        FROM ${formulas}, jsonb_array_elements(additions::jsonb) AS elem
      ) sub
      WHERE ingredient_name IS NOT NULL
      GROUP BY ingredient_name
      ORDER BY count DESC
      LIMIT ${limit}
    `);

    const rows = (results as any).rows ?? results;

    return (Array.isArray(rows) ? rows : []).map((r: any) => ({
      ingredientName: r.ingredient_name,
      usageCount: r.count,
      avgDosage: null,
      category: 'general',
      storyAngle: generateIngredientStory(r.ingredient_name, r.count),
    }));
  } catch (err: any) {
    logger.warn(`[formula-insights] Failed to get popular ingredients: ${err.message}`);
    return [];
  }
}

/**
 * Generate a product story angle from ingredient data
 */
function generateIngredientStory(name: string, count: number): string {
  return `${name} is in ${count} personalized supplements — AI-driven demand signal for this ingredient`;
}

/**
 * Get total formula count and unique ingredient count for platform stats
 */
export async function getFormulaStats(): Promise<{
  totalFormulas: number;
  uniqueIngredients: number;
  topCategories: { category: string; count: number }[];
}> {
  try {
    const [formulaCount] = await db.select({ count: sql<number>`count(*)::int` }).from(formulas);

    // Count unique ingredient names across bases + additions JSON arrays
    const ingredientResult = await db.execute(sql`
      SELECT count(DISTINCT ingredient_name)::int AS count
      FROM (
        SELECT elem->>'ingredient' AS ingredient_name
        FROM ${formulas}, jsonb_array_elements(bases::jsonb) AS elem
        UNION ALL
        SELECT elem->>'ingredient' AS ingredient_name
        FROM ${formulas}, jsonb_array_elements(additions::jsonb) AS elem
      ) sub
      WHERE ingredient_name IS NOT NULL
    `);

    const ingredientRows = (ingredientResult as any).rows ?? ingredientResult;
    const uniqueIngredients = Array.isArray(ingredientRows) && ingredientRows.length > 0
      ? ingredientRows[0].count
      : 0;

    // No separate category column exists — formulas use purpose strings instead.
    // Group by purpose to approximate categories.
    const categoryResult = await db.execute(sql`
      SELECT purpose, count(DISTINCT ingredient_name)::int AS count
      FROM (
        SELECT elem->>'ingredient' AS ingredient_name, elem->>'purpose' AS purpose
        FROM ${formulas}, jsonb_array_elements(bases::jsonb) AS elem
        UNION ALL
        SELECT elem->>'ingredient' AS ingredient_name, elem->>'purpose' AS purpose
        FROM ${formulas}, jsonb_array_elements(additions::jsonb) AS elem
      ) sub
      WHERE ingredient_name IS NOT NULL
      GROUP BY purpose
      ORDER BY count DESC
      LIMIT 5
    `);

    const categoryRows = (categoryResult as any).rows ?? categoryResult;
    const topCategories = (Array.isArray(categoryRows) ? categoryRows : []).map((c: any) => ({
      category: c.purpose || 'general',
      count: c.count,
    }));

    return {
      totalFormulas: formulaCount?.count || 0,
      uniqueIngredients,
      topCategories,
    };
  } catch (err: any) {
    logger.warn(`[formula-insights] Failed to get formula stats: ${err.message}`);
    return { totalFormulas: 0, uniqueIngredients: 0, topCategories: [] };
  }
}

/**
 * Get a formatted product story block for use in pitch context
 */
export async function getProductStoryBlock(): Promise<string> {
  const [ingredients, stats] = await Promise.all([
    getPopularIngredients(5),
    getFormulaStats(),
  ]);

  if (stats.totalFormulas === 0) return '';

  const lines = [
    `PRODUCT DATA (anonymized aggregates):`,
    `- ${stats.totalFormulas} personalized supplements created`,
    `- ${stats.uniqueIngredients} unique ingredients in use`,
    ...ingredients.map(i => `- ${i.ingredientName}: used in ${i.usageCount} supplements`),
  ];

  return `\n${lines.join('\n')}\n`;
}
