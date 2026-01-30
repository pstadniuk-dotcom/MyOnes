import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ 
  connectionString: 'postgresql://postgres.aytzwtehxtvoejgcixdn:Weshinebright22!@aws-1-us-east-1.pooler.supabase.com:6543/postgres'
});

try {
  // Replicate the exact query from getCurrentFormulaByUser
  const userId = '1f7f26d5-bcc7-46f0-a671-c7a793432be1';
  
  console.log('=== Testing getCurrentFormulaByUser query ===');
  const currentFormula = await pool.query(`
    SELECT id, version, total_mg, created_at, archived_at 
    FROM formulas 
    WHERE user_id = $1 AND archived_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  `, [userId]);
  
  console.log('Current formula result:', currentFormula.rows);
  
  console.log('\n=== All formulas with archived_at status ===');
  const all = await pool.query(`
    SELECT id, version, total_mg, created_at, archived_at 
    FROM formulas 
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT 10
  `, [userId]);
  
  all.rows.forEach(r => {
    console.log(`v${r.version}: created ${r.created_at}, archived_at: ${r.archived_at}`);
  });

} catch (e) {
  console.error('Error:', e.message);
} finally {
  await pool.end();
}
