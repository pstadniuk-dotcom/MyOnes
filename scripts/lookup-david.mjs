import pg from "pg"; import fs from "fs";
const t = fs.readFileSync("server/.env","utf8");
for (const line of t.split("\n")) { const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim(); }
const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const u = await c.query("SELECT id, email, name, created_at FROM users WHERE lower(email)=lower($1)", ["david@sica.ws"]);
console.log("USER:", JSON.stringify(u.rows, null, 2));
if (u.rows[0]) {
  const uid = u.rows[0].id;
  const hp = await c.query("SELECT id, user_id, current_supplements, updated_at FROM health_profiles WHERE user_id=$1", [uid]);
  console.log("HEALTH PROFILES:", JSON.stringify(hp.rows, null, 2));
}
await c.end();
