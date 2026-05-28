const router = require('express').Router();
const { pool } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const uid = req.user.id;
  const { rows: userRows } = await pool.query('SELECT id, name, email, plan, referral_code, created_at FROM users WHERE id=$1', [uid]);
  const { rows: enrollRows } = await pool.query(
    `SELECT e.id AS enrollment_id, e.enrolled_at, e.completed_at, c.id AS course_id, c.title, c.track, c.level, c.total_modules, COUNT(mp.id) AS modules_done
     FROM enrollments e JOIN courses c ON c.id=e.course_id LEFT JOIN module_progress mp ON mp.user_id=e.user_id AND mp.course_id=e.course_id
     WHERE e.user_id=$1 GROUP BY e.id, c.id ORDER BY e.enrolled_at DESC`, [uid]);
  const { rows: certRows } = await pool.query(
    `SELECT cert.certificate_number, cert.issued_at, c.title AS course_title FROM certificates cert JOIN courses c ON c.id=cert.course_id WHERE cert.user_id=$1 ORDER BY cert.issued_at DESC`, [uid]);
  const { rows: refRows } = await pool.query(
    `SELECT COUNT(rr.id) AS total_referrals, COUNT(rr.id) FILTER (WHERE p.status='paid') AS converted_referrals
     FROM referral_rewards rr JOIN payments p ON p.id=rr.payment_id WHERE rr.referrer_id=$1`, [uid]);
  const { rows: payRows } = await pool.query(
    `SELECT p.id, p.amount_paise, p.status, p.paid_at, p.plan, c.title AS course_title FROM payments p LEFT JOIN courses c ON c.id=p.course_id WHERE p.user_id=$1 ORDER BY p.created_at DESC LIMIT 5`, [uid]);
  const totalEnrolled = enrollRows.length;
  const totalCompleted = enrollRows.filter(e => e.completed_at).length;
  res.json({
    user: userRows[0],
    stats: { enrolled: totalEnrolled, completed: totalCompleted, in_progress: totalEnrolled - totalCompleted, certificates: certRows.length,
      referrals: { total: parseInt(refRows[0]?.total_referrals||0,10), converted: parseInt(refRows[0]?.converted_referrals||0,10) } },
    enrollments: enrollRows.map(e => ({ ...e, modules_done: parseInt(e.modules_done,10), percent: Math.round((parseInt(e.modules_done,10)/e.total_modules)*100) })),
    certificates: certRows, recent_payments: payRows,
  });
}));
module.exports = router;
