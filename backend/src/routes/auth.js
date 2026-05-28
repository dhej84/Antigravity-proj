const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
function signAccessToken(id) { return jwt.sign({ sub: id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }); }
function signRefreshToken(id) { return jwt.sign({ sub: id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }); }
function generateReferralCode(name) {
  const prefix = name.slice(0,3).toUpperCase().replace(/[^A-Z]/g,'X');
  return prefix + Math.random().toString(36).slice(2,7).toUpperCase();
}
router.post('/register', asyncHandler(async (req, res) => {
  const { name, email, password, promo_code } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password min 8 chars' });
  const passwordHash = await bcrypt.hash(password, 12);
  let referralCode = generateReferralCode(name);
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, referral_code, referred_by_code) VALUES ($1,$2,$3,$4,$5) RETURNING id, name, email, plan, referral_code`,
    [name.trim(), email.toLowerCase().trim(), passwordHash, referralCode, promo_code || null]
  );
  const user = rows[0];
  res.status(201).json({ user, access_token: signAccessToken(user.id), refresh_token: signRefreshToken(user.id) });
}));
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'Invalid email or password' });
  const { password_hash, ...safeUser } = user;
  res.json({ user: safeUser, access_token: signAccessToken(user.id), refresh_token: signRefreshToken(user.id) });
}));
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) return res.status(400).json({ error: 'refresh_token required' });
  let payload;
  try { payload = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET); } catch { return res.status(401).json({ error: 'Invalid or expired refresh token' }); }
  const { rows } = await pool.query('SELECT id FROM users WHERE id = $1', [payload.sub]);
  if (!rows.length) return res.status(401).json({ error: 'User not found' });
  res.json({ access_token: signAccessToken(payload.sub) });
}));
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT id, name, email, plan, referral_code, created_at FROM users WHERE id = $1', [req.user.id]);
  res.json(rows[0]);
}));
router.patch('/me', authenticate, asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const { rows } = await pool.query('UPDATE users SET name=$1 WHERE id=$2 RETURNING id, name, email, plan, referral_code', [name.trim(), req.user.id]);
  res.json(rows[0]);
}));
module.exports = router;
