import { eq, desc, and, isNull, isNotNull, gte, lte, lt, gt, or, ilike, sql, count, inArray } from "drizzle-orm";
import { db } from "./infra/db/db";
import { encryptField, decryptField, encryptFieldSafe, decryptFieldSafe } from "./infra/security/fieldEncryption";
import { logger } from "./infra/logging/logger";
import { getUserLocalMidnight, getUserLocalDateString, toUserLocalDateString } from "./utils/timezone";
import {
  users, healthProfiles, chatSessions, messages, formulas, formulaVersionChanges,
  subscriptions, orders, addresses, paymentMethodRefs, fileUploads,
  notifications, notificationPrefs, auditLogs, userConsents, labAnalyses,
  faqItems, supportTickets, supportTicketResponses, helpArticles, newsletterSubscribers,
  researchCitations, appSettings, reviewSchedules,
  optimizePlans, optimizeDailyLogs, workoutPlans, workouts, workoutLogs, workoutPreferences,
  mealPlans, recipes, mealLogs, groceryLists, optimizeSmsPreferences, trackingPreferences, userStreaks,
  dailyCompletions, weeklySummaries, exerciseRecords, passwordResetTokens, userAdminNotes,
  membershipTiers,
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
  type ExerciseRecord, type InsertExerciseRecord,
  type MembershipTier, type InsertMembershipTier
} from "@shared/schema";

export interface IStorage {
  // User operations moved to UsersRepository

  // Authentication operations moved to AuthRepository/UsersRepository

  // Health Profile operations moved to UsersRepository

  // Chat operations moved to ChatRepository

  // Formula operations moved to FormulasRepository

  // Subscription operations moved to UsersRepository

  // Order operations moved to UsersRepository

  // Address operations moved to UsersRepository

  // Payment Method operations moved to UsersRepository

  // File Upload operations (enhanced for HIPAA compliance)
  // File Upload operations moved to FilesRepository

  // Audit Log operations moved to SystemRepository

  // User Consent operations moved to ConsentsRepository

  // Lab Analysis operations (AI-generated insights)
  createLabAnalysis(analysis: InsertLabAnalysis): Promise<LabAnalysis>;
  getLabAnalysis(fileId: string): Promise<LabAnalysis | undefined>;
  updateLabAnalysis(id: string, updates: Partial<InsertLabAnalysis>): Promise<LabAnalysis | undefined>;
  listLabAnalysesByUser(userId: string): Promise<LabAnalysis[]>;

  // Notification operations moved to NotificationsRepository

  // Support System operations moved to SupportRepository

  // Newsletter subscriber operations
  getNewsletterSubscriberByEmail(email: string): Promise<NewsletterSubscriber | undefined>;
  createNewsletterSubscriber(subscriber: InsertNewsletterSubscriber): Promise<NewsletterSubscriber>;
  reactivateNewsletterSubscriber(email: string): Promise<boolean>;

  // Research citations operations moved to IngredientsRepository

  // Admin operations moved to AdminRepository

  // Wearable device connection operations moved to WearablesRepository

  // Biometric data operations moved to WearablesRepository

  // App settings operations moved to SystemRepository

  // Review schedule operations moved to FormulasRepository

  // Streak Rewards operations
  getStreakRewards(userId: string): Promise<{
    currentStreak: number;
    discountEarned: number;
    discountTier: string;
    lastOrderDate: Date | null;
    reorderWindowStart: Date | null;
    reorderDeadline: Date | null;
    streakStatus: 'building' | 'ready' | 'warning' | 'grace' | 'lapsed';
    daysUntilReorderWindow: number | null;
    daysUntilDeadline: number | null;
  }>;
  updateStreakProgress(userId: string, supplementsComplete: boolean): Promise<void>;
  applyStreakDiscount(userId: string, orderId: string): Promise<number>; // Returns discount applied
  resetStreakForLapsedUsers(): Promise<number>; // Returns count of users reset
  updateStreakStatuses(): Promise<void>; // Called by cron to update warning/grace statuses

}

type DbInsertMessage = typeof messages.$inferInsert;
type DbInsertFileUpload = typeof fileUploads.$inferInsert;
type DbInsertNotification = typeof notifications.$inferInsert;


type LabReportDataShape = {
  testDate?: string;
  testType?: string;
  labName?: string;
  physicianName?: string;
  analysisStatus?: 'pending' | 'processing' | 'completed' | 'error';
  extractedData?: Record<string, any>;
};

// Formula types moved to FormulasRepository

type NotificationMetadataShape = {
  actionUrl?: string;
  icon?: string;
  priority?: 'low' | 'medium' | 'high';
  additionalData?: Record<string, any>;
};


