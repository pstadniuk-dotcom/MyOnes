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
  type NotificationPref, type InsertNotificationPref,
  type AuditLog, type InsertAuditLog,
  type UserConsent, type InsertUserConsent,
  type LabAnalysis, type InsertLabAnalysis
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
  private auditLogs: Map<string, AuditLog> = new Map();
  private userConsents: Map<string, UserConsent> = new Map();
  private labAnalyses: Map<string, LabAnalysis> = new Map();

  constructor() {
    // Initialize with mock data for development testing
    this.initializeMockData();
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
      labReportData: insertFileUpload.labReportData ? {
        testDate: typeof insertFileUpload.labReportData.testDate === 'string' ? insertFileUpload.labReportData.testDate : undefined,
        testType: typeof insertFileUpload.labReportData.testType === 'string' ? insertFileUpload.labReportData.testType : undefined,
        labName: typeof insertFileUpload.labReportData.labName === 'string' ? insertFileUpload.labReportData.labName : undefined,
        physicianName: typeof insertFileUpload.labReportData.physicianName === 'string' ? insertFileUpload.labReportData.physicianName : undefined,
        analysisStatus: ['error', 'pending', 'processing', 'completed'].includes(insertFileUpload.labReportData.analysisStatus) ? insertFileUpload.labReportData.analysisStatus as 'error' | 'pending' | 'processing' | 'completed' : undefined,
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
        analysisStatus: ['error', 'pending', 'processing', 'completed'].includes(updates.labReportData.analysisStatus) ? updates.labReportData.analysisStatus as 'error' | 'pending' | 'processing' | 'completed' : undefined,
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
      metadata: insertConsent.metadata ? {
        source: ['upload_form', 'dashboard', 'api'].includes(insertConsent.metadata.source) ? insertConsent.metadata.source as 'upload_form' | 'dashboard' | 'api' : undefined,
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
      extractedMarkers: insertAnalysis.extractedMarkers ?? null,
      aiInsights: insertAnalysis.aiInsights ?? null,
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
      extractedMarkers: updates.extractedMarkers !== undefined ? updates.extractedMarkers : analysis.extractedMarkers,
      aiInsights: updates.aiInsights !== undefined ? updates.aiInsights : analysis.aiInsights,
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
}

export const storage = new MemStorage();