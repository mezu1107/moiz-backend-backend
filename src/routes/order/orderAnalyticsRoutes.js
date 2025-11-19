const express = require('express');
const router = express.Router();
const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const { getOrderAnalytics, getRealtimeStats } = require('../../controllers/order/orderAnalyticsController');

router.use(auth, role(['admin']));

router.get('/analytics', getOrderAnalytics);
router.get('/realtime', getRealtimeStats);
// Inside orderRoutes.js — add this route
router.get('/track/:orderId', trackOrder);
module.exports = router;