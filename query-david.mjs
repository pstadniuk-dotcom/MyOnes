import 'dotenv/config';
import pg from 'pg';
const { Client } = pg;

const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();

const email = 'david@sica.ws';
const userRes = await c.query('SELECT id, email, name, created_at FROM users WHERE email = $1', [email]);
if (!userRes.rows.length) { console.log('User not found'); await c.end(); process.exit(0); }
const user = userRes.rows[0];
console.log('User:', user);

const formulas = await c.query(
  `SELECT id, version, target_capsules, total_mg, created_at,
          jsonb_array_length(COALESCE(bases::jsonb, '[]'::jsonb)) as bases_count,
          jsonb_array_length(COALESCE(additions::jsonb, '[]'::jsonb)) as additions_count
   FROM formulas WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
  [user.id]
);
console.log(`\nFormulas (${formulas.rows.length}):`);
console.table(formulas.rows);

if (formulas.rows.length > 0) {
  const latest = formulas.rows[0];
  const detail = await c.query('SELECT bases, additions FROM formulas WHERE id = $1', [latest.id]);
  console.log(`\n--- Latest formula v${latest.version} (${latest.id}) ---`);
  console.log('Bases:', JSON.stringify(detail.rows[0].bases, null, 2));
  console.log('Additions:', JSON.stringify(detail.rows[0].additions, null, 2));
}

const sessions = await c.query(
  `SELECT id, title, created_at,
          (SELECT COUNT(*) FROM messages WHERE session_id = cs.id) as msg_count
   FROM chat_sessions cs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`,
  [user.id]
);
console.log(`\nChat sessions (${sessions.rows.length}):`);
console.table(sessions.rows);

if (sessions.rows.length > 0) {
  const sess = sessions.rows[0];
  const msgs = await c.query(
    `SELECT id, role, model, created_at,
            length(content) as content_len,
            substring(content, 1, 400) as preview,
            (formula IS NOT NULL) as has_formula
     FROM messages WHERE session_id = $1 ORDER BY created_at ASC`,
    [sess.id]
  );
  console.log(`\n--- Latest session: "${sess.title}" (${msgs.rows.length} msgs) ---`);
  for (const m of msgs.rows) {
    console.log(`\n[${m.created_at.toISOString()}] ${m.role.toUpperCase()}${m.model ? ` (${m.model})` : ''}${m.has_formula ? ' [+FORMULA]' : ''}`);
    console.log(m.preview + (m.content_len > 400 ? '...' : ''));
  }

  const formulaMsgs = await c.query(
    `SELECT id, created_at, formula FROM messages WHERE session_id = $1 AND formula IS NOT NULL ORDER BY created_at ASC`,
    [sess.id]
  );
  console.log(`\n--- ${formulaMsgs.rows.length} formula(s) attached to messages in this session ---`);
  for (const fm of formulaMsgs.rows) {
    const f = fm.formula;
    const baseCount = f.bases?.length ?? 0;
    const addCount = f.additions?.length ?? 0;
    console.log(`\n[${fm.created_at.toISOString()}] msg ${fm.id} -> ${baseCount} bases + ${addCount} additions = ${f.totalMg}mg`);
    console.log('  bases:', f.bases?.map(b => `${b.name} ${b.dose}`).join(', '));
    console.log('  additions:', f.additions?.map(a => `${a.name} ${a.dose}`).join(', '));
  }
}

await c.end();
