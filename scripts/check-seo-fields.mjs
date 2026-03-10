import { config } from 'dotenv';
import pg from 'pg';

config({ path: './server/.env' });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const { rows } = await pool.query(`
    SELECT 
      slug,
      meta_title,
      length(meta_title) as mt_len,
      meta_description,
      length(meta_description) as md_len,
      schema_json IS NOT NULL as has_schema,
      length(schema_json) as schema_len,
      primary_keyword,
      array_length(secondary_keywords,1) as skw_count,
      array_length(internal_links,1) as links_count,
      word_count,
      read_time_minutes,
      tier,
      excerpt IS NOT NULL as has_excerpt
    FROM blog_posts 
    ORDER BY published_at DESC 
    LIMIT 5
  `);
  
  for (const row of rows) {
    console.log('\n--- ' + row.slug + ' ---');
    console.log('  meta_title:', row.meta_title ? `✓ (${row.mt_len} chars)` : '✗ MISSING');
    console.log('  meta_description:', row.meta_description ? `✓ (${row.md_len} chars)` : '✗ MISSING');
    console.log('  schema_json:', row.has_schema ? `✓ (${row.schema_len} chars)` : '✗ MISSING');
    console.log('  primary_keyword:', row.primary_keyword || '✗ MISSING');
    console.log('  secondary_keywords:', row.skw_count ? `✓ (${row.skw_count})` : '✗ MISSING');
    console.log('  internal_links:', row.links_count ? `✓ (${row.links_count})` : '✗ MISSING');
    console.log('  word_count:', row.word_count || '✗ MISSING');
    console.log('  read_time_minutes:', row.read_time_minutes || '✗ MISSING');
    console.log('  tier:', row.tier || '✗ MISSING');
    console.log('  excerpt:', row.has_excerpt ? '✓' : '✗ MISSING');
  }

  await pool.end();
}

run();
