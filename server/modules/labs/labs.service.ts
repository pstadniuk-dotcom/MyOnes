import OpenAI from 'openai';
import { filesRepository } from '../files/files.repository';
import { LAB_TREND_RULES, DEFAULT_CLINICAL_DIRECTION, type ClinicalDirection } from '../chat/lab-trend-rules';
import { canonicalKey, canonicalName } from './biomarker-aliases';
import logger from '../../infra/logging/logger';
import type { FileUpload } from '@shared/schema';
import { usersRepository } from '../users/users.repository';
import { wearablesRepository } from '../wearables/wearables.repository';
import { wearablesService } from '../wearables/wearables.service';

// ── Types ──────────────────────────────────────────────────────────────

export interface NormalizedMarker {
    name: string;
    key: string;             // lower-cased, stripped to alphanumeric for matching
    value: number | null;
    rawValue: string;
    unit: string;
    referenceRange: string;
    status: 'normal' | 'high' | 'low' | 'critical';
    category: string;
}

export interface MarkerHistory {
    date: string;
    value: number | null;
    rawValue: string;
    unit: string;
    status: 'normal' | 'high' | 'low' | 'critical';
    reportId: string;
}

export interface AggregatedBiomarker {
    key: string;
    name: string;
    category: string;
    latest: {
        value: number | null;
        rawValue: string;
        unit: string;
        referenceRange: string;
        status: 'normal' | 'high' | 'low' | 'critical';
        date: string;
        reportId: string;
    };
    previous: {
        value: number | null;
        rawValue: string;
        status: 'normal' | 'high' | 'low' | 'critical';
        date: string;
    } | null;
    delta: number | null;               // percent change: ((latest - prev) / prev) * 100
    deltaAbsolute: number | null;       // absolute difference
    trend: 'improving' | 'worsening' | 'stable' | 'new';
    clinicalDirection: ClinicalDirection;
    history: MarkerHistory[];
    insight?: MarkerInsight | null;     // pre-generated AI insight (stored in DB at upload time)
}

export interface MarkerInsight {
    whyItMatters: string;
    yourResult: string;
    foodsToEat: string[];
    foodsToLimit: string[];
    activity: string;
}

export interface PanelScore {
    category: string;
    score: number;            // 0-100
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    markerCount: number;
    inRange: number;
    outOfRange: number;
    critical: number;
    label: string;            // human-friendly e.g. "Excellent"
}

export interface HealthScore {
    overall: number;          // 0-100 composite
    grade: 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F';
    label: string;            // "Excellent", "Good", etc.
    panels: PanelScore[];
    momentum: 'improving' | 'declining' | 'steady' | 'new';
    momentumLabel: string;
}

export interface FocusAction {
    type: 'lifestyle' | 'followup';
    text: string;
}

export interface FocusArea {
    panel: string;            // technical category name
    emoji: string;
    grade: string;
    score: number;
    markers: Array<{
        name: string;
        value: string;
        unit: string;
        status: 'high' | 'low' | 'critical';
        refRange: string;
    }>;
    insight: string;          // 1-3 sentence clinical interpretation
    actions: FocusAction[];
}

export interface LabAnalysisSummary {
    headline: string;         // e.g. "Strong baseline — focus on Lipid Panel and Inflammation"
    narrative: string;        // 1 sentence overview
    strengths: string[];      // panel names that are all-clear
    focusAreas: FocusArea[];  // troubled panels with markers + advice
}

export interface BiologicalAge {
    age: number;              // computed biological age
    chronologicalAge: number; // user's stated age
    delta: number;            // difference (negative = younger)
    label: string;            // e.g. "3 years younger"
    dataSources: string[];    // which data contributed ("labs", "wearables", "profile")
    breakdown: BiologicalAgeBreakdown; // per-category scoring for explainer
}

export interface BiologicalAgeBreakdown {
    labScore: number | null;         // 0-100, contribution from biomarkers
    labOffset: number | null;        // years offset from labs
    wearableScore: number | null;    // 0-100, contribution from wearables
    wearableOffset: number | null;   // years offset from wearables
    lifestyleScore: number | null;   // 0-100, contribution from lifestyle
    lifestyleOffset: number | null;  // years offset from lifestyle
    factors: BiologicalAgeFactor[];  // individual contributing factors
}

export interface BiologicalAgeFactor {
    name: string;           // e.g. "hs-CRP", "Resting Heart Rate"  
    source: 'labs' | 'wearables' | 'profile';
    value: string;          // e.g. "0.8 mg/L", "58 bpm"
    impact: number;         // years offset this factor contributes
    assessment: 'excellent' | 'good' | 'fair' | 'poor';
    detail: string;         // human explanation
}

export interface BiomarkersDashboard {
    markers: AggregatedBiomarker[];
    healthScore: HealthScore;
    analysisSummary: LabAnalysisSummary;
    summary: {
        totalMarkers: number;
        normal: number;
        high: number;
        low: number;
        critical: number;
        improving: number;
        worsening: number;
        stable: number;
        newMarkers: number;
    };
    reports: Array<{
        id: string;
        fileName: string;
        testDate: string | null;
        uploadedAt: string;
        testType: string | null;
        labName: string | null;
        markerCount: number;
        status: string;
    }>;
    comparison: {
        hasMultipleReports: boolean;
        latestReportDate: string | null;
        previousReportDate: string | null;
        changes: Array<{
            name: string;
            from: string;
            to: string;
            unit: string;
            trend: 'improving' | 'worsening' | 'stable';
            percentChange: number | null;
        }>;
    };
    biologicalAge: BiologicalAge | null;
}

// ── Marker category inference ──────────────────────────────────────────

// Order matters: more specific rules first to avoid false matches.
// Each rule uses word-boundary-like matching to prevent substring collisions
// (e.g. "ck" inside "Check", "alt" inside "exalted").
const CATEGORY_RULES: Array<{ category: string; match: (lower: string) => boolean }> = [
    // ── Urinalysis / Urine  (highest priority — any "urine" keyword overrides) ──
    { category: 'Urinalysis', match: l => /\burine\b|urinalysis|specific gravity|leukocyte esterase|^ph$|^ketones?$|^nitrite$|occult blood|^color$|^appearance$|squamous epithelial|hyaline cast|^bacteria$/.test(l) },

    // ── Autoimmune / Immune ──
    { category: 'Autoimmune & Immune', match: l => /\bana\b|rheumatoid factor|anti.?nuclear|thyroglobulin antibod|thyroid peroxidase|tpo antibod|anti.?ccp|lupus|complement c[34]/.test(l) },

    // ── Prostate ──
    { category: 'Prostate', match: l => /\bpsa\b|prostate/.test(l) },

    // ── Toxic / Heavy Metals ──
    { category: 'Toxicology & Metals', match: l => /\blead\b|mercury|arsenic|cadmium|heavy metal|toxic/.test(l) },

    // ── Blood Type ──
    { category: 'Blood Type', match: l => /\babo\b|^rh type$|rh\(d\)|blood type|blood group/.test(l) },

    // ── Omega & Fatty Acids (before cardiac, to avoid "omegacheck" hitting both) ──
    { category: 'Omega & Fatty Acids', match: l => /omega|fatty acid|\bepa\b|\bdha\b|\bdpa\b|arachidonic|linoleic|omegacheck/.test(l) },

    // ── Diabetes & Blood Sugar (BEFORE metabolic — "fasting glucose", "a1c", "insulin" should land here) ──
    { category: 'Diabetes & Blood Sugar', match: l => /\ba1c\b|hba1c|hemoglobin a1c|\binsulin\b|\bhoma\b|fasting glucose|glycated hemoglobin/.test(l) },

    // ── Kidney Function (BEFORE metabolic — creatinine, BUN, eGFR, uric acid should land here) ──
    { category: 'Kidney Function', match: l => /\begfr\b|\bgfr\b|uric acid|cystatin|albumin.?urine|\bcreatinine\b(?!.*kinase)|\bbun\b|urea nitrogen/.test(l) },

    // ── Lipid Panel (extended with advanced particle markers) ──
    { category: 'Lipid Panel', match: l => /cholesterol|\bldl\b|\bhdl\b|triglyceride|\bvldl\b|lipoprotein|apob|apolipoprotein|non.?hdl|chol\/hdlc|ldl.?particle|ldl.?small|ldl.?medium|ldl.?large|hdl.?large|ldl.?pattern|ldl.?peak|lp\(a\)|lp.pla/.test(l) },

    // ── Cardiac (true cardiac biomarkers) ──
    { category: 'Cardiac', match: l => /\bbnp\b|nt.?pro.?bnp|troponin|\bck\b|creatine kinase|\bldh\b|myoglobin/.test(l) },

    // ── CBC ──
    { category: 'Complete Blood Count', match: l => /white blood cell|\bwbc\b|red blood cell|\brbc\b(?!.*urine)|\bhemoglobin\b(?!.*a1c)|\bhematocrit\b|\bplatelet\b|\bmcv\b|\bmch\b|\bmchc\b|\brdw\b|\bmpv\b|neutrophil|lymphocyte|monocyte|eosinophil|basophil/.test(l) },

    // ── Liver Function (before metabolic so ALT/AST/ALP/GGT go here) ──
    { category: 'Liver Function', match: l => /\balt\b|\bast\b|\balp\b|\bggt\b|gamma.?glutamyl|alkaline phosphatase/.test(l) },

    // ── Metabolic Panel (general electrolytes, glucose, bilirubin — after diabetes/kidney took theirs) ──
    { category: 'Metabolic Panel', match: l => /\bglucose\b(?!.*urine)|\bsodium\b|\bpotassium\b|\bchloride\b|carbon dioxide|\bco2\b|\bcalcium\b|protein.?total|\balbumin\b(?!.*urine)|\bglobulin\b|bilirubin|\ba\/g ratio\b|albumin.*globulin|\bphosphorus\b|anion gap/.test(l) },

    // ── Thyroid ──
    { category: 'Thyroid', match: l => /\btsh\b|\bt3\b|\bt4\b|thyroid|free t3|free t4|thyroxine|triiodothyronine/.test(l) },

    // ── Vitamins & Minerals ──
    { category: 'Vitamins & Minerals', match: l => /vitamin|\bfolate\b|folic|\bb12\b|\biron\b|\bferritin\b|\bzinc\b|\bmagnesium\b|\bselenium\b|\bcopper\b|\btibc\b|transferrin|\bmanganese\b|% saturation|methylmalonic/.test(l) },

    // ── Hormones ──
    { category: 'Hormones', match: l => /testosterone|estradiol|estrogen|progesterone|\bdhea\b|cortisol|\blh\b|\bfsh\b|prolactin|\bshbg\b|sex hormone binding|\bigf\b|growth hormone|leptin/.test(l) },

    // ── Inflammation ──
    { category: 'Inflammation', match: l => /\bcrp\b|hs.?crp|sed rate|\besr\b|homocysteine|fibrinogen|interleukin/.test(l) },

    // ── Coagulation (PT, INR, aPTT) ──
    { category: 'Coagulation', match: l => /\bpt\b|prothrombin|\binr\b|\baptt\b|partial thromboplastin|coagulation/.test(l) },
];

function inferCategory(markerName: string): string {
    const lower = markerName.toLowerCase();
    for (const rule of CATEGORY_RULES) {
        if (rule.match(lower)) {
            return rule.category;
        }
    }
    return 'Other';
}

