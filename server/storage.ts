import { eq, desc, and, isNull, gte, lte, lt, or, ilike, sql, count, inArray } from "drizzle-orm";
import { db } from "./db";
import { encryptToken, decryptToken } from "./tokenEncryption";
import { encryptField, decryptField, encryptFieldSafe, decryptFieldSafe } from "./fieldEncryption";
import { logger } from "./logger";
import { getUserLocalMidnight, getUserLocalDateString } from "./utils/timezone";
import {
  users, healthProfiles, chatSessions, messages, formulas, formulaVersionChanges,
  subscriptions, orders, addresses, paymentMethodRefs, fileUploads, 
  notifications, notificationPrefs, auditLogs, userConsents, labAnalyses,
  faqItems, supportTickets, supportTicketResponses, helpArticles, newsletterSubscribers,
  researchCitations, wearableConnections, appSettings, reviewSchedules,
  optimizePlans, optimizeDailyLogs, workoutPlans, workouts, workoutLogs, workoutPreferences,
  mealPlans, recipes, mealLogs, groceryLists, optimizeSmsPreferences, trackingPreferences, userStreaks,
  dailyCompletions, weeklySummaries, exerciseRecords,
  type User, type InsertUser,
  type HealthProfile, type InsertHealthProfile,
  type ChatSession, type InsertChatSession,
  type Message, type InsertMessage,
  type Formula, type InsertFormula,
  type FormulaVersionChange, type InsertFormulaVersionChange,
  type Subscription, type InsertSubscription,
  type Order, type InsertOrder,
  type Address, type InsertAddress,
  type PaymentMethodRef, type InsertPaymentMethodRef,
  type FileUpload, type InsertFileUpload,
  type Notification, type InsertNotification,
  type NotificationPref, type InsertNotificationPref,
  type AuditLog, type InsertAuditLog,
  type UserConsent, type InsertUserConsent,
  type LabAnalysis, type InsertLabAnalysis,
  type FaqItem, type InsertFaqItem,
  type SupportTicket, type InsertSupportTicket,
  type SupportTicketResponse, type InsertSupportTicketResponse,
  type HelpArticle, type InsertHelpArticle,
  type NewsletterSubscriber, type InsertNewsletterSubscriber,
  type ResearchCitation, type InsertResearchCitation,
  type WearableConnection, type InsertWearableConnection,
  type AppSetting, type InsertAppSetting,
  type ReviewSchedule, type InsertReviewSchedule,
  type OptimizePlan, type InsertOptimizePlan,
  type OptimizeDailyLog, type InsertOptimizeDailyLog,
  type WorkoutPlan, type InsertWorkoutPlan,
  type Workout, type InsertWorkout,
  type WorkoutLog, type InsertWorkoutLog,
  type WorkoutPreferences, type InsertWorkoutPreferences,
  type MealPlan, type InsertMealPlan,
  type Recipe, type InsertRecipe,
  type MealLog, type InsertMealLog,
  type GroceryList, type InsertGroceryList,
  type OptimizeSmsPreferences, type InsertOptimizeSmsPreferences,
  type TrackingPreferences, type InsertTrackingPreferences,
  type UserStreak, type InsertUserStreak,
  type DailyCompletion, type InsertDailyCompletion,
  type WeeklySummary, type InsertWeeklySummary,
  type ExerciseRecord, type InsertExerciseRecord
} from "@shared/schema";

export interface IStorage {
  // User operations  
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  listAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;
  
  // Health Profile operations
  getHealthProfile(userId: string): Promise<HealthProfile | undefined>;
  createHealthProfile(profile: InsertHealthProfile): Promise<HealthProfile>;
  updateHealthProfile(userId: string, updates: Partial<InsertHealthProfile>): Promise<HealthProfile | undefined>;
  
  // Chat Session operations
  getChatSession(id: string): Promise<ChatSession | undefined>;
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  listChatSessionsByUser(userId: string): Promise<ChatSession[]>;
  updateChatSessionStatus(id: string, status: 'active' | 'completed' | 'archived'): Promise<ChatSession | undefined>;
  deleteChatSession(id: string): Promise<void>;
  
  // Message operations
  getMessage(id: string): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  listMessagesBySession(sessionId: string): Promise<Message[]>;
  
  // Formula operations
  getFormula(id: string): Promise<Formula | undefined>;
  createFormula(formula: InsertFormula): Promise<Formula>;
  getCurrentFormulaByUser(userId: string): Promise<Formula | undefined>;
  getFormulaHistory(userId: string): Promise<Formula[]>;
  updateFormulaVersion(userId: string, updates: Partial<InsertFormula>): Promise<Formula>;
  getFormulaByUserAndVersion(userId: string, version: number): Promise<Formula | undefined>;
  updateFormulaCustomizations(formulaId: string, customizations: { addedBases?: any[], addedIndividuals?: any[] }, newTotalMg: number): Promise<Formula>;
  updateFormulaName(formulaId: string, name: string): Promise<Formula>;
  
  // Formula Version Change operations
  createFormulaVersionChange(change: InsertFormulaVersionChange): Promise<FormulaVersionChange>;
  listFormulaVersionChanges(formulaId: string): Promise<FormulaVersionChange[]>;
  
  // Subscription operations
  getSubscription(userId: string): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(userId: string, updates: Partial<InsertSubscription>): Promise<Subscription | undefined>;
  
  // Order operations
  getOrder(id: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  listOrdersByUser(userId: string): Promise<Order[]>;
  updateOrderStatus(id: string, status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled', trackingUrl?: string): Promise<Order | undefined>;
  getOrderWithFormula(orderId: string): Promise<{order: Order, formula: Formula | undefined} | undefined>;
  
  // Address operations
  getAddress(id: string): Promise<Address | undefined>;
  createAddress(address: InsertAddress): Promise<Address>;
  updateAddress(id: string, updates: Partial<InsertAddress>): Promise<Address | undefined>;
  listAddressesByUser(userId: string, type?: 'shipping' | 'billing'): Promise<Address[]>;
  
  // Payment Method operations
  getPaymentMethodRef(id: string): Promise<PaymentMethodRef | undefined>;
  createPaymentMethodRef(paymentMethod: InsertPaymentMethodRef): Promise<PaymentMethodRef>;
  listPaymentMethodsByUser(userId: string): Promise<PaymentMethodRef[]>;
  deletePaymentMethodRef(id: string): Promise<boolean>;
  
  // File Upload operations (enhanced for HIPAA compliance)
  getFileUpload(id: string): Promise<FileUpload | undefined>;
  createFileUpload(fileUpload: InsertFileUpload): Promise<FileUpload>;
  updateFileUpload(id: string, updates: Partial<InsertFileUpload>): Promise<FileUpload | undefined>;
  softDeleteFileUpload(id: string, deletedBy: string): Promise<boolean>;
  listFileUploadsByUser(userId: string, type?: 'lab_report' | 'medical_document' | 'prescription' | 'other', includeDeleted?: boolean): Promise<FileUpload[]>;
  
  // Lab Report specific operations
  getLabReportsByUser(userId: string): Promise<FileUpload[]>;
  getLabReportById(id: string, userId: string): Promise<FileUpload | undefined>;
  updateLabReportData(id: string, labReportData: any, userId: string): Promise<FileUpload | undefined>;
  
  // Audit Log operations (HIPAA compliance)
  createAuditLog(auditLog: InsertAuditLog): Promise<AuditLog>;
  getAuditLogsByFile(fileId: string): Promise<AuditLog[]>;
  getAuditLogsByUser(userId: string, limit?: number): Promise<AuditLog[]>;
  getAuditLogsByDateRange(startDate: Date, endDate: Date): Promise<AuditLog[]>;
  
  // User Consent operations (HIPAA compliance)
  createUserConsent(consent: InsertUserConsent): Promise<UserConsent>;
  getUserConsent(userId: string, consentType: 'lab_data_processing' | 'ai_analysis' | 'data_retention' | 'third_party_sharing'): Promise<UserConsent | undefined>;
  getUserConsents(userId: string): Promise<UserConsent[]>;
  revokeUserConsent(userId: string, consentType: 'lab_data_processing' | 'ai_analysis' | 'data_retention' | 'third_party_sharing'): Promise<boolean>;
  
  // Lab Analysis operations (AI-generated insights)
  createLabAnalysis(analysis: InsertLabAnalysis): Promise<LabAnalysis>;
  getLabAnalysis(fileId: string): Promise<LabAnalysis | undefined>;
  updateLabAnalysis(id: string, updates: Partial<InsertLabAnalysis>): Promise<LabAnalysis | undefined>;
  listLabAnalysesByUser(userId: string): Promise<LabAnalysis[]>;
  
  // Notification Preferences operations
  getNotificationPrefs(userId: string): Promise<NotificationPref | undefined>;
  createNotificationPrefs(prefs: InsertNotificationPref): Promise<NotificationPref>;
  updateNotificationPrefs(userId: string, updates: Partial<InsertNotificationPref>): Promise<NotificationPref | undefined>;
  
  // Notification operations
  getNotification(id: string): Promise<Notification | undefined>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  listNotificationsByUser(userId: string, limit?: number): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  markNotificationAsRead(id: string, userId: string): Promise<Notification | undefined>;
  
  // Support System operations
  // FAQ operations
  getFaqItem(id: string): Promise<FaqItem | undefined>;
  createFaqItem(faqItem: InsertFaqItem): Promise<FaqItem>;
  updateFaqItem(id: string, updates: Partial<InsertFaqItem>): Promise<FaqItem | undefined>;
  listFaqItems(category?: string): Promise<FaqItem[]>;
  deleteFaqItem(id: string): Promise<boolean>;
  
  // Support ticket operations
  getSupportTicket(id: string): Promise<SupportTicket | undefined>;
  createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket>;
  updateSupportTicket(id: string, updates: Partial<InsertSupportTicket>): Promise<SupportTicket | undefined>;
  listSupportTicketsByUser(userId: string): Promise<SupportTicket[]>;
  listAllSupportTickets(status?: string, limit?: number, offset?: number): Promise<{tickets: Array<SupportTicket & {userName: string, userEmail: string}>, total: number}>;
  getSupportTicketWithResponses(id: string, userId: string): Promise<{ticket: SupportTicket, responses: SupportTicketResponse[]} | undefined>;
  
  // Support ticket response operations
  createSupportTicketResponse(response: InsertSupportTicketResponse): Promise<SupportTicketResponse>;
  listSupportTicketResponses(ticketId: string): Promise<SupportTicketResponse[]>;
  
  // Help article operations
  getHelpArticle(id: string): Promise<HelpArticle | undefined>;
  createHelpArticle(article: InsertHelpArticle): Promise<HelpArticle>;
  updateHelpArticle(id: string, updates: Partial<InsertHelpArticle>): Promise<HelpArticle | undefined>;
  listHelpArticles(category?: string): Promise<HelpArticle[]>;
  deleteHelpArticle(id: string): Promise<boolean>;
  incrementHelpArticleViewCount(id: string): Promise<boolean>;
  markAllNotificationsAsRead(userId: string): Promise<boolean>;
  deleteNotification(id: string, userId: string): Promise<boolean>;
  
  // Newsletter subscriber operations
  getNewsletterSubscriberByEmail(email: string): Promise<NewsletterSubscriber | undefined>;
  createNewsletterSubscriber(subscriber: InsertNewsletterSubscriber): Promise<NewsletterSubscriber>;
  reactivateNewsletterSubscriber(email: string): Promise<boolean>;
  
  // Research citations operations
  getResearchCitationsForIngredient(ingredientName: string): Promise<ResearchCitation[]>;
  createResearchCitation(citation: InsertResearchCitation): Promise<ResearchCitation>;
  
  // Admin operations
  getAdminStats(): Promise<{
    totalUsers: number;
    totalPaidUsers: number;
    totalRevenue: number;
    activeUsers: number;
    totalOrders: number;
    totalFormulas: number;
  }>;
  getUserGrowthData(days: number): Promise<Array<{ date: string; users: number; paidUsers: number }>>;
  getRevenueData(days: number): Promise<Array<{ date: string; revenue: number; orders: number }>>;
  searchUsers(query: string, limit: number, offset: number, filter?: string): Promise<{ users: User[]; total: number }>;
  getTodaysOrders(): Promise<Array<Order & { user: { id: string; name: string; email: string }; formula?: Formula }>>;
  getUserTimeline(userId: string): Promise<{
    user: User;
    healthProfile?: HealthProfile;
    formulas: Formula[];
    orders: Array<Order & { formula?: Formula }>;
    chatSessions: ChatSession[];
    fileUploads: FileUpload[];
  }>;
  
  // Wearable device connection operations
  getWearableConnections(userId: string): Promise<WearableConnection[]>;
  getAllWearableConnections(): Promise<WearableConnection[]>;
  getAllWearableConnectionsNearingExpiry(expiryThreshold: Date): Promise<WearableConnection[]>;
  createWearableConnection(connection: InsertWearableConnection): Promise<WearableConnection>;
  updateWearableConnection(id: string, updates: Partial<InsertWearableConnection>): Promise<WearableConnection | undefined>;
  disconnectWearableDevice(id: string, userId: string): Promise<boolean>;
  
  // Biometric data operations
  saveBiometricData(data: {
    userId: string;
    connectionId: string;
    provider: 'fitbit' | 'oura' | 'whoop';
    dataDate: Date;
    sleepScore?: number | null;
    sleepHours?: number | null;
    deepSleepMinutes?: number | null;
    remSleepMinutes?: number | null;
    lightSleepMinutes?: number | null;
    hrvMs?: number | null;
    restingHeartRate?: number | null;
    averageHeartRate?: number | null;
    maxHeartRate?: number | null;
    recoveryScore?: number | null;
    readinessScore?: number | null;
    strainScore?: number | null;
    steps?: number | null;
    caloriesBurned?: number | null;
    activeMinutes?: number | null;
    spo2Percentage?: number | null;
    skinTempCelsius?: number | null;
    respiratoryRate?: number | null;
    rawData?: Record<string, any>;
  }): Promise<void>;
  getBiometricData(userId: string, startDate: Date, endDate: Date): Promise<any[]>;
  getBiometricTrends(userId: string, periodType: 'week' | 'month'): Promise<any | null>;

  // App settings operations (key-value store)
  getAppSetting(key: string): Promise<AppSetting | undefined>;
  upsertAppSetting(key: string, value: Record<string, any>, updatedBy?: string | null): Promise<AppSetting>;
  deleteAppSetting(key: string): Promise<boolean>;
  
  // Review schedule operations
  getReviewSchedule(userId: string, formulaId: string): Promise<ReviewSchedule | undefined>;
  createReviewSchedule(schedule: InsertReviewSchedule): Promise<ReviewSchedule>;
  updateReviewSchedule(id: string, updates: Partial<InsertReviewSchedule>): Promise<ReviewSchedule | undefined>;
  deleteReviewSchedule(id: string): Promise<boolean>;
  getActiveReviewSchedules(): Promise<ReviewSchedule[]>;
  getUpcomingReviews(daysAhead: number): Promise<ReviewSchedule[]>;
}

type DbInsertMessage = typeof messages.$inferInsert;
type DbInsertFormula = typeof formulas.$inferInsert;
type DbInsertFileUpload = typeof fileUploads.$inferInsert;
type DbInsertNotification = typeof notifications.$inferInsert;

type MessageFormulaIngredientPayload = {
  name: string;
  dose: string;
  purpose?: string;
};

type MessageFormulaPayload = {
  bases: MessageFormulaIngredientPayload[];
  additions: MessageFormulaIngredientPayload[];
  totalMg: number;
  warnings?: string[];
  rationale?: string;
  disclaimers?: string[];
};

type LabReportDataShape = {
  testDate?: string;
  testType?: string;
  labName?: string;
  physicianName?: string;
  analysisStatus?: 'pending' | 'processing' | 'completed' | 'error';
  extractedData?: Record<string, any>;
};

type FormulaIngredientPayload = {
  ingredient: string;
  amount: number;
  unit: string;
  purpose?: string;
};

type FormulaCustomizationItemPayload = {
  ingredient: string;
  amount: number;
  unit: string;
};

type FormulaCustomizationPayload = {
  addedBases?: FormulaCustomizationItemPayload[];
  addedIndividuals?: FormulaCustomizationItemPayload[];
};

type NotificationMetadataShape = {
  actionUrl?: string;
  icon?: string;
  priority?: 'low' | 'medium' | 'high';
  additionalData?: Record<string, any>;
};

function normalizeMessageFormula(formula?: unknown): MessageFormulaPayload | null {
  if (!formula || typeof formula !== 'object') {
    return null;
  }

  const payload = formula as Record<string, any>;
  const normalizeIngredient = (item: any): MessageFormulaIngredientPayload => ({
    name: typeof item?.name === 'string'
      ? item.name
      : (typeof item?.ingredient === 'string' ? item.ingredient : 'Unknown Ingredient'),
    dose: typeof item?.dose === 'string'
      ? item.dose
      : (typeof item?.amount === 'number' ? `${item.amount}mg` : String(item?.dose ?? '0mg')),
    purpose: typeof item?.purpose === 'string' ? item.purpose : undefined
  });

  const normalized: MessageFormulaPayload = {
    bases: Array.isArray(payload.bases)
      ? payload.bases.map<MessageFormulaIngredientPayload>(normalizeIngredient)
      : [],
    additions: Array.isArray(payload.additions)
      ? payload.additions.map<MessageFormulaIngredientPayload>(normalizeIngredient)
      : [],
    totalMg: typeof payload.totalMg === 'number' ? payload.totalMg : Number(payload.totalMg) || 0,
    warnings: Array.isArray(payload.warnings) ? payload.warnings.map(String) : undefined,
    rationale: typeof payload.rationale === 'string' ? payload.rationale : undefined,
    disclaimers: Array.isArray(payload.disclaimers) ? payload.disclaimers.map(String) : undefined
  };

  return normalized;
}

function normalizeLabReportData(data?: unknown): DbInsertFileUpload['labReportData'] {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const payload = data as Record<string, any>;
  const normalized: LabReportDataShape = {};

  if (typeof payload.testDate === 'string') normalized.testDate = payload.testDate;
  if (typeof payload.testType === 'string') normalized.testType = payload.testType;
  if (typeof payload.labName === 'string') normalized.labName = payload.labName;
  if (typeof payload.physicianName === 'string') normalized.physicianName = payload.physicianName;
  if (typeof payload.analysisStatus === 'string' && ['pending', 'processing', 'completed', 'error'].includes(payload.analysisStatus)) {
    normalized.analysisStatus = payload.analysisStatus as LabReportDataShape['analysisStatus'];
  }
  if (payload.extractedData && typeof payload.extractedData === 'object') {
    normalized.extractedData = payload.extractedData as Record<string, any>;
  }

  return (Object.keys(normalized).length > 0 ? normalized : null) as DbInsertFileUpload['labReportData'];
}

function normalizeFormulaCustomizations(customizations?: { addedBases?: any[]; addedIndividuals?: any[] }): FormulaCustomizationPayload | undefined {
  const normalizeItem = (item: any): FormulaCustomizationItemPayload => ({
    ingredient: typeof item?.ingredient === 'string' ? item.ingredient : 'unknown',
    amount: typeof item?.amount === 'number' ? item.amount : Number(item?.amount) || 0,
    unit: typeof item?.unit === 'string' ? item.unit : 'mg'
  });

  const result: FormulaCustomizationPayload = {};

  const mapItems = (items?: any[]): FormulaCustomizationItemPayload[] | undefined => {
    if (!Array.isArray(items) || items.length === 0) {
      return undefined;
    }
    const normalized: FormulaCustomizationItemPayload[] = items.map(item => normalizeItem(item));
    return normalized;
  };

  const addedBases = mapItems(customizations?.addedBases);
  if (addedBases) {
    result.addedBases = addedBases;
  }

  const addedIndividuals = mapItems(customizations?.addedIndividuals);
  if (addedIndividuals) {
    result.addedIndividuals = addedIndividuals;
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function normalizeFormulaInsertPayload(formula: InsertFormula): InsertFormula {
  const normalizeIngredient = (item: any): FormulaIngredientPayload => ({
    ingredient: typeof item?.ingredient === 'string' ? item.ingredient : 'unknown',
    amount: typeof item?.amount === 'number' ? item.amount : Number(item?.amount) || 0,
    unit: typeof item?.unit === 'string' ? item.unit : 'mg',
    purpose: typeof item?.purpose === 'string' ? item.purpose : undefined
  });

  const normalizedBases = Array.isArray(formula.bases)
    ? formula.bases.map<FormulaIngredientPayload>(normalizeIngredient)
    : [];
  const normalizedAdditions = Array.isArray(formula.additions)
    ? formula.additions.map<FormulaIngredientPayload>(normalizeIngredient)
    : [];
  const normalizedCustomizations = formula.userCustomizations ? normalizeFormulaCustomizations(formula.userCustomizations as any) : undefined;

  return {
    ...formula,
    bases: normalizedBases as InsertFormula['bases'],
    additions: normalizedAdditions as InsertFormula['additions'],
    userCustomizations: (normalizedCustomizations ?? undefined) as InsertFormula['userCustomizations']
  };
}

function normalizeFormulaIngredients(list?: any[]): FormulaIngredientPayload[] | undefined {
  if (!Array.isArray(list)) {
    return undefined;
  }

  return list.map<FormulaIngredientPayload>(item => ({
    ingredient: typeof item?.ingredient === 'string' ? item.ingredient : 'unknown',
    amount: typeof item?.amount === 'number' ? item.amount : Number(item?.amount) || 0,
    unit: typeof item?.unit === 'string' ? item.unit : 'mg',
    purpose: typeof item?.purpose === 'string' ? item.purpose : undefined
  }));
}

function normalizeNotificationMetadata(metadata?: unknown): NotificationMetadataShape | undefined {
  if (!metadata || typeof metadata !== 'object') {
    return undefined;
  }

  const payload = metadata as Record<string, any>;
  const normalized: NotificationMetadataShape = {};

  if (typeof payload.actionUrl === 'string') normalized.actionUrl = payload.actionUrl;
  if (typeof payload.icon === 'string') normalized.icon = payload.icon;
  if (typeof payload.priority === 'string' && ['low', 'medium', 'high'].includes(payload.priority)) {
    normalized.priority = payload.priority as NotificationMetadataShape['priority'];
  }
  if (payload.additionalData && typeof payload.additionalData === 'object') {
    normalized.additionalData = payload.additionalData as Record<string, any>;
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export class DrizzleStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user || undefined;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user || undefined;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return undefined;
    }
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.getUser(id);
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.phone, phone));
    return user;
  }

  async listAllUsers(): Promise<User[]> {
    try {
      const allUsers = await db.select().from(users);
      return allUsers;
    } catch (error) {
      console.error('Error listing all users:', error);
      return [];
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const [user] = await db.insert(users).values(insertUser).returning();
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    try {
      const [user] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, id))
        .returning();
      return user || undefined;
    } catch (error) {
      console.error('Error updating user:', error);
      return undefined;
    }
  }

