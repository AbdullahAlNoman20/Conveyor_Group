// server/middleware/auth.js
const jwt = require('jsonwebtoken');

const AUTH_HEADER_PREFIX = 'Bearer ';

const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith(AUTH_HEADER_PREFIX)) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = header.slice(AUTH_HEADER_PREFIX.length).trim();
  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  return next();
};

module.exports = { requireAuth, requireRole };