/**
 * One-off DDL for the medication-normalization + unmatched-medications
 * audit additions. Pure additive — adds one column and one new table.
 * Safe to re-run (uses IF NOT EXISTS).
 *
 * We bypass `drizzle-kit push` here only because the current DB has
 * unrelated drift (discount_codes / formulas unique constraints) that
 * triggers interactive prompts in non-TTY shells.
 */

import { db } from '../server/infra/db/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Applying medication normalization + unmatched_medications schema additions...');

  await db.execute(sql`
    ALTER TABLE health_profiles
      ADD COLUMN IF NOT EXISTS medications_normalized JSON DEFAULT '[]'::json;
  `);
  console.log('✓ health_profiles.medications_normalized');

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS unmatched_medications (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      raw_input text NOT NULL,
      normalized_generic text,
      normalized_class text,
      normalized_brand_family text,
      normalization_confidence integer,
      context_event text NOT NULL DEFAULT 'safety_validator',
      triaged_at timestamp,
      triage_note text,
      created_at timestamp NOT NULL DEFAULT now()
    );
  `);
  console.log('✓ unmatched_medications table');

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_unmatched_medications_user
      ON unmatched_medications(user_id);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_unmatched_medications_untriaged
      ON unmatched_medications(triaged_at) WHERE triaged_at IS NULL;
  `);
  console.log('✓ indexes');

  console.log('Done.');
  process.exit(0);
}

main().catch(err => {
  console.error('Schema apply failed:', err);
  process.exit(1);
});
