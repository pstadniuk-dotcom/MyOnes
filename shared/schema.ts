import { sql } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  varchar, 
  integer, 
  boolean, 
  timestamp, 
  json,
  pgEnum 
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
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
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
    bases: Array<{name: string, dose: string, purpose?: string}>;
    additions: Array<{name: string, dose: string, purpose?: string}>;
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
  bases: json("bases").$type<Array<{ingredient: string, amount: number, unit: string, purpose?: string}>>().notNull(),
  additions: json("additions").$type<Array<{ingredient: string, amount: number, unit: string, purpose?: string}>>().default([]),
  userCustomizations: json("user_customizations").$type<{
    addedBases?: Array<{ingredient: string, amount: number, unit: string}>;
    addedIndividuals?: Array<{ingredient: string, amount: number, unit: string}>;
  }>().default({}),
  totalMg: integer("total_mg").notNull(),
  rationale: text("rationale"),
  warnings: json("warnings").$type<string[]>().default([]),
  disclaimers: json("disclaimers").$type<string[]>().default([]),
  notes: text("notes"),
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

export const insertNotificationPrefSchema = createInsertSchema(notificationPrefs).omit({
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