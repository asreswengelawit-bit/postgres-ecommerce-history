const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

// Get vendor dashboard analytics
router.get('/stats', authenticateToken, requireRole(['vendor']), vendorController.getDashboardStats);

module.exports = router;
