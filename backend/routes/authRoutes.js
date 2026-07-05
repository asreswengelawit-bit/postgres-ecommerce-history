const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimitMiddleware');

// Public authentication routes (brute-force protected)
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);

// Protected profile route
router.get('/me', authenticateToken, authController.getMe);

module.exports = router;
