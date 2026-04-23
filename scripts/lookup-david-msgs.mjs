import pg from "pg"; import fs from "fs";
const t = fs.readFileSync("server/.env","utf8");
for (const line of t.split("\n")) { const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim(); }
const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const uid = "2a3f5785-92a3-4665-b31a-2cca8681130c";
// Check chat messages for any supplement mentions
const m = await c.query(`SELECT id, role, created_at, length(content) as len, substr(content, 1, 600) as preview FROM messages WHERE user_id=$1 ORDER BY created_at`, [uid]);
console.log(`MESSAGES (${m.rows.length}):`);
for (const r of m.rows) console.log(JSON.stringify(r));
await c.end();
