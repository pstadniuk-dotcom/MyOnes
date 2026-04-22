import { readFileSync } from 'fs';
import { Client } from 'pg';

const env = readFileSync('server/.env', 'utf8');
const url = env.match(/^DATABASE_URL=(.+)$/m)[1].trim().replace(/^["']|["']$/g, '');

const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await c.connect();

const userId = 'c1427be4-7181-4f45-89c5-f69a86b6b193';

const sessions = await c.query(
  `SELECT id, title, created_at FROM chat_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5`,
  [userId]
);
console.log('Sessions:', sessions.rows.length);
for (const s of sessions.rows) {
  console.log(`\n=== Session ${s.id} | ${s.title || '(untitled)'} | ${s.created_at} ===`);
  const msgs = await c.query(
    `SELECT role, content, created_at FROM messages WHERE session_id = $1 ORDER BY created_at ASC LIMIT 60`,
    [s.id]
  );
  for (const m of msgs.rows) {
    const c2 = (m.content || '').slice(0, 600).replace(/\s+/g, ' ');
    console.log(`\n[${m.role}] ${c2}${m.content.length > 600 ? '…' : ''}`);
  }
}

await c.end();
