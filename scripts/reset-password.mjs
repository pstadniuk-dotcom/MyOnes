import bcrypt from 'bcrypt';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const email = process.argv[2] || 'pstadniuk@gmail.com';
const newPassword = process.argv[3];

if (!newPassword) {
  console.error('Usage: node reset-password.mjs <email> <newPassword>');
  process.exit(1);
}

async function resetPassword() {
  try {
    const hash = await bcrypt.hash(newPassword, 10);
    const result = await pool.query(
      'UPDATE users SET password = $1 WHERE email = $2 RETURNING email',
      [hash, email]
    );
    
    if (result.rows.length > 0) {
      console.log('✅ Password reset successfully for:', result.rows[0].email);
      console.log('📝 New password:', newPassword);
    } else {
      console.log('❌ User not found:', email);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

resetPassword();
