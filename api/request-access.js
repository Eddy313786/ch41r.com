const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
const { randomUUID } = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);
const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  await supabase.from('pending_requests').insert({ email, token, expires_at: expiresAt });

  const approveUrl = `https://ch41r.com/api/approve?token=${token}`;

  await resend.emails.send({
    from: 'hello@ch41r.com',
    to: 'ward.cecat@icloud.com',
    subject: `Access request from ${email}`,
    html: `
      <p><strong>${email}</strong> is requesting access to ch41r.com.</p>
      <br>
      <a href="${approveUrl}" style="display:inline-block;padding:12px 24px;background:#1a1a1a;color:#fff;text-decoration:none;border-radius:8px;font-family:sans-serif;">
        Approve access
      </a>
      <p style="color:#999;font-size:12px;margin-top:16px;">This link expires in 48 hours.</p>
    `
  });

  res.status(200).json({ success: true });
};
