import 'dotenv/config';
import pg from 'pg';
import bcrypt from 'bcrypt';
const { Pool } = pg;

// Use DATABASE_URL from environment
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}
console.log('Using database from DATABASE_URL env var');
const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function checkUser() {
  try {
    // Check exact email
    const result = await pool.query(`
      SELECT id, email, is_admin, created_at, 
             password IS NOT NULL as has_password, 
             LENGTH(password) as pwd_len,
             password
      FROM users 
      WHERE LOWER(email) LIKE '%pstadniuk%'
    `);
    console.log('\nAll matching users:');
    for (const row of result.rows) {
      console.log(`  - Email: "${row.email}" | has_password: ${row.has_password} | pwd_len: ${row.pwd_len}`);
    }
    
    if (result.rows.length === 0) {
      console.log('User NOT FOUND!');
    } else {
      const user = result.rows[0];
      console.log('\nUser details:', {
        id: user.id,
        email: user.email,
        is_admin: user.is_admin,
        has_password: user.has_password,
        pwd_len: user.pwd_len
      });
      
      if (!user.has_password || !user.password) {
        console.log('\n⚠️  USER HAS NO PASSWORD SET!');
      } else {
        console.log('\n✅ User has password set (length:', user.pwd_len, ')');
        
        // Test password verification
        const testPassword = process.argv[2];
        if (!testPassword) {
          console.log('\nPass a password as CLI arg to test: node check-user-login.mjs <password>');
          return;
        }
        const isValid = await bcrypt.compare(testPassword, user.password);
        console.log(`\nPassword test with "${testPassword}": ${isValid ? '✅ MATCHES' : '❌ DOES NOT MATCH'}`);
      }
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}

checkUser();
