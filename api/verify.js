const jwt = require('jsonwebtoken');

module.exports = async function handler(req, res) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/ch41r_session=([^;]+)/);
  if (!match) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const payload = jwt.verify(match[1], process.env.JWT_SECRET);
    res.status(200).json({ username: payload.username });
  } catch {
    res.status(401).json({ error: 'Invalid session' });
  }
};
