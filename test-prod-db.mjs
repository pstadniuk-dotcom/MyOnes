#!/usr/bin/env node
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://postgres.aytzwtehxtvoejgcixdn:Weshinebright22!@aws-1-us-east-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

console.log('🔍 Testing production Supabase connection (Transaction pooler)...\n');

try {
  const client = await pool.connect();
  console.log('✅ Connected to production database');
  
  const versionResult = await client.query('SELECT version()');
  console.log('📊 PostgreSQL version:', versionResult.rows[0].version.split(' ')[1]);
  
  const tablesResult = await client.query(`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
  `);
  
  console.log(`\n📋 Found ${tablesResult.rows.length} tables:`);
  tablesResult.rows.forEach(row => console.log(`  - ${row.tablename}`));
  
  client.release();
  await pool.end();
  
  console.log('\n✅ Production database is ready!\n');
  
} catch (error) {
  console.error('❌ Connection failed:', error.message);
  process.exit(1);
}
