import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ 
  connectionString: 'postgresql://postgres.aytzwtehxtvoejgcixdn:Weshinebright22!@aws-1-us-east-1.pooler.supabase.com:6543/postgres'
});

try {
  // Check the actual columns in formulas table
  const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'formulas'");
  console.log('Formula columns:', cols.rows.map(r => r.column_name));

  // Find the user
  const user = await pool.query(`SELECT id, email, created_at FROM users WHERE email = 'pstadniuk@gmail.com'`);
  console.log('\nUser:', user.rows[0]);
  
  if (user.rows.length > 0) {
    const userId = user.rows[0].id;
    
    // Check all formulas for this user
    const formulas = await pool.query(`
      SELECT * 
      FROM formulas 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `, [userId]);
    console.log('\nFormulas count:', formulas.rows.length);
    formulas.rows.forEach(f => {
      console.log(f);
    });

    // Check for non-archived formulas
    const activeFormulas = formulas.rows.filter(f => f.archived_at === null);
    console.log('\nActive (non-archived) formulas:', activeFormulas.length);
    activeFormulas.forEach(f => {
      console.log({
        id: f.id.substring(0, 8),
        version: f.version,
        total_mg: f.total_mg,
        created_at: f.created_at,
        bases: f.bases?.map(b => b.ingredient),
        additions: f.additions?.map(a => a.ingredient)
      });
    });
    
    const archivedFormulas = formulas.rows.filter(f => f.archived_at !== null);
    console.log('\nArchived formulas:', archivedFormulas.length);
  }
} catch (e) {
  console.error('Error:', e.message);
} finally {
  await pool.end();
}
