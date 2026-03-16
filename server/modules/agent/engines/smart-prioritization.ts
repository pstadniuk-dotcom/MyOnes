/**
 * Smart Prioritization — Composite scoring for prospect outreach order
 *
 * Combines multiple signals to determine which prospects to pitch first:
 * - Relevance score (from AI scoring)
 * - Audience size signals
 * - Contact method ease (email > form > dm)
 * - Category match to current PR goals
 * - Recency of discovery
 * - Enrichment data quality
 */
import logger from '../../../infra/logging/logger';
import type { OutreachProspect } from '@shared/schema';

export interface PrioritizedProspect {
  prospect: OutreachProspect;
  priorityScore: number;
  breakdown: {
    relevance: number;
    audience: number;
    accessibility: number;
    freshness: number;
    enrichment: number;
  };
  recommendation: string;
}

/**
 * Score and rank prospects for outreach priority
 */
export function prioritizeProspects(
  prospects: OutreachProspect[],
  options: {
    preferCategory?: 'podcast' | 'press';
    boostEnriched?: boolean;
  } = {},
): PrioritizedProspect[] {
  const scored = prospects.map(prospect => {
    const breakdown = {
      relevance: scoreRelevance(prospect),
      audience: scoreAudience(prospect),
      accessibility: scoreAccessibility(prospect),
      freshness: scoreFreshness(prospect),
      enrichment: scoreEnrichment(prospect),
    };

    let priorityScore = (
      breakdown.relevance * 0.35 +
      breakdown.audience * 0.20 +
      breakdown.accessibility * 0.20 +
      breakdown.freshness * 0.15 +
      breakdown.enrichment * 0.10
    );

    // Category boost
    if (options.preferCategory && prospect.category === options.preferCategory) {
      priorityScore *= 1.15;
    }

    // Enrichment boost
    if (options.boostEnriched && prospect.enrichmentData) {
      priorityScore *= 1.1;
    }

    priorityScore = Math.min(100, Math.round(priorityScore));

    return {
      prospect,
      priorityScore,
      breakdown,
      recommendation: getRecommendation(priorityScore),
    };
  });

  // Sort by priority score descending
  scored.sort((a, b) => b.priorityScore - a.priorityScore);
  return scored;
}

function scoreRelevance(prospect: OutreachProspect): number {
  return prospect.relevanceScore || 50;
}

function scoreAudience(prospect: OutreachProspect): number {
  const estimate = prospect.audienceEstimate?.toLowerCase() || '';
  if (estimate.includes('1m') || estimate.includes('million')) return 95;
  if (estimate.includes('500k') || estimate.includes('100k')) return 80;
  if (estimate.includes('50k') || estimate.includes('10k')) return 60;
  if (estimate.includes('5k') || estimate.includes('1k')) return 40;
  return 30; // Unknown
}

function scoreAccessibility(prospect: OutreachProspect): number {
  if (prospect.contactEmail) return 90;
  if (prospect.contactMethod === 'form' && prospect.contactFormUrl) return 70;
  if (prospect.contactMethod === 'dm') return 50;
  return 20; // Unknown contact method
}

function scoreFreshness(prospect: OutreachProspect): number {
  const ageMs = Date.now() - new Date(prospect.discoveredAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays < 7) return 100;
  if (ageDays < 14) return 80;
  if (ageDays < 30) return 60;
  if (ageDays < 60) return 40;
  return 20;
}

function scoreEnrichment(prospect: OutreachProspect): number {
  const data = (prospect as any).enrichmentData;
  if (!data) return 30;
  let score = 50;
  if (data.episodeCount) score += 15;
  if (data.lastPublishDate) score += 15;
  if (data.rssFeedUrl) score += 10;
  if (data.socialLinks?.length) score += 10;
  return Math.min(100, score);
}

function getRecommendation(score: number): string {
  if (score >= 80) return 'High priority — pitch immediately';
  if (score >= 60) return 'Good prospect — include in next batch';
  if (score >= 40) return 'Moderate — pitch if capacity allows';
  return 'Low priority — consider skipping';
}
