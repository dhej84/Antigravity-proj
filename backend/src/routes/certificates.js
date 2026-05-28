const router = require('express').Router();
const { pool } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT cert.id, cert.certificate_number, cert.issued_at, c.title AS course_title, c.track, c.level, u.name AS student_name
     FROM certificates cert JOIN courses c ON c.id=cert.course_id JOIN users u ON u.id=cert.user_id
     WHERE cert.user_id=$1 ORDER BY cert.issued_at DESC`, [req.user.id]);
  res.json(rows);
}));
router.get('/verify/:certNumber', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT cert.certificate_number, cert.issued_at, u.name AS student_name, c.title AS course_title, c.track, c.level
     FROM certificates cert JOIN users u ON u.id=cert.user_id JOIN courses c ON c.id=cert.course_id
     WHERE cert.certificate_number=$1`, [req.params.certNumber.toUpperCase()]);
  if (!rows.length) return res.status(404).json({ valid: false, error: 'Certificate not found' });
  res.json({ valid: true, certificate: rows[0] });
}));
module.exports = router;
