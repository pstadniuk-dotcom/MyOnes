import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ 
  connectionString: 'postgresql://postgres.aytzwtehxtvoejgcixdn:Weshinebright22!@aws-1-us-east-1.pooler.supabase.com:6543/postgres'
});

try {
  // Check user's timezone
  const user = await pool.query(`
    SELECT id, email, timezone, created_at
    FROM users 
    WHERE id = '1f7f26d5-bcc7-46f0-a671-c7a793432be1'
  `);
  console.log('User:', user.rows[0]);
  
  // Calculate what date the server would use
  const userTimezone = user.rows[0]?.timezone || 'America/New_York';
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: userTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const userDateString = formatter.format(new Date());
  console.log('\nUser timezone:', userTimezone);
  console.log('User local date:', userDateString);
  console.log('Server UTC time:', new Date().toISOString());
  
  // Show expected date range for today
  const [year, month, day] = userDateString.split('-').map(Number);
  const noonUTC = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  console.log('\nExpected noon UTC date:', noonUTC.toISOString());
  
  // Now check logs for that date
  const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  console.log('\nQuery range:');
  console.log('  Start:', startOfDay.toISOString());
  console.log('  End:', endOfDay.toISOString());
  
  const logs = await pool.query(`
    SELECT id, log_date, supplement_morning, supplement_afternoon, supplement_evening
    FROM optimize_daily_logs 
    WHERE user_id = '1f7f26d5-bcc7-46f0-a671-c7a793432be1'
    AND log_date >= $1 AND log_date <= $2
  `, [startOfDay.toISOString(), endOfDay.toISOString()]);
  console.log('\nLogs found for today:', logs.rows);
  
} catch (e) {
  console.error('Error:', e.message);
} finally {
  await pool.end();
}
