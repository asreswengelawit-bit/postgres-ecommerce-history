const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const logger = require('./config/logger');
const errorHandler = require('./middleware/errorMiddleware');
const { apiLimiter } = require('./middleware/rateLimitMiddleware');

// Import routes
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const vendorRoutes = require('./routes/vendorRoutes');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Set up EJS template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Security & utility middlewares
app.use(helmet({
  // Disable Content Security Policy header for local development flexibility,
  // while keeping X-Frame-Options, X-Content-Type-Options, etc.
  contentSecurityPolicy: false,
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP Request logging with Morgan and writing logs to files
const fs = require('fs');
const accessLogStream = fs.createWriteStream(path.join(logger.logDir, 'access.log'), { flags: 'a' });
app.use(morgan('combined', { stream: accessLogStream }));
app.use(morgan('dev')); // Colorized terminal output for developer ease

// Serve static assets from public folder
app.use(express.static(path.join(__dirname, '../public')));

// Global API rate limiting
app.use('/api/', apiLimiter);

// Bind API route endpoints
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/vendors', vendorRoutes);

// View routes (EJS templates served by Express)
app.get('/', (req, res) => res.render('index', { title: 'Storefront' }));
app.get('/login', (req, res) => res.render('login', { title: 'Login' }));
app.get('/register', (req, res) => res.render('register', { title: 'Register' }));
app.get('/dashboard', (req, res) => res.render('dashboard', { title: 'Vendor Dashboard' }));
app.get('/track/:id', (req, res) => res.render('track', { title: 'Order Tracking', itemId: req.params.id }));

// 404 Route for unmatched API calls
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
  });
});

// Redirect page routes to home
app.use((req, res, next) => {
  if (req.accepts('html')) {
    res.redirect('/');
  } else {
    next();
  }
});

// Centralized error handler
app.use(errorHandler);

// Start server listening
app.listen(PORT, () => {
  logger.info(`Server started successfully on port ${PORT} (http://localhost:${PORT})`);
});
