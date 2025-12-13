// Script to add junction_user_id column to production database
import pg from 'pg';

const { Pool } = pg;

// Use the production database URL from Railway environment
// You need to set PROD_DATABASE_URL environment variable
const prodDbUrl = process.env.PROD_DATABASE_URL || process.env.DATABASE_URL;

if (!prodDbUrl) {
  console.error('❌ No database URL found. Set PROD_DATABASE_URL or DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({ connectionString: prodDbUrl });

async function addJunctionUserIdColumn() {
  try {
    // Check if column already exists
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'junction_user_id'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('✅ junction_user_id column already exists');
      return;
    }
    
    // Add the column
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN junction_user_id TEXT
    `);
    
    console.log('✅ Successfully added junction_user_id column to users table');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

addJunctionUserIdColumn();
