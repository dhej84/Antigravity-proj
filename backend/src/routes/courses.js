const router = require('express').Router();
const { pool, withTransaction } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
router.get('/', asyncHandler(async (req, res) => {
  const { track, level } = req.query;
  let query = `SELECT id, title, track, level, total_modules, duration_hours, is_free, price_paise, original_price_paise FROM courses WHERE 1=1`;
  const params = [];
  if (track) { params.push(track); query += ` AND track=$${params.length}`; }
  if (level) { params.push(level); query += ` AND level=$${params.length}`; }
  query += ' ORDER BY is_free DESC, created_at';
  const { rows } = await pool.query(query, params);
  res.json(rows);
}));
router.get('/enrolled/me', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT e.id AS enrollment_id, e.enrolled_at, e.completed_at, c.id AS course_id, c.title, c.track, c.level, c.total_modules, c.duration_hours, COUNT(mp.id) AS modules_done
     FROM enrollments e JOIN courses c ON c.id=e.course_id LEFT JOIN module_progress mp ON mp.user_id=e.user_id AND mp.course_id=e.course_id
     WHERE e.user_id=$1 GROUP BY e.id, c.id ORDER BY e.enrolled_at DESC`, [req.user.id]);
  res.json(rows);
}));
router.get('/:id', asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM courses WHERE id=$1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Course not found' });
  res.json(rows[0]);
}));
router.post('/:id/enroll', authenticate, asyncHandler(async (req, res) => {
  const courseId = req.params.id;
  const { rows: courseRows } = await pool.query('SELECT id, is_free, price_paise FROM courses WHERE id=$1', [courseId]);
  if (!courseRows.length) return res.status(404).json({ error: 'Course not found' });
  const course = courseRows[0];
  if (!course.is_free && !['pro','lifetime'].includes(req.user.plan)) {
    const { rows: payRows } = await pool.query(`SELECT id FROM payments WHERE user_id=$1 AND course_id=$2 AND status='paid'`, [req.user.id, courseId]);
    if (!payRows.length) return res.status(403).json({ error: 'Purchase required', course_id: courseId, price_paise: course.price_paise });
  }
  const { rows } = await pool.query(
    `INSERT INTO enrollments (user_id, course_id) VALUES ($1,$2) ON CONFLICT (user_id, course_id) DO NOTHING RETURNING *`,
    [req.user.id, courseId]);
  const already = rows.length === 0;
  res.status(already ? 200 : 201).json({ message: already ? 'Already enrolled' : 'Enrolled successfully', course_id: courseId });
}));
router.post('/:id/progress', authenticate, asyncHandler(async (req, res) => {
  const courseId = req.params.id;
  const { module_number } = req.body;
  if (!module_number || typeof module_number !== 'number' || module_number < 1) return res.status(400).json({ error: 'module_number must be a positive integer' });
  const { rows: enrollRows } = await pool.query(
    `SELECT e.id, c.total_modules FROM enrollments e JOIN courses c ON c.id=e.course_id WHERE e.user_id=$1 AND e.course_id=$2`,
    [req.user.id, courseId]);
  if (!enrollRows.length) return res.status(403).json({ error: 'Enroll in this course first' });
  const { id: enrollmentId, total_modules } = enrollRows[0];
  if (module_number > total_modules) return res.status(400).json({ error: `module_number exceeds total (${total_modules})` });
  await withTransaction(async (client) => {
    await client.query(`INSERT INTO module_progress (user_id, course_id, module_number) VALUES ($1,$2,$3) ON CONFLICT (user_id, course_id, module_number) DO NOTHING`, [req.user.id, courseId, module_number]);
    const { rows: countRows } = await client.query(`SELECT COUNT(*) AS done FROM module_progress WHERE user_id=$1 AND course_id=$2`, [req.user.id, courseId]);
    const done = parseInt(countRows[0].done, 10);
    if (done >= total_modules) {
      await client.query(`UPDATE enrollments SET completed_at=COALESCE(completed_at,NOW()) WHERE id=$1`, [enrollmentId]);
      const certNum = `UXL-${new Date().getFullYear()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
      await client.query(`INSERT INTO certificates (user_id, course_id, enrollment_id, certificate_number) VALUES ($1,$2,$3,$4) ON CONFLICT (user_id, course_id) DO NOTHING`, [req.user.id, courseId, enrollmentId, certNum]);
    }
  });
  const { rows } = await pool.query(`SELECT COUNT(*) AS modules_done FROM module_progress WHERE user_id=$1 AND course_id=$2`, [req.user.id, courseId]);
  res.json({ course_id: courseId, module_number, modules_done: parseInt(rows[0].modules_done,10), total_modules, completed: parseInt(rows[0].modules_done,10) >= total_modules });
}));
router.get('/:id/progress', authenticate, asyncHandler(async (req, res) => {
  const courseId = req.params.id;
  const { rows: enrollRows } = await pool.query(`SELECT e.enrolled_at, e.completed_at, c.total_modules FROM enrollments e JOIN courses c ON c.id=e.course_id WHERE e.user_id=$1 AND e.course_id=$2`, [req.user.id, courseId]);
  if (!enrollRows.length) return res.status(404).json({ error: 'Not enrolled' });
  const { rows: moduleRows } = await pool.query(`SELECT module_number, completed_at FROM module_progress WHERE user_id=$1 AND course_id=$2 ORDER BY module_number`, [req.user.id, courseId]);
  const enroll = enrollRows[0];
  res.json({ course_id: courseId, enrolled_at: enroll.enrolled_at, completed_at: enroll.completed_at, total_modules: enroll.total_modules, modules_done: moduleRows.length, completed_modules: moduleRows, percent: Math.round((moduleRows.length/enroll.total_modules)*100) });
}));
module.exports = router;
