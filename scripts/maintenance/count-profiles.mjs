import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ 
  connectionString: 'postgresql://postgres.aytzwtehxtvoejgcixdn:Weshinebright22!@aws-1-us-east-1.pooler.supabase.com:6543/postgres'
});

const userId = '1f7f26d5-bcc7-46f0-a671-c7a793432be1';

try {
  const result = await pool.query(`
    SELECT id, user_id, age, sex, weight_lbs, conditions, medications, allergies, updated_at 
    FROM health_profiles 
    WHERE user_id = $1 
    ORDER BY updated_at DESC
  `, [userId]);
  
  console.log('Profile count:', result.rows.length);
  result.rows.forEach((p, i) => {
    console.log(`\nProfile ${i + 1}:`, {
      id: p.id,
      age: p.age,
      sex: p.sex,
      weightLbs: p.weight_lbs,
      conditions: p.conditions ? `Has data (${typeof p.conditions})` : null,
      medications: p.medications ? `Has data (${typeof p.medications})` : null,
      allergies: p.allergies ? `Has data (${typeof p.allergies})` : null,
      updatedAt: p.updated_at,
    });
  });
} catch (e) {
  console.error('Error:', e.message);
}

await pool.end();
