import pg from 'pg';

const pool = new pg.Pool({ 
  connectionString: 'postgresql://postgres.aytzwtehxtvoejgcixdn:Weshinebright22!@aws-1-us-east-1.pooler.supabase.com:6543/postgres'
});

async function check() {
  const userRes = await pool.query(`SELECT id FROM users WHERE email = 'pstadniuk@gmail.com'`);
  if (userRes.rows.length === 0) {
    console.log('User not found');
    await pool.end();
    return;
  }
  const userId = userRes.rows[0].id;
  
  // Get health profile
  const profileRes = await pool.query(`SELECT * FROM health_profiles WHERE user_id = $1`, [userId]);
  console.log('\n=== HEALTH PROFILE ===');
  if (profileRes.rows.length > 0) {
    const p = profileRes.rows[0];
    console.log('Age:', p.age);
    console.log('Sex:', p.sex);
    console.log('Weight:', p.weight_lbs, 'lbs');
    console.log('Height:', p.height_cm, 'cm');
    console.log('Conditions:', p.conditions);
    console.log('Medications:', p.medications);
    console.log('Allergies:', p.allergies);
    console.log('Stress Level:', p.stress_level);
    console.log('Sleep:', p.sleep_hours_per_night, 'hrs');
    console.log('Exercise:', p.exercise_days_per_week, 'days/week');
  } else {
    console.log('No health profile found!');
  }
  
  // Check recent messages for any mentioned goals
  const msgRes = await pool.query(`
    SELECT m.content FROM messages m
    JOIN chat_sessions cs ON m.session_id = cs.id
    WHERE cs.user_id = $1 AND m.role = 'user'
    ORDER BY m.created_at DESC LIMIT 10
  `, [userId]);
  console.log('\n=== RECENT USER MESSAGES (for context) ===');
  msgRes.rows.forEach((r, i) => {
    const preview = r.content.substring(0, 150);
    console.log(`${i+1}. ${preview}...`);
  });
  
  await pool.end();
}

check().catch(e => console.error(e));
