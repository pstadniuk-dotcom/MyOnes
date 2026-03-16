import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://postgres.frksbddeepdzlskvniqu:Weshinebright22!@aws-0-us-west-2.pooler.supabase.com:6543/postgres',
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
