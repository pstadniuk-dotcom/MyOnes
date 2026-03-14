/**
 * Pitch Quality Scorer — Self-evaluation of pitch quality before human review
 *
 * Checks pitches against quality criteria and flags low-quality ones
 * for automatic redraft. Runs after AI drafting but before the review queue.
 */
import logger from '../../../infra/logging/logger';
import type { OutreachPitch, OutreachProspect } from '@shared/schema';

export interface PitchQualityResult {
  score: number;                  // 0-100
  passed: boolean;                // true if score >= 60
  checks: PitchQualityCheck[];
  recommendation: 'approve' | 'review' | 'redraft';
}

interface PitchQualityCheck {
  name: string;
  passed: boolean;
  score: number;      // points earned
  maxScore: number;   // max possible
  detail: string;
}

// Phrases that indicate a generic, low-quality pitch
const BANNED_PHRASES = [
  'i hope this finds you well',
  'i hope this email finds you well',
  'i would love to',
  'i\'d love to come on',
  'just reaching out',
  'i wanted to reach out',
  'i came across your',
  'i stumbled upon',
  'dear sir or madam',
  'to whom it may concern',
  'i am writing to',
  'please find attached',
  'at your earliest convenience',
];

const GENERIC_SUBJECT_PATTERNS = [
  /^(hi|hello|hey)\b/i,
  /^interview request$/i,
  /^collaboration opportunity$/i,
  /^partnership inquiry$/i,
  /^guest post submission$/i,
];

/**
 * Score a pitch for quality before it hits the review queue
 */
export function scorePitchQuality(
  pitch: OutreachPitch,
  prospect: OutreachProspect,
): PitchQualityResult {
  const checks: PitchQualityCheck[] = [];

  // 1. Word count check (15 points)
  const wordCount = pitch.body.split(/\s+/).length;
  const idealMin = 80;
  const idealMax = 250;
  const wordCountOk = wordCount >= idealMin && wordCount <= idealMax;
  checks.push({
    name: 'word_count',
    passed: wordCountOk,
    score: wordCountOk ? 15 : (wordCount < idealMin ? 5 : 8),
    maxScore: 15,
    detail: `${wordCount} words (ideal: ${idealMin}-${idealMax})`,
  });

  // 2. Subject line uniqueness (15 points)
  const subjectIsGeneric = GENERIC_SUBJECT_PATTERNS.some(p => p.test(pitch.subject));
  const subjectLen = pitch.subject.length;
  const subjectOk = !subjectIsGeneric && subjectLen >= 10 && subjectLen <= 100;
  checks.push({
    name: 'subject_quality',
    passed: subjectOk,
    score: subjectOk ? 15 : (subjectIsGeneric ? 0 : 8),
    maxScore: 15,
    detail: subjectIsGeneric ? 'Generic subject line detected' : `Subject: "${pitch.subject.substring(0, 50)}"`,
  });

  // 3. Prospect name/show name appears in pitch (20 points)
  const bodyLower = pitch.body.toLowerCase();
  const subjectLower = pitch.subject.toLowerCase();
  const nameInPitch = bodyLower.includes(prospect.name.toLowerCase()) ||
    subjectLower.includes(prospect.name.toLowerCase());
  const hostInPitch = prospect.hostName ?
    (bodyLower.includes(prospect.hostName.toLowerCase()) || subjectLower.includes(prospect.hostName.toLowerCase())) : false;
  const personalizationScore = (nameInPitch ? 10 : 0) + (hostInPitch ? 10 : 0);
  checks.push({
    name: 'personalization',
    passed: nameInPitch || hostInPitch,
    score: personalizationScore,
    maxScore: 20,
    detail: `Show name: ${nameInPitch ? 'yes' : 'no'}, Host name: ${hostInPitch ? 'yes' : 'N/A'}`,
  });

  // 4. No banned phrases (20 points)
  const foundBanned = BANNED_PHRASES.filter(phrase =>
    bodyLower.includes(phrase)
  );
  const noBannedPhrases = foundBanned.length === 0;
  checks.push({
    name: 'no_banned_phrases',
    passed: noBannedPhrases,
    score: noBannedPhrases ? 20 : Math.max(0, 20 - foundBanned.length * 5),
    maxScore: 20,
    detail: noBannedPhrases ? 'No generic phrases found' : `Found: ${foundBanned.join(', ')}`,
  });

  // 5. Has specific content reference (15 points)
  const hasSpecificRef = /\b(episode|article|post|piece|interview|show|review)\b/i.test(pitch.body) &&
    (/\b(recent|latest|your|this week|last)\b/i.test(pitch.body) || nameInPitch);
  checks.push({
    name: 'content_reference',
    passed: hasSpecificRef,
    score: hasSpecificRef ? 15 : 5,
    maxScore: 15,
    detail: hasSpecificRef ? 'References specific content' : 'No specific content reference detected',
  });

  // 6. Has clear call to action (15 points)
  const hasCta = /\b(would|could|shall|can)\b.*\b(chat|call|talk|discuss|connect|schedule|hop on)\b/i.test(pitch.body) ||
    /\?\s*$/m.test(pitch.body);
  checks.push({
    name: 'call_to_action',
    passed: hasCta,
    score: hasCta ? 15 : 5,
    maxScore: 15,
    detail: hasCta ? 'Clear CTA present' : 'Missing clear call-to-action',
  });

  // Calculate total
  const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
  const passed = totalScore >= 60;

  const recommendation = totalScore >= 75 ? 'approve'
    : totalScore >= 50 ? 'review'
    : 'redraft';

  const result: PitchQualityResult = {
    score: totalScore,
    passed,
    checks,
    recommendation,
  };

  logger.info(`[pitch-quality] Pitch for "${prospect.name}": score=${totalScore}/100, recommendation=${recommendation}`);
  return result;
}

/**
 * Batch score pitches and return statistics
 */
export function batchScorePitches(
  pitchesWithProspects: Array<{ pitch: OutreachPitch; prospect: OutreachProspect }>,
): {
  results: Array<{ pitchId: string; result: PitchQualityResult }>;
  avgScore: number;
  passRate: number;
} {
  const results = pitchesWithProspects.map(({ pitch, prospect }) => ({
    pitchId: pitch.id,
    result: scorePitchQuality(pitch, prospect),
  }));

  const avgScore = results.length > 0
    ? results.reduce((sum, r) => sum + r.result.score, 0) / results.length
    : 0;

  const passRate = results.length > 0
    ? results.filter(r => r.result.passed).length / results.length
    : 0;

  return { results, avgScore, passRate };
}
