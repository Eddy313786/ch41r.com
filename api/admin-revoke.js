const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const ADMIN = 'ward.cecat@icloud.com';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/ch41r_session=([^;]+)/);
  if (!match) return res.status(401).json({ error: 'Not authenticated' });
  let payload;
  try { payload = jwt.verify(match[1], process.env.JWT_SECRET); }
  catch { return res.status(401).json({ error: 'Invalid session' }); }
  if (payload.username !== ADMIN) return res.status(403).json({ error: 'Forbidden' });

  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'Missing id' });

  await supabase.from('users').delete().eq('id', id);
  res.status(200).json({ success: true });
};
