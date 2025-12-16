// src/routes/order/analyticsRoutes.js
// CLEAN & 100% WORKING ADMIN ANALYTICS ROUTES

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

const {
  analyticsQuerySchema,
  realtimeQuerySchema
} = require('../../validation/schemas/analyticsSchemas');

const validate = require('../../middleware/validate/validate');

// REQUIRE LOGIN + ADMIN ROLE
router.use(auth);
router.use(role(['admin']));

// MAIN ANALYTICS (period, startDate/endDate)
router.get(
  '/orders',
  validate(analyticsQuerySchema),
  validateAnalyticsQuery,
  getOrderAnalytics
);

// REALTIME DASHBOARD ENDPOINT
router.get(
  '/orders/realtime',
  validate(realtimeQuerySchema),
  validateRealtimeQuery,
  getRealtimeStats
);

module.exports = router;
