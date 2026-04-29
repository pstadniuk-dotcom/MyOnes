/**
 * AI-driven formula expander.
 *
 * When the AI's primary response returns a formula that's under the capsule
 * budget, instead of using the hardcoded `autoExpandFormula` filler list
 * (which David rightly criticized as "filling with whatever"), we send a
 * focused follow-up prompt back to the AI asking it to choose 1-3 additions
 * that are clinically relevant to THIS user's profile.
 *
 * The system-side `autoExpandFormula` remains as the final safety net to
 * guarantee the manufacturing constraint (full capsule budget utilization).
 *
 * This module is intentionally provider-agnostic — the AI call is injected so
 * the controller can use whatever provider/model the session is configured
 * with, and tests can stub it out without hitting real APIs.
 */

import { logger } from '../../infra/logging/logger';
import { SYSTEM_SUPPORTS, INDIVIDUAL_INGREDIENTS } from '@shared/ingredients';

export interface FormulaIngredient {
    ingredient: string;
    amount: number;
    unit: string;
    purpose?: string;
    source?: 'ai-primary' | 'ai-fill' | 'system-fill';
}

export interface ExpansionFormula {
    bases: FormulaIngredient[];
    additions: FormulaIngredient[];
    targetCapsules: number;
    totalMg: number;
}

export interface ExpansionContext {
    formula: ExpansionFormula;
    /** Manufacturing target in mg (e.g. 3300 for 6 caps). */
    targetMg: number;
    /** Tolerance band — anything in [minAcceptable, maxAcceptable] passes. */
    minAcceptableMg: number;
    maxAcceptableMg: number;
    /** Minimum total ingredient count the safety net expects. If the AI adds
     *  fewer than (this - currentCount) items, the system filler will fire. */
    minIngredientCount?: number;
    /** Names the user has explicitly rejected for this session. */
    rejectedIngredients: string[];
    /** Brief summary string of user's clinical profile (goals, key labs). */
    clinicalContextSummary?: string;
}

export interface ExpansionResult {
    /** True if the AI returned valid additions that we successfully applied. */
    success: boolean;
    /** Ingredients added (already validated against catalog and rejected list). */
    additions: FormulaIngredient[];
    /** New total mg after applying additions. */
    newTotalMg: number;
    /** Reason if !success, for logging/SSE info. */
    reason?: string;
}

/**
 * The AI-call function signature. Injected so the controller can pass its
 * configured provider and tests can mock cheaply.
 *
 * Returns the raw string response from the AI (expected to contain a JSON block).
 */
export type ExpanderAICaller = (args: {
    systemPrompt: string;
    userPrompt: string;
    timeoutMs: number;
}) => Promise<string>;

const DEFAULT_TIMEOUT_MS = 12_000;

/**
 * Build a small, focused prompt for the expansion call.
 * Deliberately lean to keep token cost down — the AI already has the full
 * catalog from the primary call, but the expansion is stateless so we re-list
 * a curated candidate set.
 */
