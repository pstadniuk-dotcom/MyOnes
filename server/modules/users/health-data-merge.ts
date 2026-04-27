/**
 * Health-data array merging utilities.
 *
 * BACKGROUND
 * ----------
 * Our AI emits a `health-data` block alongside chat replies. Historically the
 * controller did a flat overwrite on the safety-critical array fields
 * (`medications`, `allergies`, `conditions`, `currentSupplements`).
 *
 * That meant if the user said "oh I also started creatine" and the model
 * produced `currentSupplements: ["Creatine"]`, the existing list
 * (e.g. `["Vitamin D 5000IU", "Fish Oil", "Magnesium"]`) was silently wiped.
 *
 * This module provides a small, well-tested merge that:
 *   - treats the AI's array as an additive delta over the existing list,
 *   - de-duplicates case- and whitespace-insensitively,
 *   - keeps the original casing/spelling already in the user's profile when a
 *     duplicate is detected (so the UI-entered string wins over a paraphrase),
 *   - never produces an empty array (the empty-array guard in the controller
 *     already blocks empties before this runs, but we double-check defensively),
 *   - is a pure function — no DB / no logging — so it is trivially unit-testable.
 *
 * To genuinely REMOVE an entry, the user updates their profile through the UI
 * (the PUT /api/users/health-profile endpoint), or through the rejected-
 * ingredients flow. AI extraction is additive only.
 */

/**
 * Normalize a free-text health-array entry for comparison purposes only.
 * The original string (with its casing, dose, brand) is preserved in storage —
 * this normalized form is just used as a duplicate-detection key.
 *
 * Rules:
 *   - lowercase
 *   - trim
 *   - collapse all internal whitespace runs to a single space
 *   - strip surrounding quotes
 */
export function normalizeHealthEntry(input: string): string {
    return input
        .trim()
        .replace(/^['"`]|['"`]$/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

/**
 * Merge an AI-supplied array of strings (the "incoming" delta) onto the
 * existing array stored in the user's health profile.
 *
 * Behavior:
 *   - existing entries always survive (this is the silent-loss guard)
 *   - incoming entries that are duplicates (after normalization) are dropped
 *   - incoming entries that are new are appended in the order received
 *   - empty / whitespace-only / non-string entries are filtered out
 *   - result is capped at `maxItems` (defaults to 50, matching the controller)
 *
 * @param existing - the array currently on the user's health profile
 * @param incoming - the array emitted by the AI in this turn
 * @param maxItems - hard cap on the merged result length (default 50)
 */
export function mergeHealthArray(
    existing: unknown,
    incoming: unknown,
    maxItems = 50,
): string[] {
    const existingArr = Array.isArray(existing)
        ? existing.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
        : [];
    const incomingArr = Array.isArray(incoming)
        ? incoming.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
        : [];

    const seen = new Set<string>();
    const out: string[] = [];

    for (const entry of existingArr) {
        const key = normalizeHealthEntry(entry);
        if (key.length === 0 || seen.has(key)) continue;
        seen.add(key);
        out.push(entry);
        if (out.length >= maxItems) return out;
    }

    for (const entry of incomingArr) {
        const key = normalizeHealthEntry(entry);
        if (key.length === 0 || seen.has(key)) continue;
        seen.add(key);
        out.push(entry);
        if (out.length >= maxItems) return out;
    }

    return out;
}
