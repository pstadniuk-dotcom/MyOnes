import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ 
  connectionString: 'postgresql://postgres.aytzwtehxtvoejgcixdn:Weshinebright22!@aws-1-us-east-1.pooler.supabase.com:6543/postgres'
});

try {
  // Fix: Update supplement streak to correct value based on consecutive days
  // Dec 25 and Dec 26 have all supplements taken = 2 day streak
  const updateResult = await pool.query(`
    UPDATE user_streaks 
    SET current_streak = 2, 
        longest_streak = GREATEST(longest_streak, 2),
        last_logged_date = '2025-12-26T20:00:00.000Z',
        last_completed_date = '2025-12-26'
    WHERE user_id = '1f7f26d5-bcc7-46f0-a671-c7a793432be1' 
      AND streak_type = 'supplements'
    RETURNING *
  `);
  console.log('Updated supplements streak:', updateResult.rows[0]);
  
  // Also ensure daily_completions are created for Dec 25 and Dec 26
  const dec25Exists = await pool.query(`
    SELECT * FROM daily_completions 
    WHERE user_id = '1f7f26d5-bcc7-46f0-a671-c7a793432be1' 
      AND log_date = '2025-12-25'
  `);
  
  if (dec25Exists.rows.length === 0) {
    await pool.query(`
      INSERT INTO daily_completions (id, user_id, log_date, supplement_score, daily_score, created_at, updated_at)
      VALUES (gen_random_uuid(), '1f7f26d5-bcc7-46f0-a671-c7a793432be1', '2025-12-25', '1.00', '0.35', NOW(), NOW())
    `);
    console.log('Created daily_completion for Dec 25');
  }
  
  const dec26Exists = await pool.query(`
    SELECT * FROM daily_completions 
    WHERE user_id = '1f7f26d5-bcc7-46f0-a671-c7a793432be1' 
      AND log_date = '2025-12-26'
  `);
  
  if (dec26Exists.rows.length === 0) {
    await pool.query(`
      INSERT INTO daily_completions (id, user_id, log_date, supplement_score, daily_score, created_at, updated_at)
      VALUES (gen_random_uuid(), '1f7f26d5-bcc7-46f0-a671-c7a793432be1', '2025-12-26', '1.00', '0.35', NOW(), NOW())
    `);
    console.log('Created daily_completion for Dec 26');
  }
  
  // Verify
  const streaks = await pool.query(`
    SELECT streak_type, current_streak, longest_streak, last_logged_date, last_completed_date
    FROM user_streaks 
    WHERE user_id = '1f7f26d5-bcc7-46f0-a671-c7a793432be1'
  `);
  console.log('\nUpdated user streaks:');
  streaks.rows.forEach(row => console.log(row));
  
  const completions = await pool.query(`
    SELECT log_date, supplement_score, daily_score
    FROM daily_completions 
    WHERE user_id = '1f7f26d5-bcc7-46f0-a671-c7a793432be1'
    ORDER BY log_date DESC
    LIMIT 5
  `);
  console.log('\nDaily completions:');
  completions.rows.forEach(row => console.log(row));
  
} catch (e) {
  console.error('Error:', e.message);
} finally {
  await pool.end();
}
