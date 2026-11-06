// Any request that didn't match a route.
export function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Central error handler. Express 5 forwards errors thrown in async route
// handlers here automatically, so the server never crashes on a bad request.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  // Body that isn't valid JSON, e.g. {"title": "oops",}
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON in request body' });
  }

  // Body over the 100kb limit set in server.js
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large (max 100kb)' });
  }

  // Other client errors raised by express.json() (bad charset, ...)
  if (err.expose && err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ error: err.message });
  }

  // Mongoose schema validation (backup for the checks in validation/)
  if (err.name === 'ValidationError') {
    const details = Object.fromEntries(
      Object.entries(err.errors).map(([field, e]) => [field, e.message])
    );
    return res.status(400).json({ error: 'Validation failed', details });
  }

  // A value Mongoose couldn't cast, e.g. a malformed ObjectId
  if (err.name === 'CastError') {
    return res.status(400).json({ error: `Invalid value for ${err.path}` });
  }

  // Unique index violation (two signups racing for the same email)
  if (err.code === 11000) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  // Anything else is our bug: log it, show a generic message in production.
  console.error(err);
  const body = { error: 'Internal server error' };
  if (process.env.NODE_ENV !== 'production') body.details = err.message;
  res.status(500).json(body);
}
