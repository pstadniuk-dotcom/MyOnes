import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ 
  connectionString: 'postgresql://postgres.aytzwtehxtvoejgcixdn:Weshinebright22!@aws-1-us-east-1.pooler.supabase.com:6543/postgres', 
  ssl: { rejectUnauthorized: false } 
});

async function testDateQuery() {
  const userId = '1f7f26d5-bcc7-46f0-a671-c7a793432be1';
  const userTimezone = 'America/Los_Angeles';
  
  // Simulate getUserLocalMidnight
  const formatter = new Intl.DateTimeFormat('en-CA', { 
    timeZone: userTimezone, 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  });
  const userDateString = formatter.format(new Date());
  const [year, month, day] = userDateString.split('-').map(Number);
  const logDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  
  console.log('=== Date Query Test ===');
  console.log('User timezone:', userTimezone);
  console.log('User local date:', userDateString);
  console.log('LogDate for query:', logDate.toISOString());
  
  // Simulate getDailyLog date range calculation
  const yearUTC = logDate.getUTCFullYear();
  const monthUTC = logDate.getUTCMonth();
  const dayUTC = logDate.getUTCDate();
  
  const startOfDay = new Date(Date.UTC(yearUTC, monthUTC, dayUTC, 0, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(yearUTC, monthUTC, dayUTC, 23, 59, 59, 999));
  
  console.log('Query range:', startOfDay.toISOString(), 'to', endOfDay.toISOString());
  
  // Query using the same logic as getDailyLog
  const result = await pool.query(`
    SELECT id, log_date, supplement_morning, supplement_afternoon, supplement_evening 
    FROM optimize_daily_logs 
    WHERE user_id = $1 AND log_date >= $2 AND log_date <= $3 
    LIMIT 1
  `, [userId, startOfDay, endOfDay]);
  
  console.log('\n=== getDailyLog Result ===');
  if (result.rows[0]) {
    console.log('Found log!');
    console.log('  Log date in DB:', result.rows[0].log_date);
    console.log('  Supplements:', result.rows[0].supplement_morning, result.rows[0].supplement_afternoon, result.rows[0].supplement_evening);
  } else {
    console.log('NO LOG FOUND - this is the bug!');
  }
  
  // Show all log dates to compare
  const allLogs = await pool.query(`
    SELECT log_date FROM optimize_daily_logs 
    WHERE user_id = $1 
    ORDER BY log_date DESC 
    LIMIT 5
  `, [userId]);
  
  console.log('\n=== All Recent Log Dates ===');
  allLogs.rows.forEach(r => {
    const logDateStr = r.log_date.toISOString();
    const inRange = r.log_date >= startOfDay && r.log_date <= endOfDay;
    console.log(`  ${logDateStr} ${inRange ? '✅ IN RANGE' : '❌ OUT OF RANGE'}`);
  });
  
  await pool.end();
}

testDateQuery().catch(console.error);