function normalizeKey(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function parseNumeric(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const raw = String(value ?? '').replace(/,/g, '');
    const match = raw.match(/-?\d+(\.\d+)?/);
    if (!match) return null;
    const n = Number(match[0]);
    return Number.isFinite(n) ? n : null;
}

function getClinicalDirection(markerName: string): ClinicalDirection {
    const key = normalizeKey(markerName);
    for (const rule of LAB_TREND_RULES) {
        if (rule.keywords.some(kw => key.includes(kw))) {
            return rule.direction;
        }
    }
    return DEFAULT_CLINICAL_DIRECTION;
}

function computeTrend(
    delta: number | null,
    latestStatus: string,
    prevStatus: string,
    direction: ClinicalDirection,
): 'improving' | 'worsening' | 'stable' {
    // Status-based: if severity changed, that's the clearest signal
    const sev = (s: string) => s === 'critical' ? 3 : s === 'high' || s === 'low' ? 2 : s === 'normal' ? 0 : 1;
    const latS = sev(latestStatus), preS = sev(prevStatus);
    if (latS < preS) return 'improving';
    if (latS > preS) return 'worsening';

    // Same status — use numeric delta + clinical direction
    if (delta == null || Math.abs(delta) < 3) return 'stable';

    const went = delta > 0 ? 'up' : 'down';
    if (direction === 'lower_is_better')  return went === 'down' ? 'improving' : 'worsening';
    if (direction === 'higher_is_better') return went === 'up'   ? 'improving' : 'worsening';
    // balanced_range – any significant move is noteworthy but not clearly good/bad
    return Math.abs(delta) > 15 ? 'worsening' : 'stable';
}

// ── Scoring ────────────────────────────────────────────────────────────

function scoreGrade(score: number): 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F' {
    if (score >= 97) return 'A+';
    if (score >= 93) return 'A';
    if (score >= 90) return 'A-';
    if (score >= 87) return 'B+';
    if (score >= 83) return 'B';
    if (score >= 80) return 'B-';
    if (score >= 77) return 'C+';
    if (score >= 73) return 'C';
    if (score >= 70) return 'C-';
    if (score >= 60) return 'D';
    return 'F';
}

function panelGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
}

function scoreLabel(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    if (score >= 60) return 'Needs Attention';
    return 'Needs Improvement';
}

/**
 * Compute a 0-100 health score from aggregated biomarkers.
 *
 * Scoring formula per marker:
 *   normal  = 100 points
 *   high    =  40 points
 *   low     =  40 points
 *   critical=  10 points
 *
 * Bonus/penalty for trends:
 *   improving  = +5 pts
 *   worsening  = -5 pts
 *
 * The composite is a weighted average across all markers, then clamped 0-100.
 */
function computeHealthScore(markers: AggregatedBiomarker[]): HealthScore {
    if (markers.length === 0) {
        return { overall: 0, grade: 'F', label: 'No Data', panels: [], momentum: 'new', momentumLabel: 'No previous data' };
    }

    const statusPoints: Record<string, number> = { normal: 100, high: 40, low: 40, critical: 10 };
    const trendBonus: Record<string, number> = { improving: 5, worsening: -5, stable: 0, new: 0 };

    // Per-category grouping
    const categoryMap = new Map<string, AggregatedBiomarker[]>();
    for (const m of markers) {
        const cat = m.category || 'Other';
        if (!categoryMap.has(cat)) categoryMap.set(cat, []);
        categoryMap.get(cat)!.push(m);
    }

    // Build panel scores
    const panels: PanelScore[] = [];
    let totalWeightedScore = 0;
    let totalWeight = 0;

    // Category importance weights (more clinically relevant panels matter more)
    const categoryWeight: Record<string, number> = {
        'Lipid Panel': 1.3,
        'Metabolic Panel': 1.2,
        'Complete Blood Count': 1.1,
        'Liver Function': 1.2,
        'Thyroid': 1.2,
        'Vitamins & Minerals': 1.0,
        'Hormones': 1.1,
        'Inflammation': 1.3,
        'Diabetes & Blood Sugar': 1.3,
        'Kidney Function': 1.2,
        'Cardiac': 1.3,
        'Omega & Fatty Acids': 0.9,
        'Urinalysis': 1.0,
        'Autoimmune & Immune': 1.2,
        'Prostate': 1.1,
        'Toxicology & Metals': 1.1,
        'Coagulation': 1.1,
        'Blood Type': 0.5,
        'Other': 0.8,
    };

    for (const [category, catMarkers] of categoryMap.entries()) {
        let catTotal = 0;
        let inRange = 0;
        let outOfRange = 0;
        let critCount = 0;

        for (const m of catMarkers) {
            const base = statusPoints[m.latest.status] ?? 100;
            const bonus = trendBonus[m.trend] ?? 0;
            catTotal += Math.min(100, Math.max(0, base + bonus));

            if (m.latest.status === 'normal') inRange++;
            else {
                outOfRange++;
                if (m.latest.status === 'critical') critCount++;
            }
        }

        const panelScore = Math.round(catTotal / catMarkers.length);
        panels.push({
            category,
            score: panelScore,
            grade: panelGrade(panelScore),
            markerCount: catMarkers.length,
            inRange,
            outOfRange,
            critical: critCount,
            label: scoreLabel(panelScore),
        });

        const w = categoryWeight[category] ?? 1.0;
        totalWeightedScore += panelScore * catMarkers.length * w;
        totalWeight += catMarkers.length * w;
    }

    // Sort panels by importance & score (worst first for attention)
    panels.sort((a, b) => {
        if (a.outOfRange !== b.outOfRange) return b.outOfRange - a.outOfRange;
        return a.score - b.score;
    });

    const overall = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;

    // Compute momentum from trends
    const improvingCount = markers.filter(m => m.trend === 'improving').length;
    const worseningCount = markers.filter(m => m.trend === 'worsening').length;
    const hasComparison = markers.some(m => m.trend !== 'new');

    let momentum: 'improving' | 'declining' | 'steady' | 'new' = 'new';
    let momentumLabel = 'First report — upload another to see trends';
    if (hasComparison) {
        if (improvingCount > worseningCount * 1.5) {
            momentum = 'improving';
            momentumLabel = `${improvingCount} markers improving since last report`;
        } else if (worseningCount > improvingCount * 1.5) {
            momentum = 'declining';
            momentumLabel = `${worseningCount} markers need attention`;
        } else {
            momentum = 'steady';
            momentumLabel = 'Results are holding steady';
        }
    }

    return {
        overall,
        grade: scoreGrade(overall),
        label: scoreLabel(overall),
        panels,
        momentum,
        momentumLabel,
    };
}

// ── Biological Age Computation ─────────────────────────────────────────

/**
 * Advanced biological age estimation using per-marker deviation scoring,
 * wearable biometrics, and lifestyle factors.
 *
 * Methodology (inspired by Levine PhenoAge & Klemera-Doubal):
 *   1. For each key biomarker, compute how far the value deviates from
 *      the age/sex-adjusted optimal range (not just in/out of range)
 *   2. Weight markers by their published association with mortality/aging
 *   3. Incorporate wearable biometrics (HRV, RHR, sleep, VO2 proxy)
 *   4. Apply lifestyle modifiers (exercise frequency, smoking, stress)
 *   5. Sum weighted deviations into a total offset (years), clamped ±12
 *
 * Key difference from simple health-score mapping: this uses continuous
 * deviation scoring per marker rather than binary in/out-of-range,
 * and weights markers by their aging-relevance (not clinical urgency).
 */