export function buildExpansionPrompt(ctx: ExpansionContext): { system: string; user: string } {
    const currentNames = new Set<string>([
        ...ctx.formula.bases.map(b => b.ingredient.toLowerCase()),
        ...ctx.formula.additions.map(a => a.ingredient.toLowerCase()),
    ]);
    const rejectedLc = new Set(ctx.rejectedIngredients.map(r => r.toLowerCase().trim()));

    // Curated candidate list: ingredients NOT already in the formula and NOT rejected.
    // Include both system supports and individual ingredients with their dose ranges.
    const candidateIndividuals = INDIVIDUAL_INGREDIENTS
        .filter(i => !currentNames.has(i.name.toLowerCase()))
        .filter(i => !rejectedLc.has(i.name.toLowerCase()))
        .map(i => `  • ${i.name} (${i.doseMg ?? '?'}mg typical, range ${(i as any).doseRangeMin ?? '?'}-${(i as any).doseRangeMax ?? '?'}mg)`)
        .join('\n');

    const candidateSupports = SYSTEM_SUPPORTS
        .filter(s => !currentNames.has(s.name.toLowerCase()))
        .filter(s => !rejectedLc.has(s.name.toLowerCase()))
        .map(s => `  • ${s.name} (${s.doseMg}mg fixed-dose blend)`)
        .join('\n');

    const currentFormulaText = [
        ...ctx.formula.bases.map(b => `  - ${b.ingredient}: ${b.amount}${b.unit} (base)`),
        ...ctx.formula.additions.map(a => `  - ${a.ingredient}: ${a.amount}${a.unit}`),
    ].join('\n');

    const deficit = ctx.targetMg - ctx.formula.totalMg;
    const minAdd = Math.max(0, ctx.minAcceptableMg - ctx.formula.totalMg);
    const maxAdd = ctx.maxAcceptableMg - ctx.formula.totalMg;
    // Aim for the middle of the band, not the lower bound. After ingredient-cap
    // normalization the AI's chosen amounts can shrink (e.g. Omega 3 capped from
    // 500→391mg), and if we land at exactly the minimum the system safety net
    // fires and adds a hardcoded filler — which defeats the whole purpose.
    const idealAdd = Math.round((minAdd + maxAdd) / 2);

    // Count constraint: the safety net also fires if total ingredient count is
    // below the system minimum (default 8), independent of mg total. Tell the
    // AI how many items to add so it doesn't trigger that path either.
    const currentCount = ctx.formula.bases.length + ctx.formula.additions.length;
    const minCount = ctx.minIngredientCount ?? 8;
    const minNeeded = Math.max(0, minCount - currentCount);
    const countLine = minNeeded > 0
        ? `4. You MUST add at least ${minNeeded} ingredients (current formula has ${currentCount}; system minimum is ${minCount}). Adding fewer will trigger automatic system filler.`
        : `4. The formula already meets the minimum ingredient count.`;

    const system = `You are filling out an existing supplement formula to meet manufacturing capsule-fill requirements.

Every capsule slot must contain content. The formula below is under-budget — your job is to choose ADDITIONAL ingredients that are CLINICALLY RELEVANT to this user's profile (not random filler).

CRITICAL RULES:
1. Choose ingredients that complement the existing formula and address THIS user's stated needs.
2. Justify each addition with a brief clinical rationale (one sentence).
3. AIM for total additions of ~${idealAdd}mg (must be between ${minAdd}mg and ${maxAdd}mg). Targeting the middle of the band gives headroom — landing exactly at the minimum risks triggering an automatic system filler.
${countLine}
5. Use ONLY ingredients from the candidate list below — others will be rejected.
6. Do NOT include any ingredient already in the current formula or in the user's rejected list.
7. Output JSON ONLY — no commentary, no markdown fences. Schema:
{
  "additions": [
    { "ingredient": "<name>", "amount": <number>, "unit": "mg", "purpose": "<one-sentence clinical reason>" }
  ]
}`;

    const user = `CURRENT FORMULA (target ${ctx.formula.targetCapsules} capsules, ${ctx.targetMg}mg total budget, ${currentCount} ingredients):
${currentFormulaText}
Current total: ${ctx.formula.totalMg}mg
Need to add ~${idealAdd}mg of clinically-justified ingredients (acceptable range ${minAdd}-${maxAdd}mg, but aim for the middle).
${minNeeded > 0 ? `Need to add at least ${minNeeded} ingredients to reach the system minimum of ${minCount}.` : ''}

USER'S CLINICAL CONTEXT:
${ctx.clinicalContextSummary || '(no specific context provided — choose broadly supportive ingredients)'}

USER-REJECTED INGREDIENTS (do NOT use):
${ctx.rejectedIngredients.length > 0 ? ctx.rejectedIngredients.map(r => `  • ${r}`).join('\n') : '  (none)'}

CANDIDATE SYSTEM SUPPORTS:
${candidateSupports || '  (none available)'}

CANDIDATE INDIVIDUAL INGREDIENTS:
${candidateIndividuals || '  (none available)'}

Return JSON now.`;

    return { system, user };
}

