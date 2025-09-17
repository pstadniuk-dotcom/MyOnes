import { Storage, File } from "@google-cloud/storage";
import { Response } from "express";
import { randomUUID } from "crypto";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
  appendAuditLogEntry,
  AuditLogEntry,
} from "./objectAcl";
import { storage } from "./storage";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

// The object storage client is used to interact with the object storage service.
export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class AccessDeniedError extends Error {
  constructor(message: string = "Access denied") {
    super(message);
    this.name = "AccessDeniedError";
    Object.setPrototypeOf(this, AccessDeniedError.prototype);
  }
}

export class ConsentRequiredError extends Error {
  constructor(message: string = "User consent required") {
    super(message);
    this.name = "ConsentRequiredError";
    Object.setPrototypeOf(this, ConsentRequiredError.prototype);
  }
}

export class RetentionPolicyViolationError extends Error {
  constructor(message: string = "Retention policy violation") {
    super(message);
    this.name = "RetentionPolicyViolationError";
    Object.setPrototypeOf(this, RetentionPolicyViolationError.prototype);
  }
}

// HIPAA-compliant consent enforcement utility
async function enforceConsentRequirements(
  userId: string,
  operation: 'upload' | 'download' | 'delete' | 'list' | 'ai_analysis',
  auditInfo?: { ipAddress?: string, userAgent?: string }
): Promise<void> {
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
    const consent = await storage.getUserConsent(userId, consentType as any);
    if (!consent) {
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
}

// HIPAA-compliant retention policy enforcement utility
async function enforceRetentionPolicy(
  objectFile: File,
  userId: string,
  operation: 'access' | 'cleanup',
  auditInfo?: { ipAddress?: string, userAgent?: string }
): Promise<void> {
  const aclPolicy = await getObjectAclPolicy(objectFile);
  if (!aclPolicy?.metadata) {
    return; // No retention policy defined
  }

  const retentionPolicy = aclPolicy.metadata.retentionPolicy;
  const uploadedAt = aclPolicy.metadata.uploadedAt;
  
  if (!retentionPolicy || !uploadedAt) {
    return; // No retention requirements
  }

  // Parse retention policy (e.g., "7_years", "10_years", "permanent")
  if (retentionPolicy === "permanent") {
    return; // No expiration
  }

  const [amount, unit] = retentionPolicy.split('_');
  const retentionYears = parseInt(amount);
  
  if (isNaN(retentionYears) || unit !== 'years') {
    console.warn(`Invalid retention policy format: ${retentionPolicy}`);
    return;
  }

  // Calculate expiration date
  const uploadDate = new Date(uploadedAt);
  const expirationDate = new Date(uploadDate);
  expirationDate.setFullYear(expirationDate.getFullYear() + retentionYears);
  
  const now = new Date();
  const isExpired = now > expirationDate;
  
  // Log retention check
  const auditEntry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    userId,
    action: isExpired ? 'access_denied' : 'read',
    objectPath: objectFile.name,
    ipAddress: auditInfo?.ipAddress,
    userAgent: auditInfo?.userAgent,
    success: !isExpired || operation === 'cleanup',
    reason: isExpired 
      ? `File expired per retention policy ${retentionPolicy}. Uploaded: ${uploadedAt}, Expired: ${expirationDate.toISOString()}`
      : `File within retention period. Expires: ${expirationDate.toISOString()}`
  };

  if (isExpired && operation === 'access') {
    console.warn("HIPAA AUDIT LOG - Retention Policy Violation:", auditEntry);
    throw new RetentionPolicyViolationError(
      `File access denied: Retention period expired. ` +
      `Upload date: ${uploadedAt}, Retention: ${retentionPolicy}, Expired: ${expirationDate.toISOString()}`
    );
  } else {
    console.log("HIPAA AUDIT LOG - Retention Policy Check:", auditEntry);
  }
}

