import pg from 'pg';
import { config } from 'dotenv';
import fs from 'fs';

const envPath = './server/.env';
if (fs.existsSync(envPath)) {
  config({ path: envPath, override: true });
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

const sql = `
-- Create enums if they don't exist
DO $$ BEGIN
  CREATE TYPE live_chat_status AS ENUM ('active', 'waiting', 'closed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE live_chat_sender AS ENUM ('user', 'admin', 'bot');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Create live_chat_sessions table
CREATE TABLE IF NOT EXISTS live_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  guest_email TEXT,
  guest_name TEXT,
  status live_chat_status NOT NULL DEFAULT 'active',
  subject TEXT,
  assigned_to UUID REFERENCES users(id),
  last_message_at TIMESTAMP DEFAULT NOW(),
  admin_last_read_at TIMESTAMP,
  user_last_read_at TIMESTAMP,
  closed_at TIMESTAMP,
  closed_by TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create live_chat_messages table
CREATE TABLE IF NOT EXISTS live_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES live_chat_sessions(id),
  sender live_chat_sender NOT NULL DEFAULT 'user',
  sender_id UUID,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_live_chat_sessions_user_id ON live_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_live_chat_sessions_status ON live_chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_live_chat_messages_session_id ON live_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_live_chat_messages_created_at ON live_chat_messages(created_at);
`;

try {
  await client.query(sql);
  console.log('✅ Live chat tables created successfully');
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
