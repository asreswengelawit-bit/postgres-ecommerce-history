# NexusCart - Multi-Vendor E-Commerce & Order Tracking Platform

NexusCart is a secure, high-performance, full-stack web application designed for multi-vendor product catalogs and dynamic item-level shipment tracking. Built with **Node.js, Express, and PostgreSQL** utilizing the **MVC (Model-View-Controller)** pattern, it delivers a modern glassmorphic interface served via EJS templates that consume a headless RESTful API.

---

## 🚀 Key Features

### 🛒 Customer Storefront
- **Responsive Catalog**: Real-time searching, debounced filters, and price bounds constraints.
- **Persistent Cart**: Persistent localized shopping basket allowing checkout of multiple products from different vendors in a single transaction.
- **Visual Order Tracking**: Interactive step-by-step shipment timeline tracking the status of each product item individually.

### 🏪 Vendor Control Panel
- **Sales Analytics Dashboard**: Aggregates Gross Sales Revenue, Units Sold, Active listings, and Low-stock inventory notices.
- **Product manager**: Full CRUD operations for vendor listings, including stock levels, specifications, and images.
- **Order Fulfillment Board**: Manage incoming orders, packaging queues, and submit shipping updates (with custom carrier tracking logs).

### 🔒 Enterprise-Grade Security
- **Parameter-Safe Database**: Parametric queries throughout the model layers block SQL Injection (SQLi) attacks.
- **Hash Cryptography**: `bcryptjs` password encryption guards credentials.
- **Role-Based Guards (RBAC)**: RESTful routes are fortified via JWT verifiers checking roles (`customer`, `vendor`, `admin`).
- **Rate-Limiter Protection**: Throttles endpoint hammering to prevent brute-force login attempts and DDoS stresses.
- **Sanitized Headers**: Express applications are hardened with `helmet` and custom error containment middleware to prevent database stack leakages.

---

## 🛠️ Technology Stack
- **Backend Framework**: Node.js & Express.js
- **Database Server**: PostgreSQL
- **Template Engine**: EJS (serving initial view boundaries)
- **Frontend Client**: Vanilla JavaScript (AJAX/Fetch REST Consumer) & CSS Grid/Flexbox
- **Session Manager**: JSON Web Tokens (JWT)

---

## 📊 Relational Database Schema (ERD)

Below is the entity schema modeling database tables, constraints, and relational indices. You can import `backend/db/schema.sql` into **DBeaver** to view this layout visually.

```mermaid
erDiagram
    users {
        int id PK
        varchar name
        varchar email UNIQUE
        varchar password_hash
        varchar role CHECK
        timestamp created_at
    }
    vendors {
        int id PK
        int user_id FK
        varchar store_name UNIQUE
        text store_description
        timestamp created_at
    }
    products {
        int id PK
        int vendor_id FK
        varchar name
        text description
        decimal price
        int stock
        varchar image_url
        timestamp created_at
    }
    orders {
        int id PK
        int customer_id FK
        decimal total_price
        text shipping_address
        varchar contact_number
        timestamp created_at
    }
    order_items {
        int id PK
        int order_id FK
        int product_id FK
        int vendor_id FK
        int quantity
        decimal price
        varchar status CHECK
    }
    order_tracking {
        int id PK
        int order_id FK
        int order_item_id FK
        varchar status
        text description
        timestamp created_at
    }

    users ||--o| vendors : "creates store (1:0..1)"
    users ||--o| orders : "places (1:0..N)"
    vendors ||--o| products : "lists (1:0..N)"
    vendors ||--o| order_items : "receives (1:0..N)"
    products ||--o| order_items : "ordered (1:0..N)"
    orders ||--|{ order_items : "groups (1:1..N)"
    orders ||--o| order_tracking : "logs order (1:0..N)"
    order_items ||--o| order_tracking : "tracks item (1:0..N)"
```

---

## ⚙️ Setup and Installation Instructions

### 1. Prerequisites
- [Node.js](https://nodejs.org/) installed (v16.0.0 or higher)
- [PostgreSQL](https://www.postgresql.org/) database server running locally
- [DBeaver](https://dbeaver.io/) or pgAdmin to inspect schema tables

### 2. Configure Environment variables
1. In the project root, copy `.env.example` to a new file named `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in your PostgreSQL credentials:
   ```env
   PORT=3000
   PGUSER=postgres
   PGHOST=localhost
   PGPASSWORD=your_postgres_password
   PGDATABASE=ecommerce_db
   PGPORT=5432
   JWT_SECRET=some_long_random_secret_string
   ```

### 3. Install Dependencies
In your terminal, navigate to the project directory and run:
```bash
npm install
```

### 4. Create Tables and Seed Data
NexusCart includes an automated migrations helper. Run the following command in the root folder to connect to PostgreSQL, create the database, construct tables, and seed it with mock credentials:
```bash
npm run db:setup
```
*Note: Once this completes successfully, open **DBeaver**, connect using the credentials from `.env`, and you will see the database structure ready for inspection.*

### 5. Start the Web Server
Launch the local Express server by running:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 🔑 Mock Credentials (For Testing)

We have pre-seeded the database with testing accounts:

| Role | Email Address | Password | Details |
| :--- | :--- | :--- | :--- |
| **Customer** | `customer1@ecommerce.com` | `customer123` | John Doe (Has placed orders) |
| **Vendor** | `vendor1@ecommerce.com` | `vendor123` | Store owner of **TechZone** |
| **Vendor** | `vendor2@ecommerce.com` | `vendor123` | Store owner of **FashionHub** |
| **Admin** | `admin@ecommerce.com` | `admin123` | System Administrator |
