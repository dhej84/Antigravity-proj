const router = require('express').Router();
const { pool } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
router.get('/my-code', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.referral_code, COUNT(rr.id) AS total_referrals, COUNT(rr.id) FILTER (WHERE p.status='paid') AS paid_conversions
     FROM users u LEFT JOIN referral_rewards rr ON rr.referrer_id=u.id LEFT JOIN payments p ON p.id=rr.payment_id
     WHERE u.id=$1 GROUP BY u.referral_code`, [req.user.id]);
  res.json({ referral_code: rows[0].referral_code, total_referrals: parseInt(rows[0].total_referrals||0,10), paid_conversions: parseInt(rows[0].paid_conversions||0,10), share_url: `${process.env.FRONTEND_URL}?ref=${rows[0].referral_code}` });
}));
router.get('/who-i-referred', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT rr.referred_user_id, u.name AS referred_name, u.created_at AS joined_at, p.status AS payment_status, p.amount_paise, rr.rewarded_at
     FROM referral_rewards rr JOIN users u ON u.id=rr.referred_user_id JOIN payments p ON p.id=rr.payment_id
     WHERE rr.referrer_id=$1 ORDER BY rr.rewarded_at DESC`, [req.user.id]);
  res.json(rows);
}));
router.post('/validate-promo', authenticate, asyncHandler(async (req, res) => {
  const { code, amount_paise } = req.body;
  if (!code) return res.status(400).json({ error: 'code required' });
  const { rows } = await pool.query(
    `SELECT * FROM promo_codes WHERE code=$1 AND (valid_until IS NULL OR valid_until>NOW()) AND (max_uses IS NULL OR current_uses<max_uses)`,
    [code.toUpperCase()]);
  if (!rows.length) return res.status(400).json({ valid: false, error: 'Invalid or expired promo code' });
  const promo = rows[0];
  const discountPaise = amount_paise ? Math.floor(amount_paise * promo.discount_percent / 100) : null;
  res.json({ valid: true, code: promo.code, discount_percent: promo.discount_percent, discount_paise: discountPaise, final_paise: amount_paise ? Math.max(amount_paise-discountPaise,100) : null });
}));
module.exports = router;
