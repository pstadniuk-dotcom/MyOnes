import pg from "pg"; import fs from "fs";
const t = fs.readFileSync("server/.env","utf8");
for (const line of t.split("\n")) { const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim(); }
const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const uid = "2a3f5785-92a3-4665-b31a-2cca8681130c";
// Check audit_logs and admin_audit_logs for any record of David
for (const tbl of ["audit_logs","admin_audit_logs"]) {
  try {
    const r = await c.query(`SELECT * FROM ${tbl} WHERE user_id=$1 OR (metadata::text ILIKE $2) ORDER BY 1 DESC LIMIT 20`, [uid, "%2a3f5785%"]);
    console.log(`\n=== ${tbl} (${r.rows.length}) ===`);
    for (const row of r.rows) console.log(JSON.stringify(row));
  } catch (e) {
    // try without user_id col
    try {
      const r2 = await c.query(`SELECT * FROM ${tbl} WHERE admin_id=$1 OR target_id=$1 OR details::text ILIKE $2 ORDER BY 1 DESC LIMIT 20`, [uid, "%2a3f5785%"]);
      console.log(`\n=== ${tbl} v2 (${r2.rows.length}) ===`);
      for (const row of r2.rows) console.log(JSON.stringify(row));
    } catch (e2) { console.log(tbl, "err:", e2.message); }
  }
}
// Also check for any history tables
const all = await c.query("SELECT table_name FROM information_schema.tables WHERE table_schema=''public'' AND (table_name ILIKE ''%history%'' OR table_name ILIKE ''%revision%'' OR table_name ILIKE ''%snapshot%'')");
console.log("\nHistory-ish tables:", all.rows.map(r=>r.table_name));
await c.end();
