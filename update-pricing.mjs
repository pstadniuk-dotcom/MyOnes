import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: 'server/.env' });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function seedTiers() {
  const tiers = [
    { 
      tierKey: 'founding', 
      name: 'Founding Member', 
      priceCents: 900, 
      maxCapacity: 250,
      sortOrder: 1,
      benefits: ['Unlimited AI health consultations', 'Lab and wearable data analysis', 'Supplements at member pricing', 'Formula updates as your health evolves', 'Lab testing at member rates', 'Direct AI practitioner messaging']
    },
    { 
      tierKey: 'early', 
      name: 'Early Adopter', 
      priceCents: 1500, 
      maxCapacity: 1000,
      sortOrder: 2,
      benefits: ['Unlimited AI health consultations', 'Lab and wearable data analysis', 'Supplements at member pricing', 'Formula updates as your health evolves', 'Lab testing at member rates', 'Direct AI practitioner messaging']
    },
    { 
      tierKey: 'beta', 
      name: 'Beta Member', 
      priceCents: 1900, 
      maxCapacity: 5000,
      sortOrder: 3,
      benefits: ['Unlimited AI health consultations', 'Lab and wearable data analysis', 'Supplements at member pricing', 'Formula updates as your health evolves', 'Lab testing at member rates', 'Direct AI practitioner messaging']
    },
    { 
      tierKey: 'standard', 
      name: 'Standard', 
      priceCents: 2900, 
      maxCapacity: 999999,
      sortOrder: 4,
      benefits: ['Unlimited AI health consultations', 'Lab and wearable data analysis', 'Supplements at member pricing', 'Formula updates as your health evolves', 'Lab testing at member rates', 'Direct AI practitioner messaging']
    }
  ];
  
  for (const tier of tiers) {
    await pool.query(
      `INSERT INTO membership_tiers (tier_key, name, price_cents, max_capacity, current_count, sort_order, is_active, benefits)
       VALUES ($1, $2, $3, $4, 0, $5, true, $6::jsonb)
       ON CONFLICT (tier_key) DO UPDATE SET 
         price_cents = EXCLUDED.price_cents,
         name = EXCLUDED.name,
         max_capacity = EXCLUDED.max_capacity,
         sort_order = EXCLUDED.sort_order,
         benefits = EXCLUDED.benefits`,
      [tier.tierKey, tier.name, tier.priceCents, tier.maxCapacity, tier.sortOrder, JSON.stringify(tier.benefits)]
    );
    console.log(`Upserted ${tier.tierKey} at $${tier.priceCents / 100}/mo`);
  }
  
  const finalResult = await pool.query('SELECT tier_key, name, price_cents, max_capacity FROM membership_tiers ORDER BY sort_order');
  console.log('\nFinal tiers:');
  console.table(finalResult.rows);
  
  await pool.end();
}

seedTiers().catch(console.error);
