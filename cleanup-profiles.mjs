import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ 
  connectionString: 'postgresql://postgres.aytzwtehxtvoejgcixdn:Weshinebright22!@aws-1-us-east-1.pooler.supabase.com:6543/postgres'
});

try {
  // Delete the test profile
  await pool.query(`DELETE FROM health_profiles WHERE id = 'daa74484-555a-4459-b915-125a9ec151d1'`);
  console.log('Deleted test profile');
  
  // Count remaining
  const result = await pool.query(`SELECT COUNT(*) as count FROM health_profiles WHERE user_id = '1f7f26d5-bcc7-46f0-a671-c7a793432be1'`);
  console.log('Remaining profiles:', result.rows[0].count);
} catch (e) {
  console.error('Error:', e.message);
}

await pool.end();
