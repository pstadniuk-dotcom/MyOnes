import dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config();
dotenv.config({ path: 'server/.env' });

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Applying enum migration directly...');
    await client.query(`ALTER TYPE "public"."consent_type" ADD VALUE IF NOT EXISTS 'sms_accountability';`);
    console.log('Successfully added sms_accountability to consent_type enum.');
  } catch (error) {
    console.error('Failed to apply migration:', error);
  } finally {
    await client.end();
  }
}

run();
