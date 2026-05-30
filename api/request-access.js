const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
const { randomUUID } = require('crypto');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await supabase.from('pending_requests').insert({ email, token, expires_at: expiresAt });

  try {
    await resend.emails.send({
      from: 'hello@ch41r.com',
      to: 'ward.cecat@icloud.com',
      subject: `New access request: ${email}`,
      html: `
        <p><strong>${email}</strong> has requested access to ch41r.com.</p>
        <p>Log in to <a href="https://ch41r.com/Control">ch41r.com/Control</a> to approve or decline.</p>
      `
    });
  } catch(e) { console.error('Email error:', e); }

  res.status(200).json({ success: true });
};
