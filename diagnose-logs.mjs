import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ 
  connectionString: 'postgresql://postgres.aytzwtehxtvoejgcixdn:Weshinebright22!@aws-1-us-east-1.pooler.supabase.com:6543/postgres'
});

async function diagnose() {
  const client = await pool.connect();
  try {
    // Get all users
    const userRes = await client.query(`SELECT id, email, timezone FROM users LIMIT 10`);
    console.log('=== ALL USERS ===');
    for (const u of userRes.rows) {
      console.log(`  ${u.email}: timezone=${u.timezone || 'NULL'} | id=${u.id}`);
    }
    
    // Get recent logs
    const logsRes = await client.query(`
      SELECT dl.id, dl.user_id, u.email, dl.log_date::text, dl.supplement_morning, dl.supplement_afternoon, dl.supplement_evening, dl.created_at::text
      FROM optimize_daily_logs dl
      JOIN users u ON u.id = dl.user_id
      ORDER BY dl.created_at DESC
      LIMIT 10
    `);
    console.log('\n=== RECENT DAILY LOGS ===');
    for (const row of logsRes.rows) {
      console.log(`  ${row.email}: log_date=${row.log_date} | m=${row.supplement_morning} a=${row.supplement_afternoon} e=${row.supplement_evening}`);
    }
    
  } finally {
    client.release();
    await pool.end();
  }
}

diagnose().catch(console.error);
