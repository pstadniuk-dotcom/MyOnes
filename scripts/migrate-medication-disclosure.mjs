import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../server/.env') });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running medication disclosure migration...');

    // 1. Add medication_disclosure to the consent_type enum
    await client.query(`
      DO $$ BEGIN
        ALTER TYPE consent_type ADD VALUE IF NOT EXISTS 'medication_disclosure';
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✓ consent_type enum: medication_disclosure added');

    // 2. Add medication_disclosed_at column to health_profiles
    await client.query(`
      ALTER TABLE health_profiles
        ADD COLUMN IF NOT EXISTS medication_disclosed_at TIMESTAMP;
    `);
    console.log('✓ health_profiles.medication_disclosed_at column added');

    console.log('\nMigration complete.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
