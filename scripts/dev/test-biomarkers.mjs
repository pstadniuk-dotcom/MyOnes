import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });
import pg from 'pg';
const { Pool } = pg;

const userId = '907ad8a1-7db6-4b6c-8d69-d7fd5ad99454';
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

try {
  // All lab reports including deleted
  const { rows: allRows } = await pool.query(
    `SELECT id, original_file_name, type, deleted_at,
      lab_report_data->>'analysisStatus' as status,
      json_array_length(COALESCE(lab_report_data->'extractedData', '[]'::json)) as markers
    FROM file_uploads WHERE user_id = $1 AND type = 'lab_report'
    ORDER BY uploaded_at DESC`,
    [userId]
  );
  console.log('=== ALL Lab Reports (including deleted) ===');
  for (const r of allRows) {
    console.log(`  ${r.original_file_name}: status=${r.status}, markers=${r.markers}, deleted=${r.deleted_at || 'no'}`);
  }

  // Fix: set pending report with data to completed, and undelete the other
  for (const r of allRows) {
    if (r.status === 'pending' && parseInt(r.markers) > 0 && !r.deleted_at) {
      await pool.query(
        `UPDATE file_uploads SET lab_report_data = (lab_report_data::jsonb || '{"analysisStatus": "completed"}'::jsonb)::json WHERE id = $1`,
        [r.id]
      );
      console.log(`\nFixed: Set "${r.original_file_name}" from pending → completed (${r.markers} markers already extracted)`);
    }
    if (r.deleted_at && r.status === 'completed' && parseInt(r.markers) > 0) {
      await pool.query(
        `UPDATE file_uploads SET deleted_at = NULL, deleted_by = NULL WHERE id = $1`,
        [r.id]
      );
      console.log(`Fixed: Undeleted "${r.original_file_name}" (${r.markers} markers)`);
    }
  }

  const rows = allRows.filter(r => !r.deleted_at);
  
  console.log('=== Lab Reports ===');
  for (const r of rows) {
    console.log(`  ${r.original_file_name}: status=${r.status}, markers=${r.markers}`);
  }

  // Check what the labs service would see
  const completed = rows.filter(r => r.status === 'completed' && parseInt(r.markers) > 0);
  console.log(`\nCompleted reports with data: ${completed.length}`);

  if (completed.length > 0) {
    // Get a sample of 3 markers from the first completed report
    const { rows: sample } = await pool.query(
      `SELECT 
        lab_report_data->'extractedData'->0 as m0,
        lab_report_data->'extractedData'->1 as m1,
        lab_report_data->'extractedData'->2 as m2
      FROM file_uploads WHERE id = $1`,
      [completed[0].id]
    );
    console.log('\nSample markers:');
    for (const m of [sample[0].m0, sample[0].m1, sample[0].m2]) {
      if (m) console.log(`  ${JSON.stringify(m)}`);
    }
  }
} catch (e) {
  console.error('Error:', e.message);
} finally {
  await pool.end();
}
