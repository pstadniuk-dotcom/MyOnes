type CapsuleRecommendation = 6 | 9 | 12;

type Confidence = 'low' | 'medium' | 'high';

type HealthProfileLike = {
    conditions?: string[] | null;
    medications?: string[] | null;
};

export interface ProtocolRecommendationDecision {
    recommendedCapsules: CapsuleRecommendation;
    confidence: Confidence;
    summary: string;
    signals: string[];
    metrics: {
        abnormalCount: number;
        criticalCount: number;
        systemBreadth: number;
        complexityCount: number;
        severityScore: number;
        breadthScore: number;
        complexityScore: number;
        medicationRiskScore: number;
        totalScore: number;
        cardiometabolicHighRisk: boolean;
    };
}

function includesAny(text: string, patterns: RegExp[]): boolean {
    return patterns.some((pattern) => pattern.test(text));
}

function detectSystemBreadth(contextText: string): number {
    const systemPatterns: Record<string, RegExp[]> = {
        cardiometabolic: [
            /apo\s*b/i,
            /ldl\s*-?p/i,
            /ldl(?!\s*-?p)/i,
            /hdl/i,
            /triglycerides?|tg\b/i,
            /pattern\s*b/i,
            /homocysteine/i,
            /omegacheck|omega\s*-?3\s*index/i,
        ],
        glucose: [
            /glucose/i,
            /insulin/i,
            /a1c|hba1c/i,
            /homa[-\s]?ir/i,
        ],
        inflammation: [
            /crp|hs-?crp/i,
            /esr/i,
            /inflammation/i,
        ],
        thyroid_hormonal: [
            /thyroid|tsh|free\s*t3|free\s*t4|estradiol|testosterone|cortisol/i,
        ],
        liver_kidney: [
            /alt|ast|ggt|bilirubin|alkaline\s*phosphatase|creatinine|egfr|bun/i,
        ],
        nutrient_status: [
            /vitamin\s*d|b12|folate|ferritin|magnesium|zinc|iron/i,
        ],
        hematology: [
            /hemoglobin|hematocrit|rbc|wbc|platelet/i,
        ],
    };

    return Object.values(systemPatterns).reduce((count, patterns) => {
        return count + (includesAny(contextText, patterns) ? 1 : 0);
    }, 0);
}

function detectCardiometabolicHighRisk(contextText: string, abnormalCount: number): boolean {
    const markerHits = [
        /apo\s*b/i,
        /ldl\s*-?p/i,
        /pattern\s*b/i,
        /triglycerides?|tg\b/i,
        /hdl/i,
        /omegacheck|omega\s*-?3\s*index/i,
        /homocysteine/i,
    ].reduce((count, pattern) => count + (pattern.test(contextText) ? 1 : 0), 0);

    const explicitSevereValue = includesAny(contextText, [
        /apo\s*b[^\n]{0,30}\b(1[2-9][0-9]|[2-9][0-9]{2})\b/i,
        /ldl\s*-?p[^\n]{0,30}\b(1[4-9][0-9]{2}|[2-9][0-9]{3})\b/i,
        /homocysteine[^\n]{0,30}\b(1[4-9]|[2-9][0-9])\b/i,
        /omega(?:check|\s*-?3\s*index)[^\n]{0,30}\b([0-3](?:\.\d+)?|4(?:\.0+)?)\b/i,
    ]);

    return explicitSevereValue || (markerHits >= 3 && abnormalCount >= 6);
}

function calculateSeverityScore(criticalCount: number, abnormalCount: number): number {
    if (criticalCount >= 3) return 5;
    if (criticalCount === 2) return 4;
    if (criticalCount === 1) return 3;
    if (abnormalCount >= 14) return 3;
    if (abnormalCount >= 8) return 2;
    if (abnormalCount >= 4) return 1;
    return 0;
}

function calculateBreadthScore(systemBreadth: number): number {
    if (systemBreadth >= 5) return 4;
    if (systemBreadth >= 4) return 3;
    if (systemBreadth >= 3) return 2;
    if (systemBreadth >= 2) return 1;
    return 0;
}

function calculateComplexityScore(complexityCount: number): number {
    if (complexityCount >= 4) return 3;
    if (complexityCount >= 2) return 2;
    if (complexityCount >= 1) return 1;
    return 0;
}

function calculateMedicationRiskScore(medications: string[]): number {
    if (medications.length === 0) return 0;
    const text = medications.join(' ').toLowerCase();
    let score = 0;

    if (/(warfarin|eliquis|xarelto|pradaxa|clopidogrel|aspirin|heparin|enoxaparin)/i.test(text)) {
        score += 1;
    }
    if (/(sertraline|fluoxetine|escitalopram|citalopram|paroxetine|venlafaxine|duloxetine|maoi|lithium)/i.test(text)) {
        score += 1;
    }
    if (/(levothyroxine|liothyronine|synthroid|armour\s*thyroid)/i.test(text)) {
        score += 1;
    }

    return Math.min(score, 2);
}

function extractTopAbnormalMarkers(contextText: string, limit = 4): string[] {
    const lines = contextText.split(/\r?\n/);
    const markers: string[] = [];

    for (const line of lines) {
        if (!/status:\s*(high|low|critical)/i.test(line)) continue;
        const markerMatch = line.match(/^\s*([^:]{2,60}):/);
        if (!markerMatch) continue;

        const markerName = markerMatch[1].replace(/\s+/g, ' ').trim();
        if (!markerName) continue;
        if (!markers.some((existing) => existing.toLowerCase() === markerName.toLowerCase())) {
            markers.push(markerName);
        }
        if (markers.length >= limit) break;
    }

    return markers;
}

