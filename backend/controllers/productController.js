const Product = require('../models/Product');

/**
 * Get all product listings with optional query filtering
 */
exports.getAllProducts = async (req, res, next) => {
  const { vendorId, search, minPrice, maxPrice } = req.query;

  try {
    const products = await Product.findAll({
      vendorId: vendorId ? parseInt(vendorId, 10) : null,
      search,
      minPrice: minPrice ? parseFloat(minPrice) : null,
      maxPrice: maxPrice ? parseFloat(maxPrice) : null,
    });

    res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Fetch a specific product by its ID
 */
exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(parseInt(req.params.id, 10));
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.status(200).json({
      success: true,
      product,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Create a new product listing (Vendor only)
 */
exports.createProduct = async (req, res, next) => {
  const { name, description, price, stock, imageUrl } = req.body;
  const vendorId = req.user.vendorId;

  try {
    // Validation
    if (!name || !price || stock === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide product name, price, and stock levels.',
      });
    }

    if (parseFloat(price) < 0 || parseInt(stock, 10) < 0) {
      return res.status(400).json({
        success: false,
        message: 'Price and stock levels cannot be negative.',
      });
    }

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Only registered vendors can add products.',
      });
    }

    const product = await Product.create(
      vendorId,
      name,
      description,
      parseFloat(price),
      parseInt(stock, 10),
      imageUrl
    );

    res.status(201).json({
      success: true,
      message: 'Product successfully created.',
      product,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing product (Vendor ownership verified)
 */
exports.updateProduct = async (req, res, next) => {
  const productId = parseInt(req.params.id, 10);
  const { name, description, price, stock, imageUrl } = req.body;
  const vendorId = req.user.vendorId;

  try {
    if (!vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Only vendors can update product listings.',
      });
    }

    // Retrieve original product first to verify existence and ownership
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    if (product.vendor_id !== vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not own this product listing.',
      });
    }

    // Input validation
    if (price !== undefined && parseFloat(price) < 0) {
      return res.status(400).json({ success: false, message: 'Price cannot be negative.' });
    }
    if (stock !== undefined && parseInt(stock, 10) < 0) {
      return res.status(400).json({ success: false, message: 'Stock levels cannot be negative.' });
    }

    const updatedProduct = await Product.update(
      productId,
      vendorId,
      name || product.name,
      description !== undefined ? description : product.description,
      price !== undefined ? parseFloat(price) : product.price,
      stock !== undefined ? parseInt(stock, 10) : product.stock,
      imageUrl !== undefined ? imageUrl : product.image_url
    );

    res.status(200).json({
      success: true,
      message: 'Product listing updated successfully.',
      product: updatedProduct,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Remove a product listing (Vendor ownership verified)
 */
exports.deleteProduct = async (req, res, next) => {
  const productId = parseInt(req.params.id, 10);
  const vendorId = req.user.vendorId;

  try {
    if (!vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Only vendors can delete products.',
      });
    }

    const deleted = await Product.delete(productId, vendorId);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or unauthorized to delete this product.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product listing deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};
