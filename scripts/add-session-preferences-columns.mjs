// One-off: add chat_sessions.rejected_ingredients + formulation_mode columns.
// Safe / additive. Idempotent via IF NOT EXISTS.
import 'dotenv/config';
import { config } from 'dotenv';
import pg from 'pg';

config({ path: 'server/.env' });

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });

await client.connect();
try {
  await client.query(`
    ALTER TABLE chat_sessions
      ADD COLUMN IF NOT EXISTS rejected_ingredients json NOT NULL DEFAULT '[]'::json,
      ADD COLUMN IF NOT EXISTS formulation_mode varchar(32) NOT NULL DEFAULT 'comprehensive';
  `);
  console.log('✅ Added rejected_ingredients + formulation_mode columns to chat_sessions');
} finally {
  await client.end();
}
