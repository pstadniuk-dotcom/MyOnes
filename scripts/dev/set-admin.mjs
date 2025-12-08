import pg from 'pg';

const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres.frksbddeepdzlskvniqu:Weshinebright22!@aws-0-us-west-2.pooler.supabase.com:5432/postgres'
});

async function setAdmin() {
  try {
    await client.connect();
    console.log('✅ Connected to Supabase');
    
    const result = await client.query(
      `UPDATE users SET is_admin = true WHERE email = 'pstadniuk@gmail.com' RETURNING email, is_admin`
    );
    
    if (result.rows.length > 0) {
      console.log('✅ Admin access granted:', result.rows[0]);
    } else {
      console.log('⚠️ No user found with email pstadniuk@gmail.com');
      
      // List all users to debug
      const users = await client.query('SELECT email, is_admin FROM users');
      console.log('\nAll users:');
      users.rows.forEach(u => console.log(`  - ${u.email} (admin: ${u.is_admin})`));
    }
    
    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setAdmin();
