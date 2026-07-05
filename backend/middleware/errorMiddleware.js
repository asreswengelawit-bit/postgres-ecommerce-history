const logger = require('../config/logger');

/**
 * Centrally managed error handling middleware to sanitize outgoing server responses
 * and log errors internally without exposing stack traces.
 */
function errorHandler(err, req, res, next) {
  // Log the complete error signature internally
  logger.error(`Unhandled error during request [${req.method}] ${req.originalUrl}:`, err);

  // Default to 500 Internal Server Error
  const statusCode = err.status || err.statusCode || 500;
  
  // Return sanitized response
  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? 'An unexpected server error occurred. Please contact administrator.' : err.message,
    // Only share detailed logs during development, omit in production environments
    error: process.env.NODE_ENV !== 'production' ? err.message : undefined,
  });
}

module.exports = errorHandler;
