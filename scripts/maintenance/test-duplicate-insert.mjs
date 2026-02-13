import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ 
  connectionString: 'postgresql://postgres.aytzwtehxtvoejgcixdn:Weshinebright22!@aws-1-us-east-1.pooler.supabase.com:6543/postgres'
});

const userId = '1f7f26d5-bcc7-46f0-a671-c7a793432be1';

try {
  // Try to insert a health profile when one already exists
  console.log('Attempting to INSERT a health profile for a user that already has one...\n');
  
  const result = await pool.query(`
    INSERT INTO health_profiles (id, user_id, age, sex, weight_lbs, height_cm, updated_at)
    VALUES (gen_random_uuid(), $1, 35, 'male', 200, 180, NOW())
    RETURNING *
  `, [userId]);
  
  console.log('Insert succeeded?! This should not happen:', result.rows[0]);
} catch (e) {
  console.log('Insert failed (expected):', e.message);
  console.log('\nThis confirms that the issue is likely:');
  console.log('1. getHealthProfile() is failing silently (returns undefined)');
  console.log('2. Route thinks no profile exists, tries to create one');
  console.log('3. Database rejects duplicate user_id');
  
  // Check the constraint
  const constraints = await pool.query(`
    SELECT constraint_name, constraint_type 
    FROM information_schema.table_constraints 
    WHERE table_name = 'health_profiles'
  `);
  console.log('\nTable constraints:', constraints.rows);
}

await pool.end();
