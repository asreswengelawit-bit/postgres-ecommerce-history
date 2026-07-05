const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

// Customer checkout actions
router.post('/', authenticateToken, requireRole(['customer']), orderController.createOrder);
router.get('/customer', authenticateToken, requireRole(['customer']), orderController.getCustomerOrders);

// Vendor order management
router.get('/vendor', authenticateToken, requireRole(['vendor']), orderController.getVendorOrders);
router.put('/item/:id/status', authenticateToken, requireRole(['vendor']), orderController.updateOrderItemStatus);

// Tracking timeline (accessible by customers to track progress)
router.get('/item/:id/tracking', orderController.getOrderItemTracking);

module.exports = router;
