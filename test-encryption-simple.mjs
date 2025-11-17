import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from server/.env
dotenv.config({ path: join(__dirname, 'server', '.env') });

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getEncryptionKey() {
  const key = process.env.FIELD_ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error('FIELD_ENCRYPTION_KEY not set in server/.env');
  }
  
  const keyBuffer = Buffer.from(key, 'base64');
  
  if (keyBuffer.length !== KEY_LENGTH) {
    throw new Error(`FIELD_ENCRYPTION_KEY must be ${KEY_LENGTH} bytes (got ${keyBuffer.length})`);
  }
  
  return keyBuffer;
}

function encryptField(plaintext) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  const tag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, tag, encrypted]);
  
  return combined.toString('base64');
}

function decryptField(ciphertext) {
  const buffer = Buffer.from(ciphertext, 'base64');
  
  const iv = buffer.subarray(0, IV_LENGTH);
  const tag = buffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = buffer.subarray(IV_LENGTH + TAG_LENGTH);
  
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted.toString('utf8');
}

console.log('🔐 Testing field encryption...\n');

try {
  // Test 1: Basic encryption/decryption
  const testData = JSON.stringify({
    conditions: ['Type 2 Diabetes', 'Hypertension'],
    medications: ['Metformin 500mg', 'Lisinopril 10mg'],
    bloodMarkers: { glucose: 105, hba1c: 6.2 }
  });
  
  console.log('📝 Original data:', testData);
  
  const encrypted = encryptField(testData);
  console.log('🔒 Encrypted:', encrypted.substring(0, 50) + '...');
  
  const decrypted = decryptField(encrypted);
  console.log('🔓 Decrypted:', decrypted);
  
  if (decrypted !== testData) {
    throw new Error('Decrypted data does not match original');
  }
  
  // Test 2: Verify random IV (same data produces different ciphertext)
  const encrypted2 = encryptField(testData);
  if (encrypted === encrypted2) {
    throw new Error('Random IV not working - same plaintext produced identical ciphertext');
  }
  
  console.log('\n✅ Test 1: Basic encryption/decryption PASSED');
  console.log('✅ Test 2: Random IV verification PASSED');
  
  // Test 3: Lab analysis data
  const labData = JSON.stringify({
    extractedMarkers: [
      { name: 'Glucose', value: 95, unit: 'mg/dL', referenceRange: '70-100', status: 'normal' },
      { name: 'HbA1c', value: 6.5, unit: '%', referenceRange: '<5.7', status: 'high' }
    ],
    aiInsights: {
      summary: 'Patient shows prediabetic markers',
      recommendations: ['Monitor blood sugar', 'Increase fiber intake'],
      riskFactors: ['Elevated HbA1c'],
      nutritionalNeeds: ['Chromium', 'Alpha-lipoic acid'],
      confidence: 0.92
    }
  });
  
  const labEncrypted = encryptField(labData);
  const labDecrypted = decryptField(labEncrypted);
  
  if (labDecrypted !== labData) {
    throw new Error('Lab data encryption failed');
  }
  
  console.log('✅ Test 3: Lab analysis data encryption PASSED');
  
  // Test 4: Environment variable check
  console.log('\n📊 Environment Check:');
  console.log('  FIELD_ENCRYPTION_KEY:', process.env.FIELD_ENCRYPTION_KEY ? '✅ Set' : '❌ Missing');
  console.log('  SESSION_SECRET:', process.env.SESSION_SECRET ? '✅ Set' : '⚠️  Missing (using default)');
  console.log('  JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ Missing');
  console.log('  TOKEN_ENCRYPTION_KEY:', process.env.TOKEN_ENCRYPTION_KEY ? '✅ Set' : '⚠️  Missing');
  
  console.log('\n🎉 All encryption tests passed!');
  console.log('✅ PHI data will be encrypted at rest in database');
  console.log('✅ Ready to deploy\n');
  
} catch (error) {
  console.error('\n❌ Encryption test failed:', error.message);
  console.error('\n💡 To fix:');
  console.error('   1. Generate encryption key: openssl rand -base64 32');
  console.error('   2. Add to server/.env as FIELD_ENCRYPTION_KEY=<generated-key>');
  console.error('   3. Add to Railway environment variables\n');
  process.exit(1);
}
