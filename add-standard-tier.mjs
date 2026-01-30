import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({path: './server/.env'});

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {rejectUnauthorized: false}
});

async function addStandardTier() {
  try {
    await pool.query(`
      INSERT INTO membership_tiers 
      (tier_key, name, price_cents, max_capacity, current_count, sort_order, benefits, is_active, created_at, updated_at)
      VALUES ('standard', 'Standard Member', 4900, 999999, 0, 4, '["Standard pricing at $49/month","Unlimited AI consultations"]', true, NOW(), NOW())
    `);
    console.log('✅ Created standard tier with 999999 capacity (effectively unlimited)');
    
    // Show all tiers
    const result = await pool.query('SELECT tier_key, name, price_cents, max_capacity FROM membership_tiers ORDER BY sort_order');
    console.table(result.rows);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}

addStandardTier();
