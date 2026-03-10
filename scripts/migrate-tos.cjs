const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const client = await pool.connect();
  try {
    // Add tos_acceptance to consent_type enum if not exists
    await client.query(
      "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'tos_acceptance' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'consent_type')) THEN ALTER TYPE consent_type ADD VALUE 'tos_acceptance'; END IF; END$$;"
    );
    console.log('Added tos_acceptance to consent_type enum');

    // Add tos_accepted_at column to users if not exists
    await client.query(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS tos_accepted_at TIMESTAMP;"
    );
    console.log('Added tos_accepted_at column to users table');

    console.log('Migration complete!');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}
migrate();
