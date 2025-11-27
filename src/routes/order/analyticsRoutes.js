// src/routes/analytics/analyticsRoutes.js
// SEPARATE, CLEAN & 100% WORKING ADMIN ANALYTICS ROUTES

const express = require('express');
const router = express.Router();

const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');

const {
  getOrderAnalytics,
  getRealtimeStats,
  validateAnalyticsQuery,
  validateRealtimeQuery
} = require('../../controllers/order/orderAnalyticsController');

// PROTECT ALL ANALYTICS — ONLY ADMIN
router.use(auth);           // Must be logged in
router.use(role(['admin'])); // Must be admin

// ANALYTICS ENDPOINTS — FULLY VALIDATED
router.get('/order-analytics', validateAnalyticsQuery, getOrderAnalytics);
router.get('/realtime-stats', validateRealtimeQuery, getRealtimeStats);

// Optional: Shorter aliases (you can use these too)
router.get('/analytics', validateAnalyticsQuery, getOrderAnalytics);
router.get('/realtime', validateRealtimeQuery, getRealtimeStats);

module.exports = router;