const pg = require('pg');
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_CA_CERT
    ? { rejectUnauthorized: true, ca: process.env.DB_CA_CERT }
    : { rejectUnauthorized: false },
});

async function queryMargin() {
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
    
    const user = userRes.rows[0];
    console.log('Found user:', user);
    
    // Find orders for this user with price around $342
    const orderRes = await pool.query(
      `SELECT id, user_id, amount_cents, placed_at, formula_id 
       FROM orders 
       WHERE user_id = $1 
       ORDER BY placed_at DESC`,
      [user.id]
    );
    
    console.log('\nOrders:');
    orderRes.rows.forEach(order => {
      console.log(`  Order ${order.id}: $${(order.amount_cents / 100).toFixed(2)} on ${order.placed_at}`);
    });
    
    // Find the $342 order
    const targetOrder = orderRes.rows.find(o => Math.abs(o.amount_cents / 100 - 342) < 0.01);
    
    if (!targetOrder) {
      console.log('\nNo order found with price $342');
      process.exit(1);
    }
    
    console.log('\nTarget order:', targetOrder);
    
    // Get formula details
    if (targetOrder.formula_id) {
      const formulaRes = await pool.query(
        'SELECT * FROM formulas WHERE id = $1',
        [targetOrder.formula_id]
      );
      
      if (formulaRes.rows.length) {
        const formula = formulaRes.rows[0];
        console.log('\nFormula name:', formula.name);
      }
      
      // Check for autoship for this formula
      const autoshipRes = await pool.query(
        `SELECT id, price_cents, manufacturer_cost_cents, formula_version 
         FROM autoships 
         WHERE formula_id = $1 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [targetOrder.formula_id]
      );
      
      if (autoshipRes.rows.length) {
        const autoship = autoshipRes.rows[0];
        const priceCents = autoship.price_cents;
        const costCents = autoship.manufacturer_cost_cents;
        console.log('\nAutoship found:');
        console.log(`Price: $${(priceCents / 100).toFixed(2)}`);
        console.log(`Cost: $${costCents ? (costCents / 100).toFixed(2) : 'N/A'}`);
        if (costCents) {
          const margin = ((priceCents - costCents) / priceCents * 100).toFixed(1);
          const profit = ((priceCents - costCents) / 100).toFixed(2);
          console.log(`Margin: ${margin}%`);
          console.log(`Profit per unit: $${profit}`);
        }
      }
    }
    
    pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

queryMargin();
