import { defineConfig } from "drizzle-kit";
import { config as loadEnv } from "dotenv";

// Ensure we load environment variables from the server env file for CLI usage
// Use override so this takes precedence over any pre-set env (e.g. old Neon URL)
loadEnv({ path: "./server/.env", override: true });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // SSL configuration for Supabase
  strict: true,
});
