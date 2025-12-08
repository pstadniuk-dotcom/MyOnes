#!/usr/bin/env node
/**
 * Test script for field encryption
 * Verifies that encryption/decryption works correctly before deploying
 */

import { testEncryption } from './server/fieldEncryption.js';

console.log('🔐 Testing field encryption...\n');

try {
  const result = testEncryption();
  
  if (result) {
    console.log('\n✅ All encryption tests passed!');
    console.log('✅ FIELD_ENCRYPTION_KEY is properly configured');
    console.log('✅ Ready to deploy with encrypted health data\n');
    process.exit(0);
  } else {
    console.log('\n❌ Encryption tests failed');
    console.log('❌ Check that FIELD_ENCRYPTION_KEY is set in .env');
    console.log('❌ Generate one with: openssl rand -base64 32\n');
    process.exit(1);
  }
} catch (error) {
  console.error('\n❌ Encryption test error:', error.message);
  console.error('❌ Make sure FIELD_ENCRYPTION_KEY is set in server/.env');
  console.error('❌ Generate one with: openssl rand -base64 32\n');
  process.exit(1);
}
