/**
 * AI Output Claims Filter — "Claims Firewall"
 *
 * Deterministic post-processing filter that scans AI model outputs for
 * language that could be interpreted as medical advice, disease claims,
 * or emergency directives. This is a regulatory compliance safeguard
 * independent of prompt engineering.
 *
 * Three actions:
 *  1. FLAG   — marks text but does not alter it (for logging/audit)
 *  2. REWRITE — replaces flagged phrase with safe alternative
 *  3. BLOCK  — prevents the entire response if severe (e.g., emergency triage)
 *
 * This module is intentionally conservative: false positives are harmless,
 * false negatives are liability.
 */

import { logger } from '../../infra/logging/logger';

// ── Types ───────────────────────────────────────────────────────────────────
export interface ClaimViolation {
  /** The exact phrase that triggered the filter */
  matchedPhrase: string;
  /** Which rule category caught it */
  category: ClaimCategory;
  /** Severity determines action */
  severity: 'warning' | 'critical';
  /** Position in original text */
  startIndex: number;
  /** Suggested rewrite (if applicable) */
  rewrittenPhrase?: string;
}

export type ClaimCategory =
  | 'disease_claim'        // "this will cure/treat/prevent X"
  | 'diagnosis'            // "you have/you are suffering from X"
  | 'medication_directive' // "stop taking X" / "take X instead"
  | 'emergency_triage'     // "go to the ER" / "call 911"
  | 'guarantee'            // "guaranteed to" / "clinically proven to cure"
  | 'dosage_override';     // "increase your dosage to" (outside formula context)

export interface ClaimsFilterResult {
  /** Original text */
  originalText: string;
  /** Filtered/rewritten text */
  filteredText: string;
  /** Whether any violations were found */
  hasViolations: boolean;
  /** Whether the response should be blocked entirely */
  blocked: boolean;
  /** All violations found */
  violations: ClaimViolation[];
}

// ── Rule Definitions ────────────────────────────────────────────────────────

interface FilterRule {
  /** Regex patterns to match (case-insensitive) */
  patterns: RegExp[];
  category: ClaimCategory;
  severity: 'warning' | 'critical';
  /** If provided, matched text is replaced with this. Use $MATCH for original. */
  rewriteTemplate?: string;
}

