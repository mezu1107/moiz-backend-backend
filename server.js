// server.js — FINAL CLEAN VERSION — NO MORE FAVICON SPAM
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path'); // ← ADD THIS
const connectDB = require('./src/config/db');
const logger = require('./src/utils/logger');

const app = express();
const server = http.createServer(app);

// ==================== MIDDLEWARES ====================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS
app.use(require('cors')({
  origin: true,
  credentials: true
}));

app.use(require('helmet')({ contentSecurityPolicy: false }));
app.use(require('compression')());

// Serve static files (favicon, images, etc.)
app.use('/uploads', express.static('uploads'));
app.use('/public', express.static(path.join(__dirname, 'public'))); // ← Create this folder

// ==================== FAVICON FIX (MOST IMPORTANT) ====================
// This stops the annoying /favicon.ico 404 spam
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No content — browser stops asking
});

// Optional: Serve a real favicon (recommended)
app.get('/favicon.png', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'favicon.png'));
});

// ==================== SOCKET.IO ====================
const io = new Server(server, {
  cors: { origin: "*", credentials: true },
  pingTimeout: 60000,
});
global.io = io;
require('./src/sockets/order/orderSocket')(io);
require('./src/sockets/contact/contactSocket')(io);

// ==================== STRIPE WEBHOOK ====================
const stripeWebhookRoutes = require('./src/routes/webhook/stripeWebhookRoutes');
if (process.env.TESTING_MODE === 'true') {
  app.use('/api/webhook/stripe', express.raw({ type: 'application/json' }), (req, res, next) => {
    req.stripeEvent = { id: 'test_evt', type: 'payment_intent.succeeded' };
    next();
  }, stripeWebhookRoutes);
} else {
  const verifyStripeWebhook = require('./src/middleware/stripe/verifyStripeWebhook');
  app.use('/api/webhook/stripe', express.raw({ type: 'application/json' }), verifyStripeWebhook, stripeWebhookRoutes);
}

// ==================== HEALTH CHECK ====================
app.get('/health', async (req, res) => {
  let db = 'Disconnected';
  try {
    await require('mongoose').connection.db.admin().ping();
    db = 'Connected';
  } catch {}
  res.json({
    status: 'LIVE',
    message: 'AMFood Pakistan — FULL POWER',
    dbStatus: db,
    time: new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }),
    version: 'v3.0 — Clean & Silent'
  });
});

// ==================== ROUTES ====================
// ==================== ROUTES ====================
const routes = [
  ['/api/auth', './src/routes/auth/authRoutes'],
  ['/api/upload', './src/routes/upload/uploadRoutes'],
  ['/api/address', './src/routes/address/addressRoutes'],

  // 🛠 FIX: correct folder name for areas
  ['/api/areas', './src/routes/area/areaRoutes'],

  ['/api/cart', './src/routes/cart/cartRoutes'],
  ['/api/menu', './src/routes/menu/menuRoutes'],
  ['/api/order', './src/routes/order/orderRoutes'],
  ['/api/deal', './src/routes/deal/dealRoutes'],

  // 🛠 FIX: dashboard BEFORE generic rider routes
  ['/api/rider/dashboard', './src/routes/rider/riderDashboardRoutes'],
  ['/api/rider', './src/routes/rider/riderRoutes'],

  ['/api/admin/customers', './src/routes/admin/customerRoutes'],
  ['/api/admin/rider', './src/routes/admin/riderAdminRoutes'],
  ['/api/admin', './src/routes/admin/adminRoutes'],
  ['/api/order/analytics', './src/routes/order/analyticsRoutes'],

  ['/api/contact', './src/routes/contact/contactRoutes'],
  ['/api/admin/contact', './src/routes/admin/contactAdminRoutes']
];

routes.forEach(([path, file]) => {
  try {
    const routeModule = require(file);
    app.use(path, routeModule);

    // Improved logging
    logger.info(`Route loaded successfully: ${path}`);
  } catch (err) {
    logger.error(`❌ Failed to load route ${path}`);
    logger.error(err.stack || err);
  }
});

// ==================== 404 & ERROR HANDLER (CLEAN) ====================
app.use((req, res, next) => {
  // Ignore favicon & health checks in logs
  if (req.originalUrl.includes('favicon') || req.originalUrl === '/health') {
    return res.status(204).end();
  }
  next();
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((err, req, res, next) => {
  logger.error('ERROR:', {
    url: req.originalUrl,
    method: req.method,
    message: err.message,
  });
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Server error' : err.message
  });
});

// ==================== START SERVER ====================
const startServer = async () => {
  try {
    await connectDB();
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, '0.0.0.0', () => {
      console.log('\n AMFOOD PAKISTAN — SERVER LIVE & CLEAN!');
      console.log(` http://localhost:${PORT}`);
      console.log(` Health: http://localhost:${PORT}/health`);
      console.log(` No more favicon.ico spam`);
      console.log(` Time: ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}\n`);
    });
  } catch (err) {
    logger.error('Server failed:', err);
    setTimeout(startServer, 5000);
  }
};

startServer();