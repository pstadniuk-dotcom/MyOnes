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

const m1 = await c.query("SELECT column_name FROM information_schema.columns WHERE table_name='messages' ORDER BY ordinal_position");
console.log("messages cols:", m1.rows.map(r=>r.column_name).join(","));
const m2 = await c.query("SELECT column_name FROM information_schema.columns WHERE table_name='conversations' ORDER BY ordinal_position");
console.log("conversations cols:", m2.rows.map(r=>r.column_name).join(","));

try {
  const conv = await c.query("SELECT id, created_at FROM conversations WHERE user_id=$1 ORDER BY created_at", [uid]);
  console.log("\nconversations:", conv.rows.length);
  for (const cv of conv.rows) {
    const msgs = await c.query("SELECT role, created_at, length(content) as len, substr(content, 1, 1500) as preview FROM messages WHERE conversation_id=$1 AND (content ILIKE '%supplement%' OR content ILIKE '%vitamin%' OR content ILIKE '%magnesium%' OR content ILIKE '%fish oil%' OR content ILIKE '%omega%' OR content ILIKE '%creatine%' OR content ILIKE '%taking%') ORDER BY created_at", [cv.id]);
    if (msgs.rows.length > 0) {
      console.log(`\n--- conv ${cv.id} (${msgs.rows.length} matching msgs) ---`);
      for (const r of msgs.rows) console.log(JSON.stringify(r));
    }
  }
} catch (e) { console.log("conv err:", e.message); }
await c.end();
