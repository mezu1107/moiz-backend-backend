require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const connectDB = require('./src/config/db');
const logger = require('./src/utils/logger');
const session = require('express-session');
const MongoStore = require('connect-mongo').default;
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const server = http.createServer(app);

// ==================== MIDDLEWARES ====================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors({ origin: true, credentials: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'amfood-secret-guest-cart-2025',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: 'sessions',
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());

// Static folders
app.use('/uploads', express.static('uploads'));
app.use('/public', express.static(path.join(__dirname, 'public')));

// ==================== FAVICON FIX ====================
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/favicon.png', (req, res) => res.sendFile(path.join(__dirname, 'public', 'favicon.png')));

// ==================== SOCKET.IO ====================
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: { origin: '*', credentials: true },
  pingTimeout: 60000,
});
global.io = io;

require('./src/sockets/order/orderSocket')(io);
require('./src/sockets/contact/contactSocket')(io);

// ==================== STRIPE WEBHOOK ====================
const stripeWebhookRoutes = require('./src/routes/webhook/stripeWebhookRoutes');
if (process.env.TESTING_MODE === 'true') {
  app.use(
    '/api/webhook/stripe',
    express.raw({ type: 'application/json' }),
    (req, res, next) => {
      req.stripeEvent = { id: 'test_evt', type: 'payment_intent.succeeded' };
      next();
    },
    stripeWebhookRoutes
  );
} else {
  const verifyStripeWebhook = require('./src/middleware/stripe/verifyStripeWebhook');
  app.use(
    '/api/webhook/stripe',
    express.raw({ type: 'application/json' }),
    verifyStripeWebhook,
    stripeWebhookRoutes
  );
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
    version: 'v3.0 — Clean & Silent',
  });
});

// ==================== ROUTES ====================
const routes = [
  ['/api/auth', './src/routes/auth/authRoutes'],
  ['/api/upload', './src/routes/upload/uploadRoutes'],
  ['/api/address', './src/routes/address/addressRoutes'],
  ['/api/areas', './src/routes/area/areaRoutes'],
  ['/api/cart', './src/routes/cart/cartRoutes'],
  ['/api/menu', './src/routes/menu/menuRoutes'],
  ['/api/orders', './src/routes/order/orderRoutes'],
  ['/api/deal', './src/routes/deal/dealRoutes'],
  ['/api/rider/dashboard', './src/routes/rider/riderDashboardRoutes'],
  ['/api/rider', './src/routes/rider/riderRoutes'],
  ['/api/admin/customers', './src/routes/admin/customerRoutes'],
  ['/api/admin/rider', './src/routes/admin/riderAdminRoutes'],
  ['/api/admin', './src/routes/admin/adminRoutes'],
  ['/api/order/analytics', './src/routes/order/analyticsRoutes'],
  ['/api/contact', './src/routes/contact/contactRoutes'],
  ['/api/admin/contact', './src/routes/admin/contactAdminRoutes'],
  
];

routes.forEach(([path, file]) => {
  try {
    const routeModule = require(file);
    app.use(path, routeModule);
    logger.info(`Route loaded successfully: ${path}`);
  } catch (err) {
    logger.error(`❌ Failed to load route ${path}`);
    logger.error(err.stack || err);
  }
});

// ==================== 404 & ERROR HANDLER ====================
app.use((req, res, next) => {
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
    message: process.env.NODE_ENV === 'production' ? 'Server error' : err.message,
  });
});

// ==================== START SERVER ====================
const startServer = async () => {
  try {
    await connectDB();
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`\n AMFOOD PAKISTAN — SERVER LIVE & CLEAN!`);
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
