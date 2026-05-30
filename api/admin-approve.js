const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Resend } = require('resend');
const { randomBytes } = require('crypto');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN = 'ward@ch41r.com';

function generatePassword() {
  return randomBytes(10).toString('base64').replace(/[+/=]/g, '').slice(0, 12);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/ch41r_session=([^;]+)/);
  if (!match) return res.status(401).json({ error: 'Not authenticated' });
  let payload;
  try { payload = jwt.verify(match[1], process.env.JWT_SECRET); }
  catch { return res.status(401).json({ error: 'Invalid session' }); }
  if (payload.username !== ADMIN) return res.status(403).json({ error: 'Forbidden' });

  const { id, email } = req.body;
  if (!id || !email) return res.status(400).json({ error: 'Missing fields' });

  // Check not already a user
  const { data: existing } = await supabase.from('users').select('id').eq('username', email).single();
  if (existing) {
    await supabase.from('pending_requests').delete().eq('id', id);
    return res.status(200).json({ success: true, note: 'Already a user' });
  }

  const password = generatePassword().trim();
  const passwordHash = await bcrypt.hash(password, 10);

  await supabase.from('users').insert({ username: email, password_hash: passwordHash });
  await supabase.from('pending_requests').delete().eq('id', id);

  try {
    await resend.emails.send({
      from: 'hello@ch41r.com',
      to: email,
      subject: 'Your CH41R access',
      html: `
        <p>Your access to ch41r.com has been approved.</p>
        <br>
        <p><strong>Username:</strong> <span style="user-select:all;">${email.replace('@','&#64;')}</span></p>
        <p><strong>Password:</strong></p>
        <p style="font-family:monospace;font-size:18px;letter-spacing:2px;background:#f0f2f5;padding:10px 16px;border-radius:8px;display:inline-block;user-select:all;">${password.trim()}</p>
        <p style="font-size:12px;color:#9ca3af;">Type this password manually — do not copy/paste to avoid invisible characters.</p>
        <br>
        <a href="https://ch41r.com" style="display:inline-block;padding:12px 24px;background:#0d9488;color:#fff;text-decoration:none;border-radius:8px;">Log in</a>
      `
    });
  } catch(e) { console.error('Email error:', e); }

  res.status(200).json({ success: true, email, password });
};
