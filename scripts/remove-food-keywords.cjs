/**
 * remove-food-keywords.cjs – Remove food-related keywords from the DB.
 * These will be re-added when we build the food tracking feature.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', 'server', '.env') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  // Preview
  const preview = await pool.query(`
    SELECT keyword, volume FROM keyword_data
    WHERE keyword LIKE '%rich foods%'
       OR keyword LIKE 'foods high in%'
       OR keyword LIKE '%natural sources%'
       OR keyword LIKE 'natural sources of%'
    ORDER BY volume DESC
  `);
  console.log(`Food keywords to remove: ${preview.rows.length}`);
  preview.rows.forEach(r => console.log(`  ${String(r.volume).padStart(6)} | ${r.keyword}`));

  // Delete
  const del = await pool.query(`
    DELETE FROM keyword_data
    WHERE keyword LIKE '%rich foods%'
       OR keyword LIKE 'foods high in%'
       OR keyword LIKE '%natural sources%'
       OR keyword LIKE 'natural sources of%'
  `);
  console.log(`\nDeleted: ${del.rowCount}`);

  // Updated stats
  const stats = await pool.query(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN volume > 0 THEN 1 ELSE 0 END) as with_volume,
      SUM(CASE WHEN volume >= 1000 AND kd <= 40 THEN 1 ELSE 0 END) as easy_wins,
      SUM(CASE WHEN volume >= 5000 AND kd <= 30 THEN 1 ELSE 0 END) as sweet_spot,
      SUM(CASE WHEN volume >= 10000 THEN 1 ELSE 0 END) as high_volume
    FROM keyword_data
  `);
  const s = stats.rows[0];
  console.log(`\nDB totals after cleanup:`);
  console.log(`  Total: ${s.total} | With volume: ${s.with_volume} | Easy wins: ${s.easy_wins} | Sweet spot: ${s.sweet_spot} | High volume: ${s.high_volume}`);

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
