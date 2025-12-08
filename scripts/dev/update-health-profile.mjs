import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

// Load DATABASE_URL from server/.env
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, 'server', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase') ? { rejectUnauthorized: false } : false
});

async function updateHealthProfile() {
  try {
    console.log('🔍 Finding user pstadniuk@gmail.com...');
    
    const userResult = await pool.query(
      'SELECT id, email FROM users WHERE email = $1',
      ['pstadniuk@gmail.com']
    );
    
    if (userResult.rows.length === 0) {
      console.error('❌ User not found!');
      process.exit(1);
    }
    
    const user = userResult.rows[0];
    console.log('✅ Found user:', user.email, '- ID:', user.id);
    
    // Check if health profile exists
    const profileCheck = await pool.query(
      'SELECT id FROM health_profiles WHERE user_id = $1',
      [user.id]
    );
    
    const healthData = {
      age: 40,
      sex: 'male',
      height_cm: 198, // 6'6" = 198cm
      weight_lbs: 235,
      sleep_hours_per_night: 7, // assumed healthy (no sleep issues)
      exercise_days_per_week: 3.5, // 3-4 days average
      stress_level: 5, // assumed moderate
      smoking_status: 'never', // doesn't smoke
      alcohol_drinks_per_week: 4.5, // 4-5 drinks average
      conditions: [],
      medications: ['Sertraline 25mg'],
      allergies: []
    };
    
    if (profileCheck.rows.length > 0) {
      // Update existing profile
      console.log('📝 Updating existing health profile...');
      await pool.query(
        `UPDATE health_profiles SET 
          age = $1,
          sex = $2,
          height_cm = $3,
          weight_lbs = $4,
          sleep_hours_per_night = $5,
          exercise_days_per_week = $6,
          stress_level = $7,
          smoking_status = $8,
          alcohol_drinks_per_week = $9,
          conditions = $10,
          medications = $11,
          allergies = $12,
          updated_at = NOW()
        WHERE user_id = $13`,
        [
          healthData.age,
          healthData.sex,
          healthData.height_cm,
          healthData.weight_lbs,
          healthData.sleep_hours_per_night,
          healthData.exercise_days_per_week,
          healthData.stress_level,
          healthData.smoking_status,
          healthData.alcohol_drinks_per_week,
          healthData.conditions,
          healthData.medications,
          healthData.allergies,
          user.id
        ]
      );
    } else {
      // Create new profile
      console.log('✨ Creating new health profile...');
      await pool.query(
        `INSERT INTO health_profiles (
          user_id, age, sex, height_cm, weight_lbs,
          sleep_hours_per_night, exercise_days_per_week, stress_level,
          smoking_status, alcohol_drinks_per_week,
          conditions, medications, allergies,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())`,
        [
          user.id,
          healthData.age,
          healthData.sex,
          healthData.height_cm,
          healthData.weight_lbs,
          healthData.sleep_hours_per_night,
          healthData.exercise_days_per_week,
          healthData.stress_level,
          healthData.smoking_status,
          healthData.alcohol_drinks_per_week,
          healthData.conditions,
          healthData.medications,
          healthData.allergies
        ]
      );
    }
    
    console.log('✅ Health profile updated successfully!');
    console.log('📊 Profile data:', healthData);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

updateHealthProfile();
