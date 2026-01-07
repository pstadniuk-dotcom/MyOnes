import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
const { Pool } = pg;

// PRODUCTION DATABASE (from Railway environment variables)
const dbUrl = 'postgresql://postgres.aytzwtehxtvoejgcixdn:Weshinebright22!@aws-1-us-east-1.pooler.supabase.com:6543/postgres';
console.log('Using PRODUCTION database (us-east-1)');
const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

function toUserLocalDateString(date, tz) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

async function checkGmailUser() {
  try {
    const user = await pool.query(`SELECT id, email, timezone FROM users WHERE email = 'pstadniuk@gmail.com'`);
    console.log('\nUser:', user.rows[0]);
    
    if (!user.rows[0]) {
      console.log('User not found!');
      return;
    }
    
    const userId = user.rows[0].id;
    const userTimezone = user.rows[0].timezone || 'America/New_York';
    
    // Calculate user's "today" string
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: userTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const userTodayStr = formatter.format(new Date());
    
    console.log('\n=== Date Context ===');
    console.log('Server UTC time:', new Date().toISOString());
    console.log('User timezone:', userTimezone);
    console.log('User today string:', userTodayStr);
    
    // Get all logs
    const allLogs = await pool.query(`
      SELECT log_date, supplement_morning, supplement_afternoon, supplement_evening, created_at 
      FROM optimize_daily_logs 
      WHERE user_id = $1 
      ORDER BY log_date DESC 
      LIMIT 15
    `, [userId]);
    
    console.log('\n=== Last 7 Days Check ===');
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date();
      checkDate.setDate(checkDate.getDate() - i);
      const checkDateStr = toUserLocalDateString(checkDate, userTimezone);
      
      // Find log for this date
      const dayLog = allLogs.rows.find(r => {
        const logDateUTC = new Date(r.log_date);
        const logDateStr = toUserLocalDateString(logDateUTC, userTimezone);
        return logDateStr === checkDateStr;
      });
      
      if (dayLog) {
        const taken = [dayLog.supplement_morning, dayLog.supplement_afternoon, dayLog.supplement_evening].filter(Boolean).length;
        console.log(`  ${checkDateStr}: ${taken}/3 supplements ✅`);
      } else {
        console.log(`  ${checkDateStr}: NO LOG ❌`);
      }
    }
    
    // Get streaks
    const streaks = await pool.query(`
      SELECT streak_type, current_streak, longest_streak, last_logged_date, last_completed_date, updated_at
      FROM user_streaks 
      WHERE user_id = $1
    `, [userId]);
    
    console.log('\n=== User Streaks ===');
    streaks.rows.forEach(r => {
      console.log(`  ${r.streak_type}: current=${r.current_streak}, lastCompleted=${r.last_completed_date}, updatedAt=${r.updated_at}`);
    });
    
    // Get daily completions
    const completions = await pool.query(`
      SELECT log_date, supplement_score, daily_score 
      FROM daily_completions 
      WHERE user_id = $1 
      ORDER BY log_date DESC 
      LIMIT 10
    `, [userId]);
    
    console.log('\n=== Daily Completions (last 10) ===');
    if (completions.rows.length === 0) {
      console.log('  No completions found! This is the problem.');
    } else {
      completions.rows.forEach(r => {
        console.log(`  ${r.log_date}: supplement=${r.supplement_score}, daily=${r.daily_score}`);
      });
    }
    
    // Check what the smart streak would calculate
    console.log('\n=== Smart Streak Calculation (last 7 days) ===');
    console.log('Streak threshold: 50%');
    let streak = 0;
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date();
      checkDate.setDate(checkDate.getDate() - i);
      const checkDateStr = toUserLocalDateString(checkDate, userTimezone);
      
      const dayLog = allLogs.rows.find(r => {
        const logDateUTC = new Date(r.log_date);
        const logDateStr = toUserLocalDateString(logDateUTC, userTimezone);
        return logDateStr === checkDateStr;
      });
      
      if (!dayLog) {
        console.log(`  Day ${i} (${checkDateStr}): No log - streak broken!`);
        break;
      }
      
      const supplementsTaken = [dayLog.supplement_morning, dayLog.supplement_afternoon, dayLog.supplement_evening].filter(Boolean).length;
      const supplementsComplete = supplementsTaken >= 3;
      
      // Calculate percentage (simplified - just supplements for now)
      // In real code: workout, nutrition, supplements, water, lifestyle all contribute
      const percentage = supplementsComplete ? 100 : Math.round((supplementsTaken / 3) * 100);
      
      if (percentage >= 50) {
        streak++;
        console.log(`  Day ${i} (${checkDateStr}): ${percentage}% - streak continues (${streak})`);
      } else {
        console.log(`  Day ${i} (${checkDateStr}): ${percentage}% - below threshold, streak broken`);
        break;
      }
    }
    
    console.log(`\nCalculated streak: ${streak} days`);
    
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}

checkGmailUser();
