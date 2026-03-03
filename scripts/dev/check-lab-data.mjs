import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

const userId = '907ad8a1-7db6-4b6c-8d69-d7fd5ad99454';
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

try {
  // Check lab reports
  // Check types
  const { rows: typeRows } = await pool.query(
    `SELECT id, type, original_file_name FROM file_uploads WHERE user_id = $1 ORDER BY uploaded_at DESC`,
    [userId]
  );
  console.log('\n=== File types ===');
  console.log(JSON.stringify(typeRows, null, 2));

  const { rows } = await pool.query(
    `SELECT id, original_file_name, mime_type, 
      lab_report_data->>'analysisStatus' as status,
      lab_report_data->>'testDate' as test_date,
      lab_report_data->>'overallAssessment' as overall_assessment
    FROM file_uploads WHERE user_id = $1 AND type = 'lab_report' ORDER BY uploaded_at DESC`,
    [userId]
  );
  
  console.log('=== Lab Reports ===');
  console.log(JSON.stringify(rows, null, 2));
  
  // Fix stuck processing report
  const stuckReports = rows.filter(r => r.status === 'processing');
  if (stuckReports.length > 0) {
    console.log('\n=== Fixing stuck processing reports ===');
    for (const stuck of stuckReports) {
      await pool.query(
        `UPDATE file_uploads SET lab_report_data = (lab_report_data::jsonb || '{"analysisStatus": "pending"}'::jsonb)::json WHERE id = $1`,
        [stuck.id]
      );
      console.log('Reset', stuck.original_file_name, 'to pending (will auto-reanalyze on page load)');
    }
  }
  if (rows.length > 0) {
    const completedId = rows.find(r => r.status === 'completed')?.id || rows[0].id;
    const { rows: countData } = await pool.query(
      `SELECT json_array_length(lab_report_data::json->'extractedData') as marker_count
       FROM file_uploads WHERE id = $1`,
      [completedId]
    );
    console.log('\n=== Marker count from completed report ===');
    console.log(JSON.stringify(countData, null, 2));

    const { rows: sampleData } = await pool.query(
      `SELECT lab_report_data->'extractedData'->0 as first_marker,
              lab_report_data->'extractedData'->1 as second_marker
       FROM file_uploads WHERE id = $1`,
      [completedId]
    );
    console.log('\n=== Sample markers from latest report ===');
    console.log(JSON.stringify(sampleData, null, 2));
  }
} catch (e) {
  console.error('Error:', e.message);
} finally {
  await pool.end();
}