  // Health Profile operations
  async getHealthProfile(userId: string): Promise<HealthProfile | undefined> {
    try {
      const [profile] = await db.select().from(healthProfiles).where(eq(healthProfiles.userId, userId));
      if (!profile) return undefined;
      
      // Decrypt sensitive medical fields
      return {
        ...profile,
        conditions: profile.conditions
          ? JSON.parse(decryptField(profile.conditions as any))
          : [],
        medications: profile.medications
          ? JSON.parse(decryptField(profile.medications as any))
          : [],
        allergies: profile.allergies
          ? JSON.parse(decryptField(profile.allergies as any))
          : []
      };
    } catch (error) {
      console.error('Error getting health profile:', error);
      return undefined;
    }
  }

  async createHealthProfile(insertProfile: InsertHealthProfile): Promise<HealthProfile> {
    try {
      // Encrypt sensitive medical fields before storing
      const encryptedProfile = {
        ...insertProfile,
        conditions: insertProfile.conditions && insertProfile.conditions.length > 0
          ? encryptField(JSON.stringify(insertProfile.conditions))
          : null,
        medications: insertProfile.medications && insertProfile.medications.length > 0
          ? encryptField(JSON.stringify(insertProfile.medications))
          : null,
        allergies: insertProfile.allergies && insertProfile.allergies.length > 0
          ? encryptField(JSON.stringify(insertProfile.allergies))
          : null
      };
      
      const [profile] = await db.insert(healthProfiles).values(encryptedProfile as any).returning();
      
      // Decrypt for return
      return {
        ...profile,
        conditions: profile.conditions
          ? JSON.parse(decryptField(profile.conditions as any))
          : [],
        medications: profile.medications
          ? JSON.parse(decryptField(profile.medications as any))
          : [],
        allergies: profile.allergies
          ? JSON.parse(decryptField(profile.allergies as any))
          : []
      };
    } catch (error) {
      console.error('Error creating health profile:', error);
      throw new Error('Failed to create health profile');
    }
  }

  async updateHealthProfile(userId: string, updates: Partial<InsertHealthProfile>): Promise<HealthProfile | undefined> {
    try {
      // Encrypt sensitive fields in updates
      const encryptedUpdates = {
        ...updates,
        conditions: updates.conditions !== undefined
          ? (updates.conditions && updates.conditions.length > 0
            ? encryptField(JSON.stringify(updates.conditions))
            : null)
          : undefined,
        medications: updates.medications !== undefined
          ? (updates.medications && updates.medications.length > 0
            ? encryptField(JSON.stringify(updates.medications))
            : null)
          : undefined,
        allergies: updates.allergies !== undefined
          ? (updates.allergies && updates.allergies.length > 0
            ? encryptField(JSON.stringify(updates.allergies))
            : null)
          : undefined
      };
      
      // Remove undefined values
      const cleanUpdates = Object.fromEntries(
        Object.entries(encryptedUpdates).filter(([_, v]) => v !== undefined)
      );
      
      const [profile] = await db
        .update(healthProfiles)
        .set(cleanUpdates as any)
        .where(eq(healthProfiles.userId, userId))
        .returning();
      
      if (!profile) return undefined;
      
      // Decrypt for return
      return {
        ...profile,
        conditions: profile.conditions
          ? JSON.parse(decryptField(profile.conditions as any))
          : [],
        medications: profile.medications
          ? JSON.parse(decryptField(profile.medications as any))
          : [],
        allergies: profile.allergies
          ? JSON.parse(decryptField(profile.allergies as any))
          : []
      };
    } catch (error) {
      console.error('Error updating health profile:', error);
      return undefined;
    }
  }

  // Chat Session operations
  async getChatSession(id: string): Promise<ChatSession | undefined> {
    try {
      const [session] = await db.select().from(chatSessions).where(eq(chatSessions.id, id));
      return session || undefined;
    } catch (error) {
      console.error('Error getting chat session:', error);
      return undefined;
    }
  }

  async createChatSession(insertSession: InsertChatSession): Promise<ChatSession> {
    try {
      const [session] = await db.insert(chatSessions).values(insertSession).returning();
      return session;
    } catch (error) {
      console.error('Error creating chat session:', error);
      throw new Error('Failed to create chat session');
    }
  }

  async listChatSessionsByUser(userId: string): Promise<ChatSession[]> {
    try {
      return await db.select().from(chatSessions).where(eq(chatSessions.userId, userId)).orderBy(desc(chatSessions.createdAt));
    } catch (error) {
      console.error('Error listing chat sessions:', error);
      return [];
    }
  }

  async updateChatSessionStatus(id: string, status: 'active' | 'completed' | 'archived'): Promise<ChatSession | undefined> {
    try {
      const [session] = await db
        .update(chatSessions)
        .set({ status })
        .where(eq(chatSessions.id, id))
        .returning();
      return session || undefined;
    } catch (error) {
      console.error('Error updating chat session status:', error);
      return undefined;
    }
  }

  async deleteChatSession(id: string): Promise<void> {
    try {
      // Delete associated messages first (if not cascading)
      await db.delete(messages).where(eq(messages.sessionId, id));
      // Delete the session
      await db.delete(chatSessions).where(eq(chatSessions.id, id));
    } catch (error) {
      console.error('Error deleting chat session:', error);
      throw new Error('Failed to delete chat session');
    }
  }

  // Message operations
  async getMessage(id: string): Promise<Message | undefined> {
    try {
      const [message] = await db.select().from(messages).where(eq(messages.id, id));
      return message || undefined;
    } catch (error) {
      console.error('Error getting message:', error);
      return undefined;
    }
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    try {
      const rawFormula = normalizeMessageFormula(insertMessage.formula);
      const normalizedMessage: InsertMessage = {
        ...insertMessage,
        formula: (rawFormula ?? null) as InsertMessage['formula']
      };
      const dbPayload = normalizedMessage as DbInsertMessage;
      const [message] = await db.insert(messages).values(dbPayload).returning();
      return message;
    } catch (error) {
      console.error('Error creating message:', error);
      throw new Error('Failed to create message');
    }
  }

  async listMessagesBySession(sessionId: string): Promise<Message[]> {
    try {
      return await db.select().from(messages).where(eq(messages.sessionId, sessionId)).orderBy(messages.createdAt);
    } catch (error) {
      console.error('Error listing messages by session:', error);
      return [];
    }
  }

  // Formula operations
  async getFormula(id: string): Promise<Formula | undefined> {
    try {
      const [formula] = await db.select().from(formulas).where(eq(formulas.id, id));
      return formula || undefined;
    } catch (error) {
      console.error('Error getting formula:', error);
      return undefined;
    }
  }

  async createFormula(insertFormula: InsertFormula): Promise<Formula> {
    try {
      // Data is now pre-validated by Zod schemas at the API route level
      const normalizedFormula = normalizeFormulaInsertPayload(insertFormula);
      const dbPayload = normalizedFormula as DbInsertFormula;
      const [formula] = await db.insert(formulas).values(dbPayload).returning();
      return formula;
    } catch (error) {
      console.error('Error creating formula:', error);
      throw new Error('Failed to create formula');
    }
  }

  async getCurrentFormulaByUser(userId: string): Promise<Formula | undefined> {
    try {
      const [formula] = await db
        .select()
        .from(formulas)
        .where(eq(formulas.userId, userId))
        .orderBy(desc(formulas.createdAt))
        .limit(1);
      return formula || undefined;
    } catch (error) {
      console.error('Error getting current formula by user:', error);
      return undefined;
    }
  }

  async getFormulaHistory(userId: string): Promise<Formula[]> {
    try {
      return await db
        .select()
        .from(formulas)
        .where(eq(formulas.userId, userId))
        .orderBy(desc(formulas.createdAt));
    } catch (error) {
      console.error('Error getting formula history:', error);
      return [];
    }
  }

  async getFormulaByUserAndVersion(userId: string, version: number): Promise<Formula | undefined> {
    try {
      const [formula] = await db
        .select()
        .from(formulas)
        .where(and(eq(formulas.userId, userId), eq(formulas.version, version)))
        .limit(1);
      return formula || undefined;
    } catch (error) {
      console.error('Error getting formula by user and version:', error);
      return undefined;
    }
  }

  // Formula Version Change operations
  async createFormulaVersionChange(insertChange: InsertFormulaVersionChange): Promise<FormulaVersionChange> {
    try {
      const [change] = await db.insert(formulaVersionChanges).values(insertChange).returning();
      return change;
    } catch (error) {
      console.error('Error creating formula version change:', error);
      throw new Error('Failed to create formula version change');
    }
  }

  async listFormulaVersionChanges(formulaId: string): Promise<FormulaVersionChange[]> {
    try {
      return await db
        .select()
        .from(formulaVersionChanges)
        .where(eq(formulaVersionChanges.formulaId, formulaId))
        .orderBy(desc(formulaVersionChanges.createdAt));
    } catch (error) {
      console.error('Error listing formula version changes:', error);
      return [];
    }
  }

