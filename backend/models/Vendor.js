const db = require('../config/db');

class Vendor {
  /**
   * Find a vendor profile by vendor table ID
   */
  static async findById(id) {
    const query = `
      SELECT v.*, u.name as owner_name, u.email as owner_email
      FROM vendors v
      JOIN users u ON v.user_id = u.id
      WHERE v.id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Find a vendor profile by user_id
   */
  static async findByUserId(userId) {
    const query = 'SELECT * FROM vendors WHERE user_id = $1';
    const result = await db.query(query, [userId]);
    return result.rows[0];
  }

  /**
   * Create a new vendor profile
   */
  static async create(userId, storeName, storeDescription) {
    const query = `
      INSERT INTO vendors (user_id, store_name, store_description)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const values = [userId, storeName.trim(), storeDescription ? storeDescription.trim() : null];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Get store dashboard analytics for a vendor (e.g., total sales, orders, stock level)
   */
  static async getStoreStats(vendorId) {
    // 1. Total revenue (completed or shipped orders)
    const revenueQuery = `
      SELECT COALESCE(SUM(quantity * price), 0) as total_revenue
      FROM order_items
      WHERE vendor_id = $1 AND status != 'Cancelled'
    `;

    // 2. Sales by item status
    const orderStatusQuery = `
      SELECT status, COUNT(*) as count
      FROM order_items
      WHERE vendor_id = $1
      GROUP BY status
    `;

    // 3. Top products by quantity sold
    const topProductsQuery = `
      SELECT p.name, SUM(oi.quantity) as units_sold, SUM(oi.quantity * oi.price) as revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.vendor_id = $1 AND oi.status != 'Cancelled'
      GROUP BY p.name
      ORDER BY units_sold DESC
      LIMIT 5
    `;

    // 4. Low stock inventory items
    const lowStockQuery = `
      SELECT name, stock, price
      FROM products
      WHERE vendor_id = $1 AND stock < 10
      ORDER BY stock ASC
    `;

    const [revenueRes, statusRes, topRes, lowRes] = await Promise.all([
      db.query(revenueQuery, [vendorId]),
      db.query(orderStatusQuery, [vendorId]),
      db.query(topProductsQuery, [vendorId]),
      db.query(lowStockQuery, [vendorId])
    ]);

    return {
      revenue: parseFloat(revenueRes.rows[0].total_revenue),
      statusCounts: statusRes.rows,
      topProducts: topRes.rows.map(p => ({
        name: p.name,
        units_sold: parseInt(p.units_sold, 10),
        revenue: parseFloat(p.revenue),
      })),
      lowStock: lowRes.rows,
    };
  }
}

module.exports = Vendor;
