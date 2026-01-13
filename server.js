/**

 * AMFood Backend Server

 * FINAL PRODUCTION VERSION — January 06, 2026

 * Secure, scalable, and CORS-fixed

 */

require('dotenv').config(); // MUST be first!

const express = require('express');

const http = require('http');

const path = require('path');

const mongoose = require('mongoose');

const connectDB = require('./src/config/db');

const logger = require('./src/utils/logger');

const session = require('express-session');

const cors = require('cors');

const helmet = require('helmet');

const compression = require('compression');

const MongoStore = require('connect-mongo').default;

const admin = require('firebase-admin');

const { Server } = require('socket.io'); // Import here for later use

const app = express();

const server = http.createServer(app);

/* =========================================================

   🔥 ALLOWED ORIGINS — DEFINED ONCE AT THE TOP

========================================================= */

const allowedOrigins =

  process.env.NODE_ENV === 'production'

    ? [

        'https://altawakkalfoods.com',

        'https://www.altawakkalfoods.com',

        'https://api.altawakkalfoods.com',
        'http://localhost:8080',

      ]

    : [

        'http://localhost:5173',

        'http://localhost:8080',

        'http://localhost:3000',

      ];

/* =========================================================

   🔥 FIREBASE ADMIN SDK — SAFE & RESILIENT INITIALIZATION

========================================================= */

let firebaseInitialized = false;

if (!admin.apps.length && process.env.FIREBASE_PROJECT_ID) {

  try {

    const privateKey = process.env.FIREBASE_PRIVATE_KEY

      ?.replace(/\\n/g, '\n')

      ?.trim();

    if (!privateKey) throw new Error('Missing or empty FIREBASE_PRIVATE_KEY');

    admin.initializeApp({

      credential: admin.credential.cert({

        type: 'service_account',

        projectId: process.env.FIREBASE_PROJECT_ID,

        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,

        private_key: privateKey,

        client_email: process.env.FIREBASE_CLIENT_EMAIL,

        client_id: process.env.FIREBASE_CLIENT_ID,

        auth_uri: 'https://accounts.google.com/o/oauth2/auth',

        token_uri: 'https://oauth2.googleapis.com/token',

        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',

        client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,

      }),

    });

    firebaseInitialized = true;

    logger.info('Firebase Admin SDK initialized successfully');

  } catch (err) {

    logger.error('Firebase Admin initialization failed — push notifications disabled', {

      error: err.message,

      stack: err.stack,

    });

  }

} else if (!process.env.FIREBASE_PROJECT_ID) {

  logger.warn('Firebase environment variables missing — push notifications disabled');

}

/* =========================================================

   🧱 GLOBAL MIDDLEWARES

========================================================= */

app.use(express.json({ limit: '10mb' }));

app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ FIXED CORS — Clean, safe, and handles preflight correctly

app.use(cors({

  origin: (origin, callback) => {

    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {

      return callback(null, true);

    }

    return callback(new Error(`CORS blocked: ${origin}`));

  },

  credentials: true,

  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS','PATCH'],

  allowedHeaders: ['Content-Type', 'Authorization'],

}));

// Security headers

app.use(helmet({

  contentSecurityPolicy: false,

  crossOriginEmbedderPolicy: false,

  crossOriginResourcePolicy: { policy: 'cross-origin' },

}));

app.use(compression());

/* =========================================================

   📁 SESSION MANAGEMENT (MongoDB-backed)

========================================================= */

app.use(session({

  secret: process.env.SESSION_SECRET || 'amfood-secure-session-2025-fallback',

  resave: true,

  saveUninitialized: true,

  store: MongoStore.create({

    mongoUrl: process.env.MONGO_URI,

    collectionName: 'sessions',

    ttl: 24 * 60 * 60,

    autoRemove: 'native',

  }),

  cookie: {

    httpOnly: true,

    secure: process.env.NODE_ENV === 'production', // true only on HTTPS

    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',

    maxAge: 24 * 60 * 60 * 1000,

  },

  name: 'amfood.sid',

}));

/* =========================================================

   📂 STATIC FILES & FAVICON

========================================================= */

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/public', express.static(path.join(__dirname, 'public')));

app.get('/favicon.ico', (_, res) => res.status(204).end());

app.get('/favicon.png', (_, res) =>

  res.sendFile(path.join(__dirname, 'public', 'favicon.png'))

);

/* =========================================================

   🔌 SOCKET.IO — Correctly initialized (OUTSIDE CORS callback)

========================================================= */

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
});

global.io = io;

// NEW: Global helper to broadcast order updates to both user & order rooms
global.emitOrderUpdate = async (orderId) => {
  try {
    const Order = require('./src/models/order/Order');
    const order = await Order.findById(orderId)
      .select('status shortId _id customer guestInfo')
      .lean();

    if (!order) return;

    const payload = {
      order,
      shortId: order.shortId || order._id.toString().slice(-6).toUpperCase(),
      status: order.status,
      timestamp: new Date(),
    };

    // Broadcast to authenticated user (if exists)
    if (order.customer) {
      io.to(`user:${order.customer}`).emit('orderUpdate', payload);
    }

    // ALWAYS broadcast to the order room (for guests tracking)
    io.to(`order:${order._id}`).emit('orderUpdate', payload);

    logger.info(`Order update broadcasted: #${payload.shortId} → ${order.status}`);
  } catch (err) {
    logger.error('Failed to broadcast order update', { error: err.message });
  }
};

// Load socket handlers (unchanged)
require('./src/sockets/order/orderSocket')(io);
require('./src/sockets/contact/contactSocket')(io);


