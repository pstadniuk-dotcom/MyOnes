// Investigate david@sica.ws CURRENT session — check rejectedIngredients persistence
import { config } from 'dotenv';
import pg from 'pg';
config({ path: 'server/.env' });

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  const u = await client.query(`SELECT id, email FROM users WHERE email='david@sica.ws'`);
  if (!u.rows.length) { console.log('user not found'); process.exit(0); }
  const userId = u.rows[0].id;
  console.log('user:', userId, u.rows[0].email);

  // All sessions, latest first
  const sessions = await client.query(`
    SELECT id, title, status, mode, editing_formula_id, rejected_ingredients, formulation_mode, created_at
    FROM chat_sessions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 5
  `, [userId]).catch(async e => {
    // fall back if mode/editing_formula_id columns don't exist yet
    return await client.query(`
      SELECT id, title, status, rejected_ingredients, formulation_mode, created_at
      FROM chat_sessions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 5
    `, [userId]);
  });

  console.log('\n=== RECENT SESSIONS ===');
  for (const s of sessions.rows) {
    console.log('\n---');
    console.log('session:', s.id, '| created:', s.created_at);
    console.log('  rejected_ingredients:', JSON.stringify(s.rejected_ingredients));
    console.log('  formulation_mode:', s.formulation_mode);
  }

  // Latest session messages
  const latest = sessions.rows[0];
  if (!latest) process.exit(0);

  const msgs = await client.query(`
    SELECT id, role, content, created_at FROM messages
    WHERE session_id=$1 ORDER BY created_at ASC
  `, [latest.id]);

  console.log(`\n\n=== MESSAGES IN LATEST SESSION (${msgs.rows.length}) ===`);
  for (const m of msgs.rows) {
    const c = m.content || '';
    const preview = c.length > 400 ? c.substring(0, 400) + '...[truncated]' : c;
    console.log(`\n[${m.created_at.toISOString()}] ${m.role}:`);
    console.log(preview);
  }

  // Latest formulas
  const fs = await client.query(`
    SELECT id, version, total_mg, target_capsules, bases, additions, chat_session_id, created_at
    FROM formulas WHERE user_id=$1 ORDER BY created_at DESC LIMIT 5
  `, [userId]);
  console.log(`\n\n=== LATEST 5 FORMULAS ===`);
  for (const f of fs.rows) {
    console.log(`\nv${f.version} (${f.id}) caps=${f.target_capsules} total=${f.total_mg}mg session=${f.chat_session_id} created=${f.created_at.toISOString()}`);
    const all = [...(f.bases||[]), ...(f.additions||[])];
    for (const ing of all) {
      console.log(`   - ${ing.ingredient || ing.name}: ${ing.amount}${ing.unit}`);
    }
  }
} finally {
  await client.end();
}
