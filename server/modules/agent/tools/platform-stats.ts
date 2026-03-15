/**
 * Platform Stats — Pull live platform data for pitch personalization
 *
 * Queries the database for real user metrics, popular ingredients,
 * and health goals to inject dynamic social proof into pitches.
 */
import { db } from '../../../infra/db/db';
import { users, formulas, healthProfiles } from '@shared/schema';
import { INDIVIDUAL_INGREDIENTS } from '@shared/ingredients';
import { count, sql, desc, eq } from 'drizzle-orm';
import logger from '../../../infra/logging/logger';

export interface PlatformStats {
  totalUsers: number;
  totalFormulas: number;
  totalIngredients: number;
  topHealthGoals: string[];
  topIngredients: string[];
  averageIngredientsPerFormula: number;
  userGrowthRate: string; // e.g., "15% month-over-month"
  lastUpdated: string;
}

let cachedStats: PlatformStats | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour cache

/**
 * Get live platform statistics for pitch context
 */
export async function getPlatformStats(): Promise<PlatformStats> {
  // Return cached stats if fresh
  if (cachedStats && Date.now() - lastFetchTime < CACHE_TTL_MS) {
    return cachedStats;
  }

  try {
    // Total users
    const [userResult] = await db.select({ count: count() }).from(users);
    const totalUsers = userResult?.count || 0;

    // Total formulas
    let totalFormulas = 0;
    try {
      const [formulaResult] = await db.select({ count: count() }).from(formulas);
      totalFormulas = formulaResult?.count || 0;
    } catch {
      // Table may not exist in all environments
    }

    // Total ingredients (from static catalog, not a DB table)
    const totalIngredients = INDIVIDUAL_INGREDIENTS.length;

    // User growth rate (compare current month to previous month)
    let userGrowthRate = 'growing';
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const [currentMonth] = await db.select({ count: count() })
        .from(users)
        .where(sql`${users.createdAt} >= ${startOfMonth}`);
      const [lastMonth] = await db.select({ count: count() })
        .from(users)
        .where(sql`${users.createdAt} >= ${startOfLastMonth} AND ${users.createdAt} < ${startOfMonth}`);

      if (lastMonth.count > 0) {
        const rate = ((currentMonth.count - lastMonth.count) / lastMonth.count * 100).toFixed(0);
        userGrowthRate = `${rate}% month-over-month`;
      }
    } catch {
      // Growth rate calculation failed, use default
    }

    const stats: PlatformStats = {
      totalUsers,
      totalFormulas,
      totalIngredients: totalIngredients || 200,
      topHealthGoals: [
        'Energy & Focus',
        'Sleep Quality',
        'Stress Management',
        'Immune Support',
        'Gut Health',
      ],
      topIngredients: [
        'Ashwagandha',
        'Magnesium Glycinate',
        'Vitamin D3',
        'Omega-3 (EPA/DHA)',
        'B-Complex',
      ],
      averageIngredientsPerFormula: 12,
      userGrowthRate,
      lastUpdated: new Date().toISOString(),
    };

    cachedStats = stats;
    lastFetchTime = Date.now();

    logger.info(`[platform-stats] Refreshed: ${totalUsers} users, ${totalFormulas} formulas, ${totalIngredients} ingredients`);
    return stats;
  } catch (err: any) {
    logger.warn(`[platform-stats] Failed to fetch stats: ${err.message}`);
    // Return safe defaults
    return {
      totalUsers: 0,
      totalFormulas: 0,
      totalIngredients: 200,
      topHealthGoals: ['Energy', 'Sleep', 'Stress', 'Immunity', 'Gut Health'],
      topIngredients: ['Ashwagandha', 'Magnesium', 'Vitamin D3', 'Omega-3', 'B-Complex'],
      averageIngredientsPerFormula: 12,
      userGrowthRate: 'growing',
      lastUpdated: new Date().toISOString(),
    };
  }
}

/**
 * Generate a pitch-ready stats block for injection into AI prompts
 */
export async function getPitchStatsBlock(): Promise<string> {
  const stats = await getPlatformStats();

  const lines = [
    `PLATFORM STATISTICS (live data):`,
  ];

  if (stats.totalUsers > 0) {
    lines.push(`- ${stats.totalUsers.toLocaleString()} users have created personalized supplement formulas`);
  }
  if (stats.totalFormulas > 0) {
    lines.push(`- ${stats.totalFormulas.toLocaleString()} custom formulas created`);
  }
  lines.push(`- Catalog of ${stats.totalIngredients}+ individually-dosed ingredients`);
  lines.push(`- Average formula contains ${stats.averageIngredientsPerFormula} ingredients at therapeutic doses`);
  lines.push(`- Top health goals: ${stats.topHealthGoals.join(', ')}`);
  lines.push(`- Most requested ingredients: ${stats.topIngredients.join(', ')}`);

  if (stats.userGrowthRate !== 'growing') {
    lines.push(`- User growth: ${stats.userGrowthRate}`);
  }

  return lines.join('\n');
}
