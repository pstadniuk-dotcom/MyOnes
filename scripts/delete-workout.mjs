import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const userId = 'ccc783a5-1cf6-49e5-99d3-760d71e2434d';

const result = await pool.query(
  `DELETE FROM workout_logs WHERE user_id = $1 AND DATE(completed_at) = CURRENT_DATE`,
  [userId]
);

console.log('Deleted', result.rowCount, 'workout logs for today');

await pool.end();
