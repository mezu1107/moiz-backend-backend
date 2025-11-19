// server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./src/config/db');
const logger = require('./src/utils/logger');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const server = http.createServer(app);

// ==================== SOCKET.IO SETUP ====================
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL?.split(',').map(url => url.trim()) || [
      'http://localhost:3000',
      'https://yourapp.com'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e8 // 100MB max payload
});

global.io = io;

// DO NOT define emitOrderUpdate here — it's now cleanly defined in orderSocket.js
// Removed duplicate global.emitOrderUpdate → now only one source of truth

// Load socket handlers (this file defines global.emitOrderUpdate)
require('./src/sockets/order/orderSocket')(io);

// ==================== DATABASE ====================
connectDB()
  .then(() => logger.info('MongoDB Connected Successfully'))
  .catch(err => {
    logger.error('MongoDB Connection Failed:', err);
    process.exit(1);
  });

// ==================== SECURITY & MIDDLEWARES ====================
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map(url => url.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 500 : 10000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.'
  }
});
app.use(limiter);

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '30d',
  etag: true
}));

// ==================== STRIPE WEBHOOK – RAW BODY FIRST ====================
app.use('/webhook/stripe', express.raw({ type: 'application/json' }));

// ==================== BODY PARSERS – AFTER WEBHOOK ====================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==================== ROUTES ====================
app.use('/api/auth', require('./src/routes/auth/authRoutes'));
app.use('/api/address', require('./src/routes/address/addressRoutes'));
app.use('/api/area', require('./src/routes/area/areaRoutes'));
app.use('/api/cart', require('./src/routes/cart/cartRoutes'));
app.use('/api/menu', require('./src/routes/menu/menuRoutes'));
app.use('/api/orders', require('./src/routes/order/orderRoutes'));
app.use('/api/rider', require('./src/routes/rider/riderRoutes'));
app.use('/api/deals', require('./src/routes/deal/dealRoutes'));
app.use('/api/admin', require('./src/routes/admin/adminRoutes'));
app.use('/api/admin/dashboard', require('./src/routes/admin/dashboardRoutes'));
app.use('/api/upload', require('./src/routes/upload/uploadRoutes'));
app.use('/api/users', require('./src/routes/auth/userRoutes')); // Fixed duplicate /api/auth

// Stripe Webhook (after raw parser)
app.use('/webhook/stripe', require('./src/routes/webhook/stripeRoutes'));

// ==================== HEALTH CHECK ====================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Grok-powered backend is running',
    timestamp: new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }),
    uptime: `${Math.floor(process.uptime())} seconds`,
    environment: process.env.NODE_ENV || 'development',
    socketConnections: io.engine.clientsCount
  });
});

// ==================== 404 HANDLER ====================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// ==================== GLOBAL ERROR HANDLER ====================
app.use((err, req, res, next) => {
  logger.error('Unhandled Error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    user: req.user?._id || 'guest'
  });

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ==================== GRACEFUL SHUTDOWN ====================
const gracefulShutdown = () => {
  logger.info('Shutting down gracefully...');
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });

  // Force close after 10s
  setTimeout(() => {
    logger.error('Forcing shutdown...');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// ==================== START SERVER ====================
const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n SERVER IS LIVE');
  console.log(` Port: http://localhost:${PORT}`);
  console.log(` Health: http://localhost:${PORT}/health`);
  console.log(` Env: ${process.env.NODE_ENV || 'development'}`);
  console.log(` Time: ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}\n`);
  logger.info(`Server started on port ${PORT} | PID: ${process.pid}`);
});