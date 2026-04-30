/**
 * Shared safety types for the Ones supplement safety system.
 * Used by both server-side validation and client-side UI rendering.
 */

// ── Warning Severity Levels ─────────────────────────────────────────────────
export type SafetyWarningSeverity = 'critical' | 'serious' | 'informational';

export interface SafetyWarning {
  /** Unique category identifier for deduplication */
  category: string;
  /** Severity determines enforcement behavior:
   * - critical: HARD BLOCK — formula cannot be saved or ordered
   * - serious: REQUIRES explicit user acknowledgment before checkout
   * - informational: Displayed but does not gate any action
   */
  severity: SafetyWarningSeverity;
  /** Human-readable warning message */
  message: string;
  /** Ingredient(s) involved */
  ingredients?: string[];
  /** Drug(s) involved (if interaction-based) */
  drugs?: string[];
}

// ── Safety Validation Result ────────────────────────────────────────────────
export interface SafetyValidationResult {
  /** Whether the formula is safe to proceed (no critical warnings) */
  safe: boolean;
  /** Whether the formula requires explicit acknowledgment before checkout */
  requiresAcknowledgment: boolean;
  /** All warnings, organized by severity */
  warnings: SafetyWarning[];
  /** Hard-blocked reasons (subset of critical warnings) */
  blockedReasons: string[];
  /**
   * User medications that did NOT match any keyword in any drug-interaction
   * category. Surfaced so the calling layer can persist them to the
   * `unmatched_medications` table for periodic review — this is the feedback
   * loop that keeps the deterministic safety gate's keyword lists from
   * silently degrading as new drugs launch or users enter
   * brand/compound/international names not yet in the lists.
   *
   * Note: A medication being "unmatched" does NOT mean it's safe — it means
   * the validator could not reason about it. The chat AI still sees the raw
   * medication string and may apply additional caution.
   */
  unmatchedMedications?: string[];
}

// ── Ingredient Contraindication Data ────────────────────────────────────────
export interface IngredientContraindication {
  /** Ingredient name (must match IngredientInfo.name) */
  ingredientName: string;
  /** Conditions where this ingredient is contraindicated */
  contraindicated_conditions?: string[];
  /** Whether safe during pregnancy (false = contraindicated) */
  pregnancySafe: boolean;
  /** Whether safe during nursing/breastfeeding */
  nursingSafe: boolean;
  /** Conditions requiring dose adjustment */
  doseAdjustmentConditions?: string[];
  /** Known allergen cross-references (e.g., shellfish → glucosamine) */
  allergenCrossReferences?: string[];
  /** Max daily dose in mg (absolute safety ceiling) */
  absoluteMaxDailyMg?: number;
  /** Organ-specific cautions */
  organCautions?: Array<{
    organ: 'liver' | 'kidney';
    severity: 'avoid' | 'reduce_dose' | 'monitor';
    note: string;
  }>;
}

// ── Formula Warning Acknowledgment ──────────────────────────────────────────
export interface FormulaWarningAcknowledgment {
  formulaId: string;
  userId: string;
  /** The warnings that were displayed to the user at time of acknowledgment */
  acknowledgedWarnings: SafetyWarning[];
  /** Version of the disclaimer text shown */
  disclaimerVersion: string;
  /** ISO timestamp of acknowledgment */
  acknowledgedAt: string;
  /** Client IP at time of acknowledgment */
  ipAddress?: string;
  /** Browser user agent */
  userAgent?: string;
}

// ── Safety Audit Log Entry ──────────────────────────────────────────────────
export type SafetyAuditAction =
  | 'formula_blocked'        // Critical interaction prevented formula save
  | 'interaction_warning'    // Non-critical interaction warning generated
  | 'pregnancy_block'        // Pregnancy-unsafe ingredient blocked
  | 'allergy_block'          // Allergen cross-reference blocked
  | 'organ_caution'          // Liver/kidney caution generated
  | 'warning_acknowledged'   // User acknowledged warnings before checkout
  | 'checkout_with_warnings' // User proceeded to checkout with active warnings
  | 'antiplatelet_stacking'; // Multiple antiplatelet agents detected

export interface SafetyAuditEntry {
  userId: string;
  formulaId?: string;
  action: SafetyAuditAction;
  severity: SafetyWarningSeverity;
  details: {
    warnings?: SafetyWarning[];
    ingredients?: string[];
    medications?: string[];
    conditions?: string[];
    allergies?: string[];
    blockedReasons?: string[];
  };
  ipAddress?: string;
  userAgent?: string;
}
