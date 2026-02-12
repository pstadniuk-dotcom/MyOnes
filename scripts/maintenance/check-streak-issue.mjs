import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
const { Pool } = pg;

// Load from server/.env
const envContent = fs.readFileSync('server/.env', 'utf8');
const dbUrl = envContent.match(/^DATABASE_URL=(.+)$/m)?.[1];
console.log('Using database connection from server/.env');

const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function checkStreakData() {
  try {
    // List ALL users with their supplement data
    const usersResult = await pool.query(`
      SELECT 
        u.id, 
        u.email, 
        u.timezone,
        l.log_date,
        l.supplement_morning,
        l.supplement_afternoon,
        l.supplement_evening,
        l.supplements_taken
      FROM users u
      LEFT JOIN optimize_daily_logs l ON l.user_id = u.id
      ORDER BY u.email, l.log_date DESC
    `);
    
    console.log('\n=== All Users with Supplement Logs ===');
    let currentUser = null;
    for (const row of usersResult.rows) {
      if (currentUser !== row.email) {
        currentUser = row.email;
        console.log(`\n📧 ${row.email} (tz: ${row.timezone})`);
      }
      if (row.log_date) {
        const dateStr = row.log_date.toISOString().split('T')[0];
        console.log(`   ${dateStr}: morning=${row.supplement_morning}, afternoon=${row.supplement_afternoon}, evening=${row.supplement_evening}`);
      }
    }

    // Check for any log dates that are in the future or suspiciously recent
    console.log('\n\n=== Logs from last 7 days ===');
    const recentLogs = await pool.query(`
      SELECT 
        u.email,
        u.timezone,
        l.log_date,
        l.supplement_morning,
        l.supplement_afternoon,
        l.supplement_evening,
        l.created_at
      FROM optimize_daily_logs l
      JOIN users u ON u.id = l.user_id
      WHERE l.log_date >= NOW() - INTERVAL '7 days'
      ORDER BY l.log_date DESC
    `);
    
    if (recentLogs.rows.length === 0) {
      console.log('No logs in last 7 days');
    } else {
      recentLogs.rows.forEach(row => {
        console.log(`${row.email}: ${row.log_date.toISOString()} (created: ${row.created_at?.toISOString()})`);
        console.log(`  morning=${row.supplement_morning}, afternoon=${row.supplement_afternoon}, evening=${row.supplement_evening}`);
      });
    }

    // Show server current time vs user local time calculations
    console.log('\n\n=== Date/Time Debug ===');
    console.log('Server UTC time:', new Date().toISOString());
    
    // Simulate what the server would calculate for each user
    for (const user of [...new Set(usersResult.rows.map(r => JSON.stringify({email: r.email, timezone: r.timezone})))].map(s => JSON.parse(s))) {
      const tz = user.timezone || 'America/New_York';
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const userDateStr = formatter.format(new Date());
      console.log(`${user.email} (${tz}): Local date = ${userDateStr}`);
    }

    // Now let's specifically look at your user
    const userId = 'ccc783a5-1cf6-49e5-99d3-760d71e2434d';  // pstadniuk@gmail.com
    console.log('\n\n=== Analyzing pstadniuk@gmail.com ===');
    console.log('User ID:', userId);

    // Get recent daily logs
    const logs = await pool.query(`
      SELECT 
        log_date,
        supplement_morning,
        supplement_afternoon,
        supplement_evening,
        supplements_taken
      FROM optimize_daily_logs 
      WHERE user_id = $1 
      ORDER BY log_date DESC 
      LIMIT 10
    `, [userId]);
    console.log('\n=== Recent Daily Logs ===');
    logs.rows.forEach(row => {
      console.log(`  ${row.log_date.toISOString().split('T')[0]}: morning=${row.supplement_morning}, afternoon=${row.supplement_afternoon}, evening=${row.supplement_evening}`);
    });

    // Get all streaks
    const streaks = await pool.query(`
      SELECT 
        streak_type, 
        current_streak, 
        longest_streak, 
        last_logged_date,
        last_completed_date
      FROM user_streaks 
      WHERE user_id = $1
    `, [userId]);
    console.log('\n=== User Streaks ===');
    streaks.rows.forEach(row => {
      console.log(`  ${row.streak_type}: current=${row.current_streak}, longest=${row.longest_streak}, lastLogged=${row.last_logged_date?.toISOString()?.split('T')[0]}, lastCompleted=${row.last_completed_date}`);
    });

    // Get recent daily completions
    const completions = await pool.query(`
      SELECT 
        log_date, 
        supplement_score, 
        daily_score,
        supplement_details
      FROM daily_completions 
      WHERE user_id = $1 
      ORDER BY log_date DESC 
      LIMIT 10
    `, [userId]);
    console.log('\n=== Daily Completions ===');
    completions.rows.forEach(row => {
      console.log(`  ${row.log_date}: supplement_score=${row.supplement_score}, daily_score=${row.daily_score}, details=${JSON.stringify(row.supplement_details)}`);
    });

  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}

// Test the exact date query logic that getDailyLog uses
async function testDateQuery() {
  // Simulate what getDailyLog does
  const testUserId = 'df753c06-58d4-44c3-a5b2-8ff96a59a0ff';  // test@test.com
  const userTimezone = 'America/New_York';
  
  // Simulate getUserLocalMidnight
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: userTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const userDateString = formatter.format(new Date());
  const [year, month, day] = userDateString.split('-').map(Number);
  const today = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  
  console.log('\n\n=== Date Query Simulation for test@test.com ===');
  console.log('User timezone:', userTimezone);
  console.log('User date string:', userDateString);
  console.log('Calculated "today":', today.toISOString());
  
  // Now simulate getDailyLog date range
  const yearUTC = today.getUTCFullYear();
  const monthUTC = today.getUTCMonth();
  const dayUTC = today.getUTCDate();
  
  const startOfDay = new Date(Date.UTC(yearUTC, monthUTC, dayUTC, 0, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(yearUTC, monthUTC, dayUTC, 23, 59, 59, 999));
  
  console.log('Query startOfDay:', startOfDay.toISOString());
  console.log('Query endOfDay:', endOfDay.toISOString());
  
  // Run the actual query
  const result = await pool.query(`
    SELECT id, log_date, supplement_morning, supplement_afternoon, supplement_evening
    FROM optimize_daily_logs
    WHERE user_id = $1
      AND log_date >= $2
      AND log_date <= $3
  `, [testUserId, startOfDay, endOfDay]);
  
  console.log('Query result:', result.rows);
  
  // Also show ALL logs for this user
  const allLogs = await pool.query(`
    SELECT log_date, supplement_morning, supplement_afternoon, supplement_evening
    FROM optimize_daily_logs
    WHERE user_id = $1
    ORDER BY log_date DESC
  `, [testUserId]);
  
  console.log('\nAll logs for test@test.com:');
  allLogs.rows.forEach(row => {
    console.log(`  ${row.log_date.toISOString()}: morning=${row.supplement_morning}`);
  });
}

checkStreakData().then(() => testDateQuery());
