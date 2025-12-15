import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ 
  connectionString: 'postgresql://postgres.aytzwtehxtvoejgcixdn:Weshinebright22!@aws-1-us-east-1.pooler.supabase.com:6543/postgres'
});

async function deleteOrphan() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      DELETE FROM optimize_daily_logs 
      WHERE user_id = '1f7f26d5-bcc7-46f0-a671-c7a793432be1' 
        AND log_date::text = '2025-12-15 12:00:00'
      RETURNING id
    `);
    console.log('Deleted', result.rowCount, 'orphan log(s)');
    
    // Show current state  
    const logsRes = await client.query(`
      SELECT log_date::text, supplement_morning, supplement_afternoon, supplement_evening
      FROM optimize_daily_logs
      WHERE user_id = '1f7f26d5-bcc7-46f0-a671-c7a793432be1'
      ORDER BY log_date DESC
      LIMIT 3
    `);
    console.log('\nCurrent logs:');
    for (const log of logsRes.rows) {
      console.log(`  ${log.log_date}: m=${log.supplement_morning} a=${log.supplement_afternoon} e=${log.supplement_evening}`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

deleteOrphan().catch(console.error);
