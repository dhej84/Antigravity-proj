const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
async function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Authorization token required' });
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await pool.query('SELECT id, name, email, plan FROM users WHERE id = $1', [payload.sub]);
    if (!rows.length) return res.status(401).json({ error: 'User no longer exists' });
    req.user = rows[0]; next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expired' });
    return res.status(401).json({ error: 'Invalid token' });
  }
}
function requirePaidPlan(req, res, next) {
  if (!['pro', 'lifetime'].includes(req.user.plan)) return res.status(403).json({ error: 'Requires Pro or Lifetime plan' });
  next();
}
module.exports = { authenticate, requirePaidPlan };
