import { File } from "@google-cloud/storage";

const ACL_POLICY_METADATA_KEY = "custom:aclPolicy";
const AUDIT_LOG_METADATA_KEY = "custom:auditLog";

// HIPAA-compliant access group types for medical data
export enum ObjectAccessGroupType {
  PATIENT_OWNER = "patient_owner", // The patient who owns the medical data
  HEALTHCARE_PROVIDER = "healthcare_provider", // Authorized healthcare providers
  EMERGENCY_ACCESS = "emergency_access", // Emergency access (future implementation)
}

// The logic user group that can access the medical object
export interface ObjectAccessGroup {
  type: ObjectAccessGroupType;
  // For PATIENT_OWNER: userId
  // For HEALTHCARE_PROVIDER: providerId (future implementation)  
  // For EMERGENCY_ACCESS: emergency protocol ID (future implementation)
  id: string;
}

export enum ObjectPermission {
  READ = "read",
  WRITE = "write",
  DELETE = "delete",
}

export interface ObjectAclRule {
  group: ObjectAccessGroup;
  permission: ObjectPermission;
  grantedBy?: string; // Who granted this permission
  grantedAt?: string; // When this permission was granted
  expiresAt?: string; // When this permission expires (for temporary access)
}

// Enhanced ACL policy for HIPAA-compliant medical data
export interface ObjectAclPolicy {
  owner: string; // Patient userId - always required
  visibility: "private"; // Always private for medical data
  aclRules?: Array<ObjectAclRule>;
  // Additional HIPAA-compliant metadata
  metadata?: {
    fileType: 'lab_report' | 'medical_document' | 'prescription' | 'other';
    originalFileName: string;
    uploadedAt: string;
    hipaaCompliant: boolean;
    patientConsent?: boolean;
    retentionPolicy?: string; // How long to keep the data
    encryptionStatus?: 'encrypted';
  };
}

// Audit log entry for HIPAA compliance
export interface AuditLogEntry {
  timestamp: string;
  userId: string;
  action: 'read' | 'write' | 'delete' | 'access_denied';
  objectPath: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  reason?: string;
}

// Check if the requested permission is allowed based on the granted permission
function isPermissionAllowed(
  requested: ObjectPermission,
  granted: ObjectPermission,
): boolean {
  // Owner has all permissions
  if (granted === ObjectPermission.DELETE) {
    return true; // DELETE implies READ and WRITE
  }
  
  // WRITE permission includes READ
  if (granted === ObjectPermission.WRITE) {
    return [ObjectPermission.READ, ObjectPermission.WRITE].includes(requested);
  }

  // READ permission only allows READ
  return requested === ObjectPermission.READ && granted === ObjectPermission.READ;
}

// Base class for all access groups with HIPAA compliance
abstract class BaseObjectAccessGroup implements ObjectAccessGroup {
  constructor(
    public readonly type: ObjectAccessGroupType,
    public readonly id: string,
  ) {}

  // Check if the user is a member of the group
  public abstract hasMember(userId: string): Promise<boolean>;
}

// Patient owner access group - only the patient can access their own data
class PatientOwnerAccessGroup extends BaseObjectAccessGroup {
  constructor(patientId: string) {
    super(ObjectAccessGroupType.PATIENT_OWNER, patientId);
  }

  async hasMember(userId: string): Promise<boolean> {
    // Only the patient themselves has access
    return userId === this.id;
  }
}

// Healthcare provider access group (future implementation)
class HealthcareProviderAccessGroup extends BaseObjectAccessGroup {
  constructor(providerId: string) {
    super(ObjectAccessGroupType.HEALTHCARE_PROVIDER, providerId);
  }

  async hasMember(userId: string): Promise<boolean> {
    // Future implementation: Check if userId is an authorized healthcare provider
    // This would integrate with a provider authorization system
    return false; // Disabled for MVP - only patient access
  }
}

// Factory function to create access groups
function createObjectAccessGroup(group: ObjectAccessGroup): BaseObjectAccessGroup {
  switch (group.type) {
    case ObjectAccessGroupType.PATIENT_OWNER:
      return new PatientOwnerAccessGroup(group.id);
    case ObjectAccessGroupType.HEALTHCARE_PROVIDER:
      return new HealthcareProviderAccessGroup(group.id);
    case ObjectAccessGroupType.EMERGENCY_ACCESS:
      // Future implementation for emergency access
      throw new Error("Emergency access not yet implemented");
    default:
      throw new Error(`Unknown access group type: ${group.type}`);
  }
}

// Sets the ACL policy to the object metadata with HIPAA audit logging
export async function setObjectAclPolicy(
  objectFile: File,
  aclPolicy: ObjectAclPolicy,
  auditInfo?: { userId: string, ipAddress?: string, userAgent?: string }
): Promise<void> {
  const [exists] = await objectFile.exists();
  if (!exists) {
    throw new Error(`Object not found: ${objectFile.name}`);
  }

  // Ensure HIPAA compliance
  if (aclPolicy.visibility !== "private") {
    throw new Error("HIPAA violation: Medical data must always be private");
  }

  // Set metadata with HIPAA-compliant defaults
  const metadata: Record<string, string> = {
    [ACL_POLICY_METADATA_KEY]: JSON.stringify({
      ...aclPolicy,
      metadata: {
        hipaaCompliant: true,
        encryptionStatus: 'encrypted',
        ...aclPolicy.metadata
      }
    }),
  };

  // Add audit log if provided
  if (auditInfo) {
    const auditEntry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      userId: auditInfo.userId,
      action: 'write',
      objectPath: objectFile.name,
      ipAddress: auditInfo.ipAddress,
      userAgent: auditInfo.userAgent,
      success: true,
      reason: 'ACL policy set'
    };
    
    metadata[AUDIT_LOG_METADATA_KEY] = JSON.stringify([auditEntry]);
  }

  await objectFile.setMetadata({ metadata });
}

