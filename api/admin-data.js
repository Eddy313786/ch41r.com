const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const ADMIN = 'ward.cecat@icloud.com';

module.exports = async function handler(req, res) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/ch41r_session=([^;]+)/);
  if (!match) return res.status(401).json({ error: 'Not authenticated' });
  let payload;
  try { payload = jwt.verify(match[1], process.env.JWT_SECRET); }
  catch { return res.status(401).json({ error: 'Invalid session' }); }
  if (payload.username !== ADMIN) return res.status(403).json({ error: 'Forbidden' });

  const [{ data: pending }, { data: users }] = await Promise.all([
    supabase.from('pending_requests').select('*').order('created_at', { ascending: false }),
    supabase.from('users').select('id, username, created_at').order('created_at', { ascending: false }),
  ]);

  res.status(200).json({ pending: pending || [], users: users || [] });
};
