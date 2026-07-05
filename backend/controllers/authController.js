const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const db = require('../config/db');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'ecommerce_secret_key_change_in_production';

/**
 * Register a new user (Customer, Vendor, or Admin)
 */
exports.register = async (req, res, next) => {
  const { name, email, password, role, storeName, storeDescription } = req.body;

  try {
    // 1. Validation checks
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and password.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const allowedRoles = ['customer', 'vendor'];
    const chosenRole = role || 'customer';
    if (!allowedRoles.includes(chosenRole)) {
      return res.status(400).json({ success: false, message: 'Invalid role selection.' });
    }

    // Special verification for vendor registration
    if (chosenRole === 'vendor' && (!storeName || storeName.trim() === '')) {
      return res.status(400).json({ success: false, message: 'Vendors must provide a store name.' });
    }

    // Check if email already registered
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'A user with this email address already exists.' });
    }

    // 2. Hash Password and insert inside transaction
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    let newUser;
    let newVendor = null;

    const connection = await db.pool.connect();
    try {
      await connection.query('BEGIN');
      
      // Insert User record
      const userRes = await connection.query(`
        INSERT INTO users (name, email, password_hash, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, email, role, created_at;
      `, [name.trim(), email.toLowerCase().trim(), passwordHash, chosenRole]);
      newUser = userRes.rows[0];

      // If registering as vendor, create associated vendor profile
      if (chosenRole === 'vendor') {
        const vendorRes = await connection.query(`
          INSERT INTO vendors (user_id, store_name, store_description)
          VALUES ($1, $2, $3)
          RETURNING id, store_name, store_description;
        `, [newUser.id, storeName.trim(), storeDescription ? storeDescription.trim() : null]);
        newVendor = vendorRes.rows[0];
      }

      await connection.query('COMMIT');
    } catch (transactionErr) {
      await connection.query('ROLLBACK');
      throw transactionErr;
    } finally {
      connection.release();
    }

    // 3. Generate token payload
    const tokenPayload = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      vendorId: newVendor ? newVendor.id : null,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '2h' });

    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        storeName: newVendor ? newVendor.store_name : null,
      },
    });

  } catch (err) {
    next(err);
  }
};

/**
 * Log in a registered user
 */
exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password.' });
    }

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Check if user is vendor and fetch profile
    let vendorId = null;
    let storeName = null;
    if (user.role === 'vendor') {
      const vendor = await Vendor.findByUserId(user.id);
      if (vendor) {
        vendorId = vendor.id;
        storeName = vendor.store_name;
      }
    }

    // Sign token
    const tokenPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      vendorId,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '2h' });

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        storeName,
      },
    });

  } catch (err) {
    next(err);
  }
};

/**
 * Get authenticated user profile details
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found.' });
    }

    let storeName = null;
    if (user.role === 'vendor') {
      const vendor = await Vendor.findByUserId(user.id);
      storeName = vendor ? vendor.store_name : null;
    }

    res.status(200).json({
      success: true,
      user: {
        ...user,
        storeName,
      },
    });
  } catch (err) {
    next(err);
  }
};
