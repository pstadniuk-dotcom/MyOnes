import pkg from 'pg';
const { Client } = pkg;
import { config as loadEnv } from "dotenv";
import fs from "fs";
import path from "path";

// Load environment variables from server/.env
const envPath = path.resolve("./server/.env");
if (fs.existsSync(envPath)) {
  loadEnv({ path: envPath, override: true });
}

async function fix() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL not found in environment.");
    return;
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to database. Applying fixes...");
    
    // 1. Fix the current_supplements casting issue
    console.log("Casting current_supplements to JSON...");
    await client.query(`
      ALTER TABLE health_profiles 
      ALTER COLUMN current_supplements TYPE json 
      USING current_supplements::json;
    `);

    console.log("✅ Successfully fixed column types.");
    console.log("\nNow you can run: npm run db:push");
    
  } catch (err) {
    console.error("❌ Error applying fix:", err);
  } finally {
    await client.end();
  }
}

fix();