/**
 * Parse the AI's JSON response and validate each ingredient against the catalog
 * and the rejected list. Returns only the valid additions.
 */
export function parseAndValidateExpansion(
    rawResponse: string,
    rejectedIngredients: string[],
    currentFormulaNames: Set<string>,
): { additions: FormulaIngredient[]; warnings: string[] } {
    const warnings: string[] = [];

    // Strip markdown fences if present
    const jsonMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const jsonText = jsonMatch ? jsonMatch[1] : rawResponse;

    let parsed: any;
    try {
        parsed = JSON.parse(jsonText.trim());
    } catch {
        warnings.push('AI expansion response was not valid JSON.');
        return { additions: [], warnings };
    }

    if (!parsed || !Array.isArray(parsed.additions)) {
        warnings.push('AI expansion response missing `additions` array.');
        return { additions: [], warnings };
    }

    const rejectedLc = new Set(rejectedIngredients.map(r => r.toLowerCase().trim()));
    const allCatalogNames = new Map<string, string>(); // lowercase → canonical
    for (const s of SYSTEM_SUPPORTS) allCatalogNames.set(s.name.toLowerCase(), s.name);
    for (const i of INDIVIDUAL_INGREDIENTS) allCatalogNames.set(i.name.toLowerCase(), i.name);

    const seen = new Set<string>();
    const valid: FormulaIngredient[] = [];

    for (const item of parsed.additions) {
        if (!item || typeof item !== 'object') continue;
        const rawName = String(item.ingredient || item.name || '').trim();
        const amount = Number(item.amount);
        const unit = String(item.unit || 'mg').trim();
        const purpose = item.purpose ? String(item.purpose) : undefined;

        if (!rawName || !Number.isFinite(amount) || amount <= 0) {
            warnings.push(`Skipped malformed addition: ${JSON.stringify(item)}`);
            continue;
        }

        const lc = rawName.toLowerCase();

        // Reject if user blocked it
        if (rejectedLc.has(lc)) {
            warnings.push(`Skipped ${rawName}: in user-rejected list.`);
            continue;
        }

        // Reject if already in the formula
        if (currentFormulaNames.has(lc)) {
            warnings.push(`Skipped ${rawName}: already in formula.`);
            continue;
        }

        // Reject duplicates within the response
        if (seen.has(lc)) {
            warnings.push(`Skipped duplicate ${rawName} in expansion.`);
            continue;
        }

        // Reject if not in catalog (try canonical name lookup)
        const canonical = allCatalogNames.get(lc);
        if (!canonical) {
            warnings.push(`Skipped ${rawName}: not in approved ingredient catalog.`);
            continue;
        }

        // Clamp amount to ingredient's allowed dose range. The AI sometimes
        // returns sub-clinical doses (e.g. 52mg Phosphatidylcholine when the
        // floor is 300mg). Without this clamp, downstream validateFormulaLimits
        // would error and the user sees a raw "Formula validation failed"
        // message. Mirror the clamp applied in validateAndCorrectIngredientNames.
        const support = SYSTEM_SUPPORTS.find(s => s.name === canonical);
        const individual = INDIVIDUAL_INGREDIENTS.find(i => i.name === canonical);
        let clampedAmount = Math.round(amount);
        if (support) {
            const baseDose = support.doseMg;
            const allowedMultipliers = [1, 2, 3];
            const closestMultiplier = allowedMultipliers.reduce((closest, candidate) =>
                Math.abs(baseDose * candidate - clampedAmount) < Math.abs(baseDose * closest - clampedAmount)
                    ? candidate
                    : closest
            , 1);
            clampedAmount = baseDose * closestMultiplier;
        } else if (individual) {
            const minAllowed = typeof individual.doseRangeMin === 'number'
                ? individual.doseRangeMin
                : (typeof individual.doseMg === 'number' ? individual.doseMg : 10);
            const maxAllowed = typeof individual.doseRangeMax === 'number'
                ? individual.doseRangeMax
                : (typeof individual.doseMg === 'number' ? individual.doseMg : 1000);
            clampedAmount = Math.min(maxAllowed, Math.max(minAllowed, clampedAmount));
        }
        if (clampedAmount !== Math.round(amount)) {
            warnings.push(`Adjusted ${canonical} dose from ${Math.round(amount)}mg to ${clampedAmount}mg to fit clinical range.`);
        }

        seen.add(lc);
        valid.push({
            ingredient: canonical,
            amount: clampedAmount,
            unit,
            purpose: purpose || `AI-selected to complete capsule budget for this user's profile.`,
            source: 'ai-fill',
        });
    }

    return { additions: valid, warnings };
}

