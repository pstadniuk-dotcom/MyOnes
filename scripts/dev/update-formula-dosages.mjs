/**
 * Script to update all existing formulas with new base formula dosages
 * Run with: node update-formula-dosages.mjs
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, 'server', '.env') });

const { Pool } = pg;

// New correct dosages for base formulas
const BASE_FORMULA_DOSAGES = {
  'Adrenal Support': 420,
  'Beta Max': 650,
  'C Boost': 598,
  'Endocrine Support': 335,
  'Heart Support': 689,
  'Histamine Support': 200,
  'Immune-C': 358,
  'Kidney & Bladder Support': 400,
  'Ligament Support': 130,
  'Liver Support': 530,
  'Lung Support': 242,
  'MG/K': 90,
  'Mold RX': 525,
  'Ovary Uterus Support': 253,
  'Para X': 523,
  'Prostate Support': 202,
  'Spleen Support': 203,
  'Thyroid Support': 291,
};

async function updateFormulas() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('sslmode=require') ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔗 Connecting to database...');
    const client = await pool.connect();
    
    // Get all formulas
    const result = await client.query('SELECT id, bases, total_mg FROM formulas');
    console.log(`📋 Found ${result.rows.length} formulas to check\n`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const row of result.rows) {
      const formulaId = row.id;
      let bases = row.bases;
      let needsUpdate = false;
      let changes = [];
      
      // Check if bases is a string (JSON) and parse it
      if (typeof bases === 'string') {
        bases = JSON.parse(bases);
      }
      
      if (!bases || !Array.isArray(bases)) {
        console.log(`⏭️  Formula ${formulaId}: No bases array, skipping`);
        skippedCount++;
        continue;
      }
      
      // Check each base formula for outdated dosages
      for (const base of bases) {
        const correctDose = BASE_FORMULA_DOSAGES[base.ingredient];
        if (correctDose && base.amount !== correctDose) {
          // Check if it's a valid multiple (1x, 2x, 3x)
          const multiplier = base.amount / correctDose;
          if (multiplier === 1 || multiplier === 2 || multiplier === 3) {
            // Already a valid multiple, no change needed
            continue;
          }
          
          // Find which old dose this was using and convert to the correct dose
          changes.push(`  ${base.ingredient}: ${base.amount}mg → ${correctDose}mg`);
          base.amount = correctDose;
          needsUpdate = true;
        }
      }
      
      if (needsUpdate) {
        // Recalculate total_mg
        let newTotal = 0;
        for (const base of bases) {
          newTotal += base.amount;
        }
        
        // Get additions too
        const additionsResult = await client.query('SELECT additions FROM formulas WHERE id = $1', [formulaId]);
        let additions = additionsResult.rows[0]?.additions;
        if (typeof additions === 'string') {
          additions = JSON.parse(additions);
        }
        if (additions && Array.isArray(additions)) {
          for (const add of additions) {
            newTotal += add.amount;
          }
        }
        
        // Update the formula
        await client.query(
          'UPDATE formulas SET bases = $1, total_mg = $2 WHERE id = $3',
          [JSON.stringify(bases), newTotal, formulaId]
        );
        
        console.log(`✅ Updated formula ${formulaId}:`);
        changes.forEach(c => console.log(c));
        console.log(`   New total: ${newTotal}mg\n`);
        updatedCount++;
      } else {
        skippedCount++;
      }
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Updated: ${updatedCount} formulas`);
    console.log(`⏭️  Skipped: ${skippedCount} formulas (already correct)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    client.release();
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

updateFormulas().catch(console.error);
