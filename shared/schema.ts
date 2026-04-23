import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  json,
  pgEnum,
  date,
  decimal,
  uniqueIndex,
  index
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const sexEnum = pgEnum('sex', ['male', 'female', 'other']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'paused', 'cancelled', 'past_due']);
export const subscriptionPlanEnum = pgEnum('subscription_plan', ['monthly', 'quarterly', 'annual']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'pending_confirmation', 'processing', 'shipped', 'delivered', 'cancelled', 'placed', 'completed', 'partial_settlement', 'settlement_failed']);
export const chatStatusEnum = pgEnum('chat_status', ['active', 'completed', 'archived']);
export const messageRoleEnum = pgEnum('message_role', ['user', 'assistant', 'system']);
export const addressTypeEnum = pgEnum('address_type', ['shipping', 'billing']);
export const fileTypeEnum = pgEnum('file_type', ['lab_report', 'medical_document', 'prescription', 'other']);
export const auditActionEnum = pgEnum('audit_action', ['upload', 'view', 'download', 'delete', 'share', 'access_denied']);
export const consentTypeEnum = pgEnum('consent_type', ['lab_data_processing', 'ai_analysis', 'data_retention', 'third_party_sharing', 'sms_accountability', 'medication_disclosure', 'tos_acceptance']);
export const notificationTypeEnum = pgEnum('notification_type', ['order_update', 'formula_update', 'consultation_reminder', 'system']);
export const evidenceLevelEnum = pgEnum('evidence_level', ['strong', 'moderate', 'preliminary', 'limited']);
export const studyTypeEnum = pgEnum('study_type', ['rct', 'meta_analysis', 'systematic_review', 'observational', 'case_study', 'review']);
export const reviewFrequencyEnum = pgEnum('review_frequency', ['monthly', 'bimonthly', 'quarterly']);
export const wearableProviderEnum = pgEnum('wearable_provider', ['fitbit', 'oura', 'whoop', 'garmin', 'apple_health', 'google_fit', 'samsung', 'polar', 'withings', 'eight_sleep', 'strava', 'peloton', 'ultrahuman', 'dexcom', 'freestyle_libre', 'cronometer', 'omron', 'kardia', 'junction']);
export const wearableConnectionStatusEnum = pgEnum('wearable_connection_status', ['connected', 'disconnected', 'error', 'token_expired']);
export const autoShipStatusEnum = pgEnum('auto_ship_status', ['active', 'paused', 'cancelled']);
export const reorderScheduleStatusEnum = pgEnum('reorder_schedule_status', ['active', 'awaiting_review', 'awaiting_approval', 'approved', 'delayed', 'charged', 'skipped', 'cancelled']);
export const reorderRecommendationStatusEnum = pgEnum('reorder_recommendation_status', ['pending', 'sent', 'approved', 'kept', 'expired', 'error']);
export const streakTypeEnum = pgEnum('streak_type', ['overall', 'nutrition', 'workout', 'supplements', 'lifestyle']);
export const adminActionEnum = pgEnum('admin_action', [
  'user_delete', 'user_suspend', 'user_unsuspend', 'user_admin_grant', 'user_admin_revoke',
  'user_view', 'user_note_add', 'data_export', 'conversation_view',
  'order_status_change', 'order_refund', 'manufacturer_order_retry',
  'ticket_status_change', 'ticket_assign', 'ticket_reply',
  'settings_update', 'settings_reset',
  'faq_create', 'faq_update', 'faq_delete',
  'help_article_create', 'help_article_update', 'help_article_delete',
  'blog_create', 'blog_update', 'blog_delete', 'blog_publish', 'blog_unpublish',
  'membership_tier_update',
  'ingredient_pricing_update',
  'formula_review_trigger',
  'newsletter_subscriber_toggle',
  'bulk_delete_tickets', 'bulk_close_tickets', 'bulk_update_tickets',
]);

export const refundStatusEnum = pgEnum('refund_status', ['pending', 'approved', 'declined', 'failed', 'voided']);
export const payoutStatusEnum = pgEnum('payout_status', ['pending', 'processing', 'completed', 'failed']);
export const recipientTypeEnum = pgEnum('recipient_type', ['admin', 'vendor']);

// Users table - updated with name, email, phone, password
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  password: text("password"),
  googleId: text("google_id").unique(),
  facebookId: text("facebook_id").unique(),

  // Admin and access tracking
  isAdmin: boolean("is_admin").default(false).notNull(),
  lastLoginAt: timestamp("last_login_at"),

  // Address fields
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  state: text("state"),
  postalCode: text("postal_code"),
  country: text("country").default('US'),

  // Timezone for scheduling reminders (e.g., 'America/New_York', 'America/Los_Angeles')
  timezone: text("timezone").default('America/New_York'),

  // Email notification preferences
  emailConsultation: boolean("email_consultation").default(true).notNull(),
  emailShipping: boolean("email_shipping").default(true).notNull(),
  emailBilling: boolean("email_billing").default(true).notNull(),

  // SMS notification preferences
  smsConsultation: boolean("sms_consultation").default(false).notNull(),
  smsShipping: boolean("sms_shipping").default(false).notNull(),
  smsBilling: boolean("sms_billing").default(false).notNull(),

  // Daily pill reminder preferences
  dailyRemindersEnabled: boolean("daily_reminders_enabled").default(false).notNull(),
  reminderBreakfast: text("reminder_breakfast").default('08:00').notNull(),
  reminderLunch: text("reminder_lunch").default('12:00').notNull(),
  reminderDinner: text("reminder_dinner").default('18:00').notNull(),

  // Junction (Vital) wearables integration
  junctionUserId: text("junction_user_id"),

  // Streak Rewards System (DEPRECATED - kept for data migration)
  streakCurrentDays: integer("streak_current_days").default(0).notNull(),
  streakDiscountEarned: integer("streak_discount_earned").default(0).notNull(), // 0-20 percent
  lastOrderDate: timestamp("last_order_date"),
  reorderWindowStart: timestamp("reorder_window_start"),  // Day 75 from last order
  reorderDeadline: timestamp("reorder_deadline"),         // Day 95 from last order (5-day grace)
  streakStatus: text("streak_status").default('building').notNull(), // 'building' | 'ready' | 'warning' | 'grace' | 'lapsed'

  // Membership System
  membershipTier: text("membership_tier"), // 'founding' | 'early' | 'beta' | 'standard' | null (not a member)
  membershipPriceCents: integer("membership_price_cents"), // Price locked at signup (e.g., 900 = $9 founding)
  membershipLockedAt: timestamp("membership_locked_at"), // When they locked in their tier
  membershipCancelledAt: timestamp("membership_cancelled_at"), // If they cancelled
  paymentVaultId: text("payment_vault_id"), // EPD customer vault ID for recurring charges
  initialTransactionId: text("initial_transaction_id"), // EPD initial transaction ID (for credential-on-file)

  emailVerified: boolean("email_verified").default(false).notNull(),

  // Terms of Service acceptance tracking
  tosAcceptedAt: timestamp("tos_accepted_at"),

  // Formula auto-optimization: when true, system auto-applies AI-suggested changes before reorder
  // and sends email + SMS notification. Default false = manual review required.
  autoOptimizeFormula: boolean("auto_optimize_formula").default(false).notNull(),

  // Dashboard metric preferences: ordered list of metric IDs the user wants visible
  // null = use defaults from shared/metricCatalog.ts
  metricPreferences: json("metric_preferences"),

  // Attribution & UTM tracking (captured at signup)
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmContent: text("utm_content"),
  utmTerm: text("utm_term"),
  referrer: text("referrer"), // HTTP referrer at signup
  landingPage: text("landing_page"), // First page visited
  signupChannel: text("signup_channel"), // Computed: direct, organic, social, paid, referral, email

  // Referral tracking
  referralCode: text("referral_code").unique(), // User's own referral code
  referredByUserId: varchar("referred_by_user_id"), // Who referred them

  // Account lockout (brute-force protection)
  failedLoginAttempts: integer("failed_login_attempts").default(0).notNull(),
  lockedUntil: timestamp("locked_until"),

  // Soft-delete & suspension (admin operations)
  deletedAt: timestamp("deleted_at"),
  deletedBy: varchar("deleted_by"),
  suspendedAt: timestamp("suspended_at"),
  suspendedBy: varchar("suspended_by"),
  suspendedReason: text("suspended_reason"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("users_email_idx").on(table.email),
  index("users_phone_idx").on(table.phone),
  index("users_payment_vault_idx").on(table.paymentVaultId),
  index("users_created_at_idx").on(table.createdAt),
  index("users_referral_code_idx").on(table.referralCode),
  index("users_utm_source_idx").on(table.utmSource),
  index("users_signup_channel_idx").on(table.signupChannel),
]);

// Password reset tokens
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Refresh tokens for JWT rotation
export const refreshTokens = pgTable("refresh_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  family: varchar("family").notNull(), // Token family for rotation detection
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("refresh_tokens_user_id_idx").on(table.userId),
  index("refresh_tokens_family_idx").on(table.family),
]);

// Email verification tokens
export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Newsletter subscribers
export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  subscribedAt: timestamp("subscribed_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

// Health profiles for personalized recommendations
export const healthProfiles = pgTable("health_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),

  // Basic demographics
  age: integer("age"),
  sex: sexEnum("sex"),

  // Physical measurements
  weightLbs: integer("weight_lbs"),
  heightCm: integer("height_cm"), // For BMI calculation

  // Vital signs
  bloodPressureSystolic: integer("blood_pressure_systolic"),
  bloodPressureDiastolic: integer("blood_pressure_diastolic"),
  restingHeartRate: integer("resting_heart_rate"),

  // Lifestyle factors
  sleepHoursPerNight: integer("sleep_hours_per_night"),
  exerciseDaysPerWeek: integer("exercise_days_per_week"),
  stressLevel: integer("stress_level"), // 1-10 scale
  smokingStatus: text("smoking_status"), // 'never', 'former', 'current'
  alcoholDrinksPerWeek: integer("alcohol_drinks_per_week"),

  // Medical history
  conditions: json("conditions").$type<string[]>().default([]),
  medications: json("medications").$type<string[]>().default([]),
  allergies: json("allergies").$type<string[]>().default([]),

  // Health goals (e.g., "gut health", "brain optimization", "energy", "sleep")
  healthGoals: json("health_goals").$type<string[]>().default([]),

  // Current supplements the user is already taking (for consolidation into ONES formula)
  currentSupplements: json("current_supplements").$type<string[]>().default([]),

  // Medication safety disclosure — null means never answered, timestamp means disclosed
  medicationDisclosedAt: timestamp("medication_disclosed_at"),

  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Chat sessions for conversational interface
export const chatSessions = pgTable("chat_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }),
  status: chatStatusEnum("status").default('active').notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("chat_sessions_user_id_idx").on(table.userId),
  index("chat_sessions_created_at_idx").on(table.createdAt),
]);

// Messages within chat sessions
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => chatSessions.id, { onDelete: "cascade" }),
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  model: text("model"), // Track which AI model responded (gpt-4, gpt-5, etc.)
  attachments: json("attachments").$type<Array<{
    id: string;
    name: string;
    url?: string;
    type: string;
    size: number;
  }>>(),
  formula: json("formula").$type<{
    bases: Array<{ name: string, dose: string, purpose?: string }>;
    additions: Array<{ name: string, dose: string, purpose?: string }>;
    totalMg: number;
    warnings?: string[];
    rationale?: string;
    disclaimers?: string[];
  }>(), // Formula data if AI created one in this message
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("messages_session_id_idx").on(table.sessionId),
]);

// Supplement formulas
export const formulas = pgTable("formulas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  version: integer("version").default(1).notNull(),
  name: text("name"), // Custom name for the formula
  userCreated: boolean("user_created").default(false).notNull(), // True if user built it manually
  bases: json("bases").$type<Array<{ ingredient: string, amount: number, unit: string, purpose?: string }>>().notNull(),
  additions: json("additions").$type<Array<{ ingredient: string, amount: number, unit: string, purpose?: string }>>().default([]),
  userCustomizations: json("user_customizations").$type<{
    addedBases?: Array<{ ingredient: string, amount: number, unit: string }>;
    addedIndividuals?: Array<{ ingredient: string, amount: number, unit: string }>;
  }>().default({}),
  totalMg: integer("total_mg").notNull(),

  // Capsule count selection (6, 9, or 12 capsules per day)
  targetCapsules: integer("target_capsules").default(9), // User's selected capsule count
  recommendedCapsules: integer("recommended_capsules"), // AI's recommended capsule count

  // Link to the chat session that generated this formula
  chatSessionId: varchar("chat_session_id").references(() => chatSessions.id, { onDelete: "set null" }),

  rationale: text("rationale"),
  warnings: json("warnings").$type<string[]>().default([]),
  disclaimers: json("disclaimers").$type<string[]>().default([]),
  notes: text("notes"),

  // Structured safety validation result (severity-aware warnings)
  safetyValidation: json("safety_validation").$type<{
    requiresAcknowledgment: boolean;
    warnings: Array<{
      category: string;
      severity: 'critical' | 'serious' | 'informational';
      message: string;
      ingredients?: string[];
      drugs?: string[];
    }>;
  }>(),

  // Warning acknowledgment tracking for legal compliance
  warningsAcknowledgedAt: timestamp("warnings_acknowledged_at"),
  warningsAcknowledgedIp: text("warnings_acknowledged_ip"),
  disclaimerVersion: text("disclaimer_version").default('1.0'),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  archivedAt: timestamp("archived_at"), // Null = active, timestamp = archived

  // Discontinued ingredient tracking
  needsReformulation: boolean("needs_reformulation").default(false).notNull(),
  discontinuedIngredients: json("discontinued_ingredients").$type<string[]>().default([]),
  discontinuedFlaggedAt: timestamp("discontinued_flagged_at"),

  // Sharing functionality
  isSharedPublicly: boolean("is_shared_publicly").default(false).notNull(),
  shareToken: varchar("share_token", { length: 255 }).unique(),
}, (table) => [
  index("formulas_user_id_idx").on(table.userId),
]);

