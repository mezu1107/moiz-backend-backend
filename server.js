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
    origin: process.env.CLIENT_URL?.split(',') || [
      'http://localhost:3000',
      'https://yourapp.com'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

global.io = io;
global.emitOrderUpdate = (orderId) => {
  io.to('admin').emit('orderUpdate', { orderId });
  io.to(`order:${orderId}`).emit('orderUpdate', { orderId });
};

// SOCKETS
require('./src/sockets/order/orderSocket')(io);

// ==================== DATABASE ====================
connectDB()
  .then(() => console.log('MongoDB Connected'))
  .catch(err => {
    console.error('MongoDB Connection Failed:', err);
    process.exit(1);
  });

// ==================== MIDDLEWARES ====================
const allowedOrigins = process.env.CLIENT_URL?.split(',') || [
  'http://localhost:3000'
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(helmet({
  contentSecurityPolicy: false
}));

// NOTE: Stripe webhook requires RAW body — so JSON parser must come AFTER webhook route
// Stripe Webhook route will be added below BEFORE express.json()

// ---- Rate Limiter FIXED ----
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  }
});

app.use(limiter);

// Parse JSON — AFTER the Stripe webhook raw parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==================== STRIPE WEBHOOK (RAW BODY) ====================
app.use(
  '/webhook/stripe',
  express.raw({ type: 'application/json' })
);

// ==================== ROUTES ====================
app.use('/api/auth', require('./src/routes/auth/authRoutes'));
app.use('/api/address', require('./src/routes/address/addressRoutes'));
app.use('/api/area', require('./src/routes/area/areaRoutes'));
app.use('/api/cart', require('./src/routes/cart/cartRoutes'));
app.use('/api/menu', require('./src/routes/menu/menuRoutes'));
app.use('/api/orders', require('./src/routes/order/orderRoutes'));
app.use('/api/payment', require('./src/routes/payment/paymentRoutes'));
app.use('/api/rider', require('./src/routes/rider/riderRoutes'));
app.use('/api/deals', require('./src/routes/deal/dealRoutes'));
app.use('/api/admin', require('./src/routes/admin/adminRoutes'));
app.use('/api/admin/dashboard', require('./src/routes/admin/dashboardRoutes'));
app.use('/api/upload', require('./src/routes/upload/uploadRoutes'));

// Stripe webhook handler
app.use('/webhook/stripe', require('./src/routes/webhook/stripeRoutes'));

// ==================== HEALTH CHECK ====================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toLocaleString('en-PK', {
      timeZone: 'Asia/Karachi'
    }),
    uptime: process.uptime()
  });
});

// ==================== 404 HANDLER ====================
app.use(/.*/, (req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ==================== GLOBAL ERROR HANDLER ====================
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  logger.error(err.stack);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n Server running on http://localhost:${PORT}`);
  console.log(` Health Check: http://localhost:${PORT}/health`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(
    ` Time: ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}\n`
  );
});