/**
 * Main entry point. Calls the injected AI function, parses the response,
 * validates, and returns the additions ready to merge into the formula.
 *
 * On any failure (timeout, parse error, no valid additions), returns
 * `{ success: false, ... }` so the caller can fall back to system autoExpand.
 */
export async function expandFormulaWithAI(
    ctx: ExpansionContext,
    callAI: ExpanderAICaller,
    opts: { timeoutMs?: number } = {},
): Promise<ExpansionResult> {
    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    // No-op cases — don't burn an AI call
    if (ctx.formula.totalMg >= ctx.minAcceptableMg) {
        return { success: true, additions: [], newTotalMg: ctx.formula.totalMg };
    }

    const { system, user } = buildExpansionPrompt(ctx);

    let rawResponse: string;
    try {
        rawResponse = await callAI({ systemPrompt: system, userPrompt: user, timeoutMs });
    } catch (err: any) {
        logger.warn('AI formula expansion call failed — will fall back to system autoExpand', {
            error: err?.message,
            targetMg: ctx.targetMg,
            currentMg: ctx.formula.totalMg,
        });
        return {
            success: false,
            additions: [],
            newTotalMg: ctx.formula.totalMg,
            reason: `AI expansion call failed: ${err?.message || 'unknown'}`,
        };
    }

    const currentFormulaNames = new Set<string>([
        ...ctx.formula.bases.map(b => b.ingredient.toLowerCase()),
        ...ctx.formula.additions.map(a => a.ingredient.toLowerCase()),
    ]);

    const { additions, warnings } = parseAndValidateExpansion(
        rawResponse,
        ctx.rejectedIngredients,
        currentFormulaNames,
    );

    if (additions.length === 0) {
        logger.warn('AI expansion returned no valid additions — falling back to system autoExpand', {
            warnings,
            rawResponseSnippet: rawResponse.substring(0, 300),
        });
        return {
            success: false,
            additions: [],
            newTotalMg: ctx.formula.totalMg,
            reason: 'AI returned no valid additions',
        };
    }

    const addedMg = additions.reduce((s, a) => s + a.amount, 0);
    const newTotal = ctx.formula.totalMg + addedMg;

    // If the AI didn't add enough, we still apply what it gave us — the system
    // autoExpand will top off the rest. Better than discarding the AI's clinical
    // choices entirely.
    return {
        success: true,
        additions,
        newTotalMg: newTotal,
    };
}

/**
 * Build a brief clinical context summary string from health profile + lab data.
 * Kept lean to minimize prompt tokens. Caller can pass whatever it has.
 */
export function buildClinicalContextSummary(args: {
    goals?: string[];
    conditions?: string[];
    medications?: string[];
    keyLabFlags?: string[];
}): string {
    const lines: string[] = [];
    if (args.goals && args.goals.length > 0) lines.push(`Goals: ${args.goals.join(', ')}`);
    if (args.conditions && args.conditions.length > 0) lines.push(`Conditions: ${args.conditions.join(', ')}`);
    if (args.medications && args.medications.length > 0) lines.push(`Medications: ${args.medications.join(', ')}`);
    if (args.keyLabFlags && args.keyLabFlags.length > 0) lines.push(`Key lab flags: ${args.keyLabFlags.join(', ')}`);
    return lines.join('\n') || '(no specific clinical flags provided)';
}