// Formula normalization helpers moved to FormulasRepository

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

  // Authentication operations moved to UsersRepository

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


  async deleteUser(id: string): Promise<boolean> {
    try {
      const result = await db.delete(users).where(eq(users.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // Password reset operations moved to AuthRepository

  // Health Profile operations
  async getHealthProfile(userId: string): Promise<HealthProfile | undefined> {
    try {
      const [profile] = await db.select().from(healthProfiles).where(eq(healthProfiles.userId, userId));
      if (!profile) return undefined;

      // Decrypt sensitive medical fields with error handling for each field
      let conditions: string[] = [];
      let medications: string[] = [];
      let allergies: string[] = [];

      try {
        if (profile.conditions) {
          // Check if it's already a plain array (not encrypted)
          if (Array.isArray(profile.conditions)) {
            conditions = profile.conditions;
          } else if (typeof profile.conditions === 'string') {
            conditions = JSON.parse(decryptField(profile.conditions));
          }
        }
      } catch (decryptError) {
        console.error('Error decrypting conditions, using empty array:', decryptError);
      }

      try {
        if (profile.medications) {
          if (Array.isArray(profile.medications)) {
            medications = profile.medications;
          } else if (typeof profile.medications === 'string') {
            medications = JSON.parse(decryptField(profile.medications));
          }
        }
      } catch (decryptError) {
        console.error('Error decrypting medications, using empty array:', decryptError);
      }

      try {
        if (profile.allergies) {
          if (Array.isArray(profile.allergies)) {
            allergies = profile.allergies;
          } else if (typeof profile.allergies === 'string') {
            allergies = JSON.parse(decryptField(profile.allergies));
          }
        }
      } catch (decryptError) {
        console.error('Error decrypting allergies, using empty array:', decryptError);
      }

      return {
        ...profile,
        conditions,
        medications,
        allergies
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
          : undefined,
        // Always update the timestamp
        updatedAt: new Date()
      };

      // Remove undefined values (but keep null values)
      const cleanUpdates = Object.fromEntries(
        Object.entries(encryptedUpdates).filter(([_, v]) => v !== undefined)
      );

      console.log('Updating health profile:', { userId, fieldsToUpdate: Object.keys(cleanUpdates) });

      const [profile] = await db
        .update(healthProfiles)
        .set(cleanUpdates as any)
        .where(eq(healthProfiles.userId, userId))
        .returning();

      if (!profile) {
        console.error('Health profile update returned no result for userId:', userId);
        return undefined;
      }

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
      // Re-throw to allow proper error handling upstream
      throw error;
    }
  }

  // Chat operations moved to ChatRepository

  // Formula operations
  // Formula operations moved to FormulasRepository

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


  async getOrderWithFormula(orderId: string): Promise<{ order: Order, formula: Formula | undefined } | undefined> {
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

  // File Upload operations moved to FilesRepository

  // Lab Report specific operations
  // Lab Report operations moved to FilesRepository

  // Audit Log operations moved to SystemRepository

  // User Consent operations moved to ConsentsRepository

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

  // Notification operations moved to NotificationsRepository

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


  // Research citations operations moved to IngredientsRepository

  // Support System operations moved to SupportRepository


  // Admin operations moved to AdminRepository

  // Wearable device connection operations moved to WearablesRepository

  // App settings operations moved to SystemRepository

  // Biometric data operations moved to WearablesRepository

  // Formula operations moved to FormulasRepository

  // Review schedule operations moved to FormulasRepository

  // ===== OPTIMIZE FEATURE OPERATIONS moved to OptimizeRepository =====

  // ===== STREAK REWARDS OPERATIONS =====

  private calculateDiscountTier(streakDays: number): { discount: number; tier: string } {
    if (streakDays >= 90) return { discount: 20, tier: 'Champion' };
    if (streakDays >= 60) return { discount: 15, tier: 'Loyal' };
    if (streakDays >= 30) return { discount: 10, tier: 'Dedicated' };
    if (streakDays >= 14) return { discount: 8, tier: 'Committed' };
    if (streakDays >= 7) return { discount: 5, tier: 'Consistent' };
    return { discount: 0, tier: 'Building' };
  }

  async getStreakRewards(userId: string): Promise<{
    currentStreak: number;
    discountEarned: number;
    discountTier: string;
    lastOrderDate: Date | null;
    reorderWindowStart: Date | null;
    reorderDeadline: Date | null;
    streakStatus: 'building' | 'ready' | 'warning' | 'grace' | 'lapsed';
    daysUntilReorderWindow: number | null;
    daysUntilDeadline: number | null;
  }> {
    try {
      // Get streak from user_streaks table (supplements streak)
      const [streak] = await db
        .select()
        .from(userStreaks)
        .where(and(
          eq(userStreaks.userId, userId),
          inArray(userStreaks.streakType, ['supplements', 'overall'])
        ))
        .orderBy(desc(userStreaks.streakType))
        .limit(1);

      const [user] = await db.select().from(users).where(eq(users.id, userId));

      const currentStreak = streak?.currentStreak || 0;
      const { discount, tier } = this.calculateDiscountTier(currentStreak);
      const now = new Date();

      // Calculate days until reorder window and deadline
      let daysUntilReorderWindow: number | null = null;
      let daysUntilDeadline: number | null = null;

      if (user?.reorderWindowStart) {
        const windowDiff = Math.ceil((user.reorderWindowStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        daysUntilReorderWindow = windowDiff > 0 ? windowDiff : 0;
      }

      if (user?.reorderDeadline) {
        const deadlineDiff = Math.ceil((user.reorderDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        daysUntilDeadline = deadlineDiff > 0 ? deadlineDiff : 0;
      }

      return {
        currentStreak,
        discountEarned: discount,
        discountTier: tier,
        lastOrderDate: user?.lastOrderDate || null,
        reorderWindowStart: user?.reorderWindowStart || null,
        reorderDeadline: user?.reorderDeadline || null,
        streakStatus: (user?.streakStatus as any) || 'building',
        daysUntilReorderWindow,
        daysUntilDeadline,
      };
    } catch (error) {
      console.error('Error getting streak rewards:', error);
      return {
        currentStreak: 0,
        discountEarned: 0,
        discountTier: 'Building',
        lastOrderDate: null,
        reorderWindowStart: null,
        reorderDeadline: null,
        streakStatus: 'building',
        daysUntilReorderWindow: null,
        daysUntilDeadline: null,
      };
    }
  }

  async updateStreakProgress(userId: string, supplementsComplete: boolean): Promise<void> {
    try {
      if (!supplementsComplete) return; // Only increment on complete days

      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return;

      const newStreak = (user.streakCurrentDays || 0) + 1;
      const { discount } = this.calculateDiscountTier(newStreak);

      await db
        .update(users)
        .set({
          streakCurrentDays: newStreak,
          streakDiscountEarned: discount,
        })
        .where(eq(users.id, userId));

      console.log(`🔥 Streak updated for user ${userId}: ${newStreak} days, ${discount}% discount`);
    } catch (error) {
      console.error('Error updating streak progress:', error);
    }
  }

  async applyStreakDiscount(userId: string, orderId: string): Promise<number> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return 0;

      const discountToApply = user.streakDiscountEarned || 0;

      if (discountToApply > 0) {
        const now = new Date();
        const reorderWindowStart = new Date(now);
        reorderWindowStart.setDate(reorderWindowStart.getDate() + 75);
        const reorderDeadline = new Date(now);
        reorderDeadline.setDate(reorderDeadline.getDate() + 95);

        // Update user with new order date and calculated reorder windows
        // Keep the streak going - don't reset it
        await db
          .update(users)
          .set({
            lastOrderDate: now,
            reorderWindowStart,
            reorderDeadline,
            streakStatus: 'building',
          })
          .where(eq(users.id, userId));

        console.log(`💰 Applied ${discountToApply}% streak discount to order ${orderId}`);
      }

      return discountToApply;
    } catch (error) {
      console.error('Error applying streak discount:', error);
      return 0;
    }
  }

  async resetStreakForLapsedUsers(): Promise<number> {
    try {
      const now = new Date();

      // Find users whose deadline has passed (Day 100+)
      const gracePeriodEnd = new Date(now);
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() - 5); // 5 day grace period

      const result = await db
        .update(users)
        .set({
          streakCurrentDays: 0,
          streakDiscountEarned: 0,
          streakStatus: 'lapsed',
        })
        .where(and(
          lt(users.reorderDeadline, gracePeriodEnd),
          sql`${users.streakStatus} != 'lapsed'`
        ))
        .returning();

      if (result.length > 0) {
        console.log(`⚠️ Reset streaks for ${result.length} lapsed users`);
      }

      return result.length;
    } catch (error) {
      console.error('Error resetting lapsed streaks:', error);
      return 0;
    }
  }

  async updateStreakStatuses(): Promise<void> {
    try {
      const now = new Date();

      // Update to 'ready' - in reorder window (Day 75-85)
      await db
        .update(users)
        .set({ streakStatus: 'ready' })
        .where(and(
          lte(users.reorderWindowStart, now),
          gt(users.reorderDeadline, new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000)), // More than 10 days to deadline
          sql`${users.streakStatus} = 'building'`
        ));

      // Update to 'warning' - approaching deadline (Day 86-90)
      const warningThreshold = new Date(now);
      warningThreshold.setDate(warningThreshold.getDate() + 10);
      await db
        .update(users)
        .set({ streakStatus: 'warning' })
        .where(and(
          lte(users.reorderWindowStart, now),
          lte(users.reorderDeadline, warningThreshold),
          gt(users.reorderDeadline, now),
          sql`${users.streakStatus} IN ('building', 'ready')`
        ));

      // Update to 'grace' - past deadline but in grace period (Day 91-95)
      await db
        .update(users)
        .set({ streakStatus: 'grace' })
        .where(and(
          lte(users.reorderDeadline, now),
          gt(users.reorderDeadline, new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)), // Within 5 day grace
          sql`${users.streakStatus} IN ('building', 'ready', 'warning')`
        ));

      console.log('✅ Streak statuses updated');
    } catch (error) {
      console.error('Error updating streak statuses:', error);
    }
  }


  // Conversation intelligence and analytics methods moved to AdminRepository


}


export const storage = new DrizzleStorage();