/* =========================================================

   💳 STRIPE WEBHOOK — RAW BODY REQUIRED!

========================================================= */

/* =========================================================

   💳 STRIPE WEBHOOK — RAW BODY REQUIRED!

========================================================= */

const stripeWebhookRoutes = require('./src/routes/webhook/stripeWebhookRoutes');

if (process.env.TESTING_MODE === 'true') {

  app.use(

    '/api/webhook/stripe',

    express.raw({ type: 'application/json' }),

    (req, res, next) => {

      req.stripeEvent = { id: 'test_evt_123', type: 'payment_intent.succeeded' };

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

   ❤️ HEALTH CHECK ENDPOINT

========================================================= */

app.get('/health', async (req, res) => {

  let dbStatus = 'Disconnected';

  try {

    if (mongoose.connection.readyState === 1) {

      await mongoose.connection.db.admin().ping();

      dbStatus = 'Connected';

    }

  } catch (e) {

    dbStatus = 'Error';

  }

  res.json({

    status: 'LIVE',

    message: 'AMFood Pakistan — Full Power Backend',

    database: dbStatus,

    firebase: firebaseInitialized ? 'Initialized' : 'Disabled',

    pushNotifications: firebaseInitialized ? 'ENABLED' : 'DISABLED',

    timestamp: new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }),

    version: 'v3.1 — January 2026',

    environment: process.env.NODE_ENV || 'development',

  });

});

/* =========================================================

   🚦 DYNAMIC ROUTES LOADER

========================================================= */

const routeRegistry = [

  { path: '/api/auth', file: './src/routes/auth/authRoutes' },

  { path: '/api/upload', file: './src/routes/upload/uploadRoutes' },

  { path: '/api/address', file: './src/routes/address/addressRoutes' },

  { path: '/api/areas', file: './src/routes/area/areaRoutes' },

  { path: '/api/delivery', file: './src/routes/area/deliveryRoutes' },

  { path: '/api/cart', file: './src/routes/cart/cartRoutes' },

  { path: '/api/menu', file: './src/routes/menu/menuRoutes' },

  { path: '/api/orders', file: './src/routes/order/orderRoutes' },

  { path: '/api/deal', file: './src/routes/deal/dealRoutes' },

  { path: '/api/rider', file: './src/routes/rider/riderRoutes' },

  { path: '/api/rider/dashboard', file: './src/routes/rider/riderDashboardRoutes' },

  { path: '/api/admin/customers', file: './src/routes/admin/customerRoutes' },

  { path: '/api/admin/rider', file: './src/routes/admin/riderAdminRoutes' },

  { path: '/api/admin/staff', file: './src/routes/admin/staffRoutes' },

  { path: '/api/admin', file: './src/routes/admin/adminRoutes' },

  { path: '/api/contact', file: './src/routes/contact/contactRoutes' },

  { path: '/api/admin/contact', file: './src/routes/admin/contactAdminRoutes' },

  { path: '/api/wallet', file: './src/routes/wallet/walletRoutes' },

  { path: '/api/wallet/withdrawals', file: './src/routes/wallet/withdrawalRoutes' },

  { path: '/api/kitchen', file: './src/routes/kitchen/kitchenRoutes' },

  { path: '/api/payment', file: './src/routes/payment/paymentRoutes' },

  { path: '/api/admin/payment', file: './src/routes/admin/paymentAdminRoutes' },

  { path: '/api/admin/wallet', file: './src/routes/admin/walletAdminRoutes' },

  { path: '/api/admin/refunds', file: './src/routes/admin/refundAdminRoutes' },

  { path: '/api/reviews', file: './src/routes/review/reviewRoutes' },

  { path: '/api/inventory', file: './src/routes/inventory/inventoryRoutes' },

  { path: '/api/orders/analytics', file: './src/routes/order/analyticsRoutes' },

];

routeRegistry.forEach(({ path, file }) => {

  try {

    const route = require(file);

    app.use(path, route);

    logger.info(`ROUTE LOADED: ${path}`);

  } catch (err) {

    logger.error(`ROUTE LOAD FAILED: ${path}`, { error: err.message });

    console.error(`Failed to load route ${path}:`, err.message);

  }

});

/* =========================================================

   ❌ GLOBAL ERROR HANDLER

========================================================= */

app.use((err, req, res, next) => {

  const status = err.status || 500;

  const message = process.env.NODE_ENV === 'production'

    ? 'Internal server error'

    : err.message || 'Something went wrong';

  logger.error(`UNHANDLED ERROR [${status}]`, {

    message: err.message,

    stack: err.stack,

    path: req.originalUrl,

    method: req.method,

  });

  res.status(status).json({ success: false, message });

});

/* =========================================================

   🚀 START SERVER WITH RETRY LOGIC

========================================================= */

const startServer = async () => {

  try {

    await connectDB();

    logger.info('Database connection established');

    const PORT = process.env.PORT || 5000;

    server.listen(PORT, '0.0.0.0', () => {

      logger.info(`Server running on port ${PORT}`);

      console.log(`\n🚀 AMFood Backend LIVE`);

      console.log(`   Local: http://localhost:${PORT}`);

      console.log(`   Health: http://localhost:${PORT}/health`);

      console.log(`   Time: ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}`);

      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);

      console.log(`   Firebase Push: ${firebaseInitialized ? 'ENABLED' : 'DISABLED'}\n`);

    });

  } catch (err) {

    logger.error('Server startup failed', { error: err.message });

    console.error('Server startup failed:', err.message);

    setTimeout(startServer, 5000);

  }

};

startServer();