async function computeBiologicalAge(
    userId: string,
    markers: AggregatedBiomarker[],
    healthScore: number,
): Promise<BiologicalAge | null> {
    let profile: any;
    try {
        profile = await usersRepository.getHealthProfile(userId);
    } catch {
        return null;
    }
    if (!profile?.age || profile.age < 18) return null;

    const chronoAge = profile.age;
    const sex = (profile?.sex || 'other') as string;
    const factors: BiologicalAgeFactor[] = [];
    const dataSources: string[] = [];

    // Helper: find marker by regex
    const findM = (pattern: RegExp) => markers.find(m => pattern.test(m.name.toLowerCase()));

    // ── 1. BIOMARKER-BASED SCORING ──
    // Each marker has: optimal range, aging weight, and continuous scoring
    // Impact formula: deviation from optimal → fractional years
    let labOffset = 0;
    let labFactorCount = 0;

    interface MarkerRule {
        pattern: RegExp;
        label: string;
        optimalLow: number;
        optimalHigh: number;
        worstLow: number;   // value at which impact maxes out negative
        worstHigh: number;  // value at which impact maxes out positive
        weight: number;     // aging-relevance weight (0-2)
        lowerBetter?: boolean; // for markers where lower = younger
        unit: string;
    }

    const markerRules: MarkerRule[] = [
        // Inflammation (highest aging correlation per Levine)
        { pattern: /\bcrp\b|hs.?crp/, label: 'hs-CRP', optimalLow: 0, optimalHigh: 1.0, worstLow: 0, worstHigh: 10, weight: 1.8, lowerBetter: true, unit: 'mg/L' },
        { pattern: /homocysteine/, label: 'Homocysteine', optimalLow: 5, optimalHigh: 8, worstLow: 0, worstHigh: 20, weight: 1.2, unit: 'µmol/L' },

        // Metabolic / Glycemic
        { pattern: /\ba1c\b|hba1c|hemoglobin a1c/, label: 'HbA1c', optimalLow: 4.5, optimalHigh: 5.2, worstLow: 3.5, worstHigh: 7.0, weight: 1.6, unit: '%' },
        { pattern: /fasting glucose/, label: 'Fasting Glucose', optimalLow: 72, optimalHigh: 90, worstLow: 50, worstHigh: 140, weight: 1.3, unit: 'mg/dL' },
        { pattern: /\binsulin\b/, label: 'Fasting Insulin', optimalLow: 2, optimalHigh: 6, worstLow: 0, worstHigh: 25, weight: 1.2, lowerBetter: true, unit: 'µIU/mL' },

        // Lipids
        { pattern: /\bldl\b(?!.*particle|.*small|.*pattern)/, label: 'LDL Cholesterol', optimalLow: 50, optimalHigh: 100, worstLow: 0, worstHigh: 200, weight: 1.0, unit: 'mg/dL' },
        { pattern: /\bhdl\b(?!.*vldl|.*non)/, label: 'HDL Cholesterol', optimalLow: sex === 'male' ? 50 : 55, optimalHigh: 90, worstLow: 20, worstHigh: 120, weight: 1.1, unit: 'mg/dL' },
        { pattern: /triglyceride/, label: 'Triglycerides', optimalLow: 40, optimalHigh: 80, worstLow: 10, worstHigh: 300, weight: 1.0, lowerBetter: true, unit: 'mg/dL' },
        { pattern: /apolipoprotein b|apob/, label: 'ApoB', optimalLow: 40, optimalHigh: 80, worstLow: 20, worstHigh: 150, weight: 1.3, lowerBetter: true, unit: 'mg/dL' },

        // Kidney
        { pattern: /\begfr\b|\bgfr\b/, label: 'eGFR', optimalLow: 90, optimalHigh: 120, worstLow: 30, worstHigh: 150, weight: 1.4, unit: 'mL/min' },
        { pattern: /cystatin/, label: 'Cystatin C', optimalLow: 0.6, optimalHigh: 0.9, worstLow: 0.3, worstHigh: 2.0, weight: 1.3, lowerBetter: true, unit: 'mg/L' },

        // Liver
        { pattern: /\balt\b/, label: 'ALT', optimalLow: 10, optimalHigh: 25, worstLow: 0, worstHigh: 80, weight: 0.8, lowerBetter: true, unit: 'U/L' },
        { pattern: /\bggt\b|gamma.?glutamyl/, label: 'GGT', optimalLow: 10, optimalHigh: 25, worstLow: 0, worstHigh: 80, weight: 0.9, lowerBetter: true, unit: 'U/L' },
        { pattern: /\balbumin\b(?!.*urine)/, label: 'Albumin', optimalLow: 4.2, optimalHigh: 5.0, worstLow: 2.5, worstHigh: 5.5, weight: 1.5, unit: 'g/dL' },

        // Blood
        { pattern: /\bhemoglobin\b(?!.*a1c)/, label: 'Hemoglobin', optimalLow: sex === 'male' ? 14.5 : 13.0, optimalHigh: sex === 'male' ? 16.0 : 15.0, worstLow: 8, worstHigh: 20, weight: 0.9, unit: 'g/dL' },
        { pattern: /white blood cell|\bwbc\b/, label: 'WBC', optimalLow: 4.0, optimalHigh: 6.5, worstLow: 1.5, worstHigh: 15, weight: 1.1, unit: 'k/µL' },
        { pattern: /\brdw\b/, label: 'RDW', optimalLow: 11.5, optimalHigh: 13.0, worstLow: 10, worstHigh: 18, weight: 1.0, lowerBetter: true, unit: '%' },

        // Vitamins / Hormones
        { pattern: /vitamin d|25.?hydroxy/, label: 'Vitamin D', optimalLow: 40, optimalHigh: 60, worstLow: 5, worstHigh: 100, weight: 0.7, unit: 'ng/mL' },
        { pattern: /\bdhea\b/, label: 'DHEA-S', optimalLow: sex === 'male' ? 200 : 150, optimalHigh: sex === 'male' ? 400 : 350, worstLow: 50, worstHigh: 600, weight: 0.8, unit: 'µg/dL' },
        { pattern: /testosterone(?!.*free)/, label: 'Total Testosterone', optimalLow: sex === 'male' ? 500 : 15, optimalHigh: sex === 'male' ? 900 : 70, worstLow: sex === 'male' ? 100 : 5, worstHigh: sex === 'male' ? 1200 : 100, weight: 0.7, unit: 'ng/dL' },

        // Thyroid
        { pattern: /\btsh\b/, label: 'TSH', optimalLow: 1.0, optimalHigh: 2.5, worstLow: 0.01, worstHigh: 10, weight: 0.8, unit: 'mIU/L' },
    ];

    for (const rule of markerRules) {
        const m = findM(rule.pattern);
        if (!m?.latest.value) continue;
        const v = m.latest.value;

        // Continuous deviation scoring:
        // 0 = within optimal range, ±1 = at the worst boundary
        let deviation: number;
        if (v >= rule.optimalLow && v <= rule.optimalHigh) {
            deviation = 0; // Optimal
        } else if (v < rule.optimalLow) {
            const distFromOptimal = rule.optimalLow - v;
            const maxDist = rule.optimalLow - rule.worstLow;
            deviation = maxDist > 0 ? Math.min(1, distFromOptimal / maxDist) : 0;
            // For "lower is better" markers, being below optimal is actually good
            if (rule.lowerBetter && v >= rule.worstLow) deviation = -deviation * 0.3;
        } else {
            const distFromOptimal = v - rule.optimalHigh;
            const maxDist = rule.worstHigh - rule.optimalHigh;
            deviation = maxDist > 0 ? Math.min(1, distFromOptimal / maxDist) : 0;
            if (rule.lowerBetter) deviation = deviation; // Higher is worse for lowerBetter markers
        }

        // Convert deviation to years: max ±1.5 years per marker, weighted
        const impact = deviation * rule.weight * 1.5;
        labOffset += impact;
        labFactorCount++;

        // Determine assessment
        const absDeviation = Math.abs(deviation);
        const assessment: BiologicalAgeFactor['assessment'] =
            absDeviation < 0.05 ? 'excellent' :
            absDeviation < 0.25 ? 'good' :
            absDeviation < 0.6 ? 'fair' : 'poor';

        const impactYears = Math.round(impact * 10) / 10;
        if (Math.abs(impactYears) >= 0.1) {
            factors.push({
                name: rule.label,
                source: 'labs',
                value: `${m.latest.rawValue} ${m.latest.unit || rule.unit}`,
                impact: impactYears,
                assessment,
                detail: assessment === 'excellent' ? `Optimal range (${rule.optimalLow}–${rule.optimalHigh} ${rule.unit})`
                    : assessment === 'good' ? `Near optimal (target: ${rule.optimalLow}–${rule.optimalHigh} ${rule.unit})`
                    : `Target: ${rule.optimalLow}–${rule.optimalHigh} ${rule.unit}`,
            });
        }
    }

    if (labFactorCount > 0) {
        dataSources.push('labs');
        // Normalize: if we have many markers, cap the total lab impact
        // This prevents having 20 markers all adding +0.5 from ballooning
        labOffset = Math.max(-6, Math.min(6, labOffset));
    }

    let totalOffset = labOffset;
    const labScore = labFactorCount > 0 ? Math.round(Math.max(0, Math.min(100, 50 - labOffset * 8))) : null;

    // ── 2. WEARABLE-BASED SCORING ──
    let wearableOffset = 0;
    let wearableScore: number | null = null;
    try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 30);

        // Try Junction API (current wearable integration) first, fall back to legacy DB table
        let biometricRows: any[] = [];
        try {
            const endStr = endDate.toISOString().split('T')[0];
            const startStr = startDate.toISOString().split('T')[0];
            const junctionResult = await wearablesService.getBiometricData(userId, startStr, endStr);
            if (junctionResult?.data?.length >= 3) {
                // Flatten Junction's nested format into flat rows matching the fields the scoring expects
                biometricRows = junctionResult.data.map((d: any) => ({
                    restingHeartRate: d.heart?.restingRate ?? null,
                    hrvMs: d.heart?.hrvMs ?? null,
                    sleepHours: d.sleep?.totalMinutes ?? null,  // stored as minutes, scoring handles conversion
                    deepSleepMinutes: d.sleep?.deepSleepMinutes ?? null,
                    steps: d.activity?.steps ?? null,
                    spo2Percentage: d.body?.spo2 ?? null,
                }));

            }
        } catch (junctionErr: any) {
            logger.warn('[BioAge] Junction wearable fetch failed, using legacy fallback', { error: junctionErr?.message || junctionErr });
        }

        // Fall back to legacy biometric_data table if Junction returned nothing
        if (biometricRows.length < 3) {
            const legacyRows = await wearablesRepository.getBiometricData(userId, startDate, endDate);
            if (legacyRows.length >= 3) {
                biometricRows = legacyRows;
            }
        }

        if (biometricRows.length >= 3) {
            dataSources.push('wearables');

            const avgMetric = (field: string) => {
                const vals = biometricRows.map((r: any) => r[field]).filter((v: any) => v != null && v > 0);
                return vals.length > 0 ? vals.reduce((s: number, v: number) => s + v, 0) / vals.length : null;
            };

            // Resting heart rate — strongest wearable predictor of CV mortality
            const rhr = avgMetric('restingHeartRate');
            if (rhr != null) {
                // Optimal: 50-60bpm; each 5bpm above 60 adds ~0.5 years
                let rhrImpact = 0;
                if (rhr <= 52) rhrImpact = -1.5;
                else if (rhr <= 58) rhrImpact = -0.8;
                else if (rhr <= 64) rhrImpact = -0.2;
                else if (rhr <= 72) rhrImpact = 0.3;
                else if (rhr <= 80) rhrImpact = 1.0;
                else rhrImpact = 2.0;
                wearableOffset += rhrImpact;
                factors.push({
                    name: 'Resting Heart Rate',
                    source: 'wearables',
                    value: `${Math.round(rhr)} bpm`,
                    impact: Math.round(rhrImpact * 10) / 10,
                    assessment: rhr <= 58 ? 'excellent' : rhr <= 64 ? 'good' : rhr <= 75 ? 'fair' : 'poor',
                    detail: `30-day avg. Optimal: 50–60 bpm`,
                });
            }

            // HRV — age-adjusted (decreases ~1ms/year after age 25)
            const hrv = avgMetric('hrvMs');
            if (hrv != null) {
                // Age-expected HRV baseline (rough population median)
                const expectedHrv = Math.max(15, 75 - (chronoAge - 25) * 1.0);
                const ratio = hrv / expectedHrv;
                let hrvImpact = 0;
                if (ratio >= 1.5) hrvImpact = -2.0;
                else if (ratio >= 1.2) hrvImpact = -1.2;
                else if (ratio >= 0.9) hrvImpact = -0.3;
                else if (ratio >= 0.7) hrvImpact = 0.5;
                else if (ratio >= 0.5) hrvImpact = 1.2;
                else hrvImpact = 2.0;
                wearableOffset += hrvImpact;
                factors.push({
                    name: 'Heart Rate Variability',
                    source: 'wearables',
                    value: `${Math.round(hrv)} ms`,
                    impact: Math.round(hrvImpact * 10) / 10,
                    assessment: ratio >= 1.2 ? 'excellent' : ratio >= 0.9 ? 'good' : ratio >= 0.7 ? 'fair' : 'poor',
                    detail: `30-day avg. Expected for age ${chronoAge}: ~${Math.round(expectedHrv)} ms`,
                });
            }

            // Sleep duration
            const sleepMin = avgMetric('sleepHours');
            if (sleepMin != null) {
                const sleepHrs = sleepMin / 60;
                let sleepImpact = 0;
                if (sleepHrs >= 7.0 && sleepHrs <= 8.5) sleepImpact = -0.5;
                else if (sleepHrs >= 6.5 && sleepHrs <= 9.0) sleepImpact = 0;
                else if (sleepHrs < 6) sleepImpact = 1.5;
                else if (sleepHrs < 6.5) sleepImpact = 0.8;
                else sleepImpact = 0.5; // >9 hours
                wearableOffset += sleepImpact;
                if (Math.abs(sleepImpact) >= 0.1) {
                    factors.push({
                        name: 'Sleep Duration',
                        source: 'wearables',
                        value: `${sleepHrs.toFixed(1)} hrs`,
                        impact: Math.round(sleepImpact * 10) / 10,
                        assessment: sleepHrs >= 7 && sleepHrs <= 8.5 ? 'excellent' : sleepHrs >= 6.5 ? 'good' : 'poor',
                        detail: `30-day avg. Optimal: 7–8.5 hours`,
                    });
                }
            }

            // Deep sleep percentage (if available)
            const deepSleep = avgMetric('deepSleepMinutes');
            const totalSleep = avgMetric('sleepHours');
            if (deepSleep != null && totalSleep != null && totalSleep > 0) {
                const deepPct = (deepSleep / totalSleep) * 100;
                let deepImpact = 0;
                if (deepPct >= 20) deepImpact = -0.5;
                else if (deepPct >= 15) deepImpact = -0.2;
                else if (deepPct < 10) deepImpact = 0.8;
                wearableOffset += deepImpact;
                if (Math.abs(deepImpact) >= 0.1) {
                    factors.push({
                        name: 'Deep Sleep',
                        source: 'wearables',
                        value: `${Math.round(deepPct)}% of total`,
                        impact: Math.round(deepImpact * 10) / 10,
                        assessment: deepPct >= 20 ? 'excellent' : deepPct >= 15 ? 'good' : deepPct >= 10 ? 'fair' : 'poor',
                        detail: `30-day avg. Optimal: ≥20% deep sleep`,
                    });
                }
            }

            // Steps (proxy for daily activity / cardiorespiratory fitness)
            const steps = avgMetric('steps');
            if (steps != null) {
                let stepsImpact = 0;
                if (steps >= 12000) stepsImpact = -0.8;
                else if (steps >= 8000) stepsImpact = -0.4;
                else if (steps >= 6000) stepsImpact = 0;
                else if (steps >= 4000) stepsImpact = 0.5;
                else stepsImpact = 1.0;
                wearableOffset += stepsImpact;
                if (Math.abs(stepsImpact) >= 0.1) {
                    factors.push({
                        name: 'Daily Steps',
                        source: 'wearables',
                        value: `${Math.round(steps).toLocaleString()} avg`,
                        impact: Math.round(stepsImpact * 10) / 10,
                        assessment: steps >= 10000 ? 'excellent' : steps >= 7000 ? 'good' : steps >= 5000 ? 'fair' : 'poor',
                        detail: `30-day avg. Optimal: ≥8,000 steps/day`,
                    });
                }
            }

            // SpO2
            const spo2 = avgMetric('spo2Percentage');
            if (spo2 != null) {
                let spo2Impact = 0;
                if (spo2 >= 97) spo2Impact = -0.2;
                else if (spo2 < 94) spo2Impact = 1.0;
                else if (spo2 < 96) spo2Impact = 0.3;
                wearableOffset += spo2Impact;
                if (Math.abs(spo2Impact) >= 0.1) {
                    factors.push({
                        name: 'Blood Oxygen (SpO2)',
                        source: 'wearables',
                        value: `${Math.round(spo2)}%`,
                        impact: Math.round(spo2Impact * 10) / 10,
                        assessment: spo2 >= 97 ? 'excellent' : spo2 >= 95 ? 'good' : 'poor',
                        detail: `30-day avg. Optimal: ≥97%`,
                    });
                }
            }

            wearableOffset = Math.max(-5, Math.min(5, wearableOffset));
            wearableScore = Math.round(Math.max(0, Math.min(100, 50 - wearableOffset * 10)));
            totalOffset += wearableOffset;
        }
    } catch (err) {
        logger.debug('Wearable data not available for biological age:', err);
    }

    // ── 3. LIFESTYLE FACTORS ──
    let lifestyleOffset = 0;
    let lifestyleScore: number | null = null;
    if (profile) {
        let hasLifestyleData = false;

        if (profile.exerciseDaysPerWeek != null) {
            hasLifestyleData = true;
            let exImpact = 0;
            if (profile.exerciseDaysPerWeek >= 5) exImpact = -1.0;
            else if (profile.exerciseDaysPerWeek >= 3) exImpact = -0.4;
            else if (profile.exerciseDaysPerWeek === 1) exImpact = 0.3;
            else if (profile.exerciseDaysPerWeek === 0) exImpact = 1.0;
            lifestyleOffset += exImpact;
            if (Math.abs(exImpact) >= 0.1) {
                factors.push({
                    name: 'Exercise Frequency',
                    source: 'profile',
                    value: `${profile.exerciseDaysPerWeek} days/week`,
                    impact: Math.round(exImpact * 10) / 10,
                    assessment: profile.exerciseDaysPerWeek >= 5 ? 'excellent' : profile.exerciseDaysPerWeek >= 3 ? 'good' : 'poor',
                    detail: 'Optimal: 4–5 days/week of moderate+ activity',
                });
            }
        }

        if (profile.smokingStatus === 'current') {
            hasLifestyleData = true;
            lifestyleOffset += 3.0;
            factors.push({
                name: 'Smoking Status',
                source: 'profile',
                value: 'Current smoker',
                impact: 3.0,
                assessment: 'poor',
                detail: 'Smoking adds 3+ years to biological age',
            });
        } else if (profile.smokingStatus === 'former') {
            hasLifestyleData = true;
            lifestyleOffset += 0.5;
            factors.push({
                name: 'Smoking Status',
                source: 'profile',
                value: 'Former smoker',
                impact: 0.5,
                assessment: 'fair',
                detail: 'Former smoking has residual impact for several years',
            });
        }

        if (profile.stressLevel != null && profile.stressLevel > 0) {
            hasLifestyleData = true;
            let stressImpact = 0;
            if (profile.stressLevel <= 3) stressImpact = -0.3;
            else if (profile.stressLevel <= 5) stressImpact = 0;
            else if (profile.stressLevel <= 7) stressImpact = 0.5;
            else stressImpact = 1.2;
            lifestyleOffset += stressImpact;
            if (Math.abs(stressImpact) >= 0.1) {
                factors.push({
                    name: 'Stress Level',
                    source: 'profile',
                    value: `${profile.stressLevel}/10`,
                    impact: Math.round(stressImpact * 10) / 10,
                    assessment: profile.stressLevel <= 3 ? 'excellent' : profile.stressLevel <= 5 ? 'good' : profile.stressLevel <= 7 ? 'fair' : 'poor',
                    detail: 'Chronic stress accelerates cellular aging',
                });
            }
        }

        if (profile.alcoholDrinksPerWeek != null) {
            hasLifestyleData = true;
            let alcImpact = 0;
            if (profile.alcoholDrinksPerWeek === 0) alcImpact = 0;
            else if (profile.alcoholDrinksPerWeek <= 4) alcImpact = 0;
            else if (profile.alcoholDrinksPerWeek <= 7) alcImpact = 0.3;
            else if (profile.alcoholDrinksPerWeek <= 14) alcImpact = 0.8;
            else alcImpact = 1.5;
            lifestyleOffset += alcImpact;
            if (Math.abs(alcImpact) >= 0.1) {
                factors.push({
                    name: 'Alcohol Intake',
                    source: 'profile',
                    value: `${profile.alcoholDrinksPerWeek} drinks/week`,
                    impact: Math.round(alcImpact * 10) / 10,
                    assessment: profile.alcoholDrinksPerWeek <= 4 ? 'good' : profile.alcoholDrinksPerWeek <= 7 ? 'fair' : 'poor',
                    detail: 'Optimal: ≤4 drinks/week',
                });
            }
        }

        // BMI if weight & height available
        if (profile.weightLbs && profile.heightCm) {
            hasLifestyleData = true;
            const weightKg = profile.weightLbs * 0.453592;
            const heightM = profile.heightCm / 100;
            const bmi = weightKg / (heightM * heightM);
            let bmiImpact = 0;
            if (bmi >= 18.5 && bmi <= 24.9) bmiImpact = -0.3;
            else if (bmi >= 25 && bmi <= 29.9) bmiImpact = 0.8;
            else if (bmi >= 30) bmiImpact = 1.5;
            else if (bmi < 18.5) bmiImpact = 0.5;
            lifestyleOffset += bmiImpact;
            if (Math.abs(bmiImpact) >= 0.1) {
                factors.push({
                    name: 'BMI',
                    source: 'profile',
                    value: `${bmi.toFixed(1)}`,
                    impact: Math.round(bmiImpact * 10) / 10,
                    assessment: bmi >= 18.5 && bmi <= 24.9 ? 'excellent' : bmi <= 29.9 ? 'fair' : 'poor',
                    detail: 'Optimal BMI: 18.5–24.9',
                });
            }
        }

        if (hasLifestyleData) {
            if (!dataSources.includes('profile')) dataSources.push('profile');
            lifestyleOffset = Math.max(-2, Math.min(4, lifestyleOffset));
            lifestyleScore = Math.round(Math.max(0, Math.min(100, 50 - lifestyleOffset * 12)));
            totalOffset += lifestyleOffset;
        }
    }

    // Clamp total offset to ±12 years, ensure bio age ≥ 18
    totalOffset = Math.max(-12, Math.min(12, totalOffset));
    const bioAge = Math.max(18, Math.round(chronoAge + totalOffset));
    const delta = bioAge - chronoAge;

    const label = delta === 0
        ? 'Right on track'
        : delta < 0
            ? `${Math.abs(delta)} year${Math.abs(delta) !== 1 ? 's' : ''} younger`
            : `${delta} year${delta !== 1 ? 's' : ''} older`;

    // Sort factors by absolute impact (most impactful first)
    factors.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

    return {
        age: bioAge,
        chronologicalAge: chronoAge,
        delta,
        label,
        dataSources,
        breakdown: {
            labScore,
            labOffset: labFactorCount > 0 ? Math.round(labOffset * 10) / 10 : null,
            wearableScore,
            wearableOffset: wearableScore != null ? Math.round(wearableOffset * 10) / 10 : null,
            lifestyleScore,
            lifestyleOffset: lifestyleScore != null ? Math.round(lifestyleOffset * 10) / 10 : null,
            factors,
        },
    };
}

