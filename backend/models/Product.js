const db = require('../config/db');

class Product {
  /**
   * Find a single product with vendor store context
   */
  static async findById(id) {
    const query = `
      SELECT p.*, v.store_name, v.id as vendor_id
      FROM products p
      JOIN vendors v ON p.vendor_id = v.id
      WHERE p.id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Find all products matching optional search/filtering parameters
   * Supports name search, price filtering, and vendor filtering
   */
  static async findAll(filters = {}) {
    const { vendorId, search, minPrice, maxPrice } = filters;
    
    let query = `
      SELECT p.*, v.store_name
      FROM products p
      JOIN vendors v ON p.vendor_id = v.id
    `;
    
    const conditions = [];
    const values = [];

    if (vendorId) {
      values.push(vendorId);
      conditions.push(`p.vendor_id = $${values.length}`);
    }

    if (search) {
      values.push(`%${search.toLowerCase()}%`);
      conditions.push(`(LOWER(p.name) LIKE $${values.length} OR LOWER(p.description) LIKE $${values.length})`);
    }

    if (minPrice) {
      values.push(minPrice);
      conditions.push(`p.price >= $${values.length}`);
    }

    if (maxPrice) {
      values.push(maxPrice);
      conditions.push(`p.price <= $${values.length}`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY p.created_at DESC';

    const result = await db.query(query, values);
    return result.rows;
  }

  /**
   * Create a new product listing (Vendor only)
   */
  static async create(vendorId, name, description, price, stock, imageUrl) {
    const query = `
      INSERT INTO products (vendor_id, name, description, price, stock, image_url)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const values = [
      vendorId,
      name.trim(),
      description ? description.trim() : null,
      price,
      stock,
      imageUrl ? imageUrl.trim() : null
    ];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Update an existing product (Vendor only, ownership checked via vendorId)
   */
  static async update(id, vendorId, name, description, price, stock, imageUrl) {
    const query = `
      UPDATE products
      SET name = $1, description = $2, price = $3, stock = $4, image_url = $5
      WHERE id = $6 AND vendor_id = $7
      RETURNING *;
    `;
    const values = [
      name.trim(),
      description ? description.trim() : null,
      price,
      stock,
      imageUrl ? imageUrl.trim() : null,
      id,
      vendorId
    ];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Delete a product listing (Vendor only, ownership checked via vendorId)
   */
  static async delete(id, vendorId) {
    const query = 'DELETE FROM products WHERE id = $1 AND vendor_id = $2 RETURNING id';
    const result = await db.query(query, [id, vendorId]);
    return result.rowCount > 0;
  }
}

module.exports = Product;
