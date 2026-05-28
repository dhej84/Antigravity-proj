const router = require('express').Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { pool, withTransaction } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
const PLAN_PRICES = { pro: 49900, lifetime: 399900 };
router.get('/plans', (_req, res) => res.json({ free: { price_paise: 0, label: 'Free Starter' }, pro: { price_paise: 49900, label: 'Pro — ?499/month' }, lifetime: { price_paise: 399900, label: 'Lifetime — ?3,999' } }));
router.post('/create-order', authenticate, asyncHandler(async (req, res) => {
  const { type, plan, course_id, promo_code } = req.body;
  if (!['plan','course'].includes(type)) return res.status(400).json({ error: "type must be 'plan' or 'course'" });
  let baseAmountPaise = 0;
  if (type === 'plan') {
    if (!PLAN_PRICES[plan]) return res.status(400).json({ error: "plan must be 'pro' or 'lifetime'" });
    if (req.user.plan === 'lifetime') return res.status(400).json({ error: 'Already on Lifetime plan' });
    baseAmountPaise = PLAN_PRICES[plan];
  } else {
    const { rows } = await pool.query('SELECT id, is_free, price_paise FROM courses WHERE id=$1', [course_id]);
    if (!rows.length) return res.status(404).json({ error: 'Course not found' });
    if (rows[0].is_free) return res.status(400).json({ error: 'Course is free — enroll directly' });
    baseAmountPaise = rows[0].price_paise;
  }
  let discountPaise = 0;
  if (promo_code) {
    const { rows: promoRows } = await pool.query(`SELECT * FROM promo_codes WHERE code=$1 AND (valid_until IS NULL OR valid_until>NOW()) AND (max_uses IS NULL OR current_uses<max_uses)`, [promo_code.toUpperCase()]);
    if (!promoRows.length) return res.status(400).json({ error: 'Invalid or expired promo code' });
    discountPaise = Math.floor(baseAmountPaise * promoRows[0].discount_percent / 100);
  }
  const finalAmount = Math.max(baseAmountPaise - discountPaise, 100);
  const rzpOrder = await razorpay.orders.create({ amount: finalAmount, currency: 'INR', notes: { user_id: req.user.id, type, plan: plan||null, course_id: course_id||null } });
  const { rows: payRows } = await pool.query(
    `INSERT INTO payments (user_id, razorpay_order_id, amount_paise, plan, course_id, promo_code_used, discount_paise, status) VALUES ($1,$2,$3,$4,$5,$6,$7,'created') RETURNING id`,
    [req.user.id, rzpOrder.id, finalAmount, plan||null, course_id||null, promo_code?promo_code.toUpperCase():null, discountPaise]);
  res.json({ order_id: rzpOrder.id, payment_db_id: payRows[0].id, amount_paise: finalAmount, currency: 'INR', discount_paise: discountPaise, key_id: process.env.RAZORPAY_KEY_ID });
}));
router.post('/verify', authenticate, asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return res.status(400).json({ error: 'All three Razorpay fields required' });
  const expectedSig = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
  if (expectedSig !== razorpay_signature) return res.status(400).json({ error: 'Signature mismatch' });
  await withTransaction(async (client) => {
    const { rows: payRows } = await client.query(`SELECT id, user_id, plan, course_id, status, promo_code_used FROM payments WHERE razorpay_order_id=$1 AND user_id=$2`, [razorpay_order_id, req.user.id]);
    if (!payRows.length) { const e = new Error('Payment not found'); e.status=404; e.expose=true; throw e; }
    const payment = payRows[0];
    if (payment.status === 'paid') return;
    await client.query(`UPDATE payments SET status='paid', razorpay_payment_id=$1, razorpay_signature=$2, paid_at=NOW() WHERE id=$3 AND status='created'`, [razorpay_payment_id, razorpay_signature, payment.id]);
    if (payment.plan) await client.query(`UPDATE users SET plan=$1 WHERE id=$2 AND (plan='free' OR (plan='pro' AND $1='lifetime'))`, [payment.plan, req.user.id]);
    if (payment.course_id) await client.query(`INSERT INTO enrollments (user_id, course_id) VALUES ($1,$2) ON CONFLICT (user_id, course_id) DO NOTHING`, [req.user.id, payment.course_id]);
    if (payment.promo_code_used) await client.query(`UPDATE promo_codes SET current_uses=current_uses+1 WHERE code=$1`, [payment.promo_code_used]);
    const { rows: refRows } = await client.query(`SELECT id FROM users WHERE referral_code=(SELECT referred_by_code FROM users WHERE id=$1)`, [req.user.id]);
    if (refRows.length) await client.query(`INSERT INTO referral_rewards (referrer_id, referred_user_id, payment_id) VALUES ($1,$2,$3) ON CONFLICT (payment_id) DO NOTHING`, [refRows[0].id, req.user.id, payment.id]);
  });
  res.json({ success: true, message: 'Payment verified and access granted' });
}));
router.post('/webhook', require('express').raw({ type: 'application/json' }), asyncHandler(async (req, res) => {
  const sig = req.headers['x-razorpay-signature'];
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(req.body).digest('hex');
  if (expected !== sig) return res.status(400).json({ error: 'Invalid webhook signature' });
  const event = JSON.parse(req.body.toString());
  if (event.event === 'payment.captured') {
    const p = event.payload.payment.entity;
    await pool.query(`UPDATE payments SET status='paid', razorpay_payment_id=$1, paid_at=NOW() WHERE razorpay_order_id=$2 AND status='created'`, [p.id, p.order_id]);
  }
  res.json({ received: true });
}));
router.get('/history', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(`SELECT p.id, p.razorpay_order_id, p.amount_paise, p.currency, p.plan, p.status, p.promo_code_used, p.discount_paise, p.created_at, p.paid_at, c.title AS course_title FROM payments p LEFT JOIN courses c ON c.id=p.course_id WHERE p.user_id=$1 ORDER BY p.created_at DESC`, [req.user.id]);
  res.json(rows);
}));
module.exports = router;
