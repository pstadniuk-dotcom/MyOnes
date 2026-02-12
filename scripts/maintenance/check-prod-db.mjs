import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ 
  connectionString: 'postgresql://postgres.aytzwtehxtvoejgcixdn:Weshinebright22!@aws-1-us-east-1.pooler.supabase.com:6543/postgres'
});

try {
  // Check today's log
  const logs = await pool.query(`
    SELECT id, log_date, supplement_morning, supplement_afternoon, supplement_evening, created_at
    FROM optimize_daily_logs 
    WHERE user_id = '1f7f26d5-bcc7-46f0-a671-c7a793432be1'
    ORDER BY created_at DESC
    LIMIT 5
  `);
  console.log('Recent daily logs:');
  logs.rows.forEach(row => {
    console.log({
      id: row.id.substring(0, 8),
      logDate: row.log_date,
      morning: row.supplement_morning,
      afternoon: row.supplement_afternoon,
      evening: row.supplement_evening,
    });
  });
  
  // Check streaks
  const streaks = await pool.query(`
    SELECT streak_type, current_streak, longest_streak, last_logged_date
    FROM user_streaks 
    WHERE user_id = '1f7f26d5-bcc7-46f0-a671-c7a793432be1'
  `);
  console.log('\nUser streaks:');
  streaks.rows.forEach(row => console.log(row));
} catch (e) {
  console.error('Error:', e.message);
} finally {
  await pool.end();
}
