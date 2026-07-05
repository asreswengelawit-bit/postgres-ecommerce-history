const db = require('../config/db');

class User {
  /**
   * Find a user by their email address (useful for logins)
   */
  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await db.query(query, [email.toLowerCase().trim()]);
    return result.rows[0];
  }

  /**
   * Find a user by their unique primary key id
   */
  static async findById(id) {
    const query = 'SELECT id, name, email, role, created_at FROM users WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Insert a new user into the database securely with parameterized arguments
   */
  static async create(name, email, passwordHash, role = 'customer') {
    const query = `
      INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, role, created_at;
    `;
    const values = [name.trim(), email.toLowerCase().trim(), passwordHash, role];
    const result = await db.query(query, values);
    return result.rows[0];
  }
}

module.exports = User;
