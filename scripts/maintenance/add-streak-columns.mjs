import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

// Production Supabase database (same as Railway)
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL
});

const alterStatements = [
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_current_days integer DEFAULT 0`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_discount_earned integer DEFAULT 0`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_order_date timestamp`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS reorder_window_start timestamp`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS reorder_deadline timestamp`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_status text DEFAULT 'active'`,
];

try {
  for (const sql of alterStatements) {
    console.log('Running:', sql.substring(0, 60) + '...');
    await pool.query(sql);
    console.log('  ✓ Success');
  }
  console.log('\n✅ All streak columns added successfully!');
  
  // Verify
  const result = await pool.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name LIKE 'streak%'
  `);
  console.log('\nVerification - streak columns:', result.rows.map(r => r.column_name));
} catch (e) {
  console.error('Error:', e.message);
} finally {
  await pool.end();
}
