import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ 
  connectionString: 'postgresql://postgres.aytzwtehxtvoejgcixdn:Weshinebright22!@aws-1-us-east-1.pooler.supabase.com:6543/postgres'
});

try {
  // Get your user ID
  const userResult = await pool.query(`
    SELECT id, email, name FROM users WHERE email = 'pstadniuk@gmail.com' LIMIT 1
  `);
  
  if (userResult.rows.length === 0) {
    console.log('User not found!');
    process.exit(1);
  }
  
  const userId = userResult.rows[0].id;
  console.log('User:', userResult.rows[0]);
  
  // Check health profile
  console.log('\n=== HEALTH PROFILE ===');
  const profileRes = await pool.query(`SELECT * FROM health_profiles WHERE user_id = $1`, [userId]);
  
  if (profileRes.rows.length > 0) {
    const profile = profileRes.rows[0];
    console.log('Profile found:');
    console.log({
      id: profile.id,
      userId: profile.user_id,
      age: profile.age,
      sex: profile.sex,
      weightLbs: profile.weight_lbs,
      heightCm: profile.height_cm,
      conditions: profile.conditions ? `Encrypted (${profile.conditions.length} chars)` : null,
      medications: profile.medications ? `Encrypted (${profile.medications.length} chars)` : null,
      allergies: profile.allergies ? `Encrypted (${profile.allergies.length} chars)` : null,
      updatedAt: profile.updated_at,
    });
  } else {
    console.log('No health profile found!');
  }
  
  // Try to insert a test
  console.log('\n=== TESTING INSERT ===');
  try {
    // Check if we can describe the table
    const tableInfo = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'health_profiles'
      ORDER BY ordinal_position
    `);
    console.log('Table columns:');
    tableInfo.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
  } catch (e) {
    console.error('Table info error:', e.message);
  }
  
} catch (e) {
  console.error('Error:', e.message);
  console.error(e.stack);
} finally {
  await pool.end();
}
