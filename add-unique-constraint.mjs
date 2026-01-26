import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ 
  connectionString: 'postgresql://postgres.aytzwtehxtvoejgcixdn:Weshinebright22!@aws-1-us-east-1.pooler.supabase.com:6543/postgres'
});

try {
  // First check if there are any duplicate user_ids
  console.log('Checking for duplicate user_ids...');
  const duplicates = await pool.query(`
    SELECT user_id, COUNT(*) as count 
    FROM health_profiles 
    GROUP BY user_id 
    HAVING COUNT(*) > 1
  `);
  
  if (duplicates.rows.length > 0) {
    console.log('Found duplicates:', duplicates.rows);
    console.log('\nCleaning up duplicates (keeping most recent)...');
    
    for (const dup of duplicates.rows) {
      // Keep the most recently updated one
      await pool.query(`
        DELETE FROM health_profiles 
        WHERE user_id = $1 
        AND id NOT IN (
          SELECT id FROM health_profiles 
          WHERE user_id = $1 
          ORDER BY updated_at DESC 
          LIMIT 1
        )
      `, [dup.user_id]);
      console.log(`Cleaned duplicates for user: ${dup.user_id}`);
    }
  } else {
    console.log('No duplicates found.');
  }
  
  // Now add the unique constraint
  console.log('\nAdding unique constraint on user_id...');
  await pool.query(`
    ALTER TABLE health_profiles 
    ADD CONSTRAINT health_profiles_user_id_unique UNIQUE (user_id)
  `);
  console.log('✅ Unique constraint added successfully!');
  
} catch (e) {
  if (e.message.includes('already exists')) {
    console.log('Unique constraint already exists.');
  } else {
    console.error('Error:', e.message);
  }
}

await pool.end();