// Formula warning acknowledgments — legal paper trail
export const formulaWarningAcknowledgments = pgTable("formula_warning_acknowledgments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  formulaId: varchar("formula_id").notNull().references(() => formulas.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  acknowledgedWarnings: json("acknowledged_warnings").$type<Array<{
    category: string;
    severity: 'critical' | 'serious' | 'informational';
    message: string;
    ingredients?: string[];
    drugs?: string[];
  }>>().notNull(),
  disclaimerVersion: text("disclaimer_version").notNull().default('1.0'),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  acknowledgedAt: timestamp("acknowledged_at").defaultNow().notNull(),
});

// Safety audit log — tracks all safety-related events for compliance
export const safetyAuditLogs = pgTable("safety_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  formulaId: varchar("formula_id").references(() => formulas.id, { onDelete: "set null" }),
  action: text("action").notNull(), // e.g., 'formula_blocked', 'interaction_warning', 'warning_acknowledged'
  severity: text("severity").notNull(), // 'critical', 'serious', 'informational'
  details: json("details").$type<{
    warnings?: Array<{ category: string; severity: string; message: string; ingredients?: string[]; drugs?: string[] }>;
    ingredients?: string[];
    medications?: string[];
    conditions?: string[];
    allergies?: string[];
    blockedReasons?: string[];
  }>().notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Formula version changes for tracking modifications
export const formulaVersionChanges = pgTable("formula_version_changes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  formulaId: varchar("formula_id").notNull().references(() => formulas.id, { onDelete: "cascade" }),
  summary: text("summary").notNull(),
  rationale: text("rationale").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Membership subscriptions (managed internally, charged via EPD vault)
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  plan: subscriptionPlanEnum("plan").notNull(),
  status: subscriptionStatusEnum("status").default('active').notNull(),
  paymentVaultId: varchar("payment_vault_id"),
  renewsAt: timestamp("renews_at"),
  pausedUntil: timestamp("paused_until"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Auto-ship subscriptions — recurring formula deliveries every 8 weeks
export const autoShipSubscriptions = pgTable("auto_ship_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  formulaId: varchar("formula_id").references(() => formulas.id, { onDelete: "set null" }),
  formulaVersion: integer("formula_version").notNull(),
  // No external subscription IDs — auto-ship is managed internally via scheduler + EPD vault charges
  status: autoShipStatusEnum("status").default('active').notNull(),
  priceCents: integer("price_cents").notNull(),               // Customer-facing price per shipment
  manufacturerCostCents: integer("manufacturer_cost_cents"),   // Raw Alive cost
  supplyWeeks: integer("supply_weeks").default(8).notNull(),
  nextShipmentDate: timestamp("next_shipment_date"),
  lastQuoteId: text("last_quote_id"),                         // Most recent Alive quote_id
  lastQuoteExpiresAt: timestamp("last_quote_expires_at"),
  memberDiscountApplied: boolean("member_discount_applied").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Orders for supplement deliveries
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  formulaId: varchar("formula_id").references(() => formulas.id, { onDelete: "set null" }),
  formulaVersion: integer("formula_version").notNull(),
  status: orderStatusEnum("status").default('pending').notNull(),
  amountCents: integer("amount_cents"), // Order total in cents (e.g., 12000 = $120.00)
  manufacturerCostCents: integer("manufacturer_cost_cents"), // Raw Alive cost before margin
  supplyWeeks: integer("supply_weeks").default(8), // 8-week supply default
  supplyMonths: integer("supply_months"), // Legacy: 3, 6, or 12 month supply
  manufacturerQuoteId: text("manufacturer_quote_id"), // Alive quote_id from /get-quote
  manufacturerQuoteExpiresAt: timestamp("manufacturer_quote_expires_at"), // When the Alive quote expires
  manufacturerOrderId: text("manufacturer_order_id"), // Alive order reference from /mix-product
  manufacturerOrderStatus: text("manufacturer_order_status"), // Status from Alive (e.g., 'submitted', 'in_production', 'shipped')
  gatewayTransactionId: text("gateway_transaction_id"), // EPD transaction ID that funded this order
  autoShipSubscriptionId: varchar("auto_ship_subscription_id"), // Set when order created by auto-ship
  trackingUrl: text("tracking_url"),
  placedAt: timestamp("placed_at").defaultNow().notNull(),
  shippedAt: timestamp("shipped_at"),
  currency: text("currency").default('USD').notNull(),
  paymentMode: text("payment_mode").default('card').notNull(), // 'card', 'bank', etc.
  shippingAddressSnapshot: json("shipping_address_snapshot").$type<{
    firstName: string;
    lastName: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
    country?: string;
  }>(),

  // ── Order-level consent & safety snapshot (legal non-repudiation) ──
  consentSnapshot: json("consent_snapshot").$type<{
    /** Which consent types were active at time of purchase */
    activeConsents: Array<{
      consentType: string;
      grantedAt: string;
      consentVersion: string;
    }>;
    /** Safety warnings displayed to user for this formula at purchase */
    formulaWarnings: Array<{
      category: string;
      severity: string;
      message: string;
      ingredients?: string[];
      drugs?: string[];
    }>;
    /** When the user acknowledged safety warnings (if applicable) */
    warningsAcknowledgedAt: string | null;
    /** Disclaimer version at time of purchase */
    disclaimerVersion: string;
    /** Full disclaimer text shown at checkout */
    disclaimerText: string;
    /** IP address at time of purchase */
    ipAddress: string | null;
    /** User agent at time of purchase */
    userAgent: string | null;
    /** Timestamp when this snapshot was captured */
    capturedAt: string;
  }>(),
}, (table) => [
  index("orders_user_id_idx").on(table.userId),
  index("orders_status_idx").on(table.status),
  index("orders_placed_at_idx").on(table.placedAt),
  index("orders_gateway_transaction_idx").on(table.gatewayTransactionId),
]);

// Ingredient pricing reference for equivalent stack estimates
export const ingredientPricing = pgTable("ingredient_pricing", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ingredientKey: text("ingredient_key").notNull().unique(), // normalized lookup key
  ingredientName: text("ingredient_name").notNull(),
  typicalCapsuleMg: integer("typical_capsule_mg").notNull(),
  typicalBottleCapsules: integer("typical_bottle_capsules").notNull(),
  typicalRetailPriceCents: integer("typical_retail_price_cents").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User addresses for shipping and billing
export const addresses = pgTable("addresses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: addressTypeEnum("type").notNull(),
  line1: text("line1").notNull(),
  line2: text("line2"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  postalCode: text("postal_code").notNull(),
  country: text("country").notNull().default('US'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Payment method references (EPD vault)
export const paymentMethodRefs = pgTable("payment_method_refs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  paymentVaultId: varchar("payment_vault_id").notNull(),
  brand: text("brand"),
  last4: text("last4"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Enhanced file uploads for HIPAA-compliant user documents
export const fileUploads = pgTable("file_uploads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: fileTypeEnum("type").notNull(),
  objectPath: text("object_path").notNull(), // Object storage path
  originalFileName: text("original_file_name").notNull(),
  fileSize: integer("file_size"), // File size in bytes
  mimeType: text("mime_type"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  // Analysis timing instrumentation
  analysisStartedAt: timestamp("analysis_started_at"),
  analysisCompletedAt: timestamp("analysis_completed_at"),
  // HIPAA compliance fields
  hipaaCompliant: boolean("hipaa_compliant").default(true).notNull(),
  encryptedAtRest: boolean("encrypted_at_rest").default(true).notNull(),
  retentionPolicyId: varchar("retention_policy_id"), // Future: reference to retention policies
  // Lab report specific fields
  labReportData: json("lab_report_data").$type<{
    testDate?: string;
    testType?: string;
    labName?: string;
    physicianName?: string;
    analysisStatus?: 'pending' | 'processing' | 'completed' | 'error';
    progressStep?: string;
    progressDetail?: string;
    overallAssessment?: string;
    riskPatterns?: string[];
    extractedData?: Array<Record<string, any>> | Record<string, any>;
    markerInsights?: Record<string, any>;
    /**
     * Coarse classification of the document. 'results' is the normal case
     * (a lab results PDF). 'requisition' = order form / requisition with no
     * results (e.g. patient uploaded the order before the draw). Used to
     * show clearer messaging when 0 markers are extracted.
     */
    documentKind?: 'results' | 'requisition' | 'unknown';
  }>(),
  // Soft delete for compliance (never actually delete PHI)
  deletedAt: timestamp("deleted_at"),
  deletedBy: varchar("deleted_by").references(() => users.id),
}, (table) => [
  index("file_uploads_user_id_idx").on(table.userId),
  index("file_uploads_type_idx").on(table.type),
]);

// HIPAA-compliant audit log for all file operations
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  fileId: varchar("file_id").references(() => fileUploads.id, { onDelete: "cascade" }),
  action: auditActionEnum("action").notNull(),
  objectPath: text("object_path"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  success: boolean("success").notNull(),
  errorMessage: text("error_message"),
  metadata: json("metadata").$type<Record<string, any>>(),
}, (table) => [
  index("audit_logs_user_id_idx").on(table.userId),
  index("audit_logs_file_id_idx").on(table.fileId),
  index("audit_logs_timestamp_idx").on(table.timestamp),
]);

// Admin action audit log — tracks all admin write operations
export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").notNull().references(() => users.id, { onDelete: "set null" }),
  action: adminActionEnum("action").notNull(),
  targetType: text("target_type").notNull(), // 'user', 'order', 'ticket', 'faq', 'blog', etc.
  targetId: varchar("target_id"), // ID of the affected resource
  details: json("details").$type<Record<string, any>>(), // Before/after data, reason, etc.
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Authentication audit log — tracks login attempts for security compliance
export const authAuditLogs = pgTable("auth_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  email: text("email"), // Always captured (even for failed attempts where user doesn't exist)
  action: text("action").notNull(), // 'login_success', 'login_failed', 'signup', 'google_login', 'facebook_login', 'password_reset', 'logout'
  provider: text("provider"), // 'email', 'google', 'facebook'
  success: boolean("success").notNull(),
  failureReason: text("failure_reason"), // 'invalid_password', 'user_not_found', 'rate_limited', 'account_locked', etc.
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User consent tracking for HIPAA compliance
export const userConsents = pgTable("user_consents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  consentType: consentTypeEnum("consent_type").notNull(),
  granted: boolean("granted").notNull(),
  grantedAt: timestamp("granted_at").defaultNow().notNull(),
  revokedAt: timestamp("revoked_at"),
  consentVersion: varchar("consent_version").notNull().default("1.0"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  consentText: text("consent_text"), // Full text of what user consented to
  metadata: json("metadata").$type<{
    source?: 'upload_form' | 'dashboard' | 'api';
    fileId?: string;
    additionalInfo?: Record<string, any>;
  }>(),
});

// Lab report analysis results (AI-generated insights)
export const labAnalyses = pgTable("lab_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fileId: varchar("file_id").notNull().references(() => fileUploads.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  analysisStatus: text("analysis_status").notNull().default("pending"),
  extractedMarkers: json("extracted_markers").$type<Array<{
    name: string;
    value: number;
    unit: string;
    referenceRange: string;
    status: 'normal' | 'high' | 'low' | 'critical';
  }>>().default([]),
  aiInsights: json("ai_insights").$type<{
    summary: string;
    recommendations: string[];
    riskFactors: string[];
    nutritionalNeeds: string[];
    confidence: number;
  }>(),
  processedAt: timestamp("processed_at").defaultNow().notNull(),
  errorMessage: text("error_message"),
});

// Notifications for user dashboard
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  // Optional links to related entities
  orderId: varchar("order_id").references(() => orders.id, { onDelete: "cascade" }),
  formulaId: varchar("formula_id").references(() => formulas.id, { onDelete: "cascade" }),
  // Optional metadata for additional information
  metadata: json("metadata").$type<{
    actionUrl?: string;
    icon?: string;
    priority?: 'low' | 'medium' | 'high';
    additionalData?: Record<string, any>;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Application settings (key-value store) for persistent runtime configuration (e.g., AI provider/model)
export const appSettings = pgTable("app_settings", {
  key: varchar("key").primaryKey(),
  // Arbitrary JSON value
  value: json("value").$type<Record<string, any>>().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: varchar("updated_by").references(() => users.id, { onDelete: "set null" })
});

// Admin notes on users - internal notes for admin team
export const userAdminNotes = pgTable("user_admin_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  adminId: varchar("admin_id").notNull().references(() => users.id, { onDelete: "set null" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User notification preferences
export const notificationPrefs = pgTable("notification_prefs", {
  userId: varchar("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  emailConsultation: boolean("email_consultation").default(true).notNull(),
  emailShipping: boolean("email_shipping").default(true).notNull(),
  emailBilling: boolean("email_billing").default(true).notNull(),
  smsConsultation: boolean("sms_consultation").default(false).notNull(),
  smsShipping: boolean("sms_shipping").default(false).notNull(),
  smsBilling: boolean("sms_billing").default(false).notNull(),
  dailyRemindersEnabled: boolean("daily_reminders_enabled").default(false).notNull(),
  reminderBreakfast: text("reminder_breakfast").default('08:00').notNull(),
  reminderLunch: text("reminder_lunch").default('12:00').notNull(),
  reminderDinner: text("reminder_dinner").default('18:00').notNull(),
  // Time slot selection for each notification type: 'morning' | 'afternoon' | 'evening' | 'custom' | 'off'
  pillsTimeSlot: text("pills_time_slot").default('all').notNull(), // 'all' sends at all 3 times
  workoutTimeSlot: text("workout_time_slot").default('morning').notNull(),
  nutritionTimeSlot: text("nutrition_time_slot").default('morning').notNull(),
  lifestyleTimeSlot: text("lifestyle_time_slot").default('evening').notNull(),
  // Custom times for each notification type (used when time slot is 'custom')
  pillsCustomTime: text("pills_custom_time"),
  workoutCustomTime: text("workout_custom_time"),
  nutritionCustomTime: text("nutrition_custom_time"),
  lifestyleCustomTime: text("lifestyle_custom_time"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Review schedules - for tracking formula review cadence
export const reviewSchedules = pgTable("review_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  formulaId: varchar("formula_id").notNull().references(() => formulas.id, { onDelete: "cascade" }),

  // Review frequency settings
  frequency: reviewFrequencyEnum("frequency").notNull(), // monthly, bimonthly, quarterly
  daysBefore: integer("days_before").default(5).notNull(), // Days before shipment to start review

  // Calculated dates
  nextReviewDate: timestamp("next_review_date").notNull(), // When the next review should happen
  lastReviewDate: timestamp("last_review_date"), // When the last review was completed

  // Notification preferences for this specific review schedule
  emailReminders: boolean("email_reminders").default(true).notNull(),
  smsReminders: boolean("sms_reminders").default(true).notNull(),

  // Calendar integration
  calendarIntegration: text("calendar_integration"), // 'google', 'apple', 'outlook', null

  // Active status
  isActive: boolean("is_active").default(true).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Smart Re-Order: Member reorder cycle tracking ──────────────────────
// Each active member has ONE active schedule at a time.
// Tracks the 8-week supply window and controls the nudge → approval → charge flow.
export const reorderSchedules = pgTable("reorder_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  formulaId: varchar("formula_id").notNull().references(() => formulas.id, { onDelete: "cascade" }),
  formulaVersion: integer("formula_version").notNull(),

  // Supply window
  supplyStartDate: timestamp("supply_start_date").notNull(),   // When current supply started (order ship date)
  supplyEndDate: timestamp("supply_end_date").notNull(),       // Estimated depletion (start + 8 weeks)

  // Lifecycle status
  status: reorderScheduleStatusEnum("status").default('active').notNull(),

  // Delay tracking ("Delay 2 weeks" — allowed once per cycle)
  delayedUntil: timestamp("delayed_until"),
  delayCount: integer("delay_count").default(0).notNull(),     // Max 1 per cycle

  // Charge tracking
  gatewayTransactionId: varchar("gateway_transaction_id"),  // EPD transaction ID when auto-charge fires
  chargedAt: timestamp("charged_at"),
  chargePriceCents: integer("charge_price_cents"),             // Actual amount charged
  orderId: varchar("order_id").references(() => orders.id, { onDelete: "set null" }),  // Created order

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Smart Re-Order: AI recommendation per cycle ────────────────────────
// Generated ~5 days before reorder. Contains AI analysis of wearable data,
// recommended formula adjustments, and SMS/email approval tracking.
export const reorderRecommendations = pgTable("reorder_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scheduleId: varchar("schedule_id").notNull().references(() => reorderSchedules.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  // AI analysis output
  analysisJson: json("analysis_json").$type<{
    /** Summary of 8-week wearable trends (sleep, HRV, recovery, etc.) */
    trendSummary: string;
    /** Specific findings the AI identified */
    findings: Array<{
      metric: string;       // e.g. "HRV", "Deep Sleep", "Resting HR"
      trend: 'improving' | 'declining' | 'stable';
      detail: string;       // Human-readable finding
    }>;
    /** Whether AI recommends formula changes */
    recommendsChanges: boolean;
    /** If changes recommended, what they are */
    suggestedChanges?: Array<{
      action: 'add' | 'remove' | 'increase' | 'decrease';
      ingredient: string;
      currentDoseMg?: number;
      suggestedDoseMg?: number;
      rationale: string;
    }>;
    /** The full prompt + response for auditability */
    promptHash?: string;
  }>(),

  // Recommended formula (null if AI says "keep current")
  recommendedFormulaJson: json("recommended_formula_json"),    // Full formula bases + additions
  recommendsChanges: boolean("recommends_changes").default(false).notNull(),

  // Notification status
  status: reorderRecommendationStatusEnum("status").default('pending').notNull(),

  // SMS tracking
  smsMessageSid: varchar("sms_message_sid"),       // Twilio SID of the nudge SMS
  smsSentAt: timestamp("sms_sent_at"),
  smsReplyReceived: varchar("sms_reply_received"), // "APPROVE" | "KEEP" | "DELAY"
  smsReplyAt: timestamp("sms_reply_at"),

  // Email tracking
  emailSentAt: timestamp("email_sent_at"),
  emailId: varchar("email_id"),                    // SendGrid message ID

  // Auto-approve deadline (2 days after SMS sent → auto-approve KEEP)
  autoApproveAt: timestamp("auto_approve_at"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas for each table
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertHealthProfileSchema = createInsertSchema(healthProfiles).omit({
  id: true,
  updatedAt: true,
});

export const insertChatSessionSchema = createInsertSchema(chatSessions).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertFormulaSchema = createInsertSchema(formulas).omit({
  id: true,
  createdAt: true,
});

export const insertFormulaVersionChangeSchema = createInsertSchema(formulaVersionChanges).omit({
  id: true,
  createdAt: true,
});

export const insertFormulaWarningAcknowledgmentSchema = createInsertSchema(formulaWarningAcknowledgments).omit({
  id: true,
  acknowledgedAt: true,
});

export const insertSafetyAuditLogSchema = createInsertSchema(safetyAuditLogs).omit({
  id: true,
  createdAt: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  placedAt: true,
});

export const insertAddressSchema = createInsertSchema(addresses).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentMethodRefSchema = createInsertSchema(paymentMethodRefs).omit({
  id: true,
  createdAt: true,
});

export const insertFileUploadSchema = createInsertSchema(fileUploads).omit({
  id: true,
  uploadedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

export const insertAdminAuditLogSchema = createInsertSchema(adminAuditLogs).omit({
  id: true,
  createdAt: true,
});

export const insertUserConsentSchema = createInsertSchema(userConsents).omit({
  id: true,
  grantedAt: true,
});

export const insertLabAnalysisSchema = createInsertSchema(labAnalyses).omit({
  id: true,
  processedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertIngredientPricingSchema = createInsertSchema(ingredientPricing).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// App settings insert schema
export const insertAppSettingSchema = createInsertSchema(appSettings).omit({
  updatedAt: true,
});

export const insertUserAdminNoteSchema = createInsertSchema(userAdminNotes).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationPrefSchema = createInsertSchema(notificationPrefs).omit({
  updatedAt: true,
});

export const insertReviewScheduleSchema = createInsertSchema(reviewSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAutoShipSubscriptionSchema = createInsertSchema(autoShipSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReorderScheduleSchema = createInsertSchema(reorderSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReorderRecommendationSchema = createInsertSchema(reorderRecommendations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});



// TypeScript types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertHealthProfile = z.infer<typeof insertHealthProfileSchema>;
export type HealthProfile = typeof healthProfiles.$inferSelect;

export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type ChatSession = typeof chatSessions.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export type InsertFormula = z.infer<typeof insertFormulaSchema>;
export type Formula = typeof formulas.$inferSelect;

export type InsertFormulaVersionChange = z.infer<typeof insertFormulaVersionChangeSchema>;
export type FormulaVersionChange = typeof formulaVersionChanges.$inferSelect;

export type InsertFormulaWarningAcknowledgment = z.infer<typeof insertFormulaWarningAcknowledgmentSchema>;
export type FormulaWarningAcknowledgment = typeof formulaWarningAcknowledgments.$inferSelect;

export type InsertSafetyAuditLog = z.infer<typeof insertSafetyAuditLogSchema>;
export type SafetyAuditLog = typeof safetyAuditLogs.$inferSelect;

export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

export type InsertAutoShipSubscription = z.infer<typeof insertAutoShipSubscriptionSchema>;
export type AutoShipSubscription = typeof autoShipSubscriptions.$inferSelect;

export type InsertReorderSchedule = z.infer<typeof insertReorderScheduleSchema>;
export type ReorderSchedule = typeof reorderSchedules.$inferSelect;

export type InsertReorderRecommendation = z.infer<typeof insertReorderRecommendationSchema>;
export type ReorderRecommendation = typeof reorderRecommendations.$inferSelect;

export type InsertAddress = z.infer<typeof insertAddressSchema>;
export type Address = typeof addresses.$inferSelect;

export type InsertPaymentMethodRef = z.infer<typeof insertPaymentMethodRefSchema>;
export type PaymentMethodRef = typeof paymentMethodRefs.$inferSelect;

export type InsertFileUpload = z.infer<typeof insertFileUploadSchema>;
export type FileUpload = typeof fileUploads.$inferSelect;

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

export type InsertAdminAuditLog = z.infer<typeof insertAdminAuditLogSchema>;
export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;

export type InsertUserConsent = z.infer<typeof insertUserConsentSchema>;
export type UserConsent = typeof userConsents.$inferSelect;

export type InsertLabAnalysis = z.infer<typeof insertLabAnalysisSchema>;
export type LabAnalysis = typeof labAnalyses.$inferSelect;

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export type InsertNotificationPref = z.infer<typeof insertNotificationPrefSchema>;
export type NotificationPref = typeof notificationPrefs.$inferSelect;

export type InsertReviewSchedule = z.infer<typeof insertReviewScheduleSchema>;
export type ReviewSchedule = typeof reviewSchedules.$inferSelect;

// App settings types
export type InsertAppSetting = z.infer<typeof insertAppSettingSchema>;
export type AppSetting = typeof appSettings.$inferSelect;

// User admin notes types
export type InsertUserAdminNote = z.infer<typeof insertUserAdminNoteSchema>;
export type UserAdminNote = typeof userAdminNotes.$inferSelect;

// Referral tracking - tracks referral code usage and rewards
export const referralEvents = pgTable("referral_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerUserId: varchar("referrer_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  referredUserId: varchar("referred_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  referralCode: text("referral_code").notNull(),
  eventType: text("event_type").notNull(), // 'signup', 'first_order', 'reorder'
  rewardType: text("reward_type"), // 'discount', 'credit', 'free_month'
  rewardAmountCents: integer("reward_amount_cents"),
  rewardApplied: boolean("reward_applied").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("referral_events_referrer_idx").on(table.referrerUserId),
  index("referral_events_referred_idx").on(table.referredUserId),
]);

export const insertReferralEventSchema = createInsertSchema(referralEvents);
export type InsertReferralEvent = z.infer<typeof insertReferralEventSchema>;
export type ReferralEvent = typeof referralEvents.$inferSelect;

// Marketing campaigns - tracks campaigns across channels
export const marketingCampaigns = pgTable("marketing_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  channel: text("channel").notNull(), // 'email', 'social', 'paid', 'content', 'podcast', 'influencer'
  utmCampaign: text("utm_campaign").unique(), // Maps to utm_campaign param
  status: text("status").default('draft').notNull(), // 'draft', 'active', 'paused', 'completed'
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  budgetCents: integer("budget_cents"),
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("marketing_campaigns_status_idx").on(table.status),
  index("marketing_campaigns_channel_idx").on(table.channel),
]);

export const insertMarketingCampaignSchema = createInsertSchema(marketingCampaigns);
export type InsertMarketingCampaign = z.infer<typeof insertMarketingCampaignSchema>;
export type MarketingCampaign = typeof marketingCampaigns.$inferSelect;

// Influencer Management
export const influencers = pgTable("influencers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  handle: text("handle"), // @handle
  platform: text("platform").notNull(), // instagram, tiktok, youtube, podcast, twitter, linkedin
  followerCount: integer("follower_count"),
  engagementRate: decimal("engagement_rate", { precision: 5, scale: 2 }), // e.g. 3.50%
  niche: text("niche"), // fitness, wellness, biohacking, nutrition, longevity
  email: text("email"),
  phone: text("phone"),
  website: text("website"),

  // Partnership details
  agreementType: text("agreement_type"), // affiliate, ambassador, one_time, gifting
  commissionPercent: integer("commission_percent"), // e.g. 15
  promoCode: text("promo_code").unique(),
  contractStartDate: timestamp("contract_start_date"),
  contractEndDate: timestamp("contract_end_date"),

  // Tracking
  status: text("status").default('prospect').notNull(), // prospect, contacted, negotiating, active, paused, churned
  totalSignups: integer("total_signups").default(0).notNull(),
  totalOrders: integer("total_orders").default(0).notNull(),
  totalRevenueCents: integer("total_revenue_cents").default(0).notNull(),
  totalCommissionCents: integer("total_commission_cents").default(0).notNull(),
  lastPostDate: timestamp("last_post_date"),
  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("influencers_status_idx").on(table.status),
  index("influencers_platform_idx").on(table.platform),
  index("influencers_promo_code_idx").on(table.promoCode),
]);

export const insertInfluencerSchema = createInsertSchema(influencers);
export type InsertInfluencer = z.infer<typeof insertInfluencerSchema>;
export type Influencer = typeof influencers.$inferSelect;

// Influencer content tracking
export const influencerContent = pgTable("influencer_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  influencerId: varchar("influencer_id").notNull().references(() => influencers.id, { onDelete: "cascade" }),
  contentType: text("content_type").notNull(), // post, story, reel, video, podcast_mention, blog
  platform: text("platform").notNull(),
  url: text("url"),
  expectedDate: timestamp("expected_date"),
  publishedDate: timestamp("published_date"),
  status: text("status").default('planned').notNull(), // planned, submitted, approved, published, missed
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("influencer_content_influencer_idx").on(table.influencerId),
]);

export const insertInfluencerContentSchema = createInsertSchema(influencerContent);
export type InsertInfluencerContent = z.infer<typeof insertInfluencerContentSchema>;
export type InfluencerContent = typeof influencerContent.$inferSelect;

// B2B Medical Prospecting
export const b2bProspects = pgTable("b2b_prospects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  practiceName: text("practice_name").notNull(),
  practiceType: text("practice_type").notNull(), // naturopathic, integrative, functional_medicine, sports_medicine, chiropractic, wellness_clinic, pharmacy
  specialty: text("specialty"),
  website: text("website"),
  phone: text("phone"),
  email: text("email"),

  // Address
  addressLine1: text("address_line1"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),

  // Contacts
  primaryContactName: text("primary_contact_name"),
  primaryContactTitle: text("primary_contact_title"),
  primaryContactEmail: text("primary_contact_email"),

  // Scoring & status
  leadScore: integer("lead_score").default(0).notNull(), // 0-100
  status: text("status").default('new').notNull(), // new, contacted, responded, meeting_scheduled, sample_sent, trial, active_partner, churned, rejected
  source: text("source"), // npi_registry, google_places, manual, referral, inbound
  providerCount: integer("provider_count"),

  // Tracking
  contactedAt: timestamp("contacted_at"),
  lastActivityAt: timestamp("last_activity_at"),
  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("b2b_prospects_status_idx").on(table.status),
  index("b2b_prospects_type_idx").on(table.practiceType),
  index("b2b_prospects_state_idx").on(table.state),
  index("b2b_prospects_lead_score_idx").on(table.leadScore),
]);

export const insertB2bProspectSchema = createInsertSchema(b2bProspects);
export type InsertB2bProspect = z.infer<typeof insertB2bProspectSchema>;
export type B2bProspect = typeof b2bProspects.$inferSelect;

// B2B outreach tracking
export const b2bOutreach = pgTable("b2b_outreach", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  prospectId: varchar("prospect_id").notNull().references(() => b2bProspects.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // email, call, meeting, sample_sent, follow_up
  subject: text("subject"),
  body: text("body"),
  sentAt: timestamp("sent_at"),
  openedAt: timestamp("opened_at"),
  repliedAt: timestamp("replied_at"),
  outcome: text("outcome"), // positive, negative, no_response, meeting_booked
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("b2b_outreach_prospect_idx").on(table.prospectId),
]);

export const insertB2bOutreachSchema = createInsertSchema(b2bOutreach);
export type InsertB2bOutreach = z.infer<typeof insertB2bOutreachSchema>;
export type B2bOutreach = typeof b2bOutreach.$inferSelect;

// Auth-specific schemas
export const signupSchema = z.object({
  name: z.string()
    .trim()
    .min(2, 'Name must be at least 2 characters long')
    .max(45, 'Name must be less than 45 characters')
    .regex(/^[A-Za-z]+(?: [A-Za-z]+)*$/, 'Name can contain only alphabets'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
  phone: z.string().optional(),
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the Terms of Service and Privacy Policy' }),
  }),
  ageConfirmed: z.literal(true, {
    errorMap: () => ({ message: 'You must confirm you are 18 years of age or older' }),
  }),
});

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address').max(254, 'Email is too long').transform(v => v.toLowerCase().trim()),
  password: z.string().min(1, 'Password is required'),
});

export const authResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    phone: z.string().nullable(),
    createdAt: z.string(),
    isAdmin: z.boolean().optional(),
    emailVerified: z.boolean(),
  }),
  token: z.string(),
});

export type SignupData = z.infer<typeof signupSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;

// Lab report upload validation schema
export const labReportUploadSchema = z.object({
  originalFileName: z.string().min(1, 'File name is required'),
  fileSize: z.number().positive('File size must be positive').max(50 * 1024 * 1024, 'File size cannot exceed 50MB'),
  mimeType: z.string().refine(
    (type) => ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'].includes(type),
    'Only PDF and image files are allowed for lab reports'
  ),
  testDate: z.string().optional(),
  testType: z.string().optional(),
  labName: z.string().optional(),
  physicianName: z.string().optional(),
});

// User consent validation schema
export const userConsentSchema = z.object({
  consentType: z.enum(['lab_data_processing', 'ai_analysis', 'data_retention', 'third_party_sharing', 'sms_accountability']),
  granted: z.boolean(),
  consentVersion: z.string().default('1.0'),
  metadata: z.record(z.any()).optional(),
});

export type LabReportUploadData = z.infer<typeof labReportUploadSchema>;
export type UserConsentData = z.infer<typeof userConsentSchema>;

// Support system schemas
export const supportTicketStatusEnum = pgEnum('support_ticket_status', ['open', 'in_progress', 'resolved', 'closed']);
export const supportTicketPriorityEnum = pgEnum('support_ticket_priority', ['low', 'medium', 'high', 'urgent']);

// Wearable device connections - stores OAuth tokens and connection status
export const wearableConnections = pgTable("wearable_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: wearableProviderEnum("provider").notNull(),
  status: wearableConnectionStatusEnum("status").default('connected').notNull(),

  // OAuth credentials (encrypted in storage layer)
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),

  // Provider-specific user ID
  providerUserId: text("provider_user_id"),

  // Connection metadata
  scopes: json("scopes").$type<string[]>().default([]),
  lastSyncAt: timestamp("last_sync_at"),
  lastSyncError: text("last_sync_error"),

  connectedAt: timestamp("connected_at").defaultNow().notNull(),
  disconnectedAt: timestamp("disconnected_at"),
});

// Daily biometric data from wearable devices
export const biometricData = pgTable("biometric_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  connectionId: varchar("connection_id").references(() => wearableConnections.id, { onDelete: "cascade" }),
  provider: wearableProviderEnum("provider").notNull(),
  dataDate: timestamp("data_date").notNull(), // The day this data represents

  // Sleep metrics
  sleepScore: integer("sleep_score"), // 0-100 (Oura, WHOOP)
  sleepHours: integer("sleep_hours"), // Total sleep in minutes
  deepSleepMinutes: integer("deep_sleep_minutes"),
  remSleepMinutes: integer("rem_sleep_minutes"),
  lightSleepMinutes: integer("light_sleep_minutes"),

  // Heart metrics
  hrvMs: integer("hrv_ms"), // Heart rate variability in milliseconds
  restingHeartRate: integer("resting_heart_rate"), // BPM
  averageHeartRate: integer("average_heart_rate"),
  maxHeartRate: integer("max_heart_rate"),

  // Recovery and readiness
  recoveryScore: integer("recovery_score"), // 0-100 (WHOOP, Oura)
  readinessScore: integer("readiness_score"), // 0-100 (Oura)
  strainScore: integer("strain_score"), // 0-21 (WHOOP)

  // Activity metrics
  steps: integer("steps"),
  caloriesBurned: integer("calories_burned"),
  activeMinutes: integer("active_minutes"),

  // Additional metrics
  spo2Percentage: integer("spo2_percentage"), // Blood oxygen 0-100
  skinTempCelsius: integer("skin_temp_celsius"), // Multiplied by 10 for decimal precision
  respiratoryRate: integer("respiratory_rate"), // Breaths per minute

  // Raw data from provider (for reference)
  rawData: json("raw_data").$type<Record<string, any>>(),

  syncedAt: timestamp("synced_at").defaultNow().notNull(),
});

// Aggregated biometric trends for faster analysis
export const biometricTrends = pgTable("biometric_trends", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  periodType: text("period_type").notNull(), // 'week' or 'month'
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),

  // Averaged metrics over the period
  avgSleepScore: integer("avg_sleep_score"),
  avgSleepHours: integer("avg_sleep_hours"),
  avgHrvMs: integer("avg_hrv_ms"),
  avgRestingHeartRate: integer("avg_resting_heart_rate"),
  avgRecoveryScore: integer("avg_recovery_score"),
  avgStrainScore: integer("avg_strain_score"),
  avgSteps: integer("avg_steps"),

  // Trend indicators (positive/negative/stable)
  sleepTrend: text("sleep_trend"), // 'improving', 'declining', 'stable'
  hrvTrend: text("hrv_trend"),
  recoveryTrend: text("recovery_trend"),

  // Data quality metrics
  daysWithData: integer("days_with_data").notNull(),
  totalDaysInPeriod: integer("total_days_in_period").notNull(),

  calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
});

// FAQ items table
export const faqItems = pgTable("faq_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  isPublished: boolean("is_published").default(true).notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  deletedAt: timestamp("deleted_at"),
  displayOrder: integer("display_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Support ticket source enum
export const supportTicketSourceEnum = pgEnum('support_ticket_source', ['web', 'email', 'chat', 'api', 'internal']);

// Support tickets table
export const supportTickets = pgTable("support_tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  status: supportTicketStatusEnum("status").default('open').notNull(),
  priority: supportTicketPriorityEnum("priority").default('medium').notNull(),
  category: text("category").notNull(),
  assignedTo: text("assigned_to"),
  adminNotes: text("admin_notes"),
  tags: text("tags").array().default(sql`'{}'::text[]`),
  source: supportTicketSourceEnum("source").default('web').notNull(),
  firstResponseAt: timestamp("first_response_at"),
  slaDeadline: timestamp("sla_deadline"),
  slaBreached: boolean("sla_breached").default(false).notNull(),
  mergedIntoId: varchar("merged_into_id"),
  responseCount: integer("response_count").default(0).notNull(),
  lastActivityAt: timestamp("last_activity_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

// Support ticket responses
export const supportTicketResponses = pgTable("support_ticket_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull().references(() => supportTickets.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  isStaff: boolean("is_staff").default(false).notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Support ticket activity log (audit trail)
export const supportTicketActivityLog = pgTable("support_ticket_activity_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull().references(() => supportTickets.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(), // status_change, assignment, priority_change, reply, tag_add, tag_remove, merge, note
  oldValue: text("old_value"),
  newValue: text("new_value"),
  metadata: text("metadata"), // JSON string for extra context
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Help articles table
export const helpArticles = pgTable("help_articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  isPublished: boolean("is_published").default(true).notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  deletedAt: timestamp("deleted_at"),
  viewCount: integer("view_count").default(0).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Research citations table - stores scientific evidence for ingredients
export const researchCitations = pgTable("research_citations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ingredientName: text("ingredient_name").notNull(), // Name of supplement/formula
  citationTitle: text("citation_title").notNull(), // Study title
  journal: text("journal").notNull(), // Journal name (e.g., "JAMA Cardiology")
  publicationYear: integer("publication_year").notNull(),
  authors: text("authors"), // First author et al.
  findings: text("findings").notNull(), // Key results in plain language
  sampleSize: integer("sample_size"), // Number of participants
  pubmedUrl: text("pubmed_url"), // Link to PubMed or study
  evidenceLevel: evidenceLevelEnum("evidence_level").notNull(),
  studyType: studyTypeEnum("study_type").notNull(),
  isActive: boolean("is_active").default(true).notNull(), // For soft delete
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas for support system
export const insertFaqItemSchema = createInsertSchema(faqItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSupportTicketResponseSchema = createInsertSchema(supportTicketResponses).omit({
  id: true,
  createdAt: true,
});

export const insertSupportTicketActivityLogSchema = createInsertSchema(supportTicketActivityLog).omit({
  id: true,
  createdAt: true,
});

export const insertHelpArticleSchema = createInsertSchema(helpArticles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types for support system
export type InsertFaqItem = z.infer<typeof insertFaqItemSchema>;
export type FaqItem = typeof faqItems.$inferSelect;

export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;

export type InsertSupportTicketResponse = z.infer<typeof insertSupportTicketResponseSchema>;
export type SupportTicketResponse = typeof supportTicketResponses.$inferSelect;

export type InsertSupportTicketActivityLog = z.infer<typeof insertSupportTicketActivityLogSchema>;
export type SupportTicketActivityLog = typeof supportTicketActivityLog.$inferSelect;

export type InsertHelpArticle = z.infer<typeof insertHelpArticleSchema>;
export type HelpArticle = typeof helpArticles.$inferSelect;

// Newsletter subscriber schema
export const insertNewsletterSubscriberSchema = createInsertSchema(newsletterSubscribers).omit({
  id: true,
  subscribedAt: true,
  isActive: true,
});

export type InsertNewsletterSubscriber = z.infer<typeof insertNewsletterSubscriberSchema>;
export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;

// Research citations schema
export const insertResearchCitationSchema = createInsertSchema(researchCitations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertResearchCitation = z.infer<typeof insertResearchCitationSchema>;
export type ResearchCitation = typeof researchCitations.$inferSelect;

// Wearable integration schemas
export const insertWearableConnectionSchema = createInsertSchema(wearableConnections).omit({
  id: true,
  connectedAt: true,
});

export const insertBiometricDataSchema = createInsertSchema(biometricData).omit({
  id: true,
  syncedAt: true,
});

export const insertBiometricTrendSchema = createInsertSchema(biometricTrends).omit({
  id: true,
  calculatedAt: true,
});

// Wearable integration types
export type InsertWearableConnection = z.infer<typeof insertWearableConnectionSchema>;
export type WearableConnection = typeof wearableConnections.$inferSelect;

export type InsertBiometricData = z.infer<typeof insertBiometricDataSchema>;
export type BiometricData = typeof biometricData.$inferSelect;

export type InsertBiometricTrend = z.infer<typeof insertBiometricTrendSchema>;
export type BiometricTrend = typeof biometricTrends.$inferSelect;

// ============================================================================
// OPTIMIZE (Wellness Center) - Nutrition, Workout, Lifestyle Plans
// ============================================================================

// Enums for Optimize
export const planTypeEnum = pgEnum('plan_type', ['nutrition', 'workout', 'lifestyle']);
export const workoutExperienceLevelEnum = pgEnum('workout_experience_level', ['beginner', 'intermediate', 'advanced']);
export const mealTypeEnum = pgEnum('meal_type', ['breakfast', 'lunch', 'dinner', 'snack']);
export const recipeCategoryEnum = pgEnum('recipe_category', ['breakfast', 'lunch', 'dinner', 'snack', 'dessert']);

// Workout Preferences - Settings for the Workout Tracker
export const workoutPreferences = pgTable("workout_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  preferredDays: json("preferred_days").$type<string[]>().default(['Monday', 'Wednesday', 'Friday']).notNull(),
  preferredTime: text("preferred_time").default('07:00').notNull(),
  smsEnabled: boolean("sms_enabled").default(false).notNull(),
  calendarSync: boolean("calendar_sync").default(false).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Optimize Plans - Main table for AI-generated wellness plans
export const optimizePlans = pgTable("optimize_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  planType: planTypeEnum("plan_type").notNull(),

  // Plan content (flexible JSON structure)
  content: json("content").notNull(), // Nutrition: meals, macros; Workout: exercises, schedule; Lifestyle: protocols
  aiRationale: text("ai_rationale"), // Why this plan was created

  // Context used to generate plan (for regeneration)
  basedOnFormulaId: varchar("based_on_formula_id").references(() => formulas.id),
  basedOnLabs: json("based_on_labs"), // Snapshot of lab data used
  preferences: json("preferences"), // User preferences (workout days, dietary restrictions, etc.)

  // Metadata
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Daily tracking for user progress
export const optimizeDailyLogs = pgTable("optimize_daily_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  logDate: timestamp("log_date").notNull(), // Date of tracking

  // Daily completion tracking
  nutritionCompleted: boolean("nutrition_completed").default(false).notNull(),
  mealsLogged: json("meals_logged"), // Array of meal types logged: ['breakfast', 'lunch']
  workoutCompleted: boolean("workout_completed").default(false).notNull(),

  // Granular supplement tracking (morning/afternoon/evening doses)
  supplementsTaken: boolean("supplements_taken").default(false).notNull(), // Legacy: true if ANY dose taken
  supplementMorning: boolean("supplement_morning").default(false).notNull(),
  supplementAfternoon: boolean("supplement_afternoon").default(false).notNull(),
  supplementEvening: boolean("supplement_evening").default(false).notNull(),

  // Manual rest day override (user can mark any day as rest day)
  isRestDay: boolean("is_rest_day").default(false).notNull(),

  // Hydration tracking
  waterIntakeOz: integer("water_intake_oz"),

  // Subjective ratings (1-5 scale)
  energyLevel: integer("energy_level"), // 1 = very low, 5 = excellent
  moodLevel: integer("mood_level"), // 1 = poor, 5 = excellent
  sleepQuality: integer("sleep_quality"), // 1 = poor, 5 = excellent

  // Notes
  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Workout Plans - Structured weekly programs
export const workoutPlans = pgTable("workout_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  name: varchar("name", { length: 255 }).notNull(), // e.g., "3-Day Strength Program"
  daysPerWeek: integer("days_per_week").notNull(), // 1-7
  experienceLevel: workoutExperienceLevelEnum("experience_level").notNull(),

  // Schedule: [{ day: "Monday", workoutId: "uuid" }, ...]
  workoutSchedule: json("workout_schedule").notNull(),

  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Individual Workouts - Specific training sessions
export const workouts = pgTable("workouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planId: varchar("plan_id").references(() => workoutPlans.id, { onDelete: "cascade" }),

  name: varchar("name", { length: 255 }).notNull(), // e.g., "Upper Body Push"
  description: text("description"),
  durationMinutes: integer("duration_minutes"),

  // Exercises: [{ name, sets, reps, rest, notes, videoUrl }]
  exercises: json("exercises").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Workout Logs - Track completed workouts
export const workoutLogs = pgTable("workout_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  workoutId: varchar("workout_id").references(() => workouts.id),

  completedAt: timestamp("completed_at").defaultNow().notNull(),

  // Actual performance: [{ exerciseName, sets: [{ weight, reps }] }]
  exercisesCompleted: json("exercises_completed"),

  durationActual: integer("duration_actual"), // Actual minutes spent
  difficultyRating: integer("difficulty_rating"), // 1-5 scale
  notes: text("notes"),
});

// Exercise Records - Track last weights (for suggestions) and manual PRs
export const exerciseRecords = pgTable("exercise_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  exerciseName: varchar("exercise_name", { length: 255 }).notNull(),

  // Last logged weight/reps (for suggestions)
  lastWeight: integer("last_weight"),
  lastReps: integer("last_reps"),
  lastLoggedAt: timestamp("last_logged_at"),

  // Manual PR tracking (only when user explicitly saves)
  prWeight: integer("pr_weight"),
  prReps: integer("pr_reps"),
  prDate: timestamp("pr_date"),
  isPrTracked: boolean("is_pr_tracked").default(false).notNull(), // User explicitly marked this as a tracked PR

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userExerciseIdx: uniqueIndex("exercise_records_user_exercise_idx").on(table.userId, table.exerciseName),
}));

// Meal Plans - Weekly nutrition structure
export const mealPlans = pgTable("meal_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  name: varchar("name", { length: 255 }).notNull(), // e.g., "High Protein Anti-Inflammatory"
  dailyCalories: integer("daily_calories").notNull(),

  // Macros: { protein: 200, carbs: 220, fat: 80 }
  macros: json("macros").notNull(),

  // Meals: [{ mealType: "breakfast", recipes: [...], timing: "7-8 AM" }]
  meals: json("meals").notNull(),

  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Recipe Library - Reusable recipes
export const recipes = pgTable("recipes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: recipeCategoryEnum("category").notNull(),

  prepTimeMinutes: integer("prep_time_minutes"),
  cookTimeMinutes: integer("cook_time_minutes"),
  servings: integer("servings").notNull(),

  // Ingredients: [{ item, amount, unit }]
  ingredients: json("ingredients").notNull(),

  // Instructions as array of steps
  instructions: json("instructions").notNull(), // Array of strings

  // Macros per serving: { calories, protein, carbs, fat, fiber }
  macros: json("macros").notNull(),

  // Tags: ["high-protein", "anti-inflammatory", "quick", etc.]
  tags: json("tags"), // Array of strings

  imageUrl: text("image_url"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Meal Logs - Track what users eat
export const mealLogs = pgTable("meal_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  recipeId: varchar("recipe_id").references(() => recipes.id), // NULL if custom meal
  mealType: mealTypeEnum("meal_type").notNull(),
  customMealName: varchar("custom_meal_name", { length: 255 }),
  customMealDescription: text("custom_meal_description"), // What the user ate (for AI analysis)

  loggedAt: timestamp("logged_at").defaultNow().notNull(),
  servings: integer("servings").default(1),
  notes: text("notes"),

  // AI-analyzed nutritional data
  calories: integer("calories"),
  proteinGrams: integer("protein_grams"),
  carbsGrams: integer("carbs_grams"),
  fatGrams: integer("fat_grams"),
  fiberGrams: integer("fiber_grams"),
  sugarGrams: integer("sugar_grams"),
  sodiumMg: integer("sodium_mg"),

  // Hydration tracking
  waterOz: integer("water_oz"), // Water intake in ounces

  // Source tracking
  isFromPlan: boolean("is_from_plan").default(false), // Was this from the meal plan?
  planMealName: varchar("plan_meal_name", { length: 255 }), // Name of the meal from plan
});

// Grocery Lists - Auto-generated from meal plans
export const groceryLists = pgTable("grocery_lists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  optimizePlanId: varchar("optimize_plan_id").references(() => optimizePlans.id),

  // Items: [{ item, amount, unit, category, checked }]
  items: json("items").notNull(),

  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  isArchived: boolean("is_archived").default(false).notNull(),
});

// SMS Preferences for Optimize reminders
export const optimizeSmsPreferences = pgTable("optimize_sms_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),

  // Morning reminder (nutrition + workout + supplements)
  morningReminderEnabled: boolean("morning_reminder_enabled").default(true).notNull(),
  morningReminderTime: text("morning_reminder_time").default('07:00').notNull(), // HH:MM format

  // Pre-workout reminder
  workoutReminderEnabled: boolean("workout_reminder_enabled").default(true).notNull(),
  workoutReminderTime: text("workout_reminder_time").default('17:00').notNull(),

  // Evening check-in
  eveningCheckinEnabled: boolean("evening_checkin_enabled").default(true).notNull(),
  eveningCheckinTime: text("evening_checkin_time").default('21:00').notNull(),

  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tracking preferences let users decide which categories count toward streaks/consistency
export const trackingPreferences = pgTable("tracking_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),

  trackNutrition: boolean("track_nutrition").default(true).notNull(),
  trackWorkouts: boolean("track_workouts").default(true).notNull(),
  trackSupplements: boolean("track_supplements").default(true).notNull(),
  trackLifestyle: boolean("track_lifestyle").default(true).notNull(),

  hydrationGoalOz: integer("hydration_goal_oz"),

  // Optional pause/freeze window to avoid streak loss
  pauseUntil: date("pause_until"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User Streaks - Track consistency across categories
export const userStreaks = pgTable("user_streaks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  streakType: varchar("streak_type", { length: 50 }).notNull(), // 'overall', 'nutrition', 'workout', 'supplements', 'lifestyle'
  currentStreak: integer("current_streak").default(0).notNull(),
  longestStreak: integer("longest_streak").default(0).notNull(),
  lastLoggedDate: timestamp("last_logged_date"), // Keep for backward compat
  lastCompletedDate: date("last_completed_date"), // New DATE type for better date handling

  // Weekly & Monthly aggregates
  currentWeekScore: decimal("current_week_score", { precision: 3, scale: 2 }),
  currentMonthScore: decimal("current_month_score", { precision: 3, scale: 2 }),
  lastWeekScore: decimal("last_week_score", { precision: 3, scale: 2 }),
  lastMonthScore: decimal("last_month_score", { precision: 3, scale: 2 }),

  // Streak preservation (grace period tracking)
  streakFreezeUsed: boolean("streak_freeze_used").default(false),
  streakFreezeDate: date("streak_freeze_date"),

  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Daily Completion Records - Granular tracking of daily activities
export const dailyCompletions = pgTable("daily_completions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  logDate: date("log_date").notNull(), // DATE only, no time

  // Category completion scores (0.00 - 1.00)
  nutritionScore: decimal("nutrition_score", { precision: 3, scale: 2 }),
  workoutScore: decimal("workout_score", { precision: 3, scale: 2 }),
  supplementScore: decimal("supplement_score", { precision: 3, scale: 2 }),
  lifestyleScore: decimal("lifestyle_score", { precision: 3, scale: 2 }),

  // Detailed completion data (JSON for flexibility)
  nutritionDetails: json("nutrition_details"), // { mealsLogged: 3, mealsPlanned: 3, calories: 2100 }
  workoutDetails: json("workout_details"), // { completed: true, exerciseCount: 8, duration: 45 }
  supplementDetails: json("supplement_details"), // { morning: true, afternoon: true, evening: false }
  lifestyleDetails: json("lifestyle_details"), // { sleepHours: 7.5, stepsCount: 8000 }

  // Overall daily score (weighted average)
  dailyScore: decimal("daily_score", { precision: 3, scale: 2 }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userDateIdx: uniqueIndex("daily_completions_user_date_idx").on(table.userId, table.logDate),
}));

// Weekly Summaries - Materialized for fast dashboard queries
export const weeklySummaries = pgTable("weekly_summaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  weekStart: date("week_start").notNull(), // Monday of the week

  // Days completed per category (0-7)
  nutritionDays: integer("nutrition_days").default(0),
  workoutDays: integer("workout_days").default(0),
  supplementDays: integer("supplement_days").default(0),
  lifestyleDays: integer("lifestyle_days").default(0),

  // Average scores for the week (0.00 - 1.00)
  avgNutritionScore: decimal("avg_nutrition_score", { precision: 3, scale: 2 }),
  avgWorkoutScore: decimal("avg_workout_score", { precision: 3, scale: 2 }),
  avgSupplementScore: decimal("avg_supplement_score", { precision: 3, scale: 2 }),
  avgLifestyleScore: decimal("avg_lifestyle_score", { precision: 3, scale: 2 }),

  // Overall consistency score for the week (0-100)
  consistencyScore: decimal("consistency_score", { precision: 5, scale: 2 }),

  // Perfect and partial day counts
  perfectDays: integer("perfect_days").default(0),
  partialDays: integer("partial_days").default(0),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userWeekIdx: uniqueIndex("weekly_summaries_user_week_idx").on(table.userId, table.weekStart),
}));

// Insert schemas for Optimize tables
export const insertOptimizePlanSchema = createInsertSchema(optimizePlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOptimizeDailyLogSchema = createInsertSchema(optimizeDailyLogs).omit({
  id: true,
  createdAt: true,
});

export const insertWorkoutPlanSchema = createInsertSchema(workoutPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkoutSchema = createInsertSchema(workouts).omit({
  id: true,
  createdAt: true,
});

export const insertWorkoutLogSchema = createInsertSchema(workoutLogs).omit({
  id: true,
});

export const insertExerciseRecordSchema = createInsertSchema(exerciseRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMealPlanSchema = createInsertSchema(mealPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRecipeSchema = createInsertSchema(recipes).omit({
  id: true,
  createdAt: true,
});

export const insertMealLogSchema = createInsertSchema(mealLogs).omit({
  id: true,
});

export const insertGroceryListSchema = createInsertSchema(groceryLists).omit({
  id: true,
});

export const insertOptimizeSmsPreferencesSchema = createInsertSchema(optimizeSmsPreferences).omit({
  id: true,
  updatedAt: true,
});

export const insertTrackingPreferencesSchema = createInsertSchema(trackingPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkoutPreferencesSchema = createInsertSchema(workoutPreferences).omit({
  id: true,
  updatedAt: true,
});

export const insertUserStreakSchema = createInsertSchema(userStreaks).omit({
  id: true,
  updatedAt: true,
});

export const insertDailyCompletionSchema = createInsertSchema(dailyCompletions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWeeklySummarySchema = createInsertSchema(weeklySummaries).omit({
  id: true,
  createdAt: true,
});

// Types for Optimize
export type InsertOptimizePlan = z.infer<typeof insertOptimizePlanSchema>;
export type OptimizePlan = typeof optimizePlans.$inferSelect;

export type InsertOptimizeDailyLog = z.infer<typeof insertOptimizeDailyLogSchema>;
export type OptimizeDailyLog = typeof optimizeDailyLogs.$inferSelect;

export type InsertWorkoutPlan = z.infer<typeof insertWorkoutPlanSchema>;
export type WorkoutPlan = typeof workoutPlans.$inferSelect;

export type InsertWorkout = z.infer<typeof insertWorkoutSchema>;
export type Workout = typeof workouts.$inferSelect;

export type InsertWorkoutLog = z.infer<typeof insertWorkoutLogSchema>;
export type WorkoutLog = typeof workoutLogs.$inferSelect;

export type InsertExerciseRecord = z.infer<typeof insertExerciseRecordSchema>;
export type ExerciseRecord = typeof exerciseRecords.$inferSelect;

export type InsertMealPlan = z.infer<typeof insertMealPlanSchema>;
export type MealPlan = typeof mealPlans.$inferSelect;

export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type Recipe = typeof recipes.$inferSelect;

export type InsertMealLog = z.infer<typeof insertMealLogSchema>;
export type MealLog = typeof mealLogs.$inferSelect;

export type InsertGroceryList = z.infer<typeof insertGroceryListSchema>;
export type GroceryList = typeof groceryLists.$inferSelect;

export type InsertOptimizeSmsPreferences = z.infer<typeof insertOptimizeSmsPreferencesSchema>;
export type OptimizeSmsPreferences = typeof optimizeSmsPreferences.$inferSelect;

export type InsertTrackingPreferences = z.infer<typeof insertTrackingPreferencesSchema>;
export type TrackingPreferences = typeof trackingPreferences.$inferSelect;

export type InsertWorkoutPreferences = z.infer<typeof insertWorkoutPreferencesSchema>;
export type WorkoutPreferences = typeof workoutPreferences.$inferSelect;

export type InsertUserStreak = z.infer<typeof insertUserStreakSchema>;
export type UserStreak = typeof userStreaks.$inferSelect;

export type InsertDailyCompletion = z.infer<typeof insertDailyCompletionSchema>;
export type DailyCompletion = typeof dailyCompletions.$inferSelect;

export type InsertWeeklySummary = z.infer<typeof insertWeeklySummarySchema>;
export type WeeklySummary = typeof weeklySummaries.$inferSelect;

export type InsertIngredientPricing = z.infer<typeof insertIngredientPricingSchema>;
export type IngredientPricing = typeof ingredientPricing.$inferSelect;

// ============================================
// MEMBERSHIP TIERS
// ============================================

export const membershipTiers = pgTable("membership_tiers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tierKey: text("tier_key").notNull().unique(), // 'founding' | 'early' | 'beta' | 'standard'
  name: text("name").notNull(), // Display name: "Founding Member"
  priceCents: integer("price_cents").notNull(), // Monthly price in cents (900 = $9 founding)
  maxCapacity: integer("max_capacity"), // Max spots (100, 500, 2000, null for unlimited)
  currentCount: integer("current_count").default(0).notNull(), // Current members at this tier
  sortOrder: integer("sort_order").default(0).notNull(), // For display ordering
  isActive: boolean("is_active").default(true).notNull(), // Whether tier is available
  benefits: json("benefits").$type<string[]>(), // Array of benefit descriptions
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMembershipTierSchema = createInsertSchema(membershipTiers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMembershipTier = z.infer<typeof insertMembershipTierSchema>;
export type MembershipTier = typeof membershipTiers.$inferSelect;

// ============================================
// BLOG POSTS
// ============================================

export const blogPosts = pgTable("blog_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 500 }).notNull(),
  metaTitle: varchar("meta_title", { length: 70 }),
  metaDescription: varchar("meta_description", { length: 160 }),
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  category: varchar("category", { length: 100 }),
  tags: text("tags").array(),
  tier: varchar("tier", { length: 50 }),
  primaryKeyword: varchar("primary_keyword", { length: 255 }),
  secondaryKeywords: text("secondary_keywords").array(),
  wordCount: integer("word_count"),
  readTimeMinutes: integer("read_time_minutes"),
  schemaJson: text("schema_json"),
  internalLinks: text("internal_links").array(),
  featuredImage: varchar("featured_image", { length: 500 }),
  isPublished: boolean("is_published").default(true).notNull(),
  publishedAt: timestamp("published_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  authorName: varchar("author_name", { length: 255 }).default('Ones Editorial Team'),
  viewCount: integer("view_count").default(0),
});

export const insertBlogPostSchema = createInsertSchema(blogPosts).omit({ id: true, updatedAt: true, viewCount: true });
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;

// ============================================
// KEYWORD DATA  (populated by scripts/seed-keywords.cjs via DataForSEO)
// ============================================

export const keywordData = pgTable("keyword_data", {
  keyword:     varchar("keyword", { length: 500 }).primaryKey(),
  volume:      integer("volume").notNull().default(0),
  kd:          integer("kd").notNull().default(0),          // competition_index 0-100
  cpc:         decimal("cpc", { precision: 8, scale: 2 }).notNull().default('0'),
  competition: varchar("competition", { length: 20 }),      // LOW / MEDIUM / HIGH
  source:      varchar("source", { length: 50 }).default('dataforseo'),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type KeywordData = typeof keywordData.$inferSelect;

// Membership tier keys for type safety
export const MEMBERSHIP_TIERS = {
  FOUNDING: 'founding',
  EARLY: 'early',
  BETA: 'beta',
  STANDARD: 'standard',
} as const;

export type MembershipTierKey = typeof MEMBERSHIP_TIERS[keyof typeof MEMBERSHIP_TIERS];

export type MessageFormulaIngredientPayload = {
  name: string;
  dose: string;
  purpose?: string;
};

export type MessageFormulaPayload = {
  bases: MessageFormulaIngredientPayload[];
  additions: MessageFormulaIngredientPayload[];
  totalMg: number;
  warnings?: string[];
  rationale?: string;
  disclaimers?: string[];
  targetCapsules?: number;
};

// ============================================
// LIVE CHAT SYSTEM
// ============================================

export const liveChatStatusEnum = pgEnum('live_chat_status', ['active', 'waiting', 'closed']);
export const liveChatSenderEnum = pgEnum('live_chat_sender', ['user', 'admin', 'bot']);

export const liveChatSessions = pgTable("live_chat_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  guestEmail: text("guest_email"),
  guestName: text("guest_name"),
  guestToken: varchar("guest_token"), // secure session token for guest auth
  status: liveChatStatusEnum("status").default('active').notNull(),
  subject: text("subject"),
  assignedTo: varchar("assigned_to").references(() => users.id, { onDelete: "set null" }),
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
  adminLastReadAt: timestamp("admin_last_read_at"),
  userLastReadAt: timestamp("user_last_read_at"),
  closedAt: timestamp("closed_at"),
  closedBy: varchar("closed_by").references(() => users.id, { onDelete: "set null" }),
  metadata: json("metadata").$type<{
    userAgent?: string;
    page?: string;
    referrer?: string;
    device?: string;
    rating?: number;
    ratingComment?: string;
    ratedAt?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const liveChatMessages = pgTable("live_chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => liveChatSessions.id, { onDelete: "cascade" }),
  sender: liveChatSenderEnum("sender").notNull(),
  senderId: varchar("sender_id").references(() => users.id, { onDelete: "set null" }),
  content: text("content").notNull(),
  attachments: json("attachments").$type<Array<{
    name: string;
    url: string;
    type: string; // mime type
    size: number; // bytes
  }>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Canned responses for admin quick replies
export const liveChatCannedResponses = pgTable("live_chat_canned_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shortcut: varchar("shortcut", { length: 50 }).notNull(), // e.g. "/shipping"
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  category: varchar("category", { length: 100 }),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  usageCount: integer("usage_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas
export const insertLiveChatSessionSchema = createInsertSchema(liveChatSessions).omit({ id: true, createdAt: true, lastMessageAt: true });
export const insertLiveChatMessageSchema = createInsertSchema(liveChatMessages).omit({ id: true, createdAt: true });
export const insertLiveChatCannedResponseSchema = createInsertSchema(liveChatCannedResponses).omit({ id: true, createdAt: true, updatedAt: true, usageCount: true });

// Types
export type InsertLiveChatSession = z.infer<typeof insertLiveChatSessionSchema>;
export type LiveChatSession = typeof liveChatSessions.$inferSelect;
export type InsertLiveChatMessage = z.infer<typeof insertLiveChatMessageSchema>;
export type LiveChatMessage = typeof liveChatMessages.$inferSelect;
export type InsertLiveChatCannedResponse = z.infer<typeof insertLiveChatCannedResponseSchema>;
export type LiveChatCannedResponse = typeof liveChatCannedResponses.$inferSelect;

// ============================================
// AI USAGE TRACKING
// ============================================

export const aiUsageLogs = pgTable("ai_usage_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }), // null for anonymous/system calls
  provider: varchar("provider", { length: 20 }).notNull(), // 'openai' | 'anthropic'
  model: varchar("model", { length: 100 }).notNull(), // e.g. 'gpt-4o', 'claude-sonnet-4-6'
  feature: varchar("feature", { length: 50 }).notNull(), // 'chat', 'formula', 'lab_analysis', 'blog', 'live_chat', 'optimize', 'agent'
  promptTokens: integer("prompt_tokens").default(0).notNull(),
  completionTokens: integer("completion_tokens").default(0).notNull(),
  totalTokens: integer("total_tokens").default(0).notNull(),
  estimatedCostCents: integer("estimated_cost_cents").default(0).notNull(), // Cost in cents (e.g. 12 = $0.12)
  durationMs: integer("duration_ms"), // How long the API call took
  sessionId: varchar("session_id"), // Optional chat session ID for correlation
  metadata: json("metadata").$type<Record<string, any>>(), // Extra context
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAiUsageLogSchema = createInsertSchema(aiUsageLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAiUsageLog = z.infer<typeof insertAiUsageLogSchema>;
export type AiUsageLog = typeof aiUsageLogs.$inferSelect;

// ── Outreach Agent System ────────────────────────────────────────────────────

export const outreachCategoryEnum = pgEnum('outreach_category', ['podcast', 'press', 'investor']);

export const outreachSubTypeEnum = pgEnum('outreach_sub_type', [
  // podcast sub-types
  'interview', 'panel', 'solo_feature',
  // press sub-types
  'product_review', 'guest_article', 'founder_feature', 'expert_source',
  // investor sub-types
  'angel', 'seed_vc', 'series_a', 'growth_vc', 'family_office',
]);

export const outreachProspectStatusEnum = pgEnum('outreach_prospect_status', [
  'new', 'pitched', 'responded', 'booked', 'published', 'rejected', 'cold', 'manually_contacted',
]);

export const outreachContactMethodEnum = pgEnum('outreach_contact_method', [
  'email', 'form', 'dm', 'unknown',
]);

export const outreachPitchStatusEnum = pgEnum('outreach_pitch_status', [
  'draft', 'pending_review', 'approved', 'sent', 'skipped', 'rejected',
]);

export const agentRunStatusEnum = pgEnum('agent_run_status', [
  'running', 'completed', 'failed', 'paused',
]);

/** Prospects discovered by the Outreach Agent */
export const outreachProspects = pgTable("outreach_prospects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  normalizedName: text("normalized_name"),
  category: outreachCategoryEnum("category").notNull(),
  subType: outreachSubTypeEnum("sub_type"),
  url: text("url").notNull(),
  normalizedUrl: text("normalized_url").unique(),
  contactEmail: text("contact_email"),
  contactFormUrl: text("contact_form_url"),
  hostName: text("host_name"),
  publicationName: text("publication_name"),
  audienceEstimate: text("audience_estimate"),
  relevanceScore: integer("relevance_score"),
  scoreBreakdown: json("score_breakdown").$type<{
    topicRelevance: number;
    audienceSize: number;
    recency: number;
    accessibility: number;
    brandAlignment: number;
  }>(),
  topics: json("topics").$type<string[]>(),
  status: outreachProspectStatusEnum("status").default('new').notNull(),
  contactMethod: outreachContactMethodEnum("contact_method").default('unknown').notNull(),
  formFields: json("form_fields").$type<Array<{
    id: string;
    label: string;
    type: string;
    name: string;
    required: boolean;
  }>>(),
  notes: text("notes"),
  enrichmentData: json("enrichment_data").$type<{
    episodeCount?: number;
    lastPublishDate?: string;
    rssFeedUrl?: string;
    socialLinks?: string[];
    enrichmentScore?: number;
    enrichedAt?: string;
  }>(),
  leadTier: varchar("lead_tier", { length: 10 }), // strong | medium | weak
  lastContactedAt: timestamp("last_contacted_at"),
  responseClassification: varchar("response_classification", { length: 30 }), // interested | declined | ask_later | forwarded | auto_reply
  discoveredAt: timestamp("discovered_at").defaultNow().notNull(),
  source: varchar("source", { length: 50 }).default('web_search').notNull(),
});

/** Pitches drafted by the Outreach Agent, reviewed/approved by human */
export const outreachPitches = pgTable("outreach_pitches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  prospectId: varchar("prospect_id").notNull().references(() => outreachProspects.id, { onDelete: "cascade" }),
  category: outreachCategoryEnum("category").notNull(),
  pitchType: varchar("pitch_type", { length: 30 }).default('initial').notNull(), // initial | follow_up_1 | follow_up_2
  templateUsed: varchar("template_used", { length: 50 }), // podcast_guest | product_review | guest_article | expert_source | founder_feature
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  formAnswers: json("form_answers").$type<Record<string, string>>(),
  formScreenshotFilled: text("form_screenshot_filled"), // path to screenshot of filled form
  formScreenshotSubmitted: text("form_screenshot_submitted"), // path to screenshot after submit
  status: outreachPitchStatusEnum("status").default('draft').notNull(),
  reviewedBy: varchar("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),
  sentAt: timestamp("sent_at"),
  sentVia: varchar("sent_via", { length: 20 }), // gmail | form_auto | form_manual
  responseReceived: boolean("response_received").default(false).notNull(),
  responseAt: timestamp("response_at"),
  responseSummary: text("response_summary"),
  responseClassification: varchar("response_classification", { length: 30 }), // interested | declined | ask_later | forwarded | auto_reply
  followUpDueAt: timestamp("follow_up_due_at"),
  qualityScore: integer("quality_score"),
  qualityFlags: json("quality_flags").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Agent run history for auditing and debugging */
export const agentRuns = pgTable("agent_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentName: varchar("agent_name", { length: 50 }).notNull(), // 'pr_scan' | 'pr_pitch_batch'
  status: agentRunStatusEnum("status").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  prospectsFound: integer("prospects_found").default(0).notNull(),
  pitchesDrafted: integer("pitches_drafted").default(0).notNull(),
  tokensUsed: integer("tokens_used").default(0).notNull(),
  costUsd: decimal("cost_usd", { precision: 10, scale: 4 }),
  errorMessage: text("error_message"),
  runLog: json("run_log").$type<Array<{
    timestamp: string;
    action: string;
    result: string;
    details?: any;
  }>>(),
});

/** Journalist/editor contacts discovered at a prospect publication */
export const prospectContacts = pgTable("prospect_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  prospectId: varchar("prospect_id").notNull().references(() => outreachProspects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: text("role"),                           // "Staff Writer", "Editor", "Contributor"
  email: text("email"),
  linkedinUrl: text("linkedin_url"),
  twitterHandle: text("twitter_handle"),        // "@handle"
  beat: text("beat"),                           // "supplements", "health tech", "nutrition"
  recentArticles: json("recent_articles").$type<string[]>(),
  confidenceScore: integer("confidence_score"), // 0–100
  isPrimary: boolean("is_primary").default(false).notNull(), // preferred contact at this outlet
  notes: text("notes"),
  discoveredAt: timestamp("discovered_at").defaultNow().notNull(),
});

// Insert schemas
export const insertOutreachProspectSchema = createInsertSchema(outreachProspects).omit({ id: true, discoveredAt: true });
export const insertOutreachPitchSchema = createInsertSchema(outreachPitches).omit({ id: true, createdAt: true });
export const insertAgentRunSchema = createInsertSchema(agentRuns).omit({ id: true, startedAt: true });
export const insertProspectContactSchema = createInsertSchema(prospectContacts).omit({ id: true, discoveredAt: true });

// Types
export type OutreachProspect = typeof outreachProspects.$inferSelect;
export type InsertOutreachProspect = z.infer<typeof insertOutreachProspectSchema>;
export type OutreachPitch = typeof outreachPitches.$inferSelect;
export type InsertOutreachPitch = z.infer<typeof insertOutreachPitchSchema>;
export type AgentRun = typeof agentRuns.$inferSelect;
export type InsertAgentRun = z.infer<typeof insertAgentRunSchema>;
export type ProspectContact = typeof prospectContacts.$inferSelect;
export type InsertProspectContact = z.infer<typeof insertProspectContactSchema>;

// ─── CRM System (Unified Contacts, Deals, Activities) ───────────────────────

export const crmContactTypeEnum = pgEnum('crm_contact_type', ['person', 'company']);

export const crmDealStageEnum = pgEnum('crm_deal_stage', [
  'lead', 'contacted', 'responded', 'meeting', 'negotiation', 'closed_won', 'closed_lost',
]);

export const crmDealCategoryEnum = pgEnum('crm_deal_category', [
  'podcast', 'press', 'investor', 'b2b', 'partnership', 'other',
]);

export const crmActivityTypeEnum = pgEnum('crm_activity_type', [
  'email_sent', 'email_received', 'call', 'meeting', 'note', 'task',
  'status_change', 'pitch_drafted', 'pitch_approved', 'pitch_sent',
  'form_submitted', 'follow_up_sent', 'response_detected', 'deal_stage_changed',
]);

/** Universal contact registry — every person or company you interact with */
export const crmContacts = pgTable("crm_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  title: text("title"),
  type: crmContactTypeEnum("type").default('person').notNull(),
  linkedinUrl: text("linkedin_url"),
  twitterHandle: text("twitter_handle"),
  website: text("website"),
  avatarUrl: text("avatar_url"),
  tags: json("tags").$type<string[]>().default([]),
  customFields: json("custom_fields").$type<Record<string, any>>().default({}),
  source: varchar("source", { length: 50 }),
  leadScore: integer("lead_score").default(0),
  // Link back to outreach system (nullable — not all contacts come from agent)
  outreachProspectId: varchar("outreach_prospect_id").references(() => outreachProspects.id, { onDelete: "set null" }),
  b2bProspectId: varchar("b2b_prospect_id").references(() => b2bProspects.id, { onDelete: "set null" }),
  notes: text("notes"),
  lastActivityAt: timestamp("last_activity_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("crm_contacts_email_idx").on(table.email),
  index("crm_contacts_company_idx").on(table.company),
  index("crm_contacts_source_idx").on(table.source),
  index("crm_contacts_outreach_prospect_idx").on(table.outreachProspectId),
]);

/** Deals / opportunities — tracks pipeline progress for any category */
export const crmDeals = pgTable("crm_deals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contactId: varchar("contact_id").notNull().references(() => crmContacts.id, { onDelete: "cascade" }),
  // Optional link to outreach prospect for agent-discovered deals
  outreachProspectId: varchar("outreach_prospect_id").references(() => outreachProspects.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  stage: crmDealStageEnum("stage").default('lead').notNull(),
  category: crmDealCategoryEnum("category").default('other').notNull(),
  valueCents: integer("value_cents"),
  currency: varchar("currency", { length: 3 }).default('USD'),
  probability: integer("probability"), // 0-100
  expectedCloseDate: timestamp("expected_close_date"),
  actualCloseDate: timestamp("actual_close_date"),
  owner: varchar("owner", { length: 100 }),
  tags: json("tags").$type<string[]>().default([]),
  customFields: json("custom_fields").$type<Record<string, any>>().default({}),
  notes: text("notes"),
  lostReason: text("lost_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
}, (table) => [
  index("crm_deals_contact_idx").on(table.contactId),
  index("crm_deals_stage_idx").on(table.stage),
  index("crm_deals_category_idx").on(table.category),
  index("crm_deals_outreach_prospect_idx").on(table.outreachProspectId),
]);

/** Activity timeline — every interaction, note, task, and agent event */
export const crmActivities = pgTable("crm_activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contactId: varchar("contact_id").notNull().references(() => crmContacts.id, { onDelete: "cascade" }),
  dealId: varchar("deal_id").references(() => crmDeals.id, { onDelete: "set null" }),
  type: crmActivityTypeEnum("type").notNull(),
  subject: text("subject"),
  body: text("body"),
  metadata: json("metadata").$type<Record<string, any>>(), // Extra context (email IDs, pitch IDs, etc.)
  // Task / reminder fields
  dueAt: timestamp("due_at"),
  completedAt: timestamp("completed_at"),
  isPinned: boolean("is_pinned").default(false).notNull(),
  createdBy: varchar("created_by", { length: 100 }), // 'system' | 'agent' | admin user ID
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("crm_activities_contact_idx").on(table.contactId),
  index("crm_activities_deal_idx").on(table.dealId),
  index("crm_activities_type_idx").on(table.type),
  index("crm_activities_due_at_idx").on(table.dueAt),
  index("crm_activities_created_at_idx").on(table.createdAt),
]);

/** Saved views — custom filters + column sets for contacts, deals, etc. */
export const crmSavedViews = pgTable("crm_saved_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  entity: varchar("entity", { length: 20 }).notNull(), // 'contacts' | 'deals' | 'activities'
  filters: json("filters").$type<Record<string, any>>().default({}),
  sort: json("sort").$type<{ field: string; direction: 'asc' | 'desc' }[]>().default([]),
  columns: json("columns").$type<string[]>(),
  isDefault: boolean("is_default").default(false).notNull(),
  createdBy: varchar("created_by", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// CRM Insert schemas
export const insertCrmContactSchema = createInsertSchema(crmContacts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCrmDealSchema = createInsertSchema(crmDeals).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCrmActivitySchema = createInsertSchema(crmActivities).omit({ id: true, createdAt: true });
export const insertCrmSavedViewSchema = createInsertSchema(crmSavedViews).omit({ id: true, createdAt: true });

// CRM Types
export type CrmContact = typeof crmContacts.$inferSelect;
export type InsertCrmContact = z.infer<typeof insertCrmContactSchema>;
export type CrmDeal = typeof crmDeals.$inferSelect;
export type InsertCrmDeal = z.infer<typeof insertCrmDealSchema>;
export type CrmActivity = typeof crmActivities.$inferSelect;
export type InsertCrmActivity = z.infer<typeof insertCrmActivitySchema>;
export type CrmSavedView = typeof crmSavedViews.$inferSelect;
export type InsertCrmSavedView = z.infer<typeof insertCrmSavedViewSchema>;

export const aiSupportDraftStatusEnum = pgEnum('ai_support_draft_status', ['pending', 'approved', 'edited', 'dismissed']);
export const aiSupportDraftSourceEnum = pgEnum('ai_support_draft_source', ['ticket', 'live_chat']);

export const aiSupportDrafts = pgTable("ai_support_drafts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  /** 'ticket' or 'live_chat' */
  source: aiSupportDraftSourceEnum("source").notNull(),
  /** Reference to either supportTickets.id or liveChatSessions.id */
  sourceId: varchar("source_id").notNull(),
  /** The user/customer who submitted the ticket or started the chat */
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  /** Summary of the customer's issue, generated by AI */
  summary: text("summary").notNull(),
  /** AI-generated draft response ready for admin review */
  draftResponse: text("draft_response").notNull(),
  /** Admin-edited version (populated when admin edits before sending) */
  editedResponse: text("edited_response"),
  /** pending → approved/edited/dismissed */
  status: aiSupportDraftStatusEnum("status").default('pending').notNull(),
  /** Which AI model generated the draft */
  model: text("model"),
  /** Admin who reviewed this draft */
  reviewedBy: varchar("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  /** When the admin reviewed/actioned the draft */
  reviewedAt: timestamp("reviewed_at"),
  /** Additional context: ticket subject, chat metadata, etc. */
  metadata: json("metadata").$type<{
    subject?: string;
    category?: string;
    priority?: string;
    guestEmail?: string;
    guestName?: string;
    messageCount?: number;
    lastCustomerMessage?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schema
export const insertAiSupportDraftSchema = createInsertSchema(aiSupportDrafts).omit({ id: true, createdAt: true });

// Types
export type AiSupportDraft = typeof aiSupportDrafts.$inferSelect;
export type InsertAiSupportDraft = z.infer<typeof insertAiSupportDraftSchema>;

// ─── Notification Log (cross-scheduler dedup) ────────────────────────────────

export const notificationChannelEnum = pgEnum('notification_channel', ['email', 'sms', 'in_app']);

export const notificationLog = pgTable("notification_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  /** Which scheduler/service sent it: formula_review | smart_reorder | sms_renewal */
  source: varchar("source", { length: 50 }).notNull(),
  /** Notification topic for dedup: renewal_nudge | reorder_review | formula_drift */
  topic: varchar("topic", { length: 50 }).notNull(),
  /** email | sms | in_app */
  channel: notificationChannelEnum("channel").notNull(),
  /** Optional metadata (drift score, days until renewal, etc.) */
  metadata: json("metadata").$type<Record<string, any>>(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

// Insert schema
export const insertNotificationLogSchema = createInsertSchema(notificationLog).omit({ id: true, sentAt: true });

// Types
export type NotificationLogEntry = typeof notificationLog.$inferSelect;
export type InsertNotificationLogEntry = z.infer<typeof insertNotificationLogSchema>;

// ============================================
// MANUFACTURER INGREDIENT CATALOG
// ============================================

export const manufacturerIngredientStatusEnum = pgEnum('manufacturer_ingredient_status', ['active', 'discontinued']);

export const manufacturerIngredients = pgTable("manufacturer_ingredients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  status: manufacturerIngredientStatusEnum("status").default('active').notNull(),
  firstSeenAt: timestamp("first_seen_at").defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  discontinuedAt: timestamp("discontinued_at"),
}, (table) => [
  index("manufacturer_ingredients_status_idx").on(table.status),
  index("manufacturer_ingredients_name_idx").on(table.name),
]);

export const manufacturerCatalogSyncLogs = pgTable("manufacturer_catalog_sync_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
  totalFromApi: integer("total_from_api").notNull(),
  newIngredients: integer("new_ingredients").default(0).notNull(),
  discontinuedIngredients: integer("discontinued_ingredients").default(0).notNull(),
  reactivatedIngredients: integer("reactivated_ingredients").default(0).notNull(),
  addedNames: json("added_names").$type<string[]>(),
  removedNames: json("removed_names").$type<string[]>(),
  reactivatedNames: json("reactivated_names").$type<string[]>(),
});

// Insert schemas
export const insertManufacturerIngredientSchema = createInsertSchema(manufacturerIngredients).omit({ id: true, firstSeenAt: true, lastSeenAt: true });
export const insertManufacturerCatalogSyncLogSchema = createInsertSchema(manufacturerCatalogSyncLogs).omit({ id: true, syncedAt: true });

// Types
export type ManufacturerIngredient = typeof manufacturerIngredients.$inferSelect;
export type InsertManufacturerIngredient = z.infer<typeof insertManufacturerIngredientSchema>;
export type ManufacturerCatalogSyncLog = typeof manufacturerCatalogSyncLogs.$inferSelect;
export type InsertManufacturerCatalogSyncLog = z.infer<typeof insertManufacturerCatalogSyncLogSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// UGC Ad Studio — AI-powered UGC video ad creation pipeline
// ═══════════════════════════════════════════════════════════════════════════

// UGC Campaigns — top-level container for each ad creation project
export const ugcCampaigns = pgTable("ugc_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  status: text("status").default('research').notNull(), // research, scripting, characters, video, complete, archived
  productName: text("product_name").notNull(),
  productDescription: text("product_description"),
  productUrls: json("product_urls").$type<string[]>(), // listing URLs (Amazon, Shopify, etc.)
  productBenefits: json("product_benefits").$type<string[]>(), // key selling points
  targetAudience: text("target_audience"), // free-form description
  adGoal: text("ad_goal"), // awareness, conversion, retargeting, etc.
  notes: text("notes"),
  assembledVideoUrl: text("assembled_video_url"), // final concatenated video with all scenes + lip-sync + optional music
  assembledAt: timestamp("assembled_at"), // when the final video was last assembled
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("ugc_campaigns_status_idx").on(table.status),
  index("ugc_campaigns_created_at_idx").on(table.createdAt),
]);

// UGC Market Research — AI-generated product & market analysis
export const ugcResearch = pgTable("ugc_research", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull().references(() => ugcCampaigns.id, { onDelete: "cascade" }),
  researchType: text("research_type").notNull(), // product_analysis, market_research, competitor_analysis
  status: text("status").default('generating').notNull(), // generating, complete, failed
  errorMessage: text("error_message"),
  title: text("title").notNull(),
  content: json("content").$type<{
    summary?: string;
    customerPersona?: { demographics?: string; lifestyle?: string; painPoints?: string[]; desires?: string[] };
    customerLanguage?: string[]; // actual phrases customers use
    objections?: string[];
    positiveReactions?: string[]; // what surprised/delighted buyers
    competitorInsights?: string;
    rawFindings?: string;
  }>(),
  sources: json("sources").$type<{ url: string; title: string }[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("ugc_research_campaign_idx").on(table.campaignId),
  index("ugc_research_type_idx").on(table.researchType),
]);

// UGC Viral Hooks — library of hooks from viral content
export const ugcHooks = pgTable("ugc_hooks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").references(() => ugcCampaigns.id, { onDelete: "set null" }), // null = global library
  hookText: text("hook_text").notNull(),
  source: text("source"), // tiktok, instagram, youtube, manual
  sourceUrl: text("source_url"),
  sourceCreator: text("source_creator"), // @handle of original creator
  viewCount: integer("view_count"),
  style: text("style"), // curiosity, problem_solution, storytelling, shock, transformation, social_proof
  category: text("category"), // health, beauty, fitness, supplement, general
  speakingTone: text("speaking_tone"), // casual, excited, skeptical_then_convinced, deadpan, confessional
  structureNotes: text("structure_notes"), // how the full video was structured
  isFavorite: boolean("is_favorite").default(false).notNull(),
  isArchived: boolean("is_archived").default(false).notNull(),
  tags: json("tags").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("ugc_hooks_campaign_idx").on(table.campaignId),
  index("ugc_hooks_style_idx").on(table.style),
  index("ugc_hooks_favorite_idx").on(table.isFavorite),
]);

// UGC Scripts — AI-generated ad scripts with scene breakdowns
export const ugcScripts = pgTable("ugc_scripts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull().references(() => ugcCampaigns.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  status: text("status").default('draft').notNull(), // draft, approved, rejected, archived
  scriptType: text("script_type").default('testimonial').notNull(), // testimonial, problem_solution, before_after, day_in_life, unboxing
  hookInspirationIds: json("hook_inspiration_ids").$type<string[]>(), // which hooks inspired this
  scenes: json("scenes").$type<{
    sceneNumber: number;
    visualDescription: string;
    dialogue: string;
    durationSeconds: number;
    cameraAngle?: string;
    action?: string;
    notes?: string;
  }[]>(),
  totalDurationSeconds: integer("total_duration_seconds"),
  totalScenes: integer("total_scenes"),
  rationale: text("rationale"), // why AI developed this script
  toneNotes: text("tone_notes"), // speaking style guidance
  bannedPhrases: json("banned_phrases").$type<string[]>(), // phrases to avoid
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("ugc_scripts_campaign_idx").on(table.campaignId),
  index("ugc_scripts_status_idx").on(table.status),
]);

// UGC Characters — AI influencer personas with reference images
export const ugcCharacters = pgTable("ugc_characters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").references(() => ugcCampaigns.id, { onDelete: "set null" }), // null = reusable across campaigns
  name: text("name").notNull(),
  demographics: text("demographics"), // age range, ethnicity, body type
  styleDescription: text("style_description"), // clothing, hair, overall vibe
  settingDescription: text("setting_description"), // environment (cozy apartment, kitchen, gym, etc.)
  personalityNotes: text("personality_notes"), // how they come across on camera
  referenceImageUrl: text("reference_image_url"), // approved face reference for identity-consistent generation (PuLID)
  referenceImageId: varchar("reference_image_id"), // FK to ugcGeneratedImages — the approved image used as face reference
  status: text("status").default('draft').notNull(), // draft, generating, approved, archived
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("ugc_characters_campaign_idx").on(table.campaignId),
  index("ugc_characters_status_idx").on(table.status),
]);

// UGC Generated Images — all fal.ai image generations with review workflow
export const ugcGeneratedImages = pgTable("ugc_generated_images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  characterId: varchar("character_id").references(() => ugcCharacters.id, { onDelete: "cascade" }),
  campaignId: varchar("campaign_id").references(() => ugcCampaigns.id, { onDelete: "set null" }),
  imageUrl: text("image_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  promptUsed: text("prompt_used").notNull(), // exact prompt sent to fal.ai
  negativePrompt: text("negative_prompt"),
  modelUsed: text("model_used").notNull(), // fal-ai/flux-pro, fal-ai/nano-banana-2, etc.
  imageType: text("image_type").notNull(), // front_view, side_view, usage_view, product_closeup, lifestyle, b_roll
  aspectRatio: text("aspect_ratio").default('9:16').notNull(),
  status: text("status").default('pending').notNull(), // pending, approved, rejected, revision_requested
  revisionNotes: text("revision_notes"), // user feedback for regeneration
  generationParams: json("generation_params").$type<{
    seed?: number;
    guidance_scale?: number;
    num_inference_steps?: number;
    [key: string]: unknown;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("ugc_images_character_idx").on(table.characterId),
  index("ugc_images_campaign_idx").on(table.campaignId),
  index("ugc_images_status_idx").on(table.status),
  index("ugc_images_type_idx").on(table.imageType),
]);

// UGC Video Scenes — Kling 3.0 video generation prompts & outputs
export const ugcVideoScenes = pgTable("ugc_video_scenes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull().references(() => ugcCampaigns.id, { onDelete: "cascade" }),
  scriptId: varchar("script_id").references(() => ugcScripts.id, { onDelete: "set null" }),
  characterId: varchar("character_id").references(() => ugcCharacters.id, { onDelete: "set null" }),
  startFrameImageId: varchar("start_frame_image_id").references(() => ugcGeneratedImages.id, { onDelete: "set null" }),
  batchNumber: integer("batch_number").notNull(), // generation batch (each batch = up to 3 scenes, 15s)
  sceneNumber: integer("scene_number").notNull(), // scene within batch
  sceneType: text("scene_type").default('dialogue').notNull(), // dialogue, b_roll, product_closeup, transition
  prompt: text("prompt").notNull(), // the Kling 3.0 prompt (30-50 words)
  negativePrompt: text("negative_prompt"),
  dialogue: text("dialogue"), // spoken text for this scene
  shotType: text("shot_type"), // medium_shot, close_up, wide_shot, tight_closeup, low_angle
  cameraMotion: text("camera_motion"), // static, slow_push_in, subtle_sway, pan_left, etc.
  cameraMotionScale: integer("camera_motion_scale"), // 1-10
  durationSeconds: integer("duration_seconds").default(5).notNull(),
  videoUrl: text("video_url"), // generated video URL (silent)
  audioUrl: text("audio_url"), // TTS voiceover audio URL
  mergedVideoUrl: text("merged_video_url"), // final video with audio merged
  voiceId: text("voice_id").default('nova'), // OpenAI TTS voice: alloy, echo, fable, onyx, nova, shimmer
  status: text("status").default('draft').notNull(), // draft, generating, generated, approved, rejected, failed
  generationParams: json("generation_params").$type<{
    cfg_scale?: number;
    resolution?: string;
    aspect_ratio?: string;
    model?: string;
    [key: string]: unknown;
  }>(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("ugc_video_campaign_idx").on(table.campaignId),
  index("ugc_video_script_idx").on(table.scriptId),
  index("ugc_video_batch_idx").on(table.batchNumber),
  index("ugc_video_status_idx").on(table.status),
]);

// UGC Brand Assets — product photos, logos, reference materials for image gen
export const ugcBrandAssets = pgTable("ugc_brand_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").references(() => ugcCampaigns.id, { onDelete: "set null" }), // null = global
  name: text("name").notNull(),
  url: text("url").notNull(),
  assetType: text("asset_type").notNull(), // product_photo, logo, bottle_shot, label, lifestyle_ref, color_palette
  description: text("description"),
  tags: json("tags").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("ugc_brand_assets_campaign_idx").on(table.campaignId),
  index("ugc_brand_assets_type_idx").on(table.assetType),
]);
export const refunds = pgTable("refunds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  status: refundStatusEnum("status").default('pending').notNull(),
  transactionId: text("transaction_id"),
  parentTransactionId: text("parent_transaction_id"),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").default('USD').notNull(),
  reason: text("reason"),
  gatewayResponse: json("gateway_response").$type<any>(),
  modeOfFund: text("mode_of_fund").default('card').notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("refunds_user_id_idx").on(table.userId),
  index("refunds_order_id_idx").on(table.orderId),
  index("refunds_transaction_idx").on(table.transactionId),
]);

// Insert schemas
export const insertUgcCampaignSchema = createInsertSchema(ugcCampaigns).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUgcResearchSchema = createInsertSchema(ugcResearch).omit({ id: true, createdAt: true });
export const insertUgcHookSchema = createInsertSchema(ugcHooks).omit({ id: true, createdAt: true });
export const insertUgcScriptSchema = createInsertSchema(ugcScripts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUgcCharacterSchema = createInsertSchema(ugcCharacters).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUgcGeneratedImageSchema = createInsertSchema(ugcGeneratedImages).omit({ id: true, createdAt: true });
export const insertUgcVideoSceneSchema = createInsertSchema(ugcVideoScenes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUgcBrandAssetSchema = createInsertSchema(ugcBrandAssets).omit({ id: true, createdAt: true });

// Types
export type UgcCampaign = typeof ugcCampaigns.$inferSelect;
export type InsertUgcCampaign = z.infer<typeof insertUgcCampaignSchema>;
export type UgcResearch = typeof ugcResearch.$inferSelect;
export type InsertUgcResearch = z.infer<typeof insertUgcResearchSchema>;
export type UgcHook = typeof ugcHooks.$inferSelect;
export type InsertUgcHook = z.infer<typeof insertUgcHookSchema>;
export type UgcScript = typeof ugcScripts.$inferSelect;
export type InsertUgcScript = z.infer<typeof insertUgcScriptSchema>;
export type UgcCharacter = typeof ugcCharacters.$inferSelect;
export type InsertUgcCharacter = z.infer<typeof insertUgcCharacterSchema>;
export type UgcGeneratedImage = typeof ugcGeneratedImages.$inferSelect;
export type InsertUgcGeneratedImage = z.infer<typeof insertUgcGeneratedImageSchema>;
export type UgcVideoScene = typeof ugcVideoScenes.$inferSelect;
export type InsertUgcVideoScene = z.infer<typeof insertUgcVideoSceneSchema>;
export type UgcBrandAsset = typeof ugcBrandAssets.$inferSelect;
export type InsertUgcBrandAsset = z.infer<typeof insertUgcBrandAssetSchema>;

export type Refund = typeof refunds.$inferSelect;
export type InsertRefund = typeof refunds.$inferInsert;

// Payouts table - tracks fund distribution to admin/vendor after order settlement
export const payouts = pgTable("payouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  recipientType: recipientTypeEnum("recipient_type").notNull(),
  recipientAccountId: text("recipient_account_id").notNull(),
  amountCents: integer("amount_cents").notNull(),
  status: payoutStatusEnum("status").default('pending').notNull(),
  epdPayoutRef: text("epd_payout_ref"),
  attempts: integer("attempts").default(0).notNull(),
  lastError: text("last_error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("payouts_order_id_idx").on(table.orderId),
  index("payouts_status_idx").on(table.status),
]);

export type Payout = typeof payouts.$inferSelect;
export type InsertPayout = typeof payouts.$inferInsert;