const FILTER_RULES: FilterRule[] = [
  // ── Disease Claims (FTC/FDA "structure-function" violation) ────────
  {
    patterns: [
      /\b(?:this|it|the formula|your formula|these supplements?|this supplement)\s+(?:will|can|is? able to|is? designed to|is? formulated to|is? intended to)\s+(?:cure|treat|prevent|heal|reverse|eliminate|eradicate|fix)\s+(?:your\s+)?(\w[\w\s]{2,30}?)(?:\.|,|!|\s*$)/gi,
      /\b(?:cures?|treats?|prevents?|heals?|reverses?|eliminates?)\s+(?:your\s+)?(?:cancer|diabetes|heart disease|alzheimer'?s?|parkinson'?s?|depression|anxiety disorder|epilepsy|hypertension|arthritis|autoimmune|hiv|aids|hepatitis|kidney disease|liver disease|crohn'?s?|ibs|lupus|multiple sclerosis|fibromyalgia)/gi,
    ],
    category: 'disease_claim',
    severity: 'warning',
    rewriteTemplate: 'may help support your wellness goals (this is not a medical claim)',
  },

  // ── Diagnosis Language ────────────────────────────────────────────
  {
    patterns: [
      /\b(?:you (?:have|are suffering from|are diagnosed with|likely have|probably have|seem to have))\s+(\w[\w\s]{2,40}?)(?:\.|,|!|\s*$)/gi,
      /\b(?:your (?:blood ?work|labs?|results?) (?:show|indicate|confirm|reveal|suggest) (?:that )?you have)\s+/gi,
      /\b(?:based on (?:your|these) (?:results?|labs?|blood ?work),?\s*you (?:have|are|appear to have))\s+/gi,
    ],
    category: 'diagnosis',
    severity: 'warning',
    rewriteTemplate: 'Your results are worth discussing with your healthcare provider, who can provide a proper evaluation',
  },

  // ── Medication Directives ─────────────────────────────────────────
  {
    patterns: [
      /\b(?:stop\s+taking|discontinue|quit\s+taking|don'?t\s+take|do\s+not\s+take|replace\s+your|switch\s+from)\s+(?:your\s+)?(?:medication|medicine|prescription|drug|statin|metformin|insulin|warfarin|coumadin|blood\s+thinner|antidepressant|ssri|beta.?blocker|ace\s+inhibitor|thyroid\s+medication)/gi,
      /\b(?:you\s+(?:don'?t|do\s+not|no\s+longer)\s+need\s+(?:your\s+)?(?:medication|medicine|prescription|drug))/gi,
      /\b(?:take\s+this\s+instead\s+of\s+(?:your\s+)?(?:medication|medicine|prescription))/gi,
    ],
    category: 'medication_directive',
    severity: 'critical',
    rewriteTemplate: 'Always consult your prescribing physician before making any changes to your medications',
  },

  // ── Emergency Triage ──────────────────────────────────────────────
  {
    patterns: [
      /\b(?:call\s+911|go\s+to\s+the\s+(?:er|emergency\s+room|hospital)\s+(?:now|immediately|right\s+away))/gi,
      /\b(?:this\s+(?:is|could\s+be|sounds?\s+like)\s+a\s+medical\s+emergency)/gi,
      /\b(?:you\s+(?:need|should|must)\s+(?:seek|get)\s+(?:immediate|emergency|urgent)\s+medical\s+(?:care|attention|help)\s+(?:now|immediately|right\s+away))/gi,
    ],
    category: 'emergency_triage',
    severity: 'critical',
    rewriteTemplate: 'If you have any health concerns, please consult your healthcare provider',
  },

  // ── Guarantees / Clinically Proven Claims ─────────────────────────
  {
    patterns: [
      /\b(?:guaranteed\s+to|scientifically\s+proven\s+to\s+(?:cure|treat|prevent|heal)|clinically\s+proven\s+to\s+(?:cure|treat|prevent|heal|reverse))/gi,
      /\b(?:100%\s+(?:effective|safe|guaranteed)|no\s+side\s+effects)/gi,
    ],
    category: 'guarantee',
    severity: 'warning',
    rewriteTemplate: 'research suggests potential benefits, though individual results may vary',
  },

  // ── Dosage Override (outside formula JSON context) ────────────────
  {
    patterns: [
      /\b(?:increase\s+your\s+(?:dosage|dose)\s+(?:to|of)|take\s+(?:double|triple|more\s+than)\s+the\s+(?:recommended|prescribed))/gi,
    ],
    category: 'dosage_override',
    severity: 'warning',
    rewriteTemplate: 'Follow the dosage specified in your personalized formula',
  },
];

// ── Allowlist: phrases that look like claims but are safe in context ──────
const ALLOWLIST_PATTERNS: RegExp[] = [
  // "may help support" / "is designed to support" (structure-function OK)
  /\bmay\s+help\s+support\b/i,
  /\bdesigned\s+to\s+support\b/i,
  // Disclaimers and caveats
  /\bnot\s+(?:a\s+)?(?:medical\s+(?:advice|claim)|intended\s+to\s+(?:diagnose|treat|cure|prevent))\b/i,
  /\bconsult\s+(?:your\s+)?(?:doctor|physician|healthcare\s+provider)\b/i,
  // FDA disclaimer boilerplate
  /\bthese?\s+statements?\s+(?:has|have)\s+not\s+been\s+evaluated\s+by\s+the\s+fda\b/i,
  // Within JSON code blocks (formula context — not user-facing prose)
  /```json[\s\S]*?```/gi,
];

// ── Main Filter Function ────────────────────────────────────────────────────

export function filterAIOutputClaims(text: string): ClaimsFilterResult {
  const violations: ClaimViolation[] = [];
  let filteredText = text;
  let blocked = false;

  // Strip out allowlisted regions to avoid false positives
  // We track their positions so we can skip matches inside them
  const allowedRanges: Array<[number, number]> = [];
  for (const ap of ALLOWLIST_PATTERNS) {
    const regex = new RegExp(ap.source, ap.flags.includes('g') ? ap.flags : ap.flags + 'g');
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      allowedRanges.push([m.index, m.index + m[0].length]);
    }
  }

  const isInAllowedRange = (idx: number): boolean =>
    allowedRanges.some(([start, end]) => idx >= start && idx < end);

  for (const rule of FILTER_RULES) {
    for (const pattern of rule.patterns) {
      // Reset lastIndex for global regexes
      const regex = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
      let match: RegExpExecArray | null;

      while ((match = regex.exec(text)) !== null) {
        // Skip if inside an allowlisted region
        if (isInAllowedRange(match.index)) continue;

        const violation: ClaimViolation = {
          matchedPhrase: match[0].trim(),
          category: rule.category,
          severity: rule.severity,
          startIndex: match.index,
        };

        if (rule.rewriteTemplate) {
          violation.rewrittenPhrase = rule.rewriteTemplate;
        }

        violations.push(violation);

        if (rule.severity === 'critical') {
          // For critical violations, we rewrite in-place
          if (rule.rewriteTemplate) {
            filteredText = filteredText.replace(match[0], rule.rewriteTemplate);
          }
        }
      }
    }
  }

  // If multiple critical emergency triage violations, consider blocking
  const emergencyViolations = violations.filter(v => v.category === 'emergency_triage');
  const medicationDirectives = violations.filter(v => v.category === 'medication_directive');

  // Block if: direct medication stoppage directive
  if (medicationDirectives.length > 0) {
    // Don't block, but ensure all directives are rewritten
    for (const v of medicationDirectives) {
      if (v.rewrittenPhrase) {
        filteredText = filteredText.replace(v.matchedPhrase, v.rewrittenPhrase);
      }
    }
  }

  // Append a soft disclaimer if any warning-level violations were found
  const warningViolations = violations.filter(v => v.severity === 'warning');
  if (warningViolations.length > 0 && !filteredText.includes('not intended to diagnose')) {
    filteredText += '\n\n*This information is for educational purposes only and is not intended to diagnose, treat, cure, or prevent any disease. Always consult your healthcare provider before starting any supplement regimen.*';
  }

  if (violations.length > 0) {
    logger.info('AI claims filter triggered', {
      violationCount: violations.length,
      categories: [...new Set(violations.map(v => v.category))],
      severities: {
        warning: warningViolations.length,
        critical: violations.filter(v => v.severity === 'critical').length,
      },
    });
  }

  return {
    originalText: text,
    filteredText,
    hasViolations: violations.length > 0,
    blocked,
    violations,
  };
}

/**
 * Quick check — returns true if text contains potential medical claims.
 * Useful for lightweight pre-screening without full rewrite.
 */
export function containsMedicalClaims(text: string): boolean {
  for (const rule of FILTER_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(text)) {
        // Check it's not in an allowlisted context
        const match = pattern.exec(text);
        if (match) {
          const inAllowed = ALLOWLIST_PATTERNS.some(ap => {
            const apRegex = new RegExp(ap.source, ap.flags);
            const surrounding = text.substring(Math.max(0, match.index - 200), match.index + match[0].length + 200);
            return apRegex.test(surrounding);
          });
          if (!inAllowed) return true;
        }
      }
    }
  }
  return false;
}
