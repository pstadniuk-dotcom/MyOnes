import { logger } from '../infra/logging/logger';

/**
 * Query Intent Analyzer
 * Determines the scope and intent of user queries to enable focused AI responses.
 * Uses fast regex-based analysis only — the main consultation model handles
 * nuanced intent detection naturally through its clinical reasoning.
 */

export interface QueryIntent {
    isSpecificRequest: boolean;
    requestedAreas: string[];
    scope: 'specific' | 'general' | 'followup';
    keywords: string[];
    explanation?: string;
}

/**
 * Health area keywords for intent detection (kept for fast pass)
 */
const HEALTH_AREA_KEYWORDS = {
    cardiovascular: ['heart', 'cardiovascular', 'cholesterol', 'blood pressure', 'lipid', 'triglyceride', 'hdl', 'ldl', 'apob', 'circulation'],
    metabolic: ['metabolic', 'blood sugar', 'glucose', 'insulin', 'diabetes', 'weight', 'metabolism'],
    digestive: ['gut', 'digestive', 'digestion', 'stomach', 'intestine', 'bloating', 'ibs', 'microbiome'],
    cognitive: ['brain', 'cognitive', 'memory', 'focus', 'concentration', 'mental clarity', 'brain fog'],
    energy: ['energy', 'fatigue', 'tired', 'exhaustion', 'stamina', 'vitality'],
    immune: ['immune', 'immunity', 'infection', 'sick', 'cold', 'flu'],
    skin: ['skin', 'acne', 'eczema', 'psoriasis', 'dermatitis', 'complexion'],
    joint: ['joint', 'arthritis', 'ligament', 'tendon', 'mobility', 'stiffness'],
    sleep: ['sleep', 'insomnia', 'rest', 'sleeping'],
    stress: ['stress', 'anxiety', 'cortisol', 'adrenal', 'burnout'],
    hormonal: ['hormone', 'hormonal', 'thyroid', 'testosterone', 'estrogen', 'menopause', 'pcos'],
    liver: ['liver', 'detox', 'hepatic', 'alt', 'ast'],
    kidney: ['kidney', 'renal', 'bladder', 'uti'],
    respiratory: ['lung', 'respiratory', 'breathing', 'asthma', 'copd'],
};

/**
 * Specific request indicators
 */
const SPECIFIC_REQUEST_PATTERNS = [
    /\b(only|just|specifically|focus on|target)\b/i,
    /\bfor (my )?(skin|heart|gut|brain|energy|sleep|stress|joints?)\b/i,
    /\b(skin|heart|gut|brain|energy|sleep|stress|joint) (only|formula|support)\b/i,
];

/**
 * Fast regex-based intent analysis
 */
function fallbackLogicAnalysis(userMessage: string): QueryIntent {
    const messageLower = userMessage.toLowerCase();
    const isSpecificRequest = SPECIFIC_REQUEST_PATTERNS.some(pattern => pattern.test(userMessage));
    const requestedAreas: string[] = [];
    const keywords: string[] = [];

    for (const [area, areaKeywords] of Object.entries(HEALTH_AREA_KEYWORDS)) {
        for (const keyword of areaKeywords) {
            if (messageLower.includes(keyword)) {
                if (!requestedAreas.includes(area)) requestedAreas.push(area);
                keywords.push(keyword);
            }
        }
    }

    let scope: 'specific' | 'general' | 'followup' = 'general';
    if (isSpecificRequest && requestedAreas.length > 0) scope = 'specific';
    else if (requestedAreas.length > 0 && requestedAreas.length <= 2) scope = 'followup';

    return { isSpecificRequest, requestedAreas, scope, keywords };
}

/**
 * Main analysis entry point — regex-based only.
 * The main consultation model handles nuanced intent naturally.
 */
export function analyzeQueryIntent(userMessage: string): QueryIntent {
    return fallbackLogicAnalysis(userMessage);
}

/**
 * Generates scoping instructions for the AI based on query intent
 */
export function generateScopingInstructions(intent: QueryIntent, userMessage: string): string {
    if (intent.scope === 'specific') {
        const areas = intent.requestedAreas.join(', ');
        return `
🚨🚨🚨 CRITICAL SCOPING INSTRUCTION 🚨🚨🚨

The user is making a SPECIFIC request focused on: ${areas}

**YOU MUST:**
1. ONLY address the health areas mentioned: ${areas}
2. ONLY include ingredients that directly support: ${areas}
3. DO NOT include ingredients for other health issues or biomarkers (ignore them for this turn)
4. KEEP your response focused EXCLUSIVELY on what the user asked about.
5. If the user already has an active formula, ONLY modify or replace parts that relate to ${areas}.

**USER'S EXACT REQUEST:** "${userMessage}"
${intent.explanation ? `**ANALYZED INTENT:** ${intent.explanation}` : ''}

FOCUS. STAY ON TOPIC. ANSWER ONLY WHAT WAS ASKED.
`;
    } else if (intent.scope === 'followup') {
        const areas = intent.requestedAreas.join(', ');
        return `
🎯 FOCUSED RESPONSE NEEDED

The user is asking about: ${areas}

**FOCUS YOUR RESPONSE ON:**
- ${areas} specifically
- Related biomarkers and health data
- Relevant recommendations

**DO NOT:**
- Re-analyze unrelated health areas or lab results unless they directly affect ${areas}.
- Comprehensive reviews of all data are not requested here.
`;
    }

    return '';
}