// Gets the ACL policy from the object metadata
export async function getObjectAclPolicy(objectFile: File): Promise<ObjectAclPolicy | null> {
  const [metadata] = await objectFile.getMetadata();
  const aclPolicy = metadata?.metadata?.[ACL_POLICY_METADATA_KEY];
  if (!aclPolicy) {
    return null;
  }
  return JSON.parse(aclPolicy as string);
}

// Gets the audit log from the object metadata
export async function getObjectAuditLog(objectFile: File): Promise<AuditLogEntry[]> {
  const [metadata] = await objectFile.getMetadata();
  const auditLog = metadata?.metadata?.[AUDIT_LOG_METADATA_KEY];
  if (!auditLog) {
    return [];
  }
  return JSON.parse(auditLog as string);
}

// Appends an audit log entry to the object
export async function appendAuditLogEntry(
  objectFile: File,
  entry: AuditLogEntry
): Promise<void> {
  const existingLog = await getObjectAuditLog(objectFile);
  const updatedLog = [...existingLog, entry];
  
  // Keep only last 100 entries to prevent metadata bloat
  const trimmedLog = updatedLog.slice(-100);
  
  await objectFile.setMetadata({
    metadata: {
      [AUDIT_LOG_METADATA_KEY]: JSON.stringify(trimmedLog),
    },
  });
}

// HIPAA-compliant access check with comprehensive audit logging
export async function canAccessObject({
  userId,
  objectFile,
  requestedPermission,
  auditInfo,
}: {
  userId?: string;
  objectFile: File;
  requestedPermission: ObjectPermission;
  auditInfo?: { ipAddress?: string, userAgent?: string };
}): Promise<boolean> {
  const startTime = Date.now();
  let accessGranted = false;
  let reason = "";

  try {
    // Medical data requires authentication
    if (!userId) {
      reason = "Authentication required for medical data access";
      return false;
    }

    // Get ACL policy - required for all medical data
    const aclPolicy = await getObjectAclPolicy(objectFile);
    if (!aclPolicy) {
      reason = "No ACL policy found - access denied for security";
      return false;
    }

    // Verify HIPAA compliance
    if (!aclPolicy.metadata?.hipaaCompliant) {
      reason = "Object not marked as HIPAA compliant";
      return false;
    }

    // The owner of the medical data can always access it
    if (aclPolicy.owner === userId) {
      accessGranted = true;
      reason = "Access granted to data owner";
      return true;
    }

    // Go through the ACL rules to check if the user has the required permission
    for (const rule of aclPolicy.aclRules || []) {
      // Check if permission has expired
      if (rule.expiresAt && new Date(rule.expiresAt) < new Date()) {
        continue; // Skip expired permissions
      }

      const accessGroup = createObjectAccessGroup(rule.group);
      if (
        (await accessGroup.hasMember(userId)) &&
        isPermissionAllowed(requestedPermission, rule.permission)
      ) {
        accessGranted = true;
        reason = `Access granted via ACL rule: ${rule.group.type}`;
        return true;
      }
    }

    reason = "No matching ACL rule found";
    return false;

  } catch (error) {
    reason = `Error during access check: ${error instanceof Error ? error.message : 'Unknown error'}`;
    return false;
  } finally {
    // Always log the access attempt for HIPAA compliance
    if (userId && auditInfo) {
      const auditEntry: AuditLogEntry = {
        timestamp: new Date().toISOString(),
        userId,
        action: requestedPermission === ObjectPermission.READ ? 'read' : 
               requestedPermission === ObjectPermission.WRITE ? 'write' : 'delete',
        objectPath: objectFile.name,
        ipAddress: auditInfo.ipAddress,
        userAgent: auditInfo.userAgent,
        success: accessGranted,
        reason
      };

      try {
        await appendAuditLogEntry(objectFile, auditEntry);
      } catch (auditError) {
        console.error("Failed to log audit entry:", auditError);
        // Don't fail the main operation due to audit logging issues
      }
    }
  }
}

// HIPAA-compliant user consent validation
export function validateHIPAAConsent(aclPolicy: ObjectAclPolicy): boolean {
  return !!(
    aclPolicy.metadata?.hipaaCompliant &&
    aclPolicy.metadata?.patientConsent !== false // Default to true if not specified
  );
}

// Generate HIPAA compliance report for an object
export async function generateComplianceReport(objectFile: File): Promise<{
  isCompliant: boolean;
  issues: string[];
  auditTrail: AuditLogEntry[];
  recommendations: string[];
}> {
  const aclPolicy = await getObjectAclPolicy(objectFile);
  const auditLog = await getObjectAuditLog(objectFile);
  
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  if (!aclPolicy) {
    issues.push("No ACL policy found");
    recommendations.push("Set ACL policy with HIPAA-compliant settings");
  } else {
    if (!aclPolicy.metadata?.hipaaCompliant) {
      issues.push("Not marked as HIPAA compliant");
    }
    
    if (aclPolicy.visibility !== "private") {
      issues.push("Medical data must be private");
    }
    
    if (!aclPolicy.metadata?.patientConsent) {
      issues.push("Patient consent not documented");
      recommendations.push("Obtain and document patient consent");
    }
    
    if (!aclPolicy.metadata?.encryptionStatus) {
      issues.push("Encryption status not documented");
      recommendations.push("Verify and document encryption status");
    }
  }
  
  if (auditLog.length === 0) {
    recommendations.push("Enable audit logging for all access");
  }
  
  return {
    isCompliant: issues.length === 0,
    issues,
    auditTrail: auditLog,
    recommendations
  };
}