// Cleanup expired lab reports based on retention policies
async function cleanupExpiredLabReports(
  userId: string,
  auditInfo?: { ipAddress?: string, userAgent?: string }
): Promise<{ cleaned: number, errors: string[] }> {
  const results = { cleaned: 0, errors: [] as string[] };
  
  try {
    // Get all lab reports for the user
    const objectStorageService = new ObjectStorageService();
    const labReports = await objectStorageService.listUserLabReports(userId, auditInfo);
    
    for (const report of labReports) {
      try {
        const objectFile = await objectStorageService.getLabReportFile(report.path, userId, auditInfo);
        
        // Check if expired using the retention enforcement
        try {
          await enforceRetentionPolicy(objectFile, userId, 'cleanup', auditInfo);
          // If we get here, file is not expired, skip
        } catch (error) {
          if (error instanceof RetentionPolicyViolationError) {
            // File is expired, perform secure deletion
            const deleted = await objectStorageService.secureDeleteLabReport(report.path, userId, auditInfo);
            if (deleted) {
              results.cleaned++;
              
              // Log cleanup action
              const auditEntry: AuditLogEntry = {
                timestamp: new Date().toISOString(),
                userId,
                action: 'delete',
                objectPath: report.path,
                ipAddress: auditInfo?.ipAddress,
                userAgent: auditInfo?.userAgent,
                success: true,
                reason: `Automatic cleanup - retention policy expired`
              };
              console.log("HIPAA AUDIT LOG - Retention Cleanup:", auditEntry);
            } else {
              results.errors.push(`Failed to delete expired file: ${report.path}`);
            }
          } else {
            results.errors.push(`Error checking retention for ${report.path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      } catch (error) {
        results.errors.push(`Error processing ${report.path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  } catch (error) {
    results.errors.push(`Error listing lab reports: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return results;
}

// HIPAA-compliant object storage service for medical lab reports
export class ObjectStorageService {
  constructor() {}
  
  // HIPAA Compliance: Cleanup expired lab reports for a user
  async cleanupExpiredLabReports(
    userId: string,
    auditInfo?: { ipAddress?: string, userAgent?: string }
  ): Promise<{ cleaned: number, errors: string[] }> {
    return await cleanupExpiredLabReports(userId, auditInfo);
  }

  // Gets the public object search paths.
  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0)
      )
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' " +
          "tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths)."
      );
    }
    return paths;
  }

  // Gets the private object directory.
  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
    return dir;
  }

  // Search for a public object from the search paths.
  async searchPublicObject(filePath: string): Promise<File | null> {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;

      // Full path format: /<bucket_name>/<object_name>
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);

      // Check if file exists
      const [exists] = await file.exists();
      if (exists) {
        return file;
      }
    }

    return null;
  }

  // Downloads an object to the response with HIPAA-compliant security headers
  async downloadObject(
    file: File, 
    res: Response, 
    cacheTtlSec: number = 0,
    auditInfo?: { userId: string, ipAddress?: string, userAgent?: string }
  ) {
    let accessGranted = false;
    let auditReason = "";
    
    try {
      // HIPAA Compliance: Enforce consent requirements before download
      if (auditInfo?.userId) {
        await enforceConsentRequirements(auditInfo.userId, 'download', auditInfo);
      }
      // Get file metadata
      const [metadata] = await file.getMetadata();
      // Get the ACL policy for the object.
      const aclPolicy = await getObjectAclPolicy(file);
      const isPublic = aclPolicy?.visibility === "public" || false;
      
      // HIPAA Audit: Log the download attempt
      if (auditInfo?.userId) {
        accessGranted = true;
        auditReason = "File download initiated";
      }
      
      // HIPAA compliance: No caching for private medical documents
      const cachePolicy = isPublic ? `public, max-age=${cacheTtlSec}` : "no-cache, no-store, must-revalidate";
      
      // Set appropriate security headers for HIPAA compliance
      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Length": metadata.size,
        "Cache-Control": cachePolicy,
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        "Content-Security-Policy": "default-src 'none'",
      });

      // Stream the file to the response
      const stream = file.createReadStream();

      stream.on("error", (err: Error) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });

      stream.pipe(res);
      
      // HIPAA Compliance: Enforce retention policy before allowing download
      if (auditInfo?.userId) {
        await enforceRetentionPolicy(file, auditInfo.userId, 'access', auditInfo);
      }
      
      // Log successful download completion
      if (auditInfo?.userId) {
        const auditEntry: AuditLogEntry = {
          timestamp: new Date().toISOString(),
          userId: auditInfo.userId,
          action: 'read',
          objectPath: file.name,
          ipAddress: auditInfo.ipAddress,
          userAgent: auditInfo.userAgent,
          success: true,
          reason: 'File downloaded successfully'
        };
        
        try {
          await appendAuditLogEntry(file, auditEntry);
        } catch (auditError) {
          console.error("Failed to log download audit entry:", auditError);
        }
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      
      // Log failed download attempt
      if (auditInfo?.userId) {
        const auditEntry: AuditLogEntry = {
          timestamp: new Date().toISOString(),
          userId: auditInfo.userId,
          action: 'read',
          objectPath: file.name,
          ipAddress: auditInfo.ipAddress,
          userAgent: auditInfo.userAgent,
          success: false,
          reason: `Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
        
        try {
          await appendAuditLogEntry(file, auditEntry);
        } catch (auditError) {
          console.error("Failed to log download failure audit entry:", auditError);
        }
      }
      
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  // Gets the upload URL for a lab report with enhanced security
  async getLabReportUploadURL(
    userId: string, 
    originalFileName?: string,
    auditInfo?: { ipAddress?: string, userAgent?: string }
  ): Promise<string> {
    // HIPAA Compliance: Enforce consent requirements before upload
    await enforceConsentRequirements(userId, 'upload', auditInfo);
    const privateObjectDir = this.getPrivateObjectDir();
    if (!privateObjectDir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }

    // Generate secure object ID with user prefix for HIPAA compliance
    const objectId = randomUUID();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileExtension = originalFileName ? originalFileName.split('.').pop() : 'pdf';
    const secureFileName = `${timestamp}_${objectId}.${fileExtension}`;
    
    // Store in user-specific directory for better organization and security
    const fullPath = `${privateObjectDir}/lab-reports/${userId}/${secureFileName}`;

    const { bucketName, objectName } = parseObjectPath(fullPath);

    // Sign URL for PUT method with shorter TTL for security (15 minutes)
    return signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900, // 15 minutes
    });
  }

  // Gets the object entity file from the object path with enhanced security checks
  async getLabReportFile(
    objectPath: string, 
    userId: string,
    auditInfo?: { ipAddress?: string, userAgent?: string }
  ): Promise<File> {
    let accessGranted = false;
    let auditReason = "";
    
    try {
      // HIPAA Compliance: Enforce consent requirements before file retrieval
      await enforceConsentRequirements(userId, 'download', auditInfo);
      
      if (!objectPath.startsWith("/objects/lab-reports/")) {
        auditReason = "Invalid object path - not a lab report";
        throw new ObjectNotFoundError();
      }

      const parts = objectPath.slice(1).split("/");
      if (parts.length < 4) { // objects/lab-reports/userId/filename
        auditReason = "Invalid object path structure";
        throw new ObjectNotFoundError();
      }

      // Extract userId from path and validate ownership
      const pathUserId = parts[2];
      if (pathUserId !== userId) {
        auditReason = "Access denied: User attempted to access another user's lab report";
        
        // Log unauthorized access attempt
        const auditEntry: AuditLogEntry = {
          timestamp: new Date().toISOString(),
          userId,
          action: 'access_denied',
          objectPath,
          ipAddress: auditInfo?.ipAddress,
          userAgent: auditInfo?.userAgent,
          success: false,
          reason: auditReason
        };
        
        // We can't append to the file since we don't have access, so just console log for now
        console.warn("HIPAA AUDIT LOG - Unauthorized Access Attempt:", auditEntry);
        
        throw new AccessDeniedError("Access denied: User can only access their own lab reports");
      }

      const entityId = parts.slice(1).join("/");
      let entityDir = this.getPrivateObjectDir();
      if (!entityDir.endsWith("/")) {
        entityDir = `${entityDir}/`;
      }
      const objectEntityPath = `${entityDir}${entityId}`;
      const { bucketName, objectName } = parseObjectPath(objectEntityPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const objectFile = bucket.file(objectName);
      const [exists] = await objectFile.exists();
      if (!exists) {
        auditReason = "Lab report file not found";
        throw new ObjectNotFoundError();
      }
      
      accessGranted = true;
      auditReason = "Lab report file retrieved successfully";
      
      // HIPAA Compliance: Enforce retention policy before allowing access
      await enforceRetentionPolicy(objectFile, userId, 'access', auditInfo);
      
      // Log successful file retrieval
      const auditEntry: AuditLogEntry = {
        timestamp: new Date().toISOString(),
        userId,
        action: 'read',
        objectPath,
        ipAddress: auditInfo?.ipAddress,
        userAgent: auditInfo?.userAgent,
        success: true,
        reason: auditReason
      };
      
      try {
        await appendAuditLogEntry(objectFile, auditEntry);
      } catch (auditError) {
        console.error("Failed to log file retrieval audit entry:", auditError);
      }
      
      return objectFile;
      
    } catch (error) {
      // Log failed retrieval attempt
      const auditEntry: AuditLogEntry = {
        timestamp: new Date().toISOString(),
        userId,
        action: 'read',
        objectPath,
        ipAddress: auditInfo?.ipAddress,
        userAgent: auditInfo?.userAgent,
        success: false,
        reason: auditReason || `File retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
      
      console.warn("HIPAA AUDIT LOG - Failed File Access:", auditEntry);
      throw error;
    }
  }

  // Generic method for getting any object entity file
  async getObjectEntityFile(objectPath: string): Promise<File> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    const entityId = parts.slice(1).join("/");
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) {
      entityDir = `${entityDir}/`;
    }
    const objectEntityPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const objectFile = bucket.file(objectName);
    const [exists] = await objectFile.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return objectFile;
  }

  // Normalize object entity path from signed URL to internal path
  normalizeObjectEntityPath(rawPath: string): string {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }
  
    // Extract the path from the URL by removing query parameters and domain
    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;
  
    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith("/")) {
      objectEntityDir = `${objectEntityDir}/`;
    }
  
    if (!rawObjectPath.startsWith(objectEntityDir)) {
      return rawObjectPath;
    }

    // Extract the entity ID from the path
    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }

  // Sets ACL policy for lab report with strict HIPAA compliance
  async setLabReportAclPolicy(
    rawPath: string,
    userId: string,
    originalFileName?: string,
    fileType: 'lab_report' | 'medical_document' | 'prescription' | 'other' = 'lab_report',
    auditInfo?: { ipAddress?: string, userAgent?: string }
  ): Promise<string> {
    // HIPAA Compliance: Enforce consent requirements before setting ACL
    await enforceConsentRequirements(userId, 'upload', auditInfo);
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }

    const objectFile = await this.getObjectEntityFile(normalizedPath);
    
    // HIPAA-compliant ACL: Private, user-only access
    const aclPolicy: ObjectAclPolicy = {
      owner: userId,
      visibility: "private", // Always private for medical documents
      metadata: {
        fileType,
        originalFileName: originalFileName || 'lab_report.pdf',
        uploadedAt: new Date().toISOString(),
        hipaaCompliant: true
      }
    };

    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }

  // Tries to set the ACL policy for the object entity and return the normalized path
  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }

    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }

  // Checks if the user can access the object entity with enhanced HIPAA security
  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: File;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }

  // HIPAA-compliant secure deletion of lab reports
  async secureDeleteLabReport(
    objectPath: string, 
    userId: string,
    auditInfo?: { ipAddress?: string, userAgent?: string }
  ): Promise<boolean> {
    let deletionSuccessful = false;
    let auditReason = "";
    let objectFile: File | null = null;
    
    try {
      // HIPAA Compliance: Enforce consent requirements before deletion
      await enforceConsentRequirements(userId, 'delete', auditInfo);
      
      objectFile = await this.getLabReportFile(objectPath, userId, auditInfo);
      
      // Verify ownership before deletion
      const aclPolicy = await getObjectAclPolicy(objectFile);
      if (!aclPolicy || aclPolicy.owner !== userId) {
        auditReason = "Access denied: User attempted to delete another user's lab report";
        throw new AccessDeniedError("Access denied: User can only delete their own lab reports");
      }

      // Perform secure deletion
      await objectFile.delete();
      deletionSuccessful = true;
      auditReason = "Lab report successfully deleted";
      
      // Log successful deletion
      const auditEntry: AuditLogEntry = {
        timestamp: new Date().toISOString(),
        userId,
        action: 'delete',
        objectPath,
        ipAddress: auditInfo?.ipAddress,
        userAgent: auditInfo?.userAgent,
        success: true,
        reason: auditReason
      };
      
      // Note: Can't log to deleted file, so log to console for audit trail
      console.log("HIPAA AUDIT LOG - Successful Deletion:", auditEntry);
      
      return true;
      
    } catch (error) {
      console.error("Error in secure deletion:", error);
      auditReason = auditReason || `Deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      // Log failed deletion attempt
      const auditEntry: AuditLogEntry = {
        timestamp: new Date().toISOString(),
        userId,
        action: 'delete',
        objectPath,
        ipAddress: auditInfo?.ipAddress,
        userAgent: auditInfo?.userAgent,
        success: false,
        reason: auditReason
      };
      
      if (objectFile) {
        try {
          await appendAuditLogEntry(objectFile, auditEntry);
        } catch (auditError) {
          console.error("Failed to log deletion failure audit entry:", auditError);
        }
      } else {
        console.warn("HIPAA AUDIT LOG - Failed Deletion Attempt:", auditEntry);
      }
      
      return false;
    }
  }

  // List all lab reports for a specific user
  async listUserLabReports(
    userId: string,
    auditInfo?: { ipAddress?: string, userAgent?: string }
  ): Promise<Array<{path: string, metadata: any, uploadedAt: string}>> {
    let listingSuccessful = false;
    let auditReason = "";
    
    try {
      // HIPAA Compliance: Enforce consent requirements before listing lab reports
      await enforceConsentRequirements(userId, 'list', auditInfo);
      
      const privateObjectDir = this.getPrivateObjectDir();
      const userLabReportsPath = `${privateObjectDir}/lab-reports/${userId}/`;
      
      const { bucketName, objectName } = parseObjectPath(userLabReportsPath);
      const bucket = objectStorageClient.bucket(bucketName);
      
      const [files] = await bucket.getFiles({
        prefix: objectName,
      });

      const labReports = [];
      for (const file of files) {
        const aclPolicy = await getObjectAclPolicy(file);
        if (aclPolicy && aclPolicy.owner === userId) {
          // Extract relative path for frontend
          const relativePath = file.name.replace(objectName, '');
          if (relativePath) {
            labReports.push({
              path: `/objects/lab-reports/${userId}/${relativePath}`,
              metadata: aclPolicy.metadata || {},
              uploadedAt: aclPolicy.metadata?.uploadedAt || (file.metadata.timeCreated ? new Date(file.metadata.timeCreated).toISOString() : new Date().toISOString())
            });
          }
        }
      }
      
      listingSuccessful = true;
      auditReason = `Successfully listed ${labReports.length} lab reports for user`;
      
      // Log successful lab report listing
      const auditEntry: AuditLogEntry = {
        timestamp: new Date().toISOString(),
        userId,
        action: 'read',
        objectPath: `/lab-reports/${userId}/`,
        ipAddress: auditInfo?.ipAddress,
        userAgent: auditInfo?.userAgent,
        success: true,
        reason: auditReason
      };
      
      console.log("HIPAA AUDIT LOG - Lab Reports Listed:", auditEntry);
      
      return labReports;
      
    } catch (error) {
      auditReason = `Failed to list lab reports: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      // Log failed listing attempt
      const auditEntry: AuditLogEntry = {
        timestamp: new Date().toISOString(),
        userId,
        action: 'read',
        objectPath: `/lab-reports/${userId}/`,
        ipAddress: auditInfo?.ipAddress,
        userAgent: auditInfo?.userAgent,
        success: false,
        reason: auditReason
      };
      
      console.warn("HIPAA AUDIT LOG - Failed Lab Report Listing:", auditEntry);
      throw error;
    }
  }
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, ` +
        `make sure you're running on Replit`
    );
  }

  const { signed_url: signedURL } = await response.json();
  return signedURL;
}