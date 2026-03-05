/**
 * Migration: Expand wearable_provider enum and make biometric_data.connection_id nullable.
 * Run: node scripts/migrate-wearable-schema.js
 */
require('dotenv').config({ path: 'server/.env' });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
    const newProviders = [
        'garmin', 'apple_health', 'google_fit', 'samsung', 'polar',
        'withings', 'eight_sleep', 'strava', 'peloton', 'ultrahuman',
        'dexcom', 'freestyle_libre', 'cronometer', 'omron', 'kardia', 'junction'
    ];

    for (const provider of newProviders) {
        try {
            await pool.query(`ALTER TYPE wearable_provider ADD VALUE IF NOT EXISTS '${provider}'`);
            console.log(`  Added enum value: ${provider}`);
        } catch (e) {
            if (e.message.includes('already exists')) {
                console.log(`  Already exists: ${provider}`);
            } else {
                console.error(`  Error adding ${provider}:`, e.message);
            }
        }
    }
    console.log('✅ Provider enum expanded');

    try {
        await pool.query('ALTER TABLE biometric_data ALTER COLUMN connection_id DROP NOT NULL');
        console.log('✅ connection_id is now nullable');
    } catch (e) {
        console.log('  connection_id already nullable or error:', e.message);
    }

    await pool.end();
    console.log('\nMigration complete.');
}

migrate().catch(e => {
    console.error('Migration failed:', e);
    pool.end();
    process.exit(1);
});