// ── Focus-Area Analysis Engine ──────────────────────────────────────────

// Helpers
function findMarker(list: AggregatedBiomarker[], pattern: RegExp, status?: string): AggregatedBiomarker | undefined {
    return list.find(m => pattern.test(m.name.toLowerCase()) && (!status || m.latest.status === status));
}
function findMarkerAbnormal(list: AggregatedBiomarker[], pattern: RegExp): AggregatedBiomarker | undefined {
    return list.find(m => pattern.test(m.name.toLowerCase()) && m.latest.status !== 'normal');
}
function val(m: AggregatedBiomarker): string {
    return `${m.latest.rawValue}${m.latest.unit ? ' ' + m.latest.unit : ''}`;
}

const PANEL_EMOJI: Record<string, string> = {
    'Lipid Panel': '🫀', 'Complete Blood Count': '🩸', 'Metabolic Panel': '⚗️',
    'Liver Function': '🫁', 'Thyroid': '🦋', 'Vitamins & Minerals': '💊',
    'Hormones': '🧬', 'Inflammation': '🔥', 'Diabetes & Blood Sugar': '🍬',
    'Kidney Function': '🫘', 'Cardiac': '❤️', 'Omega & Fatty Acids': '🐟',
    'Urinalysis': '🧪', 'Autoimmune & Immune': '🛡️', 'Prostate': '🔬',
    'Toxicology & Metals': '☣️', 'Blood Type': '🏷️', 'Coagulation': '🩹',
    'Other': '📋',
};

/**
 * Build a focused, actionable analysis.
 * Each troubled panel becomes a self-contained FocusArea with embedded
 * marker data, a clinical interpretation, and typed actions
 * (lifestyle / follow-up).
 */
