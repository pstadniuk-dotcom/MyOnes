import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    return (u.hostname.replace(/^www\./, '') + u.pathname.replace(/\/$/, '')).toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\b(the|a|an|podcast|show|magazine|journal|blog|newsletter|media|online|digital)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

try {
  // Backfill existing rows
  const { rows } = await pool.query('SELECT id, url, name FROM outreach_prospects WHERE normalized_url IS NULL');
  console.log(`Backfilling ${rows.length} rows...`);

  for (const row of rows) {
    const nu = normalizeUrl(row.url);
    const nn = normalizeName(row.name);
    await pool.query(
      'UPDATE outreach_prospects SET normalized_url = $1, normalized_name = $2 WHERE id = $3',
      [nu, nn, row.id]
    );
  }
  console.log('Backfill complete');

  // Add unique constraint if not exists
  try {
    await pool.query(
      'ALTER TABLE outreach_prospects ADD CONSTRAINT outreach_prospects_normalized_url_unique UNIQUE (normalized_url)'
    );
    console.log('Unique constraint added');
  } catch (e) {
    if (e.message.includes('already exists')) {
      console.log('Constraint already exists');
    } else {
      throw e;
    }
  }

  // Verify
  const { rows: check } = await pool.query(
    'SELECT id, name, normalized_name, normalized_url FROM outreach_prospects LIMIT 5'
  );
  console.log('\nSample results:');
  for (const r of check) {
    console.log(`  ${r.name} -> [${r.normalized_name}] | ${r.normalized_url}`);
  }

  await pool.end();
  console.log('\nDone!');
} catch (e) {
  console.error('Error:', e.message);
  await pool.end();
  process.exit(1);
}
