const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { Resend } = require('resend');
const { randomBytes } = require('crypto');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const username = (req.body.username || '').toLowerCase().trim();
  if (!username) return res.status(400).json({ error: 'Email required' });

  const { data: user } = await supabase.from('users').select('id').eq('username', username).single();

  // Always return success to avoid user enumeration
  if (!user) return res.status(200).json({ success: true });

  const password = randomBytes(10).toString('base64').replace(/[+\/=]/g, '').slice(0, 12).trim();
  const passwordHash = await bcrypt.hash(password, 10);

  await supabase.from('users').update({ password_hash: passwordHash }).eq('username', username);

  try {
    await resend.emails.send({
      from: 'hello@ch41r.com',
      to: username,
      subject: 'Your new CHAIR LAB password',
      html: `
        <p>Hi,</p>
        <p>You requested a new password for <strong>ch41r.com</strong>.</p>
        <p><strong>Username:</strong> <span style="font-family:monospace;">${username.replace('@','&#64;')}</span></p>
        <p><strong>New password:</strong></p>
        <p style="font-family:monospace;font-size:18px;letter-spacing:2px;background:#f0f2f5;padding:10px 16px;border-radius:8px;display:inline-block;">${password}</p>
        <p style="font-size:12px;color:#9ca3af;">Type this password manually — do not copy/paste to avoid invisible characters.</p>
        <br>
        <a href="https://ch41r.com" style="display:inline-block;padding:12px 24px;background:#0d9488;color:#fff;text-decoration:none;border-radius:8px;">Log in</a>
        <br><br>
        <p style="color:#6b7280;font-size:13px;">If you didn't request this, you can ignore this email.</p>
      `
    });
  } catch(e) { console.error('Email error:', e); }

  res.status(200).json({ success: true });
};
