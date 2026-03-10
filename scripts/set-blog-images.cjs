require('dotenv').config({ path: 'server/.env' });
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL });

const updates = [
  // Liver / detox / milk thistle - fresh greens
  ['2243c778-1b45-4b80-8b65-0ef780810c09', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&q=80&fit=crop'],
  // Personalized vitamins comparison - capsules/supplements
  ['76441509-5456-454e-8115-bdd5bd2a676c', 'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=1200&q=80&fit=crop'],
  // Thyroid / Hashimoto's - medical wellness
  ['b404d5df-3521-4acd-86fb-c825d4409936', 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=1200&q=80&fit=crop'],
  // Adrenal / cortisol / stress - calm meditation
  ['67ec2293-7533-4419-bf95-e0a919dd52a1', 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&q=80&fit=crop'],
  // CoQ10 / heart energy - cardiac health
  ['56cf4f57-67f7-4455-9464-54b51cb4d2c1', 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=1200&q=80&fit=crop'],
  // Omega-3 / fish oil - salmon
  ['80e2ee78-7350-4745-acb3-73207aa83fcf', 'https://images.unsplash.com/photo-1510130387422-82bed34b37e9?w=1200&q=80&fit=crop'],
  // Vitamin D3 + K2 - sunlight
  ['0d7ccc2c-4f05-45a8-a727-5c3bab1d31c9', 'https://images.unsplash.com/photo-1495571758719-6ec5e9dc2a33?w=1200&q=80&fit=crop'],
  // Magnesium - calm / minerals / sleep
  ['14de9f2b-e027-452c-b9b9-d0f6a03dee2f', 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=1200&q=80&fit=crop'],
  // Ashwagandha - plant roots / herbs
  ['c57939f2-aa63-48c4-ac9b-e5a148d13d63', 'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=1200&q=80&fit=crop'],
  // Personalized vs generic supplements - laboratory science
  ['aa20ffc6-c767-45b2-b93f-6f8f7aac06a5', 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&q=80&fit=crop'],
];

async function run() {
  let count = 0;
  for (const [id, url] of updates) {
    const res = await p.query(
      'UPDATE blog_posts SET featured_image=$1, updated_at=NOW() WHERE id=$2 RETURNING title',
      [url, id]
    );
    if (res.rows[0]) {
      console.log('✓', res.rows[0].title);
      count++;
    }
  }
  console.log(`\nDone. Updated ${count}/${updates.length} posts.`);
  await p.end();
}

run().catch(e => { console.error(e.message); p.end(); });
