const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

// Public catalog routes
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);

// Protected vendor actions
router.post('/', authenticateToken, requireRole(['vendor']), productController.createProduct);
router.put('/:id', authenticateToken, requireRole(['vendor']), productController.updateProduct);
router.delete('/:id', authenticateToken, requireRole(['vendor']), productController.deleteProduct);

module.exports = router;
