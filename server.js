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

// ONLY ONE SOCKET FILE — CLEAN & PERFECT
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
  message: { success: false, message: 'Too many requests' }
}));

app.use('/uploads', express.static('uploads', { maxAge: '30d' }));

// Stripe webhook first
app.use('/webhook/stripe', express.raw({ type: 'application/json' }));

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
app.use('/api/auth/user', require('./src/routes/auth/userRoutes'));

// Webhook
app.use('/webhook/stripe', require('./src/routes/webhook/stripeRoutes'));

// ==================== HEALTH & 404 ====================
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Backend is live — ready to take over Pakistan',
    time: new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }),
    sockets: io.engine.clientsCount,
    env: process.env.NODE_ENV
  });
});



// ==================== ERROR HANDLER ====================
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(500).json({ success: false, message: 'Server error' });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n SERVER IS LIVE');
  console.log(` Port: http://localhost:${PORT}`);
  console.log(` Health: http://localhost:${PORT}/health`);
  console.log(` Env: ${process.env.NODE_ENV}`);
  console.log(` Time: ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}\n`);
  logger.info(`Server running on port ${PORT}`);
});