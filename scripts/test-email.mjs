import sgMail from '@sendgrid/mail';
import { readFileSync } from 'fs';

const env = readFileSync('server/.env', 'utf-8');
const key = env.match(/^SENDGRID_API_KEY=(.+)$/m)[1].trim();
const from = env.match(/^SENDGRID_FROM_EMAIL=(.+)$/m)[1].trim();

sgMail.setApiKey(key);

const to = process.argv[2] || 'pstadniuk@gmail.com';

console.log(`Sending test email to ${to} from ${from}...`);

try {
  const [res] = await sgMail.send({
    to,
    from: { email: from, name: 'ONES' },
    subject: 'ONES Platform - Test Email',
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:40px auto;padding:30px;border-radius:12px;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.08)">
        <h1 style="color:#004700;margin:0 0 16px">ONES</h1>
        <p style="color:#374151;font-size:15px;line-height:1.7">
          This is a test email from the ONES platform.<br><br>
          If you received this, your SendGrid integration is working correctly.
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
        <p style="color:#9ca3af;font-size:12px">Sent from ONES AI &bull; Personalized Supplements</p>
      </div>
    `,
  });
  console.log(`Email sent successfully! Status: ${res.statusCode}`);
} catch (err) {
  console.error('FAILED:', err.message);
  if (err.response) {
    console.error('Response:', JSON.stringify(err.response.body, null, 2));
  }
}
