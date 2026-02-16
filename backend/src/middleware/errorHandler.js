const logger = require('../utils/logger');

function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal server error';

  logger.error(`[${req.method} ${req.path}] ${err.message}`, { stack: err.stack });

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && statusCode >= 500 && { stack: err.stack }),
  });
}

module.exports = errorHandler;
