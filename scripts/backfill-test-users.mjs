#!/usr/bin/env node
/**
 * One-time backfill: mark every existing user as a test user EXCEPT a
 * hard-coded allow-list of real early customers.
 *
 * After this runs, all admin analytics (revenue, margins, MRR/ARR, growth,
 * funnel, cohorts, conversation intelligence, activity feed, today's orders)
 * will only include the allow-listed users plus any new signups going forward
 * (because the column defaults to false for new rows).
 *
 * Run once after `npm run db:push`:
 *   node scripts/backfill-test-users.mjs            # dry run
 *   node scripts/backfill-test-users.mjs --apply    # actually write
 */
import 'dotenv/config';
import pg from 'pg';

const REAL_USER_EMAILS = [
  'jkresh@hotmail.com',
  'ianrcoleman@gmail.com',
  'suzannemcdonald@alive4health.com',
  'nataliegenkin@gmail.com',
  'david@sica.ws',
];

const APPLY = process.argv.includes('--apply');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Aborting.');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
});

await client.connect();

try {
  // Sanity check: column exists.
  const colCheck = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_name = 'users' AND column_name = 'is_test_user'`
  );
  if (colCheck.rowCount === 0) {
    console.error('users.is_test_user column does not exist. Run `npm run db:push` first.');
    process.exit(1);
  }

  const allowList = REAL_USER_EMAILS.map((e) => e.toLowerCase());

  // Show who matches the allow-list.
  const matched = await client.query(
    `SELECT id, email, name, created_at
     FROM users
     WHERE LOWER(email) = ANY($1::text[])
     ORDER BY email`,
    [allowList]
  );
  console.log(`\nReal users in allow-list found in DB: ${matched.rowCount}`);
  matched.rows.forEach((u) => console.log(`  ✓ ${u.email}  (${u.name})`));

  const missing = allowList.filter(
    (e) => !matched.rows.some((u) => u.email.toLowerCase() === e)
  );
  if (missing.length) {
    console.log(`\n⚠ Allow-listed emails NOT found in users table:`);
    missing.forEach((e) => console.log(`  - ${e}`));
    console.log('  (They will be tracked as real users automatically when they sign up.)');
  }

  // How many would be flipped to test?
  const toFlip = await client.query(
    `SELECT COUNT(*)::int AS n
     FROM users
     WHERE is_test_user = false
       AND LOWER(email) <> ALL($1::text[])`,
    [allowList]
  );
  console.log(`\nUsers to flip is_test_user -> true: ${toFlip.rows[0].n}`);

  if (!APPLY) {
    console.log('\nDry run. Re-run with --apply to write changes.');
    await client.end();
    process.exit(0);
  }

  await client.query('BEGIN');
  const updated = await client.query(
    `UPDATE users
     SET is_test_user = true
     WHERE is_test_user = false
       AND LOWER(email) <> ALL($1::text[])
     RETURNING id`,
    [allowList]
  );
  // Make sure allow-list users are explicitly real, in case any were already marked test.
  const reset = await client.query(
    `UPDATE users
     SET is_test_user = false
     WHERE is_test_user = true
       AND LOWER(email) = ANY($1::text[])
     RETURNING id`,
    [allowList]
  );
  // Cascade: every order placed by a test user should also be flagged as a test
  // order so the existing /admin/orders "hide test orders" toggle, KPI cards,
  // and per-order endpoints stay consistent with user-level filtering.
  const flippedOrders = await client.query(
    `UPDATE orders o
     SET is_test_order = true
     FROM users u
     WHERE o.user_id = u.id
       AND u.is_test_user = true
       AND o.is_test_order = false
     RETURNING o.id`
  );
  await client.query('COMMIT');

  console.log(`\n✓ Marked ${updated.rowCount} users as test.`);
  console.log(`✓ Reset ${reset.rowCount} allow-listed users back to real.`);
  console.log(`✓ Cascaded test flag to ${flippedOrders.rowCount} orders.`);
  console.log('\nDone. Refresh the admin dashboard to see the new numbers.');
} catch (err) {
  await client.query('ROLLBACK').catch(() => {});
  console.error('Backfill failed:', err);
  process.exit(1);
} finally {
  await client.end();
}
