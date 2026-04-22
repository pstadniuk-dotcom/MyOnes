import pg from "pg"; import fs from "fs";
const envText = fs.readFileSync("server/.env", "utf8");
for (const line of envText.split("\n")) { const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const SUPPORT = "08f35835-06e3-4f7c-9431-37e12555db7f";
const PETE = "fc2fcad9-4d3c-4ca2-90e7-a836fc4505fb";
for (const [label, uid] of [["support", SUPPORT], ["pete", PETE]]) {
  const o = await c.query(`SELECT * FROM orders WHERE user_id=$1 ORDER BY 1 DESC LIMIT 10`, [uid]);
  console.log(`\n=== ${label} orders (${o.rows.length}) ===`);
  for (const r of o.rows) console.log(JSON.stringify(r));
  const f = await c.query(`SELECT id, user_id, version, updated_at FROM formulas WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 5`, [uid]);
  console.log(`--- ${label} formulas (${f.rows.length}) ---`);
  for (const r of f.rows) console.log(JSON.stringify(r));
}
await c.end();
