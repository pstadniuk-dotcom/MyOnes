import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const action = process.argv[2]; // 'check' or 'resend' or 'update-gmail'

try {
  if (action === 'resend') {
    // Reset all pitches sent via sendgrid back to 'approved' so they re-send
    const { rows: toReset } = await pool.query(`
      UPDATE outreach_pitches
      SET status = 'approved', sent_at = NULL, sent_via = NULL, follow_up_due_at = NULL
      WHERE status = 'sent' AND sent_via = 'sendgrid'
      RETURNING id, subject
    `);
    console.log(`Reset ${toReset.length} pitches to 'approved' for re-send:`);
    toReset.forEach(r => console.log(`  - ${r.id.substring(0,8)}: ${r.subject}`));
  } else if (action === 'update-gmail') {
    const token = process.argv[3];
    if (!token) { console.error('Usage: node check-pitches.mjs update-gmail <refresh_token>'); process.exit(1); }
    const config = JSON.stringify({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: token,
      encrypted: false,
    });
    const r = await pool.query(
      `UPDATE app_settings SET value = $1, updated_at = NOW() WHERE key = 'gmail_oauth_config'`,
      [config]
    );
    console.log(`Updated ${r.rowCount} row in app_settings`);
  } else {
    const { rows } = await pool.query(`
      SELECT p.id, p.status, p.sent_at, p.sent_via, p.subject, pr.contact_email, pr.name as prospect_name
      FROM outreach_pitches p
      JOIN outreach_prospects pr ON p.prospect_id = pr.id
      WHERE p.status IN ('sent', 'approved')
      ORDER BY COALESCE(p.sent_at, p.created_at) DESC
      LIMIT 15
    `);
    
    if (rows.length === 0) {
      console.log('No sent/approved pitches found.');
    } else {
      console.table(rows.map(r => ({
        id: r.id.substring(0, 8),
        status: r.status,
        sent_at: r.sent_at ? new Date(r.sent_at).toISOString() : null,
        sent_via: r.sent_via,
        to: r.contact_email,
        subject: (r.subject || '').substring(0, 40),
      })));
    }

    const { rows: counts } = await pool.query(`
      SELECT status, count(*) as count FROM outreach_pitches GROUP BY status ORDER BY count DESC
    `);
    console.log('\nPitch counts by status:');
    console.table(counts);
  }
} catch (err) {
  console.error('Query failed:', err.message);
} finally {
  await pool.end();
}
