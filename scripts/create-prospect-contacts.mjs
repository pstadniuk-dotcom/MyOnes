/**
 * Create the prospect_contacts table for journalist/editor discovery
 */
import pg from 'pg';
import { config } from 'dotenv';

config({ path: 'server/.env' });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  // Check if table already exists
  const check = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = 'prospect_contacts'
    )
  `);
  
  if (check.rows[0].exists) {
    console.log('✅ prospect_contacts table already exists');
  } else {
    await pool.query(`
      CREATE TABLE prospect_contacts (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        prospect_id VARCHAR NOT NULL REFERENCES outreach_prospects(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        role TEXT,
        email TEXT,
        linkedin_url TEXT,
        twitter_handle TEXT,
        beat TEXT,
        recent_articles JSON,
        confidence_score INTEGER,
        is_primary BOOLEAN NOT NULL DEFAULT false,
        notes TEXT,
        discovered_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    console.log('✅ prospect_contacts table created successfully');
  }

  // Create index for fast lookups by prospect
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_prospect_contacts_prospect_id 
    ON prospect_contacts(prospect_id)
  `);
  console.log('✅ Index created');

  // Verify
  const cols = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'prospect_contacts' 
    ORDER BY ordinal_position
  `);
  console.log('\nTable columns:');
  cols.rows.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));
} catch (err) {
  console.error('❌ Error:', err.message);
} finally {
  await pool.end();
}
