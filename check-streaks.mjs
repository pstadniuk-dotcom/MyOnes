import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ 
  connectionString: 'postgresql://postgres.aytzwtehxtvoejgcixdn:Weshinebright22!@aws-1-us-east-1.pooler.supabase.com:6543/postgres'
});

try {
  // Get all users
  const usersRes = await pool.query("SELECT id, email FROM users LIMIT 5");
  console.log('All Users:', usersRes.rows);
  
  // Get user ID 
  const userId = '1f7f26d5-bcc7-46f0-a671-c7a793432be1';
  
  // Get all streaks for this user
  const streaks = await pool.query('SELECT * FROM user_streaks WHERE user_id = $1', [userId]);
  console.log('\nUser Streaks:', JSON.stringify(streaks.rows, null, 2));
  
  // Get recent daily completions
  const completions = await pool.query('SELECT log_date, supplement_score, daily_score FROM daily_completions WHERE user_id = $1 ORDER BY log_date DESC LIMIT 10', [userId]);
  console.log('\nRecent Daily Completions:', JSON.stringify(completions.rows, null, 2));
  
  // Get supplement logs
  const logs = await pool.query('SELECT date, time_of_day, taken FROM supplement_logs WHERE user_id = $1 ORDER BY date DESC, time_of_day LIMIT 20', [userId]);
  console.log('\nRecent Supplement Logs:', JSON.stringify(logs.rows, null, 2));
  
} catch (e) {
  console.error('Error:', e.message);
} finally {
  await pool.end();
}
