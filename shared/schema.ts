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
  uniqueIndex
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const sexEnum = pgEnum('sex', ['male', 'female', 'other']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'paused', 'cancelled', 'past_due']);
export const subscriptionPlanEnum = pgEnum('subscription_plan', ['monthly', 'quarterly', 'annual']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'processing', 'shipped', 'delivered', 'cancelled']);
export const chatStatusEnum = pgEnum('chat_status', ['active', 'completed', 'archived']);
export const messageRoleEnum = pgEnum('message_role', ['user', 'assistant', 'system']);
export const addressTypeEnum = pgEnum('address_type', ['shipping', 'billing']);
export const fileTypeEnum = pgEnum('file_type', ['lab_report', 'medical_document', 'prescription', 'other']);
export const auditActionEnum = pgEnum('audit_action', ['upload', 'view', 'download', 'delete', 'share', 'access_denied']);
export const consentTypeEnum = pgEnum('consent_type', ['lab_data_processing', 'ai_analysis', 'data_retention', 'third_party_sharing']);
export const notificationTypeEnum = pgEnum('notification_type', ['order_update', 'formula_update', 'consultation_reminder', 'system']);
export const evidenceLevelEnum = pgEnum('evidence_level', ['strong', 'moderate', 'preliminary', 'limited']);
export const studyTypeEnum = pgEnum('study_type', ['rct', 'meta_analysis', 'systematic_review', 'observational', 'case_study', 'review']);
export const reviewFrequencyEnum = pgEnum('review_frequency', ['monthly', 'bimonthly', 'quarterly']);
export const wearableProviderEnum = pgEnum('wearable_provider', ['fitbit', 'oura', 'whoop']);
export const wearableConnectionStatusEnum = pgEnum('wearable_connection_status', ['connected', 'disconnected', 'error', 'token_expired']);
export const streakTypeEnum = pgEnum('streak_type', ['overall', 'nutrition', 'workout', 'supplements', 'lifestyle']);
// Users table - updated with name, email, phone, password
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  password: text("password").notNull(),

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
  membershipPriceCents: integer("membership_price_cents"), // Price locked at signup (e.g., 1900 = $19)
  membershipLockedAt: timestamp("membership_locked_at"), // When they locked in their tier
  membershipCancelledAt: timestamp("membership_cancelled_at"), // If they cancelled
  stripeCustomerId: text("stripe_customer_id"), // Stripe customer ID for billing
  stripeSubscriptionId: text("stripe_subscription_id"), // Stripe subscription ID

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Password reset tokens
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
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

  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Chat sessions for conversational interface
export const chatSessions = pgTable("chat_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: chatStatusEnum("status").default('active').notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Messages within chat sessions
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => chatSessions.id, { onDelete: "cascade" }),
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  model: text("model"), // Track which AI model responded (gpt-4, gpt-5, etc.)
  formula: json("formula").$type<{
    bases: Array<{ name: string, dose: string, purpose?: string }>;
    additions: Array<{ name: string, dose: string, purpose?: string }>;
    totalMg: number;
    warnings?: string[];
    rationale?: string;
    disclaimers?: string[];
  }>(), // Formula data if AI created one in this message
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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

  rationale: text("rationale"),
  warnings: json("warnings").$type<string[]>().default([]),
  disclaimers: json("disclaimers").$type<string[]>().default([]),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  archivedAt: timestamp("archived_at"), // Null = active, timestamp = archived
});

// Formula version changes for tracking modifications
export const formulaVersionChanges = pgTable("formula_version_changes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  formulaId: varchar("formula_id").notNull().references(() => formulas.id, { onDelete: "cascade" }),
  summary: text("summary").notNull(),
  rationale: text("rationale").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Subscriptions with Stripe integration
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  plan: subscriptionPlanEnum("plan").notNull(),
  status: subscriptionStatusEnum("status").default('active').notNull(),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  renewsAt: timestamp("renews_at"),
  pausedUntil: timestamp("paused_until"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Orders for supplement deliveries
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  formulaVersion: integer("formula_version").notNull(),
  status: orderStatusEnum("status").default('pending').notNull(),
  amountCents: integer("amount_cents"), // Order total in cents (e.g., 12000 = $120.00)
  supplyMonths: integer("supply_months"), // 3, 6, or 12 month supply
  trackingUrl: text("tracking_url"),
  placedAt: timestamp("placed_at").defaultNow().notNull(),
  shippedAt: timestamp("shipped_at"),
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

// Stripe payment method references
export const paymentMethodRefs = pgTable("payment_method_refs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  stripePaymentMethodId: varchar("stripe_payment_method_id").notNull(),
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
    extractedData?: Record<string, any>;
  }>(),
  // Soft delete for compliance (never actually delete PHI)
  deletedAt: timestamp("deleted_at"),
  deletedBy: varchar("deleted_by").references(() => users.id),
});

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
  smsReminders: boolean("sms_reminders").default(false).notNull(),

  // Calendar integration
  calendarIntegration: text("calendar_integration"), // 'google', 'apple', 'outlook', null

  // Active status
  isActive: boolean("is_active").default(true).notNull(),

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