function generateAnalysisSummary(
    markers: AggregatedBiomarker[],
    healthScore: HealthScore,
): LabAnalysisSummary {
    if (markers.length === 0) {
        return { headline: '', narrative: '', strengths: [], focusAreas: [] };
    }

    const abnormal = markers.filter(m => m.latest.status !== 'normal');
    const critical = markers.filter(m => m.latest.status === 'critical');
    const normalPct = Math.round(((markers.length - abnormal.length) / markers.length) * 100);

    const focusAreas: FocusArea[] = [];
    const cleanPanels: string[] = [];

    // Helper: build marker entries for a focus area
    function abnormalEntries(catMarkers: AggregatedBiomarker[]) {
        return catMarkers
            .filter(m => m.latest.status !== 'normal')
            .map(m => ({
                name: m.name,
                value: m.latest.rawValue,
                unit: m.latest.unit,
                status: m.latest.status as 'high' | 'low' | 'critical',
                refRange: m.latest.referenceRange || '',
            }));
    }

    // Helper: find panel score
    function panelInfo(category: string) {
        const p = healthScore.panels.find(p => p.category === category);
        return { grade: p?.grade || '?', score: p?.score || 0 };
    }

    // ────────────────────────── LIPID PANEL ──────────────────────────
    const lipidMarkers = markers.filter(m => m.category === 'Lipid Panel');
    const lipidAbnormal = lipidMarkers.filter(m => m.latest.status !== 'normal');
    if (lipidMarkers.length > 0) {
        if (lipidAbnormal.length === 0) {
            cleanPanels.push('Lipid Panel');
        } else {
            const lowHDL = findMarker(lipidMarkers, /hdl/, 'low');
            const highTrig = findMarkerAbnormal(lipidMarkers, /triglyceride/);
            const particles = lipidMarkers.filter(m => /particle|small|medium|pattern|peak size/i.test(m.name) && m.latest.status !== 'normal');
            const highApoB = findMarkerAbnormal(lipidMarkers, /apob|apolipoprotein b/);
            const highLDLP = findMarkerAbnormal(lipidMarkers, /ldl particle number|ldl.?p\b/);
            const lowHDLLarge = findMarker(lipidMarkers, /hdl large|large hdl/, 'low');
            const lowLDLPeak = findMarker(lipidMarkers, /ldl peak size|ldl peak diameter|ldl particle size/, 'low');
            const metSyn = lowHDL && highTrig;

            let insight = 'Your cholesterol markers are outside optimal ranges.';
            if (highApoB && highLDLP) {
                insight = `Elevated ApoB (${val(highApoB)}) combined with high LDL particle number (${val(highLDLP)}) is a high-risk cardiovascular pattern — ApoB counts every atherogenic particle regardless of LDL size, making it the strongest predictor of cardiovascular events.`;
            } else if (highApoB) {
                insight = `Elevated ApoB (${val(highApoB)}) indicates a high number of atherogenic particles in circulation. ApoB is a more accurate predictor of cardiovascular risk than LDL-cholesterol alone.`;
            } else if (metSyn) {
                insight = 'Low HDL combined with high triglycerides is a hallmark of metabolic syndrome — a pattern that responds well to dietary changes, omega-3 supplementation, and regular exercise.';
            } else if (particles.length > 0 || lowLDLPeak || lowHDLLarge) {
                insight = 'Advanced particle testing reveals an unfavorable LDL pattern. Small, dense LDL particles (Pattern B) are more atherogenic than large buoyant ones — this matters more than total LDL alone.';
            }

            const actions: FocusAction[] = [];
            actions.push({ type: 'lifestyle', text: 'Reduce refined carbs, sugar, and processed foods' });
            actions.push({ type: 'lifestyle', text: '30 minutes of cardio 5x/week' });
            if (highApoB || highLDLP) {
                actions.push({ type: 'followup', text: 'Track ApoB as primary cardiovascular risk marker — target < 90 mg/dL optimal, < 80 mg/dL if high-risk' });
            }
            actions.push({ type: 'followup', text: 'Retest lipid panel in 3 months' });

            const { grade, score } = panelInfo('Lipid Panel');
            focusAreas.push({ panel: 'Lipid Panel', emoji: '🫀', grade, score, markers: abnormalEntries(lipidMarkers), insight, actions });
        }
    }

    // ────────────────────────── CBC ──────────────────────────
    const cbcMarkers = markers.filter(m => m.category === 'Complete Blood Count');
    const cbcAbnormal = cbcMarkers.filter(m => m.latest.status !== 'normal');
    if (cbcMarkers.length > 0) {
        if (cbcAbnormal.length === 0) {
            cleanPanels.push('Complete Blood Count');
        } else {
            const lowHgb = findMarker(cbcMarkers, /hemoglobin/, 'low');
            const lowMCV = findMarker(cbcMarkers, /mcv/, 'low');
            const highMCV = findMarker(cbcMarkers, /mcv/, 'high');
            const highRDW = findMarkerAbnormal(cbcMarkers, /rdw/);
            const highWBC = findMarker(cbcMarkers, /white blood|wbc/, 'high');

            let insight = `${cbcAbnormal.length} blood cell marker${cbcAbnormal.length > 1 ? 's are' : ' is'} outside range.`;
            if (lowHgb && lowMCV) insight = 'Low hemoglobin with low MCV points toward iron-deficiency anemia. Iron stores (ferritin) should be checked and supplementation started if confirmed.';
            else if (lowHgb) insight = 'Low hemoglobin suggests anemia — the most common causes are iron, B12, or folate deficiency.';
            else if (highMCV) insight = 'Elevated MCV (large red blood cells) often indicates B12 or folate deficiency, even when levels appear "normal" on standard ranges.';
            else if (highRDW) insight = 'Elevated RDW shows variation in red blood cell size, which is an early signal of nutrient deficiency (iron or B12) before full anemia develops.';
            else if (highWBC) insight = 'Elevated white blood cells may reflect acute infection, chronic stress, or an inflammatory process.';

            const actions: FocusAction[] = [];
            if (highWBC) actions.push({ type: 'followup', text: 'Repeat CBC in 4-6 weeks — if WBC remains elevated without acute illness, investigate further' });
            actions.push({ type: 'followup', text: 'Retest CBC in 6-8 weeks to confirm trend' });

            const { grade, score } = panelInfo('Complete Blood Count');
            focusAreas.push({ panel: 'Complete Blood Count', emoji: '🩸', grade, score, markers: abnormalEntries(cbcMarkers), insight, actions });
        }
    }

    // ────────────────────────── METABOLIC PANEL ──────────────────────────
    const metabMarkers = markers.filter(m => m.category === 'Metabolic Panel');
    const metabAbnormal = metabMarkers.filter(m => m.latest.status !== 'normal');
    if (metabMarkers.length > 0) {
        if (metabAbnormal.length === 0) {
            cleanPanels.push('Metabolic Panel');
        } else {
            const highCa = findMarkerAbnormal(metabMarkers, /calcium/);
            const highBili = findMarkerAbnormal(metabMarkers, /bilirubin/);
            const highGlucose = findMarker(metabMarkers, /glucose/, 'high');

            let insight = `${metabAbnormal.length} metabolic marker${metabAbnormal.length > 1 ? 's' : ''} slightly outside range.`;
            if (highGlucose) insight = 'Elevated fasting glucose may signal early insulin resistance. If confirmed on repeat testing, dietary intervention can often reverse this.';
            else if (highCa) insight = 'Mildly elevated calcium can be benign but warrants a PTH check, especially with vitamin D supplementation.';
            else if (highBili) insight = 'Mildly elevated bilirubin is very common (~5% of people have Gilbert\'s syndrome) and is generally benign — it can actually be protective as an antioxidant.';

            const actions: FocusAction[] = [];
            if (highGlucose) {
                actions.push({ type: 'lifestyle', text: 'Increase fiber intake & reduce refined carbohydrates' });
                actions.push({ type: 'followup', text: 'Add HbA1c and fasting insulin to next blood draw' });
            }
            if (highCa) actions.push({ type: 'followup', text: 'Recheck calcium with PTH and ionized calcium' });

            const { grade, score } = panelInfo('Metabolic Panel');
            focusAreas.push({ panel: 'Metabolic Panel', emoji: '⚗️', grade, score, markers: abnormalEntries(metabMarkers), insight, actions });
        }
    }

    // ────────────────────────── LIVER FUNCTION ──────────────────────────
    const liverMarkers = markers.filter(m => m.category === 'Liver Function');
    const liverAbnormal = liverMarkers.filter(m => m.latest.status !== 'normal');
    if (liverMarkers.length > 0) {
        if (liverAbnormal.length === 0) { cleanPanels.push('Liver Function'); }
        else {
            const highALT = findMarker(liverMarkers, /\balt\b/, 'high');
            const highAST = findMarker(liverMarkers, /\bast\b/, 'high');
            const highGGT = findMarker(liverMarkers, /ggt|gamma/, 'high');

            let insight = 'Liver enzymes are mildly elevated.';
            if (highALT && highAST) insight = 'ALT and AST are both elevated — the most common cause is fatty liver (NAFLD), which affects ~25% of adults. It reverses with weight loss, reduced sugar/alcohol, and exercise.';
            else if (highALT) insight = 'Isolated ALT elevation usually points to hepatocellular inflammation. Fatty liver is the #1 cause in people without significant alcohol use.';
            else if (highGGT) insight = 'Elevated GGT is very sensitive to alcohol, medications, and metabolic stress on the liver.';

            const actions: FocusAction[] = [];
            actions.push({ type: 'lifestyle', text: 'Minimize alcohol and processed foods' });
            actions.push({ type: 'followup', text: 'Liver ultrasound if ALT/AST remain elevated on recheck' });

            const { grade, score } = panelInfo('Liver Function');
            focusAreas.push({ panel: 'Liver Function', emoji: '🫁', grade, score, markers: abnormalEntries(liverMarkers), insight, actions });
        }
    }

    // ────────────────────────── THYROID ──────────────────────────
    const thyroidMarkers = markers.filter(m => m.category === 'Thyroid');
    const thyroidAbnormal = thyroidMarkers.filter(m => m.latest.status !== 'normal');
    if (thyroidMarkers.length > 0) {
        if (thyroidAbnormal.length === 0) { cleanPanels.push('Thyroid'); }
        else {
            const highTSH = findMarker(thyroidMarkers, /tsh/, 'high');
            const lowTSH = findMarker(thyroidMarkers, /tsh/, 'low');
            const lowFT4 = findMarker(thyroidMarkers, /free t4|ft4|thyroxine/, 'low');
            const highFT4 = findMarker(thyroidMarkers, /free t4|ft4|thyroxine/, 'high');

            let insight = 'Thyroid markers are outside optimal range.';
            if (highTSH && lowFT4) insight = 'Elevated TSH with low T4 is the classic pattern of hypothyroidism. Common symptoms include fatigue, weight gain, cold sensitivity, and brain fog. This is very treatable.';
            else if (highTSH) insight = 'Elevated TSH with normal T4 is subclinical hypothyroidism — your thyroid is working harder to keep hormones in range. Selenium and iodine status should be assessed.';
            else if (lowTSH && highFT4) insight = 'Suppressed TSH with elevated T4 warrants investigation for hyperthyroidism. This needs prompt clinical evaluation.';
            else if (lowTSH) insight = 'Low TSH may indicate subclinical hyperthyroidism or non-thyroidal illness.';

            const actions: FocusAction[] = [];
            actions.push({ type: 'followup', text: 'Check thyroid antibodies (TPO, thyroglobulin) to rule out Hashimoto\'s thyroiditis' });
            if (lowTSH) actions.push({ type: 'followup', text: 'See endocrinologist for evaluation' });

            const { grade, score } = panelInfo('Thyroid');
            focusAreas.push({ panel: 'Thyroid', emoji: '🦋', grade, score, markers: abnormalEntries(thyroidMarkers), insight, actions });
        }
    }

    // ────────────────────────── INFLAMMATION ──────────────────────────
    const inflammMarkers = markers.filter(m => m.category === 'Inflammation');
    const inflammAbnormal = inflammMarkers.filter(m => m.latest.status !== 'normal');
    if (inflammMarkers.length > 0) {
        if (inflammAbnormal.length === 0) { cleanPanels.push('Inflammation'); }
        else {
            const highCRP = findMarkerAbnormal(inflammMarkers, /crp|c-reactive/);
            const highHcy = findMarkerAbnormal(inflammMarkers, /homocysteine/);
            const highESR = findMarkerAbnormal(inflammMarkers, /sed rate|esr/);

            const parts: string[] = [];
            if (highCRP) {
                const crpVal = parseFloat(String(highCRP.latest.rawValue));
                if (!isNaN(crpVal) && crpVal > 3) parts.push('hs-CRP is significantly elevated (>3 mg/L = high cardiovascular risk per AHA). This may reflect chronic inflammation from diet, visceral fat, or autoimmune processes.');
                else parts.push('hs-CRP is mildly elevated, indicating some systemic inflammation.');
            }
            if (highHcy) parts.push(`Homocysteine at ${val(highHcy)} is an independent cardiovascular and cognitive risk factor. Methylated B-vitamins are the primary intervention.`);
            if (highESR) parts.push('Elevated ESR is a non-specific inflammation marker — context matters.');
            const insight = parts.join(' ') || 'Inflammatory markers are outside range.';

            const actions: FocusAction[] = [];
            if (highCRP) {
                actions.push({ type: 'lifestyle', text: 'Anti-inflammatory diet: more vegetables, fatty fish, olive oil; less sugar, seed oils, processed food' });
            }
            if (highHcy) {
                actions.push({ type: 'followup', text: 'Retest homocysteine in 8-12 weeks to confirm response' });
            }

            const { grade, score } = panelInfo('Inflammation');
            focusAreas.push({ panel: 'Inflammation', emoji: '🔥', grade, score, markers: abnormalEntries(inflammMarkers), insight, actions });
        }
    }

    // ────────────────────────── DIABETES & BLOOD SUGAR ──────────────────────────
    const diabetesMarkers = markers.filter(m => m.category === 'Diabetes & Blood Sugar');
    const diabetesAbnormal = diabetesMarkers.filter(m => m.latest.status !== 'normal');
    if (diabetesMarkers.length > 0) {
        if (diabetesAbnormal.length === 0) { cleanPanels.push('Diabetes & Blood Sugar'); }
        else {
            const highA1c = findMarkerAbnormal(diabetesMarkers, /a1c|hba1c/);
            const highInsulin = findMarker(diabetesMarkers, /insulin/, 'high');

            let insight = 'Blood sugar markers need attention.';
            if (highA1c) {
                const a1cVal = parseFloat(String(highA1c.latest.rawValue));
                if (!isNaN(a1cVal) && a1cVal >= 6.5) insight = `HbA1c of ${val(highA1c)} is in the diabetic range (>=6.5%). Active blood sugar management is critical.`;
                else if (!isNaN(a1cVal) && a1cVal >= 5.7) insight = `HbA1c of ${val(highA1c)} is pre-diabetic (5.7-6.4%). This is reversible with diet, exercise, and targeted supplementation.`;
            } else if (highInsulin) {
                insight = `Elevated fasting insulin at ${val(highInsulin)} signals insulin resistance — your body is overproducing insulin to keep glucose in check. This is an early warning sign that often appears years before glucose or A1c become abnormal.`;
            }

            const actions: FocusAction[] = [];
            actions.push({ type: 'lifestyle', text: 'Time-restricted eating (16:8) and reducing carbohydrate load' });
            actions.push({ type: 'lifestyle', text: 'Resistance training + walking after meals to lower glucose spikes' });
            actions.push({ type: 'followup', text: 'Get fasting insulin, HOMA-IR, and C-peptide if not already tested' });

            const { grade, score } = panelInfo('Diabetes & Blood Sugar');
            focusAreas.push({ panel: 'Diabetes & Blood Sugar', emoji: '🍬', grade, score, markers: abnormalEntries(diabetesMarkers), insight, actions });
        }
    }

    // ────────────────────────── KIDNEY FUNCTION ──────────────────────────
    const kidneyMarkers = markers.filter(m => m.category === 'Kidney Function');
    const kidneyAbnormal = kidneyMarkers.filter(m => m.latest.status !== 'normal');
    if (kidneyMarkers.length > 0) {
        if (kidneyAbnormal.length === 0) { cleanPanels.push('Kidney Function'); }
        else {
            const lowGFR = findMarker(kidneyMarkers, /gfr|glomerular/, 'low');
            const highUricAcid = findMarker(kidneyMarkers, /uric acid/, 'high');

            let insight = 'Kidney function markers need monitoring.';
            if (lowGFR) insight = 'Reduced GFR means your kidneys aren\'t filtering at full capacity. Hydration, blood pressure control, and avoiding NSAID overuse are key protective factors.';
            else if (highUricAcid) insight = `Elevated uric acid at ${val(highUricAcid)} increases risk for gout, kidney stones, and cardiovascular disease. Diet and hydration are first-line interventions.`;

            const actions: FocusAction[] = [];
            if (highUricAcid) {
                actions.push({ type: 'lifestyle', text: 'Reduce purine-rich foods (red meat, shellfish, beer) and drink 2-3L water daily' });
            }
            if (lowGFR) {
                actions.push({ type: 'lifestyle', text: 'Ensure adequate hydration and limit NSAID use' });
            }
            actions.push({ type: 'followup', text: 'Recheck kidney markers in 3 months — trending GFR over time is more informative than a single reading' });

            const { grade, score } = panelInfo('Kidney Function');
            focusAreas.push({ panel: 'Kidney Function', emoji: '🫘', grade, score, markers: abnormalEntries(kidneyMarkers), insight, actions });
        }
    }

    // ────────────────────────── OMEGA & FATTY ACIDS ──────────────────────────
    const omegaMarkers = markers.filter(m => m.category === 'Omega & Fatty Acids');
    const omegaAbnormal = omegaMarkers.filter(m => m.latest.status !== 'normal');
    if (omegaMarkers.length > 0) {
        if (omegaAbnormal.length === 0) { cleanPanels.push('Omega & Fatty Acids'); }
        else {
            const o3Index = findMarkerAbnormal(omegaMarkers, /omega.?3 total|omegacheck|omega-3 index/);
            const ratio = findMarkerAbnormal(omegaMarkers, /omega.?6.*omega.?3 ratio|6:3 ratio/);

            let insight = 'Your fatty acid balance is suboptimal.';
            if (o3Index) insight = `Omega-3 index at ${val(o3Index)} is below the cardioprotective threshold (>=5.5%, optimal >=8%). This is one of the most modifiable risk factors — consistent fish oil supplementation produces measurable improvement within 8-12 weeks.`;
            else if (ratio) insight = `Your Omega-6/Omega-3 ratio of ${val(ratio)} is pro-inflammatory (optimal <4:1, typical American diet is 15-20:1). Increasing omega-3 intake while reducing vegetable/seed oils corrects this.`;

            const actions: FocusAction[] = [];
            actions.push({ type: 'lifestyle', text: 'Eat fatty fish 2-3x/week (salmon, sardines, mackerel) and reduce seed oil usage' });
            actions.push({ type: 'followup', text: 'Retest omega-3 index in 3 months to confirm improvement' });

            const { grade, score } = panelInfo('Omega & Fatty Acids');
            focusAreas.push({ panel: 'Omega & Fatty Acids', emoji: '🐟', grade, score, markers: abnormalEntries(omegaMarkers), insight, actions });
        }
    }

    // ────────────────────────── HORMONES ──────────────────────────
    const hormoneMarkers = markers.filter(m => m.category === 'Hormones');
    const hormoneAbnormal = hormoneMarkers.filter(m => m.latest.status !== 'normal');
    if (hormoneMarkers.length > 0) {
        if (hormoneAbnormal.length === 0) { cleanPanels.push('Hormones'); }
        else {
            const lowTest = findMarker(hormoneMarkers, /testosterone/, 'low');
            const highCortisol = findMarker(hormoneMarkers, /cortisol/, 'high');
            const lowCortisol = findMarker(hormoneMarkers, /cortisol/, 'low');
            const highEstradiol = findMarker(hormoneMarkers, /estradiol|estrogen/, 'high');
            const abnLeptin = findMarkerAbnormal(hormoneMarkers, /leptin/);

            let insight = `${hormoneAbnormal.length} hormonal marker${hormoneAbnormal.length > 1 ? 's are' : ' is'} outside range.`;
            if (lowTest) insight = 'Low testosterone affects energy, libido, muscle mass, and mood. Before considering hormone replacement, optimize sleep, exercise, zinc, vitamin D, and stress — these alone can raise levels 20-30%.';
            else if (highCortisol) insight = 'Elevated cortisol reflects chronic stress. It impacts sleep quality, body composition (increases visceral fat), immune function, and blood sugar. Adaptogenic herbs and stress management are effective interventions.';
            else if (lowCortisol) insight = 'Low cortisol may indicate HPA axis dysfunction (sometimes called "adrenal fatigue"). A 4-point salivary cortisol test gives the most complete picture.';
            else if (highEstradiol) insight = 'Elevated estradiol in males often indicates aromatization of testosterone. DIM and cruciferous vegetables support healthy estrogen metabolism.';

            const actions: FocusAction[] = [];
            if (lowTest) {
                actions.push({ type: 'lifestyle', text: 'Prioritize 7-9 hours of sleep and lift heavy weights 3-4x/week' });
            }
            if (highCortisol) {
                actions.push({ type: 'lifestyle', text: 'Daily stress management: meditation, breathwork, or nature walks' });
            }
            if (abnLeptin && abnLeptin.latest.status === 'high') {
                actions.push({ type: 'lifestyle', text: 'Leptin resistance is tied to insulin resistance — address blood sugar and reduce processed food' });
            }
            actions.push({ type: 'followup', text: 'Retest hormones in 8-12 weeks after implementing changes' });

            const { grade, score } = panelInfo('Hormones');
            focusAreas.push({ panel: 'Hormones', emoji: '🧬', grade, score, markers: abnormalEntries(hormoneMarkers), insight, actions });
        }
    }

    // ────────────────────────── VITAMINS & MINERALS ──────────────────────────
    const vitaminMarkers = markers.filter(m => m.category === 'Vitamins & Minerals');
    const vitaminAbnormal = vitaminMarkers.filter(m => m.latest.status !== 'normal');
    if (vitaminMarkers.length > 0) {
        if (vitaminAbnormal.length === 0) { cleanPanels.push('Vitamins & Minerals'); }
        else {
            const lowD = findMarker(vitaminMarkers, /vitamin d|25-hydroxy/, 'low');
            const lowB12 = findMarker(vitaminMarkers, /b12|cobalamin/, 'low');
            const lowFerritin = findMarker(vitaminMarkers, /ferritin/, 'low');
            const highFerritin = findMarker(vitaminMarkers, /ferritin/, 'high');
            const lowZinc = findMarker(vitaminMarkers, /zinc/, 'low');
            const lowMag = findMarker(vitaminMarkers, /magnesium/, 'low');

            let insight = `${vitaminAbnormal.length} vitamin/mineral level${vitaminAbnormal.length > 1 ? 's need' : ' needs'} attention.`;
            if (lowD) insight = `Vitamin D at ${val(lowD)} is insufficient — optimal range is 40-60 ng/mL. Low D affects immune function, bone health, mood, testosterone, and cancer risk. It's one of the highest-impact supplements.`;
            else if (lowFerritin) insight = `Ferritin at ${val(lowFerritin)} is low. Even "normal" ferritin below 50 can cause fatigue, hair loss, restless legs, and poor exercise recovery. Iron bisglycinate is the best-tolerated form.`;
            else if (lowB12) insight = `B12 at ${val(lowB12)} is low. Deficiency causes fatigue, neuropathy, and cognitive fog. Sublingual methylcobalamin is better absorbed than oral cyanocobalamin.`;
            else if (highFerritin) insight = `Elevated ferritin at ${val(highFerritin)} may indicate iron overload, inflammation, or liver stress. Check iron saturation and consider hemochromatosis screening if persistently high.`;

            const actions: FocusAction[] = [];
            if (highFerritin) actions.push({ type: 'followup', text: 'Check iron saturation and consider hemochromatosis gene test' });
            actions.push({ type: 'followup', text: 'Retest in 3 months to track progress' });

            const { grade, score } = panelInfo('Vitamins & Minerals');
            focusAreas.push({ panel: 'Vitamins & Minerals', emoji: '💊', grade, score, markers: abnormalEntries(vitaminMarkers), insight, actions });
        }
    }

    // ────────────────────────── CARDIAC ──────────────────────────
    const cardiacMarkers = markers.filter(m => m.category === 'Cardiac');
    const cardiacAbnormal = cardiacMarkers.filter(m => m.latest.status !== 'normal');
    if (cardiacMarkers.length > 0) {
        if (cardiacAbnormal.length === 0) { cleanPanels.push('Cardiac'); }
        else {
            const highTroponin = findMarkerAbnormal(cardiacMarkers, /troponin/);
            let insight = 'Cardiac markers need clinical attention.';
            if (highTroponin) insight = 'Elevated troponin indicates heart muscle damage — this requires immediate medical evaluation.';

            const actions: FocusAction[] = [];
            if (highTroponin) actions.push({ type: 'followup', text: 'URGENT: Contact your healthcare provider immediately for cardiac evaluation' });
            else actions.push({ type: 'followup', text: 'Discuss cardiac markers with your cardiologist — echocardiogram may be warranted' });

            const { grade, score } = panelInfo('Cardiac');
            focusAreas.push({ panel: 'Cardiac', emoji: '❤️', grade, score, markers: abnormalEntries(cardiacMarkers), insight, actions });
        }
    }

    // ────────────────────────── AUTOIMMUNE & IMMUNE ──────────────────────────
    const autoMarkers = markers.filter(m => m.category === 'Autoimmune & Immune');
    const autoAbnormal = autoMarkers.filter(m => m.latest.status !== 'normal');
    if (autoMarkers.length > 0) {
        if (autoAbnormal.length === 0) { cleanPanels.push('Autoimmune & Immune'); }
        else {
            const highTPO = findMarkerAbnormal(autoMarkers, /tpo|peroxidase/);
            const highTgAb = findMarkerAbnormal(autoMarkers, /thyroglobulin antibod/);
            const highANA = findMarkerAbnormal(autoMarkers, /ana|anti.?nuclear/);

            let insight = 'Immune markers need follow-up.';
            if (highTPO || highTgAb) insight = 'Elevated thyroid antibodies are consistent with Hashimoto\'s thyroiditis — the most common autoimmune condition and #1 cause of hypothyroidism. Selenium, gluten avoidance, and gut health optimization can reduce antibody levels.';
            else if (highANA) insight = 'Positive ANA can be found in healthy individuals (up to 15% of people), but combined with symptoms it may indicate an autoimmune condition.';

            const actions: FocusAction[] = [];
            if (highTPO || highTgAb) {
                actions.push({ type: 'lifestyle', text: 'Consider 30-day gluten elimination trial — strong Hashimoto\'s-gluten connection in research' });
            }
            actions.push({ type: 'followup', text: 'See endocrinologist or immunologist for complete evaluation' });

            const { grade, score } = panelInfo('Autoimmune & Immune');
            focusAreas.push({ panel: 'Autoimmune & Immune', emoji: '🛡️', grade, score, markers: abnormalEntries(autoMarkers), insight, actions });
        }
    }

    // ────────────────────────── PROSTATE ──────────────────────────
    const prostateMarkers = markers.filter(m => m.category === 'Prostate');
    const prostateAbnormal = prostateMarkers.filter(m => m.latest.status !== 'normal');
    if (prostateMarkers.length > 0) {
        if (prostateAbnormal.length === 0) { cleanPanels.push('Prostate'); }
        else {
            const { grade, score } = panelInfo('Prostate');
            focusAreas.push({
                panel: 'Prostate', emoji: '🔬', grade, score,
                markers: abnormalEntries(prostateMarkers),
                insight: 'Elevated PSA can result from benign enlargement (BPH), prostatitis, recent activity, or malignancy. PSA velocity over time is more informative than a single reading.',
                actions: [
                    { type: 'followup', text: 'Request free PSA ratio and follow-up with urologist' },
                ],
            });
        }
    }

    // ────────────────────────── URINALYSIS ──────────────────────────
    const urineMarkers = markers.filter(m => m.category === 'Urinalysis');
    const urineAbnormal = urineMarkers.filter(m => m.latest.status !== 'normal');
    if (urineMarkers.length > 0) {
        if (urineAbnormal.length === 0) { cleanPanels.push('Urinalysis'); }
        else {
            const { grade, score } = panelInfo('Urinalysis');
            focusAreas.push({
                panel: 'Urinalysis', emoji: '🧪', grade, score,
                markers: abnormalEntries(urineMarkers),
                insight: 'Abnormal urinalysis findings may indicate kidney stress, infection, or metabolic overflow. Clinical context matters — isolated findings on a single test often resolve on repeat.',
                actions: [{ type: 'followup', text: 'Recheck urinalysis and discuss with your provider if findings persist' }],
            });
        }
    }

    // ────────────────────────── TOXICOLOGY & METALS ──────────────────────────
    const toxMarkers = markers.filter(m => m.category === 'Toxicology & Metals');
    const toxAbnormal = toxMarkers.filter(m => m.latest.status !== 'normal');
    if (toxMarkers.length > 0) {
        if (toxAbnormal.length === 0) { cleanPanels.push('Toxicology & Metals'); }
        else {
            const highMercury = findMarkerAbnormal(toxMarkers, /mercury/);
            const highLead = findMarkerAbnormal(toxMarkers, /lead/);

            let insight = 'Heavy metal levels need attention.';
            if (highMercury) insight = 'Elevated mercury is usually tied to fish consumption (tuna, swordfish) or dental amalgams. Selenium binds mercury and supports detoxification.';
            else if (highLead) insight = 'Even low-level lead exposure is harmful. Identifying and eliminating the source is the priority — old paint, contaminated water, and certain occupations are common sources.';

            const actions: FocusAction[] = [];
            if (highMercury) actions.push({ type: 'lifestyle', text: 'Reduce high-mercury fish (tuna, swordfish, king mackerel); switch to low-mercury options (salmon, sardines)' });
            if (highLead) actions.push({ type: 'lifestyle', text: 'Test home water supply and identify lead exposure sources' });
            actions.push({ type: 'followup', text: 'Retest in 6 months after addressing exposure' });

            const { grade, score } = panelInfo('Toxicology & Metals');
            focusAreas.push({ panel: 'Toxicology & Metals', emoji: '☣️', grade, score, markers: abnormalEntries(toxMarkers), insight, actions });
        }
    }

    // ────────────────────────── COAGULATION ──────────────────────────
    const coagMarkers = markers.filter(m => m.category === 'Coagulation');
    const coagAbnormal = coagMarkers.filter(m => m.latest.status !== 'normal');
    if (coagMarkers.length > 0) {
        if (coagAbnormal.length === 0) {
            cleanPanels.push('Coagulation');
        } else {
            const highINR = findMarkerAbnormal(coagMarkers, /inr/);
            const abnormalPT = findMarkerAbnormal(coagMarkers, /\bpt\b|prothrombin/);

            let insight = 'Blood clotting markers are outside reference range, which may indicate a clotting disorder or medication effect.';
            if (highINR) insight = 'An abnormal INR may indicate clotting factor issues or medication effects. If you take blood thinners (warfarin), this should be discussed with your prescribing physician for dosage adjustments.';
            else if (abnormalPT) insight = 'Prothrombin time (PT) is outside normal range, which may reflect liver function, vitamin K status, or medication interactions.';

            const actions: FocusAction[] = [];
            actions.push({ type: 'followup', text: 'Discuss results with your physician, especially if taking anticoagulant medication' });
            actions.push({ type: 'followup', text: 'Retest within 2-4 weeks if no known cause' });

            const { grade, score } = panelInfo('Coagulation');
            focusAreas.push({ panel: 'Coagulation', emoji: '🩹', grade, score, markers: abnormalEntries(coagMarkers), insight, actions });
        }
    }

    // ── Catch-all: any categories not explicitly handled above ──
    const handledCategories = new Set([
        'Lipid Panel', 'Complete Blood Count', 'Metabolic Panel', 'Liver Function',
        'Thyroid', 'Inflammation', 'Diabetes & Blood Sugar', 'Kidney Function',
        'Omega & Fatty Acids', 'Hormones', 'Vitamins & Minerals', 'Cardiac',
        'Autoimmune & Immune', 'Prostate', 'Urinalysis', 'Toxicology & Metals', 'Blood Type',
        'Coagulation',
    ]);
    const otherMarkers = markers.filter(m => !handledCategories.has(m.category));
    const otherAbnormal = otherMarkers.filter(m => m.latest.status !== 'normal');
    if (otherMarkers.length > 0 && otherAbnormal.length === 0) {
        cleanPanels.push('Other');
    } else if (otherAbnormal.length > 0) {
        const { grade, score } = panelInfo('Other');
        focusAreas.push({
            panel: 'Other', emoji: '📋', grade, score,
            markers: abnormalEntries(otherMarkers),
            insight: `${otherAbnormal.length} additional marker${otherAbnormal.length > 1 ? 's are' : ' is'} outside reference range.`,
            actions: [{ type: 'followup', text: 'Discuss these markers with your provider for clinical context' }],
        });
    }

    // Blood Type — never has "abnormal" markers, just add to clean if present
    if (markers.some(m => m.category === 'Blood Type')) cleanPanels.push('Blood Type');

    // Sort focus areas: worst grade first
    const gradeOrder: Record<string, number> = { F: 0, D: 1, 'C-': 2, C: 3, 'C+': 4, 'B-': 5, B: 6, 'B+': 7, 'A-': 8, A: 9, 'A+': 10 };
    focusAreas.sort((a, b) => (gradeOrder[a.grade] ?? 5) - (gradeOrder[b.grade] ?? 5));

    // ── Headline ──
    const concernPanels = focusAreas.map(f => f.panel);
    let headline: string;
    if (focusAreas.length === 0) {
        headline = 'All panels within optimal ranges — excellent work';
    } else if (critical.length > 0) {
        headline = `${critical.length} critical finding${critical.length > 1 ? 's' : ''} — take action now`;
    } else if (focusAreas.length === 1) {
        headline = `Strong overall — focus on ${concernPanels[0]}`;
    } else if (focusAreas.length === 2 && normalPct >= 85) {
        headline = `Solid baseline — optimize ${concernPanels[0]} and ${concernPanels[1]}`;
    } else if (focusAreas.length <= 3) {
        headline = `${focusAreas.length} areas to address — here's your plan`;
    } else {
        headline = `${abnormal.length} markers across ${focusAreas.length} panels need attention`;
    }

    // ── Narrative (one sentence) ──
    const narrative = `${markers.length} biomarkers analyzed, ${normalPct}% in range — overall score ${healthScore.overall}/100 (${healthScore.grade}).`;

    return { headline, narrative, strengths: cleanPanels, focusAreas };
}

