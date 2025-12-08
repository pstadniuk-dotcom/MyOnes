#!/usr/bin/env node

/**
 * Supabase Connection Diagnostics
 * This script tests the database connection and provides troubleshooting info
 */

import { config } from 'dotenv';
import pkg from 'pg';
const { Client } = pkg;

// Load environment variables
config({ path: './server/.env' });

const DATABASE_URL = process.env.DATABASE_URL;

console.log('\n🔍 Supabase Connection Diagnostics\n');
console.log('================================\n');

// Check if DATABASE_URL exists
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set in server/.env');
  process.exit(1);
}

// Parse the connection string
console.log('📋 Connection Details:');
try {
  const url = new URL(DATABASE_URL);
  console.log(`  Host: ${url.hostname}`);
  console.log(`  Port: ${url.port}`);
  console.log(`  Database: ${url.pathname.slice(1)}`);
  console.log(`  Username: ${url.username}`);
  console.log(`  Password: ${url.password ? '***' + url.password.slice(-4) : 'not set'}`);
  console.log(`  SSL Mode: ${url.searchParams.get('sslmode') || 'not specified'}`);
  console.log('');
} catch (error) {
  console.error('❌ Invalid DATABASE_URL format:', error.message);
  process.exit(1);
}

// Test DNS resolution
console.log('🌐 Testing DNS resolution...');
try {
  const url = new URL(DATABASE_URL);
  const dns = await import('dns').then(m => m.promises);
  const addresses = await dns.resolve4(url.hostname);
  console.log(`  ✅ DNS resolved: ${addresses.join(', ')}\n`);
} catch (error) {
  console.error(`  ❌ DNS resolution failed: ${error.message}`);
  console.error('\n⚠️  This suggests:');
  console.error('     1. The Supabase project might be paused or deleted');
  console.error('     2. The hostname in DATABASE_URL is incorrect');
  console.error('     3. Network connectivity issues\n');
  console.error('📝 Action Required:');
  console.error('     1. Go to https://supabase.com/dashboard');
  console.error('     2. Check if your project exists and is active');
  console.error('     3. Get the connection string from: Settings > Database > Connection string');
  console.error('     4. Update server/.env with the correct DATABASE_URL\n');
  process.exit(1);
}

// Test database connection
console.log('🔌 Testing database connection...');
const client = new Client({
  connectionString: DATABASE_URL,
});

try {
  await client.connect();
  console.log('  ✅ Connected to database\n');
  
  // Test query
  console.log('📊 Running test query...');
  const result = await client.query('SELECT version()');
  console.log(`  ✅ PostgreSQL version: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}\n`);
  
  // Check if tables exist
  console.log('📋 Checking existing tables...');
  const tables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);
  
  if (tables.rows.length === 0) {
    console.log('  ⚠️  No tables found - database is empty');
    console.log('  📝 Next step: Run "npm run db:push" to create tables\n');
  } else {
    console.log(`  ✅ Found ${tables.rows.length} tables:`);
    tables.rows.forEach(row => {
      console.log(`     - ${row.table_name}`);
    });
    console.log('');
  }
  
  console.log('✅ All checks passed! Database is ready.\n');
  
} catch (error) {
  console.error(`  ❌ Connection failed: ${error.message}\n`);
  
  if (error.code === 'ENOTFOUND') {
    console.error('⚠️  Hostname not found. Please check:');
    console.error('     1. Is the Supabase project active?');
    console.error('     2. Is the DATABASE_URL correct?\n');
  } else if (error.code === '28P01') {
    console.error('⚠️  Authentication failed. Please check:');
    console.error('     1. Database password in server/.env');
    console.error('     2. Get password from Supabase dashboard\n');
  } else {
    console.error('⚠️  Unexpected error:', error);
  }
  
  process.exit(1);
} finally {
  await client.end();
}
