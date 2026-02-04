import crypto from 'crypto';

/**
 * Field-level encryption service for protecting PHI (Protected Health Information)
 * 
 * Uses AES-256-GCM for authenticated encryption of sensitive health data.
 * This provides encryption at rest even if the database is compromised.
 * 
 * Algorithm: AES-256-GCM (Galois/Counter Mode)
 * - 256-bit key for strong encryption
 * - Random 16-byte IV (initialization vector) per encryption
 * - Authentication tag to prevent tampering
 * 
 * Storage format: Base64(IV + AuthTag + Ciphertext)
 * - First 16 bytes: IV
 * - Next 16 bytes: Authentication tag
 * - Remaining bytes: Encrypted data
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

/**
 * Get the encryption key from environment variable
 * Throws an error if not configured (fail-safe approach)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.FIELD_ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error(
      'FIELD_ENCRYPTION_KEY environment variable is not set. ' +
      'Generate one with: openssl rand -base64 32'
    );
  }
  
  try {
    const keyBuffer = Buffer.from(key, 'base64');
    
    if (keyBuffer.length !== KEY_LENGTH) {
      throw new Error(
        `FIELD_ENCRYPTION_KEY must be ${KEY_LENGTH} bytes (got ${keyBuffer.length}). ` +
        'Generate a new one with: openssl rand -base64 32'
      );
    }
    
    return keyBuffer;
  } catch (error) {
    throw new Error(
      'FIELD_ENCRYPTION_KEY is not valid base64. ' +
      'Generate a new one with: openssl rand -base64 32'
    );
  }
}

/**
 * Encrypt a string field (typically JSON-stringified data)
 * 
 * @param plaintext - The data to encrypt (usually JSON.stringify of an object)
 * @returns Base64-encoded encrypted data (IV + tag + ciphertext)
 * 
 * @example
 * const encrypted = encryptField(JSON.stringify({ conditions: ['diabetes'], medications: ['metformin'] }));
 * // Store encrypted in database
 */
export function encryptField(plaintext: string): string {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty plaintext');
  }
  
  // Generate random IV for this encryption
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Get encryption key
  const key = getEncryptionKey();
  
  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  // Encrypt the data
  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  // Get the authentication tag
  const tag = cipher.getAuthTag();
  
  // Combine: IV + tag + ciphertext
  const combined = Buffer.concat([iv, tag, encrypted]);
  
  // Return as base64 for database storage
  return combined.toString('base64');
}

/**
 * Decrypt a previously encrypted field
 * 
 * @param ciphertext - Base64-encoded encrypted data from database
 * @returns Decrypted plaintext (parse with JSON.parse if it was JSON)
 * 
 * @example
 * const decrypted = decryptField(dbRecord.encryptedData);
 * const data = JSON.parse(decrypted);
 * console.log(data.conditions); // ['diabetes']
 */
export function decryptField(ciphertext: string): string {
  if (!ciphertext) {
    throw new Error('Cannot decrypt empty ciphertext');
  }
  
  try {
    // Decode from base64
    const buffer = Buffer.from(ciphertext, 'base64');
    
    // Extract components
    const iv = buffer.subarray(0, IV_LENGTH);
    const tag = buffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = buffer.subarray(IV_LENGTH + TAG_LENGTH);
    
    // Get encryption key
    const key = getEncryptionKey();
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    // Decrypt the data
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    // Authentication tag verification failed or other decryption error
    throw new Error(
      'Failed to decrypt field. Data may be corrupted or tampered with. ' +
      `Original error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Safely encrypt data that might be null or undefined
 * Returns null if input is null/undefined
 */
export function encryptFieldSafe(plaintext: string | null | undefined): string | null {
  if (plaintext === null || plaintext === undefined) {
    return null;
  }
  return encryptField(plaintext);
}

/**
 * Safely decrypt data that might be null or undefined
 * Returns null if input is null/undefined
 */
export function decryptFieldSafe(ciphertext: string | null | undefined): string | null {
  if (ciphertext === null || ciphertext === undefined) {
    return null;
  }
  return decryptField(ciphertext);
}

/**
 * Test that encryption/decryption works correctly
 * Useful for verifying the FIELD_ENCRYPTION_KEY is set up properly
 */
export function testEncryption(): boolean {
  try {
    const testData = 'Test PHI data: Patient has diabetes and takes metformin';
    const encrypted = encryptField(testData);
    const decrypted = decryptField(encrypted);
    
    if (decrypted !== testData) {
      console.error('Encryption test failed: decrypted data does not match original');
      return false;
    }
    
    // Verify that encrypting the same data twice produces different ciphertexts
    // (due to random IV)
    const encrypted2 = encryptField(testData);
    if (encrypted === encrypted2) {
      console.error('Encryption test failed: random IV not working');
      return false;
    }
    
    console.log('✅ Field encryption test passed');
    return true;
  } catch (error) {
    console.error('Encryption test failed:', error);
    return false;
  }
}