function buildSummary(
    recommendedCapsules: CapsuleRecommendation,
    confidence: Confidence,
    abnormalCount: number,
    criticalCount: number,
    systemBreadth: number,
    topMarkers: string[]
): string {
    const confidenceText = confidence === 'high' ? 'high confidence' : confidence === 'medium' ? 'moderate confidence' : 'initial confidence';
    const markerText = topMarkers.length > 0
        ? `Key out-of-range markers include ${topMarkers.join(', ')}.`
        : `${abnormalCount} marker${abnormalCount === 1 ? '' : 's'} currently out of range across ${systemBreadth} system${systemBreadth === 1 ? '' : 's'}.`;
    const criticalText = criticalCount > 0
        ? ` ${criticalCount} critical marker${criticalCount === 1 ? '' : 's'} detected.`
        : '';

    return `Based on your current labs and profile, ${recommendedCapsules} capsules/day is suggested (${confidenceText}). ${markerText}${criticalText}`.trim();
}

export function recommendDailyProtocolCapsules(
    labDataContext: string | null | undefined,
    healthProfile?: HealthProfileLike | null
): ProtocolRecommendationDecision {
    const contextText = String(labDataContext || '');

    const abnormalCount = (contextText.match(/status:\s*(high|low|critical)/gi) || []).length;
    const criticalCount = (contextText.match(/status:\s*critical/gi) || []).length;

    const conditions = Array.isArray(healthProfile?.conditions) ? healthProfile!.conditions!.filter(Boolean) : [];
    const medications = Array.isArray(healthProfile?.medications) ? healthProfile!.medications!.filter(Boolean) : [];

    const complexityCount = conditions.length + medications.length;
    const systemBreadth = detectSystemBreadth(contextText);
    const cardiometabolicHighRisk = detectCardiometabolicHighRisk(contextText, abnormalCount);

    const severityScore = calculateSeverityScore(criticalCount, abnormalCount);
    const breadthScore = calculateBreadthScore(systemBreadth);
    const complexityScore = calculateComplexityScore(complexityCount);
    const medicationRiskScore = calculateMedicationRiskScore(medications);
    const totalScore = severityScore + breadthScore + complexityScore + medicationRiskScore;
    const topMarkers = extractTopAbnormalMarkers(contextText);

    let recommendedCapsules: CapsuleRecommendation = 6;
    const signals: string[] = [];

    const meets12Gate =
        (criticalCount >= 3 && systemBreadth >= 3 && complexityCount >= 2) ||
        (totalScore >= 11 && criticalCount >= 2 && systemBreadth >= 3) ||
        (totalScore >= 13 && systemBreadth >= 4 && complexityCount >= 3);

    if (meets12Gate) {
        recommendedCapsules = 12;
        signals.push(`${criticalCount} critical marker${criticalCount === 1 ? '' : 's'} and broad multi-system involvement indicate high clinical intensity needs.`);
        if (topMarkers.length > 0) {
            signals.push(`Highest-priority markers driving this depth: ${topMarkers.slice(0, 3).join(', ')}.`);
        }
    } else {
        const moderateBurden = totalScore >= 4 || abnormalCount >= 4 || complexityCount >= 1;
        if (cardiometabolicHighRisk || moderateBurden) {
            recommendedCapsules = 9;
            if (cardiometabolicHighRisk) {
                const markerHint = topMarkers.length > 0 ? ` (${topMarkers.slice(0, 3).join(', ')})` : '';
                signals.push(`Cardiometabolic risk pattern is present${markerHint}, so 9 capsules provides stronger day-to-day coverage than the baseline tier.`);
            }
            if (moderateBurden) {
                signals.push(`${abnormalCount} marker${abnormalCount === 1 ? '' : 's'} are currently out of range across ${systemBreadth} system${systemBreadth === 1 ? '' : 's'}, which supports a targeted 9-capsule plan.`);
            }
            if (complexityCount > 0) {
                signals.push(`Your profile includes ${conditions.length} condition${conditions.length === 1 ? '' : 's'} and ${medications.length} medication${medications.length === 1 ? '' : 's'}, which benefits from additional formulation flexibility.`);
            }
        } else {
            recommendedCapsules = 6;
            signals.push(`Only ${abnormalCount} marker${abnormalCount === 1 ? '' : 's'} are currently out of range with low profile complexity, so a 6-capsule foundational protocol is appropriate.`);
            if (topMarkers.length > 0) {
                signals.push(`Primary focus markers at this stage: ${topMarkers.slice(0, 2).join(', ')}.`);
            }
        }
    }

    const confidence: Confidence =
        totalScore >= 8 || criticalCount >= 2
            ? 'high'
            : totalScore >= 4 || abnormalCount >= 4 || complexityCount >= 1
                ? 'medium'
                : 'low';

    return {
        recommendedCapsules,
        confidence,
        summary: buildSummary(recommendedCapsules, confidence, abnormalCount, criticalCount, systemBreadth, topMarkers),
        signals,
        metrics: {
            abnormalCount,
            criticalCount,
            systemBreadth,
            complexityCount,
            severityScore,
            breadthScore,
            complexityScore,
            medicationRiskScore,
            totalScore,
            cardiometabolicHighRisk,
        },
    };
}