  async getSubscription(userId: string): Promise<Subscription | undefined> {
    try {
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId));
      return subscription || undefined;
    } catch (error) {
      console.error('Error getting subscription:', error);
      return undefined;
    }
  }

  async createSubscription(insertSubscription: InsertSubscription): Promise<Subscription> {
    try {
      const [subscription] = await db.insert(subscriptions).values(insertSubscription).returning();
      return subscription;
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw new Error('Failed to create subscription');
    }
  }

  async updateSubscription(userId: string, updates: Partial<InsertSubscription>): Promise<Subscription | undefined> {
    try {
      const [subscription] = await db
        .update(subscriptions)
        .set(updates)
        .where(eq(subscriptions.userId, userId))
        .returning();
      return subscription || undefined;
    } catch (error) {
      console.error('Error updating subscription:', error);
      return undefined;
    }
  }

  // Order operations
  async getOrder(id: string): Promise<Order | undefined> {
    try {
      const [order] = await db.select().from(orders).where(eq(orders.id, id));
      return order || undefined;
    } catch (error) {
      console.error('Error getting order:', error);
      return undefined;
    }
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    try {
      const [order] = await db.insert(orders).values(insertOrder).returning();
      return order;
    } catch (error) {
      console.error('Error creating order:', error);
      throw new Error('Failed to create order');
    }
  }

  async listOrdersByUser(userId: string): Promise<Order[]> {
    try {
      return await db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.placedAt));
    } catch (error) {
      console.error('Error listing orders by user:', error);
      return [];
    }
  }

  async updateOrderStatus(id: string, status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled', trackingUrl?: string): Promise<Order | undefined> {
    try {
      const updateData: any = { status };
      if (trackingUrl !== undefined) {
        updateData.trackingUrl = trackingUrl;
      }
      if (status === 'shipped') {
        updateData.shippedAt = new Date();
      }
      
      const [order] = await db
        .update(orders)
        .set(updateData)
        .where(eq(orders.id, id))
        .returning();
      return order || undefined;
    } catch (error) {
      console.error('Error updating order status:', error);
      return undefined;
    }
  }

  async getOrderWithFormula(orderId: string): Promise<{order: Order, formula: Formula | undefined} | undefined> {
    try {
      const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
      if (!order) return undefined;

      const [formula] = await db
        .select()
        .from(formulas)
        .where(and(eq(formulas.userId, order.userId), eq(formulas.version, order.formulaVersion)));

      return { order, formula: formula || undefined };
    } catch (error) {
      console.error('Error getting order with formula:', error);
      return undefined;
    }
  }

  // Address operations
  async getAddress(id: string): Promise<Address | undefined> {
    try {
      const [address] = await db.select().from(addresses).where(eq(addresses.id, id));
      return address || undefined;
    } catch (error) {
      console.error('Error getting address:', error);
      return undefined;
    }
  }

  async createAddress(insertAddress: InsertAddress): Promise<Address> {
    try {
      const [address] = await db.insert(addresses).values(insertAddress).returning();
      return address;
    } catch (error) {
      console.error('Error creating address:', error);
      throw new Error('Failed to create address');
    }
  }

  async updateAddress(id: string, updates: Partial<InsertAddress>): Promise<Address | undefined> {
    try {
      const [address] = await db
        .update(addresses)
        .set(updates)
        .where(eq(addresses.id, id))
        .returning();
      return address || undefined;
    } catch (error) {
      console.error('Error updating address:', error);
      return undefined;
    }
  }

  async listAddressesByUser(userId: string, type?: 'shipping' | 'billing'): Promise<Address[]> {
    try {
      const whereClause = type 
        ? and(eq(addresses.userId, userId), eq(addresses.type, type))
        : eq(addresses.userId, userId);
      
      return await db.select().from(addresses).where(whereClause).orderBy(desc(addresses.createdAt));
    } catch (error) {
      console.error('Error listing addresses by user:', error);
      return [];
    }
  }

  // Payment Method operations
  async getPaymentMethodRef(id: string): Promise<PaymentMethodRef | undefined> {
    try {
      const [paymentMethod] = await db.select().from(paymentMethodRefs).where(eq(paymentMethodRefs.id, id));
      return paymentMethod || undefined;
    } catch (error) {
      console.error('Error getting payment method:', error);
      return undefined;
    }
  }

  async createPaymentMethodRef(insertPaymentMethod: InsertPaymentMethodRef): Promise<PaymentMethodRef> {
    try {
      const [paymentMethod] = await db.insert(paymentMethodRefs).values(insertPaymentMethod).returning();
      return paymentMethod;
    } catch (error) {
      console.error('Error creating payment method:', error);
      throw new Error('Failed to create payment method');
    }
  }

  async listPaymentMethodsByUser(userId: string): Promise<PaymentMethodRef[]> {
    try {
      return await db.select().from(paymentMethodRefs).where(eq(paymentMethodRefs.userId, userId)).orderBy(desc(paymentMethodRefs.createdAt));
    } catch (error) {
      console.error('Error listing payment methods by user:', error);
      return [];
    }
  }

  async deletePaymentMethodRef(id: string): Promise<boolean> {
    try {
      const result = await db.delete(paymentMethodRefs).where(eq(paymentMethodRefs.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting payment method:', error);
      return false;
    }
  }

  // File Upload operations (enhanced for HIPAA compliance)
  async getFileUpload(id: string): Promise<FileUpload | undefined> {
    try {
      const [fileUpload] = await db.select().from(fileUploads).where(eq(fileUploads.id, id));
      return fileUpload || undefined;
    } catch (error) {
      console.error('Error getting file upload:', error);
      return undefined;
    }
  }

  async createFileUpload(insertFileUpload: InsertFileUpload): Promise<FileUpload> {
    try {
      // Handle labReportData field properly
      const safeFileUpload: InsertFileUpload = {
        ...insertFileUpload,
        labReportData: normalizeLabReportData(insertFileUpload.labReportData)
      };
      const dbPayload = safeFileUpload as DbInsertFileUpload;
      const [fileUpload] = await db.insert(fileUploads).values(dbPayload).returning();
      return fileUpload;
    } catch (error) {
      console.error('Error creating file upload:', error);
      throw new Error('Failed to create file upload');
    }
  }

  async updateFileUpload(id: string, updates: Partial<InsertFileUpload>): Promise<FileUpload | undefined> {
    try {
      // Handle labReportData field properly
      const safeUpdates: Partial<InsertFileUpload> = {
        ...updates,
        ...(updates.labReportData !== undefined && {
          labReportData: normalizeLabReportData(updates.labReportData)
        })
      };
      const [fileUpload] = await db
        .update(fileUploads)
        .set(safeUpdates as Partial<DbInsertFileUpload>)
        .where(eq(fileUploads.id, id))
        .returning();
      return fileUpload || undefined;
    } catch (error) {
      console.error('Error updating file upload:', error);
      return undefined;
    }
  }

  async softDeleteFileUpload(id: string, deletedBy: string): Promise<boolean> {
    try {
      const result = await db
        .update(fileUploads)
        .set({ deletedAt: new Date(), deletedBy })
        .where(eq(fileUploads.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error soft deleting file upload:', error);
      return false;
    }
  }

  async listFileUploadsByUser(userId: string, type?: 'lab_report' | 'medical_document' | 'prescription' | 'other', includeDeleted?: boolean): Promise<FileUpload[]> {
    try {
      let whereClause: any = eq(fileUploads.userId, userId);
      
      if (type) {
        whereClause = and(whereClause, eq(fileUploads.type, type));
      }
      
      if (!includeDeleted) {
        whereClause = and(whereClause, isNull(fileUploads.deletedAt));
      }
      
      return await db.select().from(fileUploads).where(whereClause).orderBy(desc(fileUploads.uploadedAt));
    } catch (error) {
      console.error('Error listing file uploads by user:', error);
      return [];
    }
  }

  // Lab Report specific operations
  async getLabReportsByUser(userId: string): Promise<FileUpload[]> {
    return this.listFileUploadsByUser(userId, 'lab_report', false);
  }

  async getLabReportById(id: string, userId: string): Promise<FileUpload | undefined> {
    try {
      const [labReport] = await db
        .select()
        .from(fileUploads)
        .where(and(
          eq(fileUploads.id, id),
          eq(fileUploads.userId, userId),
          eq(fileUploads.type, 'lab_report'),
          isNull(fileUploads.deletedAt)
        ));
      return labReport || undefined;
    } catch (error) {
      console.error('Error getting lab report by id:', error);
      return undefined;
    }
  }

  async updateLabReportData(id: string, labReportData: any, userId: string): Promise<FileUpload | undefined> {
    try {
      const normalizedData = normalizeLabReportData(labReportData);
      const updatePayload: Partial<DbInsertFileUpload> = {
        labReportData: normalizedData
      };
      const [fileUpload] = await db
        .update(fileUploads)
        .set(updatePayload)
        .where(and(eq(fileUploads.id, id), eq(fileUploads.userId, userId)))
        .returning();
      return fileUpload || undefined;
    } catch (error) {
      console.error('Error updating lab report data:', error);
      return undefined;
    }
  }

  // Audit Log operations (HIPAA compliance)
  async createAuditLog(insertAuditLog: InsertAuditLog): Promise<AuditLog> {
    try {
      const [auditLog] = await db.insert(auditLogs).values(insertAuditLog).returning();
      return auditLog;
    } catch (error) {
      console.error('Error creating audit log:', error);
      throw new Error('Failed to create audit log');
    }
  }

  async getAuditLogsByFile(fileId: string): Promise<AuditLog[]> {
    try {
      return await db.select().from(auditLogs).where(eq(auditLogs.fileId, fileId)).orderBy(desc(auditLogs.timestamp));
    } catch (error) {
      console.error('Error getting audit logs by file:', error);
      return [];
    }
  }

  async getAuditLogsByUser(userId: string, limit?: number): Promise<AuditLog[]> {
    try {
      const query = db.select().from(auditLogs).where(eq(auditLogs.userId, userId)).orderBy(desc(auditLogs.timestamp));
      if (limit) {
        return await query.limit(limit);
      }
      return await query;
    } catch (error) {
      console.error('Error getting audit logs by user:', error);
      return [];
    }
  }

  async getAuditLogsByDateRange(startDate: Date, endDate: Date): Promise<AuditLog[]> {
    try {
      return await db
        .select()
        .from(auditLogs)
        .where(and(
          gte(auditLogs.timestamp, startDate),
          lte(auditLogs.timestamp, endDate)
        ))
        .orderBy(desc(auditLogs.timestamp));
    } catch (error) {
      console.error('Error getting audit logs by date range:', error);
      return [];
    }
  }

  // User Consent operations (HIPAA compliance)
  async createUserConsent(insertConsent: InsertUserConsent): Promise<UserConsent> {
    try {
      // Handle metadata field properly
      const safeConsent = {
        ...insertConsent,
        metadata: insertConsent.metadata ? {
          source: ['upload_form', 'dashboard', 'api'].includes(insertConsent.metadata.source as string) ? insertConsent.metadata.source as 'upload_form' | 'dashboard' | 'api' : undefined,
          fileId: typeof insertConsent.metadata.fileId === 'string' ? insertConsent.metadata.fileId : undefined,
          additionalInfo: insertConsent.metadata.additionalInfo && typeof insertConsent.metadata.additionalInfo === 'object' ? insertConsent.metadata.additionalInfo as Record<string, any> : undefined
        } : null
      };
      const [consent] = await db.insert(userConsents).values(safeConsent).returning();
      return consent;
    } catch (error) {
      console.error('Error creating user consent:', error);
      throw new Error('Failed to create user consent');
    }
  }

  async getUserConsent(userId: string, consentType: 'lab_data_processing' | 'ai_analysis' | 'data_retention' | 'third_party_sharing'): Promise<UserConsent | undefined> {
    try {
      const [consent] = await db
        .select()
        .from(userConsents)
        .where(and(
          eq(userConsents.userId, userId),
          eq(userConsents.consentType, consentType),
          isNull(userConsents.revokedAt)
        ))
        .orderBy(desc(userConsents.grantedAt))
        .limit(1);
      return consent || undefined;
    } catch (error) {
      console.error('Error getting user consent:', error);
      return undefined;
    }
  }

  async getUserConsents(userId: string): Promise<UserConsent[]> {
    try {
      return await db.select().from(userConsents).where(eq(userConsents.userId, userId)).orderBy(desc(userConsents.grantedAt));
    } catch (error) {
      console.error('Error getting user consents:', error);
      return [];
    }
  }

  async revokeUserConsent(userId: string, consentType: 'lab_data_processing' | 'ai_analysis' | 'data_retention' | 'third_party_sharing'): Promise<boolean> {
    try {
      const result = await db
        .update(userConsents)
        .set({ revokedAt: new Date() })
        .where(and(
          eq(userConsents.userId, userId),
          eq(userConsents.consentType, consentType),
          isNull(userConsents.revokedAt)
        ));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error revoking user consent:', error);
      return false;
    }
  }

  // Lab Analysis operations (AI-generated insights)
  async createLabAnalysis(insertAnalysis: InsertLabAnalysis): Promise<LabAnalysis> {
    try {
      // Encrypt sensitive health data before storing
      const encryptedAnalysis = {
        ...insertAnalysis,
        extractedMarkers: insertAnalysis.extractedMarkers 
          ? encryptField(JSON.stringify(insertAnalysis.extractedMarkers))
          : null,
        aiInsights: insertAnalysis.aiInsights
          ? encryptField(JSON.stringify(insertAnalysis.aiInsights))
          : null
      };
      
      const [analysis] = await db.insert(labAnalyses).values(encryptedAnalysis as any).returning();
      
      // Decrypt for return
      return {
        ...analysis,
        extractedMarkers: analysis.extractedMarkers 
          ? JSON.parse(decryptField(analysis.extractedMarkers as any))
          : [],
        aiInsights: analysis.aiInsights
          ? JSON.parse(decryptField(analysis.aiInsights as any))
          : undefined
      };
    } catch (error) {
      console.error('Error creating lab analysis:', error);
      throw new Error('Failed to create lab analysis');
    }
  }

  async getLabAnalysis(fileId: string): Promise<LabAnalysis | undefined> {
    try {
      const [analysis] = await db.select().from(labAnalyses).where(eq(labAnalyses.fileId, fileId));
      if (!analysis) return undefined;
      
      // Decrypt sensitive fields
      return {
        ...analysis,
        extractedMarkers: analysis.extractedMarkers
          ? JSON.parse(decryptField(analysis.extractedMarkers as any))
          : [],
        aiInsights: analysis.aiInsights
          ? JSON.parse(decryptField(analysis.aiInsights as any))
          : undefined
      };
    } catch (error) {
      console.error('Error getting lab analysis:', error);
      return undefined;
    }
  }

  async updateLabAnalysis(id: string, updates: Partial<InsertLabAnalysis>): Promise<LabAnalysis | undefined> {
    try {
      // Encrypt sensitive fields in updates
      const encryptedUpdates = {
        ...updates,
        extractedMarkers: updates.extractedMarkers
          ? encryptField(JSON.stringify(updates.extractedMarkers))
          : undefined,
        aiInsights: updates.aiInsights
          ? encryptField(JSON.stringify(updates.aiInsights))
          : undefined
      };
      
      // Remove undefined values
      const cleanUpdates = Object.fromEntries(
        Object.entries(encryptedUpdates).filter(([_, v]) => v !== undefined)
      );
      
      const [analysis] = await db
        .update(labAnalyses)
        .set(cleanUpdates as any)
        .where(eq(labAnalyses.id, id))
        .returning();
      
      if (!analysis) return undefined;
      
      // Decrypt for return
      return {
        ...analysis,
        extractedMarkers: analysis.extractedMarkers
          ? JSON.parse(decryptField(analysis.extractedMarkers as any))
          : [],
        aiInsights: analysis.aiInsights
          ? JSON.parse(decryptField(analysis.aiInsights as any))
          : undefined
      };
    } catch (error) {
      console.error('Error updating lab analysis:', error);
      return undefined;
    }
  }

  async listLabAnalysesByUser(userId: string): Promise<LabAnalysis[]> {
    try {
      const analyses = await db.select().from(labAnalyses).where(eq(labAnalyses.userId, userId)).orderBy(desc(labAnalyses.processedAt));
      
      // Decrypt each analysis
      return analyses.map(analysis => ({
        ...analysis,
        extractedMarkers: analysis.extractedMarkers
          ? JSON.parse(decryptField(analysis.extractedMarkers as any))
          : [],
        aiInsights: analysis.aiInsights
          ? JSON.parse(decryptField(analysis.aiInsights as any))
          : undefined
      }));
    } catch (error) {
      console.error('Error listing lab analyses by user:', error);
      return [];
    }
  }

  // Notification Preferences operations
  async getNotificationPrefs(userId: string): Promise<NotificationPref | undefined> {
    try {
      const [prefs] = await db.select().from(notificationPrefs).where(eq(notificationPrefs.userId, userId));
      return prefs || undefined;
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      return undefined;
    }
  }

  async createNotificationPrefs(insertPrefs: InsertNotificationPref): Promise<NotificationPref> {
    try {
      const [prefs] = await db.insert(notificationPrefs).values(insertPrefs).returning();
      return prefs;
    } catch (error) {
      console.error('Error creating notification preferences:', error);
      throw new Error('Failed to create notification preferences');
    }
  }

  async updateNotificationPrefs(userId: string, updates: Partial<InsertNotificationPref>): Promise<NotificationPref | undefined> {
    try {
      const [prefs] = await db
        .update(notificationPrefs)
        .set(updates)
        .where(eq(notificationPrefs.userId, userId))
        .returning();
      return prefs || undefined;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return undefined;
    }
  }

  // Notification operations
  async getNotification(id: string): Promise<Notification | undefined> {
    try {
      const [notification] = await db.select().from(notifications).where(eq(notifications.id, id));
      return notification || undefined;
    } catch (error) {
      console.error('Error getting notification:', error);
      return undefined;
    }
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    try {
      // Data is pre-validated by Zod schemas at API route level
      const normalizedNotification: InsertNotification = {
        ...insertNotification,
        ...(insertNotification.metadata !== undefined && {
          metadata: normalizeNotificationMetadata(insertNotification.metadata) as InsertNotification['metadata']
        })
      };
      const dbPayload = normalizedNotification as DbInsertNotification;
      const [notification] = await db.insert(notifications).values(dbPayload).returning();
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw new Error('Failed to create notification');
    }
  }

  async listNotificationsByUser(userId: string, limit?: number): Promise<Notification[]> {
    try {
      const query = db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
      if (limit) {
        return await query.limit(limit);
      }
      return await query;
    } catch (error) {
      console.error('Error listing notifications by user:', error);
      return [];
    }
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    try {
      const result = await db.select().from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
      return result.length;
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      return 0;
    }
  }

  async markNotificationAsRead(id: string, userId: string): Promise<Notification | undefined> {
    try {
      const [notification] = await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
        .returning();
      return notification || undefined;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return undefined;
    }
  }

  async markAllNotificationsAsRead(userId: string): Promise<boolean> {
    try {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  }

  async deleteNotification(id: string, userId: string): Promise<boolean> {
    try {
      const result = await db
        .delete(notifications)
        .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  }

  // Newsletter subscriber operations
  async getNewsletterSubscriberByEmail(email: string): Promise<NewsletterSubscriber | undefined> {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const [subscriber] = await db
        .select()
        .from(newsletterSubscribers)
        .where(eq(newsletterSubscribers.email, normalizedEmail));
      return subscriber || undefined;
    } catch (error) {
      console.error('Error getting newsletter subscriber:', error);
      return undefined;
    }
  }

  async createNewsletterSubscriber(insertSubscriber: InsertNewsletterSubscriber): Promise<NewsletterSubscriber> {
    try {
      const normalizedEmail = insertSubscriber.email.trim().toLowerCase();
      const [subscriber] = await db
        .insert(newsletterSubscribers)
        .values({ email: normalizedEmail })
        .returning();
      return subscriber;
    } catch (error) {
      console.error('Error creating newsletter subscriber:', error);
      throw error;
    }
  }

  async reactivateNewsletterSubscriber(email: string): Promise<boolean> {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      await db
        .update(newsletterSubscribers)
        .set({ isActive: true })
        .where(eq(newsletterSubscribers.email, normalizedEmail));
      return true;
    } catch (error) {
      console.error('Error reactivating newsletter subscriber:', error);
      return false;
    }
  }

  // Research citations operations
  async getResearchCitationsForIngredient(ingredientName: string): Promise<ResearchCitation[]> {
    try {
      // Normalize ingredient name for case-insensitive matching
      const normalizedName = ingredientName.trim();
      const citations = await db
        .select()
        .from(researchCitations)
        .where(and(
          eq(researchCitations.ingredientName, normalizedName),
          eq(researchCitations.isActive, true)
        ))
        .orderBy(desc(researchCitations.publicationYear));
      return citations;
    } catch (error) {
      console.error('Error getting research citations:', error);
      return [];
    }
  }

  async createResearchCitation(citation: InsertResearchCitation): Promise<ResearchCitation> {
    try {
      const [newCitation] = await db
        .insert(researchCitations)
        .values(citation)
        .returning();
      return newCitation;
    } catch (error) {
      console.error('Error creating research citation:', error);
      throw error;
    }
  }

  // FAQ operations
  async getFaqItem(id: string): Promise<FaqItem | undefined> {
    try {
      const [item] = await db.select().from(faqItems).where(eq(faqItems.id, id));
      return item || undefined;
    } catch (error) {
      console.error('Error getting FAQ item:', error);
      return undefined;
    }
  }

  async listFaqItems(category?: string): Promise<FaqItem[]> {
    try {
      const items = await db
        .select()
        .from(faqItems)
        .where(
          and(
            eq(faqItems.isPublished, true),
            category ? eq(faqItems.category, category) : undefined
          )
        )
        .orderBy(faqItems.displayOrder);
      return items;
    } catch (error) {
      console.error('Error listing FAQ items:', error);
      return [];
    }
  }

  async createFaqItem(insertFaqItem: InsertFaqItem): Promise<FaqItem> {
    try {
      const [item] = await db
        .insert(faqItems)
        .values(insertFaqItem)
        .returning();
      return item;
    } catch (error) {
      console.error('Error creating FAQ item:', error);
      throw error;
    }
  }

  async updateFaqItem(id: string, updates: Partial<InsertFaqItem>): Promise<FaqItem | undefined> {
    try {
      const [item] = await db
        .update(faqItems)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(faqItems.id, id))
        .returning();
      return item || undefined;
    } catch (error) {
      console.error('Error updating FAQ item:', error);
      return undefined;
    }
  }

  async deleteFaqItem(id: string): Promise<boolean> {
    try {
      await db.delete(faqItems).where(eq(faqItems.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting FAQ item:', error);
      return false;
    }
  }

  // Help article operations
  async getHelpArticle(id: string): Promise<HelpArticle | undefined> {
    try {
      const [article] = await db.select().from(helpArticles).where(eq(helpArticles.id, id));
      return article || undefined;
    } catch (error) {
      console.error('Error getting help article:', error);
      return undefined;
    }
  }

  async listHelpArticles(category?: string): Promise<HelpArticle[]> {
    try {
      const articles = await db
        .select()
        .from(helpArticles)
        .where(
          and(
            eq(helpArticles.isPublished, true),
            category ? eq(helpArticles.category, category) : undefined
          )
        )
        .orderBy(helpArticles.displayOrder);
      return articles;
    } catch (error) {
      console.error('Error listing help articles:', error);
      return [];
    }
  }

  async createHelpArticle(insertArticle: InsertHelpArticle): Promise<HelpArticle> {
    try {
      const [article] = await db
        .insert(helpArticles)
        .values(insertArticle)
        .returning();
      return article;
    } catch (error) {
      console.error('Error creating help article:', error);
      throw error;
    }
  }

  async updateHelpArticle(id: string, updates: Partial<InsertHelpArticle>): Promise<HelpArticle | undefined> {
    try {
      const [article] = await db
        .update(helpArticles)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(helpArticles.id, id))
        .returning();
      return article || undefined;
    } catch (error) {
      console.error('Error updating help article:', error);
      return undefined;
    }
  }

  async deleteHelpArticle(id: string): Promise<boolean> {
    try {
      await db.delete(helpArticles).where(eq(helpArticles.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting help article:', error);
      return false;
    }
  }

  async incrementHelpArticleViewCount(id: string): Promise<boolean> {
    try {
      await db
        .update(helpArticles)
        .set({ viewCount: sql`${helpArticles.viewCount} + 1` })
        .where(eq(helpArticles.id, id));
      return true;
    } catch (error) {
      console.error('Error incrementing view count:', error);
      return false;
    }
  }

  // Support ticket operations
  async getSupportTicket(id: string): Promise<SupportTicket | undefined> {
    try {
      const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, id));
      return ticket;
    } catch (error) {
      console.error('Error getting support ticket:', error);
      return undefined;
    }
  }

  async listSupportTicketsByUser(userId: string): Promise<SupportTicket[]> {
    try {
      const tickets = await db
        .select()
        .from(supportTickets)
        .where(eq(supportTickets.userId, userId))
        .orderBy(desc(supportTickets.createdAt));
      return tickets;
    } catch (error) {
      console.error('Error listing support tickets:', error);
      return [];
    }
  }

  async createSupportTicket(insertTicket: InsertSupportTicket): Promise<SupportTicket> {
    try {
      const [ticket] = await db
        .insert(supportTickets)
        .values(insertTicket)
        .returning();
      return ticket;
    } catch (error) {
      console.error('Error creating support ticket:', error);
      throw error;
    }
  }

  async updateSupportTicket(id: string, updates: Partial<InsertSupportTicket>): Promise<SupportTicket | undefined> {
    try {
      const [ticket] = await db
        .update(supportTickets)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(supportTickets.id, id))
        .returning();
      return ticket || undefined;
    } catch (error) {
      console.error('Error updating support ticket:', error);
      return undefined;
    }
  }

  async getSupportTicketWithResponses(id: string, userId: string): Promise<{ticket: SupportTicket, responses: SupportTicketResponse[]} | undefined> {
    try {
      const [ticket] = await db
        .select()
        .from(supportTickets)
        .where(and(
          eq(supportTickets.id, id),
          eq(supportTickets.userId, userId)
        ));
      
      if (!ticket) return undefined;

      const responses = await db
        .select()
        .from(supportTicketResponses)
        .where(eq(supportTicketResponses.ticketId, id))
        .orderBy(supportTicketResponses.createdAt);

      return { ticket, responses };
    } catch (error) {
      console.error('Error getting support ticket with responses:', error);
      return undefined;
    }
  }

  async listAllSupportTickets(status?: string, limit: number = 50, offset: number = 0): Promise<{tickets: Array<SupportTicket & {userName: string, userEmail: string}>, total: number}> {
    try {
      let query = db
        .select({
          id: supportTickets.id,
          userId: supportTickets.userId,
          subject: supportTickets.subject,
          description: supportTickets.description,
          category: supportTickets.category,
          status: supportTickets.status,
          priority: supportTickets.priority,
          assignedTo: supportTickets.assignedTo,
          resolvedAt: supportTickets.resolvedAt,
          createdAt: supportTickets.createdAt,
          updatedAt: supportTickets.updatedAt,
          userName: users.name,
          userEmail: users.email
        })
        .from(supportTickets)
        .leftJoin(users, eq(supportTickets.userId, users.id))
        .orderBy(desc(supportTickets.createdAt))
        .$dynamic();

      if (status && status !== 'all') {
        query = query.where(eq(supportTickets.status, status as any));
      }

      const allTickets = await query;
      const normalizedTickets = allTickets.map(ticket => ({
        ...ticket,
        userName: ticket.userName ?? '',
        userEmail: ticket.userEmail ?? ''
      }));
      const total = normalizedTickets.length;
      const tickets = normalizedTickets.slice(offset, offset + limit);

      return { tickets, total };
    } catch (error) {
      console.error('Error listing all support tickets:', error);
      return { tickets: [], total: 0 };
    }
  }

  // Support ticket response operations
  async createSupportTicketResponse(insertResponse: InsertSupportTicketResponse): Promise<SupportTicketResponse> {
    try {
      const [response] = await db
        .insert(supportTicketResponses)
        .values(insertResponse)
        .returning();
      return response;
    } catch (error) {
      console.error('Error creating support ticket response:', error);
      throw error;
    }
  }

  async listSupportTicketResponses(ticketId: string): Promise<SupportTicketResponse[]> {
    try {
      const responses = await db
        .select()
        .from(supportTicketResponses)
        .where(eq(supportTicketResponses.ticketId, ticketId))
        .orderBy(supportTicketResponses.createdAt);
      return responses;
    } catch (error) {
      console.error('Error listing support ticket responses:', error);
      return [];
    }
  }
  
  // Admin operations
  async getAdminStats(): Promise<{
    totalUsers: number;
    totalPaidUsers: number;
    totalRevenue: number;
    activeUsers: number;
    totalOrders: number;
    totalFormulas: number;
  }> {
    try {
      const [userStats] = await db.select({ count: count() }).from(users);
      const totalUsers = Number(userStats?.count || 0);
      
      const [formulaStats] = await db.select({ count: count() }).from(formulas);
      const totalFormulas = Number(formulaStats?.count || 0);
      
      const [orderStats] = await db.select({ count: count() }).from(orders);
      const totalOrders = Number(orderStats?.count || 0);
      
      const paidUsersResult = await db
        .selectDistinct({ userId: orders.userId })
        .from(orders);
      const totalPaidUsers = paidUsersResult.length;
      
      const usersWithFormulas = await db
        .selectDistinct({ userId: formulas.userId })
        .from(formulas);
      const activeUsers = usersWithFormulas.length;
      
      // Calculate total revenue from orders
      const [revenueStats] = await db
        .select({ totalRevenueCents: sql<number>`COALESCE(SUM(amount_cents), 0)` })
        .from(orders);
      const totalRevenue = Number(revenueStats?.totalRevenueCents || 0) / 100;
      
      return {
        totalUsers,
        totalPaidUsers,
        totalRevenue,
        activeUsers,
        totalOrders,
        totalFormulas
      };
    } catch (error) {
      console.error('Error getting admin stats:', error);
      return {
        totalUsers: 0,
        totalPaidUsers: 0,
        totalRevenue: 0,
        activeUsers: 0,
        totalOrders: 0,
        totalFormulas: 0
      };
    }
  }
  
  async getUserGrowthData(days: number): Promise<Array<{ date: string; users: number; paidUsers: number }>> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      // Get daily new user signups
      const dailyUsers = await db
        .select({
          date: sql<string>`DATE(created_at)`,
          count: count()
        })
        .from(users)
        .where(gte(users.createdAt, startDate))
        .groupBy(sql`DATE(created_at)`)
        .orderBy(sql`DATE(created_at)`);
      
      // Get distinct paid users (users who have placed orders)
      const paidUserIds = await db
        .selectDistinct({ userId: orders.userId, orderDate: sql<string>`DATE(placed_at)` })
        .from(orders)
        .where(gte(orders.placedAt, startDate));
      
      // Build cumulative growth data
      let cumulativeUsers = 0;
      let cumulativePaid = 0;
      
      const paidByDate = new Map<string, number>();
      paidUserIds.forEach(({ orderDate }) => {
        paidByDate.set(orderDate, (paidByDate.get(orderDate) || 0) + 1);
      });
      
      return dailyUsers.map(row => {
        cumulativeUsers += Number(row.count);
        cumulativePaid += (paidByDate.get(row.date) || 0);
        
        return {
          date: row.date,
          users: cumulativeUsers,
          paidUsers: cumulativePaid
        };
      });
    } catch (error) {
      console.error('Error getting user growth data:', error);
      return [];
    }
  }
  
  async getRevenueData(days: number): Promise<Array<{ date: string; revenue: number; orders: number }>> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const revenueData = await db
        .select({
          date: sql<string>`DATE(placed_at)`,
          orders: count(),
          revenueCents: sql<number>`COALESCE(SUM(amount_cents), 0)`
        })
        .from(orders)
        .where(gte(orders.placedAt, startDate))
        .groupBy(sql`DATE(placed_at)`)
        .orderBy(sql`DATE(placed_at)`);
      
      return revenueData.map(row => ({
        date: row.date,
        revenue: Number(row.revenueCents || 0) / 100,
        orders: Number(row.orders)
      }));
    } catch (error) {
      console.error('Error getting revenue data:', error);
      return [];
    }
  }
  
  async searchUsers(query: string, limit: number, offset: number, filter: string = 'all'): Promise<{ users: User[]; total: number }> {
    try {
      const searchPattern = `%${query}%`;
      const searchCondition = or(







        ilike(users.email, searchPattern),
        ilike(users.name, searchPattern),
        ilike(users.phone, searchPattern)
      );

      let whereClause = searchCondition;

      if (filter === 'paid') {
        const paidUserIds = await db.selectDistinct({ userId: orders.userId }).from(orders);
        const paidIds = paidUserIds.map(p => p.userId);
        if (paidIds.length === 0) {
          return { users: [], total: 0 };
        }
        whereClause = and(searchCondition, inArray(users.id, paidIds));
      } else if (filter === 'active') {
        const activeUserIds = await db.selectDistinct({ userId: formulas.userId }).from(formulas);
        const activeIds = activeUserIds.map(a => a.userId);
        if (activeIds.length === 0) {
          return { users: [], total: 0 };
        }
        whereClause = and(searchCondition, inArray(users.id, activeIds));
      }

      const userQuery = db
        .select()
        .from(users)
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);

      const countQuery = db
        .select({ count: count() })
        .from(users)
        .where(whereClause);

      const [foundUsers, countRows] = await Promise.all([
        userQuery,
        countQuery
      ]);

      return {
        users: foundUsers,
        total: Number(countRows?.[0]?.count || 0)
      };
    } catch (error) {
      console.error('Error searching users:', error);
      return { users: [], total: 0 };
    }
  }
  
  async getTodaysOrders(): Promise<Array<Order & { user: { id: string; name: string; email: string }; formula?: Formula }>> {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const todayOrders = await db
        .select()
        .from(orders)
        .where(gte(orders.placedAt, todayStart))
        .orderBy(desc(orders.placedAt));
      
      // Enrich orders with user and formula details
      const enrichedOrders = await Promise.all(
        todayOrders.map(async (order) => {
          const [user] = await db.select({
            id: users.id,
            name: users.name,
            email: users.email
          }).from(users).where(eq(users.id, order.userId));
          
          const [formula] = await db
            .select()
            .from(formulas)
            .where(
              and(
                eq(formulas.userId, order.userId),
                eq(formulas.version, order.formulaVersion)
              )
            );
          
          return { ...order, user, formula };
        })
      );
      
      return enrichedOrders;
    } catch (error) {
      console.error('Error getting today\'s orders:', error);
      return [];
    }
  }
  
  async getUserTimeline(userId: string): Promise<{
    user: User;
    healthProfile?: HealthProfile;
    formulas: Formula[];
    orders: Array<Order & { formula?: Formula }>;
    chatSessions: ChatSession[];
    fileUploads: FileUpload[];
  }> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) {
        throw new Error('User not found');
      }
      
      const [healthProfile] = await db.select().from(healthProfiles).where(eq(healthProfiles.userId, userId));
      const userFormulas = await db.select().from(formulas).where(eq(formulas.userId, userId)).orderBy(desc(formulas.createdAt));
      const userOrders = await db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.placedAt));
      const userChatSessions = await db.select().from(chatSessions).where(eq(chatSessions.userId, userId)).orderBy(desc(chatSessions.createdAt));
      const userFileUploads = await db.select().from(fileUploads).where(eq(fileUploads.userId, userId)).orderBy(desc(fileUploads.uploadedAt));
      
      // Enrich orders with formula details
      const enrichedOrders = await Promise.all(
        userOrders.map(async (order) => {
          const [formula] = await db
            .select()
            .from(formulas)
            .where(
              and(
                eq(formulas.userId, userId),
                eq(formulas.version, order.formulaVersion)
              )
            );
          return { ...order, formula };
        })
      );
      
      return {
        user,
        healthProfile: healthProfile || undefined,
        formulas: userFormulas,
        orders: enrichedOrders,
        chatSessions: userChatSessions,
        fileUploads: userFileUploads
      };
    } catch (error) {
      console.error('Error getting user timeline:', error);
      throw error;
    }
  }

  // Wearable device connection operations
  async getWearableConnections(userId: string): Promise<WearableConnection[]> {
    try {
      const connections = await db
        .select()
        .from(wearableConnections)
        .where(eq(wearableConnections.userId, userId))
        .orderBy(desc(wearableConnections.connectedAt));
      
      // Decrypt tokens for active connections
      return connections.map(conn => {
        if (conn.status === 'connected' && conn.accessToken) {
          try {
            return {
              ...conn,
              accessToken: decryptToken(conn.accessToken),
              refreshToken: conn.refreshToken ? decryptToken(conn.refreshToken) : null
            };
          } catch (error) {
            console.error('Error decrypting tokens for connection:', conn.id, error);
            return conn;
          }
        }
        return conn;
      });
    } catch (error) {
      console.error('Error getting wearable connections:', error);
      return [];
    }
  }

  async getAllWearableConnectionsNearingExpiry(expiryThreshold: Date): Promise<WearableConnection[]> {
    try {
      const connections = await db
        .select()
        .from(wearableConnections)
        .where(
          and(
            eq(wearableConnections.status, 'connected'),
            lt(wearableConnections.tokenExpiresAt, expiryThreshold)
          )
        );
      
      // Decrypt tokens for connections
      return connections.map(conn => {
        if (conn.accessToken) {
          try {
            return {
              ...conn,
              accessToken: decryptToken(conn.accessToken),
              refreshToken: conn.refreshToken ? decryptToken(conn.refreshToken) : null
            };
          } catch (error) {
            console.error('Error decrypting tokens for connection:', conn.id, error);
            return conn;
          }
        }
        return conn;
      });
    } catch (error) {
      console.error('Error getting connections nearing expiry:', error);
      return [];
    }
  }
  
  async createWearableConnection(connection: InsertWearableConnection): Promise<WearableConnection> {
    try {
      if (!connection.accessToken) {
        throw new Error('accessToken is required to create a wearable connection');
      }
      // Encrypt tokens before storing
      const encryptedConnection = {
        ...connection,
        accessToken: encryptToken(connection.accessToken),
        refreshToken: connection.refreshToken ? encryptToken(connection.refreshToken) : null,
        scopes: Array.isArray(connection.scopes) ? [...connection.scopes] : connection.scopes ?? []
      };
      
      const [newConnection] = await db
        .insert(wearableConnections)
        .values(encryptedConnection)
        .returning();
      
      // Return connection with decrypted tokens
      return {
        ...newConnection,
        accessToken: connection.accessToken,
        refreshToken: connection.refreshToken ?? null
      };
    } catch (error) {
      console.error('Error creating wearable connection:', error);
      throw new Error('Failed to create wearable connection');
    }
  }
  
  async updateWearableConnection(id: string, updates: Partial<InsertWearableConnection>): Promise<WearableConnection | undefined> {
    try {
      // Encrypt tokens if present in updates
      const encryptedUpdates = {
        ...updates,
        accessToken: updates.accessToken ? encryptToken(updates.accessToken) : updates.accessToken,
        refreshToken: updates.refreshToken ? encryptToken(updates.refreshToken) : updates.refreshToken,
        scopes: Array.isArray(updates.scopes) ? [...updates.scopes] : updates.scopes
      };
      
      const [updatedConnection] = await db
        .update(wearableConnections)
        .set(encryptedUpdates)
        .where(eq(wearableConnections.id, id))
        .returning();
      
      if (!updatedConnection) return undefined;
      
      // Decrypt tokens before returning
      if (updatedConnection.accessToken) {
        try {
          return {
            ...updatedConnection,
            accessToken: decryptToken(updatedConnection.accessToken),
            refreshToken: updatedConnection.refreshToken ? decryptToken(updatedConnection.refreshToken) : null
          };
        } catch (error) {
          console.error('Error decrypting tokens after update:', error);
          return updatedConnection;
        }
      }
      
      return updatedConnection;
    } catch (error) {
      console.error('Error updating wearable connection:', error);
      return undefined;
    }
  }
  
  async disconnectWearableDevice(id: string, userId: string): Promise<boolean> {
    try {
      const revokedToken = encryptToken('revoked');
      // Null out tokens to prevent credential reuse
      const [connection] = await db
        .update(wearableConnections)
        .set({ 
          status: 'disconnected',
          disconnectedAt: new Date(),
          accessToken: revokedToken,
          refreshToken: null,
          tokenExpiresAt: null
        })
        .where(
          and(
            eq(wearableConnections.id, id),
            eq(wearableConnections.userId, userId)
          )
        )
        .returning();
      return !!connection;
    } catch (error) {
      console.error('Error disconnecting wearable device:', error);
      return false;
    }
  }

  async getAllWearableConnections(): Promise<WearableConnection[]> {
    try {
      const connections = await db
        .select()
        .from(wearableConnections)
        .where(eq(wearableConnections.status, 'connected'))
        .orderBy(desc(wearableConnections.connectedAt));
      
      // Decrypt tokens for active connections
      return connections.map(conn => {
        if (conn.accessToken) {
          try {
            return {
              ...conn,
              accessToken: decryptToken(conn.accessToken),
              refreshToken: conn.refreshToken ? decryptToken(conn.refreshToken) : null
            };
          } catch (error) {
            console.error('Error decrypting tokens for connection:', conn.id, error);
            return conn;
          }
        }
        return conn;
      });
    } catch (error) {
      console.error('Error getting all wearable connections:', error);
      return [];
    }
  }

  // App settings operations
  async getAppSetting(key: string): Promise<AppSetting | undefined> {
    try {
      const [setting] = await db.select().from(appSettings).where(eq(appSettings.key, key));
      return setting || undefined;
    } catch (error) {
      console.error('Error getting app setting:', key, error);
      return undefined;
    }
  }

  async upsertAppSetting(key: string, value: Record<string, any>, updatedBy?: string | null): Promise<AppSetting> {
    try {
      // Try update first
      const [updated] = await db
        .update(appSettings)
        .set({ value, updatedAt: new Date(), updatedBy: updatedBy ?? null })
        .where(eq(appSettings.key, key))
        .returning();
      if (updated) return updated;
      // Insert if not exists
      const [inserted] = await db
        .insert(appSettings)
        .values({ key, value, updatedBy: updatedBy ?? null })
        .returning();
      return inserted;
    } catch (error) {
      console.error('Error upserting app setting:', key, error);
      throw new Error('Failed to persist app setting');
    }
  }

  async deleteAppSetting(key: string): Promise<boolean> {
    try {
      const result = await db.delete(appSettings).where(eq(appSettings.key, key));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting app setting:', key, error);
      return false;
    }
  }

  // Biometric data operations
  async saveBiometricData(data: {
    userId: string;
    connectionId: string;
    provider: 'fitbit' | 'oura' | 'whoop';
    dataDate: Date;
    sleepScore?: number | null;
    sleepHours?: number | null;
    deepSleepMinutes?: number | null;
    remSleepMinutes?: number | null;
    lightSleepMinutes?: number | null;
    hrvMs?: number | null;
    restingHeartRate?: number | null;
    averageHeartRate?: number | null;
    maxHeartRate?: number | null;
    recoveryScore?: number | null;
    readinessScore?: number | null;
    strainScore?: number | null;
    steps?: number | null;
    caloriesBurned?: number | null;
    activeMinutes?: number | null;
    spo2Percentage?: number | null;
    skinTempCelsius?: number | null;
    respiratoryRate?: number | null;
    rawData?: Record<string, any>;
  }): Promise<void> {
    try {
      const { biometricData } = await import('@shared/schema');
      
      // Upsert - update if exists, insert if not
      await db.insert(biometricData).values({
        userId: data.userId,
        connectionId: data.connectionId,
        provider: data.provider,
        dataDate: data.dataDate,
        sleepScore: data.sleepScore,
        sleepHours: data.sleepHours,
        deepSleepMinutes: data.deepSleepMinutes,
        remSleepMinutes: data.remSleepMinutes,
        lightSleepMinutes: data.lightSleepMinutes,
        hrvMs: data.hrvMs,
        restingHeartRate: data.restingHeartRate,
        averageHeartRate: data.averageHeartRate,
        maxHeartRate: data.maxHeartRate,
        recoveryScore: data.recoveryScore,
        readinessScore: data.readinessScore,
        strainScore: data.strainScore,
        steps: data.steps,
        caloriesBurned: data.caloriesBurned,
        activeMinutes: data.activeMinutes,
        spo2Percentage: data.spo2Percentage,
        skinTempCelsius: data.skinTempCelsius,
        respiratoryRate: data.respiratoryRate,
        rawData: data.rawData || null,
      }).onConflictDoUpdate({
        target: [biometricData.userId, biometricData.dataDate, biometricData.provider],
        set: {
          sleepScore: data.sleepScore,
          sleepHours: data.sleepHours,
          deepSleepMinutes: data.deepSleepMinutes,
          remSleepMinutes: data.remSleepMinutes,
          lightSleepMinutes: data.lightSleepMinutes,
          hrvMs: data.hrvMs,
          restingHeartRate: data.restingHeartRate,
          averageHeartRate: data.averageHeartRate,
          maxHeartRate: data.maxHeartRate,
          recoveryScore: data.recoveryScore,
          readinessScore: data.readinessScore,
          strainScore: data.strainScore,
          steps: data.steps,
          caloriesBurned: data.caloriesBurned,
          activeMinutes: data.activeMinutes,
          spo2Percentage: data.spo2Percentage,
          skinTempCelsius: data.skinTempCelsius,
          respiratoryRate: data.respiratoryRate,
          rawData: data.rawData || null,
          syncedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Error saving biometric data:', error);
      throw new Error('Failed to save biometric data');
    }
  }

  async getBiometricData(userId: string, startDate: Date, endDate: Date): Promise<any[]> {
    try {
      const { biometricData } = await import('@shared/schema');
      
      return await db
        .select()
        .from(biometricData)
        .where(and(
          eq(biometricData.userId, userId),
          gte(biometricData.dataDate, startDate),
          lte(biometricData.dataDate, endDate)
        ))
        .orderBy(desc(biometricData.dataDate));
    } catch (error) {
      console.error('Error getting biometric data:', error);
      return [];
    }
  }

  async getBiometricTrends(userId: string, periodType: 'week' | 'month'): Promise<any | null> {
    try {
      const { biometricTrends } = await import('@shared/schema');
      const [trend] = await db
        .select()
        .from(biometricTrends)
        .where(and(
          eq(biometricTrends.userId, userId),
          eq(biometricTrends.periodType, periodType)
        ))
        .orderBy(desc(biometricTrends.periodEnd))
        .limit(1);
      
      return trend || null;
    } catch (error) {
      console.error('Error getting biometric trends:', error);
      return null;
    }
  }

  async updateFormulaVersion(userId: string, updates: Partial<InsertFormula>): Promise<Formula> {
    try {
      const [current] = await db
        .select({ id: formulas.id })
        .from(formulas)
        .where(eq(formulas.userId, userId))
        .orderBy(desc(formulas.createdAt))
        .limit(1);

      if (!current) {
        throw new Error('No formula found for user');
      }

      const sanitizedUpdates: Partial<InsertFormula> = { ...updates };
      const normalizedBases = normalizeFormulaIngredients(updates.bases as any);
      const normalizedAdditions = normalizeFormulaIngredients(updates.additions as any);
      if (normalizedBases) {
        sanitizedUpdates.bases = normalizedBases as InsertFormula['bases'];
      }
      if (normalizedAdditions) {
        sanitizedUpdates.additions = normalizedAdditions as InsertFormula['additions'];
      }
      if (updates.userCustomizations) {
        sanitizedUpdates.userCustomizations = normalizeFormulaCustomizations(updates.userCustomizations as any) as InsertFormula['userCustomizations'];
      }

      const drizzleUpdates = sanitizedUpdates as Partial<DbInsertFormula>;
      const [updated] = await db
        .update(formulas)
        .set(drizzleUpdates)
        .where(eq(formulas.id, current.id))
        .returning();

      if (!updated) {
        throw new Error('Failed to update formula');
      }

      return updated;
    } catch (error) {
      console.error('Error updating formula version:', error);
      throw new Error('Failed to update formula');
    }
  }

  async updateFormulaCustomizations(formulaId: string, customizations: { addedBases?: any[]; addedIndividuals?: any[] }, newTotalMg: number): Promise<Formula> {
    try {
      const formulaUpdates: Partial<DbInsertFormula> = {
        userCustomizations: normalizeFormulaCustomizations(customizations) as DbInsertFormula['userCustomizations'],
        totalMg: newTotalMg
      };

      const [updated] = await db
        .update(formulas)
        .set(formulaUpdates)
        .where(eq(formulas.id, formulaId))
        .returning();

      if (!updated) {
        throw new Error('Formula not found');
      }

      return updated;
    } catch (error) {
      console.error('Error updating formula customizations:', error);
      throw new Error('Failed to update formula customizations');
    }
  }

  async updateFormulaName(formulaId: string, name: string): Promise<Formula> {
    try {
      const [updated] = await db
        .update(formulas)
        .set({ name: name.trim() })
        .where(eq(formulas.id, formulaId))
        .returning();

      if (!updated) {
        throw new Error('Formula not found');
      }

      return updated;
    } catch (error) {
      console.error('Error updating formula name:', error);
      throw new Error('Failed to update formula name');
    }
  }

  async getReviewSchedule(userId: string, formulaId: string): Promise<ReviewSchedule | undefined> {
    try {
      const [schedule] = await db
        .select()
        .from(reviewSchedules)
        .where(and(
          eq(reviewSchedules.userId, userId),
          eq(reviewSchedules.formulaId, formulaId),
          eq(reviewSchedules.isActive, true)
        ))
        .limit(1);
      return schedule || undefined;
    } catch (error) {
      console.error('Error fetching review schedule:', error);
      return undefined;
    }
  }

  async createReviewSchedule(schedule: InsertReviewSchedule): Promise<ReviewSchedule> {
    try {
      const [created] = await db.insert(reviewSchedules).values(schedule).returning();
      return created;
    } catch (error) {
      console.error('Error creating review schedule:', error);
      throw new Error('Failed to create review schedule');
    }
  }

  async updateReviewSchedule(id: string, updates: Partial<InsertReviewSchedule>): Promise<ReviewSchedule | undefined> {
    try {
      const [updated] = await db
        .update(reviewSchedules)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(reviewSchedules.id, id))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error('Error updating review schedule:', error);
      return undefined;
    }
  }

  async deleteReviewSchedule(id: string): Promise<boolean> {
    try {
      const result = await db
        .update(reviewSchedules)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(reviewSchedules.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting review schedule:', error);
      return false;
    }
  }

  async getActiveReviewSchedules(): Promise<ReviewSchedule[]> {
    try {
      return await db
        .select()
        .from(reviewSchedules)
        .where(eq(reviewSchedules.isActive, true))
        .orderBy(reviewSchedules.nextReviewDate);
    } catch (error) {
      console.error('Error fetching active review schedules:', error);
      return [];
    }
  }

  async getUpcomingReviews(daysAhead: number): Promise<ReviewSchedule[]> {
    try {
      const now = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + daysAhead);

      return await db
        .select()
        .from(reviewSchedules)
        .where(and(
          eq(reviewSchedules.isActive, true),
          gte(reviewSchedules.nextReviewDate, now),
          lte(reviewSchedules.nextReviewDate, endDate)
        ))
        .orderBy(reviewSchedules.nextReviewDate);
    } catch (error) {
      console.error('Error fetching upcoming review schedules:', error);
      return [];
    }
  }

  // ===== OPTIMIZE FEATURE OPERATIONS =====
  
  // Optimize Plans
  async deactivateOldPlans(userId: string, planType: 'nutrition' | 'workout' | 'lifestyle'): Promise<void> {
    await db
      .update(optimizePlans)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(
        eq(optimizePlans.userId, userId),
        eq(optimizePlans.planType, planType),
        eq(optimizePlans.isActive, true)
      ));
    console.log(`🔄 Deactivated old ${planType} plans for user`);
  }

  async createOptimizePlan(plan: InsertOptimizePlan): Promise<OptimizePlan> {
    const [created] = await db.insert(optimizePlans).values(plan).returning();
    return created;
  }

  async getOptimizePlan(id: string): Promise<OptimizePlan | undefined> {
    const [plan] = await db
      .select()
      .from(optimizePlans)
      .where(eq(optimizePlans.id, id));
    return plan;
  }

  async getActiveOptimizePlan(userId: string, planType: 'nutrition' | 'workout' | 'lifestyle'): Promise<OptimizePlan | undefined> {
    const [plan] = await db
      .select()
      .from(optimizePlans)
      .where(and(
        eq(optimizePlans.userId, userId),
        eq(optimizePlans.planType, planType),
        eq(optimizePlans.isActive, true)
      ))
      .orderBy(desc(optimizePlans.createdAt))
      .limit(1);
    return plan;
  }

  async getOptimizePlans(userId: string): Promise<OptimizePlan[]> {
    return await db
      .select()
      .from(optimizePlans)
      .where(eq(optimizePlans.userId, userId))
      .orderBy(desc(optimizePlans.createdAt));
  }

  async updateOptimizePlan(id: string, updates: Partial<InsertOptimizePlan>): Promise<OptimizePlan | undefined> {
    const [updated] = await db
      .update(optimizePlans)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(optimizePlans.id, id))
      .returning();
    return updated;
  }

  // Daily Logs & Streaks
  async createDailyLog(log: InsertOptimizeDailyLog): Promise<OptimizeDailyLog> {
    const [created] = await db.insert(optimizeDailyLogs).values(log).returning();
    
    // Update streak after logging
    await this.updateUserStreak(log.userId, log.logDate);
    
    return created;
  }

  async getDailyLog(userId: string, date: Date): Promise<OptimizeDailyLog | undefined> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [log] = await db
      .select()
      .from(optimizeDailyLogs)
      .where(and(
        eq(optimizeDailyLogs.userId, userId),
        gte(optimizeDailyLogs.logDate, startOfDay),
        lte(optimizeDailyLogs.logDate, endOfDay)
      ))
      .limit(1);
    return log;
  }

  async listDailyLogs(userId: string, startDate: Date, endDate: Date): Promise<OptimizeDailyLog[]> {
    return await db
      .select()
      .from(optimizeDailyLogs)
      .where(and(
        eq(optimizeDailyLogs.userId, userId),
        gte(optimizeDailyLogs.logDate, startDate),
        lte(optimizeDailyLogs.logDate, endDate)
      ))
      .orderBy(desc(optimizeDailyLogs.logDate));
  }

  async updateDailyLog(id: string, updates: Partial<InsertOptimizeDailyLog>): Promise<OptimizeDailyLog | undefined> {
    const [updated] = await db
      .update(optimizeDailyLogs)
      .set(updates)
      .where(eq(optimizeDailyLogs.id, id))
      .returning();
    return updated;
  }

  // Meal Logs
  async createMealLog(log: InsertMealLog): Promise<MealLog> {
    const [created] = await db.insert(mealLogs).values(log).returning();
    return created;
  }

  async getMealLogById(logId: string): Promise<MealLog | undefined> {
    const [log] = await db
      .select()
      .from(mealLogs)
      .where(eq(mealLogs.id, logId));
    return log;
  }

  async getMealLogsForDay(userId: string, date: Date): Promise<MealLog[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await db
      .select()
      .from(mealLogs)
      .where(and(
        eq(mealLogs.userId, userId),
        gte(mealLogs.loggedAt, startOfDay),
        lte(mealLogs.loggedAt, endOfDay)
      ))
      .orderBy(mealLogs.loggedAt);
  }

  async getMealLogsHistory(userId: string, limit = 50): Promise<MealLog[]> {
    return await db
      .select()
      .from(mealLogs)
      .where(eq(mealLogs.userId, userId))
      .orderBy(desc(mealLogs.loggedAt))
      .limit(limit);
  }

  async updateMealLog(logId: string, updates: Partial<InsertMealLog>): Promise<MealLog | undefined> {
    const [updated] = await db
      .update(mealLogs)
      .set(updates)
      .where(eq(mealLogs.id, logId))
      .returning();
    return updated;
  }

  async deleteMealLog(userId: string, logId: string): Promise<boolean> {
    const result = await db
      .delete(mealLogs)
      .where(and(eq(mealLogs.id, logId), eq(mealLogs.userId, userId)));
    return (result.rowCount || 0) > 0;
  }

  async getTodayNutritionTotals(userId: string): Promise<{ calories: number; protein: number; carbs: number; fat: number; mealsLogged: number; waterOz: number }> {
    const today = new Date();
    const meals = await this.getMealLogsForDay(userId, today);
    
    return {
      calories: meals.reduce((sum, m) => sum + (m.calories || 0), 0),
      protein: meals.reduce((sum, m) => sum + (m.proteinGrams || 0), 0),
      carbs: meals.reduce((sum, m) => sum + (m.carbsGrams || 0), 0),
      fat: meals.reduce((sum, m) => sum + (m.fatGrams || 0), 0),
      mealsLogged: meals.filter(m => !m.waterOz).length, // Don't count water-only entries as meals
      waterOz: meals.reduce((sum, m) => sum + (m.waterOz || 0), 0),
    };
  }

  // User Streaks
  async getUserStreak(userId: string, streakType: 'overall' | 'nutrition' | 'workout' | 'lifestyle'): Promise<UserStreak | undefined> {
    const [streak] = await db
      .select()
      .from(userStreaks)
      .where(and(
        eq(userStreaks.userId, userId),
        eq(userStreaks.streakType, streakType)
      ));
    return streak;
  }

  async updateUserStreak(userId: string, logDate: Date): Promise<void> {
    // Get yesterday's log
    const yesterday = new Date(logDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayLog = await this.getDailyLog(userId, yesterday);
    
    // Get or create overall streak
    let streak = await this.getUserStreak(userId, 'overall');
    
    if (!streak) {
      // Create new streak
      await db.insert(userStreaks).values({
        userId,
        streakType: 'overall',
        currentStreak: 1,
        longestStreak: 1,
        lastLoggedDate: logDate
      });
      return;
    }

    // Calculate if streak continues
    const yesterday24h = new Date();
    yesterday24h.setDate(yesterday24h.getDate() - 1);
    yesterday24h.setHours(0, 0, 0, 0);
    
    const lastLoggedDate = streak.lastLoggedDate ? new Date(streak.lastLoggedDate) : null;
    lastLoggedDate?.setHours(0, 0, 0, 0);

    let newCurrentStreak = streak.currentStreak;
    
    // Check if logged yesterday (streak continues)
    if (lastLoggedDate && lastLoggedDate.getTime() === yesterday24h.getTime()) {
      newCurrentStreak += 1;
    } else if (!lastLoggedDate || lastLoggedDate.getTime() < yesterday24h.getTime()) {
      // Streak broken - reset to 1
      newCurrentStreak = 1;
    }
    // If logged today already, don't change streak

    const newLongestStreak = Math.max(newCurrentStreak, streak.longestStreak);

    await db
      .update(userStreaks)
      .set({
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
        lastLoggedDate: logDate,
        updatedAt: new Date()
      })
      .where(and(
        eq(userStreaks.userId, userId),
        eq(userStreaks.streakType, 'overall')
      ));
  }

  // =====================================================
  // ENHANCED STREAK & SCORING SYSTEM
  // =====================================================

  // Category score calculation functions
  calculateNutritionScore(dailyLog: OptimizeDailyLog | null | undefined, meals: MealLog[]): number {
    if (!dailyLog && meals.length === 0) return 0;
    
    let score = 0;
    
    // Count meal types logged
    const mealTypes = new Set(meals.map(m => m.mealType));
    if (mealTypes.has('breakfast')) score += 0.25;
    if (mealTypes.has('lunch')) score += 0.25;
    if (mealTypes.has('dinner')) score += 0.25;
    if (mealTypes.has('snack')) score += 0.10;
    
    // Bonus for hitting calorie goals (we don't have stored targets, so just check if reasonable calories logged)
    const totalCalories = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
    // Give bonus if user logged reasonable calories (between 1500-3000)
    if (totalCalories >= 1500 && totalCalories <= 3000) {
      score += 0.15;
    }
    
    return Math.min(score, 1.0);
  }

  calculateWorkoutScore(
    workoutLog: WorkoutLog | null, 
    workoutPlan: WorkoutPlan | null | undefined, 
    dayOfWeek: string
  ): number | null {
    // Get planned workout for today from workoutSchedule
    const schedule = workoutPlan?.workoutSchedule as Array<{ day: string; isRestDay?: boolean; workoutId?: string }> | null;
    const todayPlan = schedule?.find(d => d.day.toLowerCase() === dayOfWeek.toLowerCase());
    
    // Planned rest day = full credit
    if (todayPlan?.isRestDay) return 1.0;
    
    // No workout planned and none done - N/A (don't count against streak)
    if (!todayPlan && !workoutLog) return null;
    
    // Workout completed
    if (workoutLog?.completedAt) {
      // We don't have direct access to planned exercises here, use exercisesCompleted count
      const exercisesCompleted = (workoutLog.exercisesCompleted as unknown[] | null)?.length || 0;
      // If they completed exercises, give proportional credit based on effort
      if (exercisesCompleted >= 6) return 1.0;
      if (exercisesCompleted >= 4) return 0.75;
      if (exercisesCompleted >= 2) return 0.50;
      const completionRatio = exercisesCompleted > 0 ? 0.25 : 0;
      
      return completionRatio;
    }
    
    // Planned workout not done
    return 0;
  }

  calculateSupplementScore(dailyLog: OptimizeDailyLog | null | undefined): number {
    if (!dailyLog) return 0;
    
    let doses = 0;
    if (dailyLog.supplementMorning) doses++;
    if (dailyLog.supplementAfternoon) doses++;
    if (dailyLog.supplementEvening) doses++;
    
    // Return exact proportion (0, 0.33, 0.67, or 1.0)
    return Math.round((doses / 3) * 100) / 100;
  }

  calculateLifestyleScore(dailyLog: OptimizeDailyLog | null | undefined, biometricData?: { sleepDuration?: number; steps?: number }): number {
    // Simplified: if user logged sleep, energy, and mood, that's the core lifestyle check-in
    // Each core metric (sleep, energy, mood) contributes equally = 0.33 each
    // Bonus points for biometrics and hydration
    
    let score = 0;
    
    // Core lifestyle check-in (0.33 each = 1.0 total for all three)
    if (dailyLog?.sleepQuality) score += 0.33;
    if (dailyLog?.energyLevel) score += 0.33;
    if (dailyLog?.moodLevel) score += 0.34;
    
    // Bonus: biometric data (if connected to wearables)
    const sleepHours = biometricData?.sleepDuration;
    if (sleepHours && sleepHours >= 7) score += 0.10;
    
    const steps = biometricData?.steps;
    if (steps && steps >= 7500) score += 0.10;
    
    // Bonus: hydration (already tracked separately, but contributes to overall wellness)
    const waterOz = dailyLog?.waterIntakeOz || 0;
    if (waterOz >= 64) score += 0.10;
    
    return Math.min(score, 1.0);
  }

  // Get or create daily completion record
  async getDailyCompletion(userId: string, logDate: Date): Promise<DailyCompletion | undefined> {
    const dateStr = logDate.toISOString().split('T')[0];
    const [completion] = await db
      .select()
      .from(dailyCompletions)
      .where(and(
        eq(dailyCompletions.userId, userId),
        eq(dailyCompletions.logDate, dateStr)
      ));
    return completion;
  }

  async upsertDailyCompletion(userId: string, logDate: Date, updates: Partial<InsertDailyCompletion>): Promise<DailyCompletion> {
    const dateStr = logDate.toISOString().split('T')[0];
    const existing = await this.getDailyCompletion(userId, logDate);
    
    if (existing) {
      const [updated] = await db
        .update(dailyCompletions)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(dailyCompletions.id, existing.id))
        .returning();
      return updated;
    }
    
    const [created] = await db
      .insert(dailyCompletions)
      .values({
        userId,
        logDate: dateStr,
        ...updates
      })
      .returning();
    return created;
  }

  // Calculate all scores for a specific day and update daily_completions
  async calculateAndSaveDailyScores(userId: string, logDate: Date): Promise<DailyCompletion> {
    const dateStr = logDate.toISOString().split('T')[0];
    const dayOfWeek = logDate.toLocaleDateString('en-US', { weekday: 'long' });
    
    // Fetch all required data
    const [dailyLog, meals, workoutPlan, workoutLogs] = await Promise.all([
      this.getDailyLog(userId, logDate),
      this.getMealLogsForDay(userId, logDate),
      this.getActiveWorkoutPlan(userId),
      this.getWorkoutLogsForDate(userId, logDate)
    ]);
    
    const workoutLog = workoutLogs.length > 0 ? workoutLogs[0] : null;
    
    // Calculate individual category scores
    const nutritionScore = this.calculateNutritionScore(dailyLog, meals);
    const workoutScore = this.calculateWorkoutScore(workoutLog, workoutPlan, dayOfWeek);
    const supplementScore = this.calculateSupplementScore(dailyLog);
    const lifestyleScore = this.calculateLifestyleScore(dailyLog);
    
    // Calculate weighted daily score (workouts optional if no plan)
    let dailyScore: number;
    if (workoutScore === null) {
      // No workout expected - weight across 3 categories
      dailyScore = (nutritionScore * 0.35 + supplementScore * 0.35 + lifestyleScore * 0.30);
    } else {
      // Full 4-category weighting
      dailyScore = (nutritionScore * 0.25 + workoutScore * 0.30 + supplementScore * 0.25 + lifestyleScore * 0.20);
    }
    
    // Save to daily_completions
    const completion = await this.upsertDailyCompletion(userId, logDate, {
      nutritionScore: nutritionScore.toFixed(2),
      workoutScore: workoutScore?.toFixed(2) ?? null,
      supplementScore: supplementScore.toFixed(2),
      lifestyleScore: lifestyleScore.toFixed(2),
      dailyScore: dailyScore.toFixed(2),
      nutritionDetails: { mealsLogged: meals.length, mealTypes: Array.from(new Set(meals.map((m: MealLog) => m.mealType))) },
      workoutDetails: workoutLog ? { completed: true, exerciseCount: (workoutLog.exercisesCompleted as unknown[] | null)?.length || 0 } : null,
      supplementDetails: { morning: dailyLog?.supplementMorning, afternoon: dailyLog?.supplementAfternoon, evening: dailyLog?.supplementEvening },
      lifestyleDetails: { sleepQuality: dailyLog?.sleepQuality, waterOz: dailyLog?.waterIntakeOz, mood: dailyLog?.moodLevel, energy: dailyLog?.energyLevel }
    });
    
    return completion;
  }

  // Enhanced streak update for all categories
  async updateCategoryStreak(
    userId: string, 
    streakType: 'overall' | 'nutrition' | 'workout' | 'supplements' | 'lifestyle',
    todayScore: number,
    logDate: Date,
    threshold: number = 0.50
  ): Promise<UserStreak> {
    const dateStr = logDate.toISOString().split('T')[0];
    
    // Get or create streak record
    let streak = await this.getUserStreak(userId, streakType as 'overall' | 'nutrition' | 'workout' | 'lifestyle');
    
    if (!streak) {
      // Create new streak for this category
      const [created] = await db.insert(userStreaks).values({
        userId,
        streakType,
        currentStreak: todayScore >= threshold ? 1 : 0,
        longestStreak: todayScore >= threshold ? 1 : 0,
        lastLoggedDate: logDate,
        lastCompletedDate: todayScore >= threshold ? dateStr : null
      }).returning();
      return created;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const lastCompleted = streak.lastCompletedDate ? new Date(streak.lastCompletedDate) : null;
    lastCompleted?.setHours(0, 0, 0, 0);
    
    let newCurrentStreak = streak.currentStreak;
    
    // Score meets threshold
    if (todayScore >= threshold) {
      if (!lastCompleted) {
        // First completion ever
        newCurrentStreak = 1;
      } else if (lastCompleted.getTime() === yesterday.getTime()) {
        // Completed yesterday - streak continues
        newCurrentStreak = streak.currentStreak + 1;
      } else if (lastCompleted.getTime() === today.getTime()) {
        // Already logged today - no change
        newCurrentStreak = streak.currentStreak;
      } else {
        // Gap in completions - check grace period (28 hours for late logging)
        const hoursAgo = (today.getTime() - lastCompleted.getTime()) / (1000 * 60 * 60);
        if (hoursAgo <= 52) { // ~2 days grace
          newCurrentStreak = streak.currentStreak + 1;
        } else {
          newCurrentStreak = 1; // Reset streak
        }
      }
    } else {
      // Score below threshold
      if (lastCompleted && lastCompleted.getTime() < yesterday.getTime()) {
        // More than a day since last completion - break streak
        newCurrentStreak = 0;
      }
    }
    
    const newLongestStreak = Math.max(newCurrentStreak, streak.longestStreak);
    
    const [updated] = await db
      .update(userStreaks)
      .set({
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
        lastLoggedDate: logDate,
        lastCompletedDate: todayScore >= threshold ? dateStr : streak.lastCompletedDate,
        updatedAt: new Date()
      })
      .where(eq(userStreaks.id, streak.id))
      .returning();
    
    return updated;
  }

  // Update all streaks for a user (called after any log update)
  async updateAllStreaks(userId: string, logDate: Date): Promise<{ [key: string]: UserStreak }> {
    // First calculate and save daily scores
    const completion = await this.calculateAndSaveDailyScores(userId, logDate);
    
    // Define thresholds for each category
    const thresholds = {
      nutrition: 0.50,    // At least 2 meals
      workout: 0.50,      // At least half the workout
      supplements: 0.33,  // At least 1 dose
      lifestyle: 0.40,    // Sleep + one other
      overall: 0.50       // Weighted average
    };
    
    const results: { [key: string]: UserStreak } = {};
    
    // Update each category streak
    if (completion.nutritionScore) {
      results.nutrition = await this.updateCategoryStreak(userId, 'nutrition', parseFloat(completion.nutritionScore), logDate, thresholds.nutrition);
    }
    if (completion.workoutScore) {
      results.workout = await this.updateCategoryStreak(userId, 'workout', parseFloat(completion.workoutScore), logDate, thresholds.workout);
    }
    if (completion.supplementScore) {
      results.supplements = await this.updateCategoryStreak(userId, 'supplements', parseFloat(completion.supplementScore), logDate, thresholds.supplements);
    }
    if (completion.lifestyleScore) {
      results.lifestyle = await this.updateCategoryStreak(userId, 'lifestyle', parseFloat(completion.lifestyleScore), logDate, thresholds.lifestyle);
    }
    if (completion.dailyScore) {
      results.overall = await this.updateCategoryStreak(userId, 'overall', parseFloat(completion.dailyScore), logDate, thresholds.overall);
    }
    
    return results;
  }

  // Get all streaks for a user
  async getAllUserStreaks(userId: string): Promise<UserStreak[]> {
    return await db
      .select()
      .from(userStreaks)
      .where(eq(userStreaks.userId, userId));
  }

  // Get streak summary for dashboard
  async getStreakSummary(userId: string): Promise<{
    overall: { current: number; longest: number };
    nutrition: { current: number; longest: number };
    workout: { current: number; longest: number };
    supplements: { current: number; longest: number };
    lifestyle: { current: number; longest: number };
    todayScores: {
      nutrition: number | null;
      workout: number | null;
      supplements: number | null;
      lifestyle: number | null;
      overall: number;
    } | null;
    weeklyProgress: Array<{
      date: string;
      nutritionScore: number | null;
      workoutScore: number | null;
      supplementScore: number | null;
      lifestyleScore: number | null;
      dailyScore: number | null;
    }>;
    isPaused?: boolean;
  }> {
    const prefs = await this.getTrackingPreferences(userId);
    
    // Check if tracking is paused
    const isPaused = prefs?.pauseUntil ? new Date(prefs.pauseUntil) > new Date() : false;
    
    const enabled = {
      nutrition: prefs?.trackNutrition !== false,
      workout: prefs?.trackWorkouts !== false,
      supplements: prefs?.trackSupplements !== false,
      lifestyle: prefs?.trackLifestyle !== false,
    };

    const streaks = await this.getAllUserStreaks(userId);

    const defaultStreak = { current: 0, longest: 0 };
    const streakMap: { [key: string]: { current: number; longest: number } } = {};
    for (const s of streaks) {
      streakMap[s.streakType] = { current: s.currentStreak, longest: s.longestStreak };
    }

    const today = new Date();
    const todayCompletion = await this.getDailyCompletion(userId, today);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weeklyCompletions = await db
      .select()
      .from(dailyCompletions)
      .where(and(
        eq(dailyCompletions.userId, userId),
        gte(dailyCompletions.logDate, weekAgo.toISOString().split('T')[0])
      ))
      .orderBy(dailyCompletions.logDate);

    // When paused, freeze streaks at their current values (don't reset to 0)
    // but don't allow them to grow either - they stay frozen
    return {
      overall: streakMap['overall'] || defaultStreak,
      nutrition: enabled.nutrition ? (streakMap['nutrition'] || defaultStreak) : defaultStreak,
      workout: enabled.workout ? (streakMap['workout'] || defaultStreak) : defaultStreak,
      supplements: enabled.supplements ? (streakMap['supplements'] || defaultStreak) : defaultStreak,
      lifestyle: enabled.lifestyle ? (streakMap['lifestyle'] || defaultStreak) : defaultStreak,
      todayScores: isPaused ? null : (todayCompletion ? {
        nutrition: enabled.nutrition ? parseFloat(todayCompletion.nutritionScore || '0') : null,
        workout: enabled.workout && todayCompletion.workoutScore ? parseFloat(todayCompletion.workoutScore) : null,
        supplements: enabled.supplements ? parseFloat(todayCompletion.supplementScore || '0') : null,
        lifestyle: enabled.lifestyle ? parseFloat(todayCompletion.lifestyleScore || '0') : null,
        overall: parseFloat(todayCompletion.dailyScore || '0'),
      } : null),
      weeklyProgress: weeklyCompletions.map(c => ({
        date: c.logDate,
        nutritionScore: enabled.nutrition && c.nutritionScore ? parseFloat(c.nutritionScore) : null,
        workoutScore: enabled.workout && c.workoutScore ? parseFloat(c.workoutScore) : null,
        supplementScore: enabled.supplements && c.supplementScore ? parseFloat(c.supplementScore) : null,
        lifestyleScore: enabled.lifestyle && c.lifestyleScore ? parseFloat(c.lifestyleScore) : null,
        dailyScore: c.dailyScore ? parseFloat(c.dailyScore) : null,
      })),
      isPaused,
    };
  }

  // Get smart streak data with percentage-based daily progress and rest day detection
  async getSmartStreakData(userId: string, userTimezone: string = 'America/New_York'): Promise<{
    currentStreak: number;
    longestStreak: number;
    monthlyProgress: Array<{
      date: string;
      percentage: number;
      isRestDay: boolean;
      breakdown: {
        workout: { done: boolean; isRestDay: boolean };
        nutrition: { score: number; mealsLogged: number; mainMeals: number; goal: number };
        supplements: { taken: number; total: number };
        water: { current: number; goal: number };
        lifestyle: { sleepLogged: boolean; energyLogged: boolean; moodLogged: boolean; complete: boolean };
      };
    }>;
    todayBreakdown: {
      workout: { done: boolean; isRestDay: boolean };
      nutrition: { score: number; mealsLogged: number; mainMeals: number; goal: number };
      supplements: { taken: number; total: number };
      water: { current: number; goal: number };
      lifestyle: { sleepLogged: boolean; energyLogged: boolean; moodLogged: boolean; complete: boolean };
    } | null;
  }> {
    const prefs = await this.getTrackingPreferences(userId);
    const hydrationGoal = prefs?.hydrationGoalOz ?? 64;
    
    // Get active workout plan to determine rest days
    const workoutPlan = await this.getActiveWorkoutPlan(userId);
    let restDays: number[] = []; // 0 = Sunday, 1 = Monday, etc.
    
    if (workoutPlan?.workoutSchedule) {
      try {
        const schedule = typeof workoutPlan.workoutSchedule === 'string' 
          ? JSON.parse(workoutPlan.workoutSchedule) 
          : workoutPlan.workoutSchedule;
        
        // Extract rest days from workout plan schedule
        // workoutSchedule format: [{ day: "Monday", workoutId: "uuid" }, ...]
        // Days without workoutId or with workoutId "rest" are rest days
        if (Array.isArray(schedule)) {
          const dayMap: Record<string, number> = {
            'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
            'thursday': 4, 'friday': 5, 'saturday': 6
          };
          
          schedule.forEach((item: any) => {
            const dayIndex = dayMap[item.day?.toLowerCase()];
            if (dayIndex !== undefined && (!item.workoutId || item.workoutId === 'rest' || item.isRestDay)) {
              restDays.push(dayIndex);
            }
          });
        }
      } catch (e) {
        // If parsing fails, assume no rest days
      }
    }

    // Get overall streak
    const streaks = await this.getAllUserStreaks(userId);
    const overallStreak = streaks.find(s => s.streakType === 'overall');
    
    // Get month's data (30 days ending today in user's timezone)
    const today = getUserLocalMidnight(userTimezone);
    const startOfMonth = new Date(today);
    startOfMonth.setDate(today.getDate() - 29); // 30 days total including today
    startOfMonth.setHours(0, 0, 0, 0);
    
    // Calculate today's date string in user's timezone
    const todayStr = getUserLocalDateString(userTimezone);
    
    const monthlyProgress: Array<{
      date: string;
      percentage: number;
      isRestDay: boolean;
      breakdown: {
        workout: { done: boolean; isRestDay: boolean };
        nutrition: { score: number; mealsLogged: number; mainMeals: number; goal: number };
        supplements: { taken: number; total: number };
        water: { current: number; goal: number };
        lifestyle: { sleepLogged: boolean; energyLogged: boolean; moodLogged: boolean; complete: boolean };
      };
    }> = [];

    // OPTIMIZATION: Batch fetch all data for 30 days in a few queries instead of 120+ individual queries
    const endOfMonth = new Date(today);
    endOfMonth.setHours(23, 59, 59, 999);
    
    // Batch fetch all daily logs for the month
    const allDailyLogs = await this.listDailyLogs(userId, startOfMonth, endOfMonth);
    const dailyLogsByDate = new Map<string, typeof allDailyLogs[0]>();
    allDailyLogs.forEach(log => {
      const logDate = new Date(log.logDate);
      const dateStr = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}-${String(logDate.getDate()).padStart(2, '0')}`;
      dailyLogsByDate.set(dateStr, log);
    });
    
    // Batch fetch all daily completions for the month
    const allCompletions = await db
      .select()
      .from(dailyCompletions)
      .where(and(
        eq(dailyCompletions.userId, userId),
        gte(dailyCompletions.logDate, startOfMonth.toISOString().split('T')[0]),
        lte(dailyCompletions.logDate, endOfMonth.toISOString().split('T')[0])
      ));
    const completionsByDate = new Map<string, typeof allCompletions[0]>();
    allCompletions.forEach(c => completionsByDate.set(c.logDate, c));
    
    // Batch fetch all workout logs for the month
    const allWorkoutLogs = await db
      .select()
      .from(workoutLogs)
      .where(and(
        eq(workoutLogs.userId, userId),
        gte(workoutLogs.completedAt, startOfMonth),
        lte(workoutLogs.completedAt, endOfMonth)
      ));
    const workoutLogsByDate = new Map<string, typeof allWorkoutLogs>();
    allWorkoutLogs.forEach(log => {
      const logDate = new Date(log.completedAt);
      const dateStr = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}-${String(logDate.getDate()).padStart(2, '0')}`;
      if (!workoutLogsByDate.has(dateStr)) workoutLogsByDate.set(dateStr, []);
      workoutLogsByDate.get(dateStr)!.push(log);
    });
    
    // Batch fetch all meal logs for the month
    const allMealLogs = await db
      .select()
      .from(mealLogs)
      .where(and(
        eq(mealLogs.userId, userId),
        gte(mealLogs.loggedAt, startOfMonth),
        lte(mealLogs.loggedAt, endOfMonth)
      ));
    const mealLogsByDate = new Map<string, typeof allMealLogs>();
    allMealLogs.forEach(log => {
      const logDate = new Date(log.loggedAt);
      const dateStr = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}-${String(logDate.getDate()).padStart(2, '0')}`;
      if (!mealLogsByDate.has(dateStr)) mealLogsByDate.set(dateStr, []);
      mealLogsByDate.get(dateStr)!.push(log);
    });

    for (let i = 0; i < 30; i++) {
      const date = new Date(startOfMonth);
      date.setDate(startOfMonth.getDate() + i);
      // Use local date parts instead of ISO string to avoid timezone issues
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const dayOfWeek = date.getDay();
      
      // Get daily log from batch (no DB call)
      const dailyLog = dailyLogsByDate.get(dateStr);
      
      // Rest day: manual override OR scheduled rest day from workout plan
      const isRestDay = dailyLog?.isRestDay || restDays.includes(dayOfWeek);
      
      // Get daily completion data from batch (no DB call)
      const completion = completionsByDate.get(dateStr);
      
      // Get workout logs for this day from batch (no DB call)
      const dayWorkoutLogs = workoutLogsByDate.get(dateStr) || [];
      const workoutDone = dayWorkoutLogs.length > 0;
      
      // Get meals logged for this day from batch (no DB call)
      const mealsLogged = mealLogsByDate.get(dateStr) || [];
      const uniqueMealTypes = new Set(mealsLogged.map(m => m.mealType));
      // Count main meals (breakfast, lunch, dinner) as goal of 3
      const mainMealsLogged = (['breakfast', 'lunch', 'dinner'] as const).filter(type => uniqueMealTypes.has(type)).length;
      
      // Calculate breakdown
      const breakdown = {
        workout: { 
          done: workoutDone, 
          isRestDay 
        },
        nutrition: { 
          score: completion?.nutritionScore ? Math.round(parseFloat(completion.nutritionScore) * 100) : 0,
          mealsLogged: mealsLogged.length,
          mainMeals: mainMealsLogged,
          goal: 3 // 3 main meals is the standard goal
        },
        supplements: { 
          taken: [
            dailyLog?.supplementMorning,
            dailyLog?.supplementAfternoon,
            dailyLog?.supplementEvening
          ].filter(Boolean).length,
          total: 3 
        },
        water: { 
          current: dailyLog?.waterIntakeOz || 0, 
          goal: hydrationGoal 
        },
        lifestyle: { 
          // Check directly if user logged sleep, energy, and mood
          sleepLogged: !!dailyLog?.sleepQuality,
          energyLogged: !!dailyLog?.energyLevel,
          moodLogged: !!dailyLog?.moodLevel,
          complete: !!(dailyLog?.sleepQuality && dailyLog?.energyLevel && dailyLog?.moodLevel)
        },
      };
      
      // Calculate percentage based on enabled categories
      const enabled = {
        workout: prefs?.trackWorkouts !== false,
        nutrition: prefs?.trackNutrition !== false,
        supplements: prefs?.trackSupplements !== false,
        water: hydrationGoal > 0,
        lifestyle: prefs?.trackLifestyle !== false,
      };
      
      let completed = 0;
      let total = 0;
      
      if (enabled.workout) {
        total++;
        if (isRestDay || workoutDone) completed++;
      }
      if (enabled.nutrition) {
        total++;
        // Count as complete if user logged ANY meal
        if (breakdown.nutrition.mealsLogged > 0) completed++;
      }
      if (enabled.supplements) {
        total++;
        if (breakdown.supplements.taken >= breakdown.supplements.total) completed++;
      }
      if (enabled.water) {
        total++;
        if (breakdown.water.current >= breakdown.water.goal) completed++;
      }
      if (enabled.lifestyle) {
        total++;
        // Lifestyle complete if user logged sleep, energy, AND mood
        if (breakdown.lifestyle.complete) completed++;
      }
      
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      monthlyProgress.push({
        date: dateStr,
        percentage,
        isRestDay,
        breakdown,
      });
    }
    
    // Find today's data from monthlyProgress
    const todayData = monthlyProgress.find(d => d.date === todayStr);
    
    // Calculate current streak from monthlyProgress (count consecutive 100% days from today backwards)
    let calculatedCurrentStreak = 0;
    for (let i = monthlyProgress.length - 1; i >= 0; i--) {
      if (monthlyProgress[i].percentage === 100) {
        calculatedCurrentStreak++;
      } else {
        break; // Stop at first non-100% day
      }
    }
    
    // Calculate longest streak from monthlyProgress (last 30 days only)
    // We use calculated value only since completion rules may have changed
    let calculatedLongestStreak = 0;
    let tempStreak = 0;
    for (const day of monthlyProgress) {
      if (day.percentage === 100) {
        tempStreak++;
        calculatedLongestStreak = Math.max(calculatedLongestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }
    
    console.log('📅 Smart Streak dates:', { todayStr, lastProgressDate: monthlyProgress[monthlyProgress.length - 1]?.date, found: !!todayData });
    
    return {
      currentStreak: calculatedCurrentStreak,
      longestStreak: calculatedLongestStreak, // Only use calculated value from last 30 days
      monthlyProgress,
      todayBreakdown: todayData?.breakdown ?? null,
    };
  }

  // Get workout logs for a specific date
  async getWorkoutLogsForDate(userId: string, date: Date): Promise<WorkoutLog[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return await db
      .select()
      .from(workoutLogs)
      .where(and(
        eq(workoutLogs.userId, userId),
        gte(workoutLogs.completedAt, startOfDay),
        lte(workoutLogs.completedAt, endOfDay)
      ));
  }

  // Workout Plans & Logs
  async createWorkoutPlan(plan: InsertWorkoutPlan): Promise<WorkoutPlan> {
    const [created] = await db.insert(workoutPlans).values(plan).returning();
    return created;
  }

  async getWorkoutPlan(id: string): Promise<WorkoutPlan | undefined> {
    const [plan] = await db
      .select()
      .from(workoutPlans)
      .where(eq(workoutPlans.id, id));
    return plan;
  }

  async getActiveWorkoutPlan(userId: string): Promise<WorkoutPlan | undefined> {
    const [plan] = await db
      .select()
      .from(workoutPlans)
      .where(and(
        eq(workoutPlans.userId, userId),
        eq(workoutPlans.isActive, true)
      ))
      .orderBy(desc(workoutPlans.createdAt))
      .limit(1);
    return plan;
  }

  async createWorkout(workout: InsertWorkout): Promise<Workout> {
    const [created] = await db.insert(workouts).values(workout).returning();
    return created;
  }

  async listWorkoutsForPlan(planId: string): Promise<Workout[]> {
    return await db
      .select()
      .from(workouts)
      .where(eq(workouts.planId, planId));
  }

  async getWorkout(id: string): Promise<Workout | undefined> {
    const [workout] = await db
      .select()
      .from(workouts)
      .where(eq(workouts.id, id));
    return workout;
  }

  async createWorkoutLog(log: InsertWorkoutLog): Promise<WorkoutLog> {
    const [created] = await db.insert(workoutLogs).values(log).returning();
    return created;
  }

  async listWorkoutLogs(userId: string, limit = 10, offset = 0): Promise<WorkoutLog[]> {
    return await db
      .select()
      .from(workoutLogs)
      .where(eq(workoutLogs.userId, userId))
      .orderBy(desc(workoutLogs.completedAt))
      .limit(limit)
      .offset(offset);
  }

  async getAllWorkoutLogs(userId: string): Promise<WorkoutLog[]> {
    return await db
      .select()
      .from(workoutLogs)
      .where(eq(workoutLogs.userId, userId))
      .orderBy(desc(workoutLogs.completedAt));
  }

  async deleteWorkoutLog(userId: string, logId: string): Promise<boolean> {
    const result = await db
      .delete(workoutLogs)
      .where(and(eq(workoutLogs.id, logId), eq(workoutLogs.userId, userId)));
    return (result.rowCount || 0) > 0;
  }

  // Exercise Records - for weight suggestions and manual PRs
  async getExerciseRecord(userId: string, exerciseName: string): Promise<ExerciseRecord | undefined> {
    const [record] = await db
      .select()
      .from(exerciseRecords)
      .where(and(
        eq(exerciseRecords.userId, userId),
        eq(exerciseRecords.exerciseName, exerciseName)
      ));
    return record;
  }

  async getExerciseRecords(userId: string): Promise<ExerciseRecord[]> {
    return await db
      .select()
      .from(exerciseRecords)
      .where(eq(exerciseRecords.userId, userId))
      .orderBy(desc(exerciseRecords.updatedAt));
  }

  async getTrackedPRs(userId: string): Promise<ExerciseRecord[]> {
    return await db
      .select()
      .from(exerciseRecords)
      .where(and(
        eq(exerciseRecords.userId, userId),
        eq(exerciseRecords.isPrTracked, true)
      ))
      .orderBy(desc(exerciseRecords.prWeight));
  }

  async upsertExerciseRecord(userId: string, exerciseName: string, data: {
    lastWeight?: number;
    lastReps?: number;
    prWeight?: number;
    prReps?: number;
    isPrTracked?: boolean;
  }): Promise<ExerciseRecord> {
    const existing = await this.getExerciseRecord(userId, exerciseName);
    
    if (existing) {
      const updates: Partial<ExerciseRecord> = {
        updatedAt: new Date(),
      };
      
      // Update last logged weight/reps
      if (data.lastWeight !== undefined) {
        updates.lastWeight = data.lastWeight;
        updates.lastReps = data.lastReps ?? null;
        updates.lastLoggedAt = new Date();
      }
      
      // Update PR if explicitly setting or if new weight is higher
      if (data.isPrTracked !== undefined) {
        updates.isPrTracked = data.isPrTracked;
      }
      if (data.prWeight !== undefined) {
        updates.prWeight = data.prWeight;
        updates.prReps = data.prReps ?? null;
        updates.prDate = new Date();
      }
      
      const [updated] = await db
        .update(exerciseRecords)
        .set(updates)
        .where(eq(exerciseRecords.id, existing.id))
        .returning();
      return updated;
    }

    // Create new record
    const [created] = await db
      .insert(exerciseRecords)
      .values({
        userId,
        exerciseName,
        lastWeight: data.lastWeight ?? null,
        lastReps: data.lastReps ?? null,
        lastLoggedAt: data.lastWeight ? new Date() : null,
        prWeight: data.prWeight ?? null,
        prReps: data.prReps ?? null,
        prDate: data.prWeight ? new Date() : null,
        isPrTracked: data.isPrTracked ?? false,
      })
      .returning();
    return created;
  }

  async deleteExercisePR(userId: string, exerciseName: string): Promise<boolean> {
    const existing = await this.getExerciseRecord(userId, exerciseName);
    if (!existing) return false;
    
    const [updated] = await db
      .update(exerciseRecords)
      .set({
        isPrTracked: false,
        prWeight: null,
        prReps: null,
        prDate: null,
        updatedAt: new Date(),
      })
      .where(eq(exerciseRecords.id, existing.id))
      .returning();
    return !!updated;
  }

  async getWorkoutPreferences(userId: string): Promise<WorkoutPreferences | undefined> {
    const [prefs] = await db
      .select()
      .from(workoutPreferences)
      .where(eq(workoutPreferences.userId, userId));
    return prefs;
  }

  async upsertWorkoutPreferences(userId: string, prefs: Partial<InsertWorkoutPreferences>): Promise<WorkoutPreferences> {
    const existing = await this.getWorkoutPreferences(userId);
    
    if (existing) {
      const [updated] = await db
        .update(workoutPreferences)
        .set({ ...prefs, updatedAt: new Date() } as any)
        .where(eq(workoutPreferences.id, existing.id))
        .returning();
      return updated;
    }

    const payload: InsertWorkoutPreferences = {
      userId,
      preferredDays: (prefs.preferredDays ?? ['Monday', 'Wednesday', 'Friday']) as string[],
      preferredTime: prefs.preferredTime ?? '07:00',
      smsEnabled: prefs.smsEnabled ?? false,
      calendarSync: prefs.calendarSync ?? false,
    };

    const [created] = await db
      .insert(workoutPreferences)
      .values(payload as any)
      .returning();
    return created;
  }

  async createGroceryList(list: InsertGroceryList): Promise<GroceryList> {
    const [created] = await db
      .insert(groceryLists)
      .values(list)
      .returning();
    return created;
  }

  async getGroceryList(id: string): Promise<GroceryList | undefined> {
    const [list] = await db
      .select()
      .from(groceryLists)
      .where(eq(groceryLists.id, id));
    return list;
  }

  async getActiveGroceryList(userId: string): Promise<GroceryList | undefined> {
    const [list] = await db
      .select()
      .from(groceryLists)
      .where(and(
        eq(groceryLists.userId, userId),
        eq(groceryLists.isArchived, false)
      ))
      .orderBy(desc(groceryLists.generatedAt))
      .limit(1);
    return list;
  }

  async updateGroceryList(id: string, updates: Partial<InsertGroceryList>): Promise<GroceryList | undefined> {
    const [updated] = await db
      .update(groceryLists)
      .set(updates)
      .where(eq(groceryLists.id, id))
      .returning();
    return updated;
  }

  // Optimize SMS Preferences
  async getOptimizeSmsPreferences(userId: string): Promise<OptimizeSmsPreferences | undefined> {
    const [prefs] = await db
      .select()
      .from(optimizeSmsPreferences)
      .where(eq(optimizeSmsPreferences.userId, userId));
    return prefs;
  }

  async createOrUpdateOptimizeSmsPreferences(userId: string, prefs: Partial<InsertOptimizeSmsPreferences>): Promise<OptimizeSmsPreferences> {
    const existing = await this.getOptimizeSmsPreferences(userId);
    
    if (existing) {
      const [updated] = await db
        .update(optimizeSmsPreferences)
        .set({ ...prefs, updatedAt: new Date() } as any)
        .where(eq(optimizeSmsPreferences.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(optimizeSmsPreferences)
        .values({ ...prefs, userId } as any)
        .returning();
      return created;
    }
  }

  // Tracking Preferences (which categories count toward streaks/consistency)
  async getTrackingPreferences(userId: string): Promise<TrackingPreferences | undefined> {
    const [prefs] = await db
      .select()
      .from(trackingPreferences)
      .where(eq(trackingPreferences.userId, userId));
    return prefs;
  }

  async upsertTrackingPreferences(userId: string, prefs: Partial<InsertTrackingPreferences>): Promise<TrackingPreferences> {
    const existing = await this.getTrackingPreferences(userId);

    if (existing) {
      const [updated] = await db
        .update(trackingPreferences)
        .set({ ...prefs, updatedAt: new Date() } as any)
        .where(eq(trackingPreferences.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(trackingPreferences)
      .values({ ...prefs, userId } as any)
      .returning();
    return created;
  }

  // Meal Plans
  async createMealPlan(plan: InsertMealPlan): Promise<MealPlan> {
    const [created] = await db.insert(mealPlans).values(plan).returning();
    return created;
  }

  async getMealPlan(id: string): Promise<MealPlan | undefined> {
    const [plan] = await db
      .select()
      .from(mealPlans)
      .where(eq(mealPlans.id, id));
    return plan;
  }

  async getActiveMealPlan(userId: string): Promise<MealPlan | undefined> {
    const [plan] = await db
      .select()
      .from(mealPlans)
      .where(and(
        eq(mealPlans.userId, userId),
        eq(mealPlans.isActive, true)
      ))
      .orderBy(desc(mealPlans.createdAt))
      .limit(1);
    return plan;
  }
}


export const storage = new DrizzleStorage();

