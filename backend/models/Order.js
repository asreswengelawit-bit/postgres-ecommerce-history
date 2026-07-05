const db = require('../config/db');

class Order {
  /**
   * Create an order with multiple items from potentially different vendors.
   * Runs inside a single SQL transaction for safety and atomicity.
   */
  static async create(customerId, shippingAddress, contactNumber, items) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      let totalPrice = 0;
      const verifiedItems = [];

      // 1. Verify availability and prices of all products
      for (const item of items) {
        const productRes = await client.query(
          `SELECT p.*, v.id as vendor_id 
           FROM products p 
           JOIN vendors v ON p.vendor_id = v.id 
           WHERE p.id = $1 FOR UPDATE`, // Locks rows to prevent race conditions during purchase
          [item.productId]
        );

        const product = productRes.rows[0];
        if (!product) {
          throw new Error(`Product with ID ${item.productId} not found`);
        }

        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for product "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}`);
        }

        const itemTotal = parseFloat(product.price) * item.quantity;
        totalPrice += itemTotal;

        verifiedItems.push({
          productId: product.id,
          vendorId: product.vendor_id,
          quantity: item.quantity,
          price: product.price,
          name: product.name,
        });

        // 2. Decrement stock levels
        await client.query(
          'UPDATE products SET stock = stock - $1 WHERE id = $2',
          [item.quantity, product.id]
        );
      }

      // 3. Create the parent Order record
      const orderRes = await client.query(
        `INSERT INTO orders (customer_id, total_price, shipping_address, contact_number)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [customerId, totalPrice, shippingAddress.trim(), contactNumber.trim()]
      );
      const order = orderRes.rows[0];

      // 4. Create the child Order Items and initial tracking records
      for (const item of verifiedItems) {
        const itemRes = await client.query(
          `INSERT INTO order_items (order_id, product_id, vendor_id, quantity, price, status)
           VALUES ($1, $2, $3, $4, $5, 'Pending')
           RETURNING *`,
          [order.id, item.productId, item.vendorId, item.quantity, item.price]
        );
        const orderItem = itemRes.rows[0];

        // Add initial tracking status
        await client.query(
          `INSERT INTO order_tracking (order_id, order_item_id, status, description)
           VALUES ($1, $2, 'Order Placed', $3)`,
          [order.id, orderItem.id, `Order placed for item "${item.name}" (Qty: ${item.quantity}). Pending vendor review.`]
        );
      }

      await client.query('COMMIT');
      return order;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Fetch all orders placed by a customer with their details
   */
  static async findByCustomerId(customerId) {
    const query = `
      SELECT o.*, 
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'order_item_id', oi.id,
            'product_id', oi.product_id,
            'product_name', p.name,
            'image_url', p.image_url,
            'quantity', oi.quantity,
            'price', oi.price,
            'status', oi.status,
            'store_name', v.store_name
          )
        ) as items
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN vendors v ON oi.vendor_id = v.id
      WHERE o.customer_id = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `;
    const result = await db.query(query, [customerId]);
    return result.rows;
  }

  /**
   * Fetch all order items assigned to a vendor for fulfillment
   */
  static async findByVendorId(vendorId) {
    const query = `
      SELECT oi.id as order_item_id, oi.order_id, oi.quantity, oi.price, oi.status,
             o.created_at, o.shipping_address, o.contact_number,
             p.name as product_name, p.image_url,
             u.name as customer_name
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      JOIN users u ON o.customer_id = u.id
      WHERE oi.vendor_id = $1
      ORDER BY o.created_at DESC
    `;
    const result = await db.query(query, [vendorId]);
    return result.rows;
  }

  /**
   * Update the status of an order item (vendor action, restricted to vendor's items)
   */
  static async updateItemStatus(orderItemId, vendorId, newStatus, description) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Check ownership
      const checkRes = await client.query(
        `SELECT oi.*, p.name as product_name 
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id 
         WHERE oi.id = $1 AND oi.vendor_id = $2`,
        [orderItemId, vendorId]
      );

      const orderItem = checkRes.rows[0];
      if (!orderItem) {
        throw new Error('Order item not found or you are not authorized to manage it.');
      }

      // Update status
      const updateRes = await client.query(
        `UPDATE order_items 
         SET status = $1 
         WHERE id = $2 
         RETURNING *`,
        [newStatus, orderItemId]
      );

      // Add tracking event
      const defaultDesc = `Order item status changed to ${newStatus}.`;
      await client.query(
        `INSERT INTO order_tracking (order_id, order_item_id, status, description)
         VALUES ($1, $2, $3, $4)`,
        [orderItem.order_id, orderItemId, newStatus, description || defaultDesc]
      );

      await client.query('COMMIT');
      return updateRes.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get historical tracking logs for a specific order item
   */
  static async getTrackingHistory(orderItemId) {
    const query = `
      SELECT ot.*, p.name as product_name, oi.status as current_status
      FROM order_tracking ot
      JOIN order_items oi ON ot.order_item_id = oi.id
      JOIN products p ON oi.product_id = p.id
      WHERE ot.order_item_id = $1
      ORDER BY ot.created_at DESC
    `;
    const result = await db.query(query, [orderItemId]);
    return result.rows;
  }
}

module.exports = Order;
