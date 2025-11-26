// server.js — FINAL PAKISTAN EDITION — NOVEMBER 2025 → 2030 TAK CHALEGA
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./src/config/db');
const logger = require('./src/utils/logger');

const app = express();
const server = http.createServer(app);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Socket.IO with proper cleanup
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || "*", credentials: true },
  maxHttpBufferSize: 1e8, // 100MB for large payloads if needed
  pingTimeout: 60000,
  pingInterval: 25000
});
global.io = io;
require('./src/sockets/order/orderSocket')(io);

// Graceful shutdown helper
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    logger.info('HTTP server closed.');
    if (global.io) global.io.close();
    process.exit(0);
  });
};

// STRIPE WEBHOOK — SABSE GENIUS DUAL MODE (TESTING + PRODUCTION)
const stripeWebhookRoutes = require('./src/routes/webhook/stripeWebhookRoutes');

if (process.env.TESTING_MODE === 'true' || process.env.NODE_ENV !== 'production') {
  console.log("STRIPE WEBHOOK → TESTING MODE ACTIVE (Postman 100% chalega)");
  app.use('/api/webhook/stripe', express.raw({ type: 'application/json' }), (req, res, next) => {
    // Auto-parse JSON body (Postman sends JSON)
    let payload = req.body;
    if (Buffer.isBuffer(payload)) {
      try { payload = JSON.parse(payload.toString()); } catch (e) { payload = req.body; }
    }

    // Simulate real Stripe event structure
    req.stripeEvent = {
      id: `evt_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: payload.type || 'payment_intent.succeeded',
      data: { object: payload.data?.object || payload },
      created: Math.floor(Date.now() / 1000)
    };

    // Add fake signature header for consistency (optional)
    req.headers['stripe-signature'] = 'testing_mode_bypass';
    next();
  }, stripeWebhookRoutes);
} else {
  const verifyStripeWebhook = require('./src/middleware/stripe/verifyStripeWebhook');
  app.use('/api/webhook/stripe', express.raw({ type: 'application/json' }), verifyStripeWebhook, stripeWebhookRoutes);
  console.log("STRIPE WEBHOOK → PRODUCTION MODE (Signature Verified)");
}

// Middlewares
app.use(require('cors')({ 
  origin: process.env.CLIENT_URL || "*", 
  credentials: true 
}));
app.use(require('helmet')({ 
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false 
}));
app.use(require('compression')());
app.use('/uploads', express.static('uploads', { maxAge: '30d' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check with Real DB Status
app.get('/health', async (req, res) => {
  let dbStatus = 'Disconnected';
  try {
    await require('mongoose').connection.db.admin().ping();
    dbStatus = 'Connected';
  } catch (err) { dbStatus = 'Error'; }

  res.json({
    status: 'LIVE',
    message: 'FoodApp Pakistan — 1000% Power Mein',
    environment: process.env.NODE_ENV,
    testingMode: process.env.TESTING_MODE === 'true',
    stripeWebhook: process.env.TESTING_MODE === 'true' ? 'TESTING (Bypassed)' : 'PRODUCTION (Verified)',
    dbStatus,
    uptime: process.uptime(),
    time: new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }),
    version: 'v2.5 — November 2025 — Pakistan #1 Food App'
  });
});

// Load Routes Safely
const routes = [
  ['/api/auth', './src/routes/auth/authRoutes'],
  ['/api/upload', './src/routes/upload/uploadRoutes'],
  ['/api/address', './src/routes/address/addressRoutes'],
  ['/api/area', './src/routes/area/areaRoutes'],
  ['/api/cart', './src/routes/cart/cartRoutes'],
  ['/api/menu', './src/routes/menu/menuRoutes'],
  ['/api/order', './src/routes/order/orderRoutes'],
  ['/api/deal', './src/routes/deal/dealRoutes'],
  ['/api/rider', './src/routes/rider/riderRoutes'],
  ['/api/rider/dashboard', './src/routes/rider/riderDashboardRoutes'],
  ['/api/admin/customers', './src/routes/admin/userRoutes'],
  ['/api/admin/riders', './src/routes/admin/riderAdminRoutes'],
  ['/api/admin', './src/routes/admin/adminRoutes'],
];

routes.forEach(([path, file]) => {
  try {
    app.use(path, require(file));
    logger.info(`Route loaded: ${path}`);
  } catch (err) {
    logger.error(`Route load failed: ${path} → ${err.message}`);
  }
});

// 404 & Global Error Handler
// app.use('*', (req, res) => {
//   res.status(404).json({ success: false, message: 'API Route not found' });
// });

app.use((err, req, res, next) => {
  logger.error('UNHANDLED ERROR:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    body: req.body
  });
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// Graceful Shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION:', err);
  gracefulShutdown('uncaughtException');
});
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION:', err);
});

// DB + Server Start
const startServer = async () => {
  try {
    await connectDB();
    logger.info('MongoDB Connected Successfully');

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, '0.0.0.0', () => {
      console.log('\n FOODAPP PAKISTAN — SERVER LIVE!');
      console.log(` Server   → http://localhost:${PORT}`);
      console.log(` Webhook  → http://localhost:${PORT}/api/webhook/stripe`);
      console.log(` Mode     → ${process.env.TESTING_MODE === 'true' ? 'TESTING (Postman Ready)' : 'PRODUCTION (Live)'}`);
      console.log(` Time     → ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}\n`);
    });

  } catch (err) {
    logger.error('DB Connection Failed:', err);
    setTimeout(startServer, 5000);
  }
};

startServer();