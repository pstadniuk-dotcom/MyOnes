import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Add lead_tier column
try {
  await pool.query(`ALTER TABLE outreach_prospects ADD COLUMN IF NOT EXISTS lead_tier varchar(10)`);
  console.log('✓ Added lead_tier column');
} catch (err) {
  console.log('Column may already exist:', err.message);
}

await pool.end();
console.log('Done');