// ── Service ────────────────────────────────────────────────────────────

export class LabsService {

    /**
     * Build the full biomarker dashboard payload for a user.
     * Aggregates every marker across all completed lab reports,
     * computes deltas, trends, and returns in a single response.
     */
    async getBiomarkersDashboard(userId: string): Promise<BiomarkersDashboard> {
        const allReports = await filesRepository.getLabReportsByUser(userId);

        // Filter to completed reports with extracted data, sort oldest → newest
        const completedReports = allReports
            .filter(r => {
                const ld = r.labReportData as any;
                return ld?.analysisStatus === 'completed' && Array.isArray(ld?.extractedData) && ld.extractedData.length > 0;
            })
            .sort((a, b) => {
                const dateA = this.getReportDate(a);
                const dateB = this.getReportDate(b);
                return new Date(dateA).getTime() - new Date(dateB).getTime(); // oldest first
            });

        if (completedReports.length === 0) {
            return this.emptyDashboard(allReports);
        }

        // Build per-report insights lookup: reportId → { canonicalKey → MarkerInsight }
        const reportInsightsMap = new Map<string, Record<string, MarkerInsight>>();
        for (const r of completedReports) {
            const ld = r.labReportData as any;
            if (ld?.markerInsights && typeof ld.markerInsights === 'object') {
                reportInsightsMap.set(r.id, ld.markerInsights as Record<string, MarkerInsight>);
            }
        }

        // Track which reports are missing insights for lazy backfill
        const reportsMissingInsights = completedReports.filter(r => !reportInsightsMap.has(r.id));

        // Build per-marker history map: key → MarkerHistory[]
        const markerHistoryMap = new Map<string, { name: string; category: string; histories: MarkerHistory[]; referenceRange: string }>();

        for (const report of completedReports) {
            const ld = report.labReportData as any;
            const reportDate = this.getReportDate(report);
            const markers: any[] = ld.extractedData;

            for (const m of markers) {
                const rawName = m.testName || m.name || '';
                if (!rawName) continue;

                // Use alias-aware canonical key so "WBC" and "White Blood Cell Count" merge
                const key = canonicalKey(rawName);
                if (!key) continue;

                // Resolve to canonical display name
                const displayName = canonicalName(rawName);

                const numVal = parseNumeric(m.value);

                const entry: MarkerHistory = {
                    date: reportDate,
                    value: numVal,
                    rawValue: String(m.value ?? ''),
                    unit: m.unit || '',
                    status: this.normalizeStatus(m.status),
                    reportId: report.id,
                };

                if (!markerHistoryMap.has(key)) {
                    markerHistoryMap.set(key, {
                        name: displayName,
                        category: inferCategory(displayName),
                        histories: [],
                        referenceRange: m.referenceRange || '',
                    });
                }

                const existing = markerHistoryMap.get(key)!;
                existing.histories.push(entry);
                // Update reference range if we get a better one
                if (m.referenceRange && !existing.referenceRange) {
                    existing.referenceRange = m.referenceRange;
                }
            }
        }

        // Deduplicate history entries: keep only one entry per reportId per marker
        // If the same report has duplicate extractions for a marker, keep the last one
        for (const [, entry] of markerHistoryMap.entries()) {
            const seen = new Map<string, number>(); // reportId → index
            const deduped: MarkerHistory[] = [];
            for (const h of entry.histories) {
                const existingIdx = seen.get(h.reportId);
                if (existingIdx !== undefined) {
                    // Replace previous entry from same report with this one
                    deduped[existingIdx] = h;
                } else {
                    seen.set(h.reportId, deduped.length);
                    deduped.push(h);
                }
            }
            entry.histories = deduped;
        }

        // Build aggregated biomarker list
        const markers: AggregatedBiomarker[] = [];
        let normal = 0, high = 0, low = 0, critical = 0;
        let improving = 0, worsening = 0, stable = 0, newMarkers = 0;

        for (const [key, entry] of markerHistoryMap.entries()) {
            const histories = entry.histories; // oldest → newest
            const latestH = histories[histories.length - 1];
            const prevH = histories.length >= 2 ? histories[histories.length - 2] : null;

            const clinDir = getClinicalDirection(entry.name);

            let delta: number | null = null;
            let deltaAbsolute: number | null = null;
            let trend: 'improving' | 'worsening' | 'stable' | 'new' = 'new';

            if (prevH && latestH.value != null && prevH.value != null && prevH.value !== 0) {
                delta = ((latestH.value - prevH.value) / Math.abs(prevH.value)) * 100;
                delta = Math.round(delta * 10) / 10;
                deltaAbsolute = Math.round((latestH.value - prevH.value) * 100) / 100;
                trend = computeTrend(delta, latestH.status, prevH.status, clinDir);
            } else if (prevH) {
                trend = computeTrend(null, latestH.status, prevH.status, clinDir);
            }

            // Tally
            switch (latestH.status) {
                case 'normal': normal++; break;
                case 'high': high++; break;
                case 'low': low++; break;
                case 'critical': critical++; break;
            }
            switch (trend) {
                case 'improving': improving++; break;
                case 'worsening': worsening++; break;
                case 'stable': stable++; break;
                case 'new': newMarkers++; break;
            }

            markers.push({
                key,
                name: entry.name,
                category: entry.category,
                latest: {
                    value: latestH.value,
                    rawValue: latestH.rawValue,
                    unit: latestH.unit,
                    referenceRange: entry.referenceRange,
                    status: latestH.status,
                    date: latestH.date,
                    reportId: latestH.reportId,
                },
                previous: prevH ? {
                    value: prevH.value,
                    rawValue: prevH.rawValue,
                    status: prevH.status,
                    date: prevH.date,
                } : null,
                delta,
                deltaAbsolute,
                trend,
                clinicalDirection: clinDir,
                history: histories,
                insight: reportInsightsMap.get(latestH.reportId)?.[key] || null,
            });
        }

        // Sort: critical → high/low → normal, then by name
        markers.sort((a, b) => {
            const sev = (s: string) => s === 'critical' ? 0 : s === 'high' || s === 'low' ? 1 : 2;
            const sa = sev(a.latest.status), sb = sev(b.latest.status);
            if (sa !== sb) return sa - sb;
            return a.name.localeCompare(b.name);
        });

        // Build comparison changes (top changes between last two reports)
        const changes = markers
            .filter(m => m.previous && m.trend !== 'new' && m.trend !== 'stable')
            .sort((a, b) => {
                const trendOrder = (t: string) => t === 'worsening' ? 0 : t === 'improving' ? 1 : 2;
                const ta = trendOrder(a.trend), tb = trendOrder(b.trend);
                if (ta !== tb) return ta - tb;
                return Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0);
            })
            .slice(0, 8)
            .map(m => ({
                name: m.name,
                from: m.previous!.rawValue + (m.latest.unit ? ` ${m.latest.unit}` : ''),
                to: m.latest.rawValue + (m.latest.unit ? ` ${m.latest.unit}` : ''),
                unit: m.latest.unit,
                trend: m.trend as 'improving' | 'worsening' | 'stable',
                percentChange: m.delta,
            }));

