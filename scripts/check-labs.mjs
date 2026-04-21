import 'dotenv/config';
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  await client.connect();

  const { rows } = await client.query(
    `SELECT id, original_file_name, mime_type, uploaded_at, lab_report_data, object_path
     FROM file_uploads
     WHERE type = 'lab_report'
     ORDER BY uploaded_at DESC
     LIMIT 10`
  );

  if (rows.length === 0) {
    console.log('No lab reports found in DB.');
  } else {
    console.log(`Found ${rows.length} lab report(s):\n`);
    for (const row of rows) {
      const d = row.lab_report_data || {};
      const markerCount = Array.isArray(d.extractedData) ? d.extractedData.length : 0;
      console.log(`  File:    ${row.original_file_name}`);
      console.log(`  Status:  ${d.analysisStatus || 'NULL (never analyzed)'}`);
      console.log(`  Markers: ${markerCount}`);
      console.log(`  Path:    ${row.object_path}`);
      console.log(`  Uploaded:${row.uploaded_at}`);
      console.log('');
    }
  }

  await client.end();
}

run().catch(e => { console.error(e.message); process.exit(1); });
