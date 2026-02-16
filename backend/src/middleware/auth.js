const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { UnauthorizedError } = require('../utils/errors');

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or invalid token'));
  }
  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = { id: payload.userId, businessId: payload.businessId, role: payload.role };
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token'));
  }
}

module.exports = auth;
