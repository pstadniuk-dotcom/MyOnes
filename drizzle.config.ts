import { defineConfig } from "drizzle-kit";
import { config as loadEnv } from "dotenv";
import fs from "fs";

// Load from server/.env if it exists, otherwise use existing environment variables
const envPath = "./server/.env";
if (fs.existsSync(envPath)) {
  loadEnv({ path: envPath, override: true });
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // Allow Supabase pooler certificates
  },
  strict: true,
});
