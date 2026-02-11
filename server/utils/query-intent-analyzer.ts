import OpenAI from 'openai';
import { aiRuntimeSettings } from '../infra/ai/ai-config';
import "dotenv/config";
let _openai: OpenAI | null = null;
function getOpenAI() {
    if (!_openai) {
        _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-tests' });
    }
    return _openai;
}

/**
 * Query Intent Analyzer
 * Determines the scope and intent of user queries to enable focused AI responses
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
 * Analyzes user query using AI for maximum robustness
 */
async function analyzeWithAI(userMessage: string): Promise<QueryIntent> {
    try {
        const response = await getOpenAI().chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `Analyze the user's focus for a personalized supplement consultation. 
          Determine if they are making a specific request for a particular health area or if it's a general query.
          Available health areas: cardiovascular, metabolic, digestive, cognitive, energy, immune, skin, joint, sleep, stress, hormonal, liver, kidney, respiratory.
          
          Respond ONLY with a JSON object in this format:
          {
            "isSpecificRequest": boolean, // true if they want to focus ONLY on specific areas
            "requestedAreas": string[], // array of health areas mentioned
            "scope": "specific" | "general" | "followup",
            "explanation": "brief reasoning"
          }`
                },
                { role: "user", content: userMessage }
            ],
            response_format: { type: "json_object" },
            temperature: 0,
            max_tokens: 150
        });

        const result = JSON.parse(response.choices[0].message.content || '{}');
        return {
            isSpecificRequest: result.isSpecificRequest || false,
            requestedAreas: result.requestedAreas || [],
            scope: result.scope || 'general',
            keywords: [], // AI doesn't need explicit keywords
            explanation: result.explanation
        };
    } catch (error) {
        console.error('AI Intent analysis failed, falling back to logic:', error);
        return fallbackLogicAnalysis(userMessage);
    }
}

/**
 * Pure logic analysis (used as fallback or fast-pass)
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
 * Main analysis entry point - uses fast-pass logic then AI fallback for better accuracy
 */
export async function analyzeQueryIntent(userMessage: string): Promise<QueryIntent> {
    // 1. Try fast logic analysis first
    const fastResult = fallbackLogicAnalysis(userMessage);

    // 2. If it seems specific or targeted, use AI to confirm intent and catch nuances/misspellings
    // or if the message is complex (> 10 words)
    if (fastResult.requestedAreas.length > 0 || userMessage.split(' ').length > 10) {
        return analyzeWithAI(userMessage);
    }

    return fastResult;
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
