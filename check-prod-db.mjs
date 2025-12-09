import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ 
  connectionString: 'postgresql://postgres.aytzwtehxtvoejgcixdn:Weshinebright22!@aws-1-us-east-1.pooler.supabase.com:6543/postgres'
});

try {
  const result = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`);
  console.log('Tables in production database:');
  result.rows.forEach(row => console.log('  -', row.table_name));
  console.log('\nTotal tables:', result.rows.length);
} catch (e) {
  console.error('Error:', e.message);
} finally {
  await pool.end();
}
