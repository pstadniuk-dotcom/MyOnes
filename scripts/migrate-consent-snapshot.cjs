/**
 * Adds consent_snapshot JSONB column to orders table.
 * Run: node scripts/migrate-consent-snapshot.cjs
 */
const { Client } = require('pg');

async function migrate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();
  console.log('Connected to database');

  // Check if column already exists
  const checkResult = await client.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'consent_snapshot'
  `);

  if (checkResult.rows.length > 0) {
    console.log('Column consent_snapshot already exists on orders table. Skipping.');
  } else {
    await client.query(`
      ALTER TABLE orders 
      ADD COLUMN consent_snapshot JSONB DEFAULT NULL
    `);
    console.log('Added consent_snapshot JSONB column to orders table.');
  }

  await client.end();
  console.log('Migration complete.');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
