// server.js  ← FINAL VERSION (WORKS 100% – NOV 2025)
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./src/config/db');
const logger = require('./src/utils/logger');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const server = http.createServer(app);

// ==================== SOCKET.IO SETUP ====================
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL?.split(',').map(url => url.trim()) || [
      'http://localhost:3000',
      'http://localhost:3001'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e8
});

global.io = io;
require('./src/sockets/order/orderSocket')(io);

// ==================== DATABASE ====================
connectDB()
  .then(() => logger.info('MongoDB Connected Successfully'))
  .catch(err => {
    logger.error('MongoDB Connection Failed:', err);
    process.exit(1);
  });

// ==================== MIDDLEWARES ====================
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map(url => url.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(helmet({ contentSecurityPolicy: false }));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 500 : 10000,
  message: { success: false, message: 'Too many requests from this IP' }
}));

app.use('/uploads', express.static('uploads', { maxAge: '30d' }));

// Stripe webhook needs raw body
app.use('/webhook/stripe', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==================== ALL YOUR API ROUTES ====================
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
app.use('/api/auth/user', require('./src/routes/auth/userRoutes'));
app.use('/webhook/stripe', require('./src/routes/webhook/stripeRoutes'));

// ==================== HEALTH CHECK ====================
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Backend is live — ready to take over Pakistan',
    time: new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }),
    sockets: io.engine.clientsCount,
    env: process.env.NODE_ENV
  });
});

// ==================== 404 CATCH-ALL (THIS IS THE CORRECT WAY – NO MORE CRASH) ====================
app.use((req, res, next) => {
  logger.warn(`404 → ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: 'Invalid API route or method',
    tip: `Use POST for /api/auth/register, not ${req.method}`,
    path: req.originalUrl,
    method: req.method,
    hint: 'Register & Login → POST only'
  });
});

// ==================== GLOBAL ERROR HANDLER (MUST BE LAST) ====================
app.use((err, req, res, next) => {
  // JWT / Auth errors
  if (err.name === 'UnauthorizedError' || err.message?.includes('token')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Token missing or invalid'
    });
  }

  // Mongoose validation
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }

  // Duplicate key
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'This value already exists'
    });
  }

  // Log everything else
  logger.error('Server Error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Something went wrong'
      : err.message
  });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n SERVER IS LIVE');
  console.log(` Port: http://localhost:${PORT}`);
  console.log(` Health: http://localhost:${PORT}/health`);
  console.log(` Env: ${process.env.NODE_ENV}`);
  console.log(` Time: ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}\n`);
  logger.info(`Server started on port ${PORT}`);
});