import 'dotenv/config.js';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function queryFormulaPricing() {
  try {
    // Find user by email
    const userRes = await pool.query(
      'SELECT id, email, name FROM users WHERE email = $1',
      ['pete@ones.health']
    );
    
    if (!userRes.rows.length) {
      console.log('User not found');
      process.exit(1);
    }
    
    const userId = userRes.rows[0].id;
    console.log('User:', userRes.rows[0]);
    
    // Get all formulas for this user
    const formulasRes = await pool.query(
      `SELECT id, name, created_at FROM formulas WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    
    console.log('\nFormulas:');
    for (const formula of formulasRes.rows) {
      // Get autoships for this formula
      const autoshipRes = await pool.query(
        `SELECT id, price_cents, manufacturer_cost_cents, created_at, status 
         FROM auto_ship_subscriptions 
         WHERE formula_id = $1 
         ORDER BY created_at DESC`,
        [formula.id]
      );
      
      console.log(`\n  ${formula.name} (${formula.id}):`);
      if (autoshipRes.rows.length) {
        autoshipRes.rows.forEach(a => {
          const price = (a.price_cents / 100).toFixed(2);
          const cost = a.manufacturer_cost_cents ? (a.manufacturer_cost_cents / 100).toFixed(2) : 'N/A';
          const margin = a.manufacturer_cost_cents 
            ? ((a.price_cents - a.manufacturer_cost_cents) / a.price_cents * 100).toFixed(1) 
            : 'N/A';
          console.log(`    Autoship: $${price} (cost: $${cost}, margin: ${margin}%) - ${a.status}`);
        });
      } else {
        console.log('    No autoships');
      }
    }
    
    pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    pool.end();
    process.exit(1);
  }
}

queryFormulaPricing();
