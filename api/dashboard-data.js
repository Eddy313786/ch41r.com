const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async function handler(req, res) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/ch41r_session=([^;]+)/);
  if (!match) return res.status(401).json({ error: 'Not authenticated' });
  try { jwt.verify(match[1], process.env.JWT_SECRET); }
  catch { return res.status(401).json({ error: 'Invalid session' }); }

  const params = {
    p_date_from: req.query.date_from || null,
    p_date_to:   req.query.date_to   || null,
    p_source:    (req.query.fpt_source && req.query.fpt_source !== 'all') ? req.query.fpt_source : null,
    p_domein:    (req.query.domein     && req.query.domein     !== 'all') ? req.query.domein     : null,
  };

  const [main, daily, sources] = await Promise.all([
    supabase.rpc('get_dashboard_data', params),
    supabase.rpc('get_daily',   params),
    supabase.rpc('get_sources', params),
  ]);

  if (main.error)    return res.status(500).json({ error: main.error.message });
  if (daily.error)   return res.status(500).json({ error: daily.error.message });
  if (sources.error) return res.status(500).json({ error: sources.error.message });

  res.status(200).json({
    ...main.data,
    daily:   daily.data   || [],
    sources: sources.data || [],
  });
};