        const healthScore = computeHealthScore(markers);
        const analysisSummary = generateAnalysisSummary(markers, healthScore);

        // Compute biological age (non-blocking — gracefully returns null on failure)
        let biologicalAge: BiologicalAge | null = null;
        try {
            biologicalAge = await computeBiologicalAge(userId, markers, healthScore.overall);
        } catch (err) {
            logger.debug('Biological age computation failed:', err);
        }

        const latestReport = completedReports[completedReports.length - 1];
        const prevReport = completedReports.length >= 2 ? completedReports[completedReports.length - 2] : null;

        const result: BiomarkersDashboard = {
            markers,
            healthScore,
            analysisSummary,
            summary: {
                totalMarkers: markers.length,
                normal, high, low, critical,
                improving, worsening, stable, newMarkers,
            },
            reports: allReports.map(r => {
                const ld = r.labReportData as any;
                const extracted = Array.isArray(ld?.extractedData) ? ld.extractedData : [];
                return {
                    id: r.id,
                    fileName: r.originalFileName,
                    testDate: ld?.testDate || null,
                    uploadedAt: String(r.uploadedAt),
                    testType: ld?.testType || null,
                    labName: ld?.labName || null,
                    markerCount: extracted.length,
                    status: ld?.analysisStatus || 'unknown',
                };
            }),
            comparison: {
                hasMultipleReports: completedReports.length >= 2,
                latestReportDate: this.getReportDate(latestReport),
                previousReportDate: prevReport ? this.getReportDate(prevReport) : null,
                changes,
            },
            biologicalAge,
        };

