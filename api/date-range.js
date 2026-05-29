const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async function handler(req, res) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/ch41r_session=([^;]+)/);
  if (!match) return res.status(401).json({ error: 'Not authenticated' });
  try { jwt.verify(match[1], process.env.JWT_SECRET); }
  catch { return res.status(401).json({ error: 'Invalid session' }); }

  const { data, error } = await supabase.rpc('get_date_range');
  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json(data);
};
