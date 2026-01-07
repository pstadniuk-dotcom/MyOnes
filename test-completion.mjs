import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ 
  connectionString: 'postgresql://postgres.aytzwtehxtvoejgcixdn:Weshinebright22!@aws-1-us-east-1.pooler.supabase.com:6543/postgres', 
  ssl: { rejectUnauthorized: false } 
});

async function testDailyCompletion() {
  const userId = '1f7f26d5-bcc7-46f0-a671-c7a793432be1';
  
  console.log('=== Testing Daily Completion Insert ===');
  
  // Insert a test daily_completion record for today
  const today = '2026-01-06';
  
  // Check if one already exists
  const existing = await pool.query(`
    SELECT * FROM daily_completions WHERE user_id = $1 AND log_date = $2
  `, [userId, today]);
  
  console.log('Existing completion for today:', existing.rows[0] ? 'YES' : 'NO');
  
  if (!existing.rows[0]) {
    // Create one
    const inserted = await pool.query(`
      INSERT INTO daily_completions (user_id, log_date, supplement_score, daily_score)
      VALUES ($1, $2, '1.00', '0.35')
      RETURNING *
    `, [userId, today]);
    console.log('Inserted:', inserted.rows[0]);
  } else {
    console.log('Existing record:', existing.rows[0]);
  }
  
  // Now check what the supplements streak looks like
  const streak = await pool.query(`
    SELECT * FROM user_streaks WHERE user_id = $1 AND streak_type = 'supplements'
  `, [userId]);
  
  console.log('\nSupplements streak:', streak.rows[0]);
  
  // Manually calculate what the streak should be
  // Score threshold for supplements is 0.33 (at least 1 dose)
  // Today's supplement score is 1.00 (100%)
  // Since 1.00 >= 0.33, the streak should increment
  
  console.log('\n=== Expected Behavior ===');
  console.log('Today supplement score: 1.00');
  console.log('Threshold: 0.33');
  console.log('Should increment streak: YES');
  console.log('Current streak in DB:', streak.rows[0]?.current_streak);
  console.log('Last completed date:', streak.rows[0]?.last_completed_date);
  
  await pool.end();
}

testDailyCompletion().catch(console.error);
