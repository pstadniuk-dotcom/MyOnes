import { randomUUID } from "crypto";
import { eq, desc, and, isNull, gte, lte } from "drizzle-orm";
import { db } from "./db";
import {
  users, healthProfiles, chatSessions, messages, formulas, formulaVersionChanges,
  subscriptions, orders, addresses, paymentMethodRefs, fileUploads, 
  notifications, notificationPrefs, auditLogs, userConsents, labAnalyses,
  faqItems, supportTickets, supportTicketResponses, helpArticles, newsletterSubscribers,
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
  type NewsletterSubscriber, type InsertNewsletterSubscriber
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
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
      return profile || undefined;
    } catch (error) {
      console.error('Error getting health profile:', error);
      return undefined;
    }
  }

  async createHealthProfile(insertProfile: InsertHealthProfile): Promise<HealthProfile> {
    try {
      // Data is now pre-validated by Zod schemas at the API route level
      const [profile] = await db.insert(healthProfiles).values([insertProfile]).returning();
      return profile;
    } catch (error) {
      console.error('Error creating health profile:', error);
      throw new Error('Failed to create health profile');
    }
  }

  async updateHealthProfile(userId: string, updates: Partial<InsertHealthProfile>): Promise<HealthProfile | undefined> {
    try {
      // Data is now pre-validated by Zod schemas at the API route level
      const [profile] = await db
        .update(healthProfiles)
        .set(updates)
        .where(eq(healthProfiles.userId, userId))
        .returning();
      return profile || undefined;
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
      const [message] = await db.insert(messages).values(insertMessage).returning();
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
      const [formula] = await db.insert(formulas).values([insertFormula]).returning();
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
        .orderBy(desc(formulas.version))
        .limit(1);
      return formula || undefined;
    } catch (error) {
      console.error('Error getting current formula:', error);
      return undefined;
    }
  }

  async getFormulaHistory(userId: string): Promise<Formula[]> {
    try {
      return await db.select().from(formulas).where(eq(formulas.userId, userId)).orderBy(desc(formulas.version));
    } catch (error) {
      console.error('Error getting formula history:', error);
      return [];
    }
  }

  async updateFormulaVersion(userId: string, updates: Partial<InsertFormula>): Promise<Formula> {
    try {
      // Get the current highest version for this user
      const [currentFormula] = await db
        .select()
        .from(formulas)
        .where(eq(formulas.userId, userId))
        .orderBy(desc(formulas.version))
        .limit(1);

      const nextVersion = currentFormula ? currentFormula.version + 1 : 1;
      
      const safeUpdates: any = {
        ...updates,
        userId,
        version: nextVersion
      };
      
      // Only set bases and additions if provided (data is pre-validated by Zod schemas)
      if (updates.bases !== undefined) {
        safeUpdates.bases = updates.bases;
      }
      
      if (updates.additions !== undefined) {
        safeUpdates.additions = updates.additions;
      }
      const [formula] = await db.insert(formulas).values([safeUpdates]).returning();
      return formula;
    } catch (error) {
      console.error('Error updating formula version:', error);
      throw new Error('Failed to update formula version');
    }
  }

  async getFormulaByUserAndVersion(userId: string, version: number): Promise<Formula | undefined> {
    try {
      const [formula] = await db
        .select()
        .from(formulas)
        .where(and(eq(formulas.userId, userId), eq(formulas.version, version)));
      return formula || undefined;
    } catch (error) {
      console.error('Error getting formula by user and version:', error);
      return undefined;
    }
  }

  async updateFormulaCustomizations(formulaId: string, customizations: { addedBases?: any[], addedIndividuals?: any[] }, newTotalMg: number): Promise<Formula> {
    try {
      const [updated] = await db
        .update(formulas)
        .set({
          userCustomizations: customizations,
          totalMg: newTotalMg
        })
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
      return await db.select().from(formulaVersionChanges).where(eq(formulaVersionChanges.formulaId, formulaId)).orderBy(desc(formulaVersionChanges.createdAt));
    } catch (error) {
      console.error('Error listing formula version changes:', error);
      return [];
    }
  }

  // Subscription operations
  async getSubscription(userId: string): Promise<Subscription | undefined> {
    try {
      const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
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
      const safeFileUpload = {
        ...insertFileUpload,
        labReportData: insertFileUpload.labReportData ? {
          testDate: typeof insertFileUpload.labReportData.testDate === 'string' ? insertFileUpload.labReportData.testDate : undefined,
          testType: typeof insertFileUpload.labReportData.testType === 'string' ? insertFileUpload.labReportData.testType : undefined,
          labName: typeof insertFileUpload.labReportData.labName === 'string' ? insertFileUpload.labReportData.labName : undefined,
          physicianName: typeof insertFileUpload.labReportData.physicianName === 'string' ? insertFileUpload.labReportData.physicianName : undefined,
          analysisStatus: ['error', 'pending', 'processing', 'completed'].includes(insertFileUpload.labReportData.analysisStatus as string) ? insertFileUpload.labReportData.analysisStatus as 'error' | 'pending' | 'processing' | 'completed' : undefined,
          extractedData: insertFileUpload.labReportData.extractedData && typeof insertFileUpload.labReportData.extractedData === 'object' ? insertFileUpload.labReportData.extractedData as Record<string, any> : undefined
        } : null
      };
      const [fileUpload] = await db.insert(fileUploads).values([safeFileUpload]).returning();
      return fileUpload;
    } catch (error) {
      console.error('Error creating file upload:', error);
      throw new Error('Failed to create file upload');
    }
  }

  async updateFileUpload(id: string, updates: Partial<InsertFileUpload>): Promise<FileUpload | undefined> {
    try {
      // Handle labReportData field properly
      const safeUpdates = {
        ...updates,
        ...(updates.labReportData && {
          labReportData: updates.labReportData  // Data is pre-validated by Zod schemas at API route level
        })
      };
      const [fileUpload] = await db
        .update(fileUploads)
        .set(safeUpdates)
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
      const [fileUpload] = await db
        .update(fileUploads)
        .set({ labReportData })
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
      const [auditLog] = await db.insert(auditLogs).values([insertAuditLog]).returning();
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
      const [consent] = await db.insert(userConsents).values([safeConsent]).returning();
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
      // Handle extractedMarkers and aiInsights fields properly
      // Data is pre-validated by Zod schemas at API route level
      const [analysis] = await db.insert(labAnalyses).values([insertAnalysis]).returning();
      return analysis;
    } catch (error) {
      console.error('Error creating lab analysis:', error);
      throw new Error('Failed to create lab analysis');
    }
  }

  async getLabAnalysis(fileId: string): Promise<LabAnalysis | undefined> {
    try {
      const [analysis] = await db.select().from(labAnalyses).where(eq(labAnalyses.fileId, fileId));
      return analysis || undefined;
    } catch (error) {
      console.error('Error getting lab analysis:', error);
      return undefined;
    }
  }

  async updateLabAnalysis(id: string, updates: Partial<InsertLabAnalysis>): Promise<LabAnalysis | undefined> {
    try {
      // Handle extractedMarkers and aiInsights fields properly
      // Data is pre-validated by Zod schemas at API route level
      const safeUpdates = updates;
      const [analysis] = await db
        .update(labAnalyses)
        .set(safeUpdates)
        .where(eq(labAnalyses.id, id))
        .returning();
      return analysis || undefined;
    } catch (error) {
      console.error('Error updating lab analysis:', error);
      return undefined;
    }
  }

  async listLabAnalysesByUser(userId: string): Promise<LabAnalysis[]> {
    try {
      return await db.select().from(labAnalyses).where(eq(labAnalyses.userId, userId)).orderBy(desc(labAnalyses.processedAt));
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
      const [prefs] = await db.insert(notificationPrefs).values([insertPrefs]).returning();
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
      const [notification] = await db.insert(notifications).values([insertNotification]).returning();
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
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private healthProfiles: Map<string, HealthProfile> = new Map(); // keyed by userId
  private chatSessions: Map<string, ChatSession> = new Map();
  private messages: Map<string, Message> = new Map();
  private formulas: Map<string, Formula> = new Map();
  private formulaVersionChanges: Map<string, FormulaVersionChange> = new Map();
  private subscriptions: Map<string, Subscription> = new Map(); // keyed by userId
  private orders: Map<string, Order> = new Map();
  private addresses: Map<string, Address> = new Map();
  private paymentMethodRefs: Map<string, PaymentMethodRef> = new Map();
  private fileUploads: Map<string, FileUpload> = new Map();
  private notifications: Map<string, Notification> = new Map();
  private notificationPrefs: Map<string, NotificationPref> = new Map(); // keyed by userId
  private auditLogs: Map<string, AuditLog> = new Map();
  private userConsents: Map<string, UserConsent> = new Map();
  private labAnalyses: Map<string, LabAnalysis> = new Map();
  // Support system storage
  private faqItems: Map<string, FaqItem> = new Map();
  private supportTickets: Map<string, SupportTicket> = new Map();
  private supportTicketResponses: Map<string, SupportTicketResponse> = new Map();
  private helpArticles: Map<string, HelpArticle> = new Map();

  constructor() {
    // Initialize with mock data for development testing
    this.initializeMockData();
  }

  // Initialize support system with sample data
  private initializeSupportData() {
    // FAQ Items
    const faqSamples: FaqItem[] = [
      {
        id: 'faq-1',
        category: 'Getting Started',
        question: 'How does ONES AI create my personalized formula?',
        answer: 'ONES AI analyzes your health profile, lab results, symptoms, and goals using advanced algorithms. It considers nutrient interactions, bioavailability, and your unique biochemistry to create an optimized supplement formula tailored specifically for you.',
        isPublished: true,
        displayOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'faq-2',
        category: 'Formula & Health',
        question: 'How often will my formula be updated?',
        answer: 'Your formula is reviewed every 8-12 weeks or when you upload new lab results. ONES AI continuously learns from your feedback and progress to make adjustments that optimize your health outcomes.',
        isPublished: true,
        displayOrder: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'faq-3',
        category: 'Technical Support',
        question: 'Is it safe to upload my lab results?',
        answer: 'Yes, your health data is encrypted and stored securely. We use bank-level security protocols and never share your personal health information with third parties. You maintain full control over your data.',
        isPublished: true,
        displayOrder: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'faq-4',
        category: 'Formula & Health',
        question: 'What if I have allergies or take medications?',
        answer: 'ONES AI factors in all allergies and medications you\'ve listed in your profile. Our AI checks for potential interactions and contraindications to ensure your formula is safe and compatible with your existing treatments.',
        isPublished: true,
        displayOrder: 4,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'faq-5',
        category: 'Billing & Subscription',
        question: 'Can I pause or cancel my subscription?',
        answer: 'Yes, you can pause or cancel your subscription at any time from your Orders & Billing page. Paused subscriptions can be resumed when you\'re ready, and cancellations take effect at the end of your current billing cycle.',
        isPublished: true,
        displayOrder: 5,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'faq-6',
        category: 'Getting Started',
        question: 'How long does shipping take?',
        answer: 'Standard shipping takes 3-5 business days within the US. You\'ll receive tracking information once your order ships, and we offer expedited shipping options for faster delivery.',
        isPublished: true,
        displayOrder: 6,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    faqSamples.forEach(item => this.faqItems.set(item.id, item));
    
    // Help Articles
    const helpArticleSamples: HelpArticle[] = [
      {
        id: 'help-1',
        category: 'Getting Started',
        title: 'Your First ONES AI Consultation',
        content: 'Learn how to make the most of your initial consultation with ONES AI. We\'ll walk you through setting up your health profile, discussing your goals, and understanding your first formula recommendation.',
        isPublished: true,
        viewCount: 127,
        displayOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'help-2',
        category: 'Formula & Health',
        title: 'Understanding Your Formula Report',
        content: 'Your ONES AI formula report breaks down exactly why each ingredient was selected for your unique needs. Learn how to read the rationale, understand dosages, and track your progress.',
        isPublished: true,
        viewCount: 89,
        displayOrder: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'help-3',
        category: 'Technical Support',
        title: 'Uploading Lab Results Securely',
        content: 'Step-by-step guide to uploading your lab results safely and securely. Includes information about supported file formats, privacy protections, and how ONES AI analyzes your data.',
        isPublished: true,
        viewCount: 156,
        displayOrder: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'help-4',
        category: 'Billing & Subscription',
        title: 'Managing Your Subscription',
        content: 'Everything you need to know about managing your ONES subscription: pausing, resuming, changing delivery schedules, updating payment methods, and understanding billing cycles.',
        isPublished: true,
        viewCount: 203,
        displayOrder: 4,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    helpArticleSamples.forEach(article => this.helpArticles.set(article.id, article));
    
    // Support Tickets (for test user)
    const supportTicketSamples: SupportTicket[] = [
      {
        id: 'ticket-1',
        userId: 'test-user-123',
        subject: 'Question about Vitamin D dosage',
        description: 'My recent labs show Vitamin D at 32 ng/mL. Why is the AI recommending such a high dose? Is 4000 IU daily safe long-term?',
        status: 'resolved',
        priority: 'medium',
        category: 'Formula & Health',
        assignedTo: 'Dr. Sarah Chen',
        createdAt: new Date('2024-09-20'),
        updatedAt: new Date('2024-09-21'),
        resolvedAt: new Date('2024-09-21')
      },
      {
        id: 'ticket-2',
        userId: 'test-user-123',
        subject: 'Billing question - double charge',
        description: 'I see two charges on my card for this month. One for $89 on Sept 15th and another for $89 on Sept 16th. Can you help me understand why?',
        status: 'in_progress',
        priority: 'high',
        category: 'Billing & Subscription',
        assignedTo: 'Support Team',
        createdAt: new Date('2024-09-22'),
        updatedAt: new Date('2024-09-23'),
        resolvedAt: null
      }
    ];
    
    supportTicketSamples.forEach(ticket => this.supportTickets.set(ticket.id, ticket));
    
    // Sample support ticket responses
    const responseSamples: SupportTicketResponse[] = [
      {
        id: 'response-1',
        ticketId: 'ticket-1',
        userId: null,
        isStaff: true,
        message: 'Hi John! Great question about the Vitamin D dosage. Your level of 32 ng/mL is in the \'sufficient\' range but not optimal. The AI recommended 4000 IU to bring you into the optimal range of 40-60 ng/mL. This dose is well within safe limits (up to 10,000 IU is generally considered safe for adults). We\'ll recheck your levels in 8-12 weeks and adjust as needed.',
        createdAt: new Date('2024-09-21')
      },
      {
        id: 'response-2',
        ticketId: 'ticket-2',
        userId: null,
        isStaff: true,
        message: 'Thanks for reaching out about the billing issue. I can see both charges in our system. Let me investigate this for you and get back to you within 24 hours with a full explanation and resolution if there was an error.',
        createdAt: new Date('2024-09-23')
      }
    ];
    
    responseSamples.forEach(response => this.supportTicketResponses.set(response.id, response));
  }

  // Initialize with HIPAA-compliant mock data
  private initializeMockLabReports() {
    const testUserId = 'test-user-123';
    
    // Create sample lab reports
    const labReport1: FileUpload = {
      id: 'lab-report-1',
      userId: testUserId,
      type: 'lab_report',
      objectPath: '/objects/lab-reports/test-user-123/2024-01-15_comprehensive-panel.pdf',
      originalFileName: 'comprehensive-panel.pdf',
      fileSize: 2048576, // 2MB
      mimeType: 'application/pdf',
      uploadedAt: new Date('2024-01-15'),
      hipaaCompliant: true,
      encryptedAtRest: true,
      retentionPolicyId: null, // Add missing field
      labReportData: {
        testDate: '2024-01-15',
        testType: 'Comprehensive Metabolic Panel',
        labName: 'Quest Diagnostics',
        physicianName: 'Dr. Sarah Johnson',
        analysisStatus: 'completed'
      },
      deletedAt: null,
      deletedBy: null
    };

    const labReport2: FileUpload = {
      id: 'lab-report-2', 
      userId: testUserId,
      type: 'lab_report',
      objectPath: '/objects/lab-reports/test-user-123/2024-06-20_lipid-panel.pdf',
      originalFileName: 'lipid-panel.pdf',
      fileSize: 1536000, // 1.5MB
      mimeType: 'application/pdf',
      uploadedAt: new Date('2024-06-20'),
      hipaaCompliant: true,
      encryptedAtRest: true,
      retentionPolicyId: null, // Add missing field
      labReportData: {
        testDate: '2024-06-20',
        testType: 'Lipid Panel',
        labName: 'LabCorp',
        physicianName: 'Dr. Michael Chen',
        analysisStatus: 'completed'
      },
      deletedAt: null,
      deletedBy: null
    };

    this.fileUploads.set(labReport1.id, labReport1);
    this.fileUploads.set(labReport2.id, labReport2);

    // Create user consents
    const consent1: UserConsent = {
      id: 'consent-1',
      userId: testUserId,
      consentType: 'lab_data_processing',
      granted: true,
      grantedAt: new Date('2024-01-01'),
      revokedAt: null,
      consentVersion: '1.0',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      consentText: 'I consent to the processing of my lab report data for personalized supplement recommendations.',
      metadata: { source: 'dashboard' }
    };

    const consent2: UserConsent = {
      id: 'consent-2',
      userId: testUserId,
      consentType: 'ai_analysis',
      granted: true,
      grantedAt: new Date('2024-01-01'),
      revokedAt: null,
      consentVersion: '1.0',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      consentText: 'I consent to AI analysis of my lab reports for health insights and supplement formulation.',
      metadata: { source: 'dashboard' }
    };

    this.userConsents.set(consent1.id, consent1);
    this.userConsents.set(consent2.id, consent2);

    // Create sample lab analysis
    const analysis: LabAnalysis = {
      id: 'analysis-1',
      fileId: labReport1.id,
      userId: testUserId,
      analysisStatus: 'completed',
      extractedMarkers: [
        { name: 'Vitamin D', value: 25, unit: 'ng/mL', referenceRange: '30-100', status: 'low' },
        { name: 'B12', value: 450, unit: 'pg/mL', referenceRange: '200-600', status: 'normal' },
        { name: 'Iron', value: 85, unit: 'μg/dL', referenceRange: '60-170', status: 'normal' }
      ],
      aiInsights: {
        summary: 'Lab results show vitamin D deficiency with normal B12 and iron levels.',
        recommendations: ['Increase vitamin D supplementation', 'Consider outdoor activities for natural vitamin D'],
        riskFactors: ['Vitamin D deficiency may impact bone health and immune function'],
        nutritionalNeeds: ['Vitamin D3 supplement', 'Calcium for bone support'],
        confidence: 0.95
      },
      processedAt: new Date('2024-01-16'),
      errorMessage: null
    };

    this.labAnalyses.set(analysis.id, analysis);
  }

  private initializeMockData() {
    this.initializeMockLabReports();
    this.initializeSupportData();

    // Initialize existing mock data
    // Create a test user
    const testUser: User = {
      id: 'test-user-123',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1-555-0123',
      password: 'hashed-password',
      createdAt: new Date('2024-07-01')
    };
    this.users.set(testUser.id, testUser);


    // Create sample formulas with version history - all under 800mg safety limit
    const formula1: Formula = {
      id: 'formula-v1',
      userId: testUser.id,
      version: 1,
      bases: [
        { ingredient: 'MULTI VITAMIN', amount: 400, unit: 'mg' },
        { ingredient: 'IMMUNE', amount: 200, unit: 'mg' }
      ],
      additions: [
        { ingredient: 'Vitamin D3', amount: 1, unit: 'mg' }
      ],
      totalMg: 601,
      notes: 'Initial formula focusing on foundational nutrition and immune support',
      createdAt: new Date('2024-07-20')
    };

    const formula2: Formula = {
      id: 'formula-v2',
      userId: testUser.id,
      version: 2,
      bases: [
        { ingredient: 'MULTI VITAMIN', amount: 400, unit: 'mg' },
        { ingredient: 'BRAIN HEALTH', amount: 250, unit: 'mg' }
      ],
      additions: [
        { ingredient: 'Vitamin D3', amount: 1, unit: 'mg' },
        { ingredient: 'Omega-3', amount: 50, unit: 'mg' }
      ],
      totalMg: 701,
      notes: 'Added brain health support and omega-3 for cognitive enhancement',
      createdAt: new Date('2024-08-15')
    };

    const currentFormula: Formula = {
      id: 'formula-v3',
      userId: testUser.id,
      version: 3,
      bases: [
        { ingredient: 'MULTI VITAMIN', amount: 400, unit: 'mg' },
        { ingredient: 'ADRENAL SUPPORT', amount: 300, unit: 'mg' }
      ],
      additions: [
        { ingredient: 'Vitamin D3', amount: 1, unit: 'mg' },
        { ingredient: 'Magnesium', amount: 50, unit: 'mg' }
      ],
      totalMg: 751,
      notes: 'Optimized for stress management with adrenal support, improved safety profile',
      createdAt: new Date('2024-09-15')
    };

    // Store formulas
    this.formulas.set(formula1.id, formula1);
    this.formulas.set(formula2.id, formula2);
    this.formulas.set(currentFormula.id, currentFormula);

    // Create version change records
    const change1: FormulaVersionChange = {
      id: 'change-v1',
      formulaId: formula1.id,
      summary: 'Initial formula created',
      rationale: 'Created foundational supplement formula based on initial health assessment and user goals',
      createdAt: new Date('2024-07-20')
    };

    const change2: FormulaVersionChange = {
      id: 'change-v2',
      formulaId: formula2.id,
      summary: 'Added cognitive support',
      rationale: 'User requested brain health optimization. Added brain health base and omega-3 for cognitive enhancement.',
      createdAt: new Date('2024-08-15')
    };

    const change3: FormulaVersionChange = {
      id: 'change-v3',
      formulaId: currentFormula.id,
      summary: 'Optimized for stress management',
      rationale: 'User reported high stress levels and energy issues. Replaced immune support with adrenal support for better stress management. Maintained safe dosage profile under 800mg limit.',
      createdAt: new Date('2024-09-15')
    };

    this.formulaVersionChanges.set(change1.id, change1);
    this.formulaVersionChanges.set(change2.id, change2);
    this.formulaVersionChanges.set(change3.id, change3);
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      id,
      name: insertUser.name,
      email: insertUser.email,
      phone: insertUser.phone ?? null,
      password: insertUser.password,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Health Profile operations
  async getHealthProfile(userId: string): Promise<HealthProfile | undefined> {
    return this.healthProfiles.get(userId);
  }

  async createHealthProfile(insertProfile: InsertHealthProfile): Promise<HealthProfile> {
    const id = randomUUID();
    const profile: HealthProfile = {
      id,
      userId: insertProfile.userId,
      age: insertProfile.age ?? null,
      sex: insertProfile.sex ?? null,
      weightKg: insertProfile.weightKg ?? null,
      conditions: (insertProfile.conditions as string[]) ?? [],
      medications: (insertProfile.medications as string[]) ?? [],
      allergies: (insertProfile.allergies as string[]) ?? [],
      updatedAt: new Date()
    };
    this.healthProfiles.set(insertProfile.userId, profile);
    return profile;
  }

  async updateHealthProfile(userId: string, updates: Partial<InsertHealthProfile>): Promise<HealthProfile | undefined> {
    const profile = this.healthProfiles.get(userId);
    if (!profile) return undefined;
    
    const updatedProfile: HealthProfile = { 
      ...profile,
      userId: updates.userId ?? profile.userId,
      age: updates.age ?? profile.age,
      sex: updates.sex ?? profile.sex,
      weightKg: updates.weightKg ?? profile.weightKg,
      conditions: updates.conditions !== undefined ? (updates.conditions as string[]) ?? [] : profile.conditions ?? [],
      medications: updates.medications !== undefined ? (updates.medications as string[]) ?? [] : profile.medications ?? [],
      allergies: updates.allergies !== undefined ? (updates.allergies as string[]) ?? [] : profile.allergies ?? [],
      updatedAt: new Date()
    };
    this.healthProfiles.set(userId, updatedProfile);
    return updatedProfile;
  }

  // Chat Session operations
  async getChatSession(id: string): Promise<ChatSession | undefined> {
    return this.chatSessions.get(id);
  }

  async createChatSession(insertSession: InsertChatSession): Promise<ChatSession> {
    const id = randomUUID();
    const session: ChatSession = {
      id,
      userId: insertSession.userId,
      status: insertSession.status ?? 'active',
      createdAt: new Date()
    };
    this.chatSessions.set(id, session);
    return session;
  }

  async listChatSessionsByUser(userId: string): Promise<ChatSession[]> {
    return Array.from(this.chatSessions.values()).filter(session => session.userId === userId);
  }

  async updateChatSessionStatus(id: string, status: 'active' | 'completed' | 'archived'): Promise<ChatSession | undefined> {
    const session = this.chatSessions.get(id);
    if (!session) return undefined;
    
    const updatedSession = { ...session, status };
    this.chatSessions.set(id, updatedSession);
    return updatedSession;
  }

  async deleteChatSession(id: string): Promise<void> {
    // Delete associated messages
    const messagesToDelete = Array.from(this.messages.entries())
      .filter(([_, msg]) => msg.sessionId === id)
      .map(([msgId]) => msgId);
    
    messagesToDelete.forEach(msgId => this.messages.delete(msgId));
    
    // Delete the session
    this.chatSessions.delete(id);
  }

  // Message operations
  async getMessage(id: string): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...insertMessage,
      id,
      createdAt: new Date()
    };
    this.messages.set(id, message);
    return message;
  }

  async listMessagesBySession(sessionId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.sessionId === sessionId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  // Formula operations
  async getFormula(id: string): Promise<Formula | undefined> {
    return this.formulas.get(id);
  }

  async createFormula(insertFormula: InsertFormula): Promise<Formula> {
    const id = randomUUID();
    
    // Validate formula data integrity
    const bases = insertFormula.bases as Array<{ingredient: string, amount: number, unit: string}>;
    const additions = (insertFormula.additions as Array<{ingredient: string, amount: number, unit: string}>) ?? [];
    
    if (!bases || bases.length === 0) {
      throw new Error('Formula must have at least one base ingredient');
    }
    
    // Validate totalMg matches ingredients
    const calculatedTotal = [...bases, ...additions].reduce((sum, item) => sum + item.amount, 0);
    if (insertFormula.totalMg !== calculatedTotal) {
      console.warn(`totalMg mismatch: provided ${insertFormula.totalMg}, calculated ${calculatedTotal}. Using calculated value.`);
    }
    
    const formula: Formula = {
      id,
      userId: insertFormula.userId,
      version: insertFormula.version ?? 1,
      bases,
      additions,
      totalMg: calculatedTotal, // Always use calculated value for consistency
      notes: insertFormula.notes ?? null,
      createdAt: new Date()
    };
    
    // Ensure version uniqueness for user
    const existingFormula = await this.getFormulaByUserAndVersion(insertFormula.userId, formula.version);
    if (existingFormula) {
      throw new Error(`Formula version ${formula.version} already exists for user ${insertFormula.userId}`);
    }
    
    this.formulas.set(id, formula);
    return formula;
  }

  async getCurrentFormulaByUser(userId: string): Promise<Formula | undefined> {
    const userFormulas = Array.from(this.formulas.values())
      .filter(formula => formula.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return userFormulas[0];
  }

  async getFormulaHistory(userId: string): Promise<Formula[]> {
    return Array.from(this.formulas.values())
      .filter(formula => formula.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getFormulaByUserAndVersion(userId: string, version: number): Promise<Formula | undefined> {
    return Array.from(this.formulas.values())
      .find(formula => formula.userId === userId && formula.version === version);
  }

  async updateFormulaVersion(userId: string, updates: Partial<InsertFormula>): Promise<Formula> {
    const currentFormula = await this.getCurrentFormulaByUser(userId);
    
    if (!currentFormula && (!updates.bases || updates.bases.length === 0)) {
      throw new Error('Cannot create first formula version without base ingredients');
    }
    
    const nextVersion = currentFormula ? currentFormula.version + 1 : 1;
    
    // Clone current formula as base, only override provided fields
    const newFormula: InsertFormula = {
      userId,
      version: nextVersion,
      bases: updates.bases || (currentFormula?.bases ?? []),
      additions: updates.additions !== undefined ? updates.additions : (currentFormula?.additions ?? []),
      totalMg: 0, // Will be calculated in createFormula
      notes: updates.notes !== undefined ? updates.notes : (currentFormula?.notes ?? null)
    };
    
    // Calculate totalMg from ingredients
    newFormula.totalMg = [...newFormula.bases, ...(newFormula.additions || [])]
      .reduce((sum, item) => sum + item.amount, 0);
    
    // Atomically create formula and version change record
    const formula = await this.createFormula(newFormula);
    
    // Create version change record if there was a previous version
    if (currentFormula) {
      await this.createFormulaVersionChange({
        formulaId: formula.id,
        summary: this.generateVersionChangeSummary(currentFormula, formula, updates),
        rationale: updates.notes || 'Formula updated based on consultation'
      });
    }
    
    return formula;
  }
  
  private generateVersionChangeSummary(oldFormula: Formula, newFormula: Formula, updates: Partial<InsertFormula>): string {
    const changes = [];
    
    if (updates.bases) {
      const oldCount = oldFormula.bases.length;
      const newCount = newFormula.bases.length;
      changes.push(`Base ingredients: ${oldCount} → ${newCount}`);
    }
    
    if (updates.additions !== undefined) {
      const oldCount = oldFormula.additions?.length ?? 0;
      const newCount = newFormula.additions?.length ?? 0;
      changes.push(`Additional ingredients: ${oldCount} → ${newCount}`);
    }
    
    if (oldFormula.totalMg !== newFormula.totalMg) {
      changes.push(`Total dosage: ${oldFormula.totalMg}mg → ${newFormula.totalMg}mg`);
    }
    
    return changes.length > 0 ? changes.join('; ') : 'Formula updated';
  }

  // Formula Version Change operations
  async createFormulaVersionChange(insertChange: InsertFormulaVersionChange): Promise<FormulaVersionChange> {
    const id = randomUUID();
    const change: FormulaVersionChange = {
      ...insertChange,
      id,
      createdAt: new Date()
    };
    this.formulaVersionChanges.set(id, change);
    return change;
  }

  async listFormulaVersionChanges(formulaId: string): Promise<FormulaVersionChange[]> {
    return Array.from(this.formulaVersionChanges.values())
      .filter(change => change.formulaId === formulaId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Subscription operations
  async getSubscription(userId: string): Promise<Subscription | undefined> {
    return this.subscriptions.get(userId);
  }

  async createSubscription(insertSubscription: InsertSubscription): Promise<Subscription> {
    const id = randomUUID();
    const subscription: Subscription = {
      id,
      userId: insertSubscription.userId,
      plan: insertSubscription.plan,
      status: insertSubscription.status ?? 'active',
      stripeCustomerId: insertSubscription.stripeCustomerId ?? null,
      stripeSubscriptionId: insertSubscription.stripeSubscriptionId ?? null,
      renewsAt: insertSubscription.renewsAt ?? null,
      pausedUntil: insertSubscription.pausedUntil ?? null,
      createdAt: new Date()
    };
    this.subscriptions.set(insertSubscription.userId, subscription);
    return subscription;
  }

  async updateSubscription(userId: string, updates: Partial<InsertSubscription>): Promise<Subscription | undefined> {
    const subscription = this.subscriptions.get(userId);
    if (!subscription) return undefined;
    
    const updatedSubscription = { ...subscription, ...updates };
    this.subscriptions.set(userId, updatedSubscription);
    return updatedSubscription;
  }

  // Order operations
  async getOrder(id: string): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = randomUUID();
    const order: Order = {
      id,
      userId: insertOrder.userId,
      formulaVersion: insertOrder.formulaVersion,
      status: insertOrder.status ?? 'pending',
      trackingUrl: insertOrder.trackingUrl ?? null,
      placedAt: new Date(),
      shippedAt: insertOrder.shippedAt ?? null
    };
    this.orders.set(id, order);
    return order;
  }

  async listOrdersByUser(userId: string): Promise<Order[]> {
    return Array.from(this.orders.values())
      .filter(order => order.userId === userId)
      .sort((a, b) => b.placedAt.getTime() - a.placedAt.getTime());
  }

  async updateOrderStatus(id: string, status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled', trackingUrl?: string): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;
    
    const updatedOrder = { 
      ...order, 
      status,
      trackingUrl: trackingUrl || order.trackingUrl,
      shippedAt: status === 'shipped' ? new Date() : order.shippedAt
    };
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  async getOrderWithFormula(orderId: string): Promise<{order: Order, formula: Formula | undefined} | undefined> {
    const order = this.orders.get(orderId);
    if (!order) return undefined;
    
    const formula = await this.getFormulaByUserAndVersion(order.userId, order.formulaVersion);
    return { order, formula };
  }

  // Address operations
  async getAddress(id: string): Promise<Address | undefined> {
    return this.addresses.get(id);
  }

  async createAddress(insertAddress: InsertAddress): Promise<Address> {
    const id = randomUUID();
    const address: Address = {
      id,
      userId: insertAddress.userId,
      type: insertAddress.type,
      line1: insertAddress.line1,
      line2: insertAddress.line2 ?? null,
      city: insertAddress.city,
      state: insertAddress.state,
      postalCode: insertAddress.postalCode,
      country: insertAddress.country ?? 'US',
      createdAt: new Date()
    };
    this.addresses.set(id, address);
    return address;
  }

  async updateAddress(id: string, updates: Partial<InsertAddress>): Promise<Address | undefined> {
    const address = this.addresses.get(id);
    if (!address) return undefined;
    
    const updatedAddress = { ...address, ...updates };
    this.addresses.set(id, updatedAddress);
    return updatedAddress;
  }

  async listAddressesByUser(userId: string, type?: 'shipping' | 'billing'): Promise<Address[]> {
    return Array.from(this.addresses.values()).filter(address => {
      const matchesUser = address.userId === userId;
      const matchesType = !type || address.type === type;
      return matchesUser && matchesType;
    });
  }

  // Payment Method operations
  async getPaymentMethodRef(id: string): Promise<PaymentMethodRef | undefined> {
    return this.paymentMethodRefs.get(id);
  }

  async createPaymentMethodRef(insertPaymentMethod: InsertPaymentMethodRef): Promise<PaymentMethodRef> {
    const id = randomUUID();
    const paymentMethod: PaymentMethodRef = {
      id,
      userId: insertPaymentMethod.userId,
      stripePaymentMethodId: insertPaymentMethod.stripePaymentMethodId,
      brand: insertPaymentMethod.brand ?? null,
      last4: insertPaymentMethod.last4 ?? null,
      createdAt: new Date()
    };
    this.paymentMethodRefs.set(id, paymentMethod);
    return paymentMethod;
  }

  async listPaymentMethodsByUser(userId: string): Promise<PaymentMethodRef[]> {
    return Array.from(this.paymentMethodRefs.values()).filter(pm => pm.userId === userId);
  }

  async deletePaymentMethodRef(id: string): Promise<boolean> {
    return this.paymentMethodRefs.delete(id);
  }

  // File Upload operations
  async getFileUpload(id: string): Promise<FileUpload | undefined> {
    return this.fileUploads.get(id);
  }

  async createFileUpload(insertFileUpload: InsertFileUpload): Promise<FileUpload> {
    const id = randomUUID();
    const fileUpload: FileUpload = {
      ...insertFileUpload,
      id,
      uploadedAt: new Date(),
      fileSize: insertFileUpload.fileSize ?? null,
      mimeType: insertFileUpload.mimeType ?? null,
      retentionPolicyId: insertFileUpload.retentionPolicyId ?? null,
      hipaaCompliant: insertFileUpload.hipaaCompliant ?? true,
      encryptedAtRest: insertFileUpload.encryptedAtRest ?? true,
      labReportData: insertFileUpload.labReportData ? {
        testDate: typeof insertFileUpload.labReportData.testDate === 'string' ? insertFileUpload.labReportData.testDate : undefined,
        testType: typeof insertFileUpload.labReportData.testType === 'string' ? insertFileUpload.labReportData.testType : undefined,
        labName: typeof insertFileUpload.labReportData.labName === 'string' ? insertFileUpload.labReportData.labName : undefined,
        physicianName: typeof insertFileUpload.labReportData.physicianName === 'string' ? insertFileUpload.labReportData.physicianName : undefined,
        analysisStatus: ['error', 'pending', 'processing', 'completed'].includes(insertFileUpload.labReportData.analysisStatus as string) ? insertFileUpload.labReportData.analysisStatus as 'error' | 'pending' | 'processing' | 'completed' : undefined,
        extractedData: insertFileUpload.labReportData.extractedData && typeof insertFileUpload.labReportData.extractedData === 'object' ? insertFileUpload.labReportData.extractedData as Record<string, any> : undefined
      } : null,
      deletedAt: insertFileUpload.deletedAt ?? null,
      deletedBy: insertFileUpload.deletedBy ?? null
    };
    this.fileUploads.set(id, fileUpload);
    return fileUpload;
  }

  async listFileUploadsByUser(userId: string, type?: 'lab_report' | 'medical_document' | 'prescription' | 'other', includeDeleted?: boolean): Promise<FileUpload[]> {
    return Array.from(this.fileUploads.values()).filter(file => {
      const matchesUser = file.userId === userId;
      const matchesType = !type || file.type === type;
      const matchesDeleted = includeDeleted || !file.deletedAt;
      return matchesUser && matchesType && matchesDeleted;
    });
  }

  async updateFileUpload(id: string, updates: Partial<InsertFileUpload>): Promise<FileUpload | undefined> {
    const fileUpload = this.fileUploads.get(id);
    if (!fileUpload) return undefined;
    
    const updatedFileUpload: FileUpload = {
      ...fileUpload,
      ...updates,
      fileSize: updates.fileSize !== undefined ? updates.fileSize : fileUpload.fileSize,
      mimeType: updates.mimeType !== undefined ? updates.mimeType : fileUpload.mimeType,
      retentionPolicyId: updates.retentionPolicyId !== undefined ? updates.retentionPolicyId : fileUpload.retentionPolicyId,
      labReportData: updates.labReportData !== undefined ? (updates.labReportData ? {
        testDate: typeof updates.labReportData.testDate === 'string' ? updates.labReportData.testDate : undefined,
        testType: typeof updates.labReportData.testType === 'string' ? updates.labReportData.testType : undefined,
        labName: typeof updates.labReportData.labName === 'string' ? updates.labReportData.labName : undefined,
        physicianName: typeof updates.labReportData.physicianName === 'string' ? updates.labReportData.physicianName : undefined,
        analysisStatus: ['error', 'pending', 'processing', 'completed'].includes(updates.labReportData.analysisStatus as string) ? updates.labReportData.analysisStatus as 'error' | 'pending' | 'processing' | 'completed' : undefined,
        extractedData: updates.labReportData.extractedData && typeof updates.labReportData.extractedData === 'object' ? updates.labReportData.extractedData as Record<string, any> : undefined
      } : null) : fileUpload.labReportData,
      deletedAt: updates.deletedAt !== undefined ? updates.deletedAt : fileUpload.deletedAt,
      deletedBy: updates.deletedBy !== undefined ? updates.deletedBy : fileUpload.deletedBy
    };
    this.fileUploads.set(id, updatedFileUpload);
    return updatedFileUpload;
  }

  async softDeleteFileUpload(id: string, deletedBy: string): Promise<boolean> {
    const fileUpload = this.fileUploads.get(id);
    if (!fileUpload) return false;
    
    const updatedFileUpload = {
      ...fileUpload,
      deletedAt: new Date(),
      deletedBy
    };
    this.fileUploads.set(id, updatedFileUpload);
    return true;
  }

  // Lab Report specific operations
  async getLabReportsByUser(userId: string): Promise<FileUpload[]> {
    return this.listFileUploadsByUser(userId, 'lab_report', false);
  }

  async getLabReportById(id: string, userId: string): Promise<FileUpload | undefined> {
    const fileUpload = this.fileUploads.get(id);
    if (!fileUpload || fileUpload.userId !== userId || fileUpload.type !== 'lab_report' || fileUpload.deletedAt) {
      return undefined;
    }
    return fileUpload;
  }

  async updateLabReportData(id: string, labReportData: any, userId: string): Promise<FileUpload | undefined> {
    const fileUpload = await this.getLabReportById(id, userId);
    if (!fileUpload) return undefined;
    
    const updatedFileUpload = {
      ...fileUpload,
      labReportData: { ...fileUpload.labReportData, ...labReportData }
    };
    this.fileUploads.set(id, updatedFileUpload);
    return updatedFileUpload;
  }

  // Audit Log operations (HIPAA compliance)
  async createAuditLog(insertAuditLog: InsertAuditLog): Promise<AuditLog> {
    const id = randomUUID();
    const auditLog: AuditLog = {
      ...insertAuditLog,
      id,
      timestamp: new Date(),
      userId: insertAuditLog.userId ?? null,
      fileId: insertAuditLog.fileId ?? null,
      objectPath: insertAuditLog.objectPath ?? null,
      ipAddress: insertAuditLog.ipAddress ?? null,
      userAgent: insertAuditLog.userAgent ?? null,
      errorMessage: insertAuditLog.errorMessage ?? null,
      metadata: insertAuditLog.metadata ?? null
    };
    this.auditLogs.set(id, auditLog);
    return auditLog;
  }

  async getAuditLogsByFile(fileId: string): Promise<AuditLog[]> {
    return Array.from(this.auditLogs.values())
      .filter(log => log.fileId === fileId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getAuditLogsByUser(userId: string, limit?: number): Promise<AuditLog[]> {
    const logs = Array.from(this.auditLogs.values())
      .filter(log => log.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return limit ? logs.slice(0, limit) : logs;
  }

  async getAuditLogsByDateRange(startDate: Date, endDate: Date): Promise<AuditLog[]> {
    return Array.from(this.auditLogs.values())
      .filter(log => log.timestamp >= startDate && log.timestamp <= endDate)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // User Consent operations (HIPAA compliance)
  async createUserConsent(insertConsent: InsertUserConsent): Promise<UserConsent> {
    const id = randomUUID();
    const consent: UserConsent = {
      ...insertConsent,
      id,
      grantedAt: new Date(),
      revokedAt: insertConsent.revokedAt ?? null,
      ipAddress: insertConsent.ipAddress ?? null,
      userAgent: insertConsent.userAgent ?? null,
      consentText: insertConsent.consentText ?? null,
      consentVersion: insertConsent.consentVersion ?? '1.0',
      metadata: insertConsent.metadata ? {
        source: ['upload_form', 'dashboard', 'api'].includes(insertConsent.metadata.source as string) ? insertConsent.metadata.source as 'upload_form' | 'dashboard' | 'api' : undefined,
        fileId: typeof insertConsent.metadata.fileId === 'string' ? insertConsent.metadata.fileId : undefined,
        additionalInfo: insertConsent.metadata.additionalInfo && typeof insertConsent.metadata.additionalInfo === 'object' ? insertConsent.metadata.additionalInfo as Record<string, any> : undefined
      } : null
    };
    this.userConsents.set(id, consent);
    return consent;
  }

  async getUserConsent(userId: string, consentType: 'lab_data_processing' | 'ai_analysis' | 'data_retention' | 'third_party_sharing'): Promise<UserConsent | undefined> {
    // Get the most recent consent for this user and type
    const consents = Array.from(this.userConsents.values())
      .filter(consent => consent.userId === userId && consent.consentType === consentType)
      .sort((a, b) => b.grantedAt.getTime() - a.grantedAt.getTime());
    
    const latestConsent = consents[0];
    // Return only if granted and not revoked
    return latestConsent && latestConsent.granted && !latestConsent.revokedAt ? latestConsent : undefined;
  }

  async getUserConsents(userId: string): Promise<UserConsent[]> {
    return Array.from(this.userConsents.values())
      .filter(consent => consent.userId === userId)
      .sort((a, b) => b.grantedAt.getTime() - a.grantedAt.getTime());
  }

  async revokeUserConsent(userId: string, consentType: 'lab_data_processing' | 'ai_analysis' | 'data_retention' | 'third_party_sharing'): Promise<boolean> {
    // Find active consent
    const activeConsent = await this.getUserConsent(userId, consentType);
    if (!activeConsent) return false;
    
    // Create revocation record
    const revokedConsent = {
      ...activeConsent,
      revokedAt: new Date()
    };
    this.userConsents.set(activeConsent.id, revokedConsent);
    return true;
  }

  // Lab Analysis operations (AI-generated insights)
  async createLabAnalysis(insertAnalysis: InsertLabAnalysis): Promise<LabAnalysis> {
    const id = randomUUID();
    const analysis: LabAnalysis = {
      ...insertAnalysis,
      id,
      processedAt: new Date(),
      extractedMarkers: Array.isArray(insertAnalysis.extractedMarkers) ? insertAnalysis.extractedMarkers : (insertAnalysis.extractedMarkers ? Array.from(insertAnalysis.extractedMarkers as any) : null),
      aiInsights: insertAnalysis.aiInsights && typeof insertAnalysis.aiInsights === 'object' ? {
        summary: typeof insertAnalysis.aiInsights.summary === 'string' ? insertAnalysis.aiInsights.summary : '',
        recommendations: Array.isArray(insertAnalysis.aiInsights.recommendations) ? insertAnalysis.aiInsights.recommendations : (insertAnalysis.aiInsights.recommendations ? Array.from(insertAnalysis.aiInsights.recommendations as any) : []),
        riskFactors: Array.isArray(insertAnalysis.aiInsights.riskFactors) ? insertAnalysis.aiInsights.riskFactors : (insertAnalysis.aiInsights.riskFactors ? Array.from(insertAnalysis.aiInsights.riskFactors as any) : []),
        nutritionalNeeds: Array.isArray(insertAnalysis.aiInsights.nutritionalNeeds) ? insertAnalysis.aiInsights.nutritionalNeeds : (insertAnalysis.aiInsights.nutritionalNeeds ? Array.from(insertAnalysis.aiInsights.nutritionalNeeds as any) : []),
        confidence: typeof insertAnalysis.aiInsights.confidence === 'number' ? insertAnalysis.aiInsights.confidence : 0
      } : null,
      errorMessage: insertAnalysis.errorMessage ?? null
    };
    this.labAnalyses.set(id, analysis);
    return analysis;
  }

  async getLabAnalysis(fileId: string): Promise<LabAnalysis | undefined> {
    return Array.from(this.labAnalyses.values()).find(analysis => analysis.fileId === fileId);
  }

  async updateLabAnalysis(id: string, updates: Partial<InsertLabAnalysis>): Promise<LabAnalysis | undefined> {
    const analysis = this.labAnalyses.get(id);
    if (!analysis) return undefined;
    
    const updatedAnalysis: LabAnalysis = {
      ...analysis,
      ...updates,
      extractedMarkers: updates.extractedMarkers !== undefined ? (Array.isArray(updates.extractedMarkers) ? updates.extractedMarkers : (updates.extractedMarkers ? Array.from(updates.extractedMarkers as any) : null)) : analysis.extractedMarkers,
      aiInsights: updates.aiInsights !== undefined ? (updates.aiInsights && typeof updates.aiInsights === 'object' ? {
        summary: typeof updates.aiInsights.summary === 'string' ? updates.aiInsights.summary : '',
        recommendations: Array.isArray(updates.aiInsights.recommendations) ? updates.aiInsights.recommendations : (updates.aiInsights.recommendations ? Array.from(updates.aiInsights.recommendations as any) : []),
        riskFactors: Array.isArray(updates.aiInsights.riskFactors) ? updates.aiInsights.riskFactors : (updates.aiInsights.riskFactors ? Array.from(updates.aiInsights.riskFactors as any) : []),
        nutritionalNeeds: Array.isArray(updates.aiInsights.nutritionalNeeds) ? updates.aiInsights.nutritionalNeeds : (updates.aiInsights.nutritionalNeeds ? Array.from(updates.aiInsights.nutritionalNeeds as any) : []),
        confidence: typeof updates.aiInsights.confidence === 'number' ? updates.aiInsights.confidence : 0
      } : null) : analysis.aiInsights,
      errorMessage: updates.errorMessage !== undefined ? updates.errorMessage : analysis.errorMessage
    };
    this.labAnalyses.set(id, updatedAnalysis);
    return updatedAnalysis;
  }

  async listLabAnalysesByUser(userId: string): Promise<LabAnalysis[]> {
    return Array.from(this.labAnalyses.values())
      .filter(analysis => analysis.userId === userId)
      .sort((a, b) => b.processedAt.getTime() - a.processedAt.getTime());
  }

  // Notification Preferences operations
  async getNotificationPrefs(userId: string): Promise<NotificationPref | undefined> {
    return this.notificationPrefs.get(userId);
  }

  async createNotificationPrefs(insertPrefs: InsertNotificationPref): Promise<NotificationPref> {
    const prefs: NotificationPref = {
      userId: insertPrefs.userId,
      emailConsultation: insertPrefs.emailConsultation ?? true,
      emailShipping: insertPrefs.emailShipping ?? true,
      emailBilling: insertPrefs.emailBilling ?? true,
      updatedAt: new Date()
    };
    this.notificationPrefs.set(insertPrefs.userId, prefs);
    return prefs;
  }

  async updateNotificationPrefs(userId: string, updates: Partial<InsertNotificationPref>): Promise<NotificationPref | undefined> {
    const prefs = this.notificationPrefs.get(userId);
    if (!prefs) return undefined;
    
    const updatedPrefs = { 
      ...prefs, 
      ...updates,
      updatedAt: new Date()
    };
    this.notificationPrefs.set(userId, updatedPrefs);
    return updatedPrefs;
  }

  // Notification operations
  async getNotification(id: string): Promise<Notification | undefined> {
    return Array.from(this.notifications.values()).find(n => n.id === id);
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const id = randomUUID();
    const notification: Notification = {
      ...insertNotification,
      id,
      isRead: insertNotification.isRead ?? false,
      formulaId: insertNotification.formulaId ?? null,
      orderId: insertNotification.orderId ?? null,
      metadata: insertNotification.metadata ? {
        actionUrl: insertNotification.metadata.actionUrl ? String(insertNotification.metadata.actionUrl) : undefined,
        icon: insertNotification.metadata.icon ? String(insertNotification.metadata.icon) : undefined,
        priority: ['high', 'low', 'medium'].includes(String(insertNotification.metadata.priority)) ? insertNotification.metadata.priority as 'high' | 'low' | 'medium' : undefined,
        additionalData: insertNotification.metadata.additionalData && typeof insertNotification.metadata.additionalData === 'object' ? insertNotification.metadata.additionalData as Record<string, any> : undefined
      } : null,
      createdAt: new Date()
    };
    this.notifications.set(id, notification);
    return notification;
  }

  async listNotificationsByUser(userId: string, limit?: number): Promise<Notification[]> {
    const notifications = Array.from(this.notifications.values())
      .filter(n => n.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return limit ? notifications.slice(0, limit) : notifications;
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    return Array.from(this.notifications.values())
      .filter(n => n.userId === userId && !n.isRead)
      .length;
  }

  async markNotificationAsRead(id: string, userId: string): Promise<Notification | undefined> {
    const notification = this.notifications.get(id);
    if (!notification || notification.userId !== userId) return undefined;
    
    const updatedNotification = { ...notification, isRead: true };
    this.notifications.set(id, updatedNotification);
    return updatedNotification;
  }

  async markAllNotificationsAsRead(userId: string): Promise<boolean> {
    const userNotifications = Array.from(this.notifications.entries())
      .filter(([_, n]) => n.userId === userId && !n.isRead);
    
    userNotifications.forEach(([id, notification]) => {
      this.notifications.set(id, { ...notification, isRead: true });
    });
    
    return true;
  }

  async deleteNotification(id: string, userId: string): Promise<boolean> {
    const notification = this.notifications.get(id);
    if (!notification || notification.userId !== userId) return false;
    
    return this.notifications.delete(id);
  }

  // Support System operations
  // FAQ operations
  async getFaqItem(id: string): Promise<FaqItem | undefined> {
    return this.faqItems.get(id);
  }

  async createFaqItem(insertFaqItem: InsertFaqItem): Promise<FaqItem> {
    const id = randomUUID();
    const faqItem: FaqItem = {
      ...insertFaqItem,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.faqItems.set(id, faqItem);
    return faqItem;
  }

  async updateFaqItem(id: string, updates: Partial<InsertFaqItem>): Promise<FaqItem | undefined> {
    const faqItem = this.faqItems.get(id);
    if (!faqItem) return undefined;
    
    const updatedFaqItem = {
      ...faqItem,
      ...updates,
      updatedAt: new Date()
    };
    this.faqItems.set(id, updatedFaqItem);
    return updatedFaqItem;
  }

  async listFaqItems(category?: string): Promise<FaqItem[]> {
    const items = Array.from(this.faqItems.values())
      .filter(item => item.isPublished && (!category || item.category === category))
      .sort((a, b) => a.displayOrder - b.displayOrder);
    return items;
  }

  async deleteFaqItem(id: string): Promise<boolean> {
    return this.faqItems.delete(id);
  }

  // Support ticket operations
  async getSupportTicket(id: string): Promise<SupportTicket | undefined> {
    return this.supportTickets.get(id);
  }

  async createSupportTicket(insertTicket: InsertSupportTicket): Promise<SupportTicket> {
    const id = randomUUID();
    const ticket: SupportTicket = {
      ...insertTicket,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      resolvedAt: insertTicket.resolvedAt ?? null,
      assignedTo: insertTicket.assignedTo ?? null
    };
    this.supportTickets.set(id, ticket);
    return ticket;
  }

  async updateSupportTicket(id: string, updates: Partial<InsertSupportTicket>): Promise<SupportTicket | undefined> {
    const ticket = this.supportTickets.get(id);
    if (!ticket) return undefined;
    
    const updatedTicket = {
      ...ticket,
      ...updates,
      updatedAt: new Date()
    };
    this.supportTickets.set(id, updatedTicket);
    return updatedTicket;
  }

  async listSupportTicketsByUser(userId: string): Promise<SupportTicket[]> {
    return Array.from(this.supportTickets.values())
      .filter(ticket => ticket.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getSupportTicketWithResponses(id: string, userId: string): Promise<{ticket: SupportTicket, responses: SupportTicketResponse[]} | undefined> {
    const ticket = this.supportTickets.get(id);
    if (!ticket || ticket.userId !== userId) return undefined;
    
    const responses = Array.from(this.supportTicketResponses.values())
      .filter(response => response.ticketId === id)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    
    return { ticket, responses };
  }

  // Support ticket response operations
  async createSupportTicketResponse(insertResponse: InsertSupportTicketResponse): Promise<SupportTicketResponse> {
    const id = randomUUID();
    const response: SupportTicketResponse = {
      ...insertResponse,
      id,
      createdAt: new Date(),
      userId: insertResponse.userId ?? null
    };
    this.supportTicketResponses.set(id, response);
    return response;
  }

  async listSupportTicketResponses(ticketId: string): Promise<SupportTicketResponse[]> {
    return Array.from(this.supportTicketResponses.values())
      .filter(response => response.ticketId === ticketId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  // Help article operations
  async getHelpArticle(id: string): Promise<HelpArticle | undefined> {
    return this.helpArticles.get(id);
  }

  async createHelpArticle(insertArticle: InsertHelpArticle): Promise<HelpArticle> {
    const id = randomUUID();
    const article: HelpArticle = {
      ...insertArticle,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.helpArticles.set(id, article);
    return article;
  }

  async updateHelpArticle(id: string, updates: Partial<InsertHelpArticle>): Promise<HelpArticle | undefined> {
    const article = this.helpArticles.get(id);
    if (!article) return undefined;
    
    const updatedArticle = {
      ...article,
      ...updates,
      updatedAt: new Date()
    };
    this.helpArticles.set(id, updatedArticle);
    return updatedArticle;
  }

  async listHelpArticles(category?: string): Promise<HelpArticle[]> {
    const articles = Array.from(this.helpArticles.values())
      .filter(article => article.isPublished && (!category || article.category === category))
      .sort((a, b) => a.displayOrder - b.displayOrder);
    return articles;
  }

  async deleteHelpArticle(id: string): Promise<boolean> {
    return this.helpArticles.delete(id);
  }

  async incrementHelpArticleViewCount(id: string): Promise<boolean> {
    const article = this.helpArticles.get(id);
    if (!article) return false;
    
    const updatedArticle = {
      ...article,
      viewCount: article.viewCount + 1
    };
    this.helpArticles.set(id, updatedArticle);
    return true;
  }

  // Newsletter subscriber operations
  private newsletterSubscribers: Map<string, NewsletterSubscriber> = new Map();

  async getNewsletterSubscriberByEmail(email: string): Promise<NewsletterSubscriber | undefined> {
    const normalizedEmail = email.trim().toLowerCase();
    return Array.from(this.newsletterSubscribers.values()).find(s => s.email === normalizedEmail);
  }

  async createNewsletterSubscriber(insertSubscriber: InsertNewsletterSubscriber): Promise<NewsletterSubscriber> {
    const id = randomUUID();
    const normalizedEmail = insertSubscriber.email.trim().toLowerCase();
    const subscriber: NewsletterSubscriber = {
      email: normalizedEmail,
      id,
      subscribedAt: new Date(),
      isActive: true
    };
    this.newsletterSubscribers.set(id, subscriber);
    return subscriber;
  }

  async reactivateNewsletterSubscriber(email: string): Promise<boolean> {
    const subscriber = await this.getNewsletterSubscriberByEmail(email);
    if (!subscriber) return false;
    
    const updated: NewsletterSubscriber = {
      ...subscriber,
      isActive: true
    };
    this.newsletterSubscribers.set(subscriber.id, updated);
    return true;
  }
}

export const storage = new DrizzleStorage();