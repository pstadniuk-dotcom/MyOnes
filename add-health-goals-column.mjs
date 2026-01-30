import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: './server/.env' });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function addMissingColumns() {
  try {
    console.log('Checking and adding missing columns...\n');
    
    // 1. Add health_goals to health_profiles
    const healthGoalsResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'health_profiles' AND column_name = 'health_goals'
    `);
    
    if (healthGoalsResult.rows.length === 0) {
      console.log('Adding health_goals column to health_profiles...');
      await pool.query(`ALTER TABLE health_profiles ADD COLUMN health_goals JSONB DEFAULT '[]'::jsonb`);
      console.log('✅ health_goals column added!');
    } else {
      console.log('✅ health_goals column already exists in health_profiles');
    }
    
    // 2. Add target_capsules to formulas
    const targetCapsulesResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'formulas' AND column_name = 'target_capsules'
    `);
    
    if (targetCapsulesResult.rows.length === 0) {
      console.log('Adding target_capsules column to formulas...');
      await pool.query(`ALTER TABLE formulas ADD COLUMN target_capsules INTEGER DEFAULT 9`);
      console.log('✅ target_capsules column added!');
    } else {
      console.log('✅ target_capsules column already exists in formulas');
    }
    
    // 3. Add recommended_capsules to formulas (if schema requires it)
    const recommendedCapsulesResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'formulas' AND column_name = 'recommended_capsules'
    `);
    
    if (recommendedCapsulesResult.rows.length === 0) {
      console.log('Adding recommended_capsules column to formulas...');
      await pool.query(`ALTER TABLE formulas ADD COLUMN recommended_capsules INTEGER`);
      console.log('✅ recommended_capsules column added!');
    } else {
      console.log('✅ recommended_capsules column already exists in formulas');
    }
    
    console.log('\n✅ All missing columns have been added!');
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

addMissingColumns();
