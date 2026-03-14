/**
 * Conversation Insights — Extract PR angles from user conversations
 *
 * Analyzes conversation patterns to identify trending health topics
 * that can fuel PR pitches with real user data (anonymized).
 *
 * NOTE: The schema has no dedicated `conversations` table with a `topic` column.
 * Instead we use `chatSessions` (title) and `messages` (content) to approximate
 * conversation topics. Topic extraction is done via chat-session titles since
 * full-text analysis of message content would be too expensive at query time.
 */
import { db } from '../../../infra/db/db';
import { chatSessions } from '@shared/schema';
import { desc, sql, gte } from 'drizzle-orm';
import logger from '../../../infra/logging/logger';

export interface ConversationInsight {
  topic: string;
  frequency: number;
  sampleQuestions: string[];
  prAngle: string;
}

/**
 * Get trending health topics from recent user conversations
 * Returns anonymized topic clusters that can be used in PR pitches
 */
export async function getTrendingTopics(days: number = 30): Promise<ConversationInsight[]> {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Query recent chat session titles as a proxy for conversation topics
    // (anonymized — no user IDs or PII are returned)
    const results = await db.select({
      topic: chatSessions.title,
      count: sql<number>`count(*)::int`,
    })
      .from(chatSessions)
      .where(gte(chatSessions.createdAt, since))
      .groupBy(chatSessions.title)
      .orderBy(desc(sql`count(*)`))
      .limit(20);

    // Map to PR-ready insights
    return results
      .filter(r => r.topic && r.count > 2) // Only topics asked about multiple times
      .map(r => ({
        topic: r.topic!,
        frequency: r.count,
        sampleQuestions: [], // Populated by caller if needed
        prAngle: generatePrAngle(r.topic!, r.count),
      }));
  } catch (err: any) {
    logger.warn(`[conversation-insights] Failed to get trending topics: ${err.message}`);
    return [];
  }
}

/**
 * Generate a PR angle from a conversation topic
 */
function generatePrAngle(topic: string, frequency: number): string {
  const topicLower = topic.toLowerCase();

  if (topicLower.includes('vitamin d') || topicLower.includes('vitamin d3')) {
    return `Real users are asking about vitamin D optimization — ${frequency} conversations in the last month show this is a top concern`;
  }
  if (topicLower.includes('sleep') || topicLower.includes('melatonin')) {
    return `Sleep optimization is a trending topic — ${frequency} users sought personalized advice on sleep supplements`;
  }
  if (topicLower.includes('energy') || topicLower.includes('fatigue')) {
    return `Energy and fatigue are driving supplement interest — ${frequency} recent conversations about personalized energy solutions`;
  }
  if (topicLower.includes('gut') || topicLower.includes('digestive') || topicLower.includes('probiotic')) {
    return `Gut health is a major user concern — ${frequency} conversations about personalized digestive support`;
  }

  return `Users are actively seeking advice on "${topic}" — ${frequency} conversations showing real demand for personalized solutions`;
}

/**
 * Get a formatted insights block for use in pitch context
 */
export async function getInsightsBlock(): Promise<string> {
  const insights = await getTrendingTopics(30);
  if (insights.length === 0) return '';

  const lines = insights.slice(0, 5).map(i =>
    `- "${i.topic}": ${i.frequency} user conversations → ${i.prAngle}`
  );

  return `\nTRENDING USER TOPICS (anonymized, last 30 days):\n${lines.join('\n')}\n`;
}