export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

export type InsertAddress = z.infer<typeof insertAddressSchema>;
export type Address = typeof addresses.$inferSelect;

export type InsertPaymentMethodRef = z.infer<typeof insertPaymentMethodRefSchema>;
export type PaymentMethodRef = typeof paymentMethodRefs.$inferSelect;

export type InsertFileUpload = z.infer<typeof insertFileUploadSchema>;
export type FileUpload = typeof fileUploads.$inferSelect;

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

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

// Auth-specific schemas
export const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
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
  consentType: z.enum(['lab_data_processing', 'ai_analysis', 'data_retention', 'third_party_sharing']),
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
  connectionId: varchar("connection_id").notNull().references(() => wearableConnections.id, { onDelete: "cascade" }),
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

// Reorder recommendations - AI-generated formula adjustments before reorder
export const reorderRecommendations = pgTable("reorder_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  currentFormulaId: varchar("current_formula_id").notNull().references(() => formulas.id),

  // AI analysis results
  analysisStatus: text("analysis_status").default('pending').notNull(), // pending, analyzing, completed, error
  biometricSummary: json("biometric_summary").$type<{
    sleepChange?: string;
    hrvChange?: string;
    recoveryChange?: string;
    activityChange?: string;
    dataQuality?: string;
  }>(),

  // Recommended formula changes
  recommendedFormula: json("recommended_formula").$type<{
    bases: Array<{ ingredient: string, amount: number, unit: string, purpose?: string }>;
    additions: Array<{ ingredient: string, amount: number, unit: string, purpose?: string }>;
    totalMg: number;
  }>(),

  changeRationale: text("change_rationale"), // AI explanation of why changes were made
  confidence: integer("confidence"), // 0-100 how confident AI is in recommendations

  // User action tracking
  userApproved: boolean("user_approved"),
  userReviewedAt: timestamp("user_reviewed_at"),
  adminReviewRequired: boolean("admin_review_required").default(false).notNull(),
  adminReviewedBy: varchar("admin_reviewed_by").references(() => users.id),
  adminReviewedAt: timestamp("admin_reviewed_at"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// FAQ items table
export const faqItems = pgTable("faq_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  isPublished: boolean("is_published").default(true).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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

// Help articles table
export const helpArticles = pgTable("help_articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  isPublished: boolean("is_published").default(true).notNull(),
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

export const insertReorderRecommendationSchema = createInsertSchema(reorderRecommendations).omit({
  id: true,
  createdAt: true,
});

// Wearable integration types
export type InsertWearableConnection = z.infer<typeof insertWearableConnectionSchema>;
export type WearableConnection = typeof wearableConnections.$inferSelect;

export type InsertBiometricData = z.infer<typeof insertBiometricDataSchema>;
export type BiometricData = typeof biometricData.$inferSelect;

export type InsertBiometricTrend = z.infer<typeof insertBiometricTrendSchema>;
export type BiometricTrend = typeof biometricTrends.$inferSelect;

export type InsertReorderRecommendation = z.infer<typeof insertReorderRecommendationSchema>;
export type ReorderRecommendation = typeof reorderRecommendations.$inferSelect;

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

// ============================================
// MEMBERSHIP TIERS
// ============================================

export const membershipTiers = pgTable("membership_tiers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tierKey: text("tier_key").notNull().unique(), // 'founding' | 'early' | 'beta' | 'standard'
  name: text("name").notNull(), // Display name: "Founding Member"
  priceCents: integer("price_cents").notNull(), // Monthly price in cents (1900 = $19)
  maxCapacity: integer("max_capacity"), // Max spots (250, 1000, 5000, null for unlimited)
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
