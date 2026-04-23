import pg from "pg";
import fs from "fs";
const t = fs.readFileSync("server/.env","utf8");
for (const line of t.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const uid = "2a3f5785-92a3-4665-b31a-2cca8681130c";

const sess = await c.query("SELECT column_name FROM information_schema.columns WHERE table_name='chat_sessions' ORDER BY ordinal_position");
console.log("chat_sessions cols:", sess.rows.map(r=>r.column_name).join(","));

const sessions = await c.query("SELECT id, created_at FROM chat_sessions WHERE user_id=$1 ORDER BY created_at", [uid]);
console.log("sessions:", sessions.rows.length);

if (sessions.rows.length > 0) {
  const ids = sessions.rows.map(r => r.id);
  const all = await c.query("SELECT session_id, role, created_at, length(content) as len, content FROM messages WHERE session_id = ANY($1::text[]) ORDER BY created_at", [ids]);
  console.log(`\nALL MESSAGES (${all.rows.length}):`);
  for (const r of all.rows) {
    console.log(`\n[${r.created_at} ${r.role} len=${r.len}]`);
    console.log(r.content.substring(0, 2000));
    if (r.content.length > 2000) console.log("... [truncated]");
  }
}
await c.end();
