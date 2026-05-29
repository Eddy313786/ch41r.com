const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async function handler(req, res) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/ch41r_session=([^;]+)/);
  if (!match) return res.status(401).json({ error: 'Not authenticated' });
  try { jwt.verify(match[1], process.env.JWT_SECRET); }
  catch { return res.status(401).json({ error: 'Invalid session' }); }

  const { date_from, date_to, fpt_source, domein } = req.query;

  const { data, error } = await supabase.rpc('get_dashboard_data', {
    p_date_from: date_from || null,
    p_date_to:   date_to   || null,
    p_source:    (fpt_source && fpt_source !== 'all') ? fpt_source : null,
    p_domein:    (domein     && domein     !== 'all') ? domein     : null,
  });

  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json(data);
};
