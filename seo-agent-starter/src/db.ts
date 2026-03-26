/**
 * Database Connection
 *
 * Establishes a PostgreSQL connection pool using Drizzle ORM.
 * Reads DATABASE_URL from environment variables.
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase')
    ? { rejectUnauthorized: false }
    : undefined,
});

export const db = drizzle(pool);
