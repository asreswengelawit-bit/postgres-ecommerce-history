const Order = require('../models/Order');

/**
 * Submit a customer order checkout
 */
exports.createOrder = async (req, res, next) => {
  const { shippingAddress, contactNumber, items } = req.body;
  const customerId = req.user.id;

  try {
    // 1. Validation
    if (!shippingAddress || !contactNumber || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order request. Missing shipping address, contact number, or checkout items.',
      });
    }

    // Validate structure of individual checkout items
    for (const item of items) {
      if (!item.productId || !item.quantity || parseInt(item.quantity, 10) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid item entries. Check product id and quantity values.',
        });
      }
    }

    // 2. Perform order transactional booking
    const order = await Order.create(
      customerId,
      shippingAddress,
      contactNumber,
      items.map(item => ({
        productId: parseInt(item.productId, 10),
        quantity: parseInt(item.quantity, 10),
      }))
    );

    res.status(201).json({
      success: true,
      message: 'Order placed successfully.',
      order,
    });
  } catch (err) {
    // Handle specific errors such as product stock out with standard client feedback
    if (err.message.includes('Insufficient stock') || err.message.includes('not found')) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
};

/**
 * Fetch all orders for the current customer
 */
exports.getCustomerOrders = async (req, res, next) => {
  try {
    const orders = await Order.findByCustomerId(req.user.id);
    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Fetch all order items assigned to the current vendor
 */
exports.getVendorOrders = async (req, res, next) => {
  const vendorId = req.user.vendorId;

  try {
    if (!vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. User is not registered as a store vendor.',
      });
    }

    const orderItems = await Order.findByVendorId(vendorId);
    res.status(200).json({
      success: true,
      count: orderItems.length,
      orderItems,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update individual order item shipment status (Vendor action)
 */
exports.updateOrderItemStatus = async (req, res, next) => {
  const orderItemId = parseInt(req.params.id, 10);
  const { status, description } = req.body;
  const vendorId = req.user.vendorId;

  try {
    if (!vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Only vendors can update order items.',
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Please provide the new tracking status.',
      });
    }

    const allowedStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tracking status choice.',
      });
    }

    const updatedItem = await Order.updateItemStatus(
      orderItemId,
      vendorId,
      status,
      description
    );

    res.status(200).json({
      success: true,
      message: 'Item status and tracking log updated successfully.',
      orderItem: updatedItem,
    });
  } catch (err) {
    if (err.message.includes('not found') || err.message.includes('authorized')) {
      return res.status(403).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
};

/**
 * Retrieve tracking timeline for an order item
 */
exports.getOrderItemTracking = async (req, res, next) => {
  const orderItemId = parseInt(req.params.id, 10);

  try {
    const tracking = await Order.getTrackingHistory(orderItemId);
    if (tracking.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No tracking information found for this item.',
      });
    }

    res.status(200).json({
      success: true,
      tracking,
    });
  } catch (err) {
    next(err);
  }
};
