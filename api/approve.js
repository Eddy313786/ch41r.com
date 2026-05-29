const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
const bcrypt = require('bcryptjs');
const { randomBytes } = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);
const resend = new Resend(process.env.RESEND_API_KEY);

function generatePassword() {
  return randomBytes(10).toString('base64').replace(/[+/=]/g, '').slice(0, 12);
}

module.exports = async function handler(req, res) {
  const { token } = req.query;
  if (!token) return res.status(400).send('Invalid link');

  const { data: request } = await supabase
    .from('pending_requests')
    .select('*')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (!request) return res.status(400).send('Link expired or already used.');

  const password = generatePassword();
  const passwordHash = await bcrypt.hash(password, 10);

  await supabase.from('users').insert({ username: request.email, password_hash: passwordHash });
  await supabase.from('pending_requests').delete().eq('token', token);

  await resend.emails.send({
    from: 'hello@ch41r.com',
    to: request.email,
    subject: 'Your ch41r.com access',
    html: `
      <p>Your access to ch41r.com has been approved.</p>
      <br>
      <p><strong>Username:</strong> ${request.email}</p>
      <p><strong>Password:</strong> ${password}</p>
      <br>
      <a href="https://ch41r.com" style="display:inline-block;padding:12px 24px;background:#1a1a1a;color:#fff;text-decoration:none;border-radius:8px;font-family:sans-serif;">
        Log in
      </a>
      <p style="color:#999;font-size:12px;margin-top:16px;">Please change your password after first login.</p>
    `
  });

  res.status(200).send(`
    <html><body style="font-family:sans-serif;text-align:center;padding:60px;color:#1a1a1a;">
      <h2>✓ Access granted</h2>
      <p>${request.email} has received their login credentials.</p>
    </body></html>
  `);
};
