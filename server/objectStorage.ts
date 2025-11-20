import { createClient } from '@supabase/supabase-js';
import { randomUUID } from "crypto";
import { storage } from "./storage";

// Supabase client
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const LAB_REPORTS_BUCKET = 'lab-reports';
export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
export const supabaseStorageClient = supabaseClient.storage;

export class ConsentRequiredError extends Error {
  constructor(message: string = "User consent required") {
    super(message);
    this.name = "ConsentRequiredError";
    Object.setPrototypeOf(this, ConsentRequiredError.prototype);
  }
}

// HIPAA-compliant consent enforcement utility
export async function enforceConsentRequirements(
  userId: string,
  operation: 'upload' | 'download' | 'delete' | 'list' | 'ai_analysis',
  auditInfo?: { ipAddress?: string, userAgent?: string }
): Promise<void> {
  try {
    // Map operations to required consent types
    const requiredConsents: Record<string, string[]> = {
      'upload': ['lab_data_processing'],
      'download': ['lab_data_processing'],
      'delete': ['lab_data_processing'],
      'list': ['lab_data_processing'],
      'ai_analysis': ['lab_data_processing', 'ai_analysis']
    };

    const consentsNeeded = requiredConsents[operation] || [];
    const missingConsents: string[] = [];

    // Check each required consent
    for (const consentType of consentsNeeded) {
      try {
        const consent = await storage.getUserConsent(userId, consentType as any);
        if (!consent) {
          missingConsents.push(consentType);
        }
      } catch (error) {
        console.error(`Error checking consent ${consentType}:`, error);
        // If we can't check consent, assume it's missing
        missingConsents.push(consentType);
      }
    }

    // Log consent check result
    const auditEntry = {
      timestamp: new Date().toISOString(),
      userId,
      action: 'access_denied' as const,
      objectPath: `consent-check-${operation}`,
      ipAddress: auditInfo?.ipAddress,
      userAgent: auditInfo?.userAgent,
      success: missingConsents.length === 0,
      reason: missingConsents.length > 0 
        ? `Missing required consents: ${missingConsents.join(', ')}` 
        : `All required consents verified for ${operation}`
    };

    if (missingConsents.length > 0) {
      console.warn("HIPAA AUDIT LOG - Consent Violation:", auditEntry);
      throw new ConsentRequiredError(
        `Operation blocked: Missing required consents for ${operation}. ` +
        `Required: ${missingConsents.join(', ')}. ` +
        `Please provide consent before accessing medical data.`
      );
    } else {
      console.log("HIPAA AUDIT LOG - Consent Verified:", auditEntry);
    }
  } catch (error) {
    // Re-throw ConsentRequiredError as-is
    if (error instanceof ConsentRequiredError) {
      throw error;
    }
    // Log and re-throw other errors
    console.error('Error in enforceConsentRequirements:', error);
    throw error;
  }
}

// HIPAA-compliant object storage service for medical lab reports
export class ObjectStorageService {
  constructor() {}

  // Uploads a lab report file to Supabase Storage
  async uploadLabReportFile(userId: string, fileBuffer: Buffer, originalFileName: string, contentType: string = 'application/pdf'): Promise<string> {
    await enforceConsentRequirements(userId, 'upload');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const objectId = randomUUID();
    const fileExtension = originalFileName.split('.').pop() || 'pdf';
    const fileName = `${timestamp}_${objectId}.${fileExtension}`;
    const filePath = `${userId}/${fileName}`;
    const { data, error } = await supabaseStorageClient
      .from(LAB_REPORTS_BUCKET)
      .upload(filePath, fileBuffer, {
        contentType,
        upsert: false
      });
    if (error) throw new Error(`Supabase upload error: ${error.message}`);
    return filePath;
  }

  // Gets a signed download URL for a lab report for internal analysis
  async getLabReportDownloadURL(
    objectPath: string,
    userId: string,
    auditInfo?: { ipAddress?: string, userAgent?: string }
  ): Promise<string> {
    await enforceConsentRequirements(userId, 'download', auditInfo);

    if (!objectPath.startsWith(`${userId}/`)) {
      console.warn("HIPAA AUDIT LOG - Unauthorized Access Attempt:", {
        timestamp: new Date().toISOString(),
        userId,
        action: 'access_denied',
        objectPath,
        ipAddress: auditInfo?.ipAddress,
        userAgent: auditInfo?.userAgent,
        success: false,
        reason: "User attempted to access another user's lab report"
      });
      throw new Error("Access denied: User can only access their own lab reports");
    }

    const { data, error } = await supabaseStorageClient
      .from(LAB_REPORTS_BUCKET)
      .createSignedUrl(objectPath, 60 * 5); // 5 minutes

    if (error || !data?.signedUrl) {
      throw new Error(`Supabase signed URL error: ${error?.message || 'unknown error'}`);
    }

    return data.signedUrl;
  }

  // Gets the object entity file from the object path with enhanced security checks
  async getLabReportFile(objectPath: string, userId: string): Promise<Buffer | null> {
    await enforceConsentRequirements(userId, 'download');

    if (!objectPath.startsWith(`${userId}/`)) {
      console.warn("HIPAA AUDIT LOG - Unauthorized Access Attempt:", {
        timestamp: new Date().toISOString(),
        userId,
        action: 'access_denied',
        objectPath,
        success: false,
        reason: "User attempted to access another user's lab report"
      });
      return null;
    }

    // objectPath format: userId/filename
    const { data, error } = await supabaseStorageClient
      .from(LAB_REPORTS_BUCKET)
      .download(objectPath);
    if (error) {
      console.error('Supabase download error:', error);
      return null;
    }
    // data is a Blob; convert to Buffer for Node.js
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  // Generic method for getting any object entity file
  // HIPAA-compliant secure deletion of lab reports
  async secureDeleteLabReport(objectPath: string, userId: string): Promise<boolean> {
    await enforceConsentRequirements(userId, 'delete');

    if (!objectPath.startsWith(`${userId}/`)) {
      console.warn("HIPAA AUDIT LOG - Unauthorized Delete Attempt:", {
        timestamp: new Date().toISOString(),
        userId,
        action: 'access_denied',
        objectPath,
        success: false,
        reason: "User attempted to delete another user's lab report"
      });
      return false;
    }

    // objectPath format: userId/filename
    const { error } = await supabaseStorageClient
      .from(LAB_REPORTS_BUCKET)
      .remove([objectPath]);
    if (error) {
      console.error('Supabase delete error:', error);
      return false;
    }
    return true;
  }

  // List all lab reports for a specific user
  async listUserLabReports(userId: string): Promise<Array<{path: string, uploadedAt: string}>> {
    await enforceConsentRequirements(userId, 'list');
    const { data, error } = await supabaseStorageClient
      .from(LAB_REPORTS_BUCKET)
      .list(userId, { limit: 100 });
    if (error) throw new Error(`Supabase list error: ${error.message}`);
    return (data || []).map(file => ({
      path: `${userId}/${file.name}`,
      uploadedAt: file.created_at || new Date().toISOString()
    }));
  }
}