import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
const { Pool } = pg;

// PRODUCTION DATABASE (from Railway environment variables)
const dbUrl = 'postgresql://postgres.aytzwtehxtvoejgcixdn:Weshinebright22!@aws-1-us-east-1.pooler.supabase.com:6543/postgres';
console.log('Using PRODUCTION database (us-east-1)');
const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function checkYahooUser() {
  try {
    // First list ALL users
    const allUsers = await pool.query(`SELECT id, email, timezone, created_at FROM users ORDER BY created_at DESC`);
    console.log('=== All Users in Database ===');
    allUsers.rows.forEach(u => {
      console.log(`  ${u.email} (tz: ${u.timezone}, created: ${u.created_at?.toISOString()?.split('T')[0]})`);
    });
    console.log(`Total: ${allUsers.rows.length} users\n`);

    // Search for yahoo
    const yahooUsers = await pool.query(`SELECT id, email, timezone FROM users WHERE email ILIKE '%yahoo%' OR email ILIKE '%pdstad%'`);
    console.log('=== Users matching yahoo or pdstad ===');
    if (yahooUsers.rows.length === 0) {
      console.log('  None found!');
    } else {
      yahooUsers.rows.forEach(u => console.log(`  ${u.email}`));
    }
    
    const user = await pool.query(`SELECT id, email, timezone FROM users WHERE email = 'pstadniuk@gmail.com'`);
    console.log('\nExact match for pstadniuk@gmail.com:', user.rows[0] || 'NOT FOUND');
    
    if (!user.rows[0]) {
      console.log('User not found!');
      return;
    }
    
    const userId = user.rows[0].id;
    
    // Get all logs
    const logs = await pool.query(`
      SELECT log_date, supplement_morning, supplement_afternoon, supplement_evening, created_at 
      FROM optimize_daily_logs 
      WHERE user_id = $1 
      ORDER BY log_date DESC 
      LIMIT 15
    `, [userId]);
    
    console.log('\nRecent Logs:');
    if (logs.rows.length === 0) {
      console.log('  No logs found!');
    } else {
      logs.rows.forEach(r => {
        console.log(`  ${r.log_date.toISOString().split('T')[0]}: morning=${r.supplement_morning}, afternoon=${r.supplement_afternoon}, evening=${r.supplement_evening}`);
        console.log(`    created: ${r.created_at?.toISOString()}`);
      });
    }
    
    // Get streaks with ALL columns
    const streaks = await pool.query(`
      SELECT * FROM user_streaks 
      WHERE user_id = $1
    `, [userId]);
    
    console.log('\nStreaks (full details):');
    if (streaks.rows.length === 0) {
      console.log('  No streaks found!');
    } else {
      streaks.rows.forEach(r => {
        console.log(`  ${r.streak_type}:`);
        console.log(`    current=${r.current_streak}, longest=${r.longest_streak}`);
        console.log(`    lastLoggedDate=${r.last_logged_date}`);
        console.log(`    lastCompletedDate=${r.last_completed_date}`);
        console.log(`    updatedAt=${r.updated_at}`);
      });
    }
    
    // Also check daily_completions
    const completions = await pool.query(`
      SELECT log_date, supplement_score, daily_score 
      FROM daily_completions 
      WHERE user_id = $1 
      ORDER BY log_date DESC 
      LIMIT 10
    `, [userId]);
    
    console.log('\nDaily Completions (last 10):');
    if (completions.rows.length === 0) {
      console.log('  No completions found!');
    } else {
      completions.rows.forEach(r => {
        console.log(`  ${r.log_date}: supplement=${r.supplement_score}, daily=${r.daily_score}`);
      });
    }
    
    // Let's manually calculate what the smart streak would show for today
    const todayLog = allLogs.rows.find(r => {
      const logDateStr = r.log_date.toISOString().split('T')[0];
      return logDateStr === userDateString;
    });
    
    console.log('\n=== Manual Smart Streak Calculation ===');
    console.log('Today date string:', userDateString);
    console.log('Today log found:', !!todayLog);
    if (todayLog) {
      const supplementsTaken = [todayLog.supplement_morning, todayLog.supplement_afternoon, todayLog.supplement_evening].filter(Boolean).length;
      console.log('Supplements taken today:', supplementsTaken, '/ 3');
      console.log('Supplements completed:', supplementsTaken >= 3);
    }
    
    // Check last 7 days of logs with their dates
    console.log('\n=== Last 7 Days Log Check ===');
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date();
      checkDate.setDate(checkDate.getDate() - i);
      // Format in user's timezone
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: userTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const checkDateStr = formatter.format(checkDate);
      
      // Find log for this date
      const dayLog = allLogs.rows.find(r => {
        // log_date is stored at noon UTC of the user's local date
        const logDateUTC = new Date(r.log_date);
        const logDateStr = toUserLocalDateString(logDateUTC, userTimezone);
        return logDateStr === checkDateStr;
      });
      
      if (dayLog) {
        const taken = [dayLog.supplement_morning, dayLog.supplement_afternoon, dayLog.supplement_evening].filter(Boolean).length;
        console.log(`  ${checkDateStr}: ${taken}/3 supplements`);
      } else {
        console.log(`  ${checkDateStr}: NO LOG`);
      }
    }

function toUserLocalDateString(date, tz) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}
    
    // Simulate what the wellness endpoint would return for "today"
    const userTimezone = user.rows[0].timezone || 'America/New_York';
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: userTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const userDateString = formatter.format(new Date());
    const [year, month, day] = userDateString.split('-').map(Number);
    const today = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
    
    console.log('\n=== Date Query Debug ===');
    console.log('User timezone:', userTimezone);
    console.log('Today (user local):', userDateString);
    console.log('Today (UTC noon):', today.toISOString());
    
    // Query what getDailyLog would return
    const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    
    console.log('Query range:', startOfDay.toISOString(), 'to', endOfDay.toISOString());
    
    const todayLog = await pool.query(`
      SELECT * FROM optimize_daily_logs
      WHERE user_id = $1 AND log_date >= $2 AND log_date <= $3
    `, [userId, startOfDay, endOfDay]);
    
    console.log('\nToday\'s log (what wellness endpoint sees):');
    if (todayLog.rows.length === 0) {
      console.log('  No log for today - should show all unchecked!');
    } else {
      console.log('  Found:', todayLog.rows[0]);
    }
    
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}

checkYahooUser();
