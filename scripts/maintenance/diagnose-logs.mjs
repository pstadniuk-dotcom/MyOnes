import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ 
  connectionString: 'postgresql://postgres.aytzwtehxtvoejgcixdn:Weshinebright22!@aws-1-us-east-1.pooler.supabase.com:6543/postgres'
});

async function checkAI() {
  const client = await pool.connect();
  try {
    console.log('=== AI CONFIGURATION CHECK ===\n');
    
    // Check AI settings
    const aiResult = await client.query(`SELECT * FROM app_settings WHERE key = 'ai_settings'`);
    if (aiResult.rows.length > 0) {
      console.log('AI Settings:', JSON.stringify(aiResult.rows[0].value, null, 2));
    } else {
      console.log('AI Settings: Not configured (using env var defaults)');
    }
    
    // Check recent chat sessions
    console.log('\n=== RECENT CHAT SESSIONS ===\n');
    const chatResult = await client.query(`
      SELECT id, created_at::text, title 
      FROM chat_sessions 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    for (const row of chatResult.rows) {
      console.log(`  ${row.created_at} - ${row.title || 'Untitled'}`);
    }
    
    // Check recent messages
    console.log('\n=== RECENT MESSAGES ===\n');
    const msgResult = await client.query(`
      SELECT role, created_at::text, LEFT(content, 100) as preview
      FROM messages 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    for (const row of msgResult.rows) {
      console.log(`  [${row.role}] ${row.created_at}: ${row.preview}...`);
    }
    
  } finally {
    client.release();
    await pool.end();
  }
}

checkAI().catch(console.error);