        // Fire-and-forget: lazily backfill insights for any report that was
        // uploaded before the pre-generation feature existed.
        if (reportsMissingInsights.length > 0) {
            void (async () => {
                for (const r of reportsMissingInsights) {
                    try {
                        const ld = r.labReportData as any;
                        const extracted = Array.isArray(ld?.extractedData) ? ld.extractedData : [];
                        if (extracted.length === 0) continue;
                        const insights = await this.generateAllMarkerInsights(extracted);
                        if (Object.keys(insights).length > 0) {
                            await filesRepository.updateFileUpload(r.id, {
                                labReportData: { ...ld, markerInsights: insights }
                            });
                            logger.info(`🔄 Backfilled marker insights for report ${r.id}`);
                        }
                    } catch (err) {
                        logger.warn(`Failed to backfill insights for report ${r.id}:`, err);
                    }
                }
            })();
        }

        return result;
    }

    // ── Private helpers ─────────────────────────────────────────────

    private getReportDate(report: FileUpload): string {
        const ld = report.labReportData as any;
        if (ld?.testDate) return ld.testDate;
        return new Date(report.uploadedAt).toISOString().split('T')[0];
    }

    private normalizeStatus(raw: unknown): 'normal' | 'high' | 'low' | 'critical' {
        const s = String(raw ?? '').toLowerCase().trim();
        if (s === 'critical') return 'critical';
        if (s === 'high' || s === 'above' || s === 'h' || s === 'elevated') return 'high';
        if (s === 'low' || s === 'below' || s === 'l' || s === 'deficient') return 'low';
        return 'normal';
    }

    private emptyDashboard(allReports: FileUpload[]): BiomarkersDashboard {
        return {
            markers: [],
            healthScore: { overall: 0, grade: 'F', label: 'No Data', panels: [], momentum: 'new', momentumLabel: 'No previous data' },
            analysisSummary: { headline: '', narrative: '', strengths: [], focusAreas: [] },
            summary: { totalMarkers: 0, normal: 0, high: 0, low: 0, critical: 0, improving: 0, worsening: 0, stable: 0, newMarkers: 0 },
            reports: allReports.map(r => {
                const ld = r.labReportData as any;
                return {
                    id: r.id,
                    fileName: r.originalFileName,
                    testDate: ld?.testDate || null,
                    uploadedAt: String(r.uploadedAt),
                    testType: ld?.testType || null,
                    labName: ld?.labName || null,
                    markerCount: 0,
                    status: ld?.analysisStatus || 'unknown',
                };
            }),
            comparison: { hasMultipleReports: false, latestReportDate: null, previousReportDate: null, changes: [] },
            biologicalAge: null,
        };
    }
    // ── Batch AI marker-insight generation (called at upload time) ────
    /**
     * Generates AI insights for ALL markers in a lab report in a single
     * batch call, keyed by canonical marker key.  Result is stored in
     * labReportData.markerInsights so future reads are instant.
     */
    async generateAllMarkerInsights(
        extractedData: Array<Record<string, any>>
    ): Promise<Record<string, MarkerInsight>> {
        if (!extractedData || extractedData.length === 0) return {};

        // Build a compact list of markers for the prompt
        const markerList = extractedData
            .map(m => {
                const name = m.testName || m.name || '';
                if (!name) return null;
                const key = canonicalKey(name);
                if (!key) return null;
                const display = canonicalName(name);
                const status = this.normalizeStatus(m.status);
                const ref = m.referenceRange ? ` (ref: ${m.referenceRange})` : '';
                return { key, display, line: `${display}: ${m.value ?? '?'} ${m.unit || ''}${ref} [${status}]` };
            })
            .filter(Boolean) as Array<{ key: string; display: string; line: string }>;

        if (markerList.length === 0) return {};

        // Deduplicate by key (keep latest occurrence)
        const dedupedMap = new Map<string, { key: string; display: string; line: string }>();
        for (const m of markerList) dedupedMap.set(m.key, m);
        const deduped = Array.from(dedupedMap.values());

        const systemPrompt = `You are a clinical lab specialist providing clear, evidence-based explanations of blood test biomarkers for a health-conscious consumer.

RULES:
- Do NOT mention supplements, vitamins, or any product recommendations.
- Focus on food, lifestyle, activity, and behavioral changes only.
- Be specific and practical — avoid generic advice like "eat healthy."
- Each food list should have 4-5 specific items.
- Keep language accessible for a non-medical audience.

You will receive a list of lab markers. For EACH marker, return a JSON object.
Return a JSON object where each KEY is the exact marker name provided, and the value is:
{
  "whyItMatters": "1-2 sentence explanation of what this marker measures and why it matters.",
  "yourResult": "2-3 sentence personalized interpretation of the value relative to the reference range.",
  "foodsToEat": ["Food 1", "Food 2", "Food 3", "Food 4", "Food 5"],
  "foodsToLimit": ["Food 1", "Food 2", "Food 3", "Food 4", "Food 5"],
  "activity": "1-2 sentence specific exercise or lifestyle recommendation."
}`;

        // Batch markers into groups of ~25 to avoid JSON truncation at max_tokens
        const BATCH_SIZE = 25;
        const batches: Array<typeof deduped> = [];
        for (let i = 0; i < deduped.length; i += BATCH_SIZE) {
            batches.push(deduped.slice(i, i + BATCH_SIZE));
        }

        logger.info(`Generating insights for ${deduped.length} markers in ${batches.length} batches of ~${BATCH_SIZE}`);

        const result: Record<string, MarkerInsight> = {};
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        // Run all batches in parallel — each batch is independent
        const batchResults = await Promise.allSettled(
            batches.map(async (batch, batchIdx) => {
                const userMessage = `Here are the lab results. Generate insights for each marker:\n\n${batch.map(m => m.line).join('\n')}`;

                const completion = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userMessage },
                    ],
                    max_tokens: 16384,
                    temperature: 0.4,
                    response_format: { type: 'json_object' },
                });

                const raw = completion.choices?.[0]?.message?.content;
                if (!raw) {
                    logger.warn(`Batch ${batchIdx + 1}/${batches.length}: AI returned empty response`);
                    return { batchIdx, batch, parsed: null };
                }

                const parsed = JSON.parse(raw) as Record<string, any>;
                logger.info(`Batch ${batchIdx + 1}/${batches.length}: ${Object.keys(parsed).length} insights parsed`);
                return { batchIdx, batch, parsed };
            })
        );

        for (const settledResult of batchResults) {
            if (settledResult.status === 'rejected') {
                logger.error('Batch marker insight generation failed:', settledResult.reason);
                continue;
            }
            const { batch, parsed } = settledResult.value;
            if (!parsed) continue;

            // Normalize: map display names → canonical keys
            for (const m of batch) {
                const entry = parsed[m.display]
                    || Object.entries(parsed).find(([k]) => k.toLowerCase() === m.display.toLowerCase())?.[1];
                if (entry && typeof entry === 'object') {
                    result[m.key] = {
                        whyItMatters: entry.whyItMatters || '',
                        yourResult: entry.yourResult || '',
                        foodsToEat: Array.isArray(entry.foodsToEat) ? entry.foodsToEat : [],
                        foodsToLimit: Array.isArray(entry.foodsToLimit) ? entry.foodsToLimit : [],
                        activity: entry.activity || '',
                    };
                }
            }
        }

        logger.info(`✨ Generated ${Object.keys(result).length} marker insights total across ${batches.length} batches`);
        return result;
    }

    /**
     * Generate insights on-demand for specific markers by key.
     * Checks DB cache first; generates only missing ones, then persists.
     */
    async getMarkerInsightsOnDemand(
        userId: string,
        markerKeys: string[]
    ): Promise<Record<string, MarkerInsight>> {
        if (!markerKeys || markerKeys.length === 0) return {};

        const allReports = await filesRepository.getLabReportsByUser(userId);
        const completedReports = allReports.filter(r => {
            const ld = r.labReportData as any;
            return ld?.analysisStatus === 'completed' && Array.isArray(ld?.extractedData);
        });

        // Collect cached insights and find markers requiring generation
        const cached: Record<string, MarkerInsight> = {};
        const needed = new Set(markerKeys);

        for (const r of completedReports) {
            const ld = r.labReportData as any;
            if (ld?.markerInsights && typeof ld.markerInsights === 'object') {
                for (const key of [...needed]) {
                    if (ld.markerInsights[key]) {
                        cached[key] = ld.markerInsights[key];
                        needed.delete(key);
                    }
                }
            }
        }

        if (needed.size === 0) return cached;

        // Build extractedData entries for the needed markers from latest reports
        const extractedForGeneration: Array<Record<string, any>> = [];
        const reportToUpdate: string | null = completedReports.length > 0
            ? completedReports[completedReports.length - 1].id  // latest
            : null;

        for (const r of [...completedReports].reverse()) {
            const ld = r.labReportData as any;
            for (const m of (ld.extractedData || [])) {
                const key = canonicalKey(m.testName || m.name || '');
                if (key && needed.has(key)) {
                    extractedForGeneration.push(m);
                    needed.delete(key);
                }
            }
            if (needed.size === 0) break;
        }

        if (extractedForGeneration.length === 0) return cached;

        // Generate insights for the missing markers
        const generated = await this.generateAllMarkerInsights(extractedForGeneration);

        // Persist to latest report's labReportData for future cache hits
        if (reportToUpdate && Object.keys(generated).length > 0) {
            void (async () => {
                try {
                    const currentFile = await filesRepository.getFileUpload(reportToUpdate);
                    const currentData = currentFile?.labReportData as any;
                    if (currentData) {
                        const merged = { ...(currentData.markerInsights || {}), ...generated };
                        await filesRepository.updateFileUpload(reportToUpdate, {
                            labReportData: { ...currentData, markerInsights: merged }
                        });
                    }
                } catch (err) {
                    logger.warn('Failed to persist on-demand insights:', err);
                }
            })();
        }

        return { ...cached, ...generated };
    }
}

export const labsService = new LabsService();
