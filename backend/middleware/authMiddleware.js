const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'ecommerce_secret_key_change_in_production';

/**
 * Middleware to authenticate requests via JWT tokens passed in the Authorization header
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  
  // Format: "Bearer TOKEN"
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access Denied. No token provided.',
    });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token.',
      });
    }

    // Attach decoded user information to request
    req.user = decoded; // { id, name, email, role }
    next();
  });
}

/**
 * Middleware to enforce role-based access control (RBAC)
 * @param {Array<string>} roles - Array of permitted roles (e.g. ['vendor', 'admin'])
 */
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. User authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have permissions to perform this action.',
      });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  requireRole,
};
