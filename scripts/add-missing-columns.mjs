import { config } from 'dotenv';
import pg from 'pg';

config({ path: './server/.env' });

const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    // Add missing columns to users table
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_by VARCHAR');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_by VARCHAR');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_reason TEXT');
    
    // Add missing columns to file_uploads table
    await pool.query('ALTER TABLE file_uploads ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP');
    await pool.query('ALTER TABLE file_uploads ADD COLUMN IF NOT EXISTS deleted_by VARCHAR');
    
    // Verify
    const result = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name IN ('deleted_at', 'deleted_by', 'suspended_at', 'suspended_by', 'suspended_reason')
      ORDER BY column_name
    `);
    console.log('Users table - added columns:', result.rows.map(r => r.column_name));
    
    const result2 = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'file_uploads' AND column_name IN ('deleted_at', 'deleted_by')
      ORDER BY column_name
    `);
    console.log('File_uploads table - added columns:', result2.rows.map(r => r.column_name));
    
    console.log('\nAll columns added successfully!');
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}

run();
