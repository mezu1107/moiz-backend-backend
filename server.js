/**
 * AMFood Backend Server
 * FINAL PRODUCTION VERSION — December 2025
 */

require('dotenv').config(); // MUST be first

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

const admin = require('firebase-admin');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);

/* =========================================================
   🔥 FIREBASE ADMIN INITIALIZATION (SAFE)
========================================================= */
const firebaseEnvReady =
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY;

if (!admin.apps.length && firebaseEnvReady) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });

    logger.info(`[${new Date().toISOString()}] Firebase Admin SDK initialized`);
  } catch (err) {
    logger.warn(
      `[${new Date().toISOString()}] Firebase Admin FAILED — Push disabled`
    );
    console.error(err.message);
  }
} else {
  logger.warn(
    `[${new Date().toISOString()}] Firebase env missing — Push disabled`
  );
}

/* =========================================================
   🧱 MIDDLEWARES
========================================================= */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'amfood-session-secret',
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
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    },
  })
);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());

/* =========================================================
   📁 STATIC FILES
========================================================= */
app.use('/uploads', express.static('uploads'));
app.use('/public', express.static(path.join(__dirname, 'public')));

/* =========================================================
   🖼️ FAVICON
========================================================= */
app.get('/favicon.ico', (_, res) => res.status(204).end());
app.get('/favicon.png', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'favicon.png'))
);

/* =========================================================
   🔌 SOCKET.IO
========================================================= */
const { Server } = require('socket.io');

const io = new Server(server, {
  cors: { origin: '*', credentials: true },
  pingTimeout: 60000,
});

global.io = io;

require('./src/sockets/order/orderSocket')(io);
require('./src/sockets/contact/contactSocket')(io);

/* =========================================================
   💳 STRIPE WEBHOOK
========================================================= */
const stripeWebhookRoutes = require('./src/routes/webhook/stripeWebhookRoutes');

if (process.env.TESTING_MODE === 'true') {
  app.use(
    '/api/webhook/stripe',
    express.raw({ type: 'application/json' }),
    (req, res, next) => {
      req.stripeEvent = {
        id: 'test_evt',
        type: 'payment_intent.succeeded',
      };
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

/* =========================================================
   ❤️ HEALTH CHECK
========================================================= */
app.get('/health', async (req, res) => {
  let dbStatus = 'Disconnected';

  try {
    await mongoose.connection.db.admin().ping();
    dbStatus = 'Connected';
  } catch {}

  res.json({
    status: 'LIVE',
    message: 'AMFood Pakistan — FULL POWER',
    dbStatus,
    firebase: admin.apps.length ? 'Initialized' : 'Disabled',
    time: new Date().toLocaleString('en-PK', {
      timeZone: 'Asia/Karachi',
    }),
    version: 'v3.0 — December 2025',
  });
});

/* =========================================================
   🚦 ROUTES LOADER
========================================================= */
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
  ['/api/admin/staff', './src/routes/admin/staffRoutes'],
  ['/api/admin', './src/routes/admin/adminRoutes'],
  ['/api/contact', './src/routes/contact/contactRoutes'],
  ['/api/admin/contact', './src/routes/admin/contactAdminRoutes'],
  ['/api/wallet', './src/routes/wallet/walletRoutes'],
  ['/api/kitchen', './src/routes/kitchen/kitchenRoutes'],
  ['/api/payment', './src/routes/payment/paymentRoutes'],
  ['/api/admin/payment', './src/routes/admin/paymentAdminRoutes'],
  ['/api/admin/refunds', './src/routes/admin/refundAdminRoutes'],
  ['/api/reviews', './src/routes/review/reviewRoutes'],
  ['/api/inventory', './src/routes/inventory/inventoryRoutes'],
    ['/api/orders/analytics', './src/routes/order/analyticsRoutes'],

];

routes.forEach(([routePath, file]) => {
  try {
    app.use(routePath, require(file));
    console.log(`[${new Date().toISOString()}] ROUTE LOADED: ${routePath}`);
  } catch (err) {
    console.error(
      `[${new Date().toISOString()}] ROUTE FAILED: ${routePath}`
    );
    console.error(err.message);
  }
});

/* =========================================================
   ❌ ERROR HANDLING
========================================================= */
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] UNHANDLED ERROR`);
  console.error(err.stack);

  res.status(err.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message,
  });
});

/* =========================================================
   🚀 START SERVER
========================================================= */
const startServer = async () => {
  try {
    await connectDB();

    const PORT = process.env.PORT || 5000;

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`[${new Date().toISOString()}] SERVER LIVE`);
      console.log(` http://localhost:${PORT}`);
      console.log(` Health: http://localhost:${PORT}/health`);
      console.log(
        ` Time: ${new Date().toLocaleString('en-PK', {
          timeZone: 'Asia/Karachi',
        })}`
      );
    });
  } catch (err) {
    console.error('Server failed to start:', err.message);
    setTimeout(startServer, 5000);
  }
};

startServer();
