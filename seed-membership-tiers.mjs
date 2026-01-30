#!/usr/bin/env node
/**
 * Seed default membership tiers into the database
 * Run: node seed-membership-tiers.mjs
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, 'server', '.env') });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const defaultTiers = [
  {
    tier_key: 'founding',
    name: 'Founding Member',
    price_cents: 1900, // $19
    max_capacity: 250,
    current_count: 0,
    sort_order: 1,
    benefits: JSON.stringify([
      'Lock in $19/month forever',
      'Unlimited AI consultations',
      'Priority formula adjustments',
      'Founding member badge'
    ]),
    is_active: true
  },
  {
    tier_key: 'early',
    name: 'Early Adopter',
    price_cents: 2900, // $29
    max_capacity: 1000,
    current_count: 0,
    sort_order: 2,
    benefits: JSON.stringify([
      'Lock in $29/month forever',
      'Unlimited AI consultations',
      'Priority formula adjustments'
    ]),
    is_active: true
  },
  {
    tier_key: 'beta',
    name: 'Beta Member',
    price_cents: 3900, // $39
    max_capacity: 5000,
    current_count: 0,
    sort_order: 3,
    benefits: JSON.stringify([
      'Lock in $39/month forever',
      'Unlimited AI consultations'
    ]),
    is_active: true
  },
  {
    tier_key: 'standard',
    name: 'Standard Member',
    price_cents: 4900, // $49
    max_capacity: null, // unlimited
    current_count: 0,
    sort_order: 4,
    benefits: JSON.stringify([
      'Standard pricing at $49/month',
      'Unlimited AI consultations'
    ]),
    is_active: true
  }
];

async function seedTiers() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Seeding membership tiers...\n');
    
    for (const tier of defaultTiers) {
      // Check if tier already exists
      const existing = await client.query(
        'SELECT * FROM membership_tiers WHERE tier_key = $1',
        [tier.tier_key]
      );
      
      if (existing.rows.length > 0) {
        console.log(`⏭️  Tier "${tier.name}" already exists, skipping...`);
        continue;
      }
      
      // Insert new tier
      await client.query(
        `INSERT INTO membership_tiers 
         (tier_key, name, price_cents, max_capacity, current_count, sort_order, benefits, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        [
          tier.tier_key,
          tier.name,
          tier.price_cents,
          tier.max_capacity,
          tier.current_count,
          tier.sort_order,
          tier.benefits,
          tier.is_active
        ]
      );
      
      console.log(`✅ Created tier: ${tier.name} ($${tier.price_cents / 100}/mo, ${tier.max_capacity || 'unlimited'} spots)`);
    }
    
    // Display current state
    const result = await client.query(
      'SELECT tier_key, name, price_cents, max_capacity, current_count FROM membership_tiers ORDER BY sort_order'
    );
    
    console.log('\n📊 Current membership tiers:');
    console.table(result.rows.map(r => ({
      Tier: r.tier_key,
      Name: r.name,
      Price: `$${r.price_cents / 100}/mo`,
      Capacity: r.max_capacity || 'unlimited',
      Members: r.current_count
    })));
    
    console.log('\n✨ Seeding complete!');
    
  } catch (error) {
    console.error('❌ Error seeding tiers:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedTiers().catch(console.error);
