import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ 
  connectionString: 'postgresql://postgres.aytzwtehxtvoejgcixdn:Weshinebright22!@aws-1-us-east-1.pooler.supabase.com:6543/postgres'
});

async function fixLogs() {
  const client = await pool.connect();
  try {
    console.log('=== FIX SUPPLEMENT LOGS ===\n');
    
    // Get user ID
    const userRes = await client.query(`
      SELECT id, email, timezone FROM users WHERE email LIKE 'pstadniuk%'
    `);
    
    const user = userRes.rows[0];
    console.log(`User: ${user.email}`);
    console.log(`Timezone: ${user.timezone}`);
    console.log(`ID: ${user.id}\n`);
    
    // Show current logs
    console.log('BEFORE:');
    const beforeLogs = await client.query(`
      SELECT log_date::text, supplement_morning, supplement_afternoon, supplement_evening
      FROM optimize_daily_logs
      WHERE user_id = $1
      ORDER BY log_date DESC
      LIMIT 3
    `, [user.id]);
    
    for (const log of beforeLogs.rows) {
      console.log(`  ${log.log_date}: m=${log.supplement_morning} a=${log.supplement_afternoon} e=${log.supplement_evening}`);
    }
    
    // Copy Dec 15 supplements to Dec 14 (since that's where they should be)
    console.log('\nCopying Dec 15 supplement values to Dec 14...');
    
    await client.query(`
      UPDATE optimize_daily_logs
      SET supplement_morning = true, supplement_afternoon = true, supplement_evening = true
      WHERE user_id = $1 AND log_date::text = '2025-12-14 12:00:00'
    `, [user.id]);
    
    // Delete the orphan Dec 15 log
    console.log('Deleting orphan Dec 15 log...');
    await client.query(`
      DELETE FROM optimize_daily_logs
      WHERE user_id = $1 AND log_date::text = '2025-12-15 12:00:00'
    `, [user.id]);
    
    // Show after state
    console.log('\nAFTER:');
    const afterLogs = await client.query(`
      SELECT log_date::text, supplement_morning, supplement_afternoon, supplement_evening
      FROM optimize_daily_logs
      WHERE user_id = $1
      ORDER BY log_date DESC
      LIMIT 3
    `, [user.id]);
    
    for (const log of afterLogs.rows) {
      console.log(`  ${log.log_date}: m=${log.supplement_morning} a=${log.supplement_afternoon} e=${log.supplement_evening}`);
    }
    
    console.log('\n✅ Done! Please refresh the page to see the fix.');
    
  } finally {
    client.release();
    await pool.end();
  }
}

fixLogs().catch(console.error);
