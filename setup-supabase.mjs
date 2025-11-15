#!/usr/bin/env node

/**
 * Interactive Supabase Setup Helper
 * Guides you through setting up Supabase connection
 */

import { createInterface } from 'readline';
import { writeFileSync, readFileSync } from 'fs';
import pkg from 'pg';
const { Client } = pkg;

const readline = createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise((resolve) => readline.question(prompt, resolve));

console.log('\n🚀 ONES AI - Supabase Setup Helper\n');
console.log('This will help you configure your Supabase database.\n');

async function main() {
  console.log('Step 1: Get your Supabase connection string');
  console.log('  1. Go to https://supabase.com/dashboard');
  console.log('  2. Select your project (or create a new one)');
  console.log('  3. Go to Settings → Database');
  console.log('  4. Scroll to "Connection string"');
  console.log('  5. Select "Connection pooling" (recommended)');
  console.log('  6. Copy the URI (should start with postgresql://...)\n');
  
  const connectionString = await question('📝 Paste your Supabase connection string: ');
  
  if (!connectionString || !connectionString.startsWith('postgresql://')) {
    console.log('\n❌ Invalid connection string. Should start with postgresql://');
    process.exit(1);
  }
  
  // Add sslmode if not present
  const dbUrl = connectionString.includes('sslmode=') 
    ? connectionString 
    : connectionString + (connectionString.includes('?') ? '&' : '?') + 'sslmode=require';
  
  console.log('\n✅ Connection string validated\n');
  
  // Test connection
  console.log('🔌 Testing connection...');
  const client = new Client({ connectionString: dbUrl });
  
  try {
    await client.connect();
    console.log('✅ Connected successfully!\n');
    
    // Get PostgreSQL version
    const result = await client.query('SELECT version()');
    const version = result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1];
    console.log(`📊 PostgreSQL version: ${version}\n`);
    
    await client.end();
    
  } catch (error) {
    console.log(`\n❌ Connection failed: ${error.message}`);
    console.log('\nPlease check:');
    console.log('  1. The connection string is correct');
    console.log('  2. Your Supabase project is active');
    console.log('  3. You have network connectivity\n');
    process.exit(1);
  }
  
  // Update .env file
  const updateEnv = await question('📝 Update server/.env with this connection string? (yes/no): ');
  
  if (updateEnv.toLowerCase() === 'yes') {
    try {
      const envPath = './server/.env';
      let envContent = readFileSync(envPath, 'utf-8');
      
      // Replace DATABASE_URL line
      const lines = envContent.split('\n');
      let updated = false;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('DATABASE_URL=')) {
          lines[i] = `DATABASE_URL=${dbUrl}`;
          updated = true;
          break;
        }
      }
      
      if (!updated) {
        lines.push(`DATABASE_URL=${dbUrl}`);
      }
      
      writeFileSync(envPath, lines.join('\n'));
      console.log('\n✅ Updated server/.env\n');
      
    } catch (error) {
      console.log(`\n⚠️  Could not update .env file: ${error.message}`);
      console.log('\nPlease manually update server/.env:');
      console.log(`DATABASE_URL=${dbUrl}\n`);
    }
  }
  
  console.log('\n📋 Next steps:');
  console.log('  1. Push database schema:');
  console.log('     npm run db:push\n');
  console.log('  2. Verify tables were created:');
  console.log('     npm run test:db\n');
  console.log('  3. (Optional) Migrate data from Neon:');
  console.log('     ./migrate-to-supabase.sh\n');
  console.log('  4. Deploy to Railway (see QUICKSTART.md)\n');
  
  readline.close();
}

main().catch(console.error);
