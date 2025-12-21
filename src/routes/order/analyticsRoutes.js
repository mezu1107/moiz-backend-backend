// src/routes/order/analyticsRoutes.js
// PRODUCTION READY — DECEMBER 21, 2025
// ADMIN ANALYTICS ROUTES — NO JOI, MANUAL VALIDATION ONLY

const express = require('express');
const router = express.Router();

const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');

const {
  getOrderAnalytics,
  getRealtimeStats,
  validateAnalyticsQuery,
  validateRealtimeQuery,
} = require('../../controllers/order/orderAnalyticsController');

// ============================================================
// 🔐 AUTH + ADMIN REQUIRED (applied to all routes)
// ============================================================
router.use(auth);
router.use(role(['admin']));

// ============================================================
// 📊 MAIN ANALYTICS
// GET /api/orders/analytics/orders?period=7d OR ?startDate=&endDate=
// ============================================================
router.get('/orders', validateAnalyticsQuery, getOrderAnalytics);

// ============================================================
// ⚡ REALTIME DASHBOARD
// GET /api/orders/analytics/orders/realtime
// ============================================================
router.get('/orders/realtime', validateRealtimeQuery, getRealtimeStats);

module.exports = router;