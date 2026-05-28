function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
  if (err.code === '23505') return res.status(409).json({ error: 'Resource already exists', detail: err.detail });
  if (err.code === '23503') return res.status(400).json({ error: 'Referenced resource not found' });
  if (err.code === '23514') return res.status(400).json({ error: 'Value violates constraint', detail: err.detail });
  const status = err.status || 500;
  const message = err.expose ? err.message : 'Internal server error';
  res.status(status).json({ error: message });
}
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
module.exports = { errorHandler, asyncHandler };
