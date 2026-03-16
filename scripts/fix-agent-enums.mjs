import pg from 'pg';
import { readFileSync } from 'fs';

const envContent = readFileSync('server/.env', 'utf-8');
const match = envContent.match(/^DATABASE_URL=(.+)$/m);
const client = new pg.Client({ connectionString: match[1] });
await client.connect();

// Check current enum values
const r = await client.query(`SELECT unnest(enum_range(NULL::outreach_sub_type)) as v`);
const current = r.rows.map(x => x.v);
console.log('Current enum values:', current);

// Schema expects these values
const schemaValues = ['interview', 'panel', 'solo_feature', 'product_review', 'guest_article', 'founder_feature', 'expert_source'];

// Add missing values
for (const val of schemaValues) {
  if (!current.includes(val)) {
    try {
      await client.query(`ALTER TYPE outreach_sub_type ADD VALUE IF NOT EXISTS '${val}'`);
      console.log(`+ Added: ${val}`);
    } catch (err) {
      console.error(`! Failed to add ${val}: ${err.message}`);
    }
  }
}

// Also check outreach_prospect_status enum
const r2 = await client.query(`SELECT unnest(enum_range(NULL::outreach_prospect_status)) as v`);
console.log('\nCurrent prospect status values:', r2.rows.map(x => x.v));

const statusValues = ['new', 'pitched', 'responded', 'booked', 'published', 'rejected', 'cold', 'manually_contacted'];
for (const val of statusValues) {
  if (!r2.rows.map(x => x.v).includes(val)) {
    try {
      await client.query(`ALTER TYPE outreach_prospect_status ADD VALUE IF NOT EXISTS '${val}'`);
      console.log(`+ Added status: ${val}`);
    } catch (err) {
      console.error(`! Failed to add status ${val}: ${err.message}`);
    }
  }
}

// Check contact_method enum too
const r3 = await client.query(`SELECT unnest(enum_range(NULL::outreach_contact_method)) as v`);
console.log('\nCurrent contact method values:', r3.rows.map(x => x.v));

// Verify final state
const r4 = await client.query(`SELECT unnest(enum_range(NULL::outreach_sub_type)) as v`);
console.log('\nFinal sub_type values:', r4.rows.map(x => x.v));

await client.end();
console.log('\nDone.');
