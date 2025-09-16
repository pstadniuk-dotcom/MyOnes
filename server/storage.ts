import { randomUUID } from "crypto";
import {
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
  type NotificationPref, type InsertNotificationPref
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
  
  // File Upload operations
  getFileUpload(id: string): Promise<FileUpload | undefined>;
  createFileUpload(fileUpload: InsertFileUpload): Promise<FileUpload>;
  listFileUploadsByUser(userId: string, type?: 'lab_report' | 'medical_document' | 'prescription' | 'other'): Promise<FileUpload[]>;
  
  // Notification Preferences operations
  getNotificationPrefs(userId: string): Promise<NotificationPref | undefined>;
  createNotificationPrefs(prefs: InsertNotificationPref): Promise<NotificationPref>;
  updateNotificationPrefs(userId: string, updates: Partial<InsertNotificationPref>): Promise<NotificationPref | undefined>;
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
  private notificationPrefs: Map<string, NotificationPref> = new Map(); // keyed by userId

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
      uploadedAt: new Date()
    };
    this.fileUploads.set(id, fileUpload);
    return fileUpload;
  }

  async listFileUploadsByUser(userId: string, type?: 'lab_report' | 'medical_document' | 'prescription' | 'other'): Promise<FileUpload[]> {
    return Array.from(this.fileUploads.values()).filter(file => {
      const matchesUser = file.userId === userId;
      const matchesType = !type || file.type === type;
      return matchesUser && matchesType;
    });
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
}

export const storage = new MemStorage();