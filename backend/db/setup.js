const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const dbConfig = {
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'localhost',
  password: process.env.PGPASSWORD || 'postgres',
  port: parseInt(process.env.PGPORT || '5432', 10),
};

const targetDbName = process.env.PGDATABASE || 'ecommerce_db';

async function setupDatabase() {
  console.log('Starting database setup...');

  // Step 1: Connect to default postgres database to ensure target database exists
  console.log(`Connecting to temporary client to check/create database "${targetDbName}"...`);
  const tempClient = new Client({
    ...dbConfig,
    database: 'postgres', // connect to default db first
  });

  try {
    await tempClient.connect();
    
    // Check if target database exists
    const dbCheckRes = await tempClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [targetDbName]
    );

    if (dbCheckRes.rowCount === 0) {
      console.log(`Database "${targetDbName}" does not exist. Creating it now...`);
      // CREATE DATABASE cannot run in a transaction, but simple query is fine
      await tempClient.query(`CREATE DATABASE ${targetDbName}`);
      console.log(`Database "${targetDbName}" successfully created.`);
    } else {
      console.log(`Database "${targetDbName}" already exists.`);
    }
  } catch (err) {
    console.error('Error checking or creating database. Make sure your PostgreSQL server is running and credentials in .env are correct.', err);
    process.exit(1);
  } finally {
    await tempClient.end();
  }

  // Step 2: Connect to target database to run Schema DDL
  console.log(`Connecting to database "${targetDbName}" to run DDL schema...`);
  const client = new Client({
    ...dbConfig,
    database: targetDbName,
  });

  try {
    await client.connect();

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Executing schema.sql DDL script...');
    await client.query(schemaSql);
    console.log('Schema tables created successfully.');

    // Step 3: Seed initial data programmatically (for security hash generation)
    console.log('Seeding initial data...');
    
    const saltRounds = 10;
    const passwordAdmin = await bcrypt.hash('admin123', saltRounds);
    const passwordVendor1 = await bcrypt.hash('vendor123', saltRounds);
    const passwordVendor2 = await bcrypt.hash('vendor123', saltRounds);
    const passwordCustomer1 = await bcrypt.hash('customer123', saltRounds);
    const passwordCustomer2 = await bcrypt.hash('customer123', saltRounds);

    // Insert Users
    console.log('Inserting users...');
    const usersResult = await client.query(`
      INSERT INTO users (name, email, password_hash, role) VALUES
      ('System Administrator', 'admin@ecommerce.com', $1, 'admin'),
      ('TechZone Owner', 'vendor1@ecommerce.com', $2, 'vendor'),
      ('FashionHub Owner', 'vendor2@ecommerce.com', $3, 'vendor'),
      ('John Doe', 'customer1@ecommerce.com', $4, 'customer'),
      ('Jane Smith', 'customer2@ecommerce.com', $5, 'customer')
      RETURNING id, name, role;
    `, [passwordAdmin, passwordVendor1, passwordVendor2, passwordCustomer1, passwordCustomer2]);

    const usersMap = {};
    usersResult.rows.forEach(user => {
      usersMap[user.role + (usersResult.rows.filter(u => u.role === user.role).indexOf(user) + 1)] = user.id;
    });
    
    // Quick mapping for easy seeding reference
    const adminId = usersResult.rows.find(u => u.role === 'admin').id;
    const vendor1UserId = usersResult.rows.find(u => u.email === 'vendor1@ecommerce.com').id;
    const vendor2UserId = usersResult.rows.find(u => u.email === 'vendor2@ecommerce.com').id;
    const customer1Id = usersResult.rows.find(u => u.email === 'customer1@ecommerce.com').id;
    const customer2Id = usersResult.rows.find(u => u.email === 'customer2@ecommerce.com').id;

    // Insert Vendors
    console.log('Inserting vendors...');
    const vendorsResult = await client.query(`
      INSERT INTO vendors (user_id, store_name, store_description) VALUES
      ($1, 'TechZone', 'Your ultimate tech and electronics paradise.'),
      ($2, 'FashionHub', 'Trendy apparel and accessories for everyone.')
      RETURNING id, store_name;
    `, [vendor1UserId, vendor2UserId]);

    const techZoneId = vendorsResult.rows.find(v => v.store_name === 'TechZone').id;
    const fashionHubId = vendorsResult.rows.find(v => v.store_name === 'FashionHub').id;

    // Insert Products
    console.log('Inserting products...');
    const productsResult = await client.query(`
      INSERT INTO products (vendor_id, name, description, price, stock, image_url) VALUES
      ($1, 'ProBook 15 Laptop', 'High performance business laptop with 16GB RAM and 512GB SSD.', 1099.99, 15, 'https://images.unsplash.com/photo-1496181130204-755241524eab?auto=format&fit=crop&w=500&q=80'),
      ($1, 'Noise-Cancelling Headphones', 'Active noise cancelling wireless headphones with 30-hour battery life.', 199.99, 40, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=500&q=80'),
      ($1, 'Mechanical Keyboard', 'RGB Backlit mechanical keyboard with tactile blue switches.', 89.99, 25, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=500&q=80'),
      ($2, 'Classic Denim Jacket', 'Rugged blue denim jacket with vintage wash and button closure.', 69.99, 20, 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=500&q=80'),
      ($2, 'Minimalist Leather Watch', 'Elegant watch with genuine black leather strap and black dial.', 129.99, 12, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=500&q=80'),
      ($2, 'Canvas Daily Backpack', 'Durable lightweight water-resistant backpack for work or travel.', 45.00, 30, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=500&q=80')
      RETURNING id, name, price;
    `, [techZoneId, fashionHubId]);

    const laptopId = productsResult.rows.find(p => p.name === 'ProBook 15 Laptop').id;
    const phoneId = productsResult.rows.find(p => p.name === 'Noise-Cancelling Headphones').id;
    const jacketId = productsResult.rows.find(p => p.name === 'Classic Denim Jacket').id;

    // Insert a Sample Order
    console.log('Inserting sample orders...');
    const orderResult = await client.query(`
      INSERT INTO orders (customer_id, total_price, shipping_address, contact_number) VALUES
      ($1, 1369.97, '123 Main Street, New York, NY 10001', '+15551234567')
      RETURNING id;
    `, [customer1Id]);

    const orderId = orderResult.rows[0].id;

    // Insert Order Items (from different vendors in the same order!)
    console.log('Inserting order items...');
    const orderItemsResult = await client.query(`
      INSERT INTO order_items (order_id, product_id, vendor_id, quantity, price, status) VALUES
      ($1, $2, $3, 1, 1099.99, 'Processing'), -- Laptop from TechZone
      ($1, $4, $3, 1, 199.99, 'Pending'),    -- Headphones from TechZone
      ($1, $5, $6, 1, 69.99, 'Shipped')      -- Jacket from FashionHub
      RETURNING id, product_id, status;
    `, [orderId, laptopId, techZoneId, phoneId, jacketId, fashionHubId]);

    const item1Id = orderItemsResult.rows[0].id;
    const item2Id = orderItemsResult.rows[1].id;
    const item3Id = orderItemsResult.rows[2].id;

    // Add Order Tracking checkpoints
    console.log('Inserting order tracking logs...');
    await client.query(`
      INSERT INTO order_tracking (order_id, order_item_id, status, description) VALUES
      ($1, $2, 'Order Placed', 'The order has been received and customer payment verified.'),
      ($1, $2, 'Processing', 'Vendor TechZone has acknowledged the order and is preparing the package.'),
      ($1, $3, 'Order Placed', 'The order has been received and customer payment verified.'),
      ($1, $4, 'Order Placed', 'The order has been received and customer payment verified.'),
      ($1, $4, 'Processing', 'Vendor FashionHub has packaged the item.'),
      ($1, $4, 'Shipped', 'Item has been picked up by the courier. Tracking code: TRK87654321')
    `, [orderId, item1Id, item2Id, item3Id]);

    console.log('Database seeding finished successfully!');
  } catch (err) {
    console.error('Error executing SQL queries.', err);
    process.exit(1);
  } finally {
    await client.end();
  }

  console.log('Database schema and seed setup complete.');
}

setupDatabase